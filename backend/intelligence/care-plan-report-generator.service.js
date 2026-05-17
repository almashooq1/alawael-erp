'use strict';

/**
 * care-plan-report-generator.service.js — Wave 47.
 *
 * Deterministic generator for the 6 internal report formats required by
 * spec §18. The family-friendly report lives in its own Wave-43 module;
 * this one covers the other 6:
 *
 *   1. clinician_draft        — full internal working version (no redaction)
 *   2. supervisor_review      — scorecard + diff + risks + must-fix
 *   3. final_approved_plan    — full signed version (signature chain + hash)
 *   4. rejection              — structured rejection + rewrite guidance
 *   5. monthly_progress       — per-goal trend + verdict (from Wave-44 reviewer)
 *   6. end_of_cycle_closure   — outcomes per goal + holistic verdict
 *
 * All reports return:
 *   { ok, kind, markdown, plainText, generatedAt, redactionProfile,
 *     warnings: [] }
 *
 * Pure module: no I/O, no LLM. Deterministic given same inputs.
 *
 * Role redaction matrix:
 *   • clinician_draft       → role 'clinician' (no redaction)
 *   • supervisor_review     → role 'supervisor' (no PHI redaction; internal)
 *   • final_approved_plan   → role 'clinician' baseline; archive may redact
 *   • rejection             → role 'clinician'
 *   • monthly_progress      → role 'clinician'; CAN downgrade to 'executive'
 *   • end_of_cycle_closure  → role 'clinician'; family copy goes through Wave-43
 */

const reg = require('./care-planning.registry');
const reviewer = require('./care-plan-progress-reviewer.service');

const REPORT_KIND = Object.freeze({
  CLINICIAN_DRAFT: 'clinician_draft',
  SUPERVISOR_REVIEW: 'supervisor_review',
  FINAL_APPROVED: 'final_approved_plan',
  REJECTION: 'rejection',
  MONTHLY_PROGRESS: 'monthly_progress',
  END_OF_CYCLE: 'end_of_cycle_closure',
});

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

function fmtDate(d) {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${ARABIC_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function fmtScore(n) {
  if (n == null) return '—';
  return Number(n).toFixed(1);
}

function bullet(items, transformer = String) {
  if (!Array.isArray(items) || items.length === 0) return '- لا يوجد';
  return items.map(i => `- ${transformer(i)}`).join('\n');
}

function plainTextFromMarkdown(md) {
  if (typeof md !== 'string') return '';
  return md
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*-\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function _section(title, body) {
  return `## ${title}\n\n${body}`;
}

function _warn(warnings, code, detail) {
  warnings.push({ code, detail });
}

// ─── 1. Clinician Draft Report ───────────────────────────────────

function _renderClinicianDraft(plan, warnings) {
  const goals = plan.goals || [];
  const programs = plan.programs || [];
  const measures = plan.measures || [];
  const safety = plan.safetyFlags || [];

  const goalsSection = bullet(goals, g => {
    const refs = (g.evidenceRefs || []).map(r => `${r.kind}:${r.refId}`).join('، ');
    const confidence = g.confidence != null ? ` (الثقة ${Number(g.confidence).toFixed(2)})` : '';
    return `**${g.domain}** — ${g.statement}${confidence}\n  - baseline: ${g.baselineLink || '—'}\n  - measure: ${g.measureLink || '—'}\n  - evidence: ${refs || '—'}`;
  });

  const programsSection = bullet(
    programs,
    p =>
      `${p.name || p.programId} — ${p.frequencyPerWeek}/أسبوع × ${p.durationMin} دقيقة (${(p.goalRefs || []).join('، ')})`
  );

  const measuresSection = bullet(
    measures,
    m =>
      `${m.instrument || m.measureId} — كل ${m.cadenceWeeks || '?'} أسبوع لـ ${(m.goalRefs || []).join('، ')}`
  );

  const safetySection =
    safety.length === 0
      ? '- لا توجد أعلام سلامة مسجلة.'
      : bullet(
          safety,
          s => `**${s.flag}** (${s.severity || 'medium'}) — ${s.mitigation || '⚠️ بلا خطة تخفيف'}`
        );

  if (goals.length === 0) _warn(warnings, 'NO_GOALS', 'الخطة بلا أهداف');
  if (programs.length === 0) _warn(warnings, 'NO_PROGRAMS', 'الخطة بلا برامج');

  return [
    `# تقرير الخطة — مسودة العامل السريري`,
    `**رقم الخطة:** ${plan.planId} — نسخة ${plan.versionNumber}`,
    `**نوع الخطة:** ${plan.planType}`,
    `**التخصص:** ${plan.specialty || '—'}`,
    `**سبب الخطة:** ${plan.reasonForPlan || '—'}`,
    `**تاريخ الإنشاء:** ${fmtDate(plan.createdAt)}`,
    '',
    _section('الأهداف SMART', goalsSection),
    _section('البرامج', programsSection),
    _section('المقاييس', measuresSection),
    _section('أعلام السلامة', safetySection),
    _section(
      'دور الأسرة',
      [
        `- وقت متوقع: ${plan.familyRole?.expectedInvolvementMinutesPerWeek || 0} دقيقة/أسبوع`,
        `- خطة التدريب: ${plan.familyRole?.coachingPlan || '—'}`,
        `- برنامج منزلي: ${(plan.familyRole?.homeProgram || []).map(h => h.activity).join('، ') || '—'}`,
      ].join('\n')
    ),
    _section(
      'مراجعة',
      `- التاريخ التالي: ${fmtDate(plan.reviewSchedule?.nextReviewAt)}\n- الدورة: كل ${plan.reviewSchedule?.cadenceWeeks || 12} أسبوع`
    ),
    _section(
      'حالة الجودة الحالية',
      [
        `- درجة الجاهزية: ${plan.validation?.readinessScore || 0}/100`,
        `- فشل صلب: ${(plan.validation?.hardFailures || []).length}`,
        `- تحذير ناعم: ${(plan.validation?.softWarnings || []).length}`,
        `- النطاق: ${plan.validation?.band || '—'}`,
      ].join('\n')
    ),
  ].join('\n\n');
}

// ─── 2. Supervisor Review Report ─────────────────────────────────

function _renderSupervisorReview(plan, warnings) {
  const sc = plan.reviewScorecard || {};
  const validation = plan.validation || {};
  const hardFailures = validation.hardFailures || [];
  const softWarnings = validation.softWarnings || [];
  const notes = Array.isArray(plan.revisionNotes) ? plan.revisionNotes : [];

  if (sc.overall == null) _warn(warnings, 'NO_SCORECARD', 'لم تُسجَّل بطاقة المراجعة بعد');

  const scoresSection = [
    `| البُعد | الدرجة |`,
    `|---|---|`,
    `| الجودة | ${fmtScore(sc.quality)} / 10 |`,
    `| الالتزام | ${fmtScore(sc.compliance)} / 10 |`,
    `| الوضوح | ${fmtScore(sc.clarity)} / 10 |`,
    `| القابلية للقياس | ${fmtScore(sc.measurability)} / 10 |`,
    `| جاهزية الأسرة | ${fmtScore(sc.familyReadiness)} / 10 |`,
    `| السلامة | ${fmtScore(sc.safety)} / 10 |`,
    `| **الإجمالي** | **${fmtScore(sc.overall)} / 10** |`,
  ].join('\n');

  let approvalRec = 'request_revision';
  if (
    sc.overall != null &&
    sc.overall >= reg.APPROVAL_RULES.MIN_REVIEW_SCORE_TO_APPROVE &&
    hardFailures.length === 0
  ) {
    approvalRec = 'approve';
  } else if (hardFailures.length > 0) {
    approvalRec = 'request_revision';
  }
  if (reg.isPlanTypeAlwaysEscalated(plan.planType)) approvalRec = 'escalate';
  if ((plan.rejectionCount || 0) >= reg.APPROVAL_RULES.ESCALATE_AFTER_REJECTIONS)
    approvalRec = 'escalate';

  return [
    `# تقرير مراجعة المشرف`,
    `**الخطة:** ${plan.planId} v${plan.versionNumber}`,
    `**الحالة الحالية:** ${plan.status}`,
    `**عدد الرفض السابق:** ${plan.rejectionCount || 0}`,
    '',
    _section('بطاقة الدرجات', scoresSection),
    _section(
      'فشل صلب يجب إصلاحه قبل الاعتماد',
      hardFailures.length === 0
        ? '- لا يوجد ✓'
        : bullet(
            hardFailures,
            f => `[${f.ruleId}] ${f.message}${f.elementId ? ` (${f.elementId})` : ''}`
          )
    ),
    _section(
      'تحذيرات ناعمة',
      softWarnings.length === 0
        ? '- لا يوجد'
        : bullet(softWarnings, w => `[${w.ruleId}] ${w.message}`)
    ),
    _section(
      'ملاحظات المراجع',
      notes.length === 0
        ? '- لا توجد ملاحظات إضافية'
        : bullet(notes, n => (typeof n === 'string' ? n : JSON.stringify(n)))
    ),
    _section(
      'التوصية',
      `**${approvalRec === 'approve' ? '✅ اعتماد' : approvalRec === 'escalate' ? '⚠️ تصعيد لمدير الفرع' : '🔄 إعادة للتعديل'}**`
    ),
  ].join('\n\n');
}

// ─── 3. Final Approved Plan Report ──────────────────────────────

function _renderFinalApproved(plan, warnings) {
  if (
    plan.status !== reg.STATUSES.APPROVED &&
    plan.status !== reg.STATUSES.SAVED_TO_RECORD &&
    plan.status !== reg.STATUSES.FAMILY_NOTIFICATION_SENT &&
    plan.status !== reg.STATUSES.SUPERSEDED
  ) {
    _warn(warnings, 'NOT_APPROVED', `الخطة في حالة ${plan.status} — تقرير "نهائي" يستلزم اعتمادها`);
  }
  if (!plan.evidenceHash)
    _warn(warnings, 'NO_EVIDENCE_HASH', 'لا يوجد evidenceHash — تقرير غير قابل للتحقق');

  const chain = plan.signatureChain || [];
  const sigSection =
    chain.length === 0
      ? '- لا يوجد توقيع'
      : bullet(
          chain,
          s =>
            `**${s.role}** — ${s.action} في ${fmtDate(s.signedAt)}${s.nafathSignatureId ? ` (نفاذ: ${s.nafathSignatureId})` : ''}`
        );

  return [
    `# الخطة المعتمدة — التقرير النهائي`,
    `**الخطة:** ${plan.planId} v${plan.versionNumber}`,
    `**نوع الخطة:** ${plan.planType}`,
    `**حالة الخطة:** ${plan.status}`,
    `**تاريخ الاعتماد:** ${fmtDate(plan.approvedAt)}`,
    `**ختم النزاهة (evidenceHash):** \`${plan.evidenceHash || '—'}\``,
    `**سبب الخطة:** ${plan.reasonForPlan || '—'}`,
    '',
    _renderClinicianDraft(plan, warnings), // include the full body
    '',
    _section('سلسلة التوقيعات', sigSection),
  ].join('\n\n');
}

// ─── 4. Rejection Report ─────────────────────────────────────────

function _renderRejection(plan, warnings) {
  const rej = plan.rejection;
  if (!rej) {
    _warn(warnings, 'NO_REJECTION', 'لم يُسجَّل قرار رفض');
    return [
      `# تقرير الرفض`,
      `**الخطة:** ${plan.planId} v${plan.versionNumber}`,
      `**ملاحظة:** لم يُسجَّل قرار رفض على هذه النسخة.`,
    ].join('\n\n');
  }

  const fixes = Array.isArray(rej.requiredFixes) ? rej.requiredFixes : [];
  const fixesSection = bullet(fixes, f => {
    const sev = f.severity === 'must_fix' ? '🛑 إلزامي' : '🟡 مُستحسن';
    return `${sev} [أولوية ${f.priority || '?'}] ${f.elementId ? `(${f.elementId}) ` : ''}${f.fix}`;
  });

  return [
    `# تقرير قرار الرفض`,
    `**الخطة:** ${plan.planId} v${plan.versionNumber}`,
    `**عدد محاولات الرفض حتى الآن:** ${plan.rejectionCount || 0}`,
    `**تاريخ الرفض:** ${fmtDate(plan.rejectedAt)}`,
    '',
    _section('السبب الرئيسي', `**${rej.primaryReason}**`),
    _section('الإصلاحات المطلوبة', fixesSection),
    _section('توجيه إعادة الصياغة', rej.rewriteGuidance || '—'),
    _section('الإلحاح', rej.urgency || 'within_7_days'),
    _section(
      'الإجراء التالي',
      (plan.rejectionCount || 0) >= reg.APPROVAL_RULES.ESCALATE_AFTER_REJECTIONS
        ? '⚠️ تجاوزت الخطة عتبة الرفض المتكرر — يستلزم تصعيدًا لمدير الفرع قبل إعادة الإرسال.'
        : 'أصلح النقاط أعلاه ثم استخدم إجراء "resubmit_after_revision".'
    ),
  ].join('\n\n');
}

// ─── 5. Monthly Progress Report ──────────────────────────────────

function _renderMonthlyProgress(plan, ctx, warnings) {
  const signals = Array.isArray(ctx.goalSignals) ? ctx.goalSignals : [];
  if (signals.length === 0) _warn(warnings, 'NO_SIGNALS', 'لا توجد قياسات تقدّم لهذه الفترة');

  const review = reviewer.reviewPlan({
    goalSignals: signals,
    planReviewDueAt: plan.reviewSchedule?.nextReviewAt,
    aggregateAttendance: ctx.aggregateAttendance,
    now: ctx.now,
  });

  const perGoalSection =
    review.perGoal.length === 0
      ? '- لا توجد بيانات لكل هدف.'
      : bullet(review.perGoal, g => {
          const verdictAr =
            {
              continue: 'مستمر ✓',
              revise: 'بحاجة مراجعة 🔄',
              close: 'مُحقَّق ✅',
              escalate: 'تصعيد ⚠️',
            }[g.verdict] || g.verdict;
          return `**${g.goalId}** — ${verdictAr} (الاتجاه: ${g.trend}، استمرار ثبات: ${g.plateauWeeks}w، تراجع: ${g.regressionWeeks}w)`;
        });

  const triggersSection =
    review.triggers.length === 0
      ? '- لا توجد مؤشرات إنذار'
      : bullet(
          review.triggers,
          t => `**${t.kind}**${t.goalId ? ` (${t.goalId})` : ''}: ${t.action}`
        );

  return [
    `# تقرير التقدم الشهري`,
    `**الخطة:** ${plan.planId} v${plan.versionNumber}`,
    `**فترة التقرير:** حتى ${fmtDate(ctx.now || new Date())}`,
    `**التوصية الكلية:** ${
      {
        continue_plan: 'الاستمرار في الخطة',
        revise_plan: 'مراجعة الخطة',
        new_plan: 'إعادة بناء الخطة',
        discharge_readiness: 'جاهزية للتخرج',
      }[review.holisticVerdict] || review.holisticVerdict
    }`,
    `**نسبة الأهداف على المسار:** ${(review.onTrackRatio * 100).toFixed(0)}%`,
    `**نسبة الأهداف المُحقَّقة:** ${(review.closedRatio * 100).toFixed(0)}%`,
    '',
    _section('وضع كل هدف', perGoalSection),
    _section('مؤشرات الإنذار', triggersSection),
    _section('الموعد المقترح للمراجعة القادمة', fmtDate(review.nextReviewDate)),
  ].join('\n\n');
}

// ─── 6. End-of-Cycle Closure Report ──────────────────────────────

function _renderEndOfCycle(plan, ctx, warnings) {
  const signals = Array.isArray(ctx.goalSignals) ? ctx.goalSignals : [];
  const review = reviewer.reviewPlan({
    goalSignals: signals,
    planReviewDueAt: plan.reviewSchedule?.nextReviewAt,
    aggregateAttendance: ctx.aggregateAttendance,
    now: ctx.now,
  });

  if (review.closedRatio < 0.5) {
    _warn(
      warnings,
      'LOW_COMPLETION',
      `أقل من نصف الأهداف مُحقَّقة (${(review.closedRatio * 100).toFixed(0)}%)`
    );
  }
  if (review.counts.escalate > 0) {
    _warn(warnings, 'OPEN_ESCALATIONS', `${review.counts.escalate} هدف بحاجة تصعيد`);
  }

  const closedGoals = review.perGoal.filter(g => g.verdict === 'close');
  const ongoingGoals = review.perGoal.filter(
    g => g.verdict === 'continue' || g.verdict === 'revise'
  );
  const escalatedGoals = review.perGoal.filter(g => g.verdict === 'escalate');

  const closingNote =
    review.holisticVerdict === 'discharge_readiness'
      ? '✅ الخطة جاهزة للإغلاق — يوصى ببدء عملية التخرج.'
      : review.counts.escalate > 0
        ? '⚠️ الإغلاق غير موصى به — مؤشرات تصعيد مفتوحة.'
        : 'الخطة تحقق التقدم لكن لم تكتمل دورتها بعد.';

  return [
    `# تقرير إغلاق الدورة`,
    `**الخطة:** ${plan.planId} v${plan.versionNumber}`,
    `**تاريخ الاعتماد:** ${fmtDate(plan.approvedAt)}`,
    `**تاريخ هذا التقرير:** ${fmtDate(ctx.now || new Date())}`,
    `**التوصية الكلية:** ${review.holisticVerdict}`,
    '',
    _section(
      'الأهداف المُحقَّقة',
      closedGoals.length === 0
        ? '- لا يوجد'
        : bullet(closedGoals, g => `✅ ${g.goalId} — وصلت إلى الهدف (آخر قيمة: ${g.lastValue})`)
    ),
    _section(
      'الأهداف المستمرة',
      ongoingGoals.length === 0
        ? '- لا يوجد'
        : bullet(ongoingGoals, g => `⏳ ${g.goalId} — ${g.trend}`)
    ),
    _section(
      'الأهداف المُصعَّدة',
      escalatedGoals.length === 0
        ? '- لا يوجد'
        : bullet(escalatedGoals, g => `⚠️ ${g.goalId} — ${g.reasons.join('، ')}`)
    ),
    _section(
      'معايير جاهزية التخرج',
      [
        `- شروط متحققة: ${review.dischargeReadiness.criteriaMet.join('، ') || '—'}`,
        `- شروط ناقصة: ${review.dischargeReadiness.missing.join('، ') || 'لا يوجد'}`,
        `- الجاهزية: ${review.dischargeReadiness.ready ? 'نعم ✅' : 'لا ❌'}`,
      ].join('\n')
    ),
    _section('الخلاصة', closingNote),
  ].join('\n\n');
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Generate a report of the requested kind. PURE.
 *
 * @param {string} kind one of REPORT_KIND.*
 * @param {object} plan plan-version body
 * @param {object} ctx  { goalSignals, aggregateAttendance, now }
 *                      — only relevant for monthly_progress + end_of_cycle
 * @returns {object} { ok, kind, markdown, plainText, generatedAt, warnings }
 */
function generateReport(kind, plan, ctx = {}) {
  const warnings = [];
  if (!plan || typeof plan !== 'object') {
    return { ok: false, kind, reason: 'INVALID_PLAN', warnings };
  }

  let markdown;
  switch (kind) {
    case REPORT_KIND.CLINICIAN_DRAFT:
      markdown = _renderClinicianDraft(plan, warnings);
      break;
    case REPORT_KIND.SUPERVISOR_REVIEW:
      markdown = _renderSupervisorReview(plan, warnings);
      break;
    case REPORT_KIND.FINAL_APPROVED:
      markdown = _renderFinalApproved(plan, warnings);
      break;
    case REPORT_KIND.REJECTION:
      markdown = _renderRejection(plan, warnings);
      break;
    case REPORT_KIND.MONTHLY_PROGRESS:
      markdown = _renderMonthlyProgress(plan, ctx, warnings);
      break;
    case REPORT_KIND.END_OF_CYCLE:
      markdown = _renderEndOfCycle(plan, ctx, warnings);
      break;
    default:
      return { ok: false, reason: 'UNKNOWN_REPORT_KIND', kind, warnings };
  }

  return {
    ok: true,
    kind,
    markdown,
    plainText: plainTextFromMarkdown(markdown),
    generatedAt: new Date().toISOString(),
    warnings,
  };
}

function listReportKinds() {
  return Object.values(REPORT_KIND);
}

module.exports = {
  generateReport,
  listReportKinds,
  REPORT_KIND,
  // Exposed for testing fine-grained renderers
  _internal: {
    _renderClinicianDraft,
    _renderSupervisorReview,
    _renderFinalApproved,
    _renderRejection,
    _renderMonthlyProgress,
    _renderEndOfCycle,
    plainTextFromMarkdown,
  },
};

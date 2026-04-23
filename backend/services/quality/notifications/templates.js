'use strict';

/**
 * templates.js — Phase 15 Commit 1 (4.0.64).
 *
 * Pure templating helpers. Each template returns
 * `{ subject, body }` given a payload. No DOM/HTML — plain-text
 * first, suitable for email or console fan-out. Subject lines
 * are Arabic + short so they render cleanly in inbox previews.
 */

const ar = (n, one, two, many, plural) => {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${many}`;
  return `${n} ${plural}`;
};

const when = d => {
  try {
    return new Date(d).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(d);
  }
};

// ── per-event templates ───────────────────────────────────────────

const TEMPLATES = {
  'review.scheduled': p => ({
    subject: `📅 مراجعة إدارة مجدولة: ${p.reviewNumber || '—'}`,
    body: `تم جدولة مراجعة إدارة جديدة.

• رقم المراجعة: ${p.reviewNumber || '—'}
• التاريخ: ${p.scheduledFor ? when(p.scheduledFor) : '—'}
• الفرع: ${p.branchId || 'على مستوى المؤسسة'}

يرجى الاستعداد للمراجعة وجمع المدخلات المطلوبة.
`,
  }),

  'review.closed': p => ({
    subject: `✅ أغلقت مراجعة الإدارة ${p.reviewNumber || ''}`,
    body: `أغلقت مراجعة الإدارة بنجاح.

• رقم المراجعة: ${p.reviewNumber || '—'}
• تاريخ الإغلاق: ${p.closedAt ? when(p.closedAt) : 'الآن'}
• الإجراءات المفتوحة: ${p.openActions ?? 0}
${p.nextReviewScheduledFor ? `• المراجعة التالية: ${when(p.nextReviewScheduledFor)}\n` : ''}
يمكن الاطلاع على المحضر والقرارات عبر لوحة الجودة.
`,
  }),

  'review.cancelled': p => ({
    subject: `❌ ألغيت مراجعة الإدارة`,
    body: `ألغيت مراجعة الإدارة.

السبب: ${p.reason || 'غير مُحدَّد'}
بواسطة: ${p.by || '—'}
`,
  }),

  'review.action_assigned': p => ({
    subject: `📌 إجراء مراجعة جديد بأولوية ${p.priority || 'medium'}`,
    body: `أُسند إليك إجراء من مراجعة الإدارة.

• معرّف الإجراء: ${p.actionId || '—'}
• الأولوية: ${p.priority || 'medium'}
• تاريخ الاستحقاق: ${p.dueDate ? when(p.dueDate) : '—'}

يرجى البدء في التنفيذ.
`,
  }),

  'evidence.expired': p => ({
    subject: `⚠️ انتهى دليل امتثال: ${p.code || '—'}`,
    body: `انتهت صلاحية دليل امتثال.

• رمز الدليل: ${p.code || '—'}
• تاريخ الانتهاء: ${p.validUntil ? when(p.validUntil) : '—'}
• الفرع: ${p.branchId || '—'}

يلزم استبدال الدليل أو تجديده فوراً لتجنب الإخلال بالامتثال.
`,
  }),

  'evidence.expiring': p => ({
    subject: `⏰ دليل امتثال ينتهي خلال ${p.daysLeft || '?'} ${ar(p.daysLeft, 'يوم', 'يومان', 'أيام', 'يوماً')}`,
    body: `دليل امتثال على وشك الانتهاء.

• رمز الدليل: ${p.code || '—'}
• متبقٍّ: ${p.daysLeft || '—'} يوم
• ينتهي في: ${p.validUntil ? when(p.validUntil) : '—'}
• نافذة التنبيه: ${p.window || '—'} يوم

يرجى التجديد أو استبدال الدليل قبل انتهائه.
`,
  }),

  'evidence.revoked': p => ({
    subject: `🚫 أُلغي دليل امتثال`,
    body: `أُلغي دليل امتثال.

• المعرّف: ${p.evidenceId || '—'}
• السبب: ${p.reason || '—'}
• بواسطة: ${p.by || '—'}
`,
  }),

  'evidence.legal_hold_set': p => ({
    subject: `🔒 تم تطبيق حجز قانوني على دليل`,
    body: `طُبّق حجز قانوني على دليل.

• معرّف الدليل: ${p.evidenceId || '—'}
• بواسطة: ${p.by || '—'}

لا يجوز إتلاف أو تعديل هذا الدليل حتى يُرفع الحجز.
`,
  }),

  'calendar.alert': p => ({
    subject: `🔔 تنبيه امتثال: ${p.type || '—'} خلال ${p.window || '—'} يوم`,
    body: `موعد امتثال يقترب.

• رمز الحدث: ${p.code || '—'}
• النوع: ${p.type || '—'}
• نافذة التنبيه: ${p.window || '—'} يوم
• تاريخ الاستحقاق: ${p.dueDate ? when(p.dueDate) : '—'}
• الشدة: ${p.severity || '—'}
`,
  }),

  'calendar.event_created': p => ({
    subject: `📌 موعد امتثال جديد`,
    body: `أضيف موعد جديد إلى تقويم الامتثال.

• رمز الحدث: ${p.code || '—'}
• النوع: ${p.type || '—'}
• تاريخ الاستحقاق: ${p.dueDate ? when(p.dueDate) : '—'}
• الشدة: ${p.severity || '—'}
`,
  }),

  'control.tested_fail': p => ({
    subject: `❌ ضابط جودة بنتيجة ${p.outcome || 'fail'}: ${p.controlId}`,
    body: `فشل اختبار ضابط جودة.

• معرّف الضابط: ${p.controlId || '—'}
• النتيجة: ${p.outcome || 'fail'}
• الدرجة: ${p.score ?? '—'}
• بواسطة: ${p.by || '—'}

يرجى مراجعة الأسباب الجذرية وإطلاق CAPA إذا لزم الأمر.
`,
  }),

  'control.deprecated': p => ({
    subject: `📦 إيقاف ضابط: ${p.controlId}`,
    body: `ألغي ضابط من القائمة النشطة.

• معرّف الضابط: ${p.controlId || '—'}
• بواسطة: ${p.by || '—'}
`,
  }),

  'capa.overdue': p => ({
    subject: `🔴 CAPA متأخر: ${p.actionId || '—'}`,
    body: `تجاوز إجراء تصحيحي/وقائي تاريخ استحقاقه.

• معرّف الإجراء: ${p.actionId || '—'}
• أيام التأخر: ${p.daysOverdue ?? '—'}
• المُسند إليه: ${p.ownerName || '—'}
• التاريخ المستهدف: ${p.targetCompletionDate ? when(p.targetCompletionDate) : '—'}

يرجى التصعيد أو إعادة التقييم فوراً.
`,
  }),

  'capa.effectiveness_check_due': p => ({
    subject: `🔍 تحقق من فعالية CAPA: ${p.actionId || '—'}`,
    body: `مرّ 30 يوماً على إغلاق CAPA. يلزم تقييم الفعالية.

• معرّف الإجراء: ${p.actionId || '—'}
• أُغلق في: ${p.completedAt ? when(p.completedAt) : '—'}

يرجى التحقق من عدم تكرار المشكلة وتوثيق النتيجة.
`,
  }),

  'risk.reassessment_due': p => ({
    subject: `⚠️ إعادة تقييم مخاطرة: ${p.riskNumber || '—'}`,
    body: `حان موعد إعادة تقييم مخاطرة.

• رقم المخاطرة: ${p.riskNumber || '—'}
• المستوى: ${p.riskLevel || '—'}
• أيام منذ آخر مراجعة: ${p.daysSinceReview ?? '—'}
• التكرار المطلوب: ${p.cadenceDays ?? '—'} يوم

يرجى تحديث likelihood × impact + reviewDate.
`,
  }),

  'ncr.auto_linked': p => ({
    subject: `🔗 إنشاء NCR + CAPA تلقائياً لحادثة ${p.severity || '—'}`,
    body: `أُنشئ تلقائياً عدم مطابقة + إجراء تصحيحي من حادثة خطيرة.

• معرّف الحادثة: ${p.incidentId || '—'}
• الشدة: ${p.severity || '—'}
• NCR: ${p.ncrId || '—'}
• CAPA: ${p.capaId || '—'}
• الفرع: ${p.branchId || '—'}

يلزم التحقيق في الحادثة وتحديث NCR/CAPA وفقاً لنتائج التحقيق.
`,
  }),

  // ── Generic fallback ────────────────────────────────────────────
  generic: (p, eventName) => ({
    subject: `🔔 ${eventName || 'حدث جودة'}`,
    body: `حدث في منظومة الجودة:\n\n${JSON.stringify(p, null, 2)}`,
  }),
};

function render(templateKey, payload, eventName) {
  const fn = TEMPLATES[templateKey] || TEMPLATES.generic;
  try {
    return fn(payload || {}, eventName);
  } catch {
    return TEMPLATES.generic(payload || {}, eventName);
  }
}

module.exports = {
  TEMPLATES,
  render,
};

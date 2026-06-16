'use strict';

/**
 * whatsappBotData.service.js — W1372 Wave 2.
 *
 * The **guardian-verified live-data layer** for the WhatsApp menu-bot. When the
 * FSM finishes a read-only lookup unit (attendance / session report / billing)
 * it emits a `LOOKUP_*` side effect carrying the collected inputs. This service
 * resolves that into a real answer — but ONLY for a beneficiary the inbound
 * phone is a *registered, authorized guardian* of.
 *
 * ─── PRIVACY / AUTHORIZATION (the whole point of this module) ────────────────
 * The center's spec (§16) is explicit: detailed beneficiary data goes ONLY to
 * an authorized guardian, and the SYSTEM verifies that via the phone number.
 * So the authorization rule here is strict and binding-based, never name-based:
 *
 *   1. The inbound phone must resolve to a FamilyMember record (not deleted).
 *   2. That member must be an AUTHORIZED guardian — `portalAccess.enabled`,
 *      `isLegalGuardian`, or `isPrimaryContact`. A bare "other contact" is NOT
 *      enough to receive clinical/financial detail.
 *   3. The data returned is ALWAYS for a beneficiary in the phone's OWN
 *      authorized set. The typed beneficiary name is used only to DISAMBIGUATE
 *      among that phone's children (siblings) — never to look up a stranger's
 *      child. If the phone has several children and the name doesn't confidently
 *      match exactly one, we DECLINE (→ escalate to staff) rather than guess.
 *
 * Because every query is keyed by an authorized `beneficiaryId`, cross-branch
 * leakage is structurally impossible — we never query by branch, only by the
 * specific beneficiary the guardian is bound to.
 *
 * Env-gated SEPARATELY from the menu via `ENABLE_WHATSAPP_BOT_LIVE_DATA`
 * (default OFF): the menu bot can run (escalation-only) without ever
 * auto-sending sensitive data until the owner opts in.
 *
 * The pure helpers (authorization gate, sibling selection, formatters) are
 * exported and unit-tested without a DB; the model-touching functions are thin
 * wrappers that load data then delegate to the pure formatters. Every model
 * load is defensive — a missing model/path returns null → the dispatcher falls
 * back to escalation (fail-safe, never throws into the webhook).
 *
 * @module services/whatsapp/whatsappBotData.service
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const reg = require('../../intelligence/whatsapp-bot-flow.registry');
const whatsappService = require('./whatsappService');

// Side-effect kinds this service answers.
const LOOKUP_KINDS = Object.freeze(
  new Set([
    reg.SIDE_EFFECT.LOOKUP_ATTENDANCE,
    reg.SIDE_EFFECT.LOOKUP_SESSION_REPORT,
    reg.SIDE_EFFECT.LOOKUP_BILLING,
  ])
);

function isLookupKind(kind) {
  return LOOKUP_KINDS.has(kind);
}

// ─── Arabic label maps ───────────────────────────────────────────────────────
const ATTENDANCE_STATUS_AR = Object.freeze({
  present: 'حاضر ✅',
  absent: 'غائب ⚠️',
  late: 'متأخر ⏰',
  excused: 'غياب بعذر',
  sent_home: 'أُعيد للمنزل',
});

const SPECIALTY_AR = Object.freeze({
  speech_therapy: 'نطق وتخاطب',
  occupational_therapy: 'علاج وظيفي',
  physical_therapy: 'علاج طبيعي',
  behavioral_therapy: 'تعديل سلوك',
  psychological: 'دعم نفسي',
  educational: 'تربية خاصة',
  social_work: 'خدمة اجتماعية',
  nursing: 'تمريض',
  vocational: 'تأهيل مهني',
  recreational: 'أنشطة ترفيهية',
  multidisciplinary: 'متعدد التخصصات',
  other: 'أخرى',
});

const INVOICE_STATUS_AR = Object.freeze({
  paid: 'مدفوعة',
  partially_paid: 'مدفوعة جزئياً',
  issued: 'صادرة (غير مدفوعة)',
  overdue: 'متأخرة السداد',
  draft: 'مسودة',
  cancelled: 'ملغاة',
  void: 'ملغاة',
});

// Maps the bot's department answer (unit 5) → ClinicalSession.specialty filter.
const DEPT_KEY_TO_SPECIALTY = Object.freeze({
  occupational: 'occupational_therapy',
  speech: 'speech_therapy',
  special_education: 'educational',
  behavior: 'behavioral_therapy',
});

// ─── Lazy + defensive model loaders ──────────────────────────────────────────
// Prefer the registered model (works once the app has booted). The require
// fallback must handle BOTH export shapes in this codebase: a direct model
// export (FinanceInvoice / FamilyMember / …) AND a named-export module — e.g.
// domains/sessions/models/ClinicalSession exports { ClinicalSession, schema },
// NOT the model itself. Returning the bare module there would hand `.find` a
// non-model and silently break the lookup, so we unwrap the named export.
function loadModel(registeredName, requirePath) {
  try {
    return mongoose.model(registeredName);
  } catch {
    try {
      const mod = require(requirePath);
      if (mod && typeof mod.find === 'function') return mod; // direct model export
      if (mod && mod[registeredName] && typeof mod[registeredName].find === 'function') {
        return mod[registeredName]; // named export, e.g. { ClinicalSession }
      }
      return null;
    } catch (err) {
      logger.warn(`[WhatsApp BotData] model ${registeredName} unavailable: ${err.message}`);
      return null;
    }
  }
}

const getFamilyMemberModel = () =>
  loadModel('FamilyMember', '../../domains/family/models/FamilyMember');
const getBeneficiaryModel = () => loadModel('Beneficiary', '../../models/Beneficiary');
const getAttendanceModel = () =>
  loadModel('BeneficiaryDayAttendance', '../../models/BeneficiaryDayAttendance');
const getClinicalSessionModel = () =>
  loadModel('ClinicalSession', '../../domains/sessions/models/ClinicalSession');
const getInvoiceModel = () => loadModel('FinanceInvoice', '../../models/finance/Invoice');

// ═══════════════════════════════════════════════════════════════════════════
// PURE helpers (unit-tested without a DB)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Is this FamilyMember authorized to receive a beneficiary's detailed data?
 * Portal access, legal guardianship, or primary-contact status all qualify; a
 * bare secondary contact does not.
 */
function isAuthorizedMember(m) {
  if (!m) return false;
  return !!((m.portalAccess && m.portalAccess.enabled) || m.isLegalGuardian || m.isPrimaryContact);
}

/**
 * Build an Arabic-first display name from a Beneficiary doc. The canonical
 * Beneficiary schema stores names at the TOP level (firstName / lastName +
 * Arabic variants + fullNameArabic) — NOT under `personalInfo` (verified
 * against the registered schema; the legacy `populate('personalInfo.firstName
 * …')` in whatsapp.routes is a latent no-op). Pure + testable.
 */
function beneficiaryDisplayName(b) {
  if (!b) return '';
  return (
    b.fullNameArabic ||
    [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ').trim() ||
    [b.firstName, b.lastName].filter(Boolean).join(' ').trim() ||
    b.name ||
    ''
  ).trim();
}

/**
 * Pick which beneficiary to answer for, from the phone's OWN authorized set.
 *
 * @param {Array<{beneficiaryId:string, name:string}>} candidates
 * @param {string} typedName - the name the user typed (disambiguation only)
 * @returns {{ok:true, beneficiaryId:string} | {ok:false, reason:string, count?:number}}
 */
function selectBeneficiary(candidates, typedName) {
  const list = (candidates || []).filter(c => c && c.beneficiaryId);
  if (list.length === 0) return { ok: false, reason: 'not_authorized' };
  if (list.length === 1) return { ok: true, beneficiaryId: list[0].beneficiaryId };

  // Multiple authorized children (siblings) → must match the typed name to one.
  const n = reg.normalize(typedName || '');
  if (!n) return { ok: false, reason: 'ambiguous_no_name', count: list.length };
  const matches = list.filter(c => {
    const cn = reg.normalize(c.name || '');
    return cn && (cn.includes(n) || n.includes(cn));
  });
  if (matches.length === 1) return { ok: true, beneficiaryId: matches[0].beneficiaryId };
  return {
    ok: false,
    reason: matches.length > 1 ? 'ambiguous_multiple_match' : 'ambiguous_no_match',
    count: list.length,
  };
}

/** Format a single attendance record (or its absence) for the guardian. */
function formatAttendance(record, beneficiaryName, dateLabel) {
  const who = beneficiaryName || 'المستفيد';
  if (!record) {
    return `📅 لا يوجد سجل حضور مُدوّن لـ ${who} بتاريخ ${dateLabel}.`;
  }
  const lines = [`📅 *سجل حضور ${who}* — ${dateLabel}`, ''];
  lines.push(`• الحالة: ${ATTENDANCE_STATUS_AR[record.status] || record.status || 'غير محدد'}`);
  if (record.checkInTime) lines.push(`• وقت الحضور: ${fmtTime(record.checkInTime)}`);
  if (record.checkOutTime) lines.push(`• وقت الانصراف: ${fmtTime(record.checkOutTime)}`);
  if (record.notes) lines.push(`• ملاحظة: ${record.notes}`);
  return lines.join('\n');
}

/** Format up to N recent clinical sessions into a parent-friendly summary. */
function formatSessionReports(sessions, beneficiaryName) {
  const who = beneficiaryName || 'المستفيد';
  if (!sessions || !sessions.length) {
    return `📝 لا يوجد تقرير جلسة مكتمل لـ ${who} ضمن الفترة المطلوبة.`;
  }
  const lines = [`📝 *تقارير جلسات ${who}*`, ''];
  for (const s of sessions) {
    const spec = SPECIALTY_AR[s.specialty] || s.specialty || 'جلسة';
    const date = fmtDate(s.scheduledDate);
    const therapist =
      s.therapistId && (s.therapistId.firstName || s.therapistId.lastName)
        ? `${s.therapistId.firstName || ''} ${s.therapistId.lastName || ''}`.trim()
        : null;
    lines.push(`— *${spec}* (${date})${therapist ? ` مع ${therapist}` : ''}`);
    const worked = s.plan || s.objective || s.assessment || s.subjective;
    if (worked) lines.push(`  ${String(worked).slice(0, 200)}`);
    if (Array.isArray(s.goalProgress) && s.goalProgress.length) {
      const achieved = s.goalProgress.filter(
        g => g && (g.rating === 'achieved' || g.rating === 'maintained')
      ).length;
      lines.push(`  الأهداف: ${achieved}/${s.goalProgress.length} محقّقة/مستمرة`);
    }
    lines.push('');
  }
  lines.push('🔒 هذا التقرير خاص بولي الأمر — يُرجى عدم مشاركته في مجموعات عامة.');
  return lines.join('\n').trim();
}

/** Format an outstanding-balance summary from a beneficiary's invoices. */
function formatBilling(invoices, beneficiaryName) {
  const who = beneficiaryName || 'المستفيد';
  if (!invoices || !invoices.length) {
    return `💳 لا توجد فواتير مسجّلة لـ ${who} حالياً.`;
  }
  const outstanding = invoices.reduce((sum, inv) => sum + (Number(inv.balance_due) || 0), 0);
  const latest = invoices[0];
  const lines = [`💳 *كشف حساب ${who}*`, ''];
  lines.push(`• إجمالي المبلغ المستحق: ${formatSar(outstanding)} ريال`);
  if (latest) {
    lines.push(`• حالة أحدث فاتورة: ${INVOICE_STATUS_AR[latest.status] || latest.status}`);
    if (latest.due_date) lines.push(`• تاريخ الاستحقاق: ${fmtDate(latest.due_date)}`);
    if (latest.invoice_number) lines.push(`• رقم الفاتورة: ${latest.invoice_number}`);
  }
  lines.push('');
  lines.push('⚠️ لا تشاركوا بيانات البطاقات البنكية في المحادثة.');
  return lines.join('\n');
}

/**
 * Resolve a free-text period (unit 5) into a query window. `now` is injectable
 * for deterministic tests. "آخر تقرير" → latest only (no date floor).
 */
function parsePeriod(text, now) {
  const ref = now instanceof Date ? new Date(now.getTime()) : new Date();
  const n = reg.normalize(text || '');
  if (/(اخر|الاخير|last)/.test(n)) return { latestOnly: true, gte: null, label: 'آخر تقرير' };
  if (/(اسبوع|week)/.test(n)) {
    const gte = new Date(ref.getTime() - 7 * 86400000);
    return { latestOnly: false, gte, label: 'هذا الأسبوع' };
  }
  if (/(شهر|month)/.test(n)) {
    const gte = new Date(ref.getTime() - 30 * 86400000);
    return { latestOnly: false, gte, label: 'هذا الشهر' };
  }
  if (/(اليوم|today)/.test(n)) {
    const gte = startOfDay(ref);
    return { latestOnly: false, gte, label: 'اليوم' };
  }
  // Default: last 30 days.
  return { latestOnly: false, gte: new Date(ref.getTime() - 30 * 86400000), label: 'آخر فترة' };
}

/**
 * Resolve a free-text date (unit 4) into a [start,end) day window. "اليوم" or
 * blank → today; an ISO-ish date → that day; otherwise today. `now` injectable.
 */
function parseDay(text, now) {
  const ref = now instanceof Date ? new Date(now.getTime()) : new Date();
  const raw = reg.toAsciiDigits(String(text || '')).trim();
  const n = reg.normalize(text || '');
  let day = ref;
  let label = 'اليوم';
  if (n && !/(اليوم|today)/.test(n)) {
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      day = parsed;
      label = fmtDate(parsed);
    }
  }
  return { start: startOfDay(day), end: endOfDay(day), label };
}

// ─── small pure date/number formatters ───────────────────────────────────────
function startOfDay(d) {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d.getTime());
  x.setHours(23, 59, 59, 999);
  return x;
}
function pad2(n) {
  return String(n).padStart(2, '0');
}
function fmtDate(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '';
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
}
function fmtTime(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '';
  return `${pad2(x.getHours())}:${pad2(x.getMinutes())}`;
}
function formatSar(amount) {
  return (Math.round((Number(amount) || 0) * 100) / 100).toLocaleString('en-US');
}

// ═══════════════════════════════════════════════════════════════════════════
// DB-touching resolvers (thin wrappers over the pure helpers)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve the inbound phone to an AUTHORIZED beneficiary (see module authZ
 * doctrine). Returns the selection + the beneficiary's display name.
 */
async function resolveAuthorizedBeneficiary(phone, typedName) {
  const FamilyMember = getFamilyMemberModel();
  const Beneficiary = getBeneficiaryModel();
  if (!FamilyMember || !Beneficiary) return { ok: false, reason: 'models_unavailable' };

  const norm = whatsappService.normalizePhone(phone);
  const members = await FamilyMember.find({
    $or: [
      { phone },
      { phone: norm },
      { 'contactInfo.phone': phone },
      { 'contactInfo.phone': norm },
    ],
    isDeleted: { $ne: true },
  })
    .lean()
    .catch(() => []);

  const authorizedIds = [
    ...new Set(
      (members || [])
        .filter(isAuthorizedMember)
        .map(m => m.beneficiaryId && String(m.beneficiaryId))
        .filter(Boolean)
    ),
  ];
  if (!authorizedIds.length) return { ok: false, reason: 'not_authorized' };

  const bens = await Beneficiary.find({ _id: { $in: authorizedIds } })
    .select('firstName lastName firstName_ar lastName_ar fullNameArabic name')
    .lean()
    .catch(() => []);
  const candidates = (bens || []).map(b => ({
    beneficiaryId: String(b._id),
    name: beneficiaryDisplayName(b),
  }));

  const sel = selectBeneficiary(candidates, typedName);
  if (!sel.ok) return sel;
  const chosen = candidates.find(c => c.beneficiaryId === sel.beneficiaryId);
  return { ok: true, beneficiaryId: sel.beneficiaryId, beneficiaryName: chosen?.name || typedName };
}

async function getAttendance(beneficiaryId, beneficiaryName, dateText) {
  const Attendance = getAttendanceModel();
  if (!Attendance) return null;
  const { start, end, label } = parseDay(dateText);
  const record = await Attendance.findOne({
    beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId),
    date: { $gte: start, $lte: end },
  })
    .lean()
    .catch(() => null);
  return formatAttendance(record, beneficiaryName, label);
}

async function getSessionReport(beneficiaryId, beneficiaryName, departmentText, periodText) {
  const ClinicalSession = getClinicalSessionModel();
  if (!ClinicalSession) return null;
  const period = parsePeriod(periodText);
  const deptKey = reg.resolveDepartmentKey(departmentText || '');
  const specialty = deptKey ? DEPT_KEY_TO_SPECIALTY[deptKey] : null;

  const filter = {
    beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId),
    status: 'completed',
    isDeleted: { $ne: true },
  };
  if (specialty) filter.specialty = specialty;
  if (period.gte) filter.scheduledDate = { $gte: period.gte };

  const sessions = await ClinicalSession.find(filter)
    .sort({ scheduledDate: -1 })
    .limit(period.latestOnly ? 1 : 3)
    .select(
      'scheduledDate specialty therapistId subjective objective assessment plan goalProgress status'
    )
    .populate('therapistId', 'firstName lastName')
    .lean()
    .catch(() => []);
  return formatSessionReports(sessions, beneficiaryName);
}

async function getBilling(beneficiaryId, beneficiaryName) {
  const Invoice = getInvoiceModel();
  if (!Invoice) return null;
  const invoices = await Invoice.find({
    beneficiary_id: new mongoose.Types.ObjectId(beneficiaryId),
    deleted_at: null,
    status: { $nin: ['cancelled', 'void', 'draft'] },
  })
    .sort({ invoice_date: -1 })
    .limit(20)
    .select('invoice_number total_amount paid_amount balance_due status due_date invoice_date')
    .lean()
    .catch(() => []);
  return formatBilling(invoices, beneficiaryName);
}

/**
 * Top-level entry the webhook calls for a LOOKUP_* side effect. Resolves the
 * authorized beneficiary, runs the matching query, and returns ready-to-send
 * text (incl. menu hint) — or `{ok:false, reason}` so the caller escalates.
 */
async function answerLookup(kind, phone, collected = {}) {
  if (!isLookupKind(kind)) return { ok: false, reason: 'unsupported_kind' };
  let sel;
  try {
    sel = await resolveAuthorizedBeneficiary(phone, collected.beneficiaryName);
  } catch (err) {
    logger.warn(`[WhatsApp BotData] resolve failed: ${err.message}`);
    return { ok: false, reason: 'resolve_error' };
  }
  if (!sel.ok) return { ok: false, reason: sel.reason };

  let text = null;
  try {
    if (kind === reg.SIDE_EFFECT.LOOKUP_ATTENDANCE) {
      text = await getAttendance(sel.beneficiaryId, sel.beneficiaryName, collected.date);
    } else if (kind === reg.SIDE_EFFECT.LOOKUP_SESSION_REPORT) {
      text = await getSessionReport(
        sel.beneficiaryId,
        sel.beneficiaryName,
        collected.department,
        collected.period
      );
    } else if (kind === reg.SIDE_EFFECT.LOOKUP_BILLING) {
      text = await getBilling(sel.beneficiaryId, sel.beneficiaryName);
    }
  } catch (err) {
    logger.warn(`[WhatsApp BotData] lookup ${kind} failed: ${err.message}`);
    return { ok: false, reason: 'lookup_error' };
  }
  if (!text) return { ok: false, reason: 'no_data_model' };
  return { ok: true, text: `${text}\n\n${reg.MENU_HINT}` };
}

module.exports = {
  isLookupKind,
  LOOKUP_KINDS,
  answerLookup,
  resolveAuthorizedBeneficiary,
  getAttendance,
  getSessionReport,
  getBilling,
  // pure helpers (exported for unit tests)
  isAuthorizedMember,
  beneficiaryDisplayName,
  selectBeneficiary,
  formatAttendance,
  formatSessionReports,
  formatBilling,
  parsePeriod,
  parseDay,
  // label maps
  ATTENDANCE_STATUS_AR,
  SPECIALTY_AR,
  INVOICE_STATUS_AR,
  DEPT_KEY_TO_SPECIALTY,
};

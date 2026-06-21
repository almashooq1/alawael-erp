'use strict';

/**
 * whatsappBotRecords.service.js — W1384 (expansion bundle: requests → records).
 *
 * Turns a completed bot flow's `sideEffect` into a REAL, trackable DB record
 * instead of only escalating to staff:
 *
 *   - create_complaint    → Complaint            (source='parent')
 *   - submit_satisfaction → NpsResponse          (needs a resolvable guardian)
 *   - create_registration → PublicBookingRequest (source='whatsapp')
 *
 * Other kinds (appointment / callback / emergency / lookups) keep escalating —
 * they have no clean record mapping in v1.
 *
 * Env-gated SEPARATELY via `ENABLE_WHATSAPP_BOT_RECORDS` (default OFF). When a
 * record IS created the dispatcher still escalates (so staff are notified) but
 * the notification carries the record id.
 *
 * SAFETY: every `create()` payload was matched field-for-field against the live
 * registered schemas (required-no-default fields all filled; only declared keys
 * written; enum values are exact). Clinical condition is NEVER guessed — an
 * unrecognized diagnosis maps to the schema's own "غير متأكد — أحتاج تقييماً"
 * (unsure — needs assessment) value, with the raw text preserved in `notes` for
 * admissions to review. All model loads + creates are defensive (a failure
 * returns `{ ok:false }` so the dispatcher falls back to escalation).
 *
 * The pure mappers (condition / gender / age / NPS scaling / subject) are
 * exported + unit-tested without a DB.
 *
 * @module services/whatsapp/whatsappBotRecords.service
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const reg = require('../../intelligence/whatsapp-bot-flow.registry');
const whatsappService = require('./whatsappService');

// Side-effect kinds that map to a DB record.
const RECORD_KINDS = Object.freeze(
  new Set([
    reg.SIDE_EFFECT.CREATE_COMPLAINT,
    reg.SIDE_EFFECT.SUBMIT_SATISFACTION,
    reg.SIDE_EFFECT.CREATE_REGISTRATION,
  ])
);

function mapsToRecord(kind) {
  return RECORD_KINDS.has(kind);
}

// Exact enum values from the PublicBookingRequest schema (must match byte-for-byte).
const CONDITION = Object.freeze({
  INTELLECTUAL: 'إعاقة ذهنية',
  AUTISM: 'اضطراب طيف التوحد',
  DOWN: 'متلازمة داون',
  LEARNING: 'صعوبات تعلّم',
  DEV_DELAY: 'تأخّر نمو',
  ADHD: 'فرط حركة وتشتت انتباه',
  SPEECH: 'تأخّر نطق ولغة',
  UNSURE: 'غير متأكد — أحتاج تقييماً',
});

// ─── Defensive lazy model loaders ───────────────────────────────────────────
function loadModel(registeredName, requirePath) {
  try {
    return mongoose.model(registeredName);
  } catch {
    try {
      const mod = require(requirePath);
      if (mod && typeof mod.create === 'function') return mod;
      if (mod && mod[registeredName] && typeof mod[registeredName].create === 'function') {
        return mod[registeredName];
      }
      return null;
    } catch (err) {
      logger.warn(`[WhatsApp BotRecords] model ${registeredName} unavailable: ${err.message}`);
      return null;
    }
  }
}
const getComplaintModel = () => loadModel('Complaint', '../../models/Complaint');
const getNpsModel = () => loadModel('NpsResponse', '../../models/NpsResponse');
const getBookingModel = () =>
  loadModel('PublicBookingRequest', '../../models/PublicBookingRequest');
const getFamilyMemberModel = () =>
  loadModel('FamilyMember', '../../domains/family/models/FamilyMember');

// ═══════════════════════════════════════════════════════════════════════════
// PURE mappers (unit-tested without a DB)
// ═══════════════════════════════════════════════════════════════════════════

/** Parse the first whole number out of a free-text age. Returns int or null. */
function parseAge(text) {
  const ascii = reg.toAsciiDigits(String(text == null ? '' : text));
  const m = ascii.match(/\d{1,3}/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) && n >= 0 && n <= 120 ? n : null;
}

/** Map a free-text gender answer to the booking schema enum (male|female|''). */
function mapGender(text) {
  const n = reg.normalize(text);
  if (/(ذكر|ولد|صبي|male|boy|m)\b/.test(n) || n === 'm' || /ذكر|ولد|صبي/.test(n)) return 'male';
  if (/(انثي|بنت|female|girl|f)\b/.test(n) || n === 'f' || /انثي|بنت/.test(n)) return 'female';
  return '';
}

/**
 * Map a free-text prior diagnosis to a conditionType enum. NEVER force-classify
 * an unclear answer — fall back to the schema's "unsure — needs assessment"
 * value (admissions verify). Returns one of the exact enum strings.
 */
function mapConditionType(text) {
  const n = reg.normalize(text);
  if (!n || /^(لا|لايوجد|لا يوجد|no|none|-)$/.test(n.trim())) return CONDITION.UNSURE;
  if (/(توحد|طيف|autis)/.test(n)) return CONDITION.AUTISM;
  if (/(داون|down)/.test(n)) return CONDITION.DOWN;
  if (/(نطق|لغه|تخاطب|كلام|speech|language)/.test(n)) return CONDITION.SPEECH;
  if (/(تعلم|تعلّم|قراءه|كتابه|learning|dyslex)/.test(n)) return CONDITION.LEARNING;
  if (/(فرط|تشتت|انتباه|adhd|hyperactiv)/.test(n)) return CONDITION.ADHD;
  if (/(ذهني|عقلي|تخلف|intellectual|mental)/.test(n)) return CONDITION.INTELLECTUAL;
  if (/(نمو|تاخر|development|delay)/.test(n)) return CONDITION.DEV_DELAY;
  return CONDITION.UNSURE;
}

/** Scale a 1–5 satisfaction rating to a 0–10 NPS score. */
function npsScoreFromRating(ratingText) {
  const ascii = reg.toAsciiDigits(String(ratingText == null ? '' : ratingText));
  const m = ascii.match(/[1-5]/);
  const r = m ? parseInt(m[0], 10) : 3; // default to neutral when unparseable
  return r * 2; // 1→2 … 5→10
}

/** NPS bucket from a 0–10 score. */
function npsBucket(score) {
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
}

/** Derive a short complaint subject from the description (≤80 chars). */
function deriveSubject(description) {
  const d = String(description == null ? '' : description).trim();
  if (!d) return 'شكوى عبر بوت واتساب';
  const firstLine = d.split('\n')[0].trim();
  return (
    (firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine) || 'شكوى عبر بوت واتساب'
  );
}

/** Build the booking notes blob preserving the raw bot answers. */
function buildBookingNotes(collected = {}) {
  const parts = ['طلب عبر بوت واتساب'];
  if (collected.priorDiagnosis) parts.push(`التشخيص المذكور: ${collected.priorDiagnosis}`);
  if (collected.hasReports) parts.push(`تقارير سابقة: ${collected.hasReports}`);
  if (collected.gender) parts.push(`الجنس: ${collected.gender}`);
  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// DB resolvers + record creation
// ═══════════════════════════════════════════════════════════════════════════

/** Best-effort: resolve {guardianId, beneficiaryId, branchId} from the phone. */
async function resolveGuardian(phone) {
  const FamilyMember = getFamilyMemberModel();
  if (!FamilyMember) return null;
  const norm = whatsappService.normalizePhone(phone);
  const m = await FamilyMember.findOne({
    $or: [
      { phone },
      { phone: norm },
      { 'contactInfo.phone': phone },
      { 'contactInfo.phone': norm },
    ],
    isDeleted: { $ne: true },
  })
    .select('_id beneficiaryId branchId')
    .lean()
    .catch(() => null);
  if (!m) return null;
  return {
    guardianId: m._id,
    beneficiaryId: m.beneficiaryId || null,
    branchId: m.branchId || null,
  };
}

async function createComplaint(collected, gctx) {
  const Complaint = getComplaintModel();
  if (!Complaint) return { ok: false, reason: 'model_unavailable' };
  const doc = await Complaint.create({
    source: 'parent',
    type: 'complaint',
    subject: deriveSubject(collected.description),
    description: collected.description || '(لا يوجد وصف مفصّل — عبر بوت واتساب)',
    submitterName: collected.name || gctx.senderName || '',
    submitterPhone: collected.contactPhone || gctx.phone || '',
    ...(gctx.beneficiaryId ? { beneficiaryId: gctx.beneficiaryId } : {}),
    ...(gctx.branchId ? { branchId: gctx.branchId } : {}),
  });
  return { ok: true, kind: 'create_complaint', model: 'Complaint', recordId: String(doc._id) };
}

async function createSatisfaction(collected, gctx) {
  const guardian = await resolveGuardian(gctx.phone);
  if (!guardian || !guardian.guardianId) return { ok: false, reason: 'no_guardian' };
  const Nps = getNpsModel();
  if (!Nps) return { ok: false, reason: 'model_unavailable' };
  const score = npsScoreFromRating(collected.rating);
  const comment = [collected.liked, collected.improve]
    .map(s => (s || '').trim())
    .filter(Boolean)
    .join(' | ');
  const doc = await Nps.create({
    surveyKey: 'whatsapp_satisfaction',
    guardianId: guardian.guardianId,
    score,
    bucket: npsBucket(score),
    sourceChannel: 'whatsapp',
    ...(comment ? { comment } : {}),
    ...(guardian.beneficiaryId ? { beneficiaryId: guardian.beneficiaryId } : {}),
    ...(guardian.branchId ? { branchId: guardian.branchId } : {}),
  });
  return { ok: true, kind: 'submit_satisfaction', model: 'NpsResponse', recordId: String(doc._id) };
}

async function createRegistration(collected, gctx) {
  const age = parseAge(collected.age);
  if (age == null) return { ok: false, reason: 'age_unparseable' };
  const Booking = getBookingModel();
  if (!Booking) return { ok: false, reason: 'model_unavailable' };
  const doc = await Booking.create({
    source: 'whatsapp',
    parentName: collected.guardianName || gctx.senderName || '',
    parentPhone: collected.guardianPhone || gctx.phone || '',
    childName: collected.beneficiaryName || '',
    childAge: age,
    childGender: mapGender(collected.gender),
    conditionType: mapConditionType(collected.priorDiagnosis),
    branchPreference: (collected.city || '').trim() || 'غير محدد',
    preferredTime: 'أي وقت يناسب',
    notes: buildBookingNotes(collected),
  });
  return {
    ok: true,
    kind: 'create_registration',
    model: 'PublicBookingRequest',
    recordId: String(doc._id),
  };
}

/**
 * Create the DB record for a completed bot side effect. Returns
 * `{ ok:true, kind, model, recordId }` or `{ ok:false, reason }` (→ the
 * dispatcher escalates). Never throws.
 *
 * @param {{kind:string, collected:object}} sideEffect
 * @param {{phone:string, senderName?:string}} ctx
 */
async function createRecordFor(sideEffect, ctx = {}) {
  if (!sideEffect || !mapsToRecord(sideEffect.kind)) {
    return { ok: false, reason: 'no_record_mapping' };
  }
  const collected = sideEffect.collected || {};
  const gctx = {
    phone: ctx.phone,
    senderName: ctx.senderName,
    beneficiaryId: null,
    branchId: null,
  };
  // Best-effort beneficiary/branch context for complaint records.
  if (sideEffect.kind === reg.SIDE_EFFECT.CREATE_COMPLAINT) {
    const g = await resolveGuardian(ctx.phone).catch(() => null);
    if (g) {
      gctx.beneficiaryId = g.beneficiaryId;
      gctx.branchId = g.branchId;
    }
  }
  try {
    if (sideEffect.kind === reg.SIDE_EFFECT.CREATE_COMPLAINT)
      return await createComplaint(collected, gctx);
    if (sideEffect.kind === reg.SIDE_EFFECT.SUBMIT_SATISFACTION)
      return await createSatisfaction(collected, gctx);
    if (sideEffect.kind === reg.SIDE_EFFECT.CREATE_REGISTRATION)
      return await createRegistration(collected, gctx);
    return { ok: false, reason: 'no_record_mapping' };
  } catch (err) {
    logger.warn(`[WhatsApp BotRecords] create ${sideEffect.kind} failed: ${err.message}`);
    return { ok: false, reason: 'create_error' };
  }
}

module.exports = {
  RECORD_KINDS,
  mapsToRecord,
  createRecordFor,
  resolveGuardian,
  // pure mappers (exported for unit tests)
  CONDITION,
  parseAge,
  mapGender,
  mapConditionType,
  npsScoreFromRating,
  npsBucket,
  deriveSubject,
  buildBookingNotes,
};

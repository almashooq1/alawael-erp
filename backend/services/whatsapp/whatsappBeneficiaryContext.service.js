/**
 * WhatsApp Beneficiary Context — سياق المستفيد التأهيلي لشريط محادثة واتساب
 * ═══════════════════════════════════════════════════════════════════════════
 * Builds the rehab-context payload shown in the WhatsApp Inbox sidebar when a
 * conversation is linked to a Beneficiary: identity + disability, the active
 * care plan, active therapeutic goals, upcoming sessions (+ their therapists),
 * and outstanding invoices.
 *
 * Design (matches whatsappBotRecords / whatsappBotTimeline doctrine):
 *   - LAZY model lookup via mongoose.model(name) — graceful when a model is not
 *     registered (returns 'unavailable' for that source, never throws).
 *   - Promise.allSettled fan-out — one failing source never blanks the rest.
 *   - The route is the authorization boundary (branch-scoped conversation
 *     lookup); this service only reads the beneficiary's OWN data by id, so it
 *     stays a pure read aggregator with no branch logic of its own.
 *   - Mappers are PURE + exported so the drift guard can assert shape without a
 *     database.
 *
 * @module services/whatsapp/whatsappBeneficiaryContext.service
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// Lazy, defensive model resolver — null when the model isn't registered.
function tryModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

// ─── Pure mappers (no DB, no I/O — exported for the drift guard) ─────────────

function mapBeneficiary(doc) {
  if (!doc) return null;
  const pi = doc.personalInfo || {};
  const dis = doc.disability || {};
  const name =
    [pi.firstName, pi.lastName].filter(Boolean).join(' ').trim() ||
    pi.fullName ||
    doc.fullNameArabic ||
    null;
  return {
    id: String(doc._id),
    name,
    fileNumber: doc.fileNumber || null,
    status: doc.status || null,
    disability: {
      // primaryType preserves the exact (often Arabic) clinical label (W926);
      // type is the coarse English enum used for filtering.
      type: dis.primaryType || dis.type || null,
      severity: dis.severity || doc.disabilityLevel || null,
      level: dis.level || null,
      description: dis.description || null,
    },
  };
}

function mapCarePlan(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    planNumber: doc.planNumber || null,
    title: doc.title || null,
    status: doc.status || null,
    reviewDate: doc.reviewDate || null,
    nextReviewDate: doc.nextReviewDate || null,
  };
}

function mapGoal(doc) {
  return {
    id: String(doc._id),
    title: doc.title || null,
    status: doc.status || null,
    targetDate: doc.targetDate || null,
  };
}

function mapSession(doc) {
  const t = doc.therapistId;
  return {
    id: String(doc._id),
    scheduledDate: doc.scheduledDate || null,
    scheduledStartTime: doc.scheduledStartTime || null,
    type: doc.type || null,
    specialty: doc.specialty || null,
    status: doc.status || null,
    attendanceStatus: doc.attendance?.status || null,
    therapistId: t ? String(t._id || t) : null,
    therapistName: (t && typeof t === 'object' && t.name) || null,
  };
}

function mapInvoice(doc) {
  return {
    id: String(doc._id),
    invoiceNumber: doc.invoiceNumber || null,
    totalAmount: typeof doc.totalAmount === 'number' ? doc.totalAmount : null,
    dueDate: doc.dueDate || null,
    status: doc.status || null,
  };
}

// An invoice is "outstanding" unless fully settled. Case-insensitive on status
// so 'PAID'/'paid' both settle. Pure + unit-testable.
const SETTLED_INVOICE_STATUSES = new Set(['PAID', 'CANCELLED']);
function isOutstanding(inv) {
  return !!inv && !SETTLED_INVOICE_STATUSES.has(String(inv.status || '').toUpperCase());
}

function summarizeInvoices(invoices) {
  const items = (invoices || []).map(mapInvoice);
  const outstanding = items.filter(isOutstanding);
  const outstandingTotal = outstanding.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  return { items, outstandingCount: outstanding.length, outstandingTotal };
}

// Distinct therapists across a set of (populated) sessions, preserving name.
// Pure + unit-testable.
function distinctTherapists(sessions) {
  const seen = new Map();
  for (const s of sessions || []) {
    const t = s?.therapistId;
    if (!t) continue;
    const id = String(t._id || t);
    if (!seen.has(id)) {
      seen.set(id, { id, name: (typeof t === 'object' && t.name) || null });
    }
  }
  return [...seen.values()];
}

const DEFAULT_LIMITS = Object.freeze({ goals: 8, sessions: 5, invoices: 5 });

function emptyContext(sources = {}) {
  return {
    beneficiary: null,
    carePlan: null,
    goals: [],
    upcomingSessions: [],
    therapists: [],
    invoices: { items: [], outstandingCount: 0, outstandingTotal: 0 },
    sources,
  };
}

/**
 * Aggregate the rehab context for one beneficiary.
 * @param {object} opts
 * @param {string|ObjectId} opts.beneficiaryId
 * @param {object} [opts.limits] - { goals, sessions, invoices }
 * @returns {Promise<object>} context payload (never throws)
 */
async function buildContext({ beneficiaryId, limits = {} } = {}) {
  const lim = { ...DEFAULT_LIMITS, ...limits };
  const valid =
    typeof mongoose.isValidObjectId === 'function'
      ? mongoose.isValidObjectId(beneficiaryId)
      : !!beneficiaryId;
  if (!beneficiaryId || !valid) return emptyContext();

  const oid = beneficiaryId;
  const Beneficiary = tryModel('Beneficiary');
  const CarePlan = tryModel('UnifiedCarePlan');
  const Goal = tryModel('TherapeuticGoal');
  const Session = tryModel('ClinicalSession');
  const Invoice = tryModel('Invoice');

  const tasks = [
    [
      'beneficiary',
      Beneficiary,
      () =>
        Beneficiary.findById(oid)
          .select('personalInfo fileNumber status disability disabilityLevel fullNameArabic')
          .lean(),
    ],
    [
      'carePlan',
      CarePlan,
      () =>
        CarePlan.findOne({
          beneficiaryId: oid,
          status: { $in: ['active', 'under_review'] },
          isDeleted: { $ne: true },
        })
          .select('planNumber title status reviewDate nextReviewDate')
          .sort({ updatedAt: -1 })
          .lean(),
    ],
    [
      'goals',
      Goal,
      () =>
        Goal.find({ beneficiaryId: oid, status: 'active', isDeleted: { $ne: true } })
          .select('title status targetDate')
          .sort({ targetDate: 1 })
          .limit(lim.goals)
          .lean(),
    ],
    [
      'sessions',
      Session,
      () =>
        Session.find({
          beneficiaryId: oid,
          status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
        })
          .select('scheduledDate scheduledStartTime type specialty status attendance therapistId')
          .sort({ scheduledDate: 1 })
          .limit(lim.sessions)
          .populate('therapistId', 'name')
          .lean(),
    ],
    [
      'invoices',
      Invoice,
      () =>
        Invoice.find({ beneficiary: oid })
          .select('invoiceNumber totalAmount dueDate status')
          .sort({ issueDate: -1 })
          .limit(lim.invoices)
          .lean(),
    ],
  ];

  const sources = {};
  const settled = await Promise.allSettled(
    tasks.map(async ([key, model, run]) => {
      if (!model) {
        sources[key] = 'unavailable';
        return { key, value: null };
      }
      try {
        const value = await run();
        sources[key] = 'ok';
        return { key, value };
      } catch (err) {
        sources[key] = 'error';
        logger?.warn?.(`[wa-context] ${key} lookup failed: ${err.message}`);
        return { key, value: null };
      }
    })
  );

  const out = emptyContext(sources);
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    const { key, value } = r.value;
    if (key === 'beneficiary') out.beneficiary = mapBeneficiary(value);
    else if (key === 'carePlan') out.carePlan = mapCarePlan(value);
    else if (key === 'goals') out.goals = (value || []).map(mapGoal);
    else if (key === 'sessions') {
      const sess = value || [];
      out.upcomingSessions = sess.map(mapSession);
      out.therapists = distinctTherapists(sess);
    } else if (key === 'invoices') out.invoices = summarizeInvoices(value);
  }
  return out;
}

module.exports = {
  buildContext,
  // Pure helpers exported for the drift guard.
  mapBeneficiary,
  mapCarePlan,
  mapGoal,
  mapSession,
  mapInvoice,
  summarizeInvoices,
  distinctTherapists,
  isOutstanding,
  emptyContext,
  DEFAULT_LIMITS,
};

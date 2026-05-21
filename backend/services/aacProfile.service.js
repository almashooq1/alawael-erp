'use strict';

/**
 * aacProfile.service.js — Wave 263
 * ════════════════════════════════════════════════════════════════════
 * AAC (Augmentative & Alternative Communication) profile management.
 *
 * Public surface:
 *   - getByBeneficiary(beneficiaryId)
 *   - upsertProfile(beneficiaryId, data, actorId)
 *   - listByBranch(branchId, opts)
 *   - transitionPecsPhase({ beneficiaryId, toPhase, criteriaMet, notes }, actorId)
 *   - listOverdueReviews(branchId, opts)
 *
 *   Symbol library:
 *   - listSymbols(opts)
 *   - createSymbol(data, actorId)
 *   - publishSymbol(id, actorId)
 *
 * Lazy mongoose.model() lookup pattern (per CLAUDE.md): each helper
 * resolves the model at call time so unit tests can intercept via
 * `mongoose.model.mockImplementation` or load the schema after the
 * service module is required.
 *
 * Note: this service does NOT enforce authorization — that's done at
 * the route layer via authenticate + requireBranchAccess.
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');

// ─── Lazy model loaders ──────────────────────────────────────────────
function _AacProfile() {
  // Ensure schema is registered (idempotent — model() throws if absent
  // but we want to surface "not registered" cleanly).
  try {
    return mongoose.model('AacProfile');
  } catch (_e) {
    require('../models/AacProfile');
    return mongoose.model('AacProfile');
  }
}

function _AacSymbol() {
  try {
    return mongoose.model('AacSymbolLibrary');
  } catch (_e) {
    require('../models/AacSymbolLibrary');
    return mongoose.model('AacSymbolLibrary');
  }
}

// ─── Validation helpers ──────────────────────────────────────────────
function _requireId(val, label) {
  if (!val) throw new Error(`${label} is required`);
  return String(val);
}

function _clampLimit(limit, max = 200, fallback = 50) {
  const n = parseInt(limit, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n > max ? max : n;
}

// ════════════════════════════════════════════════════════════════════
// Profile CRUD
// ════════════════════════════════════════════════════════════════════

/**
 * Fetch the AAC profile for a beneficiary.
 * @returns {Promise<Object|null>}
 */
async function getByBeneficiary(beneficiaryId) {
  _requireId(beneficiaryId, 'beneficiaryId');
  const doc = await _AacProfile().findOne({ beneficiaryId }).lean();
  return doc || null;
}

/**
 * Create or update the AAC profile for a beneficiary. Profile is keyed
 * by beneficiaryId (unique). PECS transition history is preserved across
 * updates — callers MUST use transitionPecsPhase() to change phases,
 * never overwrite pecsPhase directly via this function (silently
 * stripped).
 */
async function upsertProfile(beneficiaryId, data, actorId) {
  _requireId(beneficiaryId, 'beneficiaryId');
  _requireId(actorId, 'actorId');
  if (!data || typeof data !== 'object') {
    throw new Error('data object is required');
  }
  if (!data.primaryModality) throw new Error('primaryModality is required');
  if (!data.receptiveLanguageLevel) throw new Error('receptiveLanguageLevel is required');
  if (!data.expressiveLanguageLevel) throw new Error('expressiveLanguageLevel is required');
  if (!data.accessMethod) throw new Error('accessMethod is required');
  if (!data.assessedAt) throw new Error('assessedAt is required');

  // Strip pecsPhase — protected from drive-by writes.
  const payload = { ...data };
  delete payload.pecsPhase;

  const Model = _AacProfile();
  const existing = await Model.findOne({ beneficiaryId });

  if (existing) {
    Object.assign(existing, payload);
    existing.updatedBy = actorId;
    if (data.lastReviewedAt) existing.lastReviewedAt = data.lastReviewedAt;
    await existing.save();
    return existing.toObject();
  }

  const doc = new Model({
    beneficiaryId,
    ...payload,
    assessedBy: payload.assessedBy || actorId,
    createdBy: actorId,
    updatedBy: actorId,
  });
  await doc.save();
  return doc.toObject();
}

/**
 * List profiles within a branch (or across branches when omitted).
 * Filters: modality, pecsPhase (current), status, overdueOnly.
 */
async function listByBranch(branchId, opts = {}) {
  const { modality, pecsPhase, status = 'active', overdueOnly = false, limit, skip } = opts;
  const filter = {};
  if (branchId) filter.branchId = branchId;
  if (status) filter.status = status;
  if (modality) filter.primaryModality = modality;
  if (Number.isInteger(pecsPhase) && pecsPhase >= 1 && pecsPhase <= 6) {
    filter['pecsPhase.current'] = pecsPhase;
  }
  if (overdueOnly) {
    filter.nextReviewDue = { $lt: new Date() };
  }

  const Model = _AacProfile();
  const docs = await Model.find(filter)
    .sort({ updatedAt: -1 })
    .skip(parseInt(skip, 10) || 0)
    .limit(_clampLimit(limit))
    .lean();
  const total = await Model.countDocuments(filter);
  return { items: docs, total };
}

/**
 * Append a new PECS phase transition to the profile's history.
 *
 * Rules:
 *  - toPhase must be 1-6
 *  - May only advance by ONE phase at a time UNLESS coming from null
 *    (initial entry into the protocol). Regressions allowed (clinical
 *    re-baselining) but flagged in history via fromPhase > toPhase.
 *  - Adds the fromPhase to masteredPhases when advancing.
 */
async function transitionPecsPhase(input, actorId) {
  if (!input || typeof input !== 'object') {
    throw new Error('transition input is required');
  }
  const { beneficiaryId, toPhase, criteriaMet = [], notes } = input;
  _requireId(beneficiaryId, 'beneficiaryId');
  _requireId(actorId, 'actorId');
  if (!Number.isInteger(toPhase) || toPhase < 1 || toPhase > 6) {
    throw new Error('toPhase must be an integer 1-6');
  }

  const Model = _AacProfile();
  const doc = await Model.findOne({ beneficiaryId });
  if (!doc) {
    throw new Error('AAC profile not found for beneficiary');
  }

  const fromPhase = (doc.pecsPhase && doc.pecsPhase.current) || null;

  // Advancement gate: skipping is allowed only from null (initial entry).
  if (fromPhase && toPhase > fromPhase + 1) {
    throw new Error(
      `Cannot skip phases: current ${fromPhase} → requested ${toPhase} (advance one phase at a time)`
    );
  }

  // Idempotency: no-op if already on the target phase.
  if (fromPhase === toPhase) {
    return doc.toObject();
  }

  doc.pecsPhase = doc.pecsPhase || {};
  doc.pecsPhase.current = toPhase;
  doc.pecsPhase.lastTransitionAt = new Date();
  doc.pecsPhase.lastTransitionBy = actorId;

  // Track mastered phases (only on advancement).
  if (fromPhase && fromPhase < toPhase) {
    const mastered = new Set(doc.pecsPhase.masteredPhases || []);
    mastered.add(fromPhase);
    doc.pecsPhase.masteredPhases = [...mastered].sort((a, b) => a - b);
  }

  doc.pecsPhase.transitionHistory = doc.pecsPhase.transitionHistory || [];
  doc.pecsPhase.transitionHistory.push({
    fromPhase: fromPhase || 0,
    toPhase,
    transitionedAt: new Date(),
    transitionedBy: actorId,
    criteriaMet: Array.isArray(criteriaMet) ? criteriaMet : [],
    notes: notes ? String(notes) : undefined,
  });
  doc.updatedBy = actorId;
  doc.markModified('pecsPhase');
  await doc.save();
  return doc.toObject();
}

/**
 * List profiles whose nextReviewDue is in the past, scoped to a branch
 * when supplied. Useful for therapist worklists + supervisor dashboards.
 */
async function listOverdueReviews(branchId, opts = {}) {
  const { limit } = opts;
  const filter = {
    status: 'active',
    nextReviewDue: { $lt: new Date() },
  };
  if (branchId) filter.branchId = branchId;
  const docs = await _AacProfile()
    .find(filter)
    .sort({ nextReviewDue: 1 })
    .limit(_clampLimit(limit, 500, 100))
    .lean();
  return { items: docs, total: docs.length };
}

// ════════════════════════════════════════════════════════════════════
// Symbol library
// ════════════════════════════════════════════════════════════════════

async function listSymbols(opts = {}) {
  const { category, status = 'published', q, isCulturalSaudi, limit } = opts;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (typeof isCulturalSaudi === 'boolean') filter.isCulturalSaudi = isCulturalSaudi;
  if (q && String(q).trim()) {
    const term = String(q).trim();
    // OR across label_ar/label_en/aliases — case-insensitive substring
    // for short queries (avoids text-index dependency in tests).
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    filter.$or = [{ label_ar: rx }, { label_en: rx }, { aliases: rx }, { code: rx }];
  }
  const docs = await _AacSymbol()
    .find(filter)
    .sort({ label_ar: 1 })
    .limit(_clampLimit(limit, 500, 100))
    .lean();
  return { items: docs, total: docs.length };
}

async function createSymbol(data, actorId) {
  _requireId(actorId, 'actorId');
  if (!data || !data.code || !data.label_ar || !data.category) {
    throw new Error('code, label_ar, and category are required');
  }
  const doc = await _AacSymbol().create({
    ...data,
    createdBy: actorId,
    updatedBy: actorId,
  });
  return doc.toObject();
}

async function publishSymbol(id, actorId) {
  _requireId(id, 'id');
  _requireId(actorId, 'actorId');
  const Model = _AacSymbol();
  const doc = await Model.findById(id);
  if (!doc) throw new Error('symbol not found');
  if (doc.status === 'archived') {
    throw new Error('cannot publish an archived symbol');
  }
  doc.status = 'published';
  doc.publishedAt = new Date();
  doc.publishedBy = actorId;
  doc.updatedBy = actorId;
  await doc.save();
  return doc.toObject();
}

module.exports = {
  // profile
  getByBeneficiary,
  upsertProfile,
  listByBranch,
  transitionPecsPhase,
  listOverdueReviews,
  // symbol library
  listSymbols,
  createSymbol,
  publishSymbol,
};

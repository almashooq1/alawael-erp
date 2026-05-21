'use strict';

/**
 * gas.service.js — Wave 264
 * ════════════════════════════════════════════════════════════════════
 * Goal Attainment Scaling (GAS) — Kiresuk & Sherman 1968 methodology.
 *
 * Public surface (scales):
 *   - createScale({goalId, beneficiaryId, title_ar, domain, levels,
 *                  baselineLevel?, weight?}, actorId)
 *   - getActiveByGoal(goalId)
 *   - listVersions(goalId)
 *   - superseteScale(scaleId, newPayload, supersedeReason_ar, actorId)
 *   - archiveScale(scaleId, archiveReason_ar, actorId)
 *
 * Public surface (scorings):
 *   - recordScoring({scaleId, achievedLevel, scoredAt?, purpose?,
 *                    evidence_ar?, relatedSessionId?,
 *                    relatedMeasureAppId?}, actorId)
 *   - supersedeScoring(scoringId, payload, supersedeReason_ar, actorId)
 *   - listScoringsByGoal(goalId, opts)
 *   - listScoringsByBeneficiary(beneficiaryId, opts)
 *
 * Public surface (analytics):
 *   - computeIndividualTScore(scaleId, opts) — single-goal T-score
 *     across the window
 *   - computeBeneficiaryComposite(beneficiaryId, opts) — multi-goal
 *     composite T-score (Kiresuk formula with weights)
 *
 * Kiresuk T-score formula:
 *      T = 50 + (10 · Σ(wᵢ · xᵢ)) / √((1 - ρ) · Σwᵢ² + ρ · (Σwᵢ)²)
 *
 * where:
 *   - xᵢ = achieved level for scale i (−2..+2)
 *   - wᵢ = weight for scale i
 *   - ρ = inter-correlation estimate; clinical convention 0.30
 *
 * Interpretation:
 *   - T = 50 → all goals met exactly at expected
 *   - T > 50 → exceeding expectations on aggregate
 *   - T < 50 → falling short
 *   - typical clinical bands: ≥60 substantial gain, 40-60 expected,
 *     ≤40 substantial shortfall
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');

// Default inter-correlation between clinical goals — Kiresuk's
// recommended value for unrelated outcome targets.
const DEFAULT_RHO = 0.3;

// ─── Lazy model loaders ──────────────────────────────────────────────
function _Scale() {
  try {
    return mongoose.model('GasScale');
  } catch (_e) {
    require('../models/GasScale');
    return mongoose.model('GasScale');
  }
}

function _Scoring() {
  try {
    return mongoose.model('GasScoring');
  } catch (_e) {
    require('../models/GasScoring');
    return mongoose.model('GasScoring');
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
// Scale lifecycle
// ════════════════════════════════════════════════════════════════════

async function createScale(input, actorId) {
  if (!input || typeof input !== 'object') {
    throw new Error('scale payload is required');
  }
  const {
    goalId,
    beneficiaryId,
    title_ar,
    domain,
    levels,
    baselineLevel = -1,
    expectedOutcomeLevel = 0,
    weight = 1,
    title_en,
    branchId,
    organizationId,
  } = input;

  _requireId(goalId, 'goalId');
  _requireId(beneficiaryId, 'beneficiaryId');
  _requireId(actorId, 'actorId');
  if (!title_ar) throw new Error('title_ar is required');
  if (!domain) throw new Error('domain is required');
  if (!Array.isArray(levels) || levels.length !== 5) {
    throw new Error('levels must be an array of exactly 5 entries');
  }

  // Pre-flight: refuse to create when an active scale already exists
  // for the goal. Caller should use supersedeScale() for upgrades.
  const existing = await _Scale().findOne({ goalId, status: 'active' });
  if (existing) {
    throw new Error(
      `An active GAS scale already exists for this goal (id=${existing._id}). Use supersedeScale() to revise.`
    );
  }

  const doc = await _Scale().create({
    goalId,
    beneficiaryId,
    branchId: branchId || undefined,
    organizationId: organizationId || undefined,
    title_ar,
    title_en: title_en || undefined,
    domain,
    levels,
    baselineLevel,
    expectedOutcomeLevel,
    weight,
    version: 1,
    status: 'active',
    createdBy: actorId,
    updatedBy: actorId,
  });
  return doc.toObject();
}

async function getActiveByGoal(goalId) {
  _requireId(goalId, 'goalId');
  const doc = await _Scale().findOne({ goalId, status: 'active' }).lean();
  return doc || null;
}

async function listVersions(goalId) {
  _requireId(goalId, 'goalId');
  const docs = await _Scale().find({ goalId }).sort({ version: 1 }).lean();
  return docs;
}

async function supersedeScale(scaleId, newPayload, supersedeReason_ar, actorId) {
  _requireId(scaleId, 'scaleId');
  _requireId(actorId, 'actorId');
  if (!supersedeReason_ar || !String(supersedeReason_ar).trim()) {
    throw new Error('supersedeReason_ar is required');
  }
  if (!newPayload || typeof newPayload !== 'object') {
    throw new Error('newPayload is required');
  }

  const Scale = _Scale();
  const old = await Scale.findById(scaleId);
  if (!old) throw new Error('GAS scale not found');
  if (old.status !== 'active') {
    throw new Error(`Cannot supersede a ${old.status} scale`);
  }

  // Mark old as superseded; create new active version.
  old.status = 'superseded';
  old.updatedBy = actorId;
  await old.save();

  const next = await Scale.create({
    goalId: old.goalId,
    beneficiaryId: old.beneficiaryId,
    branchId: old.branchId,
    organizationId: old.organizationId,
    title_ar: newPayload.title_ar ?? old.title_ar,
    title_en: newPayload.title_en ?? old.title_en,
    domain: newPayload.domain ?? old.domain,
    levels: newPayload.levels ?? old.levels,
    baselineLevel: newPayload.baselineLevel ?? old.baselineLevel,
    expectedOutcomeLevel: newPayload.expectedOutcomeLevel ?? old.expectedOutcomeLevel,
    weight: newPayload.weight ?? old.weight,
    version: (old.version || 1) + 1,
    supersedes: old._id,
    supersedeReason_ar,
    status: 'active',
    createdBy: actorId,
    updatedBy: actorId,
  });
  return next.toObject();
}

async function archiveScale(scaleId, archiveReason_ar, actorId) {
  _requireId(scaleId, 'scaleId');
  _requireId(actorId, 'actorId');
  if (!archiveReason_ar || !String(archiveReason_ar).trim()) {
    throw new Error('archiveReason_ar is required');
  }
  const doc = await _Scale().findById(scaleId);
  if (!doc) throw new Error('GAS scale not found');
  if (doc.status === 'archived') return doc.toObject();
  doc.status = 'archived';
  doc.archivedAt = new Date();
  doc.archivedBy = actorId;
  doc.archiveReason_ar = archiveReason_ar;
  doc.updatedBy = actorId;
  await doc.save();
  return doc.toObject();
}

// ════════════════════════════════════════════════════════════════════
// Scoring lifecycle
// ════════════════════════════════════════════════════════════════════

async function recordScoring(input, actorId) {
  if (!input || typeof input !== 'object') {
    throw new Error('scoring payload is required');
  }
  const {
    scaleId,
    achievedLevel,
    scoredAt,
    purpose = 'progress',
    evidence_ar,
    evidence_en,
    relatedSessionId,
    relatedMeasureAppId,
  } = input;
  _requireId(scaleId, 'scaleId');
  _requireId(actorId, 'actorId');
  if (![-2, -1, 0, 1, 2].includes(achievedLevel)) {
    throw new Error('achievedLevel must be one of -2/-1/0/1/2');
  }

  const scale = await _Scale().findById(scaleId).lean();
  if (!scale) throw new Error('GAS scale not found');
  if (scale.status === 'archived') {
    throw new Error('Cannot score against an archived scale');
  }

  // Find the level description matching this achievedLevel for the
  // snapshot. Falls back to empty string if missing (defensive).
  const matchedLevel = (scale.levels || []).find(l => l.level === achievedLevel);
  const levelDescription_ar = matchedLevel ? matchedLevel.description_ar : '';

  const doc = await _Scoring().create({
    scaleId,
    goalId: scale.goalId,
    beneficiaryId: scale.beneficiaryId,
    branchId: scale.branchId,
    achievedLevel,
    scoredAt: scoredAt ? new Date(scoredAt) : new Date(),
    scoredBy: actorId,
    purpose,
    evidence_ar: evidence_ar || undefined,
    evidence_en: evidence_en || undefined,
    relatedSessionId: relatedSessionId || undefined,
    relatedMeasureAppId: relatedMeasureAppId || undefined,
    snapshot: {
      scaleVersion: scale.version,
      weight: scale.weight,
      expectedOutcomeLevel: scale.expectedOutcomeLevel,
      baselineLevel: scale.baselineLevel,
      levelDescription_ar,
    },
    status: 'active',
  });
  return doc.toObject();
}

async function supersedeScoring(scoringId, payload, supersedeReason_ar, actorId) {
  _requireId(scoringId, 'scoringId');
  _requireId(actorId, 'actorId');
  if (!supersedeReason_ar || !String(supersedeReason_ar).trim()) {
    throw new Error('supersedeReason_ar is required');
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('payload is required');
  }
  if (![-2, -1, 0, 1, 2].includes(payload.achievedLevel)) {
    throw new Error('achievedLevel must be one of -2/-1/0/1/2');
  }

  const Scoring = _Scoring();
  const old = await Scoring.findById(scoringId);
  if (!old) throw new Error('GAS scoring not found');
  if (old.status !== 'active') {
    throw new Error(`Cannot supersede a ${old.status} scoring`);
  }

  // Re-fetch the live scale to refresh the snapshot.
  const scale = await _Scale().findById(old.scaleId).lean();
  if (!scale) throw new Error('parent GAS scale not found');
  const matchedLevel = (scale.levels || []).find(l => l.level === payload.achievedLevel);

  const next = await Scoring.create({
    scaleId: old.scaleId,
    goalId: old.goalId,
    beneficiaryId: old.beneficiaryId,
    branchId: old.branchId,
    achievedLevel: payload.achievedLevel,
    scoredAt: payload.scoredAt ? new Date(payload.scoredAt) : new Date(),
    scoredBy: actorId,
    purpose: payload.purpose ?? old.purpose,
    evidence_ar: payload.evidence_ar ?? old.evidence_ar,
    relatedSessionId: payload.relatedSessionId ?? old.relatedSessionId,
    relatedMeasureAppId: payload.relatedMeasureAppId ?? old.relatedMeasureAppId,
    snapshot: {
      scaleVersion: scale.version,
      weight: scale.weight,
      expectedOutcomeLevel: scale.expectedOutcomeLevel,
      baselineLevel: scale.baselineLevel,
      levelDescription_ar: matchedLevel ? matchedLevel.description_ar : '',
    },
    status: 'active',
  });

  old.status = 'superseded';
  old.supersededBy = next._id;
  old.supersedeReason_ar = supersedeReason_ar;
  await old.save();

  return next.toObject();
}

async function listScoringsByGoal(goalId, opts = {}) {
  _requireId(goalId, 'goalId');
  const { from, to, includeSuperseded = false, limit } = opts;
  const filter = { goalId };
  if (!includeSuperseded) filter.status = 'active';
  if (from || to) {
    filter.scoredAt = {};
    if (from) filter.scoredAt.$gte = new Date(from);
    if (to) filter.scoredAt.$lte = new Date(to);
  }
  const docs = await _Scoring()
    .find(filter)
    .sort({ scoredAt: 1 })
    .limit(_clampLimit(limit, 500, 200))
    .lean();
  return { items: docs, total: docs.length };
}

async function listScoringsByBeneficiary(beneficiaryId, opts = {}) {
  _requireId(beneficiaryId, 'beneficiaryId');
  const { from, to, includeSuperseded = false, limit } = opts;
  const filter = { beneficiaryId };
  if (!includeSuperseded) filter.status = 'active';
  if (from || to) {
    filter.scoredAt = {};
    if (from) filter.scoredAt.$gte = new Date(from);
    if (to) filter.scoredAt.$lte = new Date(to);
  }
  const docs = await _Scoring()
    .find(filter)
    .sort({ scoredAt: -1 })
    .limit(_clampLimit(limit, 500, 200))
    .lean();
  return { items: docs, total: docs.length };
}

// ════════════════════════════════════════════════════════════════════
// Analytics — T-score computation
// ════════════════════════════════════════════════════════════════════

/**
 * Compute the LATEST T-score for a single scale.
 * Treats the goal as a "1-goal composite" via Kiresuk's formula — for
 * a single scale the formula simplifies but we keep it general for
 * symmetry with multi-goal composites.
 *
 * Returns null when no active scoring exists.
 */
async function computeIndividualTScore(scaleId, opts = {}) {
  _requireId(scaleId, 'scaleId');
  const rho = typeof opts.rho === 'number' ? opts.rho : DEFAULT_RHO;
  const filter = { scaleId, status: 'active' };
  if (opts.upTo) filter.scoredAt = { $lte: new Date(opts.upTo) };

  const latest = await _Scoring().findOne(filter).sort({ scoredAt: -1 }).lean();
  if (!latest) return null;

  const x = latest.achievedLevel;
  const w = (latest.snapshot && latest.snapshot.weight) || 1;
  return _tScore([{ x, w }], rho);
}

/**
 * Composite T-score across ALL active scales belonging to a
 * beneficiary, using the LATEST active scoring of each within the
 * window (or up to a given moment).
 *
 * Behaviour:
 *   - For each active scale that has ≥1 active scoring in window:
 *     pull the most-recent achievedLevel + the scale's weight.
 *   - Scales without a scoring contribute nothing (per Kiresuk
 *     convention — un-scored goals are excluded, not assumed at 0).
 *   - Returns { tScore, contributingScales, missingScales, totals }.
 */
async function computeBeneficiaryComposite(beneficiaryId, opts = {}) {
  _requireId(beneficiaryId, 'beneficiaryId');
  const rho = typeof opts.rho === 'number' ? opts.rho : DEFAULT_RHO;
  const upTo = opts.upTo ? new Date(opts.upTo) : null;
  const from = opts.from ? new Date(opts.from) : null;

  const scales = await _Scale().find({ beneficiaryId, status: 'active' }).lean();
  if (scales.length === 0) {
    return {
      tScore: null,
      contributingScales: [],
      missingScales: [],
      totals: { contributing: 0, missing: 0 },
    };
  }

  const contributingScales = [];
  const missingScales = [];

  for (const scale of scales) {
    const scoringFilter = { scaleId: scale._id, status: 'active' };
    if (upTo || from) {
      scoringFilter.scoredAt = {};
      if (from) scoringFilter.scoredAt.$gte = from;
      if (upTo) scoringFilter.scoredAt.$lte = upTo;
    }
    const latest = await _Scoring().findOne(scoringFilter).sort({ scoredAt: -1 }).lean();
    if (latest) {
      contributingScales.push({
        scaleId: scale._id,
        goalId: scale.goalId,
        title_ar: scale.title_ar,
        domain: scale.domain,
        weight: scale.weight,
        achievedLevel: latest.achievedLevel,
        scoredAt: latest.scoredAt,
      });
    } else {
      missingScales.push({
        scaleId: scale._id,
        goalId: scale.goalId,
        title_ar: scale.title_ar,
        domain: scale.domain,
        weight: scale.weight,
      });
    }
  }

  const tScore =
    contributingScales.length === 0
      ? null
      : _tScore(
          contributingScales.map(c => ({ x: c.achievedLevel, w: c.weight })),
          rho
        );

  return {
    tScore,
    contributingScales,
    missingScales,
    totals: {
      contributing: contributingScales.length,
      missing: missingScales.length,
    },
  };
}

/**
 * Pure Kiresuk T-score implementation.
 *
 * @param {Array<{x: number, w: number}>} items
 * @param {number} rho default DEFAULT_RHO
 * @returns {number|null} T-score (50 = at-expected); null when items empty
 */
function _tScore(items, rho) {
  if (!Array.isArray(items) || items.length === 0) return null;
  let sumWX = 0;
  let sumW = 0;
  let sumW2 = 0;
  for (const it of items) {
    const w = typeof it.w === 'number' ? it.w : 1;
    const x = typeof it.x === 'number' ? it.x : 0;
    sumWX += w * x;
    sumW += w;
    sumW2 += w * w;
  }
  const denomSq = (1 - rho) * sumW2 + rho * sumW * sumW;
  if (denomSq <= 0) return null;
  const t = 50 + (10 * sumWX) / Math.sqrt(denomSq);
  return Number(t.toFixed(2));
}

module.exports = {
  // scales
  createScale,
  getActiveByGoal,
  listVersions,
  supersedeScale,
  archiveScale,
  // scorings
  recordScoring,
  supersedeScoring,
  listScoringsByGoal,
  listScoringsByBeneficiary,
  // analytics
  computeIndividualTScore,
  computeBeneficiaryComposite,
  // pure helper exported for tests
  _tScore,
  DEFAULT_RHO,
};

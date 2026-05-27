'use strict';

/**
 * caseload-rebalance.service.js — Wave 510 (Phase E3 — Active caseload
 * rebalance suggestions).
 *
 * Read-only analysis service that surfaces rebalance OPPORTUNITIES — pairs
 * of (overloaded therapist, underloaded therapist) where moving a specific
 * open MeasureAlert from A to B would BOTH (1) drop A below the overload
 * threshold AND (2) score the move higher than the current assignment via
 * the W432 caseload-matcher.
 *
 * Critically: this service NEVER writes. It returns suggestions. The
 * decision to move an alert (and the corresponding `MeasureAlert.assigneeId`
 * update) is a HUMAN-in-the-loop action via the supervisor UI. The W509
 * auto-assignment subscriber owns the initial assignment; this is for
 * post-hoc rebalancing only.
 *
 * Why suggestion-only (not auto-execute)
 *   1. Caseload moves break beneficiary continuity (the W432 history factor
 *      penalizes this). Auto-moving would override that signal silently.
 *   2. Supervisors carry the org-political risk of "you reassigned my case"
 *      conversations. The system surfaces the math; humans absorb the
 *      narrative.
 *   3. Move side-effects (notify both therapists, update calendars, log
 *      audit) are best done as one transactional service in a future wave
 *      once the suggestion flow is validated.
 *
 * Public surface:
 *   suggestRebalanceMoves({ branchId, overloadThreshold?, scoreImprovementThreshold?, maxSuggestions? })
 *     → { branchId, generatedAt, overloaded[], underloaded[], suggestions[] }
 *
 *   Each suggestion:
 *     { alertId, currentTherapistId, suggestedTherapistId,
 *       currentScore, suggestedScore, scoreImprovement, signals }
 *
 * Pure function — caller owns the data fetch (we delegate to the same
 * mongoose models the W509 service uses). Returns a deterministic shape
 * the route layer can pass through as JSON.
 */

const mongoose = require('mongoose');
const matcher = require('../intelligence/caseload-matcher.lib');

// Same sentinel as W509 — keeps the matcher's specialty hard gate from
// excluding therapists with empty specialties[] in the auto-pipeline.
const GENERAL_SPECIALTY_SENTINEL = '__w509_general__';

// Defaults
const DEFAULT_OVERLOAD_THRESHOLD = 12; // open alerts per therapist
const DEFAULT_SCORE_IMPROVEMENT_THRESHOLD = 0.1; // 10% better than current
const DEFAULT_MAX_SUGGESTIONS = 50;
const DEFAULT_MAX_LOAD = 30; // matches W509

function _modelOrNull(name, fallbackPath) {
  try {
    return mongoose.model(name);
  } catch {
    try {
      require(fallbackPath);
      return mongoose.model(name);
    } catch {
      return null;
    }
  }
}

function _normalizeTherapist(u, currentLoad, historyCount = 0) {
  const rawSpecs = u.specialties || (u.primarySpecialty ? [u.primarySpecialty] : []);
  const specialties =
    Array.isArray(rawSpecs) && rawSpecs.length > 0
      ? [...rawSpecs, GENERAL_SPECIALTY_SENTINEL]
      : [GENERAL_SPECIALTY_SENTINEL];
  return {
    id: String(u._id),
    specialties,
    branchId: u.branchId ? String(u.branchId) : null,
    regionId: u.regionId ? String(u.regionId) : null,
    languages: u.languages || (u.primaryLanguage ? [u.primaryLanguage] : []),
    gender: u.gender || null,
    experienceYears: Number.isFinite(u.experienceYears) ? u.experienceYears : 0,
    currentLoad: Number.isFinite(currentLoad) ? currentLoad : 0,
    priorSessionsWithBeneficiary180d: Number.isFinite(historyCount) ? historyCount : 0,
  };
}

function _beneficiaryShape(alert, beneficiary) {
  const declaredSpec = beneficiary?.requiredSpecialty;
  const requiredSpecialty = declaredSpec
    ? Array.isArray(declaredSpec)
      ? [...declaredSpec, GENERAL_SPECIALTY_SENTINEL]
      : [declaredSpec, GENERAL_SPECIALTY_SENTINEL]
    : [GENERAL_SPECIALTY_SENTINEL];
  return {
    branchId: alert.branchId ? String(alert.branchId) : beneficiary?.branchId,
    regionId: beneficiary?.regionId ? String(beneficiary.regionId) : null,
    languages: beneficiary?.languages || [],
    primaryLanguage: beneficiary?.primaryLanguage || null,
    gender: beneficiary?.gender || null,
    preferredTherapistGender: beneficiary?.preferredTherapistGender || null,
    requiredSpecialty,
  };
}

/**
 * Aggregate open-alert count per assignee in a branch.
 *
 * @returns Map<therapistId-string, count>
 */
async function _loadByTherapistInBranch({ MeasureAlert, branchId }) {
  const match = { status: 'open', assigneeId: { $ne: null } };
  if (branchId) {
    match.branchId = mongoose.Types.ObjectId.isValid(branchId)
      ? new mongoose.Types.ObjectId(branchId)
      : branchId;
  }
  const rows = await MeasureAlert.aggregate([
    { $match: match },
    { $group: { _id: '$assigneeId', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map(r => [String(r._id), r.count]));
}

/**
 * Suggest rebalance moves for a branch. Returns an analysis envelope —
 * never writes.
 *
 * @param {Object} args
 *   @param {string|ObjectId} args.branchId — required
 *   @param {number} [args.overloadThreshold=12]
 *   @param {number} [args.scoreImprovementThreshold=0.1]
 *   @param {number} [args.maxSuggestions=50]
 * @returns {Promise<{branchId, generatedAt, overloaded, underloaded, suggestions, reason?}>}
 */
async function suggestRebalanceMoves({
  branchId,
  overloadThreshold = DEFAULT_OVERLOAD_THRESHOLD,
  scoreImprovementThreshold = DEFAULT_SCORE_IMPROVEMENT_THRESHOLD,
  maxSuggestions = DEFAULT_MAX_SUGGESTIONS,
} = {}) {
  if (!branchId) throw new Error('[caseload-rebalance] branchId required');

  const MeasureAlert = _modelOrNull('MeasureAlert', '../domains/goals/models/MeasureAlert');
  const Beneficiary = _modelOrNull('Beneficiary', '../models/Beneficiary');
  const User = _modelOrNull('User', '../models/User');
  if (!MeasureAlert || !Beneficiary || !User) {
    return {
      branchId: String(branchId),
      generatedAt: new Date().toISOString(),
      overloaded: [],
      underloaded: [],
      suggestions: [],
      reason: 'models_unavailable',
    };
  }

  // Step 1: fetch therapists in branch + their current loads.
  const therapists = await User.find({
    role: 'therapist',
    isActive: { $ne: false },
    branchId,
  })
    .select(
      '_id firstName_ar lastName_ar firstName_en lastName_en ' +
        'specialties primarySpecialty branchId regionId ' +
        'languages primaryLanguage gender experienceYears'
    )
    .lean();
  if (therapists.length < 2) {
    return {
      branchId: String(branchId),
      generatedAt: new Date().toISOString(),
      overloaded: [],
      underloaded: [],
      suggestions: [],
      reason: 'insufficient_therapists',
    };
  }

  const loadMap = await _loadByTherapistInBranch({ MeasureAlert, branchId });
  const enriched = therapists.map(t => ({
    therapist: t,
    load: loadMap.get(String(t._id)) || 0,
  }));

  // Step 2: split into overloaded / underloaded buckets.
  const overloaded = enriched.filter(e => e.load > overloadThreshold);
  const underloaded = enriched.filter(e => e.load < overloadThreshold);

  if (overloaded.length === 0 || underloaded.length === 0) {
    return {
      branchId: String(branchId),
      generatedAt: new Date().toISOString(),
      overloaded: overloaded.map(o => ({
        therapistId: String(o.therapist._id),
        load: o.load,
      })),
      underloaded: underloaded.map(o => ({
        therapistId: String(o.therapist._id),
        load: o.load,
      })),
      suggestions: [],
      reason: overloaded.length === 0 ? 'no_overloaded' : 'no_underloaded',
    };
  }

  // Step 3: enumerate open alerts on overloaded therapists.
  const overloadedIds = overloaded.map(o => o.therapist._id);
  const candidateAlerts = await MeasureAlert.find({
    status: 'open',
    branchId,
    assigneeId: { $in: overloadedIds },
  })
    .select('_id beneficiaryId branchId assigneeId alertType severity')
    .limit(500) // sanity cap; rebalancing 500+ alerts at once is unusual
    .lean();

  if (candidateAlerts.length === 0) {
    return {
      branchId: String(branchId),
      generatedAt: new Date().toISOString(),
      overloaded: overloaded.map(o => ({
        therapistId: String(o.therapist._id),
        load: o.load,
      })),
      underloaded: underloaded.map(o => ({
        therapistId: String(o.therapist._id),
        load: o.load,
      })),
      suggestions: [],
      reason: 'no_alerts_to_move',
    };
  }

  // Step 4: per-alert scoring — current vs best underloaded candidate.
  // Fetch beneficiaries in one round-trip.
  const beneficiaryIds = [...new Set(candidateAlerts.map(a => String(a.beneficiaryId)))];
  const beneficiaries = await Beneficiary.find({ _id: { $in: beneficiaryIds } })
    .select(
      '_id branchId regionId languages primaryLanguage gender ' +
        'requiredSpecialty preferredTherapistGender'
    )
    .lean();
  const benMap = new Map(beneficiaries.map(b => [String(b._id), b]));

  // Pre-normalize underloaded + overloaded therapists once.
  const underloadedNorm = underloaded.map(u => _normalizeTherapist(u.therapist, u.load, 0));
  const overloadedById = new Map(
    overloaded.map(o => [String(o.therapist._id), _normalizeTherapist(o.therapist, o.load, 0)])
  );

  const suggestions = [];
  for (const alert of candidateAlerts) {
    if (suggestions.length >= maxSuggestions) break;
    const beneficiary = benMap.get(String(alert.beneficiaryId));
    const beneficiaryShape = _beneficiaryShape(alert, beneficiary);

    // Score the current therapist
    const current = overloadedById.get(String(alert.assigneeId));
    if (!current) continue;
    const currentResult = matcher.scoreCandidate(current, beneficiaryShape, {
      maxLoad: DEFAULT_MAX_LOAD,
    });

    // Score every underloaded candidate, pick the highest
    let best = null;
    for (const cand of underloadedNorm) {
      const r = matcher.scoreCandidate(cand, beneficiaryShape, {
        maxLoad: DEFAULT_MAX_LOAD,
      });
      if (r.excluded) continue;
      if (!best || r.score > best.score) {
        best = { therapist: cand, score: r.score, signals: r.signals || [] };
      }
    }
    if (!best) continue;

    const improvement = best.score - (currentResult.score || 0);
    if (improvement < scoreImprovementThreshold) continue;

    suggestions.push({
      alertId: String(alert._id),
      beneficiaryId: String(alert.beneficiaryId),
      currentTherapistId: String(alert.assigneeId),
      currentScore: Number(currentResult.score?.toFixed(3) ?? 0),
      suggestedTherapistId: String(best.therapist.id),
      suggestedScore: Number(best.score.toFixed(3)),
      scoreImprovement: Number(improvement.toFixed(3)),
      alertType: alert.alertType,
      severity: alert.severity,
      signals: best.signals,
    });
  }

  // Sort suggestions DESC by scoreImprovement so the most impactful moves
  // surface first.
  suggestions.sort((a, b) => b.scoreImprovement - a.scoreImprovement);

  return {
    branchId: String(branchId),
    generatedAt: new Date().toISOString(),
    overloaded: overloaded.map(o => ({
      therapistId: String(o.therapist._id),
      load: o.load,
    })),
    underloaded: underloaded.map(o => ({
      therapistId: String(o.therapist._id),
      load: o.load,
    })),
    suggestions: suggestions.slice(0, maxSuggestions),
  };
}

/**
 * W512 Phase E3 follow-up — APPLY a single rebalance move atomically.
 *
 * Counterpart to suggestRebalanceMoves (W510): the suggestion service
 * is read-only; this writes the actual `MeasureAlert.assigneeId` update.
 * Strict conditional update — only succeeds if the alert is STILL open
 * AND STILL assigned to the expected fromTherapistId. Concurrent moves,
 * auto-resolve flips, manual reassignment, and stale suggestion lists
 * are all naturally filtered.
 *
 * Public contract:
 *   applyMove({ alertId, fromTherapistId, toTherapistId, reason?, actorId? })
 *     → { action: 'applied' | 'skipped', reason?, alert? }
 *
 *   action='applied'  : MeasureAlert was updated, returns the new doc
 *   action='skipped'  : one of:
 *     'alert_not_found'        — alertId doesn't resolve
 *     'not_open'               — status is already resolved/dismissed
 *     'not_currently_assigned' — assigneeId no longer matches fromTherapistId
 *                                (stale suggestion — someone else moved it)
 *     'same_therapist'         — from === to (no-op)
 *     'invalid_to_therapist'   — toTherapistId doesn't exist or is inactive
 *     'models_unavailable'     — schema not loaded
 *
 * Does NOT (yet):
 *   - Emit medical.measure_alert.reassigned event (future wave — needs new
 *     contract + W506 ACL update)
 *   - Send notifications to either therapist (future move-notify service)
 *   - Sync calendars
 *
 * What it DOES:
 *   - Atomic MeasureAlert.findOneAndUpdate with status+from filter
 *   - Validates toTherapistId exists + isActive + role='therapist'
 *   - Same branch as the alert (cross-branch reassignment forbidden)
 *   - Caller passes actorId for audit attribution (route adds the audit log)
 */
async function applyMove({
  alertId,
  fromTherapistId,
  toTherapistId,
  reason: _reason,
  actorId: _actorId,
} = {}) {
  if (!alertId) throw new Error('[caseload-rebalance.applyMove] alertId required');
  if (!fromTherapistId) throw new Error('[caseload-rebalance.applyMove] fromTherapistId required');
  if (!toTherapistId) throw new Error('[caseload-rebalance.applyMove] toTherapistId required');
  if (String(fromTherapistId) === String(toTherapistId)) {
    return { action: 'skipped', reason: 'same_therapist' };
  }

  const MeasureAlert = _modelOrNull('MeasureAlert', '../domains/goals/models/MeasureAlert');
  const User = _modelOrNull('User', '../models/User');
  if (!MeasureAlert || !User) {
    return { action: 'skipped', reason: 'models_unavailable' };
  }

  // Step 1: load the alert and sanity-check current state.
  const alert = await MeasureAlert.findById(alertId)
    .select('_id beneficiaryId branchId status assigneeId alertType severity')
    .lean();
  if (!alert) return { action: 'skipped', reason: 'alert_not_found' };
  if (alert.status !== 'open') return { action: 'skipped', reason: 'not_open' };
  if (!alert.assigneeId || String(alert.assigneeId) !== String(fromTherapistId)) {
    return { action: 'skipped', reason: 'not_currently_assigned' };
  }

  // Step 2: validate target therapist is real, active, same branch.
  const toUser = await User.findById(toTherapistId).select('_id role isActive branchId').lean();
  if (!toUser) return { action: 'skipped', reason: 'invalid_to_therapist' };
  if (toUser.role !== 'therapist' || toUser.isActive === false) {
    return { action: 'skipped', reason: 'invalid_to_therapist' };
  }
  if (alert.branchId && String(toUser.branchId) !== String(alert.branchId)) {
    return { action: 'skipped', reason: 'invalid_to_therapist' };
  }

  // Step 3: atomic conditional update — only the FIRST caller that sees
  // the expected (status='open', assigneeId=fromTherapistId) wins.
  const updated = await MeasureAlert.findOneAndUpdate(
    { _id: alertId, assigneeId: fromTherapistId, status: 'open' },
    { $set: { assigneeId: new mongoose.Types.ObjectId(String(toTherapistId)) } },
    { new: true }
  ).lean();

  if (!updated) {
    return { action: 'skipped', reason: 'not_currently_assigned' };
  }

  return { action: 'applied', alert: updated };
}

module.exports = {
  suggestRebalanceMoves,
  applyMove,
  // Exported for tests
  _loadByTherapistInBranch,
  _normalizeTherapist,
  _beneficiaryShape,
  DEFAULT_OVERLOAD_THRESHOLD,
  DEFAULT_SCORE_IMPROVEMENT_THRESHOLD,
  DEFAULT_MAX_SUGGESTIONS,
};

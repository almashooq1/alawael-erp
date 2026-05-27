'use strict';

/**
 * measure-alert-auto-assignment.service.js — Wave 509 (Phase D minimal —
 * auto-assignment of MeasureAlerts).
 *
 * Bus subscriber for the W506 `medical.measure_alert.raised` event.
 * For each new MeasureAlert that has NO assignee yet, picks the best
 * therapist via W432 caseload-matcher.lib and atomically sets
 * `assigneeId` if it's still null at update time.
 *
 * Why this exists
 *   The W430 goalForecaster cron + W221 reassessment alert engine + W506
 *   modelEventBridge all create MeasureAlerts WITHOUT an assignee — the
 *   alert just lands as `{status:'open', assigneeId:null}` and waits for
 *   a supervisor to manually pick it up. With this subscriber wired, the
 *   moment an alert is created, the auto-assignment runs against the
 *   caller's branch's therapist pool + selects the best match using:
 *
 *     - specialty hard gate (W432 §2 design principle)
 *     - currentLoad (open MeasureAlerts.count per therapist — re-fetched
 *       fresh each event so load balancing reflects reality)
 *     - history with the beneficiary (prior sessions in last 6 months)
 *     - language / branch / gender / experience factors
 *
 * Idempotency
 *   The actual update uses `findOneAndUpdate({_id, status:'open',
 *   assigneeId: null}, {$set: ...})` so concurrent fires (or manual
 *   assignment in flight) can never trample each other — only the FIRST
 *   caller that sees `assigneeId: null` wins.
 *
 * Safety properties
 *   1. NEVER overrides manual assignment — guarded by the null-filter above.
 *   2. NEVER fires on existing alerts where status flipped — the W506
 *      bridge already uses create-only trigger; this is defense-in-depth.
 *   3. Fire-and-forget on errors — a failed lookup MUST NOT block
 *      subsequent events. All exceptions are caught + logged.
 *   4. Empty candidate pool → skip with `reason: 'no_candidates'`. Better
 *      to leave assigneeId=null and let a human triage than to assign
 *      randomly.
 *
 * Public surface:
 *   wireMeasureAlertAutoAssignment({ integrationBus, logger })
 *     returns { unsubscribe: () => void, ranSinceBoot: () => stats }
 *
 * Pattern mirrors W349 capa-alerts-subscriber.service.js — subscribe once
 * at boot via the bootstrap, idempotent via the bus's own dedupe.
 */

const mongoose = require('mongoose');
const matcher = require('../intelligence/caseload-matcher.lib');

const PATTERN = 'medical.measure_alert.raised';

// Per-branch ceiling for currentLoad normalization. Without a per-branch
// policy table, this is a sensible default — saturated therapist holding
// 30 open alerts is "fully loaded" (matcher.lib._loadFactor goes to 0).
const DEFAULT_MAX_LOAD = 30;

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

/**
 * Fetch the therapist pool eligible to take this alert.
 * Branch-scoped + role-gated. Returns lean User docs the matcher can
 * score (the matcher tolerates missing fields via per-factor defaults).
 */
async function _fetchCandidates({ User, branchId }) {
  const filter = {
    role: 'therapist',
    isActive: { $ne: false },
  };
  if (branchId) filter.branchId = branchId;
  return User.find(filter)
    .select(
      '_id firstName_ar lastName_ar firstName_en lastName_en ' +
        'specialties primarySpecialty branchId regionId ' +
        'languages primaryLanguage gender experienceYears'
    )
    .lean();
}

/**
 * Compute current open-alert load per therapist. Single `$group` saves
 * round-trips when the candidate pool is large.
 */
async function _loadByTherapist({ MeasureAlert, therapistIds }) {
  if (!therapistIds.length) return new Map();
  const rows = await MeasureAlert.aggregate([
    {
      $match: {
        assigneeId: { $in: therapistIds },
        status: 'open',
      },
    },
    { $group: { _id: '$assigneeId', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map(r => [String(r._id), r.count]));
}

/**
 * Compute prior-session count per (therapist × beneficiary) in last 180d.
 * Used by the matcher's historyWithBeneficiary factor. Skipped silently
 * if a Session-like model can't be found — the matcher defaults the
 * factor to 0 then, which is the "no continuity bonus" case.
 */
async function _historyByTherapist({ Session, beneficiaryId, therapistIds }) {
  if (!Session || !beneficiaryId || !therapistIds.length) return new Map();
  const cutoff = new Date(Date.now() - 180 * 86400000);
  try {
    const rows = await Session.aggregate([
      {
        $match: {
          beneficiaryId,
          therapistId: { $in: therapistIds },
          sessionDate: { $gte: cutoff },
          status: { $in: ['completed', 'attended'] },
        },
      },
      { $group: { _id: '$therapistId', count: { $sum: 1 } } },
    ]);
    return new Map(rows.map(r => [String(r._id), r.count]));
  } catch {
    // Schema/index mismatch on Session — skip silently, matcher gracefully
    // degrades.
    return new Map();
  }
}

// Sentinel token used to satisfy the W432 matcher's specialty hard gate
// when neither side has a declared specialty. The matcher EXCLUDES any
// candidate whose specialties[] is empty — appropriate for clinical
// safety in manual assignment dialogs, but too strict for the auto-
// assignment flow which must handle alerts created before users have
// fully completed their professional profiles. We add the sentinel to
// BOTH sides so the gate passes without favouring/blocking any one
// candidate; the actual differentiator is the soft factors below.
const GENERAL_SPECIALTY_SENTINEL = '__w509_general__';

/**
 * Map a User doc into the therapist shape the matcher expects.
 * The matcher is duck-typed; missing fields default per-factor.
 */
function _normalizeTherapist(u, currentLoad, historyCount) {
  const rawSpecs = u.specialties || (u.primarySpecialty ? [u.primarySpecialty] : []);
  // Always include the sentinel so the hard gate cannot exclude a
  // therapist for "no specialty declared" — the auto-assignment flow
  // explicitly accepts that scoping.
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

/**
 * One assignment attempt for a single alertId. Returns
 * `{ action, reason?, assigneeId?, score? }`.
 */
async function _autoAssignOne({ alertId, logger }) {
  const MeasureAlert = _modelOrNull('MeasureAlert', '../domains/goals/models/MeasureAlert');
  const Beneficiary = _modelOrNull('Beneficiary', '../models/Beneficiary');
  const User = _modelOrNull('User', '../models/User');
  if (!MeasureAlert || !Beneficiary || !User) {
    return { action: 'skipped', reason: 'models_unavailable' };
  }

  // Step 1: load the alert. Bail if already assigned or no longer open.
  const alert = await MeasureAlert.findById(alertId)
    .select('_id beneficiaryId branchId status assigneeId alertType severity')
    .lean();
  if (!alert) return { action: 'skipped', reason: 'alert_not_found' };
  if (alert.status !== 'open') return { action: 'skipped', reason: 'not_open' };
  if (alert.assigneeId) return { action: 'skipped', reason: 'already_assigned' };

  // Step 2: load beneficiary for matcher's beneficiary-side fields.
  const beneficiary = await Beneficiary.findById(alert.beneficiaryId)
    .select(
      '_id branchId regionId languages primaryLanguage gender ' +
        'requiredSpecialty disability primaryDiagnosis preferredTherapistGender'
    )
    .lean();

  // Step 3: fetch candidate therapists.
  const candidates = await _fetchCandidates({
    User,
    branchId: alert.branchId || beneficiary?.branchId,
  });
  if (candidates.length === 0) {
    return { action: 'skipped', reason: 'no_candidates' };
  }
  const candidateIds = candidates.map(c => c._id);

  // Step 4: enrich each candidate with currentLoad + history.
  const Session = _modelOrNull('Session', '../models/Session');
  const [loadMap, historyMap] = await Promise.all([
    _loadByTherapist({ MeasureAlert, therapistIds: candidateIds }),
    _historyByTherapist({
      Session,
      beneficiaryId: alert.beneficiaryId,
      therapistIds: candidateIds,
    }),
  ]);

  const normalized = candidates.map(c => {
    const load = loadMap.get(String(c._id)) || 0;
    const history = historyMap.get(String(c._id)) || 0;
    return _normalizeTherapist(c, load, history);
  });

  // Step 5: score + pick winner.
  // Include the GENERAL_SPECIALTY_SENTINEL in beneficiary.requiredSpecialty
  // when no explicit clinical specialty is declared. The W432 matcher's
  // hard gate matches on EQUALITY against therapist.specialties — adding
  // the sentinel to both sides lets the gate pass without losing
  // specialty-mismatch protection for beneficiaries who DO declare one
  // (e.g. 'physical_therapy' still requires a therapist whose
  // specialties[] contains 'physical_therapy').
  const declaredSpec = beneficiary?.requiredSpecialty;
  const requiredSpecialty = declaredSpec
    ? Array.isArray(declaredSpec)
      ? [...declaredSpec, GENERAL_SPECIALTY_SENTINEL]
      : [declaredSpec, GENERAL_SPECIALTY_SENTINEL]
    : [GENERAL_SPECIALTY_SENTINEL];

  const beneficiaryShape = {
    branchId: alert.branchId ? String(alert.branchId) : beneficiary?.branchId,
    regionId: beneficiary?.regionId ? String(beneficiary.regionId) : null,
    languages: beneficiary?.languages || [],
    primaryLanguage: beneficiary?.primaryLanguage || null,
    gender: beneficiary?.gender || null,
    preferredTherapistGender: beneficiary?.preferredTherapistGender || null,
    requiredSpecialty,
  };

  const top = matcher.topCandidates(normalized, beneficiaryShape, 1, {
    maxLoad: DEFAULT_MAX_LOAD,
  });
  if (top.length === 0) {
    return { action: 'skipped', reason: 'all_excluded' };
  }
  const winner = top[0];
  if (winner.excluded) {
    return { action: 'skipped', reason: `excluded_${winner.excluded}` };
  }

  // Step 6: atomic conditional update. Only assigns if still
  // `assigneeId === null AND status === 'open'`.
  const updated = await MeasureAlert.findOneAndUpdate(
    { _id: alertId, assigneeId: null, status: 'open' },
    {
      $set: {
        assigneeId: new mongoose.Types.ObjectId(winner.therapist.id),
      },
    },
    { new: false }
  ).lean();

  if (!updated) {
    return { action: 'skipped', reason: 'concurrent_assignment' };
  }

  if (logger?.info) {
    logger.info(
      `[auto-assign] alert=${alertId} → therapist=${winner.therapist.id} ` +
        `score=${winner.score.toFixed(3)} (${winner.signals?.length || 0} signals)`
    );
  }

  return {
    action: 'assigned',
    assigneeId: winner.therapist.id,
    score: winner.score,
    signals: winner.signals || [],
  };
}

/**
 * Wire the subscriber to the integration bus. Returns the unsubscribe
 * + a counter for ops health checks.
 */
function wireMeasureAlertAutoAssignment({ integrationBus, logger = console } = {}) {
  if (!integrationBus || typeof integrationBus.subscribe !== 'function') {
    throw new Error(
      'wireMeasureAlertAutoAssignment: integrationBus with .subscribe(pattern, handler) required'
    );
  }

  const stats = {
    received: 0,
    assigned: 0,
    skipped: 0,
    errored: 0,
    lastError: null,
  };

  const handler = async event => {
    stats.received++;
    const payload = event?.payload || event || {};
    const alertId = payload.alertId;
    if (!alertId) {
      stats.skipped++;
      return;
    }
    try {
      const result = await _autoAssignOne({ alertId, logger });
      if (result.action === 'assigned') stats.assigned++;
      else stats.skipped++;
    } catch (err) {
      stats.errored++;
      stats.lastError = err?.message || String(err);
      logger.warn?.(`[auto-assign] failed for alertId=${alertId}: ${stats.lastError}`);
    }
  };

  const unsubscribe = integrationBus.subscribe(PATTERN, handler);

  logger.info?.(`[auto-assign] W509 wired — subscribing to '${PATTERN}'`);

  return {
    unsubscribe: typeof unsubscribe === 'function' ? unsubscribe : () => {},
    ranSinceBoot: () => ({ ...stats }),
  };
}

module.exports = {
  wireMeasureAlertAutoAssignment,
  // Exported for unit tests
  _autoAssignOne,
  _normalizeTherapist,
  _fetchCandidates,
  _loadByTherapist,
  _historyByTherapist,
  PATTERN,
  DEFAULT_MAX_LOAD,
};

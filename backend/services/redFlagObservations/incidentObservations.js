/**
 * incidentObservations.js — Beneficiary-360 Commit 17.
 *
 * Adapter for three quality/safety flags:
 *
 *   safety.incident.critical.open
 *     → openByBeneficiary(beneficiaryId) → Array<{ severity: 'CRITICAL'|'HIGH'|... , ... }>
 *     Registry path `[?severity=='CRITICAL'].length` filters for the
 *     mapped 'CRITICAL' bucket and counts matches.
 *
 *   clinical.seizure.cluster.48h
 *     → countByTypeForBeneficiary(beneficiaryId) → { counts: { seizure, fall, ... } }
 *     Registry path `counts.seizure`, condition `> 2`. The `seizure`
 *     value is count within the last 48 HOURS (matches the flag's
 *     windowDays: 2).
 *
 *   safety.fall.repeat.30d
 *     Same service method. Registry path `counts.fall`, condition
 *     `> 2`. The `fall` value is count within the last 30 DAYS.
 *
 * Registered as `incidentService` in the locator. Reads from the
 * quality/Incident Mongoose model.
 *
 * Design decisions:
 *
 *   1. **Per-type windows baked into the adapter.** The engine
 *      calls `method(beneficiaryId)` with no window parameter; the
 *      registry's `condition.windowDays` is metadata, not an
 *      argument. For now each incident type has its natural
 *      window hardcoded (seizure=48h, fall=30d). Over time, if
 *      the set of windows expands, the engine can grow a
 *      `condition`-passthrough — but that's deferred. All current
 *      flag semantics are honored.
 *
 *   2. **Severity translation isolated here.** The CBAHI model
 *      uses `insignificant/minor/moderate/major/catastrophic`.
 *      Registry flags (and UI labels) use `CRITICAL/HIGH/MEDIUM
 *      /LOW/NONE`. This adapter is the ONE place that maps —
 *      clients stay clean.
 *
 *   3. **Opt-in via `beneficiaryIds`.** Incidents created before
 *      Commit 17 have an empty `beneficiaryIds: []` (schema
 *      default). They're invisible to these flags — the legacy
 *      `involvedPersons: [Mixed]` is NOT consulted. Same
 *      philosophy as CarePlan.requiresSignature: retrofit noise
 *      is worse than a blind spot, and a backfill CLI can walk
 *      old data and populate the new field on demand.
 *
 *   4. **Open statuses**: `reported`, `investigating`,
 *      `rca_in_progress`, `action_plan`, `monitoring`. `closed`
 *      is terminal and excluded.
 */

'use strict';

const DEFAULT_MODEL = requireOptional('../../models/quality/Incident.model');

const MS_PER_HOUR = 3600 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

const OPEN_STATUSES = Object.freeze([
  'reported',
  'investigating',
  'rca_in_progress',
  'action_plan',
  'monitoring',
]);

/**
 * Model severity → registry-facing severity. One place, one map.
 */
const SEVERITY_MAP = Object.freeze({
  catastrophic: 'CRITICAL',
  major: 'HIGH',
  moderate: 'MEDIUM',
  minor: 'LOW',
  insignificant: 'NONE',
});

/**
 * Per-incident-type window, in hours, matching each flag's
 * windowDays. Override in tests or when tuning defaults.
 */
const DEFAULT_WINDOWS_HOURS = Object.freeze({
  seizure: 48, // 2 days
  fall: 30 * 24, // 30 days
});

function createIncidentObservations(deps = {}) {
  const Model = deps.model || DEFAULT_MODEL;
  if (Model == null) {
    throw new Error('incidentObservations: Incident model is required');
  }
  const windowsHours = { ...DEFAULT_WINDOWS_HOURS, ...(deps.windowsHours || {}) };

  /**
   * Returns all OPEN incidents the beneficiary is linked to, with
   * severity translated to the registry vocabulary. Array shape is
   * what the `[?severity=='CRITICAL']` JMESPath filter expects.
   */
  async function openByBeneficiary(beneficiaryId) {
    const rows = await Model.find(
      {
        beneficiaryIds: beneficiaryId,
        status: { $in: OPEN_STATUSES },
      },
      'severity type status occurredAt'
    )
      .sort({ occurredAt: -1 })
      .limit(50)
      .lean();
    return rows.map(r => ({
      id: r._id ? String(r._id) : undefined,
      severity: SEVERITY_MAP[r.severity] || 'NONE',
      type: r.type,
      status: r.status,
      occurredAt: r.occurredAt ? r.occurredAt.toISOString() : null,
    }));
  }

  /**
   * Per-type counts within each type's natural window. Keys:
   * `seizure` (last 48h), `fall` (last 30d). Additional incident
   * types can be added here as new flags arrive.
   */
  async function countByTypeForBeneficiary(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const nowMs = now.getTime();

    const counts = {};
    for (const [incidentType, hours] of Object.entries(windowsHours)) {
      const since = new Date(nowMs - hours * MS_PER_HOUR);
      counts[incidentType] = await Model.countDocuments({
        beneficiaryIds: beneficiaryId,
        type: incidentType,
        occurredAt: { $gte: since, $lte: now },
      });
    }
    return { counts };
  }

  return Object.freeze({
    openByBeneficiary,
    countByTypeForBeneficiary,
    // Exposed for tests/tooling that want to inspect / override
    _severityMap: SEVERITY_MAP,
  });
}

module.exports = { createIncidentObservations, SEVERITY_MAP, OPEN_STATUSES };

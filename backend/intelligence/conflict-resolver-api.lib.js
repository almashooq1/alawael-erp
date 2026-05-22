'use strict';

/**
 * conflict-resolver-api.lib.js — Wave 276b.
 *
 * Standalone read-only API exposing conflict-detection primitives
 * that ALREADY EXIST inside attendance-reconciliation.service.js but
 * are not callable from outside a full reconciliation pass.
 *
 * Three callers that asked for this surface:
 *   - mobile-attendance: pre-submit `isDuplicate` so the app rejects
 *     a double-tap before the reconciler is even involved
 *   - dashboards: "show me today's unpaired punches" without writing
 *     a reconciliation case row
 *   - device-health UI: "has this device drifted from server time?"
 *     without walking event flags
 *
 * ── ANTI-DUPLICATION CONTRACT ─────────────────────────────────────
 *
 * Every helper DELEGATES to existing registry primitives. No
 * conflict-detection logic is reinvented here:
 *
 *   pairMissedPunches  → hikvision.registry.dedupByZoneWindow
 *                      → hikvision.registry.findCorroborationPairs
 *   isDuplicate        → same Mongo query the reconciler's Step 1 uses
 *   detectClockDrift   → attendance.registry.DEFAULTS.MAX_TIME_DRIFT_MS
 *
 * If a future conflict type appears, add it to the reconciler and the
 * registry — NOT here. This file is a presentation/access layer, not
 * a detection engine. `lint:duplication` will catch attempts to copy
 * the reconciler's loops into this file.
 *
 * ── Shape ─────────────────────────────────────────────────────────
 *
 * Pure helpers taking `models` as their first arg (not a factory
 * closure) — keeps the lib stateless. Callers wire their own models
 * at call site:
 *
 *   const api = require('../intelligence/conflict-resolver-api.lib');
 *   const dup = await api.isDuplicate({ sourceEventModel: M }, { employeeId, deviceId, timestamp });
 *
 * No MFA gate here: read-only intelligence over already-accepted
 * source events. Mutations still flow through
 * attendance-reconciliation.service.resolveConflict (which carries
 * the W275d tier-2 MFA gate).
 */

const hikReg = require('./hikvision.registry');
const attReg = require('./attendance.registry');

const DEFAULT_DUP_WINDOW_SECONDS = 60;

function _toMs(t) {
  if (t == null) return NaN;
  if (t instanceof Date) return t.getTime();
  const n = new Date(t).getTime();
  return Number.isFinite(n) ? n : NaN;
}

/**
 * isDuplicate — true iff an `accepted=true` AttendanceSourceEvent
 * already exists for (employeeId, deviceId) within ±windowSeconds of
 * the candidate timestamp.
 *
 * Cheaper than running reconcileEmployeeDay; intended for pre-submit
 * checks. The reconciler is still authoritative — this only avoids
 * an obvious double-tap from reaching the DB write at all.
 *
 * @param {{ sourceEventModel: any }} models
 * @param {{ employeeId: any, deviceId: any, timestamp: any, windowSeconds?: number }} input
 * @returns {Promise<boolean>}
 */
async function isDuplicate(models, input = {}) {
  const { employeeId, deviceId, timestamp, windowSeconds = DEFAULT_DUP_WINDOW_SECONDS } = input;
  if (!employeeId || !deviceId || timestamp == null) return false;
  const { sourceEventModel } = models || {};
  if (!sourceEventModel) {
    throw new Error('conflict-resolver-api.isDuplicate: sourceEventModel required');
  }
  const ms = _toMs(timestamp);
  if (!Number.isFinite(ms)) return false;
  const start = new Date(ms - windowSeconds * 1000);
  const end = new Date(ms + windowSeconds * 1000);

  // The schema stores deviceId nested under sourceRef. Match on the
  // nested path; fall back to top-level for callers that pre-flatten.
  let q = sourceEventModel.findOne({
    employeeId,
    accepted: true,
    eventTime: { $gte: start, $lte: end },
    $or: [{ 'sourceRef.deviceId': deviceId }, { deviceId }],
  });
  if (q && typeof q.lean === 'function') q = q.lean();
  const hit = await q;
  return Boolean(hit);
}

/**
 * pairMissedPunches — for one (employeeId, dateString), return the
 * corroboration pairs the reconciler would emit + the un-paired
 * remainders that would surface as MULTI_SOURCE_DISAGREEMENT.
 *
 * dateString format: `YYYY-MM-DD` (interpreted as UTC start-of-day).
 *
 * @param {{ sourceEventModel: any }} models
 * @param {{ employeeId: any, dateString: string }} input
 * @returns {Promise<{ pairs: any[], unpaired: any[], events: any[] }>}
 */
async function pairMissedPunches(models, input = {}) {
  const { employeeId, dateString } = input;
  const empty = { pairs: [], unpaired: [], events: [] };
  if (!employeeId || !dateString) return empty;
  const { sourceEventModel } = models || {};
  if (!sourceEventModel) {
    throw new Error('conflict-resolver-api.pairMissedPunches: sourceEventModel required');
  }
  const sd = new Date(`${dateString}T00:00:00.000Z`);
  if (!Number.isFinite(sd.getTime())) return empty;

  const grace = hikReg.RECONCILIATION_DEFAULTS.GRACE_PERIOD_MIN * 60_000;
  const windowStart = new Date(sd.getTime() - grace);
  const windowEnd = new Date(sd.getTime() + 24 * 60 * 60_000 + grace);

  let cursor = sourceEventModel
    .find({
      employeeId,
      accepted: true,
      eventTime: { $gte: windowStart, $lt: windowEnd },
    })
    .sort({ eventTime: 1 });
  if (cursor && typeof cursor.lean === 'function') cursor = cursor.lean();
  const events = (await cursor) || [];

  // Same delegation chain as attendance-reconciliation.service Step 2-3.
  const deduped = hikReg.dedupByZoneWindow(events);
  const { pairs, unpaired } = hikReg.findCorroborationPairs(deduped);
  return { pairs, unpaired, events: deduped };
}

/**
 * detectClockDrift — compare `serverTime` against the device's most
 * recent eventTime (or deviceModel.lastSeenAt when available).
 *
 * Returns drift in seconds with sign:
 *   positive → device ahead of server (likely device-clock fast)
 *   negative → device behind server (likely device-clock slow / NTP stale)
 *   null     → device has no observations on file
 *
 * Threshold sourced from attendance.registry.DEFAULTS.MAX_TIME_DRIFT_MS
 * (5 min by default — same threshold the parser uses to tag the
 * `time-drift` event flag).
 *
 * @param {{ deviceModel?: any, sourceEventModel?: any }} models
 * @param {{ deviceId: any, serverTime: any }} input
 * @returns {Promise<{ driftSeconds: number|null, exceedsThreshold: boolean, thresholdSeconds: number }>}
 */
async function detectClockDrift(models, input = {}) {
  const { deviceId, serverTime } = input;
  const thresholdSeconds = Math.round(attReg.DEFAULTS.MAX_TIME_DRIFT_MS / 1000);
  const empty = { driftSeconds: null, exceedsThreshold: false, thresholdSeconds };

  if (!deviceId || serverTime == null) return empty;
  const sT = _toMs(serverTime);
  if (!Number.isFinite(sT)) return empty;

  const { deviceModel, sourceEventModel } = models || {};

  // Prefer deviceModel.lastSeenAt (single row read). Fall back to
  // a most-recent-event query if absent OR device lookup fails.
  let lastDeviceTimeMs = null;
  if (deviceModel) {
    try {
      let q = deviceModel.findById(deviceId);
      if (q && typeof q.lean === 'function') q = q.lean();
      const d = await q;
      if (d && d.lastSeenAt) {
        const ms = _toMs(d.lastSeenAt);
        if (Number.isFinite(ms)) lastDeviceTimeMs = ms;
      }
    } catch {
      /* fall through to event-based lookup */
    }
  }
  if (lastDeviceTimeMs == null && sourceEventModel) {
    try {
      let q = sourceEventModel
        .findOne({ $or: [{ 'sourceRef.deviceId': deviceId }, { deviceId }] })
        .sort({ eventTime: -1 });
      if (q && typeof q.lean === 'function') q = q.lean();
      const ev = await q;
      if (ev && ev.eventTime) {
        const ms = _toMs(ev.eventTime);
        if (Number.isFinite(ms)) lastDeviceTimeMs = ms;
      }
    } catch {
      /* no events yet */
    }
  }

  if (lastDeviceTimeMs == null) return empty;

  const driftSeconds = Math.round((lastDeviceTimeMs - sT) / 1000);
  return {
    driftSeconds,
    exceedsThreshold: Math.abs(driftSeconds) > thresholdSeconds,
    thresholdSeconds,
  };
}

module.exports = {
  isDuplicate,
  pairMissedPunches,
  detectClockDrift,
  DEFAULT_DUP_WINDOW_SECONDS,
};

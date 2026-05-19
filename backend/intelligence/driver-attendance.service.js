'use strict';

/**
 * driver-attendance.service.js — Wave 127.
 *
 * Driver attendance is special: drivers may not physically pass
 * through a branch reception. Their attendance is inferred from
 * either:
 *   (a) An NFC tap at the garage gate when picking up / returning a
 *       vehicle (handled by Wave 125 NFC service — this service
 *       does NOT duplicate that work, it just records the trip→
 *       attendance linkage)
 *   (b) Trip start/end events from the Fleet platform. If the driver
 *       didn't tap at the garage, we synthesize an auto-rule check-in
 *       at trip start, and a corresponding check-out at trip end.
 *
 * Why a separate service:
 *   - The auto-rule source is treated as T2 baseline (per registry)
 *     but DEMOTED to T3 when synthesized from trip-only data (we
 *     trust the fleet system but it's still inferred, not measured).
 *   - The check-in/out window is shaped by trip start/end, not by
 *     a shift's earliestCheckIn — so we don't go through the
 *     shift-resolver expectedWindow path.
 *   - One trip = at most one auto-rule check-in + one auto-rule
 *     check-out (idempotent by tripId).
 *
 * Public API:
 *   recordTripStart({ driverId, tripId, vehicleId, originBranchId?,
 *                      eventTime })
 *   recordTripEnd({ driverId, tripId, vehicleId, destinationBranchId?,
 *                    eventTime })
 *   summarizeDriverDay({ driverId, dayDate })  →
 *     { taps[], tripStarts[], tripEnds[], firstSeenAt, lastSeenAt }
 *
 * Both record* functions are no-ops if the driver already tapped
 * NFC within RECENT_TAP_WINDOW_MS of the trip event — that prevents
 * double-counting when the driver did tap.
 */

const reg = require('./attendance.registry');

const RECENT_TAP_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

function createDriverAttendanceService({
  sourceEventModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!sourceEventModel) {
    throw new Error('driver-attendance: sourceEventModel required');
  }

  async function _hasRecentEvent({ driverId, eventKind, around, sources }) {
    const sinceMs = around.getTime() - RECENT_TAP_WINDOW_MS;
    const untilMs = around.getTime() + RECENT_TAP_WINDOW_MS;
    let cursor = sourceEventModel.find({
      employeeId: driverId,
      eventKind,
      source: { $in: sources },
      eventTime: { $gte: new Date(sinceMs), $lte: new Date(untilMs) },
    });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      const rows = (await cursor) || [];
      return rows.length > 0;
    } catch (err) {
      logger.warn(`[driver-attendance] recent-event lookup failed: ${err.message}`);
      return false;
    }
  }

  async function _hasExistingTripEvent({ tripId, eventKind }) {
    let cursor = sourceEventModel.find({
      source: reg.SOURCE_KIND.AUTO_RULE,
      eventKind,
      'sourceRef.tripId': String(tripId),
    });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      const rows = (await cursor) || [];
      return rows.length > 0;
    } catch (err) {
      logger.warn(`[driver-attendance] trip-event lookup failed: ${err.message}`);
      return false;
    }
  }

  async function _emitAutoRule({
    driverId,
    tripId,
    vehicleId,
    branchId,
    eventKind,
    eventTime,
    extraFlags = [],
  }) {
    const flags = ['low-confidence', ...extraFlags]; // inferred → demote
    const effectiveConfidence = reg.inferEffectiveConfidence({
      source: reg.SOURCE_KIND.AUTO_RULE,
      baseConfidence: 70,
      flags,
    });
    const tierLabel = reg.inferTrustTier(reg.SOURCE_KIND.AUTO_RULE, effectiveConfidence, {
      flags,
    });
    const doc = new sourceEventModel({
      employeeId: driverId,
      branchId: branchId || null,
      eventTime,
      eventKind,
      source: reg.SOURCE_KIND.AUTO_RULE,
      sourceRefId: `auto-trip-${tripId}-${eventKind}`,
      sourceRefCollection: 'trips',
      trustTier: reg.trustTierToNumeric(tierLabel),
      tierLabel,
      confidence: effectiveConfidence,
      accepted: true,
      flags,
      sourceRef: {
        tripId: String(tripId),
        vehicleId: vehicleId ? String(vehicleId) : null,
        synthesizedAt: now(),
      },
    });
    try {
      await doc.validate();
    } catch (err) {
      const errors = {};
      if (err && err.errors) {
        for (const [k, v] of Object.entries(err.errors)) {
          errors[k] = (v && v.message) || String(v);
        }
      }
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[driver-attendance] auto-rule save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return {
      ok: true,
      event: doc.toObject ? doc.toObject() : doc,
      tierLabel,
      effectiveConfidence,
      flags,
    };
  }

  async function recordTripStart({
    driverId,
    tripId,
    vehicleId = null,
    originBranchId = null,
    eventTime,
  } = {}) {
    if (!driverId) return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    if (!tripId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { tripId: 'required' },
      };
    }
    if (!eventTime) return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    const t = eventTime instanceof Date ? eventTime : new Date(eventTime);
    if (Number.isNaN(t.getTime())) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    }
    if (t.getTime() > now().getTime() + reg.DEFAULTS.MAX_FUTURE_DRIFT_MS) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_FUTURE };
    }

    // Already synthesized for this trip?
    if (await _hasExistingTripEvent({ tripId, eventKind: 'check-in' })) {
      return { ok: true, idempotent: true, reason: 'TRIP_START_ALREADY_RECORDED' };
    }

    // Driver tapped NFC or scanned QR recently? Skip the synthesis.
    const hasRealCheckIn = await _hasRecentEvent({
      driverId,
      eventKind: 'check-in',
      around: t,
      sources: [
        reg.SOURCE_KIND.NFC,
        reg.SOURCE_KIND.QR_SCAN,
        reg.SOURCE_KIND.MOBILE_GPS,
        reg.SOURCE_KIND.FACE_TERMINAL,
        reg.SOURCE_KIND.FINGERPRINT,
      ],
    });
    if (hasRealCheckIn) {
      return { ok: true, skipped: true, reason: 'DRIVER_ALREADY_CHECKED_IN' };
    }

    return _emitAutoRule({
      driverId,
      tripId,
      vehicleId,
      branchId: originBranchId,
      eventKind: 'check-in',
      eventTime: t,
    });
  }

  async function recordTripEnd({
    driverId,
    tripId,
    vehicleId = null,
    destinationBranchId = null,
    eventTime,
  } = {}) {
    if (!driverId) return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    if (!tripId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { tripId: 'required' },
      };
    }
    if (!eventTime) return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    const t = eventTime instanceof Date ? eventTime : new Date(eventTime);
    if (Number.isNaN(t.getTime())) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    }
    if (t.getTime() > now().getTime() + reg.DEFAULTS.MAX_FUTURE_DRIFT_MS) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_FUTURE };
    }

    if (await _hasExistingTripEvent({ tripId, eventKind: 'check-out' })) {
      return { ok: true, idempotent: true, reason: 'TRIP_END_ALREADY_RECORDED' };
    }
    const hasRealCheckOut = await _hasRecentEvent({
      driverId,
      eventKind: 'check-out',
      around: t,
      sources: [
        reg.SOURCE_KIND.NFC,
        reg.SOURCE_KIND.QR_SCAN,
        reg.SOURCE_KIND.MOBILE_GPS,
        reg.SOURCE_KIND.FACE_TERMINAL,
        reg.SOURCE_KIND.FINGERPRINT,
      ],
    });
    if (hasRealCheckOut) {
      return { ok: true, skipped: true, reason: 'DRIVER_ALREADY_CHECKED_OUT' };
    }

    return _emitAutoRule({
      driverId,
      tripId,
      vehicleId,
      branchId: destinationBranchId,
      eventKind: 'check-out',
      eventTime: t,
    });
  }

  /**
   * Per-driver per-day rollup for the operator dashboard. Returns
   * the raw events grouped by origin (nfc / qr / mobile-gps tap vs
   * synthesized auto-rule from trip).
   */
  async function summarizeDriverDay({ driverId, dayDate } = {}) {
    if (!driverId) return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    if (!dayDate) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { dayDate: 'required' },
      };
    }
    const d = dayDate instanceof Date ? dayDate : new Date(dayDate);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    let cursor = sourceEventModel.find({
      employeeId: driverId,
      eventTime: { $gte: dayStart, $lte: dayEnd },
    });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    let rows = [];
    try {
      rows = (await cursor) || [];
    } catch (err) {
      logger.warn(`[driver-attendance] day rollup failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    rows.sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));
    const taps = rows.filter(r =>
      [
        reg.SOURCE_KIND.NFC,
        reg.SOURCE_KIND.QR_SCAN,
        reg.SOURCE_KIND.MOBILE_GPS,
        reg.SOURCE_KIND.FACE_TERMINAL,
        reg.SOURCE_KIND.FINGERPRINT,
      ].includes(r.source)
    );
    const synthesised = rows.filter(r => r.source === reg.SOURCE_KIND.AUTO_RULE);
    const tripStarts = synthesised.filter(r => r.eventKind === 'check-in');
    const tripEnds = synthesised.filter(r => r.eventKind === 'check-out');
    return {
      ok: true,
      driverId,
      day: dayStart,
      totalEvents: rows.length,
      taps,
      synthesisedTotal: synthesised.length,
      tripStarts,
      tripEnds,
      firstSeenAt: rows.length > 0 ? rows[0].eventTime : null,
      lastSeenAt: rows.length > 0 ? rows[rows.length - 1].eventTime : null,
    };
  }

  return {
    recordTripStart,
    recordTripEnd,
    summarizeDriverDay,
    RECENT_TAP_WINDOW_MS,
  };
}

module.exports = {
  createDriverAttendanceService,
  RECENT_TAP_WINDOW_MS,
};

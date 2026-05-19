'use strict';

/**
 * mobile-attendance.service.js — Wave 122.
 *
 * Mobile check-in/out endpoint logic. Validates:
 *   • employee identity + role allow-list
 *   • GPS coordinates + accuracy
 *   • geofence containment (polygon + buffer)
 *   • geofence active hours
 *   • time drift (event time vs server)
 *   • duplicate suppression (same-source within window)
 *
 * On success: creates an AttendanceSourceEvent with source='mobile-gps',
 * trustTier derived via attendance.registry.inferTrustTier (T3
 * baseline, demoted on flags). Computes expectedWindow from the
 * employee's active shift (Wave 121 resolver).
 *
 * Public API:
 *   checkIn({ employeeId, role, geo, eventTime, branchHint? })
 *   checkOut({ employeeId, role, geo, eventTime, branchHint? })
 *   classifyMobileEvent({ point, accuracyM, geofence }) — pure
 */

const reg = require('./attendance.registry');
const geofenceLib = require('./geofence.lib');

const ACCURACY_HARD_LIMIT_M = 200; // reject if accuracy worse than this

function createMobileAttendanceService({
  sourceEventModel = null,
  geofenceModel = null,
  shiftResolver = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!sourceEventModel) {
    throw new Error('mobile-attendance: sourceEventModel required');
  }
  if (!geofenceModel) {
    throw new Error('mobile-attendance: geofenceModel required');
  }

  // ─── Public entry points ────────────────────────────────────

  async function checkIn(input) {
    return _checkInOrOut({ ...input, eventKind: 'check-in' });
  }
  async function checkOut(input) {
    return _checkInOrOut({ ...input, eventKind: 'check-out' });
  }

  async function _checkInOrOut({
    employeeId,
    role,
    branchId, // optional hint; if omitted we accept whichever geofence matches
    geo, // { lat, lng, accuracyM }
    eventTime,
    sessionId = null,
    eventKind,
  }) {
    if (!employeeId) {
      return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    }
    if (!eventTime) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    }
    const t = eventTime instanceof Date ? eventTime : new Date(eventTime);
    if (Number.isNaN(t.getTime())) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    }
    // Reject events too far in the future.
    if (t.getTime() > now().getTime() + reg.DEFAULTS.MAX_FUTURE_DRIFT_MS) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_FUTURE };
    }

    // Role allow-list: mobile-gps must be allowed for this role.
    if (role && !reg.isSourceAllowedForRole(reg.SOURCE_KIND.MOBILE_GPS, role)) {
      return { ok: false, reason: reg.REASON.SOURCE_NOT_ALLOWED_FOR_ROLE };
    }

    // GPS sanity.
    if (!geo || !Number.isFinite(geo.lat) || !Number.isFinite(geo.lng)) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { geo: 'lat+lng required' },
      };
    }
    const accuracyM = Number.isFinite(geo.accuracyM) ? Number(geo.accuracyM) : null;
    if (accuracyM != null && accuracyM > ACCURACY_HARD_LIMIT_M) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { accuracyM: `> ${ACCURACY_HARD_LIMIT_M}m — GPS too inaccurate` },
      };
    }

    // Geofence lookup: prefer branchHint, else find any geofence the
    // point falls into for any branch this role can use.
    const fenceFilter = { active: true };
    if (branchId) fenceFilter.branchId = branchId;
    let fenceCursor = geofenceModel.find(fenceFilter);
    if (typeof fenceCursor.lean === 'function') fenceCursor = fenceCursor.lean();
    let fences;
    try {
      fences = (await fenceCursor) || [];
    } catch (err) {
      logger.warn(`[mobile-attendance] fence lookup failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }

    const point = [Number(geo.lat), Number(geo.lng)];
    let matchedFence = null;
    let distanceFromBranchM = null;
    for (const f of fences) {
      const inside = geofenceLib.isInsideGeofence({
        point,
        polygon: f.polygon,
        bufferM: f.bufferM || 25,
      });
      if (!inside) continue;
      // Role check.
      if (
        role &&
        Array.isArray(f.allowedRoles) &&
        f.allowedRoles.length > 0 &&
        !f.allowedRoles.includes(role)
      ) {
        continue;
      }
      if (!geofenceLib.isActiveAt({ activeHours: f.activeHours || [], at: t })) {
        continue;
      }
      matchedFence = f;
      distanceFromBranchM = Math.round(geofenceLib.distanceToPolygonM(point, f.polygon));
      break;
    }
    const flags = [];
    if (!matchedFence) {
      // Not inside any geofence — still record but flag + downgrade.
      flags.push('geofence-edge');
    }
    if (accuracyM != null && accuracyM > 50) flags.push('low-confidence');

    // Resolve shift for expectedWindow (Wave 121).
    let shiftCtx = { shift: null };
    if (shiftResolver) {
      try {
        const r = await shiftResolver.resolveShiftForEmployee({ employeeId, at: t });
        if (r.ok) shiftCtx = r;
      } catch (err) {
        logger.warn(`[mobile-attendance] shift resolve failed: ${err.message}`);
      }
    }
    let expectedWindow = null;
    if (
      shiftCtx.shift &&
      shiftResolver &&
      typeof shiftResolver.computeExpectedWindow === 'function'
    ) {
      expectedWindow = shiftResolver.computeExpectedWindow({
        shift: shiftCtx.shift,
        shiftDate: t,
      });
    }
    if (expectedWindow && t.getTime() > expectedWindow.latestCheckOut.getTime()) {
      flags.push('after-hours');
    }

    // Trust tier.
    const baseConfidence = accuracyM == null ? 60 : Math.max(0, 100 - accuracyM);
    const effectiveConfidence = reg.inferEffectiveConfidence({
      source: reg.SOURCE_KIND.MOBILE_GPS,
      baseConfidence,
      flags,
    });
    const tierLabel = reg.inferTrustTier(reg.SOURCE_KIND.MOBILE_GPS, effectiveConfidence, {
      flags,
    });

    // Duplicate suppression — same employee + source + kind within
    // DUPLICATE_SUPPRESSION_WINDOW_MS.
    const dupSince = new Date(t.getTime() - reg.DEFAULTS.DUPLICATE_SUPPRESSION_WINDOW_MS);
    let dupCursor = sourceEventModel.find({
      employeeId,
      source: reg.SOURCE_KIND.MOBILE_GPS,
      eventKind,
      eventTime: { $gte: dupSince, $lte: t },
    });
    if (typeof dupCursor.lean === 'function') dupCursor = dupCursor.lean();
    let dupRows = [];
    try {
      dupRows = (await dupCursor) || [];
    } catch (err) {
      logger.warn(`[mobile-attendance] dup lookup failed: ${err.message}`);
    }
    if (dupRows.length > 0) {
      return {
        ok: false,
        reason: reg.REASON.DUPLICATE_WITHIN_WINDOW,
        duplicate: dupRows[0],
      };
    }

    // Build + persist event.
    const eventDoc = new sourceEventModel({
      employeeId,
      branchId: matchedFence ? matchedFence.branchId : branchId || null,
      zoneId: matchedFence ? String(matchedFence._id) : null,
      eventTime: t,
      eventKind,
      source: reg.SOURCE_KIND.MOBILE_GPS,
      sourceRefId: sessionId ? String(sessionId) : `mobile-${Date.now()}`,
      sourceRefCollection: 'mobile_session',
      trustTier: reg.trustTierToNumeric(tierLabel),
      tierLabel,
      confidence: effectiveConfidence,
      accepted: true,
      flags,
      sourceRef: {
        deviceId: null,
        appSessionId: sessionId || null,
      },
      geo: {
        lat: Number(geo.lat),
        lng: Number(geo.lng),
        accuracyM,
        insideGeofence: Boolean(matchedFence),
        geofenceId: matchedFence ? matchedFence._id : null,
        distanceFromBranchM,
      },
      expectedWindow: expectedWindow
        ? {
            shiftId: expectedWindow.shiftId,
            earliestCheckIn: expectedWindow.earliestCheckIn,
            latestCheckIn: expectedWindow.latestCheckIn,
            earliestCheckOut: expectedWindow.earliestCheckOut,
            latestCheckOut: expectedWindow.latestCheckOut,
          }
        : undefined,
    });
    try {
      await eventDoc.validate();
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
      await eventDoc.save();
    } catch (err) {
      logger.error('[mobile-attendance] save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    return {
      ok: true,
      event: eventDoc.toObject ? eventDoc.toObject() : eventDoc,
      tierLabel,
      effectiveConfidence,
      flags,
      matchedFenceId: matchedFence ? matchedFence._id : null,
    };
  }

  /**
   * Pure helper used by the route handler to preview what a check
   * would look like without persisting. Useful for the mobile app's
   * "you're outside the geofence" warning before submit.
   */
  function classifyMobileEvent({ point, accuracyM, geofence } = {}) {
    if (!Array.isArray(point) || point.length !== 2) {
      return { ok: false, reason: 'invalid-point' };
    }
    if (Number.isFinite(accuracyM) && accuracyM > ACCURACY_HARD_LIMIT_M) {
      return { ok: false, reason: 'accuracy-too-poor' };
    }
    if (!geofence || !Array.isArray(geofence.polygon)) {
      return { ok: false, reason: 'no-geofence' };
    }
    const inside = geofenceLib.isInsideGeofence({
      point,
      polygon: geofence.polygon,
      bufferM: geofence.bufferM || 25,
    });
    const distance = Math.round(geofenceLib.distanceToPolygonM(point, geofence.polygon));
    return {
      ok: true,
      insideGeofence: inside,
      distanceFromBranchM: distance,
      flags: [
        ...(!inside ? ['geofence-edge'] : []),
        ...(Number.isFinite(accuracyM) && accuracyM > 50 ? ['low-confidence'] : []),
      ],
    };
  }

  return {
    checkIn,
    checkOut,
    classifyMobileEvent,
  };
}

module.exports = {
  createMobileAttendanceService,
  ACCURACY_HARD_LIMIT_M,
};

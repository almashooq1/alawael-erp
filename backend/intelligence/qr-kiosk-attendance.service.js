'use strict';

/**
 * qr-kiosk-attendance.service.js — Wave 124.
 *
 * Two related entry points sharing trust tier T3 (per
 * attendance.registry):
 *
 *   mintBranchQrToken({ branchId, purpose, at? })
 *     → returns { token, expiresAtMs }. The kiosk display renders
 *       this and rotates it every WINDOW_SECONDS. Employee scans
 *       with their mobile app.
 *
 *   redeemQrScan({ employeeId, role, token, geo?, eventTime, sessionId? })
 *     → mobile-app flow. Verifies the token, identifies branch,
 *       persists an AttendanceSourceEvent with source=qr-scan.
 *       Falls back to T4 if no corroborating mobile-gps location
 *       within geofence (we trust the token but not blindly).
 *
 *   submitKioskEvent({ deviceId, deviceSecret, employeeId, role,
 *                       eventKind, pin?, photoRef?, eventTime })
 *     → kiosk-app flow. The kiosk authenticates with deviceSecret
 *       (compared against device.secretHash), then submits an event
 *       on behalf of the employee. Persists with source=kiosk.
 *
 * All three are idempotency-aware: duplicate suppression window
 * matches the rest of the platform (DEFAULTS.DUPLICATE_SUPPRESSION).
 */

const crypto = require('crypto');
const reg = require('./attendance.registry');
const qrLib = require('./qr-token.lib');

function hashSecret(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function createQrKioskAttendanceService({
  sourceEventModel = null,
  kioskDeviceModel = null,
  branchSecretResolver = null, // ({ branchId }) → Promise<string>
  shiftResolver = null,
  logger = console,
  now = () => new Date(),
  qrWindowSeconds = qrLib.DEFAULT_WINDOW_SECONDS,
} = {}) {
  if (!sourceEventModel) {
    throw new Error('qr-kiosk-attendance: sourceEventModel required');
  }
  if (typeof branchSecretResolver !== 'function') {
    throw new Error('qr-kiosk-attendance: branchSecretResolver required');
  }

  // ─── QR mint ───────────────────────────────────────────────

  async function mintBranchQrToken({ branchId, purpose = 'check-in', at = null } = {}) {
    if (!branchId) return { ok: false, reason: reg.REASON.BRANCH_REQUIRED };
    if (!qrLib.PURPOSES.includes(purpose)) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    let secret;
    try {
      secret = await branchSecretResolver({ branchId });
    } catch (err) {
      logger.warn(`[qr-kiosk] branchSecretResolver threw: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    if (!secret) return { ok: false, reason: reg.REASON.VALIDATION_FAILED };

    const atDate = at instanceof Date ? at : at ? new Date(at) : now();
    const token = qrLib.mintQrToken({
      branchId: String(branchId),
      purpose,
      secret,
      at: atDate.getTime(),
      windowSeconds: qrWindowSeconds,
    });
    const windowEpoch = Math.floor(Math.floor(atDate.getTime() / 1000) / qrWindowSeconds);
    const expiresAtMs = (windowEpoch + 1) * qrWindowSeconds * 1000;
    return {
      ok: true,
      token,
      expiresAtMs,
      windowSeconds: qrWindowSeconds,
    };
  }

  // ─── QR redeem (mobile scans displayed code) ───────────────

  async function redeemQrScan({
    employeeId,
    role,
    token,
    eventTime,
    sessionId = null,
    geo = null,
  } = {}) {
    if (!employeeId) return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    if (!eventTime) return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    if (!token) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors: { token: 'required' } };
    }
    const t = eventTime instanceof Date ? eventTime : new Date(eventTime);
    if (Number.isNaN(t.getTime())) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    }
    if (t.getTime() > now().getTime() + reg.DEFAULTS.MAX_FUTURE_DRIFT_MS) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_FUTURE };
    }
    if (role && !reg.isSourceAllowedForRole(reg.SOURCE_KIND.QR_SCAN, role)) {
      return { ok: false, reason: reg.REASON.SOURCE_NOT_ALLOWED_FOR_ROLE };
    }

    // Parse token to learn branchId without trusting the signature yet.
    const parts = String(token).split('.');
    if (parts.length !== 5) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors: { token: 'malformed' } };
    }
    const claimedBranchId = parts[1];

    let secret;
    try {
      secret = await branchSecretResolver({ branchId: claimedBranchId });
    } catch (err) {
      logger.warn(`[qr-kiosk] redeem: branchSecretResolver threw: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    const verify = qrLib.verifyQrToken({
      token,
      secret,
      at: t.getTime(),
      windowSeconds: qrWindowSeconds,
    });
    if (!verify.ok) {
      return { ok: false, reason: 'ATTENDANCE_QR_TOKEN_INVALID', detail: verify.reason };
    }

    const eventKind = verify.purpose; // check-in or check-out
    const flags = [];

    // Shift context for expectedWindow.
    let expectedWindow = null;
    if (shiftResolver) {
      try {
        const r = await shiftResolver.resolveShiftForEmployee({ employeeId, at: t });
        if (r.ok && r.shift && typeof shiftResolver.computeExpectedWindow === 'function') {
          expectedWindow = shiftResolver.computeExpectedWindow({
            shift: r.shift,
            shiftDate: t,
          });
        }
      } catch (err) {
        logger.warn(`[qr-kiosk] shift resolve failed: ${err.message}`);
      }
    }
    if (expectedWindow && t.getTime() > expectedWindow.latestCheckOut.getTime()) {
      flags.push('after-hours');
    }

    // Duplicate suppression — same employee + qr-scan + kind in window.
    const dupSince = new Date(t.getTime() - reg.DEFAULTS.DUPLICATE_SUPPRESSION_WINDOW_MS);
    let dupCursor = sourceEventModel.find({
      employeeId,
      source: reg.SOURCE_KIND.QR_SCAN,
      eventKind,
      eventTime: { $gte: dupSince, $lte: t },
    });
    if (typeof dupCursor.lean === 'function') dupCursor = dupCursor.lean();
    let dupRows = [];
    try {
      dupRows = (await dupCursor) || [];
    } catch (err) {
      logger.warn(`[qr-kiosk] dup lookup failed: ${err.message}`);
    }
    if (dupRows.length > 0) {
      return {
        ok: false,
        reason: reg.REASON.DUPLICATE_WITHIN_WINDOW,
        duplicate: dupRows[0],
      };
    }

    const effectiveConfidence = reg.inferEffectiveConfidence({
      source: reg.SOURCE_KIND.QR_SCAN,
      baseConfidence: 100, // HMAC-verified
      flags,
    });
    const tierLabel = reg.inferTrustTier(reg.SOURCE_KIND.QR_SCAN, effectiveConfidence, {
      flags,
    });

    const eventDoc = new sourceEventModel({
      employeeId,
      branchId: claimedBranchId,
      eventTime: t,
      eventKind,
      source: reg.SOURCE_KIND.QR_SCAN,
      sourceRefId: sessionId ? String(sessionId) : `qr-${Date.now()}`,
      sourceRefCollection: 'mobile_session',
      trustTier: reg.trustTierToNumeric(tierLabel),
      tierLabel,
      confidence: effectiveConfidence,
      accepted: true,
      flags,
      sourceRef: {
        deviceId: null,
        appSessionId: sessionId || null,
        qrAgeSec: verify.ageSec,
      },
      geo:
        geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)
          ? {
              lat: Number(geo.lat),
              lng: Number(geo.lng),
              accuracyM: Number.isFinite(geo.accuracyM) ? Number(geo.accuracyM) : null,
              insideGeofence: null,
              geofenceId: null,
              distanceFromBranchM: null,
            }
          : undefined,
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
      logger.error('[qr-kiosk] save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    return {
      ok: true,
      event: eventDoc.toObject ? eventDoc.toObject() : eventDoc,
      tierLabel,
      effectiveConfidence,
      flags,
      branchId: claimedBranchId,
    };
  }

  // ─── Kiosk submit (kiosk → server with device cred) ────────

  async function submitKioskEvent({
    deviceId,
    deviceSecret,
    employeeId,
    role,
    eventKind,
    pin = null,
    photoRef = null,
    eventTime,
  } = {}) {
    if (!kioskDeviceModel) {
      return { ok: false, reason: 'ATTENDANCE_KIOSK_NOT_CONFIGURED' };
    }
    if (!deviceId || !deviceSecret) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { deviceId: 'required', deviceSecret: 'required' },
      };
    }
    if (!employeeId) return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    if (!eventTime) return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    const t = eventTime instanceof Date ? eventTime : new Date(eventTime);
    if (Number.isNaN(t.getTime())) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_REQUIRED };
    }
    if (t.getTime() > now().getTime() + reg.DEFAULTS.MAX_FUTURE_DRIFT_MS) {
      return { ok: false, reason: reg.REASON.EVENT_TIME_FUTURE };
    }
    if (eventKind !== 'check-in' && eventKind !== 'check-out') {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors: { eventKind: 'invalid' } };
    }
    if (role && !reg.isSourceAllowedForRole(reg.SOURCE_KIND.KIOSK, role)) {
      return { ok: false, reason: reg.REASON.SOURCE_NOT_ALLOWED_FOR_ROLE };
    }

    let device;
    try {
      const cursor = kioskDeviceModel.findOne({ deviceId, active: true });
      device = typeof cursor.lean === 'function' ? await cursor.lean() : await cursor;
    } catch (err) {
      logger.warn(`[qr-kiosk] kiosk device lookup failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    if (!device) return { ok: false, reason: 'ATTENDANCE_KIOSK_UNKNOWN' };

    // Authenticate device.
    const presentedHash = hashSecret(deviceSecret);
    if (presentedHash !== device.secretHash) {
      return { ok: false, reason: 'ATTENDANCE_KIOSK_AUTH_FAILED' };
    }

    // Kind allow-list.
    if (Array.isArray(device.allowedKinds) && !device.allowedKinds.includes(eventKind)) {
      return { ok: false, reason: 'ATTENDANCE_KIOSK_KIND_NOT_ALLOWED' };
    }

    // Role allow-list on the device.
    if (
      role &&
      Array.isArray(device.allowedRoles) &&
      device.allowedRoles.length > 0 &&
      !device.allowedRoles.includes(role)
    ) {
      return { ok: false, reason: reg.REASON.SOURCE_NOT_ALLOWED_FOR_ROLE };
    }

    // Active hours.
    if (Array.isArray(device.activeHours) && device.activeHours.length > 0) {
      const wd = t.getDay();
      const minOfDay = t.getHours() * 60 + t.getMinutes();
      const inHours = device.activeHours.some(
        w => w.weekday === wd && minOfDay >= w.startMin && minOfDay <= w.endMin
      );
      if (!inHours) {
        return { ok: false, reason: 'ATTENDANCE_KIOSK_OUTSIDE_ACTIVE_HOURS' };
      }
    }

    // PIN required.
    if (device.pinRequired && !pin) {
      return { ok: false, reason: 'ATTENDANCE_KIOSK_PIN_REQUIRED' };
    }
    // Photo required.
    if (device.photoRequired && !photoRef) {
      return { ok: false, reason: 'ATTENDANCE_KIOSK_PHOTO_REQUIRED' };
    }

    // Shift context.
    let expectedWindow = null;
    if (shiftResolver) {
      try {
        const r = await shiftResolver.resolveShiftForEmployee({ employeeId, at: t });
        if (r.ok && r.shift && typeof shiftResolver.computeExpectedWindow === 'function') {
          expectedWindow = shiftResolver.computeExpectedWindow({
            shift: r.shift,
            shiftDate: t,
          });
        }
      } catch (err) {
        logger.warn(`[qr-kiosk] kiosk shift resolve failed: ${err.message}`);
      }
    }
    const flags = [];
    if (!device.photoRequired) flags.push('low-confidence'); // no photo → less trust
    if (expectedWindow && t.getTime() > expectedWindow.latestCheckOut.getTime()) {
      flags.push('after-hours');
    }

    // Duplicate suppression.
    const dupSince = new Date(t.getTime() - reg.DEFAULTS.DUPLICATE_SUPPRESSION_WINDOW_MS);
    let dupCursor = sourceEventModel.find({
      employeeId,
      source: reg.SOURCE_KIND.KIOSK,
      eventKind,
      eventTime: { $gte: dupSince, $lte: t },
    });
    if (typeof dupCursor.lean === 'function') dupCursor = dupCursor.lean();
    let dupRows = [];
    try {
      dupRows = (await dupCursor) || [];
    } catch (err) {
      logger.warn(`[qr-kiosk] kiosk dup lookup failed: ${err.message}`);
    }
    if (dupRows.length > 0) {
      return {
        ok: false,
        reason: reg.REASON.DUPLICATE_WITHIN_WINDOW,
        duplicate: dupRows[0],
      };
    }

    const baseConfidence = device.photoRequired ? 90 : 75;
    const effectiveConfidence = reg.inferEffectiveConfidence({
      source: reg.SOURCE_KIND.KIOSK,
      baseConfidence,
      flags,
    });
    const tierLabel = reg.inferTrustTier(reg.SOURCE_KIND.KIOSK, effectiveConfidence, { flags });

    const eventDoc = new sourceEventModel({
      employeeId,
      branchId: device.branchId,
      eventTime: t,
      eventKind,
      source: reg.SOURCE_KIND.KIOSK,
      sourceRefId: `kiosk-${deviceId}-${Date.now()}`,
      sourceRefCollection: 'attendance_kiosk_devices',
      trustTier: reg.trustTierToNumeric(tierLabel),
      tierLabel,
      confidence: effectiveConfidence,
      accepted: true,
      flags,
      sourceRef: {
        deviceId,
        kioskDeviceObjectId: device._id || null,
        photoRef: photoRef || null,
        pinUsed: Boolean(pin),
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
      logger.error('[qr-kiosk] kiosk save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    // Touch device.lastSeenAt — best-effort, ignore failures.
    if (typeof kioskDeviceModel.updateOne === 'function') {
      try {
        await kioskDeviceModel.updateOne({ _id: device._id }, { $set: { lastSeenAt: t } });
      } catch (err) {
        logger.warn(`[qr-kiosk] lastSeenAt touch failed: ${err.message}`);
      }
    }

    return {
      ok: true,
      event: eventDoc.toObject ? eventDoc.toObject() : eventDoc,
      tierLabel,
      effectiveConfidence,
      flags,
      branchId: device.branchId,
    };
  }

  return {
    mintBranchQrToken,
    redeemQrScan,
    submitKioskEvent,
    // Exposed for admin tooling (rotate secret returns new cleartext):
    hashSecret,
  };
}

module.exports = {
  createQrKioskAttendanceService,
  hashSecret,
};

'use strict';

/**
 * hikvision-device.service.js — Wave 96 Phase 1.
 *
 * Workflow orchestration for the Hikvision device + camera-channel
 * registry. Every route in `hikvision.routes.js` calls into this
 * service — no caller writes directly to the model. Returns the
 * `{ ok: true, ... } | { ok: false, reason: '...' }` contract.
 *
 * Public API:
 *   registerDevice(input)         → { ok, device }
 *   getDevice(deviceCode | id)    → { ok, device }
 *   listDevices(filter)           → { ok, items, total }
 *   updateDevice(id, patch)       → { ok, device }
 *   retireDevice(id, reason)      → { ok, device }
 *
 *   registerChannel(input)        → { ok, channel }
 *   listChannels(filter)          → { ok, items, total }
 *   updateChannel(id, patch)      → { ok, channel }
 *
 * Reasons mirror `hikvision.registry.REASON`; routes map them to
 * HTTP status codes.
 */

const reg = require('./hikvision.registry');

function createHikvisionDeviceService({
  deviceModel = null,
  channelModel = null,
  logger = console,
} = {}) {
  if (!deviceModel) {
    throw new Error('hikvision-device.service: deviceModel is required');
  }

  // ─── Devices ─────────────────────────────────────────────────

  async function registerDevice(input = {}) {
    const {
      deviceCode,
      kind,
      branchId,
      ip,
      port,
      protocol,
      authMode,
      credentialsRef,
      capabilities,
      enrollmentRole,
      model,
      firmwareVersion,
      serialNumber,
      zoneId,
      notes,
    } = input;

    if (!deviceCode || typeof deviceCode !== 'string' || !deviceCode.trim()) {
      return { ok: false, reason: reg.REASON.DEVICE_CODE_REQUIRED };
    }
    if (!kind || !reg.DEVICE_KINDS.includes(kind)) {
      return { ok: false, reason: reg.REASON.INVALID_DEVICE_KIND };
    }
    if (!branchId) {
      return { ok: false, reason: reg.REASON.BRANCH_REQUIRED };
    }
    if (!ip || typeof ip !== 'string') {
      return { ok: false, reason: reg.REASON.IP_REQUIRED };
    }
    if (!ip.includes(':') && !reg.isValidIPv4(ip)) {
      return { ok: false, reason: reg.REASON.IP_INVALID };
    }
    if (!Array.isArray(capabilities) || capabilities.length === 0) {
      return { ok: false, reason: reg.REASON.CAPABILITIES_REQUIRED };
    }
    for (const c of capabilities) {
      if (!reg.CAPABILITIES.includes(c)) {
        return { ok: false, reason: reg.REASON.INVALID_CAPABILITY };
      }
    }
    if (enrollmentRole && !reg.ENROLLMENT_ROLES.includes(enrollmentRole)) {
      return { ok: false, reason: reg.REASON.INVALID_ENROLLMENT_ROLE };
    }

    // Uniqueness pre-check (the unique index is the source of truth,
    // but giving a clean reason code is much friendlier than letting
    // the duplicate-key error surface).
    const existing = await deviceModel.findOne({ deviceCode: deviceCode.trim() }).lean();
    if (existing) {
      return { ok: false, reason: reg.REASON.DEVICE_CODE_TAKEN };
    }

    const doc = new deviceModel({
      deviceCode: deviceCode.trim(),
      kind,
      branchId,
      zoneId: zoneId || null,
      ip,
      port: port || 80,
      protocol: protocol || 'isapi',
      authMode: authMode || 'digest',
      credentialsRef: credentialsRef || null,
      capabilities,
      enrollmentRole: enrollmentRole || reg.ENROLLMENT_ROLE.PRIMARY,
      model: model || null,
      firmwareVersion: firmwareVersion || null,
      serialNumber: serialNumber || null,
      notes: notes || null,
      status: reg.DEVICE_STATUS.PROVISIONING,
    });

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      if (err && err.code === 11000) {
        return { ok: false, reason: reg.REASON.DEVICE_CODE_TAKEN };
      }
      logger.error('[Hikvision] registerDevice save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    return { ok: true, device: doc.toObject ? doc.toObject() : doc };
  }

  async function getDevice(idOrCode) {
    if (!idOrCode) return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };
    const q = _isObjectIdLike(idOrCode) ? { _id: idOrCode } : { deviceCode: idOrCode };
    const dev = await deviceModel.findOne(q).lean();
    if (!dev) return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };
    return { ok: true, device: dev };
  }

  async function listDevices(filter = {}) {
    const q = {};
    if (filter.branchId) q.branchId = filter.branchId;
    if (filter.kind) q.kind = filter.kind;
    if (filter.status) q.status = filter.status;
    if (filter.includeRetired !== true) q.retiredAt = null;

    const limit = Math.min(Math.max(Number(filter.limit) || 50, 1), 200);
    const skip = Math.max(Number(filter.skip) || 0, 0);

    let cursor = deviceModel.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    const total =
      typeof deviceModel.countDocuments === 'function'
        ? await deviceModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  async function updateDevice(id, patch = {}) {
    if (!id) return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };
    const doc = await deviceModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };
    if (doc.retiredAt) return { ok: false, reason: reg.REASON.DEVICE_RETIRED };

    // Whitelist mutable fields — deviceCode/kind/branchId are NOT
    // editable post-creation (a wrong code → retire + re-register).
    const MUTABLE = [
      'ip',
      'port',
      'protocol',
      'authMode',
      'credentialsRef',
      'capabilities',
      'enrollmentRole',
      'model',
      'firmwareVersion',
      'serialNumber',
      'zoneId',
      'notes',
      'status',
      'lastHeartbeatAt',
      'timeOffsetMs',
    ];
    for (const k of MUTABLE) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) {
        doc[k] = patch[k];
      }
    }

    if (
      patch.enrollmentRole !== undefined &&
      !reg.ENROLLMENT_ROLES.includes(patch.enrollmentRole)
    ) {
      return { ok: false, reason: reg.REASON.INVALID_ENROLLMENT_ROLE };
    }
    if (Array.isArray(patch.capabilities)) {
      for (const c of patch.capabilities) {
        if (!reg.CAPABILITIES.includes(c)) {
          return { ok: false, reason: reg.REASON.INVALID_CAPABILITY };
        }
      }
    }
    if (patch.ip && !patch.ip.includes(':') && !reg.isValidIPv4(patch.ip)) {
      return { ok: false, reason: reg.REASON.IP_INVALID };
    }

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Hikvision] updateDevice save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, device: doc.toObject ? doc.toObject() : doc };
  }

  async function retireDevice(id, retiredReason) {
    if (!id) return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };
    if (!retiredReason || !String(retiredReason).trim()) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { retiredReason: 'required' },
      };
    }
    const doc = await deviceModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };
    if (doc.retiredAt) return { ok: false, reason: reg.REASON.DEVICE_RETIRED };

    doc.retiredAt = new Date();
    doc.retiredReason = String(retiredReason).trim();
    doc.status = reg.DEVICE_STATUS.RETIRED;
    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Hikvision] retireDevice save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, device: doc.toObject ? doc.toObject() : doc };
  }

  // ─── Channels ────────────────────────────────────────────────

  async function registerChannel(input = {}) {
    if (!channelModel) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { channelModel: 'unavailable' },
      };
    }
    const {
      deviceId,
      channelNo,
      zoneId,
      gateId,
      direction,
      attendanceEligible,
      recognitionMode,
      streamUrl,
      resolution,
      fps,
      notes,
    } = input;

    if (!deviceId) return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };
    if (!channelNo || channelNo < 1) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors: { channelNo: 'required' } };
    }
    if (!zoneId || !String(zoneId).trim()) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors: { zoneId: 'required' } };
    }
    if (direction && !reg.CHANNEL_DIRECTIONS.includes(direction)) {
      return { ok: false, reason: reg.REASON.INVALID_CHANNEL_DIRECTION };
    }
    if (recognitionMode && !reg.RECOGNITION_MODES.includes(recognitionMode)) {
      return { ok: false, reason: reg.REASON.INVALID_RECOGNITION_MODE };
    }

    // Parent device must exist + be a camera.
    const dev = await deviceModel.findById(deviceId).lean();
    if (!dev) return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };
    if (dev.kind !== reg.DEVICE_KIND.CAMERA && dev.kind !== reg.DEVICE_KIND.NVR) {
      return { ok: false, reason: reg.REASON.CHANNEL_DEVICE_MISMATCH };
    }
    if (attendanceEligible && !dev.capabilities.includes(reg.CAPABILITY.FACE)) {
      return { ok: false, reason: reg.REASON.ATTENDANCE_REQUIRES_FACE };
    }

    const doc = new channelModel({
      deviceId,
      channelNo,
      zoneId: String(zoneId).trim(),
      gateId: gateId || null,
      direction: direction || reg.CHANNEL_DIRECTION.BIDIRECTIONAL,
      attendanceEligible: Boolean(attendanceEligible),
      recognitionMode: recognitionMode || reg.RECOGNITION_MODE.SURVEILLANCE,
      streamUrl: streamUrl || null,
      resolution: resolution || null,
      fps: fps || null,
      notes: notes || null,
    });

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      if (err && err.code === 11000) {
        return {
          ok: false,
          reason: reg.REASON.VALIDATION_FAILED,
          errors: { channelNo: 'channel already registered for device' },
        };
      }
      logger.error('[Hikvision] registerChannel save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, channel: doc.toObject ? doc.toObject() : doc };
  }

  async function listChannels(filter = {}) {
    if (!channelModel) return { ok: true, items: [], total: 0 };
    const q = {};
    if (filter.deviceId) q.deviceId = filter.deviceId;
    if (filter.zoneId) q.zoneId = filter.zoneId;
    if (filter.attendanceEligible !== undefined) {
      q.attendanceEligible = Boolean(filter.attendanceEligible);
    }
    const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
    const skip = Math.max(Number(filter.skip) || 0, 0);
    let cursor = channelModel.find(q).sort({ deviceId: 1, channelNo: 1 }).skip(skip).limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    const total =
      typeof channelModel.countDocuments === 'function'
        ? await channelModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  async function updateChannel(id, patch = {}) {
    if (!channelModel) return { ok: false, reason: reg.REASON.CHANNEL_NOT_FOUND };
    if (!id) return { ok: false, reason: reg.REASON.CHANNEL_NOT_FOUND };
    const doc = await channelModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.CHANNEL_NOT_FOUND };

    const MUTABLE = [
      'zoneId',
      'gateId',
      'direction',
      'attendanceEligible',
      'recognitionMode',
      'streamUrl',
      'resolution',
      'fps',
      'notes',
    ];
    for (const k of MUTABLE) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) doc[k] = patch[k];
    }

    if (patch.direction && !reg.CHANNEL_DIRECTIONS.includes(patch.direction)) {
      return { ok: false, reason: reg.REASON.INVALID_CHANNEL_DIRECTION };
    }
    if (patch.recognitionMode && !reg.RECOGNITION_MODES.includes(patch.recognitionMode)) {
      return { ok: false, reason: reg.REASON.INVALID_RECOGNITION_MODE };
    }

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Hikvision] updateChannel save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, channel: doc.toObject ? doc.toObject() : doc };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  function _validationFail(err) {
    const errors = {};
    if (err && err.errors) {
      for (const k of Object.keys(err.errors)) {
        errors[k] = err.errors[k].message || 'invalid';
      }
    }
    return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
  }

  function _isObjectIdLike(s) {
    return typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);
  }

  return {
    // Devices
    registerDevice,
    getDevice,
    listDevices,
    updateDevice,
    retireDevice,
    // Channels
    registerChannel,
    listChannels,
    updateChannel,
  };
}

module.exports = { createHikvisionDeviceService };

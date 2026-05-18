'use strict';

/**
 * hikvision-face-library.service.js — Wave 97 Phase 2.
 *
 * Owns the lifecycle of `HikvisionFaceLibrary` rows + device
 * subscriptions + integrity-hash bookkeeping. Does NOT enrol or push
 * templates — that's the enrollment service (`hikvision-face-enrollment.service`).
 *
 * Public API:
 *   createLibrary({ libraryCode, name, branchId, capacity,
 *                   syncStrategy?, allowedBranchIds?, notes? })
 *     → { ok, library }
 *
 *   getLibrary(idOrCode)             → { ok, library }
 *   listLibraries(filter)            → { ok, items, total }
 *   updateLibrary(id, patch)         → { ok, library }
 *   archiveLibrary(id, reason)       → { ok, library, cascadedTemplates? }
 *
 *   subscribeDevice(libraryId, deviceId)   → { ok, library }
 *   unsubscribeDevice(libraryId, deviceId) → { ok, library }
 *
 *   computeIntegrityHash({ libraryId, templateModel? })
 *     → { ok, integrityHash, templateCount }
 *
 *   recordSyncResult({ libraryId, hash, error? }) → { ok, library }
 *
 * Reasons follow `hikvision.registry.REASON`. Routes map them to HTTP
 * status codes.
 */

const crypto = require('crypto');
const reg = require('./hikvision.registry');

function createHikvisionFaceLibraryService({
  libraryModel = null,
  templateModel = null,
  deviceModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!libraryModel) {
    throw new Error('hikvision-face-library.service: libraryModel is required');
  }
  // templateModel is OPTIONAL — only needed for integrity hash + archive cascade.
  // deviceModel is OPTIONAL — only needed for subscribe / unsubscribe validation.

  // ─── Library CRUD ────────────────────────────────────────────

  async function createLibrary(input = {}) {
    const { libraryCode, name, branchId, capacity, syncStrategy, allowedBranchIds, notes } = input;

    if (!libraryCode || typeof libraryCode !== 'string' || !libraryCode.trim()) {
      return { ok: false, reason: reg.REASON.LIBRARY_CODE_REQUIRED };
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors: { name: 'required' } };
    }
    if (!branchId) {
      return { ok: false, reason: reg.REASON.BRANCH_REQUIRED };
    }
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap < 1 || cap > reg.TEMPLATE_DEFAULTS.MAX_LIBRARY_CAPACITY) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { capacity: `1..${reg.TEMPLATE_DEFAULTS.MAX_LIBRARY_CAPACITY}` },
      };
    }
    const strategy = syncStrategy || reg.SYNC_STRATEGY.BRANCH_ONLY;
    if (!reg.SYNC_STRATEGIES.includes(strategy)) {
      return { ok: false, reason: reg.REASON.INVALID_SYNC_STRATEGY };
    }

    // Pre-check uniqueness (the index will also enforce).
    const existing = await libraryModel.findOne({ libraryCode: libraryCode.trim() }).lean();
    if (existing) return { ok: false, reason: reg.REASON.LIBRARY_CODE_TAKEN };

    const doc = new libraryModel({
      libraryCode: libraryCode.trim(),
      name: name.trim(),
      branchId,
      capacity: cap,
      usedSlots: 0,
      syncStrategy: strategy,
      allowedBranchIds: Array.isArray(allowedBranchIds) ? allowedBranchIds : [],
      notes: notes || null,
      status: reg.LIBRARY_STATUS.ACTIVE,
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
        return { ok: false, reason: reg.REASON.LIBRARY_CODE_TAKEN };
      }
      logger.error('[Hikvision FaceLibrary] createLibrary save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    return { ok: true, library: doc.toObject ? doc.toObject() : doc };
  }

  async function getLibrary(idOrCode) {
    if (!idOrCode) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    const q = _isObjectIdLike(idOrCode) ? { _id: idOrCode } : { libraryCode: idOrCode };
    const lib = await libraryModel.findOne(q).lean();
    if (!lib) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    return { ok: true, library: lib };
  }

  async function listLibraries(filter = {}) {
    const q = {};
    if (filter.branchId) q.branchId = filter.branchId;
    if (filter.status) q.status = filter.status;
    if (filter.syncStrategy) q.syncStrategy = filter.syncStrategy;

    const limit = Math.min(Math.max(Number(filter.limit) || 50, 1), 200);
    const skip = Math.max(Number(filter.skip) || 0, 0);

    let cursor = libraryModel.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    const total =
      typeof libraryModel.countDocuments === 'function'
        ? await libraryModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  async function updateLibrary(id, patch = {}) {
    if (!id) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    const doc = await libraryModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    if (doc.status === reg.LIBRARY_STATUS.ARCHIVED) {
      return { ok: false, reason: reg.REASON.LIBRARY_ARCHIVED };
    }

    // Whitelist — libraryCode + branchId are immutable.
    const MUTABLE = [
      'name',
      'capacity',
      'syncStrategy',
      'allowedBranchIds',
      'notes',
      'status', // active ↔ paused (archive goes through archiveLibrary)
    ];
    for (const k of MUTABLE) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) doc[k] = patch[k];
    }

    if (patch.status === reg.LIBRARY_STATUS.ARCHIVED) {
      // Archival is a separate, audited operation — refuse here.
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { status: 'use archiveLibrary() to archive' },
      };
    }
    if (patch.syncStrategy && !reg.SYNC_STRATEGIES.includes(patch.syncStrategy)) {
      return { ok: false, reason: reg.REASON.INVALID_SYNC_STRATEGY };
    }
    if (patch.status && !reg.LIBRARY_STATUSES.includes(patch.status)) {
      return { ok: false, reason: reg.REASON.INVALID_LIBRARY_STATUS };
    }

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Hikvision FaceLibrary] updateLibrary save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, library: doc.toObject ? doc.toObject() : doc };
  }

  async function archiveLibrary(id, archiveReason) {
    if (!id) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    if (!archiveReason || !String(archiveReason).trim()) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { archiveReason: 'required' },
      };
    }
    const doc = await libraryModel.findById(id);
    if (!doc) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    if (doc.status === reg.LIBRARY_STATUS.ARCHIVED) {
      return { ok: false, reason: reg.REASON.LIBRARY_ARCHIVED };
    }

    doc.status = reg.LIBRARY_STATUS.ARCHIVED;
    doc.notes = doc.notes
      ? `${doc.notes}\n[archived ${now().toISOString()}]: ${archiveReason}`
      : `[archived ${now().toISOString()}]: ${archiveReason}`;

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Hikvision FaceLibrary] archiveLibrary save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    // Cascade: every still-active template in this library moves to
    // suspended with cascadeReason=LIBRARY_ARCHIVED.
    let cascadedTemplates = 0;
    if (templateModel) {
      try {
        const updateRes = await templateModel.updateMany(
          {
            libraryId: doc._id,
            status: { $in: [reg.TEMPLATE_STATUS.PENDING, reg.TEMPLATE_STATUS.ACTIVE] },
          },
          {
            $set: {
              status: reg.TEMPLATE_STATUS.SUSPENDED,
              deactivatedAt: now(),
              deactivationReason: `library archived: ${String(archiveReason).trim()}`,
              cascadeReason: reg.CASCADE_REASON.LIBRARY_ARCHIVED,
            },
          }
        );
        cascadedTemplates =
          (updateRes && (updateRes.modifiedCount || updateRes.nModified || updateRes.n)) || 0;
      } catch (err) {
        logger.warn(
          '[Hikvision FaceLibrary] archive cascade failed (templates remain active):',
          err.message
        );
      }
    }

    return {
      ok: true,
      library: doc.toObject ? doc.toObject() : doc,
      cascadedTemplates,
    };
  }

  // ─── Device subscriptions ───────────────────────────────────

  async function subscribeDevice(libraryId, deviceId) {
    if (!libraryId) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    if (!deviceId) return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };

    const doc = await libraryModel.findById(libraryId);
    if (!doc) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    if (doc.status === reg.LIBRARY_STATUS.ARCHIVED) {
      return { ok: false, reason: reg.REASON.LIBRARY_ARCHIVED };
    }

    // If a device model is available, enforce face-capability + eligibility.
    if (deviceModel) {
      const dev = await deviceModel.findById(deviceId).lean();
      if (!dev) return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };
      if (dev.retiredAt) return { ok: false, reason: reg.REASON.DEVICE_RETIRED };
      if (!Array.isArray(dev.capabilities) || !dev.capabilities.includes(reg.CAPABILITY.FACE)) {
        return { ok: false, reason: reg.REASON.DEVICE_NOT_FACE_CAPABLE };
      }
      if (!reg.isDeviceEligibleForLibrary(doc.toObject ? doc.toObject() : doc, dev)) {
        return { ok: false, reason: reg.REASON.LIBRARY_BRANCH_MISMATCH };
      }
    }

    if (!Array.isArray(doc.devicesSubscribed)) doc.devicesSubscribed = [];
    const already = doc.devicesSubscribed.some(d => String(d) === String(deviceId));
    if (already) return { ok: false, reason: reg.REASON.DEVICE_ALREADY_SUBSCRIBED };

    doc.devicesSubscribed.push(deviceId);
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Hikvision FaceLibrary] subscribeDevice save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, library: doc.toObject ? doc.toObject() : doc };
  }

  async function unsubscribeDevice(libraryId, deviceId) {
    if (!libraryId) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    if (!deviceId) return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };

    const doc = await libraryModel.findById(libraryId);
    if (!doc) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    if (!Array.isArray(doc.devicesSubscribed)) doc.devicesSubscribed = [];
    const before = doc.devicesSubscribed.length;
    doc.devicesSubscribed = doc.devicesSubscribed.filter(d => String(d) !== String(deviceId));
    if (doc.devicesSubscribed.length === before) {
      return { ok: false, reason: reg.REASON.DEVICE_NOT_SUBSCRIBED };
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Hikvision FaceLibrary] unsubscribeDevice save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, library: doc.toObject ? doc.toObject() : doc };
  }

  // ─── Integrity hash + sync bookkeeping ──────────────────────

  async function computeIntegrityHash({ libraryId, templateModel: tplArg } = {}) {
    if (!libraryId) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    const tplModel = tplArg || templateModel;
    if (!tplModel) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { templateModel: 'unavailable' },
      };
    }
    let cursor = tplModel
      .find({
        libraryId,
        status: { $in: [reg.TEMPLATE_STATUS.PENDING, reg.TEMPLATE_STATUS.ACTIVE] },
      })
      .sort({ _id: 1 });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const rows = await cursor;

    const hash = crypto.createHash('sha256');
    let count = 0;
    for (const r of rows) {
      hash.update(`${String(r._id)}|${r.templateChecksum || '∅'}|${r.status}`);
      hash.update('\n');
      count += 1;
    }
    const integrityHash = count === 0 ? 'EMPTY' : hash.digest('hex');
    return { ok: true, integrityHash, templateCount: count };
  }

  async function recordSyncResult({ libraryId, hash, error } = {}) {
    if (!libraryId) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    const doc = await libraryModel.findById(libraryId);
    if (!doc) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };

    if (hash) doc.integrityHash = hash;
    doc.lastFullSyncAt = now();
    doc.lastFullSyncError = error ? String(error).slice(0, 500) : null;

    try {
      await doc.save();
    } catch (err) {
      logger.error('[Hikvision FaceLibrary] recordSyncResult save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, library: doc.toObject ? doc.toObject() : doc };
  }

  // ─── Helpers ─────────────────────────────────────────────────

  function _validationFail(err) {
    const errors = {};
    if (err && err.errors) {
      for (const k of Object.keys(err.errors)) errors[k] = err.errors[k].message || 'invalid';
    }
    return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
  }

  function _isObjectIdLike(s) {
    return typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);
  }

  return {
    createLibrary,
    getLibrary,
    listLibraries,
    updateLibrary,
    archiveLibrary,
    subscribeDevice,
    unsubscribeDevice,
    computeIntegrityHash,
    recordSyncResult,
  };
}

module.exports = { createHikvisionFaceLibraryService };

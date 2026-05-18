'use strict';

/**
 * hikvision-sync-worker.service.js — Wave 106 Phase F.
 *
 * Orchestrates ISAPI device sync. Three layers of API:
 *
 *   • syncLibraryToDevice(libraryId, deviceId) — single pair, atomic
 *   • syncLibrary(libraryId)                   — fan-out to every device
 *                                                subscribed; isolated per
 *                                                device so one bad device
 *                                                doesn't block the rest.
 *   • syncAll()                                — every active library.
 *
 *   • detectDrift(libraryId)                   — compares stored hash with
 *                                                a freshly-computed hash;
 *                                                does NOT mutate.
 *
 * Result schema (per pair):
 *   { ok, result: SYNC_RESULT,
 *     deviceCode, libraryId,
 *     pushed: N, deleted: N, verified: N, errors: [{...}],
 *     newIntegrityHash, durationMs }
 *
 * Failure handling:
 *   - Per-template retries (MAX_PUSH_RETRIES with exponential backoff)
 *   - Per-template error captured; sync continues on next template
 *   - Device unreachable → result=FAILED for the whole pair
 *   - Partial failures → result=PARTIAL, lastSyncError set on failed
 *     templates only
 *
 * Side effects per successful push:
 *   - confirmEnrollment() called on enrollment service → template
 *     transitions pending → active with personId + checksum
 *
 * Side effects per successful pair sync:
 *   - libraryService.recordSyncResult() persists hash + timestamp
 */

const reg = require('./hikvision.registry');

function createHikvisionSyncWorker({
  libraryService = null,
  enrollmentService = null,
  deviceModel = null,
  templateModel = null,
  libraryModel = null,
  isapiAdapter = null, // createMockIsapiAdapter or createIsapiAdapter result
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!libraryService) {
    throw new Error('hikvision-sync-worker: libraryService is required');
  }
  if (!enrollmentService) {
    throw new Error('hikvision-sync-worker: enrollmentService is required');
  }
  if (!deviceModel || !templateModel || !libraryModel) {
    throw new Error(
      'hikvision-sync-worker: deviceModel + templateModel + libraryModel are required'
    );
  }
  if (!isapiAdapter || typeof isapiAdapter.pushPerson !== 'function') {
    throw new Error('hikvision-sync-worker: isapiAdapter is required');
  }

  // ─── Per-pair sync ────────────────────────────────────────────

  async function syncLibraryToDevice(libraryId, deviceId, opts = {}) {
    const startedAt = Date.now();
    const result = {
      ok: false,
      result: reg.SYNC_RESULT.SKIPPED,
      libraryId: String(libraryId),
      deviceId: String(deviceId),
      deviceCode: null,
      pushed: 0,
      deleted: 0,
      verified: 0,
      errors: [],
      newIntegrityHash: null,
      durationMs: 0,
    };

    if (!libraryId || !deviceId) {
      result.errors.push({ kind: 'invalid-args', message: 'libraryId + deviceId required' });
      result.result = reg.SYNC_RESULT.FAILED;
      result.durationMs = Date.now() - startedAt;
      return result;
    }

    // 1. Load library + device + verify subscription.
    const library = await libraryModel.findById(libraryId).lean();
    if (!library) {
      result.errors.push({ kind: 'library-not-found', libraryId: String(libraryId) });
      result.result = reg.SYNC_RESULT.FAILED;
      result.durationMs = Date.now() - startedAt;
      return result;
    }
    if (library.status === reg.LIBRARY_STATUS.ARCHIVED) {
      result.result = reg.SYNC_RESULT.SKIPPED;
      result.errors.push({ kind: 'library-archived' });
      result.durationMs = Date.now() - startedAt;
      return result;
    }

    const device = await deviceModel.findById(deviceId).lean();
    if (!device) {
      result.errors.push({ kind: 'device-not-found', deviceId: String(deviceId) });
      result.result = reg.SYNC_RESULT.FAILED;
      result.durationMs = Date.now() - startedAt;
      return result;
    }
    result.deviceCode = device.deviceCode;
    if (device.retiredAt) {
      result.result = reg.SYNC_RESULT.SKIPPED;
      result.errors.push({ kind: 'device-retired' });
      result.durationMs = Date.now() - startedAt;
      return result;
    }

    const subscribed = (library.devicesSubscribed || []).some(d => String(d) === String(deviceId));
    if (!subscribed) {
      result.result = reg.SYNC_RESULT.SKIPPED;
      result.errors.push({ kind: 'device-not-subscribed' });
      result.durationMs = Date.now() - startedAt;
      return result;
    }

    // 2. Probe device — fail fast if unreachable.
    try {
      await isapiAdapter.ping(device);
    } catch (pingErr) {
      logger.warn(`[Hik sync] ping failed ${device.deviceCode}: ${pingErr.message}`);
      result.result = reg.SYNC_RESULT.FAILED;
      result.errors.push({ kind: 'unreachable', message: pingErr.message });
      result.durationMs = Date.now() - startedAt;
      return result;
    }

    // 3. Pull templates the library believes are active or pending.
    let templates = await templateModel.find({
      libraryId,
      status: {
        $in: [reg.TEMPLATE_STATUS.PENDING, reg.TEMPLATE_STATUS.ACTIVE],
      },
    });
    // Allow either chainable mock (returns inst array) or lean cursor
    if (templates && typeof templates.lean === 'function') {
      templates = await templates.lean();
    }
    templates = Array.isArray(templates) ? templates : [];

    // 4. Pull device's current personIds.
    let devicePersonIds = [];
    try {
      devicePersonIds = await isapiAdapter.listPersonIds(device);
    } catch (listErr) {
      logger.warn(`[Hik sync] listPersonIds failed ${device.deviceCode}: ${listErr.message}`);
      result.result = reg.SYNC_RESULT.FAILED;
      result.errors.push({ kind: 'list-failed', message: listErr.message });
      result.durationMs = Date.now() - startedAt;
      return result;
    }

    // 5. Compute diff.
    const diff = reg.computeSyncDiff(templates, devicePersonIds);

    // 6. Apply diff, respecting cap. Errors per-item don't abort the run.
    const cap = opts.maxOps || reg.SYNC_DEFAULTS.MAX_OPS_PER_DEVICE_PER_RUN;
    let opsDone = 0;

    // 6a. Pushes (with retries on transient failure).
    for (const { template } of diff.toPush) {
      if (opsDone >= cap) {
        result.errors.push({ kind: 'cap-reached', operation: 'push' });
        break;
      }
      const pushed = await _pushWithRetry(device, template);
      if (pushed.ok) {
        result.pushed += 1;
        // Confirm enrollment → template moves pending → active
        try {
          await enrollmentService.confirmEnrollment({
            templateId: template._id,
            hikvisionPersonId: pushed.personId,
            templateChecksum: pushed.checksum,
          });
        } catch (confirmErr) {
          // Confirm might fail if template is already active (idempotent).
          // Log + continue.
          if (
            !confirmErr.message ||
            !String(confirmErr.message).includes(reg.REASON.TEMPLATE_NOT_PENDING)
          ) {
            result.errors.push({
              kind: 'confirm-failed',
              templateId: String(template._id),
              message: confirmErr.message,
            });
          }
        }
      } else {
        result.errors.push({
          kind: 'push-failed',
          templateId: String(template._id),
          message: pushed.error,
        });
        // Record per-template error for ops visibility
        await _recordTemplateSyncError(template._id, pushed.error);
      }
      opsDone += 1;
    }

    // 6b. Deletes.
    for (const { personId } of diff.toDelete) {
      if (opsDone >= cap) {
        result.errors.push({ kind: 'cap-reached', operation: 'delete' });
        break;
      }
      try {
        await isapiAdapter.deletePerson(device, personId);
        result.deleted += 1;
      } catch (delErr) {
        result.errors.push({
          kind: 'delete-failed',
          personId,
          message: delErr.message,
        });
      }
      opsDone += 1;
    }

    // 6c. Verifies — just refresh lastSyncedAt on templates we know are in sync.
    for (const { template } of diff.toVerify) {
      await _markTemplateSynced(template._id);
      result.verified += 1;
    }

    // 7. Compute new integrity hash + persist on library.
    try {
      const hashRes = await libraryService.computeIntegrityHash({ libraryId });
      if (hashRes.ok) {
        result.newIntegrityHash = hashRes.integrityHash;
        await libraryService.recordSyncResult({
          libraryId,
          hash: hashRes.integrityHash,
          error: result.errors.length > 0 ? `${result.errors.length} per-item errors` : null,
        });
      }
    } catch (hashErr) {
      logger.warn(`[Hik sync] hash recompute failed: ${hashErr.message}`);
    }

    // 8. Classify result.
    if (result.errors.length === 0) {
      if (result.pushed === 0 && result.deleted === 0) {
        result.result = reg.SYNC_RESULT.NO_OP;
      } else {
        result.result = reg.SYNC_RESULT.SUCCESS;
      }
    } else if (result.pushed > 0 || result.deleted > 0 || result.verified > 0) {
      result.result = reg.SYNC_RESULT.PARTIAL;
    } else {
      result.result = reg.SYNC_RESULT.FAILED;
    }
    result.ok =
      result.result === reg.SYNC_RESULT.SUCCESS ||
      result.result === reg.SYNC_RESULT.NO_OP ||
      result.result === reg.SYNC_RESULT.PARTIAL;
    result.durationMs = Date.now() - startedAt;
    return result;
  }

  // ─── Library fan-out ──────────────────────────────────────────

  async function syncLibrary(libraryId, opts = {}) {
    const library = await libraryModel.findById(libraryId).lean();
    if (!library) {
      return {
        ok: false,
        reason: reg.REASON.LIBRARY_NOT_FOUND,
        libraryId: String(libraryId),
      };
    }
    if (library.status === reg.LIBRARY_STATUS.ARCHIVED) {
      return {
        ok: false,
        reason: reg.REASON.SYNC_LIBRARY_ARCHIVED,
        libraryId: String(libraryId),
      };
    }

    const deviceIds = library.devicesSubscribed || [];
    const perDevice = [];
    let anyFailed = false;
    let anyPartial = false;
    for (const deviceId of deviceIds) {
      // Sequential — Hikvision NVRs serialise face-library writes anyway.
      const r = await syncLibraryToDevice(libraryId, deviceId, opts);
      perDevice.push(r);
      if (r.result === reg.SYNC_RESULT.FAILED) anyFailed = true;
      else if (r.result === reg.SYNC_RESULT.PARTIAL) anyPartial = true;
    }

    return {
      ok: true,
      libraryId: String(libraryId),
      libraryCode: library.libraryCode,
      devices: perDevice,
      summary: {
        total: perDevice.length,
        success: perDevice.filter(d => d.result === reg.SYNC_RESULT.SUCCESS).length,
        noOp: perDevice.filter(d => d.result === reg.SYNC_RESULT.NO_OP).length,
        partial: perDevice.filter(d => d.result === reg.SYNC_RESULT.PARTIAL).length,
        failed: perDevice.filter(d => d.result === reg.SYNC_RESULT.FAILED).length,
        skipped: perDevice.filter(d => d.result === reg.SYNC_RESULT.SKIPPED).length,
        anyFailed,
        anyPartial,
      },
    };
  }

  // ─── Org-wide sweep ───────────────────────────────────────────

  async function syncAll(opts = {}) {
    let cursor = libraryModel
      .find({ status: { $ne: reg.LIBRARY_STATUS.ARCHIVED } })
      .sort({ createdAt: 1 });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const libraries = await cursor;

    const perLibrary = [];
    for (const lib of libraries || []) {
      const r = await syncLibrary(lib._id, opts);
      perLibrary.push(r);
    }
    return {
      ok: true,
      libraries: perLibrary,
      summary: {
        librariesScanned: perLibrary.length,
        librariesWithFailures: perLibrary.filter(l => l.summary?.anyFailed).length,
        librariesWithPartials: perLibrary.filter(l => l.summary?.anyPartial).length,
      },
    };
  }

  // ─── Drift detection (read-only) ──────────────────────────────

  async function detectDrift(libraryId) {
    const library = await libraryModel.findById(libraryId).lean();
    if (!library) {
      return {
        ok: false,
        reason: reg.REASON.LIBRARY_NOT_FOUND,
        libraryId: String(libraryId),
      };
    }
    const fresh = await libraryService.computeIntegrityHash({ libraryId });
    if (!fresh.ok) {
      return {
        ok: false,
        reason: fresh.reason || reg.REASON.SAVE_FAILED,
        libraryId: String(libraryId),
      };
    }
    const stored = library.integrityHash;
    const hasDrift = stored != null && stored !== fresh.integrityHash;
    return {
      ok: true,
      libraryId: String(libraryId),
      libraryCode: library.libraryCode,
      hasDrift,
      storedHash: stored,
      currentHash: fresh.integrityHash,
      templateCount: fresh.templateCount,
      detectedAt: now().toISOString(),
    };
  }

  async function detectDriftAll() {
    let cursor = libraryModel.find({ status: { $ne: reg.LIBRARY_STATUS.ARCHIVED } });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const libraries = await cursor;

    const results = [];
    for (const lib of libraries || []) {
      const r = await detectDrift(lib._id);
      results.push(r);
    }
    return {
      ok: true,
      results,
      summary: {
        scanned: results.length,
        withDrift: results.filter(r => r.hasDrift).length,
      },
    };
  }

  // ─── Internal helpers ─────────────────────────────────────────

  async function _pushWithRetry(device, template) {
    const payload = {
      templateId: template._id,
      employeeRef: template.employeeId,
      images: template.enrollmentImages,
      checksum: template.templateChecksum || null,
    };
    let lastErr = null;
    const retries = reg.SYNC_DEFAULTS.MAX_PUSH_RETRIES;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const r = await isapiAdapter.pushPerson(device, payload);
        return { ok: true, personId: r.personId, checksum: r.checksum };
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          const backoff = reg.SYNC_DEFAULTS.RETRY_BACKOFF_MS[attempt] || 1000;
          await _sleep(backoff);
        }
      }
    }
    return { ok: false, error: lastErr?.message || 'unknown push error' };
  }

  async function _markTemplateSynced(templateId) {
    try {
      const doc = await templateModel.findById(templateId);
      if (!doc) return;
      doc.lastSyncedAt = now();
      doc.lastSyncError = null;
      await doc.save();
    } catch (err) {
      logger.warn(`[Hik sync] mark-synced failed for ${templateId}: ${err.message}`);
    }
  }

  async function _recordTemplateSyncError(templateId, errorMsg) {
    try {
      const doc = await templateModel.findById(templateId);
      if (!doc) return;
      doc.lastSyncedAt = now();
      doc.lastSyncError = String(errorMsg || '').slice(0, 500);
      await doc.save();
    } catch (err) {
      logger.warn(`[Hik sync] error-record failed for ${templateId}: ${err.message}`);
    }
  }

  function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return {
    syncLibraryToDevice,
    syncLibrary,
    syncAll,
    detectDrift,
    detectDriftAll,
  };
}

module.exports = { createHikvisionSyncWorker };

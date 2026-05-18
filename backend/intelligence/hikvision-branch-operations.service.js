'use strict';

/**
 * hikvision-branch-operations.service.js — Wave 111.
 *
 * Aggregator. Fans out to the existing per-service queries in
 * parallel and assembles a single branch operational snapshot for
 * the UI. Returns ALL signals a branch manager needs in one go:
 *
 *   • Device health   (from healthService.getBranchSummary)
 *   • Stream status   (from streamSupervisor.getStatus, filtered)
 *   • Open reviews    (from attendanceSourceService.listReviews)
 *   • Open recon cases (from reconciliationService.listCases)
 *   • Fraud band      (from fraudScoreService.getBranchSummary)
 *   • Effective thresholds (from branchConfigService.resolveEffective)
 *   • Sync drift status (from syncWorker.detectDriftAll, filtered to
 *     libraries whose branchId matches)
 *
 * Resilience: every leaf call is independently try/catch'd. If a
 * leaf fails, the corresponding section returns `{ ok: false,
 * reason }` while the rest of the snapshot still renders. The UI
 * shows a per-section error banner without losing the whole view.
 *
 * No new model. No writes. Read-only.
 */

const reg = require('./hikvision.registry');

function createHikvisionBranchOperationsService({
  healthService = null,
  streamSupervisor = null,
  attendanceSourceService = null,
  reconciliationService = null,
  fraudScoreService = null,
  branchConfigService = null,
  syncWorker = null,
  deviceModel = null,
  libraryModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!deviceModel) {
    throw new Error('hikvision-branch-operations: deviceModel is required');
  }

  /**
   * snapshot(branchId, opts) → {
   *   ok, branchId, generatedAt,
   *   health, stream, reviews, reconciliation,
   *   fraud, thresholds, sync, devices,
   * }
   *
   * opts.openReviewLimit (default 5)
   * opts.openCaseLimit   (default 5)
   */
  async function snapshot(branchId, opts = {}) {
    if (!branchId) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors: { branchId: 'required' } };
    }
    const openReviewLimit = Math.max(1, Math.min(20, Number(opts.openReviewLimit) || 5));
    const openCaseLimit = Math.max(1, Math.min(20, Number(opts.openCaseLimit) || 5));

    const [
      healthResult,
      streamResult,
      reviewsResult,
      reconResult,
      fraudResult,
      thresholdsResult,
      syncResult,
      devicesResult,
    ] = await Promise.all([
      _safe('health', () =>
        healthService && typeof healthService.getBranchSummary === 'function'
          ? healthService.getBranchSummary(branchId)
          : Promise.resolve({ ok: false, reason: 'service-unavailable' })
      ),
      _safe('stream', () => _streamForBranch(branchId)),
      _safe('reviews', () =>
        attendanceSourceService && typeof attendanceSourceService.listReviews === 'function'
          ? attendanceSourceService.listReviews({
              branchId,
              state: 'open',
              limit: openReviewLimit,
            })
          : Promise.resolve({ ok: false, reason: 'service-unavailable' })
      ),
      _safe('reconciliation', () =>
        reconciliationService && typeof reconciliationService.listCases === 'function'
          ? reconciliationService.listCases({
              branchId,
              status: { $in: ['open', 'in-progress'] },
              limit: openCaseLimit,
            })
          : Promise.resolve({ ok: false, reason: 'service-unavailable' })
      ),
      _safe('fraud', () =>
        fraudScoreService && typeof fraudScoreService.getBranchSummary === 'function'
          ? fraudScoreService.getBranchSummary(branchId)
          : Promise.resolve({ ok: false, reason: 'service-unavailable' })
      ),
      _safe('thresholds', () =>
        branchConfigService && typeof branchConfigService.resolveEffective === 'function'
          ? branchConfigService.resolveEffective(branchId)
          : Promise.resolve({ ok: false, reason: 'service-unavailable' })
      ),
      _safe('sync', () => _driftForBranch(branchId)),
      _safe('devices', () => _devicesForBranch(branchId)),
    ]);

    return {
      ok: true,
      branchId: String(branchId),
      generatedAt: now().toISOString(),
      health: healthResult,
      stream: streamResult,
      reviews: reviewsResult,
      reconciliation: reconResult,
      fraud: fraudResult,
      thresholds: thresholdsResult,
      sync: syncResult,
      devices: devicesResult,
    };
  }

  // ─── Leaf helpers — fail-safe wrappers ───────────────────────

  async function _safe(section, fn) {
    try {
      const r = await fn();
      return r || { ok: false, reason: 'empty-result', section };
    } catch (err) {
      logger.warn(`[branch-ops] ${section} failed: ${err.message}`);
      return { ok: false, reason: 'leaf-error', section, message: err.message };
    }
  }

  async function _streamForBranch(branchId) {
    if (!streamSupervisor || typeof streamSupervisor.getStatus !== 'function') {
      return { ok: false, reason: 'service-unavailable' };
    }
    // The supervisor doesn't index by branch — fetch all + intersect
    // with the device list. Cheap because it's an in-memory map.
    const status = streamSupervisor.getStatus();
    const branchDevices = await _deviceCodesForBranch(branchId);
    const branchSet = new Set(branchDevices.map(d => d.deviceCode));
    const items = (status.items || []).filter(it => branchSet.has(it.deviceCode));
    const byState = {};
    for (const it of items) {
      byState[it.state] = (byState[it.state] || 0) + 1;
    }
    return {
      ok: true,
      running: status.running,
      totalBranchDevices: branchDevices.length,
      streamedDevices: items.length,
      byState,
      items,
    };
  }

  async function _driftForBranch(branchId) {
    if (!syncWorker || typeof syncWorker.detectDriftAll !== 'function') {
      return { ok: false, reason: 'service-unavailable' };
    }
    if (!libraryModel) {
      return { ok: false, reason: 'libraryModel-unavailable' };
    }
    // Pull all drift results, then filter to libraries whose branchId
    // matches. The library document carries the branch.
    let q = libraryModel.find({ branchId });
    if (typeof q.lean === 'function') q = q.lean();
    const libs = (await q) || [];
    const libIds = new Set(libs.map(l => String(l._id)));
    if (libIds.size === 0) {
      return { ok: true, summary: { scanned: 0, withDrift: 0 }, results: [] };
    }
    const driftAll = await syncWorker.detectDriftAll();
    const filtered = (driftAll.results || []).filter(r => libIds.has(String(r.libraryId)));
    return {
      ok: true,
      summary: {
        scanned: filtered.length,
        withDrift: filtered.filter(r => r.hasDrift).length,
      },
      results: filtered,
    };
  }

  async function _devicesForBranch(branchId) {
    const devices = await _deviceCodesForBranch(branchId);
    return {
      ok: true,
      total: devices.length,
      retired: devices.filter(d => d.retiredAt).length,
      byKind: _groupCount(devices, 'kind'),
      items: devices.map(d => ({
        _id: String(d._id),
        deviceCode: d.deviceCode,
        kind: d.kind,
        retiredAt: d.retiredAt || null,
      })),
    };
  }

  async function _deviceCodesForBranch(branchId) {
    let q = deviceModel.find({ branchId });
    if (typeof q.lean === 'function') q = q.lean();
    const devices = (await q) || [];
    return devices;
  }

  function _groupCount(arr, key) {
    const out = {};
    for (const r of arr) {
      const v = r[key] || 'unknown';
      out[v] = (out[v] || 0) + 1;
    }
    return out;
  }

  return {
    snapshot,
  };
}

module.exports = { createHikvisionBranchOperationsService };

'use strict';

/**
 * hikvision-org-summary.service.js — Wave 112.
 *
 * Org-wide rollup. Wave 111 already aggregates per-branch; this wave
 * rolls those signals up to the executive level for security
 * architects and the CRO/CISO/DPO.
 *
 * Read-only. No new model. Pure aggregation over existing service
 * methods. Heavy enough that we cache the snapshot for 60 seconds
 * (executives refresh on a slower cadence than branch ops).
 *
 * Public API:
 *   snapshot()  → {
 *     ok, generatedAt,
 *     devices       { total, byKind, byStatus, retired, byBranch[] },
 *     stream        { running, totalDevices, byState, topReconnecting[] },
 *     reviews       { totalOpen, byQueue, oldestOpenAt },
 *     reconciliation{ totalOpen, byStatus, oldestOpenAt },
 *     fraud         { totalEmployees, byBand, topBranches[], topEmployees[] },
 *     sync          { librariesScanned, withDrift, byBranch[] },
 *     branchConfig  { branchesWithOverrides, overrideCoveragePct, allBranchCount },
 *     scheduler     { jobsAvailable, jobsRunning, jobsFailedRecent },
 *   }
 *
 * Each section degrades independently on leaf failure. Sections that
 * need cross-branch grouping do their own aggregation in memory —
 * we don't trust the leaf services to know about org rollups.
 *
 * No writes. Never throws. Designed for safe consumption from an
 * executive dashboard on a 60s+ poll cadence.
 */

const reg = require('./hikvision.registry');

function createHikvisionOrgSummaryService({
  deviceService = null,
  streamSupervisor = null,
  attendanceSourceService = null,
  reconciliationService = null,
  fraudScoreService = null,
  syncWorker = null,
  schedulerService = null,
  branchConfigService = null,
  branchModel = null, // optional — when present, lets us compute coverage %
  libraryModel = null,
  cacheTtlMs = 60_000,
  logger = console,
  now = () => new Date(),
} = {}) {
  let cache = null; // { value, expiresAt }

  function _cacheGet() {
    if (!cache) return null;
    if (now().getTime() > cache.expiresAt) {
      cache = null;
      return null;
    }
    return cache.value;
  }

  function _cacheSet(value) {
    cache = { value, expiresAt: now().getTime() + cacheTtlMs };
  }

  function _clearCache() {
    cache = null;
  }

  async function _safe(section, fn) {
    try {
      const r = await fn();
      return r || { ok: false, reason: 'empty-result', section };
    } catch (err) {
      logger.warn(`[org-summary] ${section} failed: ${err.message}`);
      return { ok: false, reason: 'leaf-error', section, message: err.message };
    }
  }

  // ─── Section builders ────────────────────────────────────────

  async function _devices() {
    if (!deviceService || typeof deviceService.listDevices !== 'function') {
      return { ok: false, reason: 'service-unavailable' };
    }
    const result = await deviceService.listDevices({ limit: 500 });
    if (!result || !result.ok) {
      return { ok: false, reason: (result && result.reason) || 'list-failed' };
    }
    const all = result.items || [];
    const byKind = {};
    const byStatus = {};
    const byBranchMap = new Map();
    let retired = 0;
    for (const d of all) {
      if (d.retiredAt) retired += 1;
      const kind = d.kind || 'unknown';
      byKind[kind] = (byKind[kind] || 0) + 1;
      const status = d.status || d.onlineStatus || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
      const b = String(d.branchId || 'unknown');
      const slot = byBranchMap.get(b) || { branchId: b, count: 0, retired: 0 };
      slot.count += 1;
      if (d.retiredAt) slot.retired += 1;
      byBranchMap.set(b, slot);
    }
    const byBranch = Array.from(byBranchMap.values()).sort((a, b) => b.count - a.count);
    return {
      ok: true,
      total: all.length,
      retired,
      active: all.length - retired,
      byKind,
      byStatus,
      byBranch,
    };
  }

  async function _stream() {
    if (!streamSupervisor || typeof streamSupervisor.getStatus !== 'function') {
      return { ok: false, reason: 'service-unavailable' };
    }
    const status = streamSupervisor.getStatus();
    const items = status.items || [];
    const byState = {};
    const topReconnecting = [];
    for (const it of items) {
      byState[it.state] = (byState[it.state] || 0) + 1;
      if (
        it.state === reg.STREAM_STATE.RECONNECTING ||
        it.state === reg.STREAM_STATE.CIRCUIT_OPEN
      ) {
        topReconnecting.push({
          deviceCode: it.deviceCode,
          state: it.state,
          lastReason: it.lastReason || null,
          parseErrors: it.parseErrors || 0,
        });
      }
    }
    topReconnecting.sort((a, b) => (b.parseErrors || 0) - (a.parseErrors || 0));
    return {
      ok: true,
      running: status.running,
      totalDevices: status.totalDevices || items.length,
      byState,
      topReconnecting: topReconnecting.slice(0, 10),
      metrics: status.metrics || null,
    };
  }

  async function _reviews() {
    if (!attendanceSourceService || typeof attendanceSourceService.listReviews !== 'function') {
      return { ok: false, reason: 'service-unavailable' };
    }
    const r = await attendanceSourceService.listReviews({ state: 'open', limit: 500 });
    if (!r || !r.ok) {
      return { ok: false, reason: (r && r.reason) || 'list-failed' };
    }
    const items = r.items || [];
    const byQueue = {};
    let oldest = null;
    for (const rv of items) {
      const q = rv.queue || 'unknown';
      byQueue[q] = (byQueue[q] || 0) + 1;
      const openedAt = rv.openedAt ? new Date(rv.openedAt) : null;
      if (openedAt && (!oldest || openedAt < oldest)) oldest = openedAt;
    }
    return {
      ok: true,
      totalOpen: r.total != null ? r.total : items.length,
      sampled: items.length,
      byQueue,
      oldestOpenAt: oldest ? oldest.toISOString() : null,
    };
  }

  async function _reconciliation() {
    if (!reconciliationService || typeof reconciliationService.listCases !== 'function') {
      return { ok: false, reason: 'service-unavailable' };
    }
    const r = await reconciliationService.listCases({ limit: 500 });
    if (!r || !r.ok) {
      return { ok: false, reason: (r && r.reason) || 'list-failed' };
    }
    const items = r.items || [];
    const byStatus = {};
    let oldest = null;
    let totalOpen = 0;
    for (const c of items) {
      const s = c.status || 'unknown';
      byStatus[s] = (byStatus[s] || 0) + 1;
      if (s === 'open' || s === 'in-progress') totalOpen += 1;
      const openedAt = c.openedAt || c.createdAt;
      const dt = openedAt ? new Date(openedAt) : null;
      if (dt && (!oldest || dt < oldest)) oldest = dt;
    }
    return {
      ok: true,
      totalOpen,
      sampled: items.length,
      byStatus,
      oldestOpenAt: oldest ? oldest.toISOString() : null,
    };
  }

  async function _fraud() {
    if (!fraudScoreService || typeof fraudScoreService.listScores !== 'function') {
      return { ok: false, reason: 'service-unavailable' };
    }
    const r = await fraudScoreService.listScores({ limit: 500 });
    if (!r || !r.ok) {
      return { ok: false, reason: (r && r.reason) || 'list-failed' };
    }
    const items = r.items || [];
    const byBand = {};
    for (const b of reg.FRAUD_SEVERITIES) byBand[b] = 0;
    const branchAcc = new Map(); // branchId → {sum,count,max}
    for (const s of items) {
      const b = reg.FRAUD_SEVERITIES.includes(s.band) ? s.band : reg.FRAUD_SEVERITY.LOW;
      byBand[b] += 1;
      const br = String(s.primaryBranchId || 'unknown');
      const slot = branchAcc.get(br) || { branchId: br, sum: 0, count: 0, max: 0 };
      slot.sum += s.currentScore || 0;
      slot.count += 1;
      if ((s.currentScore || 0) > slot.max) slot.max = s.currentScore || 0;
      branchAcc.set(br, slot);
    }
    const topBranches = Array.from(branchAcc.values())
      .map(b => ({
        branchId: b.branchId,
        employees: b.count,
        avgScore: Number((b.sum / Math.max(1, b.count)).toFixed(2)),
        maxScore: b.max,
      }))
      .sort((a, b) => b.maxScore - a.maxScore)
      .slice(0, 10);
    const topEmployees = items
      .slice()
      .sort((a, b) => (b.currentScore || 0) - (a.currentScore || 0))
      .slice(0, 10)
      .map(s => ({
        employeeId: String(s.employeeId),
        branchId: String(s.primaryBranchId || ''),
        currentScore: s.currentScore || 0,
        band: s.band || reg.FRAUD_SEVERITY.LOW,
      }));
    return {
      ok: true,
      totalEmployees: r.total != null ? r.total : items.length,
      sampled: items.length,
      byBand,
      topBranches,
      topEmployees,
    };
  }

  async function _sync() {
    if (!syncWorker || typeof syncWorker.detectDriftAll !== 'function') {
      return { ok: false, reason: 'service-unavailable' };
    }
    const r = await syncWorker.detectDriftAll();
    if (!r || !r.ok) {
      return { ok: false, reason: (r && r.reason) || 'drift-failed' };
    }
    const results = r.results || [];
    // Group libraries by branch — needs the libraryModel lookup.
    const byBranchMap = new Map();
    if (libraryModel) {
      let q = libraryModel.find({}, { branchId: 1 });
      if (typeof q.lean === 'function') q = q.lean();
      const libs = (await q) || [];
      const libToBranch = new Map(libs.map(l => [String(l._id), String(l.branchId)]));
      for (const res of results) {
        const br = libToBranch.get(String(res.libraryId)) || 'unknown';
        const slot = byBranchMap.get(br) || { branchId: br, scanned: 0, withDrift: 0 };
        slot.scanned += 1;
        if (res.hasDrift) slot.withDrift += 1;
        byBranchMap.set(br, slot);
      }
    }
    return {
      ok: true,
      librariesScanned: results.length,
      withDrift: results.filter(x => x.hasDrift).length,
      byBranch: Array.from(byBranchMap.values()).sort((a, b) => b.withDrift - a.withDrift),
    };
  }

  async function _branchConfig() {
    if (!branchConfigService || typeof branchConfigService.list !== 'function') {
      return { ok: false, reason: 'service-unavailable' };
    }
    const r = await branchConfigService.list({ limit: 500 });
    if (!r || !r.ok) {
      return { ok: false, reason: (r && r.reason) || 'list-failed' };
    }
    let allBranchCount = null;
    if (branchModel && typeof branchModel.countDocuments === 'function') {
      try {
        allBranchCount = await branchModel.countDocuments({});
      } catch (err) {
        void err;
      }
    }
    const overrides = r.total != null ? r.total : (r.items || []).length;
    return {
      ok: true,
      branchesWithOverrides: overrides,
      allBranchCount,
      overrideCoveragePct:
        allBranchCount && allBranchCount > 0
          ? Number(((overrides / allBranchCount) * 100).toFixed(1))
          : null,
    };
  }

  async function _scheduler() {
    if (!schedulerService || typeof schedulerService.listJobs !== 'function') {
      return { ok: false, reason: 'service-unavailable' };
    }
    const r = await schedulerService.listJobs();
    const items = (r && r.items) || [];
    let available = 0;
    let runningNow = 0;
    let failedRecent = 0;
    for (const j of items) {
      if (j.available) available += 1;
      if (j.latest && j.latest.status === reg.JOB_STATUS.RUNNING) runningNow += 1;
      if (j.latest && j.latest.status === reg.JOB_STATUS.FAILED) failedRecent += 1;
    }
    return {
      ok: true,
      jobsTotal: items.length,
      jobsAvailable: available,
      jobsRunning: runningNow,
      jobsFailedRecent: failedRecent,
      items: items.map(j => ({
        id: j.id,
        labelAr: j.labelAr,
        available: j.available,
        latest: j.latest || null,
      })),
    };
  }

  // ─── Public ──────────────────────────────────────────────────

  async function snapshot({ skipCache = false } = {}) {
    if (!skipCache) {
      const hit = _cacheGet();
      if (hit) return hit;
    }
    const [devices, stream, reviews, reconciliation, fraud, sync, branchConfig, scheduler] =
      await Promise.all([
        _safe('devices', _devices),
        _safe('stream', _stream),
        _safe('reviews', _reviews),
        _safe('reconciliation', _reconciliation),
        _safe('fraud', _fraud),
        _safe('sync', _sync),
        _safe('branchConfig', _branchConfig),
        _safe('scheduler', _scheduler),
      ]);
    const value = {
      ok: true,
      generatedAt: now().toISOString(),
      devices,
      stream,
      reviews,
      reconciliation,
      fraud,
      sync,
      branchConfig,
      scheduler,
    };
    _cacheSet(value);
    return value;
  }

  return { snapshot, _clearCache };
}

module.exports = { createHikvisionOrgSummaryService };

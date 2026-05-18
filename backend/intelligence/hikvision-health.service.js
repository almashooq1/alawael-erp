'use strict';

/**
 * hikvision-health.service.js — Wave 96 Phase 1.
 *
 * Computes per-device health and emits time-series rows. Two write
 * paths feed this service:
 *
 *   1. **Reactive** — every successful ingest pings recordHeartbeat
 *      with the device's `capturedAt` so we can recompute drift and
 *      keep `lastHeartbeatAt` fresh without a separate probe.
 *
 *   2. **Proactive** — a cron host calls sweepStaleDevices() every
 *      minute. Devices whose lastHeartbeatAt is older than the
 *      configured offline threshold get demoted to OFFLINE and a
 *      critical alert row is written.
 *
 * Public API:
 *   recordHeartbeat({ deviceId, capturedAt, networkLatencyMs?,
 *                     storagePct?, eventLagMs? }) → { ok, log, device }
 *
 *   recordProbe({ deviceId, onlineStatus, ... }) → { ok, log }
 *
 *   getLatest(deviceId, limit=1)  → { ok, items }
 *
 *   sweepStaleDevices({ now?, limit? }) → { ok, demoted, scanned }
 *
 *   getBranchSummary(branchId)    → { ok, branchId, byStatus, totals }
 */

const reg = require('./hikvision.registry');

function createHikvisionHealthService({
  deviceModel = null,
  healthLogModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!deviceModel) {
    throw new Error('hikvision-health.service: deviceModel is required');
  }
  if (!healthLogModel) {
    throw new Error('hikvision-health.service: healthLogModel is required');
  }

  async function recordHeartbeat(input = {}) {
    const { deviceId, capturedAt, networkLatencyMs, storagePct, eventLagMs } = input;
    if (!deviceId) {
      return { ok: false, reason: reg.REASON.HEALTH_DEVICE_REQUIRED };
    }
    const device = await deviceModel.findById(deviceId);
    if (!device) {
      return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };
    }

    const nowDate = now();
    const cap = capturedAt instanceof Date ? capturedAt : capturedAt ? new Date(capturedAt) : null;
    const timeOffsetMs = cap ? cap.getTime() - nowDate.getTime() : null;

    device.lastHeartbeatAt = nowDate;
    if (Number.isFinite(timeOffsetMs)) device.timeOffsetMs = timeOffsetMs;
    if (device.retiredAt) {
      // Retired devices should not flip back to online from a stray
      // heartbeat — keep status sticky.
      // status untouched
    } else {
      device.status = reg.classifyHealth({
        lastHeartbeatAt: nowDate,
        timeOffsetMs,
        now: nowDate.getTime(),
      });
    }
    try {
      await device.save();
    } catch (err) {
      logger.warn('[Hikvision health] device save failed (non-fatal):', err.message);
    }

    const alerts = [];
    if (
      Number.isFinite(timeOffsetMs) &&
      Math.abs(timeOffsetMs) > reg.DEFAULT_CONFIDENCE_THRESHOLDS.TIME_DRIFT_MAX_MS
    ) {
      alerts.push({
        kind: 'time-drift',
        severity: 'warning',
        message: `device clock differs from server by ${Math.round(timeOffsetMs)}ms`,
      });
    }
    if (Number.isFinite(storagePct) && storagePct > 90) {
      alerts.push({
        kind: 'storage-high',
        severity: storagePct > 95 ? 'critical' : 'warning',
        message: `device storage at ${Math.round(storagePct)}%`,
      });
    }

    const log = await _writeLog({
      deviceId: device._id,
      branchId: device.branchId,
      onlineStatus: device.status,
      timeOffsetMs,
      eventLagMs: Number.isFinite(eventLagMs) ? eventLagMs : null,
      networkLatencyMs: Number.isFinite(networkLatencyMs) ? networkLatencyMs : null,
      storagePct: Number.isFinite(storagePct) ? storagePct : null,
      alerts,
      meta: { trigger: 'heartbeat' },
    });
    return { ok: true, log, device: device.toObject ? device.toObject() : device };
  }

  async function recordProbe(input = {}) {
    const {
      deviceId,
      onlineStatus,
      timeOffsetMs,
      eventLagMs,
      networkLatencyMs,
      storagePct,
      alerts,
      meta,
    } = input;
    if (!deviceId) {
      return { ok: false, reason: reg.REASON.HEALTH_DEVICE_REQUIRED };
    }
    if (!reg.DEVICE_STATUSES.includes(onlineStatus)) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { onlineStatus: 'invalid' },
      };
    }
    const device = await deviceModel.findById(deviceId).lean();
    if (!device) return { ok: false, reason: reg.REASON.DEVICE_NOT_FOUND };

    const log = await _writeLog({
      deviceId,
      branchId: device.branchId,
      onlineStatus,
      timeOffsetMs: Number.isFinite(timeOffsetMs) ? timeOffsetMs : null,
      eventLagMs: Number.isFinite(eventLagMs) ? eventLagMs : null,
      networkLatencyMs: Number.isFinite(networkLatencyMs) ? networkLatencyMs : null,
      storagePct: Number.isFinite(storagePct) ? storagePct : null,
      alerts: Array.isArray(alerts) ? alerts : [],
      meta: meta || { trigger: 'probe' },
    });
    return { ok: true, log };
  }

  async function getLatest(deviceId, limit = 1) {
    if (!deviceId) {
      return { ok: false, reason: reg.REASON.HEALTH_DEVICE_REQUIRED };
    }
    const lim = Math.min(Math.max(Number(limit) || 1, 1), 100);
    let cursor = healthLogModel.find({ deviceId }).sort({ ts: -1 }).limit(lim);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    return { ok: true, items };
  }

  async function sweepStaleDevices({ now: nowArg, limit } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 500, 1), 5000);
    const nowDate = nowArg || now();
    const cutoffStale = new Date(
      nowDate.getTime() - reg.DEFAULT_CONFIDENCE_THRESHOLDS.HEARTBEAT_STALE_MS
    );
    const cutoffOffline = new Date(
      nowDate.getTime() - reg.DEFAULT_CONFIDENCE_THRESHOLDS.HEARTBEAT_OFFLINE_MS
    );

    // Candidates: any non-retired device whose lastHeartbeatAt is
    // older than `cutoffStale`, OR which has never reported.
    const q = {
      retiredAt: null,
      $or: [{ lastHeartbeatAt: null }, { lastHeartbeatAt: { $lt: cutoffStale } }],
    };
    let cursor = deviceModel.find(q).limit(lim);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const candidates = await cursor;

    let demoted = 0;
    const demotedIds = [];
    for (const dev of candidates) {
      const newStatus = reg.classifyHealth({
        lastHeartbeatAt: dev.lastHeartbeatAt,
        timeOffsetMs: dev.timeOffsetMs,
        now: nowDate.getTime(),
      });
      if (newStatus !== dev.status) {
        await deviceModel.updateOne({ _id: dev._id }, { $set: { status: newStatus } });
        demoted += 1;
        demotedIds.push(String(dev._id));

        const severity =
          newStatus === reg.DEVICE_STATUS.OFFLINE
            ? 'critical'
            : newStatus === reg.DEVICE_STATUS.DEGRADED
              ? 'warning'
              : 'info';
        await _writeLog({
          deviceId: dev._id,
          branchId: dev.branchId,
          onlineStatus: newStatus,
          timeOffsetMs: dev.timeOffsetMs,
          eventLagMs: null,
          networkLatencyMs: null,
          storagePct: null,
          alerts: [
            {
              kind: dev.lastHeartbeatAt
                ? newStatus === reg.DEVICE_STATUS.OFFLINE
                  ? 'heartbeat-offline'
                  : 'heartbeat-stale'
                : 'never-reported',
              severity,
              message: dev.lastHeartbeatAt
                ? `no heartbeat since ${dev.lastHeartbeatAt.toISOString?.() || dev.lastHeartbeatAt}`
                : 'device has never reported a heartbeat',
            },
          ],
          meta: { trigger: 'sweep', cutoffOffline: cutoffOffline.toISOString() },
        });
      }
    }
    return { ok: true, scanned: candidates.length, demoted, demotedIds };
  }

  async function getBranchSummary(branchId) {
    if (!branchId) {
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors: { branchId: 'required' } };
    }
    let cursor = deviceModel.find({ branchId, retiredAt: null });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const devices = await cursor;

    const byStatus = {};
    for (const s of reg.DEVICE_STATUSES) byStatus[s] = 0;
    for (const d of devices) {
      const s = reg.DEVICE_STATUSES.includes(d.status) ? d.status : reg.DEVICE_STATUS.OFFLINE;
      byStatus[s] += 1;
    }
    const totals = {
      total: devices.length,
      onlineCount: byStatus[reg.DEVICE_STATUS.ONLINE] || 0,
      degradedCount: byStatus[reg.DEVICE_STATUS.DEGRADED] || 0,
      offlineCount: byStatus[reg.DEVICE_STATUS.OFFLINE] || 0,
    };
    totals.uptimeRatio =
      totals.total === 0 ? 0 : Number((totals.onlineCount / totals.total).toFixed(4));
    return { ok: true, branchId, byStatus, totals };
  }

  // ─── Internal ───────────────────────────────────────────────

  async function _writeLog(row) {
    const doc = new healthLogModel({ ts: now(), ...row });
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Hikvision health] log save failed:', err.message);
      throw err;
    }
    return doc.toObject ? doc.toObject() : doc;
  }

  return {
    recordHeartbeat,
    recordProbe,
    getLatest,
    sweepStaleDevices,
    getBranchSummary,
  };
}

module.exports = { createHikvisionHealthService };

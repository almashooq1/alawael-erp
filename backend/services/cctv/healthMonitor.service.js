/**
 * healthMonitor — periodic probes for cameras + NVRs.
 *
 * Strategy: every N seconds, sample a slice of devices (round-robin) and
 * write a CctvHealthCheck row. On state change (online↔offline) emit an
 * event and update the device document.
 *
 * The scheduler lives in cctv.registry.js; this file only exposes the worker.
 */
'use strict';

const { CctvCamera, CctvNvr, CctvHealthCheck } = require('../../models/cctv');
const adapter = require('./adapter');
const eventService = require('./eventService');

let eventBus = null;
try {
  eventBus = require('../quality/qualityEventBus.service');
} catch (_) {}

function probeSize() {
  return parseInt(process.env.CCTV_PROBE_BATCH, 10) || 20;
}
function failThreshold() {
  return parseInt(process.env.CCTV_FAIL_THRESHOLD, 10) || 3;
}

let cursor = 0;

async function probeOne(target, kind) {
  const start = Date.now();
  const password = process.env[target.auth?.passwordRef || ''] || '';
  const r = await adapter.ping({
    ip: target.ip,
    port: target.port,
    username: target.auth?.username,
    password,
  });
  const reachable = r.ok && r.data?.reachable;
  const issues = [];
  if (!reachable)
    issues.push({ code: 'unreachable', message: r.message || 'no response', severity: 'high' });
  const doc = {
    targetKind: kind,
    targetId: target._id,
    branchCode: target.branchCode,
    reachable,
    httpStatus: r.data?.status,
    latencyMs: r.data?.latencyMs || Date.now() - start,
    issues,
  };
  await CctvHealthCheck.create(doc);

  const Model = kind === 'camera' ? CctvCamera : CctvNvr;
  if (reachable) {
    if (target.status !== 'online') {
      await Model.findByIdAndUpdate(target._id, {
        status: 'online',
        lastSeenAt: new Date(),
        consecutiveFailures: 0,
      });
      if (kind === 'camera') {
        await eventService.ingestFromAI({
          cameraId: target._id,
          type: 'camera_online',
          severity: 'info',
          startedAt: new Date(),
        });
      }
      if (eventBus?.emit)
        eventBus.emit('cctv.device.online', {
          kind,
          id: target._id,
          branchCode: target.branchCode,
        });
    }
  } else {
    const failures = (target.consecutiveFailures || 0) + 1;
    const next = failures >= failThreshold() ? 'offline' : 'degraded';
    await Model.findByIdAndUpdate(target._id, {
      status: next,
      consecutiveFailures: failures,
    });
    if (next === 'offline' && target.status !== 'offline') {
      if (kind === 'camera') {
        await eventService.ingestFromAI({
          cameraId: target._id,
          type: 'camera_offline',
          severity: 'high',
          startedAt: new Date(),
        });
      }
      if (eventBus?.emit)
        eventBus.emit('cctv.device.offline', {
          kind,
          id: target._id,
          branchCode: target.branchCode,
        });
    }
  }
  return doc;
}

async function tick() {
  const batch = probeSize();
  const cameras = await CctvCamera.find({ isDeleted: { $ne: true }, status: { $ne: 'retired' } })
    .sort({ _id: 1 })
    .skip(cursor)
    .limit(batch)
    .lean();
  if (cameras.length === 0) {
    cursor = 0;
  } else {
    cursor += cameras.length;
  }
  const results = [];
  for (const cam of cameras) {
    try {
      results.push(await probeOne(cam, 'camera'));
    } catch (err) {
      results.push({ error: err.message, cameraId: cam._id });
    }
  }
  return { ok: true, data: { probed: results.length, cursor, batch } };
}

async function tickNvrs() {
  const nvrs = await CctvNvr.find({ isDeleted: { $ne: true }, status: { $ne: 'retired' } }).lean();
  const results = [];
  for (const n of nvrs) {
    try {
      results.push(await probeOne(n, 'nvr'));
    } catch (err) {
      results.push({ error: err.message, nvrId: n._id });
    }
  }
  return { ok: true, data: { probed: results.length } };
}

async function summary(branchCode) {
  const match = branchCode ? { branchCode: String(branchCode).toUpperCase() } : {};
  const recent = await CctvHealthCheck.aggregate([
    { $match: { ...match, checkedAt: { $gte: new Date(Date.now() - 15 * 60_000) } } },
    {
      $group: {
        _id: { kind: '$targetKind', reachable: '$reachable' },
        n: { $sum: 1 },
        avgLatency: { $avg: '$latencyMs' },
      },
    },
  ]);
  return recent;
}

module.exports = {
  tick,
  tickNvrs,
  probeOne,
  summary,
  probeSize,
  failThreshold,
  get PROBE_SIZE() {
    return probeSize();
  },
  get FAIL_THRESHOLD() {
    return failThreshold();
  },
};

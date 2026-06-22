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
  eventBus = require('../quality/qualityEventBus.service').getDefault();
} catch (_) {}

function probeSize() {
  return parseInt(process.env.CCTV_PROBE_BATCH, 10) || 20;
}
function failThreshold() {
  return parseInt(process.env.CCTV_FAIL_THRESHOLD, 10) || 3;
}
function probeConcurrency() {
  return parseInt(process.env.CCTV_PROBE_CONCURRENCY, 10) || 16;
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

// Per-branch cursor map so a sluggish branch can't starve other branches.
const branchCursors = new Map();

async function _probeBranchSlice(branchCode, batchPerBranch) {
  const skip = branchCursors.get(branchCode) || 0;
  const cams = await CctvCamera.find({
    branchCode,
    isDeleted: { $ne: true },
    status: { $ne: 'retired' },
  })
    .sort({ _id: 1 })
    .skip(skip)
    .limit(batchPerBranch)
    .lean();
  if (cams.length === 0) {
    branchCursors.set(branchCode, 0);
  } else {
    branchCursors.set(branchCode, skip + cams.length);
  }
  return cams;
}

async function tick() {
  const batch = probeSize();
  const branches = await CctvCamera.distinct('branchCode', {
    isDeleted: { $ne: true },
    status: { $ne: 'retired' },
  });
  let cameras = [];
  if (branches.length === 0) {
    // fallback to legacy round-robin if no branches discovered
    cameras = await CctvCamera.find({ isDeleted: { $ne: true }, status: { $ne: 'retired' } })
      .sort({ _id: 1 })
      .skip(cursor)
      .limit(batch)
      .lean();
    if (cameras.length === 0) cursor = 0;
    else cursor += cameras.length;
  } else {
    // Fair share: each branch gets ceil(batch / branchCount) per tick
    const perBranch = Math.max(1, Math.ceil(batch / branches.length));
    const slices = await Promise.all(branches.map(b => _probeBranchSlice(b, perBranch)));
    cameras = slices.flat();
  }
  if (cameras.length === 0) return { ok: true, data: { probed: 0, branches: branches.length } };

  // Parallel probing with concurrency cap so 1000 cameras don't open
  // 1000 sockets simultaneously.
  const conc = probeConcurrency();
  const results = [];
  let i = 0;
  async function worker() {
    while (i < cameras.length) {
      const idx = i++;
      const cam = cameras[idx];
      try {
        results.push(await probeOne(cam, 'camera'));
      } catch (err) {
        results.push({ error: err.message, cameraId: cam._id });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(conc, cameras.length) }, () => worker()));
  return {
    ok: true,
    data: { probed: results.length, branches: branches.length, concurrency: conc, batch },
  };
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
  probeConcurrency,
  branchCursors,
  get PROBE_SIZE() {
    return probeSize();
  },
  get FAIL_THRESHOLD() {
    return failThreshold();
  },
  get PROBE_CONCURRENCY() {
    return probeConcurrency();
  },
};

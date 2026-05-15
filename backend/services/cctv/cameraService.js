/**
 * cameraService — CRUD + lifecycle for CctvCamera.
 *
 * Provisions cameras, syncs metadata from the device (model, serial,
 * firmware) when possible, and exposes filtered listings respecting branch
 * scope so the RBAC layer can pass through cleanly.
 */
'use strict';

const { CctvCamera } = require('../../models/cctv');
const adapter = require('./adapter');

async function create(payload) {
  const camera = await CctvCamera.create(payload);
  trySyncMetadata(camera).catch(() => {});
  return camera;
}

async function update(id, patch) {
  return CctvCamera.findByIdAndUpdate(id, patch, { new: true });
}

async function softDelete(id, __by) {
  return CctvCamera.findByIdAndUpdate(
    id,
    { isDeleted: true, status: 'retired', $set: { 'auth.passwordRef': null } },
    { new: true }
  );
}

async function getById(id) {
  return CctvCamera.findById(id);
}

async function listForBranch(branchCode, opts = {}) {
  const q = { branchCode: String(branchCode).toUpperCase(), isDeleted: { $ne: true } };
  if (opts.status) q.status = opts.status;
  if (opts.purpose) q.purpose = opts.purpose;
  if (opts.capability) q[`capabilities.${opts.capability}`] = true;
  return CctvCamera.find(q)
    .limit(opts.limit || 500)
    .lean();
}

async function listForBranches(branchCodes, opts = {}) {
  if (!Array.isArray(branchCodes) || branchCodes.length === 0) return [];
  const codes = branchCodes.map(c => String(c).toUpperCase());
  return CctvCamera.find({
    branchCode: { $in: codes },
    isDeleted: { $ne: true },
    ...(opts.status ? { status: opts.status } : {}),
  })
    .limit(opts.limit || 2000)
    .lean();
}

async function listAll(opts = {}) {
  const q = { isDeleted: { $ne: true } };
  if (opts.status) q.status = opts.status;
  return CctvCamera.find(q)
    .limit(opts.limit || 5000)
    .lean();
}

async function trySyncMetadata(camera) {
  if (!camera?.ip) return { ok: false, code: 'NO_IP' };
  const info = await adapter.getDeviceInfo({
    ip: camera.ip,
    port: camera.port,
    username: camera.auth?.username,
    password: process.env[camera.auth?.passwordRef || ''] || '',
  });
  if (!info.ok) return info;
  const patch = {
    model: camera.model || info.data.model,
    firmware: info.data.firmwareVersion,
    serialNumber: camera.serialNumber || info.data.serialNumber,
    macAddress: camera.macAddress || info.data.macAddress,
  };
  await CctvCamera.findByIdAndUpdate(camera._id, patch);
  return { ok: true, data: patch };
}

async function countByStatus(branchCode) {
  const match = branchCode ? { branchCode: String(branchCode).toUpperCase() } : {};
  const rows = await CctvCamera.aggregate([
    { $match: { ...match, isDeleted: { $ne: true } } },
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  const out = { online: 0, offline: 0, degraded: 0, provisioned: 0, retired: 0 };
  for (const r of rows) out[r._id] = r.n;
  out.total = Object.values(out).reduce((a, b) => a + b, 0);
  return out;
}

async function countByBranch() {
  const rows = await CctvCamera.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$branchCode',
        total: { $sum: 1 },
        online: { $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] } },
        offline: { $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map(r => ({
    branchCode: r._id,
    total: r.total,
    online: r.online,
    offline: r.offline,
  }));
}

async function setStatus(cameraId, status, extras = {}) {
  return CctvCamera.findByIdAndUpdate(
    cameraId,
    { status, lastSeenAt: new Date(), ...extras },
    { new: true }
  );
}

async function findByCode(code) {
  if (!code) return null;
  return CctvCamera.findOne({ code: String(code).toUpperCase(), isDeleted: { $ne: true } });
}

module.exports = {
  create,
  update,
  softDelete,
  getById,
  listForBranch,
  listForBranches,
  listAll,
  trySyncMetadata,
  countByStatus,
  countByBranch,
  setStatus,
  findByCode,
};

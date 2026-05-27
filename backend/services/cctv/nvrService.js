/**
 * nvrService — CRUD + channel discovery for CctvNvr.
 */
'use strict';

const { CctvNvr, CctvCamera } = require('../../models/cctv');
const adapter = require('./adapter');

async function create(payload) {
  return CctvNvr.create(payload);
}

async function update(id, patch) {
  return CctvNvr.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
}

async function getById(id) {
  return CctvNvr.findById(id);
}

async function listForBranch(branchCode) {
  return CctvNvr.find({
    branchCode: String(branchCode).toUpperCase(),
    isDeleted: { $ne: true },
  }).lean();
}

async function listAll() {
  return CctvNvr.find({ isDeleted: { $ne: true } }).lean();
}

async function discoverChannels(nvrId) {
  const nvr = await CctvNvr.findById(nvrId);
  if (!nvr) return { ok: false, code: 'NVR_NOT_FOUND' };
  const r = await adapter.listChannels({
    ip: nvr.ip,
    port: nvr.port,
    username: nvr.auth?.username,
    password: process.env[nvr.auth?.passwordRef || ''] || '',
  });
  if (!r.ok) return r;
  const existing = await CctvCamera.find({ nvrId: nvr._id }).lean();
  const existingByChannel = new Map(existing.map(c => [c.channel, c]));
  const toCreate = [];
  for (const ch of r.data) {
    if (!existingByChannel.has(ch.id)) {
      toCreate.push({
        code: `${nvr.code}-CH${String(ch.id).padStart(2, '0')}`,
        branchCode: nvr.branchCode,
        nvrId: nvr._id,
        channel: ch.id,
        name_ar: ch.name || `قناة ${ch.id}`,
        ip: nvr.ip,
        port: nvr.port,
        rtspPort: nvr.rtspPort,
        auth: nvr.auth,
        status: ch.online ? 'online' : 'offline',
      });
    }
  }
  if (toCreate.length) await CctvCamera.insertMany(toCreate, { ordered: false }).catch(() => {});
  nvr.channelsUsed = (existing.length || 0) + toCreate.length;
  await nvr.save();
  return {
    ok: true,
    data: { discovered: r.data.length, created: toCreate.length, nvrId: nvr._id },
  };
}

async function setStatus(nvrId, status, extras = {}) {
  return CctvNvr.findByIdAndUpdate(
    nvrId,
    { status, lastSeenAt: new Date(), ...extras },
    { returnDocument: 'after' }
  );
}

module.exports = { create, update, getById, listForBranch, listAll, discoverChannels, setStatus };

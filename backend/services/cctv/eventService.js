/**
 * eventService — ingest + persist + enrich CctvEvent.
 *
 * Two entry points:
 *   • ingestFromHikvision(payload) — webhook receiver / poll loop
 *   • ingestFromAI(payload)         — our own analytics layer
 *
 * Dedup by composite id (cameraCode + type + startedAt-rounded). Emits a
 * qualityEventBus event for downstream subscribers (alerts, incidents).
 */
'use strict';

const crypto = require('crypto');
const { CctvEvent, CctvCamera } = require('../../models/cctv');
const cameraService = require('./cameraService');
const eventQueue = require('./eventQueue.service');

let eventBus = null;
try {
  eventBus = require('../quality/qualityEventBus.service').getDefault();
} catch (_) {
  eventBus = null;
}

function _useQueue() {
  return (process.env.CCTV_QUEUE_DISABLE || '0') !== '1';
}

const HIKVISION_TYPE_MAP = {
  VMD: 'motion',
  videoloss: 'video_loss',
  tamperdetection: 'tampering',
  linedetection: 'line_crossing',
  fielddetection: 'intrusion',
  regionEntrance: 'region_entry',
  regionExiting: 'region_exit',
  loitering: 'loitering',
  unattendedBaggage: 'object_left',
  attendedBaggage: 'object_taken',
  facedetection: 'face_detected',
  faceCapture: 'face_detected',
  faceLib: 'face_match',
  ANPR: 'anpr_plate',
  vehicledetection: 'anpr_plate',
  crowdDensityDetection: 'crowd_density',
  peopleCounting: 'people_count',
  ppedetection: 'ppe_violation',
  falldown: 'fall_detected',
  fight: 'fight_detected',
  fireSmoke: 'fire_smoke',
  audioException: 'audio_alarm',
  diskfull: 'storage_full',
  diskerror: 'disk_failure',
  videosignalexception: 'video_blind',
};

const SEVERITY_DEFAULTS = {
  motion: 'info',
  tampering: 'medium',
  video_loss: 'high',
  video_blind: 'medium',
  line_crossing: 'medium',
  intrusion: 'high',
  region_entry: 'medium',
  region_exit: 'low',
  loitering: 'medium',
  object_left: 'high',
  object_taken: 'medium',
  face_detected: 'info',
  face_match: 'low',
  face_unknown: 'medium',
  anpr_plate: 'info',
  crowd_density: 'medium',
  people_count: 'info',
  ppe_violation: 'medium',
  fall_detected: 'critical',
  fight_detected: 'critical',
  fire_smoke: 'critical',
  audio_alarm: 'high',
  storage_full: 'high',
  disk_failure: 'critical',
  camera_offline: 'high',
  camera_online: 'info',
  tampering_alarm: 'high',
  unknown: 'low',
};

function normaliseType(t) {
  if (!t) return 'unknown';
  return (
    HIKVISION_TYPE_MAP[t] || HIKVISION_TYPE_MAP[String(t)] || String(t).toLowerCase() || 'unknown'
  );
}

function makeEventId({ cameraCode, type, startedAt }) {
  const bucket = Math.floor(new Date(startedAt).getTime() / 1000);
  return crypto
    .createHash('sha1')
    .update(`${cameraCode}|${type}|${bucket}`)
    .digest('hex')
    .slice(0, 24);
}

async function _persist(doc) {
  try {
    const saved = await CctvEvent.create(doc);
    if (eventBus?.emit) {
      eventBus.emit('cctv.event', {
        eventId: saved.eventId,
        type: saved.type,
        severity: saved.severity,
        cameraId: saved.cameraId,
        branchCode: saved.branchCode,
        startedAt: saved.startedAt,
      });
    }
    return saved;
  } catch (err) {
    if (err.code === 11000) {
      return CctvEvent.findOne({ eventId: doc.eventId });
    }
    throw err;
  }
}

async function ingestFromHikvision(payload) {
  if (!payload?.cameraCode && !payload?.cameraId) {
    return { ok: false, code: 'NO_CAMERA' };
  }
  const camera = payload.cameraId
    ? await CctvCamera.findById(payload.cameraId)
    : await cameraService.findByCode(payload.cameraCode);
  if (!camera) return { ok: false, code: 'CAMERA_NOT_FOUND' };
  const type = normaliseType(payload.type || payload.eventType);
  const startedAt = payload.startedAt
    ? new Date(payload.startedAt)
    : new Date(payload.dateTime || Date.now());
  const doc = {
    eventId: payload.eventId || makeEventId({ cameraCode: camera.code, type, startedAt }),
    cameraId: camera._id,
    cameraCode: camera.code,
    branchCode: camera.branchCode,
    type,
    severity: payload.severity || SEVERITY_DEFAULTS[type] || 'low',
    source: 'hikvision_push',
    startedAt,
    endedAt: payload.endedAt ? new Date(payload.endedAt) : undefined,
    payload: payload.raw || payload,
    geometry: payload.geometry,
    aiResult: payload.aiResult,
    snapshot: payload.snapshot,
    retainUntil: new Date(Date.now() + (camera.pdpl?.retentionDays || 30) * 86400 * 1000),
  };
  // Fast path: drop into the batched queue. Flusher does bulk insert +
  // AI fan-out async, so the webhook returns in ~µs.
  if (_useQueue()) {
    const q = eventQueue.push(doc);
    if (!q.ok) return { ok: false, code: q.code, queueDepth: q.depth };
    return { ok: true, queued: true, eventId: doc.eventId, queueDepth: q.depth };
  }
  const saved = await _persist(doc);
  return { ok: true, data: saved };
}

async function ingestFromAI(payload) {
  const camera = payload.cameraId
    ? await CctvCamera.findById(payload.cameraId)
    : await cameraService.findByCode(payload.cameraCode);
  if (!camera) return { ok: false, code: 'CAMERA_NOT_FOUND' };
  const type = payload.type || 'unknown';
  const startedAt = new Date(payload.startedAt || Date.now());
  const doc = {
    eventId: payload.eventId || makeEventId({ cameraCode: camera.code, type, startedAt }),
    cameraId: camera._id,
    cameraCode: camera.code,
    branchCode: camera.branchCode,
    type,
    severity: payload.severity || SEVERITY_DEFAULTS[type] || 'low',
    source: 'ai_analytic',
    startedAt,
    endedAt: payload.endedAt,
    aiResult: payload.aiResult,
    geometry: payload.geometry,
    snapshot: payload.snapshot,
    payload: payload.payload || {},
    retainUntil: new Date(Date.now() + (camera.pdpl?.retentionDays || 30) * 86400 * 1000),
  };
  const saved = await _persist(doc);
  return { ok: true, data: saved };
}

async function listForBranch(branchCode, opts = {}) {
  const q = { branchCode: String(branchCode).toUpperCase() };
  if (opts.type) q.type = opts.type;
  if (opts.severity) q.severity = opts.severity;
  if (opts.cameraId) q.cameraId = opts.cameraId;
  if (opts.from) q.startedAt = { ...(q.startedAt || {}), $gte: new Date(opts.from) };
  if (opts.to) q.startedAt = { ...(q.startedAt || {}), $lte: new Date(opts.to) };
  return CctvEvent.find(q)
    .sort({ startedAt: -1 })
    .limit(opts.limit || 200)
    .lean();
}

async function acknowledge(eventId, userId) {
  return CctvEvent.findOneAndUpdate(
    { eventId },
    { acknowledgedAt: new Date(), acknowledgedBy: userId },
    { returnDocument: 'after' }
  );
}

async function linkIncident(eventId, incidentId) {
  return CctvEvent.findOneAndUpdate(
    { eventId },
    { relatedIncidentId: incidentId },
    { returnDocument: 'after' }
  );
}

async function countsLastHour(branchCode) {
  const since = new Date(Date.now() - 3600 * 1000);
  const match = { startedAt: { $gte: since } };
  if (branchCode) match.branchCode = String(branchCode).toUpperCase();
  return CctvEvent.aggregate([
    { $match: match },
    { $group: { _id: { type: '$type', severity: '$severity' }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
}

module.exports = {
  ingestFromHikvision,
  ingestFromAI,
  listForBranch,
  acknowledge,
  linkIncident,
  countsLastHour,
  normaliseType,
  makeEventId,
  HIKVISION_TYPE_MAP,
  SEVERITY_DEFAULTS,
};

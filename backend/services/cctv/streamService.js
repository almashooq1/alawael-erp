/**
 * streamService — HLS / playback session management.
 *
 * Lifecycle of a live session:
 *   1. startLive() — checks grant, creates CctvStreamSession + audit entry,
 *      returns an HLS URL + ffmpeg command hint. The caller (route handler
 *      or edge gateway) is responsible for launching ffmpeg; we just track.
 *   2. heartbeat() — viewer pings every 10s; we update lastHeartbeatAt.
 *   3. stop() — explicit close, or the janitor reaps idle sessions.
 *
 * Playback works the same but with `streamType='playback'` and a time range.
 */
'use strict';

const crypto = require('crypto');
const {
  CctvCamera,
  CctvStreamSession,
  CctvAccessGrant,
  CctvViewAudit,
} = require('../../models/cctv');
const adapter = require('./adapter');

function hlsBase() {
  return process.env.CCTV_HLS_BASE || '/cctv/hls';
}
function idleTimeoutMs() {
  return parseInt(process.env.CCTV_STREAM_IDLE_MS, 10) || 30_000;
}
function maxConcurrentPerUser() {
  return parseInt(process.env.CCTV_MAX_SESSIONS_PER_USER, 10) || 6;
}

function makeSessionId() {
  return crypto.randomBytes(12).toString('hex');
}

async function _checkGrant({ userId, cameraId, action }) {
  const now = new Date();
  const grants = await CctvAccessGrant.find({
    grantedTo: userId,
    status: 'active',
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    $or: [
      { 'scope.cameraIds': cameraId },
      { 'scope.cameraIds': { $size: 0 } },
      { 'scope.cameraIds': null },
    ],
  });
  for (const g of grants) {
    if (action === 'playback' && !g.allowPlayback) continue;
    if (action === 'download' && !g.allowDownload) continue;
    if (g.isCurrentlyValid && g.isCurrentlyValid(now)) return g;
  }
  return null;
}

async function startLive({ userId, cameraId, ipMeta, watermarkText, requireGrant = true }) {
  const camera = await CctvCamera.findById(cameraId);
  if (!camera) return { ok: false, code: 'CAMERA_NOT_FOUND' };
  if (camera.status === 'retired') return { ok: false, code: 'CAMERA_RETIRED' };

  let grant = null;
  if (requireGrant) {
    grant = await _checkGrant({ userId, cameraId, action: 'live' });
    if (!grant && camera.pdpl?.parentConsentRequired) {
      await CctvViewAudit.create({
        userId,
        branchCode: camera.branchCode,
        cameraId,
        cameraCode: camera.code,
        action: 'access_denied',
        success: false,
        failureReason: 'no active grant',
        sourceIp: ipMeta?.ip,
        userAgent: ipMeta?.userAgent,
      });
      return { ok: false, code: 'NO_ACTIVE_GRANT' };
    }
  }

  const maxConcurrent = maxConcurrentPerUser();
  const active = await CctvStreamSession.countDocuments({
    userId,
    status: { $in: ['starting', 'active'] },
  });
  if (active >= maxConcurrent) {
    return {
      ok: false,
      code: 'TOO_MANY_SESSIONS',
      message: `max ${maxConcurrent} concurrent sessions`,
    };
  }

  const sessionId = makeSessionId();
  const rtspResult = adapter.getStreamUrl
    ? await adapter.getStreamUrl({
        ip: camera.ip,
        port: camera.port,
        rtspPort: camera.rtspPort,
        channel: camera.channel,
        stream: 'main',
        username: camera.auth?.username,
        password: process.env[camera.auth?.passwordRef || ''] || '',
      })
    : { ok: false };
  const rtspUrl = rtspResult.ok ? rtspResult.data.url : null;
  const hlsUrl = `${hlsBase()}/${sessionId}/index.m3u8`;
  const ffmpegHint = rtspUrl
    ? `ffmpeg -rtsp_transport tcp -i "${rtspUrl}" -c:v copy -c:a aac -f hls -hls_time 2 ` +
      `-hls_list_size 5 -hls_flags delete_segments+omit_endlist /tmp/hls/${sessionId}/index.m3u8`
    : null;

  const session = await CctvStreamSession.create({
    sessionId,
    userId,
    cameraId,
    branchCode: camera.branchCode,
    grantId: grant?._id,
    streamType: 'live',
    protocol: 'hls',
    streamUrl: hlsUrl,
    watermark: { enabled: camera.pdpl?.watermarkRequired !== false, text: watermarkText },
    status: 'starting',
    sourceIp: ipMeta?.ip,
    userAgent: ipMeta?.userAgent,
  });

  if (camera.pdpl?.auditAllViews !== false) {
    await CctvViewAudit.create({
      userId,
      branchCode: camera.branchCode,
      cameraId,
      cameraCode: camera.code,
      action: 'live_start',
      sessionId,
      consentRef: grant?._id,
      purpose: grant?.purpose,
      sourceIp: ipMeta?.ip,
      userAgent: ipMeta?.userAgent,
    });
  }

  return {
    ok: true,
    data: {
      sessionId,
      hlsUrl,
      rtspUrlRedacted: rtspUrl ? rtspUrl.replace(/:[^@]*@/, ':***@') : null,
      ffmpegHint,
      watermark: session.watermark,
      expiresAt: new Date(Date.now() + idleTimeoutMs() * 3),
    },
  };
}

async function startPlayback({ userId, cameraId, from, to, ipMeta }) {
  const camera = await CctvCamera.findById(cameraId);
  if (!camera) return { ok: false, code: 'CAMERA_NOT_FOUND' };
  const grant = await _checkGrant({ userId, cameraId, action: 'playback' });
  if (!grant && camera.pdpl?.parentConsentRequired) return { ok: false, code: 'NO_PLAYBACK_GRANT' };

  const search = await adapter.searchPlayback({
    ip: camera.ip,
    port: camera.port,
    channel: camera.channel,
    username: camera.auth?.username,
    password: process.env[camera.auth?.passwordRef || ''] || '',
    from,
    to,
  });
  if (!search.ok) return search;

  const sessionId = makeSessionId();
  await CctvStreamSession.create({
    sessionId,
    userId,
    cameraId,
    branchCode: camera.branchCode,
    grantId: grant?._id,
    streamType: 'playback',
    playbackRange: { from: new Date(from), to: new Date(to) },
    status: 'starting',
    sourceIp: ipMeta?.ip,
    userAgent: ipMeta?.userAgent,
  });

  await CctvViewAudit.create({
    userId,
    branchCode: camera.branchCode,
    cameraId,
    cameraCode: camera.code,
    action: 'playback_view',
    timeRange: { from: new Date(from), to: new Date(to) },
    consentRef: grant?._id,
    sourceIp: ipMeta?.ip,
    userAgent: ipMeta?.userAgent,
  });

  return {
    ok: true,
    data: { sessionId, segments: search.data, watermarkRequired: camera.pdpl?.watermarkRequired },
  };
}

async function heartbeat(sessionId) {
  return CctvStreamSession.findOneAndUpdate(
    { sessionId, status: { $in: ['starting', 'active', 'idle'] } },
    { lastHeartbeatAt: new Date(), status: 'active' },
    { new: true }
  );
}

async function stop(sessionId) {
  return CctvStreamSession.findOneAndUpdate(
    { sessionId, status: { $ne: 'ended' } },
    { status: 'ended', endedAt: new Date() },
    { new: true }
  );
}

async function reapIdle(now = new Date()) {
  const cutoff = new Date(now.getTime() - idleTimeoutMs());
  const result = await CctvStreamSession.updateMany(
    { status: { $in: ['starting', 'active'] }, lastHeartbeatAt: { $lt: cutoff } },
    { status: 'ended', endedAt: now }
  );
  return { ok: true, data: { reaped: result.modifiedCount } };
}

async function listActive(opts = {}) {
  const q = { status: { $in: ['starting', 'active'] } };
  if (opts.userId) q.userId = opts.userId;
  if (opts.branchCode) q.branchCode = String(opts.branchCode).toUpperCase();
  return CctvStreamSession.find(q)
    .sort({ startedAt: -1 })
    .limit(opts.limit || 200)
    .lean();
}

module.exports = {
  startLive,
  startPlayback,
  heartbeat,
  stop,
  reapIdle,
  listActive,
  _checkGrant,
  idleTimeoutMs,
  maxConcurrentPerUser,
  hlsBase,
  get IDLE_TIMEOUT_MS() {
    return idleTimeoutMs();
  },
  get MAX_CONCURRENT_PER_USER() {
    return maxConcurrentPerUser();
  },
};

/**
 * loiteringDetector — flag faces/people staying in the same zone > N seconds.
 *
 * The device reports `loitering` natively; we additionally synthesize a
 * loitering event when we see N face_detected events for the same identity
 * inside the same camera within a sliding window.
 */
'use strict';

const { CctvEvent } = require('../../../models/cctv');
const eventService = require('../eventService');

function getWindowMs() {
  return parseInt(process.env.CCTV_LOITER_WINDOW_MS, 10) || 5 * 60_000;
}
function getThreshold() {
  return parseInt(process.env.CCTV_LOITER_THRESHOLD, 10) || 6;
}

async function process(event) {
  if (!['face_detected', 'face_unknown'].includes(event.type)) return { ok: true, data: null };
  const windowMs = getWindowMs();
  const threshold = getThreshold();
  const since = new Date(new Date(event.startedAt).getTime() - windowMs);
  const count = await CctvEvent.countDocuments({
    cameraId: event.cameraId,
    type: { $in: ['face_detected', 'face_unknown'] },
    startedAt: { $gte: since },
    ...(event.aiResult?.faceIdentityId
      ? { 'aiResult.faceIdentityId': event.aiResult.faceIdentityId }
      : {}),
  });
  if (count < threshold) return { ok: true, data: { count, threshold } };
  return eventService.ingestFromAI({
    cameraId: event.cameraId,
    type: 'loitering',
    severity: 'medium',
    startedAt: event.startedAt,
    aiResult: { label: 'loitering', confidence: 0.85 },
    payload: { count, windowMs, identityId: event.aiResult?.faceIdentityId },
  });
}

module.exports = {
  process,
  getWindowMs,
  getThreshold,
  get WINDOW_MS() {
    return getWindowMs();
  },
  get THRESHOLD() {
    return getThreshold();
  },
};

/**
 * faceRecognition.service — match Hikvision face-detect events against our
 * CctvFaceIdentity registry.
 *
 * Strategy: when a face-detected event arrives with an embedding (or a
 * device-side face library hit `faceLibId`+`faceId`), find the matching
 * identity. If unknown, raise a `face_unknown` event.
 *
 * Cosine similarity is used for embedding match. Threshold tunable via env.
 */
'use strict';

const { CctvFaceIdentity } = require('../../../models/cctv');
const eventService = require('../eventService');

function matchThreshold() {
  return parseFloat(process.env.CCTV_FACE_MATCH_THRESHOLD) || 0.72;
}

function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function matchByEmbedding(embedding) {
  if (!Array.isArray(embedding) || embedding.length === 0) return null;
  const candidates = await CctvFaceIdentity.find({
    status: 'active',
    'embedding.vector.0': { $exists: true },
  }).lean();
  let best = null;
  for (const c of candidates) {
    const sim = cosine(embedding, c.embedding.vector);
    if (!best || sim > best.similarity) best = { identity: c, similarity: sim };
  }
  if (best && best.similarity >= matchThreshold()) return best;
  return null;
}

async function matchByDeviceId({ nvrId, faceLibId, faceId }) {
  if (!faceLibId || !faceId) return null;
  return CctvFaceIdentity.findOne({
    deviceSync: { $elemMatch: { nvrId, faceLibId, faceId, syncState: 'synced' } },
    status: 'active',
  }).lean();
}

async function process(event) {
  if (!event || (event.type !== 'face_detected' && event.type !== 'face_match'))
    return { ok: true, data: null };
  let identity = null;
  if (event.aiResult?.embedding) {
    const r = await matchByEmbedding(event.aiResult.embedding);
    if (r) identity = r.identity;
  }
  if (!identity && event.aiResult?.faceLibId) {
    identity = await matchByDeviceId({
      nvrId: event.payload?.nvrId,
      faceLibId: event.aiResult.faceLibId,
      faceId: event.aiResult.faceId,
    });
  }
  if (identity) {
    return eventService.ingestFromAI({
      cameraId: event.cameraId,
      type: 'face_match',
      severity: identity.triggerAlert ? 'high' : 'low',
      startedAt: event.startedAt,
      aiResult: {
        faceIdentityId: identity._id,
        label: identity.label,
        confidence: event.aiResult?.confidence || 0.8,
      },
      payload: { originalEventId: event.eventId, kind: identity.kind },
    });
  }
  return eventService.ingestFromAI({
    cameraId: event.cameraId,
    type: 'face_unknown',
    severity: 'medium',
    startedAt: event.startedAt,
    aiResult: event.aiResult,
    payload: { originalEventId: event.eventId },
  });
}

module.exports = {
  process,
  matchByEmbedding,
  matchByDeviceId,
  cosine,
  matchThreshold,
  get MATCH_THRESHOLD() {
    return matchThreshold();
  },
};

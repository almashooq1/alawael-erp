/**
 * CCTV webhook receiver — Hikvision NVR / camera event push.
 *
 * Hikvision sends events as XML or multipart POSTs to a configured URL.
 * We accept any content and feed the parsed payload into eventService +
 * AI dispatcher. Authentication is HMAC over the raw body using a per-NVR
 * secret stored in CctvNvr.eventPush.webhookSecret.
 *
 *   POST   /nvr/:nvrCode      — main NVR event push endpoint
 *   POST   /camera/:code      — single-camera direct push (rare)
 *
 * Header expected: `X-Hikvision-Signature: sha256=<hex>`.
 */
'use strict';

const express = require('express');
const crypto = require('crypto');
const { CctvNvr } = require('../../models/cctv');
const cameraService = require('../../services/cctv/cameraService');
const eventService = require('../../services/cctv/eventService');
const aiDispatcher = require('../../services/cctv/ai');

const eventQueue = require('../../services/cctv/eventQueue.service');

const router = express.Router();

router.use(express.raw({ type: '*/*', limit: '5mb' }));

// Backpressure cutoff: refuse new events when the queue is this full.
// Hikvision retries on 429, so dropping a small % under burst is fine.
function _backpressure() {
  const depth = eventQueue.depth();
  const cap = eventQueue.capacity();
  return depth >= cap * 0.95 ? { open: true, depth, cap } : null;
}

function verifyHmac(secret, raw, sigHeader) {
  if (!sigHeader || !secret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(sigHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseHikvisionBody(buf, contentType = '') {
  const text = buf.toString('utf8');
  if (/json/i.test(contentType)) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return { raw: text };
    }
  }
  const fields = {};
  for (const tag of [
    'eventType',
    'channelID',
    'dateTime',
    'eventDescription',
    'eventState',
    'macAddress',
    'ipAddress',
    'licensePlate',
  ]) {
    const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
    if (m) fields[tag] = m[1].trim();
  }
  return { ...fields, raw: text.slice(0, 4000) };
}

router.post('/nvr/:nvrCode', async (req, res) => {
  const bp = _backpressure();
  if (bp) {
    res.setHeader('Retry-After', '1');
    return res.status(429).json({
      success: false,
      code: 'QUEUE_FULL',
      message: `ingestion saturated (${bp.depth}/${bp.cap})`,
    });
  }
  const nvr = await CctvNvr.findOne({ code: String(req.params.nvrCode).toUpperCase() });
  if (!nvr) return res.status(404).json({ success: false, message: 'NVR_NOT_FOUND' });

  const secret = nvr.eventPush?.webhookSecret;
  if (secret && !verifyHmac(secret, req.body, req.headers['x-hikvision-signature'])) {
    return res.status(401).json({ success: false, message: 'BAD_SIGNATURE' });
  }

  const parsed = parseHikvisionBody(req.body, req.headers['content-type']);
  const channel = parsed.channelID || parsed.channelId || 1;
  const camera = await cameraService
    .findByCode(`${nvr.code}-CH${String(channel).padStart(2, '0')}`)
    .catch(() => null);

  const ingest = await eventService.ingestFromHikvision({
    cameraCode: camera?.code,
    cameraId: camera?._id,
    type: parsed.eventType,
    dateTime: parsed.dateTime,
    raw: parsed,
    aiResult: parsed.licensePlate ? { plate: parsed.licensePlate, confidence: 0.95 } : undefined,
  });

  nvr.eventPush.lastPushAt = new Date();
  await nvr.save().catch(() => {});

  // AI dispatch now happens inside eventQueue.flush — no need to call
  // dispatcher synchronously on the hot path. Fall back only if the
  // queue is disabled (CCTV_QUEUE_DISABLE=1).
  if (ingest.ok && ingest.data && !ingest.queued) {
    aiDispatcher.dispatch(ingest.data).catch(() => {});
  }
  res.status(ingest.ok ? 202 : 422).json({ success: ingest.ok, ...ingest });
});

router.post('/camera/:code', async (req, res) => {
  const bp = _backpressure();
  if (bp) {
    res.setHeader('Retry-After', '1');
    return res.status(429).json({
      success: false,
      code: 'QUEUE_FULL',
      message: `ingestion saturated (${bp.depth}/${bp.cap})`,
    });
  }
  const parsed = parseHikvisionBody(req.body, req.headers['content-type']);
  const r = await eventService.ingestFromHikvision({
    cameraCode: req.params.code,
    type: parsed.eventType,
    dateTime: parsed.dateTime,
    raw: parsed,
  });
  // Same as above: queue handles AI fan-out, only the direct path needs it.
  if (r.ok && r.data && !r.queued) aiDispatcher.dispatch(r.data).catch(() => {});
  res.status(r.ok ? 202 : 422).json({ success: r.ok, ...r });
});

module.exports = { router, verifyHmac, parseHikvisionBody };

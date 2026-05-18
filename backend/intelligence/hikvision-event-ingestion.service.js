'use strict';

/**
 * hikvision-event-ingestion.service.js — Wave 96 Phase 1.
 *
 * Ingests raw Hikvision events delivered by:
 *   • ISAPI push (HTTP webhook — primary)
 *   • Polling fallback (operator/cron replay — secondary)
 *
 * Strict contract:
 *   1. Ack the caller in <500ms — we persist as `hikvision_raw_event`
 *      with parseStatus=pending and return. Parsing is Phase-3 work.
 *   2. Idempotent: same (deviceId, externalEventId) cannot land twice.
 *      Duplicates return { ok:true, duplicate:true, event } — never
 *      an error, so devices that retry don't enter a panic loop.
 *   3. HMAC + replay-window check are enforced at the route layer;
 *      service receives the verification result via opts.signatureVerified.
 *
 * Public API:
 *   ingest({ deviceCode, externalEventId, eventKind, capturedAt,
 *            rawPayload, sourceIp, requestId, signatureVerified,
 *            channelNo? }) → { ok, event, duplicate? }
 *
 *   ingestBatch([items]) → { ok, results }
 *
 *   listEvents(filter)   → { ok, items, total }
 *   getEvent(id)         → { ok, event }
 *
 * Reasons:
 *   EVENT_DEVICE_UNKNOWN     — deviceCode not in registry
 *   EVENT_PAYLOAD_REQUIRED   — rawPayload missing or not object
 *   EVENT_PAYLOAD_TOO_LARGE  — payload exceeds WEBHOOK_SECURITY cap
 *   VALIDATION_FAILED        — schema invariants tripped
 *   SAVE_FAILED              — unexpected write error
 */

const reg = require('./hikvision.registry');

function createHikvisionEventIngestionService({
  deviceModel = null,
  channelModel = null,
  rawEventModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!deviceModel) {
    throw new Error('hikvision-event-ingestion.service: deviceModel is required');
  }
  if (!rawEventModel) {
    throw new Error('hikvision-event-ingestion.service: rawEventModel is required');
  }

  async function ingest(input = {}) {
    const {
      deviceCode,
      externalEventId,
      eventKind,
      capturedAt,
      rawPayload,
      sourceIp,
      requestId,
      signatureVerified,
      channelNo,
    } = input;

    if (!deviceCode || typeof deviceCode !== 'string') {
      return { ok: false, reason: reg.REASON.DEVICE_CODE_REQUIRED };
    }
    if (!externalEventId || typeof externalEventId !== 'string') {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { externalEventId: 'required' },
      };
    }
    if (!rawPayload || typeof rawPayload !== 'object') {
      return { ok: false, reason: reg.REASON.EVENT_PAYLOAD_REQUIRED };
    }
    if (!_withinPayloadCap(rawPayload)) {
      return { ok: false, reason: reg.REASON.EVENT_PAYLOAD_TOO_LARGE };
    }

    // Resolve device
    const device = await deviceModel.findOne({ deviceCode: deviceCode.trim() }).lean();
    if (!device) {
      return { ok: false, reason: reg.REASON.EVENT_DEVICE_UNKNOWN };
    }
    if (device.retiredAt) {
      return { ok: false, reason: reg.REASON.DEVICE_RETIRED };
    }

    // Resolve channel (best-effort; channels are optional for terminals)
    let channelId = null;
    if (channelNo && channelModel) {
      const ch = await channelModel.findOne({ deviceId: device._id, channelNo }).lean();
      if (ch) channelId = ch._id;
    }

    // Idempotency probe — short-circuit instead of letting the unique
    // index throw. This is the polite path for devices that re-send.
    const existing = await rawEventModel.findOne({ deviceId: device._id, externalEventId }).lean();
    if (existing) {
      return { ok: true, duplicate: true, event: existing };
    }

    const captured = _parseDate(capturedAt) || now();
    const received = now();

    const kind = reg.RAW_EVENT_KINDS.includes(eventKind) ? eventKind : reg.RAW_EVENT_KIND.UNKNOWN;

    const doc = new rawEventModel({
      deviceId: device._id,
      channelId,
      externalEventId,
      eventKind: kind,
      capturedAt: captured,
      receivedAt: received,
      sourceIp: sourceIp || null,
      requestId: requestId || null,
      signatureVerified: Boolean(signatureVerified),
      rawPayload,
      parseStatus: reg.PARSE_STATUS.PENDING,
    });

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      // Race on the unique key: another request landed the same event
      // in the time-window. Re-read and return as duplicate.
      if (err && err.code === 11000) {
        const conflict = await rawEventModel
          .findOne({ deviceId: device._id, externalEventId })
          .lean();
        if (conflict) {
          return { ok: true, duplicate: true, event: conflict };
        }
      }
      logger.error('[Hikvision] ingest save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    return { ok: true, event: doc.toObject ? doc.toObject() : doc };
  }

  async function ingestBatch(items) {
    if (!Array.isArray(items)) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { items: 'array required' },
      };
    }
    const results = [];
    for (const it of items) {
      const r = await ingest(it || {});
      results.push(r);
    }
    return { ok: true, results };
  }

  async function listEvents(filter = {}) {
    const q = {};
    if (filter.deviceId) q.deviceId = filter.deviceId;
    if (filter.eventKind) q.eventKind = filter.eventKind;
    if (filter.parseStatus) q.parseStatus = filter.parseStatus;
    if (filter.signatureVerified !== undefined) {
      q.signatureVerified = Boolean(filter.signatureVerified);
    }
    if (filter.since || filter.until) {
      q.receivedAt = {};
      if (filter.since) q.receivedAt.$gte = _parseDate(filter.since);
      if (filter.until) q.receivedAt.$lte = _parseDate(filter.until);
    }
    const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
    const skip = Math.max(Number(filter.skip) || 0, 0);
    let cursor = rawEventModel.find(q).sort({ receivedAt: -1 }).skip(skip).limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    const total =
      typeof rawEventModel.countDocuments === 'function'
        ? await rawEventModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  async function getEvent(id) {
    if (!id) return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    const ev = await rawEventModel.findById(id).lean();
    if (!ev)
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors: { id: 'not found' } };
    return { ok: true, event: ev };
  }

  // ─── Helpers ────────────────────────────────────────────────

  function _parseDate(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    const t = Date.parse(v);
    return Number.isFinite(t) ? new Date(t) : null;
  }

  function _withinPayloadCap(payload) {
    // Cheap size approximation — JSON.stringify length in bytes.
    try {
      const s = JSON.stringify(payload);
      const bytes = Buffer.byteLength(s, 'utf8');
      return bytes <= reg.WEBHOOK_SECURITY.MAX_PAYLOAD_BYTES;
    } catch {
      // Non-serialisable payload — let it through; schema will catch.
      return true;
    }
  }

  function _validationFail(err) {
    const errors = {};
    if (err && err.errors) {
      for (const k of Object.keys(err.errors)) errors[k] = err.errors[k].message || 'invalid';
    }
    return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
  }

  return {
    ingest,
    ingestBatch,
    listEvents,
    getEvent,
  };
}

module.exports = { createHikvisionEventIngestionService };

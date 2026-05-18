'use strict';

/**
 * hikvision-stream-parser.js — Wave 109.
 *
 * Pure functions. No I/O. Two layers:
 *
 *   1. parseStreamChunk(buffer, boundary)
 *      Splits the chunked multipart body into individual parts.
 *      Returns { parts: [{ headers, body }], remainder } so the caller
 *      can re-buffer the unfinished tail for the next chunk.
 *
 *   2. parseStreamPart({ headers, body, deviceCode, serverNow })
 *      Inspects Content-Type to choose XML or JSON branch, extracts
 *      the documented Hikvision fields, normalises into a single
 *      ParsedStreamEvent shape regardless of firmware encoding.
 *
 * Hikvision exposes the alert stream as `multipart/mixed; boundary=X`
 * where each part is either application/xml or application/json (and
 * sometimes image/jpeg for face captures — those are not events and
 * are skipped by the parser).
 */

const reg = require('./hikvision.registry');

// ═══════════════════════════════════════════════════════════════
// Chunk-level splitter
// ═══════════════════════════════════════════════════════════════

/**
 * Multipart bodies look like:
 *   --boundary\r\n
 *   Content-Type: application/xml\r\n
 *   Content-Length: 234\r\n\r\n
 *   <EventNotificationAlert>...</EventNotificationAlert>\r\n
 *   --boundary\r\n
 *   ...
 *   --boundary--          ← terminator (rare; many streams never close)
 *
 * The buffer arrives in network-sized fragments. We split on the
 * boundary marker, return every COMPLETE part, and keep the trailing
 * fragment as `remainder` for the caller to prepend to the next chunk.
 */
function parseStreamChunk(buffer, boundary) {
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(String(buffer || ''), 'utf8');
  }
  if (!boundary) {
    return { parts: [], remainder: buffer };
  }
  const delim = Buffer.from(`--${boundary}`, 'utf8');
  const parts = [];

  let cursor = 0;
  while (true) {
    const start = buffer.indexOf(delim, cursor);
    if (start < 0) {
      // No boundary yet; keep everything for the next chunk.
      break;
    }
    const next = buffer.indexOf(delim, start + delim.length);
    if (next < 0) {
      // Boundary found but no terminator — leave it as remainder.
      cursor = start;
      break;
    }
    const partBuf = buffer.slice(start + delim.length, next);
    const headerEnd = _findHeaderTerminator(partBuf);
    if (headerEnd < 0) {
      // malformed; skip silently — the next chunk may complete it.
      cursor = next;
      continue;
    }
    const rawHeaders = partBuf.slice(0, headerEnd).toString('utf8');
    const body = partBuf.slice(headerEnd + 4); // skip \r\n\r\n
    parts.push({
      headers: _parseHeaders(rawHeaders),
      body: _trimTrailingCRLF(body).toString('utf8'),
    });
    cursor = next;
  }

  return { parts, remainder: buffer.slice(cursor) };
}

function _findHeaderTerminator(buf) {
  // \r\n\r\n marks the end of part headers.
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 13 && buf[i + 1] === 10 && buf[i + 2] === 13 && buf[i + 3] === 10) {
      return i;
    }
  }
  // Tolerate LF-only bodies (some Hikvision firmware).
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 10 && buf[i + 1] === 10) return i;
  }
  return -1;
}

function _parseHeaders(raw) {
  const out = {};
  for (const line of String(raw).split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const k = line.slice(0, idx).trim().toLowerCase();
    const v = line.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function _trimTrailingCRLF(buf) {
  let end = buf.length;
  while (end > 0 && (buf[end - 1] === 10 || buf[end - 1] === 13)) end--;
  return buf.slice(0, end);
}

// ═══════════════════════════════════════════════════════════════
// Part-level parser (XML / JSON)
// ═══════════════════════════════════════════════════════════════

/**
 * Returns:
 *   {
 *     ok: true,
 *     event: {
 *       externalEventId, kind, capturedAt, channelNo,
 *       hikvisionPersonId, similarity, antiSpoof,
 *       parseConfidence, driftMs, driftFlag,
 *       rawPayload      // structured object
 *     }
 *   }
 * OR
 *   { ok: false, reason: 'STREAM_PARSE_FAILED', errors: {...} }
 *
 * Image parts are returned as { ok: false, skipReason: 'image-part' }
 * — the caller filters them out without emitting raw events.
 */
function parseStreamPart({ headers = {}, body = '', deviceCode, serverNow = new Date() } = {}) {
  if (!deviceCode) {
    return {
      ok: false,
      reason: reg.REASON.STREAM_PARSE_FAILED,
      errors: { deviceCode: 'required' },
    };
  }
  const ct = String(headers['content-type'] || '').toLowerCase();
  if (ct.startsWith('image/')) {
    return { ok: false, skipReason: 'image-part' };
  }

  let payload = null;
  let isJson = false;
  if (ct.includes('json')) {
    try {
      payload = JSON.parse(body);
      isJson = true;
    } catch (err) {
      return {
        ok: false,
        reason: reg.REASON.STREAM_PARSE_FAILED,
        errors: { json: err.message },
      };
    }
  } else if (ct.includes('xml') || body.trim().startsWith('<')) {
    payload = _parseHikvisionXml(body);
    if (!payload) {
      return { ok: false, reason: reg.REASON.STREAM_PARSE_FAILED, errors: { xml: 'empty' } };
    }
  } else if (body.trim().startsWith('{')) {
    // some firmwares omit Content-Type
    try {
      payload = JSON.parse(body);
      isJson = true;
    } catch (err) {
      return {
        ok: false,
        reason: reg.REASON.STREAM_PARSE_FAILED,
        errors: { json: err.message },
      };
    }
  } else {
    return {
      ok: false,
      reason: reg.REASON.STREAM_PARSE_FAILED,
      errors: { contentType: ct || 'absent' },
    };
  }

  return _normalize(payload, { deviceCode, serverNow, isJson });
}

function _normalize(payload, { deviceCode, serverNow, isJson }) {
  // Hikvision XML and JSON shapes carry the same fields under
  // different parent keys. Try every documented location.
  const dateTime = _firstStr(payload, [
    'dateTime',
    'EventNotificationAlert.dateTime',
    'AccessControllerEvent.dateTime',
  ]);
  const channelID = _firstStr(payload, [
    'channelID',
    'EventNotificationAlert.channelID',
    'AccessControllerEvent.channelID',
  ]);
  const eventType = _firstStr(payload, [
    'eventType',
    'EventNotificationAlert.eventType',
    'AccessControllerEvent.eventType',
  ]);
  const fpid = _firstStr(payload, [
    'FaceCapture.FPID',
    'FaceCapture.personID',
    'AccessControllerEvent.personID',
    'EventNotificationAlert.FaceCapture.FPID',
    'EventNotificationAlert.FaceCapture.personID',
    'FPID',
    'personID',
  ]);
  const similarity = _firstNumber(payload, [
    'FaceCapture.similarity',
    'AccessControllerEvent.similarity',
    'EventNotificationAlert.FaceCapture.similarity',
    'similarity',
  ]);
  const antiSpoofRaw = _firstStr(payload, [
    'FaceCapture.antiSpoofResult',
    'EventNotificationAlert.FaceCapture.antiSpoofResult',
    'antiSpoofResult',
  ]);

  const { capturedAt, driftMs, driftFlag } = reg.normalizeStreamTimestamp(dateTime, serverNow);
  const kind = _classifyKind({ eventType, fpid, similarity, antiSpoofRaw });
  const antiSpoof = _normaliseAntiSpoof(antiSpoofRaw);

  // parseConfidence falls to 'low' when we can't anchor the event to
  // an identity OR when timestamps are obviously off.
  const parseConfidence =
    driftFlag || (kind === reg.RAW_EVENT_KIND.UNKNOWN && !fpid) ? 'low' : 'high';

  const externalEventId = reg.computeStreamExternalEventId({
    deviceCode,
    dateTime: capturedAt.toISOString(),
    channelID,
    fpid,
    eventType,
  });

  return {
    ok: true,
    event: {
      externalEventId,
      kind,
      capturedAt,
      channelNo: channelID ? Number(channelID) || null : null,
      hikvisionPersonId: fpid || null,
      similarity: Number.isFinite(similarity) ? similarity : null,
      antiSpoof,
      parseConfidence,
      driftMs,
      driftFlag,
      encoding: isJson ? 'json' : 'xml',
      rawPayload: payload,
    },
  };
}

function _classifyKind({ eventType, fpid, similarity, antiSpoofRaw }) {
  const et = String(eventType || '').toLowerCase();
  // Anti-spoof failure wins over everything else.
  if (antiSpoofRaw && /spoof|fake|attack/i.test(String(antiSpoofRaw))) {
    return reg.RAW_EVENT_KIND.SPOOF_ATTEMPT;
  }
  if (et.includes('door')) return reg.RAW_EVENT_KIND.DOOR_OPEN;
  if (et.includes('temp')) return reg.RAW_EVENT_KIND.TEMPERATURE;
  if (et.includes('card')) return reg.RAW_EVENT_KIND.CARD;
  if (et.includes('tailgate')) return reg.RAW_EVENT_KIND.TAILGATE;
  if (et.includes('fingerprint')) return reg.RAW_EVENT_KIND.FINGERPRINT;
  if (et.includes('heartbeat')) return reg.RAW_EVENT_KIND.DEVICE_HEARTBEAT;
  if (et.includes('error') || et.includes('alarm')) return reg.RAW_EVENT_KIND.DEVICE_ERROR;

  if (et.includes('face') || et.includes('access')) {
    if (!fpid) return reg.RAW_EVENT_KIND.UNREGISTERED_FACE;
    // similarity unknown → presume match (device confirms identity).
    if (similarity == null) return reg.RAW_EVENT_KIND.FACE_MATCH;
    return similarity >= 70 ? reg.RAW_EVENT_KIND.FACE_MATCH : reg.RAW_EVENT_KIND.FACE_MISMATCH;
  }
  return reg.RAW_EVENT_KIND.UNKNOWN;
}

function _normaliseAntiSpoof(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (s.includes('real') || s.includes('pass')) return 'real';
  if (s.includes('spoof') || s.includes('fake') || s.includes('attack')) return 'spoof';
  if (s.includes('unknown')) return 'unknown';
  return s;
}

function _firstStr(payload, paths) {
  for (const p of paths) {
    const v = _getPath(payload, p);
    if (v != null && v !== '') return String(v);
  }
  return null;
}

function _firstNumber(payload, paths) {
  for (const p of paths) {
    const v = _getPath(payload, p);
    if (v == null || v === '') continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function _getPath(obj, path) {
  if (obj == null) return null;
  const segs = String(path).split('.');
  let cur = obj;
  for (const s of segs) {
    if (cur == null || typeof cur !== 'object') return null;
    cur = cur[s];
  }
  return cur;
}

// ═══════════════════════════════════════════════════════════════
// Minimal Hikvision XML extractor
// ═══════════════════════════════════════════════════════════════
//
// Hikvision XML is shallow, well-known, and lacks namespaces or
// CDATA. A tag-extraction regex covers every documented event
// without pulling in an XML library. Anything weird falls back to a
// `_rawText` field for forensic replay.

function _parseHikvisionXml(body) {
  if (!body || typeof body !== 'string') return null;
  // Root tag is one of these. We don't strictly need it; we just
  // collect every <tag>value</tag> pair into nested objects keyed
  // by the parent <Block>.
  const obj = {};
  // Capture inner blocks like <FaceCapture>...</FaceCapture> first so
  // we don't smear their children into the outer scope.
  const blockRe = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let m;
  // First pass — block-level
  while ((m = blockRe.exec(body)) !== null) {
    const [, tag, inner] = m;
    if (inner.includes('<')) {
      // nested block
      obj[tag] = _parseInner(inner);
    } else {
      obj[tag] = inner.trim();
    }
  }
  return Object.keys(obj).length > 0 ? obj : { _rawText: body.slice(0, 500) };
}

function _parseInner(inner) {
  const out = {};
  const re = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(inner)) !== null) {
    const [, tag, val] = m;
    if (val.includes('<')) {
      out[tag] = _parseInner(val);
    } else {
      out[tag] = val.trim();
    }
  }
  return out;
}

module.exports = {
  parseStreamChunk,
  parseStreamPart,
  // exposed for tests:
  _parseHikvisionXml,
  _classifyKind,
};

'use strict';

/**
 * UniversalCode Service
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Single source of truth for issuing, resolving, scanning, and rendering
 * the project's scannable codes. See `models/UniversalCode.js` for the
 * data shape and format spec.
 *
 * Public API:
 *   - `generate(entityType, entityId, opts)` — idempotent. Returns the
 *      UniversalCode doc (existing or newly created).
 *   - `resolve(code)` — returns { code, entityType, entityId, status, ... }.
 *   - `scan(code, scannerUserId)` — same as resolve, but increments
 *      `scanCount` and stamps `lastScannedAt`. Throws if `revoked`.
 *   - `revoke(code, byUserId)` — soft-delete the code.
 *   - `renderQR(code, options)`        → PNG buffer
 *   - `renderBarcode(code, options)`   → PNG buffer (Code-128)
 *   - `formatCode(entityType, shortId)` — pure string helper.
 *
 * The generator key (`entityType`+`entityId`) is unique, so calling
 * `generate()` twice for the same entity returns the SAME code — codes
 * never drift across regenerations.
 */

const UniversalCode = require('../../models/UniversalCode');

const ORG_PREFIX = process.env.UNIVERSAL_CODE_PREFIX || 'RH'; // 2-3 chars

// Crockford base32: no 0/O/1/I confusion when printed.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function shortFromObjectId(objectId) {
  // ObjectId hex is 24 chars (12 bytes). Take the LAST 5 bytes (most
  // entropy: random + counter) and base32-encode → 8 chars; truncate to 6.
  const hex = String(objectId);
  if (hex.length < 24) {
    throw new Error('shortFromObjectId: expected 24-char hex, got ' + hex.length);
  }
  const tailHex = hex.slice(14); // 10 hex chars = 5 bytes
  // Convert hex → BigInt → base32
  let n = BigInt('0x' + tailHex);
  let out = '';
  while (out.length < 8) {
    out = ALPHABET[Number(n & 31n)] + out;
    n >>= 5n;
  }
  return out.slice(2); // 6 chars
}

function formatCode(entityType, shortId) {
  if (!/^[A-Z]{3}$/.test(entityType)) {
    throw new Error('formatCode: entityType must be 3 uppercase letters');
  }
  if (!/^[A-Z0-9]{4,8}$/.test(shortId)) {
    throw new Error('formatCode: shortId must be 4-8 base32 chars');
  }
  return `${ORG_PREFIX}-${entityType}-${shortId}`.toUpperCase();
}

function parseCode(code) {
  const m = /^([A-Z0-9]{2,3})-([A-Z]{3})-([A-Z0-9]{4,8})$/.exec(String(code).trim().toUpperCase());
  if (!m) return null;
  return { prefix: m[1], entityType: m[2], shortId: m[3] };
}

async function generate(entityType, entityId, opts = {}) {
  if (!UniversalCode.ENTITY_TYPES[entityType]) {
    throw new Error('generate: unknown entityType ' + entityType);
  }
  const idStr = String(entityId);
  // Idempotency: return existing if any.
  const existing = await UniversalCode.findOne({ entityType, entityId: idStr });
  if (existing) {
    if (opts.entityLabel && opts.entityLabel !== existing.entityLabel) {
      existing.entityLabel = opts.entityLabel;
      await existing.save();
    }
    return existing;
  }
  const shortId = shortFromObjectId(idStr);
  const code = formatCode(entityType, shortId);
  const doc = await UniversalCode.create({
    code,
    entityType,
    entityId: idStr,
    entityLabel: opts.entityLabel || null,
    issuedBy: opts.issuedBy || null,
  });
  return doc;
}

async function resolve(code) {
  const parsed = parseCode(code);
  if (!parsed) {
    const err = new Error('Malformed code');
    err.statusCode = 400;
    throw err;
  }
  const doc = await UniversalCode.findOne({ code: String(code).trim().toUpperCase() });
  if (!doc) {
    const err = new Error('Code not found');
    err.statusCode = 404;
    throw err;
  }
  return doc;
}

async function scan(code, scannerUserId = null) {
  const doc = await resolve(code);
  if (doc.status === 'revoked') {
    const err = new Error('Code revoked');
    err.statusCode = 410;
    throw err;
  }
  doc.scanCount = (doc.scanCount || 0) + 1;
  doc.lastScannedAt = new Date();
  if (scannerUserId) doc.lastScannedBy = scannerUserId;
  await doc.save();
  return doc;
}

async function revoke(code, byUserId = null) {
  const doc = await resolve(code);
  doc.status = 'revoked';
  doc.lastScannedBy = byUserId || doc.lastScannedBy;
  await doc.save();
  return doc;
}

/**
 * Render PNG QR. Returns Buffer.
 * Lazy-requires `qrcode` so tests can mock it.
 */
async function renderQR(code, options = {}) {
  const QRCode = require('qrcode');
  return QRCode.toBuffer(String(code), {
    errorCorrectionLevel: options.ec || 'M',
    margin: options.margin ?? 2,
    width: options.width ?? 256,
    type: 'png',
  });
}

/**
 * Render PNG Code-128 linear barcode. Returns Buffer.
 * Lazy-requires `bwip-js`.
 */
async function renderBarcode(code, options = {}) {
  const bwipjs = require('bwip-js');
  return new Promise((res, rej) => {
    bwipjs.toBuffer(
      {
        bcid: options.bcid || 'code128',
        text: String(code),
        scale: options.scale || 3,
        height: options.height || 12,
        includetext: options.includetext !== false,
        textxalign: 'center',
      },
      (err, png) => (err ? rej(err) : res(png))
    );
  });
}

module.exports = {
  generate,
  resolve,
  scan,
  revoke,
  renderQR,
  renderBarcode,
  formatCode,
  parseCode,
  shortFromObjectId,
  ENTITY_TYPES: UniversalCode.ENTITY_TYPES,
};

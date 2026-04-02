/**
 * CJS shim for uuid v13 (ESM-only package)
 * Jest cannot load ESM modules in CJS mode, so this shim provides
 * a CommonJS-compatible implementation of the uuid API.
 *
 * Used via jest.config.js moduleNameMapper: { '^uuid$': '<rootDir>/__mocks__/uuid-cjs-shim.js' }
 */
'use strict';

const crypto = require('crypto');

/**
 * Generate a UUID v4 (random)
 * Uses Node.js crypto.randomBytes for cryptographic randomness.
 */
function v4() {
  const bytes = crypto.randomBytes(16);
  // Set version bits (version 4)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant bits (variant 1)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

/**
 * Generate a UUID v1 (time-based, simplified)
 */
function v1() {
  const now = Date.now();
  const bytes = crypto.randomBytes(10);
  const timeHigh = Math.floor(now / 0x100000000);
  const timeLow = now >>> 0;
  const hex = [
    timeLow.toString(16).padStart(8, '0'),
    (timeHigh & 0xffff).toString(16).padStart(4, '0'),
    (((timeHigh >>> 16) & 0x0fff) | 0x1000).toString(16).padStart(4, '0'),
    ((bytes[0] & 0x3f) | 0x80).toString(16).padStart(2, '0') +
      bytes[1].toString(16).padStart(2, '0'),
    bytes.slice(2, 8).toString('hex'),
  ].join('-');
  return hex;
}

/**
 * Validate a UUID string
 */
function validate(uuid) {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Get the version number of a UUID
 */
function version(uuid) {
  if (!validate(uuid)) throw new TypeError('Invalid UUID');
  return parseInt(uuid.charAt(14), 16);
}

/**
 * Parse a UUID string into a Uint8Array
 */
function parse(uuid) {
  const hex = uuid.replace(/-/g, '');
  const arr = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return arr;
}

/**
 * Stringify a Uint8Array into a UUID string
 */
function stringify(arr) {
  const hex = Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

// NIL and MAX UUIDs
const NIL = '00000000-0000-0000-0000-000000000000';
const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

module.exports = {
  v1,
  v4,
  v3: v4, // simplified fallback
  v5: v4, // simplified fallback
  validate,
  version,
  parse,
  stringify,
  NIL,
  MAX,
};

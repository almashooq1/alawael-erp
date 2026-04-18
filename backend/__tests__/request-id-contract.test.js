/**
 * request-id-contract.test.js — lock the mobile ↔ backend contract
 * for X-Request-Id.
 *
 * Mobile (ApiService.ts) generates a 22-char id from this alphabet:
 *   ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-
 *
 * Backend (middleware/requestId.middleware.js) preserves any client
 * id matching:
 *   /^[a-zA-Z0-9_\-.=+/]{1,128}$/
 *
 * If either side changes its alphabet without the other, correlation
 * IDs will silently stop flowing end-to-end (backend will generate a
 * fresh id on every request, losing the mobile→gov-adapter trace).
 * This file locks the intersection.
 */

'use strict';

const { isValidRequestId, generateRequestId } = require('../middleware/requestId.middleware');

// Replicate the mobile alphabet verbatim. If it changes in
// mobile/src/services/ApiService.ts, this test should be updated in
// lockstep — the lockstep IS the contract.
const MOBILE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

function mobileMakeRequestId() {
  let out = '';
  for (let i = 0; i < 22; i += 1) {
    out += MOBILE_ALPHABET[Math.floor(Math.random() * MOBILE_ALPHABET.length)];
  }
  return out;
}

describe('X-Request-Id: mobile ↔ backend contract', () => {
  it('every character of the mobile alphabet passes the backend regex', () => {
    // Each single char as a 1-char id must validate (it's inside the
    // [1,128] length bound and within the allowed character class).
    for (const ch of MOBILE_ALPHABET) {
      expect(isValidRequestId(ch)).toBe(true);
    }
  });

  it('100 random 22-char mobile IDs all pass isValidRequestId', () => {
    for (let i = 0; i < 100; i += 1) {
      const id = mobileMakeRequestId();
      expect(id).toHaveLength(22);
      expect(isValidRequestId(id)).toBe(true);
    }
  });

  it('backend-generated IDs are also valid by its own regex', () => {
    // Sanity: the server-side generator shouldn't produce values its
    // own validator would then reject.
    for (let i = 0; i < 50; i += 1) {
      expect(isValidRequestId(generateRequestId())).toBe(true);
    }
  });

  it('rejects injection attempts (CRLF, nulls, spaces, > 128 chars)', () => {
    expect(isValidRequestId('ok-id\r\nInjected: header')).toBe(false);
    expect(isValidRequestId('with null\u0000')).toBe(false);
    expect(isValidRequestId('has spaces')).toBe(false);
    expect(isValidRequestId('a'.repeat(129))).toBe(false);
    expect(isValidRequestId('')).toBe(false);
    expect(isValidRequestId(null)).toBe(false);
    expect(isValidRequestId(undefined)).toBe(false);
    expect(isValidRequestId(12345)).toBe(false);
  });
});

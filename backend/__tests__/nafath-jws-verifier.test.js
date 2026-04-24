/**
 * nafath-jws-verifier.test.js — hand-rolled JWS verifier used on Nafath
 * callbacks. Ensures malformed tokens, wrong algs, bad signatures, stale
 * timestamps, and mismatched claims are all rejected loudly so a forged
 * signature never gets written to the evidence record.
 */

'use strict';

const crypto = require('crypto');
const { verify, _signHs256, decodeJws } = require('../integrations/nafath/jwsVerifier');

const SECRET = 'test-secret-for-hs256-do-not-use-in-prod';

describe('nafath JWS verifier', () => {
  it('accepts a valid HS256 token and returns header + payload', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = _signHs256(
      {
        iss: 'nafath-test',
        sub: '1087654321',
        documentHash: 'abcd'.repeat(16),
        iat: now,
        exp: now + 3600,
      },
      SECRET
    );
    const { header, payload } = verify(token, { secret: SECRET });
    expect(header.alg).toBe('HS256');
    expect(payload.sub).toBe('1087654321');
  });

  it('rejects malformed tokens', () => {
    expect(() => verify('not-a-jwt', { secret: SECRET })).toThrow(/NAFATH_JWS_MALFORMED/);
    expect(() => verify('a.b', { secret: SECRET })).toThrow(/NAFATH_JWS_MALFORMED/);
  });

  it('rejects algs outside the allowlist', () => {
    const h = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const p = Buffer.from(JSON.stringify({ sub: 'x' })).toString('base64url');
    const token = `${h}.${p}.`;
    expect(() => verify(token, { secret: SECRET })).toThrow(/NAFATH_JWS_ALG_NOT_ALLOWED/);
  });

  it('rejects a tampered payload (signature no longer matches)', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = _signHs256({ sub: '1087654321', iat: now, exp: now + 3600 }, SECRET);
    const [h, _p, s] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: '9999999999' })).toString(
      'base64url'
    );
    const forged = `${h}.${tamperedPayload}.${s}`;
    expect(() => verify(forged, { secret: SECRET })).toThrow(/NAFATH_JWS_BAD_SIGNATURE/);
  });

  it('rejects expired tokens outside clock tolerance', () => {
    const longAgo = Math.floor(Date.now() / 1000) - 3600;
    const token = _signHs256({ sub: '1087654321', iat: longAgo, exp: longAgo + 60 }, SECRET);
    expect(() => verify(token, { secret: SECRET, clockToleranceSec: 10 })).toThrow(
      /NAFATH_JWS_EXPIRED/
    );
  });

  it('rejects when documentHash claim mismatches caller expectation', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = _signHs256({ sub: '1087654321', iat: now, documentHash: 'HASH-A' }, SECRET);
    expect(() => verify(token, { secret: SECRET, expectedDocumentHash: 'HASH-B' })).toThrow(
      /NAFATH_JWS_DOCUMENT_HASH_MISMATCH/
    );
  });

  it('rejects when signer national ID mismatches caller expectation', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = _signHs256({ sub: '1087654321', iat: now }, SECRET);
    expect(() => verify(token, { secret: SECRET, expectedSignerNationalId: '2099999999' })).toThrow(
      /NAFATH_JWS_SIGNER_MISMATCH/
    );
  });

  it('rejects when issuer does not match', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = _signHs256({ iss: 'rogue', sub: 'x', iat: now }, SECRET);
    expect(() => verify(token, { secret: SECRET, expectedIssuer: 'nafath-prod' })).toThrow(
      /NAFATH_JWS_WRONG_ISSUER/
    );
  });

  it('decodeJws exposes raw parts for inspection', () => {
    const token = _signHs256({ hello: 'world' }, SECRET);
    const parts = decodeJws(token);
    expect(parts.header.alg).toBe('HS256');
    expect(parts.payload.hello).toBe('world');
    expect(Buffer.isBuffer(parts.signature)).toBe(true);
  });

  it('verifies a real RS256 token against its matching public key', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: '1087654321', iat: now })).toString(
      'base64url'
    );
    const signingInput = `${header}.${payload}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    const sig = signer.sign(privateKey).toString('base64url');
    const token = `${signingInput}.${sig}`;
    const { payload: decoded } = verify(token, { publicKey });
    expect(decoded.sub).toBe('1087654321');
  });
});

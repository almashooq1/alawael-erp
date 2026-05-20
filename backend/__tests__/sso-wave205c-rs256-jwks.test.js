/**
 * W205c — RS256 + JWKS round-trip tests.
 *
 * Verifies:
 *  - ssoKeys generates / persists / restores an RS256 keypair
 *  - getPublicJwks() returns a valid JWKS shape
 *  - SSOService signs with RS256 when SSO_TOKEN_ALG=RS256
 *  - HS256 tokens still verify (back-compat)
 *  - RS256 tokens verify through the JWKS published by /.well-known/jwks.json
 *  - Tampered RS256 tokens are rejected
 */

'use strict';

process.env.NODE_ENV = 'test';
process.env.DISABLE_REDIS = 'true';
process.env.JWT_SECRET = 'wave205c-test-hs256-secret';

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Isolate the keys dir per-test so we don't pollute the project tree
const TMP_KEYS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sso-keys-w205c-'));
process.env.SSO_KEYS_DIR = TMP_KEYS_DIR;

const ssoKeys = require('../services/ssoKeys.service');
const jwt = require('jsonwebtoken');

afterAll(() => {
  try {
    fs.rmSync(TMP_KEYS_DIR, { recursive: true, force: true });
  } catch (_e) {
    // best-effort
  }
});

describe('W205c — ssoKeys.service', () => {
  beforeEach(() => {
    ssoKeys._resetForTests();
    delete process.env.SSO_RSA_PRIVATE_KEY;
    delete process.env.SSO_RSA_KID;
  });

  test('generates a usable RS256 keypair on first call', () => {
    const km = ssoKeys.getKeyMaterial();
    expect(km.privatePem).toMatch(/BEGIN PRIVATE KEY/);
    expect(km.publicPem).toMatch(/BEGIN PUBLIC KEY/);
    expect(km.kid).toMatch(/^[A-Za-z0-9_-]{16}$/);
  });

  test('JWKS exposes the active key as a JWK with kid/alg/use', () => {
    const jwks = ssoKeys.getPublicJwks();
    expect(Array.isArray(jwks.keys)).toBe(true);
    expect(jwks.keys.length).toBeGreaterThan(0);
    const k = jwks.keys[0];
    expect(k.kty).toBe('RSA');
    expect(k.use).toBe('sig');
    expect(k.alg).toBe('RS256');
    expect(typeof k.n).toBe('string');
    expect(typeof k.e).toBe('string');
    expect(k.kid).toBe(ssoKeys.getActiveKid());
  });

  test('loads from env when SSO_RSA_PRIVATE_KEY is set', () => {
    // Generate a keypair externally and pin it via env
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.SSO_RSA_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n');
    process.env.SSO_RSA_KID = 'env-kid-w205c';
    ssoKeys._resetForTests();

    const km = ssoKeys.getKeyMaterial();
    expect(km.kid).toBe('env-kid-w205c');
    expect(km.publicPem.trim()).toBe(publicKey.trim());
  });

  test('addLegacyPublicKey extends JWKS for verification only', () => {
    const km = ssoKeys.getKeyMaterial();
    const otherPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const legacyKid = ssoKeys.addLegacyPublicKey(otherPair.publicKey, 'legacy-1');
    expect(legacyKid).toBe('legacy-1');
    const kids = ssoKeys.getPublicJwks().keys.map(k => k.kid);
    expect(kids).toContain(km.kid);
    expect(kids).toContain('legacy-1');
  });
});

describe('W205c — SSOService dual-algorithm signing', () => {
  beforeEach(() => {
    ssoKeys._resetForTests();
    delete process.env.SSO_TOKEN_ALG;
    delete process.env.SSO_RSA_PRIVATE_KEY;
    delete process.env.SSO_RSA_KID;
    jest.resetModules();
  });

  test('HS256 path: tokens have alg:HS256, no kid', async () => {
    delete process.env.SSO_TOKEN_ALG;
    const SSOService = require('../services/sso.service');
    const sso = new SSOService();
    const session = await sso.createSession('u-hs', { role: 'admin' });
    const header = jwt.decode(session.accessToken, { complete: true }).header;
    expect(header.alg).toBe('HS256');
    expect(header.kid).toBeUndefined();

    const verification = await sso.verifySession(session.sessionId, session.accessToken);
    expect(verification.valid).toBe(true);
  });

  test('RS256 path: tokens have alg:RS256 + kid, verify via JWKS', async () => {
    process.env.SSO_TOKEN_ALG = 'RS256';
    const SSOService = require('../services/sso.service');
    const sso = new SSOService();
    const session = await sso.createSession('u-rs', { role: 'admin' });

    const decoded = jwt.decode(session.accessToken, { complete: true });
    expect(decoded.header.alg).toBe('RS256');
    expect(decoded.header.kid).toBe(ssoKeys.getActiveKid());

    // Verify via the JWKS (third-party path)
    const jwks = ssoKeys.getPublicJwks();
    const jwk = jwks.keys.find(k => k.kid === decoded.header.kid);
    expect(jwk).toBeDefined();
    const pubKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const verifiedExternally = jwt.verify(session.accessToken, pubKey, {
      algorithms: ['RS256'],
    });
    expect(verifiedExternally.userId).toBe('u-rs');

    // And via the SSOService's own verifier
    const verification = await sso.verifySession(session.sessionId, session.accessToken);
    expect(verification.valid).toBe(true);
  });

  test('back-compat: an HS256 session still verifies after switching to RS256', async () => {
    delete process.env.SSO_TOKEN_ALG;
    const SSOService = require('../services/sso.service');
    const hsSso = new SSOService();
    const hsSession = await hsSso.createSession('u-mixed', { role: 'admin' });

    // Now flip to RS256 mode (simulating a rolling deploy)
    process.env.SSO_TOKEN_ALG = 'RS256';
    jest.resetModules();
    ssoKeys._resetForTests(); // ensure fresh RS keys (different from hsSession)
    const SSOService2 = require('../services/sso.service');
    const rsSso = new SSOService2();

    // The HS256 token from before should still verify (verifier falls back
    // to HS256 when no kid header is present).
    const decoded = rsSso._verifyTokenAnyAlg(hsSession.accessToken);
    expect(decoded.userId).toBe('u-mixed');
  });

  test('tampered RS256 token is rejected', async () => {
    process.env.SSO_TOKEN_ALG = 'RS256';
    const SSOService = require('../services/sso.service');
    const sso = new SSOService();
    const session = await sso.createSession('u-tamper', { role: 'admin' });

    // Flip a character in the signature
    const parts = session.accessToken.split('.');
    parts[2] = parts[2].split('').reverse().join('');
    const tampered = parts.join('.');

    const verification = await sso.verifySession(session.sessionId, tampered);
    expect(verification.valid).toBe(false);

    const introspection = await sso.introspectToken(tampered);
    expect(introspection.active).toBe(false);
  });
});

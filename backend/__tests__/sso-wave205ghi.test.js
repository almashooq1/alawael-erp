/**
 * W205g/h/i — final SSO platform tests.
 *
 * g) OAuthClient.rotateSecret() — new bcrypt hash, rotationCount++,
 *    secretRotatedAt set, old secret no longer verifies, new secret verifies.
 *    Public clients (none) get null with no-op rotation.
 *
 * h) ssoAudit.service.recordAudit() — best-effort writer, no-throw on
 *    model failure, populates actor/target/ip from req.
 *
 * i) verifyNafathResponseJws() — accepts a valid RS256 JWS, rejects a
 *    bad signature, returns null when public key unconfigured.
 */

'use strict';

process.env.NODE_ENV = 'test';
process.env.DISABLE_REDIS = 'true';
process.env.JWT_SECRET = 'wave205ghi-test';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────────────────────────────────
// W205g — OAuthClient.rotateSecret
// ─────────────────────────────────────────────────────────────────────────

describe('W205g — OAuthClient.rotateSecret()', () => {
  // We test the method as a pure unit (no mongoose connection): build a
  // doc-shaped object that has the schema's method bound to it.
  const OAuthClient = require('../models/OAuthClient');
  const rotateSecret = OAuthClient.schema.methods.rotateSecret;

  function buildFakeClient(overrides = {}) {
    const updates = [];
    const fake = {
      clientId: overrides.clientId || 'cli-test',
      tokenEndpointAuthMethod: overrides.tokenEndpointAuthMethod || 'client_secret_basic',
      clientSecretHash: overrides.clientSecretHash || 'old-hash',
      secretRotationCount: 0,
      __updates: updates,
    };
    fake.updateOne = jest.fn(async function (mutation) {
      updates.push(mutation);
      if (mutation.$set) Object.assign(fake, mutation.$set);
      if (mutation.$inc) {
        for (const [k, v] of Object.entries(mutation.$inc)) {
          fake[k] = (fake[k] || 0) + v;
        }
      }
    });
    return fake;
  }

  test('mints a new secret, bcrypt-hashes it, bumps rotationCount', async () => {
    const client = buildFakeClient();
    const newSecret = await rotateSecret.call(client);
    expect(newSecret).toMatch(/^[a-f0-9]{64}$/);
    // updateOne called with $set:{clientSecretHash, secretRotatedAt} + $inc:{secretRotationCount}
    expect(client.updateOne).toHaveBeenCalledTimes(1);
    const mutation = client.updateOne.mock.calls[0][0];
    expect(mutation.$set.clientSecretHash).toBeDefined();
    expect(mutation.$set.clientSecretHash).not.toBe(newSecret); // bcrypt-hashed
    expect(mutation.$set.secretRotatedAt).toBeInstanceOf(Date);
    expect(mutation.$inc.secretRotationCount).toBe(1);
    // The new hash actually verifies against the plaintext we got back
    const ok = await bcrypt.compare(newSecret, mutation.$set.clientSecretHash);
    expect(ok).toBe(true);
  });

  test('returns null for public clients (none) with no DB write', async () => {
    const publicClient = buildFakeClient({ tokenEndpointAuthMethod: 'none' });
    const result = await rotateSecret.call(publicClient);
    expect(result).toBeNull();
    expect(publicClient.updateOne).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// W205h — ssoAudit.service
// ─────────────────────────────────────────────────────────────────────────

describe('W205h — ssoAudit.recordAudit()', () => {
  const mockCreated = [];
  let createImpl;

  jest.mock('../models/SsoAuditEvent', () => ({
    create: jest.fn(async doc => {
      const fn = mockCreatedImpl();
      return fn(doc);
    }),
  }));

  // Indirection so we can change the mock behaviour per-test
  function mockCreatedImpl() {
    return createImpl;
  }
  beforeEach(() => {
    mockCreated.length = 0;
    createImpl = async doc => {
      mockCreated.push(doc);
      return doc;
    };
  });

  function fakeReq(overrides = {}) {
    return {
      ip: '10.0.0.7',
      headers: { 'x-forwarded-for': '203.0.113.4, 10.0.0.7' },
      get: h => (h === 'user-agent' ? 'TestAgent/1.0' : null),
      user: {
        userId: 'admin-1',
        role: 'super_admin',
        email: 'admin@test',
      },
      ...overrides,
    };
  }

  test('captures actor + target + ip + ua from req', async () => {
    const { recordAudit } = require('../services/ssoAudit.service');
    await recordAudit(fakeReq(), {
      action: 'sso.session.end',
      targetType: 'session',
      targetId: 'sess-xyz',
      metadata: { ownerUserId: 'u-9' },
    });
    expect(mockCreated).toHaveLength(1);
    const doc = mockCreated[0];
    expect(doc.action).toBe('sso.session.end');
    expect(doc.actorUserId).toBe('admin-1');
    expect(doc.actorRole).toBe('super_admin');
    expect(doc.actorEmail).toBe('admin@test');
    expect(doc.targetType).toBe('session');
    expect(doc.targetId).toBe('sess-xyz');
    expect(doc.metadata).toEqual({ ownerUserId: 'u-9' });
    expect(doc.ipAddress).toBe('203.0.113.4'); // X-Forwarded-For first value
    expect(doc.userAgent).toBe('TestAgent/1.0');
    expect(doc.outcome).toBe('success');
  });

  test('falls back to req.ip when X-Forwarded-For is missing', async () => {
    const { recordAudit } = require('../services/ssoAudit.service');
    const req = fakeReq();
    req.headers = {}; // strip XFF
    await recordAudit(req, { action: 'sso.test', targetType: 't' });
    expect(mockCreated.at(-1).ipAddress).toBe('10.0.0.7');
  });

  test('NEVER throws when the underlying Model.create rejects', async () => {
    createImpl = async () => {
      throw new Error('db down');
    };
    const { recordAudit } = require('../services/ssoAudit.service');
    const result = await recordAudit(fakeReq(), { action: 'sso.test' });
    expect(result).toBeNull();
  });

  test('recordAuditFailure flags outcome=failure and stores errorMessage', async () => {
    const { recordAuditFailure } = require('../services/ssoAudit.service');
    await recordAuditFailure(
      fakeReq(),
      { action: 'sso.session.end', targetType: 'session', targetId: 'sx' },
      new Error('Session not found')
    );
    const doc = mockCreated.at(-1);
    expect(doc.outcome).toBe('failure');
    expect(doc.errorMessage).toBe('Session not found');
  });

  test('null req still records an event (cron / background callers)', async () => {
    const { recordAudit } = require('../services/ssoAudit.service');
    await recordAudit(null, { action: 'sso.cron.cleanup' });
    const doc = mockCreated.at(-1);
    expect(doc.action).toBe('sso.cron.cleanup');
    expect(doc.actorUserId).toBeUndefined();
    expect(doc.ipAddress).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// W205i — Nafath response JWS verification
// ─────────────────────────────────────────────────────────────────────────

describe('W205i — verifyNafathResponseJws()', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  beforeEach(() => {
    jest.resetModules();
    delete process.env.NAFATH_RESPONSE_PUBLIC_KEY;
    delete process.env.NAFATH_APP_ID;
  });

  test('returns null when NAFATH_RESPONSE_PUBLIC_KEY is unset', () => {
    const { verifyNafathResponseJws } = require('../services/nafathAdapter');
    const jws = jwt.sign({ x: 1 }, privateKey, { algorithm: 'RS256' });
    expect(verifyNafathResponseJws(jws)).toBeNull();
  });

  test('verifies a well-signed JWS and returns the claims', () => {
    process.env.NAFATH_RESPONSE_PUBLIC_KEY = publicKey;
    process.env.NAFATH_APP_ID = 'app-aud';
    const { verifyNafathResponseJws } = require('../services/nafathAdapter');

    const jws = jwt.sign(
      { status: 'APPROVED', body: { attributes: { fullName: 'X' } } },
      privateKey,
      { algorithm: 'RS256', audience: 'app-aud', expiresIn: 60 }
    );
    const verified = verifyNafathResponseJws(jws);
    expect(verified.status).toBe('APPROVED');
    expect(verified.body.attributes.fullName).toBe('X');
  });

  test('rejects a tampered signature with NAFATH_BAD_SIGNATURE', () => {
    process.env.NAFATH_RESPONSE_PUBLIC_KEY = publicKey;
    const { verifyNafathResponseJws } = require('../services/nafathAdapter');
    const jws = jwt.sign({ status: 'APPROVED' }, privateKey, { algorithm: 'RS256' });
    const tampered = jws.slice(0, -10) + 'AAAAAAAAAA';

    let err;
    try {
      verifyNafathResponseJws(tampered);
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.code).toBe('NAFATH_BAD_SIGNATURE');
  });

  test('rejects wrong audience when NAFATH_APP_ID is set', () => {
    process.env.NAFATH_RESPONSE_PUBLIC_KEY = publicKey;
    process.env.NAFATH_APP_ID = 'right-app';
    const { verifyNafathResponseJws } = require('../services/nafathAdapter');
    const jws = jwt.sign({ status: 'APPROVED' }, privateKey, {
      algorithm: 'RS256',
      audience: 'wrong-app',
    });

    let err;
    try {
      verifyNafathResponseJws(jws);
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.code).toBe('NAFATH_BAD_SIGNATURE');
  });

  test('rejects empty/non-string payloads with NAFATH_BAD_RESPONSE', () => {
    process.env.NAFATH_RESPONSE_PUBLIC_KEY = publicKey;
    const { verifyNafathResponseJws } = require('../services/nafathAdapter');
    expect(() => verifyNafathResponseJws('')).toThrow(/signedPayload missing/);
    expect(() => verifyNafathResponseJws(null)).toThrow(/signedPayload missing/);
  });
});

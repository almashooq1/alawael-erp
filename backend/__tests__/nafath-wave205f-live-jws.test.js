/**
 * W205f — Nafath live-mode JWS signing.
 *
 * Verifies:
 *  - signNafathJws() produces a verifiable RS256 JWT with the right claims
 *  - throws NAFATH_UNCONFIGURED when NAFATH_PRIVATE_KEY is missing
 *  - liveInitiate sends Authorization: Bearer <jws> AND honours kid header
 *    when NAFATH_KID is set
 */

'use strict';

process.env.NODE_ENV = 'test';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

describe('W205f — signNafathJws()', () => {
  let nafathAdapter;

  beforeEach(() => {
    jest.resetModules();
    process.env.NAFATH_BASE_URL = 'https://nafath.test.sa';
    process.env.NAFATH_APP_ID = 'app-test-205f';
    process.env.NAFATH_SERVICE_ID = 'svc-test-205f';
    process.env.NAFATH_PRIVATE_KEY = privateKey;
    delete process.env.NAFATH_KID;
    nafathAdapter = require('../services/nafathAdapter');
  });

  test('produces a verifiable RS256 JWT with iss/aud/sub/jti/body', () => {
    const jws = nafathAdapter.signNafathJws(
      { nationalId: '1234567890', purpose: 'login' },
      { appId: 'app-test-205f', serviceId: 'svc-test-205f', audience: 'https://aud.test/x' }
    );
    expect(typeof jws).toBe('string');
    expect(jws.split('.').length).toBe(3);

    const decoded = jwt.verify(jws, publicKey, { algorithms: ['RS256'] });
    expect(decoded.iss).toBe('app-test-205f');
    expect(decoded.aud).toBe('https://aud.test/x');
    expect(decoded.sub).toBe('svc-test-205f');
    expect(decoded.body).toEqual({ nationalId: '1234567890', purpose: 'login' });
    expect(decoded.jti).toMatch(/^[a-f0-9]{32}$/);
    // 60-second TTL
    expect(decoded.exp - decoded.iat).toBe(60);

    // Header has alg RS256, kid undefined (since NAFATH_KID unset)
    const header = jwt.decode(jws, { complete: true }).header;
    expect(header.alg).toBe('RS256');
    expect(header.kid).toBeUndefined();
  });

  test('honours NAFATH_KID env when set', () => {
    process.env.NAFATH_KID = 'nafath-kid-1';
    jest.resetModules();
    nafathAdapter = require('../services/nafathAdapter');

    const jws = nafathAdapter.signNafathJws(
      { x: 1 },
      { appId: 'app', serviceId: 'svc', audience: 'aud' }
    );
    const header = jwt.decode(jws, { complete: true }).header;
    expect(header.kid).toBe('nafath-kid-1');
  });

  test('throws NAFATH_UNCONFIGURED when NAFATH_PRIVATE_KEY is unset', () => {
    delete process.env.NAFATH_PRIVATE_KEY;
    jest.resetModules();
    nafathAdapter = require('../services/nafathAdapter');

    let err;
    try {
      nafathAdapter.signNafathJws({}, { appId: 'a', serviceId: 's' });
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.code).toBe('NAFATH_UNCONFIGURED');
  });

  test('accepts env keys with \\n-escaped newlines (env-var convenience)', () => {
    process.env.NAFATH_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n');
    jest.resetModules();
    nafathAdapter = require('../services/nafathAdapter');

    const jws = nafathAdapter.signNafathJws(
      { x: 1 },
      { appId: 'a', serviceId: 's', audience: 'aud' }
    );
    const decoded = jwt.verify(jws, publicKey, { algorithms: ['RS256'] });
    expect(decoded.iss).toBe('a');
  });
});

describe('W205f — liveInitiate sends Authorization: Bearer <jws>', () => {
  let nafathAdapter;
  let fetchSpy;

  beforeEach(() => {
    jest.resetModules();
    process.env.NAFATH_MODE = 'live';
    process.env.NAFATH_BASE_URL = 'https://nafath.test.sa';
    process.env.NAFATH_APP_ID = 'app-test';
    process.env.NAFATH_SERVICE_ID = 'svc-test';
    process.env.NAFATH_PRIVATE_KEY = privateKey;
    nafathAdapter = require('../services/nafathAdapter');

    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ transactionId: 'tx-1', randomNumber: '42' }),
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.NAFATH_MODE;
  });

  test('attaches Bearer JWS header on /initiate', async () => {
    await nafathAdapter.initiate({ nationalId: '1234567890', purpose: 'login' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.headers.Authorization).toMatch(/^Bearer .+\..+\..+$/);
    const jws = opts.headers.Authorization.replace('Bearer ', '');
    const decoded = jwt.verify(jws, publicKey, { algorithms: ['RS256'] });
    expect(decoded.body).toEqual({ nationalId: '1234567890', purpose: 'login' });
  });
});

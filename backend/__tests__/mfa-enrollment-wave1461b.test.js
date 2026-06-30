'use strict';

/**
 * W1461b — TOTP enrollment for the MFA step-up store.
 *
 * Closes the gap where `requireMfaTier(2)` gates (payroll W1461, access-review,
 * care-planning, equity-audit) were UNCOMPLETABLE: the only real TOTP impl
 * (`securityService`) wrote a HEX secret to `User.mfa`, but the step-up verifier
 * (`intelligence/mfa-challenge.service` `_defaultTotpVerifier`) reads a BASE32
 * secret from `MFASettings.totpSecret`, and `routes/mfa.js` /totp/* were stubs.
 *
 * `enrollSetup`/`enrollVerify` write the step-up store in the matching base32
 * format, so enrollment → step-up now works end-to-end. Uses the REAL speakeasy
 * verifier against an in-memory model (no DB).
 */

const speakeasy = require('speakeasy');
const { createMfaChallengeService } = require('../intelligence/mfa-challenge.service');

function mockModel() {
  const store = new Map();
  return {
    store,
    findOne(q) {
      const d = store.get(String(q.userId)) || null;
      return { select: () => ({ lean: async () => d }) };
    },
    async findOneAndUpdate(q, u) {
      const id = String(q.userId);
      const c = store.get(id) || {};
      Object.assign(c, u.$set || u);
      store.set(id, c);
      return c;
    },
  };
}

const quietLogger = { info() {}, warn() {}, error() {}, debug() {} };

describe('W1461b MFA step-up TOTP enrollment', () => {
  let svc;
  let model;

  beforeEach(() => {
    model = mockModel();
    svc = createMfaChallengeService({ mfaSettingsModel: model, logger: quietLogger });
  });

  test('service exposes enrollSetup + enrollVerify', () => {
    expect(typeof svc.enrollSetup).toBe('function');
    expect(typeof svc.enrollVerify).toBe('function');
  });

  test('enrollSetup returns a base32 secret + otpauth URL and stores enrolled:false', async () => {
    const r = await svc.enrollSetup({ userId: 'u1' });
    expect(r.ok).toBe(true);
    expect(typeof r.secret).toBe('string');
    expect(r.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(model.store.get('u1').enrolled).toBe(false);
    expect(model.store.get('u1').totpSecret).toBe(r.secret);
  });

  test('enrollVerify accepts the correct TOTP and sets enrolled:true', async () => {
    const s = await svc.enrollSetup({ userId: 'u1' });
    const code = speakeasy.totp({ secret: s.secret, encoding: 'base32' });
    const r = await svc.enrollVerify({ userId: 'u1', token: code });
    expect(r.ok).toBe(true);
    expect(model.store.get('u1').enrolled).toBe(true);
  });

  test('enrollVerify rejects a wrong TOTP (security)', async () => {
    await svc.enrollSetup({ userId: 'u1' });
    const r = await svc.enrollVerify({ userId: 'u1', token: '000000' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_TOKEN');
    expect(model.store.get('u1').enrolled).toBe(false);
  });

  test('enrollVerify before any setup → not enrolled', async () => {
    const r = await svc.enrollVerify({ userId: 'u2', token: '123456' });
    expect(r.ok).toBe(false);
  });

  test('end-to-end: enroll → step-up challenge → verify elevates to tier-2', async () => {
    const s = await svc.enrollSetup({ userId: 'u1' });
    const code = speakeasy.totp({ secret: s.secret, encoding: 'base32' });
    await svc.enrollVerify({ userId: 'u1', token: code });

    const ch = await svc.createChallenge({ userId: 'u1', requiredTier: 2 });
    expect(ch.ok).toBe(true);
    expect(ch.challengeId).toBeTruthy();

    const stepCode = speakeasy.totp({ secret: s.secret, encoding: 'base32' });
    const ver = await svc.verifyChallenge({ challengeId: ch.challengeId, token: stepCode });
    expect(ver.ok).toBe(true);
    expect(ver.sessionUpgrade.mfaLevel).toBe(2);
  });
});

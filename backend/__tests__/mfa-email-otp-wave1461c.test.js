'use strict';

/**
 * W1461c — email-OTP step-up (for users with no TOTP authenticator/device).
 *
 * `createChallenge({ method:'email' })` generates a per-challenge 6-digit code,
 * stores it on the challenge (never returned outward), and sends it via the
 * injected emailSender. `verifyChallenge` compares the entered code (constant
 * time) and, on success, elevates the session to the required tier — the same
 * path TOTP uses, so the payroll gate (and all tier-2 surfaces) is completable
 * without an authenticator app.
 */

const { createMfaChallengeService } = require('../intelligence/mfa-challenge.service');

const quiet = { info() {}, warn() {}, error() {}, debug() {} };
const nullModel = {
  findOne() {
    return { select: () => ({ lean: async () => null }) };
  },
  async findOneAndUpdate() {},
};

describe('W1461c MFA email-OTP step-up', () => {
  let svc;
  let sent;

  beforeEach(() => {
    sent = [];
    svc = createMfaChallengeService({
      mfaSettingsModel: nullModel,
      emailSender: async ({ to, code }) => sent.push({ to, code }),
      logger: quiet,
    });
  });

  test('createChallenge(email) emails a 6-digit code to the user', async () => {
    const ch = await svc.createChallenge({ userId: 'u1', requiredTier: 2, method: 'email', email: 'a@b.com' });
    expect(ch.ok).toBe(true);
    expect(ch.method).toBe('email');
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('a@b.com');
    expect(sent[0].code).toMatch(/^\d{6}$/);
    // The code must NOT be returned to the client.
    expect(JSON.stringify(ch)).not.toContain(sent[0].code);
  });

  test('verify with the emailed code elevates to tier-2', async () => {
    const ch = await svc.createChallenge({ userId: 'u1', requiredTier: 2, method: 'email', email: 'a@b.com' });
    const ver = await svc.verifyChallenge({ challengeId: ch.challengeId, token: sent[0].code });
    expect(ver.ok).toBe(true);
    expect(ver.sessionUpgrade.mfaLevel).toBe(2);
  });

  test('verify with a wrong code fails', async () => {
    const ch = await svc.createChallenge({ userId: 'u1', requiredTier: 2, method: 'email', email: 'a@b.com' });
    const bad = await svc.verifyChallenge({ challengeId: ch.challengeId, token: '000000' });
    expect(bad.ok).toBe(false);
  });

  test('email-OTP needs no enrollment (works with empty MFASettings)', async () => {
    const ch = await svc.createChallenge({ userId: 'never-enrolled', requiredTier: 2, method: 'email', email: 'x@y.com' });
    expect(ch.ok).toBe(true);
    expect(sent[0].code).toMatch(/^\d{6}$/);
  });
});

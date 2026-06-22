'use strict';

/**
 * W1460 — rate-limit the change-phone OTP flow (auth-hardening consistency).
 *
 * The parent change-phone routes are authenticated (router.use(authenticate)) and the
 * OTP record carries a 3-guess cap, but — unlike the sibling /send-otp + /verify-otp —
 * they lacked a dedicated OTP limiter, so a parent could mint unlimited fresh
 * change-phone OTPs (each resetting the 3-guess budget, newest-first), bounded only by
 * the global 60/min limiter — enough to brute-force the 6-digit OTP for a NEW phone they
 * may not own. Fix: apply the existing parentOtpSendLimiter / parentOtpVerifyLimiter,
 * matching the login OTP flow.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'parent-portal-enhanced.routes.js'),
  'utf8'
);

describe('W1460 change-phone OTP routes are rate-limited', () => {
  test('POST /settings/change-phone carries parentOtpSendLimiter', () => {
    expect(src).toMatch(
      /router\.post\(\s*'\/settings\/change-phone'\s*,\s*parentOtpSendLimiter\b/
    );
  });

  test('POST /settings/change-phone/verify carries parentOtpVerifyLimiter', () => {
    expect(src).toMatch(
      /router\.post\(\s*'\/settings\/change-phone\/verify'\s*,\s*parentOtpVerifyLimiter\b/
    );
  });

  test('neither change-phone route is left without a limiter (bare async handler)', () => {
    expect(src).not.toMatch(/router\.post\(\s*'\/settings\/change-phone'\s*,\s*async/);
    expect(src).not.toMatch(/router\.post\(\s*'\/settings\/change-phone\/verify'\s*,\s*async/);
  });
});

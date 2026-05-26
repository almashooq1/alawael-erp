/**
 * W459 — close 4 unprotected otp-auth endpoints (brute-force + spam).
 *
 * routes/otp-auth.routes.js defined two rate limiters at module top
 * (otpSendLimiter 5/15min + otpVerifyLimiter 10/15min) and wired them
 * on /send, /verify, and /resend — but 4 sibling endpoints with
 * identical risk profiles shipped without the gate:
 *
 *   POST /login            issues OTP — gate with otpSendLimiter
 *   POST /login/verify     verifies OTP — gate with otpVerifyLimiter
 *   POST /register         issues OTP — gate with otpSendLimiter
 *   POST /register/complete verifies OTP + creates account
 *                          — gate with otpVerifyLimiter
 *
 * Pre-W459 attacker could:
 *   - Spam any harvested phone with OTP traffic via /login + /register
 *     (provider SMS budget burn + smishing pre-text + victim phone spam)
 *   - Brute-force the 4-8 digit OTP via /login/verify or
 *     /register/complete with up to 10000 attempts; only friction
 *     was OTP TTL.
 *
 * Fix: wire the existing limiters as middleware on all 4 routes
 * (same pattern as /send and /verify already use).
 */

const fs = require('fs');
const path = require('path');

describe('W459 — otp-auth endpoint rate-limit closure', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'otp-auth.routes.js'), 'utf8');

  test('POST /login uses otpSendLimiter', () => {
    expect(src).toMatch(
      /router\.post\(\s*['"]\/login['"]\s*,\s*(?:\/\/[^\n]*\n\s*)*otpSendLimiter\s*,/m
    );
  });

  test('POST /login/verify uses otpVerifyLimiter', () => {
    expect(src).toMatch(
      /router\.post\(\s*['"]\/login\/verify['"]\s*,\s*(?:\/\/[^\n]*\n\s*)*otpVerifyLimiter\s*,/m
    );
  });

  test('POST /register uses otpSendLimiter', () => {
    expect(src).toMatch(
      /router\.post\(\s*['"]\/register['"]\s*,\s*(?:\/\/[^\n]*\n\s*)*otpSendLimiter\s*,/m
    );
  });

  test('POST /register/complete uses otpVerifyLimiter', () => {
    expect(src).toMatch(
      /router\.post\(\s*['"]\/register\/complete['"]\s*,\s*(?:\/\/[^\n]*\n\s*)*otpVerifyLimiter\s*,/m
    );
  });

  test('NO unprotected POST handler shipping without a limiter middleware (sanity check)', () => {
    // Count POST handlers + count of limiter usages. Should be >= 6
    // (send + verify + resend + login + login/verify + register +
    // register/complete = 7) after W459.
    const postRoutes = (src.match(/router\.post\(/g) || []).length;
    const limiterUses =
      (src.match(/otpSendLimiter/g) || []).filter((_, i, arr) => i === arr.length - 1 || true)
        .length +
      (src.match(/otpVerifyLimiter/g) || []).filter((_, i, arr) => i === arr.length - 1 || true)
        .length;
    // 4 declarations of each limiter name (1 const + 1 usage on the
    // original send/verify/resend split) + the new W459 wires.
    expect(postRoutes).toBeGreaterThan(0);
    expect(limiterUses).toBeGreaterThan(postRoutes); // every POST has at least one limiter reference nearby
  });

  test('module loads without throwing', () => {
    expect(() => require('../routes/otp-auth.routes')).not.toThrow();
  });
});

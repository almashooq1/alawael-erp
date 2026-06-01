/**
 * W726 — OTP is hashed at rest (HMAC-SHA256 + server pepper).
 *
 * Behavioral counterpart to the W725 WhatsApp/OTP consolidation: proves that
 * the raw OTP code is NEVER persisted (in-memory store or DB row). We send an
 * OTP, assert the stored value is a 64-char hex HMAC digest (not the raw
 * code), and confirm verification still round-trips for the correct code and
 * rejects a wrong code.
 */

'use strict';

const crypto = require('crypto');

describe('W726 — OTP hashed at rest', () => {
  /** @type {any} */
  let otpService;
  const RAW_OTP = '135790';
  const IDENTIFIER = 'wave726@example.com';
  const PURPOSE = 'login';

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.OTP_HASH_SECRET = 'wave726-test-pepper';
    // Fresh instance using the in-memory store (no DB connection).
    const mod = require('../auth/otp-service');
    otpService = mod.otpService || mod;
  });

  beforeEach(() => {
    // Deterministic OTP so we can assert the stored hash precisely.
    jest.spyOn(otpService, 'generateOTP').mockReturnValue(RAW_OTP);
    // Stub delivery — we are testing the store/verify path, not the channel.
    jest
      .spyOn(otpService, 'sendOTPViaEmail')
      .mockResolvedValue({ success: true, method: 'email', messageId: 'test' });
    process.env.OTP_EMAIL_ENABLED = 'true';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (otpService.otpStore) otpService.otpStore.clear();
    if (otpService.rateLimitStore) otpService.rateLimitStore.clear();
  });

  test('hashOtp returns a 64-char hex HMAC digest, not the raw code', () => {
    const digest = otpService.hashOtp(RAW_OTP);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toBe(RAW_OTP);
    // Stable / keyed by the pepper.
    const expected = crypto
      .createHmac('sha256', 'wave726-test-pepper')
      .update(RAW_OTP)
      .digest('hex');
    expect(digest).toBe(expected);
  });

  test('stored OTP record holds the hash, never the plaintext', async () => {
    await otpService.sendOTP({ identifier: IDENTIFIER, method: 'email', purpose: PURPOSE });
    const record = otpService.otpStore.get(`${IDENTIFIER}:${PURPOSE}`);
    expect(record).toBeTruthy();
    expect(record.otp).not.toBe(RAW_OTP);
    expect(record.otp).toMatch(/^[a-f0-9]{64}$/);
    expect(record.otp).toBe(otpService.hashOtp(RAW_OTP));
  });

  test('correct code verifies; wrong code is rejected', async () => {
    await otpService.sendOTP({ identifier: IDENTIFIER, method: 'email', purpose: PURPOSE });

    const bad = await otpService.verifyOTP({
      identifier: IDENTIFIER,
      otp: '000000',
      purpose: PURPOSE,
      consume: false,
    });
    expect(bad.success).toBe(false);
    expect(bad.code).toBe('OTP_INVALID');

    const ok = await otpService.verifyOTP({
      identifier: IDENTIFIER,
      otp: RAW_OTP,
      purpose: PURPOSE,
    });
    expect(ok.success).toBe(true);
  });
});

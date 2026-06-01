'use strict';

/**
 * W735 — email transport hardening (utils/emailService.setupEmailTransporter).
 *
 * Verifies provider resolution (SendGrid → SMTP → none), numeric port + correct
 * `secure` for 465, the structured emailStatus(), resettable cache, and the
 * creds-fingerprint rebuild. nodemailer.createTransport is mocked — no network.
 */

const mockCreateTransport = jest.fn(() => ({ verify: jest.fn().mockResolvedValue(true) }));
jest.mock('nodemailer', () => ({ createTransport: (...a) => mockCreateTransport(...a) }));
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('W735 email transport', () => {
  let email;
  const origEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    mockCreateTransport.mockClear();
    process.env = { ...origEnv };
    for (const k of ['SENDGRID_API_KEY', 'SMTP_USER', 'SMTP_PASS', 'SMTP_HOST', 'SMTP_PORT']) {
      delete process.env[k];
    }
    email = require('../utils/emailService');
    email.resetEmailTransporter();
  });

  afterAll(() => {
    process.env = origEnv;
  });

  test('returns null + structured reason when nothing is configured (no silent throw)', () => {
    const t = email.setupEmailTransporter();
    expect(t).toBeNull();
    const s = email.emailStatus();
    expect(s.configured).toBe(false);
    expect(s.provider).toBe('none');
    expect(s.reason).toMatch(/no_credentials/);
  });

  test('prefers SendGrid when SENDGRID_API_KEY is set', () => {
    process.env.SENDGRID_API_KEY = 'SG.abc123xyz';
    const t = email.setupEmailTransporter();
    expect(t).not.toBeNull();
    expect(email.emailStatus().provider).toBe('sendgrid');
    const cfg = mockCreateTransport.mock.calls[0][0];
    expect(cfg.host).toBe('smtp.sendgrid.net');
    expect(cfg.auth.user).toBe('apikey');
  });

  test('SMTP: port is numeric and secure is true only for 465', () => {
    process.env.SMTP_USER = 'u@x.com';
    process.env.SMTP_PASS = 'pw';
    process.env.SMTP_PORT = '465';
    email.setupEmailTransporter();
    const cfg = mockCreateTransport.mock.calls[0][0];
    expect(cfg.port).toBe(465);
    expect(typeof cfg.port).toBe('number'); // was a string before W735
    expect(cfg.secure).toBe(true); // was hardcoded false before W735
    expect(email.emailStatus().provider).toBe('smtp');
  });

  test('SMTP: port 587 → secure false', () => {
    process.env.SMTP_USER = 'u@x.com';
    process.env.SMTP_PASS = 'pw';
    process.env.SMTP_PORT = '587';
    email.setupEmailTransporter();
    expect(mockCreateTransport.mock.calls[0][0].secure).toBe(false);
  });

  test('caches the transporter (one build) until creds change, then rebuilds', () => {
    process.env.SMTP_USER = 'u@x.com';
    process.env.SMTP_PASS = 'pw';
    email.setupEmailTransporter();
    email.setupEmailTransporter();
    expect(mockCreateTransport).toHaveBeenCalledTimes(1); // cached
    process.env.SENDGRID_API_KEY = 'SG.now-configured'; // creds change
    email.setupEmailTransporter();
    expect(mockCreateTransport).toHaveBeenCalledTimes(2); // rebuilt on fingerprint change
    expect(email.emailStatus().provider).toBe('sendgrid');
  });

  test('resetEmailTransporter clears the cache', () => {
    process.env.SMTP_USER = 'u@x.com';
    process.env.SMTP_PASS = 'pw';
    email.setupEmailTransporter();
    email.resetEmailTransporter();
    expect(email.emailStatus().configured).toBe(false);
    email.setupEmailTransporter();
    expect(mockCreateTransport).toHaveBeenCalledTimes(2); // rebuilt after reset
  });
});

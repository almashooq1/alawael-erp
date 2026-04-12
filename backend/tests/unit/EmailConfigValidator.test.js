/**
 * Unit Tests — EmailConfigValidator.js
 * 100% pure/sync — validates email config via Joi + business rules
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const {
  validateEmailConfig,
  validateAndLog,
} = require('../../services/email/EmailConfigValidator');
const logger = require('../../utils/logger');

const VALID_CONFIG = {
  provider: 'smtp',
  enabled: true,
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: 'test@example.com', pass: 'secret' },
  },
  defaults: {
    from: 'Test <test@example.com>',
    fromName: 'Test',
    fromAddress: 'test@example.com',
  },
  rateLimit: { maxPerMinute: 10, maxPerHour: 500, maxPerDay: 5000 },
  brand: { name: 'منصة التأهيل' },
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════
//  validateEmailConfig — happy path
// ═══════════════════════════════════════
describe('validateEmailConfig — valid', () => {
  it('valid config returns no errors', () => {
    const r = validateEmailConfig(VALID_CONFIG);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('warnings may exist even on valid config', () => {
    const r = validateEmailConfig(VALID_CONFIG);
    expect(Array.isArray(r.warnings)).toBe(true);
  });
});

// ═══════════════════════════════════════
//  Joi schema errors
// ═══════════════════════════════════════
describe('validateEmailConfig — schema errors', () => {
  it('missing required defaults fields → errors', () => {
    const cfg = { ...VALID_CONFIG, defaults: {} };
    const r = validateEmailConfig(cfg);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.some(e => e.includes('from') || e.includes('required'))).toBe(true);
  });

  it('missing brand.name → error', () => {
    const cfg = { ...VALID_CONFIG, brand: {} };
    const r = validateEmailConfig(cfg);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('name') || e.includes('required'))).toBe(true);
  });

  it('invalid provider string → warning or error', () => {
    const cfg = { ...VALID_CONFIG, provider: 'invalid_provider' };
    const r = validateEmailConfig(cfg);
    const hasIssue = r.errors.length > 0 || r.warnings.length > 0;
    expect(hasIssue).toBe(true);
  });
});

// ═══════════════════════════════════════
//  Rate limit consistency
// ═══════════════════════════════════════
describe('rate limit warnings', () => {
  it('warns when maxPerMinute*60 > maxPerHour', () => {
    const cfg = {
      ...VALID_CONFIG,
      rateLimit: { maxPerMinute: 30, maxPerHour: 100, maxPerDay: 5000 },
    };
    const r = validateEmailConfig(cfg);
    expect(r.warnings.some(w => w.includes('maxPerMinute') && w.includes('maxPerHour'))).toBe(true);
  });

  it('warns when maxPerHour*24 > maxPerDay', () => {
    const cfg = {
      ...VALID_CONFIG,
      rateLimit: { maxPerMinute: 1, maxPerHour: 500, maxPerDay: 1000 },
    };
    const r = validateEmailConfig(cfg);
    expect(r.warnings.some(w => w.includes('maxPerHour') && w.includes('maxPerDay'))).toBe(true);
  });

  it('no rate limit warning when consistent', () => {
    const cfg = {
      ...VALID_CONFIG,
      rateLimit: { maxPerMinute: 5, maxPerHour: 500, maxPerDay: 50000 },
    };
    const r = validateEmailConfig(cfg);
    expect(r.warnings.filter(w => w.includes('Rate limit')).length).toBe(0);
  });
});

// ═══════════════════════════════════════
//  Provider credential checks
// ═══════════════════════════════════════
describe('provider credential warnings', () => {
  it('SMTP missing auth → warning', () => {
    const cfg = { ...VALID_CONFIG, smtp: { host: 'h', port: 587, auth: {} } };
    const r = validateEmailConfig(cfg);
    expect(r.warnings.some(w => w.includes('SMTP') && w.includes('credentials'))).toBe(true);
  });

  it('SendGrid missing API key → warning', () => {
    const cfg = { ...VALID_CONFIG, provider: 'sendgrid', sendgrid: { apiKey: '' } };
    const r = validateEmailConfig(cfg);
    expect(r.warnings.some(w => w.includes('SendGrid'))).toBe(true);
  });

  it('Mailgun missing credentials → warning', () => {
    const cfg = { ...VALID_CONFIG, provider: 'mailgun', mailgun: {} };
    const r = validateEmailConfig(cfg);
    expect(r.warnings.some(w => w.includes('Mailgun'))).toBe(true);
  });

  it('Azure missing connection string → warning', () => {
    const cfg = { ...VALID_CONFIG, provider: 'azure', azure: {} };
    const r = validateEmailConfig(cfg);
    expect(r.warnings.some(w => w.includes('Azure'))).toBe(true);
  });

  it('no credential warning when mock provider', () => {
    const cfg = { ...VALID_CONFIG, provider: 'mock' };
    const r = validateEmailConfig(cfg);
    expect(r.warnings.filter(w => w.includes('credentials') || w.includes('missing')).length).toBe(
      0
    );
  });
});

// ═══════════════════════════════════════
//  Tracking config
// ═══════════════════════════════════════
describe('tracking warnings', () => {
  it('tracking enabled without pixelUrl → warning', () => {
    const cfg = { ...VALID_CONFIG, tracking: { opens: true, clicks: true, pixelUrl: '' } };
    const r = validateEmailConfig(cfg);
    expect(r.warnings.some(w => w.includes('tracking'))).toBe(true);
  });

  it('no tracking warning when disabled', () => {
    const cfg = { ...VALID_CONFIG, tracking: { opens: false, clicks: false } };
    const r = validateEmailConfig(cfg);
    expect(r.warnings.filter(w => w.includes('tracking')).length).toBe(0);
  });
});

// ═══════════════════════════════════════
//  validateAndLog
// ═══════════════════════════════════════
describe('validateAndLog', () => {
  it('returns true for valid config', () => {
    expect(validateAndLog(VALID_CONFIG)).toBe(true);
  });

  it('returns false for invalid config', () => {
    expect(validateAndLog({ ...VALID_CONFIG, defaults: {} })).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });

  it('logs warnings', () => {
    validateAndLog({
      ...VALID_CONFIG,
      tracking: { opens: true, clicks: true, pixelUrl: '' },
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('logs success when valid and no warnings', () => {
    const result = validateAndLog({
      ...VALID_CONFIG,
      tracking: { opens: false, clicks: false },
    });
    expect(result).toBe(true);
    // Should not have logged errors
    expect(logger.error).not.toHaveBeenCalled();
  });
});

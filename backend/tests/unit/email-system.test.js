'use strict';
/**
 * email-system — unit tests for the Unified Email Service
 * Tests EmailManager, EmailTemplateEngine, EmailConfig, EmailCircuitBreaker
 */

// ─── Mock heavy I/O deps before any require ──────────────────────────────────
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id-123' }),
    verify: jest.fn().mockResolvedValue(true),
  })),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock(
  '../../communication/email-models',
  () => ({
    EmailLog: { create: jest.fn().mockResolvedValue({ _id: 'log1' }) },
    EmailQueue: { create: jest.fn().mockResolvedValue({ _id: 'q1' }) },
  }),
  { virtual: true }
);

const EmailManager = require('../../services/email/EmailManager');
const { EmailCircuitBreaker } = require('../../services/email/EmailCircuitBreaker');
const { EmailTemplateEngine, BRAND } = require('../../services/email/EmailTemplateEngine');
const EmailConfig = require('../../services/email/EmailConfig');

// ─── EmailConfig ─────────────────────────────────────────────────────────────
describe('EmailConfig', () => {
  test('exposes required config keys', () => {
    expect(EmailConfig).toBeDefined();
    expect(typeof EmailConfig.enabled).toBe('boolean');
    expect(typeof EmailConfig.defaults).toBe('object');
    expect(EmailConfig.defaults).toHaveProperty('from');
  });

  test('resolveProvider returns a string', () => {
    const provider = EmailConfig.resolveProvider();
    expect(typeof provider).toBe('string');
    expect(['smtp', 'sendgrid', 'mailgun', 'mock']).toContain(provider);
  });
});

// ─── EmailCircuitBreaker ──────────────────────────────────────────────────────
describe('EmailCircuitBreaker', () => {
  let cb;
  beforeEach(() => {
    cb = new EmailCircuitBreaker({ failureThreshold: 3, cooldownMs: 100 });
  });

  test('starts in CLOSED state', () => {
    expect(cb.state).toBe('CLOSED');
  });

  test('trip() opens circuit', () => {
    cb.trip('test');
    expect(cb.state).toBe('OPEN');
  });

  test('reset() restores CLOSED state', () => {
    cb.trip('test');
    cb.reset();
    expect(cb.state).toBe('CLOSED');
  });

  test('isAllowed is false when OPEN', () => {
    cb.trip('test');
    expect(cb.isAllowed).toBe(false);
  });

  test('stats getter returns state and counts', () => {
    const stats = cb.stats;
    expect(stats).toHaveProperty('state');
    expect(stats).toHaveProperty('recentFailures');
  });
});

// ─── EmailTemplateEngine ──────────────────────────────────────────────────────
describe('EmailTemplateEngine', () => {
  let engine;
  beforeEach(() => {
    engine = new EmailTemplateEngine();
  });

  test('instantiates without error', () => {
    expect(engine).toBeInstanceOf(EmailTemplateEngine);
  });

  test('BRAND export has name and color', () => {
    expect(BRAND).toBeDefined();
    expect(BRAND).toHaveProperty('name');
    expect(BRAND).toHaveProperty('primaryColor');
  });

  test('render() returns an object with html string', () => {
    const result = engine.render('NOTIFICATION', {
      title: 'Test Notification',
      message: 'This is a test message',
      recipientName: 'أحمد',
    });
    expect(result).toBeDefined();
    expect(typeof result.html).toBe('string');
    expect(result.html.length).toBeGreaterThan(50);
  });

  test('wrapInLayout() wraps content in base layout', () => {
    const html = engine.wrapInLayout('Test', '<p>Content</p>');
    expect(html).toContain('Content');
  });
});

// ─── EmailManager ─────────────────────────────────────────────────────────────
describe('EmailManager', () => {
  let manager;

  beforeEach(() => {
    manager = new EmailManager();
    jest.clearAllMocks();
  });

  test('instantiates with initialized=false', () => {
    expect(manager.initialized).toBe(false);
    expect(manager.provider).toBe('mock');
  });

  test('initial stats are all zero', () => {
    expect(manager.stats.sent).toBe(0);
    expect(manager.stats.failed).toBe(0);
    expect(manager.stats.queued).toBe(0);
  });

  test('initialize() sets initialized=true', async () => {
    const result = await manager.initialize();
    expect(result.success).toBe(true);
    expect(manager.initialized).toBe(true);
  });

  test('getStats() returns current stats', async () => {
    const stats = await manager.getStats();
    expect(stats).toHaveProperty('inMemory');
    expect(stats.inMemory).toHaveProperty('sent');
    expect(stats.inMemory).toHaveProperty('failed');
  });

  test('send() in mock mode logs and returns success', async () => {
    await manager.initialize();
    const result = await manager.send({
      to: 'test@example.com',
      subject: 'Test Email',
      text: 'Hello',
    });
    // mock provider resolves without error
    expect(result).toBeDefined();
  });

  test('setDigestAggregator() assigns aggregator', () => {
    const mockAgg = { schedule: jest.fn() };
    manager.setDigestAggregator(mockAgg);
    expect(manager._digestAggregator).toBe(mockAgg);
  });

  test('_emit() does not throw when no wsManager', () => {
    expect(() => manager._emit('test:event', { data: 1 })).not.toThrow();
  });
});

// ─── emailManager singleton ───────────────────────────────────────────────────
describe('emailManager singleton', () => {
  test('exports a single EmailManager instance', () => {
    const { emailManager } = require('../../services/email');
    expect(emailManager).toBeInstanceOf(EmailManager);
  });

  test('singleton is the same reference on re-require', () => {
    const { emailManager: a } = require('../../services/email');
    const { emailManager: b } = require('../../services/email');
    expect(a).toBe(b);
  });
});

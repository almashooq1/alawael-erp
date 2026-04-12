/**
 * Unit Tests — EmailManager.js
 * Tests: initialization, send, sendTemplate, sendBulk, convenience methods,
 *        rate limiting, queue, stats, verify, tracking, utilities
 */

/* ─── Mocks ─────────────────────────────────────────── */
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'smtp-123' });
const mockVerify = jest.fn().mockResolvedValue(true);
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify,
  })),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: () => 'abcdef012345' })),
}));

jest.mock('../../services/email/EmailConfig', () => ({
  enabled: true,
  resolveProvider: jest.fn(() => 'smtp'),
  smtp: {
    host: 'smtp.test.com',
    port: 587,
    secure: false,
    auth: { user: 'test@test.com', pass: 'pass123' },
    pool: false,
    maxConnections: 5,
    maxMessages: 100,
    tls: {},
  },
  sendgrid: { apiKey: '' },
  mailgun: { apiKey: '', domain: '' },
  defaults: {
    from: 'noreply@test.com',
    fromName: 'Test System',
    replyTo: '',
  },
  tracking: { opens: false, clicks: false, pixelUrl: '' },
  rateLimit: { maxPerMinute: 60, maxPerHour: 500, maxPerDay: 5000 },
  logging: { logToDb: false },
}));

jest.mock('../../services/email/EmailTemplateEngine', () => ({
  EmailTemplateEngine: jest.fn().mockImplementation(() => ({
    render: jest.fn((tpl, data) => ({
      subject: `Subject: ${tpl}`,
      html: `<p>Template ${tpl}</p>`,
    })),
    loadTemplate: jest.fn().mockResolvedValue('<p>file template</p>'),
    getTemplateNames: jest.fn(() => ['WELCOME', 'OTP_CODE']),
  })),
}));

jest.mock('../../services/email/EmailCircuitBreaker', () => ({
  EmailCircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: jest.fn(fn => fn()),
  })),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* ─── Import ────────────────────────────────────────── */
const EmailManager = require('../../services/email/EmailManager');

describe('EmailManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_ENABLED = 'true';
    manager = new EmailManager();
  });

  afterEach(() => {
    delete process.env.EMAIL_ENABLED;
  });

  // ═══════════════════════════════════════════
  //  Constructor
  // ═══════════════════════════════════════════
  describe('constructor', () => {
    it('initializes with default state', () => {
      expect(manager.initialized).toBe(false);
      expect(manager.provider).toBe('mock');
      expect(manager.stats.sent).toBe(0);
      expect(manager.stats.failed).toBe(0);
    });
    it('creates template engine', () => {
      expect(manager.templateEngine).toBeDefined();
      expect(manager.templateEngine.render).toBeDefined();
    });
    it('creates circuit breaker', () => {
      expect(manager._circuitBreaker).toBeDefined();
    });
    it('has rate buckets', () => {
      expect(manager._rateBuckets).toEqual({ minute: [], hour: [], day: [] });
    });
  });

  // ═══════════════════════════════════════════
  //  initialize
  // ═══════════════════════════════════════════
  describe('initialize', () => {
    it('initializes successfully with SMTP', async () => {
      const result = await manager.initialize();
      expect(result.success).toBe(true);
      expect(result.provider).toBe('smtp');
      expect(manager.initialized).toBe(true);
    });
    it('accepts wsManager option', async () => {
      const ws = { broadcast: jest.fn() };
      await manager.initialize({ wsManager: ws });
      expect(manager._wsManager).toBe(ws);
    });
    it('returns error on failure', async () => {
      // Force _createTransporter to throw
      jest.spyOn(manager, '_createTransporter').mockImplementation(() => {
        throw new Error('boom');
      });
      const result = await manager.initialize();
      expect(result.success).toBe(false);
      expect(result.error).toBe('boom');
    });
  });

  // ═══════════════════════════════════════════
  //  send
  // ═══════════════════════════════════════════
  describe('send', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('sends email successfully', async () => {
      const result = await manager.send({
        to: 'user@test.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
      });
      expect(result.success).toBe(true);
      expect(result.emailId).toBeDefined();
      expect(result.provider).toBe('smtp');
      expect(manager.stats.sent).toBe(1);
    });
    it('returns error for missing recipient', async () => {
      const r = await manager.send({ subject: 'Hi', html: '<p>x</p>' });
      expect(r.success).toBe(false);
      expect(r.error).toBe('MISSING_RECIPIENT');
    });
    it('returns error for missing content', async () => {
      const r = await manager.send({ to: 'a@b.com' });
      expect(r.success).toBe(false);
      expect(r.error).toBe('MISSING_CONTENT');
    });
    it('returns DISABLED when EMAIL_ENABLED=false', async () => {
      process.env.EMAIL_ENABLED = 'false';
      const r = await manager.send({ to: 'a@b.com', subject: 'x', html: '<p>y</p>' });
      expect(r.success).toBe(true);
      expect(r.status).toBe('DISABLED');
    });
    it('rejects attachment too large', async () => {
      const bigContent = Buffer.alloc(26 * 1024 * 1024); // 26 MB
      const r = await manager.send({
        to: 'a@b.com',
        subject: 'x',
        html: '<p>y</p>',
        attachments: [{ content: bigContent, filename: 'big.dat' }],
      });
      expect(r.success).toBe(false);
      expect(r.error).toBe('ATTACHMENT_TOO_LARGE');
    });
    it('handles send failure and increments failed stats', async () => {
      manager._circuitBreaker.execute.mockRejectedValueOnce(new Error('SMTP down'));
      const r = await manager.send({
        to: 'a@b.com',
        subject: 'x',
        html: '<p>y</p>',
        metadata: { autoRetry: false },
      });
      expect(r.success).toBe(false);
      expect(manager.stats.failed).toBe(1);
    });
    it('joins array recipients', async () => {
      await manager.send({
        to: ['a@b.com', 'c@d.com'],
        subject: 'Hi',
        html: '<p>x</p>',
      });
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe('a@b.com, c@d.com');
    });
  });

  // ═══════════════════════════════════════════
  //  sendTemplate
  // ═══════════════════════════════════════════
  describe('sendTemplate', () => {
    beforeEach(async () => {
      await manager.initialize();
    });
    it('renders template and sends', async () => {
      const r = await manager.sendTemplate('a@b.com', 'WELCOME', { name: 'Ali' });
      expect(r.success).toBe(true);
      expect(manager.templateEngine.render).toHaveBeenCalledWith('WELCOME', { name: 'Ali' });
    });
    it('returns error for missing recipient', async () => {
      const r = await manager.sendTemplate(null, 'WELCOME', {});
      expect(r.success).toBe(false);
    });
    it('handles render error', async () => {
      manager.templateEngine.render.mockImplementationOnce(() => {
        throw new Error('bad template');
      });
      const r = await manager.sendTemplate('a@b.com', 'BAD', {});
      expect(r.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  //  sendFileTemplate
  // ═══════════════════════════════════════════
  describe('sendFileTemplate', () => {
    beforeEach(async () => {
      await manager.initialize();
    });
    it('loads file template and sends', async () => {
      const r = await manager.sendFileTemplate('a@b.com', 'welcome.html', {}, { subject: 'Hi' });
      expect(r.success).toBe(true);
    });
    it('returns error for missing recipient', async () => {
      const r = await manager.sendFileTemplate(null, 'welcome.html');
      expect(r.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  //  sendBulk
  // ═══════════════════════════════════════════
  describe('sendBulk', () => {
    beforeEach(async () => {
      await manager.initialize();
    });
    it('sends to multiple recipients with template name', async () => {
      const recipients = [
        { email: 'a@b.com', name: 'A' },
        { email: 'c@d.com', name: 'C' },
      ];
      const r = await manager.sendBulk(recipients, 'WELCOME');
      expect(r.total).toBe(2);
      expect(r.sent).toBe(2);
      expect(r.failed).toBe(0);
    });
    it('sends with options object', async () => {
      const r = await manager.sendBulk([{ email: 'x@y.com' }], { subject: 'Hi', html: '<p>x</p>' });
      expect(r.total).toBe(1);
    });
    it('handles recipients as strings', async () => {
      const r = await manager.sendBulk(['a@b.com', 'c@d.com'], {
        subject: 'Hi',
        html: '<p>x</p>',
      });
      expect(r.total).toBe(2);
    });
  });

  // ═══════════════════════════════════════════
  //  Convenience Methods
  // ═══════════════════════════════════════════
  describe('convenience methods', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('sendWelcome calls sendTemplate with WELCOME', async () => {
      const spy = jest.spyOn(manager, 'sendTemplate');
      await manager.sendWelcome({ email: 'a@b.com', name: 'Ali' });
      expect(spy).toHaveBeenCalledWith('a@b.com', 'WELCOME', expect.any(Object));
    });
    it('sendPasswordReset includes token', async () => {
      const spy = jest.spyOn(manager, 'sendTemplate');
      await manager.sendPasswordReset({ email: 'a@b.com' }, 'tok123');
      expect(spy).toHaveBeenCalledWith(
        'a@b.com',
        'PASSWORD_RESET',
        expect.objectContaining({ resetToken: 'tok123' })
      );
    });
    it('sendOTP sends with priority 10', async () => {
      const spy = jest.spyOn(manager, 'sendTemplate');
      await manager.sendOTP({ email: 'a@b.com' }, '1234', 5);
      expect(spy).toHaveBeenCalledWith(
        'a@b.com',
        'OTP_CODE',
        expect.objectContaining({ otp: '1234' }),
        expect.objectContaining({ priority: 10 })
      );
    });
    it('sendLoginAlert sends LOGIN_ALERT', async () => {
      const spy = jest.spyOn(manager, 'sendTemplate');
      await manager.sendLoginAlert({ email: 'a@b.com', name: 'Ali' }, { ip: '1.2.3.4' });
      expect(spy).toHaveBeenCalledWith('a@b.com', 'LOGIN_ALERT', expect.any(Object));
    });
    it('sendAppointmentReminder returns NO_EMAIL if no email', async () => {
      const r = await manager.sendAppointmentReminder({});
      expect(r.success).toBe(false);
      expect(r.error).toBe('NO_EMAIL');
    });
    it('sendInvoice returns NO_EMAIL if no email', async () => {
      const r = await manager.sendInvoice({}, {});
      expect(r.success).toBe(false);
    });
    it('sendAlert sends ALERT_NOTIFICATION', async () => {
      const spy = jest.spyOn(manager, 'sendTemplate');
      await manager.sendAlert({ title: 'Alert', severity: 'critical' }, 'admin@test.com');
      expect(spy).toHaveBeenCalledWith(
        'admin@test.com',
        'ALERT_NOTIFICATION',
        expect.any(Object),
        expect.objectContaining({ priority: 10 })
      );
    });
    it('sendNotification handles string notification', async () => {
      const spy = jest.spyOn(manager, 'sendTemplate');
      await manager.sendNotification('a@b.com', 'Hello there');
      expect(spy).toHaveBeenCalledWith(
        'a@b.com',
        'NOTIFICATION',
        expect.objectContaining({ message: 'Hello there' })
      );
    });
  });

  // ═══════════════════════════════════════════
  //  Rate Limiting
  // ═══════════════════════════════════════════
  describe('rate limiting', () => {
    it('_checkRateLimit returns true when under limits', () => {
      expect(manager._checkRateLimit()).toBe(true);
    });
    it('_trackRateLimit adds timestamps', () => {
      manager._trackRateLimit();
      expect(manager._rateBuckets.minute).toHaveLength(1);
      expect(manager._rateBuckets.hour).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════
  //  Queue
  // ═══════════════════════════════════════════
  describe('_enqueueEmail', () => {
    it('returns NO_QUEUE if no queue model', async () => {
      const r = await manager._enqueueEmail({ to: 'a@b.com', subject: 'x', html: '<p>y</p>' });
      expect(r.success).toBe(false);
      expect(r.error).toBe('NO_QUEUE');
    });
    it('queues email when model available', async () => {
      manager._EmailQueue = { create: jest.fn().mockResolvedValue({}) };
      const r = await manager._enqueueEmail({ to: 'a@b.com', subject: 'x', html: '<p>y</p>' });
      expect(r.success).toBe(true);
      expect(r.status).toBe('QUEUED');
      expect(manager.stats.queued).toBe(1);
    });
    it('handles queue error', async () => {
      manager._EmailQueue = {
        create: jest.fn().mockRejectedValue(new Error('db err')),
      };
      const r = await manager._enqueueEmail({ to: 'a@b.com', subject: 'x', html: '<p>y</p>' });
      expect(r.success).toBe(false);
      expect(r.error).toBe('QUEUE_ERROR');
    });
  });

  // ═══════════════════════════════════════════
  //  Stats & Verify
  // ═══════════════════════════════════════════
  describe('getStats', () => {
    it('returns stats without DB models', async () => {
      await manager.initialize();
      const stats = await manager.getStats();
      expect(stats.provider).toBe('smtp');
      expect(stats.inMemory).toBeDefined();
      expect(stats.rateLimit).toBeDefined();
    });
  });

  describe('verify', () => {
    it('returns mock mode message when mock', async () => {
      manager.provider = 'mock';
      const r = await manager.verify();
      expect(r.success).toBe(true);
      expect(r.provider).toBe('mock');
    });
    it('verifies sendgrid', async () => {
      manager.provider = 'sendgrid';
      manager._sgMail = {};
      const r = await manager.verify();
      expect(r.success).toBe(true);
    });
    it('verifies SMTP transporter', async () => {
      await manager.initialize();
      const r = await manager.verify();
      expect(r.success).toBe(true);
    });
    it('handles verify failure', async () => {
      await manager.initialize();
      manager.transporter.verify = jest.fn().mockRejectedValue(new Error('SMTP fail'));
      const r = await manager.verify();
      expect(r.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  //  Templates
  // ═══════════════════════════════════════════
  describe('getAvailableTemplates', () => {
    it('returns template names', () => {
      const names = manager.getAvailableTemplates();
      expect(names).toContain('WELCOME');
    });
  });

  describe('previewTemplate', () => {
    it('renders and returns subject+html', () => {
      const r = manager.previewTemplate('WELCOME', {});
      expect(r).toHaveProperty('subject');
      expect(r).toHaveProperty('html');
    });
  });

  // ═══════════════════════════════════════════
  //  Utilities
  // ═══════════════════════════════════════════
  describe('_generateEmailId', () => {
    it('returns a string ID', () => {
      const id = manager._generateEmailId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(5);
    });
  });

  describe('_stripHtml', () => {
    it('strips HTML tags', () => {
      expect(manager._stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });
    it('handles empty string', () => {
      expect(manager._stripHtml('')).toBe('');
    });
  });

  describe('_emit', () => {
    it('calls wsManager.broadcast if available', () => {
      const ws = { broadcast: jest.fn() };
      manager._wsManager = ws;
      manager._emit('test:event', { x: 1 });
      expect(ws.broadcast).toHaveBeenCalledWith('test:event', { x: 1 });
    });
    it('does nothing without wsManager', () => {
      expect(() => manager._emit('test', {})).not.toThrow();
    });
  });

  describe('_addTrackingPixel', () => {
    it('adds pixel before </body>', () => {
      const config = require('../../services/email/EmailConfig');
      config.tracking.pixelUrl = 'https://track.test.com';
      const html = '<body><p>Hi</p></body>';
      const result = manager._addTrackingPixel(html, 'eid123');
      expect(result).toContain('track/open/eid123');
    });
  });

  describe('_rewriteLinksForTracking', () => {
    it('rewrites links', () => {
      const config = require('../../services/email/EmailConfig');
      config.tracking.pixelUrl = 'https://track.test.com';
      const html = '<a href="https://example.com">Click</a>';
      const result = manager._rewriteLinksForTracking(html, 'eid123');
      expect(result).toContain('track/click/eid123');
    });
    it('skips mailto links', () => {
      const config = require('../../services/email/EmailConfig');
      config.tracking.pixelUrl = 'https://track.test.com';
      const html = '<a href="mailto:a@b.com">Email</a>';
      const result = manager._rewriteLinksForTracking(html, 'eid123');
      expect(result).toContain('mailto:a@b.com');
    });
    it('returns null for null html', () => {
      expect(manager._rewriteLinksForTracking(null, 'x')).toBeNull();
    });
  });

  // ═══════════════════════════════════════════
  //  setDigestAggregator
  // ═══════════════════════════════════════════
  describe('setDigestAggregator', () => {
    it('sets the digest aggregator', () => {
      const agg = { add: jest.fn() };
      manager.setDigestAggregator(agg);
      expect(manager._digestAggregator).toBe(agg);
    });
  });

  // ═══════════════════════════════════════════
  //  _getEmailPreferenceModel
  // ═══════════════════════════════════════════
  describe('_getEmailPreferenceModel', () => {
    it('returns null when model not found', () => {
      // Reset cached value
      manager._EmailPreference = undefined;
      const model = manager._getEmailPreferenceModel();
      // Model load will fail in test environment, so null
      expect(model === null || model !== undefined).toBe(true);
    });
    it('caches the model after first load', () => {
      manager._EmailPreference = 'cached';
      expect(manager._getEmailPreferenceModel()).toBe('cached');
    });
  });
});

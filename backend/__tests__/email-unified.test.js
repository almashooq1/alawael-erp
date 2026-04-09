/**
 * ═══════════════════════════════════════════════════════════════
 * 📧 Unified Email System Tests — اختبارات نظام البريد الموحد
 * ═══════════════════════════════════════════════════════════════
 */

// Mock nodemailer before loading our modules
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: '<test-message-id@test.com>',
      accepted: ['test@example.com'],
    }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const nodemailer = require('nodemailer');

describe('📧 Unified Email System', () => {
  let EmailManager, EmailConfig, EmailTemplateEngine, EmailQueueProcessor, EmailAnalytics;

  beforeAll(() => {
    // Set env vars
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASSWORD = 'test-pass';
    process.env.EMAIL_ENABLED = 'true';
    process.env.FRONTEND_URL = 'https://test.alawael.com';
    process.env.COMPANY_NAME = 'مركز الأوائل التجريبي';
    process.env.COMPANY_NAME_EN = 'Test Center';

    // Load modules after env setup
    EmailManager = require('../services/email/EmailManager');
    EmailConfig = require('../services/email/EmailConfig');
    ({ EmailTemplateEngine } = require('../services/email/EmailTemplateEngine'));
    EmailQueueProcessor = require('../services/email/EmailQueueProcessor');
    EmailAnalytics = require('../services/email/EmailAnalytics');
  });

  // ═══════════════════════════════════════════════════════════
  // 📋 CONFIG TESTS
  // ═══════════════════════════════════════════════════════════

  describe('EmailConfig', () => {
    test('should load SMTP settings from env', () => {
      expect(EmailConfig.smtp.host).toBe('smtp.test.com');
      expect(EmailConfig.smtp.port).toBe(587);
      expect(EmailConfig.smtp.auth.user).toBe('test@test.com');
      expect(EmailConfig.smtp.auth.pass).toBe('test-pass');
    });

    test('should detect credentials exist', () => {
      expect(EmailConfig.hasCredentials()).toBe(true);
    });

    test('should resolve SMTP as best provider', () => {
      expect(EmailConfig.resolveProvider()).toBe('smtp');
    });

    test('should have rate limit defaults', () => {
      expect(EmailConfig.rateLimit.maxPerMinute).toBeGreaterThan(0);
      expect(EmailConfig.rateLimit.maxPerHour).toBeGreaterThan(0);
      expect(EmailConfig.rateLimit.maxPerDay).toBeGreaterThan(0);
    });

    test('should have retry defaults', () => {
      expect(EmailConfig.retry.maxAttempts).toBeGreaterThanOrEqual(1);
      expect(EmailConfig.retry.initialDelayMs).toBeGreaterThan(0);
      expect(EmailConfig.retry.backoffMultiplier).toBeGreaterThan(1);
    });

    test('should have company branding', () => {
      expect(EmailConfig.brand.name).toBe('مركز الأوائل التجريبي');
      expect(EmailConfig.brand.nameEn).toBe('Test Center');
      expect(EmailConfig.brand.primaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 📝 TEMPLATE ENGINE TESTS
  // ═══════════════════════════════════════════════════════════

  describe('EmailTemplateEngine', () => {
    let engine;

    beforeEach(() => {
      engine = new EmailTemplateEngine();
    });

    test('should list all template names', () => {
      const names = engine.getTemplateNames();
      expect(names).toContain('WELCOME');
      expect(names).toContain('PASSWORD_RESET');
      expect(names).toContain('OTP_CODE');
      expect(names).toContain('INVOICE');
      expect(names).toContain('APPOINTMENT_REMINDER');
      expect(names).toContain('DAILY_DIGEST');
      expect(names.length).toBeGreaterThan(20);
    });

    test('should render WELCOME template', () => {
      const result = engine.render('WELCOME', {
        name: 'أحمد',
        email: 'ahmed@test.com',
        role: 'مستخدم',
      });

      expect(result).toBeDefined();
      expect(result.subject).toContain('مرحباً');
      expect(result.html).toContain('أحمد');
      expect(result.html).toContain('ahmed@test.com');
      expect(result.html).toContain('dir="rtl"');
      expect(result.html).toContain('lang="ar"');
    });

    test('should render PASSWORD_RESET template', () => {
      const result = engine.render('PASSWORD_RESET', {
        name: 'سارة',
        resetToken: 'abc-token-123',
      });

      expect(result.subject).toContain('إعادة تعيين');
      expect(result.html).toContain('abc-token-123');
      expect(result.html).toContain('سارة');
    });

    test('should render OTP_CODE template with code', () => {
      const result = engine.render('OTP_CODE', {
        name: 'محمد',
        otp: '583921',
        expiry: 10,
      });

      expect(result.subject).toContain('583921');
      expect(result.html).toContain('583921');
      expect(result.html).toContain('10 دقائق');
    });

    test('should render INVOICE template', () => {
      const result = engine.render('INVOICE', {
        invoiceNumber: 'INV-2026-001',
        customerName: 'شركة الأمل',
        total: 5250.5,
        dueDate: new Date('2026-05-01'),
        items: [{ description: 'جلسة علاجية', quantity: 5, price: 1050.1 }],
      });

      expect(result.subject).toContain('INV-2026-001');
      expect(result.html).toContain('شركة الأمل');
      expect(result.html).toContain('INV-2026-001');
    });

    test('should render APPOINTMENT_REMINDER template', () => {
      const result = engine.render('APPOINTMENT_REMINDER', {
        patientName: 'خالد',
        type: 'علاج نطق',
        date: new Date('2026-05-15'),
        startTime: '10:00',
        therapistName: 'د. سارة',
      });

      expect(result.subject).toContain('تذكير');
      expect(result.html).toContain('خالد');
      expect(result.html).toContain('د. سارة');
    });

    test('should render DAILY_DIGEST template', () => {
      const result = engine.render('DAILY_DIGEST', {
        name: 'المدير',
        stats: [
          { value: 12, label: 'مهمة' },
          { value: 3, label: 'موعد' },
        ],
        tasks: [{ title: 'مراجعة التقرير', dueDate: new Date() }],
      });

      expect(result.subject).toContain('ملخص يومي');
      expect(result.html).toContain('المدير');
      expect(result.html).toContain('stat-value');
    });

    test('should render ORDER_CONFIRMATION template', () => {
      const result = engine.render('ORDER_CONFIRMATION', {
        orderId: 'ORD-2026-100',
        totalAmount: 1200,
        deliveryDate: new Date('2026-06-01'),
        items: [{ name: 'جهاز تأهيل', quantity: 2, price: 600 }],
      });

      expect(result.subject).toContain('ORD-2026-100');
    });

    test('should throw on unknown template', () => {
      expect(() => engine.render('NONEXISTENT', {})).toThrow('Template not found');
    });

    test('buildInfoCard should skip empty values', () => {
      const html = engine.buildInfoCard([
        ['الاسم', 'أحمد'],
        ['الهاتف', ''],
        ['البريد', null],
        ['العنوان', 'الرياض'],
      ]);

      expect(html).toContain('أحمد');
      expect(html).toContain('الرياض');
      expect(html).not.toContain('الهاتف');
    });

    test('buildButton should create proper HTML', () => {
      const html = engine.buildButton('اضغط هنا', 'https://test.com');
      expect(html).toContain('href="https://test.com"');
      expect(html).toContain('اضغط هنا');
      expect(html).toContain('class="btn"');
    });

    test('buildStatsGrid should render stats', () => {
      const html = engine.buildStatsGrid([
        { value: 42, label: 'إجمالي' },
        { value: 7, label: 'جديد', color: '#28a745' },
      ]);

      expect(html).toContain('42');
      expect(html).toContain('7');
      expect(html).toContain('إجمالي');
    });

    test('buildTable should create data table', () => {
      const html = engine.buildTable(
        ['المنتج', 'الكمية'],
        [
          ['جهاز 1', '5'],
          ['جهاز 2', '3'],
        ]
      );

      expect(html).toContain('data-table');
      expect(html).toContain('جهاز 1');
      expect(html).toContain('جهاز 2');
    });

    test('wrapInLayout should produce valid HTML', () => {
      const html = engine.wrapInLayout('اختبار', '<p>محتوى</p>');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('محتوى');
      expect(html).toContain('</html>');
      expect(html).toContain('جميع الحقوق محفوظة');
    });

    test('wrapInLayout should support preheader', () => {
      const html = engine.wrapInLayout('اختبار', '<p>محتوى</p>', {
        preheader: 'نص مخفي',
      });

      expect(html).toContain('نص مخفي');
      expect(html).toContain('display:none');
    });

    test('variable interpolation should work', () => {
      const result = engine._interpolate('مرحباً {{name}} في {{company}}', {
        name: 'أحمد',
        company: 'الأوائل',
      });

      expect(result).toBe('مرحباً أحمد في الأوائل');
    });

    test('HTML escape should work', () => {
      const result = engine._escape('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 📤 EMAIL MANAGER TESTS
  // ═══════════════════════════════════════════════════════════

  describe('EmailManager', () => {
    let manager;

    beforeEach(() => {
      manager = new EmailManager();
      nodemailer.createTransport.mockClear();
    });

    test('should initialize successfully', async () => {
      const result = await manager.initialize();
      expect(result.success).toBe(true);
      expect(result.provider).toBe('smtp');
      expect(manager.initialized).toBe(true);
    });

    test('should send email via SMTP', async () => {
      await manager.initialize();

      const result = await manager.send({
        to: 'recipient@test.com',
        subject: 'اختبار',
        html: '<p>محتوى تجريبي</p>',
      });

      expect(result.success).toBe(true);
      expect(result.emailId).toBeDefined();
      expect(result.provider).toBe('smtp');
    });

    test('should reject missing recipient', async () => {
      await manager.initialize();

      const result = await manager.send({
        subject: 'بدون مستلم',
        html: '<p>محتوى</p>',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('E001');
    });

    test('should reject missing content', async () => {
      await manager.initialize();

      const result = await manager.send({
        to: 'recipient@test.com',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('E002');
    });

    test('should send welcome email', async () => {
      await manager.initialize();

      const result = await manager.sendWelcome({
        name: 'أحمد',
        email: 'ahmed@test.com',
        role: 'مستخدم',
      });

      expect(result.success).toBe(true);
    });

    test('should send password reset email', async () => {
      await manager.initialize();

      const result = await manager.sendPasswordReset(
        { name: 'سارة', email: 'sara@test.com' },
        'reset-token-xxx'
      );

      expect(result.success).toBe(true);
    });

    test('should send OTP email', async () => {
      await manager.initialize();

      const result = await manager.sendOTP(
        { name: 'محمد', email: 'mohammad@test.com' },
        '583921',
        5
      );

      expect(result.success).toBe(true);
    });

    test('should send appointment reminder', async () => {
      await manager.initialize();

      const result = await manager.sendAppointmentReminder({
        email: 'patient@test.com',
        patientName: 'خالد',
        type: 'جلسة علاجية',
        date: new Date(),
        startTime: '10:00',
        therapistName: 'د. فاطمة',
      });

      expect(result.success).toBe(true);
    });

    test('should send invoice email', async () => {
      await manager.initialize();

      const result = await manager.sendInvoice(
        { invoiceNumber: 'INV-001', total: 5000, dueDate: new Date() },
        { email: 'customer@test.com', name: 'شركة العميل' }
      );

      expect(result.success).toBe(true);
    });

    test('should send bulk emails', async () => {
      await manager.initialize();

      const recipients = [
        { email: 'user1@test.com', name: 'مستخدم 1' },
        { email: 'user2@test.com', name: 'مستخدم 2' },
        { email: 'user3@test.com', name: 'مستخدم 3' },
      ];

      const result = await manager.sendBulk(recipients, 'WELCOME');

      expect(result.total).toBe(3);
      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
    });

    test('should track stats', async () => {
      await manager.initialize();

      await manager.send({
        to: 'test@test.com',
        subject: 'اختبار',
        html: '<p>محتوى</p>',
      });

      const stats = await manager.getStats();
      expect(stats.inMemory.sent).toBeGreaterThan(0);
      expect(stats.provider).toBe('smtp');
      expect(stats.enabled).toBe(true);
    });

    test('should verify transport', async () => {
      await manager.initialize();

      const result = await manager.verify();
      expect(result.success).toBe(true);
    });

    test('should list available templates', async () => {
      await manager.initialize();

      const templates = manager.getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(20);
      expect(templates).toContain('WELCOME');
    });

    test('should preview template', async () => {
      await manager.initialize();

      const result = manager.previewTemplate('WELCOME', {
        name: 'اختبار',
        email: 'test@test.com',
      });

      expect(result.subject).toBeDefined();
      expect(result.html).toBeDefined();
    });

    test('should handle disabled email mode', async () => {
      const originalEnabled = process.env.EMAIL_ENABLED;
      process.env.EMAIL_ENABLED = 'false';

      // Need to reload config and manager with fresh modules
      const configPath = require.resolve('../services/email/EmailConfig');
      const managerPath = require.resolve('../services/email/EmailManager');
      const { EmailTemplateEngine: TE } = require('../services/email/EmailTemplateEngine');
      delete require.cache[configPath];
      delete require.cache[managerPath];
      const FreshManager = require('../services/email/EmailManager');
      const freshManager = new FreshManager();
      await freshManager.initialize();

      const result = await freshManager.send({
        to: 'test@test.com',
        subject: 'اختبار',
        html: '<p>test</p>',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('DISABLED');

      // Restore
      process.env.EMAIL_ENABLED = originalEnabled;
      delete require.cache[configPath];
      delete require.cache[managerPath];
    });

    test('should generate unique email IDs', () => {
      const id1 = manager._generateEmailId();
      const id2 = manager._generateEmailId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    test('should strip HTML to text', () => {
      const text = manager._stripHtml('<h1>عنوان</h1><p>فقرة</p><style>.x{}</style>');
      expect(text).toContain('عنوان');
      expect(text).toContain('فقرة');
      expect(text).not.toContain('<h1>');
      expect(text).not.toContain('<style>');
    });

    test('should handle send failure gracefully', async () => {
      const failManager = new EmailManager();
      nodemailer.createTransport.mockReturnValueOnce({
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP timeout')),
        verify: jest.fn().mockResolvedValue(true),
      });

      await failManager.initialize();

      const result = await failManager.send({
        to: 'test@test.com',
        subject: 'فشل',
        html: '<p>test</p>',
        metadata: { autoRetry: false },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP timeout');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 📦 QUEUE PROCESSOR TESTS
  // ═══════════════════════════════════════════════════════════

  describe('EmailQueueProcessor', () => {
    let manager, processor;

    beforeEach(() => {
      manager = new EmailManager();
      processor = new EmailQueueProcessor(manager);
    });

    afterEach(() => {
      processor.stop();
    });

    test('should start and stop without error', () => {
      processor.start();
      expect(processor._timer).toBeDefined();

      processor.stop();
      expect(processor._timer).toBeNull();
    });

    test('should track stats', () => {
      const stats = processor.getStats();
      expect(stats).toHaveProperty('running');
      expect(stats).toHaveProperty('timerActive');
      expect(stats).toHaveProperty('processedTotal');
      expect(stats).toHaveProperty('errorsTotal');
      expect(stats.config).toHaveProperty('batchSize');
      expect(stats.config).toHaveProperty('pollInterval');
      expect(stats.config).toHaveProperty('maxRetries');
    });

    test('should handle tick without queue model', async () => {
      // Should not throw
      await processor._tick();
      expect(processor._running).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 📊 ANALYTICS TESTS
  // ═══════════════════════════════════════════════════════════

  describe('EmailAnalytics', () => {
    let manager, analytics;

    beforeEach(() => {
      manager = new EmailManager();
      analytics = new EmailAnalytics(manager);
    });

    test('should handle missing EmailLog model gracefully', async () => {
      const dashboard = await analytics.getDashboard();
      expect(dashboard).toHaveProperty('error');
    });

    test('should calculate rates correctly', () => {
      expect(analytics._calcRate(100, 95)).toBe(95);
      expect(analytics._calcRate(100, 0)).toBe(0);
      expect(analytics._calcRate(0, 0)).toBe(0);
      expect(analytics._calcRate(200, 150)).toBe(75);
    });

    test('should handle getLogs without model', async () => {
      const logs = await analytics.getLogs();
      expect(logs.data).toEqual([]);
      expect(logs.total).toBe(0);
    });

    test('should handle getEmailDetail without model', async () => {
      const detail = await analytics.getEmailDetail('test-123');
      expect(detail).toBeNull();
    });

    test('should handle getBounceReport without model', async () => {
      const report = await analytics.getBounceReport();
      expect(report.total).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 🔄 BACKWARD COMPATIBILITY TESTS
  // ═══════════════════════════════════════════════════════════

  describe('Backward Compatibility', () => {
    let compat;

    beforeAll(() => {
      compat = require('../services/email-compat');
    });

    test('should expose sendEmail method', () => {
      expect(typeof compat.sendEmail).toBe('function');
    });

    test('should expose sendWelcomeEmail method', () => {
      expect(typeof compat.sendWelcomeEmail).toBe('function');
    });

    test('should expose sendPasswordResetEmail method', () => {
      expect(typeof compat.sendPasswordResetEmail).toBe('function');
    });

    test('should expose manager instance', () => {
      expect(compat.manager).toBeDefined();
      expect(compat.manager.constructor.name).toBe('EmailManager');
    });

    test('should expose template engine', () => {
      expect(compat.templateEngine).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 📋 INDEX EXPORT TESTS
  // ═══════════════════════════════════════════════════════════

  describe('Module Exports (index.js)', () => {
    let emailModule;

    beforeAll(() => {
      emailModule = require('../services/email');
    });

    test('should export EmailManager class', () => {
      expect(emailModule.EmailManager).toBeDefined();
    });

    test('should export emailManager singleton', () => {
      expect(emailModule.emailManager).toBeDefined();
    });

    test('should export EmailConfig', () => {
      expect(emailModule.EmailConfig).toBeDefined();
    });

    test('should export EmailTemplateEngine', () => {
      expect(emailModule.EmailTemplateEngine).toBeDefined();
    });

    test('should export EmailQueueProcessor', () => {
      expect(emailModule.EmailQueueProcessor).toBeDefined();
    });

    test('should export EmailAnalytics', () => {
      expect(emailModule.EmailAnalytics).toBeDefined();
    });

    test('should export sendEmail helper', () => {
      expect(typeof emailModule.sendEmail).toBe('function');
    });

    test('should export sendTemplate helper', () => {
      expect(typeof emailModule.sendTemplate).toBe('function');
    });

    test('should export sendBulk helper', () => {
      expect(typeof emailModule.sendBulk).toBe('function');
    });
  });
});

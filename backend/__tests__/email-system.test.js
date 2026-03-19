/**
 * Email System — Comprehensive Tests
 * Tests the unified email integration service, templates, NotificationCenter
 * bridge, 2FA email methods, rate limiting, queue, and stats.
 *
 * All email sending is mocked (no real SMTP) — tests logic, templates, and wiring.
 */

/* eslint-disable no-unused-vars */

// ─── Environment setup ──────────────────────────────────────────────

process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASSWORD = 'test-password';
process.env.EMAIL_FROM = 'noreply@test.com';
process.env.EMAIL_FROM_NAME = 'Test ERP';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.SENDGRID_API_KEY = '';

// ─── Mocks ──────────────────────────────────────────────────────────

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-msg-123' }),
    verify: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ─── Module under test ──────────────────────────────────────────────

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const {
  EmailIntegrationService,
  emailIntegration,
  EMAIL_TEMPLATES,
  EMAIL_CONFIG,
  wrapInLayout,
  buildInfoCard,
  buildButton,
} = require('../services/email-integration.service');

/**
 * Helper: get the sendMail mock from the service's transporter
 */
function getSendMailMock(svc) {
  return svc.transporter ? svc.transporter.sendMail : null;
}

/**
 * Helper: get last sendMail call args
 */
function getLastMailCall(svc) {
  const mock = getSendMailMock(svc);
  if (!mock || mock.mock.calls.length === 0) return null;
  return mock.mock.calls[mock.mock.calls.length - 1][0];
}

// ═══════════════════════════════════════════════════════════════════
// 📧 TEST SUITES
// ═══════════════════════════════════════════════════════════════════

describe('Email System — Professional Integration', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmailIntegrationService();
    // Manually assign fresh transporter mock — avoids nodemailer factory issues
    service.transporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-msg-123' }),
      verify: jest.fn().mockResolvedValue(true),
    };
    service.provider = 'smtp';
    service.initialized = true;
  });

  // ─────────────────────────────────────────────────────────────────
  // 1. Service Initialization
  // ─────────────────────────────────────────────────────────────────

  describe('1. Service Initialization', () => {
    test('should create service instance with correct defaults', () => {
      const s = new EmailIntegrationService();
      expect(s.transporter).toBeNull();
      expect(s.initialized).toBe(false);
      expect(s.provider).toBe('smtp');
      expect(s.stats).toEqual({ sent: 0, failed: 0, queued: 0 });
    });

    test('should initialize with SMTP transporter when credentials exist', () => {
      // resetMocks:true in jest config clears mock implementations between tests
      nodemailer.createTransport.mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-msg-123' }),
        verify: jest.fn().mockResolvedValue(true),
      });
      const s = new EmailIntegrationService();
      s._createTransporter();
      expect(s.provider).toBe('smtp');
      expect(s.transporter).toBeTruthy();
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });

    test('should fall back to mock mode when no credentials', () => {
      const origUser = process.env.SMTP_USER;
      const origPass = process.env.SMTP_PASSWORD;
      const origUser2 = process.env.EMAIL_USER;
      const origPass2 = process.env.EMAIL_PASSWORD;

      process.env.SMTP_USER = '';
      process.env.SMTP_PASSWORD = '';
      process.env.EMAIL_USER = '';
      process.env.EMAIL_PASSWORD = '';

      // Force fresh config read
      const freshModule = jest.isolateModules(() => {
        return require('../services/email-integration.service');
      });
      // Just test the fallback logic
      const s = new EmailIntegrationService();
      // Override config temporarily
      const origConfig = { ...EMAIL_CONFIG.smtp.auth };
      EMAIL_CONFIG.smtp.auth.user = '';
      EMAIL_CONFIG.smtp.auth.pass = '';
      s._createTransporter();
      expect(s.provider).toBe('mock');

      // Restore
      EMAIL_CONFIG.smtp.auth.user = origConfig.user;
      EMAIL_CONFIG.smtp.auth.pass = origConfig.pass;
      process.env.SMTP_USER = origUser;
      process.env.SMTP_PASSWORD = origPass;
      process.env.EMAIL_USER = origUser2 || '';
      process.env.EMAIL_PASSWORD = origPass2 || '';
    });

    test('should verify email service', async () => {
      const result = await service.verify();
      expect(result.success).toBe(true);
    });

    test('should return mock verification when in mock mode', async () => {
      service.provider = 'mock';
      service.transporter = null;
      const result = await service.verify();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Mock');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. Core Send Method
  // ─────────────────────────────────────────────────────────────────

  describe('2. Core Send Method', () => {
    test('should send an email with all options', async () => {
      const result = await service.send({
        to: 'user@test.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
        metadata: { type: 'test' },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('mock-msg-123');
      expect(result.provider).toBe('smtp');
      expect(service.stats.sent).toBe(1);
    });

    test('should reject when no recipient provided', async () => {
      const result = await service.send({ subject: 'No to' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_RECIPIENT');
    });

    test('should handle cc and bcc', async () => {
      const result = await service.send({
        to: 'main@test.com',
        cc: ['cc1@test.com', 'cc2@test.com'],
        bcc: 'bcc@test.com',
        subject: 'CC Test',
        html: '<p>CC</p>',
      });

      expect(result.success).toBe(true);
      const sendMailCall = getLastMailCall(service);
      expect(sendMailCall.cc).toBe('cc1@test.com, cc2@test.com');
      expect(sendMailCall.bcc).toBe('bcc@test.com');
    });

    test('should handle array of recipients', async () => {
      const result = await service.send({
        to: ['a@test.com', 'b@test.com'],
        subject: 'Multi',
        html: '<p>Hi</p>',
      });

      expect(result.success).toBe(true);
      const sendMailCall = getLastMailCall(service);
      expect(sendMailCall.to).toBe('a@test.com, b@test.com');
    });

    test('should increment failed count on error', async () => {
      service.transporter.sendMail.mockRejectedValueOnce(new Error('SMTP Error'));

      const result = await service.send({
        to: 'fail@test.com',
        subject: 'Fail',
        html: '<p>Fail</p>',
        metadata: { autoRetry: false },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP Error');
      expect(service.stats.failed).toBe(1);
    });

    test('should send in mock mode when in dev', async () => {
      service.provider = 'mock';
      service.transporter = null;

      const result = await service.send({
        to: 'mock@test.com',
        subject: 'Mock Test',
        html: '<p>Mock</p>',
        metadata: { autoRetry: false },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock_');
      expect(result.provider).toBe('mock');
    });

    test('should strip HTML for plain text', async () => {
      await service.send({
        to: 'text@test.com',
        subject: 'Text',
        html: '<h1>Title</h1><p>Body content</p>',
      });

      const call = getLastMailCall(service);
      expect(call.text).toBe('Title Body content');
    });

    test('should include attachments when provided', async () => {
      const result = await service.send({
        to: 'attach@test.com',
        subject: 'Attachments',
        html: '<p>See attached</p>',
        attachments: [{ filename: 'report.pdf', content: 'pdf-data' }],
      });

      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.attachments).toHaveLength(1);
      expect(call.attachments[0].filename).toBe('report.pdf');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. Template System
  // ─────────────────────────────────────────────────────────────────

  describe('3. Template System', () => {
    test('should send using a predefined template', async () => {
      const result = await service.sendTemplate('user@test.com', 'WELCOME', {
        name: 'أحمد',
        email: 'user@test.com',
        role: 'admin',
      });

      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.subject).toContain('مرحباً بك');
      expect(call.html).toContain('أحمد');
    });

    test('should error on unknown template', async () => {
      const result = await service.sendTemplate('user@test.com', 'NONEXISTENT', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('TEMPLATE_NOT_FOUND');
    });

    test('should error when no recipient for template', async () => {
      const result = await service.sendTemplate(null, 'WELCOME', {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_RECIPIENT');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. Email Templates (All rendered correctly)
  // ─────────────────────────────────────────────────────────────────

  describe('4. Email Templates', () => {
    test('WELCOME template renders with user data', () => {
      const result = EMAIL_TEMPLATES.WELCOME({ name: 'محمد', email: 'mo@test.com', role: 'معالج' });
      expect(result.subject).toContain('محمد');
      expect(result.html).toContain('محمد');
      expect(result.html).toContain('mo@test.com');
      expect(result.html).toContain('معالج');
      expect(result.html).toContain('dir="rtl"');
    });

    test('PASSWORD_RESET template renders with token', () => {
      const result = EMAIL_TEMPLATES.PASSWORD_RESET({ name: 'سارة' }, 'abc123');
      expect(result.subject).toContain('إعادة تعيين');
      expect(result.html).toContain('سارة');
      expect(result.html).toContain('abc123');
      expect(result.html).toContain('ساعة واحدة');
    });

    test('EMAIL_VERIFICATION template renders with token', () => {
      const result = EMAIL_TEMPLATES.EMAIL_VERIFICATION({ name: 'خالد' }, 'verify-token');
      expect(result.subject).toContain('تأكيد');
      expect(result.html).toContain('خالد');
      expect(result.html).toContain('verify-token');
    });

    test('OTP_CODE template renders OTP with styling', () => {
      const result = EMAIL_TEMPLATES.OTP_CODE({ name: 'فاطمة', username: 'fatima' }, '123456', 10);
      expect(result.subject).toContain('123456');
      expect(result.html).toContain('123456');
      expect(result.html).toContain('10 دقائق');
      expect(result.html).toContain('فاطمة');
    });

    test('TWO_FA_ENABLED template renders correctly', () => {
      const result = EMAIL_TEMPLATES.TWO_FA_ENABLED('user@test.com', 'admin1');
      expect(result.subject).toContain('تفعيل');
      expect(result.html).toContain('admin1');
      expect(result.html).toContain('مفعّل');
    });

    test('TWO_FA_DISABLED template renders correctly', () => {
      const result = EMAIL_TEMPLATES.TWO_FA_DISABLED('user@test.com', 'admin1');
      expect(result.subject).toContain('إلغاء');
      expect(result.html).toContain('admin1');
      expect(result.html).toContain('أقل أماناً');
    });

    test('APPOINTMENT_REMINDER template renders appointment data', () => {
      const result = EMAIL_TEMPLATES.APPOINTMENT_REMINDER({
        patientName: 'علي',
        type: 'جلسة نطق',
        date: new Date('2026-04-15'),
        startTime: '10:00',
        therapistName: 'د. سعود',
        location: 'غرفة 3',
      });
      expect(result.subject).toContain('تذكير');
      expect(result.html).toContain('علي');
      expect(result.html).toContain('جلسة نطق');
      expect(result.html).toContain('د. سعود');
    });

    test('APPOINTMENT_CONFIRMATION template renders', () => {
      const result = EMAIL_TEMPLATES.APPOINTMENT_CONFIRMATION({
        patientName: 'نورة',
        date: new Date(),
        startTime: '14:00',
      });
      expect(result.subject).toContain('تأكيد');
      expect(result.html).toContain('نورة');
      expect(result.html).toContain('مؤكد');
    });

    test('APPOINTMENT_CANCELLATION template renders with reason', () => {
      const result = EMAIL_TEMPLATES.APPOINTMENT_CANCELLATION(
        { patientName: 'أمل', date: new Date() },
        'ظرف طارئ'
      );
      expect(result.subject).toContain('إلغاء');
      expect(result.html).toContain('أمل');
      expect(result.html).toContain('ظرف طارئ');
    });

    test('SESSION_SUMMARY template renders session data', () => {
      const result = EMAIL_TEMPLATES.SESSION_SUMMARY(
        {
          date: new Date(),
          sessionType: 'علاج وظيفي',
          therapistName: 'أ. ريم',
          duration: 45,
          beneficiaryName: 'عبدالله',
          notes: 'تحسن ملحوظ',
          recommendations: 'متابعة أسبوعية',
        },
        { name: 'والد عبدالله' }
      );
      expect(result.subject).toContain('ملخص');
      expect(result.html).toContain('والد عبدالله');
      expect(result.html).toContain('علاج وظيفي');
      expect(result.html).toContain('تحسن ملحوظ');
      expect(result.html).toContain('متابعة أسبوعية');
    });

    test('LEAVE_REQUEST template renders employee leave data', () => {
      const result = EMAIL_TEMPLATES.LEAVE_REQUEST(
        { name: 'سالم', firstName: 'سالم' },
        { type: 'سنوية', startDate: new Date(), endDate: new Date(), duration: 5, reason: 'عائلية' }
      );
      expect(result.subject).toContain('إجازة');
      expect(result.html).toContain('سالم');
      expect(result.html).toContain('سنوية');
    });

    test('LEAVE_STATUS_UPDATE template renders approved status', () => {
      const result = EMAIL_TEMPLATES.LEAVE_STATUS_UPDATE(
        { name: 'مريم' },
        { type: 'مرضية', startDate: new Date(), endDate: new Date(), status: 'approved' }
      );
      expect(result.subject).toContain('مقبولة');
      expect(result.html).toContain('مريم');
    });

    test('LEAVE_STATUS_UPDATE template renders rejected status', () => {
      const result = EMAIL_TEMPLATES.LEAVE_STATUS_UPDATE(
        { name: 'هند' },
        { type: 'طارئة', startDate: new Date(), endDate: new Date(), status: 'rejected' }
      );
      expect(result.subject).toContain('مرفوضة');
    });

    test('SALARY_NOTIFICATION template renders salary data', () => {
      const result = EMAIL_TEMPLATES.SALARY_NOTIFICATION(
        { name: 'فهد' },
        { month: 'مارس 2026', base: 8000, allowances: 2000, deductions: 500, net: 9500 }
      );
      expect(result.subject).toContain('راتب');
      expect(result.html).toContain('فهد');
      expect(result.html).toContain('9500');
    });

    test('ATTENDANCE_ALERT template renders alert', () => {
      const result = EMAIL_TEMPLATES.ATTENDANCE_ALERT(
        { name: 'ناصر' },
        { type: 'absence', date: new Date(), notes: 'بدون إذن' }
      );
      expect(result.subject).toContain('حضور');
      expect(result.html).toContain('ناصر');
      expect(result.html).toContain('غياب');
    });

    test('DOCUMENT_READY template renders', () => {
      const result = EMAIL_TEMPLATES.DOCUMENT_READY(
        { name: 'لمى' },
        { name: 'شهادة خبرة', type: 'مستند رسمي', downloadLink: 'http://test.com/doc' }
      );
      expect(result.subject).toContain('شهادة خبرة');
      expect(result.html).toContain('لمى');
    });

    test('INVOICE template renders invoice data with items table', () => {
      const result = EMAIL_TEMPLATES.INVOICE(
        {
          number: 'INV-001',
          date: new Date(),
          dueDate: new Date(),
          amount: 5000,
          items: [{ description: 'جلسة علاجية', quantity: 10, price: 500 }],
        },
        { name: 'الشركة س' }
      );
      expect(result.subject).toContain('INV-001');
      expect(result.html).toContain('الشركة س');
      expect(result.html).toContain('جلسة علاجية');
      expect(result.html).toContain('5000');
    });

    test('PAYMENT_CONFIRMATION template renders', () => {
      const result = EMAIL_TEMPLATES.PAYMENT_CONFIRMATION({
        customerName: 'عمر',
        amount: 3000,
        method: 'تحويل بنكي',
        transactionId: 'TXN-789',
        date: new Date(),
      });
      expect(result.subject).toContain('3000');
      expect(result.html).toContain('عمر');
      expect(result.html).toContain('TXN-789');
    });

    test('PAYMENT_REMINDER template renders', () => {
      const result = EMAIL_TEMPLATES.PAYMENT_REMINDER({
        number: 'INV-002',
        customerName: 'سامي',
        amount: 2000,
        dueDate: new Date(),
        overdueDays: 15,
      });
      expect(result.subject).toContain('تذكير');
      expect(result.html).toContain('سامي');
      expect(result.html).toContain('15');
    });

    test('ORDER_CONFIRMATION template renders', () => {
      const result = EMAIL_TEMPLATES.ORDER_CONFIRMATION({
        orderId: 'ORD-100',
        date: new Date(),
        totalAmount: 7500,
        items: [{ name: 'مستلزمات طبية', quantity: 5, price: 1500 }],
      });
      expect(result.subject).toContain('ORD-100');
      expect(result.html).toContain('مستلزمات طبية');
    });

    test('ORDER_STATUS_UPDATE template renders all statuses', () => {
      const statuses = ['processing', 'shipped', 'delivered', 'cancelled'];
      for (const status of statuses) {
        const result = EMAIL_TEMPLATES.ORDER_STATUS_UPDATE({
          orderId: 'ORD-200',
          status,
        });
        expect(result.subject).toContain('ORD-200');
        expect(result.html).toContain('ORD-200');
      }
    });

    test('GOV_DOCUMENT_UPDATE template renders all statuses', () => {
      const statuses = ['submitted', 'under_review', 'approved', 'rejected', 'completed'];
      for (const status of statuses) {
        const result = EMAIL_TEMPLATES.GOV_DOCUMENT_UPDATE(
          { name: 'فيصل' },
          { name: 'رخصة نشاط', status, authority: 'وزارة الصحة' }
        );
        expect(result.html).toContain('فيصل');
        expect(result.html).toContain('وزارة الصحة');
      }
    });

    test('REPORT_READY template renders', () => {
      const result = EMAIL_TEMPLATES.REPORT_READY({
        title: 'تقرير شهري',
        period: 'مارس 2026',
        type: 'مالي',
        summary: 'ملخص التقرير',
      });
      expect(result.subject).toContain('تقرير شهري');
      expect(result.html).toContain('ملخص التقرير');
    });

    test('ALERT_NOTIFICATION template renders critical alert', () => {
      const result = EMAIL_TEMPLATES.ALERT_NOTIFICATION({
        title: 'خطأ في النظام',
        message: 'تم اكتشاف مشكلة حرجة',
        severity: 'critical',
        source: 'الخادم الرئيسي',
      });
      expect(result.subject).toContain('🚨');
      expect(result.html).toContain('حرج');
      expect(result.html).toContain('الخادم الرئيسي');
    });

    test('NOTIFICATION template renders generic notification', () => {
      const result = EMAIL_TEMPLATES.NOTIFICATION({
        title: 'إشعار عام',
        message: 'رسالة تجريبية',
        actionUrl: 'http://test.com/action',
        actionText: 'عرض',
      });
      expect(result.subject).toBe('إشعار عام');
      expect(result.html).toContain('رسالة تجريبية');
      expect(result.html).toContain('http://test.com/action');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. HTML Layout & Helpers
  // ─────────────────────────────────────────────────────────────────

  describe('5. HTML Layout & Helpers', () => {
    test('wrapInLayout produces valid RTL HTML', () => {
      const html = wrapInLayout('Test Title', '<p>Body</p>');
      expect(html).toContain('lang="ar"');
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('مركز الأوائل');
      expect(html).toContain('<p>Body</p>');
      expect(html).toContain('جميع الحقوق محفوظة');
    });

    test('wrapInLayout includes preheader when provided', () => {
      const html = wrapInLayout('Title', '<p>Body</p>', { preheader: 'Test preheader' });
      expect(html).toContain('Test preheader');
    });

    test('wrapInLayout hides footer links when disabled', () => {
      const html = wrapInLayout('Title', '<p>Body</p>', { showFooterLinks: false });
      expect(html).not.toContain('/support">الدعم الفني</a>');
    });

    test('buildInfoCard builds rows from key-value pairs', () => {
      const html = buildInfoCard([
        ['الاسم', 'أحمد'],
        ['البريد', 'ahmed@test.com'],
        ['فارغ', ''],
        ['null', null],
      ]);
      expect(html).toContain('الاسم');
      expect(html).toContain('أحمد');
      expect(html).toContain('ahmed@test.com');
      // Empty/null values should be filtered out
      expect(html).not.toContain('فارغ');
    });

    test('buildButton creates styled link', () => {
      const html = buildButton('انقر هنا', 'http://test.com', 'primary');
      expect(html).toContain('http://test.com');
      expect(html).toContain('انقر هنا');
      expect(html).toContain('btn');
    });

    test('buildButton supports different types', () => {
      const html = buildButton('خطر', 'http://test.com', 'danger');
      expect(html).toContain('btn-danger');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 6. System-Specific Send Methods
  // ─────────────────────────────────────────────────────────────────

  describe('6. System-Specific Send Methods', () => {
    // Authentication
    test('sendWelcomeEmail sends to user email', async () => {
      const result = await service.sendWelcomeEmail({ email: 'user@test.com', name: 'أحمد' });
      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.to).toBe('user@test.com');
      expect(call.subject).toContain('مرحباً');
    });

    test('sendPasswordResetEmail includes reset token', async () => {
      const result = await service.sendPasswordResetEmail(
        { email: 'user@test.com', name: 'سارة' },
        'token-xyz'
      );
      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.html).toContain('token-xyz');
    });

    test('sendEmailVerification includes verification token', async () => {
      const result = await service.sendEmailVerification(
        { email: 'user@test.com', name: 'خالد' },
        'v-token'
      );
      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.html).toContain('v-token');
    });

    test('sendOTPEmail sends OTP with high priority', async () => {
      const result = await service.sendOTPEmail(
        { email: 'user@test.com', name: 'فاطمة' },
        '654321'
      );
      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.subject).toContain('654321');
    });

    test('send2FAEnabledEmail sends confirmation', async () => {
      const result = await service.send2FAEnabledEmail('admin@test.com', 'admin1');
      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.to).toBe('admin@test.com');
      expect(call.subject).toContain('تفعيل');
    });

    test('send2FADisabledEmail sends warning', async () => {
      const result = await service.send2FADisabledEmail('admin@test.com', 'admin1');
      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.subject).toContain('إلغاء');
    });

    // Appointments
    test('sendAppointmentReminder sends to patient email', async () => {
      const result = await service.sendAppointmentReminder({
        email: 'patient@test.com',
        patientName: 'علي',
        date: new Date(),
        type: 'جلسة نطق',
      });
      expect(result.success).toBe(true);
    });

    test('sendAppointmentReminder fails when no email', async () => {
      const result = await service.sendAppointmentReminder({ patientName: 'Test' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_EMAIL');
    });

    test('sendAppointmentConfirmation sends confirmation', async () => {
      const result = await service.sendAppointmentConfirmation({
        email: 'patient@test.com',
        patientName: 'نورة',
        date: new Date(),
      });
      expect(result.success).toBe(true);
    });

    test('sendAppointmentCancellation sends with reason', async () => {
      const result = await service.sendAppointmentCancellation(
        { email: 'patient@test.com', patientName: 'أمل', date: new Date() },
        'ظرف طارئ'
      );
      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.html).toContain('ظرف طارئ');
    });

    test('sendSessionSummary sends to guardian email', async () => {
      const result = await service.sendSessionSummary(
        { date: new Date(), sessionType: 'علاج وظيفي', beneficiaryName: 'عبدالله' },
        { email: 'guardian@test.com', name: 'والد عبدالله' }
      );
      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.to).toBe('guardian@test.com');
    });

    // HR
    test('sendLeaveRequest sends to HR email', async () => {
      const origHR = process.env.HR_EMAIL;
      process.env.HR_EMAIL = 'hr@test.com';

      const result = await service.sendLeaveRequest(
        { name: 'سالم', email: 'salem@test.com' },
        { type: 'سنوية', startDate: new Date(), endDate: new Date() }
      );
      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.to).toBe('hr@test.com');

      process.env.HR_EMAIL = origHR || '';
    });

    test('sendSalaryNotification sends to employee', async () => {
      const result = await service.sendSalaryNotification(
        { email: 'emp@test.com', name: 'فهد' },
        { month: 'مارس 2026', net: 9500 }
      );
      expect(result.success).toBe(true);
    });

    test('sendAttendanceAlert sends to employee', async () => {
      const result = await service.sendAttendanceAlert(
        { email: 'emp@test.com', name: 'ناصر' },
        { type: 'late', date: new Date() }
      );
      expect(result.success).toBe(true);
    });

    test('sendEmployeeNotification sends custom notification', async () => {
      const result = await service.sendEmployeeNotification(
        { email: 'emp@test.com', name: 'موظف' },
        'تحديث'
      );
      expect(result.success).toBe(true);
    });

    // Finance
    test('sendInvoiceEmail sends invoice with PDF attachment', async () => {
      const result = await service.sendInvoiceEmail(
        { number: 'INV-001', date: new Date(), amount: 5000, pdf: 'pdf-content' },
        { email: 'client@test.com', name: 'العميل' }
      );
      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.attachments).toHaveLength(1);
      expect(call.attachments[0].filename).toContain('INV-001');
    });

    test('sendPaymentConfirmation sends receipt', async () => {
      const result = await service.sendPaymentConfirmation({
        email: 'payer@test.com',
        customerName: 'عمر',
        amount: 3000,
        transactionId: 'TXN-789',
      });
      expect(result.success).toBe(true);
    });

    test('sendPaymentReminder sends reminder', async () => {
      const result = await service.sendPaymentReminder({
        email: 'debtor@test.com',
        customerName: 'سامي',
        number: 'INV-002',
        amount: 2000,
        dueDate: new Date(),
      });
      expect(result.success).toBe(true);
    });

    // Supply Chain
    test('sendOrderConfirmation sends order confirmation', async () => {
      const result = await service.sendOrderConfirmation({
        email: 'buyer@test.com',
        orderId: 'ORD-100',
      });
      expect(result.success).toBe(true);
    });

    test('sendOrderStatusUpdate sends status update', async () => {
      const result = await service.sendOrderStatusUpdate({
        email: 'buyer@test.com',
        orderId: 'ORD-200',
        status: 'shipped',
      });
      expect(result.success).toBe(true);
    });

    // Government
    test('sendGovDocumentUpdate sends gov update', async () => {
      const result = await service.sendGovDocumentUpdate(
        { email: 'user@test.com', name: 'فيصل' },
        { name: 'رخصة', status: 'approved', authority: 'وزارة الصحة' }
      );
      expect(result.success).toBe(true);
    });

    // Reports
    test('sendReportReady sends report notification', async () => {
      const result = await service.sendReportReady({ title: 'تقرير', email: 'mgr@test.com' });
      expect(result.success).toBe(true);
    });

    test('sendAlertNotification sends alert with priority', async () => {
      const result = await service.sendAlertNotification({
        title: 'تنبيه',
        message: 'مشكلة',
        severity: 'critical',
        email: 'admin@test.com',
      });
      expect(result.success).toBe(true);
    });

    // General
    test('sendNotification sends generic notification', async () => {
      const result = await service.sendNotification('user@test.com', 'رسالة تجريبية');
      expect(result.success).toBe(true);
    });

    test('sendNotification accepts object format', async () => {
      const result = await service.sendNotification('user@test.com', {
        title: 'إشعار',
        message: 'محتوى الإشعار',
      });
      expect(result.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 7. Bulk Sending
  // ─────────────────────────────────────────────────────────────────

  describe('7. Bulk Sending', () => {
    test('should send bulk emails to multiple recipients', async () => {
      const result = await service.sendBulk(
        [
          { email: 'a@test.com', name: 'أحمد' },
          { email: 'b@test.com', name: 'سارة' },
          { email: 'c@test.com', name: 'خالد' },
        ],
        {
          subject: 'إشعار جماعي',
          html: '<p>مرحباً</p>',
        }
      );

      expect(result.total).toBe(3);
      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
    });

    test('should send bulk using template name', async () => {
      const result = await service.sendBulk(
        [
          { email: 'a@test.com', name: 'أحمد' },
          { email: 'b@test.com', name: 'سارة' },
        ],
        'WELCOME'
      );

      expect(result.total).toBe(2);
      expect(result.sent).toBe(2);
    });

    test('should handle recipients with no email', async () => {
      const result = await service.sendBulk(
        [
          { email: 'a@test.com', name: 'Valid' },
          { name: 'No Email' }, // No email
        ],
        { subject: 'Test', html: '<p>Hi</p>' }
      );

      expect(result.total).toBe(2);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
    });

    test('should accept string recipients', async () => {
      const result = await service.sendBulk(['simple@test.com', 'another@test.com'], {
        subject: 'Simple',
        html: '<p>Simple</p>',
      });

      expect(result.total).toBe(2);
      expect(result.sent).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 8. Rate Limiting
  // ─────────────────────────────────────────────────────────────────

  describe('8. Rate Limiting', () => {
    test('should track rate limits', () => {
      service._trackRateLimit();
      expect(service.rateLimits.minute.length).toBe(1);
      expect(service.rateLimits.hour.length).toBe(1);
      expect(service.rateLimits.day.length).toBe(1);
    });

    test('should pass rate limit check when under limits', () => {
      expect(service._checkRateLimit()).toBe(true);
    });

    test('should enforce minute rate limit', () => {
      const now = Date.now();
      // Fill up minute limit
      for (let i = 0; i < EMAIL_CONFIG.rateLimit.maxPerMinute; i++) {
        service.rateLimits.minute.push(now);
      }
      expect(service._checkRateLimit()).toBe(false);
    });

    test('should clean expired rate limits', () => {
      const old = Date.now() - 120000; // 2 minutes ago
      service.rateLimits.minute = [old, old, old];
      expect(service._checkRateLimit()).toBe(true);
      expect(service.rateLimits.minute.length).toBe(0); // Cleaned
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 9. WebSocket Integration
  // ─────────────────────────────────────────────────────────────────

  describe('9. WebSocket Integration', () => {
    test('should emit realtime events when wsManager is set', async () => {
      const mockBroadcast = jest.fn();
      service.wsManager = { broadcast: mockBroadcast };

      await service.send({
        to: 'user@test.com',
        subject: 'WS Test',
        html: '<p>Test</p>',
      });

      expect(mockBroadcast).toHaveBeenCalledWith(
        'email:sent',
        expect.objectContaining({
          to: 'user@test.com',
          provider: 'smtp',
        })
      );
    });

    test('should not throw when wsManager is not set', async () => {
      service.wsManager = null;
      await expect(
        service.send({
          to: 'user@test.com',
          subject: 'No WS',
          html: '<p>Test</p>',
        })
      ).resolves.toBeTruthy();
    });

    test('notifySendResult emits to wsManager', () => {
      const mockBroadcast = jest.fn();
      service.wsManager = { broadcast: mockBroadcast };

      service.notifySendResult('user@test.com', { success: true });
      expect(mockBroadcast).toHaveBeenCalledWith(
        'email:send-result',
        expect.objectContaining({
          to: 'user@test.com',
          success: true,
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 10. Statistics & Health
  // ─────────────────────────────────────────────────────────────────

  describe('10. Statistics & Health', () => {
    test('should return current stats', async () => {
      // Send a few emails to build stats
      await service.send({ to: 'a@t.com', subject: 'S1', html: '<p>1</p>' });
      await service.send({ to: 'b@t.com', subject: 'S2', html: '<p>2</p>' });

      const stats = await service.getStats();
      expect(stats.provider).toBe('smtp');
      expect(stats.initialized).toBe(true);
      expect(stats.sent).toBe(2);
      expect(stats.rateLimit).toBeDefined();
      expect(stats.rateLimit.minuteUsed).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 11. Queue System (without DB)
  // ─────────────────────────────────────────────────────────────────

  describe('11. Queue System', () => {
    test('should return NO_QUEUE when no model available', async () => {
      const result = await service.enqueue({
        to: 'queued@test.com',
        subject: 'Queue Test',
        html: '<p>Queue</p>',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_QUEUE');
    });

    test('processQueue returns 0 when no model', async () => {
      const result = await service.processQueue();
      expect(result.processed).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 12. Singleton Export
  // ─────────────────────────────────────────────────────────────────

  describe('12. Singleton Export', () => {
    test('emailIntegration is an instance of EmailIntegrationService', () => {
      expect(emailIntegration).toBeInstanceOf(EmailIntegrationService);
    });

    test('EMAIL_TEMPLATES has all required templates', () => {
      const expectedTemplates = [
        'WELCOME',
        'PASSWORD_RESET',
        'EMAIL_VERIFICATION',
        'OTP_CODE',
        'TWO_FA_ENABLED',
        'TWO_FA_DISABLED',
        'APPOINTMENT_REMINDER',
        'APPOINTMENT_CONFIRMATION',
        'APPOINTMENT_CANCELLATION',
        'SESSION_SUMMARY',
        'LEAVE_REQUEST',
        'LEAVE_STATUS_UPDATE',
        'SALARY_NOTIFICATION',
        'ATTENDANCE_ALERT',
        'DOCUMENT_READY',
        'INVOICE',
        'PAYMENT_CONFIRMATION',
        'PAYMENT_REMINDER',
        'ORDER_CONFIRMATION',
        'ORDER_STATUS_UPDATE',
        'GOV_DOCUMENT_UPDATE',
        'REPORT_READY',
        'ALERT_NOTIFICATION',
        'NOTIFICATION',
      ];

      for (const name of expectedTemplates) {
        expect(EMAIL_TEMPLATES[name]).toBeDefined();
        expect(typeof EMAIL_TEMPLATES[name]).toBe('function');
      }
    });

    test('EMAIL_CONFIG has proper defaults', () => {
      expect(EMAIL_CONFIG.smtp).toBeDefined();
      expect(EMAIL_CONFIG.sendgrid).toBeDefined();
      expect(EMAIL_CONFIG.defaults).toBeDefined();
      expect(EMAIL_CONFIG.rateLimit).toBeDefined();
      expect(EMAIL_CONFIG.retry).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 13. Edge Cases & Error Handling
  // ─────────────────────────────────────────────────────────────────

  describe('13. Edge Cases & Error Handling', () => {
    test('should handle undefined/null data gracefully in templates', () => {
      // Templates should not throw with minimal data
      expect(() => EMAIL_TEMPLATES.WELCOME({})).not.toThrow();
      expect(() => EMAIL_TEMPLATES.PASSWORD_RESET({}, '')).not.toThrow();
      expect(() => EMAIL_TEMPLATES.OTP_CODE({}, '', 5)).not.toThrow();
      expect(() => EMAIL_TEMPLATES.APPOINTMENT_REMINDER({})).not.toThrow();
      expect(() => EMAIL_TEMPLATES.INVOICE({}, {})).not.toThrow();
      expect(() => EMAIL_TEMPLATES.NOTIFICATION({})).not.toThrow();
    });

    test('should handle invalid dates gracefully', () => {
      const result = EMAIL_TEMPLATES.APPOINTMENT_REMINDER({
        patientName: 'Test',
        date: 'invalid-date',
      });
      expect(result.html).toContain('غير محدد');
    });

    test('sendDocumentReady fails with no email', async () => {
      const result = await service.sendDocumentReady({}, { name: 'Doc' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_EMAIL');
    });

    test('sendSessionSummary fails with no guardian email', async () => {
      const result = await service.sendSessionSummary({}, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_EMAIL');
    });

    test('sendOrderConfirmation fails with no email', async () => {
      const result = await service.sendOrderConfirmation({ orderId: 'ORD-1' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_EMAIL');
    });

    test('sendInvoiceEmail without pdf omits attachment', async () => {
      const result = await service.sendInvoiceEmail(
        { number: 'INV-X', date: new Date(), amount: 100 },
        { email: 'c@test.com' }
      );
      expect(result.success).toBe(true);
      const call = getLastMailCall(service);
      expect(call.attachments).toBeUndefined();
    });

    test('sendLeaveRequest fails when no HR email configured', async () => {
      const orig = process.env.HR_EMAIL;
      process.env.HR_EMAIL = '';
      const result = await service.sendLeaveRequest(
        { name: 'Test' },
        { type: 'Test', managerEmail: '' }
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe('NO_HR_EMAIL');
      process.env.HR_EMAIL = orig || '';
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// 📧 NOTIFICATION CENTER BRIDGE TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Email System — NotificationCenter Bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('NotificationCenter.sendEmail calls emailIntegration', async () => {
    // Mock the email integration service
    jest.mock('../services/email-integration.service', () => ({
      emailIntegration: {
        sendNotification: jest.fn().mockResolvedValue({ success: true }),
      },
    }));

    // Need to clear cache to get fresh require with our mock
    jest.resetModules();

    // Re-mock logger (lost after resetModules)
    jest.mock('../utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    // Mock whatsapp dependency
    jest.mock('../services/whatsapp-integration.service', () => ({
      whatsappIntegration: {
        sendNotification: jest.fn().mockResolvedValue({ success: true }),
      },
    }));

    const NC = require('../services/notificationCenter.service');
    const result = await NC.sendEmail('test@test.com', 'Subject', 'Body');
    expect(result).toBe('SENT');
  });

  test('NotificationCenter.sendEmail returns FAILED on error', async () => {
    jest.resetModules();

    jest.mock('../services/email-integration.service', () => ({
      emailIntegration: {
        sendNotification: jest.fn().mockRejectedValue(new Error('SMTP down')),
      },
    }));

    jest.mock('../utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    jest.mock('../services/whatsapp-integration.service', () => ({
      whatsappIntegration: {
        sendNotification: jest.fn().mockResolvedValue({ success: true }),
      },
    }));

    const NC = require('../services/notificationCenter.service');
    const result = await NC.sendEmail('test@test.com', 'Subject', 'Body');
    expect(result).toBe('FAILED');
  });

  test('NotificationCenter.sendEmail returns FAILED when no email', async () => {
    jest.resetModules();

    jest.mock('../services/email-integration.service', () => ({
      emailIntegration: {
        sendNotification: jest.fn(),
      },
    }));

    jest.mock('../utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    jest.mock('../services/whatsapp-integration.service', () => ({
      whatsappIntegration: {
        sendNotification: jest.fn().mockResolvedValue({ success: true }),
      },
    }));

    const NC = require('../services/notificationCenter.service');
    const result = await NC.sendEmail(null, 'Subject', 'Body');
    expect(result).toBe('FAILED');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 📧 LEGACY emailService.js 2FA BRIDGE TESTS
// ═══════════════════════════════════════════════════════════════════

describe('Email System — emailService 2FA Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('send2FAEnabledEmail delegates to emailIntegration', async () => {
    jest.mock('../services/email-integration.service', () => ({
      emailIntegration: {
        send2FAEnabledEmail: jest.fn().mockResolvedValue({ success: true }),
      },
    }));

    jest.mock('nodemailer', () => ({
      createTransport: jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      })),
    }));

    jest.mock('../utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    const { send2FAEnabledEmail } = require('../services/emailService');
    expect(send2FAEnabledEmail).toBeDefined();
    expect(typeof send2FAEnabledEmail).toBe('function');

    const result = await send2FAEnabledEmail('admin@test.com', 'admin1');
    expect(result.success).toBe(true);
  });

  test('send2FADisabledEmail delegates to emailIntegration', async () => {
    jest.mock('../services/email-integration.service', () => ({
      emailIntegration: {
        send2FADisabledEmail: jest.fn().mockResolvedValue({ success: true }),
      },
    }));

    jest.mock('nodemailer', () => ({
      createTransport: jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      })),
    }));

    jest.mock('../utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    const { send2FADisabledEmail } = require('../services/emailService');
    expect(send2FADisabledEmail).toBeDefined();
    expect(typeof send2FADisabledEmail).toBe('function');

    const result = await send2FADisabledEmail('admin@test.com', 'admin1');
    expect(result.success).toBe(true);
  });

  test('send2FA methods handle errors gracefully', async () => {
    jest.mock('../services/email-integration.service', () => ({
      emailIntegration: {
        send2FAEnabledEmail: jest.fn().mockRejectedValue(new Error('fail')),
        send2FADisabledEmail: jest.fn().mockRejectedValue(new Error('fail')),
      },
    }));

    jest.mock('nodemailer', () => ({
      createTransport: jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      })),
    }));

    jest.mock('../utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    const { send2FAEnabledEmail, send2FADisabledEmail } = require('../services/emailService');

    const r1 = await send2FAEnabledEmail('a@b.com', 'user');
    expect(r1.success).toBe(false);

    const r2 = await send2FADisabledEmail('a@b.com', 'user');
    expect(r2.success).toBe(false);
  });
});

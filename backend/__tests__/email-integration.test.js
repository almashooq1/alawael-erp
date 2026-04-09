/**
 * Email Integration Tests — اختبارات تكامل نظام البريد الإلكتروني
 *
 * Tests that the unified email system is properly integrated with:
 * - Auth system (welcome, login alert, password reset, password change)
 * - HR system (leave request, leave approval, attendance, performance review, salary)
 * - Finance system (invoice, payment, expense, large transaction alerts)
 * - Notifications service (email delivery channel)
 * - Cross-Module subscribers (event-driven email delivery)
 * - Email Event Bridge
 * - Email Scheduler
 */

'use strict';

// ── Test Environment ──────────────────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.EMAIL_ENABLED = 'false';
process.env.EMAIL_PROVIDER = 'smtp';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '2525';
process.env.HR_MANAGER_EMAIL = 'hr@test.com';
process.env.FINANCE_MANAGER_EMAIL = 'finance@test.com';
process.env.CARE_TEAM_EMAIL = 'care@test.com';
process.env.ADMIN_ALERT_EMAIL = 'admin@test.com';
process.env.LARGE_TRANSACTION_THRESHOLD = '50000';
process.env.WORK_START_HOUR = '8';

const nodemailer = require('nodemailer');

// Mock nodemailer
jest.mock('nodemailer', () => {
  const sendMailMock = jest.fn().mockResolvedValue({
    messageId: 'test-msg-id',
    accepted: ['test@test.com'],
    rejected: [],
  });
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: sendMailMock,
      verify: jest.fn().mockResolvedValue(true),
    }),
  };
});

// ══════════════════════════════════════════════════════════════════════════
//  1. EMAIL SYSTEM MODULE STRUCTURE
// ══════════════════════════════════════════════════════════════════════════

describe('Email System Module Structure', () => {
  let emailModule;

  beforeAll(() => {
    emailModule = require('../services/email');
  });

  test('should export emailManager singleton', () => {
    expect(emailModule.emailManager).toBeDefined();
    expect(typeof emailModule.emailManager.send).toBe('function');
  });

  test('should export EmailManager class', () => {
    expect(emailModule.EmailManager).toBeDefined();
    expect(typeof emailModule.EmailManager).toBe('function');
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

  test('should export EmailEventBridge', () => {
    expect(emailModule.EmailEventBridge).toBeDefined();
  });

  test('should export EmailScheduler', () => {
    expect(emailModule.EmailScheduler).toBeDefined();
  });

  test('should export helper functions', () => {
    expect(typeof emailModule.sendEmail).toBe('function');
    expect(typeof emailModule.sendTemplate).toBe('function');
    expect(typeof emailModule.sendBulk).toBe('function');
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  2. EMAIL MANAGER INTEGRATION METHODS
// ══════════════════════════════════════════════════════════════════════════

describe('EmailManager Integration Methods', () => {
  let emailManager;

  beforeAll(() => {
    process.env.EMAIL_ENABLED = 'true';
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({
          messageId: 'test-msg-id',
          accepted: ['test@test.com'],
          rejected: [],
        }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const { emailManager: em } = require('../services/email');
    emailManager = em;
  });

  afterAll(() => {
    process.env.EMAIL_ENABLED = 'false';
  });

  // Auth integration methods
  test('should have sendWelcome method', () => {
    expect(typeof emailManager.sendWelcome).toBe('function');
  });

  test('should have sendPasswordReset method', () => {
    expect(typeof emailManager.sendPasswordReset).toBe('function');
  });

  test('should have sendLoginAlert method', () => {
    expect(typeof emailManager.sendLoginAlert).toBe('function');
  });

  test('should have sendOTP method', () => {
    expect(typeof emailManager.sendOTP).toBe('function');
  });

  test('should have sendAccountLocked method', () => {
    expect(typeof emailManager.sendAccountLocked).toBe('function');
  });

  test('should have sendEmailVerification method', () => {
    expect(typeof emailManager.sendEmailVerification).toBe('function');
  });

  // HR integration methods
  test('should have sendLeaveRequest method', () => {
    expect(typeof emailManager.sendLeaveRequest).toBe('function');
  });

  test('should have sendLeaveStatus method', () => {
    expect(typeof emailManager.sendLeaveStatus).toBe('function');
  });

  test('should have sendSalaryNotification method', () => {
    expect(typeof emailManager.sendSalaryNotification).toBe('function');
  });

  test('should have sendAttendanceAlert method', () => {
    expect(typeof emailManager.sendAttendanceAlert).toBe('function');
  });

  // Finance integration methods
  test('should have sendInvoice method', () => {
    expect(typeof emailManager.sendInvoice).toBe('function');
  });

  test('should have sendPaymentConfirmation method', () => {
    expect(typeof emailManager.sendPaymentConfirmation).toBe('function');
  });

  test('should have sendPaymentReminder method', () => {
    expect(typeof emailManager.sendPaymentReminder).toBe('function');
  });

  test('should have sendApprovalRequest method', () => {
    expect(typeof emailManager.sendApprovalRequest).toBe('function');
  });

  // General integration methods
  test('should have sendNotification method', () => {
    expect(typeof emailManager.sendNotification).toBe('function');
  });

  test('should have sendAlert method', () => {
    expect(typeof emailManager.sendAlert).toBe('function');
  });

  test('should have sendStatusChange method', () => {
    expect(typeof emailManager.sendStatusChange).toBe('function');
  });

  test('should have sendDailyDigest method', () => {
    expect(typeof emailManager.sendDailyDigest).toBe('function');
  });

  test('should have send2FAEnabled method', () => {
    expect(typeof emailManager.send2FAEnabled).toBe('function');
  });

  test('should have send2FADisabled method', () => {
    expect(typeof emailManager.send2FADisabled).toBe('function');
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  3. EMAIL EVENT BRIDGE
// ══════════════════════════════════════════════════════════════════════════

describe('EmailEventBridge', () => {
  let EmailEventBridge, mockEmailManager;

  beforeAll(() => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    ({ EmailEventBridge } = require('../services/email'));
  });

  beforeEach(() => {
    mockEmailManager = {
      sendWelcome: jest.fn().mockResolvedValue({ success: true }),
      sendPasswordReset: jest.fn().mockResolvedValue({ success: true }),
      sendLoginAlert: jest.fn().mockResolvedValue({ success: true }),
      sendLeaveRequest: jest.fn().mockResolvedValue({ success: true }),
      sendLeaveStatus: jest.fn().mockResolvedValue({ success: true }),
      sendSalaryNotification: jest.fn().mockResolvedValue({ success: true }),
      sendAttendanceAlert: jest.fn().mockResolvedValue({ success: true }),
      sendInvoice: jest.fn().mockResolvedValue({ success: true }),
      sendPaymentConfirmation: jest.fn().mockResolvedValue({ success: true }),
      sendAlert: jest.fn().mockResolvedValue({ success: true }),
      sendNotification: jest.fn().mockResolvedValue({ success: true }),
    };
  });

  test('should create instance with emailManager', () => {
    const bridge = new EmailEventBridge(mockEmailManager);
    expect(bridge).toBeDefined();
  });

  test('should have connect method', () => {
    const bridge = new EmailEventBridge(mockEmailManager);
    expect(typeof bridge.connect).toBe('function');
  });

  test('should connect to event bus without errors', () => {
    const bridge = new EmailEventBridge(mockEmailManager);
    const mockBus = { on: jest.fn(), subscribe: jest.fn() };
    expect(() => bridge.connect({ bus: mockBus })).not.toThrow();
  });

  test('should track stats', () => {
    const bridge = new EmailEventBridge(mockEmailManager);
    expect(bridge._stats).toBeDefined();
    expect(bridge._stats.received).toBe(0);
  });

  test('should be disableable via _enabled flag', () => {
    const bridge = new EmailEventBridge(mockEmailManager);
    bridge._enabled = false;
    const mockBus = { on: jest.fn(), subscribe: jest.fn() };
    bridge.connect({ bus: mockBus });
    // When disabled, _bus should not be set
    expect(bridge._bus).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  4. EMAIL SCHEDULER
// ══════════════════════════════════════════════════════════════════════════

describe('EmailScheduler', () => {
  let EmailScheduler, mockEmailManager;

  beforeAll(() => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    ({ EmailScheduler } = require('../services/email'));
  });

  beforeEach(() => {
    mockEmailManager = {
      processQueue: jest.fn().mockResolvedValue({ processed: 0 }),
      sendDailyDigest: jest.fn().mockResolvedValue({ success: true }),
      sendPaymentReminder: jest.fn().mockResolvedValue({ success: true }),
    };
  });

  test('should create scheduler instance', () => {
    const scheduler = new EmailScheduler(mockEmailManager);
    expect(scheduler).toBeDefined();
  });

  test('should have start method', () => {
    const scheduler = new EmailScheduler(mockEmailManager);
    expect(typeof scheduler.start).toBe('function');
  });

  test('should have stop method', () => {
    const scheduler = new EmailScheduler(mockEmailManager);
    expect(typeof scheduler.stop).toBe('function');
  });

  test('should start and stop without errors', () => {
    const scheduler = new EmailScheduler(mockEmailManager);
    expect(() => scheduler.start()).not.toThrow();
    expect(() => scheduler.stop()).not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  5. BACKWARD COMPATIBILITY WRAPPER
// ══════════════════════════════════════════════════════════════════════════

describe('Backward Compatibility (email-compat)', () => {
  let compat;

  beforeAll(() => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({
          messageId: 'test-msg-id',
          accepted: ['test@test.com'],
          rejected: [],
        }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    compat = require('../services/email-compat');
  });

  test('should export sendEmail function', () => {
    expect(typeof compat.sendEmail).toBe('function');
  });

  test('should export sendWelcomeEmail function', () => {
    expect(typeof compat.sendWelcomeEmail).toBe('function');
  });

  test('should export sendPasswordResetEmail function', () => {
    expect(typeof compat.sendPasswordResetEmail).toBe('function');
  });

  test('should export sendOTPEmail function', () => {
    expect(typeof compat.sendOTPEmail).toBe('function');
  });

  test('should export sendEmail as a callable function', () => {
    expect(typeof compat.sendEmail).toBe('function');
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  6. CROSS-MODULE SUBSCRIBERS (Email Subscribers)
// ══════════════════════════════════════════════════════════════════════════

describe('Cross-Module Email Subscribers', () => {
  let createSubscribers;

  beforeAll(() => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    ({ createSubscribers } = require('../integration/crossModuleSubscribers'));
  });

  test('should create subscribers array', () => {
    const mockBus = {
      subscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(true),
    };
    const mockConnector = {
      hasService: jest.fn().mockReturnValue(false),
      invoke: jest.fn().mockResolvedValue(true),
    };
    const subs = createSubscribers(mockBus, mockConnector);
    expect(Array.isArray(subs)).toBe(true);
    expect(subs.length).toBeGreaterThan(0);
  });

  test('should include email subscribers', () => {
    const mockBus = {
      subscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(true),
    };
    const subs = createSubscribers(mockBus, null);
    const emailSubs = subs.filter(s => s.name.includes('email'));
    expect(emailSubs.length).toBeGreaterThan(0);
  });

  test('should include auth:locked → email:alert subscriber', () => {
    const mockBus = {
      subscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(true),
    };
    const subs = createSubscribers(mockBus, null);
    const authLocked = subs.find(s => s.name.includes('auth:locked'));
    expect(authLocked).toBeDefined();
    expect(authLocked.pattern).toBe('auth.account.locked');
  });

  test('should include finance:budget_alert → email subscriber', () => {
    const mockBus = {
      subscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(true),
    };
    const subs = createSubscribers(mockBus, null);
    const budgetAlert = subs.find(s => s.name.includes('finance:budget_alert'));
    expect(budgetAlert).toBeDefined();
    expect(budgetAlert.pattern).toBe('finance.budget.threshold_reached');
  });

  test('should include system:error → email:alert subscriber', () => {
    const mockBus = {
      subscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(true),
    };
    const subs = createSubscribers(mockBus, null);
    const sysError = subs.find(s => s.name.includes('system:error'));
    expect(sysError).toBeDefined();
    expect(sysError.pattern).toBe('system.error.*');
  });

  test('should include hr:hired → email:welcome subscriber', () => {
    const mockBus = {
      subscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(true),
    };
    const subs = createSubscribers(mockBus, null);
    const welcomeSub = subs.find(s => s.name.includes('hr:hired → email:welcome'));
    expect(welcomeSub).toBeDefined();
  });

  test('should initialize subscribers successfully', () => {
    const { initializeCrossModuleSubscribers } = require('../integration/crossModuleSubscribers');
    const mockBus = {
      subscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(true),
    };
    const result = initializeCrossModuleSubscribers(mockBus);
    expect(result.subscriberCount).toBeGreaterThan(0);
    expect(result.subscribers.length).toBeGreaterThan(0);
  });

  test('should handle missing integration bus gracefully', () => {
    const { initializeCrossModuleSubscribers } = require('../integration/crossModuleSubscribers');
    const result = initializeCrossModuleSubscribers(null);
    expect(result.subscriberCount).toBe(0);
    expect(result.subscribers).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  7. AUTH ROUTES EMAIL INTEGRATION
// ══════════════════════════════════════════════════════════════════════════

describe('Auth Routes Email Integration', () => {
  test('auth.routes.js should import unified email system', () => {
    const fs = require('fs');
    const path = require('path');
    const authCode = fs.readFileSync(path.join(__dirname, '../api/routes/auth.routes.js'), 'utf8');

    // Should use new unified email system
    expect(authCode).toContain("require('../../services/email')");
    expect(authCode).toContain('emailManager');

    // Should NOT use old emailService
    expect(authCode).not.toContain("emailService = require('../../services/emailService')");
  });

  test('auth.routes.js should send welcome email on registration', () => {
    const fs = require('fs');
    const path = require('path');
    const authCode = fs.readFileSync(path.join(__dirname, '../api/routes/auth.routes.js'), 'utf8');

    expect(authCode).toContain('sendWelcome');
    expect(authCode).toContain('Send welcome email');
  });

  test('auth.routes.js should send login alert', () => {
    const fs = require('fs');
    const path = require('path');
    const authCode = fs.readFileSync(path.join(__dirname, '../api/routes/auth.routes.js'), 'utf8');

    expect(authCode).toContain('sendLoginAlert');
    expect(authCode).toContain('Send login alert email');
  });

  test('auth.routes.js should send password change notification', () => {
    const fs = require('fs');
    const path = require('path');
    const authCode = fs.readFileSync(path.join(__dirname, '../api/routes/auth.routes.js'), 'utf8');

    expect(authCode).toContain('تم تغيير كلمة المرور');
    expect(authCode).toContain('Send password change notification');
  });

  test('auth.routes.js should use emailManager for forgot-password', () => {
    const fs = require('fs');
    const path = require('path');
    const authCode = fs.readFileSync(path.join(__dirname, '../api/routes/auth.routes.js'), 'utf8');

    expect(authCode).toContain('.sendPasswordReset(user.email');
  });

  test('auth.routes.js should send reset confirmation', () => {
    const fs = require('fs');
    const path = require('path');
    const authCode = fs.readFileSync(path.join(__dirname, '../api/routes/auth.routes.js'), 'utf8');

    expect(authCode).toContain('تم إعادة تعيين كلمة المرور');
    expect(authCode).toContain('Send password reset confirmation');
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  8. HR ROUTES EMAIL INTEGRATION
// ══════════════════════════════════════════════════════════════════════════

describe('HR Routes Email Integration', () => {
  test('hrSystem.real.routes.js should import unified email system', () => {
    const fs = require('fs');
    const path = require('path');
    const hrCode = fs.readFileSync(
      path.join(__dirname, '../routes/hrSystem.real.routes.js'),
      'utf8'
    );

    expect(hrCode).toContain("require('../services/email')");
    expect(hrCode).toContain('emailManager');
  });

  test('should have leave request email notification', () => {
    const fs = require('fs');
    const path = require('path');
    const hrCode = fs.readFileSync(
      path.join(__dirname, '../routes/hrSystem.real.routes.js'),
      'utf8'
    );

    expect(hrCode).toContain('sendLeaveRequest');
    expect(hrCode).toContain('HR_MANAGER_EMAIL');
  });

  test('should have leave approval/rejection endpoint with email', () => {
    const fs = require('fs');
    const path = require('path');
    const hrCode = fs.readFileSync(
      path.join(__dirname, '../routes/hrSystem.real.routes.js'),
      'utf8'
    );

    expect(hrCode).toContain('/leaves/:id/status');
    expect(hrCode).toContain('sendLeaveStatus');
  });

  test('should have attendance alert for late arrivals', () => {
    const fs = require('fs');
    const path = require('path');
    const hrCode = fs.readFileSync(
      path.join(__dirname, '../routes/hrSystem.real.routes.js'),
      'utf8'
    );

    expect(hrCode).toContain('sendAttendanceAlert');
    expect(hrCode).toContain('WORK_START_HOUR');
  });

  test('should have performance review email notification', () => {
    const fs = require('fs');
    const path = require('path');
    const hrCode = fs.readFileSync(
      path.join(__dirname, '../routes/hrSystem.real.routes.js'),
      'utf8'
    );

    expect(hrCode).toContain('تقييم أداء جديد');
    expect(hrCode).toContain('sendNotification');
  });

  test('should have salary notification endpoint', () => {
    const fs = require('fs');
    const path = require('path');
    const hrCode = fs.readFileSync(
      path.join(__dirname, '../routes/hrSystem.real.routes.js'),
      'utf8'
    );

    expect(hrCode).toContain('/payroll/notify');
    expect(hrCode).toContain('sendSalaryNotification');
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  9. FINANCE ROUTES EMAIL INTEGRATION
// ══════════════════════════════════════════════════════════════════════════

describe('Finance Routes Email Integration', () => {
  test('finance.routes.unified.js should import unified email system', () => {
    const fs = require('fs');
    const path = require('path');
    const finCode = fs.readFileSync(
      path.join(__dirname, '../routes/finance.routes.unified.js'),
      'utf8'
    );

    expect(finCode).toContain("require('../services/email')");
    expect(finCode).toContain('emailManager');
  });

  test('should send invoice email to customer', () => {
    const fs = require('fs');
    const path = require('path');
    const finCode = fs.readFileSync(
      path.join(__dirname, '../routes/finance.routes.unified.js'),
      'utf8'
    );

    expect(finCode).toContain('sendInvoice');
    expect(finCode).toContain('customerEmail');
  });

  test('should send payment confirmation email', () => {
    const fs = require('fs');
    const path = require('path');
    const finCode = fs.readFileSync(
      path.join(__dirname, '../routes/finance.routes.unified.js'),
      'utf8'
    );

    expect(finCode).toContain('sendPaymentConfirmation');
    expect(finCode).toContain('payeeEmail');
  });

  test('should send expense approval request email', () => {
    const fs = require('fs');
    const path = require('path');
    const finCode = fs.readFileSync(
      path.join(__dirname, '../routes/finance.routes.unified.js'),
      'utf8'
    );

    expect(finCode).toContain('sendApprovalRequest');
    expect(finCode).toContain('FINANCE_MANAGER_EMAIL');
  });

  test('should alert on large transactions', () => {
    const fs = require('fs');
    const path = require('path');
    const finCode = fs.readFileSync(
      path.join(__dirname, '../routes/finance.routes.unified.js'),
      'utf8'
    );

    expect(finCode).toContain('LARGE_TRANSACTION_THRESHOLD');
    expect(finCode).toContain('sendAlert');
    expect(finCode).toContain('معاملة مالية كبيرة');
  });

  test('should notify on expense approval/rejection', () => {
    const fs = require('fs');
    const path = require('path');
    const finCode = fs.readFileSync(
      path.join(__dirname, '../routes/finance.routes.unified.js'),
      'utf8'
    );

    expect(finCode).toContain('sendStatusChange');
    expect(finCode).toContain('تمت الموافقة');
    expect(finCode).toContain('تم الرفض');
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  10. NOTIFICATIONS SERVICE EMAIL CHANNEL
// ══════════════════════════════════════════════════════════════════════════

describe('Notifications Service Email Channel', () => {
  test('notifications.service.js should import unified email system', () => {
    const fs = require('fs');
    const path = require('path');
    const notifCode = fs.readFileSync(
      path.join(__dirname, '../services/notifications.service.js'),
      'utf8'
    );

    expect(notifCode).toContain("require('./email')");
    expect(notifCode).toContain('emailManager');
  });

  test('should support sendEmail option in createNotification', () => {
    const fs = require('fs');
    const path = require('path');
    const notifCode = fs.readFileSync(
      path.join(__dirname, '../services/notifications.service.js'),
      'utf8'
    );

    expect(notifCode).toContain('sendEmail');
    expect(notifCode).toContain('shouldEmail');
    expect(notifCode).toContain('priority');
  });

  test('should auto-send email for high priority notifications', () => {
    const fs = require('fs');
    const path = require('path');
    const notifCode = fs.readFileSync(
      path.join(__dirname, '../services/notifications.service.js'),
      'utf8'
    );

    expect(notifCode).toContain("priority === 'high'");
    expect(notifCode).toContain("priority === 'urgent'");
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  11. SERVER INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════

describe('Server Email System Initialization', () => {
  test('server.js should initialize unified email system', () => {
    const fs = require('fs');
    const path = require('path');
    const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

    expect(serverCode).toContain("require('./services/email')");
    expect(serverCode).toContain('EmailEventBridge');
    expect(serverCode).toContain('EmailScheduler');
  });

  test('server.js should start email scheduler', () => {
    const fs = require('fs');
    const path = require('path');
    const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

    expect(serverCode).toContain('emailScheduler.start()');
    expect(serverCode).toContain('Email Scheduler ready');
  });

  test('server.js should connect email event bridge', () => {
    const fs = require('fs');
    const path = require('path');
    const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

    expect(serverCode).toContain('emailEventBridge.connect');
    expect(serverCode).toContain('Email Event Bridge');
  });

  test('server.js should initialize cross-module subscribers', () => {
    const fs = require('fs');
    const path = require('path');
    const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

    expect(serverCode).toContain('initializeCrossModuleSubscribers');
    expect(serverCode).toContain('Cross-Module Subscribers ready');
  });

  test('server.js should store references for graceful shutdown', () => {
    const fs = require('fs');
    const path = require('path');
    const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

    expect(serverCode).toContain('server._emailEventBridge');
    expect(serverCode).toContain('server._emailScheduler');
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  12. MFA CONTROLLER EMAIL INTEGRATION
// ══════════════════════════════════════════════════════════════════════════

describe('MFA Controller Email Integration', () => {
  test('mfaController should use unified email system', () => {
    const fs = require('fs');
    const path = require('path');
    const mfaCode = fs.readFileSync(
      path.join(__dirname, '../controllers/mfaController.js'),
      'utf8'
    );

    expect(mfaCode).toContain("require('../services/email')");
    expect(mfaCode).toContain('emailManager');
    expect(mfaCode).not.toContain("emailService = require('../services/emailService')");
  });

  test('should provide backward-compatible sendOTPEmail', () => {
    const fs = require('fs');
    const path = require('path');
    const mfaCode = fs.readFileSync(
      path.join(__dirname, '../controllers/mfaController.js'),
      'utf8'
    );

    expect(mfaCode).toContain('sendOTPEmail');
    expect(mfaCode).toContain('emailManager.sendOTP');
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  13. WORKFLOW ENGINE EMAIL INTEGRATION
// ══════════════════════════════════════════════════════════════════════════

describe('Workflow Engine Email Integration', () => {
  test('workflow-engine should use unified email system', () => {
    const fs = require('fs');
    const path = require('path');
    const workflowCode = fs.readFileSync(
      path.join(__dirname, '../workflow/workflow-engine.js'),
      'utf8'
    );

    expect(workflowCode).toContain("require('../services/email')");
    expect(workflowCode).not.toContain("require('../communication/email-service')");
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  14. ENV CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════

describe('Environment Configuration', () => {
  test('.env.example should include integration email addresses', () => {
    const fs = require('fs');
    const path = require('path');
    const envCode = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');

    expect(envCode).toContain('HR_MANAGER_EMAIL');
    expect(envCode).toContain('FINANCE_MANAGER_EMAIL');
    expect(envCode).toContain('CARE_TEAM_EMAIL');
    expect(envCode).toContain('ADMIN_ALERT_EMAIL');
    expect(envCode).toContain('WORK_START_HOUR');
    expect(envCode).toContain('LARGE_TRANSACTION_THRESHOLD');
  });

  test('.env.example should include email provider configuration', () => {
    const fs = require('fs');
    const path = require('path');
    const envCode = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');

    expect(envCode).toContain('EMAIL_ENABLED');
    expect(envCode).toContain('EMAIL_PROVIDER');
    expect(envCode).toContain('SMTP_HOST');
    expect(envCode).toContain('SENDGRID_API_KEY');
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  15. TEMPLATE ENGINE COVERAGE
// ══════════════════════════════════════════════════════════════════════════

describe('Email Templates for All Integration Points', () => {
  let templateEngine;

  beforeAll(() => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const { EmailTemplateEngine } = require('../services/email');
    templateEngine = new EmailTemplateEngine();
  });

  test('should have WELCOME template', () => {
    const result = templateEngine.render('WELCOME', { fullName: 'أحمد', email: 'a@t.com' });
    expect(result.html).toContain('أحمد');
    expect(result.subject).toBeDefined();
  });

  test('should have PASSWORD_RESET template', () => {
    const result = templateEngine.render('PASSWORD_RESET', {
      fullName: 'أحمد',
      resetUrl: 'http://test.com/reset',
      resetToken: 'abc123',
      expiresIn: '60 دقيقة',
    });
    expect(result.html).toContain('abc123');
    expect(result.subject).toBeDefined();
  });

  test('should have LOGIN_ALERT template', () => {
    const result = templateEngine.render('LOGIN_ALERT', {
      fullName: 'أحمد',
      ip: '1.2.3.4',
      time: '12:00',
      userAgent: 'Chrome',
    });
    expect(result.html).toContain('1.2.3.4');
  });

  test('should have OTP_CODE template', () => {
    const result = templateEngine.render('OTP_CODE', { code: '123456', fullName: 'أحمد' });
    expect(result.html).toContain('123456');
  });

  test('should have LEAVE_REQUEST template', () => {
    const result = templateEngine.render('LEAVE_REQUEST', {
      employeeName: 'أحمد',
      type: 'سنوية',
      startDate: '2025-01-01',
      endDate: '2025-01-05',
    });
    expect(result.html).toBeDefined();
    expect(result.subject).toBeDefined();
  });

  test('should have SALARY_NOTIFICATION template', () => {
    const result = templateEngine.render('SALARY_NOTIFICATION', {
      fullName: 'أحمد',
      month: '1/2025',
      totalNet: 5000,
    });
    expect(result.html).toBeDefined();
    expect(result.subject).toBeDefined();
  });

  test('should have INVOICE template', () => {
    const result = templateEngine.render('INVOICE', {
      customerName: 'شركة',
      invoiceNumber: 'INV-001',
      totalAmount: 10000,
    });
    expect(result.html).toContain('INV-001');
  });

  test('should have PAYMENT_CONFIRMATION template', () => {
    const result = templateEngine.render('PAYMENT_CONFIRMATION', {
      fullName: 'أحمد',
      amount: 5000,
      reference: 'PAY-001',
    });
    expect(result.html).toBeDefined();
    expect(result.subject).toBeDefined();
  });

  test('should have ALERT_NOTIFICATION template', () => {
    const result = templateEngine.render('ALERT_NOTIFICATION', {
      title: 'تنبيه',
      message: 'رسالة تنبيه',
      severity: 'high',
    });
    expect(result.html).toContain('تنبيه');
  });

  test('should have APPROVAL_REQUEST template', () => {
    const result = templateEngine.render('APPROVAL_REQUEST', {
      title: 'طلب اعتماد',
      requestType: 'مصروف',
    });
    expect(result.html).toBeDefined();
    expect(result.subject).toBeDefined();
  });

  test('should have STATUS_CHANGE template', () => {
    const result = templateEngine.render('STATUS_CHANGE', {
      fullName: 'أحمد',
      itemType: 'مصروف',
      oldStatus: 'pending',
      newStatus: 'approved',
    });
    expect(result.html).toBeDefined();
    expect(result.subject).toBeDefined();
  });

  test('should have ATTENDANCE_ALERT template', () => {
    const result = templateEngine.render('ATTENDANCE_ALERT', {
      fullName: 'أحمد',
      type: 'تأخر',
      date: '2025-01-01',
      time: '09:30',
    });
    expect(result.html).toBeDefined();
    expect(result.subject).toBeDefined();
  });

  test('should have NOTIFICATION template', () => {
    const result = templateEngine.render('NOTIFICATION', {
      title: 'إشعار',
      message: 'رسالة إشعار',
      fullName: 'أحمد',
    });
    expect(result.html).toContain('إشعار');
  });

  test('should have ACCOUNT_LOCKED template', () => {
    const result = templateEngine.render('ACCOUNT_LOCKED', {
      fullName: 'أحمد',
      reason: 'محاولات كثيرة',
      lockDuration: '30 دقيقة',
    });
    expect(result.html).toBeDefined();
    expect(result.subject).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  16. CIRCUIT BREAKER — EmailCircuitBreaker
// ══════════════════════════════════════════════════════════════════════════

describe('EmailCircuitBreaker', () => {
  let EmailCircuitBreaker, STATE;

  beforeAll(() => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    ({ EmailCircuitBreaker } = require('../services/email'));
    ({ STATE } = require('../services/email/EmailCircuitBreaker'));
  });

  test('should start in CLOSED state', () => {
    const cb = new EmailCircuitBreaker();
    expect(cb.state).toBe('CLOSED');
  });

  test('should allow calls in CLOSED state', () => {
    const cb = new EmailCircuitBreaker();
    expect(cb.isAllowed).toBe(true);
  });

  test('should execute action successfully', async () => {
    const cb = new EmailCircuitBreaker();
    const result = await cb.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(cb.stats.totalSuccess).toBe(1);
  });

  test('should count failures', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 3 });
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}
    expect(cb.stats.totalFailed).toBe(2);
    expect(cb.state).toBe('CLOSED'); // still below threshold
  });

  test('should trip to OPEN after threshold', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 3, monitorWindow: 60000 });
    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(() => Promise.reject(new Error('fail')));
      } catch {}
    }
    expect(cb.state).toBe('OPEN');
    expect(cb.stats.totalTrips).toBe(1);
  });

  test('should reject calls when OPEN', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 2, monitorWindow: 60000 });
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}
    expect(cb.state).toBe('OPEN');

    await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toThrow(
      'circuit breaker is OPEN'
    );
    expect(cb.stats.totalRejected).toBe(1);
  });

  test('should call fallback when OPEN', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 2, monitorWindow: 60000 });
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}

    const result = await cb.execute(
      () => Promise.resolve('should_not_run'),
      () => 'fallback_value'
    );
    expect(result).toBe('fallback_value');
  });

  test('should reset to CLOSED manually', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 2, monitorWindow: 60000 });
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}
    expect(cb.state).toBe('OPEN');

    cb.reset();
    expect(cb.state).toBe('CLOSED');
    expect(cb.isAllowed).toBe(true);
  });

  test('should trip manually', () => {
    const cb = new EmailCircuitBreaker();
    expect(cb.state).toBe('CLOSED');
    cb.trip('maintenance');
    expect(cb.state).toBe('OPEN');
    expect(cb.stats.totalTrips).toBe(1);
  });

  test('should transition to HALF_OPEN after cooldown', async () => {
    const cb = new EmailCircuitBreaker({
      failureThreshold: 2,
      cooldownMs: 50,
      monitorWindow: 60000,
    });
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}
    expect(cb.state).toBe('OPEN');

    // Wait for cooldown
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(cb.state).toBe('HALF_OPEN');
  });

  test('should close from HALF_OPEN after successes', async () => {
    const cb = new EmailCircuitBreaker({
      failureThreshold: 2,
      successThreshold: 2,
      cooldownMs: 50,
      monitorWindow: 60000,
    });
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(cb.state).toBe('HALF_OPEN');

    await cb.execute(() => Promise.resolve('ok'));
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.state).toBe('CLOSED');
  });

  test('should wrap function with circuit breaker', async () => {
    const cb = new EmailCircuitBreaker();
    const wrapped = cb.wrap(async x => x * 2);
    const result = await wrapped(5);
    expect(result).toBe(10);
  });

  test('should return comprehensive stats', () => {
    const cb = new EmailCircuitBreaker();
    const stats = cb.stats;
    expect(stats).toHaveProperty('state', 'CLOSED');
    expect(stats).toHaveProperty('totalCalls', 0);
    expect(stats).toHaveProperty('totalSuccess', 0);
    expect(stats).toHaveProperty('totalFailed', 0);
    expect(stats).toHaveProperty('totalRejected', 0);
    expect(stats).toHaveProperty('totalTrips', 0);
    expect(stats).toHaveProperty('failureThreshold');
    expect(stats).toHaveProperty('cooldownMs');
  });

  test('should call onStateChange callback', async () => {
    const transitions = [];
    const cb = new EmailCircuitBreaker({
      failureThreshold: 2,
      monitorWindow: 60000,
      onStateChange: (oldState, newState) => transitions.push({ oldState, newState }),
    });
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}
    try {
      await cb.execute(() => Promise.reject(new Error('fail')));
    } catch {}
    expect(transitions.length).toBeGreaterThan(0);
    expect(transitions[0].newState).toBe('OPEN');
  });

  test('should have STATE constants', () => {
    expect(STATE.CLOSED).toBe('CLOSED');
    expect(STATE.OPEN).toBe('OPEN');
    expect(STATE.HALF_OPEN).toBe('HALF_OPEN');
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  17. EMAIL PREFERENCE MODEL
// ══════════════════════════════════════════════════════════════════════════

describe('EmailPreference Model Schema', () => {
  let EmailPreference;

  beforeAll(() => {
    try {
      EmailPreference = require('../models/EmailPreference');
    } catch {
      EmailPreference = null;
    }
  });

  test('EmailPreference module should be loadable', () => {
    // The model may fail to construct without mongoose connection
    // but the file itself should be requireable
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../models/EmailPreference.js'), 'utf8');
    expect(code).toContain('emailPreferenceSchema');
    expect(code).toContain("mongoose.model('EmailPreference'");
  });

  test('should define required schema fields', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../models/EmailPreference.js'), 'utf8');
    expect(code).toContain('userId');
    expect(code).toContain('email');
    expect(code).toContain('globalEnabled');
    expect(code).toContain('categories');
    expect(code).toContain('quietHours');
    expect(code).toContain('unsubscribeToken');
    expect(code).toContain('deliveryHealth');
    expect(code).toContain('stats');
  });

  test('should define all category types', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../models/EmailPreference.js'), 'utf8');
    const categories = ['auth', 'hr', 'finance', 'system', 'marketing', 'appointments'];
    for (const cat of categories) {
      expect(code).toContain(`${cat}:`);
    }
  });

  test('should define static methods', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../models/EmailPreference.js'), 'utf8');
    expect(code).toContain('findOrCreateForUser');
    expect(code).toContain('shouldSendEmail');
    expect(code).toContain('recordBounce');
    expect(code).toContain('recordComplaint');
    expect(code).toContain('unsubscribeByToken');
  });

  test('should define instance methods', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../models/EmailPreference.js'), 'utf8');
    expect(code).toContain('recordEmailSent');
    expect(code).toContain('recordEmailOpened');
  });

  test('should have frequency enum with correct values', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../models/EmailPreference.js'), 'utf8');
    expect(code).toContain("'instant'");
    expect(code).toContain("'daily_digest'");
    expect(code).toContain("'weekly_digest'");
    expect(code).toContain("'off'");
  });

  test('should default marketing to disabled', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../models/EmailPreference.js'), 'utf8');
    // marketing default enabled: false
    expect(code).toMatch(/marketing[\s\S]*?enabled[\s\S]*?default:\s*false/);
  });

  test('should auto-suppress after hard bounces', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../models/EmailPreference.js'), 'utf8');
    expect(code).toContain('Auto-suppressed');
    expect(code).toContain("bounceType === 'hard'");
  });

  test('should immediately suppress on spam complaint (GDPR)', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../models/EmailPreference.js'), 'utf8');
    expect(code).toContain('User reported email as spam');
    expect(code).toContain('recordComplaint');
  });

  test('should generate unsubscribe token on save', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../models/EmailPreference.js'), 'utf8');
    expect(code).toContain('crypto.randomBytes(32)');
    expect(code).toContain("pre('save'");
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  18. NEW ENDPOINT CODE PRESENCE CHECKS
// ══════════════════════════════════════════════════════════════════════════

describe('New Email Route Endpoints', () => {
  let routeCode;

  beforeAll(() => {
    const fs = require('fs');
    const path = require('path');
    routeCode = fs.readFileSync(path.join(__dirname, '../routes/email.routes.js'), 'utf8');
  });

  test('should have SendGrid webhook endpoint', () => {
    expect(routeCode).toContain('/webhooks/sendgrid');
    expect(routeCode).toContain('recordBounce');
    expect(routeCode).toContain('recordComplaint');
  });

  test('should have SES webhook endpoint', () => {
    expect(routeCode).toContain('/webhooks/ses');
    expect(routeCode).toContain('SubscriptionConfirmation');
  });

  test('should have unsubscribe GET endpoint', () => {
    expect(routeCode).toContain("'/unsubscribe/:token'");
    expect(routeCode).toContain('إدارة اشتراكات البريد');
  });

  test('should have unsubscribe POST endpoint', () => {
    expect(routeCode).toContain('unsubscribe_all');
    expect(routeCode).toContain('unsubscribeByToken');
  });

  test('should have preferences GET endpoint', () => {
    expect(routeCode).toContain("'/preferences'");
    expect(routeCode).toContain('findOrCreateForUser');
  });

  test('should have preferences PUT endpoint', () => {
    expect(routeCode).toContain('تم تحديث تفضيلات البريد الإلكتروني');
    expect(routeCode).toContain('quietHours');
  });

  test('should have circuit-breaker status endpoint', () => {
    expect(routeCode).toContain("'/circuit-breaker'");
    expect(routeCode).toContain('cb.stats');
  });

  test('should have circuit-breaker reset endpoint', () => {
    expect(routeCode).toContain('/circuit-breaker/reset');
    expect(routeCode).toContain('cb.reset()');
  });

  test('should have circuit-breaker trip endpoint', () => {
    expect(routeCode).toContain('/circuit-breaker/trip');
    expect(routeCode).toContain('cb.trip');
  });

  test('should have detailed health endpoint', () => {
    expect(routeCode).toContain('/health/detailed');
    expect(routeCode).toContain('circuitBreaker');
    expect(routeCode).toContain('suppression');
  });

  test('should import EmailPreference model', () => {
    expect(routeCode).toContain("require('../models/EmailPreference')");
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  19. GRACEFUL SHUTDOWN HOOKS
// ══════════════════════════════════════════════════════════════════════════

describe('Graceful Shutdown Email Hooks', () => {
  test('server.js should register email shutdown hooks', () => {
    const fs = require('fs');
    const path = require('path');
    const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

    expect(serverCode).toContain('registerShutdownHook');
    expect(serverCode).toContain('Email Scheduler');
    expect(serverCode).toContain('_emailScheduler');
    expect(serverCode).toContain('Email Event Bridge');
    expect(serverCode).toContain('_emailEventBridge');
    expect(serverCode).toContain('Email Queue Flush');
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  20. EMAIL MANAGER — CIRCUIT BREAKER INTEGRATION
// ══════════════════════════════════════════════════════════════════════════

describe('EmailManager Circuit Breaker Integration', () => {
  test('EmailManager code should import EmailCircuitBreaker', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../services/email/EmailManager.js'), 'utf8');
    expect(code).toContain("require('./EmailCircuitBreaker')");
    expect(code).toContain('this._circuitBreaker');
    expect(code).toContain('_circuitBreaker.execute');
  });

  test('emailManager singleton should have _circuitBreaker', () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const { emailManager } = require('../services/email');
    expect(emailManager._circuitBreaker).toBeDefined();
    expect(emailManager._circuitBreaker.state).toBe('CLOSED');
  });

  test('index.js should export EmailCircuitBreaker', () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const { EmailCircuitBreaker } = require('../services/email');
    expect(EmailCircuitBreaker).toBeDefined();
    expect(typeof EmailCircuitBreaker).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 3.5 — New Features Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Circuit Breaker Provider Failover', () => {
  const { EmailCircuitBreaker } = require('../services/email/EmailCircuitBreaker');

  test('should have addFallbackProvider method', () => {
    const cb = new EmailCircuitBreaker();
    expect(typeof cb.addFallbackProvider).toBe('function');
  });

  test('should track fallback providers count in stats', () => {
    const cb = new EmailCircuitBreaker();
    cb.addFallbackProvider(async () => ({ ok: true }), 'backup-smtp');
    cb.addFallbackProvider(async () => ({ ok: true }), 'sendgrid');
    expect(cb.stats.fallbackProvidersCount).toBe(2);
  });

  test('should execute primary action when circuit is CLOSED', async () => {
    const cb = new EmailCircuitBreaker();
    const result = await cb.execute(async () => 'primary_result');
    expect(result).toBe('primary_result');
    expect(cb.stats.totalSuccess).toBe(1);
  });

  test('should failover to backup when OPEN', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 2, cooldownMs: 999999 });
    cb.addFallbackProvider(async () => ({ provider: 'backup', messageId: 'fb1' }), 'backup-smtp');

    // Trip the circuit
    cb.trip('test');

    const result = await cb.execute(async () => 'primary');
    expect(result).toEqual({ provider: 'backup', messageId: 'fb1' });
    expect(cb.stats.totalFailovers).toBe(1);
    expect(cb.stats.activeProvider).toBe('backup-smtp');
  });

  test('should try multiple fallbacks in order', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 2, cooldownMs: 999999 });
    cb.addFallbackProvider(async () => {
      throw new Error('fb1 down');
    }, 'fb1');
    cb.addFallbackProvider(async () => ({ provider: 'fb2' }), 'fb2');

    cb.trip('test');

    const result = await cb.execute(async () => 'primary');
    expect(result).toEqual({ provider: 'fb2' });
    expect(cb.stats.activeProvider).toBe('fb2');
  });

  test('should throw when all fallbacks fail and no fallback function given', async () => {
    const cb = new EmailCircuitBreaker({ failureThreshold: 2, cooldownMs: 999999 });
    cb.addFallbackProvider(async () => {
      throw new Error('down');
    }, 'fb1');

    cb.trip('test');

    await expect(cb.execute(async () => 'primary')).rejects.toThrow('OPEN');
    expect(cb.stats.totalRejected).toBe(1);
  });

  test('should reset activeProvider on manual reset', () => {
    const cb = new EmailCircuitBreaker();
    cb.addFallbackProvider(async () => ({ ok: true }), 'backup');
    cb.trip('test');
    cb._stats.activeProvider = 'backup';
    cb._currentFallbackIndex = 0;

    cb.reset();
    expect(cb.stats.activeProvider).toBe('primary');
    expect(cb._currentFallbackIndex).toBe(-1);
    expect(cb.state).toBe('CLOSED');
  });

  test('should include autoFailover setting in stats', () => {
    const cb = new EmailCircuitBreaker({ autoFailover: false });
    expect(cb.stats.autoFailover).toBe(false);
  });

  test('should not failover when autoFailover is false', async () => {
    const cb = new EmailCircuitBreaker({ autoFailover: false, cooldownMs: 999999 });
    cb.addFallbackProvider(async () => ({ ok: true }), 'backup');

    cb.trip('test');

    await expect(cb.execute(async () => 'primary')).rejects.toThrow('OPEN');
  });
});

describe('Click Tracking Link Rewriting', () => {
  test('EmailManager should have _rewriteLinksForTracking method', () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();
    expect(typeof mgr._rewriteLinksForTracking).toBe('function');
  });

  test('should rewrite HTTP links in HTML', () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();

    // Temporarily override config tracking
    const config = require('../services/email/EmailConfig');
    const origPixelUrl = config.tracking.pixelUrl;
    config.tracking.pixelUrl = 'https://track.example.com';

    const html = '<a href="https://example.com/page">Click</a>';
    const result = mgr._rewriteLinksForTracking(html, 'email123');

    expect(result).toContain('track/click/email123');
    expect(result).toContain(encodeURIComponent('https://example.com/page'));

    config.tracking.pixelUrl = origPixelUrl;
  });

  test('should skip mailto and unsubscribe links', () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();

    const html =
      '<a href="mailto:test@test.com">Email</a> <a href="https://app.com/unsubscribe/abc">Unsub</a>';
    const result = mgr._rewriteLinksForTracking(html, 'e1');

    expect(result).toContain('mailto:test@test.com');
    expect(result).toContain('unsubscribe/abc');
    expect(result).not.toContain('track/click/e1');
  });

  test('should handle null/empty html gracefully', () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();

    expect(mgr._rewriteLinksForTracking(null, 'e1')).toBeNull();
    expect(mgr._rewriteLinksForTracking('', 'e1')).toBe('');
  });
});

describe('EmailDigestAggregator', () => {
  const { EmailDigestAggregator } = require('../services/email/EmailDigestAggregator');

  let aggregator;
  const mockManager = { send: jest.fn().mockResolvedValue({ success: true }) };

  beforeEach(() => {
    aggregator = new EmailDigestAggregator(mockManager);
    mockManager.send.mockClear();
  });

  test('should add items to daily queue', () => {
    const result = aggregator.add(
      'user1',
      'a@b.com',
      'hr',
      { subject: 'Test', summary: 'Info' },
      'daily_digest'
    );
    expect(result.queued).toBe(true);
    expect(result.bucket).toBe('daily');
    expect(aggregator.stats.totalQueued).toBe(1);
  });

  test('should add items to weekly queue', () => {
    const result = aggregator.add(
      'user1',
      'a@b.com',
      'finance',
      { subject: 'Report' },
      'weekly_digest'
    );
    expect(result.queued).toBe(true);
    expect(result.bucket).toBe('weekly');
  });

  test('should deduplicate identical notifications', () => {
    aggregator.add('user1', 'a@b.com', 'hr', { subject: 'Leave', summary: 'Same' });
    const result2 = aggregator.add('user1', 'a@b.com', 'hr', { subject: 'Leave', summary: 'Same' });
    expect(result2.queued).toBe(false);
    expect(result2.reason).toBe('deduplicated');
    expect(aggregator.stats.totalDeduplicated).toBe(1);
  });

  test('should allow different notifications for same user', () => {
    aggregator.add('user1', 'a@b.com', 'hr', { subject: 'Leave 1' });
    const result2 = aggregator.add('user1', 'a@b.com', 'finance', { subject: 'Invoice' });
    expect(result2.queued).toBe(true);
    expect(aggregator.stats.totalQueued).toBe(2);
  });

  test('should reject when digest is full', () => {
    const smallAgg = new EmailDigestAggregator(mockManager, { maxItemsPerDigest: 2 });
    smallAgg.add('u1', 'a@b.com', 'hr', { subject: 'A' });
    smallAgg.add('u1', 'a@b.com', 'hr', { subject: 'B' });
    const result = smallAgg.add('u1', 'a@b.com', 'hr', { subject: 'C' });
    expect(result.queued).toBe(false);
    expect(result.reason).toBe('digest_full');
  });

  test('should reject missing user/email', () => {
    const r1 = aggregator.add(null, 'a@b.com', 'hr', { subject: 'T' });
    const r2 = aggregator.add('u1', null, 'hr', { subject: 'T' });
    expect(r1.queued).toBe(false);
    expect(r2.queued).toBe(false);
  });

  test('should report pending counts', () => {
    aggregator.add('u1', 'a@b.com', 'hr', { subject: 'A' }, 'daily_digest');
    aggregator.add('u2', 'b@b.com', 'hr', { subject: 'B' }, 'weekly_digest');

    const counts = aggregator.getPendingCounts();
    expect(counts.dailyUsers).toBe(1);
    expect(counts.dailyItems).toBe(1);
    expect(counts.weeklyUsers).toBe(1);
    expect(counts.weeklyItems).toBe(1);
  });

  test('should flush daily digests and call emailManager.send', async () => {
    aggregator.add('u1', 'a@b.com', 'hr', { subject: 'HR Item' }, 'daily_digest');
    aggregator.add('u1', 'a@b.com', 'finance', { subject: 'Finance Item' }, 'daily_digest');

    const result = await aggregator.flushDaily();
    expect(result.sent).toBe(1);
    expect(mockManager.send).toHaveBeenCalledTimes(1);
    expect(aggregator.stats.totalDigestsSent).toBe(1);

    // Queue should be cleared
    expect(aggregator.getPendingCounts().dailyItems).toBe(0);
  });

  test('should flush weekly digests separately from daily', async () => {
    aggregator.add('u1', 'a@b.com', 'marketing', { subject: 'Weekly news' }, 'weekly_digest');

    // flush daily should not send weekly items
    await aggregator.flushDaily();
    expect(mockManager.send).not.toHaveBeenCalled();

    // flush weekly should send them
    const result = await aggregator.flushWeekly();
    expect(result.sent).toBe(1);
    expect(mockManager.send).toHaveBeenCalledTimes(1);
  });

  test('should purge all queued items', () => {
    aggregator.add('u1', 'a@b.com', 'hr', { subject: 'A' });
    aggregator.add('u2', 'b@b.com', 'hr', { subject: 'B' });

    const counts = aggregator.purge();
    expect(counts.dailyItems).toBe(2);
    expect(aggregator.getPendingCounts().dailyItems).toBe(0);
  });

  test('stats should include pending counts', () => {
    aggregator.add('u1', 'a@b.com', 'hr', { subject: 'A' });
    const stats = aggregator.stats;
    expect(stats.pending).toBeDefined();
    expect(stats.usersInQueue).toBe(1);
    expect(stats.totalQueued).toBe(1);
  });
});

describe('EmailConfigValidator', () => {
  const { validateEmailConfig } = require('../services/email/EmailConfigValidator');
  const EmailConfig = require('../services/email/EmailConfig');

  test('should validate the actual EmailConfig without fatal errors', () => {
    const result = validateEmailConfig(EmailConfig);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('should return warnings for missing SMTP credentials', () => {
    const testConfig = {
      ...EmailConfig,
      provider: 'smtp',
      smtp: { ...EmailConfig.smtp, auth: { user: '', pass: '' } },
    };
    const result = validateEmailConfig(testConfig);
    expect(result.warnings.some(w => w.includes('SMTP') || w.includes('credentials'))).toBe(true);
  });

  test('should return warnings for tracking without pixelUrl', () => {
    const testConfig = {
      ...EmailConfig,
      tracking: { opens: true, clicks: true, pixelUrl: '' },
    };
    const result = validateEmailConfig(testConfig);
    expect(result.warnings.some(w => w.includes('tracking') || w.includes('TRACKING'))).toBe(true);
  });

  test('should detect rate limit inconsistency', () => {
    const testConfig = {
      ...EmailConfig,
      rateLimit: { maxPerMinute: 100, maxPerHour: 50, maxPerDay: 5000 },
    };
    const result = validateEmailConfig(testConfig);
    expect(result.warnings.some(w => w.includes('Rate limit'))).toBe(true);
  });

  test('should accept valid config with no warnings', () => {
    const perfectConfig = {
      ...EmailConfig,
      provider: 'mock',
      tracking: { opens: false, clicks: false, pixelUrl: '' },
      rateLimit: { maxPerMinute: 10, maxPerHour: 500, maxPerDay: 5000 },
    };
    const result = validateEmailConfig(perfectConfig);
    expect(result.valid).toBe(true);
  });
});

describe('Event Bridge Deduplication', () => {
  test('emailEventBridge.js should have dedup logic', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.join(__dirname, '../services/email/emailEventBridge.js'),
      'utf8'
    );
    expect(code).toContain('_dedupeCache');
    expect(code).toContain('_isDuplicate');
    expect(code).toContain('_buildDedupeKey');
    expect(code).toContain('_purgeDedupeCache');
  });

  test('should include deduplicated count in stats', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.join(__dirname, '../services/email/emailEventBridge.js'),
      'utf8'
    );
    expect(code).toContain('deduplicated');
    expect(code).toContain('dedupeCacheSize');
  });

  test('should never dedup OTP events', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.join(__dirname, '../services/email/emailEventBridge.js'),
      'utf8'
    );
    expect(code).toContain('auth.otp.generated');
    expect(code).toContain('neverDedup');
  });

  test('dedup purge interval should be cleaned on disconnect', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.join(__dirname, '../services/email/emailEventBridge.js'),
      'utf8'
    );
    expect(code).toContain('clearInterval');
    expect(code).toContain('_dedupePurgeInterval');
    expect(code).toContain('_dedupeCache.clear()');
  });
});

describe('Mailgun Webhook Endpoint', () => {
  test('email.routes.js should have mailgun webhook', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../routes/email.routes.js'), 'utf8');
    expect(code).toContain("'/webhooks/mailgun'");
    expect(code).toContain('[Webhook/Mailgun]');
  });

  test('should handle bounce/complained/unsubscribed/opened/clicked events', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../routes/email.routes.js'), 'utf8');
    expect(code).toContain("case 'failed':");
    expect(code).toContain("case 'complained':");
    expect(code).toContain("case 'unsubscribed':");
    expect(code).toContain("case 'opened':");
    expect(code).toContain("case 'clicked':");
  });

  test('should extract recipient from Mailgun event-data', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../routes/email.routes.js'), 'utf8');
    expect(code).toContain('event-data');
    expect(code).toContain('eventData.recipient');
  });
});

describe('Weekly Performance Summary Job', () => {
  test('emailScheduler.js should have weekly performance job', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.join(__dirname, '../services/email/emailScheduler.js'),
      'utf8'
    );
    expect(code).toContain('_runWeeklyPerformanceSummary');
    expect(code).toContain('weeklyPerformance');
    expect(code).toContain('تقرير أداء البريد الأسبوعي');
  });

  test('should be in getJobs() list', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.join(__dirname, '../services/email/emailScheduler.js'),
      'utf8'
    );
    expect(code).toContain("name: 'weeklyPerformance'");
    expect(code).toContain("schedule: 'Every Sunday 8:00 AM'");
  });

  test('should be in runJob dispatch table', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.join(__dirname, '../services/email/emailScheduler.js'),
      'utf8'
    );
    expect(code).toContain('weeklyPerformance: () => this._runWeeklyPerformanceSummary()');
  });

  test('should build HTML report', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.join(__dirname, '../services/email/emailScheduler.js'),
      'utf8'
    );
    expect(code).toContain('_buildWeeklyReportHtml');
    expect(code).toContain('نسبة النجاح');
    expect(code).toContain('إحصائيات الأسبوع');
  });
});

describe('Index.js Updated Exports', () => {
  test('should export EmailDigestAggregator class and singleton', () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const mod = require('../services/email');
    expect(mod.EmailDigestAggregator).toBeDefined();
    expect(typeof mod.EmailDigestAggregator).toBe('function');
    expect(mod.digestAggregator).toBeDefined();
    expect(mod.digestAggregator).toBeInstanceOf(mod.EmailDigestAggregator);
  });
});

describe('EmailConfigValidator Module', () => {
  test('should export validateEmailConfig and validateAndLog', () => {
    const mod = require('../services/email/EmailConfigValidator');
    expect(typeof mod.validateEmailConfig).toBe('function');
    expect(typeof mod.validateAndLog).toBe('function');
    expect(mod.emailConfigSchema).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 4 — Advanced Integration & Wiring Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 4: Preference-Aware Sending', () => {
  test('send() should accept userId and category params', () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();
    // send method should exist and accept options with userId/category
    expect(typeof mgr.send).toBe('function');
  });

  test('send() should return PREFERENCE_BLOCKED when preference blocks sending', async () => {
    const origEnabled = process.env.EMAIL_ENABLED;
    process.env.EMAIL_ENABLED = 'true';

    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();

    // Mock the preference model to return shouldSendEmail = false
    mgr._EmailPreference = {
      shouldSendEmail: jest.fn().mockResolvedValue(false),
      findOne: jest.fn().mockResolvedValue(null),
    };
    mgr._getEmailPreferenceModel = () => mgr._EmailPreference;

    const result = await mgr.send({
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      userId: 'user123',
      category: 'marketing',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('PREFERENCE_BLOCKED');
    expect(result.code).toBe('E020');

    process.env.EMAIL_ENABLED = origEnabled;
  });

  test('send() should return DIGEST_QUEUED when user prefers daily digest', async () => {
    const origEnabled = process.env.EMAIL_ENABLED;
    process.env.EMAIL_ENABLED = 'true';

    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();

    // Mock preference model: shouldSend = true, frequency = daily_digest
    mgr._EmailPreference = {
      shouldSendEmail: jest.fn().mockResolvedValue(true),
      findOne: jest.fn().mockResolvedValue({
        categories: {
          hr: { enabled: true, frequency: 'daily_digest' },
        },
      }),
    };
    mgr._getEmailPreferenceModel = () => mgr._EmailPreference;

    // Mock digest aggregator
    mgr._digestAggregator = {
      add: jest.fn().mockReturnValue({ queued: true, queueId: 'q123', bucket: 'daily' }),
    };

    const result = await mgr.send({
      to: 'test@test.com',
      subject: 'HR Notification',
      html: '<p>Your leave is approved</p>',
      userId: 'user123',
      category: 'hr',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('DIGEST_QUEUED');
    expect(result.frequency).toBe('daily_digest');
    expect(mgr._digestAggregator.add).toHaveBeenCalledWith(
      'user123',
      'test@test.com',
      'hr',
      expect.any(Object),
      'daily_digest'
    );

    process.env.EMAIL_ENABLED = origEnabled;
  });

  test('send() should bypass preference check when skipPreferenceCheck=true', async () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test123' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();
    mgr.provider = 'mock';

    // Even with a blocking preference model, skip should bypass
    mgr._EmailPreference = {
      shouldSendEmail: jest.fn().mockResolvedValue(false),
    };

    const result = await mgr.send({
      to: 'test@test.com',
      subject: 'OTP Code',
      html: '<p>123456</p>',
      userId: 'user123',
      category: 'auth',
      skipPreferenceCheck: true,
    });

    // Should NOT be blocked — preference check was skipped
    expect(mgr._EmailPreference.shouldSendEmail).not.toHaveBeenCalled();
  });

  test('send() should not check preferences when userId is missing', async () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();
    mgr.provider = 'mock';

    const shouldSend = jest.fn();
    mgr._EmailPreference = { shouldSendEmail: shouldSend };

    await mgr.send({
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      // no userId or category
    });

    expect(shouldSend).not.toHaveBeenCalled();
  });
});

describe('Phase 4: Attachment Size Validation', () => {
  test('send() should reject attachments larger than 25MB', async () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();

    // Create a buffer larger than 25MB
    const bigBuffer = Buffer.alloc(26 * 1024 * 1024);

    const result = await mgr.send({
      to: 'test@test.com',
      subject: 'Big attachment',
      html: '<p>File</p>',
      attachments: [{ filename: 'huge.bin', content: bigBuffer }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('ATTACHMENT_TOO_LARGE');
    expect(result.code).toBe('E010');
    expect(result.maxSizeMB).toBe(25);
  });

  test('send() should allow attachments under 25MB', async () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test123' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();
    mgr.provider = 'mock';

    const smallBuffer = Buffer.alloc(1024); // 1KB

    const result = await mgr.send({
      to: 'test@test.com',
      subject: 'Small attachment',
      html: '<p>File</p>',
      attachments: [{ filename: 'small.bin', content: smallBuffer }],
    });

    // Should not be rejected due to size
    expect(result.error).not.toBe('ATTACHMENT_TOO_LARGE');
  });
});

describe('Phase 4: EmailManager Service Wiring', () => {
  test('should have setDigestAggregator method', () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();
    expect(typeof mgr.setDigestAggregator).toBe('function');
  });

  test('setDigestAggregator should store reference', () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();

    const mockAggregator = { add: jest.fn(), flushDaily: jest.fn() };
    mgr.setDigestAggregator(mockAggregator);
    expect(mgr._digestAggregator).toBe(mockAggregator);
  });

  test('should have _getEmailPreferenceModel method', () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const EmailManager = require('../services/email/EmailManager');
    const mgr = new EmailManager();
    expect(typeof mgr._getEmailPreferenceModel).toBe('function');
  });

  test('index.js should wire digestAggregator to emailManager', () => {
    jest.resetModules();
    jest.mock('nodemailer', () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
        verify: jest.fn().mockResolvedValue(true),
      }),
    }));
    const { emailManager } = require('../services/email');
    // After index.js wiring, the manager should have digest aggregator
    expect(emailManager._digestAggregator).toBeDefined();
  });
});

describe('Phase 4: Scheduler Digest Integration', () => {
  test('emailScheduler should have setDigestAggregator method', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.join(__dirname, '../services/email/emailScheduler.js'),
      'utf8'
    );
    expect(code).toContain('setDigestAggregator');
    expect(code).toContain('_digestAggregator');
  });

  test('daily digest should flush digest aggregator', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.join(__dirname, '../services/email/emailScheduler.js'),
      'utf8'
    );
    expect(code).toContain('this._digestAggregator');
    expect(code).toContain('flushDaily()');
    expect(code).toContain('Daily digest aggregator flushed');
  });

  test('weekly performance should flush weekly digest aggregator', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.join(__dirname, '../services/email/emailScheduler.js'),
      'utf8'
    );
    expect(code).toContain('flushWeekly()');
    expect(code).toContain('Weekly digest aggregator flushed');
  });
});

describe('Phase 4: Template Versioning & Hot-Reload', () => {
  test('EmailTemplateEngine should have version registry', () => {
    const { EmailTemplateEngine } = require('../services/email/EmailTemplateEngine');
    const engine = new EmailTemplateEngine();
    expect(engine._templateVersions).toBeInstanceOf(Map);
    expect(typeof engine.getTemplateVersion).toBe('function');
    expect(typeof engine.getAllVersions).toBe('function');
  });

  test('render() should track template version', () => {
    const { EmailTemplateEngine } = require('../services/email/EmailTemplateEngine');
    const engine = new EmailTemplateEngine();

    engine.render('WELCOME', { name: 'Test', loginUrl: '#' });
    const ver = engine.getTemplateVersion('WELCOME');
    expect(ver).toBeDefined();
    expect(ver.version).toBe('1.0.0');
    expect(ver.renderCount).toBe(1);
    expect(ver.lastRenderedAt).toBeDefined();

    // Render again — should increment
    engine.render('WELCOME', { name: 'Test2', loginUrl: '#' });
    const ver2 = engine.getTemplateVersion('WELCOME');
    expect(ver2.renderCount).toBe(2);
  });

  test('getAllVersions should return all tracked templates', () => {
    const { EmailTemplateEngine } = require('../services/email/EmailTemplateEngine');
    const engine = new EmailTemplateEngine();

    engine.render('WELCOME', { name: 'A', loginUrl: '#' });
    engine.render('LOGIN_ALERT', { name: 'B', ip: '1.2.3.4', device: 'Chrome', time: 'now' });

    const versions = engine.getAllVersions();
    expect(Object.keys(versions)).toContain('WELCOME');
    expect(Object.keys(versions)).toContain('LOGIN_ALERT');
  });

  test('getStats should return engine statistics', () => {
    const { EmailTemplateEngine } = require('../services/email/EmailTemplateEngine');
    const engine = new EmailTemplateEngine();
    engine.render('WELCOME', { name: 'T', loginUrl: '#' });

    const stats = engine.getStats();
    expect(stats.totalRenders).toBeGreaterThanOrEqual(1);
    expect(typeof stats.cacheSize).toBe('number');
    expect(typeof stats.trackedTemplates).toBe('number');
    expect(typeof stats.watching).toBe('boolean');
  });

  test('should have startWatching/stopWatching methods', () => {
    const { EmailTemplateEngine } = require('../services/email/EmailTemplateEngine');
    const engine = new EmailTemplateEngine();
    expect(typeof engine.startWatching).toBe('function');
    expect(typeof engine.stopWatching).toBe('function');
  });

  test('stopWatching should be safe to call without watcher', () => {
    const { EmailTemplateEngine } = require('../services/email/EmailTemplateEngine');
    const engine = new EmailTemplateEngine();
    expect(() => engine.stopWatching()).not.toThrow();
  });
});

describe('Phase 4: Digest & Scheduler API Endpoints', () => {
  test('email.routes.js should have digest endpoints', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../routes/email.routes.js'), 'utf8');
    expect(code).toContain("'/digest/stats'");
    expect(code).toContain("'/digest/queue'");
    expect(code).toContain("'/digest/flush/daily'");
    expect(code).toContain("'/digest/flush/weekly'");
    expect(code).toContain("'/digest/purge'");
  });

  test('email.routes.js should have scheduler endpoints', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../routes/email.routes.js'), 'utf8');
    expect(code).toContain("'/scheduler/status'");
    expect(code).toContain("'/scheduler/run/:jobName'");
    expect(code).toContain("'/scheduler/jobs'");
  });

  test('email.routes.js should import digestAggregator', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../routes/email.routes.js'), 'utf8');
    expect(code).toContain('digestAggregator');
  });
});

describe('Phase 4: Config Validation at Startup', () => {
  test('server.js should call validateAndLog', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    expect(code).toContain('validateAndLog');
    expect(code).toContain('EmailConfigValidator');
  });

  test('server.js should import digestAggregator', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    expect(code).toContain('digestAggregator');
    expect(code).toContain('setDigestAggregator');
  });

  test('server.js should have digest aggregator shutdown hook', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
    expect(code).toContain("'Email Digest Aggregator'");
    expect(code).toContain('_digestAggregator');
    expect(code).toContain('.purge()');
  });
});

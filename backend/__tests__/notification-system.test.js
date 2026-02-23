/**
 * Notification System Tests
 * Tests for Email, SMS, Push, and In-App notifications
 * Created: February 22, 2026
 */

const NotificationService = require('../services/notificationService');
const {
  NotificationTemplate,
  EmailService,
  SMSService,
  PushNotificationService,
} = NotificationService;
const { initializeTemplates } = require('../config/notificationTemplates');

describe('Notification System', () => {
  let notificationService;
  let emailService;
  let smsService;
  let pushService;

  beforeEach(() => {
    // Initialize services
    notificationService = NotificationService.initialize({
      email: {
        from: 'test@alawael.com',
        host: 'smtp.test.com',
      },
      sms: {
        accountSid: 'test-sid',
        authToken: 'test-token',
      },
      push: {
        vapidPublicKey: 'test-public',
      },
    });

    emailService = notificationService.emailService;
    smsService = notificationService.smsService;
    pushService = notificationService.pushService;

    // Initialize templates
    initializeTemplates(notificationService);
  });

  describe('NotificationTemplate', () => {
    it('should create a template with correct properties', () => {
      const template = new NotificationTemplate(
        'test',
        'email',
        'Test Subject',
        'Test {{name}}',
        ['{{name}}']
      );

      expect(template.name).toBe('test');
      expect(template.type).toBe('email');
      expect(template.subject).toBe('Test Subject');
      expect(template.variables).toContain('{{name}}');
    });

    it('should render template with variables', () => {
      const template = new NotificationTemplate(
        'greeting',
        'email',
        'Hello {{name}}',
        'Welcome {{name}}!',
        ['{{name}}']
      );

      const rendered = template.render({ name: 'Ahmed' });

      expect(rendered.subject).toBe('Hello Ahmed');
      expect(rendered.body).toBe('Welcome Ahmed!');
    });

    it('should validate required variables', () => {
      const template = new NotificationTemplate(
        'order',
        'email',
        'Order {{orderId}}',
        'Order {{orderId}} for {{customerName}}',
        ['{{orderId}}', '{{customerName}}']
      );

      const validationFull = template.validateVariables({
        orderId: '123',
        customerName: 'John',
      });

      expect(validationFull.valid).toBe(true);
      expect(validationFull.missing).toHaveLength(0);

      const validationPartial = template.validateVariables({
        orderId: '123',
      });

      expect(validationPartial.valid).toBe(false);
      expect(validationPartial.missing).toContain('customerName');
    });

    it('should handle multiple variable occurrences', () => {
      const template = new NotificationTemplate(
        'test',
        'email',
        'Hello {{name}}',
        '{{name}}, your name is {{name}}',
        ['{{name}}']
      );

      const rendered = template.render({ name: 'Alice' });

      expect(rendered.body).toBe('Alice, your name is Alice');
    });
  });

  describe('EmailService', () => {
    it('should send email with template', async () => {
      const template = notificationService.getTemplate('welcome', 'email');

      const result = await emailService.send(
        'test@example.com',
        template,
        {
          name: 'John',
          loginUrl: 'https://alawael.com/login',
        },
        {
          from: 'noreply@alawael.com',
        }
      );

      expect(result.type).toBe('email');
      expect(result.to).toBe('test@example.com');
      expect(result.status).toBe('sent');
      expect(emailService.sentEmails).toHaveLength(1);
    });

    it('should handle missing required variables', async () => {
      const template = notificationService.getTemplate('welcome', 'email');

      try {
        await emailService.send('test@example.com', template, {
          // Missing 'name' and 'loginUrl'
        });
        fail('Should throw error');
      } catch (error) {
        expect(error.message).toContain('Missing required variables');
      }
    });

    it('should track failed emails', async () => {
      const template = notificationService.getTemplate('welcome', 'email');

      try {
        // Force failure by using invalid template
        await emailService.send('test@example.com', template, {
          // Missing required variables
        });
      } catch (error) {
        expect(emailService.failedEmails.length).toBeGreaterThan(0);
      }
    });

    it('should return email statistics', () => {
      const stats = emailService.getStats();

      expect(stats).toHaveProperty('totalSent');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('successRate');
    });
  });

  describe('SMSService', () => {
    it('should send SMS with template', async () => {
      const template = notificationService.getTemplate('otp', 'sms');

      const result = await smsService.send('+966501234567', template, {
        code: '123456',
      });

      expect(result.type).toBe('sms');
      expect(result.to).toBe('+966501234567');
      expect(result.status).toBe('sent');
      expect(smsService.sentSMS).toHaveLength(1);
    });

    it('should limit SMS message to 160 characters', async () => {
      const template = notificationService.getTemplate('otp', 'sms');

      const result = await smsService.send('+966501234567', template, {
        code: '123456',
      });

      expect(result.message.length).toBeLessThanOrEqual(160);
    });

    it('should track SMS costs', async () => {
      const template = notificationService.getTemplate('otp', 'sms');

      await smsService.send('+966501234567', template, {
        code: '123456',
      });

      const stats = smsService.getStats();
      expect(stats.totalCost).toBeGreaterThan(0);
    });

    it('should get SMS statistics', () => {
      const stats = smsService.getStats();

      expect(stats).toHaveProperty('totalSent');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('totalCost');
    });
  });

  describe('PushNotificationService', () => {
    it('should register subscription', () => {
      const subscription = {
        endpoint: 'https://push.example.com',
        keys: { p256dh: 'key', auth: 'auth' },
      };

      const result = pushService.registerSubscription('user123', subscription);

      expect(result.userId).toBe('user123');
      expect(result.active).toBe(true);
      expect(pushService.subscriptions).toHaveLength(1);
    });

    it('should send push notification to subscribed user', async () => {
      // Register subscription first
      pushService.registerSubscription('user123', {
        endpoint: 'https://push.example.com',
        keys: { p256dh: 'key', auth: 'auth' },
      });

      const template = notificationService.getTemplate('orderUpdate', 'push');
      const result = await pushService.send('user123', template, {
        orderId: '12345',
        status: 'Shipped',
      });

      expect(result.totalSent).toBeGreaterThan(0);
    });

    it('should not send push without active subscriptions', async () => {
      const template = notificationService.getTemplate('orderUpdate', 'push');

      try {
        await pushService.send('nonexistent-user', template, {
          orderId: '12345',
          status: 'Shipped',
        });
        fail('Should throw error');
      } catch (error) {
        expect(error.message).toContain('No active push subscriptions');
      }
    });

    it('should cleanup inactive subscriptions', () => {
      // Register old subscription
      const old = pushService.subscriptions[0];
      if (old) {
        old.lastActive = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago
      }

      const result = pushService.cleanupInactiveSubscriptions(30);

      expect(result.removed).toBeGreaterThanOrEqual(0);
    });

    it('should get push notification statistics', () => {
      const stats = pushService.getStats();

      expect(stats).toHaveProperty('totalSent');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('activeSubscriptions');
      expect(stats).toHaveProperty('totalSubscriptions');
    });
  });

  describe('NotificationService', () => {
    it('should initialize with all services', () => {
      expect(notificationService.emailService).toBeDefined();
      expect(notificationService.smsService).toBeDefined();
      expect(notificationService.pushService).toBeDefined();
    });

    it('should register and retrieve templates', () => {
      const template = new NotificationTemplate(
        'custom',
        'email',
        'Custom Subject',
        'Custom Body',
        []
      );

      notificationService.registerTemplate(template);

      const retrieved = notificationService.getTemplate('custom', 'email');
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('custom');
    });

    it('should send email with template', async () => {
      const result = await notificationService.sendEmailWithTemplate(
        'test@example.com',
        'welcome',
        {
          name: 'John',
          loginUrl: 'https://alawael.com',
        }
      );

      expect(result.success).toBe(true);
    });

    it('should send SMS with template', async () => {
      const result = await notificationService.sendSmsWithTemplate(
        '+966501234567',
        'otp',
        {
          code: '123456',
        }
      );

      expect(result.success).toBe(true);
    });

    it('should send push notification with template', async () => {
      // Register subscription first
      pushService.registerSubscription('user123', {
        endpoint: 'https://push.example.com',
        keys: { p256dh: 'key', auth: 'auth' },
      });

      const result = await notificationService.sendPushWithTemplate(
        'user123',
        'orderUpdate',
        {
          orderId: '12345',
          status: 'Shipped',
        }
      );

      expect(result.success).toBe(true);
    });

    it('should set and get user preferences', async () => {
      const prefs = {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
      };

      const result = await notificationService.setNotificationPreferences('user123', prefs);

      expect(result.success).toBe(true);
      expect(result.preferences.userId).toBe('user123');
    });

    it('should retrieve user preferences', async () => {
      await notificationService.setNotificationPreferences('user456', {
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: false,
      });

      const result = await notificationService.getNotificationPreferences('user456');

      expect(result.success).toBe(true);
      expect(result.preferences.smsEnabled).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should send notification via multiple channels', async () => {
      // Register push subscription
      pushService.registerSubscription('user789', {
        endpoint: 'https://push.example.com',
        keys: { p256dh: 'key', auth: 'auth' },
      });

      // Send via email
      const emailResult = await notificationService.sendEmailWithTemplate(
        'user789@example.com',
        'orderConfirmation',
        {
          customerName: 'Mohamed',
          orderId: 'ORD-123',
          total: '500',
          currency: 'SAR',
          deliveryDate: '2026-02-27',
          trackingUrl: 'https://alawael.com/track',
        }
      );

      expect(emailResult.success).toBe(true);

      // Send via SMS
      const smsResult = await notificationService.sendSmsWithTemplate('+966501234567', 'orderStatus', {
        orderId: 'ORD-123',
        status: 'Confirmed',
        message: 'Your order has been confirmed',
      });

      expect(smsResult.success).toBe(true);

      // Send via push
      const pushResult = await notificationService.sendPushWithTemplate(
        'user789',
        'orderUpdate',
        {
          orderId: 'ORD-123',
          status: 'Confirmed',
        }
      );

      expect(pushResult.success).toBe(true);
    });

    it('should get comprehensive statistics', () => {
      const stats = notificationService.getStatistics();

      expect(stats).toHaveProperty('email');
      expect(stats).toHaveProperty('sms');
      expect(stats).toHaveProperty('push');
      expect(stats).toHaveProperty('totalNotifications');
    });
  });
});

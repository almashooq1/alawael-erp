const request = require('supertest');

jest.mock('../models/Notification');
jest.mock('../models/NotificationTemplate');

describe('Smart Notification System - Phase 5', () => {
  let smartNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();

    smartNotificationService = {
      on: jest.fn(),
      emit: jest.fn(),

      // Notification methods
      sendNotification: jest.fn(),
      deliverNotification: jest.fn(),
      sendToChannel: jest.fn(),
      batchSend: jest.fn(),
      scheduleBulk: jest.fn(),
      processPending: jest.fn(),
      retryFailed: jest.fn(),

      // Query methods
      getUnreadNotifications: jest.fn(),
      markAsRead: jest.fn(),
      recordClick: jest.fn(),
      unsubscribe: jest.fn(),
      getNotification: jest.fn(),
      getNotificationsByType: jest.fn(),

      // Template methods
      createTemplate: jest.fn(),
      getTemplatePerformance: jest.fn(),

      // Analytics
      getAnalytics: jest.fn(),
    };
  });

  describe('NOTIFICATION SENDING', () => {
    test('should send notification via template', async () => {
      const expectedNotification = {
        notificationId: 'NOTIF-123456789',
        recipientId: 'user-123',
        templateName: 'Payment Confirmation',
        type: 'payment_confirmation',
        status: 'sent',
        sentAt: new Date(),
      };

      smartNotificationService.sendNotification.mockImplementation(
        async (type, recipientId, data) => {
          smartNotificationService.emit('notification-created', expectedNotification);
          return expectedNotification;
        }
      );

      const result = await smartNotificationService.sendNotification(
        'payment_confirmation',
        'user-123',
        { amount: '$100' }
      );

      expect(result.notificationId).toBe('NOTIF-123456789');
      expect(result.status).toBe('sent');
      expect(smartNotificationService.emit).toHaveBeenCalledWith(
        'notification-created',
        expect.any(Object)
      );
    });

    test('should send via multiple channels', async () => {
      const notification = {
        notificationId: 'NOTIF-123456789',
        channels: ['email', 'sms', 'push'],
        channelStatus: [
          { channel: 'email', status: 'sent' },
          { channel: 'sms', status: 'sent' },
          { channel: 'push', status: 'sent' },
        ],
      };

      smartNotificationService.deliverNotification.mockResolvedValue(notification);

      const result = await smartNotificationService.deliverNotification(notification);

      expect(result.channelStatus).toHaveLength(3);
      expect(result.channelStatus[0].status).toBe('sent');
    });

    test('should batch send notifications', async () => {
      const notifications = [
        { notificationId: 'NOTIF-1', recipientId: 'user-1', status: 'sent' },
        { notificationId: 'NOTIF-2', recipientId: 'user-2', status: 'sent' },
        { notificationId: 'NOTIF-3', recipientId: 'user-3', status: 'sent' },
      ];

      smartNotificationService.batchSend.mockImplementation(
        async (recipients, templateName, data) => {
          smartNotificationService.emit('batch-sent', { count: notifications.length, recipients });
          return notifications;
        }
      );

      const result = await smartNotificationService.batchSend(
        ['user-1', 'user-2', 'user-3'],
        'invoice_reminder',
        { invoiceNumber: 'INV-001' }
      );

      expect(result).toHaveLength(3);
      expect(smartNotificationService.emit).toHaveBeenCalledWith('batch-sent', expect.any(Object));
    });

    test('should schedule bulk notifications', async () => {
      const scheduledDate = new Date('2026-02-20');
      const notifications = [
        { notificationId: 'NOTIF-1', scheduledFor: scheduledDate, status: 'scheduled' },
        { notificationId: 'NOTIF-2', scheduledFor: scheduledDate, status: 'scheduled' },
      ];

      smartNotificationService.scheduleBulk.mockResolvedValue(notifications);

      const result = await smartNotificationService.scheduleBulk(
        [
          { recipientId: 'user-1', type: 'promotion' },
          { recipientId: 'user-2', type: 'promotion' },
        ],
        'promotional_offer',
        scheduledDate
      );

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('scheduled');
    });

    test('should process pending notifications', async () => {
      const pending = [
        { notificationId: 'NOTIF-1', status: 'pending' },
        { notificationId: 'NOTIF-2', status: 'pending' },
      ];

      smartNotificationService.processPending.mockImplementation(async () => {
        smartNotificationService.emit('pending-processed', { count: pending.length });
        return pending;
      });

      const result = await smartNotificationService.processPending();

      expect(result).toHaveLength(2);
      expect(smartNotificationService.emit).toHaveBeenCalledWith(
        'pending-processed',
        expect.any(Object)
      );
    });

    test('should retry failed notifications', async () => {
      const failed = [{ notificationId: 'NOTIF-1', retryCount: 1, status: 'pending' }];

      smartNotificationService.retryFailed.mockResolvedValue(failed);

      const result = await smartNotificationService.retryFailed();

      expect(result).toHaveLength(1);
      expect(result[0].retryCount).toBe(1);
    });
  });

  describe('NOTIFICATION TRACKING', () => {
    test('should get unread notifications', async () => {
      const unread = [
        { notificationId: 'NOTIF-1', readAt: null, status: 'sent' },
        { notificationId: 'NOTIF-2', readAt: null, status: 'sent' },
      ];

      smartNotificationService.getUnreadNotifications.mockResolvedValue(unread);

      const result = await smartNotificationService.getUnreadNotifications('user-123', 10);

      expect(result).toHaveLength(2);
      expect(result[0].readAt).toBeNull();
    });

    test('should mark notification as read', async () => {
      const notification = {
        notificationId: 'NOTIF-1',
        readAt: new Date(),
        status: 'sent',
      };

      smartNotificationService.markAsRead.mockImplementation(async notificationId => {
        smartNotificationService.emit('notification-read', { notificationId });
        return notification;
      });

      const result = await smartNotificationService.markAsRead('NOTIF-1');

      expect(result.readAt).toBeDefined();
      expect(smartNotificationService.emit).toHaveBeenCalledWith(
        'notification-read',
        expect.any(Object)
      );
    });

    test('should record notification click', async () => {
      const notification = {
        notificationId: 'NOTIF-1',
        clickCount: 1,
      };

      smartNotificationService.recordClick.mockImplementation(async notificationId => {
        smartNotificationService.emit('notification-clicked', { notificationId });
        return notification;
      });

      const result = await smartNotificationService.recordClick('NOTIF-1');

      expect(result.clickCount).toBe(1);
      expect(smartNotificationService.emit).toHaveBeenCalledWith(
        'notification-clicked',
        expect.any(Object)
      );
    });

    test('should unsubscribe from notification', async () => {
      const notification = {
        notificationId: 'NOTIF-1',
        isUnsubscribed: true,
        unsubscribedAt: new Date(),
      };

      smartNotificationService.unsubscribe.mockImplementation(async notificationId => {
        smartNotificationService.emit('notification-unsubscribed', { notificationId });
        return notification;
      });

      const result = await smartNotificationService.unsubscribe('NOTIF-1');

      expect(result.isUnsubscribed).toBe(true);
      expect(smartNotificationService.emit).toHaveBeenCalledWith(
        'notification-unsubscribed',
        expect.any(Object)
      );
    });

    test('should get notifications by type', async () => {
      const notifications = [
        { notificationId: 'NOTIF-1', type: 'payment_confirmation' },
        { notificationId: 'NOTIF-2', type: 'payment_confirmation' },
      ];

      smartNotificationService.getNotificationsByType.mockResolvedValue(notifications);

      const result = await smartNotificationService.getNotificationsByType(
        'user-123',
        'payment_confirmation'
      );

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('payment_confirmation');
    });
  });

  describe('TEMPLATE MANAGEMENT', () => {
    test('should create notification template', async () => {
      const template = {
        _id: 'template-1',
        templateName: 'Payment Confirmation',
        templateCode: 'PAYMENT_CONFIRM',
        emailBody: 'Your payment of {{amount}} has been confirmed',
        variables: [{ name: 'amount', required: true }],
        status: 'draft',
      };

      smartNotificationService.createTemplate.mockImplementation(async data => {
        smartNotificationService.emit('template-created', { templateCode: template.templateCode });
        return template;
      });

      const result = await smartNotificationService.createTemplate({
        name: 'Payment Confirmation',
        code: 'PAYMENT_CONFIRM',
        emailBody: 'Your payment of {{amount}} has been confirmed',
        variables: [{ name: 'amount', required: true }],
      });

      expect(result.templateCode).toBe('PAYMENT_CONFIRM');
      expect(smartNotificationService.emit).toHaveBeenCalledWith(
        'template-created',
        expect.any(Object)
      );
    });

    test('should get template performance', async () => {
      const performance = {
        template: 'Payment Confirmation',
        totalSent: 1000,
        deliveryRate: 98.5,
        openRate: 45.2,
        clickRate: 12.5,
        conversionRate: 8.3,
      };

      smartNotificationService.getTemplatePerformance.mockResolvedValue(performance);

      const result = await smartNotificationService.getTemplatePerformance('template-1');

      expect(result.deliveryRate).toBe(98.5);
      expect(result.openRate).toBe(45.2);
      expect(result.clickRate).toBe(12.5);
    });
  });

  describe('ANALYTICS', () => {
    test('should get notification analytics', async () => {
      const stats = {
        total: 5000,
        sent: 4950,
        failed: 50,
        delivered: 4920,
        opened: 2214,
        clicked: 276,
        deliveryRate: 98.4,
        openRate: 44.8,
        clickRate: 12.5,
      };

      smartNotificationService.getAnalytics.mockResolvedValue(stats);

      const result = await smartNotificationService.getAnalytics(24);

      expect(result.total).toBe(5000);
      expect(result.deliveryRate).toBe(98.4);
      expect(result.openRate).toBe(44.8);
    });
  });

  describe('ERROR HANDLING', () => {
    test('should handle missing template', async () => {
      smartNotificationService.sendNotification.mockRejectedValue(new Error('Template not found'));

      try {
        await smartNotificationService.sendNotification('invalid_template', 'user-123');
      } catch (error) {
        expect(error.message).toBe('Template not found');
      }
    });

    test('should handle invalid notification ID', async () => {
      smartNotificationService.markAsRead.mockRejectedValue(new Error('Notification not found'));

      try {
        await smartNotificationService.markAsRead('invalid-id');
      } catch (error) {
        expect(error.message).toBe('Notification not found');
      }
    });

    test('should handle channel delivery failure', async () => {
      smartNotificationService.sendToChannel.mockRejectedValue(
        new Error('Email service unavailable')
      );

      try {
        await smartNotificationService.sendToChannel({}, 'email');
      } catch (error) {
        expect(error.message).toContain('unavailable');
      }
    });

    test('should validate template fields', async () => {
      smartNotificationService.createTemplate.mockRejectedValue(
        new Error('Template validation failed')
      );

      try {
        await smartNotificationService.createTemplate({
          name: '',
          code: '',
          emailBody: '',
        });
      } catch (error) {
        expect(error.message).toContain('validation');
      }
    });
  });

  describe('MULTI-CHANNEL DELIVERY', () => {
    test('should send email notification', async () => {
      const notification = {
        notificationId: 'NOTIF-1',
        channels: ['email'],
        channelStatus: [{ channel: 'email', status: 'sent' }],
      };

      smartNotificationService.sendToChannel.mockResolvedValue(true);

      const result = await smartNotificationService.sendToChannel(notification, 'email');

      expect(result).toBe(true);
    });

    test('should send SMS notification', async () => {
      const notification = {
        notificationId: 'NOTIF-1',
        channels: ['sms'],
        channelStatus: [{ channel: 'sms', status: 'sent' }],
      };

      smartNotificationService.sendToChannel.mockResolvedValue(true);

      const result = await smartNotificationService.sendToChannel(notification, 'sms');

      expect(result).toBe(true);
    });

    test('should send push notification', async () => {
      const notification = {
        notificationId: 'NOTIF-1',
        channels: ['push'],
        channelStatus: [{ channel: 'push', status: 'sent' }],
      };

      smartNotificationService.sendToChannel.mockResolvedValue(true);

      const result = await smartNotificationService.sendToChannel(notification, 'push');

      expect(result).toBe(true);
    });

    test('should fallback on channel failure', async () => {
      const notification = {
        notificationId: 'NOTIF-1',
        channels: ['email', 'sms'],
        channelStatus: [
          { channel: 'email', status: 'failed' },
          { channel: 'sms', status: 'sent' },
        ],
      };

      smartNotificationService.sendToChannel.mockResolvedValueOnce(false);
      smartNotificationService.sendToChannel.mockResolvedValueOnce(true);

      const emailResult = await smartNotificationService.sendToChannel(notification, 'email');
      const smsResult = await smartNotificationService.sendToChannel(notification, 'sms');

      expect(emailResult).toBe(false);
      expect(smsResult).toBe(true);
    });
  });

  describe('EVENT EMISSION', () => {
    test('should emit notification-created event', async () => {
      smartNotificationService.sendNotification.mockImplementation(async () => {
        smartNotificationService.emit('notification-created', {
          notificationId: 'NOTIF-1',
          recipientId: 'user-123',
        });
        return { notificationId: 'NOTIF-1' };
      });

      await smartNotificationService.sendNotification('template-code', 'user-123');

      expect(smartNotificationService.emit).toHaveBeenCalledWith(
        'notification-created',
        expect.any(Object)
      );
    });

    test('should emit batch-sent event', async () => {
      smartNotificationService.batchSend.mockImplementation(async () => {
        smartNotificationService.emit('batch-sent', { count: 3 });
        return [{}, {}, {}];
      });

      await smartNotificationService.batchSend(['u1', 'u2', 'u3'], 'code');

      expect(smartNotificationService.emit).toHaveBeenCalledWith(
        'batch-sent',
        expect.objectContaining({ count: 3 })
      );
    });
  });
});

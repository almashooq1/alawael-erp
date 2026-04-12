/**
 * Unit Tests — PushNotificationOptimizer
 * P#67 - Batch 28
 *
 * Singleton (EventEmitter + crypto.randomUUID + Maps).
 * Covers: registerPushToken, unregisterPushToken, validatePushToken,
 *         sendPushNotification, sendBatchNotifications, processPendingNotifications,
 *         recordInteraction, getNotificationStats, configureOptimization,
 *         _optimizeForDevice, _compressPayload, _recordNotificationSent,
 *         _recordNotificationInteraction
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('PushNotificationOptimizer', () => {
  let service;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.isolateModules(() => {
      service = require('../../services/pushNotificationOptimizer.service');
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /* ------------------------------------------------------------------ */
  /*  Initial State                                                      */
  /* ------------------------------------------------------------------ */
  describe('initial state', () => {
    it('starts with empty maps', () => {
      expect(service.pushQueue.size).toBe(0);
      expect(service.deviceTokens.size).toBe(0);
      expect(service.notificationStats.size).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  registerPushToken / unregisterPushToken                             */
  /* ------------------------------------------------------------------ */
  describe('registerPushToken', () => {
    it('registers a device token', () => {
      const res = service.registerPushToken('u1', 'dev1', 'token123', { platform: 'iOS' });
      expect(res.userId).toBe('u1');
      expect(res.deviceId).toBe('dev1');
      expect(res.pushToken).toBe('token123');
      expect(res.platform).toBe('iOS');
      expect(res.isValid).toBe(true);
    });

    it('stores token in deviceTokens map', () => {
      service.registerPushToken('u1', 'dev1', 'tk1');
      expect(service.deviceTokens.has('u1:dev1')).toBe(true);
    });

    it('emits "token:registered" event', () => {
      const spy = jest.fn();
      service.on('token:registered', spy);
      service.registerPushToken('u1', 'dev1', 'tk1', { platform: 'Android' });
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          deviceId: 'dev1',
          platform: 'Android',
        })
      );
    });

    it('defaults platform to "unknown"', () => {
      const res = service.registerPushToken('u1', 'dev1', 'tk1');
      expect(res.platform).toBe('unknown');
    });
  });

  describe('unregisterPushToken', () => {
    it('removes a registered token', () => {
      service.registerPushToken('u1', 'dev1', 'tk1');
      const res = service.unregisterPushToken('u1', 'dev1');
      expect(res).toBe(true);
      expect(service.deviceTokens.has('u1:dev1')).toBe(false);
    });

    it('emits "token:unregistered" event', () => {
      const spy = jest.fn();
      service.on('token:unregistered', spy);
      service.registerPushToken('u1', 'dev1', 'tk1');
      service.unregisterPushToken('u1', 'dev1');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  validatePushToken                                                   */
  /* ------------------------------------------------------------------ */
  describe('validatePushToken', () => {
    it('returns invalid for non-existent token', async () => {
      const res = await service.validatePushToken('u1', 'dev1');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('not found');
    });

    it('validates an existing token (random result)', async () => {
      service.registerPushToken('u1', 'dev1', 'tk1');
      const res = await service.validatePushToken('u1', 'dev1');
      expect(typeof res.valid).toBe('boolean');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  sendPushNotification                                                */
  /* ------------------------------------------------------------------ */
  describe('sendPushNotification', () => {
    it('queues a notification', async () => {
      const res = await service.sendPushNotification({
        userId: 'u1',
        deviceId: 'dev1',
        title: 'Hello',
        body: 'World',
      });
      expect(res.id).toBeDefined();
      expect(res.status).toBe('pending');
      expect(res.title).toBe('Hello');
      expect(res.body).toBe('World');
      expect(service.pushQueue.size).toBe(1);
    });

    it('sets default values for optional fields', async () => {
      const res = await service.sendPushNotification({
        userId: 'u1',
        deviceId: 'dev1',
        title: 'T',
        body: 'B',
      });
      expect(res.badge).toBe(1);
      expect(res.sound).toBe('default');
      expect(res.priority).toBe('normal');
      expect(res.ttl).toBe(3600);
    });

    it('preserves custom data', async () => {
      const res = await service.sendPushNotification({
        userId: 'u1',
        deviceId: 'dev1',
        title: 'T',
        body: 'B',
        customData: { action: 'open', id: '123' },
      });
      expect(res.customData.action).toBe('open');
    });

    it('emits "notification:queued" event', async () => {
      const spy = jest.fn();
      service.on('notification:queued', spy);
      await service.sendPushNotification({ userId: 'u1', deviceId: 'd1', title: 'T', body: 'B' });
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  sendBatchNotifications                                              */
  /* ------------------------------------------------------------------ */
  describe('sendBatchNotifications', () => {
    it('sends to multiple devices', async () => {
      const devices = [
        { userId: 'u1', deviceId: 'd1' },
        { userId: 'u2', deviceId: 'd2' },
        { userId: 'u3', deviceId: 'd3' },
      ];
      const res = await service.sendBatchNotifications(devices, { title: 'Batch', body: 'Test' });
      expect(res.totalCount).toBe(3);
      expect(res.successful.length).toBe(3);
      expect(res.failed.length).toBe(0);
    });

    it('emits "batch:sent" event', async () => {
      const spy = jest.fn();
      service.on('batch:sent', spy);
      await service.sendBatchNotifications([{ userId: 'u1', deviceId: 'd1' }], {
        title: 'T',
        body: 'B',
      });
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  processPendingNotifications                                         */
  /* ------------------------------------------------------------------ */
  describe('processPendingNotifications', () => {
    it('processes pending notifications scheduled for now or past', async () => {
      await service.sendPushNotification({
        userId: 'u1',
        deviceId: 'd1',
        title: 'T',
        body: 'B',
        scheduledFor: new Date(Date.now() - 1000),
      });
      const res = await service.processPendingNotifications();
      expect(res.processedCount).toBe(1);
    });

    it('does not process future-scheduled notifications', async () => {
      await service.sendPushNotification({
        userId: 'u1',
        deviceId: 'd1',
        title: 'T',
        body: 'B',
        scheduledFor: new Date(Date.now() + 60000),
      });
      const res = await service.processPendingNotifications();
      expect(res.processedCount).toBe(0);
    });

    it('marks notification as "sent"', async () => {
      const notif = await service.sendPushNotification({
        userId: 'u1',
        deviceId: 'd1',
        title: 'T',
        body: 'B',
      });
      await service.processPendingNotifications();
      const updated = service.pushQueue.get(notif.id);
      expect(updated.status).toBe('sent');
      expect(updated.sentAt).toBeDefined();
    });

    it('updates notification stats on send', async () => {
      await service.sendPushNotification({
        userId: 'u1',
        deviceId: 'd1',
        title: 'T',
        body: 'B',
      });
      await service.processPendingNotifications();
      const stats = service.notificationStats.get('u1');
      expect(stats.sent).toBe(1);
      expect(stats.total).toBe(1);
    });

    it('emits "notification:sent" for each processed', async () => {
      const spy = jest.fn();
      service.on('notification:sent', spy);
      await service.sendPushNotification({ userId: 'u1', deviceId: 'd1', title: 'T', body: 'B' });
      await service.processPendingNotifications();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  recordInteraction                                                   */
  /* ------------------------------------------------------------------ */
  describe('recordInteraction', () => {
    let notifId;
    beforeEach(async () => {
      const n = await service.sendPushNotification({
        userId: 'u1',
        deviceId: 'd1',
        title: 'T',
        body: 'B',
      });
      notifId = n.id;
      await service.processPendingNotifications();
    });

    it('records "delivered" interaction', () => {
      const res = service.recordInteraction(notifId, 'delivered');
      expect(res.stats.delivered).toBe(true);
      expect(res.deliveredAt).toBeDefined();
    });

    it('records "opened" interaction', () => {
      const res = service.recordInteraction(notifId, 'opened');
      expect(res.stats.opened).toBe(true);
      expect(res.openedAt).toBeDefined();
    });

    it('records "clicked" interaction', () => {
      const res = service.recordInteraction(notifId, 'clicked');
      expect(res.stats.clicked).toBe(true);
      expect(res.clickedAt).toBeDefined();
    });

    it('throws for non-existent notification', () => {
      expect(() => service.recordInteraction('fake', 'opened')).toThrow();
    });

    it('emits "notification:interaction" event', () => {
      const spy = jest.fn();
      service.on('notification:interaction', spy);
      service.recordInteraction(notifId, 'delivered');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('updates user stats for delivered', () => {
      service.recordInteraction(notifId, 'delivered');
      const stats = service.notificationStats.get('u1');
      expect(stats.delivered).toBe(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getNotificationStats                                                */
  /* ------------------------------------------------------------------ */
  describe('getNotificationStats', () => {
    it('returns default stats for unknown user', () => {
      const stats = service.getNotificationStats('unknown');
      expect(stats.total).toBe(0);
      expect(stats.deliveryRate).toBe(0);
    });

    it('calculates rates correctly', async () => {
      const n = await service.sendPushNotification({
        userId: 'u1',
        deviceId: 'd1',
        title: 'T',
        body: 'B',
      });
      await service.processPendingNotifications();
      service.recordInteraction(n.id, 'delivered');
      service.recordInteraction(n.id, 'opened');
      const stats = service.getNotificationStats('u1');
      expect(parseFloat(stats.deliveryRate)).toBe(100);
      expect(parseFloat(stats.openRate)).toBe(100);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  configureOptimization                                               */
  /* ------------------------------------------------------------------ */
  describe('configureOptimization', () => {
    it('returns optimization settings with defaults', () => {
      const res = service.configureOptimization();
      expect(res.batteryOptimization).toBe(true);
      expect(res.networkOptimization).toBe(true);
      expect(res.quietHoursEnabled).toBe(false);
      expect(res.maxNotificationsPerHour).toBe(10);
    });

    it('accepts custom settings', () => {
      const res = service.configureOptimization({
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        maxNotificationsPerHour: 5,
      });
      expect(res.quietHoursEnabled).toBe(true);
      expect(res.quietHoursStart).toBe('23:00');
      expect(res.maxNotificationsPerHour).toBe(5);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _compressPayload                                                    */
  /* ------------------------------------------------------------------ */
  describe('_compressPayload', () => {
    it('keeps only essential fields', () => {
      const result = service._compressPayload({
        action: 'open',
        id: '123',
        type: 'alert',
        url: 'https://example.com',
        extraField: 'removed',
        another: 'gone',
      });
      expect(result.action).toBe('open');
      expect(result.id).toBe('123');
      expect(result.type).toBe('alert');
      expect(result.url).toBe('https://example.com');
      expect(result.extraField).toBeUndefined();
      expect(result.another).toBeUndefined();
    });

    it('returns empty object when no essential fields exist', () => {
      const result = service._compressPayload({ foo: 'bar', baz: 123 });
      expect(Object.keys(result).length).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  testPushDelivery                                                    */
  /* ------------------------------------------------------------------ */
  describe('testPushDelivery', () => {
    it('returns test id and message', async () => {
      const res = await service.testPushDelivery('u1', 'd1');
      expect(res.testId).toBeDefined();
      expect(res.message).toContain('Test');
    });

    it('stores test result in testResults map', async () => {
      const res = await service.testPushDelivery('u1', 'd1');
      expect(service.testResults.has(res.testId)).toBe(true);
    });
  });
});

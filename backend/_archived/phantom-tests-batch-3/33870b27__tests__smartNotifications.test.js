 
/**
 * Notification Service Tests — اختبارات خدمة الإشعارات الموحدة
 *
 * Tests the consolidated notification service at
 * domains/notifications/services/notificationService.js
 * which is re-exported by services/smartNotificationService.js
 *
 * The service is a DB-driven singleton with: send, markAsRead,
 * getNotifications, deleteNotification, scheduleNotification,
 * getStats, createAlertRule, evaluateAlertRules.
 */

// ── Mock Notification model (before any require) ──────────────────────────
const mockNotification = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  updateMany: jest.fn(),
  deleteMany: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
};

const mockAlertRule = {
  create: jest.fn(),
  find: jest.fn(),
};

// Override mongoose.model to return our mocks
const mongoose = require('mongoose');
const originalModelFn = mongoose.model.bind(mongoose);
jest.spyOn(mongoose, 'model').mockImplementation(name => {
  if (name === 'Notification') return mockNotification;
  if (name === 'AlertRule') return mockAlertRule;
  if (name === 'NotificationTemplate') return null;
  if (name === 'NotificationPreference') return null;
  return originalModelFn(name);
});

const notificationService = require('../services/smartNotificationService');

// ═══════════════════════════════════════════════════════════════════════════
// 1. Core Send
// ═══════════════════════════════════════════════════════════════════════════

describe('NotificationService — Core Send', () => {
  beforeEach(() => jest.clearAllMocks());

  test('send() should dispatch through channels and return success', async () => {
    const result = await notificationService.send({
      recipientId: 'user_123',
      title: 'طلب إجازة',
      body: 'تمت الموافقة على طلب الإجازة',
      type: 'info',
      priority: 'normal',
      channels: ['inApp'],
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.channels).toBeDefined();
  });

  test('sendNotification alias should work the same as send', async () => {
    const result = await notificationService.sendNotification({
      recipientId: 'user_456',
      title: 'Test',
      body: 'Test body',
      channels: ['inApp'],
    });

    expect(result.success).toBe(true);
  });

  test('sendBulk() should send to multiple recipients', async () => {
    const results = await notificationService.sendBulk(['user_1', 'user_2', 'user_3'], {
      title: 'إعلان عام',
      body: 'اجتماع غداً',
      channels: ['inApp'],
    });

    expect(results).toHaveLength(3);
    results.forEach(r => {
      expect(r.recipientId).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Read State
// ═══════════════════════════════════════════════════════════════════════════

describe('NotificationService — Read State', () => {
  beforeEach(() => jest.clearAllMocks());

  test('markAsRead() should update notification read status', async () => {
    const mockUpdated = { _id: 'notif1', read: true, readAt: new Date() };
    mockNotification.findOneAndUpdate.mockResolvedValue(mockUpdated);

    const result = await notificationService.markAsRead('notif1', 'user_123');

    expect(mockNotification.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'notif1', recipient: 'user_123' },
      expect.objectContaining({ read: true }),
      { new: true }
    );
    expect(result.read).toBe(true);
  });

  test('markAllAsRead() should update all unread notifications', async () => {
    mockNotification.updateMany.mockResolvedValue({ modifiedCount: 5 });

    const result = await notificationService.markAllAsRead('user_123');

    expect(mockNotification.updateMany).toHaveBeenCalledWith(
      { recipient: 'user_123', read: false },
      expect.objectContaining({ read: true })
    );
    expect(result.modifiedCount).toBe(5);
  });

  test('getUnreadCount() should return count of unread notifications', async () => {
    mockNotification.countDocuments.mockResolvedValue(3);

    const count = await notificationService.getUnreadCount('user_123');

    expect(mockNotification.countDocuments).toHaveBeenCalledWith({
      recipient: 'user_123',
      read: false,
    });
    expect(count).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. CRUD Operations
// ═══════════════════════════════════════════════════════════════════════════

describe('NotificationService — CRUD', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getNotifications() should return paginated results', async () => {
    const mockData = [
      { _id: 'n1', title: 'Test 1', read: false },
      { _id: 'n2', title: 'Test 2', read: true },
    ];
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockData),
    };
    mockNotification.find.mockReturnValue(mockQuery);
    mockNotification.countDocuments.mockResolvedValue(10);

    const result = await notificationService.getNotifications('user_123', { page: 1, limit: 20 });

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
  });

  test('getUserNotifications alias should work', async () => {
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    mockNotification.find.mockReturnValue(mockQuery);
    mockNotification.countDocuments.mockResolvedValue(0);

    const result = await notificationService.getUserNotifications('user_456');
    expect(result.data).toHaveLength(0);
  });

  test('deleteNotification() should remove a specific notification', async () => {
    mockNotification.findOneAndDelete.mockResolvedValue({ _id: 'n1', deleted: true });

    const result = await notificationService.deleteNotification('n1', 'user_123');

    expect(mockNotification.findOneAndDelete).toHaveBeenCalledWith({
      _id: 'n1',
      recipient: 'user_123',
    });
    expect(result).toBeDefined();
  });

  test('deleteAllNotifications() should remove all user notifications', async () => {
    mockNotification.deleteMany.mockResolvedValue({ deletedCount: 8 });

    const result = await notificationService.deleteAllNotifications('user_123');

    expect(mockNotification.deleteMany).toHaveBeenCalledWith({ recipient: 'user_123' });
    expect(result.deletedCount).toBe(8);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Scheduling
// ═══════════════════════════════════════════════════════════════════════════

describe('NotificationService — Scheduling', () => {
  beforeEach(() => jest.clearAllMocks());

  test('scheduleNotification() should create a scheduled record', async () => {
    const scheduled = {
      _id: 'sched1',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 60000),
    };
    mockNotification.create.mockResolvedValue(scheduled);

    const result = await notificationService.scheduleNotification({
      recipientId: 'user_123',
      title: 'Reminder',
      body: 'تذكير بالاجتماع',
      scheduledAt: new Date(Date.now() + 60000),
    });

    expect(mockNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: 'user_123',
        status: 'scheduled',
      })
    );
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Analytics
// ═══════════════════════════════════════════════════════════════════════════

describe('NotificationService — Analytics', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getStats() should return aggregated statistics', async () => {
    mockNotification.aggregate
      .mockResolvedValueOnce([
        { _id: 'info', count: 15 },
        { _id: 'alert', count: 5 },
      ])
      .mockResolvedValueOnce([{ _id: 'hr', count: 10 }])
      .mockResolvedValueOnce([{ _id: null, total: 20, read: 12 }]);

    const stats = await notificationService.getStats({});

    expect(stats.byType).toEqual({ info: 15, alert: 5 });
    expect(stats.total).toBe(20);
    expect(parseFloat(stats.readRate)).toBeCloseTo(60);
  });

  test('getNotificationStats alias should work', async () => {
    mockNotification.aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const stats = await notificationService.getNotificationStats({});
    expect(stats).toBeDefined();
    expect(stats.total).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Alert Rules
// ═══════════════════════════════════════════════════════════════════════════

describe('NotificationService — Alert Rules', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createAlertRule() should persist the rule', async () => {
    const rule = {
      name: 'SLA Breach Alert',
      eventType: 'sla_breach',
      conditions: [{ field: 'delayMinutes', operator: 'gt', value: 30 }],
      recipientId: 'manager_1',
      priority: 'high',
    };
    mockAlertRule.create.mockResolvedValue({ _id: 'rule1', ...rule, enabled: true });

    const result = await notificationService.createAlertRule(rule);

    expect(mockAlertRule.create).toHaveBeenCalledWith(rule);
    expect(result.name).toBe('SLA Breach Alert');
  });

  test('evaluateAlertRules() should trigger matching rules', async () => {
    mockAlertRule.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: 'rule1',
          eventType: 'performance_drop',
          conditions: [{ field: 'score', operator: 'lt', value: 50 }],
          recipientId: 'manager_1',
          alertTitle: 'Performance Alert',
          alertBody: 'Score dropped',
          priority: 'high',
          channels: ['inApp'],
        },
      ]),
    });

    const triggered = await notificationService.evaluateAlertRules({
      type: 'performance_drop',
      data: { score: 30 },
    });

    expect(triggered).toHaveLength(1);
    expect(triggered[0]).toBe('rule1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Channel Adapters
// ═══════════════════════════════════════════════════════════════════════════

describe('NotificationService — Channel Adapters', () => {
  test('should expose standard channel adapters', () => {
    expect(notificationService.channelAdapters).toBeDefined();
    expect(notificationService.channelAdapters.inApp).toBeDefined();
    expect(notificationService.channelAdapters.email).toBeDefined();
    expect(notificationService.channelAdapters.sms).toBeDefined();
    expect(notificationService.channelAdapters.push).toBeDefined();
    expect(notificationService.channelAdapters.whatsapp).toBeDefined();
  });
});

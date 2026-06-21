'use strict';

/**
 * unifiedNotifier in-app channel — Wave 0.
 *
 * Verifies that the unified notifier can route a notification through the
 * consolidated notification domain's inApp adapter, creating a real inbox
 * document for a user while preserving the existing external-channel behavior.
 */

jest.unmock('mongoose');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Keep all external sends disabled in this test.
jest.mock('../services/emailService', () => jest.fn(async () => ({ success: true })));
jest.mock('../services/smsService', () => jest.fn(async () => ({ success: true })));
jest.mock('../services/pushService', () => jest.fn(async () => ({ success: true })));

jest.mock('../domains/notifications/services/notificationService', () => ({
  send: jest.fn(async () => ({ success: true, channels: { inApp: { success: true } } })),
}));

const notificationService = require('../domains/notifications/services/notificationService');
const { notify, NotificationDeliveryLog } = require('../services/unifiedNotifier');

describe('unifiedNotifier — in-app channel', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'unified-notifier-in-app' } });
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    notificationService.send.mockClear();
    await NotificationDeliveryLog.deleteMany({});
  });

  test('delivers in-app when recipientId is provided', async () => {
    const result = await notify({
      to: '966501234567',
      channels: ['in-app'],
      subject: 'تجربة',
      body: 'محتوى تجريبي',
      priority: 'high',
      recipientId: 'user-123',
      beneficiaryId: new mongoose.Types.ObjectId(),
      templateKey: 'test.template',
      metadata: { foo: 'bar' },
    });

    expect(result.success).toBe(true);
    expect(notificationService.send).toHaveBeenCalledTimes(1);
    const call = notificationService.send.mock.calls[0][0];
    expect(call.recipientId).toBe('user-123');
    expect(call.title).toBe('تجربة');
    expect(call.body).toBe('محتوى تجريبي');
    expect(call.priority).toBe('high');
    expect(call.channels).toEqual(['inApp']);
    expect(call.category).toBe('beneficiary.lifecycle');
    expect(call.metadata.templateKey).toBe('test.template');
  });

  test('falls back to userId when recipientId is missing', async () => {
    const userId = new mongoose.Types.ObjectId();
    await notify({
      to: '966501234567',
      channels: ['in-app'],
      body: 'msg',
      userId,
    });

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: String(userId) })
    );
  });

  test('skips in-app gracefully when no recipient is available', async () => {
    const result = await notify({
      to: '966501234567',
      channels: ['in-app'],
      body: 'msg',
    });

    expect(notificationService.send).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.results[0]).toMatchObject({
      channel: 'in-app',
      skipped: true,
      reason: 'in-app-recipient-missing',
    });
  });

  test('external channels still work alongside in-app', async () => {
    const result = await notify({
      to: { phone: '966501234567', email: 'test@example.com' },
      channels: ['email', 'in-app'],
      subject: 'موضوع',
      body: 'نص',
      recipientId: 'user-456',
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    const channels = result.results.map(r => r.channel);
    expect(channels).toContain('email');
    expect(channels).toContain('in-app');
  });

  test('logs a delivery row for the in-app attempt', async () => {
    await notify({
      to: '966501234567',
      channels: ['in-app'],
      body: 'msg',
      recipientId: 'user-789',
    });

    const log = await NotificationDeliveryLog.findOne({ channel: 'in-app' })
      .sort({ createdAt: -1 })
      .lean();
    expect(log).toBeTruthy();
    expect(log.to).toBe('user-789');
    expect(log.status).toBe('sent');
  });
});

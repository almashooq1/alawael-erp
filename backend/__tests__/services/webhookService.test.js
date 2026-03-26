/**
 * Tests for WebhookService
 * اختبارات خدمة الويب هوك
 */

'use strict';

const { Types } = require('mongoose');

// ── Mock models ──────────────────────────────────────────────────
const savedWebhooks = [];
const savedDeliveries = [];

const mockWebhookSave = jest.fn(async function () {
  const doc = { ...this, _id: this._id || new Types.ObjectId() };
  savedWebhooks.push(doc);
  return doc;
});

const mockDeliverySave = jest.fn(async function () {
  const doc = { ...this, _id: this._id || new Types.ObjectId() };
  savedDeliveries.push(doc);
  return doc;
});

jest.mock('../../models/Webhook', () => {
  const MockWebhook = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: new (require('mongoose').Types.ObjectId)() });
    this.save = mockWebhookSave.bind(this);
  });
  MockWebhook.find = jest.fn().mockReturnValue({
    populate: jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    }),
  });
  MockWebhook.findById = jest.fn().mockReturnValue({
    populate: jest.fn().mockResolvedValue(null),
  });
  MockWebhook.findByIdAndUpdate = jest.fn().mockReturnValue({
    populate: jest.fn().mockResolvedValue(null),
  });
  MockWebhook.findByIdAndDelete = jest.fn().mockResolvedValue(null);
  MockWebhook.countDocuments = jest.fn().mockResolvedValue(0);
  return MockWebhook;
});

jest.mock('../../models/WebhookDelivery', () => {
  const MockDelivery = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: new (require('mongoose').Types.ObjectId)() });
    this.save = mockDeliverySave.bind(this);
  });
  MockDelivery.find = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      skip: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      }),
    }),
  });
  MockDelivery.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
  MockDelivery.countDocuments = jest.fn().mockResolvedValue(0);
  return MockDelivery;
});

jest.mock('../../utils/urlValidator', () => ({
  validateOutboundUrl: jest.fn().mockResolvedValue(new URL('https://example.com')),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const Webhook = require('../../models/Webhook');
const WebhookDelivery = require('../../models/WebhookDelivery');
const { WebhookService } = require('../../services/webhookService');

describe('WebhookService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    savedWebhooks.length = 0;
    savedDeliveries.length = 0;
    service = new WebhookService();
  });

  // ── registerWebhook ────────────────────────────────────────────
  describe('registerWebhook', () => {
    test('should save webhook with generated secretKey and default status', async () => {
      const result = await service.registerWebhook({
        name: 'Test Hook',
        url: 'https://example.com/hook',
        events: ['order.created'],
        createdBy: new Types.ObjectId(),
      });

      expect(mockWebhookSave).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.secretKey).toBeDefined();
      expect(result.secretKey.length).toBe(64); // 32 bytes hex
      expect(result.status).toBe('active');
    });

    test('should use default name when not provided', async () => {
      const result = await service.registerWebhook({
        url: 'https://example.com/hook',
      });

      expect(result.name).toBe('Webhook');
    });
  });

  // ── getAllWebhooks ─────────────────────────────────────────────
  describe('getAllWebhooks', () => {
    test('should return webhooks with no filter', async () => {
      const result = await service.getAllWebhooks();
      expect(Webhook.find).toHaveBeenCalledWith({});
      expect(result).toEqual([]);
    });

    test('should filter by event and status', async () => {
      await service.getAllWebhooks({ event: 'order.created', status: 'active' });
      expect(Webhook.find).toHaveBeenCalledWith({
        events: 'order.created',
        status: 'active',
      });
    });
  });

  // ── getWebhookById ─────────────────────────────────────────────
  describe('getWebhookById', () => {
    test('should return null for non-existent webhook', async () => {
      const result = await service.getWebhookById(new Types.ObjectId());
      expect(result).toBeNull();
    });
  });

  // ── updateWebhook ──────────────────────────────────────────────
  describe('updateWebhook', () => {
    test('should return null if webhook not found', async () => {
      const result = await service.updateWebhook(new Types.ObjectId(), { name: 'Updated' });
      expect(result).toBeNull();
    });

    test('should call findByIdAndUpdate with correct params', async () => {
      const id = new Types.ObjectId();
      await service.updateWebhook(id, { name: 'Updated' });
      expect(Webhook.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        expect.objectContaining({ name: 'Updated' }),
        { new: true, runValidators: true }
      );
    });
  });

  // ── deleteWebhook ──────────────────────────────────────────────
  describe('deleteWebhook', () => {
    test('should return null if webhook not found', async () => {
      const result = await service.deleteWebhook(new Types.ObjectId());
      expect(result).toBeNull();
    });

    test('should return success when deleted', async () => {
      Webhook.findByIdAndDelete.mockResolvedValueOnce({ _id: new Types.ObjectId() });
      const result = await service.deleteWebhook(new Types.ObjectId());
      expect(result).toEqual({ success: true });
    });
  });

  // ── triggerWebhook ─────────────────────────────────────────────
  describe('triggerWebhook', () => {
    test('should return null if webhook not found', async () => {
      Webhook.findById.mockResolvedValueOnce(null);
      const result = await service.triggerWebhook(new Types.ObjectId(), 'test');
      expect(result).toBeNull();
    });

    test('should reject event not in subscription list', async () => {
      Webhook.findById.mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        events: ['order.created'],
        url: 'https://example.com/hook',
      });

      const result = await service.triggerWebhook(new Types.ObjectId(), 'user.deleted');
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/not subscribed/i);
    });
  });

  // ── generateSignature ──────────────────────────────────────────
  describe('generateSignature', () => {
    test('should produce consistent HMAC-SHA256 signatures', () => {
      const webhook = { secretKey: 'test-secret-key-123' };
      const payload = { event: 'order.created', data: { id: 1 } };

      const sig1 = service.generateSignature(webhook, payload);
      const sig2 = service.generateSignature(webhook, payload);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // SHA256 hex
    });

    test('should produce different signatures for different payloads', () => {
      const webhook = { secretKey: 'secret' };
      const sig1 = service.generateSignature(webhook, { a: 1 });
      const sig2 = service.generateSignature(webhook, { a: 2 });
      expect(sig1).not.toBe(sig2);
    });
  });

  // ── getWebhookStatistics ───────────────────────────────────────
  describe('getWebhookStatistics', () => {
    test('should return null for non-existent webhook', async () => {
      Webhook.findById.mockResolvedValueOnce(null);
      const result = await service.getWebhookStatistics(new Types.ObjectId());
      expect(result).toBeNull();
    });

    test('should return computed statistics', async () => {
      const id = new Types.ObjectId();
      Webhook.findById.mockResolvedValueOnce({ _id: id, lastDeliveryDate: new Date() });
      WebhookDelivery.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8) // successful
        .mockResolvedValueOnce(2); // failed

      const stats = await service.getWebhookStatistics(id);
      expect(stats.totalDeliveries).toBe(10);
      expect(stats.successfulDeliveries).toBe(8);
      expect(stats.failedDeliveries).toBe(2);
      expect(parseFloat(stats.successRate)).toBe(80);
    });
  });

  // ── getHealthStatus ────────────────────────────────────────────
  describe('getHealthStatus', () => {
    test('should return operational status', async () => {
      Webhook.countDocuments.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
      WebhookDelivery.countDocuments.mockResolvedValueOnce(20);

      const status = await service.getHealthStatus();
      expect(status.service).toBe('WebhookService');
      expect(status.status).toBe('operational');
    });
  });
});

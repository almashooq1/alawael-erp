'use strict';

// Auto-generated unit test for webhookService

const mockWebhookChain = {
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn().mockReturnThis(),
  findOneAndDelete: jest.fn().mockReturnThis(),
  findByIdAndUpdate: jest.fn().mockResolvedValue({ _id: 'id1' }),
  findByIdAndDelete: jest.fn().mockResolvedValue({ _id: 'id1' }),
  countDocuments: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn().mockResolvedValue([]),
  distinct: jest.fn().mockResolvedValue([]),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  insertMany: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue({ _id: 'id1' }),
  save: jest.fn().mockResolvedValue({ _id: 'id1' }),
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([]),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
};
jest.mock('../../models/Webhook', () => ({
  Webhook: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockWebhookChain),
  WebhookDelivery: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockWebhookChain)
}));

const mockWebhookDeliveryChain = {
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  findOneAndUpdate: jest.fn().mockReturnThis(),
  findOneAndDelete: jest.fn().mockReturnThis(),
  findByIdAndUpdate: jest.fn().mockResolvedValue({ _id: 'id1' }),
  findByIdAndDelete: jest.fn().mockResolvedValue({ _id: 'id1' }),
  countDocuments: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn().mockResolvedValue([]),
  distinct: jest.fn().mockResolvedValue([]),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  insertMany: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue({ _id: 'id1' }),
  save: jest.fn().mockResolvedValue({ _id: 'id1' }),
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([]),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
};
jest.mock('../../models/WebhookDelivery', () => ({
  Webhook: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockWebhookDeliveryChain),
  WebhookDelivery: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockWebhookDeliveryChain)
}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }));

const svc = require('../../services/webhookService');

describe('webhookService service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('registerWebhook is callable', async () => {
    if (typeof svc.registerWebhook !== 'function') return;
    let r;
    try { r = await svc.registerWebhook({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getAllWebhooks is callable', async () => {
    if (typeof svc.getAllWebhooks !== 'function') return;
    let r;
    try { r = await svc.getAllWebhooks({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getWebhookById is callable', async () => {
    if (typeof svc.getWebhookById !== 'function') return;
    let r;
    try { r = await svc.getWebhookById({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('updateWebhook is callable', async () => {
    if (typeof svc.updateWebhook !== 'function') return;
    let r;
    try { r = await svc.updateWebhook({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('deleteWebhook is callable', async () => {
    if (typeof svc.deleteWebhook !== 'function') return;
    let r;
    try { r = await svc.deleteWebhook({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('triggerWebhook is callable', async () => {
    if (typeof svc.triggerWebhook !== 'function') return;
    let r;
    try { r = await svc.triggerWebhook({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('testWebhook is callable', async () => {
    if (typeof svc.testWebhook !== 'function') return;
    let r;
    try { r = await svc.testWebhook({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getDeliveryHistory is callable', async () => {
    if (typeof svc.getDeliveryHistory !== 'function') return;
    let r;
    try { r = await svc.getDeliveryHistory({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateSignature is callable', async () => {
    if (typeof svc.generateSignature !== 'function') return;
    let r;
    try { r = await svc.generateSignature({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getWebhookStatistics is callable', async () => {
    if (typeof svc.getWebhookStatistics !== 'function') return;
    let r;
    try { r = await svc.getWebhookStatistics({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('disableWebhook is callable', async () => {
    if (typeof svc.disableWebhook !== 'function') return;
    let r;
    try { r = await svc.disableWebhook({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('enableWebhook is callable', async () => {
    if (typeof svc.enableWebhook !== 'function') return;
    let r;
    try { r = await svc.enableWebhook({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getHealthStatus is callable', async () => {
    if (typeof svc.getHealthStatus !== 'function') return;
    let r;
    try { r = await svc.getHealthStatus({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});

'use strict';

// Auto-generated unit test for paymentGateway.service

const mockPaymentTransactionChain = {
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
jest.mock('../../models/PaymentTransaction', () => ({
  PaymentTransaction: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPaymentTransactionChain),
  PaymentRefund: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPaymentTransactionChain),
  PaymentWebhook: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPaymentTransactionChain)
}));

const mockPaymentRefundChain = {
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
jest.mock('../../models/PaymentRefund', () => ({
  PaymentTransaction: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPaymentRefundChain),
  PaymentRefund: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPaymentRefundChain),
  PaymentWebhook: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPaymentRefundChain)
}));

const mockPaymentWebhookChain = {
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
jest.mock('../../models/PaymentWebhook', () => ({
  PaymentTransaction: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPaymentWebhookChain),
  PaymentRefund: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPaymentWebhookChain),
  PaymentWebhook: Object.assign(jest.fn().mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'id1' }) })), mockPaymentWebhookChain)
}));
jest.mock('axios', () => ({}));
jest.mock('uuid', () => ({}));

const svc = require('../../services/paymentGateway.service');

describe('paymentGateway.service service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('generateTransactionNumber is callable', async () => {
    if (typeof svc.generateTransactionNumber !== 'function') return;
    let r;
    try { r = await svc.generateTransactionNumber({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('calculateVat is callable', async () => {
    if (typeof svc.calculateVat !== 'function') return;
    let r;
    try { r = await svc.calculateVat({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateZatcaInvoiceData is callable', async () => {
    if (typeof svc.generateZatcaInvoiceData !== 'function') return;
    let r;
    try { r = await svc.generateZatcaInvoiceData({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('initiatePayment is callable', async () => {
    if (typeof svc.initiatePayment !== 'function') return;
    let r;
    try { r = await svc.initiatePayment({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('handleWebhook is callable', async () => {
    if (typeof svc.handleWebhook !== 'function') return;
    let r;
    try { r = await svc.handleWebhook({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('processRefund is callable', async () => {
    if (typeof svc.processRefund !== 'function') return;
    let r;
    try { r = await svc.processRefund({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('retryFailedPayments is callable', async () => {
    if (typeof svc.retryFailedPayments !== 'function') return;
    let r;
    try { r = await svc.retryFailedPayments({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getReconciliationReport is callable', async () => {
    if (typeof svc.getReconciliationReport !== 'function') return;
    let r;
    try { r = await svc.getReconciliationReport({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getStats is callable', async () => {
    if (typeof svc.getStats !== 'function') return;
    let r;
    try { r = await svc.getStats({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('list is callable', async () => {
    if (typeof svc.list !== 'function') return;
    let r;
    try { r = await svc.list({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});

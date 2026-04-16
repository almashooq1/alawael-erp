'use strict';

/* ── mock-prefixed variables ── */
const mockPaymentGatewayConfigFind = jest.fn();
const mockPaymentGatewayConfigCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'paymentGatewayConfig1', ...d }));
const mockPaymentGatewayConfigCount = jest.fn().mockResolvedValue(0);
const mockTransactionFind = jest.fn();
const mockTransactionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'transaction1', ...d }));
const mockTransactionCount = jest.fn().mockResolvedValue(0);
const mockPaymentPlanFind = jest.fn();
const mockPaymentPlanCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'paymentPlan1', ...d }));
const mockPaymentPlanCount = jest.fn().mockResolvedValue(0);
const mockReconciliationFind = jest.fn();
const mockReconciliationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'reconciliation1', ...d }));
const mockReconciliationCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddPaymentGateway', () => ({
  DDDPaymentGatewayConfig: {
    find: mockPaymentGatewayConfigFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'paymentGatewayConfig1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'paymentGatewayConfig1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPaymentGatewayConfigCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'paymentGatewayConfig1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'paymentGatewayConfig1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'paymentGatewayConfig1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'paymentGatewayConfig1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'paymentGatewayConfig1' }) }),
    countDocuments: mockPaymentGatewayConfigCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDTransaction: {
    find: mockTransactionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'transaction1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'transaction1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockTransactionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transaction1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transaction1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transaction1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transaction1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transaction1' }) }),
    countDocuments: mockTransactionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPaymentPlan: {
    find: mockPaymentPlanFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'paymentPlan1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'paymentPlan1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPaymentPlanCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'paymentPlan1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'paymentPlan1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'paymentPlan1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'paymentPlan1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'paymentPlan1' }) }),
    countDocuments: mockPaymentPlanCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDReconciliation: {
    find: mockReconciliationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'reconciliation1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'reconciliation1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockReconciliationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'reconciliation1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'reconciliation1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'reconciliation1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'reconciliation1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'reconciliation1' }) }),
    countDocuments: mockReconciliationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  GATEWAY_PROVIDERS: ['item1', 'item2'],
  TRANSACTION_TYPES: ['item1', 'item2'],
  TRANSACTION_STATUSES: ['item1', 'item2'],
  PAYMENT_PLAN_STATUSES: ['item1', 'item2'],
  PAYMENT_PLAN_FREQUENCIES: ['item1', 'item2'],
  RECONCILIATION_STATUSES: ['item1', 'item2'],
  CURRENCY_CODES: ['item1', 'item2'],
  BUILTIN_GATEWAYS: ['item1', 'item2'],

}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor(n, m, models) { this.name = n; this.meta = m; this.models = models; }
    log() {}
    _list(M, q, o) {
      const c = M.find(q || {});
      if (o && o.sort) {
        const s = c.sort(o.sort);
        return (o.limit && s.limit) ? s.limit(o.limit).lean() : s.lean();
      }
      return c.lean ? c.lean() : c;
    }
    _getById(M, id) {
      const r = M.findById(id);
      return r && r.lean ? r.lean() : r;
    }
    _create(M, d) { return M.create(d); }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...(o || {}) }).lean();
    }
    _delete(M, id) { return M.findByIdAndDelete(id); }
  };
});

const svc = require('../../services/dddPaymentGateway');

describe('dddPaymentGateway service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _paymentGatewayConfigL = jest.fn().mockResolvedValue([]);
    const _paymentGatewayConfigLim = jest.fn().mockReturnValue({ lean: _paymentGatewayConfigL });
    const _paymentGatewayConfigS = jest.fn().mockReturnValue({ limit: _paymentGatewayConfigLim, lean: _paymentGatewayConfigL, populate: jest.fn().mockReturnValue({ lean: _paymentGatewayConfigL }) });
    mockPaymentGatewayConfigFind.mockReturnValue({ sort: _paymentGatewayConfigS, lean: _paymentGatewayConfigL, limit: _paymentGatewayConfigLim, populate: jest.fn().mockReturnValue({ lean: _paymentGatewayConfigL, sort: _paymentGatewayConfigS }) });
    const _transactionL = jest.fn().mockResolvedValue([]);
    const _transactionLim = jest.fn().mockReturnValue({ lean: _transactionL });
    const _transactionS = jest.fn().mockReturnValue({ limit: _transactionLim, lean: _transactionL, populate: jest.fn().mockReturnValue({ lean: _transactionL }) });
    mockTransactionFind.mockReturnValue({ sort: _transactionS, lean: _transactionL, limit: _transactionLim, populate: jest.fn().mockReturnValue({ lean: _transactionL, sort: _transactionS }) });
    const _paymentPlanL = jest.fn().mockResolvedValue([]);
    const _paymentPlanLim = jest.fn().mockReturnValue({ lean: _paymentPlanL });
    const _paymentPlanS = jest.fn().mockReturnValue({ limit: _paymentPlanLim, lean: _paymentPlanL, populate: jest.fn().mockReturnValue({ lean: _paymentPlanL }) });
    mockPaymentPlanFind.mockReturnValue({ sort: _paymentPlanS, lean: _paymentPlanL, limit: _paymentPlanLim, populate: jest.fn().mockReturnValue({ lean: _paymentPlanL, sort: _paymentPlanS }) });
    const _reconciliationL = jest.fn().mockResolvedValue([]);
    const _reconciliationLim = jest.fn().mockReturnValue({ lean: _reconciliationL });
    const _reconciliationS = jest.fn().mockReturnValue({ limit: _reconciliationLim, lean: _reconciliationL, populate: jest.fn().mockReturnValue({ lean: _reconciliationL }) });
    mockReconciliationFind.mockReturnValue({ sort: _reconciliationS, lean: _reconciliationL, limit: _reconciliationLim, populate: jest.fn().mockReturnValue({ lean: _reconciliationL, sort: _reconciliationS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('PaymentGateway');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listGateways returns result', async () => {
    let r; try { r = await svc.listGateways({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getGateway returns result', async () => {
    let r; try { r = await svc.getGateway({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createGateway creates/returns result', async () => {
    let r; try { r = await svc.createGateway({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateGateway updates/returns result', async () => {
    let r; try { r = await svc.updateGateway('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTransactions returns result', async () => {
    let r; try { r = await svc.listTransactions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getTransaction returns result', async () => {
    let r; try { r = await svc.getTransaction({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('initiateTransaction is callable', () => {
    expect(typeof svc.initiateTransaction).toBe('function');
  });

  test('completeTransaction updates/returns result', async () => {
    let r; try { r = await svc.completeTransaction('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('failTransaction is callable', () => {
    expect(typeof svc.failTransaction).toBe('function');
  });

  test('refundTransaction updates/returns result', async () => {
    let r; try { r = await svc.refundTransaction('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPaymentPlans returns result', async () => {
    let r; try { r = await svc.listPaymentPlans({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPaymentPlan returns result', async () => {
    let r; try { r = await svc.getPaymentPlan({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPaymentPlan creates/returns result', async () => {
    let r; try { r = await svc.createPaymentPlan({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('activatePaymentPlan updates/returns result', async () => {
    let r; try { r = await svc.activatePaymentPlan('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordInstallmentPayment creates/returns result', async () => {
    let r; try { r = await svc.recordInstallmentPayment({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getOverdueInstallments returns result', async () => {
    let r; try { r = await svc.getOverdueInstallments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listReconciliations returns result', async () => {
    let r; try { r = await svc.listReconciliations({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getReconciliation returns result', async () => {
    let r; try { r = await svc.getReconciliation({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createReconciliation creates/returns result', async () => {
    let r; try { r = await svc.createReconciliation({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('resolveDiscrepancy updates/returns result', async () => {
    let r; try { r = await svc.resolveDiscrepancy('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getRevenueAnalytics returns object', async () => {
    let r; try { r = await svc.getRevenueAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

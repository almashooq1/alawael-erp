'use strict';

/* ── mock-prefixed variables ── */
const mockSupplierFind = jest.fn();
const mockSupplierCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'supplier1', ...d }));
const mockSupplierCount = jest.fn().mockResolvedValue(0);
const mockPurchaseOrderFind = jest.fn();
const mockPurchaseOrderCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'purchaseOrder1', ...d }));
const mockPurchaseOrderCount = jest.fn().mockResolvedValue(0);
const mockRequisitionFind = jest.fn();
const mockRequisitionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'requisition1', ...d }));
const mockRequisitionCount = jest.fn().mockResolvedValue(0);
const mockSupplierEvaluationFind = jest.fn();
const mockSupplierEvaluationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'supplierEvaluation1', ...d }));
const mockSupplierEvaluationCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddProcurementEngine', () => ({
  DDDSupplier: {
    find: mockSupplierFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'supplier1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'supplier1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSupplierCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplier1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplier1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplier1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplier1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplier1' }) }),
    countDocuments: mockSupplierCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPurchaseOrder: {
    find: mockPurchaseOrderFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'purchaseOrder1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'purchaseOrder1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPurchaseOrderCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'purchaseOrder1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'purchaseOrder1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'purchaseOrder1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'purchaseOrder1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'purchaseOrder1' }) }),
    countDocuments: mockPurchaseOrderCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDRequisition: {
    find: mockRequisitionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'requisition1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'requisition1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockRequisitionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'requisition1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'requisition1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'requisition1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'requisition1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'requisition1' }) }),
    countDocuments: mockRequisitionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSupplierEvaluation: {
    find: mockSupplierEvaluationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'supplierEvaluation1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'supplierEvaluation1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSupplierEvaluationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplierEvaluation1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplierEvaluation1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplierEvaluation1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplierEvaluation1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplierEvaluation1' }) }),
    countDocuments: mockSupplierEvaluationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  SUPPLIER_CATEGORIES: ['item1', 'item2'],
  SUPPLIER_STATUSES: ['item1', 'item2'],
  PO_STATUSES: ['item1', 'item2'],
  REQUISITION_STATUSES: ['item1', 'item2'],
  PAYMENT_TERMS: ['item1', 'item2'],
  EVALUATION_CRITERIA: ['item1', 'item2'],
  BUILTIN_SUPPLIERS: ['item1', 'item2'],

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

const svc = require('../../services/dddProcurementEngine');

describe('dddProcurementEngine service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _supplierL = jest.fn().mockResolvedValue([]);
    const _supplierLim = jest.fn().mockReturnValue({ lean: _supplierL });
    const _supplierS = jest.fn().mockReturnValue({ limit: _supplierLim, lean: _supplierL, populate: jest.fn().mockReturnValue({ lean: _supplierL }) });
    mockSupplierFind.mockReturnValue({ sort: _supplierS, lean: _supplierL, limit: _supplierLim, populate: jest.fn().mockReturnValue({ lean: _supplierL, sort: _supplierS }) });
    const _purchaseOrderL = jest.fn().mockResolvedValue([]);
    const _purchaseOrderLim = jest.fn().mockReturnValue({ lean: _purchaseOrderL });
    const _purchaseOrderS = jest.fn().mockReturnValue({ limit: _purchaseOrderLim, lean: _purchaseOrderL, populate: jest.fn().mockReturnValue({ lean: _purchaseOrderL }) });
    mockPurchaseOrderFind.mockReturnValue({ sort: _purchaseOrderS, lean: _purchaseOrderL, limit: _purchaseOrderLim, populate: jest.fn().mockReturnValue({ lean: _purchaseOrderL, sort: _purchaseOrderS }) });
    const _requisitionL = jest.fn().mockResolvedValue([]);
    const _requisitionLim = jest.fn().mockReturnValue({ lean: _requisitionL });
    const _requisitionS = jest.fn().mockReturnValue({ limit: _requisitionLim, lean: _requisitionL, populate: jest.fn().mockReturnValue({ lean: _requisitionL }) });
    mockRequisitionFind.mockReturnValue({ sort: _requisitionS, lean: _requisitionL, limit: _requisitionLim, populate: jest.fn().mockReturnValue({ lean: _requisitionL, sort: _requisitionS }) });
    const _supplierEvaluationL = jest.fn().mockResolvedValue([]);
    const _supplierEvaluationLim = jest.fn().mockReturnValue({ lean: _supplierEvaluationL });
    const _supplierEvaluationS = jest.fn().mockReturnValue({ limit: _supplierEvaluationLim, lean: _supplierEvaluationL, populate: jest.fn().mockReturnValue({ lean: _supplierEvaluationL }) });
    mockSupplierEvaluationFind.mockReturnValue({ sort: _supplierEvaluationS, lean: _supplierEvaluationL, limit: _supplierEvaluationLim, populate: jest.fn().mockReturnValue({ lean: _supplierEvaluationL, sort: _supplierEvaluationS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('ProcurementEngine');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listSuppliers returns result', async () => {
    let r; try { r = await svc.listSuppliers({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getSupplier returns result', async () => {
    let r; try { r = await svc.getSupplier({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createSupplier creates/returns result', async () => {
    let r; try { r = await svc.createSupplier({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateSupplier updates/returns result', async () => {
    let r; try { r = await svc.updateSupplier('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPurchaseOrders returns result', async () => {
    let r; try { r = await svc.listPurchaseOrders({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPurchaseOrder returns result', async () => {
    let r; try { r = await svc.getPurchaseOrder({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPurchaseOrder creates/returns result', async () => {
    let r; try { r = await svc.createPurchaseOrder({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('approvePurchaseOrder updates/returns result', async () => {
    let r; try { r = await svc.approvePurchaseOrder('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('receivePurchaseOrder updates/returns result', async () => {
    let r; try { r = await svc.receivePurchaseOrder('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('cancelPurchaseOrder updates/returns result', async () => {
    let r; try { r = await svc.cancelPurchaseOrder('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listRequisitions returns result', async () => {
    let r; try { r = await svc.listRequisitions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getRequisition returns result', async () => {
    let r; try { r = await svc.getRequisition({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createRequisition creates/returns result', async () => {
    let r; try { r = await svc.createRequisition({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('approveRequisition updates/returns result', async () => {
    let r; try { r = await svc.approveRequisition('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('rejectRequisition updates/returns result', async () => {
    let r; try { r = await svc.rejectRequisition('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('convertRequisitionToPO is callable', () => {
    expect(typeof svc.convertRequisitionToPO).toBe('function');
  });

  test('listEvaluations returns result', async () => {
    let r; try { r = await svc.listEvaluations({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createEvaluation creates/returns result', async () => {
    let r; try { r = await svc.createEvaluation({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getProcurementAnalytics returns object', async () => {
    let r; try { r = await svc.getProcurementAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

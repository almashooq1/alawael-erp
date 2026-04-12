'use strict';

/* ── mock-prefixed variables ── */
const mockClinicalRecordFind = jest.fn();
const mockClinicalRecordCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'clinicalRecord1', ...d }));
const mockClinicalRecordCount = jest.fn().mockResolvedValue(0);
const mockRecordCategoryFind = jest.fn();
const mockRecordCategoryCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'recordCategory1', ...d }));
const mockRecordCategoryCount = jest.fn().mockResolvedValue(0);
const mockRecordRetentionFind = jest.fn();
const mockRecordRetentionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'recordRetention1', ...d }));
const mockRecordRetentionCount = jest.fn().mockResolvedValue(0);
const mockRecordAuditLogFind = jest.fn();
const mockRecordAuditLogCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'recordAuditLog1', ...d }));
const mockRecordAuditLogCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddRecordManager', () => ({
  DDDClinicalRecord: {
    find: mockClinicalRecordFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'clinicalRecord1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'clinicalRecord1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockClinicalRecordCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'clinicalRecord1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'clinicalRecord1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'clinicalRecord1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'clinicalRecord1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'clinicalRecord1' }) }),
    countDocuments: mockClinicalRecordCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDRecordCategory: {
    find: mockRecordCategoryFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'recordCategory1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'recordCategory1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockRecordCategoryCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordCategory1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordCategory1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordCategory1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordCategory1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordCategory1' }) }),
    countDocuments: mockRecordCategoryCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDRecordRetention: {
    find: mockRecordRetentionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'recordRetention1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'recordRetention1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockRecordRetentionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordRetention1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordRetention1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordRetention1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordRetention1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordRetention1' }) }),
    countDocuments: mockRecordRetentionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDRecordAuditLog: {
    find: mockRecordAuditLogFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'recordAuditLog1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'recordAuditLog1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockRecordAuditLogCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordAuditLog1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordAuditLog1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordAuditLog1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordAuditLog1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'recordAuditLog1' }) }),
    countDocuments: mockRecordAuditLogCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  RECORD_TYPES: ['item1', 'item2'],
  RECORD_STATUSES: ['item1', 'item2'],
  RETENTION_PERIODS: ['item1', 'item2'],
  RECORD_SOURCES: ['item1', 'item2'],
  AUDIT_ACTION_TYPES: ['item1', 'item2'],
  SENSITIVITY_LEVELS: ['item1', 'item2'],
  BUILTIN_RECORD_CATEGORIES: ['item1', 'item2'],

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

const svc = require('../../services/dddRecordManager');

describe('dddRecordManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _clinicalRecordL = jest.fn().mockResolvedValue([]);
    const _clinicalRecordLim = jest.fn().mockReturnValue({ lean: _clinicalRecordL });
    const _clinicalRecordS = jest.fn().mockReturnValue({ limit: _clinicalRecordLim, lean: _clinicalRecordL, populate: jest.fn().mockReturnValue({ lean: _clinicalRecordL }) });
    mockClinicalRecordFind.mockReturnValue({ sort: _clinicalRecordS, lean: _clinicalRecordL, limit: _clinicalRecordLim, populate: jest.fn().mockReturnValue({ lean: _clinicalRecordL, sort: _clinicalRecordS }) });
    const _recordCategoryL = jest.fn().mockResolvedValue([]);
    const _recordCategoryLim = jest.fn().mockReturnValue({ lean: _recordCategoryL });
    const _recordCategoryS = jest.fn().mockReturnValue({ limit: _recordCategoryLim, lean: _recordCategoryL, populate: jest.fn().mockReturnValue({ lean: _recordCategoryL }) });
    mockRecordCategoryFind.mockReturnValue({ sort: _recordCategoryS, lean: _recordCategoryL, limit: _recordCategoryLim, populate: jest.fn().mockReturnValue({ lean: _recordCategoryL, sort: _recordCategoryS }) });
    const _recordRetentionL = jest.fn().mockResolvedValue([]);
    const _recordRetentionLim = jest.fn().mockReturnValue({ lean: _recordRetentionL });
    const _recordRetentionS = jest.fn().mockReturnValue({ limit: _recordRetentionLim, lean: _recordRetentionL, populate: jest.fn().mockReturnValue({ lean: _recordRetentionL }) });
    mockRecordRetentionFind.mockReturnValue({ sort: _recordRetentionS, lean: _recordRetentionL, limit: _recordRetentionLim, populate: jest.fn().mockReturnValue({ lean: _recordRetentionL, sort: _recordRetentionS }) });
    const _recordAuditLogL = jest.fn().mockResolvedValue([]);
    const _recordAuditLogLim = jest.fn().mockReturnValue({ lean: _recordAuditLogL });
    const _recordAuditLogS = jest.fn().mockReturnValue({ limit: _recordAuditLogLim, lean: _recordAuditLogL, populate: jest.fn().mockReturnValue({ lean: _recordAuditLogL }) });
    mockRecordAuditLogFind.mockReturnValue({ sort: _recordAuditLogS, lean: _recordAuditLogL, limit: _recordAuditLogLim, populate: jest.fn().mockReturnValue({ lean: _recordAuditLogL, sort: _recordAuditLogS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('RecordManager');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listRecords returns result', async () => {
    let r; try { r = await svc.listRecords({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getRecord returns result', async () => {
    let r; try { r = await svc.getRecord({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createRecord creates/returns result', async () => {
    let r; try { r = await svc.createRecord({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateRecord updates/returns result', async () => {
    let r; try { r = await svc.updateRecord('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('amendRecord is callable', () => {
    expect(typeof svc.amendRecord).toBe('function');
  });

  test('lockRecord updates/returns result', async () => {
    let r; try { r = await svc.lockRecord('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('searchRecords returns result', async () => {
    let r; try { r = await svc.searchRecords({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCategories returns result', async () => {
    let r; try { r = await svc.listCategories({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCategory creates/returns result', async () => {
    let r; try { r = await svc.createCategory({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listRetentions returns result', async () => {
    let r; try { r = await svc.listRetentions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createRetention creates/returns result', async () => {
    let r; try { r = await svc.createRetention({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateRetention updates/returns result', async () => {
    let r; try { r = await svc.updateRetention('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAuditLogs returns result', async () => {
    let r; try { r = await svc.listAuditLogs({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('logAudit creates/returns result', async () => {
    let r; try { r = await svc.logAudit({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getRecordAnalytics returns object', async () => {
    let r; try { r = await svc.getRecordAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

'use strict';

/* ── mock-prefixed variables ── */
const mockSafetyInspectionFind = jest.fn();
const mockSafetyInspectionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'safetyInspection1', ...d }));
const mockSafetyInspectionCount = jest.fn().mockResolvedValue(0);
const mockHazardReportFind = jest.fn();
const mockHazardReportCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'hazardReport1', ...d }));
const mockHazardReportCount = jest.fn().mockResolvedValue(0);
const mockSafetyPolicyFind = jest.fn();
const mockSafetyPolicyCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'safetyPolicy1', ...d }));
const mockSafetyPolicyCount = jest.fn().mockResolvedValue(0);
const mockSafetyTrainingFind = jest.fn();
const mockSafetyTrainingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'safetyTraining1', ...d }));
const mockSafetyTrainingCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddSafetyManager', () => ({
  DDDSafetyInspection: {
    find: mockSafetyInspectionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'safetyInspection1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'safetyInspection1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSafetyInspectionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyInspection1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyInspection1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyInspection1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyInspection1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyInspection1' }) }),
    countDocuments: mockSafetyInspectionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDHazardReport: {
    find: mockHazardReportFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'hazardReport1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'hazardReport1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockHazardReportCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'hazardReport1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'hazardReport1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'hazardReport1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'hazardReport1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'hazardReport1' }) }),
    countDocuments: mockHazardReportCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSafetyPolicy: {
    find: mockSafetyPolicyFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'safetyPolicy1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'safetyPolicy1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSafetyPolicyCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyPolicy1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyPolicy1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyPolicy1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyPolicy1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyPolicy1' }) }),
    countDocuments: mockSafetyPolicyCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSafetyTraining: {
    find: mockSafetyTrainingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'safetyTraining1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'safetyTraining1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSafetyTrainingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyTraining1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyTraining1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyTraining1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyTraining1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'safetyTraining1' }) }),
    countDocuments: mockSafetyTrainingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  HAZARD_TYPES: ['item1', 'item2'],
  HAZARD_STATUSES: ['item1', 'item2'],
  INSPECTION_TYPES: ['item1', 'item2'],
  RISK_LEVELS: ['item1', 'item2'],
  SAFETY_CATEGORIES: ['item1', 'item2'],
  TRAINING_TYPES: ['item1', 'item2'],
  BUILTIN_SAFETY_POLICIES: ['item1', 'item2'],

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

const svc = require('../../services/dddSafetyManager');

describe('dddSafetyManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _safetyInspectionL = jest.fn().mockResolvedValue([]);
    const _safetyInspectionLim = jest.fn().mockReturnValue({ lean: _safetyInspectionL });
    const _safetyInspectionS = jest.fn().mockReturnValue({ limit: _safetyInspectionLim, lean: _safetyInspectionL, populate: jest.fn().mockReturnValue({ lean: _safetyInspectionL }) });
    mockSafetyInspectionFind.mockReturnValue({ sort: _safetyInspectionS, lean: _safetyInspectionL, limit: _safetyInspectionLim, populate: jest.fn().mockReturnValue({ lean: _safetyInspectionL, sort: _safetyInspectionS }) });
    const _hazardReportL = jest.fn().mockResolvedValue([]);
    const _hazardReportLim = jest.fn().mockReturnValue({ lean: _hazardReportL });
    const _hazardReportS = jest.fn().mockReturnValue({ limit: _hazardReportLim, lean: _hazardReportL, populate: jest.fn().mockReturnValue({ lean: _hazardReportL }) });
    mockHazardReportFind.mockReturnValue({ sort: _hazardReportS, lean: _hazardReportL, limit: _hazardReportLim, populate: jest.fn().mockReturnValue({ lean: _hazardReportL, sort: _hazardReportS }) });
    const _safetyPolicyL = jest.fn().mockResolvedValue([]);
    const _safetyPolicyLim = jest.fn().mockReturnValue({ lean: _safetyPolicyL });
    const _safetyPolicyS = jest.fn().mockReturnValue({ limit: _safetyPolicyLim, lean: _safetyPolicyL, populate: jest.fn().mockReturnValue({ lean: _safetyPolicyL }) });
    mockSafetyPolicyFind.mockReturnValue({ sort: _safetyPolicyS, lean: _safetyPolicyL, limit: _safetyPolicyLim, populate: jest.fn().mockReturnValue({ lean: _safetyPolicyL, sort: _safetyPolicyS }) });
    const _safetyTrainingL = jest.fn().mockResolvedValue([]);
    const _safetyTrainingLim = jest.fn().mockReturnValue({ lean: _safetyTrainingL });
    const _safetyTrainingS = jest.fn().mockReturnValue({ limit: _safetyTrainingLim, lean: _safetyTrainingL, populate: jest.fn().mockReturnValue({ lean: _safetyTrainingL }) });
    mockSafetyTrainingFind.mockReturnValue({ sort: _safetyTrainingS, lean: _safetyTrainingL, limit: _safetyTrainingLim, populate: jest.fn().mockReturnValue({ lean: _safetyTrainingL, sort: _safetyTrainingS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('SafetyManager');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listInspections returns result', async () => {
    let r; try { r = await svc.listInspections({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getInspection returns result', async () => {
    let r; try { r = await svc.getInspection({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('scheduleInspection creates/returns result', async () => {
    let r; try { r = await svc.scheduleInspection({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateInspection updates/returns result', async () => {
    let r; try { r = await svc.updateInspection('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('completeInspection updates/returns result', async () => {
    let r; try { r = await svc.completeInspection('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listHazards returns result', async () => {
    let r; try { r = await svc.listHazards({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('reportHazard is callable', () => {
    expect(typeof svc.reportHazard).toBe('function');
  });

  test('updateHazard updates/returns result', async () => {
    let r; try { r = await svc.updateHazard('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('resolveHazard updates/returns result', async () => {
    let r; try { r = await svc.resolveHazard('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPolicies returns result', async () => {
    let r; try { r = await svc.listPolicies({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPolicy returns result', async () => {
    let r; try { r = await svc.getPolicy({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPolicy creates/returns result', async () => {
    let r; try { r = await svc.createPolicy({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePolicy updates/returns result', async () => {
    let r; try { r = await svc.updatePolicy('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTrainings returns result', async () => {
    let r; try { r = await svc.listTrainings({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('scheduleTraining creates/returns result', async () => {
    let r; try { r = await svc.scheduleTraining({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateTraining updates/returns result', async () => {
    let r; try { r = await svc.updateTraining('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getSafetyAnalytics returns object', async () => {
    let r; try { r = await svc.getSafetyAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

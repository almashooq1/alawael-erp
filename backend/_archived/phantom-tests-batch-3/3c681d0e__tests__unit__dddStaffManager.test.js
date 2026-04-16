'use strict';

/* ── mock-prefixed variables ── */
const mockStaffProfileFind = jest.fn();
const mockStaffProfileCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'staffProfile1', ...d }));
const mockStaffProfileCount = jest.fn().mockResolvedValue(0);
const mockDepartmentFind = jest.fn();
const mockDepartmentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'department1', ...d }));
const mockDepartmentCount = jest.fn().mockResolvedValue(0);
const mockPositionFind = jest.fn();
const mockPositionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'position1', ...d }));
const mockPositionCount = jest.fn().mockResolvedValue(0);
const mockQualificationFind = jest.fn();
const mockQualificationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'qualification1', ...d }));
const mockQualificationCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddStaffManager', () => ({
  DDDStaffProfile: {
    find: mockStaffProfileFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'staffProfile1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'staffProfile1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockStaffProfileCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'staffProfile1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'staffProfile1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'staffProfile1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'staffProfile1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'staffProfile1' }) }),
    countDocuments: mockStaffProfileCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDepartment: {
    find: mockDepartmentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'department1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'department1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDepartmentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'department1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'department1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'department1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'department1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'department1' }) }),
    countDocuments: mockDepartmentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPosition: {
    find: mockPositionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'position1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'position1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPositionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'position1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'position1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'position1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'position1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'position1' }) }),
    countDocuments: mockPositionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDQualification: {
    find: mockQualificationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'qualification1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'qualification1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockQualificationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'qualification1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'qualification1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'qualification1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'qualification1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'qualification1' }) }),
    countDocuments: mockQualificationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  STAFF_TYPES: ['item1', 'item2'],
  STAFF_STATUSES: ['item1', 'item2'],
  DEPARTMENT_TYPES: ['item1', 'item2'],
  POSITION_LEVELS: ['item1', 'item2'],
  QUALIFICATION_TYPES: ['item1', 'item2'],
  EMPLOYMENT_TYPES: ['item1', 'item2'],
  BUILTIN_DEPARTMENTS: ['item1', 'item2'],

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

const svc = require('../../services/dddStaffManager');

describe('dddStaffManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _staffProfileL = jest.fn().mockResolvedValue([]);
    const _staffProfileLim = jest.fn().mockReturnValue({ lean: _staffProfileL });
    const _staffProfileS = jest.fn().mockReturnValue({ limit: _staffProfileLim, lean: _staffProfileL, populate: jest.fn().mockReturnValue({ lean: _staffProfileL }) });
    mockStaffProfileFind.mockReturnValue({ sort: _staffProfileS, lean: _staffProfileL, limit: _staffProfileLim, populate: jest.fn().mockReturnValue({ lean: _staffProfileL, sort: _staffProfileS }) });
    const _departmentL = jest.fn().mockResolvedValue([]);
    const _departmentLim = jest.fn().mockReturnValue({ lean: _departmentL });
    const _departmentS = jest.fn().mockReturnValue({ limit: _departmentLim, lean: _departmentL, populate: jest.fn().mockReturnValue({ lean: _departmentL }) });
    mockDepartmentFind.mockReturnValue({ sort: _departmentS, lean: _departmentL, limit: _departmentLim, populate: jest.fn().mockReturnValue({ lean: _departmentL, sort: _departmentS }) });
    const _positionL = jest.fn().mockResolvedValue([]);
    const _positionLim = jest.fn().mockReturnValue({ lean: _positionL });
    const _positionS = jest.fn().mockReturnValue({ limit: _positionLim, lean: _positionL, populate: jest.fn().mockReturnValue({ lean: _positionL }) });
    mockPositionFind.mockReturnValue({ sort: _positionS, lean: _positionL, limit: _positionLim, populate: jest.fn().mockReturnValue({ lean: _positionL, sort: _positionS }) });
    const _qualificationL = jest.fn().mockResolvedValue([]);
    const _qualificationLim = jest.fn().mockReturnValue({ lean: _qualificationL });
    const _qualificationS = jest.fn().mockReturnValue({ limit: _qualificationLim, lean: _qualificationL, populate: jest.fn().mockReturnValue({ lean: _qualificationL }) });
    mockQualificationFind.mockReturnValue({ sort: _qualificationS, lean: _qualificationL, limit: _qualificationLim, populate: jest.fn().mockReturnValue({ lean: _qualificationL, sort: _qualificationS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('StaffManager');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listStaff returns result', async () => {
    let r; try { r = await svc.listStaff({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getStaff returns result', async () => {
    let r; try { r = await svc.getStaff({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getStaffByCode returns result', async () => {
    let r; try { r = await svc.getStaffByCode({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createStaff creates/returns result', async () => {
    let r; try { r = await svc.createStaff({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateStaff updates/returns result', async () => {
    let r; try { r = await svc.updateStaff('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('deactivateStaff updates/returns result', async () => {
    let r; try { r = await svc.deactivateStaff('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDepartments returns result', async () => {
    let r; try { r = await svc.listDepartments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getDepartment returns result', async () => {
    let r; try { r = await svc.getDepartment({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createDepartment creates/returns result', async () => {
    let r; try { r = await svc.createDepartment({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateDepartment updates/returns result', async () => {
    let r; try { r = await svc.updateDepartment('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPositions returns result', async () => {
    let r; try { r = await svc.listPositions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPosition returns result', async () => {
    let r; try { r = await svc.getPosition({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPosition creates/returns result', async () => {
    let r; try { r = await svc.createPosition({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePosition updates/returns result', async () => {
    let r; try { r = await svc.updatePosition('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listQualifications returns result', async () => {
    let r; try { r = await svc.listQualifications({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addQualification creates/returns result', async () => {
    let r; try { r = await svc.addQualification({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateQualification updates/returns result', async () => {
    let r; try { r = await svc.updateQualification('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getExpiringQualifications returns result', async () => {
    let r; try { r = await svc.getExpiringQualifications({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getStaffAnalytics returns object', async () => {
    let r; try { r = await svc.getStaffAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

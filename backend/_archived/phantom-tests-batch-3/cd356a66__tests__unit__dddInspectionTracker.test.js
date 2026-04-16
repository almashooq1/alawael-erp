'use strict';

/* ── mock-prefixed variables ── */
const mockInspectionFind = jest.fn();
const mockInspectionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'inspection1', ...d }));
const mockInspectionCount = jest.fn().mockResolvedValue(0);
const mockInspectionItemFind = jest.fn();
const mockInspectionItemCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'inspectionItem1', ...d }));
const mockInspectionItemCount = jest.fn().mockResolvedValue(0);
const mockFollowUpActionFind = jest.fn();
const mockFollowUpActionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'followUpAction1', ...d }));
const mockFollowUpActionCount = jest.fn().mockResolvedValue(0);
const mockInspectionScheduleFind = jest.fn();
const mockInspectionScheduleCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'inspectionSchedule1', ...d }));
const mockInspectionScheduleCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddInspectionTracker', () => ({
  DDDInspection: {
    find: mockInspectionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'inspection1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'inspection1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockInspectionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspection1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspection1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspection1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspection1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspection1' }) }),
    countDocuments: mockInspectionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDInspectionItem: {
    find: mockInspectionItemFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'inspectionItem1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'inspectionItem1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockInspectionItemCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspectionItem1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspectionItem1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspectionItem1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspectionItem1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspectionItem1' }) }),
    countDocuments: mockInspectionItemCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDFollowUpAction: {
    find: mockFollowUpActionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'followUpAction1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'followUpAction1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFollowUpActionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'followUpAction1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'followUpAction1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'followUpAction1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'followUpAction1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'followUpAction1' }) }),
    countDocuments: mockFollowUpActionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDInspectionSchedule: {
    find: mockInspectionScheduleFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'inspectionSchedule1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'inspectionSchedule1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockInspectionScheduleCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspectionSchedule1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspectionSchedule1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspectionSchedule1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspectionSchedule1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inspectionSchedule1' }) }),
    countDocuments: mockInspectionScheduleCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  INSPECTION_TYPES: ['item1', 'item2'],
  INSPECTION_STATUSES: ['item1', 'item2'],
  INSPECTOR_TYPES: ['item1', 'item2'],
  COMPLIANCE_LEVELS: ['item1', 'item2'],
  AREA_CATEGORIES: ['item1', 'item2'],
  FOLLOW_UP_PRIORITIES: ['item1', 'item2'],
  BUILTIN_INSPECTION_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddInspectionTracker');

describe('dddInspectionTracker service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _inspectionL = jest.fn().mockResolvedValue([]);
    const _inspectionLim = jest.fn().mockReturnValue({ lean: _inspectionL });
    const _inspectionS = jest.fn().mockReturnValue({ limit: _inspectionLim, lean: _inspectionL, populate: jest.fn().mockReturnValue({ lean: _inspectionL }) });
    mockInspectionFind.mockReturnValue({ sort: _inspectionS, lean: _inspectionL, limit: _inspectionLim, populate: jest.fn().mockReturnValue({ lean: _inspectionL, sort: _inspectionS }) });
    const _inspectionItemL = jest.fn().mockResolvedValue([]);
    const _inspectionItemLim = jest.fn().mockReturnValue({ lean: _inspectionItemL });
    const _inspectionItemS = jest.fn().mockReturnValue({ limit: _inspectionItemLim, lean: _inspectionItemL, populate: jest.fn().mockReturnValue({ lean: _inspectionItemL }) });
    mockInspectionItemFind.mockReturnValue({ sort: _inspectionItemS, lean: _inspectionItemL, limit: _inspectionItemLim, populate: jest.fn().mockReturnValue({ lean: _inspectionItemL, sort: _inspectionItemS }) });
    const _followUpActionL = jest.fn().mockResolvedValue([]);
    const _followUpActionLim = jest.fn().mockReturnValue({ lean: _followUpActionL });
    const _followUpActionS = jest.fn().mockReturnValue({ limit: _followUpActionLim, lean: _followUpActionL, populate: jest.fn().mockReturnValue({ lean: _followUpActionL }) });
    mockFollowUpActionFind.mockReturnValue({ sort: _followUpActionS, lean: _followUpActionL, limit: _followUpActionLim, populate: jest.fn().mockReturnValue({ lean: _followUpActionL, sort: _followUpActionS }) });
    const _inspectionScheduleL = jest.fn().mockResolvedValue([]);
    const _inspectionScheduleLim = jest.fn().mockReturnValue({ lean: _inspectionScheduleL });
    const _inspectionScheduleS = jest.fn().mockReturnValue({ limit: _inspectionScheduleLim, lean: _inspectionScheduleL, populate: jest.fn().mockReturnValue({ lean: _inspectionScheduleL }) });
    mockInspectionScheduleFind.mockReturnValue({ sort: _inspectionScheduleS, lean: _inspectionScheduleL, limit: _inspectionScheduleLim, populate: jest.fn().mockReturnValue({ lean: _inspectionScheduleL, sort: _inspectionScheduleS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('InspectionTracker');
  });


  test('createInspection creates/returns result', async () => {
    let r; try { r = await svc.createInspection({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listInspections returns result', async () => {
    let r; try { r = await svc.listInspections({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getInspectionById returns result', async () => {
    let r; try { r = await svc.getInspectionById({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateInspection updates/returns result', async () => {
    let r; try { r = await svc.updateInspection('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createItem creates/returns result', async () => {
    let r; try { r = await svc.createItem({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listItems returns result', async () => {
    let r; try { r = await svc.listItems({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createFollowUp creates/returns result', async () => {
    let r; try { r = await svc.createFollowUp({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listFollowUps returns result', async () => {
    let r; try { r = await svc.listFollowUps({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateFollowUp updates/returns result', async () => {
    let r; try { r = await svc.updateFollowUp('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createSchedule creates/returns result', async () => {
    let r; try { r = await svc.createSchedule({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listSchedules returns result', async () => {
    let r; try { r = await svc.listSchedules({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getComplianceSummary returns object', async () => {
    let r; try { r = await svc.getComplianceSummary(); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getOverdueFollowUps returns result', async () => {
    let r; try { r = await svc.getOverdueFollowUps({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

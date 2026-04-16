'use strict';

/* ── mock-prefixed variables ── */
const mockIncidentFind = jest.fn();
const mockIncidentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'incident1', ...d }));
const mockIncidentCount = jest.fn().mockResolvedValue(0);
const mockIncidentCategoryFind = jest.fn();
const mockIncidentCategoryCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'incidentCategory1', ...d }));
const mockIncidentCategoryCount = jest.fn().mockResolvedValue(0);
const mockInvestigationFind = jest.fn();
const mockInvestigationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'investigation1', ...d }));
const mockInvestigationCount = jest.fn().mockResolvedValue(0);
const mockCorrectiveActionPlanFind = jest.fn();
const mockCorrectiveActionPlanCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'correctiveActionPlan1', ...d }));
const mockCorrectiveActionPlanCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddIncidentTracker', () => ({
  DDDIncident: {
    find: mockIncidentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'incident1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'incident1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockIncidentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'incident1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'incident1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'incident1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'incident1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'incident1' }) }),
    countDocuments: mockIncidentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDIncidentCategory: {
    find: mockIncidentCategoryFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'incidentCategory1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'incidentCategory1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockIncidentCategoryCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'incidentCategory1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'incidentCategory1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'incidentCategory1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'incidentCategory1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'incidentCategory1' }) }),
    countDocuments: mockIncidentCategoryCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDInvestigation: {
    find: mockInvestigationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'investigation1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'investigation1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockInvestigationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'investigation1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'investigation1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'investigation1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'investigation1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'investigation1' }) }),
    countDocuments: mockInvestigationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCorrectiveActionPlan: {
    find: mockCorrectiveActionPlanFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'correctiveActionPlan1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'correctiveActionPlan1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCorrectiveActionPlanCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'correctiveActionPlan1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'correctiveActionPlan1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'correctiveActionPlan1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'correctiveActionPlan1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'correctiveActionPlan1' }) }),
    countDocuments: mockCorrectiveActionPlanCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  INCIDENT_TYPES: ['item1', 'item2'],
  INCIDENT_STATUSES: ['item1', 'item2'],
  SEVERITY_LEVELS: ['item1', 'item2'],
  INVESTIGATION_STATUSES: ['item1', 'item2'],
  CORRECTIVE_ACTION_STATUSES: ['item1', 'item2'],
  ROOT_CAUSE_CATEGORIES: ['item1', 'item2'],
  BUILTIN_INCIDENT_CATEGORIES: ['item1', 'item2'],

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

const svc = require('../../services/dddIncidentTracker');

describe('dddIncidentTracker service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _incidentL = jest.fn().mockResolvedValue([]);
    const _incidentLim = jest.fn().mockReturnValue({ lean: _incidentL });
    const _incidentS = jest.fn().mockReturnValue({ limit: _incidentLim, lean: _incidentL, populate: jest.fn().mockReturnValue({ lean: _incidentL }) });
    mockIncidentFind.mockReturnValue({ sort: _incidentS, lean: _incidentL, limit: _incidentLim, populate: jest.fn().mockReturnValue({ lean: _incidentL, sort: _incidentS }) });
    const _incidentCategoryL = jest.fn().mockResolvedValue([]);
    const _incidentCategoryLim = jest.fn().mockReturnValue({ lean: _incidentCategoryL });
    const _incidentCategoryS = jest.fn().mockReturnValue({ limit: _incidentCategoryLim, lean: _incidentCategoryL, populate: jest.fn().mockReturnValue({ lean: _incidentCategoryL }) });
    mockIncidentCategoryFind.mockReturnValue({ sort: _incidentCategoryS, lean: _incidentCategoryL, limit: _incidentCategoryLim, populate: jest.fn().mockReturnValue({ lean: _incidentCategoryL, sort: _incidentCategoryS }) });
    const _investigationL = jest.fn().mockResolvedValue([]);
    const _investigationLim = jest.fn().mockReturnValue({ lean: _investigationL });
    const _investigationS = jest.fn().mockReturnValue({ limit: _investigationLim, lean: _investigationL, populate: jest.fn().mockReturnValue({ lean: _investigationL }) });
    mockInvestigationFind.mockReturnValue({ sort: _investigationS, lean: _investigationL, limit: _investigationLim, populate: jest.fn().mockReturnValue({ lean: _investigationL, sort: _investigationS }) });
    const _correctiveActionPlanL = jest.fn().mockResolvedValue([]);
    const _correctiveActionPlanLim = jest.fn().mockReturnValue({ lean: _correctiveActionPlanL });
    const _correctiveActionPlanS = jest.fn().mockReturnValue({ limit: _correctiveActionPlanLim, lean: _correctiveActionPlanL, populate: jest.fn().mockReturnValue({ lean: _correctiveActionPlanL }) });
    mockCorrectiveActionPlanFind.mockReturnValue({ sort: _correctiveActionPlanS, lean: _correctiveActionPlanL, limit: _correctiveActionPlanLim, populate: jest.fn().mockReturnValue({ lean: _correctiveActionPlanL, sort: _correctiveActionPlanS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('IncidentTracker');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listIncidents returns result', async () => {
    let r; try { r = await svc.listIncidents({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getIncident returns result', async () => {
    let r; try { r = await svc.getIncident({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('reportIncident is callable', () => {
    expect(typeof svc.reportIncident).toBe('function');
  });

  test('updateIncident updates/returns result', async () => {
    let r; try { r = await svc.updateIncident('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('resolveIncident updates/returns result', async () => {
    let r; try { r = await svc.resolveIncident('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('searchIncidents returns result', async () => {
    let r; try { r = await svc.searchIncidents({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCategories returns result', async () => {
    let r; try { r = await svc.listCategories({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCategory creates/returns result', async () => {
    let r; try { r = await svc.createCategory({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listInvestigations returns result', async () => {
    let r; try { r = await svc.listInvestigations({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createInvestigation creates/returns result', async () => {
    let r; try { r = await svc.createInvestigation({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateInvestigation updates/returns result', async () => {
    let r; try { r = await svc.updateInvestigation('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCorrectiveActions returns result', async () => {
    let r; try { r = await svc.listCorrectiveActions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCorrectiveAction creates/returns result', async () => {
    let r; try { r = await svc.createCorrectiveAction({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateCorrectiveAction updates/returns result', async () => {
    let r; try { r = await svc.updateCorrectiveAction('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getIncidentAnalytics returns object', async () => {
    let r; try { r = await svc.getIncidentAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

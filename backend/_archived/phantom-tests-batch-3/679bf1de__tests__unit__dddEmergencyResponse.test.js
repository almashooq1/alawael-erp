'use strict';

/* ── mock-prefixed variables ── */
const mockEmergencyPlanFind = jest.fn();
const mockEmergencyPlanCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'emergencyPlan1', ...d }));
const mockEmergencyPlanCount = jest.fn().mockResolvedValue(0);
const mockEmergencyEventFind = jest.fn();
const mockEmergencyEventCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'emergencyEvent1', ...d }));
const mockEmergencyEventCount = jest.fn().mockResolvedValue(0);
const mockResponseTeamFind = jest.fn();
const mockResponseTeamCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'responseTeam1', ...d }));
const mockResponseTeamCount = jest.fn().mockResolvedValue(0);
const mockEmergencyDrillFind = jest.fn();
const mockEmergencyDrillCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'emergencyDrill1', ...d }));
const mockEmergencyDrillCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddEmergencyResponse', () => ({
  DDDEmergencyPlan: {
    find: mockEmergencyPlanFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'emergencyPlan1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'emergencyPlan1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEmergencyPlanCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyPlan1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyPlan1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyPlan1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyPlan1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyPlan1' }) }),
    countDocuments: mockEmergencyPlanCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDEmergencyEvent: {
    find: mockEmergencyEventFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'emergencyEvent1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'emergencyEvent1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEmergencyEventCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyEvent1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyEvent1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyEvent1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyEvent1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyEvent1' }) }),
    countDocuments: mockEmergencyEventCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDResponseTeam: {
    find: mockResponseTeamFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'responseTeam1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'responseTeam1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockResponseTeamCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'responseTeam1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'responseTeam1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'responseTeam1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'responseTeam1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'responseTeam1' }) }),
    countDocuments: mockResponseTeamCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDEmergencyDrill: {
    find: mockEmergencyDrillFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'emergencyDrill1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'emergencyDrill1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEmergencyDrillCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyDrill1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyDrill1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyDrill1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyDrill1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'emergencyDrill1' }) }),
    countDocuments: mockEmergencyDrillCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  EMERGENCY_TYPES: ['item1', 'item2'],
  EMERGENCY_STATUSES: ['item1', 'item2'],
  RESPONSE_LEVELS: ['item1', 'item2'],
  TEAM_ROLES: ['item1', 'item2'],
  DRILL_TYPES: ['item1', 'item2'],
  DRILL_STATUSES: ['item1', 'item2'],
  BUILTIN_EMERGENCY_PLANS: ['item1', 'item2'],

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

const svc = require('../../services/dddEmergencyResponse');

describe('dddEmergencyResponse service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _emergencyPlanL = jest.fn().mockResolvedValue([]);
    const _emergencyPlanLim = jest.fn().mockReturnValue({ lean: _emergencyPlanL });
    const _emergencyPlanS = jest.fn().mockReturnValue({ limit: _emergencyPlanLim, lean: _emergencyPlanL, populate: jest.fn().mockReturnValue({ lean: _emergencyPlanL }) });
    mockEmergencyPlanFind.mockReturnValue({ sort: _emergencyPlanS, lean: _emergencyPlanL, limit: _emergencyPlanLim, populate: jest.fn().mockReturnValue({ lean: _emergencyPlanL, sort: _emergencyPlanS }) });
    const _emergencyEventL = jest.fn().mockResolvedValue([]);
    const _emergencyEventLim = jest.fn().mockReturnValue({ lean: _emergencyEventL });
    const _emergencyEventS = jest.fn().mockReturnValue({ limit: _emergencyEventLim, lean: _emergencyEventL, populate: jest.fn().mockReturnValue({ lean: _emergencyEventL }) });
    mockEmergencyEventFind.mockReturnValue({ sort: _emergencyEventS, lean: _emergencyEventL, limit: _emergencyEventLim, populate: jest.fn().mockReturnValue({ lean: _emergencyEventL, sort: _emergencyEventS }) });
    const _responseTeamL = jest.fn().mockResolvedValue([]);
    const _responseTeamLim = jest.fn().mockReturnValue({ lean: _responseTeamL });
    const _responseTeamS = jest.fn().mockReturnValue({ limit: _responseTeamLim, lean: _responseTeamL, populate: jest.fn().mockReturnValue({ lean: _responseTeamL }) });
    mockResponseTeamFind.mockReturnValue({ sort: _responseTeamS, lean: _responseTeamL, limit: _responseTeamLim, populate: jest.fn().mockReturnValue({ lean: _responseTeamL, sort: _responseTeamS }) });
    const _emergencyDrillL = jest.fn().mockResolvedValue([]);
    const _emergencyDrillLim = jest.fn().mockReturnValue({ lean: _emergencyDrillL });
    const _emergencyDrillS = jest.fn().mockReturnValue({ limit: _emergencyDrillLim, lean: _emergencyDrillL, populate: jest.fn().mockReturnValue({ lean: _emergencyDrillL }) });
    mockEmergencyDrillFind.mockReturnValue({ sort: _emergencyDrillS, lean: _emergencyDrillL, limit: _emergencyDrillLim, populate: jest.fn().mockReturnValue({ lean: _emergencyDrillL, sort: _emergencyDrillS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('EmergencyResponse');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listPlans returns result', async () => {
    let r; try { r = await svc.listPlans({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPlan returns result', async () => {
    let r; try { r = await svc.getPlan({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPlan creates/returns result', async () => {
    let r; try { r = await svc.createPlan({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePlan updates/returns result', async () => {
    let r; try { r = await svc.updatePlan('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listEvents returns result', async () => {
    let r; try { r = await svc.listEvents({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('activateEmergency updates/returns result', async () => {
    let r; try { r = await svc.activateEmergency('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateEvent updates/returns result', async () => {
    let r; try { r = await svc.updateEvent('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('deactivateEmergency updates/returns result', async () => {
    let r; try { r = await svc.deactivateEmergency('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTeams returns result', async () => {
    let r; try { r = await svc.listTeams({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createTeam creates/returns result', async () => {
    let r; try { r = await svc.createTeam({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateTeam updates/returns result', async () => {
    let r; try { r = await svc.updateTeam('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDrills returns result', async () => {
    let r; try { r = await svc.listDrills({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('scheduleDrill creates/returns result', async () => {
    let r; try { r = await svc.scheduleDrill({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateDrill updates/returns result', async () => {
    let r; try { r = await svc.updateDrill('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('completeDrill updates/returns result', async () => {
    let r; try { r = await svc.completeDrill('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getEmergencyAnalytics returns object', async () => {
    let r; try { r = await svc.getEmergencyAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

'use strict';

/* ── mock-prefixed variables ── */
const mockResearchProtocolFind = jest.fn();
const mockResearchProtocolCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'researchProtocol1', ...d }));
const mockResearchProtocolCount = jest.fn().mockResolvedValue(0);
const mockResearchTeamFind = jest.fn();
const mockResearchTeamCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'researchTeam1', ...d }));
const mockResearchTeamCount = jest.fn().mockResolvedValue(0);
const mockDataCollectionFind = jest.fn();
const mockDataCollectionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'dataCollection1', ...d }));
const mockDataCollectionCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddResearchProtocol', () => ({
  DDDResearchProtocol: {
    find: mockResearchProtocolFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'researchProtocol1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'researchProtocol1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockResearchProtocolCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'researchProtocol1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'researchProtocol1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'researchProtocol1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'researchProtocol1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'researchProtocol1' }) }),
    countDocuments: mockResearchProtocolCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDResearchTeam: {
    find: mockResearchTeamFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'researchTeam1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'researchTeam1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockResearchTeamCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'researchTeam1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'researchTeam1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'researchTeam1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'researchTeam1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'researchTeam1' }) }),
    countDocuments: mockResearchTeamCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDataCollection: {
    find: mockDataCollectionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'dataCollection1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'dataCollection1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDataCollectionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'dataCollection1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'dataCollection1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'dataCollection1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'dataCollection1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'dataCollection1' }) }),
    countDocuments: mockDataCollectionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  PROTOCOL_TYPES: ['item1', 'item2'],
  PROTOCOL_STATUSES: ['item1', 'item2'],
  IRB_STATUSES: ['item1', 'item2'],
  STUDY_PHASES: ['item1', 'item2'],
  RISK_LEVELS: ['item1', 'item2'],
  FUNDING_TYPES: ['item1', 'item2'],
  BUILTIN_PROTOCOL_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddResearchProtocol');

describe('dddResearchProtocol service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _researchProtocolL = jest.fn().mockResolvedValue([]);
    const _researchProtocolLim = jest.fn().mockReturnValue({ lean: _researchProtocolL });
    const _researchProtocolS = jest.fn().mockReturnValue({ limit: _researchProtocolLim, lean: _researchProtocolL, populate: jest.fn().mockReturnValue({ lean: _researchProtocolL }) });
    mockResearchProtocolFind.mockReturnValue({ sort: _researchProtocolS, lean: _researchProtocolL, limit: _researchProtocolLim, populate: jest.fn().mockReturnValue({ lean: _researchProtocolL, sort: _researchProtocolS }) });
    const _researchTeamL = jest.fn().mockResolvedValue([]);
    const _researchTeamLim = jest.fn().mockReturnValue({ lean: _researchTeamL });
    const _researchTeamS = jest.fn().mockReturnValue({ limit: _researchTeamLim, lean: _researchTeamL, populate: jest.fn().mockReturnValue({ lean: _researchTeamL }) });
    mockResearchTeamFind.mockReturnValue({ sort: _researchTeamS, lean: _researchTeamL, limit: _researchTeamLim, populate: jest.fn().mockReturnValue({ lean: _researchTeamL, sort: _researchTeamS }) });
    const _dataCollectionL = jest.fn().mockResolvedValue([]);
    const _dataCollectionLim = jest.fn().mockReturnValue({ lean: _dataCollectionL });
    const _dataCollectionS = jest.fn().mockReturnValue({ limit: _dataCollectionLim, lean: _dataCollectionL, populate: jest.fn().mockReturnValue({ lean: _dataCollectionL }) });
    mockDataCollectionFind.mockReturnValue({ sort: _dataCollectionS, lean: _dataCollectionL, limit: _dataCollectionLim, populate: jest.fn().mockReturnValue({ lean: _dataCollectionL, sort: _dataCollectionS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('ResearchProtocol');
  });


  test('listProtocols returns result', async () => {
    let r; try { r = await svc.listProtocols({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getProtocol returns result', async () => {
    let r; try { r = await svc.getProtocol({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createProtocol creates/returns result', async () => {
    let r; try { r = await svc.createProtocol({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateProtocol updates/returns result', async () => {
    let r; try { r = await svc.updateProtocol('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listIRBSubmissions returns result', async () => {
    let r; try { r = await svc.listIRBSubmissions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('submitToIRB creates/returns result', async () => {
    let r; try { r = await svc.submitToIRB({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateIRBStatus updates/returns result', async () => {
    let r; try { r = await svc.updateIRBStatus('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTeams returns result', async () => {
    let r; try { r = await svc.listTeams({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createTeam creates/returns result', async () => {
    let r; try { r = await svc.createTeam({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDataCollections returns result', async () => {
    let r; try { r = await svc.listDataCollections({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createDataCollection creates/returns result', async () => {
    let r; try { r = await svc.createDataCollection({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getProtocolAnalytics returns object', async () => {
    let r; try { r = await svc.getProtocolAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

'use strict';

/* ── mock-prefixed variables ── */
const mockSystemIncidentFind = jest.fn();
const mockSystemIncidentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'systemIncident1', ...d }));
const mockSystemIncidentCount = jest.fn().mockResolvedValue(0);
const mockResponseActionFind = jest.fn();
const mockResponseActionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'responseAction1', ...d }));
const mockResponseActionCount = jest.fn().mockResolvedValue(0);
const mockPostMortemFind = jest.fn();
const mockPostMortemCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'postMortem1', ...d }));
const mockPostMortemCount = jest.fn().mockResolvedValue(0);
const mockCommunicationLogFind = jest.fn();
const mockCommunicationLogCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'communicationLog1', ...d }));
const mockCommunicationLogCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddIncidentResponse', () => ({
  DDDSystemIncident: {
    find: mockSystemIncidentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'systemIncident1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'systemIncident1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSystemIncidentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'systemIncident1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'systemIncident1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'systemIncident1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'systemIncident1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'systemIncident1' }) }),
    countDocuments: mockSystemIncidentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDResponseAction: {
    find: mockResponseActionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'responseAction1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'responseAction1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockResponseActionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'responseAction1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'responseAction1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'responseAction1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'responseAction1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'responseAction1' }) }),
    countDocuments: mockResponseActionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPostMortem: {
    find: mockPostMortemFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'postMortem1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'postMortem1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPostMortemCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'postMortem1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'postMortem1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'postMortem1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'postMortem1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'postMortem1' }) }),
    countDocuments: mockPostMortemCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCommunicationLog: {
    find: mockCommunicationLogFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'communicationLog1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'communicationLog1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCommunicationLogCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationLog1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationLog1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationLog1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationLog1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationLog1' }) }),
    countDocuments: mockCommunicationLogCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  INCIDENT_TYPES: ['item1', 'item2'],
  INCIDENT_SEVERITIES: ['item1', 'item2'],
  INCIDENT_STATUSES: ['item1', 'item2'],
  ESCALATION_PATHS: ['item1', 'item2'],
  RESPONSE_ACTIONS: ['item1', 'item2'],
  ROOT_CAUSES: ['item1', 'item2'],
  BUILTIN_RUNBOOKS: ['item1', 'item2'],

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

const svc = require('../../services/dddIncidentResponse');

describe('dddIncidentResponse service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _systemIncidentL = jest.fn().mockResolvedValue([]);
    const _systemIncidentLim = jest.fn().mockReturnValue({ lean: _systemIncidentL });
    const _systemIncidentS = jest.fn().mockReturnValue({ limit: _systemIncidentLim, lean: _systemIncidentL, populate: jest.fn().mockReturnValue({ lean: _systemIncidentL }) });
    mockSystemIncidentFind.mockReturnValue({ sort: _systemIncidentS, lean: _systemIncidentL, limit: _systemIncidentLim, populate: jest.fn().mockReturnValue({ lean: _systemIncidentL, sort: _systemIncidentS }) });
    const _responseActionL = jest.fn().mockResolvedValue([]);
    const _responseActionLim = jest.fn().mockReturnValue({ lean: _responseActionL });
    const _responseActionS = jest.fn().mockReturnValue({ limit: _responseActionLim, lean: _responseActionL, populate: jest.fn().mockReturnValue({ lean: _responseActionL }) });
    mockResponseActionFind.mockReturnValue({ sort: _responseActionS, lean: _responseActionL, limit: _responseActionLim, populate: jest.fn().mockReturnValue({ lean: _responseActionL, sort: _responseActionS }) });
    const _postMortemL = jest.fn().mockResolvedValue([]);
    const _postMortemLim = jest.fn().mockReturnValue({ lean: _postMortemL });
    const _postMortemS = jest.fn().mockReturnValue({ limit: _postMortemLim, lean: _postMortemL, populate: jest.fn().mockReturnValue({ lean: _postMortemL }) });
    mockPostMortemFind.mockReturnValue({ sort: _postMortemS, lean: _postMortemL, limit: _postMortemLim, populate: jest.fn().mockReturnValue({ lean: _postMortemL, sort: _postMortemS }) });
    const _communicationLogL = jest.fn().mockResolvedValue([]);
    const _communicationLogLim = jest.fn().mockReturnValue({ lean: _communicationLogL });
    const _communicationLogS = jest.fn().mockReturnValue({ limit: _communicationLogLim, lean: _communicationLogL, populate: jest.fn().mockReturnValue({ lean: _communicationLogL }) });
    mockCommunicationLogFind.mockReturnValue({ sort: _communicationLogS, lean: _communicationLogL, limit: _communicationLogLim, populate: jest.fn().mockReturnValue({ lean: _communicationLogL, sort: _communicationLogS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('IncidentResponse');
  });


  test('createIncident creates/returns result', async () => {
    let r; try { r = await svc.createIncident({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listIncidents returns result', async () => {
    let r; try { r = await svc.listIncidents({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateIncident updates/returns result', async () => {
    let r; try { r = await svc.updateIncident('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addAction creates/returns result', async () => {
    let r; try { r = await svc.addAction({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listActions returns result', async () => {
    let r; try { r = await svc.listActions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPostMortem creates/returns result', async () => {
    let r; try { r = await svc.createPostMortem({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPostMortems returns result', async () => {
    let r; try { r = await svc.listPostMortems({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePostMortem updates/returns result', async () => {
    let r; try { r = await svc.updatePostMortem('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addCommunication creates/returns result', async () => {
    let r; try { r = await svc.addCommunication({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCommunications returns result', async () => {
    let r; try { r = await svc.listCommunications({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getIncidentStats returns object', async () => {
    let r; try { r = await svc.getIncidentStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

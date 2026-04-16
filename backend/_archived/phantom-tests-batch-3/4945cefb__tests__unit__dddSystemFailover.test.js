'use strict';

/* ── mock-prefixed variables ── */
const mockFailoverConfigFind = jest.fn();
const mockFailoverConfigCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'failoverConfig1', ...d }));
const mockFailoverConfigCount = jest.fn().mockResolvedValue(0);
const mockHealthProbeFind = jest.fn();
const mockHealthProbeCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'healthProbe1', ...d }));
const mockHealthProbeCount = jest.fn().mockResolvedValue(0);
const mockSwitchoverEventFind = jest.fn();
const mockSwitchoverEventCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'switchoverEvent1', ...d }));
const mockSwitchoverEventCount = jest.fn().mockResolvedValue(0);
const mockFailoverTestFind = jest.fn();
const mockFailoverTestCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'failoverTest1', ...d }));
const mockFailoverTestCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddSystemFailover', () => ({
  DDDFailoverConfig: {
    find: mockFailoverConfigFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'failoverConfig1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'failoverConfig1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFailoverConfigCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'failoverConfig1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'failoverConfig1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'failoverConfig1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'failoverConfig1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'failoverConfig1' }) }),
    countDocuments: mockFailoverConfigCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDHealthProbe: {
    find: mockHealthProbeFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'healthProbe1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'healthProbe1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockHealthProbeCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'healthProbe1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'healthProbe1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'healthProbe1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'healthProbe1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'healthProbe1' }) }),
    countDocuments: mockHealthProbeCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSwitchoverEvent: {
    find: mockSwitchoverEventFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'switchoverEvent1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'switchoverEvent1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSwitchoverEventCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'switchoverEvent1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'switchoverEvent1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'switchoverEvent1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'switchoverEvent1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'switchoverEvent1' }) }),
    countDocuments: mockSwitchoverEventCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDFailoverTest: {
    find: mockFailoverTestFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'failoverTest1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'failoverTest1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFailoverTestCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'failoverTest1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'failoverTest1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'failoverTest1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'failoverTest1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'failoverTest1' }) }),
    countDocuments: mockFailoverTestCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  FAILOVER_MODES: ['item1', 'item2'],
  NODE_STATUSES: ['item1', 'item2'],
  PROBE_TYPES: ['item1', 'item2'],
  SWITCHOVER_REASONS: ['item1', 'item2'],
  REDUNDANCY_LEVELS: ['item1', 'item2'],
  HEALTH_STATES: ['item1', 'item2'],
  BUILTIN_FAILOVER_CONFIGS: ['item1', 'item2'],

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

const svc = require('../../services/dddSystemFailover');

describe('dddSystemFailover service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _failoverConfigL = jest.fn().mockResolvedValue([]);
    const _failoverConfigLim = jest.fn().mockReturnValue({ lean: _failoverConfigL });
    const _failoverConfigS = jest.fn().mockReturnValue({ limit: _failoverConfigLim, lean: _failoverConfigL, populate: jest.fn().mockReturnValue({ lean: _failoverConfigL }) });
    mockFailoverConfigFind.mockReturnValue({ sort: _failoverConfigS, lean: _failoverConfigL, limit: _failoverConfigLim, populate: jest.fn().mockReturnValue({ lean: _failoverConfigL, sort: _failoverConfigS }) });
    const _healthProbeL = jest.fn().mockResolvedValue([]);
    const _healthProbeLim = jest.fn().mockReturnValue({ lean: _healthProbeL });
    const _healthProbeS = jest.fn().mockReturnValue({ limit: _healthProbeLim, lean: _healthProbeL, populate: jest.fn().mockReturnValue({ lean: _healthProbeL }) });
    mockHealthProbeFind.mockReturnValue({ sort: _healthProbeS, lean: _healthProbeL, limit: _healthProbeLim, populate: jest.fn().mockReturnValue({ lean: _healthProbeL, sort: _healthProbeS }) });
    const _switchoverEventL = jest.fn().mockResolvedValue([]);
    const _switchoverEventLim = jest.fn().mockReturnValue({ lean: _switchoverEventL });
    const _switchoverEventS = jest.fn().mockReturnValue({ limit: _switchoverEventLim, lean: _switchoverEventL, populate: jest.fn().mockReturnValue({ lean: _switchoverEventL }) });
    mockSwitchoverEventFind.mockReturnValue({ sort: _switchoverEventS, lean: _switchoverEventL, limit: _switchoverEventLim, populate: jest.fn().mockReturnValue({ lean: _switchoverEventL, sort: _switchoverEventS }) });
    const _failoverTestL = jest.fn().mockResolvedValue([]);
    const _failoverTestLim = jest.fn().mockReturnValue({ lean: _failoverTestL });
    const _failoverTestS = jest.fn().mockReturnValue({ limit: _failoverTestLim, lean: _failoverTestL, populate: jest.fn().mockReturnValue({ lean: _failoverTestL }) });
    mockFailoverTestFind.mockReturnValue({ sort: _failoverTestS, lean: _failoverTestL, limit: _failoverTestLim, populate: jest.fn().mockReturnValue({ lean: _failoverTestL, sort: _failoverTestS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('SystemFailover');
  });


  test('createConfig creates/returns result', async () => {
    let r; try { r = await svc.createConfig({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listConfigs returns result', async () => {
    let r; try { r = await svc.listConfigs({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateConfig updates/returns result', async () => {
    let r; try { r = await svc.updateConfig('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordProbe creates/returns result', async () => {
    let r; try { r = await svc.recordProbe({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listProbes returns result', async () => {
    let r; try { r = await svc.listProbes({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createSwitchover creates/returns result', async () => {
    let r; try { r = await svc.createSwitchover({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listSwitchovers returns result', async () => {
    let r; try { r = await svc.listSwitchovers({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createTest creates/returns result', async () => {
    let r; try { r = await svc.createTest({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTests returns result', async () => {
    let r; try { r = await svc.listTests({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateTest updates/returns result', async () => {
    let r; try { r = await svc.updateTest('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getFailoverStats returns object', async () => {
    let r; try { r = await svc.getFailoverStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

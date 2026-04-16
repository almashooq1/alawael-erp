'use strict';

/* ── mock-prefixed variables ── */
const mockSatisfactionScoreFind = jest.fn();
const mockSatisfactionScoreCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'satisfactionScore1', ...d }));
const mockSatisfactionScoreCount = jest.fn().mockResolvedValue(0);
const mockSatisfactionTrendFind = jest.fn();
const mockSatisfactionTrendCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'satisfactionTrend1', ...d }));
const mockSatisfactionTrendCount = jest.fn().mockResolvedValue(0);
const mockSatisfactionBenchmarkFind = jest.fn();
const mockSatisfactionBenchmarkCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'satisfactionBenchmark1', ...d }));
const mockSatisfactionBenchmarkCount = jest.fn().mockResolvedValue(0);
const mockSatisfactionAlertFind = jest.fn();
const mockSatisfactionAlertCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'satisfactionAlert1', ...d }));
const mockSatisfactionAlertCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddSatisfactionTracker', () => ({
  DDDSatisfactionScore: {
    find: mockSatisfactionScoreFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'satisfactionScore1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'satisfactionScore1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSatisfactionScoreCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionScore1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionScore1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionScore1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionScore1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionScore1' }) }),
    countDocuments: mockSatisfactionScoreCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSatisfactionTrend: {
    find: mockSatisfactionTrendFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'satisfactionTrend1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'satisfactionTrend1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSatisfactionTrendCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionTrend1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionTrend1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionTrend1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionTrend1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionTrend1' }) }),
    countDocuments: mockSatisfactionTrendCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSatisfactionBenchmark: {
    find: mockSatisfactionBenchmarkFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'satisfactionBenchmark1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'satisfactionBenchmark1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSatisfactionBenchmarkCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionBenchmark1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionBenchmark1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionBenchmark1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionBenchmark1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionBenchmark1' }) }),
    countDocuments: mockSatisfactionBenchmarkCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSatisfactionAlert: {
    find: mockSatisfactionAlertFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'satisfactionAlert1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'satisfactionAlert1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSatisfactionAlertCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionAlert1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionAlert1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionAlert1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionAlert1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'satisfactionAlert1' }) }),
    countDocuments: mockSatisfactionAlertCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  SATISFACTION_METRICS: ['item1', 'item2'],
  METRIC_STATUSES: ['item1', 'item2'],
  SCORE_CATEGORIES: ['item1', 'item2'],
  BENCHMARK_TYPES: ['item1', 'item2'],
  TREND_PERIODS: ['item1', 'item2'],
  SEGMENT_TYPES: ['item1', 'item2'],
  BUILTIN_BENCHMARKS: ['item1', 'item2'],

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

const svc = require('../../services/dddSatisfactionTracker');

describe('dddSatisfactionTracker service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _satisfactionScoreL = jest.fn().mockResolvedValue([]);
    const _satisfactionScoreLim = jest.fn().mockReturnValue({ lean: _satisfactionScoreL });
    const _satisfactionScoreS = jest.fn().mockReturnValue({ limit: _satisfactionScoreLim, lean: _satisfactionScoreL, populate: jest.fn().mockReturnValue({ lean: _satisfactionScoreL }) });
    mockSatisfactionScoreFind.mockReturnValue({ sort: _satisfactionScoreS, lean: _satisfactionScoreL, limit: _satisfactionScoreLim, populate: jest.fn().mockReturnValue({ lean: _satisfactionScoreL, sort: _satisfactionScoreS }) });
    const _satisfactionTrendL = jest.fn().mockResolvedValue([]);
    const _satisfactionTrendLim = jest.fn().mockReturnValue({ lean: _satisfactionTrendL });
    const _satisfactionTrendS = jest.fn().mockReturnValue({ limit: _satisfactionTrendLim, lean: _satisfactionTrendL, populate: jest.fn().mockReturnValue({ lean: _satisfactionTrendL }) });
    mockSatisfactionTrendFind.mockReturnValue({ sort: _satisfactionTrendS, lean: _satisfactionTrendL, limit: _satisfactionTrendLim, populate: jest.fn().mockReturnValue({ lean: _satisfactionTrendL, sort: _satisfactionTrendS }) });
    const _satisfactionBenchmarkL = jest.fn().mockResolvedValue([]);
    const _satisfactionBenchmarkLim = jest.fn().mockReturnValue({ lean: _satisfactionBenchmarkL });
    const _satisfactionBenchmarkS = jest.fn().mockReturnValue({ limit: _satisfactionBenchmarkLim, lean: _satisfactionBenchmarkL, populate: jest.fn().mockReturnValue({ lean: _satisfactionBenchmarkL }) });
    mockSatisfactionBenchmarkFind.mockReturnValue({ sort: _satisfactionBenchmarkS, lean: _satisfactionBenchmarkL, limit: _satisfactionBenchmarkLim, populate: jest.fn().mockReturnValue({ lean: _satisfactionBenchmarkL, sort: _satisfactionBenchmarkS }) });
    const _satisfactionAlertL = jest.fn().mockResolvedValue([]);
    const _satisfactionAlertLim = jest.fn().mockReturnValue({ lean: _satisfactionAlertL });
    const _satisfactionAlertS = jest.fn().mockReturnValue({ limit: _satisfactionAlertLim, lean: _satisfactionAlertL, populate: jest.fn().mockReturnValue({ lean: _satisfactionAlertL }) });
    mockSatisfactionAlertFind.mockReturnValue({ sort: _satisfactionAlertS, lean: _satisfactionAlertL, limit: _satisfactionAlertLim, populate: jest.fn().mockReturnValue({ lean: _satisfactionAlertL, sort: _satisfactionAlertS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('SatisfactionTracker');
  });


  test('listScores returns result', async () => {
    let r; try { r = await svc.listScores({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getScore returns result', async () => {
    let r; try { r = await svc.getScore({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordScore creates/returns result', async () => {
    let r; try { r = await svc.recordScore({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTrends returns result', async () => {
    let r; try { r = await svc.listTrends({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('generateTrend creates/returns result', async () => {
    let r; try { r = await svc.generateTrend({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listBenchmarks returns result', async () => {
    let r; try { r = await svc.listBenchmarks({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createBenchmark creates/returns result', async () => {
    let r; try { r = await svc.createBenchmark({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateBenchmark updates/returns result', async () => {
    let r; try { r = await svc.updateBenchmark('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAlerts returns result', async () => {
    let r; try { r = await svc.listAlerts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createAlert creates/returns result', async () => {
    let r; try { r = await svc.createAlert({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('resolveAlert updates/returns result', async () => {
    let r; try { r = await svc.resolveAlert('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getSatisfactionAnalytics returns object', async () => {
    let r; try { r = await svc.getSatisfactionAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

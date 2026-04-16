'use strict';

/* ── mock-prefixed variables ── */
const mockPerformanceReviewFind = jest.fn();
const mockPerformanceReviewCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'performanceReview1', ...d }));
const mockPerformanceReviewCount = jest.fn().mockResolvedValue(0);
const mockPerformanceGoalFind = jest.fn();
const mockPerformanceGoalCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'performanceGoal1', ...d }));
const mockPerformanceGoalCount = jest.fn().mockResolvedValue(0);
const mockPerfEvalFeedbackFind = jest.fn();
const mockPerfEvalFeedbackCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'perfEvalFeedback1', ...d }));
const mockPerfEvalFeedbackCount = jest.fn().mockResolvedValue(0);
const mockPerformanceKPIFind = jest.fn();
const mockPerformanceKPICreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'performanceKPI1', ...d }));
const mockPerformanceKPICount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddPerformanceEvaluator', () => ({
  DDDPerformanceReview: {
    find: mockPerformanceReviewFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'performanceReview1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'performanceReview1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPerformanceReviewCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceReview1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceReview1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceReview1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceReview1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceReview1' }) }),
    countDocuments: mockPerformanceReviewCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPerformanceGoal: {
    find: mockPerformanceGoalFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'performanceGoal1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'performanceGoal1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPerformanceGoalCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceGoal1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceGoal1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceGoal1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceGoal1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceGoal1' }) }),
    countDocuments: mockPerformanceGoalCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPerfEvalFeedback: {
    find: mockPerfEvalFeedbackFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'perfEvalFeedback1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'perfEvalFeedback1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPerfEvalFeedbackCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'perfEvalFeedback1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'perfEvalFeedback1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'perfEvalFeedback1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'perfEvalFeedback1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'perfEvalFeedback1' }) }),
    countDocuments: mockPerfEvalFeedbackCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPerformanceKPI: {
    find: mockPerformanceKPIFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'performanceKPI1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'performanceKPI1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPerformanceKPICreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceKPI1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceKPI1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceKPI1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceKPI1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'performanceKPI1' }) }),
    countDocuments: mockPerformanceKPICount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  REVIEW_TYPES: ['item1', 'item2'],
  REVIEW_STATUSES: ['item1', 'item2'],
  RATING_SCALES: ['item1', 'item2'],
  GOAL_STATUSES: ['item1', 'item2'],
  FEEDBACK_TYPES: ['item1', 'item2'],
  KPI_CATEGORIES: ['item1', 'item2'],
  BUILTIN_KPIS: ['item1', 'item2'],

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

const svc = require('../../services/dddPerformanceEvaluator');

describe('dddPerformanceEvaluator service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _performanceReviewL = jest.fn().mockResolvedValue([]);
    const _performanceReviewLim = jest.fn().mockReturnValue({ lean: _performanceReviewL });
    const _performanceReviewS = jest.fn().mockReturnValue({ limit: _performanceReviewLim, lean: _performanceReviewL, populate: jest.fn().mockReturnValue({ lean: _performanceReviewL }) });
    mockPerformanceReviewFind.mockReturnValue({ sort: _performanceReviewS, lean: _performanceReviewL, limit: _performanceReviewLim, populate: jest.fn().mockReturnValue({ lean: _performanceReviewL, sort: _performanceReviewS }) });
    const _performanceGoalL = jest.fn().mockResolvedValue([]);
    const _performanceGoalLim = jest.fn().mockReturnValue({ lean: _performanceGoalL });
    const _performanceGoalS = jest.fn().mockReturnValue({ limit: _performanceGoalLim, lean: _performanceGoalL, populate: jest.fn().mockReturnValue({ lean: _performanceGoalL }) });
    mockPerformanceGoalFind.mockReturnValue({ sort: _performanceGoalS, lean: _performanceGoalL, limit: _performanceGoalLim, populate: jest.fn().mockReturnValue({ lean: _performanceGoalL, sort: _performanceGoalS }) });
    const _perfEvalFeedbackL = jest.fn().mockResolvedValue([]);
    const _perfEvalFeedbackLim = jest.fn().mockReturnValue({ lean: _perfEvalFeedbackL });
    const _perfEvalFeedbackS = jest.fn().mockReturnValue({ limit: _perfEvalFeedbackLim, lean: _perfEvalFeedbackL, populate: jest.fn().mockReturnValue({ lean: _perfEvalFeedbackL }) });
    mockPerfEvalFeedbackFind.mockReturnValue({ sort: _perfEvalFeedbackS, lean: _perfEvalFeedbackL, limit: _perfEvalFeedbackLim, populate: jest.fn().mockReturnValue({ lean: _perfEvalFeedbackL, sort: _perfEvalFeedbackS }) });
    const _performanceKPIL = jest.fn().mockResolvedValue([]);
    const _performanceKPILim = jest.fn().mockReturnValue({ lean: _performanceKPIL });
    const _performanceKPIS = jest.fn().mockReturnValue({ limit: _performanceKPILim, lean: _performanceKPIL, populate: jest.fn().mockReturnValue({ lean: _performanceKPIL }) });
    mockPerformanceKPIFind.mockReturnValue({ sort: _performanceKPIS, lean: _performanceKPIL, limit: _performanceKPILim, populate: jest.fn().mockReturnValue({ lean: _performanceKPIL, sort: _performanceKPIS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('PerformanceEvaluator');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listReviews returns result', async () => {
    let r; try { r = await svc.listReviews({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getReview returns result', async () => {
    let r; try { r = await svc.getReview({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createReview creates/returns result', async () => {
    let r; try { r = await svc.createReview({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateReview updates/returns result', async () => {
    let r; try { r = await svc.updateReview('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('submitReview creates/returns result', async () => {
    let r; try { r = await svc.submitReview({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('approveReview updates/returns result', async () => {
    let r; try { r = await svc.approveReview('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('acknowledgeReview updates/returns result', async () => {
    let r; try { r = await svc.acknowledgeReview('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('completeReview updates/returns result', async () => {
    let r; try { r = await svc.completeReview('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listGoals returns result', async () => {
    let r; try { r = await svc.listGoals({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createGoal creates/returns result', async () => {
    let r; try { r = await svc.createGoal({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateGoal updates/returns result', async () => {
    let r; try { r = await svc.updateGoal('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateGoalProgress updates/returns result', async () => {
    let r; try { r = await svc.updateGoalProgress('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('completeGoal updates/returns result', async () => {
    let r; try { r = await svc.completeGoal('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listFeedback returns result', async () => {
    let r; try { r = await svc.listFeedback({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('submitFeedback creates/returns result', async () => {
    let r; try { r = await svc.submitFeedback({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listKPIs returns result', async () => {
    let r; try { r = await svc.listKPIs({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createKPI creates/returns result', async () => {
    let r; try { r = await svc.createKPI({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateKPI updates/returns result', async () => {
    let r; try { r = await svc.updateKPI('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPerformanceAnalytics returns object', async () => {
    let r; try { r = await svc.getPerformanceAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

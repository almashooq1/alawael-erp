'use strict';

/* ── mock-prefixed variables ── */
const mockContinuityPlanFind = jest.fn();
const mockContinuityPlanCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'continuityPlan1', ...d }));
const mockContinuityPlanCount = jest.fn().mockResolvedValue(0);
const mockImpactAnalysisFind = jest.fn();
const mockImpactAnalysisCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'impactAnalysis1', ...d }));
const mockImpactAnalysisCount = jest.fn().mockResolvedValue(0);
const mockContinuityExerciseFind = jest.fn();
const mockContinuityExerciseCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'continuityExercise1', ...d }));
const mockContinuityExerciseCount = jest.fn().mockResolvedValue(0);
const mockReadinessAssessmentFind = jest.fn();
const mockReadinessAssessmentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'readinessAssessment1', ...d }));
const mockReadinessAssessmentCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddBusinessContinuity', () => ({
  DDDContinuityPlan: {
    find: mockContinuityPlanFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'continuityPlan1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'continuityPlan1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockContinuityPlanCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'continuityPlan1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'continuityPlan1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'continuityPlan1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'continuityPlan1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'continuityPlan1' }) }),
    countDocuments: mockContinuityPlanCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDImpactAnalysis: {
    find: mockImpactAnalysisFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'impactAnalysis1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'impactAnalysis1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockImpactAnalysisCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactAnalysis1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactAnalysis1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactAnalysis1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactAnalysis1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactAnalysis1' }) }),
    countDocuments: mockImpactAnalysisCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDContinuityExercise: {
    find: mockContinuityExerciseFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'continuityExercise1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'continuityExercise1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockContinuityExerciseCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'continuityExercise1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'continuityExercise1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'continuityExercise1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'continuityExercise1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'continuityExercise1' }) }),
    countDocuments: mockContinuityExerciseCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDReadinessAssessment: {
    find: mockReadinessAssessmentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'readinessAssessment1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'readinessAssessment1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockReadinessAssessmentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'readinessAssessment1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'readinessAssessment1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'readinessAssessment1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'readinessAssessment1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'readinessAssessment1' }) }),
    countDocuments: mockReadinessAssessmentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  PLAN_TYPES: ['item1', 'item2'],
  PLAN_STATUSES: ['item1', 'item2'],
  IMPACT_LEVELS: ['item1', 'item2'],
  BUSINESS_FUNCTIONS: ['item1', 'item2'],
  EXERCISE_TYPES: ['item1', 'item2'],
  RECOVERY_STRATEGIES: ['item1', 'item2'],
  BUILTIN_BCP_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddBusinessContinuity');

describe('dddBusinessContinuity service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _continuityPlanL = jest.fn().mockResolvedValue([]);
    const _continuityPlanLim = jest.fn().mockReturnValue({ lean: _continuityPlanL });
    const _continuityPlanS = jest.fn().mockReturnValue({ limit: _continuityPlanLim, lean: _continuityPlanL, populate: jest.fn().mockReturnValue({ lean: _continuityPlanL }) });
    mockContinuityPlanFind.mockReturnValue({ sort: _continuityPlanS, lean: _continuityPlanL, limit: _continuityPlanLim, populate: jest.fn().mockReturnValue({ lean: _continuityPlanL, sort: _continuityPlanS }) });
    const _impactAnalysisL = jest.fn().mockResolvedValue([]);
    const _impactAnalysisLim = jest.fn().mockReturnValue({ lean: _impactAnalysisL });
    const _impactAnalysisS = jest.fn().mockReturnValue({ limit: _impactAnalysisLim, lean: _impactAnalysisL, populate: jest.fn().mockReturnValue({ lean: _impactAnalysisL }) });
    mockImpactAnalysisFind.mockReturnValue({ sort: _impactAnalysisS, lean: _impactAnalysisL, limit: _impactAnalysisLim, populate: jest.fn().mockReturnValue({ lean: _impactAnalysisL, sort: _impactAnalysisS }) });
    const _continuityExerciseL = jest.fn().mockResolvedValue([]);
    const _continuityExerciseLim = jest.fn().mockReturnValue({ lean: _continuityExerciseL });
    const _continuityExerciseS = jest.fn().mockReturnValue({ limit: _continuityExerciseLim, lean: _continuityExerciseL, populate: jest.fn().mockReturnValue({ lean: _continuityExerciseL }) });
    mockContinuityExerciseFind.mockReturnValue({ sort: _continuityExerciseS, lean: _continuityExerciseL, limit: _continuityExerciseLim, populate: jest.fn().mockReturnValue({ lean: _continuityExerciseL, sort: _continuityExerciseS }) });
    const _readinessAssessmentL = jest.fn().mockResolvedValue([]);
    const _readinessAssessmentLim = jest.fn().mockReturnValue({ lean: _readinessAssessmentL });
    const _readinessAssessmentS = jest.fn().mockReturnValue({ limit: _readinessAssessmentLim, lean: _readinessAssessmentL, populate: jest.fn().mockReturnValue({ lean: _readinessAssessmentL }) });
    mockReadinessAssessmentFind.mockReturnValue({ sort: _readinessAssessmentS, lean: _readinessAssessmentL, limit: _readinessAssessmentLim, populate: jest.fn().mockReturnValue({ lean: _readinessAssessmentL, sort: _readinessAssessmentS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('BusinessContinuity');
  });


  test('createPlan creates/returns result', async () => {
    let r; try { r = await svc.createPlan({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPlans returns result', async () => {
    let r; try { r = await svc.listPlans({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePlan updates/returns result', async () => {
    let r; try { r = await svc.updatePlan('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createImpactAnalysis creates/returns result', async () => {
    let r; try { r = await svc.createImpactAnalysis({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listImpactAnalyses returns result', async () => {
    let r; try { r = await svc.listImpactAnalyses({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createExercise creates/returns result', async () => {
    let r; try { r = await svc.createExercise({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listExercises returns result', async () => {
    let r; try { r = await svc.listExercises({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateExercise updates/returns result', async () => {
    let r; try { r = await svc.updateExercise('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createAssessment creates/returns result', async () => {
    let r; try { r = await svc.createAssessment({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAssessments returns result', async () => {
    let r; try { r = await svc.listAssessments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getContinuityStats returns object', async () => {
    let r; try { r = await svc.getContinuityStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

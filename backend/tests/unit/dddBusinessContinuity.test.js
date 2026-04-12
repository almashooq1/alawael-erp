'use strict';

const chain = () => {
  const c = {};
  [
    'find',
    'findById',
    'findByIdAndUpdate',
    'findOne',
    'sort',
    'skip',
    'limit',
    'lean',
    'populate',
    'countDocuments',
    'create',
  ].forEach(m => {
    c[m] = jest.fn().mockReturnValue(c);
  });
  c.then = undefined;
  return c;
};
const makeModel = () => {
  const c = chain();
  const M = jest.fn(() => c);
  Object.assign(M, c);
  return M;
};

const mockDDDContinuityPlan = makeModel();
const mockDDDImpactAnalysis = makeModel();
const mockDDDContinuityExercise = makeModel();
const mockDDDReadinessAssessment = makeModel();

jest.mock('../../models/DddBusinessContinuity', () => ({
  DDDContinuityPlan: mockDDDContinuityPlan,
  DDDImpactAnalysis: mockDDDImpactAnalysis,
  DDDContinuityExercise: mockDDDContinuityExercise,
  DDDReadinessAssessment: mockDDDReadinessAssessment,
  PLAN_TYPES: ['disaster_recovery', 'crisis_management'],
  PLAN_STATUSES: ['draft', 'active', 'archived'],
  IMPACT_LEVELS: ['low', 'medium', 'high', 'critical'],
  BUSINESS_FUNCTIONS: ['operations', 'finance', 'IT'],
  EXERCISE_TYPES: ['tabletop', 'functional', 'full_scale'],
  RECOVERY_STRATEGIES: ['hot_site', 'warm_site', 'cold_site'],
  BUILTIN_BCP_TEMPLATES: [{ code: 'DEFAULT' }],
}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor() {}
    log() {}
    _create(M, d) {
      return M.create(d);
    }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...o }).lean();
    }
    _list(M, f, o) {
      return M.find(f)
        .sort(o?.sort || {})
        .lean();
    }
    _getById(M, id) {
      return M.findById(id).lean();
    }
  };
});

const service = require('../../services/dddBusinessContinuity');

beforeEach(() => {
  [
    mockDDDContinuityPlan,
    mockDDDImpactAnalysis,
    mockDDDContinuityExercise,
    mockDDDReadinessAssessment,
  ].forEach(M => {
    Object.values(M).forEach(v => {
      if (typeof v === 'function' && v.mockClear) v.mockClear();
    });
  });
});

describe('dddBusinessContinuity', () => {
  /* ── Plans ── */
  describe('createPlan', () => {
    it('creates via _create', async () => {
      mockDDDContinuityPlan.create.mockResolvedValue({ _id: 'p1' });
      expect(await service.createPlan({ type: 'disaster_recovery' })).toHaveProperty('_id');
    });
  });

  describe('listPlans', () => {
    it('returns sorted by createdAt desc', async () => {
      mockDDDContinuityPlan.find.mockReturnThis();
      mockDDDContinuityPlan.sort.mockReturnThis();
      mockDDDContinuityPlan.lean.mockResolvedValue([{ _id: 'p1' }]);
      expect(await service.listPlans({})).toHaveLength(1);
      expect(mockDDDContinuityPlan.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('updatePlan', () => {
    it('updates via _update', async () => {
      mockDDDContinuityPlan.findByIdAndUpdate.mockReturnThis();
      mockDDDContinuityPlan.lean.mockResolvedValue({ _id: 'p1', status: 'active' });
      expect((await service.updatePlan('p1', { status: 'active' })).status).toBe('active');
    });
  });

  /* ── Impact Analyses ── */
  describe('createImpactAnalysis', () => {
    it('creates via _create', async () => {
      mockDDDImpactAnalysis.create.mockResolvedValue({ _id: 'ia1' });
      expect(await service.createImpactAnalysis({ level: 'high' })).toHaveProperty('_id');
    });
  });

  describe('listImpactAnalyses', () => {
    it('returns sorted by assessedAt desc', async () => {
      mockDDDImpactAnalysis.find.mockReturnThis();
      mockDDDImpactAnalysis.sort.mockReturnThis();
      mockDDDImpactAnalysis.lean.mockResolvedValue([]);
      expect(await service.listImpactAnalyses({})).toEqual([]);
      expect(mockDDDImpactAnalysis.sort).toHaveBeenCalledWith({ assessedAt: -1 });
    });
  });

  /* ── Exercises ── */
  describe('createExercise', () => {
    it('creates via _create', async () => {
      mockDDDContinuityExercise.create.mockResolvedValue({ _id: 'e1' });
      expect(await service.createExercise({ type: 'tabletop' })).toHaveProperty('_id');
    });
  });

  describe('listExercises', () => {
    it('returns sorted by scheduledDate desc', async () => {
      mockDDDContinuityExercise.find.mockReturnThis();
      mockDDDContinuityExercise.sort.mockReturnThis();
      mockDDDContinuityExercise.lean.mockResolvedValue([{ _id: 'e1' }]);
      expect(await service.listExercises({})).toHaveLength(1);
      expect(mockDDDContinuityExercise.sort).toHaveBeenCalledWith({ scheduledDate: -1 });
    });
  });

  describe('updateExercise', () => {
    it('updates via _update', async () => {
      mockDDDContinuityExercise.findByIdAndUpdate.mockReturnThis();
      mockDDDContinuityExercise.lean.mockResolvedValue({ _id: 'e1', status: 'completed' });
      expect((await service.updateExercise('e1', { status: 'completed' })).status).toBe(
        'completed'
      );
    });
  });

  /* ── Assessments ── */
  describe('createAssessment', () => {
    it('creates via _create', async () => {
      mockDDDReadinessAssessment.create.mockResolvedValue({ _id: 'a1' });
      expect(await service.createAssessment({ score: 85 })).toHaveProperty('_id');
    });
  });

  describe('listAssessments', () => {
    it('returns sorted by assessmentDate desc', async () => {
      mockDDDReadinessAssessment.find.mockReturnThis();
      mockDDDReadinessAssessment.sort.mockReturnThis();
      mockDDDReadinessAssessment.lean.mockResolvedValue([]);
      expect(await service.listAssessments({})).toEqual([]);
      expect(mockDDDReadinessAssessment.sort).toHaveBeenCalledWith({ assessmentDate: -1 });
    });
  });

  /* ── Stats ── */
  describe('getContinuityStats', () => {
    it('returns activePlans, totalAnalyses, completedExercises, totalAssessments', async () => {
      mockDDDContinuityPlan.countDocuments.mockResolvedValue(5);
      mockDDDImpactAnalysis.countDocuments.mockResolvedValue(12);
      mockDDDContinuityExercise.countDocuments.mockResolvedValue(8);
      mockDDDReadinessAssessment.countDocuments.mockResolvedValue(20);
      const r = await service.getContinuityStats();
      expect(r).toEqual({
        activePlans: 5,
        totalAnalyses: 12,
        completedExercises: 8,
        totalAssessments: 20,
      });
    });
  });
});

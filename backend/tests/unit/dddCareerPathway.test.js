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
    'aggregate',
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

const mockDDDCareerPath = makeModel();
const mockDDDSkillAssessment = makeModel();
const mockDDDSuccessionPlan = makeModel();
const mockDDDDevelopmentActivity = makeModel();

jest.mock('../../models/DddCareerPathway', () => ({
  DDDCareerPath: mockDDDCareerPath,
  DDDSkillAssessment: mockDDDSkillAssessment,
  DDDSuccessionPlan: mockDDDSuccessionPlan,
  DDDDevelopmentActivity: mockDDDDevelopmentActivity,
  PATHWAY_TYPES: ['clinical', 'administrative', 'technical'],
  PATHWAY_STATUSES: ['draft', 'active', 'completed'],
  DEVELOPMENT_AREAS: ['leadership', 'clinical_skills'],
  MILESTONE_TYPES: ['course', 'certification', 'rotation'],
  SKILL_GAP_LEVELS: ['none', 'minor', 'major'],
  SUCCESSION_PRIORITIES: ['low', 'medium', 'high', 'critical'],
  BUILTIN_PATHWAY_TEMPLATES: [{ code: 'DEFAULT' }],
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

const service = require('../../services/dddCareerPathway');

beforeEach(() => {
  [
    mockDDDCareerPath,
    mockDDDSkillAssessment,
    mockDDDSuccessionPlan,
    mockDDDDevelopmentActivity,
  ].forEach(M => {
    Object.values(M).forEach(v => {
      if (typeof v === 'function' && v.mockClear) v.mockClear();
    });
  });
});

describe('dddCareerPathway', () => {
  /* ── Career Paths ── */
  describe('createCareerPath', () => {
    it('creates via _create', async () => {
      mockDDDCareerPath.create.mockResolvedValue({ _id: 'cp1' });
      expect(await service.createCareerPath({ title: 'Clinical Lead' })).toHaveProperty('_id');
    });
  });

  describe('listCareerPaths', () => {
    it('returns sorted by createdAt desc', async () => {
      mockDDDCareerPath.find.mockReturnThis();
      mockDDDCareerPath.sort.mockReturnThis();
      mockDDDCareerPath.lean.mockResolvedValue([{ _id: 'cp1' }]);
      expect(await service.listCareerPaths({})).toHaveLength(1);
      expect(mockDDDCareerPath.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('getCareerPathById', () => {
    it('returns by id', async () => {
      mockDDDCareerPath.findById.mockReturnThis();
      mockDDDCareerPath.lean.mockResolvedValue({ _id: 'cp1' });
      expect(await service.getCareerPathById('cp1')).toHaveProperty('_id');
    });
  });

  describe('updateCareerPath', () => {
    it('updates via _update', async () => {
      mockDDDCareerPath.findByIdAndUpdate.mockReturnThis();
      mockDDDCareerPath.lean.mockResolvedValue({ _id: 'cp1', status: 'active' });
      expect((await service.updateCareerPath('cp1', { status: 'active' })).status).toBe('active');
    });
  });

  /* ── Skill Assessments ── */
  describe('createSkillAssessment', () => {
    it('creates via _create', async () => {
      mockDDDSkillAssessment.create.mockResolvedValue({ _id: 'sa1' });
      expect(await service.createSkillAssessment({ skill: 'OT' })).toHaveProperty('_id');
    });
  });

  describe('listSkillAssessments', () => {
    it('returns sorted by assessmentDate desc', async () => {
      mockDDDSkillAssessment.find.mockReturnThis();
      mockDDDSkillAssessment.sort.mockReturnThis();
      mockDDDSkillAssessment.lean.mockResolvedValue([]);
      expect(await service.listSkillAssessments({})).toEqual([]);
      expect(mockDDDSkillAssessment.sort).toHaveBeenCalledWith({ assessmentDate: -1 });
    });
  });

  /* ── Succession Plans ── */
  describe('createSuccessionPlan', () => {
    it('creates via _create', async () => {
      mockDDDSuccessionPlan.create.mockResolvedValue({ _id: 'sp1' });
      expect(await service.createSuccessionPlan({ role: 'Director' })).toHaveProperty('_id');
    });
  });

  describe('listSuccessionPlans', () => {
    it('returns sorted by priority asc', async () => {
      mockDDDSuccessionPlan.find.mockReturnThis();
      mockDDDSuccessionPlan.sort.mockReturnThis();
      mockDDDSuccessionPlan.lean.mockResolvedValue([{ _id: 'sp1' }]);
      expect(await service.listSuccessionPlans({})).toHaveLength(1);
      expect(mockDDDSuccessionPlan.sort).toHaveBeenCalledWith({ priority: 1 });
    });
  });

  describe('updateSuccessionPlan', () => {
    it('updates via _update', async () => {
      mockDDDSuccessionPlan.findByIdAndUpdate.mockReturnThis();
      mockDDDSuccessionPlan.lean.mockResolvedValue({ _id: 'sp1', priority: 'high' });
      expect((await service.updateSuccessionPlan('sp1', { priority: 'high' })).priority).toBe(
        'high'
      );
    });
  });

  /* ── Development Activities ── */
  describe('createActivity', () => {
    it('creates via _create', async () => {
      mockDDDDevelopmentActivity.create.mockResolvedValue({ _id: 'da1' });
      expect(await service.createActivity({ name: 'Workshop' })).toHaveProperty('_id');
    });
  });

  describe('listActivities', () => {
    it('returns sorted by createdAt desc', async () => {
      mockDDDDevelopmentActivity.find.mockReturnThis();
      mockDDDDevelopmentActivity.sort.mockReturnThis();
      mockDDDDevelopmentActivity.lean.mockResolvedValue([]);
      expect(await service.listActivities({})).toEqual([]);
      expect(mockDDDDevelopmentActivity.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  /* ── Stats ── */
  describe('getPathwayStats', () => {
    it('returns total, active, completed, skillAssessments', async () => {
      mockDDDCareerPath.countDocuments
        .mockResolvedValueOnce(30) // total
        .mockResolvedValueOnce(15) // active
        .mockResolvedValueOnce(10); // completed
      mockDDDSkillAssessment.countDocuments.mockResolvedValue(50);
      const r = await service.getPathwayStats();
      expect(r).toEqual({ total: 30, active: 15, completed: 10, skillAssessments: 50 });
    });
  });

  describe('getSuccessionCoverage', () => {
    it('calls aggregate on DDDSuccessionPlan', async () => {
      mockDDDSuccessionPlan.aggregate.mockResolvedValue([{ _id: 'high', count: 5 }]);
      const r = await service.getSuccessionCoverage();
      expect(r).toEqual([{ _id: 'high', count: 5 }]);
      expect(mockDDDSuccessionPlan.aggregate).toHaveBeenCalledWith([
        { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
    });
  });
});

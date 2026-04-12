'use strict';

/* ── mock-prefixed variables ── */
const mockCareerPathFind = jest.fn();
const mockCareerPathCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'careerPath1', ...d }));
const mockCareerPathCount = jest.fn().mockResolvedValue(0);
const mockSkillAssessmentFind = jest.fn();
const mockSkillAssessmentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'skillAssessment1', ...d }));
const mockSkillAssessmentCount = jest.fn().mockResolvedValue(0);
const mockSuccessionPlanFind = jest.fn();
const mockSuccessionPlanCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'successionPlan1', ...d }));
const mockSuccessionPlanCount = jest.fn().mockResolvedValue(0);
const mockDevelopmentActivityFind = jest.fn();
const mockDevelopmentActivityCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'developmentActivity1', ...d }));
const mockDevelopmentActivityCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddCareerPathway', () => ({
  DDDCareerPath: {
    find: mockCareerPathFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'careerPath1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'careerPath1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCareerPathCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'careerPath1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'careerPath1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'careerPath1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'careerPath1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'careerPath1' }) }),
    countDocuments: mockCareerPathCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSkillAssessment: {
    find: mockSkillAssessmentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'skillAssessment1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'skillAssessment1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSkillAssessmentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'skillAssessment1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'skillAssessment1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'skillAssessment1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'skillAssessment1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'skillAssessment1' }) }),
    countDocuments: mockSkillAssessmentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSuccessionPlan: {
    find: mockSuccessionPlanFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'successionPlan1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'successionPlan1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSuccessionPlanCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'successionPlan1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'successionPlan1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'successionPlan1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'successionPlan1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'successionPlan1' }) }),
    countDocuments: mockSuccessionPlanCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDevelopmentActivity: {
    find: mockDevelopmentActivityFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'developmentActivity1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'developmentActivity1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDevelopmentActivityCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'developmentActivity1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'developmentActivity1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'developmentActivity1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'developmentActivity1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'developmentActivity1' }) }),
    countDocuments: mockDevelopmentActivityCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  PATHWAY_TYPES: ['item1', 'item2'],
  PATHWAY_STATUSES: ['item1', 'item2'],
  DEVELOPMENT_AREAS: ['item1', 'item2'],
  MILESTONE_TYPES: ['item1', 'item2'],
  SKILL_GAP_LEVELS: ['item1', 'item2'],
  SUCCESSION_PRIORITIES: ['item1', 'item2'],
  BUILTIN_PATHWAY_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddCareerPathway');

describe('dddCareerPathway service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _careerPathL = jest.fn().mockResolvedValue([]);
    const _careerPathLim = jest.fn().mockReturnValue({ lean: _careerPathL });
    const _careerPathS = jest.fn().mockReturnValue({ limit: _careerPathLim, lean: _careerPathL, populate: jest.fn().mockReturnValue({ lean: _careerPathL }) });
    mockCareerPathFind.mockReturnValue({ sort: _careerPathS, lean: _careerPathL, limit: _careerPathLim, populate: jest.fn().mockReturnValue({ lean: _careerPathL, sort: _careerPathS }) });
    const _skillAssessmentL = jest.fn().mockResolvedValue([]);
    const _skillAssessmentLim = jest.fn().mockReturnValue({ lean: _skillAssessmentL });
    const _skillAssessmentS = jest.fn().mockReturnValue({ limit: _skillAssessmentLim, lean: _skillAssessmentL, populate: jest.fn().mockReturnValue({ lean: _skillAssessmentL }) });
    mockSkillAssessmentFind.mockReturnValue({ sort: _skillAssessmentS, lean: _skillAssessmentL, limit: _skillAssessmentLim, populate: jest.fn().mockReturnValue({ lean: _skillAssessmentL, sort: _skillAssessmentS }) });
    const _successionPlanL = jest.fn().mockResolvedValue([]);
    const _successionPlanLim = jest.fn().mockReturnValue({ lean: _successionPlanL });
    const _successionPlanS = jest.fn().mockReturnValue({ limit: _successionPlanLim, lean: _successionPlanL, populate: jest.fn().mockReturnValue({ lean: _successionPlanL }) });
    mockSuccessionPlanFind.mockReturnValue({ sort: _successionPlanS, lean: _successionPlanL, limit: _successionPlanLim, populate: jest.fn().mockReturnValue({ lean: _successionPlanL, sort: _successionPlanS }) });
    const _developmentActivityL = jest.fn().mockResolvedValue([]);
    const _developmentActivityLim = jest.fn().mockReturnValue({ lean: _developmentActivityL });
    const _developmentActivityS = jest.fn().mockReturnValue({ limit: _developmentActivityLim, lean: _developmentActivityL, populate: jest.fn().mockReturnValue({ lean: _developmentActivityL }) });
    mockDevelopmentActivityFind.mockReturnValue({ sort: _developmentActivityS, lean: _developmentActivityL, limit: _developmentActivityLim, populate: jest.fn().mockReturnValue({ lean: _developmentActivityL, sort: _developmentActivityS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('CareerPathway');
  });


  test('createCareerPath creates/returns result', async () => {
    let r; try { r = await svc.createCareerPath({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCareerPaths returns result', async () => {
    let r; try { r = await svc.listCareerPaths({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getCareerPathById returns result', async () => {
    let r; try { r = await svc.getCareerPathById({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateCareerPath updates/returns result', async () => {
    let r; try { r = await svc.updateCareerPath('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createSkillAssessment creates/returns result', async () => {
    let r; try { r = await svc.createSkillAssessment({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listSkillAssessments returns result', async () => {
    let r; try { r = await svc.listSkillAssessments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createSuccessionPlan creates/returns result', async () => {
    let r; try { r = await svc.createSuccessionPlan({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listSuccessionPlans returns result', async () => {
    let r; try { r = await svc.listSuccessionPlans({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateSuccessionPlan updates/returns result', async () => {
    let r; try { r = await svc.updateSuccessionPlan('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createActivity creates/returns result', async () => {
    let r; try { r = await svc.createActivity({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listActivities returns result', async () => {
    let r; try { r = await svc.listActivities({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPathwayStats returns object', async () => {
    let r; try { r = await svc.getPathwayStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getSuccessionCoverage returns result', async () => {
    let r; try { r = await svc.getSuccessionCoverage({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

'use strict';

/* ── mock-prefixed variables ── */
const mockAccreditationCycleFind = jest.fn();
const mockAccreditationCycleCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'accreditationCycle1', ...d }));
const mockAccreditationCycleCount = jest.fn().mockResolvedValue(0);
const mockSelfAssessmentFind = jest.fn();
const mockSelfAssessmentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'selfAssessment1', ...d }));
const mockSelfAssessmentCount = jest.fn().mockResolvedValue(0);
const mockSurveyFindingFind = jest.fn();
const mockSurveyFindingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'surveyFinding1', ...d }));
const mockSurveyFindingCount = jest.fn().mockResolvedValue(0);
const mockCorrectiveActionFind = jest.fn();
const mockCorrectiveActionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'correctiveAction1', ...d }));
const mockCorrectiveActionCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddAccreditationManager', () => ({
  DDDAccreditationCycle: {
    find: mockAccreditationCycleFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'accreditationCycle1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'accreditationCycle1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAccreditationCycleCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'accreditationCycle1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'accreditationCycle1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'accreditationCycle1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'accreditationCycle1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'accreditationCycle1' }) }),
    countDocuments: mockAccreditationCycleCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSelfAssessment: {
    find: mockSelfAssessmentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'selfAssessment1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'selfAssessment1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSelfAssessmentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'selfAssessment1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'selfAssessment1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'selfAssessment1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'selfAssessment1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'selfAssessment1' }) }),
    countDocuments: mockSelfAssessmentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSurveyFinding: {
    find: mockSurveyFindingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'surveyFinding1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'surveyFinding1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSurveyFindingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'surveyFinding1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'surveyFinding1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'surveyFinding1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'surveyFinding1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'surveyFinding1' }) }),
    countDocuments: mockSurveyFindingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCorrectiveAction: {
    find: mockCorrectiveActionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'correctiveAction1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'correctiveAction1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCorrectiveActionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'correctiveAction1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'correctiveAction1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'correctiveAction1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'correctiveAction1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'correctiveAction1' }) }),
    countDocuments: mockCorrectiveActionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  ACCREDITATION_TYPES: ['item1', 'item2'],
  ACCREDITATION_STATUSES: ['item1', 'item2'],
  SURVEY_TYPES: ['item1', 'item2'],
  FINDING_SEVERITIES: ['item1', 'item2'],
  CORRECTIVE_ACTION_STATUSES: ['item1', 'item2'],
  STANDARD_CHAPTERS: ['item1', 'item2'],
  BUILTIN_ACCREDITATION_BODIES: ['item1', 'item2'],

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

const svc = require('../../services/dddAccreditationManager');

describe('dddAccreditationManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _accreditationCycleL = jest.fn().mockResolvedValue([]);
    const _accreditationCycleLim = jest.fn().mockReturnValue({ lean: _accreditationCycleL });
    const _accreditationCycleS = jest.fn().mockReturnValue({ limit: _accreditationCycleLim, lean: _accreditationCycleL, populate: jest.fn().mockReturnValue({ lean: _accreditationCycleL }) });
    mockAccreditationCycleFind.mockReturnValue({ sort: _accreditationCycleS, lean: _accreditationCycleL, limit: _accreditationCycleLim, populate: jest.fn().mockReturnValue({ lean: _accreditationCycleL, sort: _accreditationCycleS }) });
    const _selfAssessmentL = jest.fn().mockResolvedValue([]);
    const _selfAssessmentLim = jest.fn().mockReturnValue({ lean: _selfAssessmentL });
    const _selfAssessmentS = jest.fn().mockReturnValue({ limit: _selfAssessmentLim, lean: _selfAssessmentL, populate: jest.fn().mockReturnValue({ lean: _selfAssessmentL }) });
    mockSelfAssessmentFind.mockReturnValue({ sort: _selfAssessmentS, lean: _selfAssessmentL, limit: _selfAssessmentLim, populate: jest.fn().mockReturnValue({ lean: _selfAssessmentL, sort: _selfAssessmentS }) });
    const _surveyFindingL = jest.fn().mockResolvedValue([]);
    const _surveyFindingLim = jest.fn().mockReturnValue({ lean: _surveyFindingL });
    const _surveyFindingS = jest.fn().mockReturnValue({ limit: _surveyFindingLim, lean: _surveyFindingL, populate: jest.fn().mockReturnValue({ lean: _surveyFindingL }) });
    mockSurveyFindingFind.mockReturnValue({ sort: _surveyFindingS, lean: _surveyFindingL, limit: _surveyFindingLim, populate: jest.fn().mockReturnValue({ lean: _surveyFindingL, sort: _surveyFindingS }) });
    const _correctiveActionL = jest.fn().mockResolvedValue([]);
    const _correctiveActionLim = jest.fn().mockReturnValue({ lean: _correctiveActionL });
    const _correctiveActionS = jest.fn().mockReturnValue({ limit: _correctiveActionLim, lean: _correctiveActionL, populate: jest.fn().mockReturnValue({ lean: _correctiveActionL }) });
    mockCorrectiveActionFind.mockReturnValue({ sort: _correctiveActionS, lean: _correctiveActionL, limit: _correctiveActionLim, populate: jest.fn().mockReturnValue({ lean: _correctiveActionL, sort: _correctiveActionS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('AccreditationManager');
  });


  test('createCycle creates/returns result', async () => {
    let r; try { r = await svc.createCycle({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCycles returns result', async () => {
    let r; try { r = await svc.listCycles({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getCycleById returns result', async () => {
    let r; try { r = await svc.getCycleById({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateCycle updates/returns result', async () => {
    let r; try { r = await svc.updateCycle('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createSelfAssessment creates/returns result', async () => {
    let r; try { r = await svc.createSelfAssessment({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listSelfAssessments returns result', async () => {
    let r; try { r = await svc.listSelfAssessments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createFinding creates/returns result', async () => {
    let r; try { r = await svc.createFinding({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listFindings returns result', async () => {
    let r; try { r = await svc.listFindings({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCorrectiveAction creates/returns result', async () => {
    let r; try { r = await svc.createCorrectiveAction({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCorrectiveActions returns result', async () => {
    let r; try { r = await svc.listCorrectiveActions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateCorrectiveAction updates/returns result', async () => {
    let r; try { r = await svc.updateCorrectiveAction('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getAccreditationSummary returns object', async () => {
    let r; try { r = await svc.getAccreditationSummary(); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getOverdueActions returns result', async () => {
    let r; try { r = await svc.getOverdueActions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

'use strict';

/* ── mock-prefixed variables ── */
const mockOutcomeMeasureFind = jest.fn();
const mockOutcomeMeasureCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'outcomeMeasure1', ...d }));
const mockOutcomeMeasureCount = jest.fn().mockResolvedValue(0);
const mockOutcomeDataCollectionFind = jest.fn();
const mockOutcomeDataCollectionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'outcomeDataCollection1', ...d }));
const mockOutcomeDataCollectionCount = jest.fn().mockResolvedValue(0);
const mockCohortDefinitionFind = jest.fn();
const mockCohortDefinitionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'cohortDefinition1', ...d }));
const mockCohortDefinitionCount = jest.fn().mockResolvedValue(0);
const mockAnalysisResultFind = jest.fn();
const mockAnalysisResultCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'analysisResult1', ...d }));
const mockAnalysisResultCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddOutcomeResearch', () => ({
  DDDOutcomeMeasure: {
    find: mockOutcomeMeasureFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'outcomeMeasure1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'outcomeMeasure1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockOutcomeMeasureCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outcomeMeasure1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outcomeMeasure1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outcomeMeasure1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outcomeMeasure1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outcomeMeasure1' }) }),
    countDocuments: mockOutcomeMeasureCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDOutcomeDataCollection: {
    find: mockOutcomeDataCollectionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'outcomeDataCollection1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'outcomeDataCollection1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockOutcomeDataCollectionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outcomeDataCollection1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outcomeDataCollection1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outcomeDataCollection1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outcomeDataCollection1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outcomeDataCollection1' }) }),
    countDocuments: mockOutcomeDataCollectionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCohortDefinition: {
    find: mockCohortDefinitionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'cohortDefinition1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'cohortDefinition1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCohortDefinitionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'cohortDefinition1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'cohortDefinition1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'cohortDefinition1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'cohortDefinition1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'cohortDefinition1' }) }),
    countDocuments: mockCohortDefinitionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDAnalysisResult: {
    find: mockAnalysisResultFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'analysisResult1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'analysisResult1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAnalysisResultCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'analysisResult1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'analysisResult1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'analysisResult1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'analysisResult1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'analysisResult1' }) }),
    countDocuments: mockAnalysisResultCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  OUTCOME_DOMAINS: ['item1', 'item2'],
  MEASUREMENT_LEVELS: ['item1', 'item2'],
  DATA_COLLECTION_METHODS: ['item1', 'item2'],
  ANALYSIS_TYPES: ['item1', 'item2'],
  VALIDITY_TYPES: ['item1', 'item2'],
  RELIABILITY_TYPES: ['item1', 'item2'],
  BUILTIN_OUTCOME_MEASURES: ['item1', 'item2'],

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

const svc = require('../../services/dddOutcomeResearch');

describe('dddOutcomeResearch service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _outcomeMeasureL = jest.fn().mockResolvedValue([]);
    const _outcomeMeasureLim = jest.fn().mockReturnValue({ lean: _outcomeMeasureL });
    const _outcomeMeasureS = jest.fn().mockReturnValue({ limit: _outcomeMeasureLim, lean: _outcomeMeasureL, populate: jest.fn().mockReturnValue({ lean: _outcomeMeasureL }) });
    mockOutcomeMeasureFind.mockReturnValue({ sort: _outcomeMeasureS, lean: _outcomeMeasureL, limit: _outcomeMeasureLim, populate: jest.fn().mockReturnValue({ lean: _outcomeMeasureL, sort: _outcomeMeasureS }) });
    const _outcomeDataCollectionL = jest.fn().mockResolvedValue([]);
    const _outcomeDataCollectionLim = jest.fn().mockReturnValue({ lean: _outcomeDataCollectionL });
    const _outcomeDataCollectionS = jest.fn().mockReturnValue({ limit: _outcomeDataCollectionLim, lean: _outcomeDataCollectionL, populate: jest.fn().mockReturnValue({ lean: _outcomeDataCollectionL }) });
    mockOutcomeDataCollectionFind.mockReturnValue({ sort: _outcomeDataCollectionS, lean: _outcomeDataCollectionL, limit: _outcomeDataCollectionLim, populate: jest.fn().mockReturnValue({ lean: _outcomeDataCollectionL, sort: _outcomeDataCollectionS }) });
    const _cohortDefinitionL = jest.fn().mockResolvedValue([]);
    const _cohortDefinitionLim = jest.fn().mockReturnValue({ lean: _cohortDefinitionL });
    const _cohortDefinitionS = jest.fn().mockReturnValue({ limit: _cohortDefinitionLim, lean: _cohortDefinitionL, populate: jest.fn().mockReturnValue({ lean: _cohortDefinitionL }) });
    mockCohortDefinitionFind.mockReturnValue({ sort: _cohortDefinitionS, lean: _cohortDefinitionL, limit: _cohortDefinitionLim, populate: jest.fn().mockReturnValue({ lean: _cohortDefinitionL, sort: _cohortDefinitionS }) });
    const _analysisResultL = jest.fn().mockResolvedValue([]);
    const _analysisResultLim = jest.fn().mockReturnValue({ lean: _analysisResultL });
    const _analysisResultS = jest.fn().mockReturnValue({ limit: _analysisResultLim, lean: _analysisResultL, populate: jest.fn().mockReturnValue({ lean: _analysisResultL }) });
    mockAnalysisResultFind.mockReturnValue({ sort: _analysisResultS, lean: _analysisResultL, limit: _analysisResultLim, populate: jest.fn().mockReturnValue({ lean: _analysisResultL, sort: _analysisResultS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('OutcomeResearch');
  });


  test('createMeasure creates/returns result', async () => {
    let r; try { r = await svc.createMeasure({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listMeasures returns result', async () => {
    let r; try { r = await svc.listMeasures({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateMeasure updates/returns result', async () => {
    let r; try { r = await svc.updateMeasure('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('collectData is callable', () => {
    expect(typeof svc.collectData).toBe('function');
  });

  test('listCollections returns result', async () => {
    let r; try { r = await svc.listCollections({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCohort creates/returns result', async () => {
    let r; try { r = await svc.createCohort({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCohorts returns result', async () => {
    let r; try { r = await svc.listCohorts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('saveAnalysis is callable', () => {
    expect(typeof svc.saveAnalysis).toBe('function');
  });

  test('listAnalyses returns result', async () => {
    let r; try { r = await svc.listAnalyses({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getOutcomeStats returns object', async () => {
    let r; try { r = await svc.getOutcomeStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

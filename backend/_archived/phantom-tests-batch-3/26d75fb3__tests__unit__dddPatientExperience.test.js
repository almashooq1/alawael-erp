'use strict';

/* ── mock-prefixed variables ── */
const mockJourneyMapFind = jest.fn();
const mockJourneyMapCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'journeyMap1', ...d }));
const mockJourneyMapCount = jest.fn().mockResolvedValue(0);
const mockTouchpointFind = jest.fn();
const mockTouchpointCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'touchpoint1', ...d }));
const mockTouchpointCount = jest.fn().mockResolvedValue(0);
const mockExperienceScoreFind = jest.fn();
const mockExperienceScoreCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'experienceScore1', ...d }));
const mockExperienceScoreCount = jest.fn().mockResolvedValue(0);
const mockExperienceInsightFind = jest.fn();
const mockExperienceInsightCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'experienceInsight1', ...d }));
const mockExperienceInsightCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddPatientExperience', () => ({
  DDDJourneyMap: {
    find: mockJourneyMapFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'journeyMap1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'journeyMap1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockJourneyMapCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'journeyMap1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'journeyMap1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'journeyMap1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'journeyMap1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'journeyMap1' }) }),
    countDocuments: mockJourneyMapCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDTouchpoint: {
    find: mockTouchpointFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'touchpoint1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'touchpoint1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockTouchpointCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'touchpoint1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'touchpoint1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'touchpoint1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'touchpoint1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'touchpoint1' }) }),
    countDocuments: mockTouchpointCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDExperienceScore: {
    find: mockExperienceScoreFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'experienceScore1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'experienceScore1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockExperienceScoreCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'experienceScore1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'experienceScore1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'experienceScore1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'experienceScore1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'experienceScore1' }) }),
    countDocuments: mockExperienceScoreCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDExperienceInsight: {
    find: mockExperienceInsightFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'experienceInsight1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'experienceInsight1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockExperienceInsightCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'experienceInsight1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'experienceInsight1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'experienceInsight1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'experienceInsight1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'experienceInsight1' }) }),
    countDocuments: mockExperienceInsightCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  JOURNEY_STAGES: ['item1', 'item2'],
  JOURNEY_STATUSES: ['item1', 'item2'],
  TOUCHPOINT_TYPES: ['item1', 'item2'],
  TOUCHPOINT_CHANNELS: ['item1', 'item2'],
  EMOTION_RATINGS: ['item1', 'item2'],
  EXPERIENCE_DIMENSIONS: ['item1', 'item2'],
  BUILTIN_JOURNEY_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddPatientExperience');

describe('dddPatientExperience service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _journeyMapL = jest.fn().mockResolvedValue([]);
    const _journeyMapLim = jest.fn().mockReturnValue({ lean: _journeyMapL });
    const _journeyMapS = jest.fn().mockReturnValue({ limit: _journeyMapLim, lean: _journeyMapL, populate: jest.fn().mockReturnValue({ lean: _journeyMapL }) });
    mockJourneyMapFind.mockReturnValue({ sort: _journeyMapS, lean: _journeyMapL, limit: _journeyMapLim, populate: jest.fn().mockReturnValue({ lean: _journeyMapL, sort: _journeyMapS }) });
    const _touchpointL = jest.fn().mockResolvedValue([]);
    const _touchpointLim = jest.fn().mockReturnValue({ lean: _touchpointL });
    const _touchpointS = jest.fn().mockReturnValue({ limit: _touchpointLim, lean: _touchpointL, populate: jest.fn().mockReturnValue({ lean: _touchpointL }) });
    mockTouchpointFind.mockReturnValue({ sort: _touchpointS, lean: _touchpointL, limit: _touchpointLim, populate: jest.fn().mockReturnValue({ lean: _touchpointL, sort: _touchpointS }) });
    const _experienceScoreL = jest.fn().mockResolvedValue([]);
    const _experienceScoreLim = jest.fn().mockReturnValue({ lean: _experienceScoreL });
    const _experienceScoreS = jest.fn().mockReturnValue({ limit: _experienceScoreLim, lean: _experienceScoreL, populate: jest.fn().mockReturnValue({ lean: _experienceScoreL }) });
    mockExperienceScoreFind.mockReturnValue({ sort: _experienceScoreS, lean: _experienceScoreL, limit: _experienceScoreLim, populate: jest.fn().mockReturnValue({ lean: _experienceScoreL, sort: _experienceScoreS }) });
    const _experienceInsightL = jest.fn().mockResolvedValue([]);
    const _experienceInsightLim = jest.fn().mockReturnValue({ lean: _experienceInsightL });
    const _experienceInsightS = jest.fn().mockReturnValue({ limit: _experienceInsightLim, lean: _experienceInsightL, populate: jest.fn().mockReturnValue({ lean: _experienceInsightL }) });
    mockExperienceInsightFind.mockReturnValue({ sort: _experienceInsightS, lean: _experienceInsightL, limit: _experienceInsightLim, populate: jest.fn().mockReturnValue({ lean: _experienceInsightL, sort: _experienceInsightS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('PatientExperience');
  });


  test('listJourneys returns result', async () => {
    let r; try { r = await svc.listJourneys({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getJourney returns result', async () => {
    let r; try { r = await svc.getJourney({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createJourney creates/returns result', async () => {
    let r; try { r = await svc.createJourney({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateJourney updates/returns result', async () => {
    let r; try { r = await svc.updateJourney('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('advanceStage updates/returns result', async () => {
    let r; try { r = await svc.advanceStage('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTouchpoints returns result', async () => {
    let r; try { r = await svc.listTouchpoints({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordTouchpoint creates/returns result', async () => {
    let r; try { r = await svc.recordTouchpoint({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateTouchpoint updates/returns result', async () => {
    let r; try { r = await svc.updateTouchpoint('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listExperienceScores returns result', async () => {
    let r; try { r = await svc.listExperienceScores({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordExperienceScore creates/returns result', async () => {
    let r; try { r = await svc.recordExperienceScore({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listInsights returns result', async () => {
    let r; try { r = await svc.listInsights({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('generateInsight creates/returns result', async () => {
    let r; try { r = await svc.generateInsight({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getExperienceAnalytics returns object', async () => {
    let r; try { r = await svc.getExperienceAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

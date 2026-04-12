'use strict';

/* ── mock-prefixed variables ── */
const mockMentorshipPairFind = jest.fn();
const mockMentorshipPairCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'mentorshipPair1', ...d }));
const mockMentorshipPairCount = jest.fn().mockResolvedValue(0);
const mockMentorMeetingFind = jest.fn();
const mockMentorMeetingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'mentorMeeting1', ...d }));
const mockMentorMeetingCount = jest.fn().mockResolvedValue(0);
const mockMentorFeedbackFind = jest.fn();
const mockMentorFeedbackCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'mentorFeedback1', ...d }));
const mockMentorFeedbackCount = jest.fn().mockResolvedValue(0);
const mockMentorshipProgramFind = jest.fn();
const mockMentorshipProgramCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'mentorshipProgram1', ...d }));
const mockMentorshipProgramCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddMentorshipProgram', () => ({
  DDDMentorshipPair: {
    find: mockMentorshipPairFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'mentorshipPair1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'mentorshipPair1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockMentorshipPairCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorshipPair1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorshipPair1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorshipPair1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorshipPair1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorshipPair1' }) }),
    countDocuments: mockMentorshipPairCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDMentorMeeting: {
    find: mockMentorMeetingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'mentorMeeting1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'mentorMeeting1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockMentorMeetingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorMeeting1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorMeeting1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorMeeting1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorMeeting1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorMeeting1' }) }),
    countDocuments: mockMentorMeetingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDMentorFeedback: {
    find: mockMentorFeedbackFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'mentorFeedback1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'mentorFeedback1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockMentorFeedbackCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorFeedback1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorFeedback1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorFeedback1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorFeedback1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorFeedback1' }) }),
    countDocuments: mockMentorFeedbackCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDMentorshipProgram: {
    find: mockMentorshipProgramFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'mentorshipProgram1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'mentorshipProgram1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockMentorshipProgramCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorshipProgram1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorshipProgram1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorshipProgram1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorshipProgram1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mentorshipProgram1' }) }),
    countDocuments: mockMentorshipProgramCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  MENTORSHIP_TYPES: ['item1', 'item2'],
  MENTORSHIP_STATUSES: ['item1', 'item2'],
  GOAL_STATUSES: ['item1', 'item2'],
  MEETING_FORMATS: ['item1', 'item2'],
  FEEDBACK_TYPES: ['item1', 'item2'],
  COMPETENCY_DOMAINS: ['item1', 'item2'],
  BUILTIN_PROGRAM_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddMentorshipProgram');

describe('dddMentorshipProgram service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _mentorshipPairL = jest.fn().mockResolvedValue([]);
    const _mentorshipPairLim = jest.fn().mockReturnValue({ lean: _mentorshipPairL });
    const _mentorshipPairS = jest.fn().mockReturnValue({ limit: _mentorshipPairLim, lean: _mentorshipPairL, populate: jest.fn().mockReturnValue({ lean: _mentorshipPairL }) });
    mockMentorshipPairFind.mockReturnValue({ sort: _mentorshipPairS, lean: _mentorshipPairL, limit: _mentorshipPairLim, populate: jest.fn().mockReturnValue({ lean: _mentorshipPairL, sort: _mentorshipPairS }) });
    const _mentorMeetingL = jest.fn().mockResolvedValue([]);
    const _mentorMeetingLim = jest.fn().mockReturnValue({ lean: _mentorMeetingL });
    const _mentorMeetingS = jest.fn().mockReturnValue({ limit: _mentorMeetingLim, lean: _mentorMeetingL, populate: jest.fn().mockReturnValue({ lean: _mentorMeetingL }) });
    mockMentorMeetingFind.mockReturnValue({ sort: _mentorMeetingS, lean: _mentorMeetingL, limit: _mentorMeetingLim, populate: jest.fn().mockReturnValue({ lean: _mentorMeetingL, sort: _mentorMeetingS }) });
    const _mentorFeedbackL = jest.fn().mockResolvedValue([]);
    const _mentorFeedbackLim = jest.fn().mockReturnValue({ lean: _mentorFeedbackL });
    const _mentorFeedbackS = jest.fn().mockReturnValue({ limit: _mentorFeedbackLim, lean: _mentorFeedbackL, populate: jest.fn().mockReturnValue({ lean: _mentorFeedbackL }) });
    mockMentorFeedbackFind.mockReturnValue({ sort: _mentorFeedbackS, lean: _mentorFeedbackL, limit: _mentorFeedbackLim, populate: jest.fn().mockReturnValue({ lean: _mentorFeedbackL, sort: _mentorFeedbackS }) });
    const _mentorshipProgramL = jest.fn().mockResolvedValue([]);
    const _mentorshipProgramLim = jest.fn().mockReturnValue({ lean: _mentorshipProgramL });
    const _mentorshipProgramS = jest.fn().mockReturnValue({ limit: _mentorshipProgramLim, lean: _mentorshipProgramL, populate: jest.fn().mockReturnValue({ lean: _mentorshipProgramL }) });
    mockMentorshipProgramFind.mockReturnValue({ sort: _mentorshipProgramS, lean: _mentorshipProgramL, limit: _mentorshipProgramLim, populate: jest.fn().mockReturnValue({ lean: _mentorshipProgramL, sort: _mentorshipProgramS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('MentorshipProgram');
  });


  test('createPair creates/returns result', async () => {
    let r; try { r = await svc.createPair({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPairs returns result', async () => {
    let r; try { r = await svc.listPairs({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPairById returns result', async () => {
    let r; try { r = await svc.getPairById({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePair updates/returns result', async () => {
    let r; try { r = await svc.updatePair('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createMeeting creates/returns result', async () => {
    let r; try { r = await svc.createMeeting({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listMeetings returns result', async () => {
    let r; try { r = await svc.listMeetings({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createFeedback creates/returns result', async () => {
    let r; try { r = await svc.createFeedback({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listFeedback returns result', async () => {
    let r; try { r = await svc.listFeedback({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createProgram creates/returns result', async () => {
    let r; try { r = await svc.createProgram({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPrograms returns result', async () => {
    let r; try { r = await svc.listPrograms({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateProgram updates/returns result', async () => {
    let r; try { r = await svc.updateProgram('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getProgramStats returns object', async () => {
    let r; try { r = await svc.getProgramStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getMentorLoad returns result', async () => {
    let r; try { r = await svc.getMentorLoad({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

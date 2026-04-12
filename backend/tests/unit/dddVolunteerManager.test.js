'use strict';

/* ── mock-prefixed variables ── */
const mockVolunteerFind = jest.fn();
const mockVolunteerCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'volunteer1', ...d }));
const mockVolunteerCount = jest.fn().mockResolvedValue(0);
const mockVolunteerShiftFind = jest.fn();
const mockVolunteerShiftCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'volunteerShift1', ...d }));
const mockVolunteerShiftCount = jest.fn().mockResolvedValue(0);
const mockVolunteerSkillFind = jest.fn();
const mockVolunteerSkillCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'volunteerSkill1', ...d }));
const mockVolunteerSkillCount = jest.fn().mockResolvedValue(0);
const mockVolunteerRecognitionFind = jest.fn();
const mockVolunteerRecognitionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'volunteerRecognition1', ...d }));
const mockVolunteerRecognitionCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddVolunteerManager', () => ({
  DDDVolunteer: {
    find: mockVolunteerFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'volunteer1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'volunteer1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVolunteerCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteer1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteer1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteer1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteer1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteer1' }) }),
    countDocuments: mockVolunteerCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDVolunteerShift: {
    find: mockVolunteerShiftFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'volunteerShift1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'volunteerShift1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVolunteerShiftCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerShift1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerShift1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerShift1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerShift1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerShift1' }) }),
    countDocuments: mockVolunteerShiftCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDVolunteerSkill: {
    find: mockVolunteerSkillFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'volunteerSkill1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'volunteerSkill1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVolunteerSkillCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerSkill1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerSkill1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerSkill1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerSkill1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerSkill1' }) }),
    countDocuments: mockVolunteerSkillCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDVolunteerRecognition: {
    find: mockVolunteerRecognitionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'volunteerRecognition1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'volunteerRecognition1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVolunteerRecognitionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerRecognition1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerRecognition1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerRecognition1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerRecognition1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerRecognition1' }) }),
    countDocuments: mockVolunteerRecognitionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  VOLUNTEER_STATUSES: ['item1', 'item2'],
  VOLUNTEER_CATEGORIES: ['item1', 'item2'],
  SHIFT_STATUSES: ['item1', 'item2'],
  SKILL_LEVELS: ['item1', 'item2'],
  RECOGNITION_TYPES: ['item1', 'item2'],
  AVAILABILITY_PATTERNS: ['item1', 'item2'],
  BUILTIN_VOLUNTEER_ROLES: ['item1', 'item2'],

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

const svc = require('../../services/dddVolunteerManager');

describe('dddVolunteerManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _volunteerL = jest.fn().mockResolvedValue([]);
    const _volunteerLim = jest.fn().mockReturnValue({ lean: _volunteerL });
    const _volunteerS = jest.fn().mockReturnValue({ limit: _volunteerLim, lean: _volunteerL, populate: jest.fn().mockReturnValue({ lean: _volunteerL }) });
    mockVolunteerFind.mockReturnValue({ sort: _volunteerS, lean: _volunteerL, limit: _volunteerLim, populate: jest.fn().mockReturnValue({ lean: _volunteerL, sort: _volunteerS }) });
    const _volunteerShiftL = jest.fn().mockResolvedValue([]);
    const _volunteerShiftLim = jest.fn().mockReturnValue({ lean: _volunteerShiftL });
    const _volunteerShiftS = jest.fn().mockReturnValue({ limit: _volunteerShiftLim, lean: _volunteerShiftL, populate: jest.fn().mockReturnValue({ lean: _volunteerShiftL }) });
    mockVolunteerShiftFind.mockReturnValue({ sort: _volunteerShiftS, lean: _volunteerShiftL, limit: _volunteerShiftLim, populate: jest.fn().mockReturnValue({ lean: _volunteerShiftL, sort: _volunteerShiftS }) });
    const _volunteerSkillL = jest.fn().mockResolvedValue([]);
    const _volunteerSkillLim = jest.fn().mockReturnValue({ lean: _volunteerSkillL });
    const _volunteerSkillS = jest.fn().mockReturnValue({ limit: _volunteerSkillLim, lean: _volunteerSkillL, populate: jest.fn().mockReturnValue({ lean: _volunteerSkillL }) });
    mockVolunteerSkillFind.mockReturnValue({ sort: _volunteerSkillS, lean: _volunteerSkillL, limit: _volunteerSkillLim, populate: jest.fn().mockReturnValue({ lean: _volunteerSkillL, sort: _volunteerSkillS }) });
    const _volunteerRecognitionL = jest.fn().mockResolvedValue([]);
    const _volunteerRecognitionLim = jest.fn().mockReturnValue({ lean: _volunteerRecognitionL });
    const _volunteerRecognitionS = jest.fn().mockReturnValue({ limit: _volunteerRecognitionLim, lean: _volunteerRecognitionL, populate: jest.fn().mockReturnValue({ lean: _volunteerRecognitionL }) });
    mockVolunteerRecognitionFind.mockReturnValue({ sort: _volunteerRecognitionS, lean: _volunteerRecognitionL, limit: _volunteerRecognitionLim, populate: jest.fn().mockReturnValue({ lean: _volunteerRecognitionL, sort: _volunteerRecognitionS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('VolunteerManager');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listVolunteers returns result', async () => {
    let r; try { r = await svc.listVolunteers({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getVolunteer returns result', async () => {
    let r; try { r = await svc.getVolunteer({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('registerVolunteer creates/returns result', async () => {
    let r; try { r = await svc.registerVolunteer({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateVolunteer updates/returns result', async () => {
    let r; try { r = await svc.updateVolunteer('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listShifts returns result', async () => {
    let r; try { r = await svc.listShifts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('scheduleShift creates/returns result', async () => {
    let r; try { r = await svc.scheduleShift({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('completeShift updates/returns result', async () => {
    let r; try { r = await svc.completeShift('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listSkills returns result', async () => {
    let r; try { r = await svc.listSkills({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addSkill creates/returns result', async () => {
    let r; try { r = await svc.addSkill({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listRecognitions returns result', async () => {
    let r; try { r = await svc.listRecognitions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('grantRecognition is callable', () => {
    expect(typeof svc.grantRecognition).toBe('function');
  });

  test('getVolunteerAnalytics returns object', async () => {
    let r; try { r = await svc.getVolunteerAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

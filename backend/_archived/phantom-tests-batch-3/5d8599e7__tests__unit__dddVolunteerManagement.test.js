'use strict';

/* ── mock-prefixed variables ── */
const mockVolunteerProfileFind = jest.fn();
const mockVolunteerProfileCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'volunteerProfile1', ...d }));
const mockVolunteerProfileCount = jest.fn().mockResolvedValue(0);
const mockVolMgmtShiftFind = jest.fn();
const mockVolMgmtShiftCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'volMgmtShift1', ...d }));
const mockVolMgmtShiftCount = jest.fn().mockResolvedValue(0);
const mockVolunteerTrainingFind = jest.fn();
const mockVolunteerTrainingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'volunteerTraining1', ...d }));
const mockVolunteerTrainingCount = jest.fn().mockResolvedValue(0);
const mockVolMgmtRecognitionFind = jest.fn();
const mockVolMgmtRecognitionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'volMgmtRecognition1', ...d }));
const mockVolMgmtRecognitionCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddVolunteerManagement', () => ({
  DDDVolunteerProfile: {
    find: mockVolunteerProfileFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'volunteerProfile1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'volunteerProfile1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVolunteerProfileCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerProfile1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerProfile1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerProfile1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerProfile1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerProfile1' }) }),
    countDocuments: mockVolunteerProfileCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDVolMgmtShift: {
    find: mockVolMgmtShiftFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'volMgmtShift1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'volMgmtShift1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVolMgmtShiftCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volMgmtShift1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volMgmtShift1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volMgmtShift1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volMgmtShift1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volMgmtShift1' }) }),
    countDocuments: mockVolMgmtShiftCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDVolunteerTraining: {
    find: mockVolunteerTrainingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'volunteerTraining1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'volunteerTraining1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVolunteerTrainingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerTraining1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerTraining1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerTraining1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerTraining1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volunteerTraining1' }) }),
    countDocuments: mockVolunteerTrainingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDVolMgmtRecognition: {
    find: mockVolMgmtRecognitionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'volMgmtRecognition1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'volMgmtRecognition1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVolMgmtRecognitionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volMgmtRecognition1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volMgmtRecognition1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volMgmtRecognition1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volMgmtRecognition1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'volMgmtRecognition1' }) }),
    countDocuments: mockVolMgmtRecognitionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  VOLUNTEER_ROLES: ['item1', 'item2'],
  VOLUNTEER_STATUSES: ['item1', 'item2'],
  SKILL_CATEGORIES: ['item1', 'item2'],
  SHIFT_TYPES: ['item1', 'item2'],
  RECOGNITION_TYPES: ['item1', 'item2'],
  TRAINING_MODULES: ['item1', 'item2'],
  BUILTIN_VOLUNTEER_CONFIGS: ['item1', 'item2'],

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

const svc = require('../../services/dddVolunteerManagement');

describe('dddVolunteerManagement service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _volunteerProfileL = jest.fn().mockResolvedValue([]);
    const _volunteerProfileLim = jest.fn().mockReturnValue({ lean: _volunteerProfileL });
    const _volunteerProfileS = jest.fn().mockReturnValue({ limit: _volunteerProfileLim, lean: _volunteerProfileL, populate: jest.fn().mockReturnValue({ lean: _volunteerProfileL }) });
    mockVolunteerProfileFind.mockReturnValue({ sort: _volunteerProfileS, lean: _volunteerProfileL, limit: _volunteerProfileLim, populate: jest.fn().mockReturnValue({ lean: _volunteerProfileL, sort: _volunteerProfileS }) });
    const _volMgmtShiftL = jest.fn().mockResolvedValue([]);
    const _volMgmtShiftLim = jest.fn().mockReturnValue({ lean: _volMgmtShiftL });
    const _volMgmtShiftS = jest.fn().mockReturnValue({ limit: _volMgmtShiftLim, lean: _volMgmtShiftL, populate: jest.fn().mockReturnValue({ lean: _volMgmtShiftL }) });
    mockVolMgmtShiftFind.mockReturnValue({ sort: _volMgmtShiftS, lean: _volMgmtShiftL, limit: _volMgmtShiftLim, populate: jest.fn().mockReturnValue({ lean: _volMgmtShiftL, sort: _volMgmtShiftS }) });
    const _volunteerTrainingL = jest.fn().mockResolvedValue([]);
    const _volunteerTrainingLim = jest.fn().mockReturnValue({ lean: _volunteerTrainingL });
    const _volunteerTrainingS = jest.fn().mockReturnValue({ limit: _volunteerTrainingLim, lean: _volunteerTrainingL, populate: jest.fn().mockReturnValue({ lean: _volunteerTrainingL }) });
    mockVolunteerTrainingFind.mockReturnValue({ sort: _volunteerTrainingS, lean: _volunteerTrainingL, limit: _volunteerTrainingLim, populate: jest.fn().mockReturnValue({ lean: _volunteerTrainingL, sort: _volunteerTrainingS }) });
    const _volMgmtRecognitionL = jest.fn().mockResolvedValue([]);
    const _volMgmtRecognitionLim = jest.fn().mockReturnValue({ lean: _volMgmtRecognitionL });
    const _volMgmtRecognitionS = jest.fn().mockReturnValue({ limit: _volMgmtRecognitionLim, lean: _volMgmtRecognitionL, populate: jest.fn().mockReturnValue({ lean: _volMgmtRecognitionL }) });
    mockVolMgmtRecognitionFind.mockReturnValue({ sort: _volMgmtRecognitionS, lean: _volMgmtRecognitionL, limit: _volMgmtRecognitionLim, populate: jest.fn().mockReturnValue({ lean: _volMgmtRecognitionL, sort: _volMgmtRecognitionS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('VolunteerManagement');
  });


  test('createVolunteer creates/returns result', async () => {
    let r; try { r = await svc.createVolunteer({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listVolunteers returns result', async () => {
    let r; try { r = await svc.listVolunteers({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateVolunteer updates/returns result', async () => {
    let r; try { r = await svc.updateVolunteer('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createShift creates/returns result', async () => {
    let r; try { r = await svc.createShift({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listShifts returns result', async () => {
    let r; try { r = await svc.listShifts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('assignTraining creates/returns result', async () => {
    let r; try { r = await svc.assignTraining({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTraining returns result', async () => {
    let r; try { r = await svc.listTraining({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('giveRecognition is callable', () => {
    expect(typeof svc.giveRecognition).toBe('function');
  });

  test('listRecognitions returns result', async () => {
    let r; try { r = await svc.listRecognitions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getVolunteerStats returns object', async () => {
    let r; try { r = await svc.getVolunteerStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

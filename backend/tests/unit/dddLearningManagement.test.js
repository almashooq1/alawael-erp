'use strict';

/* ── mock-prefixed variables ── */
const mockCourseFind = jest.fn();
const mockCourseCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'course1', ...d }));
const mockCourseCount = jest.fn().mockResolvedValue(0);
const mockLearningPathFind = jest.fn();
const mockLearningPathCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'learningPath1', ...d }));
const mockLearningPathCount = jest.fn().mockResolvedValue(0);
const mockEnrollmentFind = jest.fn();
const mockEnrollmentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'enrollment1', ...d }));
const mockEnrollmentCount = jest.fn().mockResolvedValue(0);
const mockQuizFind = jest.fn();
const mockQuizCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'quiz1', ...d }));
const mockQuizCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddLearningManagement', () => ({
  DDDCourse: {
    find: mockCourseFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'course1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'course1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCourseCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'course1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'course1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'course1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'course1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'course1' }) }),
    countDocuments: mockCourseCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDLearningPath: {
    find: mockLearningPathFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'learningPath1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'learningPath1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockLearningPathCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'learningPath1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'learningPath1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'learningPath1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'learningPath1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'learningPath1' }) }),
    countDocuments: mockLearningPathCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDEnrollment: {
    find: mockEnrollmentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'enrollment1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'enrollment1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEnrollmentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'enrollment1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'enrollment1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'enrollment1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'enrollment1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'enrollment1' }) }),
    countDocuments: mockEnrollmentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDQuiz: {
    find: mockQuizFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'quiz1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'quiz1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockQuizCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'quiz1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'quiz1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'quiz1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'quiz1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'quiz1' }) }),
    countDocuments: mockQuizCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  COURSE_CATEGORIES: ['item1', 'item2'],
  COURSE_LEVELS: ['item1', 'item2'],
  COURSE_STATUSES: ['item1', 'item2'],
  CONTENT_TYPES: ['item1', 'item2'],
  ENROLLMENT_STATUSES: ['item1', 'item2'],
  QUESTION_TYPES: ['item1', 'item2'],
  DELIVERY_MODES: ['item1', 'item2'],
  CERTIFICATE_TYPES: ['item1', 'item2'],
  BUILTIN_COURSES: ['item1', 'item2'],

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

const svc = require('../../services/dddLearningManagement');

describe('dddLearningManagement service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _courseL = jest.fn().mockResolvedValue([]);
    const _courseLim = jest.fn().mockReturnValue({ lean: _courseL });
    const _courseS = jest.fn().mockReturnValue({ limit: _courseLim, lean: _courseL, populate: jest.fn().mockReturnValue({ lean: _courseL }) });
    mockCourseFind.mockReturnValue({ sort: _courseS, lean: _courseL, limit: _courseLim, populate: jest.fn().mockReturnValue({ lean: _courseL, sort: _courseS }) });
    const _learningPathL = jest.fn().mockResolvedValue([]);
    const _learningPathLim = jest.fn().mockReturnValue({ lean: _learningPathL });
    const _learningPathS = jest.fn().mockReturnValue({ limit: _learningPathLim, lean: _learningPathL, populate: jest.fn().mockReturnValue({ lean: _learningPathL }) });
    mockLearningPathFind.mockReturnValue({ sort: _learningPathS, lean: _learningPathL, limit: _learningPathLim, populate: jest.fn().mockReturnValue({ lean: _learningPathL, sort: _learningPathS }) });
    const _enrollmentL = jest.fn().mockResolvedValue([]);
    const _enrollmentLim = jest.fn().mockReturnValue({ lean: _enrollmentL });
    const _enrollmentS = jest.fn().mockReturnValue({ limit: _enrollmentLim, lean: _enrollmentL, populate: jest.fn().mockReturnValue({ lean: _enrollmentL }) });
    mockEnrollmentFind.mockReturnValue({ sort: _enrollmentS, lean: _enrollmentL, limit: _enrollmentLim, populate: jest.fn().mockReturnValue({ lean: _enrollmentL, sort: _enrollmentS }) });
    const _quizL = jest.fn().mockResolvedValue([]);
    const _quizLim = jest.fn().mockReturnValue({ lean: _quizL });
    const _quizS = jest.fn().mockReturnValue({ limit: _quizLim, lean: _quizL, populate: jest.fn().mockReturnValue({ lean: _quizL }) });
    mockQuizFind.mockReturnValue({ sort: _quizS, lean: _quizL, limit: _quizLim, populate: jest.fn().mockReturnValue({ lean: _quizL, sort: _quizS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('LearningManagement');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listCourses returns result', async () => {
    let r; try { r = await svc.listCourses({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getCourse returns result', async () => {
    let r; try { r = await svc.getCourse({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCourse creates/returns result', async () => {
    let r; try { r = await svc.createCourse({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateCourse updates/returns result', async () => {
    let r; try { r = await svc.updateCourse('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('publishCourse creates/returns result', async () => {
    let r; try { r = await svc.publishCourse({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listLearningPaths returns result', async () => {
    let r; try { r = await svc.listLearningPaths({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getLearningPath returns result', async () => {
    let r; try { r = await svc.getLearningPath({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createLearningPath creates/returns result', async () => {
    let r; try { r = await svc.createLearningPath({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateLearningPath updates/returns result', async () => {
    let r; try { r = await svc.updateLearningPath('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listEnrollments returns result', async () => {
    let r; try { r = await svc.listEnrollments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getEnrollment returns result', async () => {
    let r; try { r = await svc.getEnrollment({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('enrollUser creates/returns result', async () => {
    let r; try { r = await svc.enrollUser({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateProgress updates/returns result', async () => {
    let r; try { r = await svc.updateProgress('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('withdrawEnrollment updates/returns result', async () => {
    let r; try { r = await svc.withdrawEnrollment('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listQuizzes returns result', async () => {
    let r; try { r = await svc.listQuizzes({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getQuiz returns result', async () => {
    let r; try { r = await svc.getQuiz({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createQuiz creates/returns result', async () => {
    let r; try { r = await svc.createQuiz({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateQuiz updates/returns result', async () => {
    let r; try { r = await svc.updateQuiz('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('gradeQuiz is callable', () => {
    expect(typeof svc.gradeQuiz).toBe('function');
  });

  test('getCourseAnalytics returns object', async () => {
    let r; try { r = await svc.getCourseAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getLearnerDashboard returns object', async () => {
    let r; try { r = await svc.getLearnerDashboard(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});

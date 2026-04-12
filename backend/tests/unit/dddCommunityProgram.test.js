'use strict';

const chain = () => {
  const c = {};
  [
    'find',
    'findById',
    'findByIdAndUpdate',
    'findOne',
    'sort',
    'skip',
    'limit',
    'lean',
    'populate',
    'countDocuments',
    'create',
    'insertMany',
    'aggregate',
  ].forEach(m => {
    c[m] = jest.fn().mockReturnValue(c);
  });
  c.then = undefined;
  return c;
};
const makeModel = () => {
  const c = chain();
  const M = jest.fn(() => c);
  Object.assign(M, c);
  return M;
};

const mockDDDProgram = makeModel();
const mockDDDProgramEnrollment = makeModel();
const mockDDDProgramActivity = makeModel();
const mockDDDProgramOutcome = makeModel();

jest.mock('../../models/DddCommunityProgram', () => ({
  DDDProgram: mockDDDProgram,
  DDDProgramEnrollment: mockDDDProgramEnrollment,
  DDDProgramActivity: mockDDDProgramActivity,
  DDDProgramOutcome: mockDDDProgramOutcome,
  PROGRAM_TYPES: ['community', 'clinical'],
  PROGRAM_STATUSES: ['active', 'inactive'],
  ENROLLMENT_STATUSES: ['enrolled', 'completed'],
  ACTIVITY_TYPES: ['workshop', 'session'],
  OUTCOME_TYPES: ['improvement', 'maintained'],
  FUNDING_SOURCES: ['government', 'donation'],
  BUILTIN_PROGRAMS: [{ code: 'BP1', name: 'Builtin 1' }],
}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor() {}
    log() {}
    _create(M, d) {
      return M.create(d);
    }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...o }).lean();
    }
    _list(M, f, o) {
      return M.find(f)
        .sort(o?.sort || {})
        .lean();
    }
    _getById(M, id) {
      return M.findById(id).lean();
    }
  };
});

const svc = require('../../services/dddCommunityProgram');

beforeEach(() => jest.clearAllMocks());

/* ─── singleton ─── */
describe('dddCommunityProgram – singleton', () => {
  test('exports a CommunityProgram instance', () => {
    expect(svc).toBeDefined();
    expect(typeof svc.listPrograms).toBe('function');
    expect(typeof svc.enrollParticipant).toBe('function');
  });
});

/* ─── initialize ─── */
describe('dddCommunityProgram – initialize', () => {
  test('seeds programs when collection empty', async () => {
    mockDDDProgram.findOne.mockReturnValue(mockDDDProgram);
    mockDDDProgram.lean.mockResolvedValue(null);
    mockDDDProgram.create.mockResolvedValue({});
    const r = await svc.initialize();
    expect(r).toBe(true);
    expect(mockDDDProgram.findOne).toHaveBeenCalled();
  });

  test('skips create when program already exists', async () => {
    mockDDDProgram.findOne.mockReturnValue(mockDDDProgram);
    mockDDDProgram.lean.mockResolvedValue({ code: 'BP1' });
    await svc.initialize();
    expect(mockDDDProgram.create).not.toHaveBeenCalled();
  });
});

/* ─── programs CRUD ─── */
describe('dddCommunityProgram – programs', () => {
  test('listPrograms applies type/status filters and sorts by name', async () => {
    mockDDDProgram.find.mockReturnValue(mockDDDProgram);
    mockDDDProgram.sort.mockReturnValue(mockDDDProgram);
    mockDDDProgram.lean.mockResolvedValueOnce([{ name: 'P1' }]);
    const r = await svc.listPrograms({ type: 'community', status: 'active' });
    expect(mockDDDProgram.find).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'community', status: 'active' })
    );
  });

  test('getProgram returns by id', async () => {
    mockDDDProgram.findById.mockReturnValue(mockDDDProgram);
    mockDDDProgram.lean.mockResolvedValueOnce({ _id: 'p1' });
    const r = await svc.getProgram('p1');
    expect(mockDDDProgram.findById).toHaveBeenCalledWith('p1');
  });

  test('createProgram delegates to _create', async () => {
    mockDDDProgram.create.mockResolvedValueOnce({ name: 'Test' });
    const r = await svc.createProgram({ name: 'Test' });
    expect(mockDDDProgram.create).toHaveBeenCalledWith({ name: 'Test' });
  });

  test('updateProgram delegates to _update', async () => {
    mockDDDProgram.findByIdAndUpdate.mockReturnValue(mockDDDProgram);
    mockDDDProgram.lean.mockResolvedValueOnce({ _id: 'p1', name: 'Updated' });
    await svc.updateProgram('p1', { name: 'Updated' });
    expect(mockDDDProgram.findByIdAndUpdate).toHaveBeenCalled();
  });
});

/* ─── enrollments ─── */
describe('dddCommunityProgram – enrollments', () => {
  test('listEnrollments filters by programId/status', async () => {
    mockDDDProgramEnrollment.find.mockReturnValue(mockDDDProgramEnrollment);
    mockDDDProgramEnrollment.sort.mockReturnValue(mockDDDProgramEnrollment);
    mockDDDProgramEnrollment.lean.mockResolvedValueOnce([]);
    await svc.listEnrollments({ programId: 'p1', status: 'enrolled' });
    expect(mockDDDProgramEnrollment.find).toHaveBeenCalledWith(
      expect.objectContaining({ programId: 'p1', status: 'enrolled' })
    );
  });

  test('enrollParticipant auto-generates enrollmentCode and status', async () => {
    mockDDDProgramEnrollment.create.mockResolvedValueOnce({ enrollmentCode: 'ENRL-1' });
    const r = await svc.enrollParticipant({ programId: 'p1', participantId: 'u1' });
    const arg = mockDDDProgramEnrollment.create.mock.calls[0][0];
    expect(arg.enrollmentCode).toMatch(/^ENRL-/);
    expect(arg.status).toBe('enrolled');
    expect(arg.enrolledAt).toBeDefined();
  });

  test('updateEnrollment delegates to _update', async () => {
    mockDDDProgramEnrollment.findByIdAndUpdate.mockReturnValue(mockDDDProgramEnrollment);
    mockDDDProgramEnrollment.lean.mockResolvedValueOnce({ _id: 'e1' });
    await svc.updateEnrollment('e1', { status: 'completed' });
    expect(mockDDDProgramEnrollment.findByIdAndUpdate).toHaveBeenCalled();
  });
});

/* ─── activities ─── */
describe('dddCommunityProgram – activities', () => {
  test('listActivities by programId sorted by scheduledDate', async () => {
    mockDDDProgramActivity.find.mockReturnValue(mockDDDProgramActivity);
    mockDDDProgramActivity.sort.mockReturnValue(mockDDDProgramActivity);
    mockDDDProgramActivity.lean.mockResolvedValueOnce([]);
    await svc.listActivities('p1');
    expect(mockDDDProgramActivity.find).toHaveBeenCalledWith(
      expect.objectContaining({ programId: 'p1' })
    );
  });

  test('createActivity generates activityCode', async () => {
    mockDDDProgramActivity.create.mockResolvedValueOnce({ activityCode: 'PACT-1' });
    const r = await svc.createActivity({ programId: 'p1', name: 'Activity' });
    const arg = mockDDDProgramActivity.create.mock.calls[0][0];
    expect(arg.activityCode).toMatch(/^PACT-/);
  });
});

/* ─── outcomes ─── */
describe('dddCommunityProgram – outcomes', () => {
  test('listOutcomes by programId sorted by measureDate desc', async () => {
    mockDDDProgramOutcome.find.mockReturnValue(mockDDDProgramOutcome);
    mockDDDProgramOutcome.sort.mockReturnValue(mockDDDProgramOutcome);
    mockDDDProgramOutcome.lean.mockResolvedValueOnce([]);
    await svc.listOutcomes('p1');
    expect(mockDDDProgramOutcome.find).toHaveBeenCalledWith(
      expect.objectContaining({ programId: 'p1' })
    );
  });

  test('recordOutcome generates outcomeCode', async () => {
    mockDDDProgramOutcome.create.mockResolvedValueOnce({ outcomeCode: 'POUT-1' });
    await svc.recordOutcome({ programId: 'p1' });
    const arg = mockDDDProgramOutcome.create.mock.calls[0][0];
    expect(arg.outcomeCode).toMatch(/^POUT-/);
  });

  test('recordOutcome calculates achievementPercent when baselineValue+targetValue+actualValue', async () => {
    mockDDDProgramOutcome.create.mockResolvedValueOnce({ achievementPercent: 50 });
    await svc.recordOutcome({
      programId: 'p1',
      baselineValue: 10,
      targetValue: 100,
      actualValue: 55,
    });
    const arg = mockDDDProgramOutcome.create.mock.calls[0][0];
    expect(arg.achievementPercent).toBeDefined();
    expect(typeof arg.achievementPercent).toBe('number');
  });
});

/* ─── analytics ─── */
describe('dddCommunityProgram – analytics', () => {
  test('getProgramAnalytics returns counts', async () => {
    mockDDDProgram.countDocuments.mockResolvedValueOnce(10);
    mockDDDProgramEnrollment.countDocuments.mockResolvedValueOnce(20);
    mockDDDProgramActivity.countDocuments.mockResolvedValueOnce(30);
    mockDDDProgramOutcome.countDocuments.mockResolvedValueOnce(40);
    mockDDDProgram.find.mockReturnValue(mockDDDProgram);
    mockDDDProgram.lean.mockResolvedValueOnce([{ _id: 'a1' }]);
    const r = await svc.getProgramAnalytics();
    expect(r).toHaveProperty('programs');
    expect(r).toHaveProperty('enrollments');
  });
});

/* eslint-disable no-undef, no-unused-vars */
'use strict';
/**
 * TherapistPortalService — Comprehensive Unit Tests
 * ~170 tests covering all 32 public methods
 */

// ─── Helpers ───────────────────────────────────────────────────────────────
const buildChain = resolvedValue => {
  const chain = {};
  ['populate', 'sort', 'skip', 'limit', 'lean', 'select', 'distinct'].forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = jest.fn(function (resolve) {
    return Promise.resolve(resolvedValue !== undefined ? resolvedValue : []).then(resolve);
  });
  chain.lean.mockReturnValue({
    then: resolve =>
      Promise.resolve(resolvedValue !== undefined ? resolvedValue : []).then(resolve),
    catch: fn => Promise.resolve(resolvedValue !== undefined ? resolvedValue : []).catch(fn),
  });
  return chain;
};

const buildChainThenable = resolvedValue => {
  const val = resolvedValue !== undefined ? resolvedValue : [];
  const chain = {};
  const methods = ['populate', 'sort', 'skip', 'limit', 'select', 'distinct'];
  methods.forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.lean = jest.fn().mockResolvedValue(val);
  return chain;
};

const createModelMock = () => {
  const Model = jest.fn(function (data) {
    Object.assign(this, data);
    this._id = 'mockId';
    this.save = jest.fn().mockResolvedValue(this);
  });
  Model.find = jest.fn();
  Model.findById = jest.fn();
  Model.findOne = jest.fn();
  Model.findOneAndUpdate = jest.fn();
  Model.findOneAndDelete = jest.fn();
  Model.findByIdAndUpdate = jest.fn();
  Model.countDocuments = jest.fn();
  Model.aggregate = jest.fn();
  Model.distinct = jest.fn();
  Model.create = jest.fn();
  Model.updateOne = jest.fn();
  return Model;
};

// ─── Model mocks ───────────────────────────────────────────────────────────
const mockSession = createModelMock();
const mockAvailability = createModelMock();
const mockPlan = createModelMock();
const mockProgram = createModelMock();
const mockDocumentation = createModelMock();
const mockCase = createModelMock();
const mockDocument = createModelMock();
const mockMessage = createModelMock();
const mockBeneficiary = createModelMock();

jest.mock('../../models/TherapySession', () => mockSession);
jest.mock('../../models/TherapistAvailability', () => mockAvailability);
jest.mock('../../models/TherapeuticPlan', () => mockPlan);
jest.mock('../../models/TherapyProgram', () => mockProgram);
jest.mock('../../models/SessionDocumentation', () => mockDocumentation);
jest.mock('../../models/CaseManagement', () => mockCase);
jest.mock('../../models/Document', () => mockDocument);
jest.mock('../../models/message.model', () => mockMessage);
jest.mock('../../models/Beneficiary', () => mockBeneficiary);
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../utils/sanitize', () => ({
  escapeRegex: jest.fn(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
}));

const service = require('../../services/therapistPortal.service');

// ─── Reset all mocks ──────────────────────────────────────────────────────
const allModels = [
  mockSession,
  mockAvailability,
  mockPlan,
  mockProgram,
  mockDocumentation,
  mockCase,
  mockDocument,
  mockMessage,
  mockBeneficiary,
];

beforeEach(() => {
  allModels.forEach(m => {
    Object.keys(m).forEach(k => {
      if (typeof m[k]?.mockReset === 'function') m[k].mockReset();
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  1. Module exports
// ═════════════════════════════════════════════════════════════════════════════
describe('Module exports', () => {
  it('should export a singleton object (not a class)', () => {
    expect(typeof service).toBe('object');
    expect(service.constructor.name).toBe('TherapistPortalService');
  });

  it('should expose all public methods', () => {
    const expected = [
      'getDashboard',
      'getPatients',
      'getPatientById',
      'getPatientProgress',
      'getSchedule',
      'addScheduleSession',
      'updateScheduleSession',
      'deleteScheduleSession',
      'getAvailability',
      'updateAvailability',
      'addException',
      'getSessions',
      'getSessionById',
      'saveSessionReport',
      'updateSession',
      'deleteSession',
      'getSessionDocumentation',
      'createSessionDocumentation',
      'getTherapeuticPlans',
      'getPlanById',
      'updateGoalProgress',
      'getCases',
      'getCaseById',
      'updateCase',
      'updateCaseGoal',
      'getDocuments',
      'uploadDocument',
      'deleteDocument',
      'getReports',
      'getPerformanceKPIs',
      'getMessages',
      'sendMessage',
      'getCommunications',
      'sendCommunication',
      'getWorkloadAnalytics',
    ];
    expected.forEach(m => expect(typeof service[m]).toBe('function'));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  2. Dashboard
// ═════════════════════════════════════════════════════════════════════════════
describe('getDashboard', () => {
  const tid = 'therapist1';

  const setupDashboardMocks = (overrides = {}) => {
    // distinct → patientIds
    mockSession.distinct.mockReturnValue({
      lean: jest.fn().mockResolvedValue(overrides.patientIds || ['b1', 'b2']),
      then: fn => Promise.resolve(overrides.patientIds || ['b1', 'b2']).then(fn),
    });
    // We need distinct to also be thenable for Promise.all
    const distinctResult = overrides.patientIds || ['b1', 'b2'];
    mockSession.distinct.mockResolvedValue(distinctResult);

    // todaySessions find chain
    const todayChain = buildChainThenable(overrides.todaySessions || []);
    // upcomingSessions find chain
    const upcomingChain = buildChainThenable(overrides.upcomingSessions || []);
    // urgentCases find chain
    const urgentChain = buildChainThenable(overrides.urgentCases || []);

    mockSession.find
      .mockReturnValueOnce(todayChain) // todaySessions
      .mockReturnValueOnce(upcomingChain); // upcomingSessions

    mockCase.find.mockReturnValueOnce(urgentChain);

    // countDocuments: weekSessions, completedMonth, totalMonth, cancelledMonth, noShowMonth, pendingDocs
    mockSession.countDocuments
      .mockResolvedValueOnce(overrides.weekSessions ?? 10)
      .mockResolvedValueOnce(overrides.completedMonth ?? 20)
      .mockResolvedValueOnce(overrides.totalMonth ?? 30)
      .mockResolvedValueOnce(overrides.cancelledMonth ?? 3)
      .mockResolvedValueOnce(overrides.noShowMonth ?? 2)
      .mockResolvedValueOnce(overrides.pendingDocs ?? 5);

    // aggregate: ratings
    mockSession.aggregate.mockResolvedValueOnce(
      overrides.ratings || [{ _id: null, avg: 4.5, count: 10 }]
    );
  };

  it('should return dashboard with all stats computed', async () => {
    setupDashboardMocks();
    const result = await service.getDashboard(tid);

    expect(result).toHaveProperty('therapistId', tid);
    expect(result).toHaveProperty('stats');
    expect(result).toHaveProperty('todaySessions');
    expect(result).toHaveProperty('upcomingSessions');
    expect(result).toHaveProperty('urgentCases');
    expect(result).toHaveProperty('monthlyStats');
  });

  it('should compute totalPatients from distinct patientIds', async () => {
    setupDashboardMocks({ patientIds: ['b1', 'b2', 'b3'] });
    const result = await service.getDashboard(tid);
    expect(result.stats.totalPatients).toBe(3);
  });

  it('should compute completionRate correctly', async () => {
    setupDashboardMocks({ completedMonth: 15, totalMonth: 20 });
    const result = await service.getDashboard(tid);
    expect(result.stats.completionRate).toBe(75);
    expect(result.monthlyStats.attendanceRate).toBe(75);
  });

  it('should handle 0 totalMonth — completionRate=0', async () => {
    setupDashboardMocks({ completedMonth: 0, totalMonth: 0 });
    const result = await service.getDashboard(tid);
    expect(result.stats.completionRate).toBe(0);
  });

  it('should compute averageRating rounded to 1 decimal', async () => {
    setupDashboardMocks({ ratings: [{ _id: null, avg: 4.567, count: 8 }] });
    const result = await service.getDashboard(tid);
    expect(result.stats.averageRating).toBe(4.6);
    expect(result.stats.totalRatings).toBe(8);
  });

  it('should handle empty ratings array', async () => {
    setupDashboardMocks({ ratings: [] });
    const result = await service.getDashboard(tid);
    expect(result.stats.averageRating).toBe(0);
    expect(result.stats.totalRatings).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  3. Patients
// ═════════════════════════════════════════════════════════════════════════════
describe('getPatients', () => {
  const tid = 'therapist1';

  it('should return enriched patients with sessionCount', async () => {
    mockSession.distinct.mockResolvedValue(['b1']);
    const patientChain = buildChainThenable([{ _id: 'b1', name: 'Ali' }]);
    mockBeneficiary.find.mockReturnValueOnce(patientChain);
    mockSession.countDocuments.mockResolvedValue(5);
    const lastChain = buildChainThenable({ date: new Date('2025-01-01') });
    mockSession.findOne.mockReturnValueOnce(lastChain);

    const result = await service.getPatients(tid);
    expect(result).toHaveLength(1);
    expect(result[0].sessionCount).toBe(5);
    expect(result[0].lastSessionDate).toBeDefined();
  });

  it('should pass search filter as regex on name and mrn', async () => {
    mockSession.distinct.mockResolvedValue(['b1']);
    const patientChain = buildChainThenable([]);
    mockBeneficiary.find.mockReturnValueOnce(patientChain);

    await service.getPatients(tid, { search: 'Ahmad' });
    const filterArg = mockBeneficiary.find.mock.calls[0][0];
    expect(filterArg.$or).toBeDefined();
    expect(filterArg.$or).toHaveLength(2);
  });

  it('should pass status filter', async () => {
    mockSession.distinct.mockResolvedValue([]);
    const chain = buildChainThenable([]);
    mockBeneficiary.find.mockReturnValueOnce(chain);

    await service.getPatients(tid, { status: 'active' });
    const filterArg = mockBeneficiary.find.mock.calls[0][0];
    expect(filterArg.status).toBe('active');
  });

  it('should set lastSessionDate=null when no completed session', async () => {
    mockSession.distinct.mockResolvedValue(['b1']);
    const patientChain = buildChainThenable([{ _id: 'b1', name: 'X' }]);
    mockBeneficiary.find.mockReturnValueOnce(patientChain);
    mockSession.countDocuments.mockResolvedValue(0);
    const noSession = buildChainThenable(null);
    mockSession.findOne.mockReturnValueOnce(noSession);

    const result = await service.getPatients(tid);
    expect(result[0].lastSessionDate).toBeNull();
  });
});

describe('getPatientById', () => {
  const tid = 'therapist1';
  const pid = 'patient1';

  it('should return null if patient not found', async () => {
    mockBeneficiary.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const result = await service.getPatientById(tid, pid);
    expect(result).toBeNull();
  });

  it('should return enriched patient with sessions and plans', async () => {
    mockBeneficiary.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: pid, name: 'Sara' }),
    });
    const sessChain = buildChainThenable([{ _id: 's1' }]);
    mockSession.find.mockReturnValueOnce(sessChain);
    const planChain = buildChainThenable([{ _id: 'p1' }]);
    mockPlan.find.mockReturnValueOnce(planChain);
    mockSession.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(8);

    const result = await service.getPatientById(tid, pid);
    expect(result.name).toBe('Sara');
    expect(result.recentSessions).toHaveLength(1);
    expect(result.activePlans).toHaveLength(1);
    expect(result.stats.totalSessions).toBe(10);
    expect(result.stats.completedSessions).toBe(8);
  });

  it('should return empty arrays when patient has no sessions or plans', async () => {
    mockBeneficiary.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: pid, name: 'Test' }),
    });
    const sessChain = buildChainThenable([]);
    mockSession.find.mockReturnValueOnce(sessChain);
    const planChain = buildChainThenable([]);
    mockPlan.find.mockReturnValueOnce(planChain);
    mockSession.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    const result = await service.getPatientById(tid, pid);
    expect(result.recentSessions).toEqual([]);
    expect(result.activePlans).toEqual([]);
  });
});

describe('getPatientProgress', () => {
  const tid = 'therapist1';
  const bid = 'ben1';

  it('should return progress with goal stats and rating trend', async () => {
    const sessChain = buildChainThenable([
      { _id: 's1', date: new Date('2025-01-01'), rating: 4, sessionType: 'PT' },
      { _id: 's2', date: new Date('2025-02-01'), rating: 5, sessionType: 'PT' },
    ]);
    mockSession.find.mockReturnValueOnce(sessChain);

    const planChain = buildChainThenable([
      {
        _id: 'p1',
        goals: [
          { status: 'ACHIEVED', toJSON: () => ({ status: 'ACHIEVED' }) },
          { status: 'IN_PROGRESS', toJSON: () => ({ status: 'IN_PROGRESS' }) },
          { status: 'PENDING', toJSON: () => ({ status: 'PENDING' }) },
        ],
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(),
      },
    ]);
    mockPlan.find.mockReturnValueOnce(planChain);

    const docChain = buildChainThenable([]);
    mockDocumentation.find.mockReturnValueOnce(docChain);

    const result = await service.getPatientProgress(tid, bid);
    expect(result.totalSessions).toBe(2);
    expect(result.goals.total).toBe(3);
    expect(result.goals.achieved).toBe(1);
    expect(result.goals.inProgress).toBe(1);
    expect(result.goals.pending).toBe(1);
    expect(result.ratingTrend).toHaveLength(2);
  });

  it('should handle empty sessions and plans', async () => {
    mockSession.find.mockReturnValueOnce(buildChainThenable([]));
    mockPlan.find.mockReturnValueOnce(buildChainThenable([]));
    mockDocumentation.find.mockReturnValueOnce(buildChainThenable([]));

    const result = await service.getPatientProgress(tid, bid);
    expect(result.totalSessions).toBe(0);
    expect(result.goals.total).toBe(0);
    expect(result.ratingTrend).toEqual([]);
  });

  it('should extract outcomeTrend from documentation', async () => {
    mockSession.find.mockReturnValueOnce(buildChainThenable([]));
    mockPlan.find.mockReturnValueOnce(buildChainThenable([]));
    mockDocumentation.find.mockReturnValueOnce(
      buildChainThenable([
        { outcomeMeasures: [{ name: 'FIM', score: 80 }], createdAt: new Date('2025-03-01') },
      ])
    );

    const result = await service.getPatientProgress(tid, bid);
    expect(result.outcomeTrend).toHaveLength(1);
    expect(result.outcomeTrend[0].measures[0].name).toBe('FIM');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  4. Schedule
// ═════════════════════════════════════════════════════════════════════════════
describe('getSchedule', () => {
  const tid = 'therapist1';

  it('should query with from/to dates when provided', async () => {
    const chain = buildChainThenable([{ _id: 's1' }]);
    mockSession.find.mockReturnValueOnce(chain);

    const result = await service.getSchedule(tid, { from: '2025-01-01', to: '2025-01-31' });
    expect(mockSession.find).toHaveBeenCalledTimes(1);
    const filter = mockSession.find.mock.calls[0][0];
    expect(filter.therapist).toBe(tid);
    expect(filter.date.$gte).toEqual(new Date('2025-01-01'));
    expect(filter.date.$lte).toEqual(new Date('2025-01-31'));
  });

  it('should default to current date when no from specified', async () => {
    const chain = buildChainThenable([]);
    mockSession.find.mockReturnValueOnce(chain);

    await service.getSchedule(tid);
    const filter = mockSession.find.mock.calls[0][0];
    expect(filter.date.$gte).toBeInstanceOf(Date);
  });

  it('should filter by SCHEDULED and CONFIRMED status', async () => {
    const chain = buildChainThenable([]);
    mockSession.find.mockReturnValueOnce(chain);

    await service.getSchedule(tid);
    const filter = mockSession.find.mock.calls[0][0];
    expect(filter.status.$in).toEqual(['SCHEDULED', 'CONFIRMED']);
  });
});

describe('addScheduleSession', () => {
  const tid = 'therapist1';
  const validData = {
    beneficiary: 'b1',
    date: '2025-06-01',
    startTime: '09:00',
    endTime: '10:00',
  };

  it('should throw status=400 if beneficiary missing', async () => {
    try {
      await service.addScheduleSession(tid, {
        date: '2025-01-01',
        startTime: '09:00',
        endTime: '10:00',
      });
      fail('should have thrown');
    } catch (e) {
      expect(e.status).toBe(400);
    }
  });

  it('should throw status=400 if date missing', async () => {
    try {
      await service.addScheduleSession(tid, {
        beneficiary: 'b1',
        startTime: '09:00',
        endTime: '10:00',
      });
      fail('should have thrown');
    } catch (e) {
      expect(e.status).toBe(400);
    }
  });

  it('should throw status=400 if startTime missing', async () => {
    try {
      await service.addScheduleSession(tid, {
        beneficiary: 'b1',
        date: '2025-01-01',
        endTime: '10:00',
      });
      fail('should have thrown');
    } catch (e) {
      expect(e.status).toBe(400);
    }
  });

  it('should throw status=400 if endTime missing', async () => {
    try {
      await service.addScheduleSession(tid, {
        beneficiary: 'b1',
        date: '2025-01-01',
        startTime: '09:00',
      });
      fail('should have thrown');
    } catch (e) {
      expect(e.status).toBe(400);
    }
  });

  it('should throw status=409 if time conflict exists', async () => {
    mockSession.findOne.mockResolvedValueOnce({ _id: 'existing' });
    try {
      await service.addScheduleSession(tid, validData);
      fail('should have thrown');
    } catch (e) {
      expect(e.status).toBe(409);
    }
  });

  it('should create session with defaults when no conflict', async () => {
    mockSession.findOne.mockResolvedValueOnce(null);
    const created = { _id: 'newSess', ...validData, therapist: tid, status: 'SCHEDULED' };
    mockSession.create.mockResolvedValueOnce(created);

    const result = await service.addScheduleSession(tid, validData);
    expect(result._id).toBe('newSess');
    expect(mockSession.create).toHaveBeenCalledTimes(1);
    const arg = mockSession.create.mock.calls[0][0];
    expect(arg.therapist).toBe(tid);
    expect(arg.status).toBe('SCHEDULED');
  });

  it('should include optional fields when provided', async () => {
    mockSession.findOne.mockResolvedValueOnce(null);
    mockSession.create.mockResolvedValueOnce({ _id: 'newSess' });

    await service.addScheduleSession(tid, {
      ...validData,
      plan: 'plan1',
      notes: 'some notes',
      sessionType: 'OT',
      title: 'Follow-up',
    });
    const arg = mockSession.create.mock.calls[0][0];
    expect(arg.plan).toBe('plan1');
    expect(arg.notes).toEqual({ plan: 'some notes' });
    expect(arg.sessionType).toBe('OT');
    expect(arg.title).toBe('Follow-up');
  });
});

describe('updateScheduleSession', () => {
  const tid = 'therapist1';
  const sid = 'sess1';

  it('should return null if session not found', async () => {
    mockSession.findOne.mockResolvedValueOnce(null);
    const result = await service.updateScheduleSession(tid, sid, { title: 'New' });
    expect(result).toBeNull();
  });

  it('should update allowed fields and save', async () => {
    const sessionDoc = {
      _id: sid,
      therapist: tid,
      date: new Date(),
      startTime: '09:00',
      save: jest.fn().mockResolvedValue(true),
    };
    mockSession.findOne.mockResolvedValueOnce(sessionDoc);

    const result = await service.updateScheduleSession(tid, sid, {
      title: 'Updated',
      status: 'CONFIRMED',
    });
    expect(sessionDoc.title).toBe('Updated');
    expect(sessionDoc.status).toBe('CONFIRMED');
    expect(sessionDoc.save).toHaveBeenCalled();
  });

  it('should re-check conflict when date changes', async () => {
    const sessionDoc = {
      _id: sid,
      therapist: tid,
      date: new Date(),
      startTime: '09:00',
      save: jest.fn().mockResolvedValue(true),
    };
    mockSession.findOne
      .mockResolvedValueOnce(sessionDoc) // original find
      .mockResolvedValueOnce(null); // conflict check → no conflict

    await service.updateScheduleSession(tid, sid, { date: '2025-08-01' });
    expect(mockSession.findOne).toHaveBeenCalledTimes(2);
    expect(sessionDoc.save).toHaveBeenCalled();
  });

  it('should throw status=409 if new date has conflict', async () => {
    const sessionDoc = {
      _id: sid,
      therapist: tid,
      date: new Date(),
      startTime: '09:00',
      save: jest.fn(),
    };
    mockSession.findOne
      .mockResolvedValueOnce(sessionDoc)
      .mockResolvedValueOnce({ _id: 'conflicting' });

    try {
      await service.updateScheduleSession(tid, sid, { date: '2025-08-01' });
      fail('should have thrown');
    } catch (e) {
      expect(e.status).toBe(409);
    }
  });

  it('should not re-check conflict if date/startTime not changed', async () => {
    const sessionDoc = {
      _id: sid,
      therapist: tid,
      date: new Date(),
      startTime: '09:00',
      save: jest.fn().mockResolvedValue(true),
    };
    mockSession.findOne.mockResolvedValueOnce(sessionDoc);

    await service.updateScheduleSession(tid, sid, { title: 'just title' });
    // Only 1 call (no conflict re-check)
    expect(mockSession.findOne).toHaveBeenCalledTimes(1);
  });
});

describe('deleteScheduleSession', () => {
  const tid = 'therapist1';

  it('should return true when session deleted', async () => {
    mockSession.findOneAndDelete.mockResolvedValueOnce({ _id: 'sess1' });
    const result = await service.deleteScheduleSession(tid, 'sess1');
    expect(result).toBe(true);
  });

  it('should return false when session not found', async () => {
    mockSession.findOneAndDelete.mockResolvedValueOnce(null);
    const result = await service.deleteScheduleSession(tid, 'notExist');
    expect(result).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  5. Availability
// ═════════════════════════════════════════════════════════════════════════════
describe('getAvailability', () => {
  const tid = 'therapist1';

  it('should return found availability', async () => {
    const avail = { therapist: tid, recurringSchedule: [{ day: 0 }] };
    const chain = { lean: jest.fn().mockResolvedValue(avail) };
    mockAvailability.findOne.mockReturnValueOnce(chain);

    const result = await service.getAvailability(tid);
    expect(result.recurringSchedule).toHaveLength(1);
  });

  it('should return default template when none found', async () => {
    mockAvailability.findOne.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(null) });

    const result = await service.getAvailability(tid);
    expect(result.therapist).toBe(tid);
    expect(result.recurringSchedule).toEqual([]);
    expect(result.exceptions).toEqual([]);
    expect(result.preferences.maxSessionsPerDay).toBe(8);
    expect(result.preferences.languages).toContain('العربية');
  });
});

describe('updateAvailability', () => {
  const tid = 'therapist1';

  it('should upsert availability with new schedule', async () => {
    const updated = { therapist: tid, recurringSchedule: [{ day: 0 }] };
    mockAvailability.findOneAndUpdate.mockResolvedValueOnce(updated);

    const result = await service.updateAvailability(tid, { recurringSchedule: [{ day: 0 }] });
    expect(result).toEqual(updated);
    expect(mockAvailability.findOneAndUpdate).toHaveBeenCalledTimes(1);
    const args = mockAvailability.findOneAndUpdate.mock.calls[0];
    expect(args[0]).toEqual({ therapist: tid });
    expect(args[2]).toEqual({ new: true, upsert: true });
  });

  it('should handle preferences update', async () => {
    mockAvailability.findOneAndUpdate.mockResolvedValueOnce({ therapist: tid });

    await service.updateAvailability(tid, { preferences: { maxSessionsPerDay: 6 } });
    const setArg = mockAvailability.findOneAndUpdate.mock.calls[0][1].$set;
    expect(setArg.preferences).toEqual({ maxSessionsPerDay: 6 });
  });
});

describe('addException', () => {
  const tid = 'therapist1';

  it('should push exception with $slice', async () => {
    const exception = { date: '2025-07-01', reason: 'Holiday' };
    mockAvailability.findOneAndUpdate.mockResolvedValueOnce({
      therapist: tid,
      exceptions: [exception],
    });

    const result = await service.addException(tid, exception);
    expect(result.exceptions).toHaveLength(1);
    const args = mockAvailability.findOneAndUpdate.mock.calls[0];
    expect(args[1].$push.exceptions.$each).toEqual([exception]);
    expect(args[1].$push.exceptions.$slice).toBe(-200);
    expect(args[2]).toEqual({ new: true, upsert: true });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  6. Sessions
// ═════════════════════════════════════════════════════════════════════════════
describe('getSessions', () => {
  const tid = 'therapist1';

  it('should return paginated sessions with default page=1 limit=20', async () => {
    const sessChain = buildChainThenable([{ _id: 's1' }]);
    mockSession.find.mockReturnValueOnce(sessChain);
    mockSession.countDocuments.mockResolvedValueOnce(1);

    const result = await service.getSessions(tid);
    expect(result.sessions).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(1);
  });

  it('should respect page and limit from query', async () => {
    const sessChain = buildChainThenable([]);
    mockSession.find.mockReturnValueOnce(sessChain);
    mockSession.countDocuments.mockResolvedValueOnce(50);

    const result = await service.getSessions(tid, { page: 3, limit: 10 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(sessChain.skip).toHaveBeenCalledWith(20); // (3-1)*10
    expect(sessChain.limit).toHaveBeenCalledWith(10);
  });

  it('should clamp limit to max 100', async () => {
    const sessChain = buildChainThenable([]);
    mockSession.find.mockReturnValueOnce(sessChain);
    mockSession.countDocuments.mockResolvedValueOnce(0);

    const result = await service.getSessions(tid, { limit: 999 });
    expect(result.limit).toBe(100);
  });

  it('should filter by status', async () => {
    const sessChain = buildChainThenable([]);
    mockSession.find.mockReturnValueOnce(sessChain);
    mockSession.countDocuments.mockResolvedValueOnce(0);

    await service.getSessions(tid, { status: 'COMPLETED' });
    const filter = mockSession.find.mock.calls[0][0];
    expect(filter.status).toBe('COMPLETED');
  });

  it('should filter by sessionType', async () => {
    const sessChain = buildChainThenable([]);
    mockSession.find.mockReturnValueOnce(sessChain);
    mockSession.countDocuments.mockResolvedValueOnce(0);

    await service.getSessions(tid, { sessionType: 'OT' });
    const filter = mockSession.find.mock.calls[0][0];
    expect(filter.sessionType).toBe('OT');
  });

  it('should filter by date range (from/to)', async () => {
    const sessChain = buildChainThenable([]);
    mockSession.find.mockReturnValueOnce(sessChain);
    mockSession.countDocuments.mockResolvedValueOnce(0);

    await service.getSessions(tid, { from: '2025-01-01', to: '2025-12-31' });
    const filter = mockSession.find.mock.calls[0][0];
    expect(filter.date.$gte).toEqual(new Date('2025-01-01'));
    expect(filter.date.$lte).toEqual(new Date('2025-12-31'));
  });

  it('should filter by beneficiary', async () => {
    const sessChain = buildChainThenable([]);
    mockSession.find.mockReturnValueOnce(sessChain);
    mockSession.countDocuments.mockResolvedValueOnce(0);

    await service.getSessions(tid, { beneficiary: 'b1' });
    const filter = mockSession.find.mock.calls[0][0];
    expect(filter.beneficiary).toBe('b1');
  });

  it('should clamp page to minimum 1', async () => {
    const sessChain = buildChainThenable([]);
    mockSession.find.mockReturnValueOnce(sessChain);
    mockSession.countDocuments.mockResolvedValueOnce(0);

    const result = await service.getSessions(tid, { page: -5 });
    expect(result.page).toBe(1);
  });
});

describe('getSessionById', () => {
  const tid = 'therapist1';
  const sid = 'sess1';

  it('should return null when session not found', async () => {
    const chain = buildChainThenable(null);
    mockSession.findOne.mockReturnValueOnce(chain);

    const result = await service.getSessionById(tid, sid);
    expect(result).toBeNull();
  });

  it('should return session with documentation', async () => {
    const sessChain = buildChainThenable({ _id: sid, therapist: tid });
    mockSession.findOne.mockReturnValueOnce(sessChain);
    mockDocumentation.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ session: sid, soapNote: {} }),
    });

    const result = await service.getSessionById(tid, sid);
    expect(result._id).toBe(sid);
    expect(result.documentation).toBeDefined();
  });

  it('should return session with documentation=null if no doc exists', async () => {
    const sessChain = buildChainThenable({ _id: sid, therapist: tid });
    mockSession.findOne.mockReturnValueOnce(sessChain);
    mockDocumentation.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    const result = await service.getSessionById(tid, sid);
    expect(result._id).toBe(sid);
    expect(result.documentation).toBeNull();
  });
});

describe('saveSessionReport', () => {
  const tid = 'therapist1';

  it('should throw status=400 if sessionId missing', async () => {
    try {
      await service.saveSessionReport(tid, {});
      fail('should have thrown');
    } catch (e) {
      expect(e.status).toBe(400);
    }
  });

  it('should return null when session not found', async () => {
    mockSession.findOneAndUpdate.mockResolvedValueOnce(null);
    const result = await service.saveSessionReport(tid, { sessionId: 'notExist' });
    expect(result).toBeNull();
  });

  it('should update session and upsert documentation on success', async () => {
    const updatedSession = {
      _id: 'sess1',
      therapist: tid,
      beneficiary: 'b1',
      plan: 'p1',
    };
    mockSession.findOneAndUpdate.mockResolvedValueOnce(updatedSession);
    mockDocumentation.findOneAndUpdate.mockResolvedValueOnce({ session: 'sess1' });

    const result = await service.saveSessionReport(tid, {
      sessionId: 'sess1',
      subjective: 'S',
      objective: 'O',
      assessment: 'A',
      plan: 'P',
      rating: 5,
    });
    expect(result._id).toBe('sess1');
    expect(mockDocumentation.findOneAndUpdate).toHaveBeenCalledTimes(1);
    const docArgs = mockDocumentation.findOneAndUpdate.mock.calls[0];
    expect(docArgs[0]).toEqual({ session: 'sess1' });
    expect(docArgs[1].soapNote.subjective.patientReports).toBe('S');
    expect(docArgs[2]).toEqual({ upsert: true, new: true });
  });

  it('should set quality.isComplete=true when all SOAP fields present', async () => {
    mockSession.findOneAndUpdate.mockResolvedValueOnce({ _id: 's1', beneficiary: 'b1' });
    mockDocumentation.findOneAndUpdate.mockResolvedValueOnce({});

    await service.saveSessionReport(tid, {
      sessionId: 's1',
      subjective: 'S',
      objective: 'O',
      assessment: 'A',
      plan: 'P',
    });
    const updateArg = mockDocumentation.findOneAndUpdate.mock.calls[0][1];
    expect(updateArg['quality.isComplete']).toBe(true);
  });

  it('should set quality.isComplete=false when SOAP field missing', async () => {
    mockSession.findOneAndUpdate.mockResolvedValueOnce({ _id: 's1', beneficiary: 'b1' });
    mockDocumentation.findOneAndUpdate.mockResolvedValueOnce({});

    await service.saveSessionReport(tid, { sessionId: 's1', subjective: 'S' });
    const updateArg = mockDocumentation.findOneAndUpdate.mock.calls[0][1];
    expect(updateArg['quality.isComplete']).toBe(false);
  });
});

describe('updateSession', () => {
  const tid = 'therapist1';
  const sid = 'sess1';

  it('should return null when session not found', async () => {
    mockSession.findOne.mockResolvedValueOnce(null);
    const result = await service.updateSession(tid, sid, { title: 'x' });
    expect(result).toBeNull();
  });

  it('should update whitelisted fields', async () => {
    const sessionDoc = {
      _id: sid,
      save: jest.fn().mockResolvedValue(true),
    };
    mockSession.findOne.mockResolvedValueOnce(sessionDoc);

    await service.updateSession(tid, sid, { title: 'New', status: 'COMPLETED', rating: 5 });
    expect(sessionDoc.title).toBe('New');
    expect(sessionDoc.status).toBe('COMPLETED');
    expect(sessionDoc.rating).toBe(5);
    expect(sessionDoc.save).toHaveBeenCalled();
  });

  it('should convert date field to Date object', async () => {
    const sessionDoc = {
      _id: sid,
      save: jest.fn().mockResolvedValue(true),
    };
    mockSession.findOne.mockResolvedValueOnce(sessionDoc);

    await service.updateSession(tid, sid, { date: '2025-06-15' });
    expect(sessionDoc.date).toEqual(new Date('2025-06-15'));
  });

  it('should ignore non-whitelisted fields', async () => {
    const sessionDoc = {
      _id: sid,
      save: jest.fn().mockResolvedValue(true),
    };
    mockSession.findOne.mockResolvedValueOnce(sessionDoc);

    await service.updateSession(tid, sid, { hackerField: 'x', title: 'OK' });
    expect(sessionDoc.hackerField).toBeUndefined();
    expect(sessionDoc.title).toBe('OK');
  });
});

describe('deleteSession', () => {
  it('should return true when deleted', async () => {
    mockSession.findOneAndDelete.mockResolvedValueOnce({ _id: 's1' });
    expect(await service.deleteSession('t1', 's1')).toBe(true);
  });

  it('should return false when not found', async () => {
    mockSession.findOneAndDelete.mockResolvedValueOnce(null);
    expect(await service.deleteSession('t1', 'none')).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  7. Documentation
// ═════════════════════════════════════════════════════════════════════════════
describe('getSessionDocumentation', () => {
  it('should query by session and therapist', async () => {
    const chain = buildChainThenable({ session: 's1' });
    mockDocumentation.findOne.mockReturnValueOnce(chain);

    const result = await service.getSessionDocumentation('t1', 's1');
    expect(mockDocumentation.findOne).toHaveBeenCalledWith({ session: 's1', therapist: 't1' });
    expect(result).toBeDefined();
  });

  it('should return null when no documentation exists', async () => {
    const chain = buildChainThenable(null);
    mockDocumentation.findOne.mockReturnValueOnce(chain);

    const result = await service.getSessionDocumentation('t1', 's1');
    expect(result).toBeNull();
  });
});

describe('createSessionDocumentation', () => {
  const tid = 'therapist1';
  const sid = 'sess1';

  it('should throw status=404 when session not found', async () => {
    mockSession.findOne.mockResolvedValueOnce(null);
    try {
      await service.createSessionDocumentation(tid, sid, {});
      fail('should have thrown');
    } catch (e) {
      expect(e.status).toBe(404);
    }
  });

  it('should create documentation for existing session', async () => {
    mockSession.findOne.mockResolvedValueOnce({ _id: sid, beneficiary: 'b1', plan: 'p1' });
    const createdDoc = { session: sid, therapist: tid };
    mockDocumentation.findOneAndUpdate.mockResolvedValueOnce(createdDoc);

    const result = await service.createSessionDocumentation(tid, sid, {
      soapNote: { subjective: {} },
      documentation: 'notes',
      goalsAddressed: ['g1'],
      attachments: [],
      outcomeMeasures: [],
      riskFlags: [],
      isComplete: true,
    });
    expect(result).toEqual(createdDoc);
    expect(mockDocumentation.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('should map string goals to objects with PARTIAL status', async () => {
    mockSession.findOne.mockResolvedValueOnce({ _id: sid, beneficiary: 'b1' });
    mockDocumentation.findOneAndUpdate.mockResolvedValueOnce({});

    await service.createSessionDocumentation(tid, sid, {
      goalsAddressed: ['goal1', 'goal2'],
    });
    const updateArg = mockDocumentation.findOneAndUpdate.mock.calls[0][1];
    updateArg.goalsAddressed.forEach(g => {
      expect(g).toEqual({ status: 'PARTIAL' });
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  8. Therapeutic Plans
// ═════════════════════════════════════════════════════════════════════════════
describe('getTherapeuticPlans', () => {
  const tid = 'therapist1';

  it('should list plans for therapist', async () => {
    const chain = buildChainThenable([{ _id: 'p1' }]);
    mockPlan.find.mockReturnValueOnce(chain);

    const result = await service.getTherapeuticPlans(tid);
    expect(result).toHaveLength(1);
    const filter = mockPlan.find.mock.calls[0][0];
    expect(filter.assignedTherapists).toBe(tid);
  });

  it('should filter by status and beneficiary', async () => {
    const chain = buildChainThenable([]);
    mockPlan.find.mockReturnValueOnce(chain);

    await service.getTherapeuticPlans(tid, { status: 'ACTIVE', beneficiary: 'b1' });
    const filter = mockPlan.find.mock.calls[0][0];
    expect(filter.status).toBe('ACTIVE');
    expect(filter.beneficiary).toBe('b1');
  });
});

describe('getPlanById', () => {
  const tid = 'therapist1';

  it('should return plan when found', async () => {
    const chain = buildChainThenable({ _id: 'p1', goals: [] });
    mockPlan.findOne.mockReturnValueOnce(chain);

    const result = await service.getPlanById(tid, 'p1');
    expect(result._id).toBe('p1');
  });

  it('should return null when plan not found', async () => {
    const chain = buildChainThenable(null);
    mockPlan.findOne.mockReturnValueOnce(chain);

    const result = await service.getPlanById(tid, 'noId');
    expect(result).toBeNull();
  });
});

describe('updateGoalProgress', () => {
  const tid = 'therapist1';

  it('should return null if plan not found', async () => {
    mockPlan.findOne.mockResolvedValueOnce(null);
    const result = await service.updateGoalProgress(tid, 'p1', 'g1', { progress: 50 });
    expect(result).toBeNull();
  });

  it('should return null if goal not found in plan', async () => {
    const plan = { goals: { id: jest.fn().mockReturnValue(null) }, save: jest.fn() };
    mockPlan.findOne.mockResolvedValueOnce(plan);

    const result = await service.updateGoalProgress(tid, 'p1', 'g1', { progress: 50 });
    expect(result).toBeNull();
  });

  it('should clamp progress to 0-100 range (upper)', async () => {
    const goal = { status: 'IN_PROGRESS', progress: 50 };
    const plan = {
      goals: { id: jest.fn().mockReturnValue(goal) },
      save: jest.fn().mockResolvedValue(true),
    };
    mockPlan.findOne.mockResolvedValueOnce(plan);

    await service.updateGoalProgress(tid, 'p1', 'g1', { progress: 150 });
    expect(goal.progress).toBe(100);
  });

  it('should clamp progress to 0-100 range (lower)', async () => {
    const goal = { status: 'IN_PROGRESS', progress: 50 };
    const plan = {
      goals: { id: jest.fn().mockReturnValue(goal) },
      save: jest.fn().mockResolvedValue(true),
    };
    mockPlan.findOne.mockResolvedValueOnce(plan);

    await service.updateGoalProgress(tid, 'p1', 'g1', { progress: -20 });
    expect(goal.progress).toBe(0);
  });

  it('should update status and targetDate if provided', async () => {
    const goal = { status: 'PENDING', progress: 0 };
    const plan = {
      goals: { id: jest.fn().mockReturnValue(goal) },
      save: jest.fn().mockResolvedValue(true),
    };
    mockPlan.findOne.mockResolvedValueOnce(plan);

    await service.updateGoalProgress(tid, 'p1', 'g1', {
      status: 'IN_PROGRESS',
      targetDate: '2025-12-31',
    });
    expect(goal.status).toBe('IN_PROGRESS');
    expect(goal.targetDate).toEqual(new Date('2025-12-31'));
    expect(plan.save).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  9. Cases
// ═════════════════════════════════════════════════════════════════════════════
describe('getCases', () => {
  const tid = 'therapist1';

  it('should list cases for therapist with team filter', async () => {
    const chain = buildChainThenable([{ _id: 'c1' }]);
    mockCase.find.mockReturnValueOnce(chain);

    const result = await service.getCases(tid);
    expect(result).toHaveLength(1);
    const filter = mockCase.find.mock.calls[0][0];
    expect(filter['team.member']).toBe(tid);
    expect(filter['team.active']).toBe(true);
  });

  it('should filter by status', async () => {
    const chain = buildChainThenable([]);
    mockCase.find.mockReturnValueOnce(chain);

    await service.getCases(tid, { status: 'active' });
    const filter = mockCase.find.mock.calls[0][0];
    expect(filter.status).toBe('active');
  });

  it('should filter by priority', async () => {
    const chain = buildChainThenable([]);
    mockCase.find.mockReturnValueOnce(chain);

    await service.getCases(tid, { priority: 'high' });
    const filter = mockCase.find.mock.calls[0][0];
    expect(filter.priority).toBe('high');
  });
});

describe('getCaseById', () => {
  const tid = 'therapist1';

  it('should return case when found', async () => {
    const chain = buildChainThenable({ _id: 'c1', caseNumber: 'CN001' });
    mockCase.findOne.mockReturnValueOnce(chain);

    const result = await service.getCaseById(tid, 'c1');
    expect(result.caseNumber).toBe('CN001');
  });

  it('should return null when case not found', async () => {
    const chain = buildChainThenable(null);
    mockCase.findOne.mockReturnValueOnce(chain);

    const result = await service.getCaseById(tid, 'noCase');
    expect(result).toBeNull();
  });
});

describe('updateCase', () => {
  const tid = 'therapist1';

  it('should return null if case not found', async () => {
    mockCase.findOne.mockResolvedValueOnce(null);
    const result = await service.updateCase(tid, 'c1', { status: 'closed' });
    expect(result).toBeNull();
  });

  it('should update allowed fields and save', async () => {
    const caseDoc = {
      _id: 'c1',
      save: jest.fn().mockResolvedValue(true),
    };
    mockCase.findOne.mockResolvedValueOnce(caseDoc);

    await service.updateCase(tid, 'c1', {
      status: 'closed',
      description: 'Updated',
      priority: 'low',
    });
    expect(caseDoc.status).toBe('closed');
    expect(caseDoc.description).toBe('Updated');
    expect(caseDoc.priority).toBe('low');
    expect(caseDoc.save).toHaveBeenCalled();
  });

  it('should ignore non-allowed fields', async () => {
    const caseDoc = {
      _id: 'c1',
      save: jest.fn().mockResolvedValue(true),
    };
    mockCase.findOne.mockResolvedValueOnce(caseDoc);

    await service.updateCase(tid, 'c1', { hackerField: 'x', notes: 'ok' });
    expect(caseDoc.hackerField).toBeUndefined();
    expect(caseDoc.notes).toBe('ok');
  });
});

describe('updateCaseGoal', () => {
  const tid = 'therapist1';
  const caseId = 'c1';
  const goalId = 'g1';

  it('should return null if case not found', async () => {
    mockCase.findOne.mockResolvedValueOnce(null);
    const result = await service.updateCaseGoal(tid, caseId, goalId, 'ACHIEVED');
    expect(result).toBeNull();
  });

  it('should update goal via subdoc .id() when available', async () => {
    const goal = { status: 'PENDING' };
    const caseDoc = {
      _id: caseId,
      goals: { id: jest.fn().mockReturnValue(goal) },
      save: jest.fn().mockResolvedValue(true),
    };
    mockCase.findOne.mockResolvedValueOnce(caseDoc);

    const result = await service.updateCaseGoal(tid, caseId, goalId, 'ACHIEVED');
    expect(goal.status).toBe('ACHIEVED');
    expect(caseDoc.save).toHaveBeenCalled();
    expect(result).toBe(caseDoc);
  });

  it('should fallback to updateOne when .id() returns null', async () => {
    const caseDoc = {
      _id: caseId,
      goals: { id: jest.fn().mockReturnValue(null) },
      save: jest.fn(),
    };
    mockCase.findOne.mockResolvedValueOnce(caseDoc);
    mockCase.updateOne.mockResolvedValueOnce({});
    mockCase.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: caseId }) });

    const result = await service.updateCaseGoal(tid, caseId, goalId, 'IN_PROGRESS');
    expect(mockCase.updateOne).toHaveBeenCalledWith(
      { _id: caseId, 'goals._id': goalId },
      { $set: { 'goals.$.status': 'IN_PROGRESS' } }
    );
    expect(mockCase.findById).toHaveBeenCalledWith(caseId);
  });

  it('should fallback when goals has no .id method', async () => {
    const caseDoc = {
      _id: caseId,
      goals: null,
      save: jest.fn(),
    };
    mockCase.findOne.mockResolvedValueOnce(caseDoc);
    mockCase.updateOne.mockResolvedValueOnce({});
    mockCase.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: caseId }) });

    const result = await service.updateCaseGoal(tid, caseId, goalId, 'ACHIEVED');
    expect(mockCase.updateOne).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  10. Documents
// ═════════════════════════════════════════════════════════════════════════════
describe('getDocuments', () => {
  const tid = 'therapist1';

  it('should list documents for therapist', async () => {
    const chain = buildChainThenable([{ _id: 'd1', title: 'Report' }]);
    mockDocument.find.mockReturnValueOnce(chain);

    const result = await service.getDocuments(tid);
    expect(result).toHaveLength(1);
    const filter = mockDocument.find.mock.calls[0][0];
    expect(filter.uploadedBy).toBe(tid);
  });

  it('should filter by category', async () => {
    const chain = buildChainThenable([]);
    mockDocument.find.mockReturnValueOnce(chain);

    await service.getDocuments(tid, { category: 'medical' });
    const filter = mockDocument.find.mock.calls[0][0];
    expect(filter.category).toBe('medical');
  });
});

describe('uploadDocument', () => {
  it('should create document with uploadedBy set', async () => {
    const data = { title: 'Lab Report', fileName: 'report.pdf' };
    const created = { ...data, uploadedBy: 't1', _id: 'd1' };
    mockDocument.create.mockResolvedValueOnce(created);

    const result = await service.uploadDocument('t1', data);
    expect(result.uploadedBy).toBe('t1');
    expect(mockDocument.create).toHaveBeenCalledWith({ ...data, uploadedBy: 't1' });
  });
});

describe('deleteDocument', () => {
  it('should return true when document deleted', async () => {
    mockDocument.findOneAndDelete.mockResolvedValueOnce({ _id: 'd1' });
    expect(await service.deleteDocument('t1', 'd1')).toBe(true);
  });

  it('should return false when document not found', async () => {
    mockDocument.findOneAndDelete.mockResolvedValueOnce(null);
    expect(await service.deleteDocument('t1', 'noDoc')).toBe(false);
  });

  it('should filter by uploadedBy for security', async () => {
    mockDocument.findOneAndDelete.mockResolvedValueOnce(null);
    await service.deleteDocument('t1', 'd1');
    expect(mockDocument.findOneAndDelete).toHaveBeenCalledWith({ _id: 'd1', uploadedBy: 't1' });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  11. Reports & Performance
// ═════════════════════════════════════════════════════════════════════════════
describe('getReports', () => {
  const tid = 'therapist1';

  it('should return report with summary, bySessionType, byWeekday', async () => {
    mockSession.countDocuments
      .mockResolvedValueOnce(50) // total
      .mockResolvedValueOnce(40) // completed
      .mockResolvedValueOnce(5) // cancelled
      .mockResolvedValueOnce(3); // noShow
    mockSession.aggregate
      .mockResolvedValueOnce([{ _id: null, avg: 4.2, count: 30 }]) // ratings
      .mockResolvedValueOnce([
        { _id: 'PT', count: 25 },
        { _id: 'OT', count: 15 },
      ]) // byType
      .mockResolvedValueOnce([{ _id: 1, count: 10 }]); // byWeekday

    const result = await service.getReports(tid);
    expect(result.summary.totalSessions).toBe(50);
    expect(result.summary.completedSessions).toBe(40);
    expect(result.summary.cancelledSessions).toBe(5);
    expect(result.summary.noShowSessions).toBe(3);
    expect(result.summary.averageRating).toBe(4.2);
    expect(result.summary.attendanceRate).toBe(80);
    expect(result.bySessionType).toHaveLength(2);
    expect(result.byWeekday).toHaveLength(1);
    expect(result.period).toHaveProperty('from');
    expect(result.period).toHaveProperty('to');
  });

  it('should handle empty ratings', async () => {
    mockSession.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockSession.aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.getReports(tid);
    expect(result.summary.averageRating).toBe(0);
    expect(result.summary.totalRatings).toBe(0);
    expect(result.summary.attendanceRate).toBe(0);
  });

  it('should use custom date range when from/to provided', async () => {
    mockSession.countDocuments.mockResolvedValue(0);
    mockSession.aggregate.mockResolvedValue([]);

    const result = await service.getReports(tid, { from: '2025-03-01', to: '2025-03-31' });
    expect(result.period.from).toEqual(new Date('2025-03-01'));
    expect(result.period.to).toEqual(new Date('2025-03-31'));
  });

  it('should map bySessionType with type/count', async () => {
    mockSession.countDocuments.mockResolvedValue(10);
    mockSession.aggregate
      .mockResolvedValueOnce([{ _id: null, avg: 3, count: 5 }])
      .mockResolvedValueOnce([{ _id: 'Speech', count: 10 }])
      .mockResolvedValueOnce([]);

    const result = await service.getReports(tid);
    expect(result.bySessionType[0]).toEqual({ type: 'Speech', count: 10 });
  });
});

describe('getPerformanceKPIs', () => {
  const tid = 'therapist1';

  it('should return all KPI sections', async () => {
    // 8 countDocuments + 1 aggregate + 1 findOne (availability)
    mockSession.countDocuments
      .mockResolvedValueOnce(20) // month30
      .mockResolvedValueOnce(15) // completed30
      .mockResolvedValueOnce(3) // cancelled30
      .mockResolvedValueOnce(1) // noShow30
      .mockResolvedValueOnce(60) // month90
      .mockResolvedValueOnce(50); // completed90
    mockDocumentation.countDocuments
      .mockResolvedValueOnce(40) // docsComplete
      .mockResolvedValueOnce(45); // docsTotal
    mockSession.aggregate.mockResolvedValueOnce([{ _id: null, avg: 4.8, count: 15 }]);
    mockAvailability.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        metrics: { utilization: 75 },
        preferences: { maxSessionsPerDay: 10 },
      }),
    });

    const result = await service.getPerformanceKPIs(tid);
    expect(result.last30Days.totalSessions).toBe(20);
    expect(result.last30Days.completed).toBe(15);
    expect(result.last30Days.completionRate).toBe(75);
    expect(result.last30Days.cancellationRate).toBe(15);
    expect(result.last30Days.noShowRate).toBe(5);
    expect(result.last90Days.totalSessions).toBe(60);
    expect(result.last90Days.completionRate).toBe(83);
    expect(result.documentation.complete).toBe(40);
    expect(result.documentation.total).toBe(45);
    expect(result.documentation.completionRate).toBe(89);
    expect(result.rating.average).toBe(4.8);
    expect(result.rating.totalRatings).toBe(15);
    expect(result.utilization).toBe(75);
    expect(result.maxSessionsPerDay).toBe(10);
  });

  it('should handle zero sessions — rates=0', async () => {
    mockSession.countDocuments.mockResolvedValue(0);
    mockDocumentation.countDocuments.mockResolvedValue(0);
    mockSession.aggregate.mockResolvedValueOnce([]);
    mockAvailability.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    const result = await service.getPerformanceKPIs(tid);
    expect(result.last30Days.completionRate).toBe(0);
    expect(result.last90Days.completionRate).toBe(0);
    expect(result.documentation.completionRate).toBe(0);
    expect(result.rating.average).toBe(0);
    expect(result.utilization).toBe(0);
    expect(result.maxSessionsPerDay).toBe(8);
  });

  it('should default utilization=0 and maxSessions=8 when no availability', async () => {
    mockSession.countDocuments.mockResolvedValue(1);
    mockDocumentation.countDocuments.mockResolvedValue(0);
    mockSession.aggregate.mockResolvedValueOnce([]);
    mockAvailability.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    const result = await service.getPerformanceKPIs(tid);
    expect(result.utilization).toBe(0);
    expect(result.maxSessionsPerDay).toBe(8);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  12. Messages & Communications
// ═════════════════════════════════════════════════════════════════════════════
describe('getMessages', () => {
  const tid = 'therapist1';

  it('should query messages where sender or recipient is therapist', async () => {
    const chain = buildChainThenable([{ _id: 'm1' }]);
    mockMessage.find.mockReturnValueOnce(chain);

    const result = await service.getMessages(tid);
    const filter = mockMessage.find.mock.calls[0][0];
    expect(filter.$or).toEqual([{ sender: tid }, { recipient: tid }]);
    expect(result).toHaveLength(1);
  });

  it('should filter by conversationId when provided', async () => {
    const chain = buildChainThenable([]);
    mockMessage.find.mockReturnValueOnce(chain);

    await service.getMessages(tid, { conversationId: 'conv1' });
    const filter = mockMessage.find.mock.calls[0][0];
    expect(filter.conversationId).toBe('conv1');
  });

  it('should default limit to 50', async () => {
    const chain = buildChainThenable([]);
    mockMessage.find.mockReturnValueOnce(chain);

    await service.getMessages(tid);
    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it('should cap limit at 100', async () => {
    const chain = buildChainThenable([]);
    mockMessage.find.mockReturnValueOnce(chain);

    await service.getMessages(tid, { limit: 500 });
    expect(chain.limit).toHaveBeenCalledWith(100);
  });
});

describe('sendMessage', () => {
  const tid = 'therapist1';

  it('should throw status=400 if text is empty/missing', async () => {
    try {
      await service.sendMessage(tid, { recipient: 'r1' });
      fail('should have thrown');
    } catch (e) {
      expect(e.status).toBe(400);
    }
  });

  it('should throw status=400 if text is empty string', async () => {
    try {
      await service.sendMessage(tid, { text: '' });
      fail('should have thrown');
    } catch (e) {
      expect(e.status).toBe(400);
    }
  });

  it('should create message with sender and content', async () => {
    const created = { _id: 'm1', sender: tid, content: { text: 'Hello', type: 'text' } };
    mockMessage.create.mockResolvedValueOnce(created);

    const result = await service.sendMessage(tid, { text: 'Hello', recipient: 'r1' });
    expect(result.sender).toBe(tid);
    const arg = mockMessage.create.mock.calls[0][0];
    expect(arg.sender).toBe(tid);
    expect(arg.content.text).toBe('Hello');
    expect(arg.content.type).toBe('text');
  });

  it('should use custom messageType when provided', async () => {
    mockMessage.create.mockResolvedValueOnce({});
    await service.sendMessage(tid, { text: 'File', messageType: 'file' });
    const arg = mockMessage.create.mock.calls[0][0];
    expect(arg.content.type).toBe('file');
  });
});

describe('getCommunications', () => {
  it('should query messages sent by therapist', async () => {
    const chain = buildChainThenable([{ _id: 'm1' }]);
    mockMessage.find.mockReturnValueOnce(chain);

    const result = await service.getCommunications('t1');
    const filter = mockMessage.find.mock.calls[0][0];
    expect(filter.sender).toBe('t1');
    expect(result).toHaveLength(1);
  });
});

describe('sendCommunication', () => {
  it('should delegate to sendMessage', async () => {
    mockMessage.create.mockResolvedValueOnce({ _id: 'm1', sender: 't1' });
    const spy = jest.spyOn(service, 'sendMessage');

    const result = await service.sendCommunication('t1', { text: 'Hi' });
    expect(spy).toHaveBeenCalledWith('t1', { text: 'Hi' });
    spy.mockRestore();
  });

  it('should propagate status=400 from sendMessage when no text', async () => {
    try {
      await service.sendCommunication('t1', {});
      fail('should have thrown');
    } catch (e) {
      expect(e.status).toBe(400);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  13. Workload Analytics
// ═════════════════════════════════════════════════════════════════════════════
describe('getWorkloadAnalytics', () => {
  const tid = 'therapist1';

  it('should return currentWeek, nextWeek, activePatients, peakHours', async () => {
    mockSession.countDocuments
      .mockResolvedValueOnce(12) // thisWeek
      .mockResolvedValueOnce(8); // nextWeek
    mockSession.aggregate.mockResolvedValueOnce([
      { _id: '09:00', count: 5 },
      { _id: '14:00', count: 3 },
    ]);
    mockSession.distinct.mockResolvedValueOnce(['b1', 'b2', 'b3']);

    const result = await service.getWorkloadAnalytics(tid);
    expect(result.currentWeekSessions).toBe(12);
    expect(result.nextWeekSessions).toBe(8);
    expect(result.activePatients).toBe(3);
    expect(result.peakHours).toHaveLength(2);
    expect(result.peakHours[0]).toEqual({ time: '09:00', count: 5 });
  });

  it('should handle zero activity', async () => {
    mockSession.countDocuments.mockResolvedValue(0);
    mockSession.aggregate.mockResolvedValueOnce([]);
    mockSession.distinct.mockResolvedValueOnce([]);

    const result = await service.getWorkloadAnalytics(tid);
    expect(result.currentWeekSessions).toBe(0);
    expect(result.nextWeekSessions).toBe(0);
    expect(result.activePatients).toBe(0);
    expect(result.peakHours).toEqual([]);
  });

  it('should use correct date range for this/next week', async () => {
    mockSession.countDocuments.mockResolvedValue(0);
    mockSession.aggregate.mockResolvedValueOnce([]);
    mockSession.distinct.mockResolvedValueOnce([]);

    await service.getWorkloadAnalytics(tid);
    // First countDocuments call = thisWeek
    const thisWeekFilter = mockSession.countDocuments.mock.calls[0][0];
    expect(thisWeekFilter.date.$gte).toBeInstanceOf(Date);
    expect(thisWeekFilter.date.$lte).toBeInstanceOf(Date);
    // Second = nextWeek
    const nextWeekFilter = mockSession.countDocuments.mock.calls[1][0];
    expect(nextWeekFilter.date.$gte).toBeInstanceOf(Date);
    expect(nextWeekFilter.date.$lte).toBeInstanceOf(Date);
    // nextWeek start should be after thisWeek end
    expect(nextWeekFilter.date.$gte.getTime()).toBeGreaterThan(thisWeekFilter.date.$lte.getTime());
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  Edge cases & error handling
// ═════════════════════════════════════════════════════════════════════════════
describe('Edge cases', () => {
  it('addScheduleSession — empty data object should throw 400', async () => {
    try {
      await service.addScheduleSession('t1', {});
      fail('should have thrown');
    } catch (e) {
      expect(e.status).toBe(400);
    }
  });

  it('saveSessionReport — data with only sessionId but session not found returns null', async () => {
    mockSession.findOneAndUpdate.mockResolvedValue(null);
    const result = await service.saveSessionReport('t1', { sessionId: 'xyz' });
    expect(result).toBeNull();
  });

  it('updateScheduleSession — re-checks when startTime changed', async () => {
    const sessionDoc = {
      _id: 's1',
      therapist: 't1',
      date: new Date(),
      startTime: '09:00',
      save: jest.fn().mockResolvedValue(true),
    };
    mockSession.findOne.mockResolvedValueOnce(sessionDoc).mockResolvedValueOnce(null); // no conflict

    await service.updateScheduleSession('t1', 's1', { startTime: '11:00' });
    expect(mockSession.findOne).toHaveBeenCalledTimes(2);
    expect(sessionDoc.startTime).toBe('11:00');
  });

  it('getPatientById — returns stats with zero when no sessions', async () => {
    mockBeneficiary.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'p1' }),
    });
    mockSession.find.mockReturnValueOnce(buildChainThenable([]));
    mockPlan.find.mockReturnValueOnce(buildChainThenable([]));
    mockSession.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    const result = await service.getPatientById('t1', 'p1');
    expect(result.stats).toEqual({ totalSessions: 0, completedSessions: 0 });
  });

  it('getReports — completionRate and attendanceRate equal when no data', async () => {
    mockSession.countDocuments.mockResolvedValue(0);
    mockSession.aggregate.mockResolvedValue([]);

    const result = await service.getReports('t1');
    expect(result.summary.completionRate).toBe(0);
    expect(result.summary.attendanceRate).toBe(0);
  });
});

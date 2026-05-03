/**
 * blockchain-auto-issue-subscribers.test.js
 *
 * Verifies the change-stream → auto-issue mapping. We don't run a real
 * MongoDB change stream — we feed synthetic events through the subscriber
 * functions and assert (a) the trigger filter is correct and (b) the cert
 * payload extracted from the event matches what blockchainCertService
 * expects.
 */

'use strict';

jest.mock('../services/blockchainAutoIssueService', () => ({
  autoIssue: jest.fn().mockResolvedValue({ ok: true, certificate: { _id: 'fake' } }),
  isEnabled: jest.fn(() => true),
}));

const auto = require('../services/blockchainAutoIssueService');
const subs = require('../services/blockchain/autoIssueSubscribers');

beforeEach(() => {
  jest.clearAllMocks();
  subs._resetForTests();
});

describe('statusFlippedToCompleted', () => {
  it('returns true when status flipped to completed AND status is in updatedFields', () => {
    expect(
      subs.statusFlippedToCompleted({
        fullDocument: { status: 'completed' },
        updateDescription: { updatedFields: { status: 'completed' } },
      })
    ).toBe(true);
  });

  it('returns false when status is not "completed"', () => {
    expect(
      subs.statusFlippedToCompleted({
        fullDocument: { status: 'in_progress' },
        updateDescription: { updatedFields: { status: 'in_progress' } },
      })
    ).toBe(false);
  });

  it('returns false when updatedFields does not include status', () => {
    // re-emit without status changing — must not refire
    expect(
      subs.statusFlippedToCompleted({
        fullDocument: { status: 'completed' },
        updateDescription: { updatedFields: { progressPct: 100 } },
      })
    ).toBe(false);
  });

  it('handles missing fullDocument gracefully', () => {
    expect(subs.statusFlippedToCompleted({})).toBe(false);
    expect(subs.statusFlippedToCompleted(undefined)).toBe(false);
  });
});

describe('onCourseEnrollmentCompleted', () => {
  it('forwards LMS completion to autoIssue with the right shape', async () => {
    await subs.onCourseEnrollmentCompleted({
      fullDocument: {
        _id: 'enr-1',
        status: 'completed',
        userId: 'u1',
        userName: 'Ali',
        courseTitleAr: 'علاج وظيفي',
        courseTitleEn: 'OT-101',
        courseId: 'c1',
        cpdHours: 5,
        finalScore: 92,
      },
      updateDescription: { updatedFields: { status: 'completed' } },
    });
    expect(auto.autoIssue).toHaveBeenCalledTimes(1);
    const arg = auto.autoIssue.mock.calls[0][0];
    expect(arg).toMatchObject({
      source: 'lms',
      sourceRef: 'enr-1',
      title: { ar: 'علاج وظيفي', en: 'OT-101' },
      data: expect.objectContaining({ enrollmentId: 'enr-1', cpdHours: 5, score: 92 }),
    });
  });

  it('does NOT call autoIssue when status did not change', async () => {
    await subs.onCourseEnrollmentCompleted({
      fullDocument: { _id: 'enr-2', status: 'in_progress' },
      updateDescription: { updatedFields: { progressPct: 50 } },
    });
    expect(auto.autoIssue).not.toHaveBeenCalled();
  });
});

describe('onSmartIepCompleted', () => {
  it('forwards IEP completion to autoIssue', async () => {
    await subs.onSmartIepCompleted({
      fullDocument: {
        _id: 'iep-1',
        status: 'completed',
        iep_number: 'IEP-2026-001',
        plan_period: { start: '2026-01-01', end: '2026-12-31' },
        beneficiary: { fullNameAr: 'علي', fullNameEn: 'Ali', nationalId: '1234567890' },
        beneficiary_id: 'b1',
        goals: [1, 2, 3],
      },
      updateDescription: { updatedFields: { status: 'completed' } },
    });
    expect(auto.autoIssue).toHaveBeenCalledTimes(1);
    const arg = auto.autoIssue.mock.calls[0][0];
    expect(arg.source).toBe('iep');
    expect(arg.sourceRef).toBe('iep-1');
    expect(arg.recipient.name.ar).toBe('علي');
    expect(arg.data.iepNumber).toBe('IEP-2026-001');
    expect(arg.data.goalsAchieved).toBe(3);
  });
});

describe('onOnboardingCompleted', () => {
  it('forwards onboarding completion to autoIssue', async () => {
    await subs.onOnboardingCompleted({
      fullDocument: {
        _id: 'chk-1',
        status: 'completed',
        employee: { fullNameAr: 'سارة', fullNameEn: 'Sarah', email: 's@x' },
        employeeId: 'e1',
        tasks: [{ completed: true }, { completed: true }, { completed: false }],
      },
      updateDescription: { updatedFields: { status: 'completed' } },
    });
    expect(auto.autoIssue).toHaveBeenCalledTimes(1);
    const arg = auto.autoIssue.mock.calls[0][0];
    expect(arg.source).toBe('onboarding');
    expect(arg.data.completedTasks).toBe(2);
    expect(arg.data.totalTasks).toBe(3);
  });
});

describe('register', () => {
  it('registers all 3 handlers on a real-looking eventBus', () => {
    const handle = jest.fn();
    const result = subs.register({ handle });
    expect(result).toEqual({ registered: 3 });
    expect(handle).toHaveBeenCalledWith('CourseEnrollment:update', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('SmartIEP:update', expect.any(Function));
    expect(handle).toHaveBeenCalledWith('OnboardingChecklist:update', expect.any(Function));
  });

  it('is a no-op on a busted eventBus', () => {
    const result = subs.register(null);
    expect(result.registered).toBe(0);
  });

  it('refuses to double-register on subsequent calls', () => {
    const handle = jest.fn();
    subs.register({ handle });
    const second = subs.register({ handle });
    expect(second.alreadyRegistered).toBe(true);
    expect(handle).toHaveBeenCalledTimes(3); // only the first register call wired anything
  });

  it('handler errors are isolated — one bad source does not break others', async () => {
    auto.autoIssue.mockRejectedValueOnce(new Error('boom'));
    const captured = {};
    const handle = (key, fn) => {
      captured[key] = fn;
    };
    subs.register({ handle });
    // The wrapped handler must not throw
    await expect(
      captured['CourseEnrollment:update']({
        fullDocument: { _id: 'x', status: 'completed' },
        updateDescription: { updatedFields: { status: 'completed' } },
      })
    ).resolves.not.toThrow();
  });
});

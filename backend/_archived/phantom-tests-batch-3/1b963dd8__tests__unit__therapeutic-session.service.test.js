/**
 * Unit tests for services/therapeutic-session.service.js
 * TherapeuticSessionService — Session scheduling, documentation, statistics (singleton)
 */

/* ─── mocks ─────────────────────────────────────────────────────────── */

jest.mock('mongoose', () => ({
  Schema: jest.fn(),
  model: jest.fn(),
  models: {},
  Types: { ObjectId: 'ObjectId' },
}));

const mockSessionSave = jest.fn();
const mockSessionFind = jest.fn();
const mockSessionFindById = jest.fn();
const mockSessionFindByIdAndUpdate = jest.fn();
const mockSessionCountDocuments = jest.fn();
const mockSessionFindOne = jest.fn();
const mockSessionAggregate = jest.fn();

jest.mock('../../models/TherapySession', () => {
  const MockModel = jest.fn().mockImplementation(data => ({
    ...data,
    _id: 'sess1',
    save: mockSessionSave,
  }));
  MockModel.find = (...a) => mockSessionFind(...a);
  MockModel.findById = (...a) => mockSessionFindById(...a);
  MockModel.findByIdAndUpdate = (...a) => mockSessionFindByIdAndUpdate(...a);
  MockModel.countDocuments = (...a) => mockSessionCountDocuments(...a);
  MockModel.findOne = (...a) => mockSessionFindOne(...a);
  MockModel.aggregate = (...a) => mockSessionAggregate(...a);
  return MockModel;
});

const mockDocSave = jest.fn();
const mockDocFindOne = jest.fn();

jest.mock('../../models/SessionDocumentation', () => {
  const MockModel = jest.fn().mockImplementation(data => ({
    ...data,
    _id: 'doc1',
    quality: { isComplete: false },
    save: mockDocSave,
  }));
  MockModel.findOne = (...a) => mockDocFindOne(...a);
  return MockModel;
});

const mockAvailFindOne = jest.fn();
const mockAvailSave = jest.fn();

jest.mock('../../models/TherapistAvailability', () => {
  const MockModel = jest.fn().mockImplementation(data => ({
    ...data,
    _id: 'avail1',
    save: mockAvailSave,
  }));
  MockModel.findOne = (...a) => mockAvailFindOne(...a);
  return MockModel;
});

jest.mock('../../models/TherapeuticPlan', () => ({
  findById: jest.fn(),
}));

jest.mock('../../models/Employee', () => ({
  findById: jest.fn(),
}));

jest.mock('../../models/Beneficiary', () => ({
  findById: jest.fn(),
}));

const TherapeuticPlan = require('../../models/TherapeuticPlan');
const Employee = require('../../models/Employee');
const BeneficiaryFile = require('../../models/Beneficiary');
const service = require('../../services/therapeutic-session.service');

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('TherapeuticSessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Happy path defaults
    BeneficiaryFile.findById.mockResolvedValue({ _id: 'ben1' });
    Employee.findById.mockResolvedValue({ _id: 'emp1' });
    mockAvailFindOne.mockResolvedValue(null); // no availability record → always available
    mockSessionFindOne.mockResolvedValue(null); // no conflict
    mockSessionSave.mockResolvedValue(undefined);
  });

  // ── scheduleSession ──────────────────────────────────────────────

  describe('scheduleSession', () => {
    it('schedules session successfully', async () => {
      const result = await service.scheduleSession({
        beneficiary: 'ben1',
        therapist: 'emp1',
        date: '2025-06-01',
        startTime: '09:00',
        endTime: '10:00',
      });

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('SCHEDULED');
      expect(mockSessionSave).toHaveBeenCalled();
    });

    it('fails when beneficiary not found', async () => {
      BeneficiaryFile.findById.mockResolvedValue(null);

      const result = await service.scheduleSession({
        beneficiary: 'bad',
        therapist: 'emp1',
        date: '2025-06-01',
        startTime: '09:00',
        endTime: '10:00',
      });

      expect(result.success).toBe(false);
    });

    it('fails when therapist not found', async () => {
      Employee.findById.mockResolvedValue(null);

      const result = await service.scheduleSession({
        beneficiary: 'ben1',
        therapist: 'bad',
        date: '2025-06-01',
        startTime: '09:00',
        endTime: '10:00',
      });

      expect(result.success).toBe(false);
    });

    it('fails when therapist not available', async () => {
      mockAvailFindOne.mockResolvedValue({
        recurringSchedule: [{ dayOfWeek: 'MONDAY', isActive: false }],
        preferences: { maxSessionsPerDay: 8 },
      });

      const monday = new Date('2025-06-02'); // Monday
      const result = await service.scheduleSession({
        beneficiary: 'ben1',
        therapist: 'emp1',
        date: monday.toISOString(),
        startTime: '09:00',
        endTime: '10:00',
      });

      expect(result.success).toBe(false);
    });

    it('validates therapeutic plan when provided', async () => {
      TherapeuticPlan.findById.mockResolvedValue({ _id: 'plan1' });

      const result = await service.scheduleSession({
        beneficiary: 'ben1',
        therapist: 'emp1',
        date: '2025-06-01',
        startTime: '09:00',
        endTime: '10:00',
        plan: 'plan1',
      });

      expect(result.success).toBe(true);
    });

    it('fails when plan not found', async () => {
      TherapeuticPlan.findById.mockResolvedValue(null);

      const result = await service.scheduleSession({
        beneficiary: 'ben1',
        therapist: 'emp1',
        date: '2025-06-01',
        startTime: '09:00',
        endTime: '10:00',
        plan: 'bad_plan',
      });

      expect(result.success).toBe(false);
    });
  });

  // ── checkTherapistAvailability ───────────────────────────────────

  describe('checkTherapistAvailability', () => {
    it('returns available when no availability record', async () => {
      mockAvailFindOne.mockResolvedValue(null);

      const result = await service.checkTherapistAvailability('t1', '2025-06-01', '09:00', '10:00');

      expect(result.available).toBe(true);
    });

    it('returns not available when day is inactive', async () => {
      const sunday = new Date('2025-06-01'); // Sunday
      mockAvailFindOne.mockResolvedValue({
        recurringSchedule: [{ dayOfWeek: 'SUNDAY', isActive: false }],
        preferences: { maxSessionsPerDay: 8 },
      });

      const result = await service.checkTherapistAvailability(
        't1',
        sunday.toISOString(),
        '09:00',
        '10:00'
      );

      expect(result.available).toBe(false);
      expect(result.reason).toContain('not available');
    });

    it('returns not available when outside slot hours', async () => {
      const sunday = new Date('2025-06-01');
      mockAvailFindOne.mockResolvedValue({
        recurringSchedule: [
          { dayOfWeek: 'SUNDAY', isActive: true, startTime: '08:00', endTime: '12:00' },
        ],
        preferences: { maxSessionsPerDay: 8 },
      });

      const result = await service.checkTherapistAvailability(
        't1',
        sunday.toISOString(),
        '13:00',
        '14:00'
      );

      expect(result.available).toBe(false);
      expect(result.reason).toContain('outside');
    });

    it('returns not available when conflicts with break time', async () => {
      const sunday = new Date('2025-06-01');
      mockAvailFindOne.mockResolvedValue({
        recurringSchedule: [
          {
            dayOfWeek: 'SUNDAY',
            isActive: true,
            startTime: '08:00',
            endTime: '16:00',
            breakStart: '12:00',
            breakEnd: '13:00',
          },
        ],
        preferences: { maxSessionsPerDay: 8 },
      });
      mockSessionCountDocuments.mockResolvedValue(0);

      const result = await service.checkTherapistAvailability(
        't1',
        sunday.toISOString(),
        '12:00',
        '12:30'
      );

      expect(result.available).toBe(false);
      expect(result.reason).toContain('break');
    });

    it('returns not available when max sessions reached', async () => {
      const sunday = new Date('2025-06-01');
      mockAvailFindOne.mockResolvedValue({
        recurringSchedule: [
          { dayOfWeek: 'SUNDAY', isActive: true, startTime: '08:00', endTime: '16:00' },
        ],
        preferences: { maxSessionsPerDay: 2 },
      });
      mockSessionCountDocuments.mockResolvedValue(2);

      const result = await service.checkTherapistAvailability(
        't1',
        sunday.toISOString(),
        '09:00',
        '10:00'
      );

      expect(result.available).toBe(false);
      expect(result.reason).toContain('maximum');
    });
  });

  // ── checkScheduleConflict ────────────────────────────────────────

  describe('checkScheduleConflict', () => {
    it('returns false when no conflict', async () => {
      mockAvailFindOne.mockResolvedValue(null);
      mockSessionFindOne.mockResolvedValue(null);

      const result = await service.checkScheduleConflict('t1', '2025-06-01', '09:00', '10:00');

      expect(result).toBe(false);
    });

    it('returns true when conflict exists', async () => {
      mockAvailFindOne.mockResolvedValue(null);
      mockSessionFindOne.mockResolvedValue({ _id: 'existing' });

      const result = await service.checkScheduleConflict('t1', '2025-06-01', '09:00', '10:00');

      expect(result).toBe(true);
    });
  });

  // ── updateSessionStatus ──────────────────────────────────────────

  describe('updateSessionStatus', () => {
    it('updates status successfully', async () => {
      mockSessionFindByIdAndUpdate.mockResolvedValue({ _id: 's1', status: 'COMPLETED' });

      const result = await service.updateSessionStatus('s1', 'COMPLETED');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('COMPLETED');
    });

    it('fails for invalid status', async () => {
      const result = await service.updateSessionStatus('s1', 'INVALID');

      expect(result.success).toBe(false);
    });

    it('fails when session not found', async () => {
      mockSessionFindByIdAndUpdate.mockResolvedValue(null);

      const result = await service.updateSessionStatus('bad', 'COMPLETED');

      expect(result.success).toBe(false);
    });
  });

  // ── documentSession ──────────────────────────────────────────────

  describe('documentSession', () => {
    it('creates new documentation', async () => {
      mockSessionFindById.mockResolvedValue({
        _id: 's1',
        status: 'COMPLETED',
        beneficiary: 'ben1',
        therapist: 'emp1',
        plan: 'plan1',
      });
      mockDocFindOne.mockResolvedValue(null); // no existing doc
      mockDocSave.mockResolvedValue(undefined);

      const result = await service.documentSession('s1', {
        therapist: 'emp1',
        soapNote: { subjective: 'test' },
      });

      expect(result.success).toBe(true);
    });

    it('updates existing documentation with edit history', async () => {
      const existingDoc = {
        _id: 'doc1',
        edits: [],
        quality: { isComplete: false },
        save: mockDocSave,
      };
      mockSessionFindById.mockResolvedValue({ _id: 's1', status: 'COMPLETED' });
      mockDocFindOne.mockResolvedValue(existingDoc);

      const result = await service.documentSession('s1', {
        therapist: 'emp1',
        soapNote: { subjective: 'updated' },
      });

      expect(result.success).toBe(true);
      expect(existingDoc.edits).toHaveLength(1);
    });

    it('fails when session not found', async () => {
      mockSessionFindById.mockResolvedValue(null);

      const result = await service.documentSession('bad', {});

      expect(result.success).toBe(false);
    });

    it('fails when session not completed', async () => {
      mockSessionFindById.mockResolvedValue({ _id: 's1', status: 'SCHEDULED' });

      const result = await service.documentSession('s1', {});

      expect(result.success).toBe(false);
    });
  });

  // ── getTherapistSessions ─────────────────────────────────────────

  describe('getTherapistSessions', () => {
    it('returns sessions with documentation status', async () => {
      mockSessionFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockResolvedValue([{ _id: 's1', toObject: () => ({ _id: 's1' }) }]),
            }),
          }),
        }),
      });
      mockDocFindOne.mockResolvedValue({ documentedAt: new Date() });

      const result = await service.getTherapistSessions('t1', '2025-01-01', '2025-12-31');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data[0].documented).toBe(true);
    });

    it('filters by status when provided', async () => {
      mockSessionFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const result = await service.getTherapistSessions(
        't1',
        '2025-01-01',
        '2025-12-31',
        'COMPLETED'
      );

      expect(result.success).toBe(true);
    });
  });

  // ── getBeneficiarySessions ───────────────────────────────────────

  describe('getBeneficiarySessions', () => {
    it('returns sessions for beneficiary', async () => {
      mockSessionFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([{ _id: 's1' }]),
          }),
        }),
      });

      const result = await service.getBeneficiarySessions('ben1');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });

    it('filters by planId when provided', async () => {
      mockSessionFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.getBeneficiarySessions('ben1', 'plan1');

      expect(result.success).toBe(true);
    });
  });

  // ── rescheduleSession ────────────────────────────────────────────

  describe('rescheduleSession', () => {
    it('reschedules session to new time', async () => {
      const session = {
        _id: 's1',
        status: 'SCHEDULED',
        therapist: 't1',
        date: null,
        startTime: null,
        endTime: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockSessionFindById.mockResolvedValue(session);
      mockAvailFindOne.mockResolvedValue(null);
      mockSessionFindOne.mockResolvedValue(null);

      const result = await service.rescheduleSession('s1', '2025-07-01', '10:00', '11:00');

      expect(result.success).toBe(true);
      expect(session.date).toBe('2025-07-01');
      expect(session.startTime).toBe('10:00');
    });

    it('fails for completed session', async () => {
      mockSessionFindById.mockResolvedValue({ _id: 's1', status: 'COMPLETED' });

      const result = await service.rescheduleSession('s1', '2025-07-01', '10:00', '11:00');

      expect(result.success).toBe(false);
    });

    it('fails when session not found', async () => {
      mockSessionFindById.mockResolvedValue(null);

      const result = await service.rescheduleSession('bad', '2025-07-01', '10:00', '11:00');

      expect(result.success).toBe(false);
    });
  });

  // ── getSessionStatistics ─────────────────────────────────────────

  describe('getSessionStatistics', () => {
    it('returns full statistics', async () => {
      mockSessionCountDocuments
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(15) // completed
        .mockResolvedValueOnce(3) // cancelled
        .mockResolvedValueOnce(1) // noShow
        .mockResolvedValueOnce(1); // scheduled
      mockSessionAggregate.mockResolvedValue([{ avgRating: 4.5, minRating: 3, maxRating: 5 }]);

      const result = await service.getSessionStatistics('t1', '2025-01-01', '2025-12-31');

      expect(result.success).toBe(true);
      expect(result.data.total).toBe(20);
      expect(result.data.completed).toBe(15);
      expect(result.data.completionRate).toBe('75.00');
      expect(result.data.avgRating).toBe('4.50');
    });

    it('handles zero total', async () => {
      mockSessionCountDocuments.mockResolvedValue(0);
      mockSessionAggregate.mockResolvedValue([]);

      const result = await service.getSessionStatistics('t1', '2025-01-01', '2025-12-31');

      expect(result.success).toBe(true);
      expect(result.data.completionRate).toBe(0);
      expect(result.data.avgRating).toBe('0.00');
    });
  });

  // ── timeToMinutes ────────────────────────────────────────────────

  describe('timeToMinutes', () => {
    it('converts time string to minutes', () => {
      expect(service.timeToMinutes('09:30')).toBe(570);
      expect(service.timeToMinutes('00:00')).toBe(0);
      expect(service.timeToMinutes('23:59')).toBe(1439);
    });
  });

  // ── getDayOfWeek ─────────────────────────────────────────────────

  describe('getDayOfWeek', () => {
    it('returns correct day name', () => {
      expect(service.getDayOfWeek('2025-06-01')).toBe('SUNDAY'); // June 1, 2025 = Sunday
      expect(service.getDayOfWeek('2025-06-02')).toBe('MONDAY');
    });
  });

  // ── getUpcomingSessions ──────────────────────────────────────────

  describe('getUpcomingSessions', () => {
    it('returns upcoming sessions', async () => {
      mockSessionFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([{ _id: 's1' }]),
          }),
        }),
      });

      const result = await service.getUpcomingSessions('ben1', 30);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });
  });

  // ── setTherapistAvailability ─────────────────────────────────────

  describe('setTherapistAvailability', () => {
    it('creates new availability when none exists', async () => {
      mockAvailFindOne.mockResolvedValue(null);
      mockAvailSave.mockResolvedValue(undefined);

      const result = await service.setTherapistAvailability('t1', {
        recurringSchedule: [],
        preferences: { maxSessionsPerDay: 8 },
      });

      expect(result.success).toBe(true);
    });

    it('updates existing availability', async () => {
      const existingAvail = {
        therapist: 't1',
        save: mockAvailSave,
      };
      mockAvailFindOne.mockResolvedValue(existingAvail);
      mockAvailSave.mockResolvedValue(undefined);

      const result = await service.setTherapistAvailability('t1', {
        preferences: { maxSessionsPerDay: 10 },
      });

      expect(result.success).toBe(true);
    });
  });

  // ── getTherapistAvailability ─────────────────────────────────────

  describe('getTherapistAvailability', () => {
    it('returns availability when found', async () => {
      mockAvailFindOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ therapist: 't1' }),
      });

      const result = await service.getTherapistAvailability('t1');

      expect(result.success).toBe(true);
    });

    it('returns failure when not found', async () => {
      mockAvailFindOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getTherapistAvailability('bad');

      expect(result.success).toBe(false);
    });
  });
});

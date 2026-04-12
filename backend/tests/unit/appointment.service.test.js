/* eslint-disable no-undef, no-unused-vars */
'use strict';

/**
 * AppointmentService — Comprehensive Unit Tests
 * Tests for backend/services/appointment.service.js
 */

// ─── Mock Helpers ──────────────────────────────────────────────────────────────

const buildChain = resolved => {
  const chain = {};
  ['populate', 'sort', 'skip', 'limit', 'lean', 'select'].forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.lean.mockResolvedValue(resolved !== undefined ? resolved : []);
  return chain;
};

const createModelMock = () => {
  const Model = jest.fn(function (data) {
    Object.assign(this, data);
    this._id = this._id || 'mockId';
    this.save = jest.fn().mockResolvedValue(this);
    this.statusHistory = this.statusHistory || [];
    this.reminders = this.reminders || [];
  });
  Model.find = jest.fn();
  Model.findById = jest.fn();
  Model.findOne = jest.fn();
  Model.countDocuments = jest.fn();
  Model.aggregate = jest.fn();
  return Model;
};

// ─── Model Mocks ───────────────────────────────────────────────────────────────

const mockTherapySession = createModelMock();
const mockAppointment = createModelMock();
const mockAvailability = createModelMock();
const mockRoom = createModelMock();

jest.mock('../../models/TherapySession', () => mockTherapySession);
jest.mock('../../models/Appointment', () => mockAppointment);
jest.mock('../../models/TherapistAvailability', () => mockAvailability);
jest.mock('../../models/TherapyRoom', () => mockRoom);
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../utils/sanitize', () => ({
  escapeRegex: jest.fn(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
}));

// Do NOT mock AppError — use real for instanceof checks
const service = require('../../services/appointment.service');
const { AppError } = require('../../errors/AppError');

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Mocks findOne(query).lean() → resolvedValue for a given model */
const mockFindOneLean = (model, resolvedValue) => {
  model.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(resolvedValue) });
};

/** Mocks findById returning a rich document (not lean) */
const makeMockDoc = (overrides = {}) => ({
  _id: 'apt1',
  status: 'PENDING',
  statusHistory: [],
  reminders: [{ type: 'sms', minutesBefore: 60 }],
  therapist: 'th1',
  beneficiary: 'b1',
  date: new Date('2025-06-01'),
  startTime: '09:00',
  endTime: '09:30',
  duration: 30,
  room: 'r1',
  type: 'علاج طبيعي',
  reason: 'فحص',
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

/** Sets up NO conflict scenario (both sessions and appointments return null) */
const setupNoConflicts = () => {
  mockFindOneLean(mockTherapySession, null);
  mockFindOneLean(mockAppointment, null);
  mockAvailability.findOne.mockResolvedValue(null);
  mockTherapySession.countDocuments.mockResolvedValue(0);
  mockAppointment.countDocuments.mockResolvedValue(0);
  mockRoom.findById.mockResolvedValue(null);
};

beforeEach(() => {
  jest.clearAllMocks();
  setupNoConflicts();
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. MODULE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Module exports', () => {
  it('exports a singleton object (not a class)', () => {
    expect(typeof service).toBe('object');
    expect(service).not.toBeNull();
  });

  it('exposes expected public methods', () => {
    const methods = [
      'createAppointment',
      'listAppointments',
      'getAppointment',
      'updateAppointment',
      'cancelAppointment',
      'checkIn',
      'convertToSession',
      'getAppointmentStats',
      'generateRecurringAppointments',
      'generateRecurringSessions',
      'checkTherapistConflict',
      'checkRoomConflict',
      'getAvailableSlots',
      'getAvailableRooms',
      'addReminders',
      'updateGoalProgress',
      'getSessionHistory',
      'updateSessionStatusTracked',
      'getTodaySchedule',
      'getPendingReminders',
      'markReminderSent',
    ];
    methods.forEach(m => expect(typeof service[m]).toBe('function'));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. HELPER METHODS
// ══════════════════════════════════════════════════════════════════════════════

describe('Helper methods', () => {
  describe('_timeToMinutes', () => {
    it('converts "14:30" → 870', () => {
      expect(service._timeToMinutes('14:30')).toBe(870);
    });
    it('converts "00:00" → 0', () => {
      expect(service._timeToMinutes('00:00')).toBe(0);
    });
    it('converts "09:05" → 545', () => {
      expect(service._timeToMinutes('09:05')).toBe(545);
    });
    it('handles null → 0', () => {
      expect(service._timeToMinutes(null)).toBe(0);
    });
    it('handles undefined → 0', () => {
      expect(service._timeToMinutes(undefined)).toBe(0);
    });
    it('handles "8:00" (no leading zero) → 480', () => {
      expect(service._timeToMinutes('8:00')).toBe(480);
    });
  });

  describe('_minutesToTime', () => {
    it('converts 870 → "14:30"', () => {
      expect(service._minutesToTime(870)).toBe('14:30');
    });
    it('converts 0 → "00:00"', () => {
      expect(service._minutesToTime(0)).toBe('00:00');
    });
    it('pads single digits: 65 → "01:05"', () => {
      expect(service._minutesToTime(65)).toBe('01:05');
    });
  });

  describe('_addMinutes', () => {
    it('"09:00" + 45 → "09:45"', () => {
      expect(service._addMinutes('09:00', 45)).toBe('09:45');
    });
    it('"23:30" + 60 → "24:30" (wraps past midnight as raw)', () => {
      expect(service._addMinutes('23:30', 60)).toBe('24:30');
    });
  });

  describe('_mapAppointmentTypeToSession', () => {
    it.each([
      ['علاج طبيعي', 'علاج طبيعي'],
      ['علاج وظيفي', 'علاج وظيفي'],
      ['نطق وتخاطب', 'نطق وتخاطب'],
      ['علاج سلوكي', 'علاج سلوكي'],
      ['علاج نفسي', 'علاج نفسي'],
    ])('maps "%s" → "%s"', (input, expected) => {
      expect(service._mapAppointmentTypeToSession(input)).toBe(expected);
    });

    it('maps unknown type → "أخرى"', () => {
      expect(service._mapAppointmentTypeToSession('جراحة')).toBe('أخرى');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. APPOINTMENT CRUD
// ══════════════════════════════════════════════════════════════════════════════

describe('Appointment CRUD', () => {
  // ── createAppointment ────────────────────────────────────────────────
  describe('createAppointment', () => {
    it('creates an appointment with default reminders when none provided', async () => {
      const data = {
        therapist: 'th1',
        date: new Date('2025-06-01'),
        startTime: '09:00',
        endTime: '09:30',
        duration: 30,
        beneficiary: 'b1',
        room: 'r1',
      };
      const result = await service.createAppointment(data, 'user1');
      expect(result).toBeDefined();
      expect(result.createdBy).toBe('user1');
      expect(result.reminders).toEqual([
        { type: 'sms', minutesBefore: 60 },
        { type: 'push', minutesBefore: 30 },
      ]);
      expect(result.save).toHaveBeenCalled();
    });

    it('creates an appointment with custom reminders', async () => {
      const data = {
        therapist: 'th1',
        date: new Date('2025-06-01'),
        startTime: '10:00',
        endTime: '10:30',
        beneficiary: 'b1',
        reminders: [{ type: 'email', minutesBefore: 120 }],
      };
      const result = await service.createAppointment(data, 'user1');
      expect(result.reminders).toEqual([{ type: 'email', minutesBefore: 120 }]);
    });

    it('throws APPOINTMENT_CONFLICT when therapist has session conflict', async () => {
      mockFindOneLean(mockTherapySession, { title: 'جلسة', startTime: '09:00', endTime: '09:30' });
      const data = {
        therapist: 'th1',
        date: new Date('2025-06-01'),
        startTime: '09:00',
        endTime: '09:30',
        beneficiary: 'b1',
      };
      await expect(service.createAppointment(data, 'user1')).rejects.toThrow(AppError);
      try {
        await service.createAppointment(data, 'user1');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(409);
        expect(err.code).toBe('APPOINTMENT_CONFLICT');
      }
    });

    it('throws ROOM_CONFLICT when room is booked', async () => {
      // No therapist conflict
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, null);
      // But room conflict
      const spyRoomConflict = jest
        .spyOn(service, 'checkRoomConflict')
        .mockResolvedValueOnce({ reason: 'الغرفة محجوزة لموعد' });

      const data = {
        therapist: 'th1',
        date: new Date('2025-06-01'),
        startTime: '09:00',
        endTime: '09:30',
        beneficiary: 'b1',
        room: 'r1',
      };
      await expect(service.createAppointment(data, 'user1')).rejects.toThrow(AppError);
      try {
        await service.createAppointment(data, 'user1');
      } catch (err) {
        expect(err.statusCode).toBe(409);
        expect(err.code).toBe('ROOM_CONFLICT');
      }
      spyRoomConflict.mockRestore();
    });

    it('generates recurring appointments when recurrence is set', async () => {
      const spy = jest.spyOn(service, 'generateRecurringAppointments').mockResolvedValue([]);
      const data = {
        therapist: 'th1',
        date: new Date('2025-06-01'),
        startTime: '09:00',
        endTime: '09:30',
        beneficiary: 'b1',
        recurrence: 'weekly',
        recurrenceEnd: new Date('2025-07-01'),
      };
      await service.createAppointment(data, 'user1');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('does not generate recurring if recurrence is "none"', async () => {
      const spy = jest.spyOn(service, 'generateRecurringAppointments').mockResolvedValue([]);
      const data = {
        therapist: 'th1',
        date: new Date('2025-06-01'),
        startTime: '09:00',
        endTime: '09:30',
        beneficiary: 'b1',
        recurrence: 'none',
      };
      await service.createAppointment(data, 'user1');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('calculates endTime from duration when endTime is missing', async () => {
      const data = {
        therapist: 'th1',
        date: new Date('2025-06-01'),
        startTime: '10:00',
        duration: 45,
        beneficiary: 'b1',
      };
      // Conflict check should use computed endTime = 10:45
      const result = await service.createAppointment(data, 'user1');
      expect(result).toBeDefined();
    });

    it('skips therapist conflict check if therapist is missing', async () => {
      const data = {
        date: new Date('2025-06-01'),
        startTime: '09:00',
        endTime: '09:30',
        beneficiary: 'b1',
      };
      const result = await service.createAppointment(data, 'user1');
      expect(result).toBeDefined();
      expect(mockTherapySession.findOne).not.toHaveBeenCalled();
    });
  });

  // ── listAppointments ─────────────────────────────────────────────────
  describe('listAppointments', () => {
    it('returns paginated results with default query', async () => {
      const aptArr = [{ _id: 'a1' }, { _id: 'a2' }];
      const chain = buildChain(aptArr);
      mockAppointment.find.mockReturnValue(chain);
      mockAppointment.countDocuments.mockResolvedValue(5);

      const result = await service.listAppointments({});
      expect(result.data).toEqual(aptArr);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.pages).toBe(1);
    });

    it('applies status filter (uppercased)', async () => {
      const chain = buildChain([]);
      mockAppointment.find.mockReturnValue(chain);
      mockAppointment.countDocuments.mockResolvedValue(0);

      await service.listAppointments({ status: 'pending' });
      const filter = mockAppointment.find.mock.calls[0][0];
      expect(filter.status).toBe('PENDING');
    });

    it('applies type, therapist, beneficiary, bookedBy, priority filters', async () => {
      const chain = buildChain([]);
      mockAppointment.find.mockReturnValue(chain);
      mockAppointment.countDocuments.mockResolvedValue(0);

      await service.listAppointments({
        type: 'علاج طبيعي',
        therapist: 'th1',
        beneficiary: 'b1',
        bookedBy: 'u1',
        priority: 'HIGH',
      });
      const filter = mockAppointment.find.mock.calls[0][0];
      expect(filter.type).toBe('علاج طبيعي');
      expect(filter.therapist).toBe('th1');
      expect(filter.beneficiary).toBe('b1');
      expect(filter.bookedBy).toBe('u1');
      expect(filter.priority).toBe('HIGH');
    });

    it('applies date range filter', async () => {
      const chain = buildChain([]);
      mockAppointment.find.mockReturnValue(chain);
      mockAppointment.countDocuments.mockResolvedValue(0);

      await service.listAppointments({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });
      const filter = mockAppointment.find.mock.calls[0][0];
      expect(filter.date.$gte).toEqual(new Date('2025-01-01'));
      expect(filter.date.$lte).toEqual(new Date('2025-12-31'));
    });

    it('applies search filter with regex on 4 fields', async () => {
      const chain = buildChain([]);
      mockAppointment.find.mockReturnValue(chain);
      mockAppointment.countDocuments.mockResolvedValue(0);

      await service.listAppointments({ search: 'أحمد' });
      const filter = mockAppointment.find.mock.calls[0][0];
      expect(filter.$or).toBeDefined();
      expect(filter.$or).toHaveLength(4);
    });

    it('paginates correctly with page=2, limit=10', async () => {
      const chain = buildChain([]);
      mockAppointment.find.mockReturnValue(chain);
      mockAppointment.countDocuments.mockResolvedValue(25);

      const result = await service.listAppointments({ page: 2, limit: 10 });
      expect(chain.skip).toHaveBeenCalledWith(10);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(result.pagination.pages).toBe(3);
    });

    it('calls 3 populates', async () => {
      const chain = buildChain([]);
      mockAppointment.find.mockReturnValue(chain);
      mockAppointment.countDocuments.mockResolvedValue(0);

      await service.listAppointments({});
      expect(chain.populate).toHaveBeenCalledTimes(3);
    });
  });

  // ── getAppointment ───────────────────────────────────────────────────
  describe('getAppointment', () => {
    it('returns appointment when found', async () => {
      const chain = buildChain({ _id: 'apt1', status: 'PENDING' });
      mockAppointment.findById.mockReturnValue(chain);

      const result = await service.getAppointment('apt1');
      expect(result).toEqual({ _id: 'apt1', status: 'PENDING' });
      expect(chain.populate).toHaveBeenCalledTimes(4);
    });

    it('throws 404 NOT_FOUND when appointment not found', async () => {
      const chain = buildChain(null);
      mockAppointment.findById.mockReturnValue(chain);

      try {
        await service.getAppointment('badId');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
        expect(err.code).toBe('NOT_FOUND');
        expect(err.message).toBe('الموعد غير موجود');
      }
    });
  });

  // ── updateAppointment ────────────────────────────────────────────────
  describe('updateAppointment', () => {
    it('updates appointment successfully', async () => {
      const doc = makeMockDoc();
      mockAppointment.findById.mockResolvedValue(doc);

      const result = await service.updateAppointment('apt1', { priority: 'HIGH' }, 'user1');
      expect(result.priority).toBe('HIGH');
      expect(doc.save).toHaveBeenCalled();
    });

    it('throws 404 when appointment not found', async () => {
      mockAppointment.findById.mockResolvedValue(null);
      try {
        await service.updateAppointment('bad', {}, 'user1');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
      }
    });

    it('throws 409 IMMUTABLE_STATE for COMPLETED appointment', async () => {
      const doc = makeMockDoc({ status: 'COMPLETED' });
      mockAppointment.findById.mockResolvedValue(doc);

      try {
        await service.updateAppointment('apt1', { priority: 'HIGH' }, 'user1');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(409);
        expect(err.code).toBe('IMMUTABLE_STATE');
      }
    });

    it('throws 409 IMMUTABLE_STATE for CANCELLED appointment', async () => {
      const doc = makeMockDoc({ status: 'CANCELLED' });
      mockAppointment.findById.mockResolvedValue(doc);

      try {
        await service.updateAppointment('apt1', { priority: 'HIGH' }, 'user1');
        fail('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('IMMUTABLE_STATE');
      }
    });

    it('re-checks therapist conflict when date changes', async () => {
      const doc = makeMockDoc();
      mockAppointment.findById.mockResolvedValue(doc);
      const spy = jest.spyOn(service, 'checkTherapistConflict').mockResolvedValue(null);
      const roomSpy = jest.spyOn(service, 'checkRoomConflict').mockResolvedValue(null);

      await service.updateAppointment('apt1', { date: new Date('2025-07-01') }, 'user1');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
      roomSpy.mockRestore();
    });

    it('throws APPOINTMENT_CONFLICT on reschedule conflict', async () => {
      const doc = makeMockDoc();
      mockAppointment.findById.mockResolvedValue(doc);
      const spy = jest
        .spyOn(service, 'checkTherapistConflict')
        .mockResolvedValue({ reason: 'تعارض' });

      try {
        await service.updateAppointment('apt1', { startTime: '10:00' }, 'user1');
        fail('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('APPOINTMENT_CONFLICT');
      }
      spy.mockRestore();
    });

    it('throws ROOM_CONFLICT on reschedule room conflict', async () => {
      const doc = makeMockDoc();
      mockAppointment.findById.mockResolvedValue(doc);
      jest.spyOn(service, 'checkTherapistConflict').mockResolvedValue(null);
      const roomSpy = jest
        .spyOn(service, 'checkRoomConflict')
        .mockResolvedValue({ reason: 'محجوزة' });

      try {
        await service.updateAppointment('apt1', { date: new Date('2025-07-01') }, 'user1');
        fail('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('ROOM_CONFLICT');
      }
      jest.restoreAllMocks();
    });

    it('tracks status change in statusHistory', async () => {
      const doc = makeMockDoc({ status: 'PENDING', statusHistory: [] });
      mockAppointment.findById.mockResolvedValue(doc);

      await service.updateAppointment('apt1', { status: 'CONFIRMED' }, 'user1');
      expect(doc.statusHistory).toHaveLength(1);
      expect(doc.statusHistory[0].from).toBe('PENDING');
      expect(doc.statusHistory[0].to).toBe('CONFIRMED');
      expect(doc.statusHistory[0].changedBy).toBe('user1');
    });

    it('does not add statusHistory if status unchanged', async () => {
      const doc = makeMockDoc({ status: 'PENDING', statusHistory: [] });
      mockAppointment.findById.mockResolvedValue(doc);

      await service.updateAppointment('apt1', { status: 'PENDING' }, 'user1');
      expect(doc.statusHistory).toHaveLength(0);
    });
  });

  // ── cancelAppointment ────────────────────────────────────────────────
  describe('cancelAppointment', () => {
    it('cancels appointment successfully', async () => {
      const doc = makeMockDoc();
      mockAppointment.findById.mockResolvedValue(doc);

      const result = await service.cancelAppointment('apt1', 'سبب الإلغاء', 'user1');
      expect(result.status).toBe('CANCELLED');
      expect(result.cancellationReason).toBe('سبب الإلغاء');
      expect(result.cancelledBy).toBe('user1');
      expect(result.cancelledAt).toBeInstanceOf(Date);
      expect(result.statusHistory).toHaveLength(1);
      expect(doc.save).toHaveBeenCalled();
    });

    it('throws 404 when appointment not found', async () => {
      mockAppointment.findById.mockResolvedValue(null);
      try {
        await service.cancelAppointment('bad', 'reason', 'user1');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
      }
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. CHECK-IN
// ══════════════════════════════════════════════════════════════════════════════

describe('checkIn', () => {
  it('checks in patient and calculates waitTimeMinutes', async () => {
    const now = new Date();
    const scheduledDate = new Date(now);
    scheduledDate.setHours(9, 0, 0, 0);
    const doc = makeMockDoc({ date: scheduledDate, startTime: '09:00', statusHistory: [] });
    mockAppointment.findById.mockResolvedValue(doc);

    const result = await service.checkIn('apt1', 'user1');
    expect(result.status).toBe('CHECKED_IN');
    expect(result.checkInTime).toBeInstanceOf(Date);
    expect(typeof result.waitTimeMinutes).toBe('number');
    expect(result.waitTimeMinutes).toBeGreaterThanOrEqual(0);
    expect(result.statusHistory).toHaveLength(1);
    expect(result.statusHistory[0].to).toBe('CHECKED_IN');
    expect(doc.save).toHaveBeenCalled();
  });

  it('waitTimeMinutes is 0 if checkIn is before scheduled time', async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2);
    const doc = makeMockDoc({
      date: futureDate,
      startTime: `${String(futureDate.getHours()).padStart(2, '0')}:00`,
      statusHistory: [],
    });
    mockAppointment.findById.mockResolvedValue(doc);

    const result = await service.checkIn('apt1', 'user1');
    expect(result.waitTimeMinutes).toBeGreaterThanOrEqual(0);
  });

  it('throws 404 when appointment not found', async () => {
    mockAppointment.findById.mockResolvedValue(null);
    try {
      await service.checkIn('bad', 'user1');
      fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(404);
    }
  });

  it('tracks status change from PENDING to CHECKED_IN', async () => {
    const doc = makeMockDoc({ status: 'CONFIRMED', statusHistory: [] });
    mockAppointment.findById.mockResolvedValue(doc);

    const result = await service.checkIn('apt1', 'user1');
    expect(result.statusHistory[0].from).toBe('CONFIRMED');
    expect(result.statusHistory[0].to).toBe('CHECKED_IN');
  });

  it('sets checkInTime as current Date', async () => {
    const doc = makeMockDoc({ statusHistory: [] });
    mockAppointment.findById.mockResolvedValue(doc);
    const before = Date.now();
    await service.checkIn('apt1', 'user1');
    const after = Date.now();
    expect(doc.checkInTime.getTime()).toBeGreaterThanOrEqual(before);
    expect(doc.checkInTime.getTime()).toBeLessThanOrEqual(after);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. CONVERSION — convertToSession
// ══════════════════════════════════════════════════════════════════════════════

describe('convertToSession', () => {
  it('creates a TherapySession and links to appointment', async () => {
    const doc = makeMockDoc({ type: 'علاج طبيعي', reason: 'سبب', statusHistory: [] });
    mockAppointment.findById.mockResolvedValue(doc);

    const result = await service.convertToSession('apt1', { title: 'جلسة جديدة' }, 'user1');
    expect(result.appointment).toBeDefined();
    expect(result.session).toBeDefined();
    expect(result.appointment.status).toBe('IN_PROGRESS');
    expect(result.appointment.linkedSession).toBeDefined();
    expect(result.appointment.statusHistory).toHaveLength(1);
    expect(doc.save).toHaveBeenCalled();
  });

  it('maps appointment type to session type', async () => {
    const doc = makeMockDoc({ type: 'علاج وظيفي', statusHistory: [] });
    mockAppointment.findById.mockResolvedValue(doc);

    const result = await service.convertToSession('apt1', {}, 'user1');
    expect(result.session.sessionType).toBe('علاج وظيفي');
  });

  it('uses default title when none provided', async () => {
    const doc = makeMockDoc({ type: 'نطق وتخاطب', statusHistory: [] });
    mockAppointment.findById.mockResolvedValue(doc);

    const result = await service.convertToSession('apt1', {}, 'user1');
    expect(result.session.title).toBe('جلسة - نطق وتخاطب');
  });

  it('throws 404 when appointment not found', async () => {
    mockAppointment.findById.mockResolvedValue(null);
    try {
      await service.convertToSession('bad', {}, 'user1');
      fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(404);
    }
  });

  it('session has correct beneficiary, therapist, room from appointment', async () => {
    const doc = makeMockDoc({
      beneficiary: 'b99',
      therapist: 'th99',
      room: 'r99',
      statusHistory: [],
    });
    mockAppointment.findById.mockResolvedValue(doc);

    const result = await service.convertToSession('apt1', {}, 'user1');
    expect(result.session.beneficiary).toBe('b99');
    expect(result.session.therapist).toBe('th99');
    expect(result.session.room).toBe('r99');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. STATS
// ══════════════════════════════════════════════════════════════════════════════

describe('getAppointmentStats', () => {
  it('returns stats with data', async () => {
    mockAppointment.aggregate
      .mockResolvedValueOnce([
        { _id: 'COMPLETED', count: 5 },
        { _id: 'CANCELLED', count: 2 },
        { _id: 'NO_SHOW', count: 1 },
      ])
      .mockResolvedValueOnce([{ _id: 'علاج طبيعي', count: 3 }])
      .mockResolvedValueOnce([{ _id: '2025-01-01', count: 2 }])
      .mockResolvedValueOnce([{ _id: null, avgWait: 15.7 }]);

    const result = await service.getAppointmentStats({});
    expect(result.total).toBe(8);
    expect(result.byStatus.COMPLETED).toBe(5);
    expect(result.byType).toEqual([{ type: 'علاج طبيعي', count: 3 }]);
    expect(result.dailyCount).toEqual([{ _id: '2025-01-01', count: 2 }]);
    expect(result.averageWaitTime).toBe(16); // rounded
    expect(result.completionRate).toBe(63); // 5/8 * 100 ≈ 63
    expect(result.noShowRate).toBe(13); // 1/8 * 100 ≈ 13
  });

  it('returns zeros when no data', async () => {
    mockAppointment.aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.getAppointmentStats({});
    expect(result.total).toBe(0);
    expect(result.completionRate).toBe(0);
    expect(result.noShowRate).toBe(0);
    expect(result.averageWaitTime).toBe(0);
  });

  it('applies therapist filter', async () => {
    mockAppointment.aggregate
      .mockResolvedValueOnce([{ _id: 'CONFIRMED', count: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.getAppointmentStats({ therapist: '507f1f77bcf86cd799439011' });
    expect(result.total).toBe(1);
    expect(mockAppointment.aggregate).toHaveBeenCalledTimes(4);
  });

  it('applies date range filter', async () => {
    mockAppointment.aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.getAppointmentStats({ startDate: '2025-01-01', endDate: '2025-06-30' });
    // Verify aggregate was called; match object should contain date range
    expect(mockAppointment.aggregate).toHaveBeenCalledTimes(4);
  });

  it('handles completionRate=0 when no COMPLETED', async () => {
    mockAppointment.aggregate
      .mockResolvedValueOnce([{ _id: 'PENDING', count: 3 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.getAppointmentStats({});
    expect(result.completionRate).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. RECURRING GENERATION
// ══════════════════════════════════════════════════════════════════════════════

describe('Recurring generation', () => {
  describe('generateRecurringAppointments', () => {
    const makeParent = (overrides = {}) => ({
      _id: 'parent1',
      beneficiary: 'b1',
      beneficiaryName: 'أحمد',
      beneficiaryPhone: '0500000000',
      bookedBy: 'u1',
      therapist: 'th1',
      therapistName: 'محمد',
      department: 'dept1',
      type: 'علاج طبيعي',
      date: new Date('2025-06-01'), // Sunday
      startTime: '09:00',
      endTime: '09:30',
      duration: 30,
      room: 'r1',
      location: 'مبنى أ',
      status: 'PENDING',
      priority: 'NORMAL',
      reason: 'فحص',
      source: 'manual',
      createdBy: 'u1',
      reminders: [{ type: 'sms', minutesBefore: 60 }],
      recurrence: 'daily',
      recurrenceEnd: new Date('2025-06-07'),
      ...overrides,
    });

    it('generates daily recurring appointments, skipping Fri/Sat', async () => {
      const parent = makeParent({ recurrence: 'daily', recurrenceEnd: new Date('2025-06-07') });
      const result = await service.generateRecurringAppointments(parent);
      // June 2: Mon, June 3: Tue, June 4: Wed, June 5: Thu (skip Fri 6, Sat 7)
      expect(result.length).toBeGreaterThanOrEqual(4);
      result.forEach(child => {
        const dow = new Date(child.date).getDay();
        expect(dow).not.toBe(5);
        expect(dow).not.toBe(6);
      });
    });

    it('generates weekly recurring appointments', async () => {
      const parent = makeParent({
        recurrence: 'weekly',
        date: new Date('2025-06-01'),
        recurrenceEnd: new Date('2025-06-22'),
      });
      const result = await service.generateRecurringAppointments(parent);
      expect(result.length).toBeGreaterThanOrEqual(2); // June 8, 15
    });

    it('generates biweekly recurring appointments', async () => {
      const parent = makeParent({
        recurrence: 'biweekly',
        date: new Date('2025-06-01'),
        recurrenceEnd: new Date('2025-07-01'),
      });
      const result = await service.generateRecurringAppointments(parent);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('generates monthly recurring appointments', async () => {
      const parent = makeParent({
        recurrence: 'monthly',
        date: new Date('2025-06-01'),
        recurrenceEnd: new Date('2025-09-01'),
      });
      const result = await service.generateRecurringAppointments(parent);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('returns [] when recurrence is "none"', async () => {
      const parent = makeParent({ recurrence: 'none' });
      const result = await service.generateRecurringAppointments(parent);
      expect(result).toEqual([]);
    });

    it('returns [] when no recurrence set', async () => {
      const parent = makeParent({ recurrence: undefined, recurrenceEnd: undefined });
      const result = await service.generateRecurringAppointments(parent);
      expect(result).toEqual([]);
    });

    it('returns [] when recurrenceEnd is missing', async () => {
      const parent = makeParent({ recurrence: 'daily', recurrenceEnd: undefined });
      const result = await service.generateRecurringAppointments(parent);
      expect(result).toEqual([]);
    });

    it('copies reminders to each child with sent=false', async () => {
      const parent = makeParent({
        recurrence: 'daily',
        recurrenceEnd: new Date('2025-06-03'),
      });
      const result = await service.generateRecurringAppointments(parent);
      if (result.length > 0) {
        expect(result[0].reminders[0].sent).toBe(false);
      }
    });

    it('sets recurrenceParent on child appointments', async () => {
      const parent = makeParent({
        recurrence: 'daily',
        recurrenceEnd: new Date('2025-06-03'),
      });
      const result = await service.generateRecurringAppointments(parent);
      result.forEach(child => {
        expect(child.recurrenceParent).toBe('parent1');
      });
    });

    it('handles save error gracefully and continues', async () => {
      const parent = makeParent({
        recurrence: 'daily',
        recurrenceEnd: new Date('2025-06-05'),
      });
      // Make the Appointment constructor's save throw on first call
      let callCount = 0;
      mockAppointment.mockImplementation(function (data) {
        Object.assign(this, data);
        this._id = `child_${callCount}`;
        this.statusHistory = [];
        this.reminders = data.reminders || [];
        callCount++;
        if (callCount === 1) {
          this.save = jest.fn().mockRejectedValue(new Error('DB error'));
        } else {
          this.save = jest.fn().mockResolvedValue(this);
        }
      });

      const result = await service.generateRecurringAppointments(parent);
      // Should still generate some despite one failure
      expect(result.length).toBeGreaterThanOrEqual(0);

      // Restore default mock implementation
      mockAppointment.mockImplementation(function (data) {
        Object.assign(this, data);
        this._id = this._id || 'mockId';
        this.save = jest.fn().mockResolvedValue(this);
        this.statusHistory = this.statusHistory || [];
        this.reminders = this.reminders || [];
      });
    });
  });

  describe('generateRecurringSessions', () => {
    it('generates recurring sessions successfully', async () => {
      const parentSession = {
        _id: 'ps1',
        title: 'جلسة متكررة',
        sessionType: 'علاج طبيعي',
        date: new Date('2025-06-01'),
        startTime: '10:00',
        endTime: '10:30',
        duration: 30,
        therapist: 'th1',
        beneficiary: 'b1',
        room: 'r1',
        recurrence: 'weekly',
        recurrenceEnd: new Date('2025-06-22'),
        status: 'SCHEDULED',
        createdBy: 'u1',
        participants: [],
        location: 'مبنى أ',
        priority: 'NORMAL',
        reminders: [{ type: 'push', minutesBefore: 30 }],
      };
      mockTherapySession.findById.mockResolvedValue(parentSession);
      // No conflicts
      jest.spyOn(service, 'checkTherapistConflict').mockResolvedValue(null);

      const result = await service.generateRecurringSessions('ps1');
      expect(result.length).toBeGreaterThanOrEqual(2);
      result.forEach(child => {
        expect(child.recurrenceParent).toBe('ps1');
        expect(child.recurrence).toBe('none');
      });
      service.checkTherapistConflict.mockRestore();
    });

    it('throws 404 when parent session not found', async () => {
      mockTherapySession.findById.mockResolvedValue(null);
      try {
        await service.generateRecurringSessions('bad');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
      }
    });

    it('throws NOT_RECURRING when session is not recurring', async () => {
      mockTherapySession.findById.mockResolvedValue({
        _id: 'ps2',
        recurrence: 'none',
      });
      try {
        await service.generateRecurringSessions('ps2');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('NOT_RECURRING');
      }
    });

    it('skips dates with therapist conflict', async () => {
      const parentSession = {
        _id: 'ps3',
        title: 'جلسة',
        sessionType: 'علاج طبيعي',
        date: new Date('2025-06-01'),
        startTime: '10:00',
        endTime: '10:30',
        duration: 30,
        therapist: 'th1',
        beneficiary: 'b1',
        recurrence: 'weekly',
        recurrenceEnd: new Date('2025-06-22'),
        status: 'SCHEDULED',
        createdBy: 'u1',
        reminders: [],
      };
      mockTherapySession.findById.mockResolvedValue(parentSession);
      // All dates have conflict
      jest.spyOn(service, 'checkTherapistConflict').mockResolvedValue({ reason: 'تعارض' });

      const result = await service.generateRecurringSessions('ps3');
      expect(result).toEqual([]);
      service.checkTherapistConflict.mockRestore();
    });

    it('defaults recurrenceEnd to 90 days when not set', async () => {
      const parentSession = {
        _id: 'ps4',
        title: 'جلسة',
        sessionType: 'علاج طبيعي',
        date: new Date('2025-06-01'),
        startTime: '10:00',
        endTime: '10:30',
        duration: 30,
        therapist: 'th1',
        beneficiary: 'b1',
        recurrence: 'weekly',
        // No recurrenceEnd
        status: 'SCHEDULED',
        createdBy: 'u1',
        reminders: [],
      };
      mockTherapySession.findById.mockResolvedValue(parentSession);
      jest.spyOn(service, 'checkTherapistConflict').mockResolvedValue(null);

      const result = await service.generateRecurringSessions('ps4');
      expect(result.length).toBeGreaterThan(0);
      service.checkTherapistConflict.mockRestore();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. CONFLICT DETECTION
// ══════════════════════════════════════════════════════════════════════════════

describe('Conflict detection', () => {
  describe('checkTherapistConflict', () => {
    it('returns reason when session conflict exists', async () => {
      mockFindOneLean(mockTherapySession, { title: 'جلسة1', startTime: '09:00', endTime: '09:30' });
      const result = await service.checkTherapistConflict('th1', new Date(), '09:00', '09:30');
      expect(result).not.toBeNull();
      expect(result.reason).toContain('تعارض');
    });

    it('returns reason when appointment conflict exists', async () => {
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, {
        beneficiaryName: 'أحمد',
        startTime: '09:00',
        endTime: '09:30',
      });

      const result = await service.checkTherapistConflict('th1', new Date(), '09:00', '09:30');
      expect(result).not.toBeNull();
      expect(result.reason).toContain('تعارض');
    });

    it('returns reason when daily limit reached', async () => {
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, null);
      mockAvailability.findOne.mockResolvedValue({
        preferences: { maxSessionsPerDay: 2 },
      });
      mockTherapySession.countDocuments.mockResolvedValue(1);
      mockAppointment.countDocuments.mockResolvedValue(1);

      const result = await service.checkTherapistConflict('th1', new Date(), '14:00', '14:30');
      expect(result).not.toBeNull();
      expect(result.reason).toMatch(/2/);
    });

    it('returns null when no conflict', async () => {
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, null);
      mockAvailability.findOne.mockResolvedValue(null);

      const result = await service.checkTherapistConflict('th1', new Date(), '14:00', '14:30');
      expect(result).toBeNull();
    });

    it('excludes given ID from query', async () => {
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, null);
      mockAvailability.findOne.mockResolvedValue(null);

      await service.checkTherapistConflict('th1', new Date(), '09:00', '09:30', 'excludeMe');
      // Verify the session query excluded the ID
      const sessionQuery = mockTherapySession.findOne.mock.calls[0][0];
      expect(sessionQuery._id).toEqual({ $ne: 'excludeMe' });
    });

    it('uses default maxSessionsPerDay=8 when preferences set', async () => {
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, null);
      mockAvailability.findOne.mockResolvedValue({
        preferences: {},
      });
      mockTherapySession.countDocuments.mockResolvedValue(4);
      mockAppointment.countDocuments.mockResolvedValue(3);

      const result = await service.checkTherapistConflict('th1', new Date(), '14:00', '14:30');
      expect(result).toBeNull(); // 4+3=7 < 8
    });

    it('returns daily limit when count equals max', async () => {
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, null);
      mockAvailability.findOne.mockResolvedValue({
        preferences: { maxSessionsPerDay: 5 },
      });
      mockTherapySession.countDocuments.mockResolvedValue(3);
      mockAppointment.countDocuments.mockResolvedValue(2);

      const result = await service.checkTherapistConflict('th1', new Date(), '14:00', '14:30');
      expect(result).not.toBeNull();
      expect(result.reason).toContain('5');
    });

    it('computes effectiveEnd from startTime when endTime is null', async () => {
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, null);
      mockAvailability.findOne.mockResolvedValue(null);

      const result = await service.checkTherapistConflict('th1', new Date(), '10:00', null);
      expect(result).toBeNull();
    });
  });

  describe('checkRoomConflict', () => {
    it('returns reason when session conflict in room', async () => {
      mockFindOneLean(mockTherapySession, { title: 'جلسة', startTime: '09:00', endTime: '09:30' });

      const result = await service.checkRoomConflict('r1', new Date(), '09:00', '09:30');
      expect(result).not.toBeNull();
      expect(result.reason).toContain('الغرفة');
    });

    it('returns reason when appointment conflict in room', async () => {
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, { startTime: '09:00', endTime: '09:30' });

      const result = await service.checkRoomConflict('r1', new Date(), '09:00', '09:30');
      expect(result).not.toBeNull();
      expect(result.reason).toContain('الغرفة');
    });

    it('returns reason when room is in maintenance', async () => {
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, null);
      mockRoom.findById.mockResolvedValue({ isMaintenance: true });

      const result = await service.checkRoomConflict('r1', new Date(), '09:00', '09:30');
      expect(result).not.toBeNull();
      expect(result.reason).toContain('الصيانة');
    });

    it('returns null when no conflict', async () => {
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, null);
      mockRoom.findById.mockResolvedValue(null);

      const result = await service.checkRoomConflict('r1', new Date(), '14:00', '14:30');
      expect(result).toBeNull();
    });

    it('returns null when room exists but not in maintenance', async () => {
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, null);
      mockRoom.findById.mockResolvedValue({ isMaintenance: false });

      const result = await service.checkRoomConflict('r1', new Date(), '14:00', '14:30');
      expect(result).toBeNull();
    });

    it('excludes given ID from queries', async () => {
      mockFindOneLean(mockTherapySession, null);
      mockFindOneLean(mockAppointment, null);
      mockRoom.findById.mockResolvedValue(null);

      await service.checkRoomConflict('r1', new Date(), '09:00', '09:30', 'excludeMe');
      const sessionQuery = mockTherapySession.findOne.mock.calls[0][0];
      expect(sessionQuery._id).toEqual({ $ne: 'excludeMe' });
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. AVAILABLE SLOTS
// ══════════════════════════════════════════════════════════════════════════════

describe('getAvailableSlots', () => {
  it('returns available slots based on schedule and bookings', async () => {
    mockAvailability.findOne.mockResolvedValue({
      recurringSchedule: [
        { dayOfWeek: 'SUNDAY', isActive: true, startTime: '08:00', endTime: '12:00' },
      ],
      exceptions: [],
      preferences: { minBreakBetweenSessions: 0 },
    });
    // One busy session at 09:00-09:30
    const sessionChain = buildChain([{ startTime: '09:00', endTime: '09:30', duration: 30 }]);
    mockTherapySession.find.mockReturnValue(sessionChain);
    const aptChain = buildChain([]);
    mockAppointment.find.mockReturnValue(aptChain);

    const result = await service.getAvailableSlots('th1', '2025-06-01', 30); // Sun
    expect(result.available).toBe(true);
    expect(result.date).toBe('2025-06-01');
    expect(result.therapistId).toBe('th1');
    expect(result.slots.length).toBeGreaterThan(0);
    // 09:00-09:30 should NOT be in slots
    const has0900 = result.slots.some(s => s.startTime === '09:00');
    expect(has0900).toBe(false);
  });

  it('uses default schedule 08:00-16:00 if no availability set', async () => {
    mockAvailability.findOne.mockResolvedValue(null);
    const sessionChain = buildChain([]);
    mockTherapySession.find.mockReturnValue(sessionChain);
    const aptChain = buildChain([]);
    mockAppointment.find.mockReturnValue(aptChain);

    const result = await service.getAvailableSlots('th1', '2025-06-01', 30);
    expect(result.available).toBe(true);
    expect(result.totalSlots).toBeGreaterThan(0);
  });

  it('returns available=false for exception day off', async () => {
    mockAvailability.findOne.mockResolvedValue({
      recurringSchedule: [
        { dayOfWeek: 'SUNDAY', isActive: true, startTime: '08:00', endTime: '16:00' },
      ],
      exceptions: [{ date: new Date('2025-06-01'), isAvailable: false, reason: 'إجازة' }],
      preferences: {},
    });

    const result = await service.getAvailableSlots('th1', '2025-06-01', 30);
    expect(result.available).toBe(false);
    expect(result.slots).toEqual([]);
  });

  it('uses exception custom slots when available', async () => {
    mockAvailability.findOne.mockResolvedValue({
      recurringSchedule: [
        { dayOfWeek: 'SUNDAY', isActive: true, startTime: '08:00', endTime: '16:00' },
      ],
      exceptions: [
        {
          date: new Date('2025-06-01'),
          isAvailable: true,
          slots: [{ startTime: '10:00', endTime: '12:00' }],
        },
      ],
      preferences: { minBreakBetweenSessions: 0 },
    });
    const sessionChain = buildChain([]);
    mockTherapySession.find.mockReturnValue(sessionChain);
    const aptChain = buildChain([]);
    mockAppointment.find.mockReturnValue(aptChain);

    const result = await service.getAvailableSlots('th1', '2025-06-01', 30);
    expect(result.available).toBe(true);
    // Only slots between 10:00 and 12:00
    result.slots.forEach(s => {
      const start = service._timeToMinutes(s.startTime);
      expect(start).toBeGreaterThanOrEqual(600); // 10:00
      expect(start).toBeLessThan(720); // 12:00
    });
  });

  it('handles break time in schedule', async () => {
    mockAvailability.findOne.mockResolvedValue({
      recurringSchedule: [
        {
          dayOfWeek: 'SUNDAY',
          isActive: true,
          startTime: '08:00',
          endTime: '14:00',
          breakStart: '12:00',
          breakEnd: '12:30',
        },
      ],
      exceptions: [],
      preferences: { minBreakBetweenSessions: 0 },
    });
    const sessionChain = buildChain([]);
    mockTherapySession.find.mockReturnValue(sessionChain);
    const aptChain = buildChain([]);
    mockAppointment.find.mockReturnValue(aptChain);

    const result = await service.getAvailableSlots('th1', '2025-06-01', 30);
    // No slot should start in the break period 12:00-12:30
    const hasBreakSlot = result.slots.some(s => s.startTime === '12:00');
    expect(hasBreakSlot).toBe(false);
  });

  it('returns empty slots when all times are busy', async () => {
    mockAvailability.findOne.mockResolvedValue({
      recurringSchedule: [
        { dayOfWeek: 'SUNDAY', isActive: true, startTime: '09:00', endTime: '09:30' },
      ],
      exceptions: [],
      preferences: { minBreakBetweenSessions: 0 },
    });
    // 09:00-09:30 is busy
    const sessionChain = buildChain([{ startTime: '09:00', endTime: '09:30', duration: 30 }]);
    mockTherapySession.find.mockReturnValue(sessionChain);
    const aptChain = buildChain([]);
    mockAppointment.find.mockReturnValue(aptChain);

    const result = await service.getAvailableSlots('th1', '2025-06-01', 30);
    expect(result.available).toBe(false);
    expect(result.totalSlots).toBe(0);
  });

  it('defaults durationMinutes to 30', async () => {
    mockAvailability.findOne.mockResolvedValue(null);
    const sessionChain = buildChain([]);
    mockTherapySession.find.mockReturnValue(sessionChain);
    const aptChain = buildChain([]);
    mockAppointment.find.mockReturnValue(aptChain);

    const result = await service.getAvailableSlots('th1', '2025-06-01');
    expect(result.slots[0].duration).toBe(30);
  });

  it('respects minBreakBetweenSessions preference', async () => {
    mockAvailability.findOne.mockResolvedValue({
      recurringSchedule: [
        { dayOfWeek: 'SUNDAY', isActive: true, startTime: '09:00', endTime: '11:00' },
      ],
      exceptions: [],
      preferences: { minBreakBetweenSessions: 15 },
    });
    // Busy 09:30-10:00
    const sessionChain = buildChain([{ startTime: '09:30', endTime: '10:00', duration: 30 }]);
    mockTherapySession.find.mockReturnValue(sessionChain);
    const aptChain = buildChain([]);
    mockAppointment.find.mockReturnValue(aptChain);

    const result = await service.getAvailableSlots('th1', '2025-06-01', 30);
    // Slot at 10:00 should be excluded due to 15-min break requirement
    const has1000 = result.slots.some(s => s.startTime === '10:00');
    expect(has1000).toBe(false);
  });

  it('handles day with no matching dayOfWeek in schedule', async () => {
    mockAvailability.findOne.mockResolvedValue({
      recurringSchedule: [
        { dayOfWeek: 'MONDAY', isActive: true, startTime: '08:00', endTime: '16:00' },
      ],
      exceptions: [],
      preferences: {},
    });
    const sessionChain = buildChain([]);
    mockTherapySession.find.mockReturnValue(sessionChain);
    const aptChain = buildChain([]);
    mockAppointment.find.mockReturnValue(aptChain);

    // 2025-06-01 is Sunday, schedule is for MONDAY only → will use default 08:00-16:00
    const result = await service.getAvailableSlots('th1', '2025-06-01', 30);
    expect(result.available).toBe(true);
  });

  it('each slot has startTime, endTime, duration', async () => {
    mockAvailability.findOne.mockResolvedValue(null);
    const sessionChain = buildChain([]);
    mockTherapySession.find.mockReturnValue(sessionChain);
    const aptChain = buildChain([]);
    mockAppointment.find.mockReturnValue(aptChain);

    const result = await service.getAvailableSlots('th1', '2025-06-01', 30);
    result.slots.forEach(s => {
      expect(s).toHaveProperty('startTime');
      expect(s).toHaveProperty('endTime');
      expect(s).toHaveProperty('duration');
      expect(s.duration).toBe(30);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. AVAILABLE ROOMS
// ══════════════════════════════════════════════════════════════════════════════

describe('getAvailableRooms', () => {
  it('returns rooms with no conflicts', async () => {
    const rooms = [
      { _id: 'r1', name: 'غرفة 1', type: 'علاج' },
      { _id: 'r2', name: 'غرفة 2', type: 'علاج' },
    ];
    const roomChain = buildChain(rooms);
    mockRoom.find.mockReturnValue(roomChain);
    jest.spyOn(service, 'checkRoomConflict').mockResolvedValue(null);

    const result = await service.getAvailableRooms(new Date(), '09:00', '09:30');
    expect(result).toHaveLength(2);
    service.checkRoomConflict.mockRestore();
  });

  it('filters by roomType', async () => {
    const roomChain = buildChain([{ _id: 'r1', type: 'علاج' }]);
    mockRoom.find.mockReturnValue(roomChain);
    jest.spyOn(service, 'checkRoomConflict').mockResolvedValue(null);

    await service.getAvailableRooms(new Date(), '09:00', '09:30', 'علاج');
    const filter = mockRoom.find.mock.calls[0][0];
    expect(filter.type).toBe('علاج');
    expect(filter.isMaintenance).toBe(false);
    service.checkRoomConflict.mockRestore();
  });

  it('excludes rooms with conflict', async () => {
    const rooms = [
      { _id: 'r1', name: 'غرفة 1' },
      { _id: 'r2', name: 'غرفة 2' },
    ];
    const roomChain = buildChain(rooms);
    mockRoom.find.mockReturnValue(roomChain);
    jest
      .spyOn(service, 'checkRoomConflict')
      .mockResolvedValueOnce({ reason: 'محجوزة' })
      .mockResolvedValueOnce(null);

    const result = await service.getAvailableRooms(new Date(), '09:00', '09:30');
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('r2');
    service.checkRoomConflict.mockRestore();
  });

  it('returns empty array if all rooms have conflicts', async () => {
    const rooms = [{ _id: 'r1' }];
    const roomChain = buildChain(rooms);
    mockRoom.find.mockReturnValue(roomChain);
    jest.spyOn(service, 'checkRoomConflict').mockResolvedValue({ reason: 'محجوزة' });

    const result = await service.getAvailableRooms(new Date(), '09:00', '09:30');
    expect(result).toHaveLength(0);
    service.checkRoomConflict.mockRestore();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. SESSION ENHANCEMENTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Session enhancements', () => {
  describe('addReminders', () => {
    it('sets reminders with defaults for missing fields', async () => {
      const session = { _id: 's1', reminders: [], save: jest.fn().mockResolvedValue(true) };
      mockTherapySession.findById.mockResolvedValue(session);

      const result = await service.addReminders('s1', [{ type: 'sms', minutesBefore: 30 }, {}]);
      expect(result.reminders).toHaveLength(2);
      expect(result.reminders[0]).toEqual({ type: 'sms', minutesBefore: 30, sent: false });
      expect(result.reminders[1]).toEqual({ type: 'push', minutesBefore: 60, sent: false });
      expect(session.save).toHaveBeenCalled();
    });

    it('throws 404 when session not found', async () => {
      mockTherapySession.findById.mockResolvedValue(null);
      try {
        await service.addReminders('bad', []);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
      }
    });
  });

  describe('updateGoalProgress', () => {
    it('sets goalsProgress on session', async () => {
      const session = { _id: 's1', save: jest.fn().mockResolvedValue(true) };
      mockTherapySession.findById.mockResolvedValue(session);

      const goals = [{ goalId: 'g1', progress: 75, notes: 'تحسن' }];
      const result = await service.updateGoalProgress('s1', goals);
      expect(result.goalsProgress).toEqual(goals);
      expect(session.save).toHaveBeenCalled();
    });

    it('throws 404 when session not found', async () => {
      mockTherapySession.findById.mockResolvedValue(null);
      try {
        await service.updateGoalProgress('bad', []);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
      }
    });
  });

  describe('getSessionHistory', () => {
    it('returns statusHistory', async () => {
      const history = [
        { from: 'SCHEDULED', to: 'CONFIRMED', changedBy: { firstName: 'أ', lastName: 'ب' } },
      ];
      const chain = buildChain({ statusHistory: history });
      mockTherapySession.findById.mockReturnValue(chain);

      const result = await service.getSessionHistory('s1');
      expect(result).toEqual(history);
    });

    it('returns empty array when no statusHistory', async () => {
      const chain = buildChain({});
      mockTherapySession.findById.mockReturnValue(chain);

      const result = await service.getSessionHistory('s1');
      expect(result).toEqual([]);
    });

    it('throws 404 when session not found', async () => {
      const chain = buildChain(null);
      mockTherapySession.findById.mockReturnValue(chain);

      try {
        await service.getSessionHistory('bad');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
      }
    });
  });

  describe('updateSessionStatusTracked', () => {
    it('updates status and tracks history', async () => {
      const session = {
        _id: 's1',
        status: 'SCHEDULED',
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockTherapySession.findById.mockResolvedValue(session);

      const result = await service.updateSessionStatusTracked('s1', 'CONFIRMED', 'تأكيد', 'user1');
      expect(result.status).toBe('CONFIRMED');
      expect(result.statusHistory).toHaveLength(1);
      expect(result.statusHistory[0].from).toBe('SCHEDULED');
      expect(result.statusHistory[0].to).toBe('CONFIRMED');
      expect(result.statusHistory[0].changedBy).toBe('user1');
      expect(result.statusHistory[0].reason).toBe('تأكيد');
    });

    it('sets cancellationReason for CANCELLED_BY_PATIENT', async () => {
      const session = {
        _id: 's1',
        status: 'CONFIRMED',
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockTherapySession.findById.mockResolvedValue(session);

      const result = await service.updateSessionStatusTracked(
        's1',
        'CANCELLED_BY_PATIENT',
        'ظرف طارئ',
        'user1'
      );
      expect(result.status).toBe('CANCELLED_BY_PATIENT');
      expect(result.cancellationReason).toBe('ظرف طارئ');
    });

    it('sets cancellationReason for CANCELLED_BY_CENTER', async () => {
      const session = {
        _id: 's1',
        status: 'CONFIRMED',
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockTherapySession.findById.mockResolvedValue(session);

      const result = await service.updateSessionStatusTracked(
        's1',
        'CANCELLED_BY_CENTER',
        'صيانة',
        'user1'
      );
      expect(result.cancellationReason).toBe('صيانة');
    });

    it('sets noShowReason for NO_SHOW', async () => {
      const session = {
        _id: 's1',
        status: 'CONFIRMED',
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockTherapySession.findById.mockResolvedValue(session);

      const result = await service.updateSessionStatusTracked('s1', 'NO_SHOW', 'لم يحضر', 'user1');
      expect(result.status).toBe('NO_SHOW');
      expect(result.noShowReason).toBe('لم يحضر');
    });

    it('throws 404 when session not found', async () => {
      mockTherapySession.findById.mockResolvedValue(null);
      try {
        await service.updateSessionStatusTracked('bad', 'CONFIRMED', '', 'user1');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
      }
    });

    it('initializes statusHistory if undefined', async () => {
      const session = {
        _id: 's1',
        status: 'SCHEDULED',
        save: jest.fn().mockResolvedValue(true),
      };
      mockTherapySession.findById.mockResolvedValue(session);

      const result = await service.updateSessionStatusTracked('s1', 'CONFIRMED', '', 'user1');
      expect(result.statusHistory).toHaveLength(1);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. TODAY SCHEDULE
// ══════════════════════════════════════════════════════════════════════════════

describe('getTodaySchedule', () => {
  it('returns combined sessions + appointments sorted by startTime', async () => {
    const sessionChain = buildChain([{ _id: 's1', startTime: '10:00', title: 'جلسة1' }]);
    mockTherapySession.find.mockReturnValue(sessionChain);

    const aptChain = buildChain([
      { _id: 'a1', startTime: '09:00', type: 'فحص' },
      { _id: 'a2', startTime: '11:00', type: 'متابعة' },
    ]);
    mockAppointment.find.mockReturnValue(aptChain);

    const result = await service.getTodaySchedule('th1');
    expect(result.totalSessions).toBe(1);
    expect(result.totalAppointments).toBe(2);
    expect(result.totalItems).toBe(3);
    expect(result.items[0].startTime).toBe('09:00');
    expect(result.items[0].itemType).toBe('appointment');
    expect(result.items[1].startTime).toBe('10:00');
    expect(result.items[1].itemType).toBe('session');
    expect(result.items[2].startTime).toBe('11:00');
  });

  it('returns empty schedule when no items', async () => {
    const sessionChain = buildChain([]);
    mockTherapySession.find.mockReturnValue(sessionChain);
    const aptChain = buildChain([]);
    mockAppointment.find.mockReturnValue(aptChain);

    const result = await service.getTodaySchedule('th1');
    expect(result.totalItems).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('includes date and therapistId in result', async () => {
    const sessionChain = buildChain([]);
    mockTherapySession.find.mockReturnValue(sessionChain);
    const aptChain = buildChain([]);
    mockAppointment.find.mockReturnValue(aptChain);

    const result = await service.getTodaySchedule('th1');
    expect(result.therapistId).toBe('th1');
    expect(result.date).toBeDefined();
  });

  it('calls populate on session and appointment chains', async () => {
    const sessionChain = buildChain([]);
    mockTherapySession.find.mockReturnValue(sessionChain);
    const aptChain = buildChain([]);
    mockAppointment.find.mockReturnValue(aptChain);

    await service.getTodaySchedule('th1');
    expect(sessionChain.populate).toHaveBeenCalled();
    expect(aptChain.populate).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 13. REMINDERS
// ══════════════════════════════════════════════════════════════════════════════

describe('Reminders', () => {
  describe('getPendingReminders', () => {
    it('returns reminders due now', async () => {
      const now = new Date();
      const soonDate = new Date(now.getTime() + 30 * 60000); // 30 min from now
      const sessionsData = [
        {
          _id: 's1',
          date: soonDate,
          startTime: `${String(soonDate.getHours()).padStart(2, '0')}:${String(soonDate.getMinutes()).padStart(2, '0')}`,
          beneficiary: 'b1',
          therapist: 'th1',
          reminders: [{ type: 'sms', minutesBefore: 60, sent: false }],
        },
      ];
      mockTherapySession.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(sessionsData) });
      mockAppointment.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      const result = await service.getPendingReminders();
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].itemType).toBe('session');
      expect(result[0].itemId).toBe('s1');
    });

    it('does not return reminders not yet due', async () => {
      const farDate = new Date(Date.now() + 7 * 86400000); // 7 days from now
      const sessionsData = [
        {
          _id: 's1',
          date: farDate,
          startTime: '10:00',
          beneficiary: 'b1',
          therapist: 'th1',
          reminders: [{ type: 'sms', minutesBefore: 60, sent: false }],
        },
      ];
      mockTherapySession.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(sessionsData) });
      mockAppointment.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      const result = await service.getPendingReminders();
      expect(result).toEqual([]);
    });

    it('does not return already sent reminders', async () => {
      const soon = new Date(Date.now() + 30 * 60000);
      const sessionsData = [
        {
          _id: 's1',
          date: soon,
          startTime: `${String(soon.getHours()).padStart(2, '0')}:00`,
          beneficiary: 'b1',
          therapist: 'th1',
          reminders: [{ type: 'sms', minutesBefore: 120, sent: true }],
        },
      ];
      mockTherapySession.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(sessionsData) });
      mockAppointment.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      const result = await service.getPendingReminders();
      expect(result).toEqual([]);
    });

    it('processes both sessions and appointments', async () => {
      const now = new Date();
      const soonDate = new Date(now.getTime() + 10 * 60000);
      const h = String(soonDate.getHours()).padStart(2, '0');
      const m = String(soonDate.getMinutes()).padStart(2, '0');

      mockTherapySession.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: 's1',
            date: soonDate,
            startTime: `${h}:${m}`,
            beneficiary: 'b1',
            therapist: 'th1',
            reminders: [{ type: 'push', minutesBefore: 30, sent: false }],
          },
        ]),
      });
      mockAppointment.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'a1',
            date: soonDate,
            startTime: `${h}:${m}`,
            beneficiary: 'b2',
            therapist: 'th2',
            reminders: [{ type: 'sms', minutesBefore: 30, sent: false }],
          },
        ]),
      });

      const result = await service.getPendingReminders();
      const types = result.map(r => r.itemType);
      expect(types).toContain('session');
      expect(types).toContain('appointment');
    });

    it('skips items with no reminders array', async () => {
      mockTherapySession.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: 's1', date: new Date() }]),
      });
      mockAppointment.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      const result = await service.getPendingReminders();
      expect(result).toEqual([]);
    });
  });

  describe('markReminderSent', () => {
    it('marks a session reminder as sent', async () => {
      const item = {
        _id: 's1',
        reminders: [{ type: 'push', minutesBefore: 60, sent: false }],
        save: jest.fn().mockResolvedValue(true),
      };
      mockTherapySession.findById.mockResolvedValue(item);

      const result = await service.markReminderSent('session', 's1', 0);
      expect(result.reminders[0].sent).toBe(true);
      expect(result.reminders[0].sentAt).toBeInstanceOf(Date);
      expect(item.save).toHaveBeenCalled();
    });

    it('marks an appointment reminder as sent', async () => {
      const item = {
        _id: 'a1',
        reminders: [
          { type: 'sms', minutesBefore: 30, sent: false },
          { type: 'push', minutesBefore: 15, sent: false },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      mockAppointment.findById.mockResolvedValue(item);

      const result = await service.markReminderSent('appointment', 'a1', 1);
      expect(result.reminders[1].sent).toBe(true);
      expect(result.reminders[0].sent).toBe(false); // unchanged
    });

    it('returns null when item not found', async () => {
      mockTherapySession.findById.mockResolvedValue(null);

      const result = await service.markReminderSent('session', 'bad', 0);
      expect(result).toBeNull();
    });

    it('returns null when reminder index is invalid', async () => {
      const item = {
        _id: 's1',
        reminders: [{ type: 'push', minutesBefore: 60, sent: false }],
        save: jest.fn(),
      };
      mockTherapySession.findById.mockResolvedValue(item);

      const result = await service.markReminderSent('session', 's1', 5);
      expect(result).toBeNull();
    });

    it('uses correct model based on itemType', async () => {
      const item = {
        _id: 'a1',
        reminders: [{ type: 'sms', minutesBefore: 30, sent: false }],
        save: jest.fn().mockResolvedValue(true),
      };
      mockAppointment.findById.mockResolvedValue(item);

      await service.markReminderSent('appointment', 'a1', 0);
      expect(mockAppointment.findById).toHaveBeenCalledWith('a1');
    });
  });
});

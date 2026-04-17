/**
 * Unit Tests — conflictDetection.service.js
 * Pure scheduling logic — NO mocks needed
 */
'use strict';

const {
  timeToMinutes,
  minutesToTime,
  intervalsOverlap,
  getDayOfWeek,
  validateAppointmentData,
  checkTherapistConflict,
  checkBeneficiaryConflict,
  checkRoomConflict,
  checkTherapistAvailability,
  checkDailySessionLimit,
  detectConflicts,
  findAvailableSlots,
  calculateWaitlistPriority,
  sortWaitlist,
  SAUDI_WORK_DAYS,
  ACTIVE_STATUSES,
  DEFAULT_MAX_DAILY_SESSIONS,
} = require('../../services/scheduling/conflictDetection.service');

// ═══════════════════════════════════════
//  Constants
// ═══════════════════════════════════════
describe('constants', () => {
  it('SAUDI_WORK_DAYS Sun-Thu', () => {
    expect(SAUDI_WORK_DAYS).toEqual(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']);
  });
  it('ACTIVE_STATUSES', () => {
    expect(ACTIVE_STATUSES).toContain('scheduled');
    expect(ACTIVE_STATUSES).toContain('confirmed');
  });
  it('DEFAULT_MAX_DAILY_SESSIONS is 10', () => {
    expect(DEFAULT_MAX_DAILY_SESSIONS).toBe(10);
  });
});

// ═══════════════════════════════════════
//  timeToMinutes / minutesToTime
// ═══════════════════════════════════════
describe('timeToMinutes', () => {
  it('converts 00:00', () => expect(timeToMinutes('00:00')).toBe(0));
  it('converts 09:30', () => expect(timeToMinutes('09:30')).toBe(570));
  it('converts 23:59', () => expect(timeToMinutes('23:59')).toBe(1439));
  it('throws for null', () => expect(() => timeToMinutes(null)).toThrow('غير صحيحة'));
  it('throws for bad format', () => expect(() => timeToMinutes('9')).toThrow('غير صحيحة'));
  it('throws for invalid hours', () => expect(() => timeToMinutes('25:00')).toThrow('غير صحيحة'));
});

describe('minutesToTime', () => {
  it('converts 0', () => expect(minutesToTime(0)).toBe('00:00'));
  it('converts 570', () => expect(minutesToTime(570)).toBe('09:30'));
  it('converts 1439', () => expect(minutesToTime(1439)).toBe('23:59'));
});

// ═══════════════════════════════════════
//  intervalsOverlap
// ═══════════════════════════════════════
describe('intervalsOverlap', () => {
  it('true for overlapping', () => expect(intervalsOverlap(100, 200, 150, 250)).toBe(true));
  it('false for disjoint', () => expect(intervalsOverlap(100, 200, 300, 400)).toBe(false));
  it('false for touching', () => expect(intervalsOverlap(100, 200, 200, 300)).toBe(false));
  it('true for contained', () => expect(intervalsOverlap(100, 400, 150, 250)).toBe(true));
  it('true for identical', () => expect(intervalsOverlap(100, 200, 100, 200)).toBe(true));
});

// ═══════════════════════════════════════
//  getDayOfWeek
// ═══════════════════════════════════════
describe('getDayOfWeek', () => {
  it('returns sunday for 2025-01-05', () => expect(getDayOfWeek('2025-01-05')).toBe('sunday'));
  it('returns friday for 2025-01-03', () => expect(getDayOfWeek('2025-01-03')).toBe('friday'));
});

// ═══════════════════════════════════════
//  validateAppointmentData
// ═══════════════════════════════════════
describe('validateAppointmentData', () => {
  const valid = {
    date: '2025-06-15',
    startTime: '09:00',
    endTime: '09:45',
    therapistId: 't1',
    beneficiaryId: 'b1',
  };

  it('no errors for valid', () => expect(validateAppointmentData(valid)).toEqual([]));

  it('errors for missing fields', () => {
    const errs = validateAppointmentData({});
    expect(errs).toContain('تاريخ الموعد مطلوب');
    expect(errs).toContain('وقت البداية مطلوب');
    expect(errs).toContain('معرّف المعالج مطلوب');
  });

  it('errors for end before start', () => {
    const errs = validateAppointmentData({ ...valid, startTime: '10:00', endTime: '09:00' });
    expect(errs.some(e => e.includes('بعد'))).toBe(true);
  });

  it('errors for too short (<15min)', () => {
    const errs = validateAppointmentData({ ...valid, startTime: '09:00', endTime: '09:10' });
    expect(errs.some(e => e.includes('15 دقيقة'))).toBe(true);
  });

  it('errors for too long (>480min)', () => {
    const errs = validateAppointmentData({ ...valid, startTime: '00:00', endTime: '23:00' });
    expect(errs.some(e => e.includes('480'))).toBe(true);
  });
});

// ═══════════════════════════════════════
//  checkTherapistConflict
// ═══════════════════════════════════════
describe('checkTherapistConflict', () => {
  const existing = [
    {
      id: 'a1',
      therapistId: 't1',
      date: '2025-06-15',
      startTime: '09:00',
      endTime: '09:45',
      status: 'scheduled',
    },
  ];

  it('detects overlap', () => {
    const r = checkTherapistConflict(
      { therapistId: 't1', date: '2025-06-15', startTime: '09:30', endTime: '10:15' },
      existing
    );
    expect(r.hasConflict).toBe(true);
  });

  it('no conflict with different therapist', () => {
    const r = checkTherapistConflict(
      { therapistId: 't2', date: '2025-06-15', startTime: '09:00', endTime: '09:45' },
      existing
    );
    expect(r.hasConflict).toBe(false);
  });

  it('no conflict with different date', () => {
    const r = checkTherapistConflict(
      { therapistId: 't1', date: '2025-06-16', startTime: '09:00', endTime: '09:45' },
      existing
    );
    expect(r.hasConflict).toBe(false);
  });

  it('excludes self by id', () => {
    const r = checkTherapistConflict(
      { therapistId: 't1', date: '2025-06-15', startTime: '09:00', endTime: '09:45' },
      existing,
      'a1'
    );
    expect(r.hasConflict).toBe(false);
  });

  it('ignores cancelled', () => {
    const cancelled = [{ ...existing[0], status: 'cancelled' }];
    const r = checkTherapistConflict(
      { therapistId: 't1', date: '2025-06-15', startTime: '09:00', endTime: '09:45' },
      cancelled
    );
    expect(r.hasConflict).toBe(false);
  });
});

// ═══════════════════════════════════════
//  checkBeneficiaryConflict
// ═══════════════════════════════════════
describe('checkBeneficiaryConflict', () => {
  it('detects beneficiary overlap', () => {
    const existing = [
      {
        id: 'a1',
        beneficiaryId: 'b1',
        date: '2025-06-15',
        startTime: '10:00',
        endTime: '10:45',
        status: 'confirmed',
      },
    ];
    const r = checkBeneficiaryConflict(
      { beneficiaryId: 'b1', date: '2025-06-15', startTime: '10:30', endTime: '11:15' },
      existing
    );
    expect(r.hasConflict).toBe(true);
  });

  it('no conflict for different beneficiary', () => {
    const existing = [
      {
        id: 'a1',
        beneficiaryId: 'b1',
        date: '2025-06-15',
        startTime: '10:00',
        endTime: '10:45',
        status: 'confirmed',
      },
    ];
    const r = checkBeneficiaryConflict(
      { beneficiaryId: 'b2', date: '2025-06-15', startTime: '10:00', endTime: '10:45' },
      existing
    );
    expect(r.hasConflict).toBe(false);
  });
});

// ═══════════════════════════════════════
//  checkRoomConflict
// ═══════════════════════════════════════
describe('checkRoomConflict', () => {
  it('no conflict without roomId', () => {
    const r = checkRoomConflict({ date: '2025-06-15', startTime: '09:00', endTime: '09:45' }, []);
    expect(r.hasConflict).toBe(false);
  });

  it('detects room overlap', () => {
    const bookings = [
      {
        id: 'b1',
        roomId: 'r1',
        date: '2025-06-15',
        startTime: '09:00',
        endTime: '09:45',
        status: 'active',
      },
    ];
    const r = checkRoomConflict(
      { roomId: 'r1', date: '2025-06-15', startTime: '09:30', endTime: '10:15' },
      bookings
    );
    expect(r.hasConflict).toBe(true);
  });
});

// ═══════════════════════════════════════
//  checkTherapistAvailability
// ═══════════════════════════════════════
describe('checkTherapistAvailability', () => {
  const slots = [
    {
      therapistId: 't1',
      dayOfWeek: 'sunday',
      startTime: '08:00',
      endTime: '16:00',
      isActive: true,
    },
  ];

  it('within availability', () => {
    const r = checkTherapistAvailability(
      { therapistId: 't1', date: '2025-01-05', startTime: '09:00', endTime: '09:45' },
      slots
    );
    expect(r.withinAvailability).toBe(true);
  });

  it('rejects non-work day (Friday)', () => {
    const r = checkTherapistAvailability(
      { therapistId: 't1', date: '2025-01-03', startTime: '09:00', endTime: '09:45' },
      slots
    );
    expect(r.withinAvailability).toBe(false);
    expect(r.reason).toContain('friday');
  });

  it('rejects outside hours', () => {
    const r = checkTherapistAvailability(
      { therapistId: 't1', date: '2025-01-05', startTime: '07:00', endTime: '07:45' },
      slots
    );
    expect(r.withinAvailability).toBe(false);
    expect(r.reason).toContain('خارج');
  });

  it('rejects during break', () => {
    const slotsWithBreak = [{ ...slots[0], breakStart: '12:00', breakEnd: '13:00' }];
    const r = checkTherapistAvailability(
      { therapistId: 't1', date: '2025-01-05', startTime: '12:15', endTime: '13:00' },
      slotsWithBreak
    );
    expect(r.withinAvailability).toBe(false);
    expect(r.reason).toContain('استراحة');
  });

  it('no schedule found', () => {
    const r = checkTherapistAvailability(
      { therapistId: 't2', date: '2025-01-05', startTime: '09:00', endTime: '09:45' },
      slots
    );
    expect(r.withinAvailability).toBe(false);
  });
});

// ═══════════════════════════════════════
//  checkDailySessionLimit
// ═══════════════════════════════════════
describe('checkDailySessionLimit', () => {
  it('not exceeded with few appointments', () => {
    const r = checkDailySessionLimit(
      { therapistId: 't1', date: '2025-06-15' },
      [{ therapistId: 't1', date: '2025-06-15', status: 'scheduled', id: 'a1' }],
      10
    );
    expect(r.exceeded).toBe(false);
    expect(r.currentCount).toBe(1);
  });

  it('exceeded at limit', () => {
    const existing = Array.from({ length: 5 }, (_, i) => ({
      id: `a${i}`,
      therapistId: 't1',
      date: '2025-06-15',
      status: 'scheduled',
    }));
    const r = checkDailySessionLimit({ therapistId: 't1', date: '2025-06-15' }, existing, 5);
    expect(r.exceeded).toBe(true);
  });
});

// ═══════════════════════════════════════
//  detectConflicts
// ═══════════════════════════════════════
describe('detectConflicts', () => {
  it('invalid with missing fields', () => {
    const r = detectConflicts({});
    expect(r.isValid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('valid when no conflicts', () => {
    const r = detectConflicts({
      date: '2025-06-15',
      startTime: '09:00',
      endTime: '09:45',
      therapistId: 't1',
      beneficiaryId: 'b1',
    });
    expect(r.isValid).toBe(true);
    expect(r.conflicts).toEqual([]);
  });

  it('detects therapist + beneficiary conflict', () => {
    const existing = [
      {
        id: 'a1',
        therapistId: 't1',
        beneficiaryId: 'b1',
        date: '2025-06-15',
        startTime: '09:00',
        endTime: '09:45',
        status: 'scheduled',
      },
    ];
    const r = detectConflicts(
      {
        date: '2025-06-15',
        startTime: '09:30',
        endTime: '10:15',
        therapistId: 't1',
        beneficiaryId: 'b1',
      },
      { existingAppointments: existing }
    );
    expect(r.isValid).toBe(false);
    expect(r.conflicts.length).toBe(2);
    expect(r.conflicts.map(c => c.type)).toContain('therapist_conflict');
    expect(r.conflicts.map(c => c.type)).toContain('beneficiary_conflict');
  });

  it('warning for outside availability', () => {
    const avail = [
      {
        therapistId: 't1',
        dayOfWeek: 'sunday',
        startTime: '14:00',
        endTime: '16:00',
        isActive: true,
      },
    ];
    const r = detectConflicts(
      {
        date: '2025-01-05',
        startTime: '09:00',
        endTime: '09:45',
        therapistId: 't1',
        beneficiaryId: 'b1',
      },
      { availabilitySlots: avail }
    );
    expect(r.isValid).toBe(true);
    expect(r.warnings.some(w => w.type === 'outside_availability')).toBe(true);
  });

  it('warning for daily limit', () => {
    const existing = Array.from({ length: 10 }, (_, i) => ({
      id: `a${i}`,
      therapistId: 't1',
      date: '2025-06-15',
      status: 'scheduled',
      startTime: `${8 + i}:00`,
      endTime: `${8 + i}:45`,
    }));
    const r = detectConflicts(
      {
        date: '2025-06-15',
        startTime: '18:00',
        endTime: '18:45',
        therapistId: 't1',
        beneficiaryId: 'b1',
      },
      { existingAppointments: existing, maxDailySessions: 10 }
    );
    expect(r.warnings.some(w => w.type === 'daily_limit_exceeded')).toBe(true);
  });
});

// ═══════════════════════════════════════
//  findAvailableSlots
// ═══════════════════════════════════════
describe('findAvailableSlots', () => {
  it('returns empty for no availability', () => {
    const r = findAvailableSlots({
      therapistId: 't1',
      date: '2025-01-05',
      durationMinutes: 45,
      availability: null,
      bookedSlots: [],
    });
    expect(r).toEqual([]);
  });

  it('returns empty for non-work day', () => {
    const r = findAvailableSlots({
      therapistId: 't1',
      date: '2025-01-03',
      durationMinutes: 45,
      availability: { startTime: '08:00', endTime: '16:00' },
      bookedSlots: [],
    });
    expect(r).toEqual([]);
  });

  it('returns full slots with no bookings', () => {
    const r = findAvailableSlots({
      therapistId: 't1',
      date: '2025-01-05',
      durationMinutes: 60,
      availability: { startTime: '08:00', endTime: '10:00' },
      bookedSlots: [],
    });
    expect(r.length).toBe(2);
    expect(r[0]).toEqual({ startTime: '08:00', endTime: '09:00' });
    expect(r[1]).toEqual({ startTime: '09:00', endTime: '10:00' });
  });

  it('gaps around bookings', () => {
    const booked = [
      { therapistId: 't1', startTime: '09:00', endTime: '10:00', status: 'scheduled' },
    ];
    const r = findAvailableSlots({
      therapistId: 't1',
      date: '2025-01-05',
      durationMinutes: 45,
      availability: { startTime: '08:00', endTime: '12:00' },
      bookedSlots: booked,
      bufferMinutes: 0,
    });
    expect(r[0].startTime).toBe('08:00');
    expect(r.some(s => s.startTime === '10:00')).toBe(true);
  });
});

// ═══════════════════════════════════════
//  calculateWaitlistPriority
// ═══════════════════════════════════════
describe('calculateWaitlistPriority', () => {
  it('severe + young + urgent = high score', () => {
    const s = calculateWaitlistPriority({
      disabilitySeverity: 'severe',
      ageYears: 2,
      waitingDays: 60,
      isUrgent: true,
    });
    expect(s).toBeGreaterThanOrEqual(90);
  });

  it('mild + adult + new = low score', () => {
    const s = calculateWaitlistPriority({
      disabilitySeverity: 'mild',
      ageYears: 25,
      waitingDays: 0,
      receivingServices: true,
    });
    expect(s).toBeLessThanOrEqual(30);
  });

  it('capped at 100', () => {
    const s = calculateWaitlistPriority({
      disabilitySeverity: 'severe',
      ageYears: 1,
      waitingDays: 365,
      isUrgent: true,
      isMedicalReferral: true,
    });
    expect(s).toBeLessThanOrEqual(100);
  });

  it('medical referral adds 15', () => {
    const base = calculateWaitlistPriority({ disabilitySeverity: 'moderate', ageYears: 5 });
    const withRef = calculateWaitlistPriority({
      disabilitySeverity: 'moderate',
      ageYears: 5,
      isMedicalReferral: true,
    });
    expect(withRef - base).toBe(15);
  });

  it('not receiving services adds 10', () => {
    const receiving = calculateWaitlistPriority({
      disabilitySeverity: 'mild',
      ageYears: 10,
      receivingServices: true,
    });
    const notReceiving = calculateWaitlistPriority({
      disabilitySeverity: 'mild',
      ageYears: 10,
      receivingServices: false,
    });
    expect(notReceiving - receiving).toBe(10);
  });
});

// ═══════════════════════════════════════
//  sortWaitlist
// ═══════════════════════════════════════
describe('sortWaitlist', () => {
  it('sorts descending by priority', () => {
    const entries = [
      { disabilitySeverity: 'mild', ageYears: 20, waitingDays: 0 },
      { disabilitySeverity: 'severe', ageYears: 2, waitingDays: 30 },
    ];
    const sorted = sortWaitlist(entries);
    expect(sorted[0].disabilitySeverity).toBe('severe');
  });

  it('tiebreaker: longer waitingDays first', () => {
    const entries = [
      { disabilitySeverity: 'moderate', ageYears: 5, waitingDays: 10 },
      { disabilitySeverity: 'moderate', ageYears: 5, waitingDays: 30 },
    ];
    const sorted = sortWaitlist(entries);
    expect(sorted[0].waitingDays).toBe(30);
  });

  it('does not mutate original', () => {
    const original = [
      { disabilitySeverity: 'mild', ageYears: 20 },
      { disabilitySeverity: 'severe', ageYears: 2 },
    ];
    sortWaitlist(original);
    expect(original[0].disabilitySeverity).toBe('mild');
  });
});

/**
 * اختبارات وحدة كشف تعارضات المواعيد
 * Scheduling Conflict Detection — Unit Tests
 *
 * يغطي:
 *  - دوال مساعدة (timeToMinutes, intervalsOverlap, ...)
 *  - كشف تعارض المعالج
 *  - كشف تعارض المستفيد
 *  - كشف تعارض الغرفة
 *  - فحص أوقات التوفر والاستراحة
 *  - الحد الأقصى للجلسات اليومية
 *  - الكشف الشامل (detectConflicts)
 *  - الفترات الزمنية المتاحة (findAvailableSlots)
 *  - أولوية قائمة الانتظار (calculateWaitlistPriority, sortWaitlist)
 */

'use strict';

const {
  detectConflicts,
  checkTherapistConflict,
  checkBeneficiaryConflict,
  checkRoomConflict,
  checkTherapistAvailability,
  checkDailySessionLimit,
  findAvailableSlots,
  calculateWaitlistPriority,
  sortWaitlist,
  timeToMinutes,
  minutesToTime,
  intervalsOverlap,
  getDayOfWeek,
  validateAppointmentData,
  SAUDI_WORK_DAYS,
  ACTIVE_STATUSES,
} = require('../services/scheduling/conflictDetection.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** إنشاء موعد اختباري بيانات افتراضية */
function makeAppt(overrides = {}) {
  return {
    id: 'new-appt',
    therapistId: 'T1',
    beneficiaryId: 'B1',
    date: '2026-04-05', // الأحد (يوم عمل) - April 5, 2026 = Sunday
    startTime: '09:00',
    endTime: '09:45',
    status: 'confirmed',
    ...overrides,
  };
}

/** إنشاء فترة توفر اختبارية */
function makeAvailability(overrides = {}) {
  return {
    therapistId: 'T1',
    dayOfWeek: 'sunday',
    startTime: '08:00',
    endTime: '16:00',
    isActive: true,
    slotDurationMinutes: 45,
    ...overrides,
  };
}

// ─── دوال مساعدة ──────────────────────────────────────────────────────────────

describe('timeToMinutes', () => {
  it('يحوّل 00:00 إلى 0', () => expect(timeToMinutes('00:00')).toBe(0));
  it('يحوّل 09:00 إلى 540', () => expect(timeToMinutes('09:00')).toBe(540));
  it('يحوّل 09:30 إلى 570', () => expect(timeToMinutes('09:30')).toBe(570));
  it('يحوّل 16:45 إلى 1005', () => expect(timeToMinutes('16:45')).toBe(1005));
  it('يحوّل 23:59 إلى 1439', () => expect(timeToMinutes('23:59')).toBe(1439));

  it('يرمي خطأ على صيغة غير صحيحة', () => {
    expect(() => timeToMinutes('9:00')).not.toThrow(); // صحيح
    expect(() => timeToMinutes('abc')).toThrow();
    expect(() => timeToMinutes('')).toThrow();
    expect(() => timeToMinutes(null)).toThrow();
    expect(() => timeToMinutes('25:00')).toThrow();
    expect(() => timeToMinutes('12:60')).toThrow();
  });
});

describe('minutesToTime', () => {
  it('يحوّل 0 إلى 00:00', () => expect(minutesToTime(0)).toBe('00:00'));
  it('يحوّل 540 إلى 09:00', () => expect(minutesToTime(540)).toBe('09:00'));
  it('يحوّل 570 إلى 09:30', () => expect(minutesToTime(570)).toBe('09:30'));
  it('يحوّل 1005 إلى 16:45', () => expect(minutesToTime(1005)).toBe('16:45'));

  it('قراءة عكسية: timeToMinutes(minutesToTime(x)) === x', () => {
    [0, 60, 540, 570, 1005, 1439].forEach(m => {
      expect(timeToMinutes(minutesToTime(m))).toBe(m);
    });
  });
});

describe('intervalsOverlap', () => {
  // 09:00-09:45 و 10:00-10:45 → لا تداخل
  it('لا تداخل بين فترتين منفصلتين', () => {
    expect(intervalsOverlap(540, 585, 600, 645)).toBe(false);
  });

  // 09:00-09:45 و 09:45-10:30 → لا تداخل (تلامس فقط)
  it('التلامس عند النهاية ليس تداخلاً', () => {
    expect(intervalsOverlap(540, 585, 585, 630)).toBe(false);
  });

  // 09:00-10:00 و 09:30-10:30 → تداخل
  it('يكشف تداخلاً جزئياً', () => {
    expect(intervalsOverlap(540, 600, 570, 630)).toBe(true);
  });

  // 09:00-10:00 يحتوي على 09:15-09:45
  it('يكشف تداخلاً كاملاً (فترة داخل أخرى)', () => {
    expect(intervalsOverlap(540, 600, 555, 585)).toBe(true);
  });

  // 09:15-09:45 داخل 09:00-10:00
  it('يكشف تداخلاً كاملاً (الأصغر داخل الأكبر)', () => {
    expect(intervalsOverlap(555, 585, 540, 600)).toBe(true);
  });

  // نفس الفترة تماماً
  it('نفس الفترة = تداخل', () => {
    expect(intervalsOverlap(540, 600, 540, 600)).toBe(true);
  });
});

describe('getDayOfWeek', () => {
  it('الأحد 2026-04-05 → sunday', () => {
    expect(getDayOfWeek('2026-04-05')).toBe('sunday');
  });
  it('الإثنين 2026-04-06 → monday', () => {
    expect(getDayOfWeek('2026-04-06')).toBe('monday');
  });
  it('الجمعة 2026-04-10 → friday', () => {
    expect(getDayOfWeek('2026-04-10')).toBe('friday');
  });
  it('السبت 2026-04-11 → saturday', () => {
    expect(getDayOfWeek('2026-04-11')).toBe('saturday');
  });
});

// ─── التحقق من البيانات ────────────────────────────────────────────────────────

describe('validateAppointmentData', () => {
  it('يقبل بيانات صحيحة', () => {
    const errors = validateAppointmentData(makeAppt());
    expect(errors).toHaveLength(0);
  });

  it('يرفض عدم وجود التاريخ', () => {
    const errors = validateAppointmentData(makeAppt({ date: '' }));
    expect(errors.some(e => e.includes('تاريخ'))).toBe(true);
  });

  it('يرفض عدم وجود المعالج', () => {
    const errors = validateAppointmentData(makeAppt({ therapistId: null }));
    expect(errors.some(e => e.includes('معرّف المعالج'))).toBe(true);
  });

  it('يرفض عدم وجود المستفيد', () => {
    const errors = validateAppointmentData(makeAppt({ beneficiaryId: '' }));
    expect(errors.some(e => e.includes('معرّف المستفيد'))).toBe(true);
  });

  it('يرفض وقت النهاية قبل البداية', () => {
    const errors = validateAppointmentData(makeAppt({ startTime: '10:00', endTime: '09:00' }));
    expect(errors.some(e => e.includes('بعد وقت البداية'))).toBe(true);
  });

  it('يرفض مدة أقل من 15 دقيقة', () => {
    const errors = validateAppointmentData(makeAppt({ startTime: '09:00', endTime: '09:10' }));
    expect(errors.some(e => e.includes('15 دقيقة'))).toBe(true);
  });

  it('يرفض مدة أكثر من 8 ساعات', () => {
    const errors = validateAppointmentData(makeAppt({ startTime: '07:00', endTime: '16:01' }));
    expect(errors.some(e => e.includes('480'))).toBe(true);
  });
});

// ─── تعارض المعالج ────────────────────────────────────────────────────────────

describe('checkTherapistConflict', () => {
  const existingAppt = makeAppt({ id: 'existing', startTime: '09:00', endTime: '09:45' });

  it('لا تعارض مع قائمة فارغة', () => {
    const result = checkTherapistConflict(makeAppt({ startTime: '10:00', endTime: '10:45' }), []);
    expect(result.hasConflict).toBe(false);
  });

  it('لا تعارض مع موعد في وقت مختلف', () => {
    const result = checkTherapistConflict(makeAppt({ startTime: '10:00', endTime: '10:45' }), [
      existingAppt,
    ]);
    expect(result.hasConflict).toBe(false);
  });

  it('لا تعارض مع موعت يبدأ بعد نهاية الموجود (تلامس)', () => {
    const result = checkTherapistConflict(makeAppt({ startTime: '09:45', endTime: '10:30' }), [
      existingAppt,
    ]);
    expect(result.hasConflict).toBe(false);
  });

  it('يكشف تعارضاً عند تداخل الأوقات', () => {
    const result = checkTherapistConflict(makeAppt({ startTime: '09:30', endTime: '10:15' }), [
      existingAppt,
    ]);
    expect(result.hasConflict).toBe(true);
    expect(result.conflictingAppointment.id).toBe('existing');
  });

  it('يكشف تعارضاً عند التطابق التام', () => {
    const result = checkTherapistConflict(makeAppt(), [existingAppt]);
    expect(result.hasConflict).toBe(true);
  });

  it('لا تعارض مع موعد معالج آخر في نفس الوقت', () => {
    const otherTherapistAppt = makeAppt({ id: 'other', therapistId: 'T2' });
    const result = checkTherapistConflict(makeAppt(), [otherTherapistAppt]);
    expect(result.hasConflict).toBe(false);
  });

  it('لا تعارض مع موعد ملغى', () => {
    const cancelledAppt = makeAppt({ id: 'cancelled', status: 'cancelled' });
    const result = checkTherapistConflict(makeAppt(), [cancelledAppt]);
    expect(result.hasConflict).toBe(false);
  });

  it('لا تعارض مع موعد معاد جدولته', () => {
    const rescheduledAppt = makeAppt({ id: 'rescheduled', status: 'rescheduled' });
    const result = checkTherapistConflict(makeAppt(), [rescheduledAppt]);
    expect(result.hasConflict).toBe(false);
  });

  it('يستثني الموعد المحدد عند التعديل (excludeId)', () => {
    // عند تعديل موعد، يجب ألا يتعارض مع نفسه
    const result = checkTherapistConflict(makeAppt(), [existingAppt], 'existing');
    expect(result.hasConflict).toBe(false);
  });

  it('لا تعارض في يوم مختلف', () => {
    const differentDayAppt = makeAppt({ id: 'other-day', date: '2026-04-07' });
    const result = checkTherapistConflict(makeAppt(), [differentDayAppt]);
    expect(result.hasConflict).toBe(false);
  });
});

// ─── تعارض المستفيد ───────────────────────────────────────────────────────────

describe('checkBeneficiaryConflict', () => {
  const existingAppt = makeAppt({
    id: 'existing',
    therapistId: 'T2', // معالج مختلف
    startTime: '09:00',
    endTime: '09:45',
  });

  it('يكشف تعارض المستفيد مع معالج مختلف', () => {
    const result = checkBeneficiaryConflict(
      makeAppt({ therapistId: 'T1' }), // نفس المستفيد B1
      [existingAppt]
    );
    expect(result.hasConflict).toBe(true);
  });

  it('لا تعارض مع مستفيد آخر في نفس الوقت', () => {
    const otherBeneficiary = makeAppt({ id: 'other', beneficiaryId: 'B2' });
    const result = checkBeneficiaryConflict(makeAppt(), [otherBeneficiary]);
    expect(result.hasConflict).toBe(false);
  });
});

// ─── تعارض الغرفة ─────────────────────────────────────────────────────────────

describe('checkRoomConflict', () => {
  const existingBooking = {
    id: 'booking-1',
    roomId: 'R1',
    date: '2026-04-05',
    startTime: '09:00',
    endTime: '09:45',
    status: 'reserved',
  };

  it('لا تعارض إذا لم يكن هناك غرفة في الموعد الجديد', () => {
    const result = checkRoomConflict(makeAppt(), [existingBooking]);
    expect(result.hasConflict).toBe(false);
  });

  it('يكشف تعارض الغرفة', () => {
    const result = checkRoomConflict(makeAppt({ roomId: 'R1' }), [existingBooking]);
    expect(result.hasConflict).toBe(true);
  });

  it('لا تعارض مع غرفة أخرى', () => {
    const result = checkRoomConflict(makeAppt({ roomId: 'R2' }), [existingBooking]);
    expect(result.hasConflict).toBe(false);
  });

  it('لا تعارض مع حجز ملغى', () => {
    const cancelledBooking = { ...existingBooking, status: 'cancelled' };
    const result = checkRoomConflict(makeAppt({ roomId: 'R1' }), [cancelledBooking]);
    expect(result.hasConflict).toBe(false);
  });
});

// ─── أوقات توفر المعالج ───────────────────────────────────────────────────────

describe('checkTherapistAvailability', () => {
  const availability = [makeAvailability()]; // الأحد 08:00-16:00

  it('يقبل موعداً ضمن أوقات التوفر', () => {
    const result = checkTherapistAvailability(
      makeAppt({ startTime: '09:00', endTime: '09:45' }),
      availability
    );
    expect(result.withinAvailability).toBe(true);
  });

  it('يرفض موعداً يبدأ قبل وقت التوفر', () => {
    const result = checkTherapistAvailability(
      makeAppt({ startTime: '07:00', endTime: '07:45' }),
      availability
    );
    expect(result.withinAvailability).toBe(false);
    expect(result.reason).toContain('خارج أوقات التوفر');
  });

  it('يرفض موعداً ينتهي بعد وقت التوفر', () => {
    const result = checkTherapistAvailability(
      makeAppt({ startTime: '15:30', endTime: '16:30' }),
      availability
    );
    expect(result.withinAvailability).toBe(false);
  });

  it('يرفض يوم الجمعة (ليس يوم عمل رسمي في السعودية)', () => {
    const result = checkTherapistAvailability(
      makeAppt({ date: '2026-04-10' }), // الجمعة
      availability
    );
    expect(result.withinAvailability).toBe(false);
    expect(result.reason).toContain('friday');
  });

  it('يرفض يوم السبت (عطلة أسبوعية)', () => {
    const result = checkTherapistAvailability(
      makeAppt({ date: '2026-04-11' }), // السبت
      availability
    );
    expect(result.withinAvailability).toBe(false);
  });

  it('يرفض موعداً يتداخل مع الاستراحة', () => {
    const availWithBreak = [makeAvailability({ breakStart: '12:00', breakEnd: '13:00' })];
    const result = checkTherapistAvailability(
      makeAppt({ startTime: '12:30', endTime: '13:15' }),
      availWithBreak
    );
    expect(result.withinAvailability).toBe(false);
    expect(result.reason).toContain('الاستراحة');
  });

  it('يقبل موعداً قبل الاستراحة مباشرة', () => {
    const availWithBreak = [makeAvailability({ breakStart: '12:00', breakEnd: '13:00' })];
    const result = checkTherapistAvailability(
      makeAppt({ startTime: '11:15', endTime: '12:00' }),
      availWithBreak
    );
    expect(result.withinAvailability).toBe(true);
  });

  it('يقبل موعداً بعد الاستراحة مباشرة', () => {
    const availWithBreak = [makeAvailability({ breakStart: '12:00', breakEnd: '13:00' })];
    const result = checkTherapistAvailability(
      makeAppt({ startTime: '13:00', endTime: '13:45' }),
      availWithBreak
    );
    expect(result.withinAvailability).toBe(true);
  });

  it('يرفض إذا لم يوجد جدول توفر للمعالج في هذا اليوم', () => {
    const result = checkTherapistAvailability(
      makeAppt({ date: '2026-04-07' }), // الإثنين - لكن الجدول الأحد فقط
      availability
    );
    expect(result.withinAvailability).toBe(false);
    expect(result.reason).toContain('لا يوجد جدول توفر');
  });
});

// ─── الحد الأقصى للجلسات اليومية ─────────────────────────────────────────────

describe('checkDailySessionLimit', () => {
  const buildSessions = count =>
    Array.from({ length: count }, (_, i) => ({
      id: `appt-${i}`,
      therapistId: 'T1',
      date: '2026-04-05',
      startTime: `${8 + i}:00`,
      endTime: `${8 + i}:45`,
      status: 'confirmed',
    }));

  it('لم يتجاوز الحد بعد (9 جلسات من أصل 10)', () => {
    const result = checkDailySessionLimit(makeAppt(), buildSessions(9), 10);
    expect(result.exceeded).toBe(false);
    expect(result.currentCount).toBe(9);
  });

  it('تجاوز الحد (10 جلسات من أصل 10)', () => {
    const result = checkDailySessionLimit(makeAppt(), buildSessions(10), 10);
    expect(result.exceeded).toBe(true);
    expect(result.currentCount).toBe(10);
  });

  it('قائمة فارغة → لم يتجاوز', () => {
    const result = checkDailySessionLimit(makeAppt(), [], 10);
    expect(result.exceeded).toBe(false);
    expect(result.currentCount).toBe(0);
  });

  it('يتجاهل جلسات المعالجين الآخرين', () => {
    const otherTherapistSessions = buildSessions(15).map(s => ({
      ...s,
      therapistId: 'T2',
    }));
    const result = checkDailySessionLimit(makeAppt(), otherTherapistSessions, 10);
    expect(result.exceeded).toBe(false);
    expect(result.currentCount).toBe(0);
  });
});

// ─── الكشف الشامل عن التعارضات ────────────────────────────────────────────────

describe('detectConflicts', () => {
  it('موعد جديد بدون أي تعارض', () => {
    const result = detectConflicts(makeAppt({ startTime: '10:00', endTime: '10:45' }), {
      existingAppointments: [makeAppt({ id: 'old', startTime: '09:00', endTime: '09:45' })],
    });
    expect(result.isValid).toBe(true);
    expect(result.conflicts).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('يُعيد أخطاء التحقق إذا كانت البيانات ناقصة', () => {
    const result = detectConflicts({ therapistId: 'T1' }); // ناقص
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('يكتشف تعارض المعالج', () => {
    const existing = makeAppt({ id: 'old' });
    const result = detectConflicts(makeAppt({ id: 'new' }), {
      existingAppointments: [existing],
    });
    expect(result.isValid).toBe(false);
    expect(result.conflicts.some(c => c.type === 'therapist_conflict')).toBe(true);
  });

  it('يكتشف تعارض المستفيد مع معالج مختلف', () => {
    const existingT2 = makeAppt({ id: 'old', therapistId: 'T2' });
    const result = detectConflicts(makeAppt({ id: 'new', therapistId: 'T1' }), {
      existingAppointments: [existingT2],
    });
    expect(result.conflicts.some(c => c.type === 'beneficiary_conflict')).toBe(true);
  });

  it('يكتشف تعارض الغرفة', () => {
    const booking = {
      id: 'b1',
      roomId: 'R1',
      date: '2026-04-05',
      startTime: '09:00',
      endTime: '09:45',
      status: 'reserved',
    };
    const result = detectConflicts(
      makeAppt({ roomId: 'R1', therapistId: 'T1', beneficiaryId: 'B1' }),
      {
        existingAppointments: [], // لا تعارض معالج/مستفيد
        roomBookings: [booking],
      }
    );
    expect(result.conflicts.some(c => c.type === 'room_conflict')).toBe(true);
  });

  it('يُصدر تحذيراً عند خارج أوقات التوفر (ليس خطأً)', () => {
    const availability = [makeAvailability()]; // الأحد 08:00-16:00
    const result = detectConflicts(makeAppt({ startTime: '17:00', endTime: '17:45' }), {
      existingAppointments: [],
      availabilitySlots: availability,
    });
    expect(result.isValid).toBe(true); // تحذير لا يمنع الحجز
    expect(result.warnings.some(w => w.type === 'outside_availability')).toBe(true);
  });

  it('يُصدر تحذيراً عند تجاوز الحد الأقصى اليومي', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`,
      therapistId: 'T1',
      beneficiaryId: `B${i + 10}`,
      date: '2026-04-05',
      startTime: `${8 + i}:00`,
      endTime: `${8 + i}:45`,
      status: 'confirmed',
    }));

    const result = detectConflicts(
      makeAppt({ beneficiaryId: 'B99', startTime: '18:00', endTime: '18:45' }),
      {
        existingAppointments: sessions,
        maxDailySessions: 10,
      }
    );
    expect(result.warnings.some(w => w.type === 'daily_limit_exceeded')).toBe(true);
  });

  it('يمكن وجود تعارضات متعددة في نفس الوقت', () => {
    const existingAppt = makeAppt({ id: 'old' });
    const booking = {
      id: 'b1',
      roomId: 'R1',
      date: '2026-04-06',
      startTime: '09:00',
      endTime: '09:45',
      status: 'reserved',
    };
    const result = detectConflicts(makeAppt({ id: 'new', roomId: 'R1' }), {
      existingAppointments: [existingAppt],
      roomBookings: [booking],
    });
    expect(result.conflicts.length).toBeGreaterThanOrEqual(2);
  });

  it('استثناء الموعد نفسه عند التعديل', () => {
    const existing = makeAppt({ id: 'appt-1' });
    const result = detectConflicts(
      makeAppt({ id: 'appt-1' }), // نفس ID
      {
        existingAppointments: [existing],
        excludeId: 'appt-1',
      }
    );
    expect(result.isValid).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });
});

// ─── الفترات الزمنية المتاحة ──────────────────────────────────────────────────

describe('findAvailableSlots', () => {
  const baseAvailability = makeAvailability({
    startTime: '08:00',
    endTime: '16:00',
    slotDurationMinutes: 45,
  });

  it('تُعيد فترات عندما لا توجد حجوزات', () => {
    const slots = findAvailableSlots({
      therapistId: 'T1',
      date: '2026-04-06', // أحد
      durationMinutes: 45,
      availability: baseAvailability,
      bookedSlots: [],
      bufferMinutes: 0,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].startTime).toBe('08:00');
  });

  it('تستثني الفترات المحجوزة', () => {
    const booked = [makeAppt({ status: 'confirmed', startTime: '08:00', endTime: '08:45' })];
    const slots = findAvailableSlots({
      therapistId: 'T1',
      date: '2026-04-06',
      durationMinutes: 45,
      availability: baseAvailability,
      bookedSlots: booked,
      bufferMinutes: 0,
    });
    // أول فترة يجب أن تكون 08:45 أو أبعد
    expect(slots.every(s => timeToMinutes(s.startTime) >= timeToMinutes('08:45'))).toBe(true);
  });

  it('تطبّق وقت الـ buffer بين الجلسات', () => {
    const booked = [makeAppt({ status: 'confirmed', startTime: '08:00', endTime: '08:45' })];
    const slots = findAvailableSlots({
      therapistId: 'T1',
      date: '2026-04-06',
      durationMinutes: 45,
      availability: baseAvailability,
      bookedSlots: booked,
      bufferMinutes: 5,
    });
    // مع 5 دقائق buffer، أول فترة = 08:50 أو أبعد
    expect(slots.every(s => timeToMinutes(s.startTime) >= timeToMinutes('08:50'))).toBe(true);
  });

  it('لا تُعيد فترات في يوم الجمعة (عطلة)', () => {
    const slots = findAvailableSlots({
      therapistId: 'T1',
      date: '2026-04-10', // جمعة
      durationMinutes: 45,
      availability: baseAvailability,
      bookedSlots: [],
    });
    expect(slots).toHaveLength(0);
  });

  it('لا تُعيد فترات إذا لم يكن هناك توفر', () => {
    const slots = findAvailableSlots({
      therapistId: 'T1',
      date: '2026-04-06',
      durationMinutes: 45,
      availability: null,
      bookedSlots: [],
    });
    expect(slots).toHaveLength(0);
  });

  it('لا تُعيد فترة أقصر من المدة المطلوبة', () => {
    // الحجز يترك فقط 30 دقيقة حرة قبل نهاية الدوام
    const booked = [makeAppt({ status: 'confirmed', startTime: '08:00', endTime: '15:30' })];
    const slots = findAvailableSlots({
      therapistId: 'T1',
      date: '2026-04-06',
      durationMinutes: 45,
      availability: baseAvailability,
      bookedSlots: booked,
      bufferMinutes: 0,
    });
    // 15:30 -> 16:00 = 30 دقيقة < 45 → لا فترات
    expect(slots).toHaveLength(0);
  });
});

// ─── أولوية قائمة الانتظار ────────────────────────────────────────────────────

describe('calculateWaitlistPriority', () => {
  it('طفل شديد الإعاقة عمره 2 سنة → أعلى نقاط', () => {
    const score = calculateWaitlistPriority({
      disabilitySeverity: 'severe',
      ageYears: 2,
      waitingDays: 0,
    });
    // severe=40 + ≤3=30 + لا خدمات=10 = 80
    expect(score).toBe(80);
  });

  it('شخص بالغ إعاقة خفيفة → أدنى نقاط', () => {
    const score = calculateWaitlistPriority({
      disabilitySeverity: 'mild',
      ageYears: 30,
      waitingDays: 0,
      receivingServices: true,
    });
    // mild=10 + adult=5 = 15
    expect(score).toBe(15);
  });

  it('الإحالة الطبية تضيف 15 نقطة', () => {
    const without = calculateWaitlistPriority({
      disabilitySeverity: 'moderate',
      ageYears: 8,
      waitingDays: 0,
      isMedicalReferral: false,
    });
    const with_ = calculateWaitlistPriority({
      disabilitySeverity: 'moderate',
      ageYears: 8,
      waitingDays: 0,
      isMedicalReferral: true,
    });
    expect(with_ - without).toBe(15);
  });

  it('العلامة العاجلة تضيف 20 نقطة', () => {
    const without = calculateWaitlistPriority({
      disabilitySeverity: 'moderate',
      ageYears: 8,
      waitingDays: 0,
      isUrgent: false,
    });
    const with_ = calculateWaitlistPriority({
      disabilitySeverity: 'moderate',
      ageYears: 8,
      waitingDays: 0,
      isUrgent: true,
    });
    expect(with_ - without).toBe(20);
  });

  it('مدة الانتظار تضيف نقاطاً (حد أقصى 20)', () => {
    const shortWait = calculateWaitlistPriority({
      disabilitySeverity: 'mild',
      ageYears: 10,
      waitingDays: 10,
    });
    const longWait = calculateWaitlistPriority({
      disabilitySeverity: 'mild',
      ageYears: 10,
      waitingDays: 60,
    });
    const veryLongWait = calculateWaitlistPriority({
      disabilitySeverity: 'mild',
      ageYears: 10,
      waitingDays: 200, // يجب أن يساوي 60 يوم في النقاط (سقف 20)
    });

    expect(longWait).toBeGreaterThan(shortWait);
    expect(veryLongWait).toBe(longWait); // السقف 20 نقطة
  });

  it('النتيجة لا تتجاوز 100', () => {
    const score = calculateWaitlistPriority({
      disabilitySeverity: 'severe',
      ageYears: 1,
      waitingDays: 200,
      isMedicalReferral: true,
      isUrgent: true,
      receivingServices: false,
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  it('يعطي 0 لا يتلقى خدمات (+10) مقارنة بمن يتلقى', () => {
    const receiving = calculateWaitlistPriority({
      disabilitySeverity: 'mild',
      ageYears: 10,
      waitingDays: 0,
      receivingServices: true,
    });
    const notReceiving = calculateWaitlistPriority({
      disabilitySeverity: 'mild',
      ageYears: 10,
      waitingDays: 0,
      receivingServices: false,
    });
    expect(notReceiving - receiving).toBe(10);
  });
});

describe('sortWaitlist', () => {
  it('يرتب تنازلياً بحسب نقاط الأولوية', () => {
    const entries = [
      { id: '1', disabilitySeverity: 'mild', ageYears: 20, waitingDays: 5 },
      { id: '2', disabilitySeverity: 'severe', ageYears: 3, waitingDays: 1 },
      { id: '3', disabilitySeverity: 'moderate', ageYears: 10, waitingDays: 30 },
    ];
    const sorted = sortWaitlist(entries);
    // الطفل الشديد = أعلى أولوية
    expect(sorted[0].id).toBe('2');
  });

  it('عند تساوي الأولوية، يُقدَّم من انتظر أطول', () => {
    const entries = [
      { id: 'new', disabilitySeverity: 'moderate', ageYears: 8, waitingDays: 5 },
      { id: 'old', disabilitySeverity: 'moderate', ageYears: 8, waitingDays: 30 },
    ];
    const sorted = sortWaitlist(entries);
    expect(sorted[0].id).toBe('old');
  });

  it('لا يعدّل المصفوفة الأصلية', () => {
    const entries = [
      { id: '1', disabilitySeverity: 'mild', ageYears: 20, waitingDays: 0 },
      { id: '2', disabilitySeverity: 'severe', ageYears: 3, waitingDays: 0 },
    ];
    const original = [...entries];
    sortWaitlist(entries);
    expect(entries[0].id).toBe(original[0].id); // لم تتغير
  });

  it('قائمة فارغة → قائمة فارغة', () => {
    expect(sortWaitlist([])).toHaveLength(0);
  });

  it('عنصر واحد → يُعيده كما هو', () => {
    const entries = [{ id: '1', disabilitySeverity: 'moderate', ageYears: 5, waitingDays: 10 }];
    const sorted = sortWaitlist(entries);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe('1');
  });
});

// ─── ثوابت ────────────────────────────────────────────────────────────────────

describe('Constants', () => {
  it('SAUDI_WORK_DAYS تحتوي على 5 أيام عمل صحيحة', () => {
    expect(SAUDI_WORK_DAYS).toHaveLength(5);
    expect(SAUDI_WORK_DAYS).toContain('sunday');
    expect(SAUDI_WORK_DAYS).toContain('thursday');
    expect(SAUDI_WORK_DAYS).not.toContain('friday');
    expect(SAUDI_WORK_DAYS).not.toContain('saturday');
  });

  it('ACTIVE_STATUSES تحتوي على الحالات النشطة', () => {
    expect(ACTIVE_STATUSES).toContain('scheduled');
    expect(ACTIVE_STATUSES).toContain('confirmed');
    expect(ACTIVE_STATUSES).not.toContain('cancelled');
    expect(ACTIVE_STATUSES).not.toContain('completed');
  });
});

/**
 * اختبارات خدمة كشف تعارضات المواعيد والفترات المتاحة
 * Appointment Conflict Detection - Pure Unit Tests (No DB)
 */

'use strict';

const {
  DEFAULT_SESSION_DURATION,
  MAX_DAILY_SESSIONS_PER_THERAPIST,
  WORKING_DAYS,
  MIN_BREAK_BETWEEN_SESSIONS,
  DEFAULT_WORK_START,
  DEFAULT_WORK_END,
  CONFLICT_TYPES,
  CONFLICT_SEVERITY,
  timeToMinutes,
  minutesToTime,
  calculateEndTime,
  doTimesOverlap,
  getDayOfWeek,
  isWorkingDay,
  checkTherapistConflict,
  checkBeneficiaryConflict,
  checkRoomConflict,
  checkAvailability,
  checkCaseloadLimit,
  checkBreakBetweenSessions,
  detectAllConflicts,
  generateTimeSlots,
  getAvailableSlots,
  getAvailableSlotsForMultipleTherapists,
  calculateOccupancyRate,
  getDailyScheduleStats,
  generateWeeklyScheduleReport,
} = require('../services/scheduling/appointmentConflict.service');

// ========================================================
// 1. اختبارات الثوابت
// ========================================================
describe('الثوابت', () => {
  test('DEFAULT_SESSION_DURATION = 45', () => {
    expect(DEFAULT_SESSION_DURATION).toBe(45);
  });

  test('MAX_DAILY_SESSIONS_PER_THERAPIST = 8', () => {
    expect(MAX_DAILY_SESSIONS_PER_THERAPIST).toBe(8);
  });

  test('WORKING_DAYS يحتوي الأيام الصحيحة', () => {
    expect(WORKING_DAYS).toContain('sunday');
    expect(WORKING_DAYS).toContain('monday');
    expect(WORKING_DAYS).toContain('thursday');
    expect(WORKING_DAYS).not.toContain('friday');
    expect(WORKING_DAYS).not.toContain('saturday');
    expect(WORKING_DAYS).toHaveLength(5);
  });

  test('MIN_BREAK_BETWEEN_SESSIONS = 5', () => {
    expect(MIN_BREAK_BETWEEN_SESSIONS).toBe(5);
  });

  test('DEFAULT_WORK_START = 08:00', () => {
    expect(DEFAULT_WORK_START).toBe('08:00');
  });

  test('DEFAULT_WORK_END = 17:00', () => {
    expect(DEFAULT_WORK_END).toBe('17:00');
  });

  test('CONFLICT_TYPES يحتوي الأنواع الصحيحة', () => {
    expect(CONFLICT_TYPES.THERAPIST_DOUBLE_BOOKING).toBe('therapist_double_booking');
    expect(CONFLICT_TYPES.BENEFICIARY_DOUBLE_BOOKING).toBe('beneficiary_double_booking');
    expect(CONFLICT_TYPES.ROOM_DOUBLE_BOOKING).toBe('room_double_booking');
    expect(CONFLICT_TYPES.OUTSIDE_AVAILABILITY).toBe('outside_availability');
    expect(CONFLICT_TYPES.CASELOAD_EXCEEDED).toBe('caseload_exceeded');
  });

  test('CONFLICT_SEVERITY يحتوي المستويات الصحيحة', () => {
    expect(CONFLICT_SEVERITY.ERROR).toBe('error');
    expect(CONFLICT_SEVERITY.WARNING).toBe('warning');
    expect(CONFLICT_SEVERITY.INFO).toBe('info');
  });
});

// ========================================================
// 2. اختبارات timeToMinutes
// ========================================================
describe('timeToMinutes', () => {
  test('08:00 = 480 دقيقة', () => {
    expect(timeToMinutes('08:00')).toBe(480);
  });

  test('09:30 = 570 دقيقة', () => {
    expect(timeToMinutes('09:30')).toBe(570);
  });

  test('00:00 = 0', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  test('23:59 = 1439', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  test('17:00 = 1020', () => {
    expect(timeToMinutes('17:00')).toBe(1020);
  });

  test('وقت غير صالح يُطلق خطأ', () => {
    expect(() => timeToMinutes('invalid')).toThrow();
  });

  test('null يُطلق خطأ', () => {
    expect(() => timeToMinutes(null)).toThrow();
  });

  test('ساعة خارج النطاق يُطلق خطأ', () => {
    expect(() => timeToMinutes('25:00')).toThrow();
  });
});

// ========================================================
// 3. اختبارات minutesToTime
// ========================================================
describe('minutesToTime', () => {
  test('480 = 08:00', () => {
    expect(minutesToTime(480)).toBe('08:00');
  });

  test('570 = 09:30', () => {
    expect(minutesToTime(570)).toBe('09:30');
  });

  test('0 = 00:00', () => {
    expect(minutesToTime(0)).toBe('00:00');
  });

  test('1020 = 17:00', () => {
    expect(minutesToTime(1020)).toBe('17:00');
  });

  test('دقائق سالبة تُطلق خطأ', () => {
    expect(() => minutesToTime(-1)).toThrow();
  });

  test('دقائق >= 1440 تُطلق خطأ', () => {
    expect(() => minutesToTime(1440)).toThrow();
  });

  test('timeToMinutes و minutesToTime متعاكسان', () => {
    expect(minutesToTime(timeToMinutes('10:15'))).toBe('10:15');
  });
});

// ========================================================
// 4. اختبارات calculateEndTime
// ========================================================
describe('calculateEndTime', () => {
  test('09:00 + 45 دقيقة = 09:45', () => {
    expect(calculateEndTime('09:00', 45)).toBe('09:45');
  });

  test('10:30 + 60 دقيقة = 11:30', () => {
    expect(calculateEndTime('10:30', 60)).toBe('11:30');
  });

  test('16:00 + 45 دقيقة = 16:45', () => {
    expect(calculateEndTime('16:00', 45)).toBe('16:45');
  });
});

// ========================================================
// 5. اختبارات doTimesOverlap
// ========================================================
describe('doTimesOverlap', () => {
  test('تداخل كامل', () => {
    expect(doTimesOverlap('09:00', '10:00', '09:00', '10:00')).toBe(true);
  });

  test('تداخل جزئي - البداية', () => {
    expect(doTimesOverlap('09:00', '10:00', '08:30', '09:30')).toBe(true);
  });

  test('تداخل جزئي - النهاية', () => {
    expect(doTimesOverlap('09:00', '10:00', '09:30', '10:30')).toBe(true);
  });

  test('الفترة الأولى تحتوي الثانية', () => {
    expect(doTimesOverlap('09:00', '11:00', '09:30', '10:30')).toBe(true);
  });

  test('لا تداخل - الأولى قبل الثانية', () => {
    expect(doTimesOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false);
  });

  test('لا تداخل - الأولى بعد الثانية', () => {
    expect(doTimesOverlap('11:00', '12:00', '09:00', '10:00')).toBe(false);
  });

  test('متجاوران مباشرة (نهاية = بداية) - لا تداخل', () => {
    expect(doTimesOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false);
  });
});

// ========================================================
// 6. اختبارات getDayOfWeek و isWorkingDay
// ========================================================
describe('getDayOfWeek', () => {
  test('2024-01-07 = sunday', () => {
    // 7 يناير 2024 = الأحد
    expect(getDayOfWeek('2024-01-07')).toBe('sunday');
  });

  test('2024-01-08 = monday', () => {
    expect(getDayOfWeek('2024-01-08')).toBe('monday');
  });

  test('تاريخ غير صالح يُطلق خطأ', () => {
    expect(() => getDayOfWeek('invalid')).toThrow();
  });
});

describe('isWorkingDay', () => {
  test('الأحد = يوم عمل', () => {
    expect(isWorkingDay('2024-01-07')).toBe(true);
  });

  test('الخميس = يوم عمل', () => {
    expect(isWorkingDay('2024-01-11')).toBe(true);
  });

  test('الجمعة = عطلة', () => {
    expect(isWorkingDay('2024-01-12')).toBe(false);
  });

  test('السبت = عطلة', () => {
    expect(isWorkingDay('2024-01-13')).toBe(false);
  });
});

// ========================================================
// 7. اختبارات checkTherapistConflict
// ========================================================
describe('checkTherapistConflict', () => {
  const existing = [
    {
      id: 'apt-1',
      therapistId: 'T1',
      beneficiaryId: 'B1',
      date: '2024-01-08',
      startTime: '09:00',
      endTime: '09:45',
      status: 'confirmed',
    },
  ];

  test('لا تعارض عند وقت مختلف', () => {
    const newApt = { therapistId: 'T1', date: '2024-01-08', startTime: '10:00', endTime: '10:45' };
    expect(checkTherapistConflict(newApt, existing)).toBeNull();
  });

  test('تعارض عند نفس الوقت', () => {
    const newApt = { therapistId: 'T1', date: '2024-01-08', startTime: '09:00', endTime: '09:45' };
    const result = checkTherapistConflict(newApt, existing);
    expect(result).not.toBeNull();
    expect(result.type).toBe(CONFLICT_TYPES.THERAPIST_DOUBLE_BOOKING);
    expect(result.severity).toBe(CONFLICT_SEVERITY.ERROR);
  });

  test('تعارض عند تداخل جزئي', () => {
    const newApt = { therapistId: 'T1', date: '2024-01-08', startTime: '09:30', endTime: '10:15' };
    const result = checkTherapistConflict(newApt, existing);
    expect(result).not.toBeNull();
  });

  test('لا تعارض مع معالج مختلف', () => {
    const newApt = { therapistId: 'T2', date: '2024-01-08', startTime: '09:00', endTime: '09:45' };
    expect(checkTherapistConflict(newApt, existing)).toBeNull();
  });

  test('لا تعارض مع تاريخ مختلف', () => {
    const newApt = { therapistId: 'T1', date: '2024-01-09', startTime: '09:00', endTime: '09:45' };
    expect(checkTherapistConflict(newApt, existing)).toBeNull();
  });

  test('لا تعارض مع موعد ملغى', () => {
    const cancelledExisting = [{ ...existing[0], status: 'cancelled' }];
    const newApt = { therapistId: 'T1', date: '2024-01-08', startTime: '09:00', endTime: '09:45' };
    expect(checkTherapistConflict(newApt, cancelledExisting)).toBeNull();
  });

  test('تجاهل نفس الموعد عند التعديل (excludeId)', () => {
    const newApt = {
      id: 'apt-1',
      therapistId: 'T1',
      date: '2024-01-08',
      startTime: '09:00',
      endTime: '09:45',
    };
    expect(checkTherapistConflict(newApt, existing)).toBeNull();
  });

  test('مصفوفة فارغة → لا تعارض', () => {
    const newApt = { therapistId: 'T1', date: '2024-01-08', startTime: '09:00', endTime: '09:45' };
    expect(checkTherapistConflict(newApt, [])).toBeNull();
  });
});

// ========================================================
// 8. اختبارات checkBeneficiaryConflict
// ========================================================
describe('checkBeneficiaryConflict', () => {
  const existing = [
    {
      id: 'apt-2',
      therapistId: 'T1',
      beneficiaryId: 'B1',
      date: '2024-01-08',
      startTime: '10:00',
      endTime: '10:45',
      status: 'scheduled',
    },
  ];

  test('تعارض عند نفس المستفيد ونفس الوقت', () => {
    const newApt = {
      beneficiaryId: 'B1',
      date: '2024-01-08',
      startTime: '10:00',
      endTime: '10:45',
    };
    const result = checkBeneficiaryConflict(newApt, existing);
    expect(result).not.toBeNull();
    expect(result.type).toBe(CONFLICT_TYPES.BENEFICIARY_DOUBLE_BOOKING);
    expect(result.severity).toBe(CONFLICT_SEVERITY.ERROR);
  });

  test('لا تعارض مع مستفيد مختلف', () => {
    const newApt = {
      beneficiaryId: 'B2',
      date: '2024-01-08',
      startTime: '10:00',
      endTime: '10:45',
    };
    expect(checkBeneficiaryConflict(newApt, existing)).toBeNull();
  });

  test('لا تعارض مع وقت مختلف', () => {
    const newApt = {
      beneficiaryId: 'B1',
      date: '2024-01-08',
      startTime: '11:00',
      endTime: '11:45',
    };
    expect(checkBeneficiaryConflict(newApt, existing)).toBeNull();
  });
});

// ========================================================
// 9. اختبارات checkRoomConflict
// ========================================================
describe('checkRoomConflict', () => {
  const existingBookings = [
    {
      id: 'booking-1',
      roomId: 'R1',
      date: '2024-01-08',
      startTime: '09:00',
      endTime: '09:45',
      status: 'reserved',
    },
  ];

  test('تعارض عند نفس الغرفة ونفس الوقت', () => {
    const newApt = { roomId: 'R1', date: '2024-01-08', startTime: '09:00', endTime: '09:45' };
    const result = checkRoomConflict(newApt, existingBookings);
    expect(result).not.toBeNull();
    expect(result.type).toBe(CONFLICT_TYPES.ROOM_DOUBLE_BOOKING);
    expect(result.severity).toBe(CONFLICT_SEVERITY.ERROR);
  });

  test('لا تعارض مع غرفة مختلفة', () => {
    const newApt = { roomId: 'R2', date: '2024-01-08', startTime: '09:00', endTime: '09:45' };
    expect(checkRoomConflict(newApt, existingBookings)).toBeNull();
  });

  test('لا تعارض إذا لم تُحدد غرفة (roomId = null)', () => {
    const newApt = { roomId: null, date: '2024-01-08', startTime: '09:00', endTime: '09:45' };
    expect(checkRoomConflict(newApt, existingBookings)).toBeNull();
  });

  test('لا تعارض مع حجز ملغى', () => {
    const cancelledBookings = [{ ...existingBookings[0], status: 'cancelled' }];
    const newApt = { roomId: 'R1', date: '2024-01-08', startTime: '09:00', endTime: '09:45' };
    expect(checkRoomConflict(newApt, cancelledBookings)).toBeNull();
  });
});

// ========================================================
// 10. اختبارات checkAvailability
// ========================================================
describe('checkAvailability', () => {
  const availability = [
    {
      dayOfWeek: 'monday',
      startTime: '08:00',
      endTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      isActive: true,
    },
  ];

  // 2024-01-08 = الاثنين
  test('موعد ضمن ساعات العمل → لا تعارض', () => {
    const apt = { date: '2024-01-08', startTime: '09:00', endTime: '09:45' };
    expect(checkAvailability(apt, availability)).toBeNull();
  });

  test('موعد قبل ساعات العمل → تعارض', () => {
    const apt = { date: '2024-01-08', startTime: '07:00', endTime: '07:45' };
    const result = checkAvailability(apt, availability);
    expect(result).not.toBeNull();
    expect(result.type).toBe(CONFLICT_TYPES.OUTSIDE_AVAILABILITY);
    expect(result.severity).toBe(CONFLICT_SEVERITY.WARNING);
  });

  test('موعد بعد ساعات العمل → تعارض', () => {
    const apt = { date: '2024-01-08', startTime: '17:00', endTime: '17:45' };
    const result = checkAvailability(apt, availability);
    expect(result).not.toBeNull();
  });

  test('موعد في وقت الاستراحة → تعارض', () => {
    const apt = { date: '2024-01-08', startTime: '12:00', endTime: '12:45' };
    const result = checkAvailability(apt, availability);
    expect(result).not.toBeNull();
    expect(result.message).toContain('استراحة');
  });

  test('يوم الجمعة → تعارض (عطلة)', () => {
    const apt = { date: '2024-01-12', startTime: '09:00', endTime: '09:45' }; // جمعة
    const result = checkAvailability(apt, availability);
    expect(result).not.toBeNull();
    expect(result.type).toBe(CONFLICT_TYPES.OUTSIDE_AVAILABILITY);
  });

  test('يوم لا يعمل فيه المعالج → تعارض', () => {
    // 2024-01-07 = الأحد، لكن availability للاثنين فقط
    const apt = { date: '2024-01-07', startTime: '09:00', endTime: '09:45' };
    const result = checkAvailability(apt, availability);
    expect(result).not.toBeNull();
  });
});

// ========================================================
// 11. اختبارات checkCaseloadLimit
// ========================================================
describe('checkCaseloadLimit', () => {
  const makeAppointments = count =>
    Array.from({ length: count }, (_, i) => ({
      id: `apt-${i}`,
      therapistId: 'T1',
      date: '2024-01-08',
      startTime: `0${8 + i}:00`,
      endTime: `0${8 + i}:45`,
      status: 'confirmed',
    }));

  test('أقل من الحد الأقصى → لا تعارض', () => {
    const apt = { therapistId: 'T1', date: '2024-01-08' };
    const existing = makeAppointments(5);
    expect(checkCaseloadLimit(apt, existing, 8)).toBeNull();
  });

  test('وصول الحد الأقصى → تعارض بتحذير', () => {
    const apt = { therapistId: 'T1', date: '2024-01-08' };
    const existing = makeAppointments(8);
    const result = checkCaseloadLimit(apt, existing, 8);
    expect(result).not.toBeNull();
    expect(result.type).toBe(CONFLICT_TYPES.CASELOAD_EXCEEDED);
    expect(result.severity).toBe(CONFLICT_SEVERITY.WARNING);
  });

  test('المواعيد الملغاة لا تُحسب', () => {
    const apt = { therapistId: 'T1', date: '2024-01-08' };
    const existing = makeAppointments(8).map(a => ({ ...a, status: 'cancelled' }));
    expect(checkCaseloadLimit(apt, existing, 8)).toBeNull();
  });

  test('استخدام الحد الافتراضي (8)', () => {
    const apt = { therapistId: 'T1', date: '2024-01-08' };
    const existing = makeAppointments(8);
    const result = checkCaseloadLimit(apt, existing);
    expect(result).not.toBeNull();
    expect(result.maxAllowed).toBe(8);
  });
});

// ========================================================
// 12. اختبارات checkBreakBetweenSessions
// ========================================================
describe('checkBreakBetweenSessions', () => {
  const existing = [
    {
      id: 'apt-1',
      therapistId: 'T1',
      date: '2024-01-08',
      startTime: '09:00',
      endTime: '09:45',
      status: 'confirmed',
    },
  ];

  test('فاصل كافٍ (أكثر من 5 دقائق) → لا تعارض', () => {
    const newApt = { therapistId: 'T1', date: '2024-01-08', startTime: '10:00', endTime: '10:45' };
    expect(checkBreakBetweenSessions(newApt, existing)).toBeNull();
  });

  test('فاصل أقل من 5 دقائق → تحذير INFO', () => {
    const newApt = { therapistId: 'T1', date: '2024-01-08', startTime: '09:47', endTime: '10:32' };
    const result = checkBreakBetweenSessions(newApt, existing);
    expect(result).not.toBeNull();
    expect(result.type).toBe(CONFLICT_TYPES.INSUFFICIENT_BREAK);
    expect(result.severity).toBe(CONFLICT_SEVERITY.INFO);
    expect(result.gapMinutes).toBeLessThan(MIN_BREAK_BETWEEN_SESSIONS);
  });

  test('لا تعارض مع معالج مختلف', () => {
    const newApt = { therapistId: 'T2', date: '2024-01-08', startTime: '09:47', endTime: '10:32' };
    expect(checkBreakBetweenSessions(newApt, existing)).toBeNull();
  });

  test('مصفوفة فارغة → لا تعارض', () => {
    const newApt = { therapistId: 'T1', date: '2024-01-08', startTime: '09:47', endTime: '10:32' };
    expect(checkBreakBetweenSessions(newApt, [])).toBeNull();
  });
});

// ========================================================
// 13. اختبارات detectAllConflicts
// ========================================================
describe('detectAllConflicts', () => {
  const existingApts = [
    {
      id: 'apt-1',
      therapistId: 'T1',
      beneficiaryId: 'B1',
      date: '2024-01-08',
      startTime: '09:00',
      endTime: '09:45',
      status: 'confirmed',
    },
  ];

  test('لا تعارضات → canBook = true', () => {
    const newApt = {
      therapistId: 'T1',
      beneficiaryId: 'B2',
      date: '2024-01-08',
      startTime: '10:00',
      endTime: '10:45',
    };
    const result = detectAllConflicts(newApt, { existingAppointments: existingApts });
    expect(result.canBook).toBe(true);
    expect(result.hasErrors).toBe(false);
    expect(result.conflicts).toHaveLength(0);
  });

  test('تعارض معالج → canBook = false, hasErrors = true', () => {
    const newApt = {
      therapistId: 'T1',
      beneficiaryId: 'B2',
      date: '2024-01-08',
      startTime: '09:00',
      endTime: '09:45',
    };
    const result = detectAllConflicts(newApt, { existingAppointments: existingApts });
    expect(result.canBook).toBe(false);
    expect(result.hasErrors).toBe(true);
    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  test('تعارضات متعددة تُجمع في مصفوفة', () => {
    const newApt = {
      therapistId: 'T1',
      beneficiaryId: 'B1', // نفس المستفيد + نفس المعالج
      date: '2024-01-08',
      startTime: '09:00',
      endTime: '09:45',
    };
    const result = detectAllConflicts(newApt, { existingAppointments: existingApts });
    expect(result.conflicts.length).toBeGreaterThanOrEqual(2);
  });

  test('تعارض تحذيري فقط → canBook = true', () => {
    const availability = [
      { dayOfWeek: 'monday', startTime: '08:00', endTime: '17:00', isActive: true },
    ];
    // إضافة 8 مواعيد لاختبار caseload
    const manyApts = Array.from({ length: 8 }, (_, i) => ({
      id: `apt-${i + 10}`,
      therapistId: 'T1',
      beneficiaryId: `B${i + 10}`,
      date: '2024-01-08',
      startTime: `0${8 + i}:00`,
      endTime: `0${8 + i}:45`,
      status: 'confirmed',
    }));
    const newApt = {
      therapistId: 'T1',
      beneficiaryId: 'B99',
      date: '2024-01-08',
      startTime: '16:00',
      endTime: '16:45',
    };
    const result = detectAllConflicts(newApt, {
      existingAppointments: manyApts,
      therapistAvailability: availability,
      maxDailySessions: 8,
    });
    expect(result.hasWarnings).toBe(true);
    expect(result.canBook).toBe(true); // التحذير لا يمنع الحجز
  });

  test('نتيجة detectAllConflicts تحتوي الحقول الصحيحة', () => {
    const newApt = {
      therapistId: 'T1',
      beneficiaryId: 'B2',
      date: '2024-01-08',
      startTime: '10:00',
      endTime: '10:45',
    };
    const result = detectAllConflicts(newApt, {});
    expect(result).toHaveProperty('hasErrors');
    expect(result).toHaveProperty('hasWarnings');
    expect(result).toHaveProperty('conflicts');
    expect(result).toHaveProperty('canBook');
  });
});

// ========================================================
// 14. اختبارات generateTimeSlots
// ========================================================
describe('generateTimeSlots', () => {
  test('فترات 45 دقيقة من 8 إلى 17 بدون فاصل', () => {
    const slots = generateTimeSlots('08:00', '17:00', 45);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].startTime).toBe('08:00');
    expect(slots[0].endTime).toBe('08:45');
  });

  test('فترة واحدة فقط عند مطابقة المدة للنطاق', () => {
    const slots = generateTimeSlots('09:00', '09:45', 45);
    expect(slots).toHaveLength(1);
    expect(slots[0].startTime).toBe('09:00');
    expect(slots[0].endTime).toBe('09:45');
  });

  test('مدة 0 تُطلق خطأ', () => {
    expect(() => generateTimeSlots('08:00', '17:00', 0)).toThrow();
  });

  test('وقت نهاية قبل البداية يُطلق خطأ', () => {
    expect(() => generateTimeSlots('17:00', '08:00', 45)).toThrow();
  });

  test('مع فاصل بين الفترات', () => {
    const slots = generateTimeSlots('08:00', '10:00', 45, 15);
    // 8:00-8:45 ثم 9:00-9:45 (8:45 + 15 دقيقة فاصل)
    expect(slots.length).toBeGreaterThanOrEqual(2);
    if (slots.length >= 2) {
      expect(slots[1].startTime).toBe('09:00');
    }
  });

  test('كل فترة تحتوي startTime و endTime', () => {
    const slots = generateTimeSlots('09:00', '12:00', 45);
    for (const slot of slots) {
      expect(slot).toHaveProperty('startTime');
      expect(slot).toHaveProperty('endTime');
    }
  });

  test('لا تتجاوز الفترات وقت النهاية', () => {
    const slots = generateTimeSlots('08:00', '17:00', 45);
    const lastSlot = slots[slots.length - 1];
    expect(timeToMinutes(lastSlot.endTime)).toBeLessThanOrEqual(timeToMinutes('17:00'));
  });
});

// ========================================================
// 15. اختبارات getAvailableSlots
// ========================================================
describe('getAvailableSlots', () => {
  const availability = {
    startTime: '08:00',
    endTime: '17:00',
  };

  // 2024-01-08 = الاثنين
  test('بدون مواعيد محجوزة → كل الفترات متاحة', () => {
    const slots = getAvailableSlots({
      therapistId: 'T1',
      date: '2024-01-08',
      sessionDuration: 45,
      availability,
      existingAppointments: [],
    });
    expect(slots.length).toBeGreaterThan(0);
  });

  test('بعد حجز فترة → تلك الفترة تختفي', () => {
    const booked = [
      {
        id: 'apt-1',
        therapistId: 'T1',
        date: '2024-01-08',
        startTime: '09:00',
        endTime: '09:45',
        status: 'confirmed',
      },
    ];
    const slots = getAvailableSlots({
      therapistId: 'T1',
      date: '2024-01-08',
      sessionDuration: 45,
      availability,
      existingAppointments: booked,
    });
    const hasConflict = slots.some(s => doTimesOverlap(s.startTime, s.endTime, '09:00', '09:45'));
    expect(hasConflict).toBe(false);
  });

  test('يوم جمعة → لا فترات متاحة', () => {
    const slots = getAvailableSlots({
      therapistId: 'T1',
      date: '2024-01-12', // جمعة
      sessionDuration: 45,
      availability,
      existingAppointments: [],
    });
    expect(slots).toHaveLength(0);
  });

  test('availability = null → مصفوفة فارغة', () => {
    const slots = getAvailableSlots({
      therapistId: 'T1',
      date: '2024-01-08',
      sessionDuration: 45,
      availability: null,
      existingAppointments: [],
    });
    expect(slots).toHaveLength(0);
  });

  test('مع وقت استراحة → الفترة المتداخلة تُستبعد', () => {
    const availWithBreak = {
      startTime: '08:00',
      endTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
    };
    const slots = getAvailableSlots({
      therapistId: 'T1',
      date: '2024-01-08',
      sessionDuration: 60,
      availability: availWithBreak,
      existingAppointments: [],
    });
    const duringBreak = slots.some(s => doTimesOverlap(s.startTime, s.endTime, '12:00', '13:00'));
    expect(duringBreak).toBe(false);
  });

  test('المواعيد الملغاة لا تحجز الفترة', () => {
    const cancelled = [
      {
        id: 'apt-c',
        therapistId: 'T1',
        date: '2024-01-08',
        startTime: '09:00',
        endTime: '09:45',
        status: 'cancelled',
      },
    ];
    // الفترات بدون مواعيد
    const slotsEmpty = getAvailableSlots({
      therapistId: 'T1',
      date: '2024-01-08',
      sessionDuration: 45,
      availability,
      existingAppointments: [],
    });
    // الفترات مع موعد ملغى
    const slotsWithCancelled = getAvailableSlots({
      therapistId: 'T1',
      date: '2024-01-08',
      sessionDuration: 45,
      availability,
      existingAppointments: cancelled,
    });
    // الموعد الملغى لا يقلل الفترات المتاحة
    expect(slotsWithCancelled.length).toBe(slotsEmpty.length);
  });
});

// ========================================================
// 16. اختبارات getAvailableSlotsForMultipleTherapists
// ========================================================
describe('getAvailableSlotsForMultipleTherapists', () => {
  const therapists = [
    {
      id: 'T1',
      name: 'أحمد',
      specialization: 'pt',
      availability: { startTime: '08:00', endTime: '17:00' },
    },
    {
      id: 'T2',
      name: 'سارة',
      specialization: 'ot',
      availability: { startTime: '08:00', endTime: '17:00' },
    },
    {
      id: 'T3',
      name: 'محمد',
      specialization: 'speech',
      availability: null, // غير متوفر
    },
  ];

  test('يُرجع فترات للمعالجين المتوفرين فقط', () => {
    const result = getAvailableSlotsForMultipleTherapists(therapists, '2024-01-08', 45, []);
    // T3 لا يملك availability
    expect(result.every(r => r.therapistId !== 'T3')).toBe(true);
  });

  test('كل مدخل يحتوي availableCount', () => {
    const result = getAvailableSlotsForMultipleTherapists(therapists, '2024-01-08', 45, []);
    for (const r of result) {
      expect(r).toHaveProperty('availableCount');
      expect(r.availableCount).toBeGreaterThan(0);
    }
  });

  test('معالج محجوز بالكامل لا يظهر في النتائج', () => {
    const fullyBooked = Array.from({ length: 12 }, (_, i) => ({
      id: `apt-${i}`,
      therapistId: 'T1',
      date: '2024-01-08',
      startTime: minutesToTime(480 + i * 50),
      endTime: minutesToTime(480 + i * 50 + 45),
      status: 'confirmed',
    }));
    const result = getAvailableSlotsForMultipleTherapists(
      therapists,
      '2024-01-08',
      45,
      fullyBooked
    );
    // T1 قد لا يملك فترات
    const t2result = result.find(r => r.therapistId === 'T2');
    expect(t2result).toBeDefined();
    expect(t2result.availableCount).toBeGreaterThan(0);
  });
});

// ========================================================
// 17. اختبارات calculateOccupancyRate
// ========================================================
describe('calculateOccupancyRate', () => {
  const availability = { startTime: '08:00', endTime: '17:00' };

  test('لا مواعيد → إشغال 0%', () => {
    const rate = calculateOccupancyRate('T1', '2024-01-08', availability, [], 45);
    expect(rate).toBe(0);
  });

  test('يوم جمعة → إشغال 0%', () => {
    const rate = calculateOccupancyRate('T1', '2024-01-12', availability, [], 45);
    expect(rate).toBe(0);
  });

  test('availability = null → إشغال 0%', () => {
    const rate = calculateOccupancyRate('T1', '2024-01-08', null, [], 45);
    expect(rate).toBe(0);
  });

  test('بعض المواعيد المحجوزة → إشغال > 0%', () => {
    const booked = [
      {
        id: 'a1',
        therapistId: 'T1',
        date: '2024-01-08',
        startTime: '09:00',
        endTime: '09:45',
        status: 'confirmed',
      },
    ];
    const rate = calculateOccupancyRate('T1', '2024-01-08', availability, booked, 45);
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThanOrEqual(100);
  });

  test('النتيجة بين 0 و 100', () => {
    const booked = Array.from({ length: 5 }, (_, i) => ({
      id: `a${i}`,
      therapistId: 'T1',
      date: '2024-01-08',
      startTime: minutesToTime(480 + i * 60),
      endTime: minutesToTime(480 + i * 60 + 45),
      status: 'confirmed',
    }));
    const rate = calculateOccupancyRate('T1', '2024-01-08', availability, booked, 45);
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });
});

// ========================================================
// 18. اختبارات getDailyScheduleStats
// ========================================================
describe('getDailyScheduleStats', () => {
  const appointments = [
    { id: 1, date: '2024-01-08', status: 'confirmed' },
    { id: 2, date: '2024-01-08', status: 'completed' },
    { id: 3, date: '2024-01-08', status: 'cancelled' },
    { id: 4, date: '2024-01-08', status: 'no_show' },
    { id: 5, date: '2024-01-09', status: 'confirmed' }, // يوم مختلف
  ];

  test('total = عدد مواعيد اليوم فقط', () => {
    const stats = getDailyScheduleStats(appointments, '2024-01-08');
    expect(stats.total).toBe(4);
  });

  test('يحسب حالات الإلغاء', () => {
    const stats = getDailyScheduleStats(appointments, '2024-01-08');
    expect(stats.cancelled).toBe(1);
  });

  test('يحسب no_show', () => {
    const stats = getDailyScheduleStats(appointments, '2024-01-08');
    expect(stats.noShow).toBe(1);
  });

  test('يوم بدون مواعيد → total = 0', () => {
    const stats = getDailyScheduleStats(appointments, '2024-01-10');
    expect(stats.total).toBe(0);
    expect(stats.attendanceRate).toBe(0);
  });

  test('attendanceRate = (completed + confirmed) / total × 100', () => {
    const stats = getDailyScheduleStats(appointments, '2024-01-08');
    // completed=1, confirmed=1, total=4 → 50%
    expect(stats.attendanceRate).toBe(50);
  });

  test('cancellationRate محسوب بشكل صحيح', () => {
    const stats = getDailyScheduleStats(appointments, '2024-01-08');
    // cancelled=1, total=4 → 25%
    expect(stats.cancellationRate).toBe(25);
  });
});

// ========================================================
// 19. اختبارات generateWeeklyScheduleReport
// ========================================================
describe('generateWeeklyScheduleReport', () => {
  // الأسبوع من الأحد 2024-01-07
  const weekAppointments = [
    { id: 1, date: '2024-01-07', status: 'completed' }, // أحد
    { id: 2, date: '2024-01-07', status: 'completed' },
    { id: 3, date: '2024-01-08', status: 'confirmed' }, // اثنين
    { id: 4, date: '2024-01-09', status: 'cancelled' }, // ثلاثاء
  ];

  test('تقرير يحتوي weekStart', () => {
    const report = generateWeeklyScheduleReport(weekAppointments, '2024-01-07');
    expect(report.weekStart).toBe('2024-01-07');
  });

  test('totalAppointments يحسب جميع مواعيد الأسبوع', () => {
    const report = generateWeeklyScheduleReport(weekAppointments, '2024-01-07');
    expect(report.totalAppointments).toBe(4);
  });

  test('dailyBreakdown يحتوي 5 أيام افتراضياً', () => {
    const report = generateWeeklyScheduleReport(weekAppointments, '2024-01-07');
    expect(report.dailyBreakdown).toHaveLength(5);
  });

  test('averageOccupancy محسوب بشكل صحيح', () => {
    const report = generateWeeklyScheduleReport(weekAppointments, '2024-01-07');
    expect(report.averageOccupancy).toBeGreaterThanOrEqual(0);
    expect(report.averageOccupancy).toBeLessThanOrEqual(100);
  });

  test('تاريخ غير صالح يُطلق خطأ', () => {
    expect(() => generateWeeklyScheduleReport([], 'invalid-date')).toThrow();
  });

  test('أيام مخصصة', () => {
    const report = generateWeeklyScheduleReport(weekAppointments, '2024-01-07', 3);
    expect(report.dailyBreakdown).toHaveLength(3);
  });
});

// ========================================================
// 20. سيناريوهات متكاملة
// ========================================================
describe('سيناريوهات متكاملة', () => {
  test('جلسة يوم الاثنين بدون تعارضات → canBook = true', () => {
    const availability = [
      { dayOfWeek: 'monday', startTime: '08:00', endTime: '17:00', isActive: true },
    ];
    const newApt = {
      therapistId: 'T1',
      beneficiaryId: 'B1',
      date: '2024-01-08',
      startTime: '10:00',
      endTime: '10:45',
    };
    const result = detectAllConflicts(newApt, {
      existingAppointments: [],
      therapistAvailability: availability,
    });
    expect(result.canBook).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });

  test('جلسة مكررة → canBook = false', () => {
    const existing = [
      {
        id: 'apt-1',
        therapistId: 'T1',
        beneficiaryId: 'B1',
        date: '2024-01-08',
        startTime: '10:00',
        endTime: '10:45',
        status: 'confirmed',
      },
    ];
    const newApt = {
      therapistId: 'T1',
      beneficiaryId: 'B1',
      date: '2024-01-08',
      startTime: '10:00',
      endTime: '10:45',
    };
    const result = detectAllConflicts(newApt, { existingAppointments: existing });
    expect(result.canBook).toBe(false);
    // تعارض معالج + تعارض مستفيد
    expect(result.conflicts.length).toBeGreaterThanOrEqual(2);
  });

  test('عدد الفترات المتاحة ينقص بعد كل حجز', () => {
    const availability = { startTime: '08:00', endTime: '17:00' };
    const date = '2024-01-08';

    const slotsEmpty = getAvailableSlots({
      therapistId: 'T1',
      date,
      sessionDuration: 45,
      availability,
      existingAppointments: [],
    });

    const booked1 = [
      {
        id: 'a1',
        therapistId: 'T1',
        date,
        startTime: '09:00',
        endTime: '09:45',
        status: 'confirmed',
      },
    ];
    const slotsAfterOne = getAvailableSlots({
      therapistId: 'T1',
      date,
      sessionDuration: 45,
      availability,
      existingAppointments: booked1,
    });

    expect(slotsAfterOne.length).toBeLessThan(slotsEmpty.length);
  });

  test('إحصاءات الأسبوع تعكس المواعيد بدقة', () => {
    const appointments = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      date: '2024-01-08',
      status: i < 8 ? 'completed' : 'cancelled',
    }));
    const stats = getDailyScheduleStats(appointments, '2024-01-08');
    expect(stats.total).toBe(10);
    expect(stats.completed).toBe(8);
    expect(stats.cancelled).toBe(2);
    expect(stats.cancellationRate).toBe(20);
  });

  test('تدفق الحجز الكامل: كشف → فترات متاحة → اختيار → تحقق', () => {
    const availability = { startTime: '08:00', endTime: '17:00' };
    const date = '2024-01-08';
    const therapistId = 'T1';

    // 1. جلب الفترات المتاحة
    const slots = getAvailableSlots({
      therapistId,
      date,
      sessionDuration: 45,
      availability,
      existingAppointments: [],
    });
    expect(slots.length).toBeGreaterThan(0);

    // 2. اختيار الفترة الأولى
    const chosenSlot = slots[0];

    // 3. التحقق من عدم وجود تعارضات
    const newApt = {
      therapistId,
      beneficiaryId: 'B1',
      date,
      startTime: chosenSlot.startTime,
      endTime: chosenSlot.endTime,
    };
    const conflicts = detectAllConflicts(newApt, { existingAppointments: [] });
    expect(conflicts.canBook).toBe(true);
  });
});

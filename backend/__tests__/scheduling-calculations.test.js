'use strict';

const {
  SCHEDULING_CONSTANTS,
  timeToMinutes,
  minutesToTime,
  timeRangesOverlap,
  calculateEndTime,
  calculateDuration,
  getDayOfWeek,
  detectConflicts,
  calculateAvailableSlots,
  findNextAvailableSlot,
  analyzeTherapistSchedule,
  analyzeRoomUtilization,
  calculateWaitlistPriority,
  rankWaitlist,
  matchWaitlistToSlot,
  generateRecurringAppointments,
  calculateScheduleStatistics,
} = require('../services/scheduling/schedulingCalculations.service');

// ========================================
// CONSTANTS
// ========================================
describe('SCHEDULING_CONSTANTS', () => {
  test('WORKING_DAYS تحتوي على الأيام الصحيحة', () => {
    expect(SCHEDULING_CONSTANTS.WORKING_DAYS).toEqual(
      expect.arrayContaining(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'])
    );
    expect(SCHEDULING_CONSTANTS.WORKING_DAYS).not.toContain('friday');
    expect(SCHEDULING_CONSTANTS.WORKING_DAYS).not.toContain('saturday');
  });
  test('SESSION_TYPES تحتوي على الأنواع', () => {
    expect(SCHEDULING_CONSTANTS.SESSION_TYPES.INDIVIDUAL).toBe('individual');
    expect(SCHEDULING_CONSTANTS.SESSION_TYPES.GROUP).toBe('group');
  });
  test('CONFLICT_TYPES محددة', () => {
    expect(SCHEDULING_CONSTANTS.CONFLICT_TYPES.THERAPIST_CONFLICT).toBe('therapist_conflict');
    expect(SCHEDULING_CONSTANTS.CONFLICT_TYPES.ROOM_CONFLICT).toBe('room_conflict');
    expect(SCHEDULING_CONSTANTS.CONFLICT_TYPES.ON_LEAVE).toBe('on_leave');
  });
  test('SLOT_DURATION_DEFAULT = 45', () => {
    expect(SCHEDULING_CONSTANTS.SLOT_DURATION_DEFAULT).toBe(45);
  });
  test('BREAK_DURATION = 15', () => {
    expect(SCHEDULING_CONSTANTS.BREAK_DURATION).toBe(15);
  });
});

// ========================================
// TIME UTILITIES
// ========================================
describe('timeToMinutes', () => {
  test('09:00 → 540', () => expect(timeToMinutes('09:00')).toBe(540));
  test('00:00 → 0', () => expect(timeToMinutes('00:00')).toBe(0));
  test('23:59 → 1439', () => expect(timeToMinutes('23:59')).toBe(1439));
  test('10:30 → 630', () => expect(timeToMinutes('10:30')).toBe(630));
  test('null → 0', () => expect(timeToMinutes(null)).toBe(0));
  test('invalid → 0', () => expect(timeToMinutes('abc')).toBe(0));
  test('17:00 → 1020', () => expect(timeToMinutes('17:00')).toBe(1020));
});

describe('minutesToTime', () => {
  test('540 → 09:00', () => expect(minutesToTime(540)).toBe('09:00'));
  test('0 → 00:00', () => expect(minutesToTime(0)).toBe('00:00'));
  test('630 → 10:30', () => expect(minutesToTime(630)).toBe('10:30'));
  test('1439 → 23:59', () => expect(minutesToTime(1439)).toBe('23:59'));
  test('negative → 00:00', () => expect(minutesToTime(-1)).toBe('00:00'));
  test('1020 → 17:00', () => expect(minutesToTime(1020)).toBe('17:00'));
});

describe('timeRangesOverlap', () => {
  test('تداخل كامل', () =>
    expect(timeRangesOverlap('09:00', '10:00', '09:00', '10:00')).toBe(true));
  test('تداخل جزئي بداية', () =>
    expect(timeRangesOverlap('09:00', '10:00', '08:30', '09:30')).toBe(true));
  test('تداخل جزئي نهاية', () =>
    expect(timeRangesOverlap('09:00', '10:00', '09:30', '10:30')).toBe(true));
  test('متتالي لا يتداخل', () =>
    expect(timeRangesOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false));
  test('قبل - لا تداخل', () =>
    expect(timeRangesOverlap('09:00', '10:00', '07:00', '09:00')).toBe(false));
  test('بعد - لا تداخل', () =>
    expect(timeRangesOverlap('11:00', '12:00', '09:00', '10:00')).toBe(false));
  test('محيط', () => expect(timeRangesOverlap('09:00', '10:00', '08:00', '11:00')).toBe(true));
});

describe('calculateEndTime', () => {
  test('09:00 + 45 = 09:45', () => expect(calculateEndTime('09:00', 45)).toBe('09:45'));
  test('09:00 + 60 = 10:00', () => expect(calculateEndTime('09:00', 60)).toBe('10:00'));
  test('16:30 + 45 = 17:15', () => expect(calculateEndTime('16:30', 45)).toBe('17:15'));
  test('10:15 + 30 = 10:45', () => expect(calculateEndTime('10:15', 30)).toBe('10:45'));
});

describe('calculateDuration', () => {
  test('09:00 to 09:45 = 45', () => expect(calculateDuration('09:00', '09:45')).toBe(45));
  test('09:00 to 10:00 = 60', () => expect(calculateDuration('09:00', '10:00')).toBe(60));
  test('نفس الوقت = 0', () => expect(calculateDuration('10:00', '10:00')).toBe(0));
  test('نهاية قبل بداية = 0', () => expect(calculateDuration('10:00', '09:00')).toBe(0));
  test('08:00 to 17:00 = 540', () => expect(calculateDuration('08:00', '17:00')).toBe(540));
});

describe('getDayOfWeek', () => {
  test('2025-01-05 الأحد', () => expect(getDayOfWeek('2025-01-05')).toBe('sunday'));
  test('2025-01-06 الاثنين', () => expect(getDayOfWeek('2025-01-06')).toBe('monday'));
  test('2025-01-09 الخميس', () => expect(getDayOfWeek('2025-01-09')).toBe('thursday'));
  test('2025-01-10 الجمعة', () => expect(getDayOfWeek('2025-01-10')).toBe('friday'));
  test('null → null', () => expect(getDayOfWeek(null)).toBeNull());
  test('invalid → null', () => expect(getDayOfWeek('not-a-date')).toBeNull());
});

// ========================================
// CONFLICT DETECTION
// ========================================
describe('detectConflicts', () => {
  const baseAppt = {
    id: 'apt1',
    date: '2025-01-06',
    startTime: '09:00',
    endTime: '09:45',
    therapistId: 'T1',
    beneficiaryId: 'B1',
    roomId: 'R1',
    status: 'confirmed',
    appointmentNumber: 'APT-001',
  };

  test('لا تعارض مع قائمة فارغة', () => {
    const result = detectConflicts(
      {
        date: '2025-01-06',
        startTime: '09:00',
        endTime: '09:45',
        therapistId: 'T1',
        beneficiaryId: 'B1',
      },
      []
    );
    expect(result.hasConflicts).toBe(false);
    expect(result.canSchedule).toBe(true);
  });

  test('null → لا تعارض', () => {
    const result = detectConflicts(null, []);
    expect(result.hasConflicts).toBe(false);
  });

  test('تعارض المعالج', () => {
    const newAppt = {
      date: '2025-01-06',
      startTime: '09:20',
      endTime: '10:05',
      therapistId: 'T1',
      beneficiaryId: 'B2',
    };
    const result = detectConflicts(newAppt, [baseAppt]);
    expect(result.hasConflicts).toBe(true);
    const c = result.conflicts.find(c => c.type === 'therapist_conflict');
    expect(c).toBeDefined();
    expect(c.severity).toBe('error');
  });

  test('تعارض المستفيد', () => {
    const newAppt = {
      date: '2025-01-06',
      startTime: '09:20',
      endTime: '10:05',
      therapistId: 'T2',
      beneficiaryId: 'B1',
    };
    const result = detectConflicts(newAppt, [baseAppt]);
    const c = result.conflicts.find(c => c.type === 'beneficiary_conflict');
    expect(c).toBeDefined();
  });

  test('تعارض الغرفة', () => {
    const newAppt = {
      date: '2025-01-06',
      startTime: '09:20',
      endTime: '10:05',
      therapistId: 'T2',
      beneficiaryId: 'B2',
      roomId: 'R1',
    };
    const result = detectConflicts(newAppt, [baseAppt]);
    const c = result.conflicts.find(c => c.type === 'room_conflict');
    expect(c).toBeDefined();
  });

  test('لا تعارض لموعد ملغي', () => {
    const cancelled = { ...baseAppt, status: 'cancelled' };
    const newAppt = { date: '2025-01-06', startTime: '09:00', endTime: '09:45', therapistId: 'T1' };
    const result = detectConflicts(newAppt, [cancelled]);
    expect(result.hasConflicts).toBe(false);
  });

  test('لا تعارض في تواريخ مختلفة', () => {
    const newAppt = { date: '2025-01-07', startTime: '09:00', endTime: '09:45', therapistId: 'T1' };
    const result = detectConflicts(newAppt, [baseAppt]);
    expect(result.hasConflicts).toBe(false);
  });

  test('استبعاد الموعد نفسه عند التعديل', () => {
    const newAppt = { date: '2025-01-06', startTime: '09:00', endTime: '09:45', therapistId: 'T1' };
    const result = detectConflicts(newAppt, [baseAppt], { excludeId: 'apt1' });
    expect(result.hasConflicts).toBe(false);
  });

  test('تعارض إجازة المعالج', () => {
    const newAppt = { date: '2025-01-06', startTime: '10:00', endTime: '10:45', therapistId: 'T1' };
    const leaves = [
      { therapistId: 'T1', startDate: '2025-01-06', endDate: '2025-01-06', status: 'approved' },
    ];
    const result = detectConflicts(newAppt, [], { therapistLeaves: leaves });
    const c = result.conflicts.find(c => c.type === 'on_leave');
    expect(c).toBeDefined();
  });

  test('تحذير خارج أوقات التوفر', () => {
    const newAppt = { date: '2025-01-06', startTime: '07:00', endTime: '07:45', therapistId: 'T1' };
    const avail = [
      {
        therapistId: 'T1',
        dayOfWeek: 'monday',
        startTime: '08:00',
        endTime: '17:00',
        isActive: true,
      },
    ];
    const result = detectConflicts(newAppt, [], { therapistAvailability: avail });
    expect(result.hasWarnings).toBe(true);
    const w = result.warnings.find(w => w.type === 'outside_availability');
    expect(w).toBeDefined();
  });

  test('تحذير لا يوجد توفر في هذا اليوم', () => {
    // يوم الجمعة لا يوجد توفر
    const newAppt = { date: '2025-01-10', startTime: '09:00', endTime: '09:45', therapistId: 'T1' };
    const avail = [
      {
        therapistId: 'T1',
        dayOfWeek: 'monday',
        startTime: '08:00',
        endTime: '17:00',
        isActive: true,
      },
    ];
    const result = detectConflicts(newAppt, [], { therapistAvailability: avail });
    expect(result.hasWarnings).toBe(true);
  });

  test('تحذير تجاوز الحد الأقصى', () => {
    const apps = Array.from({ length: 3 }, (_, i) => ({
      id: `a${i}`,
      date: '2025-01-06',
      startTime: `0${i + 8}:00`,
      endTime: `0${i + 8}:45`,
      therapistId: 'T1',
      status: 'confirmed',
    }));
    const newAppt = { date: '2025-01-06', startTime: '11:00', endTime: '11:45', therapistId: 'T1' };
    const result = detectConflicts(newAppt, apps, { maxDailySessions: 3 });
    const w = result.warnings.find(w => w.type === 'caseload_exceeded');
    expect(w).toBeDefined();
  });
});

// ========================================
// AVAILABLE SLOTS
// ========================================
describe('calculateAvailableSlots', () => {
  const avail = { startTime: '08:00', endTime: '12:00', slotDuration: 45 };

  test('قائمة فارغة بدون مواعيد', () => {
    const slots = calculateAvailableSlots('2025-01-06', 'T1', avail, [], 45);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].startTime).toBe('08:00');
    expect(slots[0].endTime).toBe('08:45');
    expect(slots[0].therapistId).toBe('T1');
  });

  test('تخطي الوقت المحجوز', () => {
    const booked = [
      {
        date: '2025-01-06',
        therapistId: 'T1',
        startTime: '08:00',
        endTime: '08:45',
        status: 'confirmed',
      },
    ];
    const slots = calculateAvailableSlots('2025-01-06', 'T1', avail, booked, 45);
    expect(slots.every(s => s.startTime !== '08:00')).toBe(true);
  });

  test('تخطي فترة الاستراحة', () => {
    const availWithBreak = {
      startTime: '08:00',
      endTime: '13:00',
      breakStart: '10:00',
      breakEnd: '10:15',
    };
    const slots = calculateAvailableSlots('2025-01-06', 'T1', availWithBreak, [], 45);
    // لا توجد فترة تبدأ في وقت الاستراحة أو تتداخل معها
    const conflictsBreak = slots.filter(s =>
      timeRangesOverlap(s.startTime, s.endTime, '10:00', '10:15')
    );
    expect(conflictsBreak.length).toBe(0);
  });

  test('null بارامترات → قائمة فارغة', () => {
    expect(calculateAvailableSlots(null, 'T1', avail)).toEqual([]);
    expect(calculateAvailableSlots('2025-01-06', null, avail)).toEqual([]);
    expect(calculateAvailableSlots('2025-01-06', 'T1', null)).toEqual([]);
  });

  test('تواريخ مختلفة لا تؤثر على النتيجة', () => {
    const booked = [
      {
        date: '2025-01-07',
        therapistId: 'T1',
        startTime: '08:00',
        endTime: '08:45',
        status: 'confirmed',
      },
    ];
    const slots = calculateAvailableSlots('2025-01-06', 'T1', avail, booked, 45);
    expect(slots.some(s => s.startTime === '08:00')).toBe(true);
  });
});

describe('findNextAvailableSlot', () => {
  const weeklyAvail = [
    {
      therapistId: 'T1',
      dayOfWeek: 'monday',
      startTime: '08:00',
      endTime: '12:00',
      isActive: true,
    },
    {
      therapistId: 'T1',
      dayOfWeek: 'tuesday',
      startTime: '08:00',
      endTime: '12:00',
      isActive: true,
    },
  ];

  test('يجد أول فتحة متاحة', () => {
    const result = findNextAvailableSlot('2025-01-06', 14, 'T1', weeklyAvail, [], 45);
    expect(result).not.toBeNull();
    expect(result.startTime).toBeDefined();
    expect(result.daysFromNow).toBeGreaterThanOrEqual(0);
  });

  test('يتخطى أيام غير العمل', () => {
    // 2025-01-10 جمعة - يجب تخطيها
    const result = findNextAvailableSlot('2025-01-10', 7, 'T1', weeklyAvail, [], 45);
    if (result) {
      const day = getDayOfWeek(result.date);
      expect(SCHEDULING_CONSTANTS.WORKING_DAYS).toContain(day);
    }
  });

  test('null بارامترات → null', () => {
    expect(findNextAvailableSlot(null, 7, 'T1', weeklyAvail)).toBeNull();
    expect(findNextAvailableSlot('2025-01-06', 7, null, weeklyAvail)).toBeNull();
    expect(findNextAvailableSlot('2025-01-06', 7, 'T1', null)).toBeNull();
  });

  test('تاريخ غير صالح → null', () => {
    expect(findNextAvailableSlot('invalid', 7, 'T1', weeklyAvail)).toBeNull();
  });
});

// ========================================
// SCHEDULE ANALYSIS
// ========================================
describe('analyzeTherapistSchedule', () => {
  const appointments = [
    {
      therapistId: 'T1',
      date: '2025-01-06',
      startTime: '09:00',
      endTime: '09:45',
      status: 'completed',
      sessionType: 'individual',
    },
    {
      therapistId: 'T1',
      date: '2025-01-06',
      startTime: '10:00',
      endTime: '10:45',
      status: 'completed',
      sessionType: 'group',
    },
    {
      therapistId: 'T1',
      date: '2025-01-07',
      startTime: '09:00',
      endTime: '09:45',
      status: 'no_show',
      sessionType: 'individual',
    },
    {
      therapistId: 'T1',
      date: '2025-01-07',
      startTime: '10:00',
      endTime: '10:45',
      status: 'cancelled',
      sessionType: 'individual',
    },
    {
      therapistId: 'T2',
      date: '2025-01-06',
      startTime: '09:00',
      endTime: '09:45',
      status: 'completed',
      sessionType: 'individual',
    },
  ];

  test('إجماليات صحيحة', () => {
    const r = analyzeTherapistSchedule('T1', appointments);
    expect(r.isValid).toBe(true);
    expect(r.total).toBe(4);
    expect(r.completed).toBe(2);
    expect(r.noShow).toBe(1);
    expect(r.cancelled).toBe(1);
  });

  test('معدل الحضور', () => {
    const r = analyzeTherapistSchedule('T1', appointments);
    // completed/(completed+noShow) = 2/3 = 67%
    expect(r.attendanceRate).toBe(67);
  });

  test('توزيع حسب نوع الجلسة', () => {
    const r = analyzeTherapistSchedule('T1', appointments);
    expect(r.bySessionType.individual).toBe(3);
    expect(r.bySessionType.group).toBe(1);
  });

  test('إجمالي الساعات', () => {
    const r = analyzeTherapistSchedule('T1', appointments);
    // completed فقط: 2 جلسات × 45 = 90 دقيقة = 1.5 ساعة
    expect(r.totalHours).toBe(1.5);
  });

  test('معالج غير موجود → total=0', () => {
    const r = analyzeTherapistSchedule('T99', appointments);
    expect(r.total).toBe(0);
  });

  test('null therapistId → isValid false', () => {
    const r = analyzeTherapistSchedule(null, appointments);
    expect(r.isValid).toBe(false);
  });
});

describe('analyzeRoomUtilization', () => {
  const appointments = [
    { roomId: 'R1', date: '2025-01-06', startTime: '09:00', endTime: '09:45', status: 'completed' },
    { roomId: 'R1', date: '2025-01-06', startTime: '10:00', endTime: '10:45', status: 'confirmed' },
    { roomId: 'R1', date: '2025-01-07', startTime: '09:00', endTime: '09:45', status: 'scheduled' },
    { roomId: 'R2', date: '2025-01-06', startTime: '09:00', endTime: '09:45', status: 'completed' },
  ];

  test('إجماليات صحيحة', () => {
    const r = analyzeRoomUtilization('R1', appointments, { openTime: '08:00', closeTime: '17:00' });
    expect(r.isValid).toBe(true);
    expect(r.totalAppointments).toBe(3);
    expect(r.usedMinutes).toBe(135); // 3 × 45
  });

  test('null roomId → isValid false', () => {
    expect(analyzeRoomUtilization(null, appointments).isValid).toBe(false);
  });

  test('تضمين توصية', () => {
    const r = analyzeRoomUtilization('R1', appointments, { openTime: '08:00', closeTime: '17:00' });
    expect(r.recommendation).toBeDefined();
  });

  test('استخدام منخفض → توصية مناسبة', () => {
    const r = analyzeRoomUtilization(
      'R1',
      [
        {
          roomId: 'R1',
          date: '2025-01-06',
          startTime: '09:00',
          endTime: '09:45',
          status: 'completed',
        },
      ],
      { openTime: '08:00', closeTime: '17:00' }
    );
    expect(r.utilizationRate).toBeLessThan(60);
    expect(r.recommendation).toContain('منخفض');
  });
});

// ========================================
// WAITLIST
// ========================================
describe('calculateWaitlistPriority', () => {
  test('null → 0', () => expect(calculateWaitlistPriority(null)).toBe(0));

  test('حالة شديدة + طفل صغير + إحالة عاجلة', () => {
    const score = calculateWaitlistPriority({
      disabilitySeverity: 'severe',
      beneficiaryAge: 2,
      isUrgentReferral: true,
      currentlyReceivingServices: false,
      waitingDays: 0,
    });
    expect(score).toBeGreaterThan(80);
  });

  test('حالة خفيفة + كبير السن → نقاط أقل', () => {
    const score = calculateWaitlistPriority({
      disabilitySeverity: 'mild',
      beneficiaryAge: 25,
      isUrgentReferral: false,
      currentlyReceivingServices: true,
      waitingDays: 0,
    });
    expect(score).toBeLessThan(70);
  });

  test('انتظار أسبوعين يضيف نقاطاً', () => {
    const base = calculateWaitlistPriority({
      disabilitySeverity: 'moderate',
      beneficiaryAge: 10,
      waitingDays: 0,
    });
    const withWait = calculateWaitlistPriority({
      disabilitySeverity: 'moderate',
      beneficiaryAge: 10,
      waitingDays: 14,
    });
    expect(withWait).toBeGreaterThan(base);
  });

  test('انتظار 70 يوم → حد أقصى 20 نقطة إضافية', () => {
    const long = calculateWaitlistPriority({
      disabilitySeverity: 'moderate',
      beneficiaryAge: 10,
      waitingDays: 70,
    });
    const short = calculateWaitlistPriority({
      disabilitySeverity: 'moderate',
      beneficiaryAge: 10,
      waitingDays: 0,
    });
    expect(long - short).toBeLessThanOrEqual(20);
  });

  test('أولوية يدوية urgent تزيد النقاط', () => {
    const normal = calculateWaitlistPriority({ disabilitySeverity: 'mild', beneficiaryAge: 10 });
    const urgent = calculateWaitlistPriority({
      disabilitySeverity: 'mild',
      beneficiaryAge: 10,
      manualPriority: 'urgent',
    });
    expect(urgent).toBeGreaterThan(normal);
  });

  test('النتيجة بين 0 و 100', () => {
    const s = calculateWaitlistPriority({
      disabilitySeverity: 'profound',
      beneficiaryAge: 1,
      isUrgentReferral: true,
      currentlyReceivingServices: false,
      waitingDays: 100,
      manualPriority: 'urgent',
    });
    expect(s).toBeLessThanOrEqual(100);
    expect(s).toBeGreaterThanOrEqual(0);
  });
});

describe('rankWaitlist', () => {
  const entries = [
    {
      id: 'E1',
      status: 'waiting',
      disabilitySeverity: 'mild',
      beneficiaryAge: 20,
      isUrgentReferral: false,
      createdAt: '2025-01-01',
    },
    {
      id: 'E2',
      status: 'waiting',
      disabilitySeverity: 'severe',
      beneficiaryAge: 3,
      isUrgentReferral: true,
      createdAt: '2025-01-02',
    },
    {
      id: 'E3',
      status: 'waiting',
      disabilitySeverity: 'moderate',
      beneficiaryAge: 6,
      isUrgentReferral: false,
      createdAt: '2025-01-03',
    },
    {
      id: 'E4',
      status: 'offered',
      disabilitySeverity: 'severe',
      beneficiaryAge: 2,
      createdAt: '2025-01-01',
    },
  ];

  test('يُرجع قائمة فارغة للمدخل الفارغ', () => {
    expect(rankWaitlist([])).toEqual([]);
    expect(rankWaitlist(null)).toEqual([]);
  });

  test('يُرجع فقط المنتظرين (status=waiting)', () => {
    const ranked = rankWaitlist(entries);
    expect(ranked.every(e => e.status === 'waiting')).toBe(true);
    expect(ranked.length).toBe(3);
  });

  test('الأعلى أولوية في المرتبة الأولى', () => {
    const ranked = rankWaitlist(entries);
    expect(ranked[0].id).toBe('E2'); // severe + 3 years + urgent
  });

  test('تضمين الترتيب rank', () => {
    const ranked = rankWaitlist(entries);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
  });

  test('تضمين priorityScore', () => {
    const ranked = rankWaitlist(entries);
    ranked.forEach(e => expect(e.priorityScore).toBeDefined());
  });
});

describe('matchWaitlistToSlot', () => {
  const waitlist = [
    {
      id: 'E1',
      status: 'waiting',
      rank: 1,
      priorityScore: 90,
      preferredDays: ['monday'],
      preferredTimeFrom: '09:00',
      preferredTimeTo: '12:00',
      preferredTherapistId: 'T1',
    },
    {
      id: 'E2',
      status: 'waiting',
      rank: 2,
      priorityScore: 70,
      preferredDays: null,
      preferredTimeFrom: null,
      preferredTimeTo: null,
    },
  ];

  const slots = [
    {
      date: '2025-01-06',
      startTime: '09:30',
      endTime: '10:15',
      therapistId: 'T1',
      durationMinutes: 45,
    },
    {
      date: '2025-01-07',
      startTime: '10:00',
      endTime: '10:45',
      therapistId: 'T2',
      durationMinutes: 45,
    },
  ];

  test('يطابق الأول في القائمة مع المواعيد المتاحة', () => {
    const match = matchWaitlistToSlot(waitlist, slots);
    expect(match).not.toBeNull();
    expect(match.waitlistEntry).toBeDefined();
    expect(match.slot).toBeDefined();
  });

  test('قوائم فارغة → null', () => {
    expect(matchWaitlistToSlot([], slots)).toBeNull();
    expect(matchWaitlistToSlot(waitlist, [])).toBeNull();
  });

  test('تضمين matchScore', () => {
    const match = matchWaitlistToSlot(waitlist, slots);
    expect(match.matchScore).toBeDefined();
    expect(match.matchScore).toBeGreaterThan(0);
  });

  test('مطابقة بالمعالج المفضل', () => {
    const match = matchWaitlistToSlot(waitlist, slots);
    if (match.waitlistEntry.id === 'E1') {
      // يجب أن يطابق T1 في monday 09:30
      expect(match.slot.therapistId).toBe('T1');
    }
  });
});

// ========================================
// RECURRING APPOINTMENTS
// ========================================
describe('generateRecurringAppointments', () => {
  test('null → isValid false', () => {
    const r = generateRecurringAppointments(null);
    expect(r.isValid).toBe(false);
  });

  test('تواريخ غير صالحة → isValid false', () => {
    const r = generateRecurringAppointments({
      startDate: 'bad',
      endDate: 'bad',
      frequency: 'weekly',
    });
    expect(r.isValid).toBe(false);
  });

  test('تواريخ عكسية → isValid false', () => {
    const r = generateRecurringAppointments({
      startDate: '2025-01-10',
      endDate: '2025-01-05',
      frequency: 'weekly',
    });
    expect(r.isValid).toBe(false);
  });

  test('تكرار يومي - يتخطى الجمعة والسبت', () => {
    const r = generateRecurringAppointments({
      startDate: '2025-01-05',
      endDate: '2025-01-11',
      frequency: 'daily',
      startTime: '09:00',
      durationMinutes: 45,
      therapistId: 'T1',
      beneficiaryId: 'B1',
    });
    expect(r.isValid).toBe(true);
    // 5 يناير أحد → 9 يناير خميس = 5 أيام عمل
    expect(r.totalGenerated).toBe(5);
    r.generated.forEach(a => {
      const day = getDayOfWeek(a.date);
      expect(SCHEDULING_CONSTANTS.WORKING_DAYS).toContain(day);
    });
  });

  test('تكرار أسبوعي بأيام محددة', () => {
    const r = generateRecurringAppointments({
      startDate: '2025-01-05',
      endDate: '2025-01-25',
      frequency: 'weekly',
      daysOfWeek: ['sunday', 'tuesday'],
      startTime: '10:00',
      durationMinutes: 45,
      therapistId: 'T1',
      beneficiaryId: 'B1',
    });
    expect(r.isValid).toBe(true);
    r.generated.forEach(a => {
      const day = getDayOfWeek(a.date);
      expect(['sunday', 'tuesday']).toContain(day);
    });
  });

  test('تكرار شهري', () => {
    const r = generateRecurringAppointments({
      startDate: '2025-01-06',
      endDate: '2025-04-06',
      frequency: 'monthly',
      startTime: '09:00',
      durationMinutes: 45,
      therapistId: 'T1',
      beneficiaryId: 'B1',
    });
    expect(r.isValid).toBe(true);
    expect(r.totalGenerated).toBeGreaterThanOrEqual(3);
  });

  test('تكرار مرتين أسبوعياً', () => {
    const r = generateRecurringAppointments({
      startDate: '2025-01-05',
      endDate: '2025-01-25',
      frequency: 'biweekly',
      daysOfWeek: ['monday', 'wednesday'],
      startTime: '09:00',
      durationMinutes: 45,
      therapistId: 'T1',
      beneficiaryId: 'B1',
    });
    expect(r.isValid).toBe(true);
    expect(r.totalGenerated).toBeGreaterThan(0);
  });

  test('يتجنب التعارضات مع المواعيد الموجودة', () => {
    const existing = [
      {
        id: 'X1',
        date: '2025-01-06',
        startTime: '09:00',
        endTime: '09:45',
        therapistId: 'T1',
        beneficiaryId: 'B2',
        status: 'confirmed',
      },
    ];
    const r = generateRecurringAppointments(
      {
        startDate: '2025-01-06',
        endDate: '2025-01-06',
        frequency: 'daily',
        startTime: '09:00',
        durationMinutes: 45,
        therapistId: 'T1',
        beneficiaryId: 'B1',
      },
      existing
    );
    expect(r.totalSkipped).toBe(1);
    expect(r.totalGenerated).toBe(0);
    expect(r.conflicts.length).toBe(1);
  });

  test('يُنشئ مواعيد بخصائص صحيحة', () => {
    const r = generateRecurringAppointments({
      startDate: '2025-01-06',
      endDate: '2025-01-06',
      frequency: 'daily',
      startTime: '09:00',
      durationMinutes: 45,
      therapistId: 'T1',
      beneficiaryId: 'B1',
      serviceId: 'S1',
    });
    expect(r.totalGenerated).toBe(1);
    expect(r.generated[0].isRecurring).toBe(true);
    expect(r.generated[0].sessionNumber).toBe(1);
    expect(r.generated[0].startTime).toBe('09:00');
    expect(r.generated[0].endTime).toBe('09:45');
  });
});

// ========================================
// SCHEDULE STATISTICS
// ========================================
describe('calculateScheduleStatistics', () => {
  const appointments = [
    {
      branchId: 'B1',
      date: '2025-01-06',
      startTime: '09:00',
      endTime: '09:45',
      status: 'completed',
      sessionType: 'individual',
      therapistId: 'T1',
      beneficiaryId: 'Ben1',
    },
    {
      branchId: 'B1',
      date: '2025-01-06',
      startTime: '10:00',
      endTime: '10:45',
      status: 'completed',
      sessionType: 'group',
      therapistId: 'T1',
      beneficiaryId: 'Ben2',
    },
    {
      branchId: 'B1',
      date: '2025-01-07',
      startTime: '09:00',
      endTime: '09:45',
      status: 'no_show',
      sessionType: 'individual',
      therapistId: 'T2',
      beneficiaryId: 'Ben3',
    },
    {
      branchId: 'B1',
      date: '2025-01-07',
      startTime: '10:00',
      endTime: '10:45',
      status: 'cancelled',
      sessionType: 'individual',
      therapistId: 'T1',
      beneficiaryId: 'Ben1',
    },
    {
      branchId: 'B2',
      date: '2025-01-06',
      startTime: '09:00',
      endTime: '09:45',
      status: 'completed',
      sessionType: 'individual',
      therapistId: 'T3',
      beneficiaryId: 'Ben4',
    },
    {
      branchId: 'B1',
      date: '2025-01-08',
      startTime: '09:00',
      endTime: '09:45',
      status: 'scheduled',
      sessionType: 'individual',
      therapistId: 'T2',
      beneficiaryId: 'Ben2',
    },
  ];

  test('إجمالي صحيح بدون فلتر', () => {
    const r = calculateScheduleStatistics(appointments);
    expect(r.total).toBe(6);
  });

  test('فلتر الفرع', () => {
    const r = calculateScheduleStatistics(appointments, { branchId: 'B1' });
    expect(r.total).toBe(5);
  });

  test('عدد الحالات حسب الحالة', () => {
    const r = calculateScheduleStatistics(appointments, { branchId: 'B1' });
    expect(r.statusCounts.completed).toBe(2);
    expect(r.statusCounts.no_show).toBe(1);
    expect(r.statusCounts.cancelled).toBe(1);
    expect(r.statusCounts.scheduled).toBe(1);
  });

  test('معدل الحضور', () => {
    const r = calculateScheduleStatistics(appointments, { branchId: 'B1' });
    // completed=2, noShow=1 → 2/3 = 67%
    expect(r.attendanceRate).toBe(67);
  });

  test('معدل عدم الحضور', () => {
    const r = calculateScheduleStatistics(appointments, { branchId: 'B1' });
    expect(r.noShowRate).toBe(33);
  });

  test('معدل الإلغاء', () => {
    const r = calculateScheduleStatistics(appointments, { branchId: 'B1' });
    // cancelled=1/total=5 = 20%
    expect(r.cancellationRate).toBe(20);
  });

  test('إجمالي ساعات الخدمة', () => {
    const r = calculateScheduleStatistics(appointments, { branchId: 'B1' });
    // completed: 2 × 45 = 90 min = 1.5 h
    expect(r.totalServiceHours).toBe(1.5);
  });

  test('متوسط مدة الجلسة', () => {
    const r = calculateScheduleStatistics(appointments, { branchId: 'B1' });
    expect(r.averageSessionDuration).toBe(45);
  });

  test('عدد المعالجين الفريدين', () => {
    const r = calculateScheduleStatistics(appointments, { branchId: 'B1' });
    expect(r.uniqueTherapists).toBe(2); // T1, T2
  });

  test('عدد المستفيدين الفريدين', () => {
    const r = calculateScheduleStatistics(appointments, { branchId: 'B1' });
    expect(r.uniqueBeneficiaries).toBe(3); // Ben1, Ben2, Ben3
  });

  test('توزيع حسب نوع الجلسة', () => {
    const r = calculateScheduleStatistics(appointments);
    expect(r.bySessionType.individual).toBeGreaterThan(0);
    expect(r.bySessionType.group).toBeGreaterThan(0);
  });

  test('فلتر التاريخ', () => {
    const r = calculateScheduleStatistics(appointments, {
      dateFrom: '2025-01-07',
      dateTo: '2025-01-08',
    });
    expect(r.total).toBe(3);
  });

  test('مصفوفة غير صالحة → total:0', () => {
    const r = calculateScheduleStatistics(null);
    expect(r.total).toBe(0);
  });
});

// ========================================
// INTEGRATION SCENARIOS
// ========================================
describe('Integration - كشف التعارضات الشامل', () => {
  test('موعد جديد مع كل أنواع التعارضات', () => {
    const existing = [
      {
        id: 'A1',
        date: '2025-01-06',
        startTime: '09:00',
        endTime: '09:45',
        therapistId: 'T1',
        beneficiaryId: 'B1',
        roomId: 'R1',
        status: 'confirmed',
      },
    ];
    const newAppt = {
      date: '2025-01-06',
      startTime: '09:20',
      endTime: '10:05',
      therapistId: 'T1',
      beneficiaryId: 'B1',
      roomId: 'R1',
    };
    const result = detectConflicts(newAppt, existing);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts.length).toBeGreaterThanOrEqual(2);
  });

  test('سير عمل كامل: قائمة انتظار → فتحة متاحة → مطابقة', () => {
    const waitlist = [
      {
        id: 'W1',
        status: 'waiting',
        disabilitySeverity: 'severe',
        beneficiaryAge: 4,
        isUrgentReferral: true,
        createdAt: '2025-01-01',
      },
      {
        id: 'W2',
        status: 'waiting',
        disabilitySeverity: 'mild',
        beneficiaryAge: 20,
        isUrgentReferral: false,
        createdAt: '2025-01-01',
      },
    ];

    const ranked = rankWaitlist(waitlist);
    expect(ranked[0].id).toBe('W1');

    const avail = { startTime: '08:00', endTime: '12:00' };
    const slots = calculateAvailableSlots('2025-01-06', 'T1', avail, [], 45);
    expect(slots.length).toBeGreaterThan(0);

    const match = matchWaitlistToSlot(ranked, slots);
    expect(match).not.toBeNull();
    expect(match.waitlistEntry.id).toBe('W1');
  });

  test('توليد مواعيد متكررة + إحصائيات', () => {
    const recurrence = {
      startDate: '2025-01-06',
      endDate: '2025-01-17',
      frequency: 'weekly',
      daysOfWeek: ['monday', 'wednesday'],
      startTime: '10:00',
      durationMinutes: 45,
      therapistId: 'T1',
      beneficiaryId: 'B1',
    };

    const { generated } = generateRecurringAppointments(recurrence);
    const stats = calculateScheduleStatistics(
      generated.map(a => ({ ...a, branchId: 'BR1', sessionType: 'individual' }))
    );

    expect(stats.total).toBeGreaterThan(0);
    expect(stats.statusCounts.scheduled).toBe(stats.total);
  });
});

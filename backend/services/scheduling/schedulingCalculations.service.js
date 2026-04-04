/**
 * Scheduling Calculations Service
 * خدمة حسابات الجدولة والمواعيد
 * كشف التعارضات + الفترات المتاحة + قائمة الانتظار الذكية + إحصائيات الجدول
 * Pure Business Logic - No DB, No Side Effects
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 */

'use strict';

// ========================================
// CONSTANTS
// ========================================
const SCHEDULING_CONSTANTS = {
  WORKING_DAYS: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
  SESSION_TYPES: {
    INDIVIDUAL: 'individual',
    GROUP: 'group',
    ASSESSMENT: 'assessment',
    CONSULTATION: 'consultation',
    FOLLOWUP: 'followup',
  },
  APPOINTMENT_STATUS: {
    SCHEDULED: 'scheduled',
    CONFIRMED: 'confirmed',
    CHECKED_IN: 'checked_in',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    NO_SHOW: 'no_show',
    CANCELLED: 'cancelled',
    RESCHEDULED: 'rescheduled',
  },
  CONFLICT_TYPES: {
    THERAPIST_CONFLICT: 'therapist_conflict',
    BENEFICIARY_CONFLICT: 'beneficiary_conflict',
    ROOM_CONFLICT: 'room_conflict',
    CASELOAD_EXCEEDED: 'caseload_exceeded',
    OUTSIDE_AVAILABILITY: 'outside_availability',
    ON_LEAVE: 'on_leave',
  },
  CONFLICT_SEVERITY: {
    ERROR: 'error',
    WARNING: 'warning',
  },
  SLOT_DURATION_DEFAULT: 45, // دقيقة - مدة الجلسة الافتراضية
  MIN_SLOT_DURATION: 15,
  MAX_SLOT_DURATION: 120,
  BREAK_DURATION: 15, // دقيقة راحة بين الجلسات
  MAX_DAILY_SESSIONS_PER_THERAPIST: 8,
  WAITLIST_PRIORITY: {
    URGENT: 100,
    HIGH: 70,
    NORMAL: 50,
    LOW: 30,
  },
};

// ========================================
// TIME UTILITIES
// ========================================

/**
 * تحويل وقت "HH:MM" إلى دقائق من منتصف الليل
 * @param {string} time - "HH:MM"
 * @returns {number}
 */
function timeToMinutes(time) {
  if (!time || typeof time !== 'string') return 0;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * تحويل دقائق إلى "HH:MM"
 * @param {number} minutes
 * @returns {string}
 */
function minutesToTime(minutes) {
  if (typeof minutes !== 'number' || minutes < 0) return '00:00';
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * التحقق من تداخل فترتين زمنيتين
 * @param {string} start1 - "HH:MM"
 * @param {string} end1 - "HH:MM"
 * @param {string} start2 - "HH:MM"
 * @param {string} end2 - "HH:MM"
 * @returns {boolean}
 */
function timeRangesOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && e1 > s2;
}

/**
 * حساب وقت النهاية بناءً على وقت البداية والمدة
 * @param {string} startTime - "HH:MM"
 * @param {number} durationMinutes
 * @returns {string}
 */
function calculateEndTime(startTime, durationMinutes) {
  const startMins = timeToMinutes(startTime);
  return minutesToTime(startMins + durationMinutes);
}

/**
 * حساب مدة الفترة بالدقائق
 * @param {string} startTime
 * @param {string} endTime
 * @returns {number}
 */
function calculateDuration(startTime, endTime) {
  return Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime));
}

/**
 * تحويل اسم اليوم العربي إلى الإنجليزي
 * @param {string} dayName
 * @returns {string}
 */
function getDayOfWeek(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

// ========================================
// CONFLICT DETECTION
// ========================================

/**
 * كشف تعارضات الموعد
 * @param {object} newAppointment - الموعد الجديد
 * @param {Array} existingAppointments - المواعيد القائمة
 * @param {object} options - {therapistAvailability, therapistLeaves, maxCaseload, excludeId}
 * @returns {object} - {hasConflicts, conflicts, warnings}
 */
function detectConflicts(newAppointment, existingAppointments = [], options = {}) {
  if (!newAppointment) {
    return { hasConflicts: false, conflicts: [], warnings: [] };
  }

  const conflicts = [];
  const warnings = [];

  const { date, startTime, endTime, therapistId, beneficiaryId, roomId } = newAppointment;

  const excludeId = options.excludeId || null;

  // فلترة المواعيد المفعلة في نفس اليوم (استبعاد الملغاة والمؤجلة)
  const activeStatuses = [
    SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.SCHEDULED,
    SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.CONFIRMED,
    SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.CHECKED_IN,
    SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.IN_PROGRESS,
  ];

  const sameDayApps = existingAppointments.filter(
    a => a.date === date && activeStatuses.includes(a.status) && (!excludeId || a.id !== excludeId)
  );

  // 1. تعارض المعالج
  if (therapistId) {
    const therapistConflict = sameDayApps.find(
      a =>
        a.therapistId === therapistId &&
        timeRangesOverlap(startTime, endTime, a.startTime, a.endTime)
    );
    if (therapistConflict) {
      conflicts.push({
        type: SCHEDULING_CONSTANTS.CONFLICT_TYPES.THERAPIST_CONFLICT,
        severity: SCHEDULING_CONSTANTS.CONFLICT_SEVERITY.ERROR,
        message: `المعالج لديه موعد في نفس الوقت: ${therapistConflict.appointmentNumber || therapistConflict.id}`,
        conflictingId: therapistConflict.id,
      });
    }

    // تعارض مع إجازة المعالج
    if (options.therapistLeaves && options.therapistLeaves.length > 0) {
      const onLeave = options.therapistLeaves.some(
        leave =>
          leave.therapistId === therapistId &&
          leave.startDate <= date &&
          leave.endDate >= date &&
          leave.status === 'approved'
      );
      if (onLeave) {
        conflicts.push({
          type: SCHEDULING_CONSTANTS.CONFLICT_TYPES.ON_LEAVE,
          severity: SCHEDULING_CONSTANTS.CONFLICT_SEVERITY.ERROR,
          message: 'المعالج في إجازة في هذا اليوم',
        });
      }
    }

    // التحقق من توفر المعالج
    if (options.therapistAvailability) {
      const dayOfWeek = getDayOfWeek(date);
      const availability = options.therapistAvailability.find(
        a => a.therapistId === therapistId && a.dayOfWeek === dayOfWeek && a.isActive
      );

      if (!availability) {
        warnings.push({
          type: SCHEDULING_CONSTANTS.CONFLICT_TYPES.OUTSIDE_AVAILABILITY,
          severity: SCHEDULING_CONSTANTS.CONFLICT_SEVERITY.WARNING,
          message: 'الموعد خارج أيام عمل المعالج المحددة',
        });
      } else {
        const withinAvail =
          timeToMinutes(startTime) >= timeToMinutes(availability.startTime) &&
          timeToMinutes(endTime) <= timeToMinutes(availability.endTime);

        if (!withinAvail) {
          warnings.push({
            type: SCHEDULING_CONSTANTS.CONFLICT_TYPES.OUTSIDE_AVAILABILITY,
            severity: SCHEDULING_CONSTANTS.CONFLICT_SEVERITY.WARNING,
            message: `الموعد خارج أوقات التوفر (${availability.startTime} - ${availability.endTime})`,
          });
        }
      }
    }

    // تجاوز الحد الأقصى اليومي
    if (options.maxDailySessions !== undefined) {
      const therapistDailyCount = sameDayApps.filter(a => a.therapistId === therapistId).length;
      if (
        therapistDailyCount >=
        (options.maxDailySessions || SCHEDULING_CONSTANTS.MAX_DAILY_SESSIONS_PER_THERAPIST)
      ) {
        warnings.push({
          type: SCHEDULING_CONSTANTS.CONFLICT_TYPES.CASELOAD_EXCEEDED,
          severity: SCHEDULING_CONSTANTS.CONFLICT_SEVERITY.WARNING,
          message: `المعالج وصل الحد الأقصى للجلسات اليومية`,
        });
      }
    }
  }

  // 2. تعارض المستفيد
  if (beneficiaryId) {
    const beneficiaryConflict = sameDayApps.find(
      a =>
        a.beneficiaryId === beneficiaryId &&
        timeRangesOverlap(startTime, endTime, a.startTime, a.endTime)
    );
    if (beneficiaryConflict) {
      conflicts.push({
        type: SCHEDULING_CONSTANTS.CONFLICT_TYPES.BENEFICIARY_CONFLICT,
        severity: SCHEDULING_CONSTANTS.CONFLICT_SEVERITY.ERROR,
        message: 'المستفيد لديه موعد آخر في نفس الوقت',
        conflictingId: beneficiaryConflict.id,
      });
    }
  }

  // 3. تعارض الغرفة
  if (roomId) {
    const roomConflict = sameDayApps.find(
      a => a.roomId === roomId && timeRangesOverlap(startTime, endTime, a.startTime, a.endTime)
    );
    if (roomConflict) {
      conflicts.push({
        type: SCHEDULING_CONSTANTS.CONFLICT_TYPES.ROOM_CONFLICT,
        severity: SCHEDULING_CONSTANTS.CONFLICT_SEVERITY.ERROR,
        message: `الغرفة محجوزة في هذا الوقت`,
        conflictingId: roomConflict.id,
      });
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    hasWarnings: warnings.length > 0,
    conflicts,
    warnings,
    canSchedule: conflicts.length === 0,
  };
}

// ========================================
// AVAILABLE SLOTS
// ========================================

/**
 * حساب الفترات الزمنية المتاحة لمعالج في يوم معين
 * @param {string} date - تاريخ البحث
 * @param {string} therapistId
 * @param {object} availability - {startTime, endTime, breakStart, breakEnd, slotDuration}
 * @param {Array} existingAppointments - المواعيد المحجوزة
 * @param {number} requestedDuration - مدة الجلسة المطلوبة بالدقائق
 * @returns {Array} - قائمة الفترات المتاحة
 */
function calculateAvailableSlots(
  date,
  therapistId,
  availability,
  existingAppointments = [],
  requestedDuration = SCHEDULING_CONSTANTS.SLOT_DURATION_DEFAULT
) {
  if (!date || !therapistId || !availability) {
    return [];
  }

  const { startTime, endTime, breakStart, breakEnd } = availability;
  const slotDuration = requestedDuration || SCHEDULING_CONSTANTS.SLOT_DURATION_DEFAULT;
  const breakBetween = SCHEDULING_CONSTANTS.BREAK_DURATION;

  const dayStart = timeToMinutes(startTime);
  const dayEnd = timeToMinutes(endTime);

  // المواعيد المحجوزة في هذا اليوم لهذا المعالج
  const bookedSlots = existingAppointments
    .filter(
      a =>
        a.date === date &&
        a.therapistId === therapistId &&
        [
          SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.SCHEDULED,
          SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.CONFIRMED,
          SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.CHECKED_IN,
          SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.IN_PROGRESS,
        ].includes(a.status)
    )
    .map(a => ({
      start: timeToMinutes(a.startTime),
      end: timeToMinutes(a.endTime),
    }))
    .sort((a, b) => a.start - b.start);

  // فترة الاستراحة
  const breakStartMins = breakStart ? timeToMinutes(breakStart) : null;
  const breakEndMins = breakEnd ? timeToMinutes(breakEnd) : null;

  const availableSlots = [];
  let currentTime = dayStart;

  while (currentTime + slotDuration <= dayEnd) {
    const slotEnd = currentTime + slotDuration;

    // تحقق من عدم التداخل مع الاستراحة
    if (breakStartMins !== null && breakEndMins !== null) {
      if (currentTime < breakEndMins && slotEnd > breakStartMins) {
        // يتداخل مع الاستراحة → تخطَّ إلى ما بعدها
        currentTime = breakEndMins;
        continue;
      }
    }

    // تحقق من عدم التداخل مع مواعيد محجوزة
    const isBlocked = bookedSlots.some(
      booked => currentTime < booked.end && slotEnd > booked.start
    );

    if (!isBlocked) {
      availableSlots.push({
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(slotEnd),
        durationMinutes: slotDuration,
        date,
        therapistId,
      });
    }

    currentTime += slotDuration + breakBetween;
  }

  return availableSlots;
}

/**
 * إيجاد أول فترة متاحة بعد تاريخ معين
 * @param {string} fromDate - من هذا التاريخ
 * @param {number} maxDaysAhead - الحد الأقصى للأيام للبحث
 * @param {string} therapistId
 * @param {Array} weeklyAvailability - جداول التوفر الأسبوعية
 * @param {Array} existingAppointments
 * @param {number} requestedDuration
 * @returns {object|null}
 */
function findNextAvailableSlot(
  fromDate,
  maxDaysAhead,
  therapistId,
  weeklyAvailability,
  existingAppointments = [],
  requestedDuration = SCHEDULING_CONSTANTS.SLOT_DURATION_DEFAULT
) {
  if (!fromDate || !therapistId || !weeklyAvailability) return null;

  const startDate = new Date(fromDate);
  if (isNaN(startDate.getTime())) return null;

  for (let i = 0; i < maxDaysAhead; i++) {
    const current = new Date(startDate);
    current.setDate(current.getDate() + i);
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeek(dateStr);

    // تحقق من أن اليوم يوم عمل
    if (!SCHEDULING_CONSTANTS.WORKING_DAYS.includes(dayOfWeek)) continue;

    const dayAvailability = weeklyAvailability.find(
      a => a.therapistId === therapistId && a.dayOfWeek === dayOfWeek && a.isActive
    );

    if (!dayAvailability) continue;

    const slots = calculateAvailableSlots(
      dateStr,
      therapistId,
      dayAvailability,
      existingAppointments,
      requestedDuration
    );

    if (slots.length > 0) {
      return {
        ...slots[0],
        date: dateStr,
        daysFromNow: i,
      };
    }
  }

  return null;
}

// ========================================
// SCHEDULE ANALYSIS
// ========================================

/**
 * تحليل جدول معالج يومي/أسبوعي
 * @param {string} therapistId
 * @param {Array} appointments - مواعيد المعالج
 * @param {string} period - 'day' | 'week' | 'month'
 * @returns {object}
 */
function analyzeTherapistSchedule(therapistId, appointments = [], period = 'week') {
  if (!therapistId) {
    return { isValid: false };
  }

  const therapistApps = appointments.filter(a => a.therapistId === therapistId);

  const completed = therapistApps.filter(
    a => a.status === SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.COMPLETED
  ).length;
  const noShow = therapistApps.filter(
    a => a.status === SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.NO_SHOW
  ).length;
  const cancelled = therapistApps.filter(
    a => a.status === SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.CANCELLED
  ).length;
  const scheduled = therapistApps.filter(a =>
    [
      SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.SCHEDULED,
      SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.CONFIRMED,
    ].includes(a.status)
  ).length;

  const totalCompleted = completed + noShow; // من المواعيد المخططة
  const attendanceRate = totalCompleted > 0 ? Math.round((completed / totalCompleted) * 100) : 0;

  // توزيع حسب نوع الجلسة
  const bySessionType = {};
  for (const app of therapistApps) {
    const type = app.sessionType || 'individual';
    if (!bySessionType[type]) bySessionType[type] = 0;
    bySessionType[type]++;
  }

  // توزيع حسب اليوم
  const byDay = {};
  for (const app of therapistApps) {
    const day = getDayOfWeek(app.date) || 'unknown';
    if (!byDay[day]) byDay[day] = 0;
    byDay[day]++;
  }

  // إجمالي ساعات العمل
  const totalMinutes = therapistApps
    .filter(a => a.status === SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.COMPLETED)
    .reduce((sum, a) => sum + calculateDuration(a.startTime, a.endTime), 0);

  // الأيام مع أكثر/أقل ازدحام
  const dayEntries = Object.entries(byDay);
  const busiestDay =
    dayEntries.length > 0
      ? dayEntries.reduce((max, curr) => (curr[1] > max[1] ? curr : max), ['', 0])
      : null;

  return {
    isValid: true,
    therapistId,
    period,
    total: therapistApps.length,
    completed,
    noShow,
    cancelled,
    scheduled,
    attendanceRate,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    bySessionType,
    byDay,
    busiestDay: busiestDay ? busiestDay[0] : null,
    averageDailyLoad:
      therapistApps.length > 0
        ? Math.round((therapistApps.length / Math.max(1, Object.keys(byDay).length)) * 10) / 10
        : 0,
  };
}

/**
 * تحليل استخدام الغرف
 * @param {string} roomId
 * @param {Array} appointments
 * @param {object} roomCapacity - {openTime, closeTime}
 * @returns {object}
 */
function analyzeRoomUtilization(roomId, appointments = [], roomCapacity = {}) {
  if (!roomId) return { isValid: false };

  const roomApps = appointments.filter(a => a.roomId === roomId);

  // حساب دقائق الاستخدام
  const usedMinutes = roomApps
    .filter(a =>
      [
        SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.COMPLETED,
        SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.IN_PROGRESS,
        SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.CONFIRMED,
        SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.SCHEDULED,
      ].includes(a.status)
    )
    .reduce((sum, a) => sum + calculateDuration(a.startTime, a.endTime), 0);

  // أوقات العمل
  const openTime = roomCapacity.openTime || '08:00';
  const closeTime = roomCapacity.closeTime || '17:00';
  const workingMinutesPerDay = calculateDuration(openTime, closeTime);

  // عدد الأيام المختلفة
  const uniqueDays = new Set(roomApps.map(a => a.date)).size;
  const totalCapacityMinutes = workingMinutesPerDay * Math.max(1, uniqueDays);

  const utilizationRate =
    totalCapacityMinutes > 0 ? Math.round((usedMinutes / totalCapacityMinutes) * 100) : 0;

  return {
    isValid: true,
    roomId,
    totalAppointments: roomApps.length,
    usedMinutes,
    usedHours: Math.round((usedMinutes / 60) * 10) / 10,
    utilizationRate,
    workingMinutesPerDay,
    uniqueDaysUsed: uniqueDays,
    recommendation:
      utilizationRate >= 90
        ? 'الغرفة مستخدمة بكثافة عالية'
        : utilizationRate >= 60
          ? 'استخدام جيد'
          : 'استخدام منخفض - يمكن تحسين الجدولة',
  };
}

// ========================================
// WAITLIST MANAGEMENT
// ========================================

/**
 * حساب نقاط الأولوية لمستفيد في قائمة الانتظار
 * @param {object} entry - مدخل قائمة الانتظار
 * @returns {number} - نقاط الأولوية (0-100)
 */
function calculateWaitlistPriority(entry) {
  if (!entry) return 0;

  let score = SCHEDULING_CONSTANTS.WAITLIST_PRIORITY.NORMAL;

  // 1. مستوى الإعاقة (أشد = أولوية أعلى)
  const disabilityScores = {
    profound: 30,
    severe: 25,
    moderate: 15,
    mild: 5,
  };
  score += disabilityScores[entry.disabilitySeverity] || 10;

  // 2. عمر المستفيد (أصغر سناً = أولوية أعلى للتدخل المبكر)
  const age = entry.beneficiaryAge || 10;
  if (age <= 3) score += 30;
  else if (age <= 6) score += 20;
  else if (age <= 12) score += 10;
  else if (age <= 18) score += 5;

  // 3. مدة الانتظار
  if (entry.waitingDays) {
    score += Math.min(20, Math.floor(entry.waitingDays / 7) * 2); // +2 لكل أسبوع، حد أقصى 20
  }

  // 4. إحالة طبية عاجلة
  if (entry.isUrgentReferral) score += 20;

  // 5. لا يتلقى أي خدمات حالياً
  if (!entry.currentlyReceivingServices) score += 10;

  // 6. أولوية يدوية
  if (entry.manualPriority === 'urgent') score += 25;
  else if (entry.manualPriority === 'high') score += 15;
  else if (entry.manualPriority === 'low') score -= 10;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * ترتيب قائمة الانتظار حسب الأولوية
 * @param {Array} waitlistEntries - مدخلات قائمة الانتظار
 * @returns {Array} - قائمة مرتبة مع النقاط
 */
function rankWaitlist(waitlistEntries) {
  if (!Array.isArray(waitlistEntries) || waitlistEntries.length === 0) {
    return [];
  }

  const scored = waitlistEntries
    .filter(e => e.status === 'waiting')
    .map(entry => ({
      ...entry,
      priorityScore: calculateWaitlistPriority(entry),
    }))
    .sort((a, b) => {
      // أولاً بالأولوية، ثم بتاريخ الإضافة
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

  return scored.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

/**
 * مطابقة أول مستفيد في قائمة الانتظار مع فتحة متاحة
 * @param {Array} rankedWaitlist - قائمة انتظار مرتبة
 * @param {Array} availableSlots - الفترات المتاحة
 * @returns {object|null} - أفضل مطابقة
 */
function matchWaitlistToSlot(rankedWaitlist, availableSlots) {
  if (!rankedWaitlist.length || !availableSlots.length) return null;

  for (const entry of rankedWaitlist) {
    for (const slot of availableSlots) {
      // التحقق من الأيام المفضلة
      if (entry.preferredDays && entry.preferredDays.length > 0) {
        const slotDay = getDayOfWeek(slot.date);
        if (!entry.preferredDays.includes(slotDay)) continue;
      }

      // التحقق من الأوقات المفضلة
      if (entry.preferredTimeFrom && entry.preferredTimeTo) {
        const slotStartMins = timeToMinutes(slot.startTime);
        const prefFromMins = timeToMinutes(entry.preferredTimeFrom);
        const prefToMins = timeToMinutes(entry.preferredTimeTo);
        if (slotStartMins < prefFromMins || slotStartMins > prefToMins) continue;
      }

      // المعالج المفضل
      if (entry.preferredTherapistId && entry.preferredTherapistId !== slot.therapistId) continue;

      return {
        waitlistEntry: entry,
        slot,
        matchScore: _calculateMatchScore(entry, slot),
      };
    }
  }

  // إذا لم تجد مطابقة بالتفضيلات، خذ الأول مباشرة
  return {
    waitlistEntry: rankedWaitlist[0],
    slot: availableSlots[0],
    matchScore: 50, // مطابقة جزئية
  };
}

function _calculateMatchScore(entry, slot) {
  let score = 70; // base

  // يوم مفضل
  if (entry.preferredDays?.includes(getDayOfWeek(slot.date))) score += 15;
  // معالج مفضل
  if (entry.preferredTherapistId === slot.therapistId) score += 15;

  return Math.min(100, score);
}

// ========================================
// RECURRING APPOINTMENTS
// ========================================

/**
 * توليد مواعيد متكررة
 * @param {object} recurrence - {startDate, endDate, frequency, daysOfWeek, startTime, durationMinutes, therapistId, beneficiaryId}
 * @param {Array} existingAppointments - المواعيد القائمة (لفحص التعارضات)
 * @returns {object} - {generated, skipped, conflicts}
 */
function generateRecurringAppointments(recurrence, existingAppointments = []) {
  if (!recurrence || !recurrence.startDate || !recurrence.endDate) {
    return { generated: [], skipped: [], conflicts: [], isValid: false };
  }

  const {
    startDate,
    endDate,
    frequency,
    daysOfWeek,
    startTime,
    durationMinutes = SCHEDULING_CONSTANTS.SLOT_DURATION_DEFAULT,
    therapistId,
    beneficiaryId,
    serviceId,
  } = recurrence;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { generated: [], skipped: [], conflicts: [], isValid: false };
  }

  const generated = [];
  const skipped = [];
  const conflictsList = [];

  const endTimeCal = calculateEndTime(startTime, durationMinutes);
  let current = new Date(start);
  let sessionNum = 0;

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeek(dateStr);

    let shouldAdd = false;

    if (frequency === 'daily') {
      shouldAdd = SCHEDULING_CONSTANTS.WORKING_DAYS.includes(dayOfWeek);
    } else if (frequency === 'weekly' || frequency === 'biweekly') {
      if (daysOfWeek && daysOfWeek.length > 0) {
        shouldAdd = daysOfWeek.includes(dayOfWeek);
      } else {
        shouldAdd = SCHEDULING_CONSTANTS.WORKING_DAYS.includes(dayOfWeek);
      }
    } else if (frequency === 'monthly') {
      shouldAdd = current.getDate() === start.getDate();
    }

    if (shouldAdd) {
      // فحص التعارض
      const apptData = {
        date: dateStr,
        startTime,
        endTime: endTimeCal,
        therapistId,
        beneficiaryId,
        status: SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.SCHEDULED,
      };

      const conflictResult = detectConflicts(apptData, existingAppointments);

      if (conflictResult.hasConflicts) {
        conflictsList.push({ date: dateStr, conflicts: conflictResult.conflicts });
        skipped.push(dateStr);
      } else {
        sessionNum++;
        generated.push({
          ...apptData,
          sessionNumber: sessionNum,
          durationMinutes,
          serviceId,
          isRecurring: true,
        });
      }
    }

    // الانتقال للتاريخ التالي
    if (frequency === 'biweekly' && daysOfWeek) {
      // يتقدم بيومية لكن يتخذ القفزة الأسبوعية المزدوجة
      current.setDate(current.getDate() + 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }

  return {
    isValid: true,
    generated,
    skipped,
    conflicts: conflictsList,
    totalGenerated: generated.length,
    totalSkipped: skipped.length,
  };
}

// ========================================
// SCHEDULE STATISTICS
// ========================================

/**
 * إحصائيات الجدول الكاملة
 * @param {Array} appointments - المواعيد
 * @param {object} filters - {branchId, period, dateFrom, dateTo}
 * @returns {object}
 */
function calculateScheduleStatistics(appointments = [], filters = {}) {
  if (!Array.isArray(appointments)) {
    return { total: 0 };
  }

  // فلترة حسب الفرع
  let filtered = appointments;
  if (filters.branchId) {
    filtered = filtered.filter(a => a.branchId === filters.branchId);
  }

  // فلترة حسب التاريخ
  if (filters.dateFrom || filters.dateTo) {
    filtered = filtered.filter(a => {
      if (filters.dateFrom && a.date < filters.dateFrom) return false;
      if (filters.dateTo && a.date > filters.dateTo) return false;
      return true;
    });
  }

  const total = filtered.length;
  const statusCounts = {};
  for (const status of Object.values(SCHEDULING_CONSTANTS.APPOINTMENT_STATUS)) {
    statusCounts[status] = filtered.filter(a => a.status === status).length;
  }

  const completedAndNoShow = statusCounts.completed + statusCounts.no_show;
  const attendanceRate =
    completedAndNoShow > 0 ? Math.round((statusCounts.completed / completedAndNoShow) * 100) : 0;

  const noShowRate =
    completedAndNoShow > 0 ? Math.round((statusCounts.no_show / completedAndNoShow) * 100) : 0;

  const cancellationRate = total > 0 ? Math.round((statusCounts.cancelled / total) * 100) : 0;

  // توزيع حسب الأيام
  const byDay = {};
  for (const app of filtered) {
    const day = getDayOfWeek(app.date) || 'unknown';
    if (!byDay[day]) byDay[day] = 0;
    byDay[day]++;
  }

  // توزيع حسب المعالج
  const byTherapist = {};
  for (const app of filtered) {
    if (!app.therapistId) continue;
    if (!byTherapist[app.therapistId]) byTherapist[app.therapistId] = 0;
    byTherapist[app.therapistId]++;
  }

  // توزيع حسب نوع الجلسة
  const bySessionType = {};
  for (const app of filtered) {
    const type = app.sessionType || 'individual';
    if (!bySessionType[type]) bySessionType[type] = 0;
    bySessionType[type]++;
  }

  // حساب إجمالي ساعات الخدمة
  const totalServiceMinutes = filtered
    .filter(a => a.status === SCHEDULING_CONSTANTS.APPOINTMENT_STATUS.COMPLETED)
    .reduce((sum, a) => sum + calculateDuration(a.startTime, a.endTime), 0);

  return {
    total,
    statusCounts,
    attendanceRate,
    noShowRate,
    cancellationRate,
    totalServiceHours: Math.round((totalServiceMinutes / 60) * 10) / 10,
    averageSessionDuration:
      statusCounts.completed > 0 ? Math.round(totalServiceMinutes / statusCounts.completed) : 0,
    byDay,
    byTherapist,
    bySessionType,
    uniqueTherapists: Object.keys(byTherapist).length,
    uniqueBeneficiaries: new Set(filtered.map(a => a.beneficiaryId).filter(Boolean)).size,
  };
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
  SCHEDULING_CONSTANTS,
  // Time utilities
  timeToMinutes,
  minutesToTime,
  timeRangesOverlap,
  calculateEndTime,
  calculateDuration,
  getDayOfWeek,
  // Conflict detection
  detectConflicts,
  // Available slots
  calculateAvailableSlots,
  findNextAvailableSlot,
  // Schedule analysis
  analyzeTherapistSchedule,
  analyzeRoomUtilization,
  // Waitlist
  calculateWaitlistPriority,
  rankWaitlist,
  matchWaitlistToSlot,
  // Recurring
  generateRecurringAppointments,
  // Statistics
  calculateScheduleStatistics,
};

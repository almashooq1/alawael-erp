/**
 * Appointment Conflict Detection & Available Slots Service
 * خدمة كشف تعارضات المواعيد وحساب الفترات المتاحة
 *
 * Pure Business Logic - No DB dependencies
 *
 * يغطي:
 * - كشف تعارض المعالج (double booking)
 * - كشف تعارض المستفيد
 * - كشف تعارض الغرفة
 * - التحقق من أوقات التوفر
 * - حساب الفترات المتاحة (available slots)
 * - التحقق من الحد الأقصى للجلسات اليومية
 * - إدارة أولوية قائمة الانتظار عند الإلغاء
 */

'use strict';

// ========== الثوابت ==========

/** مدة الجلسة الافتراضية بالدقائق */
const DEFAULT_SESSION_DURATION = 45;

/** أقصى جلسات يومية لكل معالج */
const MAX_DAILY_SESSIONS_PER_THERAPIST = 8;

/** أيام الأسبوع العاملة (الأحد=0 إلى الخميس=4 بالنظام السعودي) */
const WORKING_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

/** الحد الأدنى للوقت بين الجلسات (دقائق) */
const MIN_BREAK_BETWEEN_SESSIONS = 5;

/** ساعات العمل الافتراضية */
const DEFAULT_WORK_START = '08:00';
const DEFAULT_WORK_END = '17:00';

/** أنواع التعارضات */
const CONFLICT_TYPES = {
  THERAPIST_DOUBLE_BOOKING: 'therapist_double_booking',
  BENEFICIARY_DOUBLE_BOOKING: 'beneficiary_double_booking',
  ROOM_DOUBLE_BOOKING: 'room_double_booking',
  OUTSIDE_AVAILABILITY: 'outside_availability',
  CASELOAD_EXCEEDED: 'caseload_exceeded',
  THERAPIST_ON_LEAVE: 'therapist_on_leave',
  HOLIDAY: 'holiday',
  INSUFFICIENT_BREAK: 'insufficient_break',
};

/** مستويات خطورة التعارض */
const CONFLICT_SEVERITY = {
  ERROR: 'error', // يمنع الحجز
  WARNING: 'warning', // تنبيه فقط
  INFO: 'info', // معلومة
};

// ========== دوال مساعدة للوقت ==========

/**
 * تحويل وقت نصي "HH:MM" إلى دقائق منذ منتصف الليل
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error(`وقت غير صالح: ${timeStr}`);
  }
  const parts = timeStr.split(':');
  if (parts.length < 2) throw new Error(`تنسيق الوقت غير صحيح: ${timeStr}`);
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`قيمة وقت غير صالحة: ${timeStr}`);
  }
  return hours * 60 + minutes;
}

/**
 * تحويل دقائق إلى وقت نصي "HH:MM"
 */
function minutesToTime(totalMinutes) {
  if (totalMinutes < 0 || totalMinutes >= 24 * 60) {
    throw new Error(`الدقائق خارج النطاق: ${totalMinutes}`);
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * حساب وقت النهاية من وقت البداية والمدة
 */
function calculateEndTime(startTime, durationMinutes) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  return minutesToTime(endMinutes);
}

/**
 * التحقق من تداخل فترتين زمنيتين
 * الفترة الأولى: [start1, end1)، الثانية: [start2, end2)
 */
function doTimesOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

/**
 * الحصول على اسم يوم الأسبوع بالإنجليزية من تاريخ
 */
function getDayOfWeek(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) throw new Error(`تاريخ غير صالح: ${dateStr}`);
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * التحقق من أن اليوم يوم عمل
 */
function isWorkingDay(dateStr) {
  const dayOfWeek = getDayOfWeek(dateStr);
  return WORKING_DAYS.includes(dayOfWeek);
}

// ========== كشف التعارضات ==========

/**
 * التحقق من تعارض جلسة المعالج
 * @param {object} newAppointment - الموعد الجديد {therapistId, date, startTime, endTime, id?}
 * @param {Array} existingAppointments - المواعيد الحالية للمعالج
 * @returns {object|null} تعارض أو null
 */
function checkTherapistConflict(newAppointment, existingAppointments) {
  const { therapistId, date, startTime, endTime, id: excludeId } = newAppointment;

  const conflict = existingAppointments.find(apt => {
    // تجاهل الموعد نفسه عند التعديل
    if (excludeId && apt.id === excludeId) return false;
    // نفس المعالج
    if (apt.therapistId !== therapistId) return false;
    // نفس التاريخ
    if (apt.date !== date) return false;
    // الحالات المُلغاة لا تُعدّ تعارضاً
    if (['cancelled', 'rescheduled', 'no_show'].includes(apt.status)) return false;
    // تحقق التداخل الزمني
    return doTimesOverlap(startTime, endTime, apt.startTime, apt.endTime);
  });

  if (conflict) {
    return {
      type: CONFLICT_TYPES.THERAPIST_DOUBLE_BOOKING,
      severity: CONFLICT_SEVERITY.ERROR,
      message: `المعالج لديه موعد في نفس الوقت: ${conflict.appointmentNumber || conflict.id}`,
      conflictingAppointmentId: conflict.id,
    };
  }
  return null;
}

/**
 * التحقق من تعارض جلسة المستفيد
 */
function checkBeneficiaryConflict(newAppointment, existingAppointments) {
  const { beneficiaryId, date, startTime, endTime, id: excludeId } = newAppointment;

  const conflict = existingAppointments.find(apt => {
    if (excludeId && apt.id === excludeId) return false;
    if (apt.beneficiaryId !== beneficiaryId) return false;
    if (apt.date !== date) return false;
    if (['cancelled', 'rescheduled', 'no_show'].includes(apt.status)) return false;
    return doTimesOverlap(startTime, endTime, apt.startTime, apt.endTime);
  });

  if (conflict) {
    return {
      type: CONFLICT_TYPES.BENEFICIARY_DOUBLE_BOOKING,
      severity: CONFLICT_SEVERITY.ERROR,
      message: 'المستفيد لديه موعد آخر في نفس الوقت',
      conflictingAppointmentId: conflict.id,
    };
  }
  return null;
}

/**
 * التحقق من تعارض الغرفة
 */
function checkRoomConflict(newAppointment, existingBookings) {
  const { roomId, date, startTime, endTime, id: excludeId } = newAppointment;
  if (!roomId) return null;

  const conflict = existingBookings.find(booking => {
    if (excludeId && booking.appointmentId === excludeId) return false;
    if (booking.roomId !== roomId) return false;
    if (booking.date !== date) return false;
    if (booking.status === 'cancelled') return false;
    return doTimesOverlap(startTime, endTime, booking.startTime, booking.endTime);
  });

  if (conflict) {
    return {
      type: CONFLICT_TYPES.ROOM_DOUBLE_BOOKING,
      severity: CONFLICT_SEVERITY.ERROR,
      message: `الغرفة محجوزة في هذا الوقت`,
      conflictingBookingId: conflict.id,
    };
  }
  return null;
}

/**
 * التحقق من أوقات توفر المعالج
 * @param {object} newAppointment
 * @param {Array} therapistAvailability - [{dayOfWeek, startTime, endTime, breakStart?, breakEnd?}]
 */
function checkAvailability(newAppointment, therapistAvailability) {
  const { date, startTime, endTime } = newAppointment;
  const dayOfWeek = getDayOfWeek(date);

  // التحقق من أن اليوم يوم عمل
  if (!isWorkingDay(date)) {
    return {
      type: CONFLICT_TYPES.OUTSIDE_AVAILABILITY,
      severity: CONFLICT_SEVERITY.WARNING,
      message: `يوم ${dayOfWeek} ليس يوم عمل`,
    };
  }

  // البحث عن توفر المعالج في هذا اليوم
  const availability = therapistAvailability.find(
    a => a.dayOfWeek === dayOfWeek && a.isActive !== false
  );

  if (!availability) {
    return {
      type: CONFLICT_TYPES.OUTSIDE_AVAILABILITY,
      severity: CONFLICT_SEVERITY.WARNING,
      message: `المعالج غير متوفر يوم ${dayOfWeek}`,
    };
  }

  // التحقق من أن الموعد ضمن وقت العمل
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const availStart = timeToMinutes(availability.startTime);
  const availEnd = timeToMinutes(availability.endTime);

  if (startMins < availStart || endMins > availEnd) {
    return {
      type: CONFLICT_TYPES.OUTSIDE_AVAILABILITY,
      severity: CONFLICT_SEVERITY.WARNING,
      message: `الموعد خارج أوقات عمل المعالج (${availability.startTime} - ${availability.endTime})`,
    };
  }

  // التحقق من عدم تداخل الموعد مع وقت الاستراحة
  if (availability.breakStart && availability.breakEnd) {
    if (doTimesOverlap(startTime, endTime, availability.breakStart, availability.breakEnd)) {
      return {
        type: CONFLICT_TYPES.OUTSIDE_AVAILABILITY,
        severity: CONFLICT_SEVERITY.WARNING,
        message: `الموعد يتداخل مع وقت الاستراحة (${availability.breakStart} - ${availability.breakEnd})`,
      };
    }
  }

  return null;
}

/**
 * التحقق من الحد الأقصى للجلسات اليومية
 */
function checkCaseloadLimit(newAppointment, existingAppointments, maxDailySessions) {
  const { therapistId, date } = newAppointment;
  const maxSessions = maxDailySessions || MAX_DAILY_SESSIONS_PER_THERAPIST;

  const dailyCount = existingAppointments.filter(
    apt =>
      apt.therapistId === therapistId &&
      apt.date === date &&
      !['cancelled', 'rescheduled', 'no_show'].includes(apt.status)
  ).length;

  if (dailyCount >= maxSessions) {
    return {
      type: CONFLICT_TYPES.CASELOAD_EXCEEDED,
      severity: CONFLICT_SEVERITY.WARNING,
      message: `المعالج وصل الحد الأقصى من الجلسات اليومية (${maxSessions})`,
      currentCount: dailyCount,
      maxAllowed: maxSessions,
    };
  }
  return null;
}

/**
 * التحقق من وجود فاصل كافٍ بين الجلسات
 */
function checkBreakBetweenSessions(newAppointment, existingAppointments) {
  const { therapistId, date, startTime, endTime, id: excludeId } = newAppointment;
  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  for (const apt of existingAppointments) {
    if (excludeId && apt.id === excludeId) continue;
    if (apt.therapistId !== therapistId) continue;
    if (apt.date !== date) continue;
    if (['cancelled', 'rescheduled', 'no_show'].includes(apt.status)) continue;

    const aptStart = timeToMinutes(apt.startTime);
    const aptEnd = timeToMinutes(apt.endTime);

    // تحقق من الفاصل بعد الجلسة السابقة
    const gapAfterPrev = newStart - aptEnd;
    // تحقق من الفاصل قبل الجلسة التالية
    const gapBeforeNext = aptStart - newEnd;

    if (gapAfterPrev > 0 && gapAfterPrev < MIN_BREAK_BETWEEN_SESSIONS) {
      return {
        type: CONFLICT_TYPES.INSUFFICIENT_BREAK,
        severity: CONFLICT_SEVERITY.INFO,
        message: `الفاصل بين الجلستين أقل من ${MIN_BREAK_BETWEEN_SESSIONS} دقائق`,
        gapMinutes: gapAfterPrev,
      };
    }
    if (gapBeforeNext > 0 && gapBeforeNext < MIN_BREAK_BETWEEN_SESSIONS) {
      return {
        type: CONFLICT_TYPES.INSUFFICIENT_BREAK,
        severity: CONFLICT_SEVERITY.INFO,
        message: `الفاصل بين الجلستين أقل من ${MIN_BREAK_BETWEEN_SESSIONS} دقائق`,
        gapMinutes: gapBeforeNext,
      };
    }
  }
  return null;
}

/**
 * كشف جميع أنواع التعارضات مرة واحدة
 * @param {object} newAppointment - بيانات الموعد الجديد
 * @param {object} context - السياق (مواعيد موجودة، توفر، إلخ)
 * @returns {object} {hasErrors, hasWarnings, conflicts, canBook}
 */
function detectAllConflicts(newAppointment, context) {
  const {
    existingAppointments = [],
    roomBookings = [],
    therapistAvailability = [],
    maxDailySessions,
    checkBreak = false,
  } = context;

  const conflicts = [];

  // 1. تعارض المعالج
  const therapistConflict = checkTherapistConflict(newAppointment, existingAppointments);
  if (therapistConflict) conflicts.push(therapistConflict);

  // 2. تعارض المستفيد
  const beneficiaryConflict = checkBeneficiaryConflict(newAppointment, existingAppointments);
  if (beneficiaryConflict) conflicts.push(beneficiaryConflict);

  // 3. تعارض الغرفة
  const roomConflict = checkRoomConflict(newAppointment, roomBookings);
  if (roomConflict) conflicts.push(roomConflict);

  // 4. أوقات التوفر
  if (therapistAvailability.length > 0) {
    const availabilityConflict = checkAvailability(newAppointment, therapistAvailability);
    if (availabilityConflict) conflicts.push(availabilityConflict);
  }

  // 5. الحد الأقصى للجلسات
  const caseloadConflict = checkCaseloadLimit(
    newAppointment,
    existingAppointments,
    maxDailySessions
  );
  if (caseloadConflict) conflicts.push(caseloadConflict);

  // 6. الفاصل بين الجلسات (اختياري)
  if (checkBreak) {
    const breakConflict = checkBreakBetweenSessions(newAppointment, existingAppointments);
    if (breakConflict) conflicts.push(breakConflict);
  }

  const hasErrors = conflicts.some(c => c.severity === CONFLICT_SEVERITY.ERROR);
  const hasWarnings = conflicts.some(c => c.severity === CONFLICT_SEVERITY.WARNING);

  return {
    hasErrors,
    hasWarnings,
    conflicts,
    canBook: !hasErrors,
  };
}

// ========== حساب الفترات المتاحة ==========

/**
 * توليد فترات زمنية ضمن نطاق وقت
 * @param {string} startTime - وقت البداية "HH:MM"
 * @param {string} endTime - وقت النهاية "HH:MM"
 * @param {number} slotDuration - مدة كل فترة بالدقائق
 * @param {number} [breakDuration=0] - وقت الفاصل بين الفترات
 * @returns {Array} مصفوفة من [{startTime, endTime}]
 */
function generateTimeSlots(startTime, endTime, slotDuration, breakDuration = 0) {
  if (slotDuration <= 0) throw new Error('مدة الفترة يجب أن تكون أكبر من صفر');

  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);

  if (endMins <= startMins) throw new Error('وقت النهاية يجب أن يكون بعد وقت البداية');

  const slots = [];
  let current = startMins;

  while (current + slotDuration <= endMins) {
    slots.push({
      startTime: minutesToTime(current),
      endTime: minutesToTime(current + slotDuration),
    });
    current += slotDuration + breakDuration;
  }

  return slots;
}

/**
 * حساب الفترات المتاحة لمعالج في يوم معين
 * @param {object} params
 * @param {string} params.therapistId
 * @param {string} params.date
 * @param {number} params.sessionDuration - مدة الجلسة بالدقائق
 * @param {object} params.availability - {startTime, endTime, breakStart?, breakEnd?}
 * @param {Array} params.existingAppointments - المواعيد المحجوزة مسبقاً
 * @param {number} [params.bufferMinutes=5] - وقت الفاصل بين الجلسات
 * @returns {Array} الفترات المتاحة
 */
function getAvailableSlots(params) {
  const {
    therapistId,
    date,
    sessionDuration = DEFAULT_SESSION_DURATION,
    availability,
    existingAppointments = [],
    bufferMinutes = MIN_BREAK_BETWEEN_SESSIONS,
  } = params;

  if (!availability) return [];
  if (!isWorkingDay(date)) return [];

  const dayOfWeek = getDayOfWeek(date);
  if (availability.dayOfWeek && availability.dayOfWeek !== dayOfWeek) return [];

  // توليد كل الفترات الممكنة
  const allSlots = generateTimeSlots(
    availability.startTime,
    availability.endTime,
    sessionDuration,
    bufferMinutes
  );

  // تصفية الفترات المحجوزة
  const bookedAppointments = existingAppointments.filter(
    apt =>
      apt.therapistId === therapistId &&
      apt.date === date &&
      !['cancelled', 'rescheduled', 'no_show'].includes(apt.status)
  );

  const availableSlots = allSlots.filter(slot => {
    // تحقق عدم التداخل مع المواعيد المحجوزة
    const isBooked = bookedAppointments.some(apt =>
      doTimesOverlap(slot.startTime, slot.endTime, apt.startTime, apt.endTime)
    );

    // تحقق عدم التداخل مع وقت الاستراحة
    const isDuringBreak =
      availability.breakStart &&
      availability.breakEnd &&
      doTimesOverlap(slot.startTime, slot.endTime, availability.breakStart, availability.breakEnd);

    return !isBooked && !isDuringBreak;
  });

  return availableSlots;
}

/**
 * حساب الفترات المتاحة لعدة معالجين
 */
function getAvailableSlotsForMultipleTherapists(
  therapistsList,
  date,
  sessionDuration,
  existingAppointments
) {
  const result = [];

  for (const therapist of therapistsList) {
    if (!therapist.availability) continue;

    const slots = getAvailableSlots({
      therapistId: therapist.id,
      date,
      sessionDuration,
      availability: therapist.availability,
      existingAppointments,
    });

    if (slots.length > 0) {
      result.push({
        therapistId: therapist.id,
        therapistName: therapist.name,
        specialization: therapist.specialization,
        availableSlots: slots,
        availableCount: slots.length,
      });
    }
  }

  return result;
}

/**
 * حساب نسبة الإشغال لمعالج في يوم معين
 */
function calculateOccupancyRate(
  therapistId,
  date,
  availability,
  existingAppointments,
  sessionDuration
) {
  if (!availability || !isWorkingDay(date)) return 0;

  const totalSlots = generateTimeSlots(
    availability.startTime,
    availability.endTime,
    sessionDuration
  );

  const bookedCount = existingAppointments.filter(
    apt =>
      apt.therapistId === therapistId &&
      apt.date === date &&
      !['cancelled', 'rescheduled', 'no_show'].includes(apt.status)
  ).length;

  if (totalSlots.length === 0) return 0;
  return Math.min(100, Math.round((bookedCount / totalSlots.length) * 100));
}

/**
 * إحصاءات المواعيد ليوم معين لتقرير الجدولة
 */
function getDailyScheduleStats(appointments, date) {
  const dayAppointments = appointments.filter(apt => apt.date === date);

  const stats = {
    total: dayAppointments.length,
    scheduled: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    inProgress: 0,
  };

  for (const apt of dayAppointments) {
    switch (apt.status) {
      case 'scheduled':
        stats.scheduled++;
        break;
      case 'confirmed':
        stats.confirmed++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'cancelled':
        stats.cancelled++;
        break;
      case 'no_show':
        stats.noShow++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
    }
  }

  stats.attendanceRate =
    stats.total > 0 ? Math.round(((stats.completed + stats.confirmed) / stats.total) * 100) : 0;

  stats.cancellationRate = stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0;

  stats.noShowRate = stats.total > 0 ? Math.round((stats.noShow / stats.total) * 100) : 0;

  return stats;
}

/**
 * توليد تقرير الجدولة الأسبوعي
 * @param {Array} appointments - جميع مواعيد الأسبوع
 * @param {string} weekStart - تاريخ بداية الأسبوع
 * @param {number} daysCount - عدد أيام الأسبوع (افتراضي 5)
 */
function generateWeeklyScheduleReport(appointments, weekStart, daysCount = 5) {
  const startDate = new Date(weekStart);
  if (isNaN(startDate.getTime())) throw new Error('تاريخ بداية الأسبوع غير صالح');

  const report = {
    weekStart,
    totalAppointments: 0,
    dailyBreakdown: [],
    averageOccupancy: 0,
  };

  for (let i = 0; i < daysCount; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];

    const dayStats = getDailyScheduleStats(appointments, dateStr);
    report.dailyBreakdown.push({ date: dateStr, ...dayStats });
    report.totalAppointments += dayStats.total;
  }

  // متوسط معدل الحضور
  const occupancyRates = report.dailyBreakdown.filter(d => d.total > 0).map(d => d.attendanceRate);

  report.averageOccupancy =
    occupancyRates.length > 0
      ? Math.round(occupancyRates.reduce((a, b) => a + b, 0) / occupancyRates.length)
      : 0;

  return report;
}

// ========== Exports ==========

module.exports = {
  // الثوابت
  DEFAULT_SESSION_DURATION,
  MAX_DAILY_SESSIONS_PER_THERAPIST,
  WORKING_DAYS,
  MIN_BREAK_BETWEEN_SESSIONS,
  DEFAULT_WORK_START,
  DEFAULT_WORK_END,
  CONFLICT_TYPES,
  CONFLICT_SEVERITY,

  // دوال مساعدة الوقت
  timeToMinutes,
  minutesToTime,
  calculateEndTime,
  doTimesOverlap,
  getDayOfWeek,
  isWorkingDay,

  // كشف التعارضات
  checkTherapistConflict,
  checkBeneficiaryConflict,
  checkRoomConflict,
  checkAvailability,
  checkCaseloadLimit,
  checkBreakBetweenSessions,
  detectAllConflicts,

  // الفترات المتاحة
  generateTimeSlots,
  getAvailableSlots,
  getAvailableSlotsForMultipleTherapists,
  calculateOccupancyRate,

  // الإحصاءات
  getDailyScheduleStats,
  generateWeeklyScheduleReport,
};

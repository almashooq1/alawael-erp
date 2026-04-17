/**
 * خدمة كشف تعارضات المواعيد — Appointment Conflict Detection Service
 *
 * Pure calculation functions — no DB dependencies
 * يدعم كشف:
 *  1. تعارض المعالج  (نفس الوقت)
 *  2. تعارض المستفيد (نفس الوقت)
 *  3. تعارض الغرفة   (نفس الوقت)
 *  4. خارج أوقات التوفر
 *  5. تجاوز الحد الأقصى للجلسات اليومية
 *  6. أوقات غير صحيحة (نهاية قبل البداية، مدة صفر)
 *
 * كشف تعارض قائمة الانتظار:
 *  - حساب نقاط الأولوية (priority score)
 *  - ترتيب قائمة الانتظار تنازلياً
 */

'use strict';

// ─── الثوابت ──────────────────────────────────────────────────────────────────

/** الأيام الرسمية للعمل في المملكة العربية السعودية */
const SAUDI_WORK_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

/** أنواع حالات الموعد النشطة (لا تُحسب التعارض مع الملغاة/المعاد جدولتها) */
const ACTIVE_STATUSES = ['scheduled', 'confirmed', 'checked_in', 'in_progress'];

/** الحد الأقصى الافتراضي للجلسات اليومية للمعالج الواحد */
const DEFAULT_MAX_DAILY_SESSIONS = 10;

// ─── دوال مساعدة ──────────────────────────────────────────────────────────────

/**
 * تحويل الوقت HH:MM إلى دقائق منذ منتصف الليل
 * @param {string} timeStr - "09:30"
 * @returns {number} minutes
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error(`صيغة الوقت غير صحيحة: ${timeStr}`);
  }
  const parts = timeStr.split(':');
  if (parts.length < 2) {
    throw new Error(`صيغة الوقت غير صحيحة: ${timeStr}، المتوقع HH:MM`);
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`صيغة الوقت غير صحيحة: ${timeStr}`);
  }
  return hours * 60 + minutes;
}

/**
 * تحويل الدقائق إلى سلسلة HH:MM
 * @param {number} minutes
 * @returns {string}
 */
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * هل يتداخل نطاقان زمنيان؟
 * يُعتبر التداخل عندما يكون هناك تقاطع حقيقي (لا مجرد تلامس عند النهاية)
 *
 * @param {number} start1 - بداية الأول (دقائق)
 * @param {number} end1   - نهاية الأول (دقائق)
 * @param {number} start2 - بداية الثاني (دقائق)
 * @param {number} end2   - نهاية الثاني (دقائق)
 * @returns {boolean}
 */
function intervalsOverlap(start1, end1, start2, end2) {
  // التقاطع الحقيقي: start1 < end2 AND start2 < end1
  return start1 < end2 && start2 < end1;
}

/**
 * استخراج اسم اليوم الإنجليزي من التاريخ
 * @param {Date|string} date
 * @returns {string} 'sunday' | 'monday' | ...
 */
function getDayOfWeek(date) {
  const d = new Date(date);
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[d.getDay()];
}

// ─── التحقق من البيانات المدخلة ───────────────────────────────────────────────

/**
 * التحقق من صحة بيانات الموعد قبل كشف التعارضات
 * @param {Object} appointment
 * @returns {string[]} قائمة الأخطاء
 */
function validateAppointmentData(appointment) {
  const errors = [];

  if (!appointment.date) errors.push('تاريخ الموعد مطلوب');
  if (!appointment.startTime) errors.push('وقت البداية مطلوب');
  if (!appointment.endTime) errors.push('وقت النهاية مطلوب');
  if (!appointment.therapistId) errors.push('معرّف المعالج مطلوب');
  if (!appointment.beneficiaryId) errors.push('معرّف المستفيد مطلوب');

  if (appointment.startTime && appointment.endTime) {
    try {
      const s = timeToMinutes(appointment.startTime);
      const e = timeToMinutes(appointment.endTime);
      if (e <= s) {
        errors.push('وقت النهاية يجب أن يكون بعد وقت البداية');
      }
      if (e - s < 15) {
        errors.push('مدة الجلسة لا يجب أن تقل عن 15 دقيقة');
      }
      if (e - s > 480) {
        errors.push('مدة الجلسة لا يجب أن تتجاوز 8 ساعات (480 دقيقة)');
      }
    } catch {
      errors.push('صيغة الوقت غير صحيحة (المتوقع HH:MM)');
    }
  }

  return errors;
}

// ─── كشف التعارضات الرئيسي ────────────────────────────────────────────────────

/**
 * فحص تعارض المعالج
 *
 * @param {Object}   newAppt              - الموعد الجديد
 * @param {string}   newAppt.date         - "YYYY-MM-DD"
 * @param {string}   newAppt.startTime    - "HH:MM"
 * @param {string}   newAppt.endTime      - "HH:MM"
 * @param {*}        newAppt.therapistId
 * @param {Object[]} existingAppointments - مواعيد المعالج الموجودة في نفس اليوم
 * @param {*}        excludeId            - معرّف موعد مُستثنى (لحالة التعديل)
 * @returns {{ hasConflict: boolean, conflictingAppointment?: Object }}
 */
function checkTherapistConflict(newAppt, existingAppointments, excludeId = null) {
  const newStart = timeToMinutes(newAppt.startTime);
  const newEnd = timeToMinutes(newAppt.endTime);

  for (const appt of existingAppointments) {
    if (excludeId && appt.id === excludeId) continue;
    if (!ACTIVE_STATUSES.includes(appt.status)) continue;
    if (appt.therapistId !== newAppt.therapistId) continue;
    if (appt.date !== newAppt.date) continue;

    const existStart = timeToMinutes(appt.startTime);
    const existEnd = timeToMinutes(appt.endTime);

    if (intervalsOverlap(newStart, newEnd, existStart, existEnd)) {
      return { hasConflict: true, conflictingAppointment: appt };
    }
  }

  return { hasConflict: false };
}

/**
 * فحص تعارض المستفيد
 */
function checkBeneficiaryConflict(newAppt, existingAppointments, excludeId = null) {
  const newStart = timeToMinutes(newAppt.startTime);
  const newEnd = timeToMinutes(newAppt.endTime);

  for (const appt of existingAppointments) {
    if (excludeId && appt.id === excludeId) continue;
    if (!ACTIVE_STATUSES.includes(appt.status)) continue;
    if (appt.beneficiaryId !== newAppt.beneficiaryId) continue;
    if (appt.date !== newAppt.date) continue;

    const existStart = timeToMinutes(appt.startTime);
    const existEnd = timeToMinutes(appt.endTime);

    if (intervalsOverlap(newStart, newEnd, existStart, existEnd)) {
      return { hasConflict: true, conflictingAppointment: appt };
    }
  }

  return { hasConflict: false };
}

/**
 * فحص تعارض الغرفة
 */
function checkRoomConflict(newAppt, existingBookings, excludeId = null) {
  if (!newAppt.roomId) return { hasConflict: false };

  const newStart = timeToMinutes(newAppt.startTime);
  const newEnd = timeToMinutes(newAppt.endTime);

  for (const booking of existingBookings) {
    if (excludeId && booking.id === excludeId) continue;
    if (booking.status === 'cancelled') continue;
    if (booking.roomId !== newAppt.roomId) continue;
    if (booking.date !== newAppt.date) continue;

    const existStart = timeToMinutes(booking.startTime);
    const existEnd = timeToMinutes(booking.endTime);

    if (intervalsOverlap(newStart, newEnd, existStart, existEnd)) {
      return { hasConflict: true, conflictingBooking: booking };
    }
  }

  return { hasConflict: false };
}

/**
 * فحص أوقات توفر المعالج
 *
 * @param {Object}   newAppt
 * @param {Object[]} availabilitySlots - فترات توفر المعالج
 * @returns {{ withinAvailability: boolean, reason?: string, availability?: Object }}
 */
function checkTherapistAvailability(newAppt, availabilitySlots) {
  const dayOfWeek = getDayOfWeek(newAppt.date);

  // التحقق من أن اليوم يوم عمل
  if (!SAUDI_WORK_DAYS.includes(dayOfWeek)) {
    return {
      withinAvailability: false,
      reason: `يوم ${dayOfWeek} ليس ضمن أيام العمل الرسمية`,
    };
  }

  const availability = availabilitySlots.find(
    a => a.therapistId === newAppt.therapistId && a.dayOfWeek === dayOfWeek && a.isActive !== false
  );

  if (!availability) {
    return {
      withinAvailability: false,
      reason: `لا يوجد جدول توفر للمعالج يوم ${dayOfWeek}`,
    };
  }

  const newStart = timeToMinutes(newAppt.startTime);
  const newEnd = timeToMinutes(newAppt.endTime);
  const availStart = timeToMinutes(availability.startTime);
  const availEnd = timeToMinutes(availability.endTime);

  if (newStart < availStart || newEnd > availEnd) {
    return {
      withinAvailability: false,
      reason: `الموعد خارج أوقات التوفر (${availability.startTime} - ${availability.endTime})`,
      availability,
    };
  }

  // التحقق من فترة الاستراحة
  if (availability.breakStart && availability.breakEnd) {
    const breakStart = timeToMinutes(availability.breakStart);
    const breakEnd = timeToMinutes(availability.breakEnd);
    if (intervalsOverlap(newStart, newEnd, breakStart, breakEnd)) {
      return {
        withinAvailability: false,
        reason: `الموعد يتداخل مع فترة الاستراحة (${availability.breakStart} - ${availability.breakEnd})`,
        availability,
      };
    }
  }

  return { withinAvailability: true, availability };
}

/**
 * فحص تجاوز الحد الأقصى للجلسات اليومية
 *
 * @param {Object}   newAppt
 * @param {Object[]} existingAppointments
 * @param {number}   maxDailySessions
 * @returns {{ exceeded: boolean, currentCount: number, maxAllowed: number }}
 */
function checkDailySessionLimit(
  newAppt,
  existingAppointments,
  maxDailySessions = DEFAULT_MAX_DAILY_SESSIONS
) {
  const count = existingAppointments.filter(
    a =>
      a.therapistId === newAppt.therapistId &&
      a.date === newAppt.date &&
      ACTIVE_STATUSES.includes(a.status) &&
      a.id !== newAppt.id
  ).length;

  return {
    exceeded: count >= maxDailySessions,
    currentCount: count,
    maxAllowed: maxDailySessions,
  };
}

// ─── الكشف الشامل عن التعارضات ────────────────────────────────────────────────

/**
 * كشف جميع التعارضات المحتملة لموعد جديد أو معدّل
 *
 * @param {Object}   newAppt                       - بيانات الموعد الجديد/المعدّل
 * @param {Object}   context                       - السياق
 * @param {Object[]} context.existingAppointments  - كل المواعيد الموجودة
 * @param {Object[]} context.roomBookings          - حجوزات الغرف
 * @param {Object[]} context.availabilitySlots     - جداول توفر المعالجين
 * @param {number}   context.maxDailySessions      - الحد الأقصى اليومي للجلسات
 * @param {*}        context.excludeId             - استثناء موعد عند التعديل
 * @returns {Object} { isValid, errors, conflicts, warnings }
 */
function detectConflicts(newAppt, context = {}) {
  const {
    existingAppointments = [],
    roomBookings = [],
    availabilitySlots = [],
    maxDailySessions = DEFAULT_MAX_DAILY_SESSIONS,
    excludeId = null,
  } = context;

  // التحقق من البيانات المدخلة أولاً
  const validationErrors = validateAppointmentData(newAppt);
  if (validationErrors.length > 0) {
    return {
      isValid: false,
      errors: validationErrors,
      conflicts: [],
      warnings: [],
    };
  }

  const conflicts = [];
  const warnings = [];

  // 1. تعارض المعالج
  const therapistConflict = checkTherapistConflict(newAppt, existingAppointments, excludeId);
  if (therapistConflict.hasConflict) {
    const conflAppt = therapistConflict.conflictingAppointment;
    conflicts.push({
      type: 'therapist_conflict',
      severity: 'error',
      message: `المعالج لديه موعد آخر في نفس الوقت (${conflAppt.startTime} - ${conflAppt.endTime})`,
      conflictingAppointmentId: conflAppt.id,
    });
  }

  // 2. تعارض المستفيد
  const beneficiaryConflict = checkBeneficiaryConflict(newAppt, existingAppointments, excludeId);
  if (beneficiaryConflict.hasConflict) {
    const conflAppt = beneficiaryConflict.conflictingAppointment;
    conflicts.push({
      type: 'beneficiary_conflict',
      severity: 'error',
      message: `المستفيد لديه موعد آخر في نفس الوقت (${conflAppt.startTime} - ${conflAppt.endTime})`,
      conflictingAppointmentId: conflAppt.id,
    });
  }

  // 3. تعارض الغرفة
  const roomConflict = checkRoomConflict(newAppt, roomBookings, excludeId);
  if (roomConflict.hasConflict) {
    conflicts.push({
      type: 'room_conflict',
      severity: 'error',
      message: 'الغرفة محجوزة في نفس الوقت',
      conflictingBookingId: roomConflict.conflictingBooking?.id,
    });
  }

  // 4. أوقات التوفر (تحذير وليس خطأ فادح - يمكن التجاوز بإذن)
  if (availabilitySlots.length > 0) {
    const availCheck = checkTherapistAvailability(newAppt, availabilitySlots);
    if (!availCheck.withinAvailability) {
      warnings.push({
        type: 'outside_availability',
        severity: 'warning',
        message: availCheck.reason,
      });
    }
  }

  // 5. الحد الأقصى للجلسات اليومية (تحذير)
  const limitCheck = checkDailySessionLimit(newAppt, existingAppointments, maxDailySessions);
  if (limitCheck.exceeded) {
    warnings.push({
      type: 'daily_limit_exceeded',
      severity: 'warning',
      message: `المعالج وصل الحد الأقصى اليومي للجلسات (${limitCheck.currentCount}/${limitCheck.maxAllowed})`,
      currentCount: limitCheck.currentCount,
      maxAllowed: limitCheck.maxAllowed,
    });
  }

  return {
    isValid: conflicts.length === 0,
    errors: [],
    conflicts,
    warnings,
  };
}

// ─── الفترات الزمنية المتاحة ──────────────────────────────────────────────────

/**
 * إيجاد الفترات الزمنية المتاحة للمعالج في يوم معين
 *
 * @param {Object}   params
 * @param {*}        params.therapistId
 * @param {string}   params.date             - "YYYY-MM-DD"
 * @param {number}   params.durationMinutes  - مدة الجلسة المطلوبة
 * @param {Object}   params.availability     - جدول توفر المعالج لهذا اليوم
 * @param {Object[]} params.bookedSlots      - المواعيد المحجوزة (نفس المعالج، نفس اليوم)
 * @param {number}   [params.bufferMinutes]  - وقت فراغ بين الجلسات (افتراضي 5 دقائق)
 * @returns {Array<{startTime: string, endTime: string}>} الفترات المتاحة
 */
function findAvailableSlots({
  therapistId,
  date,
  durationMinutes,
  availability,
  bookedSlots,
  bufferMinutes = 5,
}) {
  if (!availability || !availability.startTime || !availability.endTime) {
    return [];
  }

  const dayOfWeek = getDayOfWeek(date);
  if (!SAUDI_WORK_DAYS.includes(dayOfWeek)) {
    return [];
  }

  const availStart = timeToMinutes(availability.startTime);
  const availEnd = timeToMinutes(availability.endTime);

  // تجميع الفترات المحجوزة (مع مراعاة الـ buffer)
  const busyPeriods = [];

  // إضافة فترة الاستراحة إن وجدت
  if (availability.breakStart && availability.breakEnd) {
    busyPeriods.push({
      start: timeToMinutes(availability.breakStart),
      end: timeToMinutes(availability.breakEnd),
    });
  }

  // إضافة المواعيد المحجوزة
  for (const slot of bookedSlots) {
    if (!ACTIVE_STATUSES.includes(slot.status)) continue;
    if (slot.therapistId !== therapistId && therapistId !== undefined) continue;
    busyPeriods.push({
      start: timeToMinutes(slot.startTime) - bufferMinutes,
      end: timeToMinutes(slot.endTime) + bufferMinutes,
    });
  }

  // ترتيب الفترات المحجوزة
  busyPeriods.sort((a, b) => a.start - b.start);

  // إيجاد الفترات الحرة
  const freeSlots = [];
  let cursor = availStart;

  for (const busy of busyPeriods) {
    const busyStart = Math.max(busy.start, availStart);
    const busyEnd = Math.min(busy.end, availEnd);

    if (busyStart > cursor && busyStart - cursor >= durationMinutes) {
      // توليد الفترات ضمن الوقت الحر
      for (
        let s = cursor;
        s + durationMinutes <= busyStart;
        s += availability.slotDurationMinutes || durationMinutes
      ) {
        freeSlots.push({
          startTime: minutesToTime(s),
          endTime: minutesToTime(s + durationMinutes),
        });
      }
    }

    cursor = Math.max(cursor, busyEnd);
  }

  // الوقت الحر بعد آخر حجز حتى نهاية التوفر
  for (
    let s = cursor;
    s + durationMinutes <= availEnd;
    s += availability.slotDurationMinutes || durationMinutes
  ) {
    freeSlots.push({
      startTime: minutesToTime(s),
      endTime: minutesToTime(s + durationMinutes),
    });
  }

  return freeSlots;
}

// ─── قائمة الانتظار الذكية ────────────────────────────────────────────────────

/**
 * حساب نقاط الأولوية لمدخل قائمة الانتظار
 *
 * عوامل الأولوية:
 *  - شدة الإعاقة: severe=40, moderate=25, mild=10
 *  - عمر الطفل: ≤3 سنوات=30, ≤6=25, ≤12=15, أكبر=5 (التدخل المبكر)
 *  - مدة الانتظار: حد أقصى 20 نقطة (0.5 نقطة/يوم)
 *  - إحالة طبية عاجلة: +15
 *  - لا يتلقى خدمات حالياً: +10
 *  - علامة عاجلة: +20
 *
 * @param {Object} entry
 * @param {string} entry.disabilitySeverity   - 'severe' | 'moderate' | 'mild'
 * @param {number} entry.ageYears             - عمر المستفيد بالسنوات
 * @param {number} entry.waitingDays          - عدد أيام الانتظار
 * @param {boolean} [entry.isMedicalReferral] - إحالة طبية
 * @param {boolean} [entry.isUrgent]          - حالة عاجلة
 * @param {boolean} [entry.receivingServices] - يتلقى خدمات حالياً
 * @returns {number} نقاط الأولوية (0-100)
 */
function calculateWaitlistPriority(entry) {
  let score = 0;

  // 1. شدة الإعاقة
  const disabilityScores = { severe: 40, moderate: 25, mild: 10 };
  score += disabilityScores[entry.disabilitySeverity] ?? 15;

  // 2. العمر (التدخل المبكر يحظى بأولوية أعلى)
  const age = entry.ageYears ?? 10;
  if (age <= 3) score += 30;
  else if (age <= 6) score += 25;
  else if (age <= 12) score += 15;
  else score += 5;

  // 3. مدة الانتظار (حد أقصى 20 نقطة)
  const waitingDays = entry.waitingDays ?? 0;
  score += Math.min(waitingDays * 0.5, 20);

  // 4. إحالة طبية عاجلة
  if (entry.isMedicalReferral) score += 15;

  // 5. علامة عاجلة
  if (entry.isUrgent) score += 20;

  // 6. لا يتلقى خدمات حالياً
  if (!entry.receivingServices) score += 10;

  return Math.min(100, Math.round(score * 100) / 100);
}

/**
 * ترتيب قائمة الانتظار تنازلياً بحسب الأولوية
 * عند تساوي الأولوية، يُقدَّم من انتظر أطول
 *
 * @param {Object[]} entries - مدخلات قائمة الانتظار
 * @returns {Object[]} مرتبة
 */
function sortWaitlist(entries) {
  return [...entries].sort((a, b) => {
    const scoreDiff = calculateWaitlistPriority(b) - calculateWaitlistPriority(a);
    if (scoreDiff !== 0) return scoreDiff;
    // تساوٍ → من انتظر أطول أولاً
    return (b.waitingDays ?? 0) - (a.waitingDays ?? 0);
  });
}

// ─── الصادرات ─────────────────────────────────────────────────────────────────

module.exports = {
  // الدوال الرئيسية
  detectConflicts,
  checkTherapistConflict,
  checkBeneficiaryConflict,
  checkRoomConflict,
  checkTherapistAvailability,
  checkDailySessionLimit,

  // الفترات المتاحة
  findAvailableSlots,

  // قائمة الانتظار
  calculateWaitlistPriority,
  sortWaitlist,

  // دوال مساعدة (مُصدَّرة للاختبار)
  timeToMinutes,
  minutesToTime,
  intervalsOverlap,
  getDayOfWeek,
  validateAppointmentData,

  // ثوابت
  SAUDI_WORK_DAYS,
  ACTIVE_STATUSES,
  DEFAULT_MAX_DAILY_SESSIONS,
};

/**
 * ScheduleOptimizerService — خدمة تحسين الجدولة الذكية
 * Prompt 20: AI & Predictive Analytics Module
 *
 * خوارزمية Greedy + Constraint Satisfaction لاقتراح الجدول الأسبوعي الأمثل
 * للأخصائيين والمستفيدين بناءً على القيود والتفضيلات.
 */

const logger = require('../../utils/logger');

/**
 * ساعات العمل الافتراضية (أحد - خميس، 8 صباحاً - 4 مساءً)
 */
const DEFAULT_WORK_START = 8;
const DEFAULT_WORK_END = 16;
const SESSION_DURATION_MINUTES = 45;
const BREAK_BETWEEN_SESSIONS = 15;

/**
 * أسماء أيام الأسبوع
 */
const DAY_NAMES_AR = {
  0: 'الأحد',
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
};
const DAY_NAMES_EN = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
};

/**
 * تحسين الجدول الأسبوعي
 *
 * @param {Object} params
 * @param {string|number} params.branchId - معرّف الفرع
 * @param {Date} params.weekStart - تاريخ بداية الأسبوع (أحد)
 * @param {Array} params.beneficiaries - المستفيدون النشطون (مع plans)
 * @param {Array} params.specialists - الأخصائيون المتاحون (مع specialties + availability)
 * @param {Array} params.existingAppointments - المواعيد المحجوزة مسبقاً
 * @param {Object} params.constraints - قيود إضافية { max_sessions_per_day: 2 }
 * @param {Object|null} params.workingHours - ساعات عمل الفرع
 * @returns {Object} - { schedule, stats, optimization_score, suggestions }
 */
function optimizeWeeklySchedule({
  branchId,
  weekStart,
  beneficiaries = [],
  specialists = [],
  existingAppointments = [],
  constraints = {},
  workingHours = null,
}) {
  const weekStartDate = weekStart instanceof Date ? weekStart : new Date(weekStart);

  // 1. تهيئة الفترات الزمنية المتاحة لكل أخصائي
  const specialistSlots = initializeSpecialistSlots(specialists, weekStartDate, workingHours);

  // 2. حساب احتياجات كل مستفيد
  const beneficiaryNeeds = calculateBeneficiaryNeeds(beneficiaries);

  // 3. تحديد المواعيد المحجوزة مسبقاً وتعليمها كـ "مستخدمة"
  markExistingAppointments(specialistSlots, existingAppointments);

  // 4. ترتيب المستفيدين حسب الأولوية
  const sortedNeeds = prioritizeBeneficiaries(beneficiaryNeeds);

  // 5. تنفيذ خوارزمية الجدولة الجشعة
  const schedule = [];

  for (const need of sortedNeeds) {
    const { beneficiary } = need;
    let scheduledCount = 0;

    // البحث عن أفضل الفترات
    const preferredSlots = getPreferredSlots(beneficiary, specialistSlots);

    for (const slot of preferredSlots) {
      if (scheduledCount >= need.sessions_per_week) break;
      if (!slot.available) continue;

      // التحقق من القيود
      if (!satisfiesConstraints(beneficiary, slot, schedule, constraints)) continue;

      // تسجيل الموعد
      schedule.push({
        beneficiary_id: String(beneficiary._id),
        beneficiary_name: beneficiary.name_ar || beneficiary.full_name,
        specialist_id: String(slot.specialist_id),
        specialist_name: slot.specialist_name,
        date: slot.date,
        day_name_ar: DAY_NAMES_AR[slot.day_of_week] || '',
        day_name_en: DAY_NAMES_EN[slot.day_of_week] || '',
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_morning: slot.is_morning,
        session_type: need.session_type,
        score: slot.score,
        reasons: slot.reasons || [],
      });

      markSlotUsed(specialistSlots, slot);
      scheduledCount++;
    }

    // تحذير إذا لم تكتمل الجدولة
    if (scheduledCount < need.sessions_per_week) {
      schedule.push({
        type: 'unscheduled_warning',
        beneficiary_id: String(beneficiary._id),
        beneficiary_name: beneficiary.name_ar || beneficiary.full_name,
        needed: need.sessions_per_week,
        scheduled: scheduledCount,
        missing: need.sessions_per_week - scheduledCount,
        message_ar: `لم يتم جدولة ${need.sessions_per_week - scheduledCount} جلسة — لا توجد فترات متاحة`,
        message_en: `Could not schedule ${need.sessions_per_week - scheduledCount} session(s) — no available slots`,
      });
    }
  }

  const stats = calculateStats(schedule, sortedNeeds);
  const optimizationScore = calculateOptimizationScore(schedule);
  const suggestions = generateSuggestions(schedule, sortedNeeds, specialistSlots);

  return { schedule, stats, optimization_score: optimizationScore, suggestions };
}

// ─── تهيئة الفترات الزمنية ─────────────────────────────────────────────────

function initializeSpecialistSlots(specialists, weekStartDate, workingHours) {
  const slots = [];
  const workStart = workingHours?.start_hour ?? DEFAULT_WORK_START;
  const workEnd = workingHours?.end_hour ?? DEFAULT_WORK_END;

  for (const specialist of specialists) {
    // التحقق من سقف الحالات
    const currentCaseload = specialist.current_caseload ?? 0;
    const maxCaseload = specialist.max_caseload ?? 20;
    if (currentCaseload >= maxCaseload) continue;

    const specialties =
      specialist.specialties?.map(s => (typeof s === 'string' ? s : s.name)) ?? [];

    for (let day = 0; day < 5; day++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + day);
      const dayOfWeek = date.getDay();

      // التحقق من توفر الأخصائي هذا اليوم
      const availability = specialist.availability ?? null;
      if (availability && !isAvailableOnDay(availability, dayOfWeek)) continue;

      const dateStr = date.toISOString().split('T')[0];
      let hour = workStart;
      let minute = 0;

      while (hour * 60 + minute + SESSION_DURATION_MINUTES <= workEnd * 60) {
        const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const endMinutes = hour * 60 + minute + SESSION_DURATION_MINUTES;
        const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

        slots.push({
          specialist_id: specialist._id,
          specialist_name: specialist.name_ar || specialist.name,
          specialties,
          date: dateStr,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          is_morning: hour < 12,
          available: true,
          score: 50,
          reasons: [],
        });

        // الانتقال للفترة التالية
        const nextMinutes = hour * 60 + minute + SESSION_DURATION_MINUTES + BREAK_BETWEEN_SESSIONS;
        hour = Math.floor(nextMinutes / 60);
        minute = nextMinutes % 60;
      }
    }
  }

  return slots;
}

function isAvailableOnDay(availability, dayOfWeek) {
  if (Array.isArray(availability)) {
    return availability.includes(dayOfWeek);
  }
  if (typeof availability === 'object') {
    return availability[dayOfWeek] !== false;
  }
  return true;
}

// ─── حساب احتياجات المستفيدين ──────────────────────────────────────────────

function calculateBeneficiaryNeeds(beneficiaries) {
  return beneficiaries.map(b => {
    const plan = b.active_plan || b.activePlan || null;
    return {
      beneficiary: b,
      sessions_per_week: plan?.sessions_per_week ?? 3,
      session_type: plan?.session_type ?? 'individual',
      preferred_time: b.preferred_time ?? b.preferredTime ?? 'any',
      required_specialty: b.required_specialty ?? null,
      priority_score: calculateBeneficiaryPriority(b),
    };
  });
}

function calculateBeneficiaryPriority(beneficiary) {
  let priority = 50;
  const severity = beneficiary.disability_severity || beneficiary.severity;
  if (severity === 'severe') priority += 20;
  else if (severity === 'moderate') priority += 10;
  if (beneficiary.status === 'new') priority += 15;
  return priority;
}

function prioritizeBeneficiaries(needs) {
  return [...needs].sort((a, b) => b.priority_score - a.priority_score);
}

// ─── تعليم المواعيد الموجودة ───────────────────────────────────────────────

function markExistingAppointments(slots, existingAppointments) {
  for (const appt of existingAppointments) {
    const apptDate =
      appt.appointment_date instanceof Date
        ? appt.appointment_date.toISOString().split('T')[0]
        : String(appt.appointment_date).split('T')[0];

    for (const slot of slots) {
      if (
        String(slot.specialist_id) === String(appt.specialist_id) &&
        slot.date === apptDate &&
        slot.start_time === (appt.start_time || appt.time)
      ) {
        slot.available = false;
        break;
      }
    }
  }
}

// ─── إيجاد الفترات المفضّلة ────────────────────────────────────────────────

function getPreferredSlots(beneficiary, slots) {
  const preferred_time = beneficiary.preferred_time ?? beneficiary.preferredTime ?? 'any';
  const required_specialty = beneficiary.required_specialty ?? null;

  return slots
    .filter(s => s.available)
    .map(slot => {
      let score = slot.score;
      const reasons = [];

      // تفضيل الوقت
      if (preferred_time === 'morning' && slot.is_morning) {
        score += 20;
        reasons.push('preferred_time_match');
      } else if (preferred_time === 'afternoon' && !slot.is_morning) {
        score += 20;
        reasons.push('preferred_time_match');
      }

      // مطابقة التخصص
      if (required_specialty && slot.specialties.includes(required_specialty)) {
        score += 30;
        reasons.push('specialty_match');
      }

      return { ...slot, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

// ─── التحقق من القيود ─────────────────────────────────────────────────────

function satisfiesConstraints(beneficiary, slot, schedule, constraints) {
  const maxPerDay = constraints.max_sessions_per_day ?? 2;
  const beneficiaryId = String(beneficiary._id);

  // لا يمكن تكرار نفس الوقت لنفس المستفيد
  const conflict = schedule.find(
    s =>
      !s.type &&
      s.beneficiary_id === beneficiaryId &&
      s.date === slot.date &&
      s.start_time === slot.start_time
  );
  if (conflict) return false;

  // حد أقصى لجلسات اليوم
  const dayCount = schedule.filter(
    s => !s.type && s.beneficiary_id === beneficiaryId && s.date === slot.date
  ).length;
  if (dayCount >= maxPerDay) return false;

  return true;
}

// ─── تعليم الفترة كمستخدمة ────────────────────────────────────────────────

function markSlotUsed(slots, usedSlot) {
  for (const slot of slots) {
    if (
      String(slot.specialist_id) === String(usedSlot.specialist_id) &&
      slot.date === usedSlot.date &&
      slot.start_time === usedSlot.start_time
    ) {
      slot.available = false;
      return;
    }
  }
}

// ─── الإحصاءات ───────────────────────────────────────────────────────────

function calculateStats(schedule, needs) {
  const appointments = schedule.filter(s => !s.type);
  const warnings = schedule.filter(s => s.type === 'unscheduled_warning');

  const specialistUtil = {};
  for (const appt of appointments) {
    const key = String(appt.specialist_id);
    specialistUtil[key] = (specialistUtil[key] || 0) + 1;
  }

  return {
    total_scheduled: appointments.length,
    total_unscheduled: warnings.reduce((sum, w) => sum + (w.missing || 0), 0),
    total_beneficiaries: needs.length,
    fully_scheduled: needs.length - warnings.length,
    partially_scheduled: warnings.length,
    specialist_utilization: specialistUtil,
  };
}

function calculateOptimizationScore(schedule) {
  const appointments = schedule.filter(s => !s.type);
  if (!appointments.length) return 0;
  const avgScore = appointments.reduce((sum, a) => sum + (a.score || 50), 0) / appointments.length;
  return Math.round((avgScore / 100) * 100) / 100;
}

function generateSuggestions(schedule, needs, slots) {
  const suggestions = [];
  const warnings = schedule.filter(s => s.type === 'unscheduled_warning');

  if (warnings.length > 0) {
    suggestions.push({
      type: 'capacity_warning',
      message_ar: `يوجد ${warnings.length} مستفيد لم تكتمل جدولة جلساتهم. قد تحتاج لإضافة أخصائيين أو تمديد ساعات العمل.`,
      message_en: `${warnings.length} beneficiary/beneficiaries could not be fully scheduled. Consider adding specialists or extending working hours.`,
    });
  }

  // التحقق من تركّز الجلسات في فترات معينة
  const morningCount = schedule.filter(s => !s.type && s.is_morning).length;
  const afternoonCount = schedule.filter(s => !s.type && !s.is_morning).length;
  const totalAppts = morningCount + afternoonCount;

  if (totalAppts > 0 && morningCount / totalAppts > 0.8) {
    suggestions.push({
      type: 'time_distribution',
      message_ar: 'معظم الجلسات مجدولة في الصباح — النظر في توزيع بعضها على فترة بعد الظهر.',
      message_en:
        'Most sessions are scheduled in the morning — consider distributing some to afternoon.',
    });
  }

  // التحقق من الأخصائيين غير المُستغَلّين
  const usedSpecialists = new Set(schedule.filter(s => !s.type).map(s => s.specialist_id));
  const availableSpecialistIds = new Set(slots.map(s => String(s.specialist_id)));
  const unusedCount = [...availableSpecialistIds].filter(id => !usedSpecialists.has(id)).length;

  if (unusedCount > 0) {
    suggestions.push({
      type: 'unused_specialists',
      message_ar: `يوجد ${unusedCount} أخصائي متاح لم يُجدَّل لهم أي مستفيد هذا الأسبوع.`,
      message_en: `${unusedCount} available specialist(s) have no scheduled beneficiaries this week.`,
    });
  }

  return suggestions;
}

/**
 * توليد ملخص نصي للجدول المقترح
 * @param {Object} result - نتيجة optimizeWeeklySchedule
 * @returns {string}
 */
function generateScheduleSummaryAr(result) {
  const { stats, optimization_score } = result;
  const scoreLabel =
    optimization_score >= 0.8
      ? 'ممتاز'
      : optimization_score >= 0.6
        ? 'جيد'
        : optimization_score >= 0.4
          ? 'مقبول'
          : 'يحتاج تحسين';

  return (
    `تم جدولة ${stats.total_scheduled} جلسة ` +
    `لـ ${stats.fully_scheduled} مستفيد من أصل ${stats.total_beneficiaries}. ` +
    `مستوى التحسين: ${scoreLabel} (${Math.round(optimization_score * 100)}%).` +
    (stats.partially_scheduled > 0
      ? ` تحذير: ${stats.partially_scheduled} مستفيد لم تكتمل جدولتهم.`
      : '')
  );
}

module.exports = {
  optimizeWeeklySchedule,
  initializeSpecialistSlots,
  calculateBeneficiaryNeeds,
  prioritizeBeneficiaries,
  satisfiesConstraints,
  calculateStats,
  calculateOptimizationScore,
  generateScheduleSummaryAr,
};

'use strict';

/**
 * خدمة قائمة الانتظار الذكية بالأولوية
 * Smart Waitlist Priority Service
 *
 * يغطي:
 *  - حساب نقاط الأولوية (0-100) لكل مستفيد في قائمة الانتظار
 *  - ترتيب القائمة بناءً على الأولوية المركّبة
 *  - تحديث الأولويات دورياً بزيادة مدة الانتظار
 *  - تقديم عرض للمريض التالي عند إلغاء موعد
 *  - إدارة دورة حياة قائمة الانتظار
 */

// ─── ثوابت ───────────────────────────────────────────────────────────────────

/** الحد الأقصى لنقاط الأولوية */
const MAX_PRIORITY_SCORE = 100;

/** الحد الأدنى لنقاط الأولوية */
const MIN_PRIORITY_SCORE = 0;

/** نقاط الأولوية الأساسية */
const BASE_PRIORITY_SCORE = 50;

/** الحد الأقصى لنقاط مدة الانتظار */
const MAX_WAIT_BONUS = 20;

/** نقاط إضافية لكل أسبوع انتظار */
const WAIT_BONUS_PER_WEEK = 2;

/** مدة صلاحية عرض الموعد بالساعات */
const OFFER_EXPIRY_HOURS = 4;

/** حالات قائمة الانتظار */
const WAITLIST_STATUS = {
  WAITING: 'waiting',
  OFFERED: 'offered',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  REMOVED: 'removed',
};

/** مستويات الأولوية */
const PRIORITY_LEVELS = {
  URGENT: 'urgent', // 80-100
  HIGH: 'high', // 60-79
  NORMAL: 'normal', // 40-59
  LOW: 'low', // 0-39
};

/** شدة الإعاقة وتأثيرها على الأولوية */
const DISABILITY_SEVERITY_SCORES = {
  severe: 40,
  moderate: 25,
  mild: 10,
  unspecified: 15,
};

/** نقاط حسب الفئة العمرية (التدخل المبكر) */
const AGE_PRIORITY_SCORES = {
  infant: 30, // أقل من 3 سنوات
  toddler: 25, // 3-6 سنوات
  child: 15, // 6-12 سنة
  teen: 10, // 12-18 سنة
  adult: 5, // فوق 18 سنة
};

// ─── حساب نقاط الأولوية ──────────────────────────────────────────────────────

/**
 * تحديد الفئة العمرية حسب عمر المستفيد
 * @param {number} ageInYears
 * @returns {string}
 */
function getAgeCategory(ageInYears) {
  if (typeof ageInYears !== 'number' || ageInYears < 0) return 'adult';
  if (ageInYears < 3) return 'infant';
  if (ageInYears < 6) return 'toddler';
  if (ageInYears < 12) return 'child';
  if (ageInYears < 18) return 'teen';
  return 'adult';
}

/**
 * حساب نقاط العمر
 * @param {number} ageInYears
 * @returns {number}
 */
function calculateAgeScore(ageInYears) {
  const category = getAgeCategory(ageInYears);
  return AGE_PRIORITY_SCORES[category] || 5;
}

/**
 * حساب نقاط شدة الإعاقة
 * @param {string} severity
 * @returns {number}
 */
function calculateSeverityScore(severity) {
  return DISABILITY_SEVERITY_SCORES[severity] || DISABILITY_SEVERITY_SCORES.unspecified;
}

/**
 * حساب نقاط مدة الانتظار
 * يضاف 2 نقطة لكل أسبوع انتظار بحد أقصى 20 نقطة
 * @param {number} waitingDays - عدد أيام الانتظار
 * @returns {number}
 */
function calculateWaitTimeBonus(waitingDays) {
  if (typeof waitingDays !== 'number' || waitingDays < 0) return 0;
  const weeks = Math.floor(waitingDays / 7);
  return Math.min(weeks * WAIT_BONUS_PER_WEEK, MAX_WAIT_BONUS);
}

/**
 * حساب نقاط الأولوية الكاملة لمدخل في قائمة الانتظار
 *
 * عوامل الحساب:
 * 1. شدة الإعاقة: 10-40 نقطة
 * 2. العمر (التدخل المبكر): 5-30 نقطة
 * 3. مدة الانتظار: 0-20 نقطة (2 لكل أسبوع)
 * 4. إحالة طبية عاجلة: +15 نقطة
 * 5. لا يتلقى خدمات حالياً: +10 نقطة
 * 6. عدد الخدمات المطلوبة: +5 نقطة (متعدد)
 *
 * @param {object} entryData - بيانات المدخل
 * @param {number} entryData.ageInYears - عمر المستفيد
 * @param {string} entryData.disabilitySeverity - شدة الإعاقة
 * @param {number} entryData.waitingDays - عدد أيام الانتظار
 * @param {boolean} [entryData.isUrgentReferral] - إحالة طبية عاجلة
 * @param {boolean} [entryData.currentlyReceivingServices] - يتلقى خدمات حالياً
 * @param {number} [entryData.requestedServicesCount] - عدد الخدمات المطلوبة
 * @returns {number} نقاط الأولوية (0-100)
 */
function calculatePriorityScore(entryData) {
  if (!entryData || typeof entryData !== 'object') {
    throw new Error('بيانات المدخل مطلوبة');
  }

  const {
    ageInYears = 10,
    disabilitySeverity = 'unspecified',
    waitingDays = 0,
    isUrgentReferral = false,
    currentlyReceivingServices = false,
    requestedServicesCount = 1,
  } = entryData;

  let score = 0;

  // 1. شدة الإعاقة (10-40)
  score += calculateSeverityScore(disabilitySeverity);

  // 2. العمر — التدخل المبكر (5-30)
  score += calculateAgeScore(ageInYears);

  // 3. مدة الانتظار (0-20)
  score += calculateWaitTimeBonus(waitingDays);

  // 4. إحالة طبية عاجلة (+15)
  if (isUrgentReferral) {
    score += 15;
  }

  // 5. لا يتلقى خدمات حالياً (+10)
  if (!currentlyReceivingServices) {
    score += 10;
  }

  // 6. يحتاج خدمات متعددة (+5 إذا أكثر من خدمة واحدة)
  if (requestedServicesCount > 1) {
    score += 5;
  }

  // تقييد النتيجة بين 0 و100
  return Math.min(MAX_PRIORITY_SCORE, Math.max(MIN_PRIORITY_SCORE, score));
}

/**
 * تحديد مستوى الأولوية بناءً على النقاط
 * @param {number} score
 * @returns {string}
 */
function getPriorityLevel(score) {
  if (score >= 80) return PRIORITY_LEVELS.URGENT;
  if (score >= 60) return PRIORITY_LEVELS.HIGH;
  if (score >= 40) return PRIORITY_LEVELS.NORMAL;
  return PRIORITY_LEVELS.LOW;
}

// ─── ترتيب قائمة الانتظار ────────────────────────────────────────────────────

/**
 * ترتيب قائمة الانتظار بالأولوية (نزولاً)
 * عند تعادل النقاط: الأقدم انتظاراً يُقدَّم أولاً
 *
 * @param {Array<object>} entries - مدخلات قائمة الانتظار
 * @returns {Array<object>} القائمة المرتبة
 */
function sortWaitlistByPriority(entries) {
  if (!Array.isArray(entries)) {
    throw new Error('قائمة الانتظار يجب أن تكون مصفوفة');
  }
  if (entries.length === 0) return [];

  return [...entries].sort((a, b) => {
    // الأولوية الأعلى أولاً
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    // عند التعادل: الأقدم انتظاراً أولاً (waitingDays أكبر)
    return (b.waitingDays || 0) - (a.waitingDays || 0);
  });
}

/**
 * تحديث نقاط الأولوية لجميع مدخلات القائمة (تُنفذ دورياً)
 *
 * @param {Array<object>} entries - المدخلات الحالية
 * @param {number} additionalDays - الأيام المضافة منذ آخر تحديث
 * @returns {Array<object>} المدخلات المحدثة
 */
function recalculatePriorities(entries, additionalDays = 1) {
  if (!Array.isArray(entries)) {
    throw new Error('قائمة الانتظار يجب أن تكون مصفوفة');
  }
  if (typeof additionalDays !== 'number' || additionalDays < 0) {
    throw new Error('عدد الأيام يجب أن يكون رقماً موجباً');
  }

  return entries.map(entry => {
    const updatedWaitingDays = (entry.waitingDays || 0) + additionalDays;
    const newScore = calculatePriorityScore({
      ...entry,
      waitingDays: updatedWaitingDays,
    });

    return {
      ...entry,
      waitingDays: updatedWaitingDays,
      priorityScore: newScore,
      priorityLevel: getPriorityLevel(newScore),
    };
  });
}

// ─── إدارة العروض ────────────────────────────────────────────────────────────

/**
 * تحديد المستفيد التالي الذي يجب إشعاره عند توفر موعد
 *
 * @param {Array<object>} entries - مدخلات قائمة الانتظار
 * @param {object} availableSlot - الموعد المتاح
 * @param {string} availableSlot.serviceType - نوع الخدمة
 * @param {string} availableSlot.branchId - الفرع
 * @param {string} [availableSlot.therapistId] - المعالج (اختياري)
 * @returns {object|null} المدخل الأول المطابق
 */
function getNextInLine(entries, availableSlot) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  if (!availableSlot || typeof availableSlot !== 'object') {
    throw new Error('بيانات الموعد المتاح مطلوبة');
  }

  const { serviceType, branchId, therapistId } = availableSlot;

  // تصفية المدخلات المنتظرة المطابقة للخدمة والفرع
  const eligible = entries.filter(entry => {
    if (entry.status !== WAITLIST_STATUS.WAITING) return false;
    if (entry.branchId !== branchId) return false;
    if (entry.serviceType !== serviceType) return false;
    // إذا طلب معالجاً محدداً
    if (entry.preferredTherapistId && therapistId && entry.preferredTherapistId !== therapistId) {
      return false;
    }
    return true;
  });

  if (eligible.length === 0) return null;

  // ترتيب حسب الأولوية
  const sorted = sortWaitlistByPriority(eligible);
  return sorted[0];
}

/**
 * إنشاء عرض موعد لمستفيد في قائمة الانتظار
 *
 * @param {object} entry - مدخل قائمة الانتظار
 * @param {object} slot - بيانات الموعد المتاح
 * @param {Date} [offerTime] - وقت تقديم العرض (افتراضي: الآن)
 * @returns {object} بيانات العرض
 */
function createOffer(entry, slot, offerTime = new Date()) {
  if (!entry || !slot) {
    throw new Error('بيانات المدخل والموعد مطلوبة');
  }

  const expiryTime = new Date(offerTime.getTime() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000);

  return {
    entryId: entry.id,
    beneficiaryId: entry.beneficiaryId,
    offeredSlot: {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      therapistId: slot.therapistId,
      branchId: slot.branchId,
    },
    offeredAt: offerTime.toISOString(),
    expiresAt: expiryTime.toISOString(),
    status: WAITLIST_STATUS.OFFERED,
  };
}

/**
 * التحقق من انتهاء صلاحية العرض
 * @param {string} expiresAt - تاريخ انتهاء الصلاحية
 * @param {Date} [checkTime] - وقت التحقق (افتراضي: الآن)
 * @returns {boolean}
 */
function isOfferExpired(expiresAt, checkTime = new Date()) {
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt);
  return checkTime > expiry;
}

/**
 * حساب الوقت المتبقي قبل انتهاء العرض بالدقائق
 * @param {string} expiresAt
 * @param {Date} [checkTime]
 * @returns {number} الدقائق المتبقية (سالب إذا انتهى)
 */
function getRemainingOfferMinutes(expiresAt, checkTime = new Date()) {
  if (!expiresAt) return -1;
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - checkTime.getTime();
  return Math.round(diffMs / (1000 * 60));
}

// ─── إحصاءات قائمة الانتظار ──────────────────────────────────────────────────

/**
 * حساب إحصاءات قائمة الانتظار
 * @param {Array<object>} entries
 * @returns {object}
 */
function calculateWaitlistStats(entries) {
  if (!Array.isArray(entries)) {
    throw new Error('قائمة الانتظار يجب أن تكون مصفوفة');
  }

  const waiting = entries.filter(e => e.status === WAITLIST_STATUS.WAITING);
  const offered = entries.filter(e => e.status === WAITLIST_STATUS.OFFERED);

  if (waiting.length === 0) {
    return {
      total: entries.length,
      waiting: 0,
      offered: offered.length,
      averageWaitDays: 0,
      maxWaitDays: 0,
      urgentCount: 0,
      highCount: 0,
      byServiceType: {},
      averagePriorityScore: 0,
    };
  }

  const waitDays = waiting.map(e => e.waitingDays || 0);
  const averageWaitDays = waitDays.reduce((a, b) => a + b, 0) / waitDays.length;
  const maxWaitDays = Math.max(...waitDays);

  const urgentCount = waiting.filter(e => (e.priorityScore || 0) >= 80).length;
  const highCount = waiting.filter(
    e => (e.priorityScore || 0) >= 60 && (e.priorityScore || 0) < 80
  ).length;

  const byServiceType = waiting.reduce((acc, entry) => {
    const st = entry.serviceType || 'unknown';
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  const averagePriorityScore =
    waiting.reduce((sum, e) => sum + (e.priorityScore || 0), 0) / waiting.length;

  return {
    total: entries.length,
    waiting: waiting.length,
    offered: offered.length,
    averageWaitDays: Math.round(averageWaitDays * 10) / 10,
    maxWaitDays,
    urgentCount,
    highCount,
    byServiceType,
    averagePriorityScore: Math.round(averagePriorityScore),
  };
}

/**
 * تصفية قائمة الانتظار حسب معايير متعددة
 *
 * @param {Array<object>} entries
 * @param {object} filters
 * @returns {Array<object>}
 */
function filterWaitlist(entries, filters = {}) {
  if (!Array.isArray(entries)) {
    throw new Error('قائمة الانتظار يجب أن تكون مصفوفة');
  }

  const { branchId, serviceType, status, minPriorityScore, maxAgeInYears } = filters;

  return entries.filter(entry => {
    if (branchId && entry.branchId !== branchId) return false;
    if (serviceType && entry.serviceType !== serviceType) return false;
    if (status && entry.status !== status) return false;
    if (minPriorityScore !== undefined && (entry.priorityScore || 0) < minPriorityScore)
      return false;
    if (maxAgeInYears !== undefined && (entry.ageInYears || 0) > maxAgeInYears) return false;
    return true;
  });
}

/**
 * حساب الأيام المتوقعة للانتظار بناءً على الموقع في القائمة
 * (افتراض: يُجدول 5 مستفيدين جدد أسبوعياً لكل تخصص)
 *
 * @param {number} position - موقع المستفيد في القائمة (1-based)
 * @param {number} [weeklyIntake=5] - عدد المستفيدين الجدد أسبوعياً
 * @returns {number} الأيام المتوقعة
 */
function estimateWaitDays(position, weeklyIntake = 5) {
  if (typeof position !== 'number' || position < 1) {
    throw new Error('موقع المستفيد يجب أن يكون عدداً صحيحاً موجباً');
  }
  if (typeof weeklyIntake !== 'number' || weeklyIntake <= 0) {
    throw new Error('معدل الاستقبال الأسبوعي يجب أن يكون موجباً');
  }

  const weeksToWait = Math.ceil(position / weeklyIntake);
  return weeksToWait * 7;
}

// ─── الصادرات ─────────────────────────────────────────────────────────────────

module.exports = {
  // الحسابات الأساسية
  calculatePriorityScore,
  calculateAgeScore,
  calculateSeverityScore,
  calculateWaitTimeBonus,
  getPriorityLevel,
  getAgeCategory,

  // إدارة القائمة
  sortWaitlistByPriority,
  recalculatePriorities,
  filterWaitlist,
  getNextInLine,

  // إدارة العروض
  createOffer,
  isOfferExpired,
  getRemainingOfferMinutes,

  // الإحصاءات
  calculateWaitlistStats,
  estimateWaitDays,

  // الثوابت
  MAX_PRIORITY_SCORE,
  MIN_PRIORITY_SCORE,
  BASE_PRIORITY_SCORE,
  MAX_WAIT_BONUS,
  WAIT_BONUS_PER_WEEK,
  OFFER_EXPIRY_HOURS,
  WAITLIST_STATUS,
  PRIORITY_LEVELS,
  DISABILITY_SEVERITY_SCORES,
  AGE_PRIORITY_SCORES,
};

'use strict';

/**
 * خدمة تسعير الخدمات وحساب التكلفة
 * Service Pricing & Cost Calculation Service
 *
 * يغطي:
 *  - تسعير الجلسات حسب التخصص والمدة ونوع الجلسة
 *  - حساب تكلفة الخدمة (Cost per Session)
 *  - حساب الإيراد المتوقع (Revenue Projection)
 *  - تحليل نقطة التعادل (Break-even Analysis)
 *  - مؤشرات الكفاءة المالية
 *  - حساب خصومات التأمين والباقات
 */

// ─── ثوابت ───────────────────────────────────────────────────────────────────

/** معدل ضريبة القيمة المضافة السعودية */
const VAT_RATE = 0.15;

/** أنواع الجلسات */
const SESSION_TYPES = {
  INDIVIDUAL: 'individual',
  GROUP: 'group',
  ASSESSMENT: 'assessment',
  HOME_VISIT: 'home_visit',
  CONSULTATION: 'consultation',
  TELEHEALTH: 'telehealth',
};

/** التخصصات السريرية */
const SPECIALIZATIONS = {
  PT: 'pt', // علاج طبيعي
  OT: 'ot', // علاج وظيفي
  SPEECH: 'speech', // علاج النطق
  ABA: 'aba', // تحليل السلوك التطبيقي
  PSYCHOLOGY: 'psychology', // علم النفس
  SPECIAL_ED: 'special_education', // التربية الخاصة
  VOCATIONAL: 'vocational', // التأهيل المهني
  NURSING: 'nursing', // التمريض
};

/** معاملات التسعير حسب نوع الجلسة */
const SESSION_TYPE_MULTIPLIERS = {
  [SESSION_TYPES.INDIVIDUAL]: 1.0,
  [SESSION_TYPES.GROUP]: 0.6, // 60% من سعر الفردي
  [SESSION_TYPES.ASSESSMENT]: 1.5, // 150% (وقت إضافي للتقييم)
  [SESSION_TYPES.HOME_VISIT]: 1.75, // 175% (إضافة تكلفة النقل)
  [SESSION_TYPES.CONSULTATION]: 1.2,
  [SESSION_TYPES.TELEHEALTH]: 0.85, // 85% (لا تكلفة مكان)
};

/** الحد الأقصى لنسبة الخصم المسموح به */
const MAX_DISCOUNT_PERCENTAGE = 50;

/** نسبة الهامش الربحي المستهدفة */
const TARGET_PROFIT_MARGIN = 0.3;

/** الحد الأدنى للإيراد اليومي لكل معالج */
const MIN_DAILY_REVENUE_PER_THERAPIST = 800;

// ─── حساب سعر الجلسة ─────────────────────────────────────────────────────────

/**
 * حساب سعر الجلسة الأساسي حسب التخصص والمدة
 *
 * @param {string} specialization - التخصص السريري
 * @param {number} durationMinutes - مدة الجلسة بالدقائق
 * @param {object} [pricingTable] - جدول التسعير (اختياري)
 * @returns {number} السعر الأساسي
 */
function calculateBaseSessionPrice(specialization, durationMinutes, pricingTable = null) {
  if (!specialization || typeof specialization !== 'string') {
    throw new Error('التخصص مطلوب');
  }
  if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
    throw new Error('مدة الجلسة يجب أن تكون رقماً موجباً');
  }

  // جدول التسعير الافتراضي (سعر الجلسة 45 دقيقة بالريال السعودي)
  const defaultPricing = {
    [SPECIALIZATIONS.PT]: { base45: 250, ratePerMin: 5.0 },
    [SPECIALIZATIONS.OT]: { base45: 250, ratePerMin: 5.0 },
    [SPECIALIZATIONS.SPEECH]: { base45: 280, ratePerMin: 5.5 },
    [SPECIALIZATIONS.ABA]: { base45: 320, ratePerMin: 6.5 },
    [SPECIALIZATIONS.PSYCHOLOGY]: { base45: 400, ratePerMin: 8.0 },
    [SPECIALIZATIONS.SPECIAL_ED]: { base45: 220, ratePerMin: 4.5 },
    [SPECIALIZATIONS.VOCATIONAL]: { base45: 200, ratePerMin: 4.0 },
    [SPECIALIZATIONS.NURSING]: { base45: 180, ratePerMin: 3.5 },
  };

  const pricing = pricingTable || defaultPricing;
  const spec = pricing[specialization];

  if (!spec) {
    throw new Error(`لا يوجد تسعيرة لتخصص: ${specialization}`);
  }

  // حساب السعر بناءً على المدة
  if (durationMinutes === 45) {
    return spec.base45;
  }

  // للمدد الأخرى: سعر القاعدة + فرق الوقت
  const basePrice = spec.base45;
  const timeDiff = durationMinutes - 45;
  const priceAdjustment = timeDiff * spec.ratePerMin;

  return Math.max(0, Math.round(basePrice + priceAdjustment));
}

/**
 * تطبيق معامل نوع الجلسة على السعر الأساسي
 *
 * @param {number} basePrice - السعر الأساسي
 * @param {string} sessionType - نوع الجلسة
 * @returns {number} السعر بعد تطبيق المعامل
 */
function applySessionTypeMultiplier(basePrice, sessionType) {
  if (typeof basePrice !== 'number' || basePrice < 0) {
    throw new Error('السعر الأساسي يجب أن يكون رقماً موجباً');
  }
  if (!sessionType) {
    throw new Error('نوع الجلسة مطلوب');
  }

  const multiplier = SESSION_TYPE_MULTIPLIERS[sessionType];
  if (multiplier === undefined) {
    throw new Error(`نوع جلسة غير معروف: ${sessionType}`);
  }

  return Math.round(basePrice * multiplier);
}

/**
 * حساب السعر النهائي للجلسة مع الضريبة
 *
 * @param {object} params - معاملات التسعير
 * @param {string} params.specialization
 * @param {number} params.durationMinutes
 * @param {string} params.sessionType
 * @param {number} [params.discountPercent] - نسبة الخصم (0-50)
 * @param {boolean} [params.includeVat] - هل يشمل الضريبة؟
 * @param {object} [params.pricingTable] - جدول التسعير المخصص
 * @returns {object} تفاصيل السعر
 */
function calculateSessionPrice(params) {
  if (!params || typeof params !== 'object') {
    throw new Error('معاملات التسعير مطلوبة');
  }

  const {
    specialization,
    durationMinutes,
    sessionType = SESSION_TYPES.INDIVIDUAL,
    discountPercent = 0,
    includeVat = true,
    pricingTable = null,
  } = params;

  if (discountPercent < 0 || discountPercent > MAX_DISCOUNT_PERCENTAGE) {
    throw new Error(`نسبة الخصم يجب أن تكون بين 0 و ${MAX_DISCOUNT_PERCENTAGE}%`);
  }

  const basePrice = calculateBaseSessionPrice(specialization, durationMinutes, pricingTable);
  const adjustedPrice = applySessionTypeMultiplier(basePrice, sessionType);

  const discountAmount = Math.round(adjustedPrice * (discountPercent / 100));
  const priceAfterDiscount = adjustedPrice - discountAmount;

  const vatAmount = includeVat ? Math.round(priceAfterDiscount * VAT_RATE) : 0;
  const totalPrice = priceAfterDiscount + vatAmount;

  return {
    specialization,
    durationMinutes,
    sessionType,
    basePrice,
    sessionTypeMultiplier: SESSION_TYPE_MULTIPLIERS[sessionType],
    adjustedPrice,
    discountPercent,
    discountAmount,
    priceBeforeVat: priceAfterDiscount,
    vatRate: includeVat ? VAT_RATE * 100 : 0,
    vatAmount,
    totalPrice,
  };
}

// ─── حساب الإيراد المتوقع ────────────────────────────────────────────────────

/**
 * حساب الإيراد الشهري المتوقع لمعالج واحد
 *
 * @param {object} params
 * @param {number} params.workingDaysPerMonth - أيام العمل في الشهر
 * @param {number} params.sessionsPerDay - عدد الجلسات اليومية
 * @param {number} params.averageSessionPrice - متوسط سعر الجلسة
 * @param {number} [params.attendanceRate] - معدل حضور المستفيدين (0-100)
 * @param {number} [params.cancellationRate] - معدل الإلغاء (0-100)
 * @returns {object} الإيراد المتوقع
 */
function calculateTherapistMonthlyRevenue(params) {
  if (!params || typeof params !== 'object') {
    throw new Error('المعاملات مطلوبة');
  }

  const {
    workingDaysPerMonth,
    sessionsPerDay,
    averageSessionPrice,
    attendanceRate = 80,
    cancellationRate = 10,
  } = params;

  if (workingDaysPerMonth <= 0 || sessionsPerDay <= 0 || averageSessionPrice <= 0) {
    throw new Error('جميع القيم يجب أن تكون موجبة');
  }

  const totalScheduledSessions = workingDaysPerMonth * sessionsPerDay;
  const effectiveAttendanceRate = Math.min(100, Math.max(0, attendanceRate));
  const effectiveCancellationRate = Math.min(100, Math.max(0, cancellationRate));

  // الجلسات الفعلية بعد الغياب والإلغاء
  const attendedSessions = Math.round(
    totalScheduledSessions * (effectiveAttendanceRate / 100) * (1 - effectiveCancellationRate / 100)
  );

  const grossRevenue = attendedSessions * averageSessionPrice;
  const dailyRevenue = workingDaysPerMonth > 0 ? Math.round(grossRevenue / workingDaysPerMonth) : 0;

  return {
    workingDaysPerMonth,
    sessionsPerDay,
    totalScheduledSessions,
    attendedSessions,
    averageSessionPrice,
    grossRevenue,
    dailyRevenue,
    effectiveAttendanceRate,
    isAboveMinimum: dailyRevenue >= MIN_DAILY_REVENUE_PER_THERAPIST,
  };
}

/**
 * حساب الإيراد السنوي المتوقع للمركز
 *
 * @param {number} therapistCount - عدد المعالجين
 * @param {number} averageMonthlyRevenuePerTherapist - متوسط الإيراد الشهري للمعالج
 * @param {number} [occupancyRate] - معدل الإشغال (0-100)
 * @returns {object}
 */
function calculateAnnualRevenueProjection(
  therapistCount,
  averageMonthlyRevenuePerTherapist,
  occupancyRate = 75
) {
  if (typeof therapistCount !== 'number' || therapistCount <= 0) {
    throw new Error('عدد المعالجين يجب أن يكون رقماً موجباً');
  }
  if (
    typeof averageMonthlyRevenuePerTherapist !== 'number' ||
    averageMonthlyRevenuePerTherapist <= 0
  ) {
    throw new Error('الإيراد الشهري يجب أن يكون رقماً موجباً');
  }

  const effectiveOccupancy = Math.min(100, Math.max(0, occupancyRate)) / 100;
  const monthlyRevenue = therapistCount * averageMonthlyRevenuePerTherapist * effectiveOccupancy;
  const annualRevenue = monthlyRevenue * 12;

  return {
    therapistCount,
    averageMonthlyRevenuePerTherapist,
    occupancyRate,
    monthlyRevenue: Math.round(monthlyRevenue),
    annualRevenue: Math.round(annualRevenue),
    quarterlyRevenue: Math.round(annualRevenue / 4),
  };
}

// ─── تحليل نقطة التعادل ──────────────────────────────────────────────────────

/**
 * حساب نقطة التعادل للمركز (عدد الجلسات المطلوبة لتغطية التكاليف)
 *
 * @param {object} costs - هيكل التكاليف
 * @param {number} costs.fixedCostsMonthly - التكاليف الثابتة الشهرية (إيجار، رواتب، إلخ)
 * @param {number} costs.variableCostPerSession - التكلفة المتغيرة لكل جلسة
 * @param {number} averageSessionRevenue - متوسط إيراد الجلسة
 * @returns {object} تحليل نقطة التعادل
 */
function calculateBreakevenPoint(costs, averageSessionRevenue) {
  if (!costs || typeof costs !== 'object') {
    throw new Error('بيانات التكاليف مطلوبة');
  }
  if (typeof averageSessionRevenue !== 'number' || averageSessionRevenue <= 0) {
    throw new Error('إيراد الجلسة يجب أن يكون رقماً موجباً');
  }

  const { fixedCostsMonthly, variableCostPerSession = 0 } = costs;

  if (typeof fixedCostsMonthly !== 'number' || fixedCostsMonthly < 0) {
    throw new Error('التكاليف الثابتة يجب أن تكون رقماً موجباً');
  }

  const contributionMargin = averageSessionRevenue - variableCostPerSession;

  if (contributionMargin <= 0) {
    throw new Error('هامش المساهمة يجب أن يكون موجباً (سعر الجلسة > التكلفة المتغيرة)');
  }

  const breakevenSessions = Math.ceil(fixedCostsMonthly / contributionMargin);
  const breakevenRevenue = breakevenSessions * averageSessionRevenue;
  const profitMarginAtBreakeven = 0;

  // عدد الجلسات لتحقيق الهامش الربحي المستهدف (30%)
  const targetProfitSessions = Math.ceil(
    fixedCostsMonthly / (contributionMargin * (1 - TARGET_PROFIT_MARGIN))
  );

  return {
    fixedCostsMonthly,
    variableCostPerSession,
    averageSessionRevenue,
    contributionMargin,
    breakevenSessions,
    breakevenRevenue,
    targetProfitSessions,
    targetProfitRevenue: Math.round(targetProfitSessions * averageSessionRevenue),
    profitMarginAtBreakeven,
  };
}

/**
 * حساب الهامش الربحي الفعلي
 *
 * @param {number} totalRevenue - إجمالي الإيراد
 * @param {number} totalCosts - إجمالي التكاليف
 * @returns {object}
 */
function calculateProfitMargin(totalRevenue, totalCosts) {
  if (typeof totalRevenue !== 'number' || totalRevenue < 0) {
    throw new Error('الإيراد يجب أن يكون رقماً موجباً');
  }
  if (typeof totalCosts !== 'number' || totalCosts < 0) {
    throw new Error('التكاليف يجب أن تكون رقماً موجبة');
  }

  const grossProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const isProfit = grossProfit >= 0;

  return {
    totalRevenue,
    totalCosts,
    grossProfit,
    profitMargin: Math.round(profitMargin * 100) / 100,
    isProfit,
    meetsTarget: profitMargin >= TARGET_PROFIT_MARGIN * 100,
  };
}

// ─── خصومات الباقات والتأمين ─────────────────────────────────────────────────

/**
 * حساب سعر الباقة (عدد الجلسات بخصم)
 *
 * @param {number} sessionPrice - سعر الجلسة المفردة
 * @param {number} sessionCount - عدد الجلسات في الباقة
 * @param {number} discountPercent - نسبة الخصم على الباقة
 * @returns {object}
 */
function calculatePackagePrice(sessionPrice, sessionCount, discountPercent) {
  if (typeof sessionPrice !== 'number' || sessionPrice <= 0) {
    throw new Error('سعر الجلسة يجب أن يكون رقماً موجباً');
  }
  if (typeof sessionCount !== 'number' || sessionCount < 2) {
    throw new Error('عدد الجلسات يجب أن يكون 2 أو أكثر');
  }
  if (
    typeof discountPercent !== 'number' ||
    discountPercent < 0 ||
    discountPercent > MAX_DISCOUNT_PERCENTAGE
  ) {
    throw new Error(`نسبة الخصم يجب أن تكون بين 0 و ${MAX_DISCOUNT_PERCENTAGE}%`);
  }

  const fullPrice = sessionPrice * sessionCount;
  const discountAmount = Math.round(fullPrice * (discountPercent / 100));
  const packagePrice = fullPrice - discountAmount;
  const pricePerSession = Math.round(packagePrice / sessionCount);
  const vatAmount = Math.round(packagePrice * VAT_RATE);
  const totalWithVat = packagePrice + vatAmount;

  return {
    sessionPrice,
    sessionCount,
    fullPrice,
    discountPercent,
    discountAmount,
    packagePrice,
    pricePerSession,
    savingsAmount: discountAmount,
    vatAmount,
    totalWithVat,
  };
}

/**
 * حساب سعر التأمين (نسبة تغطية)
 *
 * @param {number} sessionPrice - السعر الكامل للجلسة
 * @param {number} coveragePercent - نسبة التغطية التأمينية (0-100)
 * @param {number} [deductibleAmount] - مبلغ التحمل الثابت
 * @returns {object}
 */
function calculateInsurancePrice(sessionPrice, coveragePercent, deductibleAmount = 0) {
  if (typeof sessionPrice !== 'number' || sessionPrice <= 0) {
    throw new Error('سعر الجلسة يجب أن يكون رقماً موجباً');
  }
  if (typeof coveragePercent !== 'number' || coveragePercent < 0 || coveragePercent > 100) {
    throw new Error('نسبة التغطية يجب أن تكون بين 0 و 100');
  }
  if (typeof deductibleAmount !== 'number' || deductibleAmount < 0) {
    throw new Error('مبلغ التحمل يجب أن يكون رقماً موجباً');
  }

  const insuranceCoverage = Math.round(sessionPrice * (coveragePercent / 100));
  const patientShareBeforeDeductible = sessionPrice - insuranceCoverage;
  const patientShare = Math.min(sessionPrice, patientShareBeforeDeductible + deductibleAmount);
  const adjustedInsuranceCoverage = sessionPrice - patientShare;

  return {
    sessionPrice,
    coveragePercent,
    deductibleAmount,
    insuranceCoverage: adjustedInsuranceCoverage,
    patientShare,
    totalCovered: adjustedInsuranceCoverage,
    coverageRatio: Math.round((adjustedInsuranceCoverage / sessionPrice) * 100),
  };
}

// ─── مؤشرات الكفاءة المالية ──────────────────────────────────────────────────

/**
 * حساب الإيراد لكل معالج (Revenue per Therapist)
 *
 * @param {number} totalRevenue - إجمالي الإيراد
 * @param {number} therapistCount - عدد المعالجين
 * @returns {number}
 */
function calculateRevenuePerTherapist(totalRevenue, therapistCount) {
  if (typeof totalRevenue !== 'number' || totalRevenue < 0) {
    throw new Error('الإيراد يجب أن يكون رقماً موجباً');
  }
  if (typeof therapistCount !== 'number' || therapistCount <= 0) {
    throw new Error('عدد المعالجين يجب أن يكون رقماً موجباً');
  }
  return Math.round(totalRevenue / therapistCount);
}

/**
 * حساب الإيراد لكل مستفيد (Revenue per Beneficiary)
 *
 * @param {number} totalRevenue
 * @param {number} beneficiaryCount
 * @returns {number}
 */
function calculateRevenuePerBeneficiary(totalRevenue, beneficiaryCount) {
  if (typeof totalRevenue !== 'number' || totalRevenue < 0) {
    throw new Error('الإيراد يجب أن يكون رقماً موجباً');
  }
  if (typeof beneficiaryCount !== 'number' || beneficiaryCount <= 0) {
    throw new Error('عدد المستفيدين يجب أن يكون رقماً موجباً');
  }
  return Math.round(totalRevenue / beneficiaryCount);
}

/**
 * حساب معدل استغلال الطاقة (Capacity Utilization Rate)
 *
 * @param {number} actualSessions - الجلسات الفعلية
 * @param {number} maxCapacitySessions - الطاقة الاستيعابية القصوى
 * @returns {number} نسبة الاستغلال (0-100)
 */
function calculateCapacityUtilization(actualSessions, maxCapacitySessions) {
  if (typeof actualSessions !== 'number' || actualSessions < 0) {
    throw new Error('الجلسات الفعلية يجب أن تكون رقماً موجباً');
  }
  if (typeof maxCapacitySessions !== 'number' || maxCapacitySessions <= 0) {
    throw new Error('الطاقة القصوى يجب أن تكون رقماً موجباً');
  }
  if (actualSessions > maxCapacitySessions) {
    throw new Error('الجلسات الفعلية لا يمكن أن تتجاوز الطاقة القصوى');
  }
  return Math.round((actualSessions / maxCapacitySessions) * 100);
}

/**
 * مقارنة أداء الفروع مالياً
 *
 * @param {Array<object>} branchesFinancials - البيانات المالية للفروع
 * @returns {Array<object>} الفروع مرتبة حسب الأداء المالي
 */
function rankBranchesByFinancialPerformance(branchesFinancials) {
  if (!Array.isArray(branchesFinancials)) {
    throw new Error('البيانات المالية للفروع يجب أن تكون مصفوفة');
  }
  if (branchesFinancials.length === 0) return [];

  return branchesFinancials
    .map(branch => {
      const profitMarginData = calculateProfitMargin(branch.revenue, branch.costs);
      const revenuePerTherapist =
        branch.therapistCount > 0
          ? calculateRevenuePerTherapist(branch.revenue, branch.therapistCount)
          : 0;

      return {
        ...branch,
        profitMargin: profitMarginData.profitMargin,
        grossProfit: profitMarginData.grossProfit,
        revenuePerTherapist,
        isProfit: profitMarginData.isProfit,
      };
    })
    .sort((a, b) => b.profitMargin - a.profitMargin)
    .map((branch, index) => ({ ...branch, rank: index + 1 }));
}

// ─── الصادرات ─────────────────────────────────────────────────────────────────

module.exports = {
  // التسعير الأساسي
  calculateBaseSessionPrice,
  applySessionTypeMultiplier,
  calculateSessionPrice,

  // الإيراد المتوقع
  calculateTherapistMonthlyRevenue,
  calculateAnnualRevenueProjection,

  // نقطة التعادل
  calculateBreakevenPoint,
  calculateProfitMargin,

  // الخصومات والباقات
  calculatePackagePrice,
  calculateInsurancePrice,

  // مؤشرات الكفاءة
  calculateRevenuePerTherapist,
  calculateRevenuePerBeneficiary,
  calculateCapacityUtilization,
  rankBranchesByFinancialPerformance,

  // الثوابت
  VAT_RATE,
  MAX_DISCOUNT_PERCENTAGE,
  TARGET_PROFIT_MARGIN,
  MIN_DAILY_REVENUE_PER_THERAPIST,
  SESSION_TYPES,
  SPECIALIZATIONS,
  SESSION_TYPE_MULTIPLIERS,
};

/**
 * Saudi Labor Law Calculations Service
 * خدمة حسابات نظام العمل السعودي
 *
 * يغطي:
 * - GOSI (التأمينات الاجتماعية)
 * - SANED (التأمين ضد التعطل)
 * - مكافأة نهاية الخدمة (End of Service)
 * - حسابات الرواتب
 * - حسابات الإجازات
 * - استقطاعات التأخير
 */

'use strict';

// ========== ثوابت نظام العمل ==========

/** نسب GOSI للسعوديين */
const GOSI_SAUDI_EMPLOYEE_RATE = 0.09; // 9% حصة الموظف
const GOSI_SAUDI_EMPLOYER_RATE = 0.09; // 9% حصة صاحب العمل
const GOSI_OCCUPATIONAL_HAZARD_RATE = 0.02; // 2% أخطار مهنية (صاحب العمل فقط)

/** نسب GOSI لغير السعوديين */
const GOSI_NON_SAUDI_EMPLOYEE_RATE = 0; // 0% موظف
const GOSI_NON_SAUDI_EMPLOYER_RATE = 0.02; // 2% أخطار مهنية فقط

/** نسبة SANED (التأمين ضد التعطل) - سعوديون فقط */
const SANED_EMPLOYEE_RATE = 0.0075; // 0.75%
const SANED_EMPLOYER_RATE = 0.0075; // 0.75%

/** سقف وعاء GOSI */
const GOSI_MAX_BASE = 45000; // 45,000 ريال

/** أيام الشهر للحساب */
const WORKING_DAYS_PER_MONTH = 30;

/** الحد الأدنى للراتب */
const MINIMUM_WAGE_SAUDI = 4000; // ريال

/** أيام الإجازة السنوية */
const ANNUAL_LEAVE_LESS_THAN_5_YEARS = 21;
const ANNUAL_LEAVE_5_YEARS_OR_MORE = 30;

/** سنوات الخدمة للتمييز بين استحقاقات الإجازة */
const ANNUAL_LEAVE_THRESHOLD_YEARS = 5;

/** أقصى ساعات إضافية سنوياً */
const MAX_OVERTIME_HOURS_ANNUAL = 720;

/** معدل الإضافي */
const OVERTIME_RATE_MULTIPLIER = 1.5;

// ========== معاملات الاستقالة (مكافأة نهاية الخدمة) ==========
const EOS_RESIGNATION_FACTORS = {
  LESS_THAN_2_YEARS: 0, // أقل من سنتين: لا شيء
  TWO_TO_FIVE_YEARS: 1 / 3, // 2 إلى 5 سنوات: ثلث المكافأة
  FIVE_TO_TEN_YEARS: 2 / 3, // 5 إلى 10 سنوات: ثلثا المكافأة
  TEN_YEARS_OR_MORE: 1, // 10 سنوات فأكثر: المكافأة كاملة
};

const EOS_TERMINATION_FACTOR = 1; // إنهاء/انتهاء عقد/تقاعد = كامل

/** أنواع إنهاء الخدمة */
const TERMINATION_TYPES = {
  RESIGNATION: 'resignation',
  TERMINATION: 'termination',
  END_OF_CONTRACT: 'end_of_contract',
  RETIREMENT: 'retirement',
};

/** أنواع الإجازات */
const LEAVE_TYPES = {
  ANNUAL: 'annual',
  SICK: 'sick',
  MATERNITY: 'maternity',
  PATERNITY: 'paternity',
  HAJJ: 'hajj',
  MARRIAGE: 'marriage',
  BEREAVEMENT: 'bereavement',
  UNPAID: 'unpaid',
  EMERGENCY: 'emergency',
};

/** حدود الإجازات بالأيام */
const LEAVE_ENTITLEMENTS = {
  sick_full_pay: 30, // مرضية بكامل الراتب
  sick_three_quarters: 60, // مرضية بثلاثة أرباع الراتب
  sick_unpaid: 30, // مرضية بدون راتب
  maternity: 70, // أمومة (10 أسابيع)
  paternity: 3, // أبوة
  hajj: 15, // حج (لمرة واحدة)
  marriage: 5, // زواج
  bereavement_immediate: 5, // وفاة زوج/أصول/فروع
  bereavement_other: 3, // وفاة أقارب آخرين
};

// ========== دوال GOSI ==========

/**
 * حساب وعاء GOSI (الراتب الأساسي + بدل السكن)
 * بحد أقصى 45,000 ريال
 */
function calculateGOSIBase(basicSalary, housingAllowance) {
  if (basicSalary < 0) throw new Error('الراتب الأساسي لا يمكن أن يكون سالباً');
  if (housingAllowance < 0) throw new Error('بدل السكن لا يمكن أن يكون سالباً');
  return Math.min(basicSalary + housingAllowance, GOSI_MAX_BASE);
}

/**
 * حساب اشتراكات GOSI الشهرية
 * @param {number} basicSalary - الراتب الأساسي
 * @param {number} housingAllowance - بدل السكن
 * @param {boolean} isSaudi - هل الموظف سعودي؟
 * @returns {object} تفاصيل اشتراكات GOSI
 */
function calculateGOSI(basicSalary, housingAllowance, isSaudi) {
  const gosiBase = calculateGOSIBase(basicSalary, housingAllowance);

  if (isSaudi) {
    const employeeShare = Math.round(gosiBase * GOSI_SAUDI_EMPLOYEE_RATE * 100) / 100;
    const employerPension = Math.round(gosiBase * GOSI_SAUDI_EMPLOYER_RATE * 100) / 100;
    const occupationalHazard = Math.round(gosiBase * GOSI_OCCUPATIONAL_HAZARD_RATE * 100) / 100;
    const employerTotal = Math.round((employerPension + occupationalHazard) * 100) / 100;

    return {
      gosiBase,
      employeeShare,
      employerPension,
      occupationalHazard,
      employerTotal,
      totalContribution: Math.round((employeeShare + employerTotal) * 100) / 100,
      isSaudi: true,
    };
  } else {
    // غير سعودي: أخطار مهنية فقط على صاحب العمل
    const occupationalHazard = Math.round(gosiBase * GOSI_NON_SAUDI_EMPLOYER_RATE * 100) / 100;
    return {
      gosiBase,
      employeeShare: 0,
      employerPension: 0,
      occupationalHazard,
      employerTotal: occupationalHazard,
      totalContribution: occupationalHazard,
      isSaudi: false,
    };
  }
}

/**
 * حساب اشتراكات SANED (التأمين ضد التعطل) - للسعوديين فقط
 */
function calculateSANED(basicSalary, housingAllowance, isSaudi) {
  if (!isSaudi) {
    return { employeeShare: 0, employerShare: 0, totalContribution: 0, applicable: false };
  }
  const gosiBase = calculateGOSIBase(basicSalary, housingAllowance);
  const employeeShare = Math.round(gosiBase * SANED_EMPLOYEE_RATE * 100) / 100;
  const employerShare = Math.round(gosiBase * SANED_EMPLOYER_RATE * 100) / 100;
  return {
    employeeShare,
    employerShare,
    totalContribution: Math.round((employeeShare + employerShare) * 100) / 100,
    applicable: true,
  };
}

// ========== مكافأة نهاية الخدمة ==========

/**
 * حساب مدة الخدمة بالتفصيل
 * @param {Date|string} hireDate - تاريخ التعيين
 * @param {Date|string} endDate - تاريخ إنهاء الخدمة
 * @returns {object} مدة الخدمة
 */
function calculateServiceDuration(hireDate, endDate) {
  const start = new Date(hireDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) throw new Error('تاريخ التعيين غير صحيح');
  if (isNaN(end.getTime())) throw new Error('تاريخ إنهاء الخدمة غير صحيح');
  if (end < start) throw new Error('تاريخ إنهاء الخدمة قبل تاريخ التعيين');

  const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  const yearsDecimal = totalDays / 365.25;

  // سنوات وأشهر وأيام
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    days += 30;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days, totalDays, yearsDecimal };
}

/**
 * حساب معامل مكافأة نهاية الخدمة حسب نوع الإنهاء ومدة الخدمة
 */
function getEOSFactor(terminationType, yearsDecimal) {
  if (terminationType === TERMINATION_TYPES.RESIGNATION) {
    if (yearsDecimal < 2) return EOS_RESIGNATION_FACTORS.LESS_THAN_2_YEARS;
    if (yearsDecimal < 5) return EOS_RESIGNATION_FACTORS.TWO_TO_FIVE_YEARS;
    if (yearsDecimal < 10) return EOS_RESIGNATION_FACTORS.FIVE_TO_TEN_YEARS;
    return EOS_RESIGNATION_FACTORS.TEN_YEARS_OR_MORE;
  }
  // إنهاء / انتهاء عقد / تقاعد
  return EOS_TERMINATION_FACTOR;
}

/**
 * حساب مكافأة نهاية الخدمة وفق نظام العمل السعودي
 * المادة 84-88:
 * - أول 5 سنوات: نصف شهر عن كل سنة
 * - ما بعد 5 سنوات: شهر كامل عن كل سنة
 * - الاستقالة: نسب متدرجة (0% / 33% / 67% / 100%)
 *
 * @param {object} params
 * @param {number} params.basicSalary
 * @param {number} params.housingAllowance
 * @param {number} params.transportAllowance
 * @param {Date|string} params.hireDate
 * @param {Date|string} params.terminationDate
 * @param {string} params.terminationType
 * @param {number} [params.leaveBalanceDays=0]
 * @returns {object} تفاصيل حساب مكافأة نهاية الخدمة
 */
function calculateEndOfService(params) {
  const {
    basicSalary,
    housingAllowance = 0,
    transportAllowance = 0,
    hireDate,
    terminationDate,
    terminationType,
    leaveBalanceDays = 0,
  } = params;

  if (!Object.values(TERMINATION_TYPES).includes(terminationType)) {
    throw new Error(`نوع إنهاء الخدمة غير صالح: ${terminationType}`);
  }
  if (basicSalary <= 0) throw new Error('الراتب الأساسي يجب أن يكون أكبر من صفر');

  const duration = calculateServiceDuration(hireDate, terminationDate);
  const { yearsDecimal, years, months, days } = duration;

  // آخر راتب = أساسي + سكن + نقل (المادة 88)
  const lastSalary = basicSalary + housingAllowance + transportAllowance;
  const dailyRate = lastSalary / WORKING_DAYS_PER_MONTH;

  // حساب أول 5 سنوات: نصف شهر عن كل سنة
  const firstFiveYears = Math.min(yearsDecimal, 5);
  const firstFiveAmount = (lastSalary / 2) * firstFiveYears;

  // ما بعد 5 سنوات: شهر كامل عن كل سنة
  const remainingYears = Math.max(yearsDecimal - 5, 0);
  const remainingAmount = lastSalary * remainingYears;

  const totalEOSBeforeFactor = firstFiveAmount + remainingAmount;

  // تطبيق معامل نوع الإنهاء
  const factor = getEOSFactor(terminationType, yearsDecimal);
  const finalEOSAmount = Math.round(totalEOSBeforeFactor * factor * 100) / 100;

  // بدل الإجازات المستحقة
  const leaveSettlement = Math.round(leaveBalanceDays * dailyRate * 100) / 100;

  const totalSettlement = Math.round((finalEOSAmount + leaveSettlement) * 100) / 100;

  return {
    // مدة الخدمة
    serviceYears: years,
    serviceMonths: months,
    serviceDays: days,
    totalServiceYearsDecimal: Math.round(yearsDecimal * 10000) / 10000,

    // الراتب الأساس
    lastSalary,
    dailyRate: Math.round(dailyRate * 100) / 100,

    // تفاصيل المكافأة
    firstFiveYearsAmount: Math.round(firstFiveAmount * 100) / 100,
    remainingYearsAmount: Math.round(remainingAmount * 100) / 100,
    totalEOSBeforeFactor: Math.round(totalEOSBeforeFactor * 100) / 100,

    // المعامل والمكافأة النهائية
    terminationFactor: factor,
    terminationType,
    finalEOSAmount,

    // التسويات الأخرى
    leaveBalanceDays,
    leaveSettlement,
    totalSettlement,
  };
}

// ========== حسابات الراتب ==========

/**
 * حساب معدل اليوم والساعة
 */
function calculateDailyAndHourlyRate(monthlySalary, hoursPerDay = 8) {
  if (monthlySalary <= 0) throw new Error('الراتب لا يمكن أن يكون صفراً أو أقل');
  const dailyRate = monthlySalary / WORKING_DAYS_PER_MONTH;
  const hourlyRate = dailyRate / hoursPerDay;
  return {
    dailyRate: Math.round(dailyRate * 100) / 100,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
  };
}

/**
 * حساب مبلغ العمل الإضافي
 * المادة 107: الأجر العادي + 50%
 */
function calculateOvertimePay(basicSalary, housingAllowance, overtimeHours, hoursPerDay = 8) {
  if (overtimeHours < 0) throw new Error('ساعات الإضافي لا يمكن أن تكون سالبة');
  const overtimeSalaryBase = basicSalary + housingAllowance;
  const dailyRate = overtimeSalaryBase / WORKING_DAYS_PER_MONTH;
  const hourlyRate = dailyRate / hoursPerDay;
  const overtimeHourlyRate = hourlyRate * OVERTIME_RATE_MULTIPLIER;
  const overtimeAmount = Math.round(overtimeHours * overtimeHourlyRate * 100) / 100;
  return {
    overtimeHourlyRate: Math.round(overtimeHourlyRate * 100) / 100,
    overtimeHours,
    overtimeAmount,
  };
}

/**
 * حساب استقطاع الغياب
 */
function calculateAbsenceDeduction(totalMonthlySalary, absenceDays) {
  if (absenceDays < 0) throw new Error('أيام الغياب لا يمكن أن تكون سالبة');
  const dailyRate = totalMonthlySalary / WORKING_DAYS_PER_MONTH;
  const deductionAmount = Math.round(absenceDays * dailyRate * 100) / 100;
  return { dailyRate: Math.round(dailyRate * 100) / 100, absenceDays, deductionAmount };
}

/**
 * حساب استقطاعات التأخير التراكمية (المادة 80)
 * - التأخير 1: إنذار (لا خصم)
 * - التأخير 2-3: خصم 5% من أجر اليوم
 * - التأخير 4-6: خصم 10%
 * - التأخير 7-9: خصم 15%
 * - أكثر من 9: خصم 25%
 */
function calculateLateDeductions(basicSalary, housingAllowance, lateOccurrencesCount) {
  if (lateOccurrencesCount < 0) throw new Error('عدد مرات التأخير لا يمكن أن يكون سالباً');

  const salaryBase = basicSalary + housingAllowance;
  const dailyRate = salaryBase / WORKING_DAYS_PER_MONTH;

  let totalDeduction = 0;
  const breakdown = [];

  for (let occurrence = 1; occurrence <= lateOccurrencesCount; occurrence++) {
    let rate = 0;
    let action = 'warning';

    if (occurrence === 1) {
      rate = 0;
      action = 'verbal_warning';
    } else if (occurrence <= 3) {
      rate = 0.05;
      action = 'deduct_5_percent';
    } else if (occurrence <= 6) {
      rate = 0.1;
      action = 'deduct_10_percent';
    } else if (occurrence <= 9) {
      rate = 0.15;
      action = 'deduct_15_percent';
    } else {
      rate = 0.25;
      action = 'deduct_25_percent';
    }

    const amount = Math.round(dailyRate * rate * 100) / 100;
    totalDeduction += amount;
    breakdown.push({ occurrence, rate, amount, action });
  }

  return {
    dailyRate: Math.round(dailyRate * 100) / 100,
    lateOccurrencesCount,
    breakdown,
    totalDeduction: Math.round(totalDeduction * 100) / 100,
  };
}

/**
 * حساب الراتب الشهري الصافي الكامل
 */
function calculateNetSalary(params) {
  const {
    basicSalary,
    housingAllowance = 0,
    transportAllowance = 0,
    otherAllowances = 0,
    overtimeAmount = 0,
    absenceDeduction = 0,
    lateDeduction = 0,
    advanceDeduction = 0,
    loanDeduction = 0,
    otherDeductions = 0,
    isSaudi = true,
  } = params;

  const gosi = calculateGOSI(basicSalary, housingAllowance, isSaudi);
  const saned = calculateSANED(basicSalary, housingAllowance, isSaudi);

  const totalEarnings =
    basicSalary + housingAllowance + transportAllowance + otherAllowances + overtimeAmount;

  const totalDeductions =
    absenceDeduction +
    lateDeduction +
    advanceDeduction +
    loanDeduction +
    otherDeductions +
    gosi.employeeShare +
    saned.employeeShare;

  const netSalary = Math.round((totalEarnings - totalDeductions) * 100) / 100;

  return {
    basicSalary,
    housingAllowance,
    transportAllowance,
    otherAllowances,
    overtimeAmount,
    totalEarnings: Math.round(totalEarnings * 100) / 100,

    absenceDeduction,
    lateDeduction,
    advanceDeduction,
    loanDeduction,
    otherDeductions,
    gosiEmployeeShare: gosi.employeeShare,
    sanedEmployeeShare: saned.employeeShare,
    totalDeductions: Math.round(totalDeductions * 100) / 100,

    netSalary,

    // حصص صاحب العمل (لا تُخصم من الراتب)
    gosiEmployerTotal: gosi.employerTotal,
    sanedEmployerShare: saned.employerShare,
  };
}

// ========== حسابات الإجازات ==========

/**
 * حساب استحقاق الإجازة السنوية
 * المادة 109: 21 يوم لأقل من 5 سنوات، 30 يوم لأكثر
 */
function calculateAnnualLeaveEntitlement(serviceYears) {
  if (serviceYears < 0) throw new Error('سنوات الخدمة لا يمكن أن تكون سالبة');
  return serviceYears >= ANNUAL_LEAVE_THRESHOLD_YEARS
    ? ANNUAL_LEAVE_5_YEARS_OR_MORE
    : ANNUAL_LEAVE_LESS_THAN_5_YEARS;
}

/**
 * حساب بدل الإجازة عند التسوية
 */
function calculateLeaveSettlement(monthlySalary, remainingLeaveDays) {
  if (monthlySalary <= 0) throw new Error('الراتب لا يمكن أن يكون صفراً أو أقل');
  if (remainingLeaveDays < 0) throw new Error('أيام الإجازة المتبقية لا يمكن أن تكون سالبة');
  const dailyRate = monthlySalary / WORKING_DAYS_PER_MONTH;
  const settlementAmount = Math.round(remainingLeaveDays * dailyRate * 100) / 100;
  return {
    dailyRate: Math.round(dailyRate * 100) / 100,
    remainingLeaveDays,
    settlementAmount,
  };
}

/**
 * التحقق من صحة طلب إجازة الحج
 */
function validateHajjLeave(serviceYears, hasUsedHajjBefore) {
  const errors = [];
  if (hasUsedHajjBefore) errors.push('إجازة الحج لمرة واحدة فقط خلال فترة الخدمة');
  if (serviceYears < 2) errors.push('إجازة الحج تستحق بعد سنتين من الخدمة');
  return { valid: errors.length === 0, errors };
}

/**
 * حساب راتب الإجازة المرضية
 * 30 يوم بكامل الراتب + 60 يوم بـ 75% + 30 يوم بدون راتب
 */
function calculateSickLeavePayment(monthlySalary, sickDays, totalUsedSickDaysThisYear) {
  if (sickDays <= 0) throw new Error('أيام الإجازة المرضية يجب أن تكون أكبر من صفر');
  const dailyRate = monthlySalary / WORKING_DAYS_PER_MONTH;

  let fullPayDays = 0;
  let threeQuartersDays = 0;
  let unpaidDays = 0;

  const startDay = totalUsedSickDaysThisYear;
  for (let d = 0; d < sickDays; d++) {
    const currentDay = startDay + d + 1;
    if (currentDay <= 30) fullPayDays++;
    else if (currentDay <= 90) threeQuartersDays++;
    else if (currentDay <= 120) unpaidDays++;
    // ما زاد عن 120 يوم: غير مدفوع
  }

  const payment =
    Math.round((fullPayDays * dailyRate + threeQuartersDays * dailyRate * 0.75) * 100) / 100;

  return {
    fullPayDays,
    threeQuartersDays,
    unpaidDays,
    totalSickDays: sickDays,
    dailyRate: Math.round(dailyRate * 100) / 100,
    payment,
  };
}

// ========== Exports ==========

module.exports = {
  // الثوابت
  GOSI_SAUDI_EMPLOYEE_RATE,
  GOSI_SAUDI_EMPLOYER_RATE,
  GOSI_OCCUPATIONAL_HAZARD_RATE,
  GOSI_NON_SAUDI_EMPLOYEE_RATE,
  GOSI_NON_SAUDI_EMPLOYER_RATE,
  GOSI_MAX_BASE,
  SANED_EMPLOYEE_RATE,
  SANED_EMPLOYER_RATE,
  WORKING_DAYS_PER_MONTH,
  MINIMUM_WAGE_SAUDI,
  ANNUAL_LEAVE_LESS_THAN_5_YEARS,
  ANNUAL_LEAVE_5_YEARS_OR_MORE,
  ANNUAL_LEAVE_THRESHOLD_YEARS,
  MAX_OVERTIME_HOURS_ANNUAL,
  OVERTIME_RATE_MULTIPLIER,
  EOS_RESIGNATION_FACTORS,
  EOS_TERMINATION_FACTOR,
  TERMINATION_TYPES,
  LEAVE_TYPES,
  LEAVE_ENTITLEMENTS,

  // الدوال
  calculateGOSIBase,
  calculateGOSI,
  calculateSANED,
  calculateServiceDuration,
  getEOSFactor,
  calculateEndOfService,
  calculateDailyAndHourlyRate,
  calculateOvertimePay,
  calculateAbsenceDeduction,
  calculateLateDeductions,
  calculateNetSalary,
  calculateAnnualLeaveEntitlement,
  calculateLeaveSettlement,
  validateHajjLeave,
  calculateSickLeavePayment,
};

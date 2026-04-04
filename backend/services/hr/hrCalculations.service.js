/**
 * HR Calculations Service
 * خدمة حسابات الموارد البشرية
 * الرواتب + مكافأة نهاية الخدمة + الإجازات + GOSI/SANED
 * وفق نظام العمل السعودي
 * Pure Business Logic - No DB, No Side Effects
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 */

'use strict';

// ========================================
// CONSTANTS
// ========================================
const HR_CONSTANTS = {
  GOSI: {
    SAUDI_EMPLOYEE_RATE: 0.09, // 9% تقاعد - حصة الموظف السعودي
    SAUDI_EMPLOYER_RATE: 0.09, // 9% تقاعد - حصة صاحب العمل
    OCCUPATIONAL_HAZARD_RATE: 0.02, // 2% أخطار مهنية - صاحب العمل فقط
    NON_SAUDI_EMPLOYER_RATE: 0.02, // 2% أخطار مهنية فقط لغير السعوديين
    MAX_CONTRIBUTION_BASE: 45000, // سقف وعاء الاشتراك 45,000 ريال
  },
  SANED: {
    EMPLOYEE_RATE: 0.0075, // 0.75% - سعودي فقط
    EMPLOYER_RATE: 0.0075, // 0.75% - سعودي فقط
  },
  LEAVE: {
    ANNUAL_LESS_5_YEARS: 21, // أيام سنوية لأقل من 5 سنوات خدمة
    ANNUAL_MORE_5_YEARS: 30, // أيام سنوية لأكثر من 5 سنوات خدمة
    SICK_FULL_PAY: 30, // إجازة مرضية بكامل الراتب
    SICK_THREE_QUARTERS: 60, // إجازة مرضية بثلاثة أرباع الراتب
    SICK_NO_PAY: 30, // إجازة مرضية بدون راتب
    SICK_MAX: 120, // الحد الأقصى للإجازة المرضية
    MATERNITY: 70, // إجازة الأمومة (10 أسابيع)
    PATERNITY: 3, // إجازة الأبوة
    BEREAVEMENT: 5, // وفاة زوج أو أصول/فروع
    MARRIAGE: 5, // إجازة الزواج
    HAJJ_MIN: 10, // إجازة الحج - حد أدنى
    HAJJ_MAX: 15, // إجازة الحج - حد أقصى
    MAX_CARRY_OVER_FACTOR: 0.5, // الترحيل بحد أقصى نصف الاستحقاق
  },
  WORKING_DAYS_PER_MONTH: 30,
  WORKING_HOURS_PER_WEEK: 48,
  OVERTIME_MULTIPLIER: 1.5, // المادة 107: الأجر العادي + 50%
  MAX_OVERTIME_ANNUAL_HOURS: 720, // المادة 107: حد أقصى 720 ساعة سنوياً
  PROBATION_DAYS: 90, // فترة التجربة 90 يوم
  NOTICE_PERIOD_DAYS_DEFAULT: 60, // مهلة الإشعار
  MIN_WAGE_SAUDI: 4000, // الحد الأدنى للأجور السعوديين
  LATE_DEDUCTION_TIERS: [
    // المادة 80 - استقطاعات التأخير التراكمية
    { occurrenceMin: 1, occurrenceMax: 1, rate: 0 }, // إنذار فقط
    { occurrenceMin: 2, occurrenceMax: 3, rate: 0.05 }, // 5% من أجر اليوم
    { occurrenceMin: 4, occurrenceMax: 6, rate: 0.1 }, // 10%
    { occurrenceMin: 7, occurrenceMax: 9, rate: 0.15 }, // 15%
    { occurrenceMin: 10, occurrenceMax: Infinity, rate: 0.25 }, // 25%
  ],
  EOS_RESIGNATION_FACTORS: [
    { minYears: 0, maxYears: 2, factor: 0 }, // أقل من سنتين: لا شيء
    { minYears: 2, maxYears: 5, factor: 1 / 3 }, // 2-5 سنوات: ثلث
    { minYears: 5, maxYears: 10, factor: 2 / 3 }, // 5-10 سنوات: ثلثان
    { minYears: 10, maxYears: Infinity, factor: 1 }, // 10+ سنوات: كامل
  ],
};

// ========================================
// SALARY CALCULATIONS
// ========================================

/**
 * حساب إجمالي الراتب (أساسي + بدلات)
 * @param {object} salary - {basicSalary, housingAllowance, transportAllowance, otherAllowances}
 * @returns {object}
 */
function calculateTotalSalary(salary) {
  if (!salary || typeof salary.basicSalary !== 'number') {
    return { isValid: false, totalSalary: 0 };
  }

  const basic = salary.basicSalary || 0;
  const housing = salary.housingAllowance || 0;
  const transport = salary.transportAllowance || 0;
  const others = Array.isArray(salary.otherAllowances)
    ? salary.otherAllowances.reduce((sum, a) => sum + (a.amount || 0), 0)
    : 0;

  const totalSalary = basic + housing + transport + others;

  return {
    isValid: true,
    basicSalary: basic,
    housingAllowance: housing,
    transportAllowance: transport,
    otherAllowances: others,
    totalSalary,
    dailyRate: Math.round((totalSalary / HR_CONSTANTS.WORKING_DAYS_PER_MONTH) * 100) / 100,
    hourlyRate:
      Math.round(((basic + housing) / HR_CONSTANTS.WORKING_DAYS_PER_MONTH / 8) * 100) / 100,
  };
}

/**
 * حساب اشتراكات GOSI وساند
 * @param {number} salaryBase - وعاء الاشتراك (أساسي + سكن)
 * @param {boolean} isSaudi - هل الموظف سعودي؟
 * @returns {object}
 */
function calculateGOSI(salaryBase, isSaudi) {
  if (typeof salaryBase !== 'number' || salaryBase < 0) {
    return { isValid: false };
  }

  // تطبيق السقف الأقصى
  const base = Math.min(salaryBase, HR_CONSTANTS.GOSI.MAX_CONTRIBUTION_BASE);

  if (isSaudi) {
    const employeeGOSI = Math.round(base * HR_CONSTANTS.GOSI.SAUDI_EMPLOYEE_RATE * 100) / 100;
    const employerGOSI = Math.round(base * HR_CONSTANTS.GOSI.SAUDI_EMPLOYER_RATE * 100) / 100;
    const occupationalHazard =
      Math.round(base * HR_CONSTANTS.GOSI.OCCUPATIONAL_HAZARD_RATE * 100) / 100;
    const employeeSaned = Math.round(base * HR_CONSTANTS.SANED.EMPLOYEE_RATE * 100) / 100;
    const employerSaned = Math.round(base * HR_CONSTANTS.SANED.EMPLOYER_RATE * 100) / 100;

    return {
      isValid: true,
      isSaudi: true,
      contributionBase: base,
      employeeDeduction: employeeGOSI + employeeSaned,
      gosiEmployee: employeeGOSI,
      sanedEmployee: employeeSaned,
      employerCost: employerGOSI + occupationalHazard + employerSaned,
      gosiEmployer: employerGOSI,
      occupationalHazard,
      sanedEmployer: employerSaned,
      totalEmployeeRate: HR_CONSTANTS.GOSI.SAUDI_EMPLOYEE_RATE + HR_CONSTANTS.SANED.EMPLOYEE_RATE,
      totalEmployerRate:
        HR_CONSTANTS.GOSI.SAUDI_EMPLOYER_RATE +
        HR_CONSTANTS.GOSI.OCCUPATIONAL_HAZARD_RATE +
        HR_CONSTANTS.SANED.EMPLOYER_RATE,
    };
  } else {
    // غير سعودي: أخطار مهنية فقط على صاحب العمل
    const occupationalHazard =
      Math.round(base * HR_CONSTANTS.GOSI.NON_SAUDI_EMPLOYER_RATE * 100) / 100;
    return {
      isValid: true,
      isSaudi: false,
      contributionBase: base,
      employeeDeduction: 0,
      gosiEmployee: 0,
      sanedEmployee: 0,
      employerCost: occupationalHazard,
      occupationalHazard,
      gosiEmployer: 0,
      sanedEmployer: 0,
      totalEmployeeRate: 0,
      totalEmployerRate: HR_CONSTANTS.GOSI.NON_SAUDI_EMPLOYER_RATE,
    };
  }
}

/**
 * حساب استقطاعات التأخير التراكمية (المادة 80)
 * @param {number} lateDaysCount - عدد مرات التأخير في الشهر
 * @param {number} dailyRate - أجر اليوم
 * @returns {object}
 */
function calculateLateDeductions(lateDaysCount, dailyRate) {
  if (!lateDaysCount || lateDaysCount <= 0 || !dailyRate) {
    return { totalDeduction: 0, breakdown: [] };
  }

  let totalDeduction = 0;
  const breakdown = [];

  for (let i = 1; i <= lateDaysCount; i++) {
    const tier = HR_CONSTANTS.LATE_DEDUCTION_TIERS.find(
      t => i >= t.occurrenceMin && i <= t.occurrenceMax
    );
    const rate = tier ? tier.rate : 0.25;
    const deduction = Math.round(dailyRate * rate * 100) / 100;
    totalDeduction += deduction;
    breakdown.push({
      occurrence: i,
      rate,
      deduction,
      note: rate === 0 ? 'إنذار شفهي' : `خصم ${rate * 100}% من أجر اليوم`,
    });
  }

  return {
    totalDeduction: Math.round(totalDeduction * 100) / 100,
    lateDaysCount,
    breakdown,
  };
}

/**
 * حساب أجر العمل الإضافي (المادة 107)
 * @param {number} overtimeHours - ساعات العمل الإضافي
 * @param {number} hourlyRate - أجر الساعة العادي
 * @param {number} yearlyOvertimeUsed - الساعات الإضافية المستخدمة في السنة
 * @returns {object}
 */
function calculateOvertimePay(overtimeHours, hourlyRate, yearlyOvertimeUsed = 0) {
  if (!overtimeHours || overtimeHours <= 0 || !hourlyRate) {
    return { overtimeAmount: 0, hours: 0, exceedsAnnualLimit: false };
  }

  const remainingAllowed = HR_CONSTANTS.MAX_OVERTIME_ANNUAL_HOURS - yearlyOvertimeUsed;
  const effectiveHours = Math.min(overtimeHours, Math.max(0, remainingAllowed));
  const exceedsLimit = overtimeHours > remainingAllowed;

  const overtimeAmount =
    Math.round(effectiveHours * hourlyRate * HR_CONSTANTS.OVERTIME_MULTIPLIER * 100) / 100;

  return {
    overtimeHours: effectiveHours,
    requestedHours: overtimeHours,
    overtimeAmount,
    hourlyOvertimeRate: Math.round(hourlyRate * HR_CONSTANTS.OVERTIME_MULTIPLIER * 100) / 100,
    exceedsAnnualLimit: exceedsLimit,
    yearlyUsedAfter: yearlyOvertimeUsed + effectiveHours,
    annualLimit: HR_CONSTANTS.MAX_OVERTIME_ANNUAL_HOURS,
  };
}

/**
 * حساب استقطاعات الغياب
 * @param {number} absenceDays - أيام الغياب غير المبررة
 * @param {number} dailyRate - أجر اليوم
 * @returns {object}
 */
function calculateAbsenceDeductions(absenceDays, dailyRate) {
  if (!absenceDays || absenceDays <= 0 || !dailyRate) {
    return { deductionAmount: 0, absenceDays: 0 };
  }
  const deductionAmount = Math.round(absenceDays * dailyRate * 100) / 100;
  return { deductionAmount, absenceDays, dailyRate };
}

/**
 * حساب الراتب الشهري الصافي الكامل
 * @param {object} employee - بيانات الموظف
 * @param {object} monthData - بيانات الشهر {absenceDays, lateDays, overtimeHours, advanceDeduction, loanDeduction}
 * @returns {object}
 */
function calculateMonthlyPayroll(employee, monthData = {}) {
  if (!employee || !employee.basicSalary) {
    return { isValid: false, message: 'بيانات الموظف غير كاملة' };
  }

  const salaryInfo = calculateTotalSalary(employee);
  if (!salaryInfo.isValid) return { isValid: false };

  // وعاء GOSI = أساسي + سكن
  const gosiBase = (employee.basicSalary || 0) + (employee.housingAllowance || 0);
  const gosiInfo = calculateGOSI(gosiBase, employee.isSaudi !== false);

  // العمل الإضافي
  const overtimeInfo = calculateOvertimePay(
    monthData.overtimeHours || 0,
    salaryInfo.hourlyRate,
    monthData.yearlyOvertimeUsed || 0
  );

  // الغياب
  const absenceInfo = calculateAbsenceDeductions(monthData.absenceDays || 0, salaryInfo.dailyRate);

  // التأخير
  const lateInfo = calculateLateDeductions(monthData.lateDays || 0, salaryInfo.dailyRate);

  // إجمالي المكاسب
  const totalEarnings = salaryInfo.totalSalary + overtimeInfo.overtimeAmount;

  // إجمالي الاستقطاعات
  const totalDeductions =
    (gosiInfo.employeeDeduction || 0) +
    absenceInfo.deductionAmount +
    lateInfo.totalDeduction +
    (monthData.advanceDeduction || 0) +
    (monthData.loanDeduction || 0) +
    (monthData.otherDeductions || 0);

  const netSalary = Math.round((totalEarnings - totalDeductions) * 100) / 100;

  return {
    isValid: true,
    employeeId: employee.id,
    isSaudi: employee.isSaudi !== false,
    earnings: {
      basicSalary: employee.basicSalary,
      housingAllowance: employee.housingAllowance || 0,
      transportAllowance: employee.transportAllowance || 0,
      otherAllowances: salaryInfo.otherAllowances,
      overtimeAmount: overtimeInfo.overtimeAmount,
      totalEarnings,
    },
    deductions: {
      gosiEmployee: gosiInfo.gosiEmployee || 0,
      sanedEmployee: gosiInfo.sanedEmployee || 0,
      absenceDeduction: absenceInfo.deductionAmount,
      lateDeduction: lateInfo.totalDeduction,
      advanceDeduction: monthData.advanceDeduction || 0,
      loanDeduction: monthData.loanDeduction || 0,
      otherDeductions: monthData.otherDeductions || 0,
      totalDeductions,
    },
    employer: {
      gosiEmployer: gosiInfo.gosiEmployer || 0,
      occupationalHazard: gosiInfo.occupationalHazard || 0,
      sanedEmployer: gosiInfo.sanedEmployer || 0,
      totalEmployerCost: (gosiInfo.employerCost || 0) + totalEarnings,
    },
    netSalary,
    overtimeHours: overtimeInfo.overtimeHours,
    lateDaysCount: monthData.lateDays || 0,
    absenceDays: monthData.absenceDays || 0,
  };
}

// ========================================
// END OF SERVICE CALCULATIONS
// ========================================

/**
 * حساب مدة الخدمة بالتفصيل
 * @param {string|Date} hireDate - تاريخ التعيين
 * @param {string|Date} terminationDate - تاريخ إنهاء الخدمة
 * @returns {object}
 */
function calculateServiceDuration(hireDate, terminationDate) {
  if (!hireDate) return { isValid: false };

  const start = new Date(hireDate);
  const end = terminationDate ? new Date(terminationDate) : new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false };
  }

  const totalDays = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
  const totalYearsDecimal = totalDays / 365.25;

  // الحساب التفصيلي
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  return {
    isValid: true,
    hireDate: start.toISOString().split('T')[0],
    terminationDate: end.toISOString().split('T')[0],
    years,
    months,
    days,
    totalDays,
    totalYearsDecimal: Math.round(totalYearsDecimal * 10000) / 10000,
  };
}

/**
 * حساب مكافأة نهاية الخدمة وفق نظام العمل السعودي
 * المادة 84-88
 * @param {object} params - {hireDate, terminationDate, terminationType, lastSalary}
 * @returns {object}
 */
function calculateEndOfService(params) {
  if (!params || !params.hireDate || !params.lastSalary || !params.terminationType) {
    return { isValid: false, message: 'بيانات غير كاملة' };
  }

  const serviceDuration = calculateServiceDuration(params.hireDate, params.terminationDate);
  if (!serviceDuration.isValid) return { isValid: false, message: 'تاريخ غير صحيح' };

  const { totalYearsDecimal } = serviceDuration;

  // آخر راتب (أساسي + سكن + نقل) - المادة 88
  const lastSalary = params.lastSalary;
  const dailyRate = Math.round((lastSalary / HR_CONSTANTS.WORKING_DAYS_PER_MONTH) * 100) / 100;
  const monthlySalaryHalf = lastSalary / 2;

  // أول 5 سنوات: نصف شهر عن كل سنة
  const firstFiveYears = Math.min(totalYearsDecimal, 5);
  const firstFiveAmount = Math.round(monthlySalaryHalf * firstFiveYears * 100) / 100;

  // ما بعد 5 سنوات: شهر كامل عن كل سنة
  const remainingYears = Math.max(totalYearsDecimal - 5, 0);
  const remainingAmount = Math.round(lastSalary * remainingYears * 100) / 100;

  const totalEOS = firstFiveAmount + remainingAmount;

  // تطبيق معامل نوع إنهاء الخدمة
  const terminationFactor = _getTerminationFactor(params.terminationType, totalYearsDecimal);
  const finalEOS = Math.round(totalEOS * terminationFactor * 100) / 100;

  return {
    isValid: true,
    hireDate: serviceDuration.hireDate,
    terminationDate: serviceDuration.terminationDate,
    terminationType: params.terminationType,
    serviceDuration: {
      years: serviceDuration.years,
      months: serviceDuration.months,
      days: serviceDuration.days,
      totalYearsDecimal,
    },
    lastSalary,
    dailyRate,
    calculation: {
      firstFiveYears,
      firstFiveAmount,
      remainingYears,
      remainingAmount,
      totalEOS,
      terminationFactor,
      finalAmount: finalEOS,
    },
    finalAmount: finalEOS,
    summary: `مكافأة نهاية خدمة: ${finalEOS.toLocaleString('ar-SA')} ريال (${serviceDuration.years} سنة و${serviceDuration.months} شهر)`,
  };
}

/**
 * معامل إنهاء الخدمة حسب النوع والمدة
 * @param {string} terminationType - resignation | termination | end_of_contract | retirement
 * @param {number} serviceYears - سنوات الخدمة
 * @returns {number}
 */
function _getTerminationFactor(terminationType, serviceYears) {
  if (terminationType === 'resignation') {
    const tier = HR_CONSTANTS.EOS_RESIGNATION_FACTORS.find(
      t => serviceYears >= t.minYears && serviceYears < t.maxYears
    );
    return tier ? tier.factor : 0;
  }
  // termination, end_of_contract, retirement = كامل
  return 1;
}

/**
 * حساب التسوية الكاملة عند إنهاء الخدمة
 * @param {object} eosParams - معاملات نهاية الخدمة
 * @param {number} remainingLeaveDays - أيام الإجازة المتبقية
 * @param {number} ticketAmount - مبلغ تذاكر السفر (للأجانب)
 * @returns {object}
 */
function calculateFinalSettlement(eosParams, remainingLeaveDays = 0, ticketAmount = 0) {
  const eos = calculateEndOfService(eosParams);
  if (!eos.isValid) return { isValid: false };

  const leaveSettlement = Math.round(remainingLeaveDays * eos.dailyRate * 100) / 100;
  const totalSettlement = eos.finalAmount + leaveSettlement + ticketAmount;

  return {
    isValid: true,
    endOfServiceAmount: eos.finalAmount,
    leaveSettlement,
    ticketAmount,
    totalSettlement,
    breakdown: {
      eos: eos.calculation,
      leaveDays: remainingLeaveDays,
      leaveSettlement,
      tickets: ticketAmount,
    },
    serviceDuration: eos.serviceDuration,
    terminationType: eos.terminationType,
  };
}

// ========================================
// LEAVE CALCULATIONS
// ========================================

/**
 * حساب الاستحقاق السنوي للإجازة
 * المادة 109: 21 يوم لأقل من 5 سنوات، 30 يوم لأكثر
 * @param {number} serviceYears - سنوات الخدمة
 * @returns {number}
 */
function calculateAnnualLeaveEntitlement(serviceYears) {
  if (typeof serviceYears !== 'number' || serviceYears < 0) return 0;
  return serviceYears >= 5
    ? HR_CONSTANTS.LEAVE.ANNUAL_MORE_5_YEARS
    : HR_CONSTANTS.LEAVE.ANNUAL_LESS_5_YEARS;
}

/**
 * حساب رصيد الإجازة مع الترحيل
 * @param {number} entitlement - الاستحقاق السنوي
 * @param {number} used - المستخدم
 * @param {number} previousCarryOver - الرصيد المرحَّل من السنة السابقة
 * @returns {object}
 */
function calculateLeaveBalance(entitlement, used = 0, previousCarryOver = 0) {
  const maxCarryOver = Math.floor(entitlement * HR_CONSTANTS.LEAVE.MAX_CARRY_OVER_FACTOR);
  const effectiveCarryOver = Math.min(previousCarryOver, maxCarryOver);
  const totalAvailable = entitlement + effectiveCarryOver;
  const remaining = Math.max(0, totalAvailable - used);
  const expiringBalance = Math.max(0, remaining - maxCarryOver);

  return {
    entitlement,
    carryOver: effectiveCarryOver,
    totalAvailable,
    used,
    remaining,
    maxCarryOverForNextYear: maxCarryOver,
    expiringAtYearEnd: expiringBalance,
  };
}

/**
 * التحقق من صلاحية طلب الإجازة
 * @param {object} request - {leaveType, startDate, endDate, employee, usedThisYear}
 * @param {object} balance - رصيد الإجازات
 * @returns {object} - {valid, errors, warnings}
 */
function validateLeaveRequest(request, balance = {}) {
  if (!request) return { valid: false, errors: ['بيانات الطلب مطلوبة'] };

  const errors = [];
  const warnings = [];

  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    errors.push('تاريخ غير صحيح');
    return { valid: false, errors, warnings };
  }

  if (end < start) {
    errors.push('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية');
  }

  const { leaveType, employee } = request;

  switch (leaveType) {
    case 'annual': {
      const remaining = balance.remaining || 0;
      if (totalDays > remaining) {
        errors.push(`الرصيد المتبقي (${remaining} يوم) لا يكفي لـ ${totalDays} يوم`);
      }
      break;
    }

    case 'sick': {
      const usedSick = request.usedThisYear || 0;
      if (usedSick + totalDays > HR_CONSTANTS.LEAVE.SICK_MAX) {
        errors.push(`تجاوز الحد الأقصى للإجازة المرضية (${HR_CONSTANTS.LEAVE.SICK_MAX} يوم)`);
      }
      if (!request.medicalCertificate && totalDays > 1) {
        warnings.push('يُوصى بتقديم تقرير طبي للإجازة المرضية التي تتجاوز يوماً واحداً');
      }
      break;
    }

    case 'maternity': {
      if (employee?.gender !== 'female') {
        errors.push('إجازة الأمومة للإناث فقط');
      }
      if (totalDays > HR_CONSTANTS.LEAVE.MATERNITY) {
        errors.push(`إجازة الأمومة ${HR_CONSTANTS.LEAVE.MATERNITY} يوماً كحد أقصى (المادة 151)`);
      }
      break;
    }

    case 'paternity': {
      if (employee?.gender !== 'male') {
        errors.push('إجازة الأبوة للذكور فقط');
      }
      if (totalDays > HR_CONSTANTS.LEAVE.PATERNITY) {
        errors.push(`إجازة الأبوة ${HR_CONSTANTS.LEAVE.PATERNITY} أيام كحد أقصى`);
      }
      break;
    }

    case 'hajj': {
      if (request.hasUsedHajj) {
        errors.push('إجازة الحج لمرة واحدة فقط خلال فترة الخدمة');
      }
      const serviceYears = request.serviceYears || 0;
      if (serviceYears < 2) {
        errors.push('إجازة الحج تستحق بعد سنتين من الخدمة');
      }
      if (totalDays < HR_CONSTANTS.LEAVE.HAJJ_MIN || totalDays > HR_CONSTANTS.LEAVE.HAJJ_MAX) {
        errors.push(
          `إجازة الحج من ${HR_CONSTANTS.LEAVE.HAJJ_MIN} إلى ${HR_CONSTANTS.LEAVE.HAJJ_MAX} يوماً`
        );
      }
      break;
    }

    case 'marriage': {
      if (totalDays > HR_CONSTANTS.LEAVE.MARRIAGE) {
        errors.push(`إجازة الزواج ${HR_CONSTANTS.LEAVE.MARRIAGE} أيام كحد أقصى`);
      }
      break;
    }

    case 'bereavement': {
      if (totalDays > HR_CONSTANTS.LEAVE.BEREAVEMENT) {
        errors.push(`إجازة الوفاة ${HR_CONSTANTS.LEAVE.BEREAVEMENT} أيام كحد أقصى`);
      }
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalDays,
  };
}

/**
 * حساب قيمة الإجازة المرضية (حسب فترتها)
 * @param {number} totalDays - إجمالي أيام الإجازة المرضية
 * @param {number} dailySalary - الأجر اليومي
 * @returns {object}
 */
function calculateSickLeaveValue(totalDays, dailySalary) {
  if (!totalDays || totalDays <= 0 || !dailySalary) {
    return { totalValue: 0, breakdown: [] };
  }

  const breakdown = [];
  let remaining = totalDays;
  let totalValue = 0;

  // الفترة الأولى: 30 يوم بكامل الراتب
  if (remaining > 0) {
    const fullPayDays = Math.min(remaining, HR_CONSTANTS.LEAVE.SICK_FULL_PAY);
    const fullPayAmount = fullPayDays * dailySalary;
    totalValue += fullPayAmount;
    breakdown.push({
      days: fullPayDays,
      rate: 1,
      amount: Math.round(fullPayAmount * 100) / 100,
      description: 'بكامل الراتب',
    });
    remaining -= fullPayDays;
  }

  // الفترة الثانية: 60 يوم بثلاثة أرباع الراتب
  if (remaining > 0) {
    const threeQuarterDays = Math.min(remaining, HR_CONSTANTS.LEAVE.SICK_THREE_QUARTERS);
    const threeQuarterAmount = threeQuarterDays * dailySalary * 0.75;
    totalValue += threeQuarterAmount;
    breakdown.push({
      days: threeQuarterDays,
      rate: 0.75,
      amount: Math.round(threeQuarterAmount * 100) / 100,
      description: 'بثلاثة أرباع الراتب',
    });
    remaining -= threeQuarterDays;
  }

  // الفترة الثالثة: 30 يوم بدون راتب
  if (remaining > 0) {
    const nopayDays = Math.min(remaining, HR_CONSTANTS.LEAVE.SICK_NO_PAY);
    breakdown.push({ days: nopayDays, rate: 0, amount: 0, description: 'بدون راتب' });
  }

  return {
    totalDays,
    totalValue: Math.round(totalValue * 100) / 100,
    breakdown,
  };
}

// ========================================
// PROBATION & CONTRACT
// ========================================

/**
 * حساب تاريخ نهاية فترة التجربة
 * @param {string|Date} hireDate - تاريخ التعيين
 * @param {number} probationDays - مدة التجربة بالأيام (افتراضي 90)
 * @returns {object}
 */
function calculateProbationEnd(hireDate, probationDays = HR_CONSTANTS.PROBATION_DAYS) {
  if (!hireDate) return { isValid: false };
  const hire = new Date(hireDate);
  if (isNaN(hire.getTime())) return { isValid: false };

  const probationEnd = new Date(hire);
  probationEnd.setDate(probationEnd.getDate() + probationDays);

  const today = new Date();
  const isOnProbation = today < probationEnd;
  const daysRemaining = Math.max(0, Math.ceil((probationEnd - today) / (1000 * 60 * 60 * 24)));

  return {
    isValid: true,
    hireDate: hire.toISOString().split('T')[0],
    probationEndDate: probationEnd.toISOString().split('T')[0],
    probationDays,
    isOnProbation,
    daysRemaining: isOnProbation ? daysRemaining : 0,
  };
}

/**
 * التحقق من صلاحية العقد
 * @param {object} contract - {startDate, endDate, contractType}
 * @returns {object}
 */
function validateContract(contract) {
  if (!contract) return { isValid: false };

  const start = new Date(contract.startDate);
  const end = contract.endDate ? new Date(contract.endDate) : null;
  const today = new Date();

  const daysActive = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  const daysToExpiry = end ? Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24))) : null;

  return {
    isValid: true,
    contractType: contract.contractType,
    startDate: start.toISOString().split('T')[0],
    endDate: end ? end.toISOString().split('T')[0] : null,
    isActive: !end || today <= end,
    isExpired: end ? today > end : false,
    daysActive,
    daysToExpiry,
    expiresWithin30Days: daysToExpiry !== null && daysToExpiry <= 30,
    expiresWithin90Days: daysToExpiry !== null && daysToExpiry <= 90,
  };
}

// ========================================
// SAUDIZATION (نطاقات)
// ========================================

/**
 * حساب نسبة السعودة
 * @param {number} totalEmployees - إجمالي الموظفين
 * @param {number} saudiEmployees - عدد الموظفين السعوديين
 * @returns {object}
 */
function calculateSaudizationRate(totalEmployees, saudiEmployees) {
  if (!totalEmployees || totalEmployees <= 0) {
    return { rate: 0, status: 'no_employees' };
  }

  const rate = Math.round((saudiEmployees / totalEmployees) * 100 * 10) / 10;

  // تصنيف نطاقات (مبسط - يختلف حسب النشاط)
  let band;
  if (rate >= 40) band = 'platinum';
  else if (rate >= 30) band = 'green';
  else if (rate >= 20) band = 'yellow';
  else band = 'red';

  return {
    totalEmployees,
    saudiEmployees,
    nonSaudiEmployees: totalEmployees - saudiEmployees,
    rate,
    band,
    compliant: rate >= 20,
    targetRate: 30,
    gapToTarget: Math.max(0, Math.ceil((30 / 100) * totalEmployees - saudiEmployees)),
  };
}

// ========================================
// HR ALERTS
// ========================================

/**
 * توليد تنبيهات المستندات المنتهية
 * @param {object} employee - بيانات الموظف
 * @param {Date} referenceDate - تاريخ المرجع (افتراضي اليوم)
 * @returns {Array}
 */
function generateDocumentAlerts(employee, referenceDate = new Date()) {
  if (!employee) return [];

  const ref = new Date(referenceDate);
  const alerts = [];

  const checkDoc = (field, label, warnDays) => {
    if (!employee[field]) return;
    const expiry = new Date(employee[field]);
    const daysLeft = Math.ceil((expiry - ref) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      alerts.push({ type: 'expired', field, label, daysLeft, severity: 'critical' });
    } else if (daysLeft <= warnDays) {
      alerts.push({
        type: 'expiring',
        field,
        label,
        daysLeft,
        severity: daysLeft <= 7 ? 'urgent' : 'warning',
      });
    }
  };

  if (!employee.isSaudi) {
    checkDoc('iqamaExpiry', 'الإقامة', 60);
    checkDoc('passportExpiry', 'جواز السفر', 90);
    checkDoc('visaExpiry', 'التأشيرة', 30);
  } else {
    checkDoc('nationalIdExpiry', 'الهوية الوطنية', 30);
  }

  checkDoc('scfhsExpiry', 'رخصة SCFHS', 90);
  checkDoc('contractEndDate', 'العقد', 30);

  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
  HR_CONSTANTS,
  // Salary
  calculateTotalSalary,
  calculateGOSI,
  calculateLateDeductions,
  calculateOvertimePay,
  calculateAbsenceDeductions,
  calculateMonthlyPayroll,
  // EOS
  calculateServiceDuration,
  calculateEndOfService,
  calculateFinalSettlement,
  // Leave
  calculateAnnualLeaveEntitlement,
  calculateLeaveBalance,
  validateLeaveRequest,
  calculateSickLeaveValue,
  // Contract / Probation
  calculateProbationEnd,
  validateContract,
  // Saudization
  calculateSaudizationRate,
  // Alerts
  generateDocumentAlerts,
};

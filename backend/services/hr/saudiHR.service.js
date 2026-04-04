/**
 * Saudi HR Service — خدمة الموارد البشرية السعودية الشاملة
 *
 * يغطي:
 * - حساب GOSI (التأمينات الاجتماعية) وساند
 * - مكافأة نهاية الخدمة وفق نظام العمل السعودي
 * - إدارة الإجازات وفق نظام العمل السعودي
 * - حساب استقطاعات التأخير (المادة 80)
 *
 * المراجع التشريعية:
 *   - نظام العمل السعودي 1426هـ وتعديلاته
 *   - نظام التأمينات الاجتماعية (GOSI)
 *   - نظام ساند للتأمين ضد التعطل عن العمل
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

/** سقف الأجر الخاضع للتأمينات */
const GOSI_SALARY_CEILING = 45_000;

/** معدلات التأمينات للمواطن السعودي */
const GOSI_RATES_SAUDI = {
  employeeAnnuity: 0.09, // 9% تقاعد حصة الموظف
  employerAnnuity: 0.09, // 9% تقاعد حصة صاحب العمل
  employerHazard: 0.02, // 2% أخطار مهنية (صاحب العمل فقط)
  sanedEmployee: 0.0075, // 0.75% ساند حصة الموظف
  sanedEmployer: 0.0075, // 0.75% ساند حصة صاحب العمل
};

/** معدلات التأمينات لغير السعودي */
const GOSI_RATES_EXPAT = {
  employeeAnnuity: 0,
  employerAnnuity: 0,
  employerHazard: 0.02, // 2% أخطار مهنية فقط
  sanedEmployee: 0,
  sanedEmployer: 0,
};

/** عدد أيام الشهر لحساب اليومية */
const SALARY_DAYS_MONTH = 30;

// ─── GOSI Calculation ────────────────────────────────────────────────────────

/**
 * حساب اشتراكات التأمينات الاجتماعية (GOSI) وساند
 *
 * @param {object} params
 * @param {number} params.basicSalary  الراتب الأساسي
 * @param {number} params.housingAllowance  بدل السكن
 * @param {boolean} params.isSaudi  هل الموظف سعودي؟
 * @returns {object} تفاصيل الاشتراك
 */
function calculateGOSI({ basicSalary, housingAllowance = 0, isSaudi }) {
  const gosiBase = Math.min(basicSalary + housingAllowance, GOSI_SALARY_CEILING);
  const rates = isSaudi ? GOSI_RATES_SAUDI : GOSI_RATES_EXPAT;

  const employeeGOSI = round2(gosiBase * rates.employeeAnnuity);
  const employerGOSI = round2(gosiBase * (rates.employerAnnuity + rates.employerHazard));
  const sanedEmployee = round2(gosiBase * rates.sanedEmployee);
  const sanedEmployer = round2(gosiBase * rates.sanedEmployer);

  return {
    gosiBase,
    employeeGOSI,
    employerGOSI,
    sanedEmployee,
    sanedEmployer,
    totalEmployeeDeduction: round2(employeeGOSI + sanedEmployee),
    totalEmployerContribution: round2(employerGOSI + sanedEmployer),
  };
}

// ─── End of Service (EOS) Calculation ────────────────────────────────────────

/**
 * حساب مكافأة نهاية الخدمة وفق نظام العمل السعودي
 *
 * المواد 84-88:
 * - أول 5 سنوات: نصف شهر عن كل سنة
 * - ما بعد 5 سنوات: شهر كامل عن كل سنة
 *
 * معاملات الاستقالة (المادة 87):
 * - أقل من سنتين: 0%
 * - 2 إلى أقل من 5 سنوات: ثلث المكافأة (33.33%)
 * - 5 إلى أقل من 10 سنوات: ثلثا المكافأة (66.67%)
 * - 10 سنوات فأكثر: المكافأة كاملة (100%)
 *
 * إنهاء صاحب العمل / انتهاء العقد / تقاعد: 100% دائماً
 *
 * @param {object} params
 * @param {Date}   params.hireDate  تاريخ التعيين
 * @param {Date}   params.terminationDate  تاريخ إنهاء الخدمة
 * @param {string} params.terminationType  'resignation' | 'termination' | 'end_of_contract' | 'retirement'
 * @param {number} params.basicSalary  الراتب الأساسي
 * @param {number} params.housingAllowance  بدل السكن
 * @param {number} params.transportAllowance  بدل النقل
 * @param {number} [params.leaveBalanceDays=0]  رصيد الإجازات المستحقة
 * @returns {object} تفاصيل مكافأة نهاية الخدمة
 */
function calculateEndOfService({
  hireDate,
  terminationDate,
  terminationType,
  basicSalary,
  housingAllowance = 0,
  transportAllowance = 0,
  leaveBalanceDays = 0,
}) {
  const hire = new Date(hireDate);
  const end = new Date(terminationDate);

  if (end <= hire) {
    throw new Error('تاريخ إنهاء الخدمة يجب أن يكون بعد تاريخ التعيين');
  }

  const totalDaysService = Math.floor((end - hire) / (1000 * 60 * 60 * 24));
  const serviceYearsDecimal = totalDaysService / 365.25;

  // مكونات الراتب الأساس للحساب (المادة 88: آخر راتب)
  const lastSalary = basicSalary + housingAllowance + transportAllowance;
  const dailyRate = round2(lastSalary / SALARY_DAYS_MONTH);

  // أول 5 سنوات: نصف شهر لكل سنة
  const yearsFirst5 = Math.min(serviceYearsDecimal, 5);
  const first5Amount = round2((lastSalary / 2) * yearsFirst5);

  // ما بعد 5 سنوات: شهر كامل لكل سنة
  const yearsAfter5 = Math.max(serviceYearsDecimal - 5, 0);
  const after5Amount = round2(lastSalary * yearsAfter5);

  const grossEOS = round2(first5Amount + after5Amount);

  // معامل نوع الإنهاء
  const factor = getTerminationFactor(terminationType, serviceYearsDecimal);
  const netEOS = round2(grossEOS * factor);

  // بدل إجازات مستحقة
  const leaveSettlement = round2(leaveBalanceDays * dailyRate);

  return {
    serviceYearsDecimal: parseFloat(serviceYearsDecimal.toFixed(4)),
    totalDaysService,
    lastSalary,
    dailyRate,
    first5Amount,
    after5Amount,
    grossEOS,
    terminationFactor: factor,
    netEOS,
    leaveSettlement,
    totalSettlement: round2(netEOS + leaveSettlement),
    breakdown: {
      terminationType,
      yearsFirst5: parseFloat(yearsFirst5.toFixed(4)),
      yearsAfter5: parseFloat(yearsAfter5.toFixed(4)),
    },
  };
}

/**
 * الحصول على معامل إنهاء الخدمة
 * @param {string} type نوع الإنهاء
 * @param {number} years سنوات الخدمة
 * @returns {number} معامل 0-1
 */
function getTerminationFactor(type, years) {
  if (type !== 'resignation') return 1; // إنهاء صاحب العمل / انتهاء عقد / تقاعد = 100%

  if (years < 2) return 0;
  if (years < 5) return 1 / 3;
  if (years < 10) return 2 / 3;
  return 1;
}

// ─── Late Deduction (Article 80) ─────────────────────────────────────────────

/**
 * حساب استقطاعات التأخير التراكمية (المادة 80 نظام العمل)
 *
 * التسلسل التراكمي الشهري:
 * - الأولى: إنذار شفهي (0%)
 * - 2-3: 5% من أجر اليوم
 * - 4-6: 10% من أجر اليوم
 * - 7-9: 15% من أجر اليوم
 * - أكثر من 9: 25% من أجر اليوم (يوم كامل)
 *
 * @param {number[]} lateMinutesArray مصفوفة دقائق التأخير لكل يوم في الشهر
 * @param {number} basicSalary الراتب الأساسي
 * @param {number} housingAllowance بدل السكن
 * @returns {object} إجمالي الاستقطاع وعدد مرات التأخير
 */
function calculateLateDeductions(lateMinutesArray, basicSalary, housingAllowance = 0) {
  const lateDays = lateMinutesArray.filter(m => m > 0);
  const lateCount = lateDays.length;
  const dailyRate = (basicSalary + housingAllowance) / SALARY_DAYS_MONTH;

  let totalDeduction = 0;

  for (let i = 0; i < lateCount; i++) {
    const occurrence = i + 1;
    if (occurrence === 1)
      continue; // إنذار فقط
    else if (occurrence <= 3) totalDeduction += dailyRate * 0.05;
    else if (occurrence <= 6) totalDeduction += dailyRate * 0.1;
    else if (occurrence <= 9) totalDeduction += dailyRate * 0.15;
    else totalDeduction += dailyRate * 0.25;
  }

  return {
    lateCount,
    dailyRate: round2(dailyRate),
    totalDeduction: round2(totalDeduction),
  };
}

// ─── Leave Validation ─────────────────────────────────────────────────────────

/**
 * حساب الاستحقاق السنوي للإجازة
 * المادة 109: 21 يوم لأقل من 5 سنوات، 30 يوم لـ 5 سنوات فأكثر
 *
 * @param {number} serviceYears سنوات الخدمة
 * @returns {number} عدد أيام الإجازة المستحقة
 */
function calculateAnnualLeaveEntitlement(serviceYears) {
  return serviceYears >= 5 ? 30 : 21;
}

/**
 * التحقق من صحة طلب الإجازة وفق نظام العمل السعودي
 *
 * @param {object} params
 * @param {string} params.leaveType  نوع الإجازة
 * @param {Date}   params.startDate  تاريخ البدء
 * @param {Date}   params.endDate    تاريخ الانتهاء
 * @param {string} params.gender     'male' | 'female'
 * @param {number} params.serviceYears  سنوات الخدمة
 * @param {number} params.remainingBalance  رصيد الإجازة المتبقي
 * @param {boolean} params.hasUsedHajjLeave  هل استُخدم إجازة الحج قبلاً؟
 * @returns {string[]} مصفوفة بالأخطاء (فارغة = صالح)
 */
function validateLeaveRequest({
  leaveType,
  startDate,
  endDate,
  gender,
  serviceYears,
  remainingBalance = 0,
  hasUsedHajjLeave = false,
}) {
  const errors = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    errors.push('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية');
    return errors;
  }

  const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

  switch (leaveType) {
    case 'annual':
      if (totalDays > remainingBalance) {
        errors.push(`الرصيد المتبقي (${remainingBalance} يوم) لا يكفي لـ ${totalDays} يوم`);
      }
      break;

    case 'sick':
      // المادة 117: حد أقصى 120 يوم (30+60+30)
      if (totalDays > 120) {
        errors.push('الإجازة المرضية لا تتجاوز 120 يوماً في السنة');
      }
      break;

    case 'maternity':
      // المادة 151: 10 أسابيع = 70 يوم
      if (gender !== 'female') {
        errors.push('إجازة الأمومة للإناث فقط');
      }
      if (totalDays > 70) {
        errors.push('إجازة الأمومة 10 أسابيع كحد أقصى (المادة 151)');
      }
      break;

    case 'paternity':
      if (gender !== 'male') {
        errors.push('إجازة الأبوة للذكور فقط');
      }
      if (totalDays > 3) {
        errors.push('إجازة الأبوة 3 أيام كحد أقصى');
      }
      break;

    case 'hajj':
      if (hasUsedHajjLeave) {
        errors.push('إجازة الحج لمرة واحدة فقط خلال فترة الخدمة');
      }
      if (serviceYears < 2) {
        errors.push('إجازة الحج تستحق بعد سنتين من الخدمة');
      }
      if (totalDays < 10 || totalDays > 15) {
        errors.push('إجازة الحج بين 10 و15 يوماً (المادة 113)');
      }
      break;

    case 'marriage':
      if (totalDays > 5) {
        errors.push('إجازة الزواج 5 أيام كحد أقصى');
      }
      break;

    case 'bereavement':
      if (totalDays > 5) {
        errors.push('إجازة الوفاة 5 أيام كحد أقصى');
      }
      break;

    case 'unpaid':
      // لا قيود على الإجازة بدون راتب (تحتاج موافقة فقط)
      break;

    default:
      errors.push(`نوع الإجازة غير معروف: ${leaveType}`);
  }

  return errors;
}

// ─── Monthly Payroll Calculator ───────────────────────────────────────────────

/**
 * حساب صافي الراتب الشهري الكامل
 *
 * @param {object} employee  بيانات الموظف
 * @param {number} employee.basicSalary
 * @param {number} employee.housingAllowance
 * @param {number} employee.transportAllowance
 * @param {boolean} employee.isSaudi
 * @param {number[]} lateMinutesPerDay  دقائق التأخير لكل يوم
 * @param {number}  absentDays  أيام الغياب
 * @param {number}  overtimeHours  ساعات الإضافي
 * @param {number}  advanceDeduction  خصم السلف
 * @param {number}  loanDeduction  خصم القرض
 * @returns {object} تفصيل الراتب
 */
function calculateMonthlySalary({
  employee,
  lateMinutesPerDay = [],
  absentDays = 0,
  overtimeHours = 0,
  advanceDeduction = 0,
  loanDeduction = 0,
}) {
  const { basicSalary, housingAllowance = 0, transportAllowance = 0, isSaudi } = employee;

  // 1. المكاسب الأساسية
  const totalEarnings = basicSalary + housingAllowance + transportAllowance;

  // 2. حساب الإضافي (المادة 107: الأجر العادي + 50%)
  const hourlyRate = (basicSalary + housingAllowance) / SALARY_DAYS_MONTH / 8;
  const overtimeAmount = round2(overtimeHours * hourlyRate * 1.5);

  // 3. استقطاع الغياب
  const dailyRate = totalEarnings / SALARY_DAYS_MONTH;
  const absenceDeduction = round2(absentDays * dailyRate);

  // 4. استقطاع التأخير
  const lateDeductionResult = calculateLateDeductions(
    lateMinutesPerDay,
    basicSalary,
    housingAllowance
  );

  // 5. GOSI وساند
  const gosiResult = calculateGOSI({ basicSalary, housingAllowance, isSaudi });

  // 6. الإجماليات
  const grossPay = round2(totalEarnings + overtimeAmount);
  const totalDeductions = round2(
    absenceDeduction +
      lateDeductionResult.totalDeduction +
      advanceDeduction +
      loanDeduction +
      gosiResult.totalEmployeeDeduction
  );
  const netSalary = round2(grossPay - totalDeductions);

  return {
    grossPay,
    totalEarnings,
    overtimeHours,
    overtimeAmount,
    absenceDeduction,
    lateDeduction: lateDeductionResult.totalDeduction,
    lateCount: lateDeductionResult.lateCount,
    advanceDeduction,
    loanDeduction,
    gosi: gosiResult,
    totalDeductions,
    netSalary,
  };
}

// ─── Saudization (Nitaqat) Rate ───────────────────────────────────────────────

/**
 * حساب نسبة السعودة (نطاقات)
 * @param {number} totalEmployees  إجمالي الموظفين
 * @param {number} saudiEmployees  عدد الموظفين السعوديين
 * @returns {object} نسبة السعودة وتصنيف الشريط
 */
function calculateSaudizationRate(totalEmployees, saudiEmployees) {
  if (totalEmployees <= 0) return { rate: 0, band: 'platinum' };

  const rate = parseFloat(((saudiEmployees / totalEmployees) * 100).toFixed(2));

  let band;
  if (rate >= 35) band = 'platinum';
  else if (rate >= 25) band = 'green_high';
  else if (rate >= 20) band = 'green_medium';
  else if (rate >= 15) band = 'green_low';
  else if (rate >= 10) band = 'yellow';
  else band = 'red';

  return { rate, band, saudiEmployees, totalEmployees };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(num) {
  return Math.round(num * 100) / 100;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  calculateGOSI,
  calculateEndOfService,
  getTerminationFactor,
  calculateLateDeductions,
  calculateAnnualLeaveEntitlement,
  validateLeaveRequest,
  calculateMonthlySalary,
  calculateSaudizationRate,
  GOSI_SALARY_CEILING,
  GOSI_RATES_SAUDI,
  GOSI_RATES_EXPAT,
};

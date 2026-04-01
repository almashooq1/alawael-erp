/**
 * GosiFullService — خدمة التأمينات الاجتماعية الكاملة
 *
 * نظام شامل لـ GOSI يشمل:
 * - حساب الاشتراكات (سعودي، خليجي، وافد، نظام جديد/قديم)
 * - إدارة الاشتراكات الشهرية وربطها بمسير الرواتب
 * - حساب مكافأة نهاية الخدمة (مادة 84/85/87)
 * - تقارير الدفع والامتثال
 *
 * @module services/gosi-full.service
 * @version 1.0.0
 */
'use strict';

const logger = require('../utils/logger');
const {
  GOSISubscription,
  GOSIContribution,
  GOSIPayment,
  GOSIComplianceReport,
  EndOfServiceCalculation,
} = require('../models/gosi.models');

// =============================================================================
// ثوابت نسب الاشتراكات
// =============================================================================

/**
 * نظام قديم — اشتراك قبل يوليو 2024
 * إجمالي: موظف 9.75% + صاحب عمل 11.75% = 21.50%
 */
const SAUDI_OLD = {
  employeePension: 0.09,
  employeeSaned: 0.0075,
  employerPension: 0.09,
  employerOhp: 0.02,
  employerSaned: 0.0075,
};

/**
 * نظام جديد — اشتراك بعد يوليو 2024 (نسب 2025)
 * زيادة تدريجية 0.5% سنوياً حتى 11% للطرفين
 */
const SAUDI_NEW_2025 = {
  employeePension: 0.095,
  employeeSaned: 0.0075,
  employerPension: 0.095,
  employerOhp: 0.02,
  employerSaned: 0.0075,
};

/**
 * وافدون — أخطار مهنية فقط على صاحب العمل
 */
const EXPATRIATE = {
  employeePension: 0,
  employeeSaned: 0,
  employerPension: 0,
  employerOhp: 0.02,
  employerSaned: 0,
};

/**
 * نسب مواطني دول مجلس التعاون الخليجي
 * مفتاح: كود الجنسية ISO 3166-1 alpha-2
 */
const GCC_RATES = {
  BH: { employee: 0.08, employer: 0.14, max: 44880 }, // بحرين
  KW: { employee: 0.08, employer: 0.115, max: 33502 }, // كويت
  OM: { employee: 0.07, employer: 0.105, max: 29220 }, // عمان
  QA: { employee: 0.07, employer: 0.14, max: 103022 }, // قطر
  AE: { employee: 0.05, employer: 0.125, max: 71477 }, // إمارات
};

const GCC_COUNTRY_CODES = new Set(['BH', 'KW', 'OM', 'QA', 'AE']);
const DEFAULT_MAX_SALARY = 45000;
const MIN_SALARY = 1500;
const NEW_SYSTEM_START_DATE = new Date('2024-07-01');

// =============================================================================
// دوال مساعدة للحساب
// =============================================================================

/**
 * تحديد نوع الموظف بناءً على الجنسية
 * @param {string} nationalityCode - كود الجنسية (SA, BH, KW, OM, QA, AE, ...)
 * @returns {'saudi' | 'gcc' | 'expatriate'}
 */
function determineEmployeeType(nationalityCode) {
  if (!nationalityCode) return 'expatriate';
  const code = nationalityCode.toUpperCase().trim();
  if (code === 'SA') return 'saudi';
  if (GCC_COUNTRY_CODES.has(code)) return 'gcc';
  return 'expatriate';
}

/**
 * هل يطبق عليه النظام الجديد (اشتراك بعد يوليو 2024)؟
 * @param {Date|string} hireDate
 */
function isNewSystem(hireDate) {
  return new Date(hireDate) >= NEW_SYSTEM_START_DATE;
}

/**
 * الحصول على نسب الاشتراك حسب نوع الموظف
 * @param {'saudi'|'gcc'|'expatriate'} type
 * @param {string} nationalityCode
 * @param {boolean} newSystem
 * @returns {Object} rates
 */
function getRates(type, nationalityCode, newSystem = false) {
  if (type === 'saudi') {
    return newSystem ? SAUDI_NEW_2025 : SAUDI_OLD;
  }

  if (type === 'gcc') {
    const gcc = GCC_RATES[nationalityCode?.toUpperCase()];
    if (!gcc) return EXPATRIATE;
    return {
      employeePension: gcc.employee,
      employeeSaned: 0,
      employerPension: gcc.employer,
      employerOhp: 0.02,
      employerSaned: 0,
    };
  }

  return EXPATRIATE;
}

/**
 * الحد الأقصى للراتب حسب الجنسية
 * @param {'saudi'|'gcc'|'expatriate'} type
 * @param {string} nationalityCode
 */
function getMaxSalaryCap(type, nationalityCode) {
  if (type === 'gcc') {
    const gcc = GCC_RATES[nationalityCode?.toUpperCase()];
    return gcc?.max || DEFAULT_MAX_SALARY;
  }
  return DEFAULT_MAX_SALARY;
}

/**
 * حساب مكونات الاشتراك من الأرقام والنسب
 * @param {number} gosiBase - أساس الاحتساب بعد السقف
 * @param {Object} rates - النسب
 */
function computeComponents(gosiBase, rates) {
  const employeePension = Math.round(gosiBase * rates.employeePension * 100) / 100;
  const employeeSaned = Math.round(gosiBase * rates.employeeSaned * 100) / 100;
  const employeeTotal = Math.round((employeePension + employeeSaned) * 100) / 100;

  const employerPension = Math.round(gosiBase * rates.employerPension * 100) / 100;
  const employerOhp = Math.round(gosiBase * rates.employerOhp * 100) / 100;
  const employerSaned = Math.round(gosiBase * rates.employerSaned * 100) / 100;
  const employerTotal = Math.round((employerPension + employerOhp + employerSaned) * 100) / 100;

  return {
    employeePension,
    employeeSaned,
    employeeTotal,
    employerPension,
    employerOhp,
    employerSaned,
    employerTotal,
    grandTotal: Math.round((employeeTotal + employerTotal) * 100) / 100,
  };
}

/**
 * المادة القانونية المطبقة حسب نوع الإنهاء
 */
function getApplicableArticle(terminationType) {
  const article84 = [
    'employer_termination',
    'contract_expiry',
    'retirement',
    'death',
    'disability',
  ];
  const article85 = ['resignation'];
  const article87 = ['force_majeure', 'female_marriage', 'female_childbirth'];

  if (article84.includes(terminationType)) return 'مادة 84';
  if (article85.includes(terminationType)) return 'مادة 85';
  if (article87.includes(terminationType)) return 'مادة 87';
  return 'مادة 84';
}

/**
 * نسبة الاستحقاق ووصفها حسب نوع الإنهاء وسنوات الخدمة
 */
function getEntitlementRatio(terminationType, totalYears) {
  // مادة 84 و87: استحقاق كامل دائماً
  if (terminationType !== 'resignation') {
    return {
      ratio: 1.0,
      description: 'استحقاق كامل (100%)',
    };
  }

  // مادة 85: حسب سنوات الخدمة
  if (totalYears < 2) {
    return { ratio: 0, description: 'أقل من سنتين — لا يستحق مكافأة' };
  }
  if (totalYears < 5) {
    return { ratio: 1 / 3, description: 'من 2 إلى أقل من 5 سنوات — ثلث المكافأة (33.3%)' };
  }
  if (totalYears < 10) {
    return { ratio: 2 / 3, description: 'من 5 إلى أقل من 10 سنوات — ثلثا المكافأة (66.7%)' };
  }
  return { ratio: 1.0, description: '10 سنوات فأكثر — المكافأة كاملة (100%)' };
}

// =============================================================================
// GosiFullService
// =============================================================================

class GosiFullService {
  // ===========================================================================
  // حساب الاشتراكات
  // ===========================================================================

  /**
   * حساب اشتراك GOSI لموظف واحد
   *
   * @param {Object} employee - بيانات الموظف
   * @param {number} employee.basicSalary
   * @param {number} employee.housingAllowance
   * @param {string} employee.nationalityCode - كود الجنسية (SA, BH, ...)
   * @param {Date|string} employee.hireDate
   * @param {number} [workingDays] - أيام العمل الفعلية (null = شهر كامل)
   * @returns {Object} تفصيل الاشتراك
   */
  calculateContribution(employee, workingDays = null) {
    const { basicSalary = 0, housingAllowance = 0, nationalityCode, hireDate } = employee;

    const empType = determineEmployeeType(nationalityCode);
    const newSystem = empType === 'saudi' && isNewSystem(hireDate);
    const rates = getRates(empType, nationalityCode, newSystem);
    const maxCap = getMaxSalaryCap(empType, nationalityCode);

    // أساس الاحتساب = الراتب الأساسي + بدل السكن
    let gosiBase = basicSalary + housingAllowance;

    // تطبيق السقف الأقصى والأدنى
    gosiBase = Math.min(gosiBase, maxCap);
    gosiBase = Math.max(gosiBase, MIN_SALARY);

    // تعديل نسبي لأيام العمل (عند الانضمام/المغادرة في منتصف الشهر)
    if (workingDays !== null && workingDays > 0) {
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      gosiBase = Math.round((gosiBase / daysInMonth) * workingDays * 100) / 100;
    }

    const components = computeComponents(gosiBase, rates);

    return {
      employeeType: empType,
      nationalityCode,
      isNewSystem: newSystem,
      gosiBase: Math.round(gosiBase * 100) / 100,
      maxSalaryCap: maxCap,
      rates: {
        employeeRate: Math.round((rates.employeePension + rates.employeeSaned) * 10000) / 100,
        employerRate:
          Math.round((rates.employerPension + rates.employerOhp + rates.employerSaned) * 10000) /
          100,
      },
      breakdown: {
        employee: {
          pension: components.employeePension,
          saned: components.employeeSaned,
          total: components.employeeTotal,
        },
        employer: {
          pension: components.employerPension,
          ohp: components.employerOhp,
          saned: components.employerSaned,
          total: components.employerTotal,
        },
      },
      grandTotal: components.grandTotal,
    };
  }

  /**
   * حساب اشتراكات شهر كامل لمجموعة موظفين وإنشاء سجل الدفع
   *
   * @param {Array} employees - قائمة بيانات الموظفين
   * @param {string} period - الفترة (YYYY-MM)
   * @param {string} organizationId
   * @param {string} generatedBy - معرف المستخدم المُنشئ
   * @returns {Object} سجل GOSIPayment
   */
  async calculateMonthlyContributions(employees, period, organizationId, generatedBy) {
    let totalEmployeeShare = 0;
    let totalEmployerShare = 0;
    let saudiCount = 0;
    let gccCount = 0;
    let expatCount = 0;
    const contributionDetails = [];

    for (const emp of employees) {
      const calc = this.calculateContribution(emp);

      totalEmployeeShare += calc.breakdown.employee.total;
      totalEmployerShare += calc.breakdown.employer.total;

      if (calc.employeeType === 'saudi') saudiCount++;
      else if (calc.employeeType === 'gcc') gccCount++;
      else expatCount++;

      contributionDetails.push({
        employeeId: emp._id || emp.id,
        employeeName: emp.name || emp.fullName,
        nationalityCode: emp.nationalityCode,
        employeeType: calc.employeeType,
        gosiBase: calc.gosiBase,
        employeeShare: calc.breakdown.employee.total,
        employerShare: calc.breakdown.employer.total,
        total: calc.grandTotal,
      });
    }

    totalEmployeeShare = Math.round(totalEmployeeShare * 100) / 100;
    totalEmployerShare = Math.round(totalEmployerShare * 100) / 100;

    // تاريخ الاستحقاق: الـ 15 من الشهر التالي
    const [year, month] = period.split('-').map(Number);
    const dueDate = new Date(year, month, 15); // month بدون -1 = الشهر التالي

    const payment = await GOSIPayment.findOneAndUpdate(
      { organization: organizationId, period },
      {
        organization: organizationId,
        period,
        totalEmployeeShare,
        totalEmployerShare,
        grandTotal: Math.round((totalEmployeeShare + totalEmployerShare) * 100) / 100,
        totalEmployees: saudiCount + gccCount + expatCount,
        saudiEmployees: saudiCount,
        gccEmployees: gccCount,
        expatEmployees: expatCount,
        dueDate,
        status: 'pending',
        paymentDetails: { contributions: contributionDetails },
        generatedBy,
      },
      { upsert: true, new: true }
    );

    logger.info(
      `[GOSI] Monthly contributions calculated for period ${period}: ` +
        `${saudiCount + gccCount + expatCount} employees, total: ${payment.grandTotal} SAR`
    );

    return payment;
  }

  /**
   * تسجيل موظف في GOSI وحفظ بيانات الاشتراك
   *
   * @param {Object} employee - بيانات الموظف الكاملة
   * @param {Object} context - { userId, organizationId }
   * @returns {GOSISubscription}
   */
  async registerEmployee(employee, context = {}) {
    // التحقق من عدم وجود اشتراك مسبق
    const existing = await GOSISubscription.findOne({
      employee: employee._id,
      status: 'active',
    });

    if (existing) {
      throw new Error('الموظف مسجل بالفعل في التأمينات الاجتماعية');
    }

    const empType = determineEmployeeType(employee.nationalityCode);
    const newSystem = empType === 'saudi' && isNewSystem(employee.hireDate);
    const rates = getRates(empType, employee.nationalityCode, newSystem);
    const maxCap = getMaxSalaryCap(empType, employee.nationalityCode);
    const gosiBase = Math.min(
      Math.max(employee.basicSalary + (employee.housingAllowance || 0), MIN_SALARY),
      maxCap
    );
    const components = computeComponents(gosiBase, rates);

    const subscription = await GOSISubscription.create({
      employee: employee._id,
      organization: context.organizationId,
      nationalId: employee.nationalId,
      iqamaNumber: employee.iqamaNumber,
      fullNameArabic: employee.nameAr || employee.fullNameArabic,
      fullNameEnglish: employee.name || employee.fullNameEnglish,
      dateOfBirth: employee.dateOfBirth,
      nationality: employee.nationality,
      isSaudi: empType === 'saudi',
      jobTitle: employee.position || employee.jobTitle,
      establishmentId: context.establishmentId || process.env.GOSI_ESTABLISHMENT_ID,
      basicSalary: employee.basicSalary,
      housingAllowance: employee.housingAllowance || 0,
      subscriberWage: gosiBase,
      employeeContribution: components.employeeTotal,
      employerContribution: components.employerTotal,
      totalContribution: components.grandTotal,
      employeeRate: rates.employeePension + rates.employeeSaned,
      employerRate: rates.employerPension + rates.employerOhp + rates.employerSaned,
      status: 'active',
      registrationDate: new Date(),
      annuities: empType === 'saudi',
      occupationalHazards: true,
      complianceStatus: 'compliant',
      createdBy: context.userId,
    });

    logger.info(`[GOSI] Employee registered: ${employee._id}`);
    return subscription;
  }

  /**
   * تحديث راتب الاشتراك عند تغيير الراتب
   *
   * @param {string} subscriptionId
   * @param {number} newBasicSalary
   * @param {number} newHousingAllowance
   * @param {string} updatedBy
   */
  async updateSubscriptionWage(
    subscriptionId,
    newBasicSalary,
    newHousingAllowance = 0,
    updatedBy = null
  ) {
    const subscription = await GOSISubscription.findById(subscriptionId);
    if (!subscription) throw new Error('الاشتراك غير موجود');

    const empType = subscription.isSaudi
      ? 'saudi'
      : GCC_COUNTRY_CODES.has(subscription.nationality?.toUpperCase())
        ? 'gcc'
        : 'expatriate';
    const rates = getRates(empType, subscription.nationality);
    const maxCap = getMaxSalaryCap(empType, subscription.nationality);
    const gosiBase = Math.min(Math.max(newBasicSalary + newHousingAllowance, MIN_SALARY), maxCap);
    const components = computeComponents(gosiBase, rates);

    return GOSISubscription.findByIdAndUpdate(
      subscriptionId,
      {
        basicSalary: newBasicSalary,
        housingAllowance: newHousingAllowance,
        subscriberWage: gosiBase,
        employeeContribution: components.employeeTotal,
        employerContribution: components.employerTotal,
        totalContribution: components.grandTotal,
        updatedBy,
      },
      { new: true }
    );
  }

  /**
   * ربط اشتراكات GOSI مع مسير الرواتب
   * يُنفَّذ عند تأكيد الرواتب
   *
   * @param {Array} payrollItems - مفردات الراتب [{ employeeId, workingDays, gosiDeduction }]
   * @param {string} period - YYYY-MM
   * @param {string} payrollId
   */
  async linkWithPayroll(payrollItems, period, payrollId) {
    const results = [];

    for (const item of payrollItems) {
      const subscription = await GOSISubscription.findOne({
        employee: item.employeeId,
        status: 'active',
      });

      if (!subscription) continue;

      try {
        const contribution = await GOSIContribution.findOneAndUpdate(
          { subscription: subscription._id, period },
          {
            subscription: subscription._id,
            employee: item.employeeId,
            period,
            subscriberWage: subscription.subscriberWage,
            employeeContribution: subscription.employeeContribution,
            employerContribution: subscription.employerContribution,
            totalContribution: subscription.totalContribution,
            paymentStatus: 'pending',
            notes: `مسير رواتب: ${payrollId}`,
          },
          { upsert: true, new: true }
        );

        results.push({ employeeId: item.employeeId, contribution });
      } catch (err) {
        logger.warn(`[GOSI] Failed to link payroll for employee ${item.employeeId}:`, err.message);
      }
    }

    logger.info(`[GOSI] Linked ${results.length} contributions to payroll ${payrollId}`);
    return results;
  }

  /**
   * تسجيل دفعة GOSI
   * @param {string} paymentId - معرف GOSIPayment
   * @param {string} sadadNumber - رقم سداد
   * @param {string} approvedBy
   */
  async recordPayment(paymentId, sadadNumber, approvedBy) {
    const payment = await GOSIPayment.findByIdAndUpdate(
      paymentId,
      {
        sadadNumber,
        paymentDate: new Date(),
        status: 'paid',
        approvedBy,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!payment) throw new Error('سجل الدفع غير موجود');

    // تحديث حالة الاشتراكات المرتبطة
    await GOSIContribution.updateMany(
      { period: payment.period, paymentStatus: 'pending' },
      { paymentStatus: 'paid', paymentDate: new Date(), paymentReference: sadadNumber }
    );

    logger.info(`[GOSI] Payment recorded for period ${payment.period}: ${sadadNumber}`);
    return payment;
  }

  // ===========================================================================
  // حساب مكافأة نهاية الخدمة
  // ===========================================================================

  /**
   * حساب مكافأة نهاية الخدمة الكامل
   *
   * القواعد القانونية:
   * - مادة 84: إنهاء من صاحب العمل أو انتهاء العقد → استحقاق كامل
   * - مادة 85: استقالة → حسب سنوات الخدمة (0% / 33% / 67% / 100%)
   * - مادة 87: قوة قاهرة، زواج، وضع → استحقاق كامل
   *
   * @param {Object} employee - بيانات الموظف
   * @param {string} terminationType - نوع إنهاء الخدمة
   * @param {Date|string} [endDate] - تاريخ نهاية الخدمة (default: اليوم)
   * @param {Object} context - { userId, organizationId }
   * @param {boolean} [isEstimated=false] - هل هو حساب تقديري
   * @returns {EndOfServiceCalculation}
   */
  async calculateEndOfService(
    employee,
    terminationType,
    endDate = null,
    context = {},
    isEstimated = false
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = new Date(employee.hireDate);

    // ── الخطوة 1: حساب مدة الخدمة ─────────────────────────────────────────
    const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    const totalYears = Math.round((totalDays / 365.25) * 1000) / 1000;
    const totalMonths = Math.round((totalDays / 30.4375) * 10) / 10;

    // ── الخطوة 2: الراتب الفعلي الأخير ───────────────────────────────────
    const basicSalary = employee.basicSalary || 0;
    const housingAllowance = employee.housingAllowance || 0;
    const transportAllowance = employee.transportAllowance || 0;
    const otherAllowances = employee.otherAllowances || employee.otherFixedAllowances || 0;
    const lastSalary = basicSalary + housingAllowance + transportAllowance + otherAllowances;

    // ── الخطوة 3: حساب المستحق الكامل (مادة 84) ─────────────────────────

    // أول 5 سنوات: نصف شهر (الراتب ÷ 2) لكل سنة
    const firstFiveYears = Math.min(totalYears, 5);
    const firstFiveYearsAmount = Math.round((lastSalary / 2) * firstFiveYears * 100) / 100;

    // ما بعد 5 سنوات: شهر كامل لكل سنة
    const remainingYears = Math.max(0, totalYears - 5);
    const remainingYearsAmount = Math.round(lastSalary * remainingYears * 100) / 100;

    const fullEntitlement = Math.round((firstFiveYearsAmount + remainingYearsAmount) * 100) / 100;

    // ── الخطوة 4: تطبيق نسبة الاستحقاق ───────────────────────────────────
    const { ratio: entitlementRatio, description: ratioDescription } = getEntitlementRatio(
      terminationType,
      totalYears
    );
    const finalAmount = Math.round(fullEntitlement * entitlementRatio * 100) / 100;

    // ── الخطوة 5: المادة القانونية ─────────────────────────────────────────
    const applicableArticle = getApplicableArticle(terminationType);

    // ── الخطوة 6: بناء التفصيل الكامل ────────────────────────────────────
    const calculationBreakdown = {
      servicePeriod: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        totalDays,
        totalMonths,
        totalYears,
      },
      lastSalaryBreakdown: {
        basicSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        totalLastSalary: lastSalary,
      },
      article84Calculation: {
        firstFiveYears: {
          actualYears: firstFiveYears,
          rate: 'نصف شهر لكل سنة',
          formula: `(${lastSalary} ÷ 2) × ${firstFiveYears} = ${firstFiveYearsAmount}`,
          amount: firstFiveYearsAmount,
        },
        remainingYears: {
          actualYears: remainingYears,
          rate: 'شهر كامل لكل سنة',
          formula:
            remainingYears > 0
              ? `${lastSalary} × ${remainingYears} = ${remainingYearsAmount}`
              : 'لا يوجد',
          amount: remainingYearsAmount,
        },
        fullEntitlement,
      },
      terminationRules: {
        type: terminationType,
        applicableArticle,
        entitlementRatio,
        ratioDescription,
      },
      finalCalculation: {
        fullEntitlement,
        entitlementRatio,
        formula: `${fullEntitlement} × ${entitlementRatio} = ${finalAmount}`,
        finalAmount,
      },
    };

    // حفظ الحساب في قاعدة البيانات
    const record = await EndOfServiceCalculation.create({
      employee: employee._id,
      organization: context.organizationId,
      terminationType,
      startDate: start,
      endDate: end,
      totalYears,
      lastSalary,
      basicSalary,
      housingAllowance,
      transportAllowance,
      otherAllowances,
      firstFiveYearsAmount,
      remainingYearsAmount,
      fractionYearAmount: 0,
      fullEntitlement,
      entitlementRatio,
      finalAmount,
      applicableArticle,
      ratioDescription,
      calculationBreakdown,
      isEstimated,
      status: isEstimated ? 'estimated' : 'confirmed',
      calculatedBy: context.userId,
    });

    logger.info(
      `[GOSI] End of service calculated for employee ${employee._id}: ` +
        `${finalAmount} SAR (${terminationType})`
    );

    return record;
  }

  /**
   * حساب تقديري لسيناريوهات نهاية الخدمة (بدون حفظ نهائي)
   * مفيد لعرض التقدير للموظف
   *
   * @param {Object} employee
   * @param {Object} context
   * @returns {Object} سيناريوهين: إنهاء من صاحب العمل + استقالة
   */
  async estimateEndOfService(employee, context = {}) {
    const scenarios = {};
    const scenarios_types = ['employer_termination', 'resignation'];

    for (const type of scenarios_types) {
      const calc = await this.calculateEndOfService(employee, type, null, context, true);
      scenarios[type] = {
        terminationType: type,
        applicableArticle: calc.applicableArticle,
        finalAmount: calc.finalAmount,
        entitlementRatio: calc.entitlementRatio,
        ratioDescription: calc.ratioDescription,
        totalYears: calc.totalYears,
        breakdown: calc.calculationBreakdown,
        recordId: calc._id,
      };
    }

    return scenarios;
  }

  /**
   * تأكيد حساب مكافأة نهاية الخدمة
   * @param {string} calculationId
   * @param {string} confirmedBy
   */
  async confirmEndOfService(calculationId, confirmedBy) {
    const calc = await EndOfServiceCalculation.findByIdAndUpdate(
      calculationId,
      {
        status: 'confirmed',
        isEstimated: false,
        confirmedBy,
      },
      { new: true }
    );

    if (!calc) throw new Error('حساب مكافأة نهاية الخدمة غير موجود');
    return calc;
  }

  /**
   * تسجيل صرف مكافأة نهاية الخدمة
   * @param {string} calculationId
   * @param {Date} paidDate
   */
  async markEndOfServicePaid(calculationId, paidDate = new Date()) {
    return EndOfServiceCalculation.findByIdAndUpdate(
      calculationId,
      { status: 'paid', paidDate: new Date(paidDate) },
      { new: true }
    );
  }

  // ===========================================================================
  // التقارير
  // ===========================================================================

  /**
   * ملخص GOSI للوحة التحكم
   * @param {string} organizationId
   */
  async getDashboardSummary(organizationId = null) {
    const query = organizationId ? { organization: organizationId } : {};

    const [totalSubscriptions, activeSubscriptions, pendingPayments, overduePayments] =
      await Promise.all([
        GOSISubscription.countDocuments(query),
        GOSISubscription.countDocuments({ ...query, status: 'active' }),
        GOSIPayment.countDocuments({ ...query, status: 'pending' }),
        GOSIPayment.countDocuments({ ...query, status: 'overdue' }),
      ]);

    // إجمالي المبالغ المستحقة
    const overdueAmountAgg = await GOSIPayment.aggregate([
      { $match: { ...query, status: { $in: ['pending', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]);

    const overdueAmount = overdueAmountAgg[0]?.total || 0;

    // توزيع الموظفين
    const breakdown = await GOSISubscription.aggregate([
      { $match: { ...query, status: 'active' } },
      { $group: { _id: '$isSaudi', count: { $sum: 1 } } },
    ]);

    const saudiCount = breakdown.find(b => b._id === true)?.count || 0;
    const nonSaudiCount = breakdown.find(b => b._id === false)?.count || 0;

    return {
      totalSubscriptions,
      activeSubscriptions,
      pendingPayments,
      overduePayments,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
      employeeBreakdown: {
        saudi: saudiCount,
        nonSaudi: nonSaudiCount,
        saudiPercentage:
          activeSubscriptions > 0 ? Math.round((saudiCount / activeSubscriptions) * 100) : 0,
      },
    };
  }

  /**
   * تقرير الاشتراكات للفترة
   * @param {string} period - YYYY-MM
   * @param {string} organizationId
   */
  async getPeriodReport(period, organizationId = null) {
    const query = { period };
    if (organizationId) query.organization = organizationId;

    const payment = await GOSIPayment.findOne(query).populate('generatedBy', 'name email');
    const contributions = await GOSIContribution.find(
      organizationId ? { period, organization: organizationId } : { period }
    )
      .populate('employee', 'name nationalId')
      .limit(500);

    return { payment, contributions };
  }

  /**
   * سجل مكافآت نهاية الخدمة للموظف
   * @param {string} employeeId
   */
  async getEmployeeEndOfServiceHistory(employeeId) {
    return EndOfServiceCalculation.find({ employee: employeeId }).sort({ createdAt: -1 }).limit(10);
  }

  // ===========================================================================
  // دوال مساعدة عامة
  // ===========================================================================

  /**
   * حساب سريع للاشتراكات (بدون حفظ)
   * @param {number} basicSalary
   * @param {number} housingAllowance
   * @param {string} nationalityCode
   * @param {string} hireDate
   */
  quickCalculate(basicSalary, housingAllowance = 0, nationalityCode = 'SA', hireDate = null) {
    return this.calculateContribution({
      basicSalary,
      housingAllowance,
      nationalityCode,
      hireDate: hireDate || new Date().toISOString(),
    });
  }

  /**
   * جدول نسب الاشتراكات للعرض
   */
  getRatesTable() {
    return {
      saudi: {
        oldSystem: {
          employee: { pension: '9.00%', saned: '0.75%', total: '9.75%' },
          employer: { pension: '9.00%', ohp: '2.00%', saned: '0.75%', total: '11.75%' },
          combined: '21.50%',
        },
        newSystem2025: {
          employee: { pension: '9.50%', saned: '0.75%', total: '10.25%' },
          employer: { pension: '9.50%', ohp: '2.00%', saned: '0.75%', total: '12.25%' },
          combined: '22.50%',
          note: 'اشتراك بعد يوليو 2024 - زيادة تدريجية',
        },
      },
      gcc: Object.fromEntries(
        Object.entries(GCC_RATES).map(([code, r]) => [
          code,
          {
            employee: `${(r.employee * 100).toFixed(2)}%`,
            employer: `${(r.employer * 100).toFixed(2)}%`,
            maxSalary: r.max,
          },
        ])
      ),
      expatriate: {
        employee: '0.00%',
        employer: '2.00% (أخطار مهنية فقط)',
        combined: '2.00%',
      },
      general: {
        minSalary: MIN_SALARY,
        defaultMaxSalary: DEFAULT_MAX_SALARY,
        paymentDeadline: 'الـ 15 من الشهر التالي',
        basis: 'الراتب الأساسي + بدل السكن',
      },
    };
  }
}

module.exports = new GosiFullService();

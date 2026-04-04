/**
 * Government Integrations Calculations Service
 * خدمة حسابات التكاملات الحكومية السعودية
 * ZATCA + GOSI + NPHIES + نطاقات/WPS
 * Pure Business Logic - No DB, No Side Effects
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 */

'use strict';

// ========================================
// CONSTANTS
// ========================================
const GOV_CONSTANTS = {
  // ZATCA - ضريبة القيمة المضافة
  ZATCA: {
    VAT_RATE: 0.15, // 15%
    ZERO_RATE: 0,
    STANDARD_CODE: '388', // فاتورة عادية
    CREDIT_NOTE_CODE: '381', // إشعار دائن
    DEBIT_NOTE_CODE: '383', // إشعار مدين
    SIMPLIFIED_TYPE: 'B2C',
    STANDARD_TYPE: 'B2B',
    TLV_SELLER_TAG: 1,
    TLV_VAT_NUMBER_TAG: 2,
    TLV_TIMESTAMP_TAG: 3,
    TLV_TOTAL_TAG: 4,
    TLV_VAT_AMOUNT_TAG: 5,
    INVOICE_HASH_ALGORITHM: 'SHA-256',
    VAT_EXEMPTION_CODES: {
      HEALTH: 'VATEX-SA-HEA',
      EDUCATION: 'VATEX-SA-EDU',
      ZERO_RATED: 'VATEX-SA-32',
    },
  },

  // GOSI - التأمينات الاجتماعية
  GOSI: {
    SAUDI_EMPLOYEE_RATE: 0.09, // 9% حصة الموظف السعودي
    SAUDI_EMPLOYER_RATE: 0.09, // 9% حصة صاحب العمل
    OCCUPATIONAL_HAZARD_RATE: 0.02, // 2% مخاطر مهنية
    SANED_EMPLOYEE_RATE: 0.0075, // 0.75% ساند موظف
    SANED_EMPLOYER_RATE: 0.0075, // 0.75% ساند صاحب عمل
    NON_SAUDI_EMPLOYER_RATE: 0.02, // 2% غير سعوديين
    SALARY_CAP: 45000, // سقف الراتب الخاضع للتأمين
    SALARY_FLOOR: 400, // حد أدنى للأجر
  },

  // نطاقات - Saudization
  NITAQAT: {
    PLATINUM_MIN: 40, // بلاتيني: 40%+
    GREEN_HIGH_MIN: 35, // أخضر مرتفع
    GREEN_MID_MIN: 30, // أخضر متوسط
    GREEN_LOW_MIN: 25, // أخضر منخفض
    YELLOW_MIN: 20, // أصفر
    RED_MIN: 0, // أحمر
    HEALTH_SECTOR_REQUIRED: 20, // نسبة مطلوبة للقطاع الصحي
  },

  // WPS - نظام حماية الأجور
  WPS: {
    MAX_DELAY_DAYS: 10, // أقصى تأخير مسموح: 10 أيام
    WARNING_DAYS: 7, // تحذير عند التأخير 7 أيام
    COMPLIANCE_RATE: 100, // نسبة الالتزام المطلوبة 100%
  },

  // NPHIES - نظام معلومات صحة المريض الوطني
  NPHIES: {
    COVERAGE_TYPES: ['EPM', 'OPD', 'EMR', 'IPD'],
    CLAIM_STATUSES: ['queued', 'processing', 'approved', 'rejected', 'partial'],
    PRIOR_AUTH_REQUIRED_SERVICES: ['rehabilitation', 'physiotherapy', 'occupational_therapy'],
    DEDUCTIBLE_TYPES: ['copayment', 'deductible', 'coinsurance'],
  },
};

// ========================================
// ZATCA - الفوترة الإلكترونية
// ========================================

/**
 * حساب ضريبة القيمة المضافة للفاتورة
 * @param {number} subtotal - المبلغ قبل الضريبة
 * @param {string} vatCategory - نوع الضريبة: 'standard' | 'zero_rated' | 'exempt'
 * @returns {object} - {vatAmount, totalAmount, vatRate}
 */
function calculateVAT(subtotal, vatCategory = 'standard') {
  if (subtotal == null || isNaN(subtotal) || subtotal < 0) {
    return { vatAmount: 0, totalAmount: 0, vatRate: 0, vatCategory };
  }

  let vatRate = 0;
  if (vatCategory === 'standard') {
    vatRate = GOV_CONSTANTS.ZATCA.VAT_RATE;
  } else if (vatCategory === 'zero_rated' || vatCategory === 'exempt') {
    vatRate = 0;
  }

  const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
  const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vatAmount,
    totalAmount,
    vatRate: vatRate * 100,
    vatCategory,
  };
}

/**
 * حساب ضريبة القيمة المضافة لعناصر متعددة
 * @param {Array} items - [{amount, vatCategory, quantity}]
 * @returns {object} - إجماليات الفاتورة
 */
function calculateInvoiceTotals(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      subtotal: 0,
      discountTotal: 0,
      taxableAmount: 0,
      exemptAmount: 0,
      zeroRatedAmount: 0,
      vatAmount: 0,
      totalAmount: 0,
    };
  }

  let subtotal = 0;
  let discountTotal = 0;
  let taxableAmount = 0;
  let exemptAmount = 0;
  let zeroRatedAmount = 0;
  let vatAmount = 0;

  for (const item of items) {
    const qty = item.quantity || 1;
    const unitPrice = item.unitPrice || 0;
    const discount = item.discount || 0;
    const lineSubtotal = Math.round(qty * unitPrice * 100) / 100;
    const discountAmt =
      item.discountType === 'percentage'
        ? Math.round(lineSubtotal * (discount / 100) * 100) / 100
        : Math.round(discount * 100) / 100;

    const lineNet = lineSubtotal - discountAmt;
    subtotal += lineSubtotal;
    discountTotal += discountAmt;

    const category = item.vatCategory || 'standard';
    if (category === 'standard') {
      taxableAmount += lineNet;
      vatAmount += Math.round(lineNet * GOV_CONSTANTS.ZATCA.VAT_RATE * 100) / 100;
    } else if (category === 'exempt') {
      exemptAmount += lineNet;
    } else if (category === 'zero_rated') {
      zeroRatedAmount += lineNet;
    }
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    exemptAmount: Math.round(exemptAmount * 100) / 100,
    zeroRatedAmount: Math.round(zeroRatedAmount * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalAmount:
      Math.round((taxableAmount + exemptAmount + zeroRatedAmount + vatAmount) * 100) / 100,
  };
}

/**
 * ترميز TLV لـ QR Code الفاتورة المبسطة (ZATCA)
 * Tag-Length-Value encoding
 * @param {object} invoiceData - {sellerName, vatNumber, timestamp, totalAmount, vatAmount}
 * @returns {string} - Base64 TLV string
 */
function encodeTLVForQR(invoiceData) {
  if (!invoiceData || typeof invoiceData !== 'object') {
    return '';
  }

  const fields = [
    { tag: GOV_CONSTANTS.ZATCA.TLV_SELLER_TAG, value: invoiceData.sellerName || '' },
    { tag: GOV_CONSTANTS.ZATCA.TLV_VAT_NUMBER_TAG, value: invoiceData.vatNumber || '' },
    {
      tag: GOV_CONSTANTS.ZATCA.TLV_TIMESTAMP_TAG,
      value: invoiceData.timestamp || new Date().toISOString(),
    },
    { tag: GOV_CONSTANTS.ZATCA.TLV_TOTAL_TAG, value: String(invoiceData.totalAmount || '0.00') },
    { tag: GOV_CONSTANTS.ZATCA.TLV_VAT_AMOUNT_TAG, value: String(invoiceData.vatAmount || '0.00') },
  ];

  let tlvBytes = '';
  for (const field of fields) {
    const valueBytes = unescape(encodeURIComponent(field.value)); // UTF-8 bytes simulation
    tlvBytes += String.fromCharCode(field.tag);
    tlvBytes += String.fromCharCode(valueBytes.length);
    tlvBytes += valueBytes;
  }

  return btoa ? btoa(tlvBytes) : Buffer.from(tlvBytes, 'binary').toString('base64');
}

/**
 * التحقق من صحة الرقم الضريبي (VAT Number)
 * 15 رقماً يبدأ بـ 3 وينتهي بـ 3
 * @param {string} vatNumber
 * @returns {object} - {isValid, reason}
 */
function validateVATNumber(vatNumber) {
  if (!vatNumber || typeof vatNumber !== 'string') {
    return { isValid: false, reason: 'الرقم الضريبي مطلوب' };
  }

  const cleaned = vatNumber.trim();

  if (!/^\d{15}$/.test(cleaned)) {
    return { isValid: false, reason: 'الرقم الضريبي يجب أن يتكون من 15 رقماً' };
  }

  if (!cleaned.startsWith('3')) {
    return { isValid: false, reason: 'الرقم الضريبي يجب أن يبدأ بالرقم 3' };
  }

  if (!cleaned.endsWith('3')) {
    return { isValid: false, reason: 'الرقم الضريبي يجب أن ينتهي بالرقم 3' };
  }

  return { isValid: true, reason: null, formatted: cleaned };
}

/**
 * إنشاء بيانات UUID فريد للفاتورة (محاكاة)
 * @returns {string} - UUID v4 format
 */
function generateInvoiceUUID() {
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return template.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * تحديد نوع الفاتورة ZATCA حسب المبلغ والنوع
 * @param {number} totalAmount
 * @param {string} customerType - 'B2B' | 'B2C'
 * @returns {object} - {invoiceType, reportingRequired, clearanceRequired}
 */
function determineZATCAInvoiceType(totalAmount, customerType = 'B2C') {
  const isB2B = customerType === 'B2B';
  const requiresClearance = isB2B && totalAmount >= 1000;

  return {
    invoiceType: isB2B ? 'standard' : 'simplified',
    subType: customerType,
    reportingRequired: true,
    clearanceRequired: requiresClearance,
    typeCode: isB2B ? GOV_CONSTANTS.ZATCA.STANDARD_CODE : GOV_CONSTANTS.ZATCA.STANDARD_CODE,
    processingMode: requiresClearance ? 'clearance' : 'reporting',
  };
}

/**
 * حساب ضريبة خدمات التأهيل (إعفاء جزئي في القطاع الصحي)
 * @param {string} serviceType - نوع الخدمة
 * @param {number} amount
 * @returns {object}
 */
function calculateRehabServiceVAT(serviceType, amount) {
  // خدمات التأهيل: خاضعة للضريبة بنسبة 15% في السعودية
  // لا يوجد إعفاء لخدمات التأهيل في الوقت الحالي
  const healthExemptServices = ['blood_transfusion', 'dialysis', 'emergency'];
  const isExempt = healthExemptServices.includes(serviceType);

  return calculateVAT(amount, isExempt ? 'exempt' : 'standard');
}

// ========================================
// GOSI - التأمينات الاجتماعية
// ========================================

/**
 * حساب اشتراكات التأمينات الاجتماعية (GOSI)
 * @param {number} basicSalary - الراتب الأساسي
 * @param {number} housingAllowance - بدل السكن
 * @param {boolean} isSaudi - هل الموظف سعودي
 * @returns {object} - {employeeShare, employerShare, sanedEmployee, sanedEmployer, total}
 */
function calculateGOSIContributions(basicSalary, housingAllowance = 0, isSaudi = true) {
  if (basicSalary == null || isNaN(basicSalary) || basicSalary < 0) {
    return {
      gosiBase: 0,
      employeeShare: 0,
      employerShare: 0,
      occupationalHazard: 0,
      sanedEmployee: 0,
      sanedEmployer: 0,
      totalEmployeeDeduction: 0,
      totalEmployerCost: 0,
    };
  }

  // وعاء التأمين: أساسي + سكن، بحد أقصى 45,000
  const gosiBase = Math.min(
    (basicSalary || 0) + (housingAllowance || 0),
    GOV_CONSTANTS.GOSI.SALARY_CAP
  );

  const occupationalHazard =
    Math.round(gosiBase * GOV_CONSTANTS.GOSI.OCCUPATIONAL_HAZARD_RATE * 100) / 100;

  if (!isSaudi) {
    // غير سعودي: لا حصة موظف، حصة صاحب عمل = مخاطر مهنية فقط
    return {
      gosiBase,
      employeeShare: 0,
      employerShare: 0,
      occupationalHazard,
      sanedEmployee: 0,
      sanedEmployer: 0,
      totalEmployeeDeduction: 0,
      totalEmployerCost: occupationalHazard,
    };
  }

  // سعودي
  const employeeShare = Math.round(gosiBase * GOV_CONSTANTS.GOSI.SAUDI_EMPLOYEE_RATE * 100) / 100;
  const employerShare = Math.round(gosiBase * GOV_CONSTANTS.GOSI.SAUDI_EMPLOYER_RATE * 100) / 100;
  const sanedEmployee = Math.round(gosiBase * GOV_CONSTANTS.GOSI.SANED_EMPLOYEE_RATE * 100) / 100;
  const sanedEmployer = Math.round(gosiBase * GOV_CONSTANTS.GOSI.SANED_EMPLOYER_RATE * 100) / 100;

  return {
    gosiBase,
    employeeShare,
    employerShare,
    occupationalHazard,
    sanedEmployee,
    sanedEmployer,
    totalEmployeeDeduction: Math.round((employeeShare + sanedEmployee) * 100) / 100,
    totalEmployerCost: Math.round((employerShare + occupationalHazard + sanedEmployer) * 100) / 100,
  };
}

/**
 * حساب اشتراكات GOSI لقائمة موظفين
 * @param {Array} employees - [{basicSalary, housingAllowance, isSaudi}]
 * @returns {object} - إجماليات GOSI للمنشأة
 */
function calculateOrganizationGOSI(employees) {
  if (!Array.isArray(employees) || employees.length === 0) {
    return {
      totalEmployees: 0,
      saudiCount: 0,
      nonSaudiCount: 0,
      totalEmployeeDeductions: 0,
      totalEmployerCosts: 0,
      totalGOSI: 0,
      breakdown: [],
    };
  }

  let totalEmployeeDeductions = 0;
  let totalEmployerCosts = 0;
  let saudiCount = 0;
  let nonSaudiCount = 0;
  const breakdown = [];

  for (const emp of employees) {
    const contrib = calculateGOSIContributions(
      emp.basicSalary,
      emp.housingAllowance,
      emp.isSaudi !== false
    );

    if (emp.isSaudi !== false) saudiCount++;
    else nonSaudiCount++;

    totalEmployeeDeductions += contrib.totalEmployeeDeduction;
    totalEmployerCosts += contrib.totalEmployerCost;
    breakdown.push({
      employeeId: emp.id || emp.employeeNumber,
      isSaudi: emp.isSaudi !== false,
      ...contrib,
    });
  }

  return {
    totalEmployees: employees.length,
    saudiCount,
    nonSaudiCount,
    totalEmployeeDeductions: Math.round(totalEmployeeDeductions * 100) / 100,
    totalEmployerCosts: Math.round(totalEmployerCosts * 100) / 100,
    totalGOSI: Math.round((totalEmployeeDeductions + totalEmployerCosts) * 100) / 100,
    breakdown,
  };
}

// ========================================
// نطاقات - Saudization Calculator
// ========================================

/**
 * حساب نسبة السعودة (Saudization Rate)
 * @param {number} saudiCount - عدد الموظفين السعوديين
 * @param {number} totalCount - إجمالي الموظفين
 * @returns {object} - {rate, band, isCompliant, requiredToAdd}
 */
function calculateSaudizationRate(saudiCount, totalCount) {
  if (totalCount == null || totalCount <= 0) {
    return { rate: 0, band: 'red', isCompliant: false, requiredToAdd: 0 };
  }

  const safeCount = Math.max(0, saudiCount || 0);
  const rate = Math.round((safeCount / totalCount) * 10000) / 100;

  let band;
  if (rate >= GOV_CONSTANTS.NITAQAT.PLATINUM_MIN) band = 'platinum';
  else if (rate >= GOV_CONSTANTS.NITAQAT.GREEN_HIGH_MIN) band = 'green_high';
  else if (rate >= GOV_CONSTANTS.NITAQAT.GREEN_MID_MIN) band = 'green_mid';
  else if (rate >= GOV_CONSTANTS.NITAQAT.GREEN_LOW_MIN) band = 'green_low';
  else if (rate >= GOV_CONSTANTS.NITAQAT.YELLOW_MIN) band = 'yellow';
  else band = 'red';

  const isCompliant = ['platinum', 'green_high', 'green_mid', 'green_low'].includes(band);
  const requiredRate = GOV_CONSTANTS.NITAQAT.GREEN_LOW_MIN / 100;
  const requiredSaudis = Math.ceil(totalCount * requiredRate);
  const requiredToAdd = Math.max(0, requiredSaudis - safeCount);

  return {
    rate,
    band,
    isCompliant,
    saudiCount: safeCount,
    totalCount,
    requiredToAdd,
    targetBand: isCompliant ? null : 'green_low',
    message: _getSaudizationMessage(band, rate),
  };
}

function _getSaudizationMessage(band, rate) {
  const messages = {
    platinum: `ممتاز - نطاق بلاتيني (${rate}%)`,
    green_high: `جيد جداً - نطاق أخضر مرتفع (${rate}%)`,
    green_mid: `جيد - نطاق أخضر متوسط (${rate}%)`,
    green_low: `مقبول - نطاق أخضر منخفض (${rate}%)`,
    yellow: `تحذير - نطاق أصفر (${rate}%) - يجب التحسين`,
    red: `خطر - نطاق أحمر (${rate}%) - تجاوز الحد المسموح`,
  };
  return messages[band] || `نسبة السعودة: ${rate}%`;
}

/**
 * حساب نسبة السعودة لكل فرع/قسم
 * @param {Array} branches - [{id, saudiCount, totalCount}]
 * @returns {Array} - نتائج كل فرع
 */
function calculateOrganizationSaudization(branches) {
  if (!Array.isArray(branches) || branches.length === 0) {
    return { branches: [], overall: calculateSaudizationRate(0, 0) };
  }

  const branchResults = branches.map(b => ({
    branchId: b.id,
    branchName: b.name,
    ...calculateSaudizationRate(b.saudiCount, b.totalCount),
  }));

  // المجموع الكلي
  const totalSaudi = branches.reduce((s, b) => s + (b.saudiCount || 0), 0);
  const totalAll = branches.reduce((s, b) => s + (b.totalCount || 0), 0);
  const overall = calculateSaudizationRate(totalSaudi, totalAll);

  return { branches: branchResults, overall };
}

// ========================================
// WPS - نظام حماية الأجور
// ========================================

/**
 * التحقق من امتثال صرف الرواتب (WPS)
 * @param {Array} payrollRecords - [{employeeId, payrollMonth, paidAt, dueDate}]
 * @returns {object} - {compliantCount, violationCount, violations, complianceRate}
 */
function checkWPSCompliance(payrollRecords) {
  if (!Array.isArray(payrollRecords) || payrollRecords.length === 0) {
    return {
      compliantCount: 0,
      violationCount: 0,
      violations: [],
      complianceRate: 100,
      isCompliant: true,
    };
  }

  const violations = [];
  let compliantCount = 0;

  for (const record of payrollRecords) {
    if (!record.paidAt || !record.dueDate) {
      violations.push({
        employeeId: record.employeeId,
        reason: 'لم يتم الصرف',
        delayDays: null,
        severity: 'critical',
      });
      continue;
    }

    const dueDate = new Date(record.dueDate);
    const paidAt = new Date(record.paidAt);
    const delayDays = Math.round((paidAt - dueDate) / (1000 * 60 * 60 * 24));

    if (delayDays <= 0) {
      compliantCount++;
    } else if (delayDays <= GOV_CONSTANTS.WPS.MAX_DELAY_DAYS) {
      violations.push({
        employeeId: record.employeeId,
        reason: `تأخير ${delayDays} يوم`,
        delayDays,
        severity: delayDays >= GOV_CONSTANTS.WPS.WARNING_DAYS ? 'warning' : 'notice',
      });
    } else {
      violations.push({
        employeeId: record.employeeId,
        reason: `تأخير ${delayDays} يوم (تجاوز الحد الأقصى)`,
        delayDays,
        severity: 'critical',
      });
    }
  }

  const complianceRate =
    payrollRecords.length > 0
      ? Math.round((compliantCount / payrollRecords.length) * 10000) / 100
      : 100;

  return {
    totalRecords: payrollRecords.length,
    compliantCount,
    violationCount: violations.length,
    violations: violations.sort((a, b) => (b.delayDays || 999) - (a.delayDays || 999)),
    complianceRate,
    isCompliant: violations.filter(v => v.severity === 'critical').length === 0,
  };
}

/**
 * حساب تاريخ الاستحقاق القانوني لصرف الراتب
 * حسب نظام حماية الأجور: آخر يوم من الشهر
 * @param {string|Date} payrollMonth - شهر الراتب
 * @returns {object} - {dueDate, warningDate}
 */
function calculateWPSDueDate(payrollMonth) {
  if (!payrollMonth) {
    return { dueDate: null, warningDate: null };
  }

  const date = new Date(payrollMonth);
  if (isNaN(date.getTime())) {
    return { dueDate: null, warningDate: null };
  }

  // استخدام UTC لتفادي مشاكل المنطقة الزمنية
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth(); // 0-indexed
  // اليوم العاشر من الشهر التالي
  const dueDateUTC = new Date(Date.UTC(y, m + 1, 10));
  const warningDateUTC = new Date(Date.UTC(y, m + 1, 7)); // 10 - 3 = 7
  const maxAllowedDateUTC = new Date(Date.UTC(y, m + 1, 10 + GOV_CONSTANTS.WPS.MAX_DELAY_DAYS));

  return {
    dueDate: dueDateUTC.toISOString().split('T')[0],
    warningDate: warningDateUTC.toISOString().split('T')[0],
    maxAllowedDate: maxAllowedDateUTC.toISOString().split('T')[0],
  };
}

// ========================================
// NPHIES - نظام معلومات صحة المريض الوطني
// ========================================

/**
 * التحقق من أهلية المريض للتغطية التأمينية
 * @param {object} patientData - بيانات المريض
 * @param {object} insuranceData - بيانات التأمين
 * @returns {object} - {isEligible, coverageDetails, restrictions}
 */
function checkNPHIESEligibility(patientData, insuranceData) {
  if (!patientData || !insuranceData) {
    return { isEligible: false, reason: 'بيانات غير مكتملة', coverageDetails: null };
  }

  const today = new Date();
  const restrictions = [];

  // التحقق من انتهاء البوليصة
  if (insuranceData.expiryDate) {
    const expiry = new Date(insuranceData.expiryDate);
    if (expiry < today) {
      return {
        isEligible: false,
        reason: 'بوليصة التأمين منتهية الصلاحية',
        coverageDetails: null,
      };
    }

    const daysToExpiry = Math.round((expiry - today) / (1000 * 60 * 60 * 24));
    if (daysToExpiry <= 30) {
      restrictions.push(`بوليصة التأمين تنتهي خلال ${daysToExpiry} يوم`);
    }
  }

  // التحقق من الحد الأقصى للجلسات
  const usedSessions = insuranceData.usedSessions || 0;
  const maxSessions = insuranceData.annualSessionLimit || Infinity;
  const remainingSessions = maxSessions === Infinity ? Infinity : maxSessions - usedSessions;

  if (remainingSessions <= 0) {
    return {
      isEligible: false,
      reason: 'تجاوز الحد الأقصى للجلسات المغطاة',
      coverageDetails: null,
    };
  }

  if (remainingSessions <= 5 && remainingSessions !== Infinity) {
    restrictions.push(`تبقى ${remainingSessions} جلسة فقط في الغطاء التأميني`);
  }

  // حساب نسبة التغطية
  const coveragePercentage = insuranceData.coveragePercentage || 80;
  const deductible = insuranceData.deductibleAmount || 0;
  const copayment = insuranceData.copaymentPerSession || 0;

  return {
    isEligible: true,
    reason: null,
    restrictions,
    coverageDetails: {
      insuranceCompany: insuranceData.companyName,
      policyNumber: insuranceData.policyNumber,
      memberId: insuranceData.memberId,
      coveragePercentage,
      deductible,
      copayment,
      remainingSessions: remainingSessions === Infinity ? 'غير محدود' : remainingSessions,
      usedSessions,
      maxSessions: maxSessions === Infinity ? 'غير محدود' : maxSessions,
    },
  };
}

/**
 * حساب حصة المريض في الجلسة
 * @param {number} sessionFee - رسوم الجلسة
 * @param {object} coverageDetails - تفاصيل التغطية
 * @returns {object} - {patientShare, insuranceShare, deductibleApplied}
 */
function calculatePatientShare(sessionFee, coverageDetails) {
  if (!sessionFee || sessionFee <= 0) {
    return { patientShare: 0, insuranceShare: 0, deductibleApplied: 0 };
  }

  if (!coverageDetails) {
    return { patientShare: sessionFee, insuranceShare: 0, deductibleApplied: 0 };
  }

  const coverageRate = (coverageDetails.coveragePercentage || 80) / 100;
  const copayment = coverageDetails.copayment || 0;
  const deductible = coverageDetails.deductible || 0;

  // تطبيق التحمل (deductible) أولاً
  let remainingFee = sessionFee;
  const deductibleApplied = Math.min(deductible, remainingFee);
  remainingFee -= deductibleApplied;

  // حساب الحصة بعد التحمل
  let insuranceShare = Math.round(remainingFee * coverageRate * 100) / 100;
  let patientShare =
    Math.round((remainingFee * (1 - coverageRate) + deductibleApplied + copayment) * 100) / 100;

  return {
    sessionFee: Math.round(sessionFee * 100) / 100,
    patientShare: Math.min(sessionFee, patientShare),
    insuranceShare: Math.min(remainingFee, insuranceShare),
    deductibleApplied,
    copayment,
    coveragePercentage: coverageDetails.coveragePercentage,
  };
}

/**
 * التحقق من الحاجة للتفويض المسبق (Prior Authorization)
 * @param {string} serviceType - نوع الخدمة
 * @param {number} sessionsRequested - عدد الجلسات المطلوبة
 * @param {object} insuranceRules - قواعد شركة التأمين
 * @returns {object} - {requiresPriorAuth, reason}
 */
function checkPriorAuthRequired(serviceType, sessionsRequested, insuranceRules = {}) {
  const requiredServices = GOV_CONSTANTS.NPHIES.PRIOR_AUTH_REQUIRED_SERVICES;
  const threshold = insuranceRules.priorAuthThreshold || 10;

  const serviceRequiresPriorAuth = requiredServices.some(s =>
    serviceType?.toLowerCase().includes(s)
  );
  const quantityExceedsThreshold = sessionsRequested > threshold;

  const requiresPriorAuth = serviceRequiresPriorAuth || quantityExceedsThreshold;

  return {
    requiresPriorAuth,
    reasons: [
      ...(serviceRequiresPriorAuth ? [`الخدمة ${serviceType} تتطلب تفويضاً مسبقاً`] : []),
      ...(quantityExceedsThreshold
        ? [`عدد الجلسات ${sessionsRequested} يتجاوز الحد ${threshold}`]
        : []),
    ],
  };
}

/**
 * حساب مبلغ المطالبة التأمينية
 * @param {Array} sessions - قائمة الجلسات [{serviceType, fee, date}]
 * @param {object} coverageDetails - تفاصيل التغطية
 * @returns {object} - إجماليات المطالبة
 */
function calculateInsuranceClaim(sessions, coverageDetails) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return {
      totalFees: 0,
      claimAmount: 0,
      patientTotal: 0,
      sessionCount: 0,
    };
  }

  let totalFees = 0;
  let claimAmount = 0;
  let patientTotal = 0;
  const sessionDetails = [];

  for (const session of sessions) {
    const share = calculatePatientShare(session.fee || 0, coverageDetails);
    totalFees += share.sessionFee;
    claimAmount += share.insuranceShare;
    patientTotal += share.patientShare;

    sessionDetails.push({
      ...session,
      ...share,
    });
  }

  return {
    totalFees: Math.round(totalFees * 100) / 100,
    claimAmount: Math.round(claimAmount * 100) / 100,
    patientTotal: Math.round(patientTotal * 100) / 100,
    sessionCount: sessions.length,
    sessionDetails,
  };
}

// ========================================
// HELPERS & VALIDATORS
// ========================================

/**
 * التحقق من صحة رقم الآيبان السعودي
 * @param {string} iban
 * @returns {object} - {isValid, reason}
 */
function validateSaudiIBAN(iban) {
  if (!iban || typeof iban !== 'string') {
    return { isValid: false, reason: 'رقم الآيبان مطلوب' };
  }

  const cleaned = iban.replace(/\s/g, '').toUpperCase();

  if (!cleaned.startsWith('SA')) {
    return { isValid: false, reason: 'الآيبان السعودي يجب أن يبدأ بـ SA' };
  }

  if (cleaned.length !== 24) {
    return { isValid: false, reason: 'الآيبان السعودي يجب أن يكون 24 حرفاً' };
  }

  if (!/^SA\d{22}$/.test(cleaned)) {
    return { isValid: false, reason: 'صيغة الآيبان غير صحيحة: SA + 22 رقم' };
  }

  return { isValid: true, reason: null, formatted: cleaned };
}

/**
 * التحقق من صحة رقم الهوية الوطنية
 * @param {string} nationalId
 * @returns {object} - {isValid, type, reason}
 */
function validateNationalId(nationalId) {
  if (!nationalId || typeof nationalId !== 'string') {
    return { isValid: false, type: null, reason: 'رقم الهوية مطلوب' };
  }

  const cleaned = nationalId.trim();

  if (!/^\d{10}$/.test(cleaned)) {
    return { isValid: false, type: null, reason: 'رقم الهوية يجب أن يكون 10 أرقام' };
  }

  const firstDigit = cleaned[0];
  if (firstDigit === '1') {
    return { isValid: true, type: 'national', reason: null, description: 'هوية وطنية سعودية' };
  } else if (firstDigit === '2') {
    return { isValid: true, type: 'iqama', reason: null, description: 'إقامة' };
  }

  return { isValid: false, type: null, reason: 'الرقم الأول يجب أن يكون 1 (مواطن) أو 2 (مقيم)' };
}

/**
 * حساب تاريخ انتهاء تأشيرة عمل المعالجين
 * @param {string} issueDate - تاريخ الإصدار
 * @param {string} visaType - 'work' | 'dependent'
 * @returns {object}
 */
function calculateVisaExpiry(issueDate, visaType = 'work') {
  if (!issueDate) {
    return { expiryDate: null, daysRemaining: null, requiresRenewal: false };
  }

  const issue = new Date(issueDate);
  if (isNaN(issue.getTime())) {
    return { expiryDate: null, daysRemaining: null, requiresRenewal: false };
  }

  const validityYears = visaType === 'work' ? 2 : 1;
  const expiry = new Date(issue);
  expiry.setFullYear(expiry.getFullYear() + validityYears);

  const today = new Date();
  const daysRemaining = Math.round((expiry - today) / (1000 * 60 * 60 * 24));

  return {
    expiryDate: expiry.toISOString().split('T')[0],
    daysRemaining,
    requiresRenewal: daysRemaining <= 90,
    isExpired: daysRemaining < 0,
    urgency:
      daysRemaining < 0
        ? 'expired'
        : daysRemaining <= 30
          ? 'critical'
          : daysRemaining <= 90
            ? 'warning'
            : 'ok',
  };
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
  GOV_CONSTANTS,
  // ZATCA
  calculateVAT,
  calculateInvoiceTotals,
  encodeTLVForQR,
  validateVATNumber,
  generateInvoiceUUID,
  determineZATCAInvoiceType,
  calculateRehabServiceVAT,
  // GOSI
  calculateGOSIContributions,
  calculateOrganizationGOSI,
  // Nitaqat / Saudization
  calculateSaudizationRate,
  calculateOrganizationSaudization,
  // WPS
  checkWPSCompliance,
  calculateWPSDueDate,
  // NPHIES
  checkNPHIESEligibility,
  calculatePatientShare,
  checkPriorAuthRequired,
  calculateInsuranceClaim,
  // Validators
  validateSaudiIBAN,
  validateNationalId,
  calculateVisaExpiry,
};

/**
 * Government Integrations Calculations Tests
 * ZATCA + GOSI + NPHIES + نطاقات/WPS
 * Pure Unit Tests - No DB
 * نظام AlAwael ERP
 */

'use strict';

const {
  GOV_CONSTANTS,
  calculateVAT,
  calculateInvoiceTotals,
  encodeTLVForQR,
  validateVATNumber,
  generateInvoiceUUID,
  determineZATCAInvoiceType,
  calculateRehabServiceVAT,
  calculateGOSIContributions,
  calculateOrganizationGOSI,
  calculateSaudizationRate,
  calculateOrganizationSaudization,
  checkWPSCompliance,
  calculateWPSDueDate,
  checkNPHIESEligibility,
  calculatePatientShare,
  checkPriorAuthRequired,
  calculateInsuranceClaim,
  validateSaudiIBAN,
  validateNationalId,
  calculateVisaExpiry,
} = require('../services/integrations/governmentCalculations.service');

// ========================================
// GOV_CONSTANTS
// ========================================
describe('GOV_CONSTANTS', () => {
  test('نسبة ضريبة القيمة المضافة 15%', () => {
    expect(GOV_CONSTANTS.ZATCA.VAT_RATE).toBe(0.15);
  });

  test('نسبة GOSI للموظف السعودي 9%', () => {
    expect(GOV_CONSTANTS.GOSI.SAUDI_EMPLOYEE_RATE).toBe(0.09);
  });

  test('سقف وعاء GOSI 45000', () => {
    expect(GOV_CONSTANTS.GOSI.SALARY_CAP).toBe(45000);
  });

  test('حد السعودة البلاتيني 40%', () => {
    expect(GOV_CONSTANTS.NITAQAT.PLATINUM_MIN).toBe(40);
  });

  test('أقصى تأخير WPS 10 أيام', () => {
    expect(GOV_CONSTANTS.WPS.MAX_DELAY_DAYS).toBe(10);
  });
});

// ========================================
// calculateVAT - ضريبة القيمة المضافة
// ========================================
describe('calculateVAT', () => {
  test('1000 ريال standard → 150 ضريبة + 1150 إجمالي', () => {
    const result = calculateVAT(1000, 'standard');
    expect(result.vatAmount).toBe(150);
    expect(result.totalAmount).toBe(1150);
    expect(result.vatRate).toBe(15);
  });

  test('خدمة معفاة → لا ضريبة', () => {
    const result = calculateVAT(1000, 'exempt');
    expect(result.vatAmount).toBe(0);
    expect(result.totalAmount).toBe(1000);
  });

  test('صفري الضريبة → لا ضريبة', () => {
    const result = calculateVAT(500, 'zero_rated');
    expect(result.vatAmount).toBe(0);
    expect(result.totalAmount).toBe(500);
  });

  test('null → صفر', () => {
    const result = calculateVAT(null);
    expect(result.vatAmount).toBe(0);
    expect(result.totalAmount).toBe(0);
  });

  test('قيمة سالبة → صفر', () => {
    const result = calculateVAT(-100);
    expect(result.vatAmount).toBe(0);
  });

  test('افتراضي = standard', () => {
    const result = calculateVAT(200);
    expect(result.vatRate).toBe(15);
    expect(result.vatAmount).toBe(30);
  });

  test('دقة التقريب للكسور', () => {
    const result = calculateVAT(333.33, 'standard');
    expect(result.vatAmount).toBe(50);
    expect(result.totalAmount).toBe(383.33);
  });
});

// ========================================
// calculateInvoiceTotals - إجماليات الفاتورة
// ========================================
describe('calculateInvoiceTotals', () => {
  test('عنصر واحد standard', () => {
    const result = calculateInvoiceTotals([
      { unitPrice: 500, quantity: 2, vatCategory: 'standard' },
    ]);
    expect(result.subtotal).toBe(1000);
    expect(result.vatAmount).toBe(150);
    expect(result.totalAmount).toBe(1150);
  });

  test('عناصر مختلطة: standard + exempt', () => {
    const result = calculateInvoiceTotals([
      { unitPrice: 500, quantity: 1, vatCategory: 'standard' },
      { unitPrice: 300, quantity: 1, vatCategory: 'exempt' },
    ]);
    expect(result.taxableAmount).toBe(500);
    expect(result.exemptAmount).toBe(300);
    expect(result.vatAmount).toBe(75);
    expect(result.totalAmount).toBe(875);
  });

  test('خصم نسبة مئوية', () => {
    const result = calculateInvoiceTotals([
      {
        unitPrice: 1000,
        quantity: 1,
        discount: 10,
        discountType: 'percentage',
        vatCategory: 'standard',
      },
    ]);
    expect(result.discountTotal).toBe(100);
    expect(result.taxableAmount).toBe(900);
    expect(result.vatAmount).toBe(135);
  });

  test('خصم ثابت', () => {
    const result = calculateInvoiceTotals([
      {
        unitPrice: 1000,
        quantity: 1,
        discount: 100,
        discountType: 'fixed',
        vatCategory: 'standard',
      },
    ]);
    expect(result.discountTotal).toBe(100);
    expect(result.taxableAmount).toBe(900);
  });

  test('مصفوفة فارغة → أصفار', () => {
    const result = calculateInvoiceTotals([]);
    expect(result.totalAmount).toBe(0);
    expect(result.vatAmount).toBe(0);
  });

  test('zero_rated منفصل', () => {
    const result = calculateInvoiceTotals([
      { unitPrice: 200, quantity: 1, vatCategory: 'zero_rated' },
    ]);
    expect(result.zeroRatedAmount).toBe(200);
    expect(result.vatAmount).toBe(0);
  });
});

// ========================================
// encodeTLVForQR - ترميز QR Code
// ========================================
describe('encodeTLVForQR', () => {
  test('يُنتج Base64 صحيح', () => {
    const result = encodeTLVForQR({
      sellerName: 'مركز الأوائل',
      vatNumber: '300000000000003',
      timestamp: '2026-01-01T10:00:00Z',
      totalAmount: '1150.00',
      vatAmount: '150.00',
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Base64 يحتوي فقط على هذه الأحرف
    expect(result).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  test('null → سلسلة فارغة', () => {
    expect(encodeTLVForQR(null)).toBe('');
  });

  test('بيانات مختلفة → نتائج مختلفة', () => {
    const r1 = encodeTLVForQR({ sellerName: 'مركز أ', totalAmount: '100', vatAmount: '15' });
    const r2 = encodeTLVForQR({ sellerName: 'مركز ب', totalAmount: '200', vatAmount: '30' });
    expect(r1).not.toBe(r2);
  });
});

// ========================================
// validateVATNumber - التحقق من الرقم الضريبي
// ========================================
describe('validateVATNumber', () => {
  test('رقم ضريبي صحيح 15 رقم يبدأ وينتهي بـ 3', () => {
    const result = validateVATNumber('300000000000003');
    expect(result.isValid).toBe(true);
    expect(result.reason).toBeNull();
  });

  test('أقل من 15 رقم → خطأ', () => {
    const result = validateVATNumber('30000000000000');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('15 رقماً');
  });

  test('لا يبدأ بـ 3 → خطأ', () => {
    const result = validateVATNumber('100000000000003');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('3');
  });

  test('لا ينتهي بـ 3 → خطأ', () => {
    const result = validateVATNumber('300000000000001');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('3');
  });

  test('null → خطأ', () => {
    const result = validateVATNumber(null);
    expect(result.isValid).toBe(false);
  });
});

// ========================================
// generateInvoiceUUID
// ========================================
describe('generateInvoiceUUID', () => {
  test('يُنتج UUID بالصيغة الصحيحة', () => {
    const uuid = generateInvoiceUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('كل استدعاء ينتج UUID فريد', () => {
    const uuids = new Set(Array.from({ length: 10 }, () => generateInvoiceUUID()));
    expect(uuids.size).toBe(10);
  });
});

// ========================================
// determineZATCAInvoiceType
// ========================================
describe('determineZATCAInvoiceType', () => {
  test('B2C → فاتورة مبسطة reporting', () => {
    const result = determineZATCAInvoiceType(500, 'B2C');
    expect(result.invoiceType).toBe('simplified');
    expect(result.clearanceRequired).toBe(false);
    expect(result.processingMode).toBe('reporting');
  });

  test('B2B + مبلغ عالٍ → فاتورة قياسية clearance', () => {
    const result = determineZATCAInvoiceType(5000, 'B2B');
    expect(result.invoiceType).toBe('standard');
    expect(result.clearanceRequired).toBe(true);
    expect(result.processingMode).toBe('clearance');
  });

  test('B2B + مبلغ أقل من 1000 → reporting فقط', () => {
    const result = determineZATCAInvoiceType(500, 'B2B');
    expect(result.clearanceRequired).toBe(false);
  });

  test('reportingRequired دائماً true', () => {
    expect(determineZATCAInvoiceType(100, 'B2C').reportingRequired).toBe(true);
    expect(determineZATCAInvoiceType(5000, 'B2B').reportingRequired).toBe(true);
  });
});

// ========================================
// calculateRehabServiceVAT
// ========================================
describe('calculateRehabServiceVAT', () => {
  test('خدمة تأهيل عادية → ضريبة 15%', () => {
    const result = calculateRehabServiceVAT('physiotherapy', 1000);
    expect(result.vatAmount).toBe(150);
    expect(result.vatCategory).toBe('standard');
  });

  test('غسيل كلى → معفى', () => {
    const result = calculateRehabServiceVAT('dialysis', 500);
    expect(result.vatAmount).toBe(0);
    expect(result.vatCategory).toBe('exempt');
  });

  test('طوارئ → معفى', () => {
    const result = calculateRehabServiceVAT('emergency', 800);
    expect(result.vatAmount).toBe(0);
  });
});

// ========================================
// calculateGOSIContributions - GOSI
// ========================================
describe('calculateGOSIContributions', () => {
  test('موظف سعودي: 10000 أساسي + 2500 سكن', () => {
    const result = calculateGOSIContributions(10000, 2500, true);
    expect(result.gosiBase).toBe(12500);
    expect(result.employeeShare).toBe(1125); // 12500 × 9%
    expect(result.employerShare).toBe(1125);
    expect(result.occupationalHazard).toBe(250); // 12500 × 2%
    expect(result.sanedEmployee).toBeCloseTo(93.75, 1);
    expect(result.sanedEmployer).toBeCloseTo(93.75, 1);
    expect(result.totalEmployeeDeduction).toBeCloseTo(1218.75, 1);
  });

  test('موظف غير سعودي: لا حصة موظف', () => {
    const result = calculateGOSIContributions(8000, 2000, false);
    expect(result.employeeShare).toBe(0);
    expect(result.sanedEmployee).toBe(0);
    expect(result.totalEmployeeDeduction).toBe(0);
    expect(result.occupationalHazard).toBe(200); // 10000 × 2%
  });

  test('سقف الراتب 45000', () => {
    const result = calculateGOSIContributions(40000, 10000, true);
    expect(result.gosiBase).toBe(45000); // مقيد بالسقف
    expect(result.employeeShare).toBe(4050); // 45000 × 9%
  });

  test('راتب null → أصفار', () => {
    const result = calculateGOSIContributions(null);
    expect(result.gosiBase).toBe(0);
    expect(result.totalEmployeeDeduction).toBe(0);
  });

  test('بدون سكن → أساسي فقط', () => {
    const result = calculateGOSIContributions(5000, 0, true);
    expect(result.gosiBase).toBe(5000);
    expect(result.employeeShare).toBe(450);
  });
});

// ========================================
// calculateOrganizationGOSI
// ========================================
describe('calculateOrganizationGOSI', () => {
  test('قائمة ممزوجة من سعوديين وغير سعوديين', () => {
    const employees = [
      { id: 'e1', basicSalary: 10000, housingAllowance: 2000, isSaudi: true },
      { id: 'e2', basicSalary: 8000, housingAllowance: 0, isSaudi: false },
      { id: 'e3', basicSalary: 6000, housingAllowance: 1500, isSaudi: true },
    ];
    const result = calculateOrganizationGOSI(employees);
    expect(result.totalEmployees).toBe(3);
    expect(result.saudiCount).toBe(2);
    expect(result.nonSaudiCount).toBe(1);
    expect(result.totalEmployeeDeductions).toBeGreaterThan(0);
    expect(result.breakdown).toHaveLength(3);
  });

  test('مصفوفة فارغة → أصفار', () => {
    const result = calculateOrganizationGOSI([]);
    expect(result.totalGOSI).toBe(0);
    expect(result.breakdown).toHaveLength(0);
  });
});

// ========================================
// calculateSaudizationRate - نطاقات
// ========================================
describe('calculateSaudizationRate', () => {
  test('50% سعودة → بلاتيني', () => {
    const result = calculateSaudizationRate(10, 20);
    expect(result.rate).toBe(50);
    expect(result.band).toBe('platinum');
    expect(result.isCompliant).toBe(true);
  });

  test('25% → أخضر منخفض', () => {
    const result = calculateSaudizationRate(5, 20);
    expect(result.band).toBe('green_low');
    expect(result.isCompliant).toBe(true);
    expect(result.requiredToAdd).toBe(0);
  });

  test('20% → أصفر', () => {
    const result = calculateSaudizationRate(2, 10);
    expect(result.band).toBe('yellow');
    expect(result.isCompliant).toBe(false);
  });

  test('0% → أحمر', () => {
    const result = calculateSaudizationRate(0, 20);
    expect(result.band).toBe('red');
    expect(result.isCompliant).toBe(false);
    expect(result.requiredToAdd).toBeGreaterThan(0);
  });

  test('بدون موظفين → أحمر', () => {
    const result = calculateSaudizationRate(0, 0);
    expect(result.band).toBe('red');
    expect(result.isCompliant).toBe(false);
  });

  test('الرسالة تحتوي على النسبة', () => {
    const result = calculateSaudizationRate(8, 20);
    expect(result.message).toContain('%');
  });
});

// ========================================
// calculateOrganizationSaudization
// ========================================
describe('calculateOrganizationSaudization', () => {
  test('فروع متعددة → إجمالي وتفاصيل', () => {
    const branches = [
      { id: 'b1', name: 'الرياض', saudiCount: 10, totalCount: 20 },
      { id: 'b2', name: 'جدة', saudiCount: 5, totalCount: 15 },
    ];
    const result = calculateOrganizationSaudization(branches);
    expect(result.branches).toHaveLength(2);
    expect(result.overall.saudiCount).toBe(15);
    expect(result.overall.totalCount).toBe(35);
  });

  test('فارغ → إجمالي أحمر', () => {
    const result = calculateOrganizationSaudization([]);
    expect(result.branches).toHaveLength(0);
    expect(result.overall.band).toBe('red');
  });
});

// ========================================
// checkWPSCompliance - حماية الأجور
// ========================================
describe('checkWPSCompliance', () => {
  test('كل الرواتب في الوقت → 100% امتثال', () => {
    const records = [
      { employeeId: 'e1', dueDate: '2026-01-10', paidAt: '2026-01-08' },
      { employeeId: 'e2', dueDate: '2026-01-10', paidAt: '2026-01-10' },
    ];
    const result = checkWPSCompliance(records);
    expect(result.complianceRate).toBe(100);
    expect(result.isCompliant).toBe(true);
    expect(result.violationCount).toBe(0);
  });

  test('تأخير يتجاوز 10 أيام → مخالفة حرجة', () => {
    const records = [
      { employeeId: 'e1', dueDate: '2026-01-10', paidAt: '2026-01-25' }, // 15 يوم
    ];
    const result = checkWPSCompliance(records);
    expect(result.isCompliant).toBe(false);
    const critical = result.violations.find(v => v.severity === 'critical');
    expect(critical).toBeDefined();
  });

  test('تأخير 7 أيام → تحذير', () => {
    const records = [{ employeeId: 'e1', dueDate: '2026-01-10', paidAt: '2026-01-17' }];
    const result = checkWPSCompliance(records);
    expect(result.violations[0].severity).toBe('warning');
  });

  test('لم يُدفع بعد → مخالفة حرجة', () => {
    const records = [{ employeeId: 'e1', dueDate: '2026-01-10', paidAt: null }];
    const result = checkWPSCompliance(records);
    expect(result.violations[0].severity).toBe('critical');
  });

  test('فارغة → 100% امتثال', () => {
    const result = checkWPSCompliance([]);
    expect(result.complianceRate).toBe(100);
    expect(result.isCompliant).toBe(true);
  });

  test('المخالفات مرتبة تنازلياً حسب التأخير', () => {
    const records = [
      { employeeId: 'e1', dueDate: '2026-01-10', paidAt: '2026-01-15' }, // 5 أيام
      { employeeId: 'e2', dueDate: '2026-01-10', paidAt: '2026-01-25' }, // 15 يوم
      { employeeId: 'e3', dueDate: '2026-01-10', paidAt: '2026-01-13' }, // 3 أيام
    ];
    const result = checkWPSCompliance(records);
    expect(result.violations[0].delayDays).toBeGreaterThanOrEqual(result.violations[1].delayDays);
  });
});

// ========================================
// calculateWPSDueDate
// ========================================
describe('calculateWPSDueDate', () => {
  test('يناير 2026 → استحقاق 10 فبراير', () => {
    const result = calculateWPSDueDate('2026-01-01');
    expect(result.dueDate).toBe('2026-02-10');
  });

  test('الحد الأقصى + 10 أيام', () => {
    const result = calculateWPSDueDate('2026-01-01');
    expect(result.maxAllowedDate).toBe('2026-02-20');
  });

  test('تاريخ التحذير = يوم الاستحقاق - 3', () => {
    const result = calculateWPSDueDate('2026-01-01');
    expect(result.warningDate).toBe('2026-02-07');
  });

  test('null → null', () => {
    const result = calculateWPSDueDate(null);
    expect(result.dueDate).toBeNull();
  });

  test('تاريخ غير صحيح → null', () => {
    const result = calculateWPSDueDate('invalid-date');
    expect(result.dueDate).toBeNull();
  });
});

// ========================================
// checkNPHIESEligibility - أهلية NPHIES
// ========================================
describe('checkNPHIESEligibility', () => {
  test('بوليصة نشطة وجلسات متبقية → مؤهل', () => {
    const result = checkNPHIESEligibility(
      { id: 'p1', name: 'أحمد' },
      {
        expiryDate: '2027-01-01',
        usedSessions: 10,
        annualSessionLimit: 50,
        coveragePercentage: 80,
      }
    );
    expect(result.isEligible).toBe(true);
    expect(result.coverageDetails.remainingSessions).toBe(40);
  });

  test('بوليصة منتهية → غير مؤهل', () => {
    const result = checkNPHIESEligibility(
      { id: 'p1' },
      { expiryDate: '2020-01-01', usedSessions: 0 }
    );
    expect(result.isEligible).toBe(false);
    expect(result.reason).toContain('منتهية');
  });

  test('تجاوز حد الجلسات → غير مؤهل', () => {
    const result = checkNPHIESEligibility(
      { id: 'p1' },
      { expiryDate: '2027-01-01', usedSessions: 50, annualSessionLimit: 50 }
    );
    expect(result.isEligible).toBe(false);
    expect(result.reason).toContain('الحد الأقصى');
  });

  test('null → غير مؤهل', () => {
    const result = checkNPHIESEligibility(null, null);
    expect(result.isEligible).toBe(false);
  });

  test('تحذير عند تبقي 3 جلسات فقط', () => {
    const result = checkNPHIESEligibility(
      { id: 'p1' },
      { expiryDate: '2027-01-01', usedSessions: 47, annualSessionLimit: 50 }
    );
    expect(result.isEligible).toBe(true);
    expect(result.restrictions.length).toBeGreaterThan(0);
    expect(result.restrictions[0]).toContain('جلسة');
  });
});

// ========================================
// calculatePatientShare - حصة المريض
// ========================================
describe('calculatePatientShare', () => {
  test('تغطية 80% بدون تحمل', () => {
    const result = calculatePatientShare(1000, {
      coveragePercentage: 80,
      deductible: 0,
      copayment: 0,
    });
    expect(result.insuranceShare).toBe(800);
    expect(result.patientShare).toBe(200);
  });

  test('مع تحمل (deductible) 200', () => {
    const result = calculatePatientShare(1000, {
      coveragePercentage: 80,
      deductible: 200,
      copayment: 0,
    });
    // 200 تحمل + 800 × 20% = 200 + 160 = 360
    expect(result.deductibleApplied).toBe(200);
    expect(result.patientShare).toBeGreaterThan(200);
  });

  test('بدون تغطية → كل المبلغ على المريض', () => {
    const result = calculatePatientShare(1000, null);
    expect(result.patientShare).toBe(1000);
    expect(result.insuranceShare).toBe(0);
  });

  test('رسوم صفر → أصفار', () => {
    const result = calculatePatientShare(0, { coveragePercentage: 80 });
    expect(result.patientShare).toBe(0);
    expect(result.insuranceShare).toBe(0);
  });
});

// ========================================
// checkPriorAuthRequired - التفويض المسبق
// ========================================
describe('checkPriorAuthRequired', () => {
  test('خدمة تأهيل → يتطلب تفويض', () => {
    const result = checkPriorAuthRequired('rehabilitation_therapy', 5);
    expect(result.requiresPriorAuth).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test('خدمة عادية + جلسات قليلة → لا يتطلب', () => {
    const result = checkPriorAuthRequired('general_checkup', 5);
    expect(result.requiresPriorAuth).toBe(false);
  });

  test('جلسات كثيرة تتجاوز العتبة → يتطلب', () => {
    const result = checkPriorAuthRequired('general_checkup', 15);
    expect(result.requiresPriorAuth).toBe(true);
    expect(result.reasons.some(r => r.includes('يتجاوز'))).toBe(true);
  });

  test('عتبة مخصصة', () => {
    const result = checkPriorAuthRequired('general_checkup', 8, { priorAuthThreshold: 5 });
    expect(result.requiresPriorAuth).toBe(true);
  });
});

// ========================================
// calculateInsuranceClaim - المطالبة التأمينية
// ========================================
describe('calculateInsuranceClaim', () => {
  const coverage = { coveragePercentage: 80, deductible: 0, copayment: 0 };

  test('3 جلسات × 500 ريال', () => {
    const sessions = [
      { serviceType: 'pt', fee: 500, date: '2026-01-01' },
      { serviceType: 'pt', fee: 500, date: '2026-01-08' },
      { serviceType: 'pt', fee: 500, date: '2026-01-15' },
    ];
    const result = calculateInsuranceClaim(sessions, coverage);
    expect(result.sessionCount).toBe(3);
    expect(result.totalFees).toBe(1500);
    expect(result.claimAmount).toBe(1200); // 80%
    expect(result.patientTotal).toBe(300); // 20%
  });

  test('مصفوفة فارغة → أصفار', () => {
    const result = calculateInsuranceClaim([], coverage);
    expect(result.totalFees).toBe(0);
    expect(result.claimAmount).toBe(0);
  });

  test('تفاصيل الجلسات محسوبة', () => {
    const sessions = [{ fee: 400, serviceType: 'ot' }];
    const result = calculateInsuranceClaim(sessions, coverage);
    expect(result.sessionDetails).toHaveLength(1);
    expect(result.sessionDetails[0].insuranceShare).toBe(320);
  });
});

// ========================================
// validateSaudiIBAN - التحقق من الآيبان
// ========================================
describe('validateSaudiIBAN', () => {
  test('آيبان سعودي صحيح SA + 22 رقم', () => {
    const result = validateSaudiIBAN('SA0380000000608010167519');
    expect(result.isValid).toBe(true);
  });

  test('لا يبدأ بـ SA → خطأ', () => {
    const result = validateSaudiIBAN('GB0380000000608010167519');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('SA');
  });

  test('طول غير صحيح → خطأ', () => {
    const result = validateSaudiIBAN('SA038000000060801');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('24');
  });

  test('يحتوي على حروف → خطأ', () => {
    const result = validateSaudiIBAN('SA03800000006080ABCD7519');
    expect(result.isValid).toBe(false);
  });

  test('null → خطأ', () => {
    expect(validateSaudiIBAN(null).isValid).toBe(false);
  });

  test('مسافات تُزال', () => {
    const result = validateSaudiIBAN('SA03 8000 0000 6080 1016 7519');
    expect(result.isValid).toBe(true);
  });
});

// ========================================
// validateNationalId - التحقق من الهوية
// ========================================
describe('validateNationalId', () => {
  test('هوية وطنية تبدأ بـ 1', () => {
    const result = validateNationalId('1234567890');
    expect(result.isValid).toBe(true);
    expect(result.type).toBe('national');
  });

  test('إقامة تبدأ بـ 2', () => {
    const result = validateNationalId('2345678901');
    expect(result.isValid).toBe(true);
    expect(result.type).toBe('iqama');
  });

  test('أقل من 10 أرقام → خطأ', () => {
    const result = validateNationalId('123456789');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('10');
  });

  test('يبدأ بـ 3 → خطأ', () => {
    const result = validateNationalId('3123456789');
    expect(result.isValid).toBe(false);
  });

  test('null → خطأ', () => {
    expect(validateNationalId(null).isValid).toBe(false);
  });
});

// ========================================
// calculateVisaExpiry
// ========================================
describe('calculateVisaExpiry', () => {
  test('تأشيرة عمل → صلاحية سنتان', () => {
    const result = calculateVisaExpiry('2024-01-01', 'work');
    expect(result.expiryDate).toBe('2026-01-01');
  });

  test('تأشيرة مرافق → صلاحية سنة', () => {
    const result = calculateVisaExpiry('2025-01-01', 'dependent');
    expect(result.expiryDate).toBe('2026-01-01');
  });

  test('تأشيرة منتهية → isExpired', () => {
    const result = calculateVisaExpiry('2020-01-01', 'work');
    expect(result.isExpired).toBe(true);
    expect(result.urgency).toBe('expired');
  });

  test('تنتهي خلال 30 يوم → critical', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 20);
    const issueDate = new Date(soon);
    issueDate.setFullYear(issueDate.getFullYear() - 2);
    const result = calculateVisaExpiry(issueDate.toISOString().split('T')[0], 'work');
    expect(['critical', 'warning']).toContain(result.urgency);
    expect(result.requiresRenewal).toBe(true);
  });

  test('null → null', () => {
    const result = calculateVisaExpiry(null);
    expect(result.expiryDate).toBeNull();
  });
});

// ========================================
// Integration Scenarios
// ========================================
describe('Integration Scenarios', () => {
  test('سيناريو: فاتورة تأهيل كاملة مع ZATCA', () => {
    // حساب الفاتورة
    const items = [
      { unitPrice: 450, quantity: 4, vatCategory: 'standard', description: 'جلسات علاج طبيعي' },
      { unitPrice: 300, quantity: 2, vatCategory: 'standard', description: 'جلسات علاج وظيفي' },
    ];
    const totals = calculateInvoiceTotals(items);
    expect(totals.subtotal).toBe(2400);
    expect(totals.vatAmount).toBe(360);
    expect(totals.totalAmount).toBe(2760);

    // توليد QR
    const vatValidation = validateVATNumber('300000000000003');
    expect(vatValidation.isValid).toBe(true);

    const qr = encodeTLVForQR({
      sellerName: 'مركز الأوائل للتأهيل',
      vatNumber: vatValidation.formatted,
      totalAmount: totals.totalAmount.toString(),
      vatAmount: totals.vatAmount.toString(),
    });
    expect(qr.length).toBeGreaterThan(0);

    // تحديد نوع الفاتورة
    const invoiceType = determineZATCAInvoiceType(totals.totalAmount, 'B2C');
    expect(invoiceType.invoiceType).toBe('simplified');
    expect(invoiceType.reportingRequired).toBe(true);
  });

  test('سيناريو: كشف رواتب شهري مع GOSI ونطاقات', () => {
    const employees = [
      { id: 'e1', basicSalary: 12000, housingAllowance: 3000, isSaudi: true },
      { id: 'e2', basicSalary: 8000, housingAllowance: 2000, isSaudi: true },
      { id: 'e3', basicSalary: 6000, housingAllowance: 0, isSaudi: false },
      { id: 'e4', basicSalary: 5000, housingAllowance: 0, isSaudi: false },
    ];

    // GOSI
    const gosiSummary = calculateOrganizationGOSI(employees);
    expect(gosiSummary.saudiCount).toBe(2);
    expect(gosiSummary.nonSaudiCount).toBe(2);
    expect(gosiSummary.totalGOSI).toBeGreaterThan(0);

    // نطاقات
    const saudization = calculateSaudizationRate(2, 4);
    expect(saudization.rate).toBe(50);
    expect(saudization.band).toBe('platinum');
    expect(saudization.isCompliant).toBe(true);
  });

  test('سيناريو: مطالبة تأمينية لمستفيد', () => {
    // التحقق من الأهلية
    const eligibility = checkNPHIESEligibility(
      { id: 'b1', name: 'فيصل' },
      {
        expiryDate: '2027-06-30',
        usedSessions: 20,
        annualSessionLimit: 60,
        coveragePercentage: 85,
        deductibleAmount: 100,
        copaymentPerSession: 50,
      }
    );
    expect(eligibility.isEligible).toBe(true);
    expect(eligibility.coverageDetails.remainingSessions).toBe(40);

    // التحقق من التفويض المسبق
    const priorAuth = checkPriorAuthRequired('rehabilitation', 15);
    expect(priorAuth.requiresPriorAuth).toBe(true);

    // حساب المطالبة
    const sessions = Array(5).fill({ fee: 400, serviceType: 'rehabilitation' });
    const claim = calculateInsuranceClaim(sessions, eligibility.coverageDetails);
    expect(claim.sessionCount).toBe(5);
    expect(claim.totalFees).toBe(2000);
  });

  test('سيناريو: امتثال WPS ونطاقات وصلاحية الهوية', () => {
    // WPS
    const payrollRecords = [
      { employeeId: 'e1', dueDate: '2026-02-10', paidAt: '2026-02-09' },
      { employeeId: 'e2', dueDate: '2026-02-10', paidAt: '2026-02-10' },
      { employeeId: 'e3', dueDate: '2026-02-10', paidAt: '2026-02-12' }, // تأخير 2 يوم
    ];
    const wps = checkWPSCompliance(payrollRecords);
    expect(wps.compliantCount).toBe(2);
    expect(wps.isCompliant).toBe(true); // التأخير أقل من 10 أيام
    expect(wps.complianceRate).toBeGreaterThan(60);

    // تاريخ الاستحقاق
    const dueDate = calculateWPSDueDate('2026-03-01');
    expect(dueDate.dueDate).toBe('2026-04-10');

    // التحقق من الهويات
    const nationalIdCheck = validateNationalId('1098765432');
    expect(nationalIdCheck.isValid).toBe(true);
    expect(nationalIdCheck.type).toBe('national');

    const ibanCheck = validateSaudiIBAN('SA0380000000608010167519');
    expect(ibanCheck.isValid).toBe(true);
  });
});

/**
 * اختبارات خدمة حسابات نظام العمل السعودي
 * Saudi Labor Law Calculations - Pure Unit Tests (No DB)
 */

'use strict';

const {
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
} = require('../services/hr/saudiLaborCalculations.service');

// ========================================================
// 1. اختبارات الثوابت
// ========================================================
describe('الثوابت', () => {
  test('GOSI_SAUDI_EMPLOYEE_RATE = 0.09', () => {
    expect(GOSI_SAUDI_EMPLOYEE_RATE).toBe(0.09);
  });

  test('GOSI_SAUDI_EMPLOYER_RATE = 0.09', () => {
    expect(GOSI_SAUDI_EMPLOYER_RATE).toBe(0.09);
  });

  test('GOSI_OCCUPATIONAL_HAZARD_RATE = 0.02', () => {
    expect(GOSI_OCCUPATIONAL_HAZARD_RATE).toBe(0.02);
  });

  test('GOSI_NON_SAUDI_EMPLOYEE_RATE = 0', () => {
    expect(GOSI_NON_SAUDI_EMPLOYEE_RATE).toBe(0);
  });

  test('GOSI_NON_SAUDI_EMPLOYER_RATE = 0.02', () => {
    expect(GOSI_NON_SAUDI_EMPLOYER_RATE).toBe(0.02);
  });

  test('GOSI_MAX_BASE = 45000', () => {
    expect(GOSI_MAX_BASE).toBe(45000);
  });

  test('SANED_EMPLOYEE_RATE = 0.0075', () => {
    expect(SANED_EMPLOYEE_RATE).toBe(0.0075);
  });

  test('SANED_EMPLOYER_RATE = 0.0075', () => {
    expect(SANED_EMPLOYER_RATE).toBe(0.0075);
  });

  test('WORKING_DAYS_PER_MONTH = 30', () => {
    expect(WORKING_DAYS_PER_MONTH).toBe(30);
  });

  test('MINIMUM_WAGE_SAUDI = 4000', () => {
    expect(MINIMUM_WAGE_SAUDI).toBe(4000);
  });

  test('ANNUAL_LEAVE_LESS_THAN_5_YEARS = 21', () => {
    expect(ANNUAL_LEAVE_LESS_THAN_5_YEARS).toBe(21);
  });

  test('ANNUAL_LEAVE_5_YEARS_OR_MORE = 30', () => {
    expect(ANNUAL_LEAVE_5_YEARS_OR_MORE).toBe(30);
  });

  test('ANNUAL_LEAVE_THRESHOLD_YEARS = 5', () => {
    expect(ANNUAL_LEAVE_THRESHOLD_YEARS).toBe(5);
  });

  test('OVERTIME_RATE_MULTIPLIER = 1.5', () => {
    expect(OVERTIME_RATE_MULTIPLIER).toBe(1.5);
  });

  test('MAX_OVERTIME_HOURS_ANNUAL = 720', () => {
    expect(MAX_OVERTIME_HOURS_ANNUAL).toBe(720);
  });

  test('EOS_RESIGNATION_FACTORS: أقل من سنتين = 0', () => {
    expect(EOS_RESIGNATION_FACTORS.LESS_THAN_2_YEARS).toBe(0);
  });

  test('EOS_RESIGNATION_FACTORS: 2-5 سنوات = 1/3', () => {
    expect(EOS_RESIGNATION_FACTORS.TWO_TO_FIVE_YEARS).toBeCloseTo(1 / 3, 5);
  });

  test('EOS_RESIGNATION_FACTORS: 5-10 سنوات = 2/3', () => {
    expect(EOS_RESIGNATION_FACTORS.FIVE_TO_TEN_YEARS).toBeCloseTo(2 / 3, 5);
  });

  test('EOS_RESIGNATION_FACTORS: 10+ سنوات = 1', () => {
    expect(EOS_RESIGNATION_FACTORS.TEN_YEARS_OR_MORE).toBe(1);
  });

  test('EOS_TERMINATION_FACTOR = 1', () => {
    expect(EOS_TERMINATION_FACTOR).toBe(1);
  });

  test('TERMINATION_TYPES يحتوي الأنواع الصحيحة', () => {
    expect(TERMINATION_TYPES.RESIGNATION).toBe('resignation');
    expect(TERMINATION_TYPES.TERMINATION).toBe('termination');
    expect(TERMINATION_TYPES.END_OF_CONTRACT).toBe('end_of_contract');
    expect(TERMINATION_TYPES.RETIREMENT).toBe('retirement');
  });

  test('LEAVE_ENTITLEMENTS: مرضية كاملة 30 يوم', () => {
    expect(LEAVE_ENTITLEMENTS.sick_full_pay).toBe(30);
  });

  test('LEAVE_ENTITLEMENTS: مرضية ثلاثة أرباع 60 يوم', () => {
    expect(LEAVE_ENTITLEMENTS.sick_three_quarters).toBe(60);
  });

  test('LEAVE_ENTITLEMENTS: أمومة 70 يوم', () => {
    expect(LEAVE_ENTITLEMENTS.maternity).toBe(70);
  });

  test('LEAVE_ENTITLEMENTS: أبوة 3 أيام', () => {
    expect(LEAVE_ENTITLEMENTS.paternity).toBe(3);
  });

  test('LEAVE_ENTITLEMENTS: حج 15 يوم', () => {
    expect(LEAVE_ENTITLEMENTS.hajj).toBe(15);
  });

  test('LEAVE_ENTITLEMENTS: زواج 5 أيام', () => {
    expect(LEAVE_ENTITLEMENTS.marriage).toBe(5);
  });
});

// ========================================================
// 2. اختبارات calculateGOSIBase
// ========================================================
describe('calculateGOSIBase', () => {
  test('وعاء GOSI = أساسي + سكن', () => {
    expect(calculateGOSIBase(10000, 2500)).toBe(12500);
  });

  test('وعاء GOSI لا يتجاوز 45,000', () => {
    expect(calculateGOSIBase(40000, 10000)).toBe(45000);
  });

  test('وعاء GOSI عند الحد الأقصى بالضبط', () => {
    expect(calculateGOSIBase(45000, 0)).toBe(45000);
  });

  test('راتب بدون بدل سكن', () => {
    expect(calculateGOSIBase(8000, 0)).toBe(8000);
  });

  test('راتب سالب يُطلق خطأ', () => {
    expect(() => calculateGOSIBase(-1000, 0)).toThrow();
  });

  test('بدل سكن سالب يُطلق خطأ', () => {
    expect(() => calculateGOSIBase(5000, -100)).toThrow();
  });
});

// ========================================================
// 3. اختبارات calculateGOSI
// ========================================================
describe('calculateGOSI - موظف سعودي', () => {
  test('حصة الموظف السعودي = 9% من الوعاء', () => {
    const result = calculateGOSI(10000, 2500, true);
    // وعاء = 12500، حصة موظف = 12500 × 9% = 1125
    expect(result.employeeShare).toBe(1125);
  });

  test('حصة صاحب العمل (تقاعد) = 9%', () => {
    const result = calculateGOSI(10000, 2500, true);
    expect(result.employerPension).toBe(1125);
  });

  test('أخطار مهنية = 2%', () => {
    const result = calculateGOSI(10000, 2500, true);
    // 12500 × 2% = 250
    expect(result.occupationalHazard).toBe(250);
  });

  test('إجمالي حصة صاحب العمل = 9% + 2% = 11%', () => {
    const result = calculateGOSI(10000, 2500, true);
    // 1125 + 250 = 1375
    expect(result.employerTotal).toBe(1375);
  });

  test('isSaudi = true', () => {
    const result = calculateGOSI(10000, 2500, true);
    expect(result.isSaudi).toBe(true);
  });

  test('gosiBase محدود بـ 45,000', () => {
    const result = calculateGOSI(40000, 10000, true);
    expect(result.gosiBase).toBe(45000);
    // حصة موظف = 45000 × 9% = 4050
    expect(result.employeeShare).toBe(4050);
  });

  test('إجمالي الاشتراك = حصة موظف + حصة صاحب عمل', () => {
    const result = calculateGOSI(10000, 2500, true);
    expect(result.totalContribution).toBe(result.employeeShare + result.employerTotal);
  });
});

describe('calculateGOSI - موظف غير سعودي', () => {
  test('حصة الموظف غير السعودي = 0', () => {
    const result = calculateGOSI(8000, 2000, false);
    expect(result.employeeShare).toBe(0);
  });

  test('حصة التقاعد لغير سعودي = 0', () => {
    const result = calculateGOSI(8000, 2000, false);
    expect(result.employerPension).toBe(0);
  });

  test('أخطار مهنية لغير سعودي = 2% فقط', () => {
    const result = calculateGOSI(8000, 2000, false);
    // وعاء = 10000، 10000 × 2% = 200
    expect(result.occupationalHazard).toBe(200);
  });

  test('isSaudi = false', () => {
    const result = calculateGOSI(8000, 2000, false);
    expect(result.isSaudi).toBe(false);
  });

  test('إجمالي الاشتراك = أخطار مهنية فقط', () => {
    const result = calculateGOSI(8000, 2000, false);
    expect(result.totalContribution).toBe(result.occupationalHazard);
  });
});

// ========================================================
// 4. اختبارات calculateSANED
// ========================================================
describe('calculateSANED', () => {
  test('SANED للسعودي: حصة الموظف = 0.75%', () => {
    const result = calculateSANED(10000, 2500, true);
    // وعاء = 12500، 12500 × 0.75% = 93.75
    expect(result.employeeShare).toBe(93.75);
  });

  test('SANED للسعودي: حصة صاحب العمل = 0.75%', () => {
    const result = calculateSANED(10000, 2500, true);
    expect(result.employerShare).toBe(93.75);
  });

  test('SANED للسعودي: applicable = true', () => {
    const result = calculateSANED(10000, 2500, true);
    expect(result.applicable).toBe(true);
  });

  test('SANED لغير سعودي = 0', () => {
    const result = calculateSANED(8000, 2000, false);
    expect(result.employeeShare).toBe(0);
    expect(result.employerShare).toBe(0);
    expect(result.totalContribution).toBe(0);
    expect(result.applicable).toBe(false);
  });

  test('SANED محدود بسقف GOSI', () => {
    const result = calculateSANED(40000, 10000, true);
    // وعاء = 45000 (الحد الأقصى)، 45000 × 0.75% = 337.5
    expect(result.employeeShare).toBe(337.5);
  });
});

// ========================================================
// 5. اختبارات calculateServiceDuration
// ========================================================
describe('calculateServiceDuration', () => {
  test('سنة واحدة كاملة', () => {
    const result = calculateServiceDuration('2020-01-01', '2021-01-01');
    expect(result.years).toBe(1);
    expect(result.months).toBe(0);
  });

  test('3 سنوات كاملة', () => {
    const result = calculateServiceDuration('2018-01-01', '2021-01-01');
    expect(result.years).toBe(3);
  });

  test('yearsDecimal للسنة الواحدة ≈ 1', () => {
    const result = calculateServiceDuration('2020-01-01', '2021-01-01');
    expect(result.yearsDecimal).toBeCloseTo(1, 1);
  });

  test('تاريخ نهاية قبل البداية يُطلق خطأ', () => {
    expect(() => calculateServiceDuration('2021-01-01', '2020-01-01')).toThrow();
  });

  test('تاريخ غير صالح يُطلق خطأ', () => {
    expect(() => calculateServiceDuration('invalid-date', '2021-01-01')).toThrow();
  });

  test('إجمالي الأيام أكبر من 0 لفترة صحيحة', () => {
    const result = calculateServiceDuration('2020-01-01', '2023-01-01');
    expect(result.totalDays).toBeGreaterThan(0);
  });

  test('نفس اليوم = 0 سنوات، 0 أشهر، 0 أيام', () => {
    const result = calculateServiceDuration('2021-06-01', '2021-06-01');
    expect(result.years).toBe(0);
    expect(result.months).toBe(0);
    expect(result.days).toBe(0);
    expect(result.totalDays).toBe(0);
  });
});

// ========================================================
// 6. اختبارات getEOSFactor
// ========================================================
describe('getEOSFactor', () => {
  test('استقالة أقل من سنتين = 0', () => {
    expect(getEOSFactor('resignation', 1.5)).toBe(0);
  });

  test('استقالة بعد سنة = 0', () => {
    expect(getEOSFactor('resignation', 1)).toBe(0);
  });

  test('استقالة 2-5 سنوات = 1/3', () => {
    expect(getEOSFactor('resignation', 3)).toBeCloseTo(1 / 3, 5);
  });

  test('استقالة 5-10 سنوات = 2/3', () => {
    expect(getEOSFactor('resignation', 7)).toBeCloseTo(2 / 3, 5);
  });

  test('استقالة 10+ سنوات = 1', () => {
    expect(getEOSFactor('resignation', 12)).toBe(1);
  });

  test('إنهاء عقد = 1 كاملاً', () => {
    expect(getEOSFactor('termination', 1)).toBe(1);
  });

  test('انتهاء عقد = 1 كاملاً', () => {
    expect(getEOSFactor('end_of_contract', 2)).toBe(1);
  });

  test('تقاعد = 1 كاملاً', () => {
    expect(getEOSFactor('retirement', 0.5)).toBe(1);
  });

  test('حد الاستقالة 2 سنوات بالضبط = 1/3', () => {
    // 2 سنوات بالضبط: تقع في النطاق >= 2 و < 5
    expect(getEOSFactor('resignation', 2)).toBeCloseTo(1 / 3, 5);
  });

  test('حد الاستقالة 10 سنوات بالضبط = 1', () => {
    // 10 سنوات بالضبط: تقع في النطاق >= 10
    expect(getEOSFactor('resignation', 10)).toBe(1);
  });
});

// ========================================================
// 7. اختبارات calculateEndOfService
// ========================================================
describe('calculateEndOfService', () => {
  const baseParams = {
    basicSalary: 10000,
    housingAllowance: 2500,
    transportAllowance: 1000,
    hireDate: '2020-01-01',
  };

  test('استقالة أقل من سنتين → finalEOSAmount = 0', () => {
    const result = calculateEndOfService({
      ...baseParams,
      terminationDate: '2021-06-01',
      terminationType: 'resignation',
    });
    expect(result.finalEOSAmount).toBe(0);
  });

  test('إنهاء عقد بعد سنة → مكافأة كاملة', () => {
    const result = calculateEndOfService({
      ...baseParams,
      terminationDate: '2021-01-01',
      terminationType: 'termination',
    });
    // ~1 سنة، lastSalary=13500، firstFive=6750×1=6750، factor=1
    expect(result.finalEOSAmount).toBeGreaterThan(0);
    expect(result.terminationFactor).toBe(1);
  });

  test('lastSalary = أساسي + سكن + نقل', () => {
    const result = calculateEndOfService({
      ...baseParams,
      terminationDate: '2025-01-01',
      terminationType: 'termination',
    });
    expect(result.lastSalary).toBe(13500);
  });

  test('استقالة بعد 3 سنوات → factor = 1/3', () => {
    const result = calculateEndOfService({
      ...baseParams,
      terminationDate: '2023-01-01',
      terminationType: 'resignation',
    });
    expect(result.terminationFactor).toBeCloseTo(1 / 3, 5);
    expect(result.finalEOSAmount).toBeGreaterThan(0);
  });

  test('استقالة بعد 7 سنوات → factor = 2/3', () => {
    const result = calculateEndOfService({
      ...baseParams,
      terminationDate: '2027-01-01',
      terminationType: 'resignation',
    });
    expect(result.terminationFactor).toBeCloseTo(2 / 3, 5);
  });

  test('إنهاء عقد بعد 8 سنوات: أول 5 سنوات نصف شهر + 3 سنوات شهر كامل', () => {
    const result = calculateEndOfService({
      ...baseParams,
      terminationDate: '2028-01-01',
      terminationType: 'termination',
    });
    const lastSalary = 13500;
    // أول 5 سنوات: 13500/2 × 5 = 33750
    // ما بعد (≈3 سنوات): 13500 × 3 = 40500
    expect(result.firstFiveYearsAmount).toBeCloseTo(33750, -1);
    expect(result.remainingYearsAmount).toBeCloseTo(40500, -1);
  });

  test('بدل إجازات يضاف إلى التسوية', () => {
    const result = calculateEndOfService({
      ...baseParams,
      terminationDate: '2025-01-01',
      terminationType: 'termination',
      leaveBalanceDays: 15,
    });
    expect(result.leaveSettlement).toBeGreaterThan(0);
    expect(result.totalSettlement).toBe(result.finalEOSAmount + result.leaveSettlement);
  });

  test('نوع إنهاء غير صالح يُطلق خطأ', () => {
    expect(() =>
      calculateEndOfService({
        ...baseParams,
        terminationDate: '2025-01-01',
        terminationType: 'invalid_type',
      })
    ).toThrow();
  });

  test('راتب أساسي صفر يُطلق خطأ', () => {
    expect(() =>
      calculateEndOfService({
        ...baseParams,
        basicSalary: 0,
        terminationDate: '2025-01-01',
        terminationType: 'termination',
      })
    ).toThrow();
  });

  test('dailyRate = lastSalary / 30', () => {
    const result = calculateEndOfService({
      ...baseParams,
      terminationDate: '2025-01-01',
      terminationType: 'termination',
    });
    expect(result.dailyRate).toBeCloseTo(13500 / 30, 1);
  });
});

// ========================================================
// 8. اختبارات calculateDailyAndHourlyRate
// ========================================================
describe('calculateDailyAndHourlyRate', () => {
  test('معدل اليوم = الراتب / 30', () => {
    const result = calculateDailyAndHourlyRate(9000);
    expect(result.dailyRate).toBe(300);
  });

  test('معدل الساعة = معدل اليوم / 8', () => {
    const result = calculateDailyAndHourlyRate(9000);
    expect(result.hourlyRate).toBe(37.5);
  });

  test('راتب 0 يُطلق خطأ', () => {
    expect(() => calculateDailyAndHourlyRate(0)).toThrow();
  });

  test('راتب سالب يُطلق خطأ', () => {
    expect(() => calculateDailyAndHourlyRate(-1000)).toThrow();
  });

  test('ساعات يومية مخصصة', () => {
    const result = calculateDailyAndHourlyRate(9000, 6);
    expect(result.hourlyRate).toBeCloseTo(300 / 6, 2);
  });
});

// ========================================================
// 9. اختبارات calculateOvertimePay
// ========================================================
describe('calculateOvertimePay', () => {
  test('ساعات إضافي × أجر الساعة × 1.5', () => {
    // basicSalary=10000, housing=2500, base=12500
    // dailyRate = 12500/30, hourlyRate = dailyRate/8
    // overtimeHourlyRate = hourlyRate × 1.5
    const result = calculateOvertimePay(10000, 2500, 10);
    const dailyRate = 12500 / 30;
    const hourlyRate = dailyRate / 8;
    const expectedOvertimeRate = hourlyRate * 1.5;
    const expectedAmount = Math.round(10 * expectedOvertimeRate * 100) / 100;
    expect(result.overtimeAmount).toBe(expectedAmount);
  });

  test('ساعات إضافي 0 → مبلغ 0', () => {
    const result = calculateOvertimePay(10000, 2500, 0);
    expect(result.overtimeAmount).toBe(0);
  });

  test('ساعات إضافي سالبة تُطلق خطأ', () => {
    expect(() => calculateOvertimePay(10000, 2500, -5)).toThrow();
  });

  test('overtimeHourlyRate = hourlyRate × 1.5', () => {
    const result = calculateOvertimePay(9000, 0, 5);
    const expectedHourlyRate = 9000 / 30 / 8;
    expect(result.overtimeHourlyRate).toBeCloseTo(expectedHourlyRate * 1.5, 1);
  });
});

// ========================================================
// 10. اختبارات calculateAbsenceDeduction
// ========================================================
describe('calculateAbsenceDeduction', () => {
  test('يوم غياب واحد = 1 × معدل اليوم', () => {
    const result = calculateAbsenceDeduction(9000, 1);
    expect(result.deductionAmount).toBe(300);
  });

  test('3 أيام غياب', () => {
    const result = calculateAbsenceDeduction(9000, 3);
    expect(result.deductionAmount).toBe(900);
  });

  test('0 أيام غياب → 0 خصم', () => {
    const result = calculateAbsenceDeduction(9000, 0);
    expect(result.deductionAmount).toBe(0);
  });

  test('أيام غياب سالبة تُطلق خطأ', () => {
    expect(() => calculateAbsenceDeduction(9000, -1)).toThrow();
  });

  test('dailyRate = salary / 30', () => {
    const result = calculateAbsenceDeduction(12000, 2);
    expect(result.dailyRate).toBe(400);
    expect(result.deductionAmount).toBe(800);
  });
});

// ========================================================
// 11. اختبارات calculateLateDeductions
// ========================================================
describe('calculateLateDeductions', () => {
  test('تأخير واحد → إنذار شفهي، لا خصم', () => {
    const result = calculateLateDeductions(10000, 2500, 1);
    expect(result.totalDeduction).toBe(0);
    expect(result.breakdown[0].action).toBe('verbal_warning');
  });

  test('تأخيران → الثاني: خصم 5%', () => {
    const result = calculateLateDeductions(10000, 2500, 2);
    const dailyRate = 12500 / 30;
    const expectedDeduction = Math.round(dailyRate * 0.05 * 100) / 100;
    expect(result.totalDeduction).toBe(expectedDeduction);
  });

  test('3 تأخيرات → التأخيران 2و3 كل منهما 5%', () => {
    const result = calculateLateDeductions(10000, 2500, 3);
    const dailyRate = 12500 / 30;
    const expected = (Math.round(dailyRate * 0.05 * 100) / 100) * 2;
    expect(result.totalDeduction).toBeCloseTo(expected, 1);
  });

  test('4-6 تأخيرات: خصم 10% لكل تأخير في هذا النطاق', () => {
    const result = calculateLateDeductions(10000, 2500, 4);
    expect(result.breakdown[3].rate).toBe(0.1);
    expect(result.breakdown[3].action).toBe('deduct_10_percent');
  });

  test('7-9 تأخيرات: خصم 15%', () => {
    const result = calculateLateDeductions(10000, 2500, 7);
    expect(result.breakdown[6].rate).toBe(0.15);
    expect(result.breakdown[6].action).toBe('deduct_15_percent');
  });

  test('أكثر من 9 تأخيرات: خصم 25%', () => {
    const result = calculateLateDeductions(10000, 2500, 10);
    expect(result.breakdown[9].rate).toBe(0.25);
    expect(result.breakdown[9].action).toBe('deduct_25_percent');
  });

  test('0 تأخيرات → totalDeduction = 0', () => {
    const result = calculateLateDeductions(10000, 2500, 0);
    expect(result.totalDeduction).toBe(0);
    expect(result.breakdown).toHaveLength(0);
  });

  test('عدد تأخيرات سالب يُطلق خطأ', () => {
    expect(() => calculateLateDeductions(10000, 2500, -1)).toThrow();
  });

  test('breakdown يحتوي الحقول الصحيحة', () => {
    const result = calculateLateDeductions(10000, 2500, 2);
    expect(result.breakdown[0]).toHaveProperty('occurrence');
    expect(result.breakdown[0]).toHaveProperty('rate');
    expect(result.breakdown[0]).toHaveProperty('amount');
    expect(result.breakdown[0]).toHaveProperty('action');
  });
});

// ========================================================
// 12. اختبارات calculateNetSalary
// ========================================================
describe('calculateNetSalary', () => {
  const baseSaudi = {
    basicSalary: 10000,
    housingAllowance: 2500,
    transportAllowance: 1000,
    isSaudi: true,
  };

  test('الراتب الصافي = إجمالي المكاسب - إجمالي الاستقطاعات', () => {
    const result = calculateNetSalary(baseSaudi);
    expect(result.netSalary).toBe(result.totalEarnings - result.totalDeductions);
  });

  test('إجمالي المكاسب يشمل المكونات الثلاثة', () => {
    const result = calculateNetSalary(baseSaudi);
    expect(result.totalEarnings).toBe(10000 + 2500 + 1000);
  });

  test('استقطاع GOSI للسعودي = 9% من الوعاء', () => {
    const result = calculateNetSalary(baseSaudi);
    // وعاء = 12500، 9% = 1125
    expect(result.gosiEmployeeShare).toBe(1125);
  });

  test('استقطاع SANED للسعودي = 0.75% من الوعاء', () => {
    const result = calculateNetSalary(baseSaudi);
    expect(result.sanedEmployeeShare).toBe(93.75);
  });

  test('بدون استقطاعات إضافية: صافي = إجمالي - GOSI - SANED', () => {
    const result = calculateNetSalary(baseSaudi);
    const expected = 13500 - 1125 - 93.75;
    expect(result.netSalary).toBeCloseTo(expected, 2);
  });

  test('غير سعودي: GOSI وSANED = 0', () => {
    const result = calculateNetSalary({ ...baseSaudi, isSaudi: false });
    expect(result.gosiEmployeeShare).toBe(0);
    expect(result.sanedEmployeeShare).toBe(0);
  });

  test('غير سعودي: صافي = إجمالي المكاسب كاملاً', () => {
    const result = calculateNetSalary({
      basicSalary: 8000,
      housingAllowance: 2000,
      transportAllowance: 500,
      isSaudi: false,
    });
    expect(result.netSalary).toBe(10500);
  });

  test('مع ساعات إضافي', () => {
    const result = calculateNetSalary({ ...baseSaudi, overtimeAmount: 500 });
    expect(result.totalEarnings).toBe(13500 + 500);
  });

  test('مع خصم غياب', () => {
    const result = calculateNetSalary({ ...baseSaudi, absenceDeduction: 200 });
    expect(result.totalDeductions).toBeGreaterThan(0);
    expect(result.netSalary).toBeLessThan(13500);
  });

  test('حصص صاحب العمل لا تُخصم من الراتب', () => {
    const result = calculateNetSalary(baseSaudi);
    expect(result.gosiEmployerTotal).toBeGreaterThan(0);
    // gosiEmployerTotal لا يؤثر على netSalary
    const withoutEmployerCost = result.netSalary + result.gosiEmployerTotal;
    expect(withoutEmployerCost).toBeGreaterThan(result.netSalary);
  });
});

// ========================================================
// 13. اختبارات calculateAnnualLeaveEntitlement
// ========================================================
describe('calculateAnnualLeaveEntitlement', () => {
  test('أقل من 5 سنوات → 21 يوم', () => {
    expect(calculateAnnualLeaveEntitlement(3)).toBe(21);
  });

  test('بالضبط 5 سنوات → 30 يوم', () => {
    expect(calculateAnnualLeaveEntitlement(5)).toBe(30);
  });

  test('أكثر من 5 سنوات → 30 يوم', () => {
    expect(calculateAnnualLeaveEntitlement(10)).toBe(30);
  });

  test('0 سنوات → 21 يوم', () => {
    expect(calculateAnnualLeaveEntitlement(0)).toBe(21);
  });

  test('سنوات سالبة تُطلق خطأ', () => {
    expect(() => calculateAnnualLeaveEntitlement(-1)).toThrow();
  });

  test('4.9 سنوات → 21 يوم', () => {
    expect(calculateAnnualLeaveEntitlement(4.9)).toBe(21);
  });
});

// ========================================================
// 14. اختبارات calculateLeaveSettlement
// ========================================================
describe('calculateLeaveSettlement', () => {
  test('بدل 10 أيام إجازة', () => {
    const result = calculateLeaveSettlement(9000, 10);
    // dailyRate = 9000/30 = 300، 10 × 300 = 3000
    expect(result.settlementAmount).toBe(3000);
  });

  test('0 أيام → بدل 0', () => {
    const result = calculateLeaveSettlement(9000, 0);
    expect(result.settlementAmount).toBe(0);
  });

  test('راتب 0 يُطلق خطأ', () => {
    expect(() => calculateLeaveSettlement(0, 10)).toThrow();
  });

  test('أيام سالبة تُطلق خطأ', () => {
    expect(() => calculateLeaveSettlement(9000, -5)).toThrow();
  });

  test('dailyRate = monthlySalary / 30', () => {
    const result = calculateLeaveSettlement(12000, 5);
    expect(result.dailyRate).toBe(400);
    expect(result.settlementAmount).toBe(2000);
  });
});

// ========================================================
// 15. اختبارات validateHajjLeave
// ========================================================
describe('validateHajjLeave', () => {
  test('موظف خدم سنتين ولم يأخذ حجاً → صالح', () => {
    const result = validateHajjLeave(2, false);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('موظف أخذ حجاً من قبل → رفض', () => {
    const result = validateHajjLeave(3, true);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('إجازة الحج لمرة واحدة فقط خلال فترة الخدمة');
  });

  test('موظف أقل من سنتين خدمة → رفض', () => {
    const result = validateHajjLeave(1, false);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('إجازة الحج تستحق بعد سنتين من الخدمة');
  });

  test('موظف أخذ حجاً وخدمة أقل من سنتين → خطأين', () => {
    const result = validateHajjLeave(1, true);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  test('موظف 10 سنوات خدمة ولم يأخذ حجاً → صالح', () => {
    const result = validateHajjLeave(10, false);
    expect(result.valid).toBe(true);
  });
});

// ========================================================
// 16. اختبارات calculateSickLeavePayment
// ========================================================
describe('calculateSickLeavePayment', () => {
  test('أول 30 يوم: كامل الراتب', () => {
    const result = calculateSickLeavePayment(9000, 10, 0);
    expect(result.fullPayDays).toBe(10);
    expect(result.threeQuartersDays).toBe(0);
    expect(result.unpaidDays).toBe(0);
    const expectedPayment = 10 * (9000 / 30);
    expect(result.payment).toBeCloseTo(expectedPayment, 1);
  });

  test('بعد 30 يوم: ثلاثة أرباع الراتب', () => {
    const result = calculateSickLeavePayment(9000, 5, 30);
    // الأيام 31-35 → ثلاثة أرباع
    expect(result.fullPayDays).toBe(0);
    expect(result.threeQuartersDays).toBe(5);
  });

  test('بعد 90 يوم: بدون راتب', () => {
    const result = calculateSickLeavePayment(9000, 5, 90);
    expect(result.fullPayDays).toBe(0);
    expect(result.threeQuartersDays).toBe(0);
    expect(result.unpaidDays).toBe(5);
    expect(result.payment).toBe(0);
  });

  test('مختلط: يغطي الثلاثة مراحل', () => {
    // استخدم 25 يوماً مسبقاً، طلب 20 يوماً جديدة
    // يوم 26-30: 5 أيام راتب كامل
    // يوم 31-45: 15 يوم ثلاثة أرباع
    const result = calculateSickLeavePayment(9000, 20, 25);
    expect(result.fullPayDays).toBe(5);
    expect(result.threeQuartersDays).toBe(15);
    expect(result.unpaidDays).toBe(0);
  });

  test('0 أيام يُطلق خطأ', () => {
    expect(() => calculateSickLeavePayment(9000, 0, 0)).toThrow();
  });

  test('dailyRate = salary / 30', () => {
    const result = calculateSickLeavePayment(9000, 5, 0);
    expect(result.dailyRate).toBe(300);
  });

  test('payment = fullPay × daily + 3/4 × daily × threeQuartersDays', () => {
    const result = calculateSickLeavePayment(6000, 10, 20);
    // 20 أيام مسبقاً، 10 جديدة: يوم 21-30 (10 أيام راتب كامل)
    const dailyRate = 6000 / 30; // = 200
    const expected = 10 * dailyRate; // = 2000
    expect(result.payment).toBeCloseTo(expected, 1);
  });
});

// ========================================================
// 17. سيناريوهات متكاملة
// ========================================================
describe('سيناريوهات متكاملة', () => {
  test('حساب راتب موظف سعودي كامل', () => {
    // معالج علاج طبيعي سعودي
    const salary = calculateNetSalary({
      basicSalary: 12000,
      housingAllowance: 3000,
      transportAllowance: 1000,
      otherAllowances: 500,
      overtimeAmount: 300,
      absenceDeduction: 400,
      lateDeduction: 100,
      isSaudi: true,
    });
    // GOSI: (12000+3000)=15000 × 9% = 1350
    // SANED: 15000 × 0.75% = 112.5
    expect(salary.gosiEmployeeShare).toBe(1350);
    expect(salary.sanedEmployeeShare).toBe(112.5);
    expect(salary.netSalary).toBeLessThan(salary.totalEarnings);
    expect(salary.netSalary).toBeGreaterThan(0);
  });

  test('مكافأة نهاية خدمة موظف أُنهيت خدمته بعد 8 سنوات', () => {
    const eos = calculateEndOfService({
      basicSalary: 15000,
      housingAllowance: 3750,
      transportAllowance: 1500,
      hireDate: '2015-01-01',
      terminationDate: '2023-01-01',
      terminationType: 'termination',
      leaveBalanceDays: 10,
    });
    const lastSalary = 15000 + 3750 + 1500; // = 20250
    // أول 5 سنوات: 20250/2 × 5 = 50625
    // 3 سنوات بعدها: 20250 × 3 = 60750
    // factor = 1
    expect(eos.lastSalary).toBe(20250);
    expect(eos.firstFiveYearsAmount).toBeCloseTo(50625, -1);
    expect(eos.remainingYearsAmount).toBeCloseTo(60750, -1);
    expect(eos.terminationFactor).toBe(1);
    expect(eos.leaveSettlement).toBeGreaterThan(0);
    expect(eos.totalSettlement).toBeGreaterThan(eos.finalEOSAmount);
  });

  test('GOSI + SANED معاً للموظف السعودي', () => {
    const gosi = calculateGOSI(10000, 2500, true);
    const saned = calculateSANED(10000, 2500, true);
    // إجمالي حصة الموظف = 1125 + 93.75 = 1218.75
    const totalEmployeeContribution = gosi.employeeShare + saned.employeeShare;
    expect(totalEmployeeContribution).toBe(1218.75);
    // إجمالي حصة صاحب العمل = (1125 + 250) + 93.75 = 1468.75
    const totalEmployerContribution = gosi.employerTotal + saned.employerShare;
    expect(totalEmployerContribution).toBe(1468.75);
  });

  test('مقارنة: نفس الموظف سعودي مقابل غير سعودي', () => {
    const saudiSalary = calculateNetSalary({
      basicSalary: 10000,
      housingAllowance: 2500,
      transportAllowance: 1000,
      isSaudi: true,
    });
    const nonSaudiSalary = calculateNetSalary({
      basicSalary: 10000,
      housingAllowance: 2500,
      transportAllowance: 1000,
      isSaudi: false,
    });
    // الموظف غير السعودي يأخذ راتباً صافياً أعلى
    expect(nonSaudiSalary.netSalary).toBeGreaterThan(saudiSalary.netSalary);
    // فرق = GOSI + SANED للسعودي
    const diff = nonSaudiSalary.netSalary - saudiSalary.netSalary;
    expect(diff).toBeCloseTo(saudiSalary.gosiEmployeeShare + saudiSalary.sanedEmployeeShare, 1);
  });

  test('استقالة بعد 3 سنوات: المكافأة = ثلث المكافأة الكاملة', () => {
    const eos = calculateEndOfService({
      basicSalary: 10000,
      housingAllowance: 2500,
      transportAllowance: 1000,
      hireDate: '2020-01-01',
      terminationDate: '2023-01-01',
      terminationType: 'resignation',
    });
    const fullEOS = eos.totalEOSBeforeFactor;
    const expectedFinal = Math.round(fullEOS * (1 / 3) * 100) / 100;
    expect(eos.finalEOSAmount).toBeCloseTo(expectedFinal, 1);
  });

  test('إجمالي حسابات الراتب الشهري مع استقطاعات متعددة', () => {
    const overtimeData = calculateOvertimePay(10000, 2500, 8);
    const absenceData = calculateAbsenceDeduction(13500, 2);
    const lateData = calculateLateDeductions(10000, 2500, 4);

    const salary = calculateNetSalary({
      basicSalary: 10000,
      housingAllowance: 2500,
      transportAllowance: 1000,
      overtimeAmount: overtimeData.overtimeAmount,
      absenceDeduction: absenceData.deductionAmount,
      lateDeduction: lateData.totalDeduction,
      isSaudi: true,
    });

    expect(salary.netSalary).toBeGreaterThan(0);
    expect(salary.totalEarnings).toBeGreaterThan(13500); // بسبب الإضافي
    expect(salary.totalDeductions).toBeGreaterThan(1218.75); // GOSI+SANED + خصومات
  });
});

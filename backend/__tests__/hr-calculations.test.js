/**
 * HR Calculations Tests
 * Pure Unit Tests - No DB
 * نظام AlAwael ERP - وحدة الموارد البشرية
 */

'use strict';

const {
  HR_CONSTANTS,
  calculateTotalSalary,
  calculateGOSI,
  calculateLateDeductions,
  calculateOvertimePay,
  calculateAbsenceDeductions,
  calculateMonthlyPayroll,
  calculateServiceDuration,
  calculateEndOfService,
  calculateFinalSettlement,
  calculateAnnualLeaveEntitlement,
  calculateLeaveBalance,
  validateLeaveRequest,
  calculateSickLeaveValue,
  calculateProbationEnd,
  validateContract,
  calculateSaudizationRate,
  generateDocumentAlerts,
} = require('../services/hr/hrCalculations.service');

// ========================================
// HR_CONSTANTS
// ========================================
describe('HR_CONSTANTS', () => {
  test('GOSI rates صحيحة', () => {
    expect(HR_CONSTANTS.GOSI.SAUDI_EMPLOYEE_RATE).toBe(0.09);
    expect(HR_CONSTANTS.GOSI.SAUDI_EMPLOYER_RATE).toBe(0.09);
    expect(HR_CONSTANTS.GOSI.OCCUPATIONAL_HAZARD_RATE).toBe(0.02);
    expect(HR_CONSTANTS.GOSI.NON_SAUDI_EMPLOYER_RATE).toBe(0.02);
    expect(HR_CONSTANTS.GOSI.MAX_CONTRIBUTION_BASE).toBe(45000);
  });

  test('SANED rates صحيحة', () => {
    expect(HR_CONSTANTS.SANED.EMPLOYEE_RATE).toBe(0.0075);
    expect(HR_CONSTANTS.SANED.EMPLOYER_RATE).toBe(0.0075);
  });

  test('إجازة الأمومة 70 يوم', () => {
    expect(HR_CONSTANTS.LEAVE.MATERNITY).toBe(70);
    expect(HR_CONSTANTS.LEAVE.PATERNITY).toBe(3);
    expect(HR_CONSTANTS.LEAVE.ANNUAL_LESS_5_YEARS).toBe(21);
    expect(HR_CONSTANTS.LEAVE.ANNUAL_MORE_5_YEARS).toBe(30);
  });

  test('حد أقصى ساعات إضافية 720 سنوياً', () => {
    expect(HR_CONSTANTS.MAX_OVERTIME_ANNUAL_HOURS).toBe(720);
    expect(HR_CONSTANTS.OVERTIME_MULTIPLIER).toBe(1.5);
  });

  test('فترة التجربة 90 يوم', () => {
    expect(HR_CONSTANTS.PROBATION_DAYS).toBe(90);
  });

  test('الحد الأدنى للأجور 4000 ريال', () => {
    expect(HR_CONSTANTS.MIN_WAGE_SAUDI).toBe(4000);
  });
});

// ========================================
// calculateTotalSalary
// ========================================
describe('calculateTotalSalary', () => {
  test('null → isValid: false', () => {
    const result = calculateTotalSalary(null);
    expect(result.isValid).toBe(false);
  });

  test('بدون رقم → isValid: false', () => {
    const result = calculateTotalSalary({ basicSalary: 'abc' });
    expect(result.isValid).toBe(false);
  });

  test('راتب أساسي فقط', () => {
    const result = calculateTotalSalary({ basicSalary: 10000 });
    expect(result.isValid).toBe(true);
    expect(result.totalSalary).toBe(10000);
    expect(result.dailyRate).toBe(333.33);
  });

  test('راتب كامل مع بدلات', () => {
    const result = calculateTotalSalary({
      basicSalary: 10000,
      housingAllowance: 2500,
      transportAllowance: 1000,
    });
    expect(result.totalSalary).toBe(13500);
    expect(result.dailyRate).toBe(450);
  });

  test('بدلات أخرى تُحسب', () => {
    const result = calculateTotalSalary({
      basicSalary: 10000,
      otherAllowances: [
        { name: 'بدل مهني', amount: 500 },
        { name: 'بدل اتصالات', amount: 300 },
      ],
    });
    expect(result.otherAllowances).toBe(800);
    expect(result.totalSalary).toBe(10800);
  });

  test('أجر الساعة = (أساسي + سكن) / 30 / 8', () => {
    const result = calculateTotalSalary({ basicSalary: 12000, housingAllowance: 3000 });
    // (12000+3000)/30/8 = 62.5
    expect(result.hourlyRate).toBe(62.5);
  });
});

// ========================================
// calculateGOSI
// ========================================
describe('calculateGOSI', () => {
  test('null → isValid: false', () => {
    const result = calculateGOSI(null, true);
    expect(result.isValid).toBe(false);
  });

  test('قيمة سالبة → isValid: false', () => {
    const result = calculateGOSI(-100, true);
    expect(result.isValid).toBe(false);
  });

  test('موظف سعودي - 9% + 0.75% موظف', () => {
    const result = calculateGOSI(10000, true);
    expect(result.isValid).toBe(true);
    expect(result.isSaudi).toBe(true);
    expect(result.gosiEmployee).toBe(900); // 10000 × 9%
    expect(result.sanedEmployee).toBe(75); // 10000 × 0.75%
    expect(result.employeeDeduction).toBe(975); // 900 + 75
  });

  test('موظف سعودي - حصة صاحب العمل = 9% + 2% + 0.75%', () => {
    const result = calculateGOSI(10000, true);
    expect(result.gosiEmployer).toBe(900); // 9%
    expect(result.occupationalHazard).toBe(200); // 2%
    expect(result.sanedEmployer).toBe(75); // 0.75%
    expect(result.employerCost).toBe(1175); // 900+200+75
  });

  test('غير سعودي - 0% موظف، 2% صاحب عمل', () => {
    const result = calculateGOSI(10000, false);
    expect(result.isSaudi).toBe(false);
    expect(result.gosiEmployee).toBe(0);
    expect(result.sanedEmployee).toBe(0);
    expect(result.employeeDeduction).toBe(0);
    expect(result.occupationalHazard).toBe(200); // 2%
    expect(result.employerCost).toBe(200);
  });

  test('سقف الاشتراك 45000 ريال', () => {
    const result = calculateGOSI(50000, true); // > 45000
    expect(result.contributionBase).toBe(45000);
    expect(result.gosiEmployee).toBe(4050); // 45000 × 9%
  });

  test('قيمة أقل من السقف تُحسب بالكامل', () => {
    const result = calculateGOSI(30000, true);
    expect(result.contributionBase).toBe(30000);
    expect(result.gosiEmployee).toBe(2700);
  });
});

// ========================================
// calculateLateDeductions
// ========================================
describe('calculateLateDeductions', () => {
  test('صفر → لا خصم', () => {
    const result = calculateLateDeductions(0, 500);
    expect(result.totalDeduction).toBe(0);
  });

  test('null → لا خصم', () => {
    const result = calculateLateDeductions(null, 500);
    expect(result.totalDeduction).toBe(0);
  });

  test('المرة الأولى = إنذار شفهي (صفر خصم)', () => {
    const result = calculateLateDeductions(1, 500);
    expect(result.totalDeduction).toBe(0);
    expect(result.breakdown[0].note).toBe('إنذار شفهي');
  });

  test('المرة 2-3 = 5% من أجر اليوم', () => {
    const result = calculateLateDeductions(3, 1000);
    // المرة 1: 0, المرة 2: 50, المرة 3: 50 = 100
    expect(result.totalDeduction).toBe(100);
    expect(result.breakdown[1].rate).toBe(0.05);
  });

  test('المرة 4-6 = 10%', () => {
    const result = calculateLateDeductions(6, 1000);
    // 0 + 50 + 50 + 100 + 100 + 100 = 400
    expect(result.totalDeduction).toBe(400);
  });

  test('المرة 7-9 = 15%', () => {
    const result = calculateLateDeductions(9, 1000);
    // مجموع الكل
    const expected = 0 + 50 + 50 + 100 + 100 + 100 + 150 + 150 + 150;
    expect(result.totalDeduction).toBe(expected);
  });

  test('المرة 10+ = 25%', () => {
    const result = calculateLateDeductions(10, 1000);
    expect(result.breakdown[9].rate).toBe(0.25);
    expect(result.breakdown[9].deduction).toBe(250);
  });

  test('حساب التفاصيل كامل', () => {
    const result = calculateLateDeductions(2, 500);
    expect(result.lateDaysCount).toBe(2);
    expect(result.breakdown).toHaveLength(2);
    expect(result.breakdown[0].occurrence).toBe(1);
    expect(result.breakdown[1].occurrence).toBe(2);
  });
});

// ========================================
// calculateOvertimePay
// ========================================
describe('calculateOvertimePay', () => {
  test('صفر ساعات → صفر', () => {
    const result = calculateOvertimePay(0, 50);
    expect(result.overtimeAmount).toBe(0);
  });

  test('حساب أجر إضافي = ساعة × أجر × 1.5', () => {
    const result = calculateOvertimePay(10, 50, 0);
    // 10 × 50 × 1.5 = 750
    expect(result.overtimeAmount).toBe(750);
    expect(result.overtimeHours).toBe(10);
  });

  test('تجاوز الحد السنوي', () => {
    // استُخدم 715 ساعة، يطلب 10 ساعات → يُسمح بـ 5 فقط
    const result = calculateOvertimePay(10, 50, 715);
    expect(result.overtimeHours).toBe(5);
    expect(result.exceedsAnnualLimit).toBe(true);
    expect(result.overtimeAmount).toBe(375); // 5 × 50 × 1.5
  });

  test('الحد السنوي مستنفد → لا إضافي', () => {
    const result = calculateOvertimePay(5, 50, 720);
    expect(result.overtimeHours).toBe(0);
    expect(result.overtimeAmount).toBe(0);
    expect(result.exceedsAnnualLimit).toBe(true);
  });

  test('hourlyOvertimeRate = hourlyRate × 1.5', () => {
    const result = calculateOvertimePay(5, 100, 0);
    expect(result.hourlyOvertimeRate).toBe(150);
  });

  test('تحديث ساعات الإضافي بعد الشهر', () => {
    const result = calculateOvertimePay(10, 50, 100);
    expect(result.yearlyUsedAfter).toBe(110);
  });
});

// ========================================
// calculateMonthlyPayroll
// ========================================
describe('calculateMonthlyPayroll', () => {
  test('بدون بيانات → isValid: false', () => {
    const result = calculateMonthlyPayroll(null);
    expect(result.isValid).toBe(false);
  });

  test('موظف سعودي بدون غياب - GOSI محسوب', () => {
    const employee = {
      id: 'e1',
      basicSalary: 10000,
      housingAllowance: 2500,
      transportAllowance: 1000,
      isSaudi: true,
    };
    const result = calculateMonthlyPayroll(employee, {});
    expect(result.isValid).toBe(true);
    expect(result.earnings.totalEarnings).toBe(13500);
    // GOSI: (10000+2500) × 9% = 1125
    expect(result.deductions.gosiEmployee).toBe(1125);
    // SANED: 12500 × 0.75% = 93.75
    expect(result.deductions.sanedEmployee).toBe(93.75);
    expect(result.deductions.totalDeductions).toBeCloseTo(1218.75, 1);
    expect(result.netSalary).toBeCloseTo(12281.25, 1);
  });

  test('موظف غير سعودي - لا خصم GOSI', () => {
    const employee = {
      id: 'e2',
      basicSalary: 8000,
      housingAllowance: 2000,
      transportAllowance: 500,
      isSaudi: false,
    };
    const result = calculateMonthlyPayroll(employee, {});
    expect(result.deductions.gosiEmployee).toBe(0);
    expect(result.deductions.sanedEmployee).toBe(0);
    expect(result.netSalary).toBe(10500); // 8000+2000+500
  });

  test('غياب يستقطع من الراتب', () => {
    const employee = {
      basicSalary: 9000,
      housingAllowance: 0,
      transportAllowance: 0,
      isSaudi: true,
    };
    const result = calculateMonthlyPayroll(employee, { absenceDays: 3 });
    // يومي = 9000/30 = 300، خصم = 3 × 300 = 900
    expect(result.deductions.absenceDeduction).toBe(900);
    expect(result.absenceDays).toBe(3);
  });

  test('تأخير يُضاف للاستقطاعات', () => {
    const employee = {
      basicSalary: 9000,
      housingAllowance: 0,
      transportAllowance: 0,
      isSaudi: true,
    };
    const result = calculateMonthlyPayroll(employee, { lateDays: 3 });
    // يومي = 300، مرة 1: 0، مرة 2: 15، مرة 3: 15 = 30
    expect(result.deductions.lateDeduction).toBe(30);
  });

  test('عمل إضافي يُضاف للمكاسب', () => {
    const employee = {
      basicSalary: 12000,
      housingAllowance: 3000,
      transportAllowance: 0,
      isSaudi: true,
    };
    // hourlyRate = (12000+3000)/30/8 = 62.5
    const result = calculateMonthlyPayroll(employee, { overtimeHours: 8 });
    // 8 × 62.5 × 1.5 = 750
    expect(result.earnings.overtimeAmount).toBe(750);
  });

  test('سلف وقروض تُستقطع', () => {
    const employee = { basicSalary: 10000, isSaudi: false };
    const result = calculateMonthlyPayroll(employee, {
      advanceDeduction: 500,
      loanDeduction: 300,
    });
    expect(result.deductions.advanceDeduction).toBe(500);
    expect(result.deductions.loanDeduction).toBe(300);
  });

  test('تكلفة صاحب العمل تشمل GOSI', () => {
    const employee = {
      basicSalary: 10000,
      housingAllowance: 2500,
      transportAllowance: 0,
      isSaudi: true,
    };
    const result = calculateMonthlyPayroll(employee, {});
    // gosiEmployer = 12500 × 9% = 1125
    expect(result.employer.gosiEmployer).toBe(1125);
    // occupationalHazard = 12500 × 2% = 250
    expect(result.employer.occupationalHazard).toBe(250);
  });
});

// ========================================
// calculateServiceDuration
// ========================================
describe('calculateServiceDuration', () => {
  test('null → isValid: false', () => {
    const result = calculateServiceDuration(null);
    expect(result.isValid).toBe(false);
  });

  test('تاريخ غير صحيح → isValid: false', () => {
    const result = calculateServiceDuration('invalid-date');
    expect(result.isValid).toBe(false);
  });

  test('3 سنوات خدمة', () => {
    const result = calculateServiceDuration('2020-01-01', '2023-01-01');
    expect(result.isValid).toBe(true);
    expect(result.years).toBe(3);
    expect(result.months).toBe(0);
  });

  test('5 سنوات و6 أشهر', () => {
    const result = calculateServiceDuration('2019-01-01', '2024-07-01');
    expect(result.years).toBe(5);
    expect(result.months).toBe(6);
  });

  test('إجمالي الأيام محسوب', () => {
    const result = calculateServiceDuration('2023-01-01', '2023-12-31');
    expect(result.totalDays).toBe(364);
  });

  test('الكسر العشري للسنوات', () => {
    const result = calculateServiceDuration('2020-01-01', '2023-01-01');
    // ~3 سنوات
    expect(result.totalYearsDecimal).toBeCloseTo(3, 1);
  });
});

// ========================================
// calculateEndOfService
// ========================================
describe('calculateEndOfService', () => {
  test('بيانات ناقصة → isValid: false', () => {
    expect(calculateEndOfService(null).isValid).toBe(false);
    expect(calculateEndOfService({ hireDate: '2020-01-01' }).isValid).toBe(false);
  });

  test('استقالة أقل من سنتين → صفر', () => {
    const result = calculateEndOfService({
      hireDate: '2023-01-01',
      terminationDate: '2024-06-01',
      terminationType: 'resignation',
      lastSalary: 13500,
    });
    expect(result.isValid).toBe(true);
    expect(result.finalAmount).toBe(0);
    expect(result.calculation.terminationFactor).toBe(0);
  });

  test('استقالة 3 سنوات → ثلث المكافأة', () => {
    const result = calculateEndOfService({
      hireDate: '2020-01-01',
      terminationDate: '2023-01-01',
      terminationType: 'resignation',
      lastSalary: 13500,
    });
    // 3 سنوات × نصف شهر = 3 × 6750 = 20250 × ثلث ≈ 6750
    expect(result.finalAmount).toBeGreaterThan(0);
    expect(result.calculation.terminationFactor).toBeCloseTo(1 / 3, 5);
  });

  test('إنهاء خدمة من صاحب العمل → كاملة', () => {
    const result = calculateEndOfService({
      hireDate: '2018-01-01',
      terminationDate: '2026-01-01',
      terminationType: 'termination',
      lastSalary: 20250,
    });
    expect(result.calculation.terminationFactor).toBe(1);
    // 5 × نصف شهر + 3 × شهر كامل
    const first5 = (20250 / 2) * 5; // 50625
    const rest = 20250 * 3; // 60750
    const expected = first5 + rest; // 111375
    expect(result.finalAmount).toBeCloseTo(expected, 0);
  });

  test('تقاعد → مكافأة كاملة', () => {
    const result = calculateEndOfService({
      hireDate: '2010-01-01',
      terminationDate: '2026-01-01',
      terminationType: 'retirement',
      lastSalary: 15000,
    });
    expect(result.calculation.terminationFactor).toBe(1);
    expect(result.finalAmount).toBeGreaterThan(0);
  });

  test('استقالة 7 سنوات → ثلثان', () => {
    const result = calculateEndOfService({
      hireDate: '2017-01-01',
      terminationDate: '2024-01-01',
      terminationType: 'resignation',
      lastSalary: 10000,
    });
    expect(result.calculation.terminationFactor).toBeCloseTo(2 / 3, 5);
  });

  test('استقالة 10+ سنوات → كاملة', () => {
    const result = calculateEndOfService({
      hireDate: '2014-01-01',
      terminationDate: '2026-01-01',
      terminationType: 'resignation',
      lastSalary: 10000,
    });
    expect(result.calculation.terminationFactor).toBe(1);
  });

  test('الأجر اليومي = آخر راتب / 30', () => {
    const result = calculateEndOfService({
      hireDate: '2020-01-01',
      terminationDate: '2026-01-01',
      terminationType: 'termination',
      lastSalary: 12000,
    });
    expect(result.dailyRate).toBe(400);
  });
});

// ========================================
// calculateFinalSettlement
// ========================================
describe('calculateFinalSettlement', () => {
  test('بيانات خاطئة → isValid: false', () => {
    const result = calculateFinalSettlement(null);
    expect(result.isValid).toBe(false);
  });

  test('التسوية الكاملة = نهاية خدمة + إجازة + تذاكر', () => {
    const eosParams = {
      hireDate: '2018-01-01',
      terminationDate: '2026-01-01',
      terminationType: 'termination',
      lastSalary: 12000,
    };
    const result = calculateFinalSettlement(eosParams, 15, 5000);
    expect(result.isValid).toBe(true);
    expect(result.leaveSettlement).toBe(15 * 400); // 15 × 400 = 6000
    expect(result.ticketAmount).toBe(5000);
    expect(result.totalSettlement).toBe(result.endOfServiceAmount + 6000 + 5000);
  });

  test('بدون إجازة أو تذاكر', () => {
    const result = calculateFinalSettlement({
      hireDate: '2020-01-01',
      terminationDate: '2026-01-01',
      terminationType: 'termination',
      lastSalary: 10000,
    });
    expect(result.leaveSettlement).toBe(0);
    expect(result.ticketAmount).toBe(0);
  });
});

// ========================================
// calculateAnnualLeaveEntitlement
// ========================================
describe('calculateAnnualLeaveEntitlement', () => {
  test('null → 0', () => {
    expect(calculateAnnualLeaveEntitlement(null)).toBe(0);
  });

  test('قيمة سالبة → 0', () => {
    expect(calculateAnnualLeaveEntitlement(-1)).toBe(0);
  });

  test('أقل من 5 سنوات → 21 يوم', () => {
    expect(calculateAnnualLeaveEntitlement(0)).toBe(21);
    expect(calculateAnnualLeaveEntitlement(3)).toBe(21);
    expect(calculateAnnualLeaveEntitlement(4.9)).toBe(21);
  });

  test('5 سنوات فأكثر → 30 يوم', () => {
    expect(calculateAnnualLeaveEntitlement(5)).toBe(30);
    expect(calculateAnnualLeaveEntitlement(10)).toBe(30);
    expect(calculateAnnualLeaveEntitlement(20)).toBe(30);
  });
});

// ========================================
// calculateLeaveBalance
// ========================================
describe('calculateLeaveBalance', () => {
  test('رصيد بدون استخدام', () => {
    const result = calculateLeaveBalance(21, 0, 0);
    expect(result.totalAvailable).toBe(21);
    expect(result.remaining).toBe(21);
    expect(result.used).toBe(0);
  });

  test('استخدام جزئي', () => {
    const result = calculateLeaveBalance(21, 10, 0);
    expect(result.remaining).toBe(11);
    expect(result.used).toBe(10);
  });

  test('ترحيل الرصيد (نصف الاستحقاق)', () => {
    // استحقاق 21، الترحيل المسموح = 10
    const result = calculateLeaveBalance(21, 0, 15);
    expect(result.carryOver).toBe(10); // max = floor(21 * 0.5) = 10
    expect(result.totalAvailable).toBe(31); // 21 + 10
  });

  test('الرصيد المنتهي في نهاية السنة', () => {
    // متبقي 15، max ترحيل = 10 → ينتهي 5
    const result = calculateLeaveBalance(21, 6, 0);
    expect(result.remaining).toBe(15);
    expect(result.expiringAtYearEnd).toBe(5); // 15 - 10
  });

  test('لا ينتهي رصيد عند remaining <= maxCarryOver', () => {
    const result = calculateLeaveBalance(21, 15, 0);
    expect(result.remaining).toBe(6);
    expect(result.expiringAtYearEnd).toBe(0); // 6 <= 10
  });
});

// ========================================
// validateLeaveRequest
// ========================================
describe('validateLeaveRequest', () => {
  test('null → error', () => {
    const result = validateLeaveRequest(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('تواريخ خاطئة → error', () => {
    const result = validateLeaveRequest({
      leaveType: 'annual',
      startDate: 'invalid',
      endDate: '2026-01-10',
    });
    expect(result.valid).toBe(false);
  });

  test('رصيد كافٍ للإجازة السنوية → valid', () => {
    const result = validateLeaveRequest(
      { leaveType: 'annual', startDate: '2026-02-01', endDate: '2026-02-10' },
      { remaining: 15 }
    );
    expect(result.valid).toBe(true);
    expect(result.totalDays).toBe(10);
  });

  test('رصيد غير كافٍ للإجازة السنوية → error', () => {
    const result = validateLeaveRequest(
      { leaveType: 'annual', startDate: '2026-02-01', endDate: '2026-02-20' },
      { remaining: 5 }
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('الرصيد المتبقي');
  });

  test('إجازة أمومة لذكر → error', () => {
    const result = validateLeaveRequest({
      leaveType: 'maternity',
      startDate: '2026-03-01',
      endDate: '2026-05-09',
      employee: { gender: 'male' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('للإناث فقط');
  });

  test('إجازة أمومة 70 يوم → valid', () => {
    const result = validateLeaveRequest({
      leaveType: 'maternity',
      startDate: '2026-03-01',
      endDate: '2026-05-09', // 69 days
      employee: { gender: 'female' },
    });
    expect(result.valid).toBe(true);
  });

  test('إجازة حج مرة ثانية → error', () => {
    const result = validateLeaveRequest({
      leaveType: 'hajj',
      startDate: '2026-06-01',
      endDate: '2026-06-12',
      hasUsedHajj: true,
      serviceYears: 3,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('مرة واحدة');
  });

  test('إجازة حج قبل سنتين → error', () => {
    const result = validateLeaveRequest({
      leaveType: 'hajj',
      startDate: '2026-06-01',
      endDate: '2026-06-12',
      hasUsedHajj: false,
      serviceYears: 1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('سنتين');
  });

  test('إجازة أبوة لأنثى → error', () => {
    const result = validateLeaveRequest({
      leaveType: 'paternity',
      startDate: '2026-04-01',
      endDate: '2026-04-03',
      employee: { gender: 'female' },
    });
    expect(result.valid).toBe(false);
  });

  test('إجازة زواج أكثر من 5 أيام → error', () => {
    const result = validateLeaveRequest({
      leaveType: 'marriage',
      startDate: '2026-04-01',
      endDate: '2026-04-10',
    });
    expect(result.valid).toBe(false);
  });

  test('إجازة مرضية تجاوز 120 يوم → error', () => {
    const result = validateLeaveRequest({
      leaveType: 'sick',
      startDate: '2026-01-01',
      endDate: '2026-04-30',
      usedThisYear: 100, // استخدم 100 + 120 يوم جديدة = تجاوز
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('120');
  });

  test('إجازة مرضية تحتاج تقرير طبي → warning', () => {
    const result = validateLeaveRequest({
      leaveType: 'sick',
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      usedThisYear: 0,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ========================================
// calculateSickLeaveValue
// ========================================
describe('calculateSickLeaveValue', () => {
  test('صفر → صفر', () => {
    const result = calculateSickLeaveValue(0, 500);
    expect(result.totalValue).toBe(0);
  });

  test('20 يوم = كاملة الراتب', () => {
    const result = calculateSickLeaveValue(20, 500);
    expect(result.totalValue).toBe(10000); // 20 × 500
    expect(result.breakdown[0].rate).toBe(1);
  });

  test('40 يوم = 30 كاملة + 10 بثلاثة أرباع', () => {
    const result = calculateSickLeaveValue(40, 1000);
    // 30 × 1000 = 30000
    // 10 × 750 = 7500
    expect(result.breakdown[0].days).toBe(30);
    expect(result.breakdown[1].days).toBe(10);
    expect(result.totalValue).toBe(37500);
  });

  test('100 يوم = 30 كاملة + 60 ثلاثة أرباع + 10 بدون', () => {
    const result = calculateSickLeaveValue(100, 1000);
    expect(result.breakdown[0].days).toBe(30);
    expect(result.breakdown[1].days).toBe(60);
    expect(result.breakdown[2].days).toBe(10);
    // 30000 + 45000 + 0 = 75000
    expect(result.totalValue).toBe(75000);
  });

  test('120 يوم حد أقصى', () => {
    const result = calculateSickLeaveValue(120, 1000);
    // 30 × 1000 + 60 × 750 + 30 × 0 = 30000 + 45000 = 75000
    expect(result.totalValue).toBe(75000);
    const totalDaysInBreakdown = result.breakdown.reduce((s, b) => s + b.days, 0);
    expect(totalDaysInBreakdown).toBe(120);
  });
});

// ========================================
// calculateProbationEnd
// ========================================
describe('calculateProbationEnd', () => {
  test('null → isValid: false', () => {
    const result = calculateProbationEnd(null);
    expect(result.isValid).toBe(false);
  });

  test('تاريخ غير صحيح → isValid: false', () => {
    const result = calculateProbationEnd('not-a-date');
    expect(result.isValid).toBe(false);
  });

  test('تاريخ تعيين قديم → ليس في التجربة', () => {
    const result = calculateProbationEnd('2020-01-01');
    expect(result.isValid).toBe(true);
    expect(result.isOnProbation).toBe(false);
    expect(result.daysRemaining).toBe(0);
  });

  test('تاريخ تعيين مستقبلي → في التجربة', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const result = calculateProbationEnd(futureDate.toISOString().split('T')[0]);
    expect(result.isOnProbation).toBe(true);
    expect(result.daysRemaining).toBeGreaterThan(0);
    expect(result.probationDays).toBe(90);
  });

  test('فترة تجربة مخصصة', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const result = calculateProbationEnd(futureDate.toISOString().split('T')[0], 60);
    expect(result.probationDays).toBe(60);
  });
});

// ========================================
// validateContract
// ========================================
describe('validateContract', () => {
  test('null → isValid: false', () => {
    const result = validateContract(null);
    expect(result.isValid).toBe(false);
  });

  test('عقد منتهٍ', () => {
    const result = validateContract({
      contractType: 'fixed',
      startDate: '2020-01-01',
      endDate: '2023-01-01',
    });
    expect(result.isValid).toBe(true);
    expect(result.isExpired).toBe(true);
    expect(result.isActive).toBe(false);
  });

  test('عقد نشط', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);
    const result = validateContract({
      contractType: 'fixed',
      startDate: '2023-01-01',
      endDate: futureDate.toISOString().split('T')[0],
    });
    expect(result.isActive).toBe(true);
    expect(result.isExpired).toBe(false);
  });

  test('عقد يُنتهي خلال 30 يوم', () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 20);
    const result = validateContract({
      contractType: 'fixed',
      startDate: '2023-01-01',
      endDate: soonDate.toISOString().split('T')[0],
    });
    expect(result.expiresWithin30Days).toBe(true);
    expect(result.expiresWithin90Days).toBe(true);
  });

  test('عقد دائم (indefinite) بدون تاريخ انتهاء', () => {
    const result = validateContract({
      contractType: 'indefinite',
      startDate: '2020-01-01',
    });
    expect(result.isActive).toBe(true);
    expect(result.isExpired).toBe(false);
    expect(result.daysToExpiry).toBeNull();
  });
});

// ========================================
// calculateSaudizationRate
// ========================================
describe('calculateSaudizationRate', () => {
  test('صفر موظفين → no_employees', () => {
    const result = calculateSaudizationRate(0, 0);
    expect(result.status).toBe('no_employees');
  });

  test('نسبة 50% → platinum', () => {
    const result = calculateSaudizationRate(10, 5);
    expect(result.rate).toBe(50);
    expect(result.band).toBe('platinum');
    expect(result.compliant).toBe(true);
  });

  test('نسبة 33% → green', () => {
    const result = calculateSaudizationRate(9, 3);
    expect(result.rate).toBeCloseTo(33.3, 1);
    expect(result.band).toBe('green');
  });

  test('نسبة 20% → yellow', () => {
    const result = calculateSaudizationRate(10, 2);
    expect(result.band).toBe('yellow');
    expect(result.compliant).toBe(true);
  });

  test('نسبة 10% → red', () => {
    const result = calculateSaudizationRate(10, 1);
    expect(result.band).toBe('red');
    expect(result.compliant).toBe(false);
  });

  test('الفجوة لتحقيق 30%', () => {
    const result = calculateSaudizationRate(10, 1);
    // 10 × 30% = 3 سعوديين مطلوب، لدينا 1 → فجوة = 2
    expect(result.gapToTarget).toBe(2);
  });

  test('البيانات التفصيلية صحيحة', () => {
    const result = calculateSaudizationRate(10, 4);
    expect(result.totalEmployees).toBe(10);
    expect(result.saudiEmployees).toBe(4);
    expect(result.nonSaudiEmployees).toBe(6);
  });
});

// ========================================
// generateDocumentAlerts
// ========================================
describe('generateDocumentAlerts', () => {
  test('null → مصفوفة فارغة', () => {
    const result = generateDocumentAlerts(null);
    expect(result).toEqual([]);
  });

  test('موظف سعودي بدون وثائق → فارغ', () => {
    const result = generateDocumentAlerts({ isSaudi: true });
    expect(result).toHaveLength(0);
  });

  test('إقامة منتهية → تنبيه critical', () => {
    const refDate = new Date('2026-04-01');
    const employee = {
      isSaudi: false,
      iqamaExpiry: '2026-03-01', // منتهية
    };
    const result = generateDocumentAlerts(employee, refDate);
    expect(result.some(a => a.field === 'iqamaExpiry' && a.type === 'expired')).toBe(true);
    expect(result.find(a => a.field === 'iqamaExpiry').severity).toBe('critical');
  });

  test('إقامة تنتهي خلال 30 يوم → تنبيه warning', () => {
    const refDate = new Date('2026-04-01');
    const employee = {
      isSaudi: false,
      iqamaExpiry: '2026-04-25',
    };
    const result = generateDocumentAlerts(employee, refDate);
    const alert = result.find(a => a.field === 'iqamaExpiry');
    expect(alert).toBeDefined();
    expect(alert.type).toBe('expiring');
  });

  test('جواز منتهي خلال 7 أيام → urgent', () => {
    const refDate = new Date('2026-04-01');
    const employee = {
      isSaudi: false,
      passportExpiry: '2026-04-06',
    };
    const result = generateDocumentAlerts(employee, refDate);
    const alert = result.find(a => a.field === 'passportExpiry');
    expect(alert.severity).toBe('urgent');
  });

  test('SCFHS لسعودي تنتهي خلال 60 يوم → تنبيه', () => {
    const refDate = new Date('2026-04-01');
    const employee = {
      isSaudi: true,
      scfhsExpiry: '2026-05-15', // 44 يوم
    };
    const result = generateDocumentAlerts(employee, refDate);
    expect(result.some(a => a.field === 'scfhsExpiry')).toBe(true);
  });

  test('ترتيب حسب الأقرب انتهاءً', () => {
    const refDate = new Date('2026-04-01');
    const employee = {
      isSaudi: false,
      iqamaExpiry: '2026-04-30', // 29 يوم
      scfhsExpiry: '2026-04-20', // 19 يوم
    };
    const result = generateDocumentAlerts(employee, refDate);
    if (result.length >= 2) {
      expect(result[0].daysLeft).toBeLessThanOrEqual(result[1].daysLeft);
    }
  });
});

// ========================================
// Integration Scenarios
// ========================================
describe('Integration Scenarios', () => {
  test('سيناريو: كشف راتب موظف سعودي كامل', () => {
    // موظف سعودي بكل التفاصيل
    const employee = {
      id: 'emp-001',
      basicSalary: 15000,
      housingAllowance: 3750,
      transportAllowance: 1500,
      isSaudi: true,
    };

    const monthData = {
      absenceDays: 1,
      lateDays: 2,
      overtimeHours: 4,
      advanceDeduction: 1000,
    };

    const result = calculateMonthlyPayroll(employee, monthData);

    expect(result.isValid).toBe(true);
    // التحقق من المكونات الرئيسية
    expect(result.deductions.gosiEmployee).toBeGreaterThan(0);
    expect(result.deductions.absenceDeduction).toBeGreaterThan(0);
    expect(result.deductions.lateDeduction).toBeGreaterThan(0); // مرة 2 = 5%
    expect(result.earnings.overtimeAmount).toBeGreaterThan(0);
    expect(result.deductions.advanceDeduction).toBe(1000);
    expect(result.netSalary).toBeGreaterThan(0);
    expect(result.netSalary).toBeLessThan(result.earnings.totalEarnings);
  });

  test('سيناريو: حساب نهاية خدمة كاملة مع التسوية', () => {
    const eosParams = {
      hireDate: '2015-03-01',
      terminationDate: '2026-04-01',
      terminationType: 'termination',
      lastSalary: 18000, // أساسي + سكن + نقل
    };

    // خدمة ~11 سنة → كاملة
    const settlement = calculateFinalSettlement(eosParams, 20, 8000);

    expect(settlement.isValid).toBe(true);
    expect(settlement.endOfServiceAmount).toBeGreaterThan(0);
    expect(settlement.leaveSettlement).toBe(20 * 600); // 20 × (18000/30)
    expect(settlement.ticketAmount).toBe(8000);
    expect(settlement.totalSettlement).toBeGreaterThan(100000);

    const serviceDuration = calculateServiceDuration('2015-03-01', '2026-04-01');
    expect(serviceDuration.years).toBeGreaterThanOrEqual(11);
  });

  test('سيناريو: التحقق من طلبات الإجازة المختلفة', () => {
    // موظف بعد 6 سنوات → 30 يوم سنوياً
    const entitlement = calculateAnnualLeaveEntitlement(6);
    expect(entitlement).toBe(30);

    // استخدم 15 يوم، رصيد من السنة الماضية 5 أيام
    const balance = calculateLeaveBalance(entitlement, 15, 5);
    expect(balance.carryOver).toBe(Math.min(5, 15)); // max = floor(30 × 0.5) = 15
    expect(balance.remaining).toBeGreaterThan(0);

    // طلب إجازة سنوية 10 أيام
    const leaveReq = validateLeaveRequest(
      { leaveType: 'annual', startDate: '2026-05-01', endDate: '2026-05-10' },
      balance
    );
    expect(leaveReq.valid).toBe(true);
    expect(leaveReq.totalDays).toBe(10);
  });

  test('سيناريو: فحص نسبة السعودة والفجوة', () => {
    // 20 موظف، 5 سعوديين = 25%
    const saudization = calculateSaudizationRate(20, 5);
    expect(saudization.rate).toBe(25);
    expect(saudization.band).toBe('yellow');
    expect(saudization.compliant).toBe(true);

    // الفجوة = 20 × 30% - 5 = 6 - 5 = 1 موظف
    expect(saudization.gapToTarget).toBe(1);
  });
});

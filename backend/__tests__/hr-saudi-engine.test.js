/**
 * اختبارات وحدة الموارد البشرية السعودية
 * Saudi HR Engine — Unit Tests
 *
 * يغطي:
 *  - حسابات GOSI (التأمينات الاجتماعية)
 *  - مكافأة نهاية الخدمة (EOS)
 *  - استقطاعات التأخير (المادة 80)
 *  - صحة طلبات الإجازة
 *  - حساب الراتب الشهري الكامل
 *  - نسبة السعودة (نطاقات)
 */

'use strict';

const {
  calculateGOSI,
  calculateEndOfService,
  getTerminationFactor,
  calculateLateDeductions,
  calculateAnnualLeaveEntitlement,
  validateLeaveRequest,
  calculateMonthlySalary,
  calculateSaudizationRate,
  GOSI_SALARY_CEILING,
} = require('../services/hr/saudiHR.service');

// ─── Helper ───────────────────────────────────────────────────────────────────

/** تاريخ بعد N سنة من اليوم */
const yearsAgo = n => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
};

const daysAgo = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const today = () => new Date();
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
};

// ─── GOSI Tests ───────────────────────────────────────────────────────────────

describe('calculateGOSI', () => {
  describe('السعودي — Saudi Employee', () => {
    it('يحسب اشتراك GOSI بشكل صحيح للسعودي (أساسي + سكن)', () => {
      const result = calculateGOSI({
        basicSalary: 10_000,
        housingAllowance: 2_500,
        isSaudi: true,
      });

      // GOSI Base = 10000 + 2500 = 12500
      expect(result.gosiBase).toBe(12_500);

      // Employee GOSI = 12500 × 9% = 1125
      expect(result.employeeGOSI).toBe(1_125);

      // Employer GOSI = 12500 × (9% + 2%) = 1375
      expect(result.employerGOSI).toBe(1_375);

      // SANED Employee = 12500 × 0.75% = 93.75
      expect(result.sanedEmployee).toBe(93.75);

      // SANED Employer = 93.75
      expect(result.sanedEmployer).toBe(93.75);

      // Total employee deduction = 1125 + 93.75 = 1218.75
      expect(result.totalEmployeeDeduction).toBe(1_218.75);

      // Total employer contribution = 1375 + 93.75 = 1468.75
      expect(result.totalEmployerContribution).toBe(1_468.75);
    });

    it('يطبق سقف الـ 45000 على وعاء التأمينات', () => {
      const result = calculateGOSI({
        basicSalary: 40_000,
        housingAllowance: 10_000, // مجموع = 50000 > سقف
        isSaudi: true,
      });

      expect(result.gosiBase).toBe(GOSI_SALARY_CEILING); // 45000
      expect(result.employeeGOSI).toBe(4_050); // 45000 × 9%
    });

    it('يحسب بدون بدل سكن (راتب أساسي فقط)', () => {
      const result = calculateGOSI({
        basicSalary: 8_000,
        isSaudi: true,
      });

      expect(result.gosiBase).toBe(8_000);
      expect(result.employeeGOSI).toBe(720); // 8000 × 9%
      expect(result.sanedEmployee).toBe(60); // 8000 × 0.75%
    });
  });

  describe('غير السعودي — Expat Employee', () => {
    it('لا استقطاع من الموظف غير السعودي', () => {
      const result = calculateGOSI({
        basicSalary: 8_000,
        housingAllowance: 2_000,
        isSaudi: false,
      });

      expect(result.employeeGOSI).toBe(0);
      expect(result.sanedEmployee).toBe(0);
      expect(result.totalEmployeeDeduction).toBe(0);
    });

    it('صاحب العمل يدفع 2% أخطار مهنية فقط لغير السعودي', () => {
      const result = calculateGOSI({
        basicSalary: 8_000,
        housingAllowance: 2_000,
        isSaudi: false,
      });

      // Employer = 10000 × 2% = 200
      expect(result.employerGOSI).toBe(200);
      expect(result.sanedEmployer).toBe(0);
      expect(result.totalEmployerContribution).toBe(200);
    });
  });
});

// ─── End of Service Tests ─────────────────────────────────────────────────────

describe('calculateEndOfService', () => {
  const baseEmployee = {
    basicSalary: 10_000,
    housingAllowance: 2_500,
    transportAllowance: 1_000,
  };

  // آخر راتب = 10000 + 2500 + 1000 = 13500
  const lastSalary = 13_500;

  describe('إنهاء صاحب العمل — Employer Termination (100%)', () => {
    it('يحسب مكافأة كاملة لـ 5 سنوات عند الإنهاء', () => {
      const result = calculateEndOfService({
        hireDate: yearsAgo(5),
        terminationDate: today(),
        terminationType: 'termination',
        ...baseEmployee,
      });

      // 5 سنوات × نصف شهر ≈ 5 × 6750 = 33750
      // التسامح ±50 بسبب حساب السنوات الكبيسة
      expect(result.netEOS).toBeGreaterThan(33_680);
      expect(result.netEOS).toBeLessThan(33_820);
      expect(result.terminationFactor).toBe(1);
    });

    it('يحسب مكافأة 8 سنوات: 5 سنوات × نصف + 3 × كامل', () => {
      const result = calculateEndOfService({
        hireDate: yearsAgo(8),
        terminationDate: today(),
        terminationType: 'termination',
        ...baseEmployee,
      });

      // أول 5: 5 × 6750 = 33750
      // 3 سنوات بعد: 3 × 13500 = 40500
      // المجموع ≈ 74250
      expect(result.netEOS).toBeCloseTo(74_250, -1);
      expect(result.terminationFactor).toBe(1);
    });

    it('معامل إنهاء العقد = 1', () => {
      const result = calculateEndOfService({
        hireDate: yearsAgo(3),
        terminationDate: today(),
        terminationType: 'end_of_contract',
        ...baseEmployee,
      });
      expect(result.terminationFactor).toBe(1);
    });

    it('معامل التقاعد = 1', () => {
      const result = calculateEndOfService({
        hireDate: yearsAgo(20),
        terminationDate: today(),
        terminationType: 'retirement',
        ...baseEmployee,
      });
      expect(result.terminationFactor).toBe(1);
    });
  });

  describe('استقالة — Resignation (معاملات متدرجة)', () => {
    it('أقل من سنتين → صفر مكافأة', () => {
      const result = calculateEndOfService({
        hireDate: daysAgo(365), // سنة واحدة
        terminationDate: today(),
        terminationType: 'resignation',
        ...baseEmployee,
      });

      expect(result.netEOS).toBe(0);
      expect(result.terminationFactor).toBe(0);
    });

    it('3 سنوات استقالة → ثلث المكافأة', () => {
      const result = calculateEndOfService({
        hireDate: yearsAgo(3),
        terminationDate: today(),
        terminationType: 'resignation',
        ...baseEmployee,
      });

      // 3 × 6750 = 20250 × (1/3) ≈ 6750
      expect(result.terminationFactor).toBeCloseTo(1 / 3, 5);
      expect(result.netEOS).toBeGreaterThan(6_700);
      expect(result.netEOS).toBeLessThan(6_800);
    });

    it('7 سنوات استقالة → ثلثا المكافأة', () => {
      const result = calculateEndOfService({
        hireDate: yearsAgo(7),
        terminationDate: today(),
        terminationType: 'resignation',
        ...baseEmployee,
      });

      expect(result.terminationFactor).toBeCloseTo(2 / 3, 5);
    });

    it('12 سنة استقالة → مكافأة كاملة (100%)', () => {
      const result = calculateEndOfService({
        hireDate: yearsAgo(12),
        terminationDate: today(),
        terminationType: 'resignation',
        ...baseEmployee,
      });

      expect(result.terminationFactor).toBe(1);
    });
  });

  describe('بدل الإجازات المستحقة — Leave Settlement', () => {
    it('يحتسب بدل إجازات مستحقة', () => {
      const result = calculateEndOfService({
        hireDate: yearsAgo(5),
        terminationDate: today(),
        terminationType: 'termination',
        ...baseEmployee,
        leaveBalanceDays: 10,
      });

      // daily rate = 13500/30 = 450
      // leave settlement = 10 × 450 = 4500
      expect(result.leaveSettlement).toBeCloseTo(4_500, 0);
      expect(result.totalSettlement).toBeCloseTo(result.netEOS + 4_500, 0);
    });

    it('لا توجد إجازات متبقية → leaveSettlement = 0', () => {
      const result = calculateEndOfService({
        hireDate: yearsAgo(3),
        terminationDate: today(),
        terminationType: 'termination',
        ...baseEmployee,
        leaveBalanceDays: 0,
      });

      expect(result.leaveSettlement).toBe(0);
    });
  });

  describe('التحقق من الأخطاء', () => {
    it('يرمي خطأ إذا كان تاريخ الإنهاء قبل تاريخ التعيين', () => {
      expect(() =>
        calculateEndOfService({
          hireDate: today(),
          terminationDate: daysAgo(1),
          terminationType: 'termination',
          basicSalary: 5_000,
        })
      ).toThrow('تاريخ إنهاء الخدمة يجب أن يكون بعد تاريخ التعيين');
    });
  });
});

// ─── getTerminationFactor Tests ───────────────────────────────────────────────

describe('getTerminationFactor', () => {
  it('termination → 1', () => expect(getTerminationFactor('termination', 1)).toBe(1));
  it('end_of_contract → 1', () => expect(getTerminationFactor('end_of_contract', 3)).toBe(1));
  it('retirement → 1', () => expect(getTerminationFactor('retirement', 25)).toBe(1));

  it('resignation < 2 years → 0', () => expect(getTerminationFactor('resignation', 1)).toBe(0));
  it('resignation 1.9 years → 0', () => expect(getTerminationFactor('resignation', 1.9)).toBe(0));

  it('resignation 2 years exactly → 1/3', () =>
    expect(getTerminationFactor('resignation', 2)).toBeCloseTo(1 / 3, 5));
  it('resignation 4.9 years → 1/3', () =>
    expect(getTerminationFactor('resignation', 4.9)).toBeCloseTo(1 / 3, 5));

  it('resignation 5 years → 2/3', () =>
    expect(getTerminationFactor('resignation', 5)).toBeCloseTo(2 / 3, 5));
  it('resignation 9.9 years → 2/3', () =>
    expect(getTerminationFactor('resignation', 9.9)).toBeCloseTo(2 / 3, 5));

  it('resignation 10 years → 1', () => expect(getTerminationFactor('resignation', 10)).toBe(1));
  it('resignation 20 years → 1', () => expect(getTerminationFactor('resignation', 20)).toBe(1));
});

// ─── Late Deduction Tests ─────────────────────────────────────────────────────

describe('calculateLateDeductions', () => {
  const basicSalary = 6_000;
  const housingAllowance = 0;
  // daily rate = 6000/30 = 200

  it('لا تأخير → لا استقطاع', () => {
    const result = calculateLateDeductions([], basicSalary);
    expect(result.totalDeduction).toBe(0);
    expect(result.lateCount).toBe(0);
  });

  it('تأخير مرة واحدة → إنذار فقط (0 استقطاع)', () => {
    const result = calculateLateDeductions([15], basicSalary);
    expect(result.totalDeduction).toBe(0);
    expect(result.lateCount).toBe(1);
  });

  it('تأخير مرتين → 5% من أجر اليوم في المرة الثانية', () => {
    const result = calculateLateDeductions([15, 10], basicSalary);
    // daily rate 200 × 5% = 10
    expect(result.totalDeduction).toBe(10);
    expect(result.lateCount).toBe(2);
  });

  it('تأخير 3 مرات → 5% × 2 مرة = 10% من أجر اليوم', () => {
    const result = calculateLateDeductions([10, 10, 10], basicSalary);
    // المرة 2: 200 × 5% = 10
    // المرة 3: 200 × 5% = 10
    // المجموع = 20
    expect(result.totalDeduction).toBe(20);
  });

  it('تأخير 4 مرات → المرة 4 تحسب بـ 10%', () => {
    const result = calculateLateDeductions([10, 10, 10, 10], basicSalary);
    // المرة 2: 10، المرة 3: 10، المرة 4: 20
    expect(result.totalDeduction).toBe(40);
  });

  it('تأخير 7 مرات → المرة 7 تحسب بـ 15%', () => {
    const result = calculateLateDeductions([10, 10, 10, 10, 10, 10, 10], basicSalary);
    // 2,3: 5% × 200 = 10 each → 20
    // 4,5,6: 10% × 200 = 20 each → 60
    // 7: 15% × 200 = 30
    // Total = 20 + 60 + 30 = 110
    expect(result.totalDeduction).toBe(110);
  });

  it('أكثر من 9 مرات → 25% من أجر اليوم', () => {
    const lates = new Array(11).fill(5); // 11 يوم تأخير
    const result = calculateLateDeductions(lates, basicSalary);
    // 2,3: 10+10 = 20
    // 4,5,6: 20+20+20 = 60
    // 7,8,9: 30+30+30 = 90
    // 10,11: 50+50 = 100
    // Total = 270
    expect(result.totalDeduction).toBe(270);
  });

  it('يتجاهل القيم الصفرية (أيام حضور بدون تأخير)', () => {
    const result = calculateLateDeductions([0, 15, 0, 10, 0], basicSalary);
    // فقط 2 أيام تأخير: 1 إنذار + 1 استقطاع
    expect(result.lateCount).toBe(2);
    expect(result.totalDeduction).toBe(10); // 200 × 5%
  });
});

// ─── Annual Leave Entitlement Tests ──────────────────────────────────────────

describe('calculateAnnualLeaveEntitlement', () => {
  it('أقل من 5 سنوات → 21 يوم', () => {
    expect(calculateAnnualLeaveEntitlement(0)).toBe(21);
    expect(calculateAnnualLeaveEntitlement(1)).toBe(21);
    expect(calculateAnnualLeaveEntitlement(4.9)).toBe(21);
  });

  it('5 سنوات بالضبط → 30 يوم', () => {
    expect(calculateAnnualLeaveEntitlement(5)).toBe(30);
  });

  it('أكثر من 5 سنوات → 30 يوم', () => {
    expect(calculateAnnualLeaveEntitlement(10)).toBe(30);
    expect(calculateAnnualLeaveEntitlement(20)).toBe(30);
  });
});

// ─── Leave Validation Tests ───────────────────────────────────────────────────

describe('validateLeaveRequest', () => {
  const baseParams = {
    startDate: tomorrow(),
    endDate: new Date(Date.now() + 5 * 86_400_000), // 5 أيام
    gender: 'male',
    serviceYears: 3,
    remainingBalance: 21,
    hasUsedHajjLeave: false,
  };

  describe('إجازة سنوية', () => {
    it('يقبل طلب صالح ضمن الرصيد', () => {
      const errors = validateLeaveRequest({ ...baseParams, leaveType: 'annual' });
      expect(errors).toHaveLength(0);
    });

    it('يرفض إذا تجاوز الرصيد المتبقي', () => {
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'annual',
        remainingBalance: 3,
        endDate: new Date(Date.now() + 10 * 86_400_000), // 10 أيام
      });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('الرصيد المتبقي');
    });
  });

  describe('إجازة مرضية', () => {
    it('يقبل 30 يوم مرضي', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 29 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'sick',
        startDate: start,
        endDate: end,
      });
      expect(errors).toHaveLength(0);
    });

    it('يرفض أكثر من 120 يوم مرضي', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 121 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'sick',
        startDate: start,
        endDate: end,
      });
      expect(errors.some(e => e.includes('120'))).toBe(true);
    });
  });

  describe('إجازة أمومة', () => {
    it('تقبل للمرأة 70 يوم أو أقل', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 69 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'maternity',
        gender: 'female',
        startDate: start,
        endDate: end,
      });
      expect(errors).toHaveLength(0);
    });

    it('ترفض للرجل', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 9 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'maternity',
        gender: 'male',
        startDate: start,
        endDate: end,
      });
      expect(errors.some(e => e.includes('للإناث'))).toBe(true);
    });

    it('ترفض أكثر من 70 يوم', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 71 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'maternity',
        gender: 'female',
        startDate: start,
        endDate: end,
      });
      expect(errors.some(e => e.includes('70') || e.includes('10 أسابيع'))).toBe(true);
    });
  });

  describe('إجازة أبوة', () => {
    it('تقبل 3 أيام للرجل', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 2 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'paternity',
        gender: 'male',
        startDate: start,
        endDate: end,
      });
      expect(errors).toHaveLength(0);
    });

    it('ترفض للمرأة', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 2 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'paternity',
        gender: 'female',
        startDate: start,
        endDate: end,
      });
      expect(errors.some(e => e.includes('للذكور'))).toBe(true);
    });

    it('ترفض أكثر من 3 أيام', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 4 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'paternity',
        gender: 'male',
        startDate: start,
        endDate: end,
      });
      expect(errors.some(e => e.includes('3 أيام'))).toBe(true);
    });
  });

  describe('إجازة حج', () => {
    it('تقبل أول مرة بعد سنتين بين 10-15 يوم', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 11 * 86_400_000); // 12 يوم
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'hajj',
        serviceYears: 3,
        hasUsedHajjLeave: false,
        startDate: start,
        endDate: end,
      });
      expect(errors).toHaveLength(0);
    });

    it('ترفض إذا سبق استخدامها', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 11 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'hajj',
        serviceYears: 5,
        hasUsedHajjLeave: true,
        startDate: start,
        endDate: end,
      });
      expect(errors.some(e => e.includes('لمرة واحدة'))).toBe(true);
    });

    it('ترفض قبل سنتين من الخدمة', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 11 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'hajj',
        serviceYears: 1,
        hasUsedHajjLeave: false,
        startDate: start,
        endDate: end,
      });
      expect(errors.some(e => e.includes('سنتين'))).toBe(true);
    });

    it('ترفض أقل من 10 أيام', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 8 * 86_400_000); // 9 أيام
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'hajj',
        serviceYears: 3,
        hasUsedHajjLeave: false,
        startDate: start,
        endDate: end,
      });
      expect(errors.some(e => e.includes('10 و15'))).toBe(true);
    });
  });

  describe('إجازة زواج / وفاة', () => {
    it('تقبل إجازة زواج 5 أيام', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 4 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'marriage',
        startDate: start,
        endDate: end,
      });
      expect(errors).toHaveLength(0);
    });

    it('ترفض إجازة زواج أكثر من 5 أيام', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 6 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'marriage',
        startDate: start,
        endDate: end,
      });
      expect(errors.some(e => e.includes('5 أيام'))).toBe(true);
    });

    it('ترفض إجازة وفاة أكثر من 5 أيام', () => {
      const start = tomorrow();
      const end = new Date(start.getTime() + 6 * 86_400_000);
      const errors = validateLeaveRequest({
        ...baseParams,
        leaveType: 'bereavement',
        startDate: start,
        endDate: end,
      });
      expect(errors.some(e => e.includes('5 أيام'))).toBe(true);
    });
  });

  it('يرفض إذا كانت تاريخ النهاية قبل البداية', () => {
    const errors = validateLeaveRequest({
      ...baseParams,
      leaveType: 'annual',
      startDate: tomorrow(),
      endDate: daysAgo(1),
    });
    expect(errors.some(e => e.includes('بعد تاريخ البداية'))).toBe(true);
  });

  it('يرفض نوع إجازة غير معروف', () => {
    const errors = validateLeaveRequest({ ...baseParams, leaveType: 'unknown_type' });
    expect(errors.some(e => e.includes('غير معروف'))).toBe(true);
  });
});

// ─── Monthly Salary Tests ─────────────────────────────────────────────────────

describe('calculateMonthlySalary', () => {
  const saudiEmployee = {
    basicSalary: 10_000,
    housingAllowance: 2_500,
    transportAllowance: 1_000,
    isSaudi: true,
  };

  const expatEmployee = {
    basicSalary: 8_000,
    housingAllowance: 2_000,
    transportAllowance: 500,
    isSaudi: false,
  };

  describe('راتب سعودي بدون غياب أو تأخير', () => {
    it('يحسب صافي الراتب الصحيح للسعودي', () => {
      const result = calculateMonthlySalary({ employee: saudiEmployee });

      expect(result.totalEarnings).toBe(13_500); // 10000+2500+1000
      expect(result.absenceDeduction).toBe(0);
      expect(result.lateDeduction).toBe(0);
      expect(result.overtimeAmount).toBe(0);

      // GOSI + SANED = (10000+2500) × (9% + 0.75%) = 12500 × 9.75% = 1218.75
      expect(result.gosi.totalEmployeeDeduction).toBe(1_218.75);

      // net = 13500 - 1218.75 = 12281.25
      expect(result.netSalary).toBe(12_281.25);
    });
  });

  describe('راتب غير سعودي', () => {
    it('صافي راتب غير السعودي = إجمالي بدون استقطاع GOSI', () => {
      const result = calculateMonthlySalary({ employee: expatEmployee });

      expect(result.totalEarnings).toBe(10_500); // 8000+2000+500
      expect(result.gosi.totalEmployeeDeduction).toBe(0);
      expect(result.netSalary).toBe(10_500);
    });
  });

  describe('مع غياب', () => {
    it('يستقطع أجر يوم الغياب', () => {
      const result = calculateMonthlySalary({ employee: saudiEmployee, absentDays: 1 });

      // daily rate = 13500/30 = 450
      expect(result.absenceDeduction).toBe(450);
    });

    it('يستقطع أجر 3 أيام غياب', () => {
      const result = calculateMonthlySalary({ employee: saudiEmployee, absentDays: 3 });
      expect(result.absenceDeduction).toBe(1_350);
    });
  });

  describe('مع عمل إضافي', () => {
    it('يحسب الإضافي بـ 150% من الأجر العادي', () => {
      const result = calculateMonthlySalary({ employee: saudiEmployee, overtimeHours: 8 });

      // hourly rate = (10000+2500) / 30 / 8 = 52.0833
      // overtime = 8 × 52.0833 × 1.5 ≈ 625
      expect(result.overtimeAmount).toBeCloseTo(625, 0);
      expect(result.grossPay).toBeCloseTo(14_125, 0);
    });
  });

  describe('مع تأخير', () => {
    it('تأخير مرتين = استقطاع مرة واحدة (5%)', () => {
      const result = calculateMonthlySalary({
        employee: saudiEmployee,
        lateMinutesPerDay: [15, 20],
      });

      // daily rate (basic+housing)/30 = 12500/30 = 416.67
      // 5% × 416.67 ≈ 20.83
      expect(result.lateDeduction).toBeCloseTo(20.83, 1);
      expect(result.lateCount).toBe(2);
    });
  });

  describe('مع سلفة وقرض', () => {
    it('يستقطع السلفة والقرض من صافي الراتب', () => {
      const result = calculateMonthlySalary({
        employee: saudiEmployee,
        advanceDeduction: 500,
        loanDeduction: 300,
      });

      expect(result.advanceDeduction).toBe(500);
      expect(result.loanDeduction).toBe(300);
      expect(result.netSalary).toBe(
        result.grossPay - result.gosi.totalEmployeeDeduction - 500 - 300
      );
    });
  });
});

// ─── Saudization Rate Tests ───────────────────────────────────────────────────

describe('calculateSaudizationRate', () => {
  it('يحسب نسبة السعودة بشكل صحيح', () => {
    const result = calculateSaudizationRate(100, 30);
    expect(result.rate).toBe(30);
  });

  it('شريط بلاتيني (≥35%)', () => {
    expect(calculateSaudizationRate(100, 40).band).toBe('platinum');
    expect(calculateSaudizationRate(100, 35).band).toBe('platinum');
  });

  it('شريط أخضر مرتفع (25-35%)', () => {
    expect(calculateSaudizationRate(100, 30).band).toBe('green_high');
  });

  it('شريط أخضر متوسط (20-25%)', () => {
    expect(calculateSaudizationRate(100, 22).band).toBe('green_medium');
  });

  it('شريط أخضر منخفض (15-20%)', () => {
    expect(calculateSaudizationRate(100, 17).band).toBe('green_low');
  });

  it('شريط أصفر (10-15%)', () => {
    expect(calculateSaudizationRate(100, 12).band).toBe('yellow');
  });

  it('شريط أحمر (<10%)', () => {
    expect(calculateSaudizationRate(100, 5).band).toBe('red');
    expect(calculateSaudizationRate(100, 0).band).toBe('red');
  });

  it('لا موظفين → rate = 0', () => {
    const result = calculateSaudizationRate(0, 0);
    expect(result.rate).toBe(0);
  });
});

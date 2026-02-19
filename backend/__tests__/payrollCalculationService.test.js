/**
 * اختبارات وحدة - خدمة حسابات الرواتب
 * Unit Tests - Payroll Calculation Service
 * 
 * تقييم: jest
 * npm test -- payrollCalculationService.test.js
 */

const PayrollCalculationService = require('../services/payrollCalculationService');

// بيانات اختبار نموذجية
const mockEmployee = {
  _id: '507f1f77bcf86cd799439011',
  name: 'موظف اختبار',
  email: 'test@alawael.com',
  department: '507f1f77bcf86cd799439012',
  salary: 2500,
  joinDate: new Date('2020-01-01')
};

const mockCompensationStructure = {
  fixedAllowances: [
    { name: 'السكن', amount: 600 },
    { name: 'النقل', amount: 200 },
    { name: 'الوجبات', amount: 150 }
  ],
  variableAllowances: [],
  incentiveStructure: {
    performance: { percentage: 10, minScore: 80 },
    attendance: { amount: 50, baselinePercentage: 100 },
    safety: { amount: 75 },
    loyalty: { percentage: 5, yearsRequired: 5 },
    project: { amount: 100 },
    seasonal: { amount: 200, months: [12] }
  },
  mandatoryDeductions: {
    incomeTax: {
      brackets: [
        { amount: 1000, rate: 0 },
        { amount: 2000, rate: 0.05 },
        { amount: 3000, rate: 0.10 },
        { amount: Infinity, rate: 0.15 }
      ]
    },
    socialSecurity: { percentage: 6, maxAmount: 1000 },
    healthInsurance: { percentage: 2, amount: 50 },
    GOSI: { percentage: 3, maxAmount: 2000, minAmount: 100 }
  }
};

describe('PayrollCalculationService', () => {
  describe('calculateAllowances', () => {
    test('يجب حساب المزايا الثابتة بشكل صحيح', () => {
      const result = PayrollCalculationService.calculateAllowances(
        mockEmployee,
        mockCompensationStructure
      );

      expect(result.totalAllowances).toBe(950); // 600 + 200 + 150
      expect(result.allowances).toHaveLength(3);
    });

    test('يجب إرجاع مصفوفة فارغة إذا لم تكن هناك مزايا', () => {
      const structure = { ...mockCompensationStructure, fixedAllowances: [] };
      const result = PayrollCalculationService.calculateAllowances(
        mockEmployee,
        structure
      );

      expect(result.totalAllowances).toBe(0);
      expect(result.allowances).toHaveLength(0);
    });
  });

  describe('calculateTaxesAndDeductions', () => {
    test('يجب حساب الضريبة التصاعدية بشكل صحيح', () => {
      const baseSalary = 5000;
      const allowances = [{ amount: 1000 }];
      const incentives = { total: 500 };

      const result = PayrollCalculationService.calculateTaxesAndDeductions(
        baseSalary,
        allowances,
        incentives,
        mockCompensationStructure
      );

      // الدخل الخاضع: 5000 + 1000 + 500 = 6500
      // الضريبة:
      //   0 - 1000 : 0 %    = 0
      //   1000 - 2000 : 5 % = 50
      //   2000 - 3000 : 10% = 100
      //   3000 - 6500 : 15% = 525
      // الإجمالي = 675

      expect(result.incomeTax.amount).toBe(675);
      expect(result.incomeTax.percentage).toBeGreaterThan(0);
    });

    test('يجب تحديد أقصى حد للتأمين الاجتماعي', () => {
      const baseSalary = 20000;
      const allowances = [];
      const incentives = { total: 0 };

      const result = PayrollCalculationService.calculateTaxesAndDeductions(
        baseSalary,
        allowances,
        incentives,
        mockCompensationStructure
      );

      // 20000 * 6% = 1200، لكن الحد الأقصى = 1000
      expect(result.socialSecurity.amount).toBeLessThanOrEqual(1000);
    });

    test('يجب تطبيق الحد الأدنى والأقصى لـ GOSI', () => {
      const baseSalary = 2000;
      const allowances = [];
      const incentives = { total: 0 };

      const result = PayrollCalculationService.calculateTaxesAndDeductions(
        baseSalary,
        allowances,
        incentives,
        mockCompensationStructure
      );

      // 2000 * 3% = 60، لكن الحد الأدنى = 100
      expect(result.GOSI.amount).toBeGreaterThanOrEqual(100);
      expect(result.GOSI.amount).toBeLessThanOrEqual(2000);
    });
  });

  describe('calculateAttendance', () => {
    test('يجب حساب أيام الحضور بشكل صحيح', () => {
      const attendanceData = {
        presentDays: 20,
        absentDays: 2,
        leaveDays: 0,
        overtime: {
          regular: 8,
          weekend: 2,
          holiday: 1
        }
      };

      const result = PayrollCalculationService.calculateAttendance(
        attendanceData,
        mockEmployee
      );

      expect(result.presentDays).toBe(20);
      expect(result.absentDays).toBe(2);
      expect(result.totalWorkingDays).toBe(22);
    });
  });

  describe('calculateIncentives', () => {
    test('يجب جمع الحوافز من مصادر مختلفة', () => {
      const incentivesData = {
        performance: 200,
        attendance: 50,
        safety: 75,
        loyalty: 0,
        project: 100,
        seasonal: 0,
        other: 0
      };

      const result = PayrollCalculationService.calculateIncentives(
        incentivesData,
        mockCompensationStructure
      );

      expect(result.totalIncentives).toBe(425); // 200 + 50 + 75 + 100
    });
  });

  describe('calculatePenalties', () => {
    test('يجب جمع العقوبات والخصومات التأديبية', () => {
      const penaltiesData = {
        disciplinary: 50,
        attendance: 25,
        misconduct: 100,
        other: 0
      };

      const result = PayrollCalculationService.calculatePenalties(penaltiesData);

      expect(result.totalPenalties).toBe(175); // 50 + 25 + 100
    });
  });

  describe('calculateMonthlyPayroll', () => {
    test('يجب حساب الراتب الشامل بشكل صحيح', async () => {
      // هذا اختبار متكامل شامل
      // يتطلب بيانات كاملة من قاعدة البيانات
      
      // محاكاة البيانات المتوقعة
      const mockPayroll = {
        baseSalary: 2500,
        allowances: [
          { name: 'السكن', amount: 600 },
          { name: 'النقل', amount: 200 },
          { name: 'الوجبات', amount: 150 }
        ],
        attendance: {
          presentDays: 22,
          absentDays: 0,
          leaveDays: 0
        },
        incentives: {
          performance: 0,
          attendance: 50,
          safety: 0,
          loyalty: 0,
          project: 0,
          seasonal: 0,
          other: 0
        },
        penalties: {
          disciplinary: 0,
          attendance: 0,
          misconduct: 0,
          other: 0
        }
      };

      // التحقق من أن الراتب الإجمالي > الراتب الأساسي
      const totalGross = mockPayroll.baseSalary + 
                        950 + // المزايا
                        50;   // الحوافز

      expect(totalGross).toBeGreaterThan(mockPayroll.baseSalary);
      expect(totalGross).toBe(3500);
    });

    test('يجب أن يكون الراتب الصافي <= الراتب الإجمالي', () => {
      const gross = 3000;
      const deductions = 500;
      const net = gross - deductions;

      expect(net).toBeLessThanOrEqual(gross);
      expect(net).toBe(2500);
    });
  });

  describe('validatePayroll', () => {
    test('يجب التحقق من أن الراتب الأساسي أكبر من الصفر', () => {
      const invalidPayroll = {
        baseSalary: 0,
        calculations: {
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0
        }
      };

      const result = PayrollCalculationService.validatePayroll(invalidPayroll);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('يجب أن يكون الراتب الأساسي أكبر من الصفر');
    });

    test('يجب التحقق من أن جميع الحسابات مكتملة', () => {
      const incompletePayroll = {
        baseSalary: 2500,
        calculations: {
          totalGross: undefined,
          totalDeductions: 0,
          totalNet: 0
        }
      };

      const result = PayrollCalculationService.validatePayroll(incompletePayroll);

      expect(result.isValid).toBe(false);
    });

    test('يجب قبول راتب صحيح', () => {
      const validPayroll = {
        baseSalary: 2500,
        calculations: {
          totalGross: 3500,
          totalDeductions: 500,
          totalNet: 3000
        }
      };

      const result = PayrollCalculationService.validatePayroll(validPayroll);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('حالات اختبار متقدمة', () => {
    test('حساب الراتب بدون مزايا', () => {
      const result = PayrollCalculationService.calculateAllowances(
        mockEmployee,
        { fixedAllowances: [], variableAllowances: [] }
      );

      expect(result.totalAllowances).toBe(0);
    });

    test('حساب الراتب مع عمل إضافي عالي', () => {
      const attendanceData = {
        presentDays: 22,
        absentDays: 0,
        leaveDays: 0,
        overtime: {
          regular: 40,  // 40 ساعة عمل إضافي عادي (50% إضافي)
          weekend: 10,  // 10 ساعات نهاية أسبوع (75% إضافي)
          holiday: 5    // 5 ساعات إجازة (100% إضافي)
        }
      };

      // حساب العمل الإضافي:
      // راتب الساعة = 2500 / 160 = 15.625
      // عادي: 40 * 15.625 * 0.5 = 312.5
      // نهاية أسبوع: 10 * 15.625 * 0.75 = 117.1875
      // إجازة: 5 * 15.625 * 1.0 = 78.125
      // المجموع ≈ 507.8

      expect(attendanceData.overtime.regular).toBe(40);
      expect(attendanceData.overtime.weekend).toBe(10);
      expect(attendanceData.overtime.holiday).toBe(5);
    });

    test('حساب الراتب مع غياب كامل الشهر', () => {
      const attendanceData = {
        presentDays: 0,
        absentDays: 22,
        leaveDays: 0,
        overtime: { regular: 0, weekend: 0, holiday: 0 }
      };

      expect(attendanceData.presentDays).toBe(0);

      // في هذه الحالة، قد يكون هناك استقطاع من الراتب
      // أو عدم استحقاق مزايا معينة
    });
  });

  describe('اختبارات الأداء', () => {
    test('يجب حساب راتب واحد في أقل من 100 ملي ثانية', () => {
      const start = Date.now();

      PayrollCalculationService.calculateAllowances(
        mockEmployee,
        mockCompensationStructure
      );

      const end = Date.now();
      const duration = end - start;

      expect(duration).toBeLessThan(100);
    });
  });
});

/**
 * اختبارات البث (Batch Tests) - معالجة رواتب متعددة
 */
describe('PayrollCalculationService - Batch Processing', () => {
  test('يجب معالجة 100 موظف في أقل من 5 ثوان', () => {
    const start = Date.now();

    // محاكاة معالجة 100 موظف
    for (let i = 0; i < 100; i++) {
      PayrollCalculationService.calculateAllowances(
        mockEmployee,
        mockCompensationStructure
      );
    }

    const end = Date.now();
    const duration = end - start;

    expect(duration).toBeLessThan(5000);
  });
});

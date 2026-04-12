/**
 * Unit Tests — payrollCalculationService.js
 * Sync static methods only — allowances, attendance, incentives, penalties, taxes, validation
 */
'use strict';

const PayrollCalculationService = require('../../services/payrollCalculationService');

// Helper: minimal payroll object
const makePayroll = (overrides = {}) => ({
  baseSalary: 10000,
  allowances: [],
  attendance: {},
  incentives: {
    performanceBonus: 0,
    attendanceBonus: 0,
    safetyBonus: 0,
    loyaltyBonus: 0,
    projectBonus: 0,
    seasonalBonus: 0,
    other: [],
  },
  penalties: {
    disciplinary: 0,
    attendance: 0,
    misconduct: 0,
    other: [],
  },
  taxes: {},
  calculations: { totalGross: 15000, totalNet: 12000 },
  ...overrides,
});

// ═══════════════════════════════════════
//  calculateAllowances
// ═══════════════════════════════════════
describe('calculateAllowances', () => {
  it('returns 0 when no compensation structure', () => {
    const payroll = makePayroll();
    const r = PayrollCalculationService.calculateAllowances(payroll, null, {});
    expect(r.totalAllowances).toBe(0);
    expect(r.allowances).toEqual([]);
  });

  it('returns 0 when no fixedAllowances', () => {
    const payroll = makePayroll();
    const r = PayrollCalculationService.calculateAllowances(payroll, {}, {});
    expect(r.totalAllowances).toBe(0);
  });

  it('calculates fixed allowances by amount', () => {
    const payroll = makePayroll();
    const comp = {
      fixedAllowances: [
        { name: 'Housing', amount: 2500, frequency: 'monthly' },
        { name: 'Transport', amount: 500, frequency: 'monthly' },
      ],
    };
    const r = PayrollCalculationService.calculateAllowances(payroll, comp, {});
    expect(r.totalAllowances).toBe(3000);
    expect(r.allowances).toHaveLength(2);
    expect(r.allowances[0].isFixed).toBe(true);
  });

  it('calculates percentage-based allowance', () => {
    const payroll = makePayroll({ baseSalary: 10000 });
    const comp = {
      fixedAllowances: [{ name: 'Housing', percentage: 25, frequency: 'monthly' }],
    };
    const r = PayrollCalculationService.calculateAllowances(payroll, comp, {});
    expect(r.totalAllowances).toBe(2500);
  });

  it('includes variable allowances when criteria met', () => {
    const payroll = makePayroll();
    const comp = {
      fixedAllowances: [],
      variableAllowances: [{ name: 'Danger', amount: 1000, condition: null }],
    };
    const r = PayrollCalculationService.calculateAllowances(payroll, comp, {});
    expect(r.allowances.some(a => a.name === 'Danger')).toBe(true);
    expect(r.allowances.find(a => a.name === 'Danger').isFixed).toBe(false);
  });

  it('applies maxCap to variable allowance', () => {
    const payroll = makePayroll({ baseSalary: 10000 });
    const comp = {
      fixedAllowances: [],
      variableAllowances: [{ name: 'Bonus', percentage: 50, maxCap: 2000, condition: null }],
    };
    const r = PayrollCalculationService.calculateAllowances(payroll, comp, {});
    const bonus = r.allowances.find(a => a.name === 'Bonus');
    expect(bonus.amount).toBe(2000); // capped
  });
});

// ═══════════════════════════════════════
//  calculateAttendance
// ═══════════════════════════════════════
describe('calculateAttendance', () => {
  it('maps attendance data correctly', () => {
    const payroll = makePayroll();
    PayrollCalculationService.calculateAttendance(
      payroll,
      {
        presentDays: 20,
        absentDays: 2,
        workingDays: 22,
        overtime: { regular: 5, weekend: 2, holiday: 1 },
      },
      { paid: 3, unpaid: 1 }
    );
    expect(payroll.attendance.presentDays).toBe(20);
    expect(payroll.attendance.absentDays).toBe(2);
    expect(payroll.attendance.leaveDays).toBe(4); // 3+1
    expect(payroll.attendance.unpaidLeaveDays).toBe(1);
    expect(payroll.attendance.actualWorkingDays).toBe(23); // 20+3
    expect(payroll.attendance.overtime.regularOvertime).toBe(5);
    expect(payroll.attendance.overtime.weekendOvertime).toBe(2);
    expect(payroll.attendance.overtime.holidayOvertime).toBe(1);
  });

  it('defaults to 0 when data missing', () => {
    const payroll = makePayroll();
    PayrollCalculationService.calculateAttendance(payroll, {}, null);
    expect(payroll.attendance.presentDays).toBe(0);
    expect(payroll.attendance.workingDays).toBe(22);
    expect(payroll.attendance.unpaidLeaveDays).toBe(0);
  });
});

// ═══════════════════════════════════════
//  calculateIncentives
// ═══════════════════════════════════════
describe('calculateIncentives', () => {
  it('routes by incentiveType', () => {
    const payroll = makePayroll();
    PayrollCalculationService.calculateIncentives(payroll, [
      { incentiveType: 'performance', amount: 1000 },
      { incentiveType: 'attendance', amount: 500 },
      { incentiveType: 'safety', amount: 300 },
      { incentiveType: 'loyalty', amount: 200 },
      { incentiveType: 'project', amount: 400 },
      { incentiveType: 'seasonal', amount: 100 },
    ]);
    expect(payroll.incentives.performanceBonus).toBe(1000);
    expect(payroll.incentives.attendanceBonus).toBe(500);
    expect(payroll.incentives.safetyBonus).toBe(300);
    expect(payroll.incentives.loyaltyBonus).toBe(200);
    expect(payroll.incentives.projectBonus).toBe(400);
    expect(payroll.incentives.seasonalBonus).toBe(100);
  });

  it('unknown type → other', () => {
    const payroll = makePayroll();
    PayrollCalculationService.calculateIncentives(payroll, [
      { incentiveType: 'special', amount: 800, reason: 'one-time' },
    ]);
    expect(payroll.incentives.other).toHaveLength(1);
    expect(payroll.incentives.other[0].amount).toBe(800);
  });

  it('no-op for empty array', () => {
    const payroll = makePayroll();
    PayrollCalculationService.calculateIncentives(payroll, []);
    expect(payroll.incentives.performanceBonus).toBe(0);
  });

  it('no-op for null', () => {
    const payroll = makePayroll();
    PayrollCalculationService.calculateIncentives(payroll, null);
    expect(payroll.incentives.performanceBonus).toBe(0);
  });
});

// ═══════════════════════════════════════
//  calculatePenalties
// ═══════════════════════════════════════
describe('calculatePenalties', () => {
  it('routes by penaltyType', () => {
    const payroll = makePayroll();
    PayrollCalculationService.calculatePenalties(payroll, [
      { penaltyType: 'disciplinary', amount: 500 },
      { penaltyType: 'attendance', amount: 300 },
      { penaltyType: 'misconduct', amount: 200 },
    ]);
    expect(payroll.penalties.disciplinary).toBe(500);
    expect(payroll.penalties.attendance).toBe(300);
    expect(payroll.penalties.misconduct).toBe(200);
  });

  it('unknown type → other', () => {
    const payroll = makePayroll();
    PayrollCalculationService.calculatePenalties(payroll, [
      { penaltyType: 'custom', amount: 100, reason: 'late' },
    ]);
    expect(payroll.penalties.other).toHaveLength(1);
  });

  it('no-op for null', () => {
    const payroll = makePayroll();
    PayrollCalculationService.calculatePenalties(payroll, null);
    expect(payroll.penalties.disciplinary).toBe(0);
  });
});

// ═══════════════════════════════════════
//  calculateTaxesAndDeductions
// ═══════════════════════════════════════
describe('calculateTaxesAndDeductions', () => {
  it('applies income tax from bracket', () => {
    const payroll = makePayroll({ calculations: { totalGross: 10000 } });
    payroll.taxes = {};
    const comp = {
      taxes: {
        incomeTax: {
          brackets: [
            { minIncome: 0, maxIncome: 5000, taxRate: 0 },
            { minIncome: 5001, maxIncome: 20000, taxRate: 10 },
          ],
        },
      },
    };
    PayrollCalculationService.calculateTaxesAndDeductions(payroll, comp);
    expect(payroll.taxes.incomeTax).toBe(1000); // 10% of 10000
    expect(payroll.taxes.taxableIncome).toBe(10000);
  });

  it('social security with cap', () => {
    const payroll = makePayroll({ calculations: { totalGross: 50000 } });
    payroll.taxes = {};
    const comp = {
      mandatoryDeductions: {
        socialSecurity: { enabled: true, employeePercentage: 10, maxCap: 2000 },
      },
    };
    PayrollCalculationService.calculateTaxesAndDeductions(payroll, comp);
    expect(payroll.taxes.socialSecurity).toBe(2000); // capped
    expect(payroll.taxes.socialSecurityPercentage).toBe(10);
  });

  it('health insurance percentage', () => {
    const payroll = makePayroll({ calculations: { totalGross: 10000 } });
    payroll.taxes = {};
    const comp = {
      mandatoryDeductions: {
        healthInsurance: { enabled: true, employeePercentage: 5 },
      },
    };
    PayrollCalculationService.calculateTaxesAndDeductions(payroll, comp);
    expect(payroll.taxes.healthInsurance).toBe(500);
  });

  it('no deductions when comp structure empty', () => {
    const payroll = makePayroll();
    payroll.taxes = {};
    PayrollCalculationService.calculateTaxesAndDeductions(payroll, {});
    expect(payroll.taxes.incomeTax).toBe(0);
  });
});

// ═══════════════════════════════════════
//  isApplicable
// ═══════════════════════════════════════
describe('isApplicable', () => {
  it('all → always true', () => {
    expect(PayrollCalculationService.isApplicable({ applicableTo: 'all' }, {})).toBe(true);
  });

  it('department match', () => {
    const s = { applicableTo: 'department', applicationCriteria: { departments: ['IT', 'HR'] } };
    expect(PayrollCalculationService.isApplicable(s, { departmentName: 'IT' })).toBe(true);
    expect(PayrollCalculationService.isApplicable(s, { departmentName: 'Finance' })).toBe(false);
  });

  it('role match', () => {
    const s = { applicableTo: 'role', applicationCriteria: { roles: ['Engineer'] } };
    expect(PayrollCalculationService.isApplicable(s, { jobTitle: 'Engineer' })).toBe(true);
    expect(PayrollCalculationService.isApplicable(s, { jobTitle: 'Driver' })).toBe(false);
  });

  it('position match', () => {
    const s = { applicableTo: 'position', applicationCriteria: { positions: ['Manager'] } };
    expect(PayrollCalculationService.isApplicable(s, { position: 'Manager' })).toBe(true);
  });

  it('salary range filter', () => {
    const s = {
      applicableTo: 'custom',
      applicationCriteria: { minSalary: 5000, maxSalary: 15000 },
    };
    expect(PayrollCalculationService.isApplicable(s, { baseSalary: 10000 })).toBe(true);
    expect(PayrollCalculationService.isApplicable(s, { baseSalary: 3000 })).toBe(false);
    expect(PayrollCalculationService.isApplicable(s, { baseSalary: 20000 })).toBe(false);
  });
});

// ═══════════════════════════════════════
//  meetsCriteria
// ═══════════════════════════════════════
describe('meetsCriteria', () => {
  it('null condition → true', () => {
    expect(PayrollCalculationService.meetsCriteria({}, null)).toBe(true);
  });

  it('high qualification check', () => {
    expect(
      PayrollCalculationService.meetsCriteria(
        { qualifications: ['advanced', 'phd'] },
        'high qualification'
      )
    ).toBe(true);
    expect(
      PayrollCalculationService.meetsCriteria({ qualifications: ['basic'] }, 'high qualification')
    ).toBe(false);
  });

  it('management check', () => {
    expect(PayrollCalculationService.meetsCriteria({ level: 'manager' }, 'management')).toBe(true);
    expect(PayrollCalculationService.meetsCriteria({ level: 'director' }, 'management')).toBe(true);
    expect(PayrollCalculationService.meetsCriteria({ level: 'junior' }, 'management')).toBe(false);
  });

  it('unknown condition → true', () => {
    expect(PayrollCalculationService.meetsCriteria({}, 'something_else')).toBe(true);
  });
});

// ═══════════════════════════════════════
//  getLastDayOfMonth
// ═══════════════════════════════════════
describe('getLastDayOfMonth', () => {
  it('January 2025', () => {
    const d = PayrollCalculationService.getLastDayOfMonth('2025-01', 2025);
    expect(d.getDate()).toBe(31);
  });

  it('February 2024 (leap)', () => {
    const d = PayrollCalculationService.getLastDayOfMonth('2024-02', 2024);
    expect(d.getDate()).toBe(29);
  });

  it('February 2025 (non-leap)', () => {
    const d = PayrollCalculationService.getLastDayOfMonth('2025-02', 2025);
    expect(d.getDate()).toBe(28);
  });

  it('April → 30', () => {
    const d = PayrollCalculationService.getLastDayOfMonth('2025-04', 2025);
    expect(d.getDate()).toBe(30);
  });
});

// ═══════════════════════════════════════
//  validatePayroll (sync object path)
// ═══════════════════════════════════════
describe('validatePayroll — object input', () => {
  it('valid payroll → isValid true', () => {
    const r = PayrollCalculationService.validatePayroll({
      baseSalary: 5000,
      calculations: { totalGross: 6000, totalNet: 5000 },
    });
    expect(r.isValid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('missing baseSalary → error', () => {
    const r = PayrollCalculationService.validatePayroll({
      baseSalary: 0,
      calculations: { totalGross: 0, totalNet: 0 },
    });
    expect(r.isValid).toBe(false);
    expect(r.errors.some(e => e.includes('الراتب الأساسي'))).toBe(true);
  });

  it('missing calculations → error', () => {
    const r = PayrollCalculationService.validatePayroll({ baseSalary: 5000 });
    expect(r.isValid).toBe(false);
    expect(r.errors.some(e => e.includes('الحسابات'))).toBe(true);
  });

  it('missing totalGross → error', () => {
    const r = PayrollCalculationService.validatePayroll({
      baseSalary: 5000,
      calculations: { totalNet: 4000 },
    });
    expect(r.isValid).toBe(false);
    expect(r.errors.some(e => e.includes('إجمالي'))).toBe(true);
  });

  it('missing totalNet → error', () => {
    const r = PayrollCalculationService.validatePayroll({
      baseSalary: 5000,
      calculations: { totalGross: 6000 },
    });
    expect(r.isValid).toBe(false);
    expect(r.errors.some(e => e.includes('صافي'))).toBe(true);
  });
});

/**
 * Unit Tests — saudiLaborCalculations.service.js
 * Pure Saudi labor law calculations — NO mocks needed
 */
'use strict';

const labor = require('../../services/hr/saudiLaborCalculations.service');

// ═══════════════════════════════════════
//  Constants
// ═══════════════════════════════════════
describe('constants', () => {
  it('GOSI rates', () => {
    expect(labor.GOSI_SAUDI_EMPLOYEE_RATE).toBe(0.09);
    expect(labor.GOSI_SAUDI_EMPLOYER_RATE).toBe(0.09);
    expect(labor.GOSI_OCCUPATIONAL_HAZARD_RATE).toBe(0.02);
    expect(labor.GOSI_NON_SAUDI_EMPLOYEE_RATE).toBe(0);
    expect(labor.GOSI_NON_SAUDI_EMPLOYER_RATE).toBe(0.02);
    expect(labor.GOSI_MAX_BASE).toBe(45000);
  });

  it('SANED rates', () => {
    expect(labor.SANED_EMPLOYEE_RATE).toBe(0.0075);
    expect(labor.SANED_EMPLOYER_RATE).toBe(0.0075);
  });

  it('minimum wage', () => {
    expect(labor.MINIMUM_WAGE_SAUDI).toBe(4000);
  });

  it('leave entitlements', () => {
    expect(labor.ANNUAL_LEAVE_LESS_THAN_5_YEARS).toBe(21);
    expect(labor.ANNUAL_LEAVE_5_YEARS_OR_MORE).toBe(30);
    expect(labor.ANNUAL_LEAVE_THRESHOLD_YEARS).toBe(5);
  });

  it('overtime multiplier', () => {
    expect(labor.OVERTIME_RATE_MULTIPLIER).toBe(1.5);
  });

  it('TERMINATION_TYPES', () => {
    expect(labor.TERMINATION_TYPES.RESIGNATION).toBe('resignation');
    expect(labor.TERMINATION_TYPES.TERMINATION).toBe('termination');
    expect(labor.TERMINATION_TYPES.END_OF_CONTRACT).toBe('end_of_contract');
    expect(labor.TERMINATION_TYPES.RETIREMENT).toBe('retirement');
  });

  it('LEAVE_TYPES and LEAVE_ENTITLEMENTS', () => {
    expect(labor.LEAVE_TYPES.ANNUAL).toBe('annual');
    expect(labor.LEAVE_ENTITLEMENTS.sick_full_pay).toBe(30);
    expect(labor.LEAVE_ENTITLEMENTS.maternity).toBe(70);
    expect(labor.LEAVE_ENTITLEMENTS.hajj).toBe(15);
  });

  it('EOS_RESIGNATION_FACTORS', () => {
    expect(labor.EOS_RESIGNATION_FACTORS.LESS_THAN_2_YEARS).toBe(0);
    expect(labor.EOS_RESIGNATION_FACTORS.TEN_YEARS_OR_MORE).toBe(1);
  });

  it('EOS_TERMINATION_FACTOR', () => {
    expect(labor.EOS_TERMINATION_FACTOR).toBe(1);
  });
});

// ═══════════════════════════════════════
//  calculateGOSIBase
// ═══════════════════════════════════════
describe('calculateGOSIBase', () => {
  it('returns basic + housing', () => {
    expect(labor.calculateGOSIBase(5000, 2500)).toBe(7500);
  });

  it('caps at 45000', () => {
    expect(labor.calculateGOSIBase(30000, 20000)).toBe(45000);
  });

  it('housing = 0 explicitly', () => {
    expect(labor.calculateGOSIBase(5000, 0)).toBe(5000);
  });

  it('throws for negative salary', () => {
    expect(() => labor.calculateGOSIBase(-100, 0)).toThrow();
  });

  it('throws for negative housing', () => {
    expect(() => labor.calculateGOSIBase(5000, -100)).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateGOSI
// ═══════════════════════════════════════
describe('calculateGOSI', () => {
  it('Saudi employee', () => {
    // base = 7500, employeeShare = 7500*0.09 = 675
    const r = labor.calculateGOSI(5000, 2500, true);
    expect(r.gosiBase).toBe(7500);
    expect(r.employeeShare).toBe(675);
    expect(r.employerPension).toBe(675);
    expect(r.occupationalHazard).toBe(150);
    expect(r.employerTotal).toBe(825);
    expect(r.totalContribution).toBe(1500);
    expect(r.isSaudi).toBe(true);
  });

  it('non-Saudi employee', () => {
    const r = labor.calculateGOSI(5000, 2500, false);
    expect(r.gosiBase).toBe(7500);
    expect(r.employeeShare).toBe(0);
    expect(r.employerPension).toBe(0);
    expect(r.occupationalHazard).toBe(150);
    expect(r.employerTotal).toBe(150);
    expect(r.totalContribution).toBe(150);
    expect(r.isSaudi).toBe(false);
  });
});

// ═══════════════════════════════════════
//  calculateSANED
// ═══════════════════════════════════════
describe('calculateSANED', () => {
  it('applicable for Saudi', () => {
    const r = labor.calculateSANED(5000, 2500, true);
    expect(r.applicable).toBe(true);
    expect(r.employeeShare).toBeCloseTo(56.25, 2);
    expect(r.employerShare).toBeCloseTo(56.25, 2);
    expect(r.totalContribution).toBeCloseTo(112.5, 2);
  });

  it('not applicable for non-Saudi', () => {
    const r = labor.calculateSANED(5000, 2500, false);
    expect(r.applicable).toBe(false);
    expect(r.employeeShare).toBe(0);
    expect(r.employerShare).toBe(0);
    expect(r.totalContribution).toBe(0);
  });
});

// ═══════════════════════════════════════
//  calculateServiceDuration
// ═══════════════════════════════════════
describe('calculateServiceDuration', () => {
  it('1 year', () => {
    const r = labor.calculateServiceDuration('2024-01-01', '2025-01-01');
    expect(r.years).toBe(1);
    expect(r.months).toBe(0);
    expect(r.totalDays).toBeGreaterThanOrEqual(365);
    expect(r.yearsDecimal).toBeGreaterThan(0);
  });

  it('partial period', () => {
    const r = labor.calculateServiceDuration('2024-01-01', '2024-06-15');
    expect(r.months).toBeGreaterThan(0);
    expect(r.yearsDecimal).toBeGreaterThan(0);
    expect(r.totalDays).toBeGreaterThan(0);
  });

  it('throws for end before start', () => {
    expect(() => labor.calculateServiceDuration('2025-01-01', '2024-01-01')).toThrow();
  });

  it('throws for invalid dates', () => {
    expect(() => labor.calculateServiceDuration('bad', '2024-01-01')).toThrow();
  });
});

// ═══════════════════════════════════════
//  getEOSFactor
// ═══════════════════════════════════════
describe('getEOSFactor', () => {
  it('resignation <2 years = 0', () => {
    expect(labor.getEOSFactor('resignation', 1)).toBe(0);
  });

  it('resignation 2-5 years = 1/3', () => {
    expect(labor.getEOSFactor('resignation', 3)).toBeCloseTo(1 / 3, 5);
  });

  it('resignation 5-9 years = 2/3', () => {
    expect(labor.getEOSFactor('resignation', 7)).toBeCloseTo(2 / 3, 5);
  });

  it('resignation 10+ years = full', () => {
    expect(labor.getEOSFactor('resignation', 10)).toBe(1);
  });

  it('termination = full regardless of years', () => {
    expect(labor.getEOSFactor('termination', 1)).toBe(1);
    expect(labor.getEOSFactor('end_of_contract', 1)).toBe(1);
    expect(labor.getEOSFactor('retirement', 1)).toBe(1);
  });
});

// ═══════════════════════════════════════
//  calculateEndOfService
// ═══════════════════════════════════════
describe('calculateEndOfService', () => {
  it('computes settlement amount for termination', () => {
    const r = labor.calculateEndOfService({
      basicSalary: 10000,
      hireDate: '2020-01-01',
      terminationDate: '2025-01-01',
      terminationType: 'termination',
    });
    expect(r.lastSalary).toBe(10000);
    expect(r.terminationFactor).toBe(1);
    expect(r.totalSettlement).toBeGreaterThan(0);
    expect(r.finalEOSAmount).toBeGreaterThan(0);
    expect(r.serviceYears).toBeGreaterThanOrEqual(4);
  });

  it('zero for short resignation (<2 years)', () => {
    const r = labor.calculateEndOfService({
      basicSalary: 10000,
      hireDate: '2024-01-01',
      terminationDate: '2024-06-01',
      terminationType: 'resignation',
    });
    expect(r.terminationFactor).toBe(0);
    expect(r.finalEOSAmount).toBe(0);
    expect(r.totalSettlement).toBe(0);
  });

  it('includes leave settlement', () => {
    const r = labor.calculateEndOfService({
      basicSalary: 9000,
      hireDate: '2020-01-01',
      terminationDate: '2025-01-01',
      terminationType: 'termination',
      leaveBalanceDays: 10,
    });
    expect(r.leaveBalanceDays).toBe(10);
    expect(r.leaveSettlement).toBeGreaterThan(0);
    expect(r.totalSettlement).toBeGreaterThan(r.finalEOSAmount);
  });

  it('throws for invalid termination type', () => {
    expect(() =>
      labor.calculateEndOfService({
        basicSalary: 10000,
        hireDate: '2020-01-01',
        terminationDate: '2025-01-01',
        terminationType: 'invalid_type',
      })
    ).toThrow('نوع إنهاء الخدمة غير صالح');
  });

  it('throws for zero salary', () => {
    expect(() =>
      labor.calculateEndOfService({
        basicSalary: 0,
        hireDate: '2020-01-01',
        terminationDate: '2025-01-01',
        terminationType: 'termination',
      })
    ).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateDailyAndHourlyRate
// ═══════════════════════════════════════
describe('calculateDailyAndHourlyRate', () => {
  it('calculates correctly (salary/30)', () => {
    // 9000 / 30 = 300, 300 / 8 = 37.5
    const r = labor.calculateDailyAndHourlyRate(9000);
    expect(r.dailyRate).toBe(300);
    expect(r.hourlyRate).toBe(37.5);
  });

  it('custom hours per day', () => {
    const r = labor.calculateDailyAndHourlyRate(9000, 6);
    expect(r.dailyRate).toBe(300);
    expect(r.hourlyRate).toBe(50);
  });

  it('throws for zero salary', () => {
    expect(() => labor.calculateDailyAndHourlyRate(0)).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateOvertimePay
// ═══════════════════════════════════════
describe('calculateOvertimePay', () => {
  it('computes overtime at 150%', () => {
    // base = 5000+2500 = 7500, daily = 250, hourly = 250/8 = 31.25
    // overtimeHourly = 31.25 * 1.5 = 46.875
    const r = labor.calculateOvertimePay(5000, 2500, 10);
    expect(r.overtimeHours).toBe(10);
    expect(r.overtimeHourlyRate).toBeCloseTo(46.88, 1);
    expect(r.overtimeAmount).toBeCloseTo(468.75, 0);
  });

  it('throws for negative hours', () => {
    expect(() => labor.calculateOvertimePay(5000, 2500, -5)).toThrow();
  });

  it('zero hours = zero pay', () => {
    const r = labor.calculateOvertimePay(5000, 2500, 0);
    expect(r.overtimeAmount).toBe(0);
  });
});

// ═══════════════════════════════════════
//  calculateAbsenceDeduction
// ═══════════════════════════════════════
describe('calculateAbsenceDeduction', () => {
  it('deducts per day (totalMonthlySalary/30)', () => {
    // 9000/30 = 300, 2 days = 600
    const r = labor.calculateAbsenceDeduction(9000, 2);
    expect(r.dailyRate).toBe(300);
    expect(r.deductionAmount).toBe(600);
  });

  it('throws for negative days', () => {
    expect(() => labor.calculateAbsenceDeduction(9000, -1)).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateLateDeductions
// ═══════════════════════════════════════
describe('calculateLateDeductions', () => {
  it('1st occurrence = warning only (0 deduction)', () => {
    const r = labor.calculateLateDeductions(5000, 2500, 1);
    expect(r.totalDeduction).toBe(0);
    expect(r.breakdown[0].amount).toBe(0);
    expect(r.breakdown[0].action).toBe('verbal_warning');
  });

  it('2nd-3rd = 5% daily', () => {
    const r = labor.calculateLateDeductions(5000, 2500, 3);
    expect(r.totalDeduction).toBeGreaterThan(0);
    expect(r.breakdown[1].rate).toBe(0.05);
    expect(r.breakdown[2].rate).toBe(0.05);
  });

  it('10th = 25% daily', () => {
    const r = labor.calculateLateDeductions(5000, 2500, 10);
    const last = r.breakdown[r.breakdown.length - 1];
    expect(last.rate).toBe(0.25);
    expect(last.action).toBe('deduct_25_percent');
  });

  it('throws for negative occurrences', () => {
    expect(() => labor.calculateLateDeductions(5000, 2500, -1)).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateNetSalary
// ═══════════════════════════════════════
describe('calculateNetSalary', () => {
  it('full breakdown for Saudi', () => {
    const r = labor.calculateNetSalary({
      basicSalary: 5000,
      housingAllowance: 2500,
      transportAllowance: 500,
      isSaudi: true,
    });
    expect(r.totalEarnings).toBe(8000);
    expect(r.gosiEmployeeShare).toBeGreaterThan(0);
    expect(r.sanedEmployeeShare).toBeGreaterThan(0);
    expect(r.netSalary).toBeLessThan(8000);
  });

  it('full breakdown for non-Saudi', () => {
    const r = labor.calculateNetSalary({
      basicSalary: 5000,
      housingAllowance: 2500,
      isSaudi: false,
    });
    expect(r.gosiEmployeeShare).toBe(0);
    expect(r.sanedEmployeeShare).toBe(0);
    expect(r.totalEarnings).toBe(7500);
    expect(r.netSalary).toBe(7500);
  });
});

// ═══════════════════════════════════════
//  Leave calculations
// ═══════════════════════════════════════
describe('calculateAnnualLeaveEntitlement', () => {
  it('<5 years = 21 days', () => {
    expect(labor.calculateAnnualLeaveEntitlement(3)).toBe(21);
  });

  it('>=5 years = 30 days', () => {
    expect(labor.calculateAnnualLeaveEntitlement(5)).toBe(30);
    expect(labor.calculateAnnualLeaveEntitlement(10)).toBe(30);
  });

  it('throws for negative years', () => {
    expect(() => labor.calculateAnnualLeaveEntitlement(-1)).toThrow();
  });
});

describe('calculateLeaveSettlement', () => {
  it('settles remaining days (salary/30 × days)', () => {
    // 9000/30 = 300; 10 days = 3000
    const r = labor.calculateLeaveSettlement(9000, 10);
    expect(r.dailyRate).toBe(300);
    expect(r.settlementAmount).toBe(3000);
    expect(r.remainingLeaveDays).toBe(10);
  });

  it('throws for zero salary', () => {
    expect(() => labor.calculateLeaveSettlement(0, 5)).toThrow();
  });

  it('throws for negative leave days', () => {
    expect(() => labor.calculateLeaveSettlement(9000, -1)).toThrow();
  });
});

describe('validateHajjLeave', () => {
  it('valid with 2+ years, not used', () => {
    const r = labor.validateHajjLeave(3, false);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('invalid <2 years', () => {
    const r = labor.validateHajjLeave(1, false);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('invalid if already used', () => {
    const r = labor.validateHajjLeave(5, true);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════
//  calculateSickLeavePayment
// ═══════════════════════════════════════
describe('calculateSickLeavePayment', () => {
  it('first 30 days at full pay', () => {
    // 9000/30 = 300; 20 days full pay = 6000
    const r = labor.calculateSickLeavePayment(9000, 20, 0);
    expect(r.fullPayDays).toBe(20);
    expect(r.payment).toBeCloseTo(6000, 0);
  });

  it('days 31-90 at 75%', () => {
    // startDay=10, days=40 → currentDay 11..50
    // 11-30: 20 full pay, 31-50: 20 three-quarters
    const r = labor.calculateSickLeavePayment(9000, 40, 10);
    expect(r.fullPayDays).toBe(20);
    expect(r.threeQuartersDays).toBe(20);
  });

  it('90+ days unpaid', () => {
    // startDay=80, days=30 → currentDay 81..110
    // 81-90: 10 three-quarters, 91-110: 20 unpaid
    const r = labor.calculateSickLeavePayment(9000, 30, 80);
    expect(r.threeQuartersDays).toBe(10);
    expect(r.unpaidDays).toBe(20);
  });

  it('throws for zero or negative sick days', () => {
    expect(() => labor.calculateSickLeavePayment(9000, 0, 0)).toThrow();
  });
});

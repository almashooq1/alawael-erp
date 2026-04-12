/**
 * Unit Tests — gratuityService.js
 * End-of-service gratuity calculations — pure static methods only
 */
'use strict';

const GratuityService = require('../../services/hr/gratuityService');

// ═══════════════════════════════════════
//  calculateServicePeriod
// ═══════════════════════════════════════
describe('calculateServicePeriod', () => {
  it('calculates years accurately', () => {
    const r = GratuityService.calculateServicePeriod('2020-01-01', '2025-01-01');
    expect(r.totalYears).toBeGreaterThanOrEqual(4.9);
    expect(r.totalYears).toBeLessThanOrEqual(5.1);
    expect(r.years).toBe(5);
    expect(r.totalDays).toBeGreaterThan(1800);
    expect(r.totalMonths).toBeGreaterThanOrEqual(60);
  });

  it('short period', () => {
    const r = GratuityService.calculateServicePeriod('2024-01-01', '2024-07-01');
    expect(r.totalYears).toBeLessThan(1);
    expect(r.totalMonths).toBe(6);
    expect(r.years).toBe(0);
    expect(r.remainingMonths).toBe(6);
  });

  it('same date → 0', () => {
    const r = GratuityService.calculateServicePeriod('2024-06-01', '2024-06-01');
    expect(r.totalDays).toBe(0);
    expect(r.totalYears).toBe(0);
  });
});

// ═══════════════════════════════════════
//  getLastSalaryForCalculation
// ═══════════════════════════════════════
describe('getLastSalaryForCalculation', () => {
  it('sums basic + housing + transport', () => {
    const emp = {
      compensation: {
        components: {
          basicSalary: 5000,
          houseAllowance: 2500,
          transportAllowance: 500,
        },
      },
    };
    expect(GratuityService.getLastSalaryForCalculation(emp)).toBe(8000);
  });

  it('defaults to 0 for missing components', () => {
    expect(GratuityService.getLastSalaryForCalculation({})).toBe(0);
    expect(GratuityService.getLastSalaryForCalculation({ compensation: {} })).toBe(0);
  });
});

// ═══════════════════════════════════════
//  getDailySalary
// ═══════════════════════════════════════
describe('getDailySalary', () => {
  it('divides monthly by 30', () => {
    const emp = {
      compensation: {
        components: { basicSalary: 6000, houseAllowance: 3000, transportAllowance: 0 },
      },
    };
    expect(GratuityService.getDailySalary(emp)).toBeCloseTo(300, 2);
  });
});

// ═══════════════════════════════════════
//  isEligibleForGratuity
// ═══════════════════════════════════════
describe('isEligibleForGratuity', () => {
  const longServiceEmp = { hireDate: '2015-01-01' };
  const shortServiceEmp = {
    hireDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  };

  it('DEATH always eligible', () => {
    expect(GratuityService.isEligibleForGratuity(shortServiceEmp, 'DEATH')).toBe(true);
  });

  it('RETIREMENT always eligible', () => {
    expect(GratuityService.isEligibleForGratuity(shortServiceEmp, 'RETIREMENT')).toBe(true);
  });

  it('DISMISSAL_WITHOUT_CAUSE always eligible', () => {
    expect(GratuityService.isEligibleForGratuity(shortServiceEmp, 'DISMISSAL_WITHOUT_CAUSE')).toBe(
      true
    );
  });

  it('RESIGNATION needs >= 2 years', () => {
    expect(GratuityService.isEligibleForGratuity(longServiceEmp, 'RESIGNATION')).toBe(true);
    expect(GratuityService.isEligibleForGratuity(shortServiceEmp, 'RESIGNATION')).toBe(false);
  });
});

// ═══════════════════════════════════════
//  calculateFullGratuity
// ═══════════════════════════════════════
describe('calculateFullGratuity', () => {
  const salary = 9000;

  it('2-5 years: salary/3 × years', () => {
    const r = GratuityService.calculateFullGratuity(3, salary, { yearsBreakdown: [] });
    expect(r).toBe(9000);
  });

  it('5-10 years: first 3yr at 1/3 + remaining at 2/3', () => {
    const details = { yearsBreakdown: [] };
    const r = GratuityService.calculateFullGratuity(8, salary, details);
    const first = (9000 / 3) * 3; // 9000
    const second = ((9000 * 2) / 3) * 3; // 18000
    expect(r).toBe(first + second); // 27000
    expect(details.yearsBreakdown.length).toBe(2);
  });

  it('10+ years: 1/3 + 2/3 + full salary', () => {
    const details = { yearsBreakdown: [] };
    const r = GratuityService.calculateFullGratuity(12, salary, details);
    const first = (9000 / 3) * 3; // 9000
    const second = ((9000 * 2) / 3) * 5; // 30000
    const third = 9000 * 2; // 18000
    expect(r).toBe(first + second + third); // 57000
    expect(details.yearsBreakdown.length).toBe(3);
  });

  it('< 2 years returns 0 (no bracket matched)', () => {
    const r = GratuityService.calculateFullGratuity(1, salary, {});
    expect(r).toBe(0);
  });
});

// ═══════════════════════════════════════
//  calculateResignationGratuity
// ═══════════════════════════════════════
describe('calculateResignationGratuity', () => {
  const salary = 9000;

  it('< 2 years: 0', () => {
    expect(GratuityService.calculateResignationGratuity(1, salary, { yearsBreakdown: [] })).toBe(0);
  });

  it('2-5 years: half of full', () => {
    const r = GratuityService.calculateResignationGratuity(4, salary, { yearsBreakdown: [] });
    const full = (salary / 3) * 4;
    expect(r).toBe(full * 0.5);
  });

  it('> 5 years: half of full gratuity', () => {
    const details = {};
    const r = GratuityService.calculateResignationGratuity(8, salary, details);
    const full = GratuityService.calculateFullGratuity(8, salary, {});
    expect(r).toBe(full * 0.5);
    expect(details.reductionPercentage).toBe(50);
  });
});

// ═══════════════════════════════════════
//  calculateReducedGratuity
// ═══════════════════════════════════════
describe('calculateReducedGratuity', () => {
  it('75% of full gratuity', () => {
    const salary = 9000;
    const full = GratuityService.calculateFullGratuity(6, salary, {});
    const reduced = GratuityService.calculateReducedGratuity(6, salary, {});
    expect(reduced).toBe(full * 0.75);
  });
});

// ═══════════════════════════════════════
//  calculateDeductions
// ═══════════════════════════════════════
describe('calculateDeductions', () => {
  it('deducts advance + debt', () => {
    const emp = { advanceSalary: 1000, debt: 500 };
    const r = GratuityService.calculateDeductions(emp, 10000);
    expect(r.total).toBe(1500);
    expect(r.netGratuity).toBe(8500);
  });

  it('deducts unused leave', () => {
    const emp = {
      unusedLeaveDays: 10,
      compensation: {
        components: { basicSalary: 6000, houseAllowance: 3000, transportAllowance: 0 },
      },
    };
    const r = GratuityService.calculateDeductions(emp, 50000);
    // daily = 9000/30 = 300, 10 days = 3000
    expect(r.itemized.find(i => i.type === 'UNUSED_LEAVE')).toBeDefined();
    expect(r.total).toBe(3000);
  });

  it('deducts violations', () => {
    const emp = { violations: [{ penalty: 500 }, { penalty: 300 }] };
    const r = GratuityService.calculateDeductions(emp, 10000);
    expect(r.total).toBe(800);
  });

  it('deducts deposits + advances', () => {
    const emp = { deposits: 200, advances: 300 };
    const r = GratuityService.calculateDeductions(emp, 10000);
    expect(r.total).toBe(500);
  });

  it('caps deductions at gratuity amount', () => {
    const emp = { advanceSalary: 50000 };
    const r = GratuityService.calculateDeductions(emp, 1000);
    expect(r.total).toBe(1000);
    expect(r.netGratuity).toBe(0);
  });

  it('no deductions for clean employee', () => {
    const r = GratuityService.calculateDeductions({}, 5000);
    expect(r.total).toBe(0);
    expect(r.netGratuity).toBe(5000);
  });
});

// ═══════════════════════════════════════
//  calculateAdditions
// ═══════════════════════════════════════
describe('calculateAdditions', () => {
  it('adds unpaid salaries', () => {
    const emp = { unpaidSalaries: [{ amount: 5000 }, { amount: 5000 }] };
    const r = GratuityService.calculateAdditions(emp, 20000);
    expect(r.total).toBe(10000);
    expect(r.totalWithAdditions).toBe(30000);
  });

  it('adds cancelled advances', () => {
    const emp = { cancelledAdvances: 2000 };
    const r = GratuityService.calculateAdditions(emp, 10000);
    expect(r.total).toBe(2000);
  });

  it('adds pending bonuses', () => {
    const emp = { pendingBonuses: 3000 };
    const r = GratuityService.calculateAdditions(emp, 10000);
    expect(r.total).toBe(3000);
  });

  it('no additions for clean employee', () => {
    const r = GratuityService.calculateAdditions({}, 5000);
    expect(r.total).toBe(0);
    expect(r.totalWithAdditions).toBe(5000);
  });
});

// ═══════════════════════════════════════
//  calculateGratuity (integration of statics)
// ═══════════════════════════════════════
describe('calculateGratuity', () => {
  const makeEmp = hireDate => ({
    hireDate,
    compensation: {
      components: { basicSalary: 6000, houseAllowance: 3000, transportAllowance: 0 },
    },
  });

  it('< 2 years = 0, not eligible', () => {
    const emp = makeEmp('2024-06-01');
    const r = GratuityService.calculateGratuity(emp, '2025-06-01', 'resignation');
    expect(r.gratuity).toBe(0);
    expect(r.isEligible).toBe(false);
  });

  it('3 years resignation → half of full', () => {
    const emp = makeEmp('2022-01-01');
    const r = GratuityService.calculateGratuity(emp, '2025-01-01', 'RESIGNATION');
    // 3 years, salary=9000, full = (9000/3)*3=9000, resignation = 9000*0.5 = 4500
    expect(r.gratuity).toBeCloseTo(4500, 0);
    expect(r.isEligible).toBe(true);
    expect(r.scenario).toBe('RESIGNATION');
  });

  it('RETIREMENT uses full gratuity', () => {
    const emp = makeEmp('2015-01-01');
    const r = GratuityService.calculateGratuity(emp, '2025-01-01', 'RETIREMENT');
    expect(r.gratuity).toBeGreaterThan(0);
    expect(r.isEligible).toBe(true);
  });

  it('DEATH uses full gratuity', () => {
    const emp = makeEmp('2020-01-01');
    const r = GratuityService.calculateGratuity(emp, '2025-01-01', 'DEATH');
    expect(r.gratuity).toBeGreaterThan(0);
    expect(r.isEligible).toBe(true);
  });

  it('DISMISSAL_WITH_FAULT → 75% of full', () => {
    const emp = makeEmp('2020-01-01');
    const r = GratuityService.calculateGratuity(emp, '2025-01-01', 'DISMISSAL_WITH_FAULT');
    const full = GratuityService.calculateGratuity(emp, '2025-01-01', 'DISMISSAL_WITHOUT_CAUSE');
    expect(r.gratuity).toBeCloseTo(full.gratuity * 0.75, 0);
  });

  it('DISMISSAL_WITHOUT_CAUSE → full', () => {
    const emp = makeEmp('2020-01-01');
    const r = GratuityService.calculateGratuity(emp, '2025-01-01', 'DISMISSAL_WITHOUT_CAUSE');
    expect(r.gratuity).toBeGreaterThan(0);
    expect(r.isEligible).toBe(true);
  });

  it('returns serviceDetails', () => {
    const emp = makeEmp('2022-01-01');
    const r = GratuityService.calculateGratuity(emp, '2025-01-01', 'RETIREMENT');
    expect(r.serviceDetails).toBeDefined();
    expect(r.serviceDetails.totalYears).toBeGreaterThan(0);
  });
});

/**
 * Unit Tests — servicePricing.service.js
 * Pure finance calculations — NO mocks needed
 */
'use strict';

const pricing = require('../../services/finance/servicePricing.service');

// ═══════════════════════════════════════
//  Constants
// ═══════════════════════════════════════
describe('constants', () => {
  it('VAT_RATE is 15%', () => expect(pricing.VAT_RATE).toBe(0.15));
  it('MAX_DISCOUNT_PERCENTAGE is 50', () => expect(pricing.MAX_DISCOUNT_PERCENTAGE).toBe(50));
  it('TARGET_PROFIT_MARGIN is 30%', () => expect(pricing.TARGET_PROFIT_MARGIN).toBe(0.3));
  it('has SESSION_TYPES', () => expect(pricing.SESSION_TYPES).toBeDefined());
  it('has SPECIALIZATIONS', () => expect(pricing.SPECIALIZATIONS).toBeDefined());
  it('has SESSION_TYPE_MULTIPLIERS', () => expect(pricing.SESSION_TYPE_MULTIPLIERS).toBeDefined());
});

// ═══════════════════════════════════════
//  calculateBaseSessionPrice
// ═══════════════════════════════════════
describe('calculateBaseSessionPrice', () => {
  it('returns base price for 45-min session', () => {
    // PT at 45 min → base45 = 250
    const r = pricing.calculateBaseSessionPrice('pt', 45);
    expect(r).toBe(250);
  });

  it('adjusts price for longer duration', () => {
    // PT: base45=250, ratePerMin=5.0 → 60min = 250 + 15*5 = 325
    const r = pricing.calculateBaseSessionPrice('pt', 60);
    expect(r).toBe(325);
  });

  it('adjusts price for shorter duration', () => {
    // PT: 30min = 250 + (-15)*5 = 175
    const r = pricing.calculateBaseSessionPrice('pt', 30);
    expect(r).toBe(175);
  });

  it('throws for unknown specialization', () => {
    expect(() => pricing.calculateBaseSessionPrice('unknown', 45)).toThrow();
  });

  it('throws for zero/negative duration', () => {
    expect(() => pricing.calculateBaseSessionPrice('pt', 0)).toThrow();
    expect(() => pricing.calculateBaseSessionPrice('pt', -10)).toThrow();
  });
});

// ═══════════════════════════════════════
//  applySessionTypeMultiplier
// ═══════════════════════════════════════
describe('applySessionTypeMultiplier', () => {
  it('home_visit has higher multiplier', () => {
    const r = pricing.applySessionTypeMultiplier(100, 'home_visit');
    expect(r).toBeGreaterThan(100);
  });

  it('group has lower multiplier', () => {
    const r = pricing.applySessionTypeMultiplier(100, 'group');
    expect(r).toBeLessThanOrEqual(100);
  });

  it('individual is base', () => {
    const r = pricing.applySessionTypeMultiplier(100, 'individual');
    expect(r).toBe(100);
  });
});

// ═══════════════════════════════════════
//  calculateSessionPrice
// ═══════════════════════════════════════
describe('calculateSessionPrice', () => {
  it('full pricing with discount', () => {
    const r = pricing.calculateSessionPrice({
      specialization: 'ot',
      durationMinutes: 45,
      sessionType: 'individual',
      discountPercent: 10,
    });
    expect(r.basePrice).toBeGreaterThan(0);
    expect(r.discountAmount).toBeGreaterThan(0);
    expect(r.priceBeforeVat).toBeLessThan(r.adjustedPrice);
    expect(r.vatAmount).toBeGreaterThan(0);
    expect(r.totalPrice).toBe(r.priceBeforeVat + r.vatAmount);
  });

  it('no discount = 0', () => {
    const r = pricing.calculateSessionPrice({
      specialization: 'pt',
      durationMinutes: 30,
      sessionType: 'individual',
      discountPercent: 0,
    });
    expect(r.discountAmount).toBe(0);
    expect(r.priceBeforeVat).toBe(r.adjustedPrice);
  });

  it('throws for discount > 50%', () => {
    expect(() =>
      pricing.calculateSessionPrice({
        specialization: 'pt',
        durationMinutes: 30,
        discountPercent: 60,
      })
    ).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateTherapistMonthlyRevenue
// ═══════════════════════════════════════
describe('calculateTherapistMonthlyRevenue', () => {
  it('computes monthly breakdown', () => {
    const r = pricing.calculateTherapistMonthlyRevenue({
      workingDaysPerMonth: 22,
      sessionsPerDay: 6,
      averageSessionPrice: 200,
      attendanceRate: 100,
      cancellationRate: 0,
    });
    expect(r.totalScheduledSessions).toBe(132);
    expect(r.attendedSessions).toBe(132);
    expect(r.grossRevenue).toBe(26400);
    expect(r.dailyRevenue).toBe(1200);
  });

  it('applies attendance and cancellation rates', () => {
    const r = pricing.calculateTherapistMonthlyRevenue({
      workingDaysPerMonth: 20,
      sessionsPerDay: 5,
      averageSessionPrice: 200,
      attendanceRate: 80,
      cancellationRate: 10,
    });
    expect(r.attendedSessions).toBeLessThan(r.totalScheduledSessions);
    expect(r.grossRevenue).toBeLessThan(100 * 200);
  });
});

// ═══════════════════════════════════════
//  calculateAnnualRevenueProjection
// ═══════════════════════════════════════
describe('calculateAnnualRevenueProjection', () => {
  it('full occupancy projection', () => {
    // 5 therapists × 10000/mo × 100% occupancy × 12 = 600000
    const r = pricing.calculateAnnualRevenueProjection(5, 10000, 100);
    expect(r.monthlyRevenue).toBe(50000);
    expect(r.annualRevenue).toBe(600000);
    expect(r.quarterlyRevenue).toBe(150000);
  });

  it('with reduced occupancy', () => {
    // 5 × 10000 × 0.75 × 12 = 450000
    const r = pricing.calculateAnnualRevenueProjection(5, 10000, 75);
    expect(r.annualRevenue).toBe(450000);
  });

  it('throws for zero therapists', () => {
    expect(() => pricing.calculateAnnualRevenueProjection(0, 10000)).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateBreakevenPoint
// ═══════════════════════════════════════
describe('calculateBreakevenPoint', () => {
  it('break-even sessions and revenue', () => {
    // costs = {fixedCostsMonthly: 20000, variableCostPerSession: 50}, avgRevenue = 200
    // contribution = 200 - 50 = 150, breakeven = ceil(20000/150) = 134
    const r = pricing.calculateBreakevenPoint(
      { fixedCostsMonthly: 20000, variableCostPerSession: 50 },
      200
    );
    expect(r.breakevenSessions).toBe(134);
    expect(r.breakevenRevenue).toBe(134 * 200);
    expect(r.contributionMargin).toBe(150);
    expect(r.targetProfitSessions).toBeGreaterThan(r.breakevenSessions);
  });

  it('throws for zero revenue per session', () => {
    expect(() => pricing.calculateBreakevenPoint({ fixedCostsMonthly: 10000 }, 0)).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateProfitMargin
// ═══════════════════════════════════════
describe('calculateProfitMargin', () => {
  it('profitable', () => {
    const r = pricing.calculateProfitMargin(100000, 60000);
    expect(r.grossProfit).toBe(40000);
    expect(r.profitMargin).toBe(40);
    expect(r.isProfit).toBe(true);
    expect(r.meetsTarget).toBe(true);
  });

  it('loss', () => {
    const r = pricing.calculateProfitMargin(50000, 60000);
    expect(r.isProfit).toBe(false);
    expect(r.meetsTarget).toBe(false);
    expect(r.profitMargin).toBeLessThan(0);
  });
});

// ═══════════════════════════════════════
//  calculatePackagePrice
// ═══════════════════════════════════════
describe('calculatePackagePrice', () => {
  it('applies package discount', () => {
    const r = pricing.calculatePackagePrice(200, 10, 15);
    expect(r.fullPrice).toBe(2000);
    expect(r.discountAmount).toBeCloseTo(300, 0);
    expect(r.packagePrice).toBeCloseTo(1700, 0);
    expect(r.vatAmount).toBeCloseTo(1700 * 0.15, 0);
    expect(r.totalWithVat).toBeCloseTo(1700 * 1.15, 0);
  });

  it('throws for count < 2', () => {
    expect(() => pricing.calculatePackagePrice(200, 1, 10)).toThrow();
  });

  it('throws for discount > 50%', () => {
    expect(() => pricing.calculatePackagePrice(200, 10, 60)).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateInsurancePrice
// ═══════════════════════════════════════
describe('calculateInsurancePrice', () => {
  it('splits coverage', () => {
    const r = pricing.calculateInsurancePrice(200, 80, 20);
    expect(r.insuranceCoverage).toBe(140);
    expect(r.patientShare).toBe(60);
    expect(r.coverageRatio).toBeCloseTo(70, 0);
  });
});

// ═══════════════════════════════════════
//  Revenue per therapist / beneficiary
// ═══════════════════════════════════════
describe('calculateRevenuePerTherapist', () => {
  it('divides evenly', () => {
    expect(pricing.calculateRevenuePerTherapist(100000, 5)).toBe(20000);
  });

  it('throws for zero therapists', () => {
    expect(() => pricing.calculateRevenuePerTherapist(100000, 0)).toThrow();
  });
});

describe('calculateRevenuePerBeneficiary', () => {
  it('divides evenly', () => {
    expect(pricing.calculateRevenuePerBeneficiary(100000, 50)).toBe(2000);
  });
});

// ═══════════════════════════════════════
//  calculateCapacityUtilization
// ═══════════════════════════════════════
describe('calculateCapacityUtilization', () => {
  it('returns percentage', () => {
    expect(pricing.calculateCapacityUtilization(80, 100)).toBe(80);
  });

  it('throws if actual > max', () => {
    expect(() => pricing.calculateCapacityUtilization(110, 100)).toThrow();
  });
});

// ═══════════════════════════════════════
//  rankBranchesByFinancialPerformance
// ═══════════════════════════════════════
describe('rankBranchesByFinancialPerformance', () => {
  it('ranks by profit margin desc', () => {
    const branches = [
      { name: 'A', revenue: 50000, costs: 40000 },
      { name: 'B', revenue: 100000, costs: 50000 },
      { name: 'C', revenue: 30000, costs: 25000 },
    ];
    const r = pricing.rankBranchesByFinancialPerformance(branches);
    expect(r[0].rank).toBe(1);
    expect(r[0].name).toBe('B');
    expect(r[0].profitMargin).toBeGreaterThan(r[1].profitMargin);
  });
});

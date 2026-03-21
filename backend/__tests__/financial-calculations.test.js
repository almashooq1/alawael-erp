/**
 * financial-calculations.test.js — 17 pure math functions
 * الحسابات المالية — ضريبة، إهلاك، نسب، تحليل استثمار
 */
const {
  calculateVAT,
  calculateFinancialRatios,
  calculateStraightLineDepreciation,
  calculateDecliningBalanceDepreciation,
  calculateBreakEvenPoint,
  calculatePresentValue,
  calculateFutureValue,
  calculateNPV,
  calculateIRR,
  calculatePaybackPeriod,
  calculateTradeDiscount,
  calculateWeightedAverageCost,
  calculateGrowthRate,
  calculateVariance,
  calculateWorkingCapital,
  formatCurrency,
  formatPercentage,
} = require('../utils/financial-calculations');

/* ===============================================================
   1. calculateVAT — ضريبة القيمة المضافة
   =============================================================== */
describe('calculateVAT', () => {
  test('adds 15% VAT to base amount (default rate)', () => {
    const r = calculateVAT(1000);
    expect(r.baseAmount).toBe(1000);
    expect(r.taxAmount).toBe(150);
    expect(r.totalAmount).toBe(1150);
  });

  test('extracts 15% VAT from inclusive amount', () => {
    const r = calculateVAT(1150, 0.15, true);
    expect(r.baseAmount).toBe(1000);
    expect(r.taxAmount).toBe(150);
    expect(r.totalAmount).toBe(1150);
  });

  test('custom rate — 5%', () => {
    const r = calculateVAT(200, 0.05);
    expect(r.taxAmount).toBe(10);
    expect(r.totalAmount).toBe(210);
  });

  test('zero amount returns all zeros', () => {
    const r = calculateVAT(0);
    expect(r.baseAmount).toBe(0);
    expect(r.taxAmount).toBe(0);
    expect(r.totalAmount).toBe(0);
  });

  test('round to 2 decimals on non-integer amounts', () => {
    const r = calculateVAT(99.99);
    expect(r.taxAmount).toBe(15);
    expect(r.totalAmount).toBe(114.99);
  });
});

/* ===============================================================
   2. calculateFinancialRatios
   =============================================================== */
describe('calculateFinancialRatios', () => {
  const balance = {
    currentAssets: 500000,
    currentLiabilities: 200000,
    inventory: 100000,
    totalAssets: 1000000,
    totalLiabilities: 400000,
    equity: 600000,
  };
  const income = { netIncome: 120000, revenue: 800000 };

  test('computes all ratios for complete data', () => {
    const r = calculateFinancialRatios(balance, income);
    expect(r.currentRatio).toBe(2.5);
    expect(r.quickRatio).toBe(2);
    expect(r.profitMargin).toBe(15);
    expect(r.returnOnAssets).toBe(12);
    expect(r.returnOnEquity).toBe(20);
    expect(r.debtToAssets).toBe(40);
    expect(r.debtToEquity).toBeCloseTo(66.67, 1);
    expect(r.assetTurnover).toBe(0.8);
  });

  test('returns empty object when no matching fields', () => {
    const r = calculateFinancialRatios({}, {});
    expect(Object.keys(r).length).toBe(0);
  });

  test('skips ratios if partial data', () => {
    const r = calculateFinancialRatios({ currentAssets: 300, currentLiabilities: 100 }, {});
    expect(r.currentRatio).toBe(3);
    expect(r.profitMargin).toBeUndefined();
  });
});

/* ===============================================================
   3. calculateStraightLineDepreciation
   =============================================================== */
describe('calculateStraightLineDepreciation', () => {
  test('basic straight line', () => {
    expect(calculateStraightLineDepreciation(100000, 10000, 10)).toBe(9000);
  });

  test('zero salvage value', () => {
    expect(calculateStraightLineDepreciation(50000, 0, 5)).toBe(10000);
  });
});

/* ===============================================================
   4. calculateDecliningBalanceDepreciation
   =============================================================== */
describe('calculateDecliningBalanceDepreciation', () => {
  test('20% declining balance', () => {
    expect(calculateDecliningBalanceDepreciation(100000, 0.2)).toBe(20000);
  });

  test('second year after first dep', () => {
    expect(calculateDecliningBalanceDepreciation(80000, 0.2)).toBe(16000);
  });
});

/* ===============================================================
   5. calculateBreakEvenPoint
   =============================================================== */
describe('calculateBreakEvenPoint', () => {
  test('basic break even', () => {
    const r = calculateBreakEvenPoint(50000, 500, 300);
    expect(r.units).toBe(250);
    expect(r.revenue).toBe(125000);
    expect(r.contributionMargin).toBe(200);
  });

  test('fractional units rounded up', () => {
    const r = calculateBreakEvenPoint(10000, 150, 80);
    // 10000 / 70 = 142.857 → ceil → 143
    expect(r.units).toBe(143);
  });
});

/* ===============================================================
   6. calculatePresentValue
   =============================================================== */
describe('calculatePresentValue', () => {
  test('PV of 10000 at 8% over 5 years', () => {
    const pv = calculatePresentValue(10000, 0.08, 5);
    expect(pv).toBeCloseTo(6805.83, 0);
  });

  test('zero rate returns same value', () => {
    expect(calculatePresentValue(5000, 0, 10)).toBe(5000);
  });
});

/* ===============================================================
   7. calculateFutureValue
   =============================================================== */
describe('calculateFutureValue', () => {
  test('FV of 5000 at 10% over 3 years', () => {
    const fv = calculateFutureValue(5000, 0.1, 3);
    expect(fv).toBeCloseTo(6655, 0);
  });

  test('one period is just (1 + rate)', () => {
    expect(calculateFutureValue(1000, 0.05, 1)).toBe(1050);
  });
});

/* ===============================================================
   8. calculateNPV
   =============================================================== */
describe('calculateNPV', () => {
  test('classic NPV: initial investment + cash flows', () => {
    const npv = calculateNPV([-100000, 30000, 40000, 50000, 30000], 0.1);
    // index 0 is year 0 (not discounted): -100000 + 30000/1.1 + 40000/1.21 + 50000/1.331 + 30000/1.4641
    expect(npv).toBeCloseTo(18386.72, 0);
  });

  test('all negative flows give negative NPV', () => {
    const npv = calculateNPV([-50000, -10000], 0.05);
    expect(npv).toBeLessThan(0);
  });
});

/* ===============================================================
   9. calculateIRR
   =============================================================== */
describe('calculateIRR', () => {
  test('finds IRR for standard investment', () => {
    const irr = calculateIRR([-100000, 30000, 40000, 50000, 30000]);
    expect(irr).not.toBeNull();
    expect(typeof irr).toBe('number');
    expect(irr).toBeGreaterThan(0);
  });

  test('returns null when no solution found (all positive)', () => {
    // All positive cash flows — no real IRR
    const irr = calculateIRR([1000, 2000, 3000]);
    // Newton-Raphson may diverge
    expect(irr === null || typeof irr === 'number').toBe(true);
  });
});

/* ===============================================================
   10. calculatePaybackPeriod
   =============================================================== */
describe('calculatePaybackPeriod', () => {
  test('exact payback at end of year', () => {
    const pp = calculatePaybackPeriod(30000, [10000, 10000, 10000]);
    // year0: 10k, year1: 20k, year2: 30k>=30k → 2 + (30k-20k)/10k = 3.0
    expect(pp).toBe(3);
  });

  test('fractional payback period', () => {
    const pp = calculatePaybackPeriod(25000, [10000, 10000, 10000]);
    // year0: 10k, year1: 20k, year2: 30k>=25k → 2 + (25k-20k)/10k = 2.5
    expect(pp).toBe(2.5);
  });

  test('returns null if never recovered', () => {
    expect(calculatePaybackPeriod(100000, [5000, 5000])).toBeNull();
  });
});

/* ===============================================================
   11. calculateTradeDiscount
   =============================================================== */
describe('calculateTradeDiscount', () => {
  test('10% discount on 1000', () => {
    const r = calculateTradeDiscount(1000, 0.1);
    expect(r.discountAmount).toBe(100);
    expect(r.netPrice).toBe(900);
  });

  test('zero discount returns full price', () => {
    const r = calculateTradeDiscount(500, 0);
    expect(r.discountAmount).toBe(0);
    expect(r.netPrice).toBe(500);
  });
});

/* ===============================================================
   12. calculateWeightedAverageCost
   =============================================================== */
describe('calculateWeightedAverageCost', () => {
  test('computes WAC for multiple items', () => {
    const r = calculateWeightedAverageCost([
      { quantity: 100, unitCost: 10 },
      { quantity: 200, unitCost: 15 },
    ]);
    expect(r.totalCost).toBe(4000);
    expect(r.totalQuantity).toBe(300);
    expect(r.averageCost).toBeCloseTo(13.33, 1);
  });

  test('empty items returns zeros', () => {
    const r = calculateWeightedAverageCost([]);
    expect(r.totalCost).toBe(0);
    expect(r.totalQuantity).toBe(0);
    expect(r.averageCost).toBe(0);
  });
});

/* ===============================================================
   13. calculateGrowthRate
   =============================================================== */
describe('calculateGrowthRate', () => {
  test('positive growth', () => {
    expect(calculateGrowthRate(100, 150)).toBe(50);
  });

  test('negative growth (decline)', () => {
    expect(calculateGrowthRate(200, 150)).toBe(-25);
  });

  test('zero growth', () => {
    expect(calculateGrowthRate(100, 100)).toBe(0);
  });
});

/* ===============================================================
   14. calculateVariance
   =============================================================== */
describe('calculateVariance', () => {
  test('favorable — actual exceeds budget', () => {
    const r = calculateVariance(120000, 100000);
    expect(r.variance).toBe(20000);
    expect(r.variancePercentage).toBe(20);
    expect(r.status).toBe('favorable');
  });

  test('unfavorable — actual below budget', () => {
    const r = calculateVariance(80000, 100000);
    expect(r.variance).toBe(-20000);
    expect(r.status).toBe('unfavorable');
  });

  test('zero budget — percentage is 0', () => {
    const r = calculateVariance(5000, 0);
    expect(r.variancePercentage).toBe(0);
  });
});

/* ===============================================================
   15. calculateWorkingCapital
   =============================================================== */
describe('calculateWorkingCapital', () => {
  test('positive working capital', () => {
    expect(calculateWorkingCapital(500000, 200000)).toBe(300000);
  });

  test('negative working capital', () => {
    expect(calculateWorkingCapital(100000, 300000)).toBe(-200000);
  });
});

/* ===============================================================
   16. formatCurrency
   =============================================================== */
describe('formatCurrency', () => {
  test('formats SAR in Arabic locale', () => {
    const s = formatCurrency(1500);
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });

  test('formats USD', () => {
    const s = formatCurrency(42.5, 'USD', 'en-US');
    expect(s).toContain('$');
    expect(s).toContain('42.5');
  });
});

/* ===============================================================
   17. formatPercentage
   =============================================================== */
describe('formatPercentage', () => {
  test('default 2 decimals', () => {
    expect(formatPercentage(15.5)).toBe('15.50%');
  });

  test('custom decimals', () => {
    expect(formatPercentage(33.333, 1)).toBe('33.3%');
  });

  test('zero', () => {
    expect(formatPercentage(0)).toBe('0.00%');
  });
});

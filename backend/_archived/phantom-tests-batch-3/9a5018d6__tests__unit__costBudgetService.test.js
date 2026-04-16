/**
 * Unit Tests — costBudgetService.js
 * In-memory budget/cost management — NO mocks needed, singleton class
 */
'use strict';

const svc = require('../../services/costBudgetService');

beforeEach(() => {
  // Reset to mock data state
  svc.initializeMockData();
  svc.budgetCounter = 7000;
  svc.costCounter = 6000;
});

// ═══════════════════════════════════════
//  Constructor / Mock data
// ═══════════════════════════════════════
describe('initial state', () => {
  it('has pre-populated budget', () => {
    expect(svc.budgets.length).toBe(1);
    expect(svc.budgets[0].id).toBe(7000);
    expect(svc.budgets[0].vehicleId).toBe('VRN-TEST-001');
  });

  it('has pre-populated cost', () => {
    expect(svc.costs.length).toBe(1);
    expect(svc.costs[0].id).toBe(6000);
    expect(svc.costs[0].category).toBe('fuel');
  });
});

// ═══════════════════════════════════════
//  createBudget
// ═══════════════════════════════════════
describe('createBudget', () => {
  it('creates budget with auto-incremented id', () => {
    const b = svc.createBudget({
      vehicleId: 'VRN-002',
      period: '2026-03',
      type: 'monthly',
      totalBudget: 3000,
      categories: { fuel: 1000, maintenance: 2000 },
    });
    expect(b.id).toBe(7001);
    expect(b.spent).toBe(0);
    expect(b.remaining).toBe(3000);
    expect(b.alerts).toEqual([]);
    expect(b.createdAt).toBeDefined();
  });

  it('adds to budgets array', () => {
    const before = svc.budgets.length;
    svc.createBudget({ vehicleId: 'V3', totalBudget: 1000, categories: {} });
    expect(svc.budgets.length).toBe(before + 1);
  });
});

// ═══════════════════════════════════════
//  recordCost
// ═══════════════════════════════════════
describe('recordCost', () => {
  it('records cost with auto-incremented id', () => {
    const c = svc.recordCost({
      vehicleId: 'VRN-TEST-001',
      category: 'maintenance',
      amount: 500,
      description: 'oil change',
    });
    expect(c.id).toBe(6001);
    expect(c.approved).toBe(false);
    expect(c.date).toBeDefined();
  });

  it('adds to costs array', () => {
    const before = svc.costs.length;
    svc.recordCost({ vehicleId: 'VRN-TEST-001', category: 'fuel', amount: 100 });
    expect(svc.costs.length).toBe(before + 1);
  });
});

// ═══════════════════════════════════════
//  addBudgetAlert
// ═══════════════════════════════════════
describe('addBudgetAlert', () => {
  it('adds alert to existing budget', () => {
    const alert = svc.addBudgetAlert(7000, 'warning', 'test alert');
    expect(alert.severity).toBe('warning');
    expect(alert.message).toBe('test alert');
    expect(svc.budgets[0].alerts.length).toBeGreaterThan(0);
  });

  it('returns null for non-existent budget', () => {
    expect(svc.addBudgetAlert(9999, 'info', 'nope')).toBeNull();
  });
});

// ═══════════════════════════════════════
//  getBudgets
// ═══════════════════════════════════════
describe('getBudgets', () => {
  it('returns all budgets with no filters', () => {
    const r = svc.getBudgets();
    expect(r.count).toBe(1);
    expect(r.budgets.length).toBe(1);
  });

  it('filters by vehicleId', () => {
    svc.createBudget({ vehicleId: 'V2', period: '2026-01', totalBudget: 1000, categories: {} });
    const r = svc.getBudgets({ vehicleId: 'VRN-TEST-001' });
    expect(r.count).toBe(1);
  });

  it('filters by period', () => {
    const r = svc.getBudgets({ period: '2026-01' });
    expect(r.count).toBe(1);
  });

  it('filters by type', () => {
    const r = svc.getBudgets({ type: 'monthly' });
    expect(r.count).toBe(1);
  });

  it('returns empty for no match', () => {
    const r = svc.getBudgets({ vehicleId: 'NONEXISTENT' });
    expect(r.count).toBe(0);
  });
});

// ═══════════════════════════════════════
//  getCosts
// ═══════════════════════════════════════
describe('getCosts', () => {
  it('returns all costs with no filters', () => {
    const r = svc.getCosts();
    expect(r.count).toBe(1);
  });

  it('filters by vehicleId', () => {
    const r = svc.getCosts({ vehicleId: 'VRN-TEST-001' });
    expect(r.count).toBe(1);
  });

  it('filters by category', () => {
    const r = svc.getCosts({ category: 'fuel' });
    expect(r.count).toBe(1);
    expect(svc.getCosts({ category: 'nonexistent' }).count).toBe(0);
  });

  it('filters by approved', () => {
    const r = svc.getCosts({ approved: true });
    expect(r.count).toBe(1);
    expect(svc.getCosts({ approved: false }).count).toBe(0);
  });
});

// ═══════════════════════════════════════
//  getBudgetDetails
// ═══════════════════════════════════════
describe('getBudgetDetails', () => {
  it('returns budget with category breakdown', () => {
    const r = svc.getBudgetDetails(7000);
    expect(r).not.toBeNull();
    expect(r.id).toBe(7000);
    expect(r.categoryBreakdown).toBeDefined();
    expect(r.categoryBreakdown.fuel).toHaveProperty('budgeted');
    expect(r.categoryBreakdown.fuel).toHaveProperty('spent');
    expect(r.categoryBreakdown.fuel).toHaveProperty('remaining');
  });

  it('returns null for non-existent', () => {
    expect(svc.getBudgetDetails(9999)).toBeNull();
  });
});

// ═══════════════════════════════════════
//  calculateCategorySpending
// ═══════════════════════════════════════
describe('calculateCategorySpending', () => {
  it('sums costs for category in period', () => {
    const period = new Date().toISOString().substring(0, 7);
    const total = svc.calculateCategorySpending('VRN-TEST-001', period, 'fuel');
    expect(total).toBe(250);
  });

  it('returns 0 for no matching costs', () => {
    expect(svc.calculateCategorySpending('VRN-TEST-001', '2020-01', 'fuel')).toBe(0);
  });
});

// ═══════════════════════════════════════
//  approveCost / rejectCost
// ═══════════════════════════════════════
describe('approveCost', () => {
  it('approves existing cost', () => {
    svc.costs[0].approved = false;
    const r = svc.approveCost(6000, 'ADMIN-002');
    expect(r.approved).toBe(true);
    expect(r.approver).toBe('ADMIN-002');
    expect(r.approvalDate).toBeDefined();
  });

  it('returns null for non-existent cost', () => {
    expect(svc.approveCost(9999, 'ADMIN')).toBeNull();
  });
});

describe('rejectCost', () => {
  it('rejects existing cost', () => {
    const r = svc.rejectCost(6000, 'over budget');
    expect(r.approved).toBe(false);
    expect(r.rejectionReason).toBe('over budget');
  });

  it('returns null for non-existent cost', () => {
    expect(svc.rejectCost(9999, 'reason')).toBeNull();
  });
});

// ═══════════════════════════════════════
//  analyzeCosts
// ═══════════════════════════════════════
describe('analyzeCosts', () => {
  it('returns cost analysis', () => {
    const r = svc.analyzeCosts('VRN-TEST-001', '2020-01-01', '2030-12-31');
    expect(r.vehicleId).toBe('VRN-TEST-001');
    expect(r.totalCost).toBeGreaterThanOrEqual(0);
    expect(r.categoryBreakdown).toBeDefined();
    expect(r.monthlyBreakdown).toBeDefined();
    expect(r.costTrend).toBeDefined();
    expect(r.predictions).toBeDefined();
  });

  it('handles no matching costs', () => {
    const r = svc.analyzeCosts('NONEXISTENT', '2020-01-01', '2030-12-31');
    expect(r.totalCost).toBe(0);
    expect(r.averageMonthlyCost).toBe(0);
  });
});

// ═══════════════════════════════════════
//  calculateCostTrend
// ═══════════════════════════════════════
describe('calculateCostTrend', () => {
  it('returns insufficient-data for <2 costs', () => {
    const r = svc.calculateCostTrend('VRN-TEST-001', '2020-01-01', '2030-12-31');
    expect(r).toBe('insufficient-data');
  });

  it('detects increasing trend', () => {
    // Add 4 approved costs: first 2 low, last 2 high
    for (let i = 0; i < 2; i++) {
      svc.costs.push({
        id: 6100 + i,
        vehicleId: 'V2',
        category: 'fuel',
        amount: 100,
        date: `2025-03-${String(10 + i).padStart(2, '0')}`,
        approved: true,
      });
    }
    for (let i = 0; i < 2; i++) {
      svc.costs.push({
        id: 6200 + i,
        vehicleId: 'V2',
        category: 'fuel',
        amount: 500,
        date: `2025-06-${String(10 + i).padStart(2, '0')}`,
        approved: true,
      });
    }
    const r = svc.calculateCostTrend('V2', '2025-01-01', '2025-12-31');
    expect(r.trend).toBe('increasing');
    expect(r.change).toBeGreaterThan(0);
  });

  it('detects stable trend', () => {
    for (let i = 0; i < 4; i++) {
      svc.costs.push({
        id: 6300 + i,
        vehicleId: 'V3',
        category: 'fuel',
        amount: 100,
        date: `2025-06-${String(10 + i).padStart(2, '0')}`,
        approved: true,
      });
    }
    const r = svc.calculateCostTrend('V3', '2025-01-01', '2025-12-31');
    expect(r.trend).toBe('stable');
  });
});

// ═══════════════════════════════════════
//  predictFutureCosts
// ═══════════════════════════════════════
describe('predictFutureCosts', () => {
  it('returns empty for no costs', () => {
    const r = svc.predictFutureCosts('NONEXISTENT');
    expect(r).toEqual({});
  });

  it('provides predictions', () => {
    const r = svc.predictFutureCosts('VRN-TEST-001');
    expect(r.nextMonthPredicted).toBeDefined();
    expect(r.nextQuarterPredicted).toBeDefined();
    expect(r.nextYearPredicted).toBeDefined();
    expect(r.confidence).toBe('medium');
  });
});

// ═══════════════════════════════════════
//  compareBudgets
// ═══════════════════════════════════════
describe('compareBudgets', () => {
  it('compares two vehicles', () => {
    const r = svc.compareBudgets('VRN-TEST-001', 'V2', '2026-01');
    expect(r.vehicle1.vehicleId).toBe('VRN-TEST-001');
    expect(r.vehicle1.budget).toBe(5000);
    expect(r.vehicle2.vehicleId).toBe('V2');
    expect(r.vehicle2.budget).toBe(0); // V2 has no budget
  });
});

// ═══════════════════════════════════════
//  getBudgetReport
// ═══════════════════════════════════════
describe('getBudgetReport', () => {
  it('returns report for existing budget', () => {
    const r = svc.getBudgetReport('VRN-TEST-001', '2026-01');
    expect(r).not.toBeNull();
    expect(r.report).toBeDefined();
    expect(r.report.totalBudget).toBe(5000);
    expect(r.report.utilizationPercentage).toBeDefined();
    expect(r.report.recommendations).toBeDefined();
  });

  it('returns null for non-existent', () => {
    expect(svc.getBudgetReport('NONEXISTENT', '2026-01')).toBeNull();
  });
});

// ═══════════════════════════════════════
//  getBudgetRecommendations
// ═══════════════════════════════════════
describe('getBudgetRecommendations', () => {
  it('warns when >90% utilization', () => {
    const budget = {
      ...svc.budgets[0],
      utilization: 95,
      vehicleId: 'VRN-TEST-001',
      period: '2026-01',
    };
    const r = svc.getBudgetRecommendations(budget);
    expect(r.some(rec => rec.includes('تحذير') || rec.includes('90'))).toBe(true);
  });

  it('emergency when >100%', () => {
    const budget = {
      ...svc.budgets[0],
      utilization: 110,
      vehicleId: 'VRN-TEST-001',
      period: '2026-01',
    };
    const r = svc.getBudgetRecommendations(budget);
    expect(r.some(rec => rec.includes('طارئ') || rec.includes('تجاوز'))).toBe(true);
  });

  it('empty for healthy budget', () => {
    const budget = {
      ...svc.budgets[0],
      utilization: 30,
      vehicleId: 'VRN-TEST-001',
      period: '2026-01',
    };
    const r = svc.getBudgetRecommendations(budget);
    // should not have utilization warnings
    expect(r.filter(rec => rec.includes('تحذير') || rec.includes('طارئ')).length).toBe(0);
  });
});

// ═══════════════════════════════════════
//  rebalanceBudget
// ═══════════════════════════════════════
describe('rebalanceBudget', () => {
  it('rebalances when sum equals totalBudget', () => {
    const newAlloc = { fuel: 2000, maintenance: 1500, insurance: 500, repairs: 500, other: 500 };
    const r = svc.rebalanceBudget(7000, newAlloc);
    expect(r).not.toBeNull();
    expect(r.categories).toEqual(newAlloc);
  });

  it('returns null when sum != totalBudget', () => {
    expect(svc.rebalanceBudget(7000, { fuel: 100 })).toBeNull();
  });

  it('returns null for non-existent budget', () => {
    expect(svc.rebalanceBudget(9999, {})).toBeNull();
  });
});

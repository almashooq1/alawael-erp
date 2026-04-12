/**
 * Unit Tests — branchesCalculations.service.js
 * Pure business logic — NO mocks needed
 */
'use strict';

const {
  BRANCH_CONSTANTS,
  calculateBranchCapacityUtilization,
  calculateTherapistLoadDistribution,
  calculateBranchKPIs,
  compareBranchPerformance,
  distributeBeneficiariesAcrossBranches,
  analyzeWaitlist,
  validateBranchSettings,
  calculateSystemSettingsScore,
  calculateBranchRevenueProjection,
  analyzeBranchRevenueVsTarget,
  analyzeOperatingHours,
  calculateBranchHealthScore,
} = require('../../services/branches/branchesCalculations.service');

// ════════════════════════════════════════
//  calculateBranchCapacityUtilization
// ════════════════════════════════════════
describe('calculateBranchCapacityUtilization', () => {
  it('returns zeroed result for null/undefined input', () => {
    expect(calculateBranchCapacityUtilization(null).utilizationRate).toBe(0);
    expect(calculateBranchCapacityUtilization(undefined).status).toBe('unknown');
  });

  it('returns no_capacity when effectiveCapacity is zero', () => {
    const r = calculateBranchCapacityUtilization({
      totalSessions: 10,
      maxCapacity: 0,
      rooms: 0,
      therapists: 0,
    });
    expect(r.status).toBe('no_capacity');
  });

  it('calculates utilizationRate using maxCapacity when provided', () => {
    const r = calculateBranchCapacityUtilization({ totalSessions: 40, maxCapacity: 100 });
    expect(r.utilizationRate).toBeCloseTo(0.4, 2);
    expect(r.status).toBe('under_utilized');
    expect(r.availableSlots).toBe(60);
  });

  it('status = optimal when utilization ~80%', () => {
    const r = calculateBranchCapacityUtilization({ totalSessions: 80, maxCapacity: 100 });
    expect(r.status).toBe('optimal');
  });

  it('status = acceptable when utilization ~65%', () => {
    const r = calculateBranchCapacityUtilization({ totalSessions: 65, maxCapacity: 100 });
    expect(r.status).toBe('acceptable');
  });

  it('status = over_capacity when utilization >= 95%', () => {
    const r = calculateBranchCapacityUtilization({ totalSessions: 96, maxCapacity: 100 });
    expect(r.status).toBe('over_capacity');
  });

  it('caps utilizationRate at 1 even if sessions exceed capacity', () => {
    const r = calculateBranchCapacityUtilization({ totalSessions: 200, maxCapacity: 100 });
    expect(r.utilizationRate).toBe(1);
  });

  it('calculates capacity from rooms & therapists when no maxCapacity', () => {
    const r = calculateBranchCapacityUtilization({
      totalSessions: 0,
      rooms: 2,
      therapists: 2,
      workingDays: 1,
    });
    expect(r.therapistCapacity).toBe(2 * 8);
    expect(r.effectiveCapacity).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════
//  calculateTherapistLoadDistribution
// ════════════════════════════════════════
describe('calculateTherapistLoadDistribution', () => {
  it('returns defaults for empty array', () => {
    const r = calculateTherapistLoadDistribution([]);
    expect(r.totalTherapists).toBe(0);
    expect(r.loadBalanceScore).toBe(100);
  });

  it('classifies overloaded therapists (loadRate >= 0.95)', () => {
    const therapists = [
      { id: 't1', name: 'A', currentSessions: 8, maxSessions: 8 },
      { id: 't2', name: 'B', currentSessions: 2, maxSessions: 8 },
    ];
    const r = calculateTherapistLoadDistribution(therapists);
    expect(r.overloaded).toHaveLength(1);
    expect(r.underloaded).toHaveLength(1);
    expect(r.totalTherapists).toBe(2);
    expect(r.recommendation).toContain('مثقل');
  });

  it('classifies all balanced when loads similar', () => {
    const therapists = [
      { id: 't1', name: 'A', currentSessions: 6, maxSessions: 8 },
      { id: 't2', name: 'B', currentSessions: 6, maxSessions: 8 },
    ];
    const r = calculateTherapistLoadDistribution(therapists);
    expect(r.balanced).toHaveLength(2);
    expect(r.recommendation).toContain('متوازن');
  });

  it('uses THERAPIST_MAX_DAILY_SESSIONS when maxSessions absent', () => {
    const therapists = [{ id: 't1', name: 'A', currentSessions: 5 }];
    const r = calculateTherapistLoadDistribution(therapists);
    // 5/8 = 0.625 → balanced
    expect(r.balanced).toHaveLength(1);
  });
});

// ════════════════════════════════════════
//  calculateBranchKPIs
// ════════════════════════════════════════
describe('calculateBranchKPIs', () => {
  it('returns poor rating for null input', () => {
    const r = calculateBranchKPIs(null);
    expect(r.overallScore).toBe(0);
    expect(r.rating).toBe('poor');
  });

  it('computes KPI scores and overall rating', () => {
    const metrics = {
      totalSessions: 100,
      completedSessions: 90,
      cancelledSessions: 3,
      noShowSessions: 2,
      totalRevenue: 50000,
      targetRevenue: 50000,
      satisfactionScore: 4.5,
      clinicalGoalsAchieved: 80,
      totalClinicalGoals: 100,
      staffCount: 5,
      occupancyRate: 80,
    };
    const r = calculateBranchKPIs(metrics);
    expect(r.overallScore).toBeGreaterThan(0);
    expect(['excellent', 'good', 'average', 'poor']).toContain(r.rating);
    expect(r.kpis.completionRate).toBe(90);
    expect(r.benchmarkComparison).toBeDefined();
  });

  it('marks cancellation/noShow vs benchmark target', () => {
    const metrics = {
      totalSessions: 100,
      cancelledSessions: 10,
      noShowSessions: 15,
    };
    const r = calculateBranchKPIs(metrics);
    expect(r.benchmarkComparison.cancellationVsTarget).toBe('exceeds_target');
    expect(r.benchmarkComparison.noShowVsTarget).toBe('exceeds_target');
  });
});

// ════════════════════════════════════════
//  compareBranchPerformance
// ════════════════════════════════════════
describe('compareBranchPerformance', () => {
  it('returns empty for no branches', () => {
    const r = compareBranchPerformance([]);
    expect(r.ranked).toEqual([]);
    expect(r.best).toBeNull();
  });

  it('ranks branches by overallScore descending', () => {
    const branches = [
      { id: 'b1', name: 'Branch 1', metrics: { totalSessions: 100, completedSessions: 50 } },
      { id: 'b2', name: 'Branch 2', metrics: { totalSessions: 100, completedSessions: 90 } },
    ];
    const r = compareBranchPerformance(branches);
    expect(r.ranked[0].name).toBe('Branch 2');
    expect(r.totalBranches).toBe(2);
    expect(r.best.name).toBe('Branch 2');
  });
});

// ════════════════════════════════════════
//  distributeBeneficiariesAcrossBranches
// ════════════════════════════════════════
describe('distributeBeneficiariesAcrossBranches', () => {
  it('returns empty for no branches', () => {
    expect(distributeBeneficiariesAcrossBranches(10, [])).toEqual([]);
  });

  it('distributes proportionally by available capacity', () => {
    const branches = [
      { id: 'b1', name: 'A', capacity: 50, currentLoad: 30 },
      { id: 'b2', name: 'B', capacity: 50, currentLoad: 10 },
    ];
    const r = distributeBeneficiariesAcrossBranches(20, branches);
    expect(r.length).toBe(2);
    // B has more available (40 vs 20), so gets more
    const totalAllocated = r.reduce((s, b) => s + b.allocated, 0);
    expect(totalAllocated).toBe(20);
  });

  it('returns waitlisted when all branches full', () => {
    const branches = [{ id: 'b1', name: 'A', capacity: 10, currentLoad: 10 }];
    const r = distributeBeneficiariesAcrossBranches(5, branches);
    // all branches have available=0, so returns with waitlisted
    expect(r[0].waitlisted).toBe(5);
  });
});

// ════════════════════════════════════════
//  analyzeWaitlist
// ════════════════════════════════════════
describe('analyzeWaitlist', () => {
  it('returns zeros for empty array', () => {
    const r = analyzeWaitlist([], {});
    expect(r.totalWaiting).toBe(0);
  });

  it('analyzes entries and computes stats', () => {
    const past = new Date();
    past.setDate(past.getDate() - 20);
    const entries = [
      { id: 'w1', requestedAt: past.toISOString(), priority: 'urgent' },
      { id: 'w2', requestedAt: new Date().toISOString(), priority: 'normal' },
    ];
    const r = analyzeWaitlist(entries, { dailyAvailableSlots: 1 });
    expect(r.totalWaiting).toBe(2);
    expect(r.urgentCount).toBe(1);
    expect(r.overdueCount).toBeGreaterThanOrEqual(1);
    expect(r.estimatedDaysToCleared).toBe(2);
    expect(r.entries).toHaveLength(2);
    // urgent entry first
    expect(r.entries[0].priority).toBe('urgent');
  });
});

// ════════════════════════════════════════
//  validateBranchSettings
// ════════════════════════════════════════
describe('validateBranchSettings', () => {
  it('returns 0 score for null', () => {
    const r = validateBranchSettings(null);
    expect(r.completenessScore).toBe(0);
    expect(r.isComplete).toBe(false);
  });

  it('returns complete when all required fields present', () => {
    const settings = {
      name: 'X',
      address: 'Y',
      phone: '123',
      managerName: 'M',
      operatingHours: '8-5',
      capacity: 50,
      email: 'x@x.com',
      licenseNumber: 'L1',
      insuranceContracts: 'C1',
      emergencyContact: '999',
    };
    const r = validateBranchSettings(settings);
    expect(r.isComplete).toBe(true);
    expect(r.completenessScore).toBe(100);
    expect(r.status).toBe('complete');
  });

  it('reports issues for missing required fields', () => {
    const r = validateBranchSettings({ name: 'X' });
    expect(r.issues.length).toBeGreaterThanOrEqual(5);
    expect(r.isComplete).toBe(false);
  });
});

// ════════════════════════════════════════
//  calculateSystemSettingsScore
// ════════════════════════════════════════
describe('calculateSystemSettingsScore', () => {
  it('returns critical for null', () => {
    const r = calculateSystemSettingsScore(null);
    expect(r.score).toBe(0);
    expect(r.level).toBe('critical');
  });

  it('scores 100 when all settings enabled', () => {
    const r = calculateSystemSettingsScore({
      twoFactorAuth: true,
      backupEnabled: true,
      auditLogging: true,
      sessionTimeout: true,
      emailNotifications: true,
      smsNotifications: true,
      zatcaIntegration: true,
      gosiIntegration: true,
      dataEncryption: true,
    });
    expect(r.score).toBe(100);
    expect(r.level).toBe('excellent');
    expect(r.recommendations).toHaveLength(0);
  });

  it('generates high-priority recommendations for missing items', () => {
    const r = calculateSystemSettingsScore({});
    expect(r.recommendations.length).toBeGreaterThan(0);
    // high-priority ones first
    expect(r.recommendations[0].priority).toBe('high');
  });
});

// ════════════════════════════════════════
//  calculateBranchRevenueProjection
// ════════════════════════════════════════
describe('calculateBranchRevenueProjection', () => {
  it('returns zeros for null', () => {
    const r = calculateBranchRevenueProjection(null);
    expect(r.projected).toBe(0);
  });

  it('projects revenue based on therapists and fee', () => {
    const r = calculateBranchRevenueProjection({
      therapists: 5,
      averageSessionFee: 200,
      workingDaysPerMonth: 22,
      targetUtilization: 0.8,
    });
    expect(r.projectedRevenue).toBeGreaterThan(0);
    expect(r.minimumRevenue).toBeLessThan(r.projectedRevenue);
    expect(r.maximumRevenue).toBeGreaterThan(r.projectedRevenue);
  });

  it('computes breakEvenSessions when fixedCosts provided', () => {
    const r = calculateBranchRevenueProjection({ therapists: 2, fixedCosts: 60000 });
    expect(r.breakEvenSessions).toBeDefined();
    expect(r.breakEvenSessions).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════
//  analyzeBranchRevenueVsTarget
// ════════════════════════════════════════
describe('analyzeBranchRevenueVsTarget', () => {
  it('returns zeros for empty', () => {
    const r = analyzeBranchRevenueVsTarget([]);
    expect(r.achievementRate).toBe(0);
  });

  it('ranks branches by achievementRate', () => {
    const data = [
      { id: 'b1', name: 'A', actualRevenue: 50000, targetRevenue: 100000 },
      { id: 'b2', name: 'B', actualRevenue: 100000, targetRevenue: 100000 },
    ];
    const r = analyzeBranchRevenueVsTarget(data);
    expect(r.branches[0].name).toBe('B');
    expect(r.topPerformer.name).toBe('B');
    expect(r.bottomPerformer.name).toBe('A');
    expect(r.branches[0].status).toBe('achieved');
    expect(r.branches[1].status).toBe('below_target');
  });
});

// ════════════════════════════════════════
//  analyzeOperatingHours
// ════════════════════════════════════════
describe('analyzeOperatingHours', () => {
  it('returns invalid for missing times', () => {
    const r = analyzeOperatingHours({});
    expect(r.isValid).toBe(false);
  });

  it('returns error if closeTime <= openTime', () => {
    const r = analyzeOperatingHours({ openTime: '17:00', closeTime: '08:00' });
    expect(r.isValid).toBe(false);
    expect(r.error).toBeDefined();
  });

  it('calculates hours correctly with break', () => {
    const r = analyzeOperatingHours({
      openTime: '08:00',
      closeTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
    });
    expect(r.isValid).toBe(true);
    expect(r.dailyHours).toBe(8);
    expect(r.sessionsPerDay).toBeGreaterThan(0);
  });

  it('computes weekly hours using daysOff', () => {
    const r = analyzeOperatingHours({
      openTime: '08:00',
      closeTime: '16:00',
      daysOff: ['friday', 'saturday'],
    });
    expect(r.workingDaysPerWeek).toBe(5);
    expect(r.weeklyHours).toBe(r.dailyHours * 5);
  });
});

// ════════════════════════════════════════
//  calculateBranchHealthScore
// ════════════════════════════════════════
describe('calculateBranchHealthScore', () => {
  it('returns critical for null', () => {
    const r = calculateBranchHealthScore(null);
    expect(r.healthScore).toBe(0);
    expect(r.status).toBe('critical');
  });

  it('returns healthy with no alerts when data is perfect', () => {
    const r = calculateBranchHealthScore({
      utilizationRate: 0.8,
      satisfactionScore: 4.8,
      cancellationRate: 0.02,
      staffTurnoverRate: 0.05,
      overduePaymentsCount: 0,
      averageWaitlistDays: 5,
    });
    expect(r.healthScore).toBe(100);
    expect(r.status).toBe('healthy');
    expect(r.alerts).toHaveLength(0);
  });

  it('deducts points and adds alerts for low satisfaction', () => {
    const r = calculateBranchHealthScore({ satisfactionScore: 2.5 });
    expect(r.healthScore).toBeLessThan(100);
    expect(r.alerts.some(a => a.type === 'low_satisfaction')).toBe(true);
  });

  it('deducts for high cancellation rate', () => {
    const r = calculateBranchHealthScore({ cancellationRate: 0.15 });
    expect(r.alerts.some(a => a.type === 'high_cancellation')).toBe(true);
  });

  it('deducts for high staff turnover', () => {
    const r = calculateBranchHealthScore({ staffTurnoverRate: 0.3 });
    expect(r.alerts.some(a => a.type === 'high_turnover')).toBe(true);
  });

  it('deducts for long waitlist', () => {
    const r = calculateBranchHealthScore({ averageWaitlistDays: 20 });
    expect(r.alerts.some(a => a.type === 'long_waitlist')).toBe(true);
  });

  it('sorts alerts by severity (critical first)', () => {
    const r = calculateBranchHealthScore({
      satisfactionScore: 2,
      averageWaitlistDays: 20,
    });
    if (r.alerts.length >= 2) {
      expect(r.alerts[0].severity).toBe('critical');
    }
  });
});

// ════════════════════════════════════════
//  BRANCH_CONSTANTS sanity
// ════════════════════════════════════════
describe('BRANCH_CONSTANTS', () => {
  it('exports expected constant keys', () => {
    expect(BRANCH_CONSTANTS.CAPACITY).toBeDefined();
    expect(BRANCH_CONSTANTS.PERFORMANCE).toBeDefined();
    expect(BRANCH_CONSTANTS.KPI_WEIGHTS).toBeDefined();
    expect(BRANCH_CONSTANTS.BENCHMARK).toBeDefined();
    expect(BRANCH_CONSTANTS.CAPACITY.THERAPIST_MAX_DAILY_SESSIONS).toBe(8);
  });
});

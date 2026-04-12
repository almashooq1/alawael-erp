/**
 * Unit Tests — clinicalProgress.service.js
 * Pure business logic — NO mocks needed
 */
'use strict';

const {
  DISABILITY_SEVERITY,
  SPECIALIZATIONS,
  GOAL_STATUS,
  SESSION_OUTCOME,
  QUALITY_THRESHOLDS,
  SCALE_RANGES,
  PROGRESS_WEIGHTS,
  validatePercentage,
  validatePositiveInteger,
  validateScaleScore,
  calculateAttendanceRate,
  calculateGoalAchievementRate,
  calculateTrialBasedProgress,
  calculateSessionQualityScore,
  calculateFunctionalImprovement,
  calculateOverallProgressIndex,
  calculateCenterKPIs,
  calculateTherapistOccupancy,
  stratifyBeneficiaries,
  generateProgressReport,
  getProgressRecommendation,
} = require('../../services/clinical/clinicalProgress.service');

// ═══════════════════════════════════════
//  Constants
// ═══════════════════════════════════════
describe('clinicalProgress constants', () => {
  it('exports DISABILITY_SEVERITY', () => {
    expect(DISABILITY_SEVERITY.MILD).toBe('mild');
    expect(DISABILITY_SEVERITY.PROFOUND).toBe('profound');
  });

  it('exports SPECIALIZATIONS', () => {
    expect(SPECIALIZATIONS.PT).toBe('pt');
    expect(SPECIALIZATIONS.ABA).toBe('aba');
  });

  it('exports GOAL_STATUS', () => {
    expect(GOAL_STATUS.ACHIEVED).toBe('achieved');
    expect(GOAL_STATUS.ON_HOLD).toBe('on_hold');
  });

  it('exports SESSION_OUTCOME', () => {
    expect(SESSION_OUTCOME.EXCELLENT).toBe('excellent');
    expect(SESSION_OUTCOME.NO_SHOW).toBe('no_show');
  });

  it('exports QUALITY_THRESHOLDS', () => {
    expect(QUALITY_THRESHOLDS.ATTENDANCE_EXCELLENT).toBe(90);
    expect(QUALITY_THRESHOLDS.GOAL_ACHIEVEMENT_EXCELLENT).toBe(80);
  });

  it('exports SCALE_RANGES with limits', () => {
    expect(SCALE_RANGES.BERG_BALANCE.max).toBe(56);
    expect(SCALE_RANGES.FIM.min).toBe(18);
    expect(SCALE_RANGES.GMFCS.max).toBe(5);
  });

  it('exports PROGRESS_WEIGHTS summing to 1', () => {
    const sum = Object.values(PROGRESS_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});

// ═══════════════════════════════════════
//  Validation helpers
// ═══════════════════════════════════════
describe('validation helpers', () => {
  it('validatePercentage accepts 0-100', () => {
    expect(validatePercentage(0)).toBe(true);
    expect(validatePercentage(100)).toBe(true);
  });

  it('validatePercentage rejects out of range', () => {
    expect(() => validatePercentage(-1)).toThrow();
    expect(() => validatePercentage(101)).toThrow();
    expect(() => validatePercentage('x')).toThrow();
  });

  it('validatePositiveInteger works', () => {
    expect(validatePositiveInteger(0)).toBe(true);
    expect(validatePositiveInteger(5)).toBe(true);
    expect(() => validatePositiveInteger(-1)).toThrow();
    expect(() => validatePositiveInteger(2.5)).toThrow();
  });

  it('validateScaleScore validates range', () => {
    expect(validateScaleScore(30, 'BERG_BALANCE')).toBe(true);
    expect(() => validateScaleScore(57, 'BERG_BALANCE')).toThrow();
    expect(() => validateScaleScore(0, 'UNKNOWN_SCALE')).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateAttendanceRate
// ═══════════════════════════════════════
describe('calculateAttendanceRate', () => {
  it('computes perfect attendance', () => {
    const r = calculateAttendanceRate(10, 10);
    expect(r.rate).toBe(100);
    expect(r.rating).toBe('ممتاز');
    expect(r.effective).toBe(10);
  });

  it('computes 75% attendance', () => {
    const r = calculateAttendanceRate(15, 20);
    expect(r.rate).toBe(75);
    expect(r.rating).toBe('جيد');
  });

  it('excludes centre-cancelled sessions', () => {
    const r = calculateAttendanceRate(8, 12, 2); // effective = 10
    expect(r.effective).toBe(10);
    expect(r.rate).toBe(80);
    expect(r.cancelledByCenter).toBe(2);
  });

  it('returns N/A when all cancelled', () => {
    const r = calculateAttendanceRate(0, 5, 5);
    expect(r.rate).toBe(0);
    expect(r.rating).toBe('N/A');
  });

  it('throws when attended exceeds effective', () => {
    expect(() => calculateAttendanceRate(11, 10)).toThrow();
  });

  it('low attendance rates', () => {
    const r = calculateAttendanceRate(5, 10);
    expect(r.rate).toBe(50);
    expect(r.rating).toBe('يحتاج متابعة');
  });
});

// ═══════════════════════════════════════
//  calculateGoalAchievementRate
// ═══════════════════════════════════════
describe('calculateGoalAchievementRate', () => {
  it('throws for non-array', () => {
    expect(() => calculateGoalAchievementRate(null)).toThrow();
  });

  it('returns zeros for empty goals', () => {
    const r = calculateGoalAchievementRate([]);
    expect(r.achievementRate).toBe(0);
    expect(r.totalGoals).toBe(0);
    expect(r.rating).toBe('N/A');
  });

  it('computes full achievement', () => {
    const goals = [{ status: 'achieved' }, { status: 'achieved' }];
    const r = calculateGoalAchievementRate(goals);
    expect(r.achievementRate).toBe(100);
    expect(r.achievedGoals).toBe(2);
    expect(r.rating).toBe('ممتاز');
  });

  it('excludes discontinued from active count', () => {
    const goals = [{ status: 'achieved' }, { status: 'discontinued' }];
    const r = calculateGoalAchievementRate(goals);
    expect(r.activeGoals).toBe(1);
    expect(r.achievementRate).toBe(100);
  });

  it('computes partial credit for in-progress goals', () => {
    const goals = [{ status: 'in_progress', progressPercentage: 80 }, { status: 'not_started' }];
    const r = calculateGoalAchievementRate(goals);
    expect(r.achievementRate).toBe(0);
    expect(r.weightedRate).toBeGreaterThan(0);
    expect(r.inProgressGoals).toBe(1);
  });

  it('counts by status', () => {
    const goals = [
      { status: 'achieved' },
      { status: 'in_progress' },
      { status: 'not_started' },
      { status: 'on_hold' },
    ];
    const r = calculateGoalAchievementRate(goals);
    expect(r.byStatus.achieved).toBe(1);
    expect(r.byStatus.in_progress).toBe(1);
    expect(r.byStatus.not_started).toBe(1);
    expect(r.byStatus.on_hold).toBe(1);
  });
});

// ═══════════════════════════════════════
//  calculateTrialBasedProgress
// ═══════════════════════════════════════
describe('calculateTrialBasedProgress', () => {
  it('throws for empty', () => {
    expect(() => calculateTrialBasedProgress([])).toThrow();
  });

  it('computes mastered when above threshold', () => {
    const r = calculateTrialBasedProgress([true, true, true, true, false]);
    expect(r.successRate).toBe(80);
    expect(r.isMastered).toBe(true);
    expect(r.correctTrials).toBe(4);
    expect(r.errorTrials).toBe(1);
    expect(r.percentToMastery).toBe(100);
  });

  it('not mastered below threshold', () => {
    const r = calculateTrialBasedProgress([true, false, false, false, false], 80);
    expect(r.successRate).toBe(20);
    expect(r.isMastered).toBe(false);
    expect(r.percentToMastery).toBe(25); // 20/80*100
  });

  it('counts prompted trials', () => {
    const r = calculateTrialBasedProgress([true, 'p', 'P', false]);
    expect(r.promptedTrials).toBe(2);
  });

  it('custom mastery threshold', () => {
    const r = calculateTrialBasedProgress([true, true, false], 60);
    expect(r.successRate).toBeCloseTo(66.67, 0);
    expect(r.isMastered).toBe(true);
  });
});

// ═══════════════════════════════════════
//  calculateSessionQualityScore
// ═══════════════════════════════════════
describe('calculateSessionQualityScore', () => {
  it('throws for non-array', () => {
    expect(() => calculateSessionQualityScore(null)).toThrow();
  });

  it('returns N/A for empty', () => {
    const r = calculateSessionQualityScore([]);
    expect(r.averageScore).toBe(0);
    expect(r.overallRating).toBe('N/A');
  });

  it('excellent for all excellent sessions', () => {
    const r = calculateSessionQualityScore([{ outcome: 'excellent' }, { outcome: 'excellent' }]);
    expect(r.averageScore).toBe(100);
    expect(r.overallRating).toBe('ممتاز');
    expect(r.completedSessions).toBe(2);
  });

  it('excludes no-shows from average', () => {
    const r = calculateSessionQualityScore([{ outcome: 'good' }, { outcome: 'no_show' }]);
    expect(r.averageScore).toBe(75);
    expect(r.noShowSessions).toBe(1);
    expect(r.completedSessions).toBe(1);
  });

  it('computes mixed outcomes', () => {
    const r = calculateSessionQualityScore([{ outcome: 'excellent' }, { outcome: 'poor' }]);
    expect(r.averageScore).toBe(62.5); // (100+25)/2
    expect(r.overallRating).toBe('مقبول');
    expect(r.distribution.excellent).toBe(1);
    expect(r.distribution.poor).toBe(1);
  });
});

// ═══════════════════════════════════════
//  calculateFunctionalImprovement
// ═══════════════════════════════════════
describe('calculateFunctionalImprovement', () => {
  it('detects improvement on Berg Balance', () => {
    const r = calculateFunctionalImprovement(20, 40, 'BERG_BALANCE');
    expect(r.improvementPoints).toBe(20);
    expect(r.isImproved).toBe(true);
    expect(r.isDeterioration).toBe(false);
    expect(r.improvementPercentage).toBeCloseTo(35.71, 0);
  });

  it('detects deterioration', () => {
    const r = calculateFunctionalImprovement(40, 20, 'BERG_BALANCE');
    expect(r.isDeterioration).toBe(true);
    expect(r.improvementPoints).toBe(-20);
  });

  it('detects unchanged', () => {
    const r = calculateFunctionalImprovement(30, 30, 'BERG_BALANCE');
    expect(r.isUnchanged).toBe(true);
    expect(r.improvementPoints).toBe(0);
  });

  it('works with GMFCS (lower is better)', () => {
    const r = calculateFunctionalImprovement(4, 2, 'GMFCS', false);
    expect(r.improvementPoints).toBe(2);
    expect(r.isImproved).toBe(true);
  });

  it('validates scale bounds', () => {
    expect(() => calculateFunctionalImprovement(-1, 30, 'BERG_BALANCE')).toThrow();
    expect(() => calculateFunctionalImprovement(30, 60, 'BERG_BALANCE')).toThrow();
  });

  it('returns scale metadata', () => {
    const r = calculateFunctionalImprovement(20, 30, 'FIM');
    expect(r.scaleName).toBe('FIM');
    expect(r.scaleFullName).toBe('Functional Independence Measure');
    expect(r.minScore).toBe(18);
    expect(r.maxScore).toBe(126);
  });
});

// ═══════════════════════════════════════
//  calculateOverallProgressIndex
// ═══════════════════════════════════════
describe('calculateOverallProgressIndex', () => {
  it('throws for null data', () => {
    expect(() => calculateOverallProgressIndex(null)).toThrow();
  });

  it('computes weighted index', () => {
    const r = calculateOverallProgressIndex({
      goalAchievementRate: 80,
      attendanceRate: 90,
      sessionQualityScore: 75,
      functionalImprovementScore: 60,
    });
    // 80*0.35 + 90*0.25 + 75*0.25 + 60*0.15 = 28+22.5+18.75+9 = 78.25
    expect(r.overallIndex).toBeCloseTo(78.25, 1);
    expect(r.progressCategory).toBe('تقدم جيد');
    expect(r.components.goalAchievement.contribution).toBeCloseTo(28, 0);
  });

  it('excellent for all-100', () => {
    const r = calculateOverallProgressIndex({
      goalAchievementRate: 100,
      attendanceRate: 100,
      sessionQualityScore: 100,
      functionalImprovementScore: 100,
    });
    expect(r.overallIndex).toBe(100);
    expect(r.progressCategory).toBe('تقدم ممتاز');
  });

  it('needs review for all-zero', () => {
    const r = calculateOverallProgressIndex({});
    expect(r.overallIndex).toBe(0);
    expect(r.progressCategory).toBe('يحتاج مراجعة شاملة');
  });

  it('allows custom weights', () => {
    const customWeights = {
      goal_achievement: 0.5,
      attendance_rate: 0.2,
      session_quality: 0.2,
      functional_improvement: 0.1,
    };
    const r = calculateOverallProgressIndex({
      goalAchievementRate: 100,
      attendanceRate: 0,
      sessionQualityScore: 0,
      functionalImprovementScore: 0,
      customWeights,
    });
    expect(r.overallIndex).toBe(50);
  });

  it('rejects custom weights not summing to 1', () => {
    expect(() =>
      calculateOverallProgressIndex({
        customWeights: {
          goal_achievement: 0.5,
          attendance_rate: 0.5,
          session_quality: 0.5,
          functional_improvement: 0.5,
        },
      })
    ).toThrow('مجموع المعاملات');
  });
});

// ═══════════════════════════════════════
//  calculateCenterKPIs
// ═══════════════════════════════════════
describe('calculateCenterKPIs', () => {
  it('throws for non-array', () => {
    expect(() => calculateCenterKPIs(null)).toThrow();
  });

  it('returns zeros for empty', () => {
    const r = calculateCenterKPIs([]);
    expect(r.totalBeneficiaries).toBe(0);
    expect(r.averageAttendanceRate).toBe(0);
  });

  it('computes averages and counts', () => {
    const bens = [
      { attendanceRate: 90, goalAchievementRate: 85, overallProgressIndex: 80 },
      { attendanceRate: 60, goalAchievementRate: 30, overallProgressIndex: 25 },
    ];
    const r = calculateCenterKPIs(bens);
    expect(r.totalBeneficiaries).toBe(2);
    expect(r.averageAttendanceRate).toBe(75);
    expect(r.dischargeReadyCount).toBe(1); // first meets >=80 goal + >=75 attendance
    expect(r.needsReviewCount).toBe(1); // second has progress < 35
  });
});

// ═══════════════════════════════════════
//  calculateTherapistOccupancy
// ═══════════════════════════════════════
describe('calculateTherapistOccupancy', () => {
  it('computes occupancy metrics', () => {
    const r = calculateTherapistOccupancy(8, 10, 12);
    expect(r.occupancyRate).toBeCloseTo(66.67, 0);
    expect(r.utilizationRate).toBe(80);
    expect(r.remainingCapacity).toBe(4);
    expect(r.isOverloaded).toBe(false);
    expect(r.isUnderUtilized).toBe(false);
  });

  it('detects overloaded', () => {
    const r = calculateTherapistOccupancy(10, 10, 10);
    expect(r.isOverloaded).toBe(true);
    expect(r.occupancyRate).toBe(100);
  });

  it('detects under-utilized', () => {
    const r = calculateTherapistOccupancy(3, 10, 10);
    expect(r.isUnderUtilized).toBe(true);
    expect(r.occupancyRate).toBe(30);
  });

  it('throws for zero capacity', () => {
    expect(() => calculateTherapistOccupancy(0, 0, 0)).toThrow();
  });

  it('throws when scheduled > max', () => {
    expect(() => calculateTherapistOccupancy(15, 10, 10)).toThrow();
  });
});

// ═══════════════════════════════════════
//  stratifyBeneficiaries
// ═══════════════════════════════════════
describe('stratifyBeneficiaries', () => {
  it('throws for non-array', () => {
    expect(() => stratifyBeneficiaries(null)).toThrow();
  });

  it('stratifies correctly', () => {
    const bens = [
      { id: 'b1', overallProgressIndex: 80, attendanceRate: 90, goalAchievementRate: 85 }, // discharge
      { id: 'b2', overallProgressIndex: 55, attendanceRate: 75, goalAchievementRate: 60 }, // maintenance
      { id: 'b3', overallProgressIndex: 40, attendanceRate: 65, goalAchievementRate: 20 }, // standard
      { id: 'b4', overallProgressIndex: 10, attendanceRate: 30, goalAchievementRate: 5 }, // high_intensity
    ];
    const r = stratifyBeneficiaries(bens);
    expect(r.summary.ready_for_discharge).toBe(1);
    expect(r.summary.maintenance).toBe(1);
    expect(r.summary.standard).toBe(1);
    expect(r.summary.high_intensity).toBe(1);
    expect(r.summary.total).toBe(4);
  });
});

// ═══════════════════════════════════════
//  generateProgressReport
// ═══════════════════════════════════════
describe('generateProgressReport', () => {
  it('throws for null beneficiary', () => {
    expect(() => generateProgressReport(null)).toThrow();
  });

  it('generates report with no previous', () => {
    const r = generateProgressReport({
      id: 'b1',
      name: 'أحمد',
      attendanceRate: 90,
      goalAchievementRate: 85,
      sessionQualityScore: 80,
      overallProgressIndex: 78,
    });
    expect(r.beneficiaryId).toBe('b1');
    expect(r.beneficiaryName).toBe('أحمد');
    expect(r.currentMetrics.attendanceRate).toBe(90);
    expect(r.trend).toBeNull();
    expect(r.changeFromLastReport).toBeNull();
    expect(r.recommendation).toContain('ممتاز');
  });

  it('detects improvement trend', () => {
    const r = generateProgressReport({ id: 'b1', name: 'أحمد', overallProgressIndex: 70 }, [
      { overallProgressIndex: 50 },
    ]);
    expect(r.trend).toBe('تحسن');
    expect(r.changeFromLastReport).toBe(20);
  });

  it('detects decline trend', () => {
    const r = generateProgressReport({ id: 'b1', name: 'أحمد', overallProgressIndex: 30 }, [
      { overallProgressIndex: 60 },
    ]);
    expect(r.trend).toBe('تراجع');
    expect(r.changeFromLastReport).toBe(-30);
  });

  it('detects stability', () => {
    const r = generateProgressReport({ id: 'b1', name: 'أحمد', overallProgressIndex: 50 }, [
      { overallProgressIndex: 48 },
    ]);
    expect(r.trend).toBe('ثبات');
  });
});

// ═══════════════════════════════════════
//  getProgressRecommendation
// ═══════════════════════════════════════
describe('getProgressRecommendation', () => {
  it('recommends discharge for high performers', () => {
    const r = getProgressRecommendation(80, 90, 85);
    expect(r).toContain('ممتاز');
  });

  it('recommends follow-up for low attendance', () => {
    const r = getProgressRecommendation(40, 50, 40);
    expect(r).toContain('الحضور');
  });

  it('recommends goal review for low achievement', () => {
    const r = getProgressRecommendation(40, 70, 20);
    expect(r).toContain('الأهداف');
  });

  it('recommends team review for very low progress', () => {
    const r = getProgressRecommendation(30, 70, 40);
    expect(r).toContain('اجتماع فريق');
  });

  it('recommends continuation for good progress', () => {
    const r = getProgressRecommendation(70, 75, 60);
    expect(r).toContain('الاستمرار');
  });
});

/**
 * Unit Tests — progressTracking.service.js
 * Clinical progress tracking — 100% pure functions, NO mocks needed
 */
'use strict';

const pt = require('../../services/clinical/progressTracking.service');

// ═══════════════════════════════════════
//  Exported Constants
// ═══════════════════════════════════════
describe('constants', () => {
  it('attendance threshold', () => {
    expect(pt.MIN_ACCEPTABLE_ATTENDANCE_RATE).toBe(75);
  });
  it('goal threshold', () => {
    expect(pt.MIN_ACCEPTABLE_GOAL_ACHIEVEMENT).toBe(60);
  });
  it('min sessions for reliable assessment', () => {
    expect(pt.MIN_SESSIONS_FOR_RELIABLE_ASSESSMENT).toBe(4);
  });
  it('review period weeks', () => {
    expect(pt.STANDARD_REVIEW_PERIOD_WEEKS).toBe(12);
  });
  it('min data points for trend', () => {
    expect(pt.MIN_DATA_POINTS_FOR_TREND).toBe(3);
  });
  it('progress levels', () => {
    expect(pt.PROGRESS_LEVELS.EXCELLENT).toBe('excellent');
    expect(pt.PROGRESS_LEVELS.POOR).toBe('poor');
  });
  it('goal status', () => {
    expect(pt.GOAL_STATUS.ACHIEVED).toBe('achieved');
    expect(pt.GOAL_STATUS.IN_PROGRESS).toBe('in_progress');
  });
  it('trend direction', () => {
    expect(pt.TREND_DIRECTION.IMPROVING).toBe('improving');
    expect(pt.TREND_DIRECTION.DECLINING).toBe('declining');
    expect(pt.TREND_DIRECTION.STABLE).toBe('stable');
    expect(pt.TREND_DIRECTION.INSUFFICIENT_DATA).toBe('insufficient_data');
  });
});

// ═══════════════════════════════════════
//  calculateAttendanceRate
// ═══════════════════════════════════════
describe('calculateAttendanceRate', () => {
  it('perfect attendance', () => {
    expect(pt.calculateAttendanceRate(10, 10)).toBe(100);
  });
  it('partial attendance', () => {
    expect(pt.calculateAttendanceRate(7, 10)).toBe(70);
  });
  it('zero scheduled returns 0', () => {
    expect(pt.calculateAttendanceRate(0, 0)).toBe(0);
  });
  it('throws for negative', () => {
    expect(() => pt.calculateAttendanceRate(-1, 10)).toThrow();
  });
  it('throws when attended > total', () => {
    expect(() => pt.calculateAttendanceRate(11, 10)).toThrow();
  });
  it('throws for non-number', () => {
    expect(() => pt.calculateAttendanceRate('a', 10)).toThrow();
  });
});

// ═══════════════════════════════════════
//  classifyAttendanceRate
// ═══════════════════════════════════════
describe('classifyAttendanceRate', () => {
  it('excellent >=90', () => {
    expect(pt.classifyAttendanceRate(95)).toBe('excellent');
  });
  it('good 75-89', () => {
    expect(pt.classifyAttendanceRate(80)).toBe('good');
  });
  it('satisfactory 60-74', () => {
    expect(pt.classifyAttendanceRate(65)).toBe('satisfactory');
  });
  it('needs_improvement 40-59', () => {
    expect(pt.classifyAttendanceRate(45)).toBe('needs_improvement');
  });
  it('poor <40', () => {
    expect(pt.classifyAttendanceRate(30)).toBe('poor');
  });
});

// ═══════════════════════════════════════
//  calculateAttendanceStats
// ═══════════════════════════════════════
describe('calculateAttendanceStats', () => {
  it('computes all fields', () => {
    const sessions = [
      { status: 'attended' },
      { status: 'attended' },
      { status: 'cancelled' },
      { status: 'no_show' },
      { status: 'attended' },
    ];
    const r = pt.calculateAttendanceStats(sessions);
    expect(r.total).toBe(5);
    expect(r.attended).toBe(3);
    expect(r.cancelled).toBe(1);
    expect(r.noShow).toBe(1);
    expect(r.attendanceRate).toBe(60);
    expect(r.cancellationRate).toBe(20);
    expect(r.noShowRate).toBe(20);
    expect(r.classification).toBe('satisfactory');
    expect(r.isSufficient).toBe(true);
  });

  it('empty sessions', () => {
    const r = pt.calculateAttendanceStats([]);
    expect(r.total).toBe(0);
    expect(r.attendanceRate).toBe(0);
    expect(r.isSufficient).toBe(false);
  });

  it('throws for non-array', () => {
    expect(() => pt.calculateAttendanceStats('bad')).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateGoalAchievementRate
// ═══════════════════════════════════════
describe('calculateGoalAchievementRate', () => {
  it('all achieved', () => {
    const goals = [
      { status: 'achieved', weight: 1 },
      { status: 'achieved', weight: 1 },
    ];
    expect(pt.calculateGoalAchievementRate(goals)).toBe(100);
  });

  it('none achieved', () => {
    const goals = [{ status: 'in_progress' }, { status: 'not_started' }];
    expect(pt.calculateGoalAchievementRate(goals)).toBe(0);
  });

  it('respects weights', () => {
    const goals = [
      { status: 'achieved', weight: 3 },
      { status: 'in_progress', weight: 1 },
    ];
    expect(pt.calculateGoalAchievementRate(goals)).toBe(75);
  });

  it('excludes discontinued', () => {
    const goals = [
      { status: 'achieved', weight: 1 },
      { status: 'discontinued', weight: 1 },
    ];
    expect(pt.calculateGoalAchievementRate(goals)).toBe(100);
  });

  it('empty returns 0', () => {
    expect(pt.calculateGoalAchievementRate([])).toBe(0);
  });

  it('throws for non-array', () => {
    expect(() => pt.calculateGoalAchievementRate(null)).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateGoalStats
// ═══════════════════════════════════════
describe('calculateGoalStats', () => {
  it('counts by status', () => {
    const goals = [
      { status: 'achieved' },
      { status: 'in_progress' },
      { status: 'not_started' },
      { status: 'discontinued' },
    ];
    const r = pt.calculateGoalStats(goals);
    expect(r.total).toBe(4);
    expect(r.achieved).toBe(1);
    expect(r.inProgress).toBe(1);
    expect(r.notStarted).toBe(1);
    expect(r.discontinued).toBe(1);
    expect(r.achievementRate).toBeDefined();
    expect(r.classification).toBeDefined();
  });

  it('throws for non-array', () => {
    expect(() => pt.calculateGoalStats('bad')).toThrow();
  });
});

// ═══════════════════════════════════════
//  analyzeTrend
// ═══════════════════════════════════════
describe('analyzeTrend', () => {
  it('insufficient data (<3 points)', () => {
    const r = pt.analyzeTrend([50, 60]);
    expect(r.direction).toBe('insufficient_data');
  });

  it('improving trend', () => {
    const r = pt.analyzeTrend([40, 50, 60, 70, 80]);
    expect(r.direction).toBe('improving');
    expect(r.slope).toBeGreaterThan(0);
    expect(r.changePercent).toBeGreaterThan(0);
  });

  it('declining trend', () => {
    const r = pt.analyzeTrend([80, 70, 60, 50, 40]);
    expect(r.direction).toBe('declining');
    expect(r.slope).toBeLessThan(0);
  });

  it('stable trend', () => {
    const r = pt.analyzeTrend([50, 50, 50, 50]);
    expect(r.direction).toBe('stable');
    expect(r.slope).toBe(0);
  });

  it('throws for non-array', () => {
    expect(() => pt.analyzeTrend('bad')).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateMovingAverage
// ═══════════════════════════════════════
describe('calculateMovingAverage', () => {
  it('window size 3', () => {
    const r = pt.calculateMovingAverage([10, 20, 30, 40, 50], 3);
    expect(r).toHaveLength(3);
    expect(r[0]).toBe(20);
    expect(r[1]).toBe(30);
    expect(r[2]).toBe(40);
  });

  it('returns copy when length < window', () => {
    const r = pt.calculateMovingAverage([10, 20], 3);
    expect(r).toEqual([10, 20]);
  });

  it('throws for non-array', () => {
    expect(() => pt.calculateMovingAverage('bad')).toThrow();
  });

  it('throws for invalid window', () => {
    expect(() => pt.calculateMovingAverage([1, 2, 3], 0)).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateServiceIntensity
// ═══════════════════════════════════════
describe('calculateServiceIntensity', () => {
  it('intensive >= 20 hours/week', () => {
    const r = pt.calculateServiceIntensity(1200 * 4, 4); // 1200min/wk = 20hr/wk
    expect(r.intensityLevel).toBe('intensive');
    expect(r.hoursPerWeek).toBe(20);
  });

  it('moderate 5-10 hours/week', () => {
    const r = pt.calculateServiceIntensity(420, 1); // 7 hours
    expect(r.intensityLevel).toBe('moderate');
  });

  it('minimal < 2 hours/week', () => {
    const r = pt.calculateServiceIntensity(30, 1); // 0.5 hours
    expect(r.intensityLevel).toBe('minimal');
  });

  it('throws for negative minutes', () => {
    expect(() => pt.calculateServiceIntensity(-10, 1)).toThrow();
  });

  it('throws for zero weeks', () => {
    expect(() => pt.calculateServiceIntensity(100, 0)).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateDropoutRate
// ═══════════════════════════════════════
describe('calculateDropoutRate', () => {
  it('basic dropout calc', () => {
    const r = pt.calculateDropoutRate(100, 20, 12);
    expect(r.dropoutRate).toBe(20);
    expect(r.retentionRate).toBe(80);
    expect(r.retainedCount).toBe(80);
    expect(r.annualizedDropoutRate).toBe(20);
  });

  it('zero enrolled returns 0', () => {
    const r = pt.calculateDropoutRate(0, 0);
    expect(r.dropoutRate).toBe(0);
  });

  it('throws when dropout > enrolled', () => {
    expect(() => pt.calculateDropoutRate(10, 15)).toThrow();
  });

  it('throws for negative', () => {
    expect(() => pt.calculateDropoutRate(-1, 0)).toThrow();
  });
});

// ═══════════════════════════════════════
//  normalizeScore
// ═══════════════════════════════════════
describe('normalizeScore', () => {
  it('mid-range score', () => {
    expect(pt.normalizeScore(50, 0, 100)).toBe(50);
  });

  it('min → 0', () => {
    expect(pt.normalizeScore(0, 0, 100)).toBe(0);
  });

  it('max → 100', () => {
    expect(pt.normalizeScore(100, 0, 100)).toBe(100);
  });

  it('inverted (higherIsBetter=false)', () => {
    expect(pt.normalizeScore(0, 0, 100, false)).toBe(100);
    expect(pt.normalizeScore(100, 0, 100, false)).toBe(0);
  });

  it('clamps out-of-range', () => {
    expect(pt.normalizeScore(150, 0, 100)).toBe(100);
    expect(pt.normalizeScore(-50, 0, 100)).toBe(0);
  });

  it('throws for non-number', () => {
    expect(() => pt.normalizeScore('x', 0, 100)).toThrow();
  });

  it('throws for max<=min', () => {
    expect(() => pt.normalizeScore(50, 100, 50)).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateImprovementScore
// ═══════════════════════════════════════
describe('calculateImprovementScore', () => {
  it('improvement detected', () => {
    const r = pt.calculateImprovementScore(40, 60);
    expect(r.absoluteChange).toBe(20);
    expect(r.percentChange).toBe(50);
    expect(r.direction).toBe('improving');
  });

  it('decline detected', () => {
    const r = pt.calculateImprovementScore(80, 60);
    expect(r.direction).toBe('declining');
    expect(r.absoluteChange).toBe(-20);
  });

  it('no change = stable', () => {
    const r = pt.calculateImprovementScore(50, 50);
    expect(r.direction).toBe('stable');
  });

  it('throws for non-number', () => {
    expect(() => pt.calculateImprovementScore('a', 50)).toThrow();
  });
});

// ═══════════════════════════════════════
//  calculateBeneficiaryKPIs
// ═══════════════════════════════════════
describe('calculateBeneficiaryKPIs', () => {
  it('returns all KPI fields', () => {
    const r = pt.calculateBeneficiaryKPIs({
      attendedSessions: 8,
      totalSessions: 10,
      goals: [{ status: 'achieved' }, { status: 'in_progress' }],
      progressScores: [40, 50, 60, 70],
      weeksInProgram: 8,
    });
    expect(r.attendanceRate).toBe(80);
    expect(r.goalAchievementRate).toBe(50);
    expect(r.compositeScore).toBeDefined();
    expect(r.progressTrend).toBe('improving');
    expect(r.weeklySessionRate).toBe(1);
    expect(r.isOnTrack).toBe(false); // goal<60
    expect(r.recommendations).toBeDefined();
  });

  it('on track when both thresholds met', () => {
    const r = pt.calculateBeneficiaryKPIs({
      attendedSessions: 9,
      totalSessions: 10,
      goals: [
        { status: 'achieved' },
        { status: 'achieved' },
        { status: 'achieved' },
        { status: 'in_progress' },
      ],
      progressScores: [50, 60, 70],
      weeksInProgram: 4,
    });
    expect(r.attendanceRate).toBe(90);
    expect(r.goalAchievementRate).toBe(75);
    expect(r.isOnTrack).toBe(true);
  });

  it('throws for non-object', () => {
    expect(() => pt.calculateBeneficiaryKPIs(null)).toThrow();
  });
});

// ═══════════════════════════════════════
//  generateRecommendations
// ═══════════════════════════════════════
describe('generateRecommendations', () => {
  it('low attendance suggests attendance review', () => {
    const r = pt.generateRecommendations(50, 80, 'stable');
    expect(r.length).toBeGreaterThan(0);
    expect(r.some(rec => rec.includes('حضور') || rec.includes('عوائق'))).toBe(true);
  });

  it('declining trend suggests urgent review', () => {
    const r = pt.generateRecommendations(80, 80, 'declining');
    expect(r.some(rec => rec.includes('عاجل') || rec.includes('مراجعة'))).toBe(true);
  });

  it('improving trend suggests continuation', () => {
    const r = pt.generateRecommendations(80, 80, 'improving');
    expect(r.some(rec => rec.includes('الاستمرار'))).toBe(true);
  });

  it('no recs when all good and stable', () => {
    const r = pt.generateRecommendations(90, 80, 'stable');
    expect(r.length).toBe(0);
  });
});

// ═══════════════════════════════════════
//  generateProgressReport
// ═══════════════════════════════════════
describe('generateProgressReport', () => {
  it('returns full report structure', () => {
    const r = pt.generateProgressReport({
      id: 'b1',
      name: 'أحمد',
      attendedSessions: 8,
      totalSessions: 10,
      goals: [{ status: 'achieved' }],
      progressScores: [50, 60, 70],
      weeksInProgram: 6,
      totalServiceMinutes: 540,
    });
    expect(r.beneficiaryId).toBe('b1');
    expect(r.beneficiaryName).toBe('أحمد');
    expect(r.reportDate).toBeDefined();
    expect(r.summary).toBeDefined();
    expect(r.summary.overallStatus).toBeDefined();
    expect(r.attendance).toBeDefined();
    expect(r.goals).toBeDefined();
    expect(r.trend).toBeDefined();
    expect(r.serviceIntensity).toBeDefined();
    expect(r.recommendations).toBeDefined();
    expect(r.kpis).toBeDefined();
  });

  it('null serviceIntensity when no minutes', () => {
    const r = pt.generateProgressReport({
      id: 'b2',
      name: 'سارة',
      attendedSessions: 5,
      totalSessions: 5,
      goals: [],
    });
    expect(r.serviceIntensity).toBeNull();
  });

  it('throws for null data', () => {
    expect(() => pt.generateProgressReport(null)).toThrow();
  });
});

// ═══════════════════════════════════════
//  rankBranchesByPerformance
// ═══════════════════════════════════════
describe('rankBranchesByPerformance', () => {
  it('ranks branches by composite score desc', () => {
    const branches = [
      {
        branchId: 'br1',
        averageAttendanceRate: 70,
        averageGoalAchievementRate: 60,
        dropoutRate: 10,
      },
      {
        branchId: 'br2',
        averageAttendanceRate: 90,
        averageGoalAchievementRate: 85,
        dropoutRate: 5,
      },
    ];
    const r = pt.rankBranchesByPerformance(branches);
    expect(r[0].branchId).toBe('br2');
    expect(r[0].rank).toBe(1);
    expect(r[1].rank).toBe(2);
    expect(r[0].compositeScore).toBeGreaterThan(r[1].compositeScore);
  });

  it('empty returns empty', () => {
    expect(pt.rankBranchesByPerformance([])).toEqual([]);
  });

  it('throws for non-array', () => {
    expect(() => pt.rankBranchesByPerformance('bad')).toThrow();
  });
});

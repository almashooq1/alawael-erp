/**
 * Unit Tests — rehabProgressCalculations.service.js
 * Pure business logic — NO mocks needed
 */
'use strict';

const {
  REHAB_CONSTANTS,
  calculateIEPProgress,
  analyzeSessionMetrics,
  calculateOutcomeMeasure,
  analyzeTherapistPerformance,
  assessDropoutRisk,
  generateClinicalProgressReport,
  analyzeProgramEffectiveness,
  assessDischargeReadiness,
} = require('../../services/rehabilitation/rehabProgressCalculations.service');

// ════════════════════════════════════════
//  calculateIEPProgress
// ════════════════════════════════════════
describe('calculateIEPProgress', () => {
  it('returns zero for empty array', () => {
    const r = calculateIEPProgress([]);
    expect(r.totalGoals).toBe(0);
    expect(r.achievementRate).toBe(0);
    expect(r.recommendations).toEqual([]);
  });

  it('computes correct achievement for fully achieved goals', () => {
    const goals = [
      { id: 'g1', baseline: 0, target: 100, currentValue: 100 },
      { id: 'g2', baseline: 0, target: 100, currentValue: 100 },
    ];
    const r = calculateIEPProgress(goals);
    expect(r.achievedGoals).toBe(2);
    expect(r.achievementRate).toBe(100);
    expect(r.overallProgress).toBe(100);
  });

  it('detects partially achieved goals', () => {
    const goals = [{ id: 'g1', baseline: 0, target: 100, currentValue: 30 }];
    const r = calculateIEPProgress(goals);
    expect(r.goalDetails[0].status).toBe('partially_achieved');
    expect(r.goalDetails[0].progressPercentage).toBe(30);
  });

  it('handles in_progress (>= 50, < 100)', () => {
    const goals = [{ id: 'g1', baseline: 0, target: 100, currentValue: 60 }];
    const r = calculateIEPProgress(goals);
    expect(r.goalDetails[0].status).toBe('in_progress');
  });

  it('preserves discontinued / on_hold status', () => {
    const goals = [
      { id: 'g1', status: 'discontinued', baseline: 0, target: 100, currentValue: 50 },
      { id: 'g2', status: 'on_hold', baseline: 0, target: 100, currentValue: 20 },
    ];
    const r = calculateIEPProgress(goals);
    expect(r.goalDetails[0].status).toBe('discontinued');
    expect(r.goalDetails[1].status).toBe('on_hold');
  });

  it('calculates trend from measurements', () => {
    const goals = [
      {
        id: 'g1',
        baseline: 0,
        target: 100,
        currentValue: 60,
        measurements: [
          { date: '2025-01-01', value: 40 },
          { date: '2025-02-01', value: 60 },
        ],
      },
    ];
    const r = calculateIEPProgress(goals);
    expect(r.goalDetails[0].trend).toBe('improving');
  });

  it('detects declining trend', () => {
    const goals = [
      {
        id: 'g1',
        baseline: 0,
        target: 100,
        currentValue: 30,
        measurements: [
          { date: '2025-01-01', value: 50 },
          { date: '2025-02-01', value: 30 },
        ],
      },
    ];
    const r = calculateIEPProgress(goals);
    expect(r.goalDetails[0].trend).toBe('declining');
    expect(r.recommendations.some(rec => rec.type === 'warning')).toBe(true);
  });

  it('generates recommendation when achievement below target', () => {
    const goals = [{ id: 'g1', baseline: 0, target: 100, currentValue: 10 }];
    const r = calculateIEPProgress(goals);
    expect(r.recommendations.some(rec => rec.type === 'attention')).toBe(true);
  });

  it('generates urgent recommendation for near-deadline low-progress goals', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const goals = [
      {
        id: 'g1',
        baseline: 0,
        target: 100,
        currentValue: 20,
        targetDate: soon.toISOString(),
      },
    ];
    const r = calculateIEPProgress(goals);
    expect(r.recommendations.some(rec => rec.type === 'urgent')).toBe(true);
  });
});

// ════════════════════════════════════════
//  analyzeSessionMetrics
// ════════════════════════════════════════
describe('analyzeSessionMetrics', () => {
  it('returns zeros for empty', () => {
    const r = analyzeSessionMetrics([]);
    expect(r.total).toBe(0);
    expect(r.attendanceRate).toBe(0);
  });

  it('computes metrics correctly', () => {
    const sessions = [
      { status: 'completed', durationMinutes: 45, specialization: 'pt' },
      { status: 'completed', durationMinutes: 60, specialization: 'ot' },
      { status: 'no_show', specialization: 'pt' },
      { status: 'cancelled', specialization: 'pt' },
    ];
    const r = analyzeSessionMetrics(sessions);
    expect(r.total).toBe(4);
    expect(r.completed).toBe(2);
    expect(r.noShow).toBe(1);
    expect(r.cancelled).toBe(1);
    expect(r.attendanceRate).toBe(67); // 2/(2+1)
    expect(r.totalHours).toBeGreaterThan(0);
    expect(r.bySpecialization.pt).toBeDefined();
  });

  it('filters by date range', () => {
    const sessions = [
      { status: 'completed', date: '2025-01-15' },
      { status: 'completed', date: '2025-03-15' },
    ];
    const r = analyzeSessionMetrics(sessions, { startDate: '2025-03-01', endDate: '2025-03-31' });
    expect(r.completed).toBe(1);
  });

  it('counts consecutive no-shows from most recent', () => {
    const sessions = [
      { status: 'completed', date: '2025-01-01' },
      { status: 'no_show', date: '2025-01-02' },
      { status: 'no_show', date: '2025-01-03' },
    ];
    const r = analyzeSessionMetrics(sessions);
    expect(r.consecutiveNoShows).toBe(2);
  });

  it('returns attendance status thresholds', () => {
    const good = analyzeSessionMetrics([
      { status: 'completed' },
      { status: 'completed' },
      { status: 'completed' },
      { status: 'no_show' },
    ]);
    expect(good.attendanceStatus).toBe('good'); // 3/(3+1)=75%

    const critical = analyzeSessionMetrics([
      { status: 'completed' },
      { status: 'no_show' },
      { status: 'no_show' },
      { status: 'no_show' },
    ]);
    expect(critical.attendanceStatus).toBe('critical'); // 1/(1+3)=25%
  });
});

// ════════════════════════════════════════
//  calculateOutcomeMeasure
// ════════════════════════════════════════
describe('calculateOutcomeMeasure', () => {
  it('returns invalid for null', () => {
    const r = calculateOutcomeMeasure(null);
    expect(r.isValid).toBe(false);
  });

  it('calculates FIM interpretation', () => {
    const r = calculateOutcomeMeasure({
      scale: 'fim',
      initialScore: 50,
      currentScore: 110,
      maxScore: 126,
    });
    expect(r.isValid).toBe(true);
    expect(r.interpretation).toBe('complete_independence');
    expect(r.percentageChange).toBeGreaterThan(0);
    expect(r.progressLevel).toBeDefined();
  });

  it('calculates Barthel interpretation', () => {
    const r = calculateOutcomeMeasure({
      scale: 'barthel',
      initialScore: 30,
      currentScore: 95,
      maxScore: 100,
    });
    expect(r.interpretation).toBe('minimal_disability');
  });

  it('calculates GAS interpretation', () => {
    const r = calculateOutcomeMeasure({
      scale: 'gas',
      initialScore: -2,
      currentScore: 0,
      maxScore: 2,
    });
    expect(r.interpretation).toBe('goal_achieved');
  });

  it('detects MCID reached', () => {
    const r = calculateOutcomeMeasure({
      scale: 'fim',
      initialScore: 50,
      currentScore: 80,
      maxScore: 126,
    });
    expect(r.mcid.reached).toBe(true);
    expect(r.mcid.threshold).toBe(22);
  });

  it('classifies regression for negative change', () => {
    const r = calculateOutcomeMeasure({
      scale: 'barthel',
      initialScore: 80,
      currentScore: 60,
      maxScore: 100,
    });
    expect(r.progressLevel).toBe('regression');
  });
});

// ════════════════════════════════════════
//  analyzeTherapistPerformance
// ════════════════════════════════════════
describe('analyzeTherapistPerformance', () => {
  it('returns invalid for null therapist', () => {
    expect(analyzeTherapistPerformance(null).isValid).toBe(false);
  });

  it('computes performance score and rating', () => {
    const therapist = { id: 't1', specialization: 'pt', activeCaseload: 10 };
    const sessions = [
      { status: 'completed', durationMinutes: 45 },
      { status: 'completed', durationMinutes: 45 },
      { status: 'no_show' },
    ];
    const outcomes = [{ percentageChange: 60 }, { percentageChange: 30 }, { percentageChange: 10 }];
    const r = analyzeTherapistPerformance(therapist, sessions, outcomes);
    expect(r.performanceScore).toBeGreaterThan(0);
    expect(r.performanceScore).toBeLessThanOrEqual(100);
    expect(r.rating).toBeDefined();
    expect(r.improvementRate).toBeGreaterThan(0);
  });

  it('generates alerts for overloaded caseload', () => {
    const therapist = { id: 't1', specialization: 'aba', activeCaseload: 20 };
    const r = analyzeTherapistPerformance(therapist, [], []);
    expect(r.caseloadUtilization).toBeGreaterThan(100);
    expect(r.alerts.some(a => a.type === 'caseload')).toBe(true);
  });
});

// ════════════════════════════════════════
//  assessDropoutRisk
// ════════════════════════════════════════
describe('assessDropoutRisk', () => {
  it('returns unknown for null beneficiary', () => {
    expect(assessDropoutRisk(null).riskLevel).toBe('unknown');
  });

  it('rates high risk for low attendance + consecutive no-shows', () => {
    const sessions = [
      { status: 'no_show', date: '2025-01-03' },
      { status: 'no_show', date: '2025-01-02' },
      { status: 'no_show', date: '2025-01-01' },
    ];
    const r = assessDropoutRisk({ id: 'b1', age: 16, guardianEngagementScore: 30 }, sessions, null);
    expect(r.riskLevel).toBe('high');
    expect(r.riskScore).toBeGreaterThanOrEqual(60);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it('rates low risk for good attendance', () => {
    const sessions = Array.from({ length: 10 }, () => ({
      status: 'completed',
      date: '2025-01-01',
    }));
    const r = assessDropoutRisk({ id: 'b1', age: 25, guardianEngagementScore: 90 }, sessions, null);
    expect(r.riskLevel).toBe('low');
  });

  it('adds factor for minimal goal progress', () => {
    const r = assessDropoutRisk(
      { id: 'b1', guardianEngagementScore: 80 },
      [{ status: 'completed', date: '2025-01-01' }],
      { overallProgress: 10, goalDetails: [] }
    );
    expect(r.factors.some(f => f.factor === 'minimal_goal_progress')).toBe(true);
  });
});

// ════════════════════════════════════════
//  generateClinicalProgressReport
// ════════════════════════════════════════
describe('generateClinicalProgressReport', () => {
  it('returns invalid for null beneficiary', () => {
    const r = generateClinicalProgressReport(null, [], [], []);
    expect(r.isValid).toBe(false);
  });

  it('generates a comprehensive report', () => {
    const bene = { id: 'b1', name: 'علي', guardianEngagementScore: 80 };
    const sessions = [{ status: 'completed', durationMinutes: 45 }];
    const goals = [{ id: 'g1', baseline: 0, target: 100, currentValue: 80 }];
    const assessments = [{ scale: 'barthel', initialScore: 40, currentScore: 80, maxScore: 100 }];
    const r = generateClinicalProgressReport(bene, sessions, goals, assessments, {
      start: '2025-01-01',
      end: '2025-06-01',
    });
    expect(r.isValid).toBe(true);
    expect(r.summary.overallScore).toBeGreaterThan(0);
    expect(r.sessionMetrics).toBeDefined();
    expect(r.goalProgress).toBeDefined();
    expect(r.outcomeResults).toHaveLength(1);
    expect(r.dropoutRisk).toBeDefined();
    expect(r.generatedAt).toBeDefined();
  });
});

// ════════════════════════════════════════
//  analyzeProgramEffectiveness
// ════════════════════════════════════════
describe('analyzeProgramEffectiveness', () => {
  it('returns empty for no programs', () => {
    const r = analyzeProgramEffectiveness([]);
    expect(r.totalPrograms).toBe(0);
  });

  it('ranks programs by effectiveness', () => {
    const programs = [
      {
        id: 'p1',
        name: 'Prog A',
        outcomes: [
          { percentageChange: 60, goalAchievementRate: 80 },
          { percentageChange: 70, goalAchievementRate: 90 },
        ],
      },
      {
        id: 'p2',
        name: 'Prog B',
        outcomes: [{ percentageChange: 20, goalAchievementRate: 30 }],
      },
    ];
    const r = analyzeProgramEffectiveness(programs);
    expect(r.ranking[0].programName).toBe('Prog A');
    expect(r.bestProgram.programName).toBe('Prog A');
    expect(r.averageEffectiveness).toBeGreaterThan(0);
  });

  it('handles programs with no outcomes', () => {
    const programs = [{ id: 'p1', name: 'Empty', outcomes: [] }];
    const r = analyzeProgramEffectiveness(programs);
    expect(r.effectiveness[0].rating).toBe('insufficient_data');
  });
});

// ════════════════════════════════════════
//  assessDischargeReadiness
// ════════════════════════════════════════
describe('assessDischargeReadiness', () => {
  it('returns not ready for null', () => {
    const r = assessDischargeReadiness(null, null);
    expect(r.readyForDischarge).toBe(false);
  });

  it('assesses readiness based on criteria', () => {
    const bene = { id: 'b1', lastPeriodAttendance: 90, guardianEngagementScore: 85 };
    const goalProgress = { achievementRate: 90 };
    const funcScores = [{ normalizedScore: 85 }, { normalizedScore: 80 }];
    const r = assessDischargeReadiness(bene, goalProgress, funcScores);
    expect(r.readyForDischarge).toBe(true);
    expect(r.readinessScore).toBeGreaterThanOrEqual(75);
    expect(r.criteriaMet).toBeGreaterThanOrEqual(3);
  });

  it('returns not ready when goals not achieved', () => {
    const bene = { id: 'b1', lastPeriodAttendance: 50, guardianEngagementScore: 30 };
    const goalProgress = { achievementRate: 20 };
    const r = assessDischargeReadiness(bene, goalProgress, []);
    expect(r.readyForDischarge).toBe(false);
    expect(r.recommendation).toContain('معايير');
  });
});

// ════════════════════════════════════════
//  REHAB_CONSTANTS
// ════════════════════════════════════════
describe('REHAB_CONSTANTS', () => {
  it('exports expected constant keys', () => {
    expect(REHAB_CONSTANTS.SPECIALIZATIONS).toBeDefined();
    expect(REHAB_CONSTANTS.GOAL_STATUS).toBeDefined();
    expect(REHAB_CONSTANTS.SESSION_STATUS).toBeDefined();
    expect(REHAB_CONSTANTS.PROGRESS_LEVELS).toBeDefined();
    expect(REHAB_CONSTANTS.MEASUREMENT_SCALES).toBeDefined();
    expect(REHAB_CONSTANTS.THRESHOLDS).toBeDefined();
    expect(REHAB_CONSTANTS.THRESHOLDS.MAX_CASELOAD_ABA).toBe(8);
  });
});

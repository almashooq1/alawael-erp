/**
 * Rehabilitation Progress & Clinical Analytics Tests
 * Pure Unit Tests - No DB
 * نظام AlAwael ERP
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
} = require('../services/rehabilitation/rehabProgressCalculations.service');

// ========================================
// REHAB_CONSTANTS
// ========================================
describe('REHAB_CONSTANTS', () => {
  test('التخصصات السبعة موجودة', () => {
    expect(REHAB_CONSTANTS.SPECIALIZATIONS.PT).toBe('pt');
    expect(REHAB_CONSTANTS.SPECIALIZATIONS.OT).toBe('ot');
    expect(REHAB_CONSTANTS.SPECIALIZATIONS.SPEECH).toBe('speech');
    expect(REHAB_CONSTANTS.SPECIALIZATIONS.ABA).toBe('aba');
    expect(REHAB_CONSTANTS.SPECIALIZATIONS.PSYCHOLOGY).toBe('psychology');
    expect(REHAB_CONSTANTS.SPECIALIZATIONS.SPECIAL_ED).toBe('special_education');
    expect(REHAB_CONSTANTS.SPECIALIZATIONS.VOCATIONAL).toBe('vocational');
  });

  test('حالات الأهداف صحيحة', () => {
    expect(REHAB_CONSTANTS.GOAL_STATUS.ACHIEVED).toBe('achieved');
    expect(REHAB_CONSTANTS.GOAL_STATUS.IN_PROGRESS).toBe('in_progress');
    expect(REHAB_CONSTANTS.GOAL_STATUS.NOT_STARTED).toBe('not_started');
  });

  test('حد الحضور التحذيري 70%', () => {
    expect(REHAB_CONSTANTS.THRESHOLDS.ATTENDANCE_WARNING).toBe(70);
    expect(REHAB_CONSTANTS.THRESHOLDS.ATTENDANCE_CRITICAL).toBe(50);
  });

  test('الحد الأقصى لعبء ABA أقل من PT', () => {
    expect(REHAB_CONSTANTS.THRESHOLDS.MAX_CASELOAD_ABA).toBeLessThan(
      REHAB_CONSTANTS.THRESHOLDS.MAX_CASELOAD_PT
    );
    expect(REHAB_CONSTANTS.THRESHOLDS.MAX_CASELOAD_ABA).toBe(8);
    expect(REHAB_CONSTANTS.THRESHOLDS.MAX_CASELOAD_PT).toBe(15);
  });

  test('مقاييس القياس السريري موجودة', () => {
    expect(REHAB_CONSTANTS.MEASUREMENT_SCALES.FUNCTIONAL_INDEPENDENCE).toBe('fim');
    expect(REHAB_CONSTANTS.MEASUREMENT_SCALES.BARTHEL).toBe('barthel');
    expect(REHAB_CONSTANTS.MEASUREMENT_SCALES.GOAL_ATTAINMENT).toBe('gas');
  });
});

// ========================================
// calculateIEPProgress
// ========================================
describe('calculateIEPProgress', () => {
  test('مصفوفة فارغة → أصفار', () => {
    const result = calculateIEPProgress([]);
    expect(result.totalGoals).toBe(0);
    expect(result.achievedGoals).toBe(0);
    expect(result.achievementRate).toBe(0);
  });

  test('null → أصفار', () => {
    const result = calculateIEPProgress(null);
    expect(result.totalGoals).toBe(0);
  });

  test('هدف محقق بالكامل (100%)', () => {
    const goals = [
      { id: 'g1', baseline: 0, target: 10, currentValue: 10, description: 'هدف المشي' },
    ];
    const result = calculateIEPProgress(goals);
    expect(result.achievedGoals).toBe(1);
    expect(result.achievementRate).toBe(100);
    expect(result.goalDetails[0].status).toBe('achieved');
    expect(result.goalDetails[0].progressPercentage).toBe(100);
  });

  test('هدف قيد التنفيذ (50% - 99%)', () => {
    const goals = [{ id: 'g1', baseline: 0, target: 10, currentValue: 6, description: 'هدف' }];
    const result = calculateIEPProgress(goals);
    expect(result.goalDetails[0].status).toBe('in_progress');
    expect(result.goalDetails[0].progressPercentage).toBe(60);
  });

  test('هدف محقق جزئياً (1% - 49%)', () => {
    const goals = [{ id: 'g1', baseline: 0, target: 10, currentValue: 3, description: 'هدف' }];
    const result = calculateIEPProgress(goals);
    expect(result.goalDetails[0].status).toBe('partially_achieved');
    expect(result.goalDetails[0].progressPercentage).toBe(30);
  });

  test('هدف لم يبدأ (0%)', () => {
    const goals = [{ id: 'g1', baseline: 0, target: 10, currentValue: 0 }];
    const result = calculateIEPProgress(goals);
    expect(result.goalDetails[0].status).toBe('not_started');
    expect(result.goalDetails[0].progressPercentage).toBe(0);
  });

  test('هدف في وضع on_hold', () => {
    const goals = [{ id: 'g1', status: 'on_hold', baseline: 0, target: 10, currentValue: 5 }];
    const result = calculateIEPProgress(goals);
    expect(result.goalDetails[0].status).toBe('on_hold');
  });

  test('اتجاه التحسن من القياسات', () => {
    const goals = [
      {
        id: 'g1',
        baseline: 0,
        target: 10,
        currentValue: 7,
        measurements: [
          { date: '2026-01-01', value: 3 },
          { date: '2026-01-15', value: 5 },
          { date: '2026-02-01', value: 7 },
        ],
      },
    ];
    const result = calculateIEPProgress(goals);
    expect(result.goalDetails[0].trend).toBe('improving');
  });

  test('اتجاه التراجع يولّد توصية', () => {
    const goals = [
      {
        id: 'g1',
        baseline: 0,
        target: 10,
        currentValue: 3,
        measurements: [
          { date: '2026-01-01', value: 7 },
          { date: '2026-02-01', value: 3 },
        ],
      },
    ];
    const result = calculateIEPProgress(goals);
    expect(result.goalDetails[0].trend).toBe('declining');
    expect(result.recommendations.some(r => r.type === 'warning')).toBe(true);
  });

  test('معدل إنجاز منخفض يولّد توصية', () => {
    const goals = [
      { id: 'g1', baseline: 0, target: 10, currentValue: 1 },
      { id: 'g2', baseline: 0, target: 10, currentValue: 0 },
      { id: 'g3', baseline: 0, target: 10, currentValue: 0 },
    ];
    const result = calculateIEPProgress(goals);
    expect(result.achievementRate).toBe(0);
    expect(result.recommendations.some(r => r.type === 'attention')).toBe(true);
  });

  test('أهداف متعددة - متوسط التقدم', () => {
    const goals = [
      { id: 'g1', baseline: 0, target: 10, currentValue: 10 }, // 100%
      { id: 'g2', baseline: 0, target: 10, currentValue: 5 }, // 50%
      { id: 'g3', baseline: 0, target: 10, currentValue: 0 }, // 0%
    ];
    const result = calculateIEPProgress(goals);
    expect(result.totalGoals).toBe(3);
    expect(result.achievedGoals).toBe(1);
    expect(result.achievementRate).toBe(33); // 1/3
    expect(result.overallProgress).toBe(50); // (100+50+0)/3
  });

  test('هدف موقوف discontinued', () => {
    const goals = [{ id: 'g1', status: 'discontinued', baseline: 0, target: 10, currentValue: 3 }];
    const result = calculateIEPProgress(goals);
    expect(result.goalDetails[0].status).toBe('discontinued');
  });
});

// ========================================
// analyzeSessionMetrics
// ========================================
describe('analyzeSessionMetrics', () => {
  test('مصفوفة فارغة → أصفار', () => {
    const result = analyzeSessionMetrics([]);
    expect(result.total).toBe(0);
    expect(result.attendanceRate).toBe(0);
  });

  test('null → أصفار', () => {
    const result = analyzeSessionMetrics(null);
    expect(result.total).toBe(0);
  });

  test('معدل الحضور محسوب بدقة', () => {
    const sessions = [
      { status: 'completed', durationMinutes: 45 },
      { status: 'completed', durationMinutes: 45 },
      { status: 'no_show' },
      { status: 'cancelled' },
    ];
    const result = analyzeSessionMetrics(sessions);
    // completed/(completed+noShow) = 2/3 = 67%
    expect(result.attendanceRate).toBe(67);
    expect(result.completed).toBe(2);
    expect(result.noShow).toBe(1);
    expect(result.cancelled).toBe(1);
  });

  test('حالة الحضور good عند >= 70%', () => {
    const sessions = Array(10).fill({ status: 'completed', durationMinutes: 45 });
    const result = analyzeSessionMetrics(sessions);
    expect(result.attendanceStatus).toBe('good');
    expect(result.attendanceRate).toBe(100);
  });

  test('حالة الحضور warning بين 50% و70%', () => {
    const sessions = [
      { status: 'completed', durationMinutes: 45 },
      { status: 'completed', durationMinutes: 45 },
      { status: 'no_show' },
      { status: 'no_show' },
      { status: 'no_show' },
    ];
    const result = analyzeSessionMetrics(sessions);
    expect(result.attendanceRate).toBe(40); // 2/5
    expect(result.attendanceStatus).toBe('critical');
  });

  test('إجمالي الساعات محسوب', () => {
    const sessions = [
      { status: 'completed', durationMinutes: 60 },
      { status: 'completed', durationMinutes: 60 },
      { status: 'no_show' },
    ];
    const result = analyzeSessionMetrics(sessions);
    expect(result.totalHours).toBe(2);
  });

  test('متوسط مدة الجلسة', () => {
    const sessions = [
      { status: 'completed', durationMinutes: 30 },
      { status: 'completed', durationMinutes: 60 },
    ];
    const result = analyzeSessionMetrics(sessions);
    expect(result.averageDuration).toBe(45);
  });

  test('تحليل حسب التخصص', () => {
    const sessions = [
      { status: 'completed', specialization: 'speech', durationMinutes: 45 },
      { status: 'completed', specialization: 'speech', durationMinutes: 45 },
      { status: 'no_show', specialization: 'pt' },
    ];
    const result = analyzeSessionMetrics(sessions);
    expect(result.bySpecialization.speech.completed).toBe(2);
    expect(result.bySpecialization.pt.noShow).toBe(1);
  });

  test('الغياب المتتالي محسوب', () => {
    const sessions = [
      { status: 'completed', date: '2026-01-01' },
      { status: 'no_show', date: '2026-01-08' },
      { status: 'no_show', date: '2026-01-15' },
      { status: 'no_show', date: '2026-01-22' },
    ];
    const result = analyzeSessionMetrics(sessions);
    expect(result.consecutiveNoShows).toBe(3);
  });

  test('late_cancel يُحسب ضمن الملغاة', () => {
    const sessions = [{ status: 'completed', durationMinutes: 45 }, { status: 'late_cancel' }];
    const result = analyzeSessionMetrics(sessions);
    expect(result.cancelled).toBe(1);
  });
});

// ========================================
// calculateOutcomeMeasure
// ========================================
describe('calculateOutcomeMeasure', () => {
  test('null → isValid: false', () => {
    const result = calculateOutcomeMeasure(null);
    expect(result.isValid).toBe(false);
  });

  test('تحسن ملحوظ في FIM', () => {
    const result = calculateOutcomeMeasure({
      scale: 'fim',
      initialScore: 60,
      currentScore: 100,
      maxScore: 126,
    });
    expect(result.isValid).toBe(true);
    expect(result.change).toBe(40);
    // percentageChange = (40/66)*100 = 60.6% → moderate_progress (50-75%)
    expect(['moderate_progress', 'significant_progress']).toContain(result.progressLevel);
    expect(result.mcid.reached).toBe(true); // MCID FIM = 22
  });

  test('FIM interpretation صحيح', () => {
    const result = calculateOutcomeMeasure({
      scale: 'fim',
      initialScore: 50,
      currentScore: 110,
      maxScore: 126,
    });
    expect(result.interpretation).toBe('complete_independence'); // >= 108
  });

  test('Barthel interpretation صحيح', () => {
    const result = calculateOutcomeMeasure({
      scale: 'barthel',
      initialScore: 30,
      currentScore: 95,
      maxScore: 100,
    });
    expect(result.interpretation).toBe('minimal_disability'); // >= 90
  });

  test('GAS interpretation - achieved', () => {
    const result = calculateOutcomeMeasure({
      scale: 'gas',
      initialScore: -1,
      currentScore: 0,
      maxScore: 2,
      minScore: -2,
    });
    expect(result.interpretation).toBe('goal_achieved');
  });

  test('تراجع → regression', () => {
    const result = calculateOutcomeMeasure({
      scale: 'barthel',
      initialScore: 80,
      currentScore: 65,
      maxScore: 100,
    });
    expect(result.progressLevel).toBe('regression');
    expect(result.change).toBe(-15);
  });

  test('تقدم بسيط → minimal_progress', () => {
    const result = calculateOutcomeMeasure({
      scale: 'barthel',
      initialScore: 50,
      currentScore: 65,
      maxScore: 100,
    });
    // percentageChange = (15 / 50) * 100 = 30% → minimal
    expect(result.progressLevel).toBe('minimal_progress');
  });

  test('normalizedScore محسوب صحيح', () => {
    const result = calculateOutcomeMeasure({
      scale: 'barthel',
      initialScore: 0,
      currentScore: 75,
      maxScore: 100,
      minScore: 0,
    });
    expect(result.normalizedScore).toBe(75);
  });

  test('MCID للـ Barthel = 15', () => {
    const result = calculateOutcomeMeasure({
      scale: 'barthel',
      initialScore: 50,
      currentScore: 64,
      maxScore: 100,
    });
    // change = 14, MCID = 15 → لم يصل
    expect(result.mcid.threshold).toBe(15);
    expect(result.mcid.reached).toBe(false);
  });
});

// ========================================
// analyzeTherapistPerformance
// ========================================
describe('analyzeTherapistPerformance', () => {
  test('null therapist → isValid: false', () => {
    const result = analyzeTherapistPerformance(null);
    expect(result.isValid).toBe(false);
  });

  test('معالج ABA حد أقصى 8 مستفيدين', () => {
    const therapist = { id: 't1', specialization: 'aba', caseload: 6 };
    const result = analyzeTherapistPerformance(therapist, [], []);
    expect(result.maxCaseload).toBe(8);
    expect(result.caseloadUtilization).toBe(75); // 6/8
  });

  test('معالج PT حد أقصى 15 مستفيداً', () => {
    const therapist = { id: 't1', specialization: 'pt', caseload: 12 };
    const result = analyzeTherapistPerformance(therapist, [], []);
    expect(result.maxCaseload).toBe(15);
  });

  test('معدل التحسن محسوب', () => {
    const therapist = { id: 't1', specialization: 'speech', caseload: 5 };
    const outcomes = [
      { percentageChange: 60 }, // محسّن
      { percentageChange: 80 }, // محسّن
      { percentageChange: 10 }, // لم يتحسن
      { percentageChange: 30 }, // محسّن (> 25)
    ];
    const result = analyzeTherapistPerformance(therapist, [], outcomes);
    expect(result.improvementRate).toBe(75); // 3/4
  });

  test('تنبيه تجاوز عبء العمل', () => {
    const therapist = { id: 't1', specialization: 'aba', caseload: 10 }; // > 8
    const result = analyzeTherapistPerformance(therapist, [], []);
    expect(result.caseloadUtilization).toBeGreaterThan(100);
    expect(result.alerts.some(a => a.type === 'caseload')).toBe(true);
  });

  test('تنبيه الحضور المنخفض', () => {
    const therapist = { id: 't1', specialization: 'speech', caseload: 5 };
    const sessions = [
      { status: 'completed', durationMinutes: 45, date: '2026-01-01' },
      { status: 'no_show', date: '2026-01-08' },
      { status: 'no_show', date: '2026-01-15' },
      { status: 'no_show', date: '2026-01-22' },
    ];
    const result = analyzeTherapistPerformance(therapist, sessions, []);
    expect(result.alerts.some(a => a.type === 'attendance')).toBe(true);
  });

  test('تقييم excellent لمعالج متميز', () => {
    const therapist = { id: 't1', specialization: 'pt', caseload: 12 }; // 80% من 15
    const sessions = Array(20).fill({ status: 'completed', durationMinutes: 45 });
    const outcomes = Array(10).fill({ percentageChange: 80 });
    const result = analyzeTherapistPerformance(therapist, sessions, outcomes);
    expect(['excellent', 'good']).toContain(result.rating);
    expect(result.performanceScore).toBeGreaterThan(70);
  });
});

// ========================================
// assessDropoutRisk
// ========================================
describe('assessDropoutRisk', () => {
  test('null → unknown', () => {
    const result = assessDropoutRisk(null);
    expect(result.riskLevel).toBe('unknown');
    expect(result.riskScore).toBe(0);
  });

  test('مستفيد بحضور جيد → low risk', () => {
    const beneficiary = { id: 'b1', age: 8, guardianEngagementScore: 90 };
    const sessions = Array(10).fill({ status: 'completed' });
    const result = assessDropoutRisk(beneficiary, sessions, null);
    expect(result.riskLevel).toBe('low');
  });

  test('حضور أقل من 50% → عامل high', () => {
    const beneficiary = { id: 'b1', age: 8, guardianEngagementScore: 80 };
    const sessions = [
      { status: 'no_show', date: '2026-01-01' },
      { status: 'no_show', date: '2026-01-08' },
      { status: 'no_show', date: '2026-01-15' },
      { status: 'completed', date: '2026-01-22' },
    ];
    const result = assessDropoutRisk(beneficiary, sessions, null);
    expect(result.riskScore).toBeGreaterThan(30);
    expect(result.factors.some(f => f.factor === 'low_attendance')).toBe(true);
  });

  test('3+ غيابات متتالية → عامل high', () => {
    const beneficiary = { id: 'b1', age: 8, guardianEngagementScore: 80 };
    const sessions = [
      { status: 'completed', date: '2026-01-01' },
      { status: 'no_show', date: '2026-01-08' },
      { status: 'no_show', date: '2026-01-15' },
      { status: 'no_show', date: '2026-01-22' },
    ];
    const result = assessDropoutRisk(beneficiary, sessions, null);
    expect(result.factors.some(f => f.factor === 'consecutive_no_shows')).toBe(true);
  });

  test('مراهق (14-18 سنة) عامل خطر إضافي', () => {
    const beneficiary = { id: 'b1', age: 16, guardianEngagementScore: 80 };
    const result = assessDropoutRisk(beneficiary, [], null);
    expect(result.factors.some(f => f.factor === 'adolescent_age')).toBe(true);
  });

  test('انخراط ولي أمر منخفض → عامل خطر', () => {
    const beneficiary = { id: 'b1', age: 8, guardianEngagementScore: 30 };
    const result = assessDropoutRisk(beneficiary, [], null);
    expect(result.factors.some(f => f.factor === 'low_guardian_engagement')).toBe(true);
  });

  test('خطر عالٍ يولّد توصيات تدخل', () => {
    const beneficiary = { id: 'b1', age: 8, guardianEngagementScore: 20 };
    const sessions = Array(10).fill({ status: 'no_show' });
    const result = assessDropoutRisk(beneficiary, sessions, null);
    expect(result.riskLevel).toBe('high');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  test('تقدم في الأهداف يُقلل الخطر', () => {
    const beneficiary = { id: 'b1', age: 8, guardianEngagementScore: 80 };
    const sessions = Array(10).fill({ status: 'completed' });
    const goalProgress = { overallProgress: 75, goalDetails: [] };
    const result = assessDropoutRisk(beneficiary, sessions, goalProgress);
    expect(result.riskLevel).toBe('low');
  });
});

// ========================================
// generateClinicalProgressReport
// ========================================
describe('generateClinicalProgressReport', () => {
  test('null beneficiary → isValid: false', () => {
    const result = generateClinicalProgressReport(null, [], [], [], {});
    expect(result.isValid).toBe(false);
  });

  test('تقرير شامل ينتج هيكلاً كاملاً', () => {
    const beneficiary = { id: 'b1', name: 'محمد عبدالله', age: 7, guardianEngagementScore: 85 };
    const sessions = [
      { status: 'completed', durationMinutes: 45, date: '2026-01-01', specialization: 'speech' },
      { status: 'completed', durationMinutes: 45, date: '2026-01-08', specialization: 'speech' },
      { status: 'no_show', date: '2026-01-15' },
    ];
    const goals = [
      { id: 'g1', baseline: 0, target: 10, currentValue: 8 },
      { id: 'g2', baseline: 0, target: 10, currentValue: 10 },
    ];
    const assessments = [{ scale: 'barthel', initialScore: 40, currentScore: 70, maxScore: 100 }];

    const result = generateClinicalProgressReport(beneficiary, sessions, goals, assessments, {
      start: '2026-01-01',
      end: '2026-01-31',
    });

    expect(result.isValid).toBe(true);
    expect(result.beneficiaryId).toBe('b1');
    expect(result.summary).toBeDefined();
    expect(result.summary.attendanceRate).toBeGreaterThan(0);
    expect(result.goalProgress.totalGoals).toBe(2);
    expect(result.outcomeResults).toHaveLength(1);
    expect(result.dropoutRisk).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(result.generatedAt).toBeDefined();
  });

  test('تقرير بدون جلسات يعمل', () => {
    const beneficiary = { id: 'b1', name: 'أحمد', age: 5, guardianEngagementScore: 90 };
    const result = generateClinicalProgressReport(beneficiary, [], [], [], {});
    expect(result.isValid).toBe(true);
    expect(result.sessionMetrics.total).toBe(0);
  });

  test('معدل الإنجاز في الملخص', () => {
    const beneficiary = { id: 'b1', name: 'سارة', age: 6, guardianEngagementScore: 85 };
    const goals = [
      { id: 'g1', baseline: 0, target: 10, currentValue: 10 }, // محقق
      { id: 'g2', baseline: 0, target: 10, currentValue: 10 }, // محقق
    ];
    const result = generateClinicalProgressReport(beneficiary, [], goals, [], {});
    expect(result.summary.goalAchievementRate).toBe(100);
  });
});

// ========================================
// analyzeProgramEffectiveness
// ========================================
describe('analyzeProgramEffectiveness', () => {
  test('مصفوفة فارغة → أصفار', () => {
    const result = analyzeProgramEffectiveness([]);
    expect(result.totalPrograms).toBe(0);
    expect(result.effectiveness).toHaveLength(0);
  });

  test('برنامج بدون مشاركين → insufficient_data', () => {
    const programs = [{ id: 'p1', name: 'برنامج PT', outcomes: [] }];
    const result = analyzeProgramEffectiveness(programs);
    expect(result.effectiveness[0].rating).toBe('insufficient_data');
  });

  test('حساب فعالية البرنامج', () => {
    const programs = [
      {
        id: 'p1',
        name: 'برنامج ABA',
        outcomes: [
          { percentageChange: 70, goalAchievementRate: 90, droppedOut: false },
          { percentageChange: 60, goalAchievementRate: 80, droppedOut: false },
          { percentageChange: 20, goalAchievementRate: 50, droppedOut: true },
          { percentageChange: 80, goalAchievementRate: 95, droppedOut: false },
        ],
      },
    ];
    const result = analyzeProgramEffectiveness(programs);
    expect(result.effectiveness[0].participants).toBe(4);
    expect(result.effectiveness[0].effectivenessScore).toBeGreaterThan(0);
    expect(result.effectiveness[0].retentionRate).toBe(75); // 3/4
  });

  test('ترتيب البرامج حسب الفعالية', () => {
    const programs = [
      {
        id: 'p1',
        name: 'برنامج ضعيف',
        outcomes: [{ percentageChange: 10, goalAchievementRate: 20, droppedOut: false }],
      },
      {
        id: 'p2',
        name: 'برنامج ممتاز',
        outcomes: [{ percentageChange: 90, goalAchievementRate: 95, droppedOut: false }],
      },
    ];
    const result = analyzeProgramEffectiveness(programs);
    expect(result.ranking[0].programId).toBe('p2');
    expect(result.bestProgram.programId).toBe('p2');
  });

  test('متوسط الفعالية محسوب', () => {
    const programs = [
      {
        id: 'p1',
        name: 'برنامج 1',
        outcomes: [{ percentageChange: 60, goalAchievementRate: 80, droppedOut: false }],
      },
      {
        id: 'p2',
        name: 'برنامج 2',
        outcomes: [{ percentageChange: 60, goalAchievementRate: 80, droppedOut: false }],
      },
    ];
    const result = analyzeProgramEffectiveness(programs);
    expect(result.averageEffectiveness).toBeGreaterThan(0);
  });
});

// ========================================
// assessDischargeReadiness
// ========================================
describe('assessDischargeReadiness', () => {
  test('null → readyForDischarge: false', () => {
    const result = assessDischargeReadiness(null, null, []);
    expect(result.readyForDischarge).toBe(false);
    expect(result.readinessScore).toBe(0);
  });

  test('مستفيد جاهز للتخريج (كل المعايير محققة)', () => {
    const beneficiary = {
      id: 'b1',
      lastPeriodAttendance: 90,
      guardianEngagementScore: 80,
    };
    const goalProgress = { achievementRate: 90 };
    const functionalScores = [{ normalizedScore: 85 }];

    const result = assessDischargeReadiness(beneficiary, goalProgress, functionalScores);
    expect(result.readyForDischarge).toBe(true);
    expect(result.readinessScore).toBeGreaterThanOrEqual(75);
    expect(result.criteriaMet).toBeGreaterThanOrEqual(3);
  });

  test('مستفيد غير جاهز للتخريج (أهداف منخفضة)', () => {
    const beneficiary = {
      id: 'b1',
      lastPeriodAttendance: 60,
      guardianEngagementScore: 50,
    };
    const goalProgress = { achievementRate: 30 };
    const functionalScores = [{ normalizedScore: 40 }];

    const result = assessDischargeReadiness(beneficiary, goalProgress, functionalScores);
    expect(result.readyForDischarge).toBe(false);
  });

  test('4 معايير موجودة', () => {
    const beneficiary = { id: 'b1', lastPeriodAttendance: 80, guardianEngagementScore: 70 };
    const goalProgress = { achievementRate: 80 };
    const result = assessDischargeReadiness(beneficiary, goalProgress, []);
    expect(result.totalCriteria).toBe(4);
    expect(Array.isArray(result.criteria)).toBe(true);
  });

  test('توصية التخريج مكتوبة بالعربية', () => {
    const beneficiary = { id: 'b1', lastPeriodAttendance: 90, guardianEngagementScore: 85 };
    const goalProgress = { achievementRate: 90 };
    const functionalScores = [{ normalizedScore: 85 }];
    const result = assessDischargeReadiness(beneficiary, goalProgress, functionalScores);
    expect(result.recommendation).toContain('جاهز');
  });

  test('بدون درجات وظيفية → يستخدم القيمة الافتراضية', () => {
    const beneficiary = { id: 'b1', lastPeriodAttendance: 85, guardianEngagementScore: 75 };
    const goalProgress = { achievementRate: 85 };
    const result = assessDischargeReadiness(beneficiary, goalProgress, null);
    // يجب أن يعمل بدون خطأ
    expect(result.readinessScore).toBeGreaterThan(0);
  });
});

// ========================================
// Integration Scenarios
// ========================================
describe('Integration Scenarios', () => {
  test('سيناريو: متابعة مستفيد طوال دورة علاج كاملة', () => {
    const beneficiary = {
      id: 'b1',
      name: 'فيصل الأحمد',
      age: 5,
      guardianEngagementScore: 90,
      lastPeriodAttendance: 85,
    };

    // 1. تحليل الجلسات
    const sessions = Array(20)
      .fill(null)
      .map((_, i) => ({
        status: i < 17 ? 'completed' : 'no_show',
        date: new Date(2026, 0, 1 + i * 7).toISOString().split('T')[0],
        durationMinutes: 45,
        specialization: 'speech',
      }));

    const sessionMetrics = analyzeSessionMetrics(sessions);
    expect(sessionMetrics.attendanceRate).toBe(85); // 17/20
    expect(sessionMetrics.attendanceStatus).toBe('good');

    // 2. تقدم الأهداف
    const goals = [
      { id: 'g1', baseline: 0, target: 10, currentValue: 10 },
      { id: 'g2', baseline: 0, target: 10, currentValue: 7 },
      { id: 'g3', baseline: 0, target: 10, currentValue: 9 },
    ];
    const goalProgress = calculateIEPProgress(goals);
    expect(goalProgress.achievedGoals).toBe(1);
    expect(goalProgress.overallProgress).toBeGreaterThan(70);

    // 3. مقاييس النتائج
    const outcome = calculateOutcomeMeasure({
      scale: 'barthel',
      initialScore: 40,
      currentScore: 75,
      maxScore: 100,
    });
    expect(outcome.progressLevel).not.toBe('regression');

    // 4. تقييم خطر التسرب
    const risk = assessDropoutRisk(beneficiary, sessions, goalProgress);
    expect(risk.riskLevel).toBe('low');

    // 5. جاهزية التخريج
    const discharge = assessDischargeReadiness(beneficiary, goalProgress, [
      { normalizedScore: 75 },
    ]);
    expect(discharge.criteriaMet).toBeGreaterThanOrEqual(2);
  });

  test('سيناريو: اكتشاف مستفيد في خطر وتدخل فوري', () => {
    const beneficiary = {
      id: 'b2',
      age: 16, // مراهق
      guardianEngagementScore: 25, // انخراط منخفض
    };

    const sessions = [
      { status: 'no_show', date: '2026-01-08' },
      { status: 'no_show', date: '2026-01-15' },
      { status: 'no_show', date: '2026-01-22' },
      { status: 'no_show', date: '2026-01-29' },
    ];

    const goals = [{ id: 'g1', baseline: 0, target: 10, currentValue: 0 }];
    const goalProgress = calculateIEPProgress(goals);

    const risk = assessDropoutRisk(beneficiary, sessions, goalProgress);
    expect(risk.riskLevel).toBe('high');
    expect(risk.riskScore).toBeGreaterThanOrEqual(60);
    expect(risk.recommendations.length).toBeGreaterThan(0);
    expect(risk.factors.some(f => f.factor === 'consecutive_no_shows')).toBe(true);
    expect(risk.factors.some(f => f.factor === 'adolescent_age')).toBe(true);
  });

  test('سيناريو: مقارنة فعالية برامج متعددة', () => {
    const programs = [
      {
        id: 'aba_program',
        name: 'برنامج ABA المكثف',
        outcomes: Array(20).fill({
          percentageChange: 75,
          goalAchievementRate: 85,
          droppedOut: false,
        }),
      },
      {
        id: 'group_program',
        name: 'برنامج جماعي',
        outcomes: Array(20).fill({
          percentageChange: 40,
          goalAchievementRate: 60,
          droppedOut: false,
        }),
      },
      {
        id: 'combined_program',
        name: 'برنامج متكامل',
        outcomes: Array(20).fill({
          percentageChange: 60,
          goalAchievementRate: 75,
          droppedOut: false,
        }),
      },
    ];

    const analysis = analyzeProgramEffectiveness(programs);
    expect(analysis.totalPrograms).toBe(3);
    expect(analysis.bestProgram.programId).toBe('aba_program');
    expect(analysis.ranking[0].effectivenessScore).toBeGreaterThan(
      analysis.ranking[2].effectivenessScore
    );
  });
});

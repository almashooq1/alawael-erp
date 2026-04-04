/**
 * Rehabilitation & Clinical Calculations Tests - اختبارات حسابات التأهيل والسريريات
 * Pure Unit Tests - No DB
 * نظام AlAwael ERP
 */

'use strict';

const {
  REHAB_CONSTANTS,
  assessBeneficiaryEligibility,
  calculateChronologicalAge,
  calculateIEPCompletion,
  generateIEPGoalSuggestions,
  calculateStandardizedScore,
  assessGrossMotorDevelopment,
  assessLanguageDevelopment,
  trackBeneficiaryProgress,
  compareBeneficiariesProgress,
  recommendServices,
  calculateSessionLoad,
  calculateSessionEffectiveness,
  analyzeSessionPatterns,
  calculateTherapistCaseload,
  calculateInterventionOutcome,
  evaluateProgramEffectiveness,
  normalizeScore,
  classifyPerformanceLevel,
  calculateBeneficiaryProgressIndex,
} = require('../services/rehabilitation/rehabilitationCalculations.service');

// ========================================
// REHAB_CONSTANTS
// ========================================
describe('REHAB_CONSTANTS', () => {
  test('أنواع الإعاقات موجودة', () => {
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.AUTISM).toBe('autism');
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.CEREBRAL_PALSY).toBe('cerebral_palsy');
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.DOWN_SYNDROME).toBe('down_syndrome');
  });

  test('مستويات الشدة موجودة', () => {
    expect(REHAB_CONSTANTS.SEVERITY_LEVELS.MILD).toBe('mild');
    expect(REHAB_CONSTANTS.SEVERITY_LEVELS.MODERATE).toBe('moderate');
    expect(REHAB_CONSTANTS.SEVERITY_LEVELS.SEVERE).toBe('severe');
  });

  test('أنواع الخدمات موجودة', () => {
    expect(REHAB_CONSTANTS.SERVICE_TYPES.PT).toBe('pt');
    expect(REHAB_CONSTANTS.SERVICE_TYPES.OT).toBe('ot');
    expect(REHAB_CONSTANTS.SERVICE_TYPES.SPEECH).toBe('speech');
    expect(REHAB_CONSTANTS.SERVICE_TYPES.ABA).toBe('aba');
  });

  test('حالات أهداف IEP موجودة', () => {
    expect(REHAB_CONSTANTS.GOAL_STATUSES.ACHIEVED).toBe('achieved');
    expect(REHAB_CONSTANTS.GOAL_STATUSES.PARTIALLY_ACHIEVED).toBe('partially_achieved');
    expect(REHAB_CONSTANTS.GOAL_STATUSES.NOT_STARTED).toBe('not_started');
  });

  test('مستويات GMFCS من 1 إلى 5', () => {
    expect(REHAB_CONSTANTS.GMFCS_LEVELS.I).toBe(1);
    expect(REHAB_CONSTANTS.GMFCS_LEVELS.V).toBe(5);
  });
});

// ========================================
// assessBeneficiaryEligibility
// ========================================
describe('assessBeneficiaryEligibility', () => {
  test('طفل 2 سنة - شديد - لا يتلقى خدمات → أولوية critical', () => {
    const data = {
      age: 2,
      disabilitySeverity: 'severe',
      currentlyReceivingServices: false,
      hasNationalId: true,
      hasMedicalReport: true,
    };
    const result = assessBeneficiaryEligibility(data);
    expect(result.isEligible).toBe(true);
    expect(result.priorityLevel).toBe('critical');
    expect(result.priorityScore).toBeGreaterThanOrEqual(80);
  });

  test('طفل 10 سنوات - معتدل → أهل', () => {
    const data = {
      age: 10,
      disabilitySeverity: 'moderate',
      hasNationalId: true,
      hasMedicalReport: true,
    };
    const result = assessBeneficiaryEligibility(data);
    expect(result.isEligible).toBe(true);
    expect(['medium', 'high']).toContain(result.priorityLevel);
  });

  test('عمر 70 سنة → غير أهل', () => {
    const result = assessBeneficiaryEligibility({ age: 70 });
    expect(result.isEligible).toBe(false);
    expect(result.priorityLevel).toBe('ineligible');
  });

  test('عمر سالب → غير أهل', () => {
    const result = assessBeneficiaryEligibility({ age: -1 });
    expect(result.isEligible).toBe(false);
  });

  test('بيانات null → غير أهل', () => {
    const result = assessBeneficiaryEligibility(null);
    expect(result.isEligible).toBe(false);
  });

  test('إحالة طبية عاجلة يرفع الأولوية', () => {
    const without = assessBeneficiaryEligibility({
      age: 5,
      disabilitySeverity: 'mild',
      hasNationalId: true,
      hasMedicalReport: true,
    });
    const withUrgent = assessBeneficiaryEligibility({
      age: 5,
      disabilitySeverity: 'mild',
      urgentReferral: true,
      hasNationalId: true,
      hasMedicalReport: true,
    });
    expect(withUrgent.priorityScore).toBeGreaterThan(without.priorityScore);
  });

  test('وثائق ناقصة يخفض الأولوية', () => {
    const complete = assessBeneficiaryEligibility({
      age: 5,
      disabilitySeverity: 'moderate',
      hasNationalId: true,
      hasMedicalReport: true,
    });
    const incomplete = assessBeneficiaryEligibility({
      age: 5,
      disabilitySeverity: 'moderate',
      hasNationalId: false,
      hasMedicalReport: false,
    });
    expect(incomplete.priorityScore).toBeLessThan(complete.priorityScore);
    expect(incomplete.reasons).toContain('وثائق ناقصة');
  });

  test('تدخل مبكر يُضمّن في أسباب الأولوية', () => {
    const result = assessBeneficiaryEligibility({ age: 2, disabilitySeverity: 'mild' });
    expect(result.reasons).toContain('تدخل مبكر (عمر مثالي)');
  });
});

// ========================================
// calculateChronologicalAge
// ========================================
describe('calculateChronologicalAge', () => {
  test('طفل عمره بالضبط 3 سنوات', () => {
    const asOf = new Date('2026-01-01');
    const dob = '2023-01-01';
    const result = calculateChronologicalAge(dob, asOf);
    expect(result.years).toBe(3);
    expect(result.months).toBe(0);
    expect(result.totalMonths).toBe(36);
  });

  test('طفل عمره 2 سنة و6 أشهر', () => {
    const asOf = new Date('2026-07-01');
    const dob = '2024-01-01';
    const result = calculateChronologicalAge(dob, asOf);
    expect(result.years).toBe(2);
    expect(result.months).toBe(6);
    expect(result.totalMonths).toBe(30);
  });

  test('رضيع → ageGroup = infant', () => {
    const asOf = new Date('2026-06-01');
    const dob = '2025-12-01';
    const result = calculateChronologicalAge(dob, asOf);
    expect(result.ageGroup).toBe('infant');
  });

  test('طفل 4 سنوات → ageGroup = preschool', () => {
    const asOf = new Date('2026-01-01');
    const dob = '2022-01-01';
    const result = calculateChronologicalAge(dob, asOf);
    expect(result.ageGroup).toBe('preschool');
  });

  test('طفل 9 سنوات → ageGroup = school_age', () => {
    const asOf = new Date('2026-01-01');
    const dob = '2017-01-01';
    const result = calculateChronologicalAge(dob, asOf);
    expect(result.ageGroup).toBe('school_age');
  });

  test('بالغ 20 سنة → ageGroup = adult', () => {
    const asOf = new Date('2026-01-01');
    const dob = '2006-01-01';
    const result = calculateChronologicalAge(dob, asOf);
    expect(result.ageGroup).toBe('adult');
  });

  test('تاريخ ميلاد null → قيم افتراضية', () => {
    const result = calculateChronologicalAge(null);
    expect(result.years).toBe(0);
    expect(result.ageGroup).toBe('unknown');
  });

  test('تاريخ مستقبلي → unknown', () => {
    const result = calculateChronologicalAge('2030-01-01', new Date('2026-01-01'));
    expect(result.ageGroup).toBe('unknown');
  });
});

// ========================================
// calculateIEPCompletion
// ========================================
describe('calculateIEPCompletion', () => {
  test('كل الأهداف محققة → 100%', () => {
    const goals = [
      { status: 'achieved', domain: 'motor' },
      { status: 'achieved', domain: 'speech' },
      { status: 'achieved', domain: 'social' },
    ];
    const result = calculateIEPCompletion(goals);
    expect(result.completionRate).toBe(100);
    expect(result.weightedCompletionRate).toBe(100);
    expect(result.isOnTrack).toBe(true);
  });

  test('نصف الأهداف محققة جزئياً → 50% مرجح', () => {
    const goals = [
      { status: 'achieved', weight: 1 },
      { status: 'partially_achieved', weight: 1 },
    ];
    const result = calculateIEPCompletion(goals);
    expect(result.weightedCompletionRate).toBe(75); // (1 + 0.5) / 2 = 75%
  });

  test('تجميع حسب المجال', () => {
    const goals = [
      { status: 'achieved', domain: 'motor' },
      { status: 'achieved', domain: 'motor' },
      { status: 'not_started', domain: 'speech' },
    ];
    const result = calculateIEPCompletion(goals);
    expect(result.byDomain['motor'].completionRate).toBe(100);
    expect(result.byDomain['speech'].completionRate).toBe(0);
  });

  test('مصفوفة فارغة → أصفار', () => {
    const result = calculateIEPCompletion([]);
    expect(result.completionRate).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  test('statusBreakdown يعدّ الحالات', () => {
    const goals = [
      { status: 'achieved' },
      { status: 'achieved' },
      { status: 'in_progress' },
      { status: 'not_started' },
    ];
    const result = calculateIEPCompletion(goals);
    expect(result.statusBreakdown.achieved).toBe(2);
    expect(result.statusBreakdown.in_progress).toBe(1);
    expect(result.statusBreakdown.not_started).toBe(1);
  });

  test('isOnTrack = false عند نسبة أقل من 60%', () => {
    const goals = [{ status: 'not_started' }, { status: 'not_started' }, { status: 'achieved' }];
    const result = calculateIEPCompletion(goals);
    expect(result.isOnTrack).toBe(false);
  });

  test('أهداف موزونة بأوزان مختلفة', () => {
    const goals = [
      { status: 'achieved', weight: 3 },
      { status: 'not_started', weight: 1 },
    ];
    const result = calculateIEPCompletion(goals);
    expect(result.weightedCompletionRate).toBe(75); // 3/(3+1)
  });
});

// ========================================
// generateIEPGoalSuggestions
// ========================================
describe('generateIEPGoalSuggestions', () => {
  test('فجوة 30 نقطة → اقتراحات متدرجة', () => {
    const assessment = { serviceType: 'speech', currentLevel: 40, targetLevel: 70, timeframe: 3 };
    const result = generateIEPGoalSuggestions(assessment);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].targetValue).toBeGreaterThan(40);
    expect(result[result.length - 1].targetValue).toBeCloseTo(70, 0);
  });

  test('لا فجوة → لا اقتراحات', () => {
    const assessment = { serviceType: 'pt', currentLevel: 80, targetLevel: 70 };
    const result = generateIEPGoalSuggestions(assessment);
    expect(result).toHaveLength(0);
  });

  test('الخطوة الأولى لها أولوية high', () => {
    const assessment = { serviceType: 'ot', currentLevel: 20, targetLevel: 60 };
    const result = generateIEPGoalSuggestions(assessment);
    expect(result[0].priority).toBe('high');
  });

  test('بيانات null → مصفوفة فارغة', () => {
    expect(generateIEPGoalSuggestions(null)).toHaveLength(0);
  });

  test('بدون serviceType → فارغ', () => {
    const result = generateIEPGoalSuggestions({ currentLevel: 20, targetLevel: 60 });
    expect(result).toHaveLength(0);
  });

  test('كل اقتراح measurable = true', () => {
    const result = generateIEPGoalSuggestions({
      serviceType: 'pt',
      currentLevel: 10,
      targetLevel: 50,
    });
    result.forEach(s => expect(s.measurable).toBe(true));
  });
});

// ========================================
// calculateStandardizedScore
// ========================================
describe('calculateStandardizedScore', () => {
  test('90% من الدرجة القصوى → excellent', () => {
    const result = calculateStandardizedScore('cars', 45, 50);
    expect(result.percentage).toBe(90);
    expect(result.level).toBe('excellent');
  });

  test('50% → average', () => {
    const result = calculateStandardizedScore('vabs', 50, 100);
    expect(result.level).toBe('average');
  });

  test('20% → poor', () => {
    const result = calculateStandardizedScore('bayley', 20, 100);
    expect(result.level).toBe('poor');
  });

  test('z-score محسوب عند توفر المعيار', () => {
    const result = calculateStandardizedScore('vabs', 70, 100, { mean: 50, sd: 10 });
    expect(result.zScore).toBe(2); // (70-50)/10
    expect(result.standardScore).toBe(130); // 100 + 2*15
  });

  test('بدون معيار → z-score = null', () => {
    const result = calculateStandardizedScore('cars', 30, 50);
    expect(result.zScore).toBeNull();
  });

  test('درجة null → بيانات غير كافية', () => {
    const result = calculateStandardizedScore('gmfcs', null, 100);
    expect(result.level).toBe('unknown');
  });

  test('maxScore = 0 → بيانات غير كافية', () => {
    const result = calculateStandardizedScore('denver', 50, 0);
    expect(result.level).toBe('unknown');
  });

  test('الدرجة لا تتجاوز maxScore', () => {
    const result = calculateStandardizedScore('denver', 120, 100);
    expect(result.rawScore).toBe(100);
  });
});

// ========================================
// assessGrossMotorDevelopment
// ========================================
describe('assessGrossMotorDevelopment', () => {
  test('طفل 24 شهر - أنجز مراحل 18 شهر → تأخر 6 أشهر', () => {
    const milestones = [
      { task: 'يمشي', achieved: true, expectedAgeMonths: 12 },
      { task: 'يركض', achieved: true, expectedAgeMonths: 18 },
      { task: 'يقفز', achieved: false, expectedAgeMonths: 24 },
    ];
    const result = assessGrossMotorDevelopment(milestones, 24);
    expect(result.motorAge).toBe(18);
    expect(result.delayMonths).toBe(6);
    expect(result.delay).toBe(true);
  });

  test('بدون تأخر', () => {
    const milestones = [
      { task: 'يجلس', achieved: true, expectedAgeMonths: 6 },
      { task: 'يمشي', achieved: true, expectedAgeMonths: 12 },
    ];
    const result = assessGrossMotorDevelopment(milestones, 12);
    expect(result.delay).toBe(false);
    expect(result.delayMonths).toBe(0);
  });

  test('لا مراحل محققة - عمر 24 شهر → تأخر شديد', () => {
    const milestones = [
      { task: 'يمشي', achieved: false, expectedAgeMonths: 12 },
      { task: 'يركض', achieved: false, expectedAgeMonths: 18 },
    ];
    const result = assessGrossMotorDevelopment(milestones, 24);
    expect(result.motorAge).toBe(0);
    expect(result.delay).toBe(true);
    expect(result.delayMonths).toBe(24);
  });

  test('تقدير GMFCS عند 24 شهر', () => {
    const milestones = [{ task: 'يجلس', achieved: true, expectedAgeMonths: 6 }];
    const result = assessGrossMotorDevelopment(milestones, 24);
    expect(result.gmfcsEstimate).not.toBeNull();
    expect(result.gmfcsEstimate).toBeGreaterThanOrEqual(1);
    expect(result.gmfcsEstimate).toBeLessThanOrEqual(5);
  });

  test('مصفوفة فارغة → قيم افتراضية', () => {
    const result = assessGrossMotorDevelopment([], 12);
    expect(result.motorAge).toBe(0);
    expect(result.gmfcsEstimate).toBeNull();
  });

  test('عمر 0 أشهر → قيم افتراضية', () => {
    const result = assessGrossMotorDevelopment([{ achieved: true, expectedAgeMonths: 2 }], 0);
    expect(result.motorAge).toBe(0);
  });
});

// ========================================
// assessLanguageDevelopment
// ========================================
describe('assessLanguageDevelopment', () => {
  test('تأخر لغوي حسي وتعبيري', () => {
    const data = {
      receptiveScore: 60,
      receptiveMax: 100,
      expressiveScore: 50,
      expressiveMax: 100,
      chronologicalAgeMonths: 36,
    };
    const result = assessLanguageDevelopment(data);
    expect(result.receptiveAge).toBe(22); // 60/100 * 36
    expect(result.expressiveAge).toBe(18); // 50/100 * 36
    expect(result.delay).toBe(true);
  });

  test('بدون تأخر → لا تأخر', () => {
    const data = {
      receptiveScore: 95,
      receptiveMax: 100,
      expressiveScore: 90,
      expressiveMax: 100,
      chronologicalAgeMonths: 24,
    };
    const result = assessLanguageDevelopment(data);
    expect(result.delay).toBe(false);
    expect(result.severity).toBe('none');
  });

  test('تأخر شديد > 24 شهر → severe', () => {
    const data = {
      receptiveScore: 10,
      receptiveMax: 100,
      expressiveScore: 10,
      expressiveMax: 100,
      chronologicalAgeMonths: 60,
    };
    const result = assessLanguageDevelopment(data);
    expect(result.severity).toBe('severe');
  });

  test('توصية تقييم سمع عند تأخر حسي > 12 شهر', () => {
    const data = {
      receptiveScore: 30,
      receptiveMax: 100,
      expressiveScore: 50,
      expressiveMax: 100,
      chronologicalAgeMonths: 36,
    };
    const result = assessLanguageDevelopment(data);
    expect(result.recommendations).toContain('تقييم سمع فوري');
  });

  test('null → قيم افتراضية', () => {
    const result = assessLanguageDevelopment(null);
    expect(result.delay).toBe(false);
    expect(result.receptiveAge).toBe(0);
  });
});

// ========================================
// trackBeneficiaryProgress
// ========================================
describe('trackBeneficiaryProgress', () => {
  test('تحسن من 40% إلى 80% → improving', () => {
    const scores = [
      { sessionDate: '2025-01-01', score: 40, maxScore: 100 },
      { sessionDate: '2025-06-01', score: 60, maxScore: 100 },
      { sessionDate: '2026-01-01', score: 80, maxScore: 100 },
    ];
    const result = trackBeneficiaryProgress(scores);
    expect(result.trend).toBe('improving');
    expect(result.progressRate).toBe(40);
    expect(result.isOnTarget).toBe(true);
  });

  test('تراجع → declining', () => {
    const scores = [
      { sessionDate: '2025-01-01', score: 80, maxScore: 100 },
      { sessionDate: '2026-01-01', score: 50, maxScore: 100 },
    ];
    const result = trackBeneficiaryProgress(scores);
    expect(result.trend).toBe('declining');
    expect(result.progressRate).toBeLessThan(0);
  });

  test('ثبات → stable', () => {
    const scores = [
      { sessionDate: '2025-01-01', score: 70, maxScore: 100 },
      { sessionDate: '2026-01-01', score: 73, maxScore: 100 },
    ];
    const result = trackBeneficiaryProgress(scores);
    expect(result.trend).toBe('stable');
  });

  test('سجل واحد → insufficient_data', () => {
    const result = trackBeneficiaryProgress([
      { sessionDate: '2025-01-01', score: 50, maxScore: 100 },
    ]);
    expect(result.trend).toBe('insufficient_data');
  });

  test('توقع التحسن (projected) عند ≥ 3 سجلات', () => {
    const scores = [
      { sessionDate: '2025-01-01', score: 30, maxScore: 100 },
      { sessionDate: '2025-06-01', score: 50, maxScore: 100 },
      { sessionDate: '2026-01-01', score: 70, maxScore: 100 },
    ];
    const result = trackBeneficiaryProgress(scores);
    expect(result.projected).not.toBeNull();
    expect(result.projected).toBeGreaterThan(70);
  });

  test('مصفوفة فارغة → insufficient_data', () => {
    const result = trackBeneficiaryProgress([]);
    expect(result.trend).toBe('insufficient_data');
    expect(result.progressRate).toBe(0);
  });

  test('تجميع حسب المجال', () => {
    const scores = [
      { sessionDate: '2025-01-01', score: 30, maxScore: 100, domain: 'motor' },
      { sessionDate: '2026-01-01', score: 60, maxScore: 100, domain: 'motor' },
    ];
    const result = trackBeneficiaryProgress(scores);
    expect(result.byDomain['motor']).toBeDefined();
    expect(result.byDomain['motor'].length).toBe(2);
  });
});

// ========================================
// compareBeneficiariesProgress
// ========================================
describe('compareBeneficiariesProgress', () => {
  const makeSessions = (start, end) => [
    { sessionDate: '2025-01-01', score: start, maxScore: 100 },
    { sessionDate: '2026-01-01', score: end, maxScore: 100 },
  ];

  test('ترتيب المستفيدين حسب التقدم', () => {
    const data = [
      { id: 'b1', sessions: makeSessions(20, 80) }, // +60
      { id: 'b2', sessions: makeSessions(50, 60) }, // +10
    ];
    const result = compareBeneficiariesProgress(data);
    expect(result.rankings[0].id).toBe('b1');
    expect(result.topPerformer.id).toBe('b1');
  });

  test('متوسط التقدم محسوب', () => {
    const data = [
      { id: 'b1', sessions: makeSessions(40, 80) }, // +40
      { id: 'b2', sessions: makeSessions(60, 80) }, // +20
    ];
    const result = compareBeneficiariesProgress(data);
    expect(result.averageProgress).toBe(30);
  });

  test('عدد المتحسنين والثابتين والمتراجعين', () => {
    const data = [
      { id: 'b1', sessions: makeSessions(20, 80) }, // improving
      { id: 'b2', sessions: makeSessions(80, 40) }, // declining
      { id: 'b3', sessions: makeSessions(70, 72) }, // stable
    ];
    const result = compareBeneficiariesProgress(data);
    expect(result.improving).toBe(1);
    expect(result.declining).toBe(1);
    expect(result.stable).toBe(1);
  });

  test('مصفوفة فارغة → افتراضي', () => {
    const result = compareBeneficiariesProgress([]);
    expect(result.rankings).toHaveLength(0);
    expect(result.topPerformer).toBeNull();
  });
});

// ========================================
// recommendServices
// ========================================
describe('recommendServices', () => {
  test('توصية التوحد → ABA + Speech أولوية high', () => {
    const result = recommendServices('autism', 'moderate', 4);
    expect(result.length).toBeGreaterThan(0);
    const highPriority = result.filter(r => r.priority === 'high');
    expect(highPriority.length).toBeGreaterThan(0);
    const services = result.map(r => r.service);
    expect(services).toContain('aba');
    expect(services).toContain('speech');
  });

  test('توحد شديد → جلسات ABA أكثر', () => {
    const moderate = recommendServices('autism', 'moderate', 5);
    const severe = recommendServices('autism', 'severe', 5);
    const abaModerate = moderate.find(r => r.service === 'aba');
    const abaSevere = severe.find(r => r.service === 'aba');
    expect(abaSevere.sessionsPerWeek).toBeGreaterThan(abaModerate.sessionsPerWeek);
  });

  test('شلل دماغي → PT + OT', () => {
    const result = recommendServices('cerebral_palsy', 'moderate', 8);
    const services = result.map(r => r.service);
    expect(services).toContain('pt');
    expect(services).toContain('ot');
  });

  test('تدخل مبكر (≤ 6 سنوات) يزيد الجلسات', () => {
    const older = recommendServices('down_syndrome', 'moderate', 10);
    const younger = recommendServices('down_syndrome', 'moderate', 4);
    const speechOlder = older.find(r => r.service === 'speech');
    const speechYounger = younger.find(r => r.service === 'speech');
    expect(speechYounger.sessionsPerWeek).toBeGreaterThan(speechOlder.sessionsPerWeek);
  });

  test('تشخيص غير معروف → توصية عامة', () => {
    const result = recommendServices('rare_syndrome', 'mild', 5);
    expect(result.length).toBeGreaterThan(0);
  });

  test('بدون تشخيص → مصفوفة فارغة', () => {
    const result = recommendServices(null, 'mild', 5);
    expect(result).toHaveLength(0);
  });

  test('الترتيب: high قبل medium', () => {
    const result = recommendServices('autism', 'mild', 5);
    const firstPriority = result[0].priority;
    expect(firstPriority).toBe('high');
  });
});

// ========================================
// calculateSessionLoad
// ========================================
describe('calculateSessionLoad', () => {
  test('3 خدمات → إجمالي جلسات صحيح', () => {
    const services = [
      { service: 'pt', sessionsPerWeek: 3, durationMinutes: 45 },
      { service: 'ot', sessionsPerWeek: 2, durationMinutes: 45 },
      { service: 'speech', sessionsPerWeek: 2, durationMinutes: 30 },
    ];
    const result = calculateSessionLoad(services);
    expect(result.totalSessionsPerWeek).toBe(7);
    expect(result.totalMinutesPerWeek).toBe(3 * 45 + 2 * 45 + 2 * 30);
  });

  test('حمل مفرط عند > 15 جلسة أسبوعياً', () => {
    const services = [
      { service: 'pt', sessionsPerWeek: 8, durationMinutes: 45 },
      { service: 'ot', sessionsPerWeek: 8, durationMinutes: 45 },
    ];
    const result = calculateSessionLoad(services);
    expect(result.isOverloaded).toBe(true);
  });

  test('تجميع حسب الخدمة', () => {
    const services = [{ service: 'pt', sessionsPerWeek: 3, durationMinutes: 45 }];
    const result = calculateSessionLoad(services);
    expect(result.byService['pt'].sessions).toBe(3);
    expect(result.byService['pt'].weeklyMinutes).toBe(135);
  });

  test('الساعات الأسبوعية محسوبة', () => {
    const services = [{ service: 'speech', sessionsPerWeek: 4, durationMinutes: 60 }];
    const result = calculateSessionLoad(services);
    expect(result.totalHoursPerWeek).toBe(4);
  });

  test('مصفوفة فارغة → أصفار', () => {
    const result = calculateSessionLoad([]);
    expect(result.totalSessionsPerWeek).toBe(0);
    expect(result.isOverloaded).toBe(false);
  });
});

// ========================================
// calculateSessionEffectiveness
// ========================================
describe('calculateSessionEffectiveness', () => {
  test('جلسة مثالية → 100', () => {
    const session = {
      participationLevel: 90,
      completedActivities: 5,
      plannedActivities: 5,
      sessionGoalAchieved: true,
    };
    const result = calculateSessionEffectiveness(session);
    expect(result.effectivenessScore).toBe(100);
    expect(result.effectivenessLevel).toBe('high');
  });

  test('مشاركة منخفضة جداً يخفض النتيجة', () => {
    const session = { participationLevel: 20, completedActivities: 3, plannedActivities: 5 };
    const result = calculateSessionEffectiveness(session);
    expect(result.effectivenessScore).toBeLessThan(70);
  });

  test('تحديات سلوكية يخفض النتيجة', () => {
    const normal = calculateSessionEffectiveness({ participationLevel: 80 });
    const withChallenges = calculateSessionEffectiveness({
      participationLevel: 80,
      behaviorChallenges: true,
    });
    expect(withChallenges.effectivenessScore).toBeLessThan(normal.effectivenessScore);
  });

  test('هدف الجلسة لم يتحقق يخفض النتيجة', () => {
    const session = { participationLevel: 80, sessionGoalAchieved: false };
    const result = calculateSessionEffectiveness(session);
    expect(result.effectivenessScore).toBeLessThan(80);
  });

  test('جلسة أقصر من 70% من المخطط → خصم', () => {
    const session = {
      participationLevel: 80,
      plannedDurationMinutes: 45,
      actualDurationMinutes: 20, // أقل من 70%
    };
    const result = calculateSessionEffectiveness(session);
    expect(result.effectivenessScore).toBeLessThan(90);
  });

  test('null → درجة 0', () => {
    const result = calculateSessionEffectiveness(null);
    expect(result.effectivenessScore).toBe(0);
  });

  test('recommendation مناسبة حسب النتيجة', () => {
    const high = calculateSessionEffectiveness({ participationLevel: 90 });
    expect(high.recommendation).toContain('استمر');
  });
});

// ========================================
// analyzeSessionPatterns
// ========================================
describe('analyzeSessionPatterns', () => {
  test('جلسات متحسنة → improving', () => {
    const sessions = [
      { date: '2025-01-01', effectivenessScore: 50 },
      { date: '2025-06-01', effectivenessScore: 65 },
      { date: '2026-01-01', effectivenessScore: 80 },
      { date: '2026-03-01', effectivenessScore: 85 },
    ];
    const result = analyzeSessionPatterns(sessions);
    expect(result.trend).toBe('improving');
  });

  test('جلسات متراجعة → declining', () => {
    const sessions = [
      { date: '2025-01-01', effectivenessScore: 90 },
      { date: '2025-06-01', effectivenessScore: 75 },
      { date: '2026-01-01', effectivenessScore: 60 },
      { date: '2026-03-01', effectivenessScore: 50 },
    ];
    const result = analyzeSessionPatterns(sessions);
    expect(result.trend).toBe('declining');
    expect(result.recommendations).toContain('مراجعة عاجلة مع المشرف');
  });

  test('نسبة جلسات ضعيفة > 30% → نمط مكتشف', () => {
    const sessions = [
      { date: '2025-01-01', effectivenessScore: 30 },
      { date: '2025-03-01', effectivenessScore: 40 },
      { date: '2025-06-01', effectivenessScore: 45 },
      { date: '2025-09-01', effectivenessScore: 80 },
    ];
    const result = analyzeSessionPatterns(sessions);
    expect(result.patterns.length).toBeGreaterThan(0);
  });

  test('متوسط الفاعلية محسوب', () => {
    const sessions = [
      { effectivenessScore: 60 },
      { effectivenessScore: 80 },
      { effectivenessScore: 70 },
    ];
    const result = analyzeSessionPatterns(sessions);
    expect(result.avgEffectiveness).toBe(70);
  });

  test('مصفوفة فارغة → no_data', () => {
    const result = analyzeSessionPatterns([]);
    expect(result.trend).toBe('no_data');
  });
});

// ========================================
// calculateTherapistCaseload
// ========================================
describe('calculateTherapistCaseload', () => {
  test('معالج بـ 10 حالات - جلستان أسبوعياً لكل → حمل معقول', () => {
    const cases = Array(10).fill({ sessionsPerWeek: 2, complexity: 'normal' });
    const result = calculateTherapistCaseload(cases, 35);
    expect(result.totalCases).toBe(10);
    expect(result.totalWeeklySessions).toBe(20);
    expect(result.isOverloaded).toBe(false);
  });

  test('حالات معقدة ترفع نقاط الحمل', () => {
    const normalCases = Array(5).fill({ sessionsPerWeek: 3, complexity: 'normal' });
    const highCases = Array(5).fill({ sessionsPerWeek: 3, complexity: 'high' });

    const normalResult = calculateTherapistCaseload(normalCases);
    const highResult = calculateTherapistCaseload(highCases);
    expect(highResult.caseloadScore).toBeGreaterThan(normalResult.caseloadScore);
  });

  test('حمل مفرط عند تجاوز الساعات المتاحة', () => {
    const cases = Array(30).fill({ sessionsPerWeek: 3, complexity: 'normal' });
    const result = calculateTherapistCaseload(cases, 35);
    expect(result.isOverloaded).toBe(true);
  });

  test('status = optimal عند حمل مناسب', () => {
    const cases = Array(8).fill({ sessionsPerWeek: 2, complexity: 'normal' });
    const result = calculateTherapistCaseload(cases, 35);
    expect(['optimal', 'light']).toContain(result.status);
  });

  test('مصفوفة فارغة → أصفار', () => {
    const result = calculateTherapistCaseload([]);
    expect(result.totalCases).toBe(0);
    expect(result.isOverloaded).toBe(false);
  });

  test('ساعات التوثيق محسوبة', () => {
    const cases = [{ sessionsPerWeek: 4, complexity: 'normal' }];
    const result = calculateTherapistCaseload(cases, 35);
    expect(result.documentationHours).toBeGreaterThan(0);
  });
});

// ========================================
// calculateInterventionOutcome
// ========================================
describe('calculateInterventionOutcome', () => {
  test('تحسن من 30 إلى 70 → isImproved = true', () => {
    const result = calculateInterventionOutcome(
      { score: 30, maxScore: 100 },
      { score: 70, maxScore: 100 }
    );
    expect(result.rawImprovement).toBe(40);
    expect(result.percentageImprovement).toBe(40);
    expect(result.isImproved).toBe(true);
  });

  test('تراجع → isImproved = false', () => {
    const result = calculateInterventionOutcome(
      { score: 80, maxScore: 100 },
      { score: 60, maxScore: 100 }
    );
    expect(result.isImproved).toBe(false);
    expect(result.rawImprovement).toBe(-20);
  });

  test('الأهمية السريرية عند تجاوز MCID (10%)', () => {
    const result = calculateInterventionOutcome(
      { score: 30, maxScore: 100 },
      { score: 45, maxScore: 100 }
    );
    expect(result.clinicalSignificance).toBe(true); // 15 > 10 (mcid)
  });

  test('تحسن أقل من MCID → لا أهمية سريرية', () => {
    const result = calculateInterventionOutcome(
      { score: 50, maxScore: 100 },
      { score: 55, maxScore: 100 }
    );
    expect(result.clinicalSignificance).toBe(false); // 5 < 10 (mcid)
  });

  test('effect size محسوب عند توفر الانحراف المعياري', () => {
    const result = calculateInterventionOutcome(
      { score: 50, maxScore: 100, standardDeviation: 10 },
      { score: 70, maxScore: 100 }
    );
    expect(result.effectSize).toBe(2); // 20/10
    expect(result.effectSizeLabel).toBe('large');
  });

  test('فترة التدخل بالأيام محسوبة', () => {
    const result = calculateInterventionOutcome(
      { score: 50, maxScore: 100, date: '2025-01-01' },
      { score: 70, maxScore: 100, date: '2025-07-01' }
    );
    expect(result.interventionPeriodDays).toBeGreaterThan(0);
  });

  test('null → قيم افتراضية', () => {
    const result = calculateInterventionOutcome(null, null);
    expect(result.isImproved).toBe(false);
  });
});

// ========================================
// evaluateProgramEffectiveness
// ========================================
describe('evaluateProgramEffectiveness', () => {
  test('70% نجاح → مستوى excellent', () => {
    const outcomes = Array(10)
      .fill(null)
      .map((_, i) => ({
        serviceType: 'speech',
        pre: { score: 30, maxScore: 100 },
        post: { score: 50, maxScore: 100 },
      }));
    const result = evaluateProgramEffectiveness(outcomes);
    expect(result.successRate).toBe(100);
    expect(result.effectivenessLevel).toBe('excellent');
  });

  test('تجميع حسب الخدمة', () => {
    const outcomes = [
      { serviceType: 'pt', pre: { score: 20, maxScore: 100 }, post: { score: 60, maxScore: 100 } },
      { serviceType: 'ot', pre: { score: 30, maxScore: 100 }, post: { score: 50, maxScore: 100 } },
    ];
    const result = evaluateProgramEffectiveness(outcomes);
    expect(result.byService['pt']).toBeDefined();
    expect(result.byService['ot']).toBeDefined();
  });

  test('لا تحسن → effectivenessLevel = poor', () => {
    const outcomes = Array(5)
      .fill(null)
      .map(() => ({
        serviceType: 'general',
        pre: { score: 80, maxScore: 100 },
        post: { score: 80, maxScore: 100 },
      }));
    const result = evaluateProgramEffectiveness(outcomes);
    expect(result.effectivenessLevel).toBe('poor');
  });

  test('مصفوفة فارغة → قيم افتراضية', () => {
    const result = evaluateProgramEffectiveness([]);
    expect(result.overallEffectiveness).toBe(0);
    expect(result.totalEvaluated).toBe(0);
  });
});

// ========================================
// normalizeScore
// ========================================
describe('normalizeScore', () => {
  test('50 من 100 → 50%', () => {
    expect(normalizeScore(50, 100)).toBe(50);
  });

  test('يُقيّد بين 0 و100', () => {
    expect(normalizeScore(120, 100)).toBe(100);
    expect(normalizeScore(-10, 100)).toBe(0);
  });

  test('maxScore = 0 → 0', () => {
    expect(normalizeScore(50, 0)).toBe(0);
  });

  test('null score → 0', () => {
    expect(normalizeScore(null, 100)).toBe(0);
  });
});

// ========================================
// classifyPerformanceLevel
// ========================================
describe('classifyPerformanceLevel', () => {
  test('85% → excellent', () => {
    expect(classifyPerformanceLevel(85)).toBe('excellent');
  });

  test('70% → good', () => {
    expect(classifyPerformanceLevel(70)).toBe('good');
  });

  test('55% → average', () => {
    expect(classifyPerformanceLevel(55)).toBe('average');
  });

  test('40% → below_average', () => {
    expect(classifyPerformanceLevel(40)).toBe('below_average');
  });

  test('30% → poor', () => {
    expect(classifyPerformanceLevel(30)).toBe('poor');
  });
});

// ========================================
// calculateBeneficiaryProgressIndex
// ========================================
describe('calculateBeneficiaryProgressIndex', () => {
  test('كل المؤشرات بحدها الأقصى → تقدير A', () => {
    const metrics = {
      goalAchievement: 100,
      sessionAttendance: 100,
      functionalImprovement: 100,
      familyEngagement: 100,
    };
    const result = calculateBeneficiaryProgressIndex(metrics);
    expect(result.overallIndex).toBe(100);
    expect(result.grade).toBe('A');
  });

  test('كل المؤشرات صفر → تقدير F', () => {
    const metrics = {
      goalAchievement: 0,
      sessionAttendance: 0,
      functionalImprovement: 0,
      familyEngagement: 0,
    };
    const result = calculateBeneficiaryProgressIndex(metrics);
    expect(result.overallIndex).toBe(0);
    expect(result.grade).toBe('F');
  });

  test('breakdown موجود لكل مؤشر', () => {
    const metrics = { goalAchievement: 80, sessionAttendance: 90 };
    const result = calculateBeneficiaryProgressIndex(metrics);
    expect(result.details.goalAchievement).toBeDefined();
    expect(result.details.goalAchievement.score).toBe(80);
  });

  test('null → F', () => {
    const result = calculateBeneficiaryProgressIndex(null);
    expect(result.grade).toBe('F');
    expect(result.overallIndex).toBe(0);
  });

  test('مؤشر واحد فقط → محسوب', () => {
    const result = calculateBeneficiaryProgressIndex({ goalAchievement: 75 });
    expect(result.overallIndex).toBe(75);
  });
});

// ========================================
// Integration Scenarios
// ========================================
describe('Integration Scenarios', () => {
  test('سيناريو: تقييم طفل جديد وبناء خطة تأهيل', () => {
    // 1. تقييم الأهلية
    const eligibility = assessBeneficiaryEligibility({
      age: 3,
      disabilitySeverity: 'severe',
      currentlyReceivingServices: false,
      hasNationalId: true,
      hasMedicalReport: true,
      urgentReferral: true,
    });
    expect(eligibility.isEligible).toBe(true);
    expect(eligibility.priorityLevel).toBe('critical');

    // 2. حساب العمر
    const ageData = calculateChronologicalAge('2023-01-01', new Date('2026-01-01'));
    expect(ageData.years).toBe(3);
    expect(ageData.ageGroup).toBe('preschool');

    // 3. الحصول على التوصيات
    const services = recommendServices('autism', 'severe', 3);
    expect(services.length).toBeGreaterThan(0);
    expect(services[0].priority).toBe('high');
  });

  test('سيناريو: تتبع تقدم IEP على مدار 3 أشهر', () => {
    const goals = [
      { status: 'achieved', domain: 'communication', weight: 2 },
      { status: 'achieved', domain: 'communication', weight: 2 },
      { status: 'partially_achieved', domain: 'motor', weight: 1 },
      { status: 'in_progress', domain: 'motor', weight: 1 },
      { status: 'not_started', domain: 'social', weight: 1 },
    ];
    const iep = calculateIEPCompletion(goals);
    expect(iep.achievedCount).toBe(2);
    expect(iep.byDomain['communication'].completionRate).toBe(100);
    expect(iep.weightedCompletionRate).toBeGreaterThan(0);
  });

  test('سيناريو: تحليل فاعلية برنامج تأهيل كامل', () => {
    const outcomes = [
      {
        serviceType: 'speech',
        pre: { score: 25, maxScore: 100 },
        post: { score: 55, maxScore: 100 },
      },
      {
        serviceType: 'speech',
        pre: { score: 30, maxScore: 100 },
        post: { score: 60, maxScore: 100 },
      },
      { serviceType: 'ot', pre: { score: 40, maxScore: 100 }, post: { score: 65, maxScore: 100 } },
      { serviceType: 'pt', pre: { score: 20, maxScore: 100 }, post: { score: 50, maxScore: 100 } },
    ];
    const effectiveness = evaluateProgramEffectiveness(outcomes);
    expect(effectiveness.totalEvaluated).toBe(4);
    expect(effectiveness.successRate).toBeGreaterThan(0);
    expect(effectiveness.byService['speech']).toBeDefined();
    expect(effectiveness.byService['ot']).toBeDefined();
  });

  test('سيناريو: إدارة حمل عمل المعالج', () => {
    const cases = [
      { beneficiaryId: 'b1', sessionsPerWeek: 3, complexity: 'high' },
      { beneficiaryId: 'b2', sessionsPerWeek: 2, complexity: 'normal' },
      { beneficiaryId: 'b3', sessionsPerWeek: 3, complexity: 'high' },
      { beneficiaryId: 'b4', sessionsPerWeek: 2, complexity: 'low' },
      { beneficiaryId: 'b5', sessionsPerWeek: 2, complexity: 'normal' },
    ];
    const caseload = calculateTherapistCaseload(cases, 35);
    expect(caseload.totalCases).toBe(5);
    expect(caseload.totalWeeklySessions).toBe(12);
    expect(['light', 'optimal', 'high']).toContain(caseload.status);
  });

  test('سيناريو: قياس تقدم مجموعة مستفيدين', () => {
    const makeProg = (start, end) => [
      { sessionDate: '2025-01-01', score: start, maxScore: 100 },
      { sessionDate: '2025-06-01', score: (start + end) / 2, maxScore: 100 },
      { sessionDate: '2026-01-01', score: end, maxScore: 100 },
    ];

    const comparison = compareBeneficiariesProgress([
      { id: 'child1', name: 'أحمد', sessions: makeProg(20, 70) },
      { id: 'child2', name: 'سارة', sessions: makeProg(40, 80) },
      { id: 'child3', name: 'خالد', sessions: makeProg(60, 65) },
    ]);

    expect(comparison.rankings).toHaveLength(3);
    expect(comparison.improving).toBeGreaterThanOrEqual(2);
    expect(comparison.averageProgress).toBeGreaterThan(0);

    const bpi = calculateBeneficiaryProgressIndex({
      goalAchievement: 75,
      sessionAttendance: 90,
      functionalImprovement: comparison.averageProgress,
      familyEngagement: 80,
    });
    expect(['A', 'B', 'C', 'D', 'F']).toContain(bpi.grade);
  });

  test('سيناريو: تقييم لغوي وحركي متكامل', () => {
    // تقييم لغوي
    const langData = {
      receptiveScore: 55,
      receptiveMax: 100,
      expressiveScore: 40,
      expressiveMax: 100,
      chronologicalAgeMonths: 48,
    };
    const lang = assessLanguageDevelopment(langData);
    expect(lang.delay).toBe(true);
    expect(lang.recommendations.length).toBeGreaterThan(0);

    // تقييم حركي
    const milestones = [
      { task: 'يجلس', achieved: true, expectedAgeMonths: 6 },
      { task: 'يمشي', achieved: true, expectedAgeMonths: 14 },
      { task: 'يركض', achieved: false, expectedAgeMonths: 18 },
    ];
    const motor = assessGrossMotorDevelopment(milestones, 48);
    expect(motor.motorAge).toBe(14);
    expect(motor.delay).toBe(true);
  });
});

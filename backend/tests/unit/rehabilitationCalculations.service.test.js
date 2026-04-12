/**
 * Unit Tests — rehabilitationCalculations.service.js
 * Pure business logic — no DB, no side effects
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
} = require('../../services/rehabilitation/rehabilitationCalculations.service');

// ========================================
// CONSTANTS
// ========================================
describe('REHAB_CONSTANTS', () => {
  test('DISABILITY_TYPES has expected keys', () => {
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.AUTISM).toBe('autism');
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.CEREBRAL_PALSY).toBe('cerebral_palsy');
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.DOWN_SYNDROME).toBe('down_syndrome');
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.INTELLECTUAL).toBe('intellectual_disability');
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.SPEECH_LANGUAGE).toBe('speech_language');
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.HEARING).toBe('hearing_impairment');
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.VISUAL).toBe('visual_impairment');
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.LEARNING).toBe('learning_disability');
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.ADHD).toBe('adhd');
    expect(REHAB_CONSTANTS.DISABILITY_TYPES.OTHER).toBe('other');
  });

  test('SEVERITY_LEVELS has 3 levels only', () => {
    expect(Object.keys(REHAB_CONSTANTS.SEVERITY_LEVELS)).toEqual(['MILD', 'MODERATE', 'SEVERE']);
    expect(REHAB_CONSTANTS.SEVERITY_LEVELS.MILD).toBe('mild');
    expect(REHAB_CONSTANTS.SEVERITY_LEVELS.MODERATE).toBe('moderate');
    expect(REHAB_CONSTANTS.SEVERITY_LEVELS.SEVERE).toBe('severe');
  });

  test('SERVICE_TYPES has expected keys', () => {
    expect(REHAB_CONSTANTS.SERVICE_TYPES.PT).toBe('pt');
    expect(REHAB_CONSTANTS.SERVICE_TYPES.ABA).toBe('aba');
    expect(REHAB_CONSTANTS.SERVICE_TYPES.SPEECH).toBe('speech');
    expect(REHAB_CONSTANTS.SERVICE_TYPES.OT).toBe('ot');
  });

  test('GOAL_STATUSES contains required statuses', () => {
    expect(REHAB_CONSTANTS.GOAL_STATUSES.ACHIEVED).toBe('achieved');
    expect(REHAB_CONSTANTS.GOAL_STATUSES.IN_PROGRESS).toBe('in_progress');
    expect(REHAB_CONSTANTS.GOAL_STATUSES.NOT_STARTED).toBe('not_started');
    expect(REHAB_CONSTANTS.GOAL_STATUSES.PARTIALLY_ACHIEVED).toBe('partially_achieved');
    expect(REHAB_CONSTANTS.GOAL_STATUSES.DISCONTINUED).toBe('discontinued');
  });

  test('ASSESSMENT_SCALES and GMFCS_LEVELS exist', () => {
    expect(REHAB_CONSTANTS.ASSESSMENT_SCALES.GMFCS).toBe('gmfcs');
    expect(REHAB_CONSTANTS.GMFCS_LEVELS.I).toBe(1);
    expect(REHAB_CONSTANTS.GMFCS_LEVELS.V).toBe(5);
  });

  test('SERVICE_WEIGHTS exist', () => {
    expect(REHAB_CONSTANTS.SERVICE_WEIGHTS).toBeDefined();
    expect(REHAB_CONSTANTS.SERVICE_WEIGHTS.pt).toBe(0.25);
  });
});

// ========================================
// assessBeneficiaryEligibility
// ========================================
describe('assessBeneficiaryEligibility', () => {
  test('null input returns ineligible with reasons', () => {
    const r = assessBeneficiaryEligibility(null);
    expect(r).toEqual({
      isEligible: false,
      priorityScore: 0,
      priorityLevel: 'low',
      reasons: ['بيانات غير صالحة'],
    });
  });

  test('non-object input returns ineligible', () => {
    expect(assessBeneficiaryEligibility('string').isEligible).toBe(false);
  });

  test('age out of range returns ineligible', () => {
    const r = assessBeneficiaryEligibility({ age: 70 });
    expect(r.isEligible).toBe(false);
    expect(r.priorityLevel).toBe('ineligible');
    expect(r.reasons).toContain('العمر خارج النطاق المقبول');
  });

  test('early intervention age (<=3) has high priority score', () => {
    const r = assessBeneficiaryEligibility({
      age: 2,
      disabilitySeverity: 'severe',
      urgentReferral: true,
      hasNationalId: true,
      hasMedicalReport: true,
    });
    expect(r.isEligible).toBe(true);
    expect(r.priorityScore).toBeGreaterThanOrEqual(80);
    expect(r.priorityLevel).toBe('critical');
    expect(r.reasons).toContain('تدخل مبكر (عمر مثالي)');
    expect(r.reasons).toContain('إعاقة شديدة');
    expect(r.reasons).toContain('إحالة طبية عاجلة');
  });

  test('adult with mild severity gets low priority', () => {
    const r = assessBeneficiaryEligibility({
      age: 30,
      disabilitySeverity: 'mild',
      currentlyReceivingServices: true,
      hasNationalId: true,
      hasMedicalReport: true,
    });
    expect(r.isEligible).toBe(true);
    expect(r.priorityLevel).toBe('low');
  });

  test('not receiving services adds score', () => {
    const base = {
      age: 10,
      disabilitySeverity: 'moderate',
      hasNationalId: true,
      hasMedicalReport: true,
    };
    const with_ = assessBeneficiaryEligibility({ ...base, currentlyReceivingServices: false });
    const without_ = assessBeneficiaryEligibility({ ...base, currentlyReceivingServices: true });
    expect(with_.priorityScore).toBeGreaterThan(without_.priorityScore);
  });

  test('missing documents reduces score', () => {
    const r = assessBeneficiaryEligibility({
      age: 5,
      disabilitySeverity: 'moderate',
      hasNationalId: false,
      hasMedicalReport: false,
    });
    expect(r.reasons).toContain('وثائق ناقصة');
  });

  test('school age moderate gets medium priority', () => {
    const r = assessBeneficiaryEligibility({
      age: 10,
      disabilitySeverity: 'moderate',
      hasNationalId: true,
      hasMedicalReport: true,
    });
    expect(r.isEligible).toBe(true);
    expect(r.priorityLevel).toBe('medium');
  });
});

// ========================================
// calculateChronologicalAge
// ========================================
describe('calculateChronologicalAge', () => {
  test('null returns unknown', () => {
    const r = calculateChronologicalAge(null);
    expect(r).toEqual({ years: 0, months: 0, totalMonths: 0, ageGroup: 'unknown' });
  });

  test('future date returns unknown', () => {
    const r = calculateChronologicalAge('2099-01-01');
    expect(r.ageGroup).toBe('unknown');
  });

  test('invalid date returns unknown', () => {
    const r = calculateChronologicalAge('not-a-date');
    expect(r.ageGroup).toBe('unknown');
  });

  test('infant under 1 year', () => {
    const dob = new Date();
    dob.setMonth(dob.getMonth() - 6);
    const r = calculateChronologicalAge(dob);
    expect(r.years).toBe(0);
    expect(r.totalMonths).toBeGreaterThanOrEqual(5);
    expect(r.ageGroup).toBe('infant');
  });

  test('toddler 1-2 years', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 2);
    const r = calculateChronologicalAge(dob);
    expect(r.years).toBe(2);
    expect(r.ageGroup).toBe('toddler');
  });

  test('preschool 3-5 years', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 4);
    const r = calculateChronologicalAge(dob);
    expect(r.ageGroup).toBe('preschool');
  });

  test('school_age 6-12 years', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 8);
    const r = calculateChronologicalAge(dob);
    expect(r.ageGroup).toBe('school_age');
  });

  test('adolescent 13-17 years', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 15);
    const r = calculateChronologicalAge(dob);
    expect(r.ageGroup).toBe('adolescent');
  });

  test('adult 18+', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 25);
    const r = calculateChronologicalAge(dob);
    expect(r.ageGroup).toBe('adult');
    expect(r.years).toBe(25);
  });

  test('accepts string date', () => {
    const r = calculateChronologicalAge('2000-01-01', new Date('2020-01-01'));
    expect(r.years).toBe(20);
    expect(r.totalMonths).toBe(240);
  });
});

// ========================================
// calculateIEPCompletion
// ========================================
describe('calculateIEPCompletion', () => {
  test('null/empty returns zeros', () => {
    const r = calculateIEPCompletion(null);
    expect(r.completionRate).toBe(0);
    expect(r.weightedCompletionRate).toBe(0);
    expect(r.achievedCount).toBe(0);
    expect(r.totalCount).toBe(0);
    expect(r.byDomain).toEqual({});
    expect(r.statusBreakdown).toEqual({});
  });

  test('empty array returns zeros', () => {
    expect(calculateIEPCompletion([]).completionRate).toBe(0);
  });

  test('all achieved goals give 100% completion', () => {
    const goals = [
      { status: 'achieved', weight: 1, domain: 'motor' },
      { status: 'achieved', weight: 1, domain: 'motor' },
      { status: 'achieved', weight: 1, domain: 'speech' },
    ];
    const r = calculateIEPCompletion(goals);
    expect(r.completionRate).toBe(100);
    expect(r.weightedCompletionRate).toBe(100);
    expect(r.achievedCount).toBe(3);
    expect(r.totalCount).toBe(3);
    expect(r.isOnTrack).toBe(true);
  });

  test('partially achieved counts half weight', () => {
    const goals = [
      { status: 'achieved', weight: 2, domain: 'motor' },
      { status: 'partially_achieved', weight: 2, domain: 'motor' },
    ];
    const r = calculateIEPCompletion(goals);
    expect(r.achievedCount).toBe(1);
    expect(r.weightedCompletionRate).toBe(75);
    expect(r.completionRate).toBe(50);
  });

  test('byDomain tracks per-domain completion', () => {
    const goals = [
      { status: 'achieved', domain: 'motor' },
      { status: 'not_started', domain: 'motor' },
      { status: 'achieved', domain: 'speech' },
    ];
    const r = calculateIEPCompletion(goals);
    expect(r.byDomain.motor.total).toBe(2);
    expect(r.byDomain.motor.achieved).toBe(1);
    expect(r.byDomain.motor.completionRate).toBe(50);
    expect(r.byDomain.speech.total).toBe(1);
    expect(r.byDomain.speech.achieved).toBe(1);
    expect(r.byDomain.speech.completionRate).toBe(100);
  });

  test('statusBreakdown counts each status', () => {
    const goals = [
      { status: 'achieved' },
      { status: 'in_progress' },
      { status: 'in_progress' },
      { status: 'not_started' },
    ];
    const r = calculateIEPCompletion(goals);
    expect(r.statusBreakdown.achieved).toBe(1);
    expect(r.statusBreakdown.in_progress).toBe(2);
    expect(r.statusBreakdown.not_started).toBe(1);
  });

  test('isOnTrack false when weighted < 60', () => {
    const goals = [
      { status: 'not_started', weight: 1 },
      { status: 'not_started', weight: 1 },
      { status: 'achieved', weight: 1 },
    ];
    const r = calculateIEPCompletion(goals);
    expect(r.isOnTrack).toBe(false);
  });

  test('null goals in array are skipped', () => {
    const goals = [null, { status: 'achieved' }];
    const r = calculateIEPCompletion(goals);
    expect(r.totalCount).toBe(2);
    expect(r.achievedCount).toBe(1);
  });
});

// ========================================
// generateIEPGoalSuggestions
// ========================================
describe('generateIEPGoalSuggestions', () => {
  test('null returns empty array', () => {
    expect(generateIEPGoalSuggestions(null)).toEqual([]);
  });

  test('missing required fields returns empty', () => {
    expect(generateIEPGoalSuggestions({ serviceType: 'pt' })).toEqual([]);
  });

  test('no gap (target <= current) returns empty', () => {
    expect(
      generateIEPGoalSuggestions({ serviceType: 'pt', currentLevel: 80, targetLevel: 80 })
    ).toEqual([]);
  });

  test('generates step-based suggestions with correct structure', () => {
    const r = generateIEPGoalSuggestions({
      serviceType: 'speech',
      currentLevel: 30,
      targetLevel: 60,
      domain: 'communication',
      timeframe: 3,
    });
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]).toHaveProperty('step', 1);
    expect(r[0]).toHaveProperty('domain', 'communication');
    expect(r[0]).toHaveProperty('serviceType', 'speech');
    expect(r[0]).toHaveProperty('targetValue');
    expect(r[0]).toHaveProperty('timeframeMonths');
    expect(r[0]).toHaveProperty('priority', 'high');
    expect(r[0]).toHaveProperty('measurable', true);
    if (r.length > 1) {
      expect(r[1].priority).toBe('medium');
    }
  });

  test('target values increment toward targetLevel', () => {
    const r = generateIEPGoalSuggestions({
      serviceType: 'ot',
      currentLevel: 20,
      targetLevel: 50,
      timeframe: 3,
    });
    const targets = r.map(s => s.targetValue);
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i]).toBeGreaterThan(targets[i - 1]);
    }
    expect(targets[targets.length - 1]).toBe(50);
  });
});

// ========================================
// calculateStandardizedScore
// ========================================
describe('calculateStandardizedScore', () => {
  test('undefined rawScore returns insufficient data', () => {
    const r = calculateStandardizedScore('gmfcs', undefined, 100);
    expect(r.interpretation).toBe('بيانات غير كافية');
    expect(r.level).toBe('unknown');
  });

  test('maxScore 0 returns insufficient', () => {
    const r = calculateStandardizedScore('vabs', 50, 0);
    expect(r.level).toBe('unknown');
  });

  test('excellent score (>= 90%)', () => {
    const r = calculateStandardizedScore('vabs', 95, 100);
    expect(r.rawScore).toBe(95);
    expect(r.maxScore).toBe(100);
    expect(r.percentage).toBe(95);
    expect(r.level).toBe('excellent');
    expect(r.scale).toBe('vabs');
    expect(r.zScore).toBeNull();
    expect(r.standardScore).toBeNull();
  });

  test('below average score (25-49%)', () => {
    const r = calculateStandardizedScore('bayley', 30, 100);
    expect(r.percentage).toBe(30);
    expect(r.level).toBe('below_average');
  });

  test('poor score (< 25%)', () => {
    const r = calculateStandardizedScore('denver', 10, 100);
    expect(r.level).toBe('poor');
  });

  test('with norms computes zScore and standardScore', () => {
    const r = calculateStandardizedScore('vabs', 75, 100, { mean: 50, sd: 10 });
    expect(r.zScore).toBe(2.5);
    expect(r.standardScore).toBe(138);
  });

  test('rawScore clamped to 0..maxScore', () => {
    const r = calculateStandardizedScore('cars', -10, 100);
    expect(r.rawScore).toBe(0);
    const r2 = calculateStandardizedScore('cars', 150, 100);
    expect(r2.rawScore).toBe(100);
  });
});

// ========================================
// assessGrossMotorDevelopment
// ========================================
describe('assessGrossMotorDevelopment', () => {
  test('null/empty milestones returns defaults', () => {
    const r = assessGrossMotorDevelopment(null, 24);
    expect(r.motorAge).toBe(0);
    expect(r.delay).toBe(false);
    expect(r.gmfcsEstimate).toBeNull();
  });

  test('no achieved milestones with age > 12 means severe delay', () => {
    const r = assessGrossMotorDevelopment(
      [{ task: 'walk', achieved: false, expectedAgeMonths: 12 }],
      24
    );
    expect(r.motorAge).toBe(0);
    expect(r.delay).toBe(true);
    expect(r.gmfcsEstimate).toBe(5);
  });

  test('some achieved milestones calculates motor age', () => {
    const milestones = [
      { task: 'sit', achieved: true, expectedAgeMonths: 6 },
      { task: 'stand', achieved: true, expectedAgeMonths: 10 },
      { task: 'walk', achieved: false, expectedAgeMonths: 12 },
    ];
    const r = assessGrossMotorDevelopment(milestones, 24);
    expect(r.motorAge).toBe(10);
    expect(r.currentAge).toBe(24);
    expect(r.delay).toBe(true);
    expect(r.delayMonths).toBe(14);
    expect(r.achievedMilestones).toBe(2);
    expect(r.totalMilestones).toBe(3);
    expect(r.delayPercentage).toBeGreaterThan(0);
  });

  test('no delay when motor age close to current age', () => {
    const milestones = [{ task: 'walk', achieved: true, expectedAgeMonths: 24 }];
    const r = assessGrossMotorDevelopment(milestones, 24);
    expect(r.delay).toBe(false);
    expect(r.delayMonths).toBe(0);
  });

  test('gmfcsEstimate ranges based on delay percentage', () => {
    const milestones = [{ task: 'sit', achieved: true, expectedAgeMonths: 6 }];
    const r = assessGrossMotorDevelopment(milestones, 24);
    expect(r.gmfcsEstimate).toBe(5);
  });
});

// ========================================
// assessLanguageDevelopment
// ========================================
describe('assessLanguageDevelopment', () => {
  test('null returns defaults', () => {
    const r = assessLanguageDevelopment(null);
    expect(r).toEqual({ receptiveAge: 0, expressiveAge: 0, delay: false });
  });

  test('no delay when scores are proportion of age', () => {
    const r = assessLanguageDevelopment({
      receptiveScore: 90,
      expressiveScore: 85,
      receptiveMax: 100,
      expressiveMax: 100,
      chronologicalAgeMonths: 36,
    });
    expect(r.receptiveAge).toBe(32);
    expect(r.expressiveAge).toBe(31);
    expect(r.delay).toBe(false);
    expect(r.severity).toBe('none');
    expect(r.recommendations).toContain('متابعة دورية');
  });

  test('severe delay when expressive lag > 24 months', () => {
    const r = assessLanguageDevelopment({
      receptiveScore: 20,
      expressiveScore: 10,
      receptiveMax: 100,
      expressiveMax: 100,
      chronologicalAgeMonths: 60,
    });
    expect(r.delay).toBe(true);
    expect(r.severity).toBe('severe');
    expect(r.recommendations).toContain('تقييم سمع فوري');
    expect(r.recommendations).toContain('جلسات علاج نطق مكثفة');
    expect(r.recommendations).toContain('برنامج تحفيز لغوي');
  });

  test('mild delay when expressive lag 6-12', () => {
    const r = assessLanguageDevelopment({
      receptiveScore: 80,
      expressiveScore: 70,
      receptiveMax: 100,
      expressiveMax: 100,
      chronologicalAgeMonths: 36,
    });
    expect(r.expressiveDelay).toBe(11);
    expect(r.severity).toBe('mild');
  });
});

// ========================================
// trackBeneficiaryProgress
// ========================================
describe('trackBeneficiaryProgress', () => {
  test('empty returns insufficient_data', () => {
    const r = trackBeneficiaryProgress([]);
    expect(r.progressRate).toBe(0);
    expect(r.trend).toBe('insufficient_data');
    expect(r.byDomain).toEqual({});
    expect(r.projected).toBeNull();
  });

  test('single session returns insufficient_data', () => {
    const r = trackBeneficiaryProgress([{ sessionDate: '2024-01-01', score: 50, maxScore: 100 }]);
    expect(r.trend).toBe('insufficient_data');
  });

  test('improving trend with 3+ sessions', () => {
    const sessions = [
      { sessionDate: '2024-01-01', score: 30, maxScore: 100, domain: 'motor' },
      { sessionDate: '2024-02-01', score: 50, maxScore: 100, domain: 'motor' },
      { sessionDate: '2024-03-01', score: 70, maxScore: 100, domain: 'motor' },
    ];
    const r = trackBeneficiaryProgress(sessions);
    expect(r.progressRate).toBe(40);
    expect(r.trend).toBe('improving');
    expect(r.firstScore).toBe(30);
    expect(r.lastScore).toBe(70);
    expect(r.totalSessions).toBe(3);
    expect(r.isOnTarget).toBe(true);
    expect(r.projected).toBeDefined();
    expect(r.byDomain.motor).toBeDefined();
    expect(r.byDomain.motor.length).toBe(3);
  });

  test('declining trend', () => {
    const sessions = [
      { sessionDate: '2024-01-01', score: 70, maxScore: 100 },
      { sessionDate: '2024-02-01', score: 50, maxScore: 100 },
      { sessionDate: '2024-03-01', score: 30, maxScore: 100 },
    ];
    const r = trackBeneficiaryProgress(sessions);
    expect(r.progressRate).toBe(-40);
    expect(r.trend).toBe('declining');
    expect(r.isOnTarget).toBe(false);
    expect(r.projected).toBeNull();
  });

  test('stable trend when change <= 5', () => {
    const sessions = [
      { sessionDate: '2024-01-01', score: 50, maxScore: 100 },
      { sessionDate: '2024-02-01', score: 52, maxScore: 100 },
    ];
    const r = trackBeneficiaryProgress(sessions);
    expect(r.trend).toBe('stable');
  });

  test('filters out entries without sessionDate or maxScore', () => {
    const sessions = [
      { score: 30, maxScore: 100 },
      { sessionDate: '2024-01-01', score: 30, maxScore: 0 },
      { sessionDate: '2024-01-01', score: 30, maxScore: 100 },
      { sessionDate: '2024-02-01', score: 60, maxScore: 100 },
    ];
    const r = trackBeneficiaryProgress(sessions);
    expect(r.totalSessions).toBe(2);
  });
});

// ========================================
// compareBeneficiariesProgress
// ========================================
describe('compareBeneficiariesProgress', () => {
  test('empty returns defaults', () => {
    const r = compareBeneficiariesProgress([]);
    expect(r.rankings).toEqual([]);
    expect(r.averageProgress).toBe(0);
    expect(r.topPerformer).toBeNull();
  });

  test('ranks beneficiaries by progress rate', () => {
    const data = [
      {
        id: 'A',
        name: 'Ali',
        sessions: [
          { sessionDate: '2024-01-01', score: 20, maxScore: 100 },
          { sessionDate: '2024-03-01', score: 80, maxScore: 100 },
        ],
      },
      {
        id: 'B',
        name: 'Sara',
        sessions: [
          { sessionDate: '2024-01-01', score: 50, maxScore: 100 },
          { sessionDate: '2024-03-01', score: 55, maxScore: 100 },
        ],
      },
    ];
    const r = compareBeneficiariesProgress(data);
    expect(r.rankings[0].id).toBe('A');
    expect(r.topPerformer.id).toBe('A');
    expect(r.leastProgress.id).toBe('B');
    expect(r.averageProgress).toBeGreaterThan(0);
  });
});

// ========================================
// recommendServices
// ========================================
describe('recommendServices', () => {
  test('null diagnosisType returns empty array', () => {
    expect(recommendServices(null)).toEqual([]);
  });

  test('autism severe returns ABA, speech, OT', () => {
    const r = recommendServices('autism', 'severe', 10);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThanOrEqual(3);
    const services = r.map(s => s.service);
    expect(services).toContain('aba');
    expect(services).toContain('speech');
    expect(services).toContain('ot');
    const aba = r.find(s => s.service === 'aba');
    expect(aba.sessionsPerWeek).toBe(5);
    expect(aba.priority).toBe('high');
  });

  test('cerebral_palsy returns PT, OT, speech', () => {
    const r = recommendServices('cerebral_palsy', 'moderate', 8);
    const services = r.map(s => s.service);
    expect(services).toContain('pt');
    expect(services).toContain('ot');
    expect(services).toContain('speech');
  });

  test('early intervention (age <= 6) adds +1 session', () => {
    const earlyR = recommendServices('autism', 'mild', 3);
    const lateR = recommendServices('autism', 'mild', 10);
    const earlyAba = earlyR.find(s => s.service === 'aba');
    const lateAba = lateR.find(s => s.service === 'aba');
    expect(earlyAba.sessionsPerWeek).toBe(lateAba.sessionsPerWeek + 1);
  });

  test('unknown diagnosis returns psychology fallback', () => {
    const r = recommendServices('unknown_type', 'mild', 10);
    expect(r.length).toBe(1);
    expect(r[0].service).toBe('psychology');
  });

  test('down_syndrome returns speech, PT, special_education', () => {
    const r = recommendServices('down_syndrome', 'moderate', 8);
    const services = r.map(s => s.service);
    expect(services).toContain('speech');
    expect(services).toContain('pt');
    expect(services).toContain('special_education');
  });

  test('results sorted by priority (high first)', () => {
    const r = recommendServices('autism', 'severe', 10);
    const highIdx = r.findIndex(s => s.priority === 'high');
    const medIdx = r.findIndex(s => s.priority === 'medium');
    if (highIdx >= 0 && medIdx >= 0) {
      expect(highIdx).toBeLessThan(medIdx);
    }
  });

  test('each recommendation has rationale', () => {
    const r = recommendServices('cerebral_palsy', 'severe', 5);
    r.forEach(rec => {
      expect(rec).toHaveProperty('rationale');
      expect(typeof rec.rationale).toBe('string');
    });
  });
});

// ========================================
// calculateSessionLoad
// ========================================
describe('calculateSessionLoad', () => {
  test('null returns zeros', () => {
    const r = calculateSessionLoad(null);
    expect(r.totalSessionsPerWeek).toBe(0);
    expect(r.totalMinutesPerWeek).toBe(0);
    expect(r.byService).toEqual({});
    expect(r.isOverloaded).toBe(false);
  });

  test('empty array returns zeros', () => {
    const r = calculateSessionLoad([]);
    expect(r.totalSessionsPerWeek).toBe(0);
  });

  test('calculates totals correctly', () => {
    const services = [
      { service: 'pt', sessionsPerWeek: 3, durationMinutes: 45 },
      { service: 'speech', sessionsPerWeek: 2, durationMinutes: 30 },
    ];
    const r = calculateSessionLoad(services);
    expect(r.totalSessionsPerWeek).toBe(5);
    expect(r.totalMinutesPerWeek).toBe(3 * 45 + 2 * 30);
    expect(r.totalHoursPerWeek).toBe(3.25);
    expect(r.byService.pt.sessions).toBe(3);
    expect(r.byService.pt.weeklyMinutes).toBe(135);
    expect(r.byService.speech.sessions).toBe(2);
    expect(r.isOverloaded).toBe(false);
  });

  test('overloaded when > 15 sessions', () => {
    const services = [
      { service: 'pt', sessionsPerWeek: 8, durationMinutes: 45 },
      { service: 'ot', sessionsPerWeek: 8, durationMinutes: 45 },
    ];
    const r = calculateSessionLoad(services);
    expect(r.totalSessionsPerWeek).toBe(16);
    expect(r.isOverloaded).toBe(true);
  });

  test('overloaded when > 10 hours/week (600 min)', () => {
    const services = [{ service: 'pt', sessionsPerWeek: 10, durationMinutes: 90 }];
    const r = calculateSessionLoad(services);
    expect(r.totalMinutesPerWeek).toBe(900);
    expect(r.isOverloaded).toBe(true);
  });

  test('defaults durationMinutes to 45', () => {
    const services = [{ service: 'pt', sessionsPerWeek: 2 }];
    const r = calculateSessionLoad(services);
    expect(r.totalMinutesPerWeek).toBe(90);
  });

  test('utilizationRate calculated as pct of 15 max', () => {
    const services = [{ service: 'pt', sessionsPerWeek: 3, durationMinutes: 45 }];
    const r = calculateSessionLoad(services);
    expect(r.utilizationRate).toBe(20);
  });
});

// ========================================
// calculateSessionEffectiveness
// ========================================
describe('calculateSessionEffectiveness', () => {
  test('null returns zero with insufficient data message', () => {
    const r = calculateSessionEffectiveness(null);
    expect(r.effectivenessScore).toBe(0);
    expect(r.factors).toEqual([]);
    expect(r.recommendation).toBe('بيانات غير كافية');
  });

  test('perfect session scores 100 (high)', () => {
    const r = calculateSessionEffectiveness({
      participationLevel: 80,
      completedActivities: 10,
      plannedActivities: 10,
      behaviorChallenges: false,
      sessionGoalAchieved: true,
      actualDurationMinutes: 45,
      plannedDurationMinutes: 45,
    });
    expect(r.effectivenessScore).toBe(100);
    expect(r.effectivenessLevel).toBe('high');
    expect(r.completionRate).toBe(100);
  });

  test('low participation reduces score by 15', () => {
    const r = calculateSessionEffectiveness({
      participationLevel: 40,
      completedActivities: 10,
      plannedActivities: 10,
      behaviorChallenges: false,
      sessionGoalAchieved: true,
    });
    expect(r.effectivenessScore).toBe(85);
    expect(r.factors).toEqual(
      expect.arrayContaining([expect.objectContaining({ factor: 'مشاركة متوسطة', impact: -15 })])
    );
  });

  test('very low participation reduces score by 30', () => {
    const r = calculateSessionEffectiveness({
      participationLevel: 20,
      completedActivities: 10,
      plannedActivities: 10,
    });
    expect(r.factors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factor: 'مشاركة منخفضة جداً', impact: -30 }),
      ])
    );
  });

  test('low activity completion reduces score by 20', () => {
    const r = calculateSessionEffectiveness({
      participationLevel: 80,
      completedActivities: 2,
      plannedActivities: 10,
      behaviorChallenges: false,
    });
    expect(r.factors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factor: 'إكمال أنشطة منخفض', impact: -20 }),
      ])
    );
  });

  test('behavior challenges reduces score by 15', () => {
    const r = calculateSessionEffectiveness({
      participationLevel: 80,
      completedActivities: 10,
      plannedActivities: 10,
      behaviorChallenges: true,
    });
    expect(r.factors).toEqual(
      expect.arrayContaining([expect.objectContaining({ factor: 'تحديات سلوكية', impact: -15 })])
    );
    expect(r.effectivenessScore).toBe(85);
  });

  test('failed goal reduces score by 20', () => {
    const r = calculateSessionEffectiveness({
      participationLevel: 80,
      completedActivities: 10,
      plannedActivities: 10,
      sessionGoalAchieved: false,
    });
    expect(r.effectivenessScore).toBe(80);
    expect(r.factors).toEqual(expect.arrayContaining([expect.objectContaining({ impact: -20 })]));
  });

  test('short session reduces score by 10', () => {
    const r = calculateSessionEffectiveness({
      participationLevel: 80,
      completedActivities: 10,
      plannedActivities: 10,
      actualDurationMinutes: 20,
      plannedDurationMinutes: 45,
    });
    expect(r.factors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factor: 'جلسة أقصر من المخطط', impact: -10 }),
      ])
    );
  });

  test('effectivenessLevel categories', () => {
    const r = calculateSessionEffectiveness({
      participationLevel: 40,
      completedActivities: 3,
      plannedActivities: 10,
      behaviorChallenges: false,
    });
    expect(r.effectivenessLevel).toBe('medium');
  });

  test('score clamped to 0 minimum', () => {
    const r = calculateSessionEffectiveness({
      participationLevel: 10,
      completedActivities: 0,
      plannedActivities: 10,
      behaviorChallenges: true,
      sessionGoalAchieved: false,
      actualDurationMinutes: 10,
      plannedDurationMinutes: 60,
    });
    expect(r.effectivenessScore).toBeGreaterThanOrEqual(0);
  });
});

// ========================================
// analyzeSessionPatterns
// ========================================
describe('analyzeSessionPatterns', () => {
  test('empty returns no_data', () => {
    const r = analyzeSessionPatterns([]);
    expect(r.avgEffectiveness).toBe(0);
    expect(r.trend).toBe('no_data');
    expect(r.patterns).toEqual([]);
    expect(r.recommendations).toEqual([]);
  });

  test('sessions without effectivenessScore treated as empty', () => {
    const r = analyzeSessionPatterns([{ date: '2024-01-01' }]);
    expect(r.trend).toBe('no_data');
  });

  test('3+ sessions determines trend', () => {
    const sessions = [
      { date: '2024-01-01', effectivenessScore: 40 },
      { date: '2024-02-01', effectivenessScore: 50 },
      { date: '2024-03-01', effectivenessScore: 60 },
      { date: '2024-04-01', effectivenessScore: 80 },
    ];
    const r = analyzeSessionPatterns(sessions);
    expect(r.trend).toBe('improving');
    expect(r.avgEffectiveness).toBeGreaterThan(0);
    expect(r.totalSessions).toBe(4);
  });

  test('declining trend', () => {
    const sessions = [
      { date: '2024-01-01', effectivenessScore: 80 },
      { date: '2024-02-01', effectivenessScore: 60 },
      { date: '2024-03-01', effectivenessScore: 40 },
      { date: '2024-04-01', effectivenessScore: 30 },
    ];
    const r = analyzeSessionPatterns(sessions);
    expect(r.trend).toBe('declining');
    expect(r.recommendations).toContain('مراجعة عاجلة مع المشرف');
  });

  test('low effectiveness adds review recommendation', () => {
    const sessions = [
      { date: '2024-01-01', effectivenessScore: 30 },
      { date: '2024-02-01', effectivenessScore: 40 },
      { date: '2024-03-01', effectivenessScore: 35 },
    ];
    const r = analyzeSessionPatterns(sessions);
    expect(r.recommendations).toContain('مراجعة أسلوب الجلسة وأنشطتها');
  });

  test('high ratio of low sessions detects pattern', () => {
    const sessions = [
      { date: '2024-01-01', effectivenessScore: 20 },
      { date: '2024-02-01', effectivenessScore: 30 },
      { date: '2024-03-01', effectivenessScore: 25 },
      { date: '2024-04-01', effectivenessScore: 80 },
    ];
    const r = analyzeSessionPatterns(sessions);
    expect(r.patterns).toContain('نسبة عالية من الجلسات ضعيفة الفاعلية');
  });
});

// ========================================
// calculateTherapistCaseload
// ========================================
describe('calculateTherapistCaseload', () => {
  test('empty returns zeros', () => {
    const r = calculateTherapistCaseload([]);
    expect(r.totalCases).toBe(0);
    expect(r.weeklyHours).toBe(0);
    expect(r.caseloadScore).toBe(0);
    expect(r.isOverloaded).toBe(false);
  });

  test('calculates correctly for normal cases', () => {
    const cases = [
      { sessionsPerWeek: 2, complexity: 'medium' },
      { sessionsPerWeek: 3, complexity: 'high' },
    ];
    const r = calculateTherapistCaseload(cases, 35);
    expect(r.totalCases).toBe(2);
    expect(r.totalWeeklySessions).toBe(5);
    expect(r.directHours).toBe(3.75);
    expect(r.documentationHours).toBe(0.94);
    expect(r.weeklyHours).toBe(4.69);
    expect(r.isOverloaded).toBe(false);
    expect(r.status).toBe('light');
  });

  test('high complexity adds to caseloadScore', () => {
    const highCases = Array.from({ length: 20 }, () => ({
      sessionsPerWeek: 3,
      complexity: 'high',
    }));
    const r = calculateTherapistCaseload(highCases, 35);
    expect(r.totalCases).toBe(20);
    expect(r.isOverloaded).toBe(true);
  });

  test('returns status levels based on caseloadScore', () => {
    const light = calculateTherapistCaseload([{ sessionsPerWeek: 1, complexity: 'low' }], 35);
    expect(light.status).toBe('light');

    const heavyCases = Array.from({ length: 30 }, () => ({
      sessionsPerWeek: 2,
      complexity: 'high',
    }));
    const heavy = calculateTherapistCaseload(heavyCases, 30);
    expect(['critical', 'high']).toContain(heavy.status);
  });

  test('default maxHoursPerWeek is 35', () => {
    const cases = [{ sessionsPerWeek: 2, complexity: 'medium' }];
    const r = calculateTherapistCaseload(cases);
    expect(r.utilizationRate).toBeDefined();
  });
});

// ========================================
// calculateInterventionOutcome
// ========================================
describe('calculateInterventionOutcome', () => {
  test('null returns defaults', () => {
    const r = calculateInterventionOutcome(null, null);
    expect(r.rawImprovement).toBe(0);
    expect(r.percentageImprovement).toBe(0);
    expect(r.effectSize).toBeNull();
    expect(r.clinicalSignificance).toBe(false);
    expect(r.isImproved).toBe(false);
  });

  test('improved outcome', () => {
    const r = calculateInterventionOutcome(
      { score: 30, maxScore: 100 },
      { score: 70, maxScore: 100 }
    );
    expect(r.preScore).toBe(30);
    expect(r.postScore).toBe(70);
    expect(r.rawImprovement).toBe(40);
    expect(r.percentageImprovement).toBe(40);
    expect(r.isImproved).toBe(true);
    expect(r.clinicalSignificance).toBe(true);
    expect(r.mcid).toBe(10);
  });

  test('no improvement', () => {
    const r = calculateInterventionOutcome(
      { score: 50, maxScore: 100 },
      { score: 50, maxScore: 100 }
    );
    expect(r.rawImprovement).toBe(0);
    expect(r.isImproved).toBe(false);
    expect(r.clinicalSignificance).toBe(false);
  });

  test('with standardDeviation computes effectSize', () => {
    const r = calculateInterventionOutcome(
      { score: 40, maxScore: 100, standardDeviation: 10 },
      { score: 60, maxScore: 100 }
    );
    expect(r.effectSize).toBe(2);
    expect(r.effectSizeLabel).toBe('large');
  });

  test('effect size labels', () => {
    const small = calculateInterventionOutcome(
      { score: 50, maxScore: 100, standardDeviation: 10 },
      { score: 53, maxScore: 100 }
    );
    expect(small.effectSizeLabel).toBe('small');

    const medium = calculateInterventionOutcome(
      { score: 50, maxScore: 100, standardDeviation: 10 },
      { score: 56, maxScore: 100 }
    );
    expect(medium.effectSizeLabel).toBe('medium');

    const trivial = calculateInterventionOutcome(
      { score: 50, maxScore: 100, standardDeviation: 10 },
      { score: 51, maxScore: 100 }
    );
    expect(trivial.effectSizeLabel).toBe('trivial');
  });

  test('interventionPeriodDays computed from dates', () => {
    const r = calculateInterventionOutcome(
      { score: 30, maxScore: 100, date: '2024-01-01' },
      { score: 60, maxScore: 100, date: '2024-04-01' }
    );
    expect(r.interventionPeriodDays).toBe(91);
  });

  test('interventionPeriodDays null when no dates', () => {
    const r = calculateInterventionOutcome(
      { score: 30, maxScore: 100 },
      { score: 60, maxScore: 100 }
    );
    expect(r.interventionPeriodDays).toBeNull();
  });

  test('custom mcid used', () => {
    const r = calculateInterventionOutcome(
      { score: 50, maxScore: 100, mcid: 20 },
      { score: 65, maxScore: 100 }
    );
    expect(r.mcid).toBe(20);
    expect(r.clinicalSignificance).toBe(false);
  });
});

// ========================================
// evaluateProgramEffectiveness
// ========================================
describe('evaluateProgramEffectiveness', () => {
  test('empty returns defaults', () => {
    const r = evaluateProgramEffectiveness([]);
    expect(r.overallEffectiveness).toBe(0);
    expect(r.byService).toEqual({});
    expect(r.successRate).toBe(0);
    expect(r.totalEvaluated).toBe(0);
  });

  test('evaluates multiple outcomes', () => {
    const outcomes = [
      { pre: { score: 30, maxScore: 100 }, post: { score: 70, maxScore: 100 }, serviceType: 'pt' },
      { pre: { score: 40, maxScore: 100 }, post: { score: 80, maxScore: 100 }, serviceType: 'pt' },
      { pre: { score: 50, maxScore: 100 }, post: { score: 60, maxScore: 100 }, serviceType: 'ot' },
    ];
    const r = evaluateProgramEffectiveness(outcomes);
    expect(r.totalEvaluated).toBe(3);
    expect(r.overallEffectiveness).toBeGreaterThan(0);
    expect(r.byService.pt).toBeDefined();
    expect(r.byService.pt.total).toBe(2);
    expect(r.byService.pt.improved).toBe(2);
    expect(r.byService.ot.total).toBe(1);
    expect(r.successRate).toBeGreaterThan(0);
  });

  test('effectivenessLevel based on successRate', () => {
    const outcomes = [
      { pre: { score: 10, maxScore: 100 }, post: { score: 80, maxScore: 100 }, serviceType: 'pt' },
      { pre: { score: 10, maxScore: 100 }, post: { score: 90, maxScore: 100 }, serviceType: 'pt' },
      { pre: { score: 10, maxScore: 100 }, post: { score: 85, maxScore: 100 }, serviceType: 'pt' },
    ];
    const r = evaluateProgramEffectiveness(outcomes);
    expect(r.successRate).toBe(100);
    expect(r.effectivenessLevel).toBe('excellent');
  });

  test('poor level when low success rate', () => {
    const outcomes = [
      { pre: { score: 50, maxScore: 100 }, post: { score: 52, maxScore: 100 }, serviceType: 'pt' },
      { pre: { score: 50, maxScore: 100 }, post: { score: 51, maxScore: 100 }, serviceType: 'pt' },
    ];
    const r = evaluateProgramEffectiveness(outcomes);
    expect(r.effectivenessLevel).toBe('poor');
  });

  test('skips entries with missing pre/post', () => {
    const outcomes = [
      { pre: { score: 30, maxScore: 100 }, post: null },
      { pre: { score: 30, maxScore: 100 }, post: { score: 70, maxScore: 100 }, serviceType: 'pt' },
    ];
    const r = evaluateProgramEffectiveness(outcomes);
    expect(r.totalEvaluated).toBe(1);
  });
});

// ========================================
// normalizeScore
// ========================================
describe('normalizeScore', () => {
  test('returns 0 for zero maxScore', () => {
    expect(normalizeScore(50, 0)).toBe(0);
  });

  test('returns 0 for negative maxScore', () => {
    expect(normalizeScore(50, -10)).toBe(0);
  });

  test('correctly normalizes', () => {
    expect(normalizeScore(75, 100)).toBe(75);
    expect(normalizeScore(50, 200)).toBe(25);
  });

  test('clamps to 0..maxScore', () => {
    expect(normalizeScore(-10, 100)).toBe(0);
    expect(normalizeScore(150, 100)).toBe(100);
  });

  test('handles null score', () => {
    expect(normalizeScore(null, 100)).toBe(0);
  });
});

// ========================================
// classifyPerformanceLevel
// ========================================
describe('classifyPerformanceLevel', () => {
  test('excellent >= 85', () => {
    expect(classifyPerformanceLevel(90)).toBe('excellent');
    expect(classifyPerformanceLevel(85)).toBe('excellent');
  });

  test('good 70-84', () => {
    expect(classifyPerformanceLevel(75)).toBe('good');
    expect(classifyPerformanceLevel(70)).toBe('good');
  });

  test('average 55-69', () => {
    expect(classifyPerformanceLevel(60)).toBe('average');
    expect(classifyPerformanceLevel(55)).toBe('average');
  });

  test('below_average 40-54', () => {
    expect(classifyPerformanceLevel(45)).toBe('below_average');
    expect(classifyPerformanceLevel(40)).toBe('below_average');
  });

  test('poor < 40', () => {
    expect(classifyPerformanceLevel(30)).toBe('poor');
    expect(classifyPerformanceLevel(0)).toBe('poor');
  });
});

// ========================================
// calculateBeneficiaryProgressIndex
// ========================================
describe('calculateBeneficiaryProgressIndex', () => {
  test('null returns grade F', () => {
    const r = calculateBeneficiaryProgressIndex(null);
    expect(r).toEqual({ overallIndex: 0, grade: 'F', details: {} });
  });

  test('all metrics at 100 gives grade A', () => {
    const r = calculateBeneficiaryProgressIndex({
      goalAchievement: 100,
      sessionAttendance: 100,
      functionalImprovement: 100,
      familyEngagement: 100,
    });
    expect(r.overallIndex).toBe(100);
    expect(r.grade).toBe('A');
    expect(r.details.goalAchievement).toEqual({ score: 100, weight: 0.35 });
    expect(r.details.sessionAttendance).toEqual({ score: 100, weight: 0.25 });
  });

  test('all metrics at 0 gives grade F', () => {
    const r = calculateBeneficiaryProgressIndex({
      goalAchievement: 0,
      sessionAttendance: 0,
      functionalImprovement: 0,
      familyEngagement: 0,
    });
    expect(r.overallIndex).toBe(0);
    expect(r.grade).toBe('F');
  });

  test('partial metrics calculated with available weights', () => {
    const r = calculateBeneficiaryProgressIndex({
      goalAchievement: 80,
      sessionAttendance: 60,
    });
    expect(r.overallIndex).toBeGreaterThan(0);
    expect(r.details).toHaveProperty('goalAchievement');
    expect(r.details).toHaveProperty('sessionAttendance');
    expect(r.details).not.toHaveProperty('functionalImprovement');
  });

  test('grade B at 75-89', () => {
    const r = calculateBeneficiaryProgressIndex({
      goalAchievement: 80,
      sessionAttendance: 80,
      functionalImprovement: 80,
      familyEngagement: 80,
    });
    expect(r.overallIndex).toBe(80);
    expect(r.grade).toBe('B');
  });

  test('grade C at 60-74', () => {
    const r = calculateBeneficiaryProgressIndex({
      goalAchievement: 65,
      sessionAttendance: 65,
      functionalImprovement: 65,
      familyEngagement: 65,
    });
    expect(r.overallIndex).toBe(65);
    expect(r.grade).toBe('C');
  });

  test('grade D at 45-59', () => {
    const r = calculateBeneficiaryProgressIndex({
      goalAchievement: 50,
      sessionAttendance: 50,
      functionalImprovement: 50,
      familyEngagement: 50,
    });
    expect(r.overallIndex).toBe(50);
    expect(r.grade).toBe('D');
  });

  test('scores clamped to 0-100', () => {
    const r = calculateBeneficiaryProgressIndex({
      goalAchievement: 150,
      sessionAttendance: -20,
    });
    expect(r.details.goalAchievement.score).toBe(100);
    expect(r.details.sessionAttendance.score).toBe(0);
  });
});

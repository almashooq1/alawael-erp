'use strict';

const {
  QUALITY_CONSTANTS,
  calculateAttendanceRate,
  calculateSessionCompletionRate,
  calculateGoalAchievementRate,
  calculateOccupancyRate,
  calculateIncidentRate,
  calculateAuditScore,
  classifyAuditFinding,
  calculateIncidentRPN,
  analyzeIncidentTrends,
  calculateSatisfactionScore,
  evaluateComplianceChecklist,
  calculateStaffTurnoverRate,
  calculateDocumentationTimeliness,
  generateQualityDashboard,
  generateCorrectiveActionPlan,
  analyzeQualityTrend,
} = require('../services/quality/qualityCalculations.service');

// ========================================
// CONSTANTS
// ========================================
describe('QUALITY_CONSTANTS', () => {
  test('AUDIT_TYPES محددة', () => {
    expect(QUALITY_CONSTANTS.AUDIT_TYPES.CLINICAL).toBe('clinical');
    expect(QUALITY_CONSTANTS.AUDIT_TYPES.SAFETY).toBe('safety');
    expect(QUALITY_CONSTANTS.AUDIT_TYPES.COMPLIANCE).toBe('compliance');
    expect(QUALITY_CONSTANTS.AUDIT_TYPES.FINANCIAL).toBe('financial');
  });

  test('FINDING_SEVERITY محددة', () => {
    expect(QUALITY_CONSTANTS.FINDING_SEVERITY.CRITICAL).toBe('critical');
    expect(QUALITY_CONSTANTS.FINDING_SEVERITY.MAJOR).toBe('major');
    expect(QUALITY_CONSTANTS.FINDING_SEVERITY.MINOR).toBe('minor');
    expect(QUALITY_CONSTANTS.FINDING_SEVERITY.OBSERVATION).toBe('observation');
  });

  test('BENCHMARKS صحيحة', () => {
    expect(QUALITY_CONSTANTS.BENCHMARKS.APPOINTMENT_ATTENDANCE_RATE).toBe(85);
    expect(QUALITY_CONSTANTS.BENCHMARKS.SESSION_COMPLETION_RATE).toBe(90);
    expect(QUALITY_CONSTANTS.BENCHMARKS.PATIENT_SATISFACTION_SCORE).toBe(4.0);
    expect(QUALITY_CONSTANTS.BENCHMARKS.INCIDENT_RATE_PER_1000).toBe(5);
    expect(QUALITY_CONSTANTS.BENCHMARKS.STAFF_TURNOVER_RATE).toBe(15);
    expect(QUALITY_CONSTANTS.BENCHMARKS.GOAL_ACHIEVEMENT_RATE).toBe(70);
    expect(QUALITY_CONSTANTS.BENCHMARKS.OCCUPANCY_RATE).toBe(80);
  });

  test('RESOLUTION_DEADLINES_HOURS صحيحة', () => {
    expect(QUALITY_CONSTANTS.RESOLUTION_DEADLINES_HOURS.critical).toBe(4);
    expect(QUALITY_CONSTANTS.RESOLUTION_DEADLINES_HOURS.major).toBe(24);
    expect(QUALITY_CONSTANTS.RESOLUTION_DEADLINES_HOURS.minor).toBe(168);
    expect(QUALITY_CONSTANTS.RESOLUTION_DEADLINES_HOURS.observation).toBe(720);
  });

  test('COMPLIANCE_CATEGORIES تشمل الجهات السعودية', () => {
    expect(QUALITY_CONSTANTS.COMPLIANCE_CATEGORIES.MOH).toBe('moh');
    expect(QUALITY_CONSTANTS.COMPLIANCE_CATEGORIES.SCFHS).toBe('scfhs');
    expect(QUALITY_CONSTANTS.COMPLIANCE_CATEGORIES.ZATCA).toBe('zatca');
  });

  test('KPI_CATEGORIES محددة', () => {
    expect(QUALITY_CONSTANTS.KPI_CATEGORIES.CLINICAL_OUTCOMES).toBe('clinical_outcomes');
    expect(QUALITY_CONSTANTS.KPI_CATEGORIES.PATIENT_SATISFACTION).toBe('patient_satisfaction');
    expect(QUALITY_CONSTANTS.KPI_CATEGORIES.SAFETY).toBe('safety');
  });
});

// ========================================
// ATTENDANCE RATE
// ========================================
describe('calculateAttendanceRate', () => {
  test('حساب معدل حضور 90%', () => {
    const r = calculateAttendanceRate(100, 90);
    expect(r.isValid).toBe(true);
    expect(r.rate).toBe(90);
    expect(r.meetsStandard).toBe(true);
    expect(r.missed).toBe(10);
  });

  test('معدل 80% - أقل من المعيار 85%', () => {
    const r = calculateAttendanceRate(100, 80);
    expect(r.meetsStandard).toBe(false);
    expect(r.status).toBe('below_standard');
  });

  test('معدل 85% - يحقق المعيار', () => {
    const r = calculateAttendanceRate(100, 85);
    expect(r.meetsStandard).toBe(true);
    expect(r.status).toBe('acceptable');
  });

  test('صفر مواعيد → isValid false', () => {
    expect(calculateAttendanceRate(0, 0).isValid).toBe(false);
    expect(calculateAttendanceRate(null, 5).isValid).toBe(false);
  });

  test('حضور أكبر من المجدول → isValid false', () => {
    expect(calculateAttendanceRate(50, 60).isValid).toBe(false);
  });

  test('الحضور الكامل 100%', () => {
    const r = calculateAttendanceRate(50, 50);
    expect(r.rate).toBe(100);
    expect(r.missed).toBe(0);
  });

  test('benchmark = 85', () => {
    const r = calculateAttendanceRate(100, 90);
    expect(r.benchmark).toBe(85);
  });
});

// ========================================
// SESSION COMPLETION RATE
// ========================================
describe('calculateSessionCompletionRate', () => {
  test('معدل إكمال 95%', () => {
    const r = calculateSessionCompletionRate(200, 190);
    expect(r.isValid).toBe(true);
    expect(r.rate).toBe(95);
    expect(r.meetsStandard).toBe(true);
    expect(r.incomplete).toBe(10);
  });

  test('معدل 85% - أقل من المعيار 90%', () => {
    const r = calculateSessionCompletionRate(200, 170);
    expect(r.meetsStandard).toBe(false);
  });

  test('صفر جلسات → isValid false', () => {
    expect(calculateSessionCompletionRate(0, 0).isValid).toBe(false);
  });

  test('planned = completed → 100%', () => {
    const r = calculateSessionCompletionRate(50, 50);
    expect(r.rate).toBe(100);
    expect(r.incomplete).toBe(0);
  });
});

// ========================================
// GOAL ACHIEVEMENT RATE
// ========================================
describe('calculateGoalAchievementRate', () => {
  const goals = [
    { status: 'achieved', progressPercentage: 100 },
    { status: 'achieved', progressPercentage: 100 },
    { status: 'in_progress', progressPercentage: 50 },
    { status: 'not_started', progressPercentage: 0 },
    { status: 'not_started', progressPercentage: 0 },
  ];

  test('حساب معدل تحقيق الأهداف', () => {
    const r = calculateGoalAchievementRate(goals);
    expect(r.isValid).toBe(true);
    expect(r.total).toBe(5);
    expect(r.achieved).toBe(2);
    expect(r.inProgress).toBe(1);
    expect(r.achievementRate).toBe(40);
  });

  test('partialRate يشمل قيد التنفيذ بنسبة 50%', () => {
    const r = calculateGoalAchievementRate(goals);
    // (2 + 1*0.5) / 5 * 100 = 50%
    expect(r.partialRate).toBe(50);
  });

  test('أهداف كلها محققة → 100%', () => {
    const r = calculateGoalAchievementRate([
      { status: 'achieved', progressPercentage: 100 },
      { status: 'achieved', progressPercentage: 100 },
    ]);
    expect(r.achievementRate).toBe(100);
    expect(r.meetsStandard).toBe(true);
  });

  test('لا أهداف → isValid false', () => {
    expect(calculateGoalAchievementRate([]).isValid).toBe(false);
    expect(calculateGoalAchievementRate(null).isValid).toBe(false);
  });

  test('meetsStandard صحيح للمعيار 70%', () => {
    const highGoals = Array(10).fill({ status: 'achieved', progressPercentage: 100 });
    const r = calculateGoalAchievementRate(highGoals);
    expect(r.meetsStandard).toBe(true);
  });
});

// ========================================
// OCCUPANCY RATE
// ========================================
describe('calculateOccupancyRate', () => {
  test('إشغال 85% → optimal', () => {
    const r = calculateOccupancyRate(100, 85);
    expect(r.isValid).toBe(true);
    expect(r.rate).toBe(85);
    expect(r.meetsStandard).toBe(true);
    expect(r.efficiency).toBe('optimal');
  });

  test('إشغال 95% → over_capacity_risk', () => {
    const r = calculateOccupancyRate(100, 95);
    expect(r.efficiency).toBe('over_capacity_risk');
  });

  test('إشغال 70% → acceptable', () => {
    const r = calculateOccupancyRate(100, 70);
    expect(r.efficiency).toBe('acceptable');
    expect(r.meetsStandard).toBe(false);
  });

  test('إشغال 50% → under_utilized', () => {
    const r = calculateOccupancyRate(100, 50);
    expect(r.efficiency).toBe('under_utilized');
  });

  test('unused slots صحيح', () => {
    const r = calculateOccupancyRate(100, 80);
    expect(r.unused).toBe(20);
  });

  test('صفر طاقة → isValid false', () => {
    expect(calculateOccupancyRate(0, 0).isValid).toBe(false);
  });

  test('مستخدم أكبر من المتاح → isValid false', () => {
    expect(calculateOccupancyRate(50, 60).isValid).toBe(false);
  });
});

// ========================================
// INCIDENT RATE
// ========================================
describe('calculateIncidentRate', () => {
  test('معدل حوادث 3 لكل 1000 جلسة → meets standard', () => {
    const r = calculateIncidentRate(3, 1000);
    expect(r.isValid).toBe(true);
    expect(r.rate).toBe(3);
    expect(r.meetsStandard).toBe(true);
    expect(r.riskLevel).toBe('acceptable');
  });

  test('معدل 8 لكل 1000 → elevated', () => {
    const r = calculateIncidentRate(8, 1000);
    expect(r.meetsStandard).toBe(false);
    expect(r.riskLevel).toBe('elevated');
  });

  test('معدل 12 لكل 1000 → high', () => {
    const r = calculateIncidentRate(12, 1000);
    expect(r.riskLevel).toBe('high');
  });

  test('صفر حوادث → none', () => {
    const r = calculateIncidentRate(0, 500);
    expect(r.rate).toBe(0);
    expect(r.riskLevel).toBe('none');
  });

  test('صفر جلسات → isValid false', () => {
    expect(calculateIncidentRate(5, 0).isValid).toBe(false);
  });

  test('حساب دقيق للمعدل', () => {
    // 5 حوادث / 2000 جلسة × 1000 = 2.5
    const r = calculateIncidentRate(5, 2000);
    expect(r.rate).toBe(2.5);
  });
});

// ========================================
// AUDIT SCORE
// ========================================
describe('calculateAuditScore', () => {
  const auditItems = [
    { name: 'سلامة المرضى', weight: 40, score: 90 },
    { name: 'التوثيق', weight: 30, score: 80 },
    { name: 'الكفاءة التشغيلية', weight: 30, score: 70 },
  ];

  test('حساب درجة التدقيق المرجح', () => {
    const r = calculateAuditScore(auditItems);
    expect(r.isValid).toBe(true);
    // 40*90/100 + 30*80/100 + 30*70/100 = 36+24+21 = 81
    expect(r.score).toBe(81);
    expect(r.grade).toBe('B');
    expect(r.gradeAr).toBe('جيد جداً');
    expect(r.passesAudit).toBe(true);
  });

  test('درجة ممتاز ≥ 90', () => {
    const items = [
      { name: 'A', weight: 50, score: 95 },
      { name: 'B', weight: 50, score: 92 },
    ];
    const r = calculateAuditScore(items);
    expect(r.grade).toBe('A');
    expect(r.gradeAr).toBe('ممتاز');
  });

  test('درجة راسب < 60', () => {
    const items = [
      { name: 'A', weight: 50, score: 55 },
      { name: 'B', weight: 50, score: 50 },
    ];
    const r = calculateAuditScore(items);
    expect(r.grade).toBe('F');
    expect(r.passesAudit).toBe(false);
  });

  test('مجموع أوزان ≠ 100 → isValid false', () => {
    const items = [
      { name: 'A', weight: 60, score: 80 },
      { name: 'B', weight: 30, score: 70 },
    ];
    const r = calculateAuditScore(items);
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('100');
  });

  test('عناصر بدون وزن → isValid false', () => {
    const r = calculateAuditScore([{ name: 'A', score: 80 }]);
    expect(r.isValid).toBe(false);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(calculateAuditScore([]).isValid).toBe(false);
    expect(calculateAuditScore(null).isValid).toBe(false);
  });

  test('weightedScore لكل عنصر محسوب', () => {
    const r = calculateAuditScore(auditItems);
    expect(r.items[0].weightedScore).toBe(36); // 90*40/100
  });
});

// ========================================
// CLASSIFY AUDIT FINDING
// ========================================
describe('classifyAuditFinding', () => {
  test('كلمة سلامة → CRITICAL', () => {
    const r = classifyAuditFinding('تهديد سلامة المرضى', 'clinical', 3);
    expect(r.isValid).toBe(true);
    expect(r.severity).toBe(QUALITY_CONSTANTS.FINDING_SEVERITY.CRITICAL);
    expect(r.requiresImmediateAction).toBe(true);
    expect(r.deadlineHours).toBe(4);
  });

  test('كلمة عدم امتثال → MAJOR', () => {
    const r = classifyAuditFinding('عدم امتثال لإجراءات التوثيق', 'administrative', 2);
    expect(r.severity).toBe(QUALITY_CONSTANTS.FINDING_SEVERITY.MAJOR);
    expect(r.deadlineHours).toBe(24);
  });

  test('كلمة تأخير → MINOR', () => {
    const r = classifyAuditFinding('تأخير في إعداد التقارير', 'operational', 1);
    expect(r.severity).toBe(QUALITY_CONSTANTS.FINDING_SEVERITY.MINOR);
    expect(r.deadlineHours).toBe(168);
  });

  test('ملاحظة عامة → OBSERVATION', () => {
    const r = classifyAuditFinding('اقتراح لتطوير بيئة العمل', 'general', 0);
    expect(r.severity).toBe(QUALITY_CONSTANTS.FINDING_SEVERITY.OBSERVATION);
    expect(r.deadlineHours).toBe(720);
    expect(r.requiresImmediateAction).toBe(false);
  });

  test('قوة الأدلة صحيحة', () => {
    expect(classifyAuditFinding('ملاحظة', 'clinical', 0).evidenceStrength).toBe('no_evidence');
    expect(classifyAuditFinding('ملاحظة', 'clinical', 1).evidenceStrength).toBe('weak');
    expect(classifyAuditFinding('ملاحظة', 'clinical', 2).evidenceStrength).toBe('moderate');
    expect(classifyAuditFinding('ملاحظة', 'clinical', 5).evidenceStrength).toBe('strong');
  });

  test('بيانات ناقصة → isValid false', () => {
    expect(classifyAuditFinding(null, 'clinical').isValid).toBe(false);
    expect(classifyAuditFinding('وصف', null).isValid).toBe(false);
  });

  test('الحالة الابتدائية = open', () => {
    const r = classifyAuditFinding('ملاحظة', 'general', 1);
    expect(r.status).toBe(QUALITY_CONSTANTS.FINDING_STATUS.OPEN);
  });
});

// ========================================
// INCIDENT RPN
// ========================================
describe('calculateIncidentRPN', () => {
  test('RPN = 5×4×3 = 60 → low', () => {
    const r = calculateIncidentRPN(5, 4, 3);
    expect(r.isValid).toBe(true);
    expect(r.rpn).toBe(60);
    expect(r.riskLevel).toBe('low');
    expect(r.requiresImmediateAction).toBe(false);
  });

  test('RPN = 10×10×10 = 1000 → critical', () => {
    const r = calculateIncidentRPN(10, 10, 10);
    expect(r.rpn).toBe(1000);
    expect(r.riskLevel).toBe('critical');
    expect(r.requiresImmediateAction).toBe(true);
    expect(r.percentage).toBe(100);
  });

  test('RPN = 7×6×5 = 210 → high', () => {
    const r = calculateIncidentRPN(7, 6, 5);
    expect(r.riskLevel).toBe('high');
  });

  test('RPN = 5×4×4 = 80 → medium', () => {
    const r = calculateIncidentRPN(5, 4, 4);
    expect(r.riskLevel).toBe('medium');
  });

  test('قيمة خارج النطاق 1-10 → isValid false', () => {
    expect(calculateIncidentRPN(0, 5, 5).isValid).toBe(false);
    expect(calculateIncidentRPN(5, 11, 5).isValid).toBe(false);
    expect(calculateIncidentRPN(5, 5, 0).isValid).toBe(false);
  });

  test('التوصية لـ critical', () => {
    const r = calculateIncidentRPN(10, 10, 6);
    expect(r.recommendation).toContain('إيقاف');
  });

  test('riskLevelAr عربي', () => {
    const r = calculateIncidentRPN(3, 3, 3); // 27 → low
    expect(r.riskLevelAr).toBe('منخفض');
  });
});

// ========================================
// INCIDENT TRENDS
// ========================================
describe('analyzeIncidentTrends', () => {
  test('تحليل حوادث بأنواع مختلفة', () => {
    const incidents = [
      { type: 'fall', severity: 2 },
      { type: 'fall', severity: 2 },
      { type: 'medication_error', severity: 3 },
      { type: 'fall', severity: 1 },
      { type: 'near_miss', severity: 1 },
    ];
    const r = analyzeIncidentTrends(incidents, 30);
    expect(r.isValid).toBe(true);
    expect(r.total).toBe(5);
    expect(r.byType.fall).toBe(3);
    expect(r.mostCommonType).toBe('fall');
    expect(r.mostCommonTypeCount).toBe(3);
  });

  test('معدل يومي صحيح', () => {
    const incidents = Array(30).fill({ type: 'fall', severity: 1 });
    const r = analyzeIncidentTrends(incidents, 30);
    expect(r.ratePerDay).toBe(1);
  });

  test('لا حوادث → صفر', () => {
    const r = analyzeIncidentTrends([], 30);
    expect(r.isValid).toBe(true);
    expect(r.total).toBe(0);
  });

  test('null → isValid false', () => {
    const r = analyzeIncidentTrends(null, 30);
    expect(r.isValid).toBe(false);
  });

  test('حوادث حرجة محسوبة', () => {
    const incidents = [
      { type: 'fall', severity: 5 },
      { type: 'fall', severity: 2 },
      { type: 'medication_error', severity: 5 },
    ];
    const r = analyzeIncidentTrends(incidents, 30);
    expect(r.criticalCount).toBe(2); // severity = 5
  });

  test('requiresReview عند وجود حرج', () => {
    const r = analyzeIncidentTrends([{ type: 'fall', severity: 5 }], 30);
    expect(r.requiresReview).toBe(true);
  });

  test('bySeverity صحيح', () => {
    const incidents = [
      { type: 'A', severity: 1 },
      { type: 'B', severity: 1 },
      { type: 'C', severity: 3 },
    ];
    const r = analyzeIncidentTrends(incidents, 30);
    expect(r.bySeverity[1]).toBe(2);
    expect(r.bySeverity[3]).toBe(1);
  });
});

// ========================================
// SATISFACTION SCORE
// ========================================
describe('calculateSatisfactionScore', () => {
  const responses = [
    { score: 5, category: 'clinical' },
    { score: 4, category: 'clinical' },
    { score: 4, category: 'facility' },
    { score: 3, category: 'facility' },
    { score: 5, category: 'staff' },
    { score: 4, category: 'staff' },
    { score: 2, category: 'admin' },
    { score: 5, category: 'admin' },
  ];

  test('حساب متوسط الرضا', () => {
    const r = calculateSatisfactionScore(responses);
    expect(r.isValid).toBe(true);
    expect(r.totalResponses).toBe(8);
    // (5+4+4+3+5+4+2+5)/8 = 32/8 = 4.0
    expect(r.score).toBe(4.0);
    expect(r.meetsStandard).toBe(true);
  });

  test('مستوى excellent ≥ 4.5', () => {
    const r = calculateSatisfactionScore([
      { score: 5, category: 'c' },
      { score: 5, category: 'c' },
      { score: 4, category: 'c' },
    ]);
    // (5+5+4)/3 = 4.67
    expect(r.level).toBe('excellent');
  });

  test('مستوى good 4.0-4.5', () => {
    const r = calculateSatisfactionScore([
      { score: 4, category: 'c' },
      { score: 4, category: 'c' },
    ]);
    expect(r.level).toBe('good');
  });

  test('مستوى poor < 2', () => {
    const r = calculateSatisfactionScore([
      { score: 1, category: 'c' },
      { score: 1, category: 'c' },
    ]);
    expect(r.level).toBe('very_poor');
  });

  test('توزيع الدرجات صحيح', () => {
    const r = calculateSatisfactionScore([
      { score: 5, category: 'c' },
      { score: 4, category: 'c' },
      { score: 3, category: 'c' },
    ]);
    expect(r.distribution[5]).toBe(1);
    expect(r.distribution[4]).toBe(1);
    expect(r.distribution[3]).toBe(1);
    expect(r.distribution[2]).toBe(0);
  });

  test('NPS محسوب', () => {
    const r = calculateSatisfactionScore(responses);
    // promoters (≥4): 5,4,4,5,4,5 = 6, detractors (≤2): 2 = 1
    // NPS = (6-1)/8 * 100 = 62.5 → 63
    expect(r.nps).toBeDefined();
    expect(r.promoters).toBe(6);
    expect(r.detractors).toBe(1);
  });

  test('byCategory محسوب', () => {
    const r = calculateSatisfactionScore(responses);
    expect(r.byCategory.clinical).toBeDefined();
    expect(r.byCategory.facility).toBeDefined();
  });

  test('استجابات فارغة → isValid false', () => {
    expect(calculateSatisfactionScore([]).isValid).toBe(false);
    expect(calculateSatisfactionScore(null).isValid).toBe(false);
  });

  test('استجابات خارج النطاق → isValid false', () => {
    const r = calculateSatisfactionScore([{ score: 0 }, { score: 6 }]);
    expect(r.isValid).toBe(false);
  });
});

// ========================================
// COMPLIANCE CHECKLIST
// ========================================
describe('evaluateComplianceChecklist', () => {
  const checklist = [
    {
      id: '1',
      requirement: 'توثيق الجلسات',
      status: 'compliant',
      category: 'moh',
      isMandatory: true,
    },
    {
      id: '2',
      requirement: 'تراخيص الموظفين',
      status: 'compliant',
      category: 'scfhs',
      isMandatory: true,
    },
    {
      id: '3',
      requirement: 'سجلات الفواتير',
      status: 'partial',
      category: 'zatca',
      isMandatory: true,
    },
    {
      id: '4',
      requirement: 'معدات الطوارئ',
      status: 'non_compliant',
      category: 'moh',
      isMandatory: true,
    },
    {
      id: '5',
      requirement: 'نظام الأرشفة',
      status: 'not_applicable',
      category: 'it',
      isMandatory: false,
    },
  ];

  test('حساب معدل الامتثال', () => {
    const r = evaluateComplianceChecklist(checklist);
    expect(r.isValid).toBe(true);
    expect(r.total).toBe(5);
    expect(r.applicable).toBe(4); // الخامس not_applicable
    expect(r.compliant).toBe(2);
    expect(r.nonCompliant).toBe(1);
    expect(r.partial).toBe(1);
  });

  test('complianceRate محسوب بشكل صحيح', () => {
    const r = evaluateComplianceChecklist(checklist);
    // (2 + 1*0.5) / 4 * 100 = 62.5%
    expect(r.complianceRate).toBe(62.5);
  });

  test('فجوات حرجة للإلزامية غير الممتثلة', () => {
    const r = evaluateComplianceChecklist(checklist);
    expect(r.hasCriticalGaps).toBe(true);
    expect(r.criticalGaps.length).toBe(1);
    expect(r.criticalGaps[0].id).toBe('4');
  });

  test('overallStatus = non_compliant بسبب فجوات حرجة', () => {
    const r = evaluateComplianceChecklist(checklist);
    expect(r.overallStatus).toBe('non_compliant');
  });

  test('كل شيء ممتثل → fully_compliant', () => {
    const perfect = [
      { status: 'compliant', category: 'moh', isMandatory: true },
      { status: 'compliant', category: 'scfhs', isMandatory: true },
    ];
    const r = evaluateComplianceChecklist(perfect);
    expect(r.overallStatus).toBe('fully_compliant');
    expect(r.hasCriticalGaps).toBe(false);
  });

  test('byCategory محسوب', () => {
    const r = evaluateComplianceChecklist(checklist);
    expect(r.byCategory.moh).toBeDefined();
    expect(r.byCategory.moh.total).toBe(2);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(evaluateComplianceChecklist([]).isValid).toBe(false);
    expect(evaluateComplianceChecklist(null).isValid).toBe(false);
  });
});

// ========================================
// STAFF TURNOVER RATE
// ========================================
describe('calculateStaffTurnoverRate', () => {
  test('معدل دوران 10% → meets standard', () => {
    const r = calculateStaffTurnoverRate(100, 100, 10, 12);
    expect(r.isValid).toBe(true);
    expect(r.rate).toBe(10);
    expect(r.meetsStandard).toBe(true);
    expect(r.riskLevel).toBe('acceptable');
  });

  test('معدل 20% → elevated', () => {
    const r = calculateStaffTurnoverRate(100, 100, 20, 12);
    expect(r.meetsStandard).toBe(false);
    expect(r.riskLevel).toBe('elevated');
  });

  test('معدل 30% → high', () => {
    const r = calculateStaffTurnoverRate(100, 100, 30, 12);
    expect(r.riskLevel).toBe('high');
  });

  test('حساب المعدل السنوي (6 أشهر)', () => {
    // 5 انفصال / 100 موظف * 100 = 5% لـ 6 أشهر → 10% سنوياً
    const r = calculateStaffTurnoverRate(100, 100, 5, 6);
    expect(r.annualizedRate).toBe(10);
    expect(r.meetsStandard).toBe(true);
  });

  test('متوسط الموظفين محسوب', () => {
    const r = calculateStaffTurnoverRate(100, 80, 10, 12);
    expect(r.averageHeadcount).toBe(90);
  });

  test('صفر موظفين → isValid false', () => {
    expect(calculateStaffTurnoverRate(0, 100, 5, 12).isValid).toBe(false);
  });
});

// ========================================
// DOCUMENTATION TIMELINESS
// ========================================
describe('calculateDocumentationTimeliness', () => {
  const sessions = [
    // توثيق في الوقت (أقل من 24 ساعة)
    {
      date: '2025-01-10T10:00:00Z',
      endTime: '2025-01-10T10:45:00Z',
      documentedAt: '2025-01-10T14:00:00Z',
    },
    {
      date: '2025-01-11T09:00:00Z',
      endTime: '2025-01-11T09:45:00Z',
      documentedAt: '2025-01-11T20:00:00Z',
    },
    // توثيق متأخر (أكثر من 24 ساعة)
    {
      date: '2025-01-12T10:00:00Z',
      endTime: '2025-01-12T10:45:00Z',
      documentedAt: '2025-01-14T10:00:00Z',
    },
    // بدون توثيق
    { date: '2025-01-13T10:00:00Z', endTime: '2025-01-13T10:45:00Z', documentedAt: null },
  ];

  test('حساب معدل التوثيق في الوقت', () => {
    const r = calculateDocumentationTimeliness(sessions);
    expect(r.isValid).toBe(true);
    expect(r.total).toBe(4);
    expect(r.timely).toBe(2);
    expect(r.late).toBe(1);
    expect(r.missing).toBe(1);
  });

  test('معدل التوقيت = 50%', () => {
    const r = calculateDocumentationTimeliness(sessions);
    expect(r.timelinessRate).toBe(50);
    expect(r.meetsStandard).toBe(false); // < 95%
  });

  test('معدل التوثيق المفقود', () => {
    const r = calculateDocumentationTimeliness(sessions);
    expect(r.missingDocumentationRate).toBe(25); // 1/4
  });

  test('كل الجلسات موثقة في الوقت', () => {
    const timely = [
      {
        date: '2025-01-10T10:00:00Z',
        endTime: '2025-01-10T10:45:00Z',
        documentedAt: '2025-01-10T15:00:00Z',
      },
      {
        date: '2025-01-11T09:00:00Z',
        endTime: '2025-01-11T09:45:00Z',
        documentedAt: '2025-01-11T18:00:00Z',
      },
    ];
    const r = calculateDocumentationTimeliness(timely);
    expect(r.timelinessRate).toBe(100);
    expect(r.meetsStandard).toBe(true);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(calculateDocumentationTimeliness([]).isValid).toBe(false);
    expect(calculateDocumentationTimeliness(null).isValid).toBe(false);
  });
});

// ========================================
// QUALITY DASHBOARD
// ========================================
describe('generateQualityDashboard', () => {
  test('لوحة مؤشرات شاملة', () => {
    const metrics = {
      scheduledAppointments: 100,
      attendedAppointments: 90,
      satisfactionScore: 4.2,
      totalIncidents: 3,
      totalSessions: 1000,
      availableSlots: 100,
      usedSlots: 85,
    };
    const r = generateQualityDashboard(metrics);
    expect(r.isValid).toBe(true);
    expect(r.kpis.length).toBe(4);
    expect(r.summary.totalKPIs).toBe(4);
    expect(r.summary.greenCount).toBeGreaterThan(0);
    expect(r.generatedAt).toBeDefined();
  });

  test('صحة الأداء العام', () => {
    const metrics = {
      scheduledAppointments: 100,
      attendedAppointments: 95,
      satisfactionScore: 4.5,
      totalIncidents: 0,
      totalSessions: 1000,
      availableSlots: 100,
      usedSlots: 82,
    };
    const r = generateQualityDashboard(metrics);
    expect(r.summary.overallHealth).toBe(100); // كل المؤشرات خضراء
    expect(r.summary.healthLevel).toBe('excellent');
  });

  test('مؤشر واحد فقط - حضور', () => {
    const r = generateQualityDashboard({ scheduledAppointments: 100, attendedAppointments: 70 });
    expect(r.kpis.length).toBe(1);
    expect(r.kpis[0].name).toContain('حضور');
  });

  test('null → isValid false', () => {
    expect(generateQualityDashboard(null).isValid).toBe(false);
  });

  test('healthLevel صحيح', () => {
    // 0 من 4 خضراء = 0%
    const metrics = {
      scheduledAppointments: 100,
      attendedAppointments: 50, // أقل من 85%
      satisfactionScore: 2.0, // أقل من 4.0
      totalIncidents: 20,
      totalSessions: 100, // 200 لكل 1000 → high
      availableSlots: 100,
      usedSlots: 30, // 30% → أقل من 80%
    };
    const r = generateQualityDashboard(metrics);
    expect(r.summary.greenCount).toBe(0);
    expect(r.summary.healthLevel).toBe('poor');
  });
});

// ========================================
// CORRECTIVE ACTION PLAN
// ========================================
describe('generateCorrectiveActionPlan', () => {
  const findings = [
    { id: 'F1', description: 'تأخير توثيق', severity: 'minor' },
    { id: 'F2', description: 'عدم امتثال لإجراءات', severity: 'major' },
    { id: 'F3', description: 'خطر سلامة مرضى', severity: 'critical' },
    { id: 'F4', description: 'اقتراح تحسين', severity: 'observation' },
  ];

  test('توليد خطة إجراءات', () => {
    const r = generateCorrectiveActionPlan(findings);
    expect(r.isValid).toBe(true);
    expect(r.total).toBe(4);
    expect(r.criticalActions).toBe(1);
    expect(r.requiresImmediateAttention).toBe(true);
  });

  test('ترتيب حسب الخطورة (critical أولاً)', () => {
    const r = generateCorrectiveActionPlan(findings);
    expect(r.actions[0].severity).toBe('critical');
    expect(r.actions[0].priority).toBe(1);
  });

  test('المسؤول عن critical = center_director', () => {
    const r = generateCorrectiveActionPlan(findings);
    const criticalAction = r.actions.find(a => a.severity === 'critical');
    expect(criticalAction.responsibleRole).toBe('center_director');
  });

  test('المسؤول عن major = quality_manager', () => {
    const r = generateCorrectiveActionPlan(findings);
    const majorAction = r.actions.find(a => a.severity === 'major');
    expect(majorAction.responsibleRole).toBe('quality_manager');
  });

  test('deadlineHours صحيحة', () => {
    const r = generateCorrectiveActionPlan(findings);
    const criticalAction = r.actions.find(a => a.severity === 'critical');
    const majorAction = r.actions.find(a => a.severity === 'major');
    const minorAction = r.actions.find(a => a.severity === 'minor');
    expect(criticalAction.deadlineHours).toBe(4);
    expect(majorAction.deadlineHours).toBe(24);
    expect(minorAction.deadlineHours).toBe(168);
  });

  test('suggestedAction موجود', () => {
    const r = generateCorrectiveActionPlan(findings);
    r.actions.forEach(action => {
      expect(action.suggestedAction).toBeTruthy();
    });
  });

  test('لا نتائج → isValid false', () => {
    expect(generateCorrectiveActionPlan([]).isValid).toBe(false);
    expect(generateCorrectiveActionPlan(null).isValid).toBe(false);
  });

  test('estimatedCompletionDays من أطول مهلة', () => {
    const r = generateCorrectiveActionPlan(findings);
    // observation = 720 ساعة / 24 = 30 يوم
    expect(r.estimatedCompletionDays).toBe(30);
  });
});

// ========================================
// QUALITY TREND
// ========================================
describe('analyzeQualityTrend', () => {
  test('اتجاه تحسن واضح', () => {
    const data = [
      { period: '2024-Q1', score: 70 },
      { period: '2024-Q2', score: 73 },
      { period: '2024-Q3', score: 78 },
      { period: '2024-Q4', score: 85 },
    ];
    const r = analyzeQualityTrend(data);
    expect(r.isValid).toBe(true);
    expect(r.trend).toBe('improving');
    expect(r.isImproving).toBe(true);
    expect(r.requiresAttention).toBe(false);
  });

  test('اتجاه تراجع', () => {
    const data = [
      { period: '2024-Q1', score: 85 },
      { period: '2024-Q2', score: 80 },
      { period: '2024-Q3', score: 73 },
      { period: '2024-Q4', score: 68 },
    ];
    const r = analyzeQualityTrend(data);
    expect(r.trend).toBe('declining');
    expect(r.requiresAttention).toBe(true);
  });

  test('اتجاه مستقر', () => {
    const data = [
      { period: '2024-Q1', score: 80 },
      { period: '2024-Q2', score: 81 },
      { period: '2024-Q3', score: 79 },
      { period: '2024-Q4', score: 80 },
    ];
    const r = analyzeQualityTrend(data);
    expect(r.trend).toBe('stable');
  });

  test('أعلى وأدنى نقطة', () => {
    const data = [{ score: 70 }, { score: 85 }, { score: 75 }, { score: 90 }];
    const r = analyzeQualityTrend(data);
    expect(r.maxScore).toBe(90);
    expect(r.minScore).toBe(70);
    expect(r.volatility).toBe(20);
  });

  test('أحدث نقطة صحيحة', () => {
    const data = [{ score: 70 }, { score: 80 }, { score: 88 }];
    const r = analyzeQualityTrend(data);
    expect(r.latestScore).toBe(88);
  });

  test('المتوسط المتحرك محسوب', () => {
    const data = [{ score: 70 }, { score: 80 }, { score: 90 }, { score: 100 }];
    const r = analyzeQualityTrend(data);
    expect(r.movingAverage.length).toBe(4);
    // المتوسط للفترة الثالثة = (70+80+90)/3 = 80
    expect(r.movingAverage[2]).toBe(80);
  });

  test('فترة واحدة فقط → isValid false', () => {
    expect(analyzeQualityTrend([{ score: 80 }]).isValid).toBe(false);
    expect(analyzeQualityTrend(null).isValid).toBe(false);
    expect(analyzeQualityTrend([]).isValid).toBe(false);
  });

  test('عدد الفترات صحيح', () => {
    const data = [{ score: 70 }, { score: 75 }, { score: 80 }];
    const r = analyzeQualityTrend(data);
    expect(r.periods).toBe(3);
  });

  test('requiresAttention عند آخر نقطة < 70', () => {
    const data = [{ score: 80 }, { score: 75 }, { score: 65 }];
    const r = analyzeQualityTrend(data);
    expect(r.requiresAttention).toBe(true);
  });
});

// ========================================
// INTEGRATION
// ========================================
describe('Integration - دورة ضمان الجودة الكاملة', () => {
  test('من التدقيق إلى خطة التصحيح', () => {
    // 1. حساب درجة التدقيق
    const auditResult = calculateAuditScore([
      { name: 'سلامة المرضى', weight: 50, score: 65 },
      { name: 'التوثيق', weight: 30, score: 80 },
      { name: 'الامتثال', weight: 20, score: 70 },
    ]);
    expect(auditResult.isValid).toBe(true);
    expect(auditResult.passesAudit).toBe(true);

    // 2. تصنيف نتائج التدقيق
    const finding1 = classifyAuditFinding('خطر إجراءات السلامة', 'safety', 3);
    const finding2 = classifyAuditFinding('تأخير في التوثيق', 'admin', 1);
    expect(finding1.severity).toBe('critical');
    expect(finding2.severity).toBe('minor');

    // 3. توليد خطة إجراءات تصحيحية
    const plan = generateCorrectiveActionPlan([
      { id: 'F1', description: 'خطر إجراءات السلامة', severity: finding1.severity },
      { id: 'F2', description: 'تأخير في التوثيق', severity: finding2.severity },
    ]);
    expect(plan.isValid).toBe(true);
    expect(plan.requiresImmediateAttention).toBe(true);
    expect(plan.actions[0].severity).toBe('critical'); // critical أولاً
  });

  test('تقييم KPIs شامل', () => {
    // 1. معدل الحضور
    const attendance = calculateAttendanceRate(200, 180);
    expect(attendance.meetsStandard).toBe(true);

    // 2. معدل الإشغال
    const occupancy = calculateOccupancyRate(200, 165);
    expect(occupancy.rate).toBe(82.5);

    // 3. رضا المستفيدين
    const satisfaction = calculateSatisfactionScore([
      { score: 5, category: 'c' },
      { score: 4, category: 'c' },
      { score: 4, category: 'c' },
      { score: 5, category: 'c' },
    ]);
    expect(satisfaction.meetsStandard).toBe(true);

    // 4. معدل الحوادث
    const incidents = calculateIncidentRate(4, 1000);
    expect(incidents.meetsStandard).toBe(true);

    // 5. لوحة جودة
    const dashboard = generateQualityDashboard({
      scheduledAppointments: 200,
      attendedAppointments: 180,
      satisfactionScore: 4.5,
      totalIncidents: 4,
      totalSessions: 1000,
      availableSlots: 200,
      usedSlots: 165,
    });
    expect(dashboard.summary.greenCount).toBe(4);
    expect(dashboard.summary.overallHealth).toBe(100);
  });

  test('تحليل الامتثال الشامل', () => {
    const checklist = [
      { status: 'compliant', category: 'moh', isMandatory: true },
      { status: 'compliant', category: 'moh', isMandatory: true },
      { status: 'compliant', category: 'scfhs', isMandatory: true },
      { status: 'partial', category: 'zatca', isMandatory: false },
      { status: 'not_applicable', category: 'hrsd', isMandatory: false },
    ];

    const compliance = evaluateComplianceChecklist(checklist);
    expect(compliance.isValid).toBe(true);
    expect(compliance.hasCriticalGaps).toBe(false);
    // (3 + 0.5*1) / 4 = 87.5%
    expect(compliance.complianceRate).toBe(87.5);
    expect(compliance.overallStatus).toBe('substantially_compliant');
  });
});

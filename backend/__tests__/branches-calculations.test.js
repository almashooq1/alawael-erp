/**
 * Branches & Settings Calculations Tests
 * Pure Unit Tests - No DB
 * نظام AlAwael ERP
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
} = require('../services/branches/branchesCalculations.service');

// ========================================
// BRANCH_CONSTANTS
// ========================================
describe('BRANCH_CONSTANTS', () => {
  test('الحد الأدنى لمعدل الاستغلال 60%', () => {
    expect(BRANCH_CONSTANTS.CAPACITY.MIN_UTILIZATION_RATE).toBe(0.6);
  });

  test('الاستغلال الأمثل 80%', () => {
    expect(BRANCH_CONSTANTS.CAPACITY.OPTIMAL_UTILIZATION_RATE).toBe(0.8);
  });

  test('حد التميز 90 نقطة', () => {
    expect(BRANCH_CONSTANTS.PERFORMANCE.EXCELLENT_THRESHOLD).toBe(90);
  });

  test('أقصى فترة انتظار 14 يوم', () => {
    expect(BRANCH_CONSTANTS.BENCHMARK.WAITLIST_MAX_DAYS).toBe(14);
  });

  test('مجموع أوزان KPI = 1', () => {
    const w = BRANCH_CONSTANTS.KPI_WEIGHTS;
    const total =
      w.occupancy + w.satisfaction + w.revenue + w.clinical_outcomes + w.staff_efficiency;
    expect(total).toBeCloseTo(1, 5);
  });
});

// ========================================
// calculateBranchCapacityUtilization
// ========================================
describe('calculateBranchCapacityUtilization', () => {
  test('استغلال مثالي: 80 جلسة من 100', () => {
    const result = calculateBranchCapacityUtilization({
      totalSessions: 80,
      maxCapacity: 100,
    });
    expect(result.utilizationRate).toBe(0.8);
    expect(result.utilizationPercentage).toBe(80);
    expect(result.status).toBe('optimal');
  });

  test('فوق الطاقة: 100 جلسة من 100', () => {
    const result = calculateBranchCapacityUtilization({
      totalSessions: 100,
      maxCapacity: 100,
    });
    expect(result.status).toBe('over_capacity');
    expect(result.utilizationRate).toBe(1);
  });

  test('أقل من الحد الأدنى: 40 جلسة من 100', () => {
    const result = calculateBranchCapacityUtilization({
      totalSessions: 40,
      maxCapacity: 100,
    });
    expect(result.status).toBe('under_utilized');
    expect(result.availableSlots).toBe(60);
  });

  test('حساب الطاقة من المعالجين والغرف', () => {
    // 5 معالجين × 8 جلسات × 22 يوم = 880 جلسة
    // 4 غرف × 13.3 جلسة × 22 يوم ≈ 1173
    // الأقل = 880
    const result = calculateBranchCapacityUtilization({
      totalSessions: 700,
      therapists: 5,
      rooms: 4,
      workingDays: 22,
    });
    expect(result.effectiveCapacity).toBeGreaterThan(0);
    expect(result.utilizationRate).toBeGreaterThan(0);
  });

  test('null → unknown', () => {
    const result = calculateBranchCapacityUtilization(null);
    expect(result.status).toBe('unknown');
    expect(result.utilizationRate).toBe(0);
  });

  test('طاقة صفر → no_capacity', () => {
    const result = calculateBranchCapacityUtilization({
      totalSessions: 10,
      maxCapacity: 0,
      therapists: 0,
      rooms: 0,
    });
    expect(result.status).toBe('no_capacity');
  });

  test('الفتحات المتاحة محسوبة بشكل صحيح', () => {
    const result = calculateBranchCapacityUtilization({
      totalSessions: 60,
      maxCapacity: 100,
    });
    expect(result.availableSlots).toBe(40);
  });
});

// ========================================
// calculateTherapistLoadDistribution
// ========================================
describe('calculateTherapistLoadDistribution', () => {
  test('توزيع متوازن', () => {
    const therapists = [
      { id: 't1', name: 'أحمد', currentSessions: 6, maxSessions: 8 },
      { id: 't2', name: 'فاطمة', currentSessions: 6, maxSessions: 8 },
      { id: 't3', name: 'خالد', currentSessions: 6, maxSessions: 8 },
    ];
    const result = calculateTherapistLoadDistribution(therapists);
    expect(result.overloaded).toHaveLength(0);
    expect(result.balanced).toHaveLength(3);
    expect(result.loadBalanceScore).toBeGreaterThan(80);
  });

  test('معالج مثقل', () => {
    const therapists = [
      { id: 't1', currentSessions: 8, maxSessions: 8 }, // 100% - مثقل
      { id: 't2', currentSessions: 2, maxSessions: 8 }, // 25% - غير مستغل
    ];
    const result = calculateTherapistLoadDistribution(therapists);
    expect(result.overloaded).toHaveLength(1);
    expect(result.underloaded).toHaveLength(1);
  });

  test('مصفوفة فارغة → 100 نقطة توازن', () => {
    const result = calculateTherapistLoadDistribution([]);
    expect(result.loadBalanceScore).toBe(100);
    expect(result.totalTherapists).toBe(0);
  });

  test('متوسط الحمل محسوب', () => {
    const therapists = [
      { id: 't1', currentSessions: 4, maxSessions: 8 }, // 50%
      { id: 't2', currentSessions: 6, maxSessions: 8 }, // 75%
    ];
    const result = calculateTherapistLoadDistribution(therapists);
    expect(result.averageLoad).toBe(63); // (50+75)/2 ≈ 62.5 → 63
  });

  test('يستخدم القيمة الافتراضية للحد الأقصى', () => {
    const therapists = [{ id: 't1', currentSessions: 5 }];
    const result = calculateTherapistLoadDistribution(therapists);
    expect(result.totalTherapists).toBe(1);
    // 5/8 = 62.5% → balanced
    expect(result.balanced).toHaveLength(1);
  });
});

// ========================================
// calculateBranchKPIs
// ========================================
describe('calculateBranchKPIs', () => {
  test('أداء ممتاز: كل المؤشرات عالية', () => {
    const result = calculateBranchKPIs({
      totalSessions: 100,
      completedSessions: 95,
      cancelledSessions: 3,
      noShowSessions: 2,
      totalRevenue: 50000,
      targetRevenue: 50000,
      satisfactionScore: 4.8,
      clinicalGoalsAchieved: 48,
      totalClinicalGoals: 50,
      occupancyRate: 90,
    });
    expect(result.rating).toBe('excellent');
    expect(result.overallScore).toBeGreaterThan(90);
  });

  test('معدل الإلغاء محسوب بدقة', () => {
    const result = calculateBranchKPIs({
      totalSessions: 100,
      completedSessions: 90,
      cancelledSessions: 10,
      noShowSessions: 0,
      targetRevenue: 1,
    });
    expect(result.kpis.cancellationRate).toBe(10);
    expect(result.benchmarkComparison.cancellationVsTarget).toBe('exceeds_target');
  });

  test('بدون جلسات → أصفار', () => {
    const result = calculateBranchKPIs({
      totalSessions: 0,
      completedSessions: 0,
    });
    expect(result.kpis.completionRate).toBe(0);
    expect(result.kpis.cancellationRate).toBe(0);
  });

  test('null → poor rating', () => {
    const result = calculateBranchKPIs(null);
    expect(result.rating).toBe('poor');
    expect(result.overallScore).toBe(0);
  });

  test('إنتاجية الموظفين محسوبة', () => {
    const result = calculateBranchKPIs({
      completedSessions: 80,
      staffCount: 4,
      totalSessions: 100,
    });
    expect(result.kpis.staffProductivity).toBe(20); // 80/4
  });
});

// ========================================
// compareBranchPerformance
// ========================================
describe('compareBranchPerformance', () => {
  const branches = [
    {
      id: 'b1',
      name: 'الرياض',
      metrics: {
        totalSessions: 100,
        completedSessions: 95,
        cancelledSessions: 3,
        noShowSessions: 2,
        totalRevenue: 50000,
        targetRevenue: 50000,
        satisfactionScore: 4.5,
        clinicalGoalsAchieved: 40,
        totalClinicalGoals: 50,
        occupancyRate: 85,
      },
    },
    {
      id: 'b2',
      name: 'جدة',
      metrics: {
        totalSessions: 100,
        completedSessions: 70,
        cancelledSessions: 20,
        noShowSessions: 10,
        totalRevenue: 30000,
        targetRevenue: 50000,
        satisfactionScore: 3.5,
        clinicalGoalsAchieved: 25,
        totalClinicalGoals: 50,
        occupancyRate: 60,
      },
    },
  ];

  test('يرتب الفروع حسب الأداء', () => {
    const result = compareBranchPerformance(branches);
    expect(result.ranked[0].id).toBe('b1');
    expect(result.ranked[1].id).toBe('b2');
    expect(result.ranked[0].rank).toBe(1);
  });

  test('يحدد الأفضل والأسوأ', () => {
    const result = compareBranchPerformance(branches);
    expect(result.best.id).toBe('b1');
    expect(result.worst.id).toBe('b2');
  });

  test('المعدل محسوب', () => {
    const result = compareBranchPerformance(branches);
    expect(result.average).toBeGreaterThan(0);
    expect(result.totalBranches).toBe(2);
  });

  test('مصفوفة فارغة', () => {
    const result = compareBranchPerformance([]);
    expect(result.ranked).toHaveLength(0);
    expect(result.best).toBeNull();
  });
});

// ========================================
// distributeBeneficiariesAcrossBranches
// ========================================
describe('distributeBeneficiariesAcrossBranches', () => {
  test('توزيع متناسب مع الطاقة', () => {
    const branches = [
      { id: 'b1', name: 'الرياض', capacity: 100, currentLoad: 50 }, // 50 متاح
      { id: 'b2', name: 'جدة', capacity: 100, currentLoad: 75 }, // 25 متاح
    ];
    const result = distributeBeneficiariesAcrossBranches(30, branches);
    expect(result).toHaveLength(2);
    const total = result.reduce((s, b) => s + b.allocated, 0);
    expect(total).toBe(30);
    // b1 يجب أن يحصل على أكثر (طاقة أعلى)
    const b1 = result.find(b => b.id === 'b1');
    const b2 = result.find(b => b.id === 'b2');
    expect(b1.allocated).toBeGreaterThan(b2.allocated);
  });

  test('جميع الفروع ممتلئة', () => {
    const branches = [
      { id: 'b1', capacity: 50, currentLoad: 50 },
      { id: 'b2', capacity: 30, currentLoad: 30 },
    ];
    const result = distributeBeneficiariesAcrossBranches(10, branches);
    expect(result.every(b => b.allocated === 0 || b.waitlisted !== undefined)).toBe(true);
  });

  test('قيم فارغة → مصفوفة فارغة', () => {
    expect(distributeBeneficiariesAcrossBranches(0, [])).toHaveLength(0);
    expect(distributeBeneficiariesAcrossBranches(10, [])).toHaveLength(0);
  });

  test('نسبة الاستغلال بعد التوزيع محسوبة', () => {
    const branches = [{ id: 'b1', capacity: 100, currentLoad: 50 }];
    const result = distributeBeneficiariesAcrossBranches(10, branches);
    expect(result[0].utilizationAfter).toBe(60); // (50+10)/100 = 60%
  });
});

// ========================================
// analyzeWaitlist
// ========================================
describe('analyzeWaitlist', () => {
  test('قائمة انتظار مع عاجل وعادي', () => {
    const entries = [
      {
        id: 'w1',
        requestedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        priority: 'urgent',
      },
      {
        id: 'w2',
        requestedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        priority: 'normal',
      },
      {
        id: 'w3',
        requestedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        priority: 'high',
      },
    ];
    const result = analyzeWaitlist(entries, { dailyAvailableSlots: 3 });
    expect(result.totalWaiting).toBe(3);
    expect(result.urgentCount).toBe(2); // urgent + high
    expect(result.entries[0].priority).toBe('urgent'); // مرتب
  });

  test('تحديد المتأخرين (أكثر من 14 يوم)', () => {
    const entries = [
      {
        id: 'w1',
        requestedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        priority: 'normal',
      },
      {
        id: 'w2',
        requestedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        priority: 'normal',
      },
    ];
    const result = analyzeWaitlist(entries);
    expect(result.overdueCount).toBe(1);
    expect(result.overduePercentage).toBe(50);
  });

  test('تقدير تاريخ التصفية', () => {
    const entries = Array(10).fill({
      id: 'w1',
      requestedAt: new Date().toISOString(),
      priority: 'normal',
    });
    const result = analyzeWaitlist(entries, { dailyAvailableSlots: 2 });
    expect(result.estimatedDaysToCleared).toBe(5); // 10/2 = 5
    expect(result.estimatedClearanceDate).toBeDefined();
  });

  test('قائمة فارغة → أصفار', () => {
    const result = analyzeWaitlist([]);
    expect(result.totalWaiting).toBe(0);
    expect(result.urgentCount).toBe(0);
    expect(result.estimatedClearanceDate).toBeNull();
  });
});

// ========================================
// validateBranchSettings
// ========================================
describe('validateBranchSettings', () => {
  test('إعدادات مكتملة → نقاط عالية', () => {
    const settings = {
      name: 'فرع الرياض',
      address: 'شارع العليا',
      phone: '0112345678',
      managerName: 'أحمد العمري',
      operatingHours: '08:00-17:00',
      capacity: 50,
      email: 'riyadh@center.sa',
      licenseNumber: 'LIC-2024-001',
      insuranceContracts: ['BUPA', 'TAWUNIYA'],
      emergencyContact: '0501234567',
    };
    const result = validateBranchSettings(settings);
    expect(result.completenessScore).toBe(100);
    expect(result.isComplete).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.status).toBe('complete');
  });

  test('إعدادات ناقصة → مشاكل', () => {
    const settings = {
      name: 'فرع جدة',
      // مفقود: address, phone, managerName, operatingHours, capacity
    };
    const result = validateBranchSettings(settings);
    expect(result.isComplete).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  test('null → نقاط صفر', () => {
    const result = validateBranchSettings(null);
    expect(result.completenessScore).toBe(0);
    expect(result.isComplete).toBe(false);
  });

  test('الحقول المطلوبة فقط → mostly_complete', () => {
    const settings = {
      name: 'فرع',
      address: 'عنوان',
      phone: '011',
      managerName: 'مدير',
      operatingHours: '08-17',
      capacity: 30,
    };
    const result = validateBranchSettings(settings);
    expect(result.isComplete).toBe(true);
    expect(['mostly_complete', 'complete']).toContain(result.status);
  });
});

// ========================================
// calculateSystemSettingsScore
// ========================================
describe('calculateSystemSettingsScore', () => {
  test('جميع الإعدادات مفعلة → ممتاز', () => {
    const settings = {
      twoFactorAuth: true,
      backupEnabled: true,
      auditLogging: true,
      sessionTimeout: true,
      emailNotifications: true,
      smsNotifications: true,
      zatcaIntegration: true,
      gosiIntegration: true,
      dataEncryption: true,
    };
    const result = calculateSystemSettingsScore(settings);
    expect(result.score).toBe(100);
    expect(result.level).toBe('excellent');
    expect(result.recommendations).toHaveLength(0);
  });

  test('إعدادات الأمان مفعلة فقط → partial score', () => {
    const settings = {
      twoFactorAuth: true,
      backupEnabled: true,
      zatcaIntegration: true,
    };
    const result = calculateSystemSettingsScore(settings);
    expect(result.score).toBe(45); // 15+15+15
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  test('null → critical', () => {
    const result = calculateSystemSettingsScore(null);
    expect(result.score).toBe(0);
    expect(result.level).toBe('critical');
  });

  test('التوصيات مرتبة حسب الأولوية', () => {
    const settings = {};
    const result = calculateSystemSettingsScore(settings);
    const firstPriority = result.recommendations[0]?.priority;
    expect(firstPriority).toBe('high');
  });
});

// ========================================
// calculateBranchRevenueProjection
// ========================================
describe('calculateBranchRevenueProjection', () => {
  test('حساب توقعات الإيرادات', () => {
    const result = calculateBranchRevenueProjection({
      therapists: 5,
      averageSessionFee: 400,
      workingDaysPerMonth: 22,
      targetUtilization: 0.8,
    });
    // 5 × 8 × 22 = 880 جلسة × 0.8 = 704 × 400 = 281600
    expect(result.projectedRevenue).toBe(281600);
    expect(result.minimumRevenue).toBeLessThan(result.projectedRevenue);
    expect(result.maximumRevenue).toBeGreaterThan(result.projectedRevenue);
  });

  test('مع التكاليف الثابتة → breakeven', () => {
    const result = calculateBranchRevenueProjection({
      therapists: 3,
      averageSessionFee: 300,
      fixedCosts: 30000,
    });
    expect(result.breakEvenSessions).toBe(100); // 30000/300
  });

  test('null → أصفار', () => {
    const result = calculateBranchRevenueProjection(null);
    expect(result.projected).toBe(0);
  });

  test('إيرادات دنيا أقل من المتوقعة', () => {
    const result = calculateBranchRevenueProjection({
      therapists: 4,
      averageSessionFee: 350,
    });
    expect(result.minimumRevenue).toBeLessThan(result.projectedRevenue);
    expect(result.projectedSessions).toBeGreaterThan(0);
  });
});

// ========================================
// analyzeBranchRevenueVsTarget
// ========================================
describe('analyzeBranchRevenueVsTarget', () => {
  test('تحقيق الهدف 100%', () => {
    const branches = [
      { id: 'b1', name: 'الرياض', actualRevenue: 100000, targetRevenue: 100000 },
      { id: 'b2', name: 'جدة', actualRevenue: 80000, targetRevenue: 100000 },
    ];
    const result = analyzeBranchRevenueVsTarget(branches);
    expect(result.totalActual).toBe(180000);
    expect(result.totalTarget).toBe(200000);
    expect(result.achievementRate).toBe(90);
  });

  test('الأفضل والأسوأ أداءً', () => {
    const branches = [
      { id: 'b1', name: 'الرياض', actualRevenue: 120000, targetRevenue: 100000 },
      { id: 'b2', name: 'جدة', actualRevenue: 60000, targetRevenue: 100000 },
    ];
    const result = analyzeBranchRevenueVsTarget(branches);
    expect(result.topPerformer.id).toBe('b1');
    expect(result.bottomPerformer.id).toBe('b2');
    expect(result.topPerformer.status).toBe('achieved');
    expect(result.bottomPerformer.status).toBe('below_target');
  });

  test('فروع فارغة → أصفار', () => {
    const result = analyzeBranchRevenueVsTarget([]);
    expect(result.totalActual).toBe(0);
    expect(result.achievementRate).toBe(0);
  });

  test('حساب الفجوة (variance)', () => {
    const branches = [{ id: 'b1', actualRevenue: 80000, targetRevenue: 100000 }];
    const result = analyzeBranchRevenueVsTarget(branches);
    expect(result.variance).toBe(-20000);
  });
});

// ========================================
// analyzeOperatingHours
// ========================================
describe('analyzeOperatingHours', () => {
  test('8 ساعات عمل يومياً', () => {
    const result = analyzeOperatingHours({
      openTime: '08:00',
      closeTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
    });
    expect(result.dailyHours).toBe(8);
    expect(result.isValid).toBe(true);
    expect(result.sessionsPerDay).toBeGreaterThan(0);
  });

  test('بدون استراحة → الساعات الكاملة', () => {
    const result = analyzeOperatingHours({
      openTime: '08:00',
      closeTime: '16:00',
    });
    expect(result.dailyHours).toBe(8);
    expect(result.weeklyHours).toBeGreaterThan(0);
    expect(result.monthlyHours).toBeGreaterThan(0);
  });

  test('وقت إغلاق قبل الفتح → خطأ', () => {
    const result = analyzeOperatingHours({
      openTime: '17:00',
      closeTime: '08:00',
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('بدون بيانات → غير صالح', () => {
    const result = analyzeOperatingHours(null);
    expect(result.isValid).toBe(false);
    expect(result.dailyHours).toBe(0);
  });

  test('حساب الجلسات في اليوم', () => {
    const result = analyzeOperatingHours({
      openTime: '08:00',
      closeTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
    });
    // 8 ساعات × 60 = 480 دقيقة / 45 دقيقة = 10 جلسات
    expect(result.sessionsPerDay).toBe(10);
  });
});

// ========================================
// calculateBranchHealthScore
// ========================================
describe('calculateBranchHealthScore', () => {
  test('فرع صحي: كل المؤشرات جيدة', () => {
    const result = calculateBranchHealthScore({
      utilizationRate: 0.8,
      satisfactionScore: 4.5,
      cancellationRate: 0.02,
      staffTurnoverRate: 0.05,
      overduePaymentsCount: 2,
      averageWaitlistDays: 7,
    });
    expect(result.healthScore).toBe(100);
    expect(result.status).toBe('healthy');
    expect(result.alerts).toHaveLength(0);
  });

  test('فرع في خطر: رضا منخفض + إلغاءات عالية', () => {
    const result = calculateBranchHealthScore({
      utilizationRate: 0.4,
      satisfactionScore: 2.5,
      cancellationRate: 0.15,
      staffTurnoverRate: 0.3,
      overduePaymentsCount: 15,
      averageWaitlistDays: 20,
    });
    expect(result.healthScore).toBeLessThan(40);
    expect(result.criticalAlerts).toBeGreaterThan(0);
  });

  test('null → critical', () => {
    const result = calculateBranchHealthScore(null);
    expect(result.healthScore).toBe(0);
    expect(result.status).toBe('critical');
  });

  test('التنبيهات مرتبة حسب الخطورة', () => {
    const result = calculateBranchHealthScore({
      utilizationRate: 0.3, // warning
      satisfactionScore: 2.0, // critical
      cancellationRate: 0.15, // critical
    });
    expect(result.alerts[0].severity).toBe('critical');
  });

  test('دوران موظفين عالٍ → تحذير', () => {
    const result = calculateBranchHealthScore({
      utilizationRate: 0.8,
      satisfactionScore: 4.5,
      cancellationRate: 0.02,
      staffTurnoverRate: 0.35,
    });
    const turnoverAlert = result.alerts.find(a => a.type === 'high_turnover');
    expect(turnoverAlert).toBeDefined();
    expect(turnoverAlert.severity).toBe('warning');
  });
});

// ========================================
// Integration Scenarios
// ========================================
describe('Integration Scenarios', () => {
  test('سيناريو: تحليل شامل لفرع الرياض', () => {
    // 1. الطاقة الاستيعابية
    const capacity = calculateBranchCapacityUtilization({
      totalSessions: 660,
      therapists: 5,
      rooms: 6,
      workingDays: 22,
    });
    expect(capacity.status).not.toBe('unknown');

    // 2. KPIs
    const kpis = calculateBranchKPIs({
      totalSessions: 660,
      completedSessions: 620,
      cancelledSessions: 25,
      noShowSessions: 15,
      totalRevenue: 198000,
      targetRevenue: 200000,
      satisfactionScore: 4.3,
      clinicalGoalsAchieved: 75,
      totalClinicalGoals: 85,
      occupancyRate: 75,
    });
    expect(kpis.overallScore).toBeGreaterThan(60);

    // 3. توقعات الإيرادات
    const revenue = calculateBranchRevenueProjection({
      therapists: 5,
      averageSessionFee: 300,
      workingDaysPerMonth: 22,
    });
    expect(revenue.projectedRevenue).toBeGreaterThan(0);

    // 4. نقاط الصحة
    const health = calculateBranchHealthScore({
      utilizationRate: 0.75,
      satisfactionScore: 4.3,
      cancellationRate: 0.04,
      staffTurnoverRate: 0.1,
    });
    expect(health.status).toBe('healthy');
  });

  test('سيناريو: مقارنة 3 فروع وتوزيع مستفيدين جدد', () => {
    const branches = [
      {
        id: 'b1',
        name: 'الرياض',
        metrics: {
          totalSessions: 100,
          completedSessions: 90,
          cancelledSessions: 5,
          noShowSessions: 5,
          totalRevenue: 45000,
          targetRevenue: 50000,
          satisfactionScore: 4.2,
          clinicalGoalsAchieved: 35,
          totalClinicalGoals: 40,
          occupancyRate: 80,
        },
        capacity: 100,
        currentLoad: 80,
      },
      {
        id: 'b2',
        name: 'جدة',
        metrics: {
          totalSessions: 100,
          completedSessions: 75,
          cancelledSessions: 15,
          noShowSessions: 10,
          totalRevenue: 30000,
          targetRevenue: 50000,
          satisfactionScore: 3.8,
          clinicalGoalsAchieved: 28,
          totalClinicalGoals: 40,
          occupancyRate: 65,
        },
        capacity: 100,
        currentLoad: 65,
      },
      {
        id: 'b3',
        name: 'الدمام',
        metrics: {
          totalSessions: 80,
          completedSessions: 72,
          cancelledSessions: 5,
          noShowSessions: 3,
          totalRevenue: 38000,
          targetRevenue: 40000,
          satisfactionScore: 4.6,
          clinicalGoalsAchieved: 32,
          totalClinicalGoals: 36,
          occupancyRate: 88,
        },
        capacity: 80,
        currentLoad: 70,
      },
    ];

    // مقارنة الأداء
    const comparison = compareBranchPerformance(
      branches.map(b => ({ id: b.id, name: b.name, metrics: b.metrics }))
    );
    expect(comparison.ranked).toHaveLength(3);
    expect(comparison.best).toBeDefined();

    // توزيع 30 مستفيد جديد
    const distribution = distributeBeneficiariesAcrossBranches(
      30,
      branches.map(b => ({
        id: b.id,
        name: b.name,
        capacity: b.capacity,
        currentLoad: b.currentLoad,
      }))
    );
    const totalAllocated = distribution.reduce((s, b) => s + b.allocated, 0);
    expect(totalAllocated).toBe(30);
  });

  test('سيناريو: تقييم صحة منظومة الفروع', () => {
    const branches = [
      { id: 'b1', name: 'الرياض', actualRevenue: 200000, targetRevenue: 200000 },
      { id: 'b2', name: 'جدة', actualRevenue: 150000, targetRevenue: 200000 },
      { id: 'b3', name: 'الدمام', actualRevenue: 180000, targetRevenue: 200000 },
    ];

    const revenueAnalysis = analyzeBranchRevenueVsTarget(branches);
    expect(revenueAnalysis.achievementRate).toBeGreaterThan(80);
    expect(revenueAnalysis.topPerformer.id).toBe('b1');

    // التحقق من الإعدادات
    const settingsCheck = validateBranchSettings({
      name: 'مركز الأوائل - الرياض',
      address: 'الرياض، حي العليا',
      phone: '0112345678',
      managerName: 'أحمد المنصوري',
      operatingHours: '08:00-17:00',
      capacity: 60,
      email: 'riyadh@alawael.sa',
      licenseNumber: 'LIC-2024-RYD',
      insuranceContracts: ['BUPA'],
      emergencyContact: '0508765432',
    });
    expect(settingsCheck.isComplete).toBe(true);
  });
});

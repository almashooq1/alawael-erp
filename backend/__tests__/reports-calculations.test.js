'use strict';

const {
  REPORTS_CONSTANTS,
  calculateKPI,
  buildKPIDashboard,
  analyzeTrend,
  comparePeriods,
  calculateIncomeStatement,
  calculateCashFlow,
  calculateAgingAnalysis,
  calculateBeneficiaryStats,
  calculateCapacityUtilization,
  calculateHRStats,
  calculateAttendanceReport,
  compareBranchPerformance,
  buildExecutiveDashboard,
  aggregateByPeriod,
  calculateDistribution,
} = require('../services/reports/reportsCalculations.service');

// ========================================
// CONSTANTS
// ========================================
describe('REPORTS_CONSTANTS', () => {
  test('REPORT_TYPES محددة', () => {
    expect(REPORTS_CONSTANTS.REPORT_TYPES.FINANCIAL).toBe('financial');
    expect(REPORTS_CONSTANTS.REPORT_TYPES.CLINICAL).toBe('clinical');
    expect(REPORTS_CONSTANTS.REPORT_TYPES.HR).toBe('hr');
    expect(REPORTS_CONSTANTS.REPORT_TYPES.EXECUTIVE).toBe('executive');
  });

  test('PERIOD_TYPES محددة', () => {
    expect(REPORTS_CONSTANTS.PERIOD_TYPES.DAILY).toBe('daily');
    expect(REPORTS_CONSTANTS.PERIOD_TYPES.MONTHLY).toBe('monthly');
    expect(REPORTS_CONSTANTS.PERIOD_TYPES.QUARTERLY).toBe('quarterly');
    expect(REPORTS_CONSTANTS.PERIOD_TYPES.ANNUAL).toBe('annual');
  });

  test('KPI_STATUS محددة', () => {
    expect(REPORTS_CONSTANTS.KPI_STATUS.EXCELLENT).toBe('excellent');
    expect(REPORTS_CONSTANTS.KPI_STATUS.GOOD).toBe('good');
    expect(REPORTS_CONSTANTS.KPI_STATUS.ACCEPTABLE).toBe('acceptable');
    expect(REPORTS_CONSTANTS.KPI_STATUS.POOR).toBe('poor');
    expect(REPORTS_CONSTANTS.KPI_STATUS.CRITICAL).toBe('critical');
  });

  test('TREND_DIRECTION محددة', () => {
    expect(REPORTS_CONSTANTS.TREND_DIRECTION.UP).toBe('up');
    expect(REPORTS_CONSTANTS.TREND_DIRECTION.DOWN).toBe('down');
    expect(REPORTS_CONSTANTS.TREND_DIRECTION.STABLE).toBe('stable');
  });

  test('CHART_TYPES و COMPARISON_TYPES محددة', () => {
    expect(REPORTS_CONSTANTS.CHART_TYPES.BAR).toBe('bar');
    expect(REPORTS_CONSTANTS.COMPARISON_TYPES.PERIOD_OVER_PERIOD).toBe('period_over_period');
    expect(REPORTS_CONSTANTS.COMPARISON_TYPES.BRANCH_COMPARISON).toBe('branch_comparison');
  });
});

// ========================================
// KPI CALCULATIONS
// ========================================
describe('calculateKPI', () => {
  test('تحقيق 100% → excellent', () => {
    const r = calculateKPI(100, 100, 'إيرادات الشهر');
    expect(r.isValid).toBe(true);
    expect(r.achievementRate).toBe(100);
    expect(r.status).toBe('excellent');
    expect(r.achieved).toBe(true);
  });

  test('تحقيق 95% → good', () => {
    const r = calculateKPI(95, 100, 'معدل الحضور');
    expect(r.status).toBe('good');
    expect(r.variance).toBe(-5);
    expect(r.variancePct).toBe(-5);
  });

  test('تحقيق 80% → acceptable', () => {
    const r = calculateKPI(80, 100, 'KPI');
    expect(r.status).toBe('acceptable');
    expect(r.achieved).toBe(false);
  });

  test('تحقيق 65% → poor', () => {
    const r = calculateKPI(65, 100, 'KPI');
    expect(r.status).toBe('poor');
  });

  test('تحقيق 50% → critical', () => {
    const r = calculateKPI(50, 100, 'KPI');
    expect(r.status).toBe('critical');
  });

  test('lowerIsBetter: أقل من الهدف = achieved', () => {
    const r = calculateKPI(5, 10, 'معدل الشكاوى', true);
    expect(r.isValid).toBe(true);
    expect(r.achieved).toBe(true);
    expect(r.lowerIsBetter).toBe(true);
  });

  test('lowerIsBetter: أعلى من الهدف → poor', () => {
    const r = calculateKPI(15, 10, 'معدل الغياب', true);
    expect(r.achieved).toBe(false);
  });

  test('هدف صفر → isValid false', () => {
    expect(calculateKPI(100, 0).isValid).toBe(false);
  });

  test('هدف null → isValid false', () => {
    expect(calculateKPI(100, null).isValid).toBe(false);
  });

  test('اسم KPI افتراضي', () => {
    const r = calculateKPI(100, 100);
    expect(r.kpiName).toBe('KPI');
  });
});

// ========================================
// KPI DASHBOARD
// ========================================
describe('buildKPIDashboard', () => {
  const kpiData = [
    { name: 'الإيرادات', actual: 95000, target: 100000 },
    { name: 'الحضور', actual: 92, target: 100 },
    { name: 'جودة الجلسات', actual: 85, target: 100 },
    { name: 'معدل الشكاوى', actual: 3, target: 5, lowerIsBetter: true },
  ];

  test('بناء لوحة KPI', () => {
    const r = buildKPIDashboard(kpiData);
    expect(r.isValid).toBe(true);
    expect(r.totalKPIs).toBe(4);
  });

  test('عدد المؤشرات المحققة', () => {
    const r = buildKPIDashboard(kpiData);
    expect(r.achievedCount).toBeGreaterThanOrEqual(0);
    expect(r.achievementRate).toBeGreaterThanOrEqual(0);
  });

  test('النتيجة الإجمالية محسوبة', () => {
    const r = buildKPIDashboard(kpiData);
    expect(r.overallScore).toBeGreaterThan(0);
    expect(r.overallStatus).toBeDefined();
  });

  test('تجميع حالات KPI', () => {
    const r = buildKPIDashboard(kpiData);
    expect(r.statusCounts).toBeDefined();
    const total = Object.values(r.statusCounts).reduce((a, b) => a + b, 0);
    expect(total).toBe(4);
  });

  test('جميع المؤشرات = 100% → excellent', () => {
    const perfect = [
      { name: 'A', actual: 100, target: 100 },
      { name: 'B', actual: 100, target: 100 },
    ];
    const r = buildKPIDashboard(perfect);
    expect(r.overallStatus).toBe('excellent');
    expect(r.achievementRate).toBe(100);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(buildKPIDashboard([]).isValid).toBe(false);
    expect(buildKPIDashboard(null).isValid).toBe(false);
  });
});

// ========================================
// TREND ANALYSIS
// ========================================
describe('analyzeTrend', () => {
  test('اتجاه تصاعدي', () => {
    const r = analyzeTrend([10, 20, 30, 40, 50]);
    expect(r.isValid).toBe(true);
    expect(r.direction).toBe('up');
    expect(r.isIncreasing).toBe(true);
    expect(r.totalChangePct).toBe(400); // (50-10)/10 * 100
  });

  test('اتجاه تنازلي', () => {
    const r = analyzeTrend([50, 40, 30, 20, 10]);
    expect(r.direction).toBe('down');
    expect(r.isIncreasing).toBe(false);
    expect(r.totalChangePct).toBe(-80);
  });

  test('اتجاه مستقر (تغيير < 2%)', () => {
    const r = analyzeTrend([100, 101, 100, 101, 100]);
    expect(r.direction).toBe('stable');
  });

  test('متوسط وانحراف معياري', () => {
    const r = analyzeTrend([10, 20, 30]);
    expect(r.avg).toBe(20);
    expect(r.min).toBe(10);
    expect(r.max).toBe(30);
    expect(r.stdDev).toBeGreaterThan(0);
  });

  test('دعم كائنات {value}', () => {
    const r = analyzeTrend([{ value: 10 }, { value: 20 }, { value: 30 }]);
    expect(r.isValid).toBe(true);
    expect(r.avg).toBe(20);
  });

  test('نقطة واحدة → isValid false', () => {
    expect(analyzeTrend([10]).isValid).toBe(false);
    expect(analyzeTrend([]).isValid).toBe(false);
    expect(analyzeTrend(null).isValid).toBe(false);
  });

  test('عدد نقاط البيانات محسوب', () => {
    const r = analyzeTrend([1, 2, 3, 4, 5]);
    expect(r.dataPoints).toBe(5);
    expect(r.firstValue).toBe(1);
    expect(r.lastValue).toBe(5);
  });

  test('التقلب (volatility) محسوب', () => {
    const r = analyzeTrend([10, 20, 10, 20, 10]);
    expect(r.volatility).toBeGreaterThan(0);
  });
});

// ========================================
// COMPARE PERIODS
// ========================================
describe('comparePeriods', () => {
  const current = { revenue: 110000, sessions: 520, satisfaction: 88 };
  const previous = { revenue: 100000, sessions: 500, satisfaction: 85 };
  const metrics = ['revenue', 'sessions', 'satisfaction'];

  test('مقارنة فترتين', () => {
    const r = comparePeriods(current, previous, metrics);
    expect(r.isValid).toBe(true);
    expect(r.comparisons).toHaveLength(3);
    expect(r.comparisonType).toBe('period_over_period');
  });

  test('اتجاه الإيرادات تصاعدي', () => {
    const r = comparePeriods(current, previous, metrics);
    const rev = r.comparisons.find(c => c.metric === 'revenue');
    expect(rev.direction).toBe('up');
    expect(rev.changePct).toBe(10); // 10%
    expect(rev.change).toBe(10000);
  });

  test('عدد المحسّنات والمتراجعات', () => {
    const r = comparePeriods(current, previous, metrics);
    expect(r.improved).toBe(3); // كل المقاييس تحسّنت
    expect(r.declined).toBe(0);
  });

  test('تراجع في مقياس', () => {
    const r = comparePeriods({ revenue: 90000 }, { revenue: 100000 }, ['revenue']);
    expect(r.comparisons[0].direction).toBe('down');
    expect(r.comparisons[0].changePct).toBe(-10);
    expect(r.declined).toBe(1);
  });

  test('مقياس مستقر (تغيير < 1%)', () => {
    const r = comparePeriods({ x: 100 }, { x: 100.5 }, ['x']);
    expect(r.comparisons[0].direction).toBe('stable');
    expect(r.stable).toBe(1);
  });

  test('بيانات null → isValid false', () => {
    expect(comparePeriods(null, previous, metrics).isValid).toBe(false);
    expect(comparePeriods(current, null, metrics).isValid).toBe(false);
    expect(comparePeriods(current, previous, []).isValid).toBe(false);
  });
});

// ========================================
// INCOME STATEMENT
// ========================================
describe('calculateIncomeStatement', () => {
  const revenues = [
    { category: 'sessions', amount: 80000 },
    { category: 'assessment', amount: 20000 },
  ];
  const expenses = [
    { category: 'salaries', amount: 60000 },
    { category: 'rent', amount: 10000 },
    { category: 'supplies', amount: 5000 },
  ];

  test('قائمة الدخل', () => {
    const r = calculateIncomeStatement(revenues, expenses);
    expect(r.isValid).toBe(true);
    expect(r.totalRevenue).toBe(100000);
    expect(r.totalExpenses).toBe(75000);
    expect(r.grossProfit).toBe(25000);
    expect(r.profitMargin).toBe(25);
    expect(r.isProfitable).toBe(true);
  });

  test('نسبة المصروفات', () => {
    const r = calculateIncomeStatement(revenues, expenses);
    expect(r.expenseRatio).toBe(75); // 75000/100000
  });

  test('تجميع حسب الفئة', () => {
    const r = calculateIncomeStatement(revenues, expenses);
    expect(r.revenueByCategory.sessions).toBe(80000);
    expect(r.revenueByCategory.assessment).toBe(20000);
    expect(r.expenseByCategory.salaries).toBe(60000);
  });

  test('خسارة → isProfitable false', () => {
    const r = calculateIncomeStatement([{ amount: 50000 }], [{ amount: 70000 }]);
    expect(r.isProfitable).toBe(false);
    expect(r.grossProfit).toBe(-20000);
  });

  test('period محدد', () => {
    const r = calculateIncomeStatement(revenues, expenses, '2025-Q1');
    expect(r.period).toBe('2025-Q1');
  });

  test('null → isValid false', () => {
    expect(calculateIncomeStatement(null, expenses).isValid).toBe(false);
    expect(calculateIncomeStatement(revenues, null).isValid).toBe(false);
  });
});

// ========================================
// CASH FLOW
// ========================================
describe('calculateCashFlow', () => {
  const inflows = [
    { type: 'patient_payment', amount: 50000 },
    { type: 'insurance', amount: 30000 },
  ];
  const outflows = [
    { type: 'salaries', amount: 40000 },
    { type: 'rent', amount: 10000 },
    { type: 'supplies', amount: 5000 },
  ];

  test('حساب التدفق النقدي', () => {
    const r = calculateCashFlow(inflows, outflows);
    expect(r.isValid).toBe(true);
    expect(r.totalInflows).toBe(80000);
    expect(r.totalOutflows).toBe(55000);
    expect(r.netCashFlow).toBe(25000);
    expect(r.isPositive).toBe(true);
  });

  test('نسبة التدفق النقدي', () => {
    const r = calculateCashFlow(inflows, outflows);
    // 80000/55000 = 1.45
    expect(r.cashFlowRatio).toBeCloseTo(145.45, 0);
  });

  test('تجميع حسب النوع', () => {
    const r = calculateCashFlow(inflows, outflows);
    expect(r.inflowByType.patient_payment).toBe(50000);
    expect(r.outflowByType.salaries).toBe(40000);
  });

  test('تدفق سلبي → isPositive false', () => {
    const r = calculateCashFlow([{ amount: 10000 }], [{ amount: 20000 }]);
    expect(r.isPositive).toBe(false);
    expect(r.netCashFlow).toBe(-10000);
  });

  test('null → isValid false', () => {
    expect(calculateCashFlow(null, outflows).isValid).toBe(false);
    expect(calculateCashFlow(inflows, null).isValid).toBe(false);
  });
});

// ========================================
// AGING ANALYSIS
// ========================================
describe('calculateAgingAnalysis', () => {
  // نستخدم تواريخ ثابتة بالنسبة لـ asOfDate
  const asOf = '2025-04-01';
  const invoices = [
    { invoiceDate: '2025-03-25', amount: 5000 }, // 7 أيام → current
    { invoiceDate: '2025-02-20', amount: 3000 }, // ~40 أيام → 31-60
    { invoiceDate: '2025-01-20', amount: 2000 }, // ~70 أيام → 61-90
    { invoiceDate: '2024-12-01', amount: 1000 }, // ~120 أيام → over90
  ];

  test('تحليل عمر الديون', () => {
    const r = calculateAgingAnalysis(invoices, asOf);
    expect(r.isValid).toBe(true);
    expect(r.totalInvoices).toBe(4);
    expect(r.totalOutstanding).toBe(11000);
  });

  test('توزيع الفواتير في الفترات', () => {
    const r = calculateAgingAnalysis(invoices, asOf);
    expect(r.buckets.current.count).toBe(1);
    expect(r.buckets.current.total).toBe(5000);
    expect(r.buckets.over90.count).toBe(1);
    expect(r.buckets.over90.total).toBe(1000);
  });

  test('requiresAction عند وجود over90', () => {
    const r = calculateAgingAnalysis(invoices, asOf);
    expect(r.requiresAction).toBe(true);
    expect(r.criticalAmount).toBe(1000);
  });

  test('لا ديون متأخرة → requiresAction false', () => {
    const r = calculateAgingAnalysis([{ dueDate: '2025-03-30', amount: 5000 }], asOf);
    expect(r.requiresAction).toBe(false);
  });

  test('overdueCount محسوب', () => {
    const r = calculateAgingAnalysis(invoices, asOf);
    expect(r.overdueCount).toBe(3); // 31-60 + 61-90 + over90
  });

  test('نسب الفترات محسوبة', () => {
    const r = calculateAgingAnalysis(invoices, asOf);
    expect(r.buckets.current.pct).toBeGreaterThan(0);
    const totalPct = Object.values(r.buckets).reduce((s, b) => s + b.pct, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(calculateAgingAnalysis([]).isValid).toBe(false);
    expect(calculateAgingAnalysis(null).isValid).toBe(false);
  });
});

// ========================================
// BENEFICIARY STATS
// ========================================
describe('calculateBeneficiaryStats', () => {
  const beneficiaries = [
    { id: '1', status: 'active', disabilityType: 'autism', gender: 'male', age: 5 },
    { id: '2', status: 'active', disabilityType: 'autism', gender: 'female', age: 8 },
    { id: '3', status: 'inactive', disabilityType: 'cp', gender: 'male', age: 15 },
    { id: '4', status: 'waitlist', disabilityType: 'down_syndrome', gender: 'female', age: 3 },
    { id: '5', status: 'active', disabilityType: 'autism', gender: 'male', age: 20 },
  ];

  const sessions = [
    { status: 'completed' },
    { status: 'completed' },
    { status: 'cancelled' },
    { status: 'no_show' },
    { status: 'completed' },
  ];

  test('إحصاءات المستفيدين الأساسية', () => {
    const r = calculateBeneficiaryStats(beneficiaries);
    expect(r.isValid).toBe(true);
    expect(r.total).toBe(5);
    expect(r.active).toBe(3);
    expect(r.inactive).toBe(1);
    expect(r.waitlist).toBe(1);
  });

  test('معدل النشاط', () => {
    const r = calculateBeneficiaryStats(beneficiaries);
    expect(r.activeRate).toBe(60); // 3/5 = 60%
  });

  test('توزيع نوع الإعاقة', () => {
    const r = calculateBeneficiaryStats(beneficiaries);
    expect(r.byDisabilityType.autism).toBe(3);
    expect(r.byDisabilityType.cp).toBe(1);
    expect(r.byDisabilityType.down_syndrome).toBe(1);
  });

  test('توزيع الجنس', () => {
    const r = calculateBeneficiaryStats(beneficiaries);
    expect(r.byGender.male).toBe(3);
    expect(r.byGender.female).toBe(2);
  });

  test('توزيع الأعمار', () => {
    const r = calculateBeneficiaryStats(beneficiaries);
    expect(r.ageGroups['0-3']).toBe(1); // age=3
    expect(r.ageGroups['4-6']).toBe(1); // age=5
    expect(r.ageGroups['7-12']).toBe(1); // age=8
    expect(r.ageGroups['13-18']).toBe(1); // age=15
    expect(r.ageGroups['18+']).toBe(1); // age=20
  });

  test('إحصاءات الجلسات', () => {
    const r = calculateBeneficiaryStats(beneficiaries, sessions);
    expect(r.sessionStats).not.toBeNull();
    expect(r.sessionStats.total).toBe(5);
    expect(r.sessionStats.completed).toBe(3);
    expect(r.sessionStats.cancelled).toBe(1);
    expect(r.sessionStats.noShow).toBe(1);
    expect(r.sessionStats.attendanceRate).toBe(60); // 3/5
  });

  test('بدون جلسات → sessionStats null', () => {
    const r = calculateBeneficiaryStats(beneficiaries);
    expect(r.sessionStats).toBeNull();
  });

  test('null → isValid false', () => {
    expect(calculateBeneficiaryStats(null).isValid).toBe(false);
  });
});

// ========================================
// CAPACITY UTILIZATION
// ========================================
describe('calculateCapacityUtilization', () => {
  test('استخدام مثالي 75-90% → optimal', () => {
    const r = calculateCapacityUtilization(100, 80);
    expect(r.isValid).toBe(true);
    expect(r.utilizationRate).toBe(80);
    expect(r.status).toBe('optimal');
    expect(r.efficiency).toBe('good');
  });

  test('استخدام زائد ≥ 90% → over_utilized', () => {
    const r = calculateCapacityUtilization(100, 95);
    expect(r.status).toBe('over_utilized');
    expect(r.unusedSlots).toBe(5);
  });

  test('استخدام منخفض 50-70% → under_utilized', () => {
    const r = calculateCapacityUtilization(100, 60);
    expect(r.status).toBe('under_utilized');
    expect(r.efficiency).toBe('acceptable');
  });

  test('استخدام منخفض جداً < 50% → critically_low', () => {
    const r = calculateCapacityUtilization(100, 30);
    expect(r.status).toBe('critically_low');
    expect(r.efficiency).toBe('poor');
  });

  test('100% استخدام', () => {
    const r = calculateCapacityUtilization(100, 100);
    expect(r.utilizationRate).toBe(100);
    expect(r.unusedSlots).toBe(0);
  });

  test('استخدام = صفر', () => {
    const r = calculateCapacityUtilization(100, 0);
    expect(r.utilizationRate).toBe(0);
    expect(r.status).toBe('critically_low');
  });

  test('period محدد', () => {
    const r = calculateCapacityUtilization(100, 75, 'يناير 2025');
    expect(r.period).toBe('يناير 2025');
  });

  test('متاح سالب → isValid false', () => {
    expect(calculateCapacityUtilization(-1, 10).isValid).toBe(false);
  });

  test('مستخدم > متاح → isValid false', () => {
    expect(calculateCapacityUtilization(50, 60).isValid).toBe(false);
  });

  test('مستخدم سالب → isValid false', () => {
    expect(calculateCapacityUtilization(100, -5).isValid).toBe(false);
  });
});

// ========================================
// HR STATS
// ========================================
describe('calculateHRStats', () => {
  const employees = [
    {
      id: '1',
      status: 'active',
      isSaudi: true,
      department: 'clinical',
      specialization: 'pt',
      yearsOfExperience: 5,
      basicSalary: 8000,
    },
    {
      id: '2',
      status: 'active',
      isSaudi: true,
      department: 'clinical',
      specialization: 'ot',
      yearsOfExperience: 3,
      basicSalary: 7000,
    },
    {
      id: '3',
      status: 'active',
      isSaudi: false,
      department: 'admin',
      specialization: null,
      yearsOfExperience: 2,
      basicSalary: 6000,
    },
    {
      id: '4',
      status: 'on_leave',
      isSaudi: true,
      department: 'clinical',
      specialization: 'speech',
      yearsOfExperience: 4,
      basicSalary: 7500,
    },
    {
      id: '5',
      status: 'terminated',
      isSaudi: false,
      department: 'admin',
      specialization: null,
      yearsOfExperience: 1,
      basicSalary: 5000,
    },
  ];

  test('إحصاءات الموارد البشرية', () => {
    const r = calculateHRStats(employees);
    expect(r.isValid).toBe(true);
    expect(r.total).toBe(5);
    expect(r.active).toBe(3);
    expect(r.onLeave).toBe(1);
    expect(r.terminated).toBe(1);
  });

  test('نسبة السعودة', () => {
    const r = calculateHRStats(employees);
    expect(r.saudis).toBe(3);
    expect(r.nonSaudis).toBe(2);
    expect(r.saudizationRate).toBe(60); // 3/5 = 60%
    expect(r.meetsSaudizationTarget).toBe(false); // أقل من 70%
    expect(r.saudizationTarget).toBe(70);
  });

  test('توزيع حسب القسم', () => {
    const r = calculateHRStats(employees);
    expect(r.byDepartment.clinical).toBe(3);
    expect(r.byDepartment.admin).toBe(2);
  });

  test('توزيع حسب التخصص', () => {
    const r = calculateHRStats(employees);
    expect(r.bySpecialization.pt).toBe(1);
    expect(r.bySpecialization.ot).toBe(1);
    expect(r.bySpecialization.speech).toBe(1);
  });

  test('متوسط الخبرة', () => {
    const r = calculateHRStats(employees);
    // (5+3+2+4+1)/5 = 15/5 = 3
    expect(r.avgExperience).toBe(3);
  });

  test('متوسط الراتب (للنشطين فقط)', () => {
    const r = calculateHRStats(employees);
    // النشطون: 8000+7000+6000=21000/3=7000
    expect(r.avgSalary).toBe(7000);
  });

  test('يحقق السعودة عند 70%+', () => {
    const r = calculateHRStats([
      { status: 'active', isSaudi: true, department: 'a', basicSalary: 5000 },
      { status: 'active', isSaudi: true, department: 'a', basicSalary: 5000 },
      { status: 'active', isSaudi: true, department: 'a', basicSalary: 5000 },
      { status: 'active', isSaudi: false, department: 'a', basicSalary: 5000 },
    ]);
    expect(r.saudizationRate).toBe(75);
    expect(r.meetsSaudizationTarget).toBe(true);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(calculateHRStats([]).isValid).toBe(false);
    expect(calculateHRStats(null).isValid).toBe(false);
  });
});

// ========================================
// ATTENDANCE REPORT
// ========================================
describe('calculateAttendanceReport', () => {
  const records = [
    { status: 'present', lateMinutes: 0 },
    { status: 'present', lateMinutes: 0 },
    { status: 'present', lateMinutes: 0 },
    { status: 'late', lateMinutes: 15 },
    { status: 'late', lateMinutes: 30 },
    { status: 'absent' },
    { status: 'leave' },
    { status: 'half_day' },
  ];

  test('تقرير الحضور الأساسي', () => {
    const r = calculateAttendanceReport(records, 22);
    expect(r.isValid).toBe(true);
    expect(r.totalRecords).toBe(8);
    expect(r.present).toBe(3);
    expect(r.absent).toBe(1);
    expect(r.late).toBe(2);
    expect(r.onLeave).toBe(1);
    expect(r.halfDay).toBe(1);
    expect(r.workingDays).toBe(22);
  });

  test('معدل الحضور مع نصف اليوم', () => {
    const r = calculateAttendanceReport(records, 22);
    // (3 + 0.5*1) / 8 = 3.5/8 = 43.75%
    expect(r.attendanceRate).toBe(43.75);
  });

  test('معدل الغياب والتأخير', () => {
    const r = calculateAttendanceReport(records, 22);
    expect(r.absenceRate).toBe(12.5); // 1/8
    expect(r.lateRate).toBe(25); // 2/8
  });

  test('إجمالي دقائق التأخير', () => {
    const r = calculateAttendanceReport(records, 22);
    expect(r.totalLateMinutes).toBe(45); // 15+30
    expect(r.avgLateMinutes).toBe(23); // ceil(45/2) = 23 (round(45/2))
  });

  test('حضور مثالي بدون تأخير', () => {
    const r = calculateAttendanceReport(records, 22);
    expect(r.perfectAttendance).toBe(3);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(calculateAttendanceReport([], 22).isValid).toBe(false);
    expect(calculateAttendanceReport(null, 22).isValid).toBe(false);
  });

  test('أيام عمل صفر → isValid false', () => {
    expect(calculateAttendanceReport(records, 0).isValid).toBe(false);
  });
});

// ========================================
// BRANCH COMPARISON
// ========================================
describe('compareBranchPerformance', () => {
  const branches = [
    { branchId: 'B1', branchName: 'الرياض', revenue: 150000, sessions: 500, satisfaction: 90 },
    { branchId: 'B2', branchName: 'جدة', revenue: 120000, sessions: 400, satisfaction: 88 },
    { branchId: 'B3', branchName: 'الدمام', revenue: 100000, sessions: 350, satisfaction: 85 },
  ];
  const metrics = ['revenue', 'sessions', 'satisfaction'];

  test('مقارنة الفروع', () => {
    const r = compareBranchPerformance(branches, metrics);
    expect(r.isValid).toBe(true);
    expect(r.branchCount).toBe(3);
    expect(r.metrics).toEqual(metrics);
  });

  test('الفرع الأول في الترتيب', () => {
    const r = compareBranchPerformance(branches, metrics);
    expect(r.topBranch).not.toBeNull();
    expect(r.topBranch.branchId).toBe('B1'); // أعلى أداء
  });

  test('الترتيب محسوب', () => {
    const r = compareBranchPerformance(branches, metrics);
    const b1 = r.branches.find(b => b.branchId === 'B1');
    expect(b1.rankings.revenue).toBe(1); // الأعلى إيراداً
    expect(b1.rankings.sessions).toBe(1);
  });

  test('الإحصاءات الإجمالية', () => {
    const r = compareBranchPerformance(branches, metrics);
    const revStats = r.overallStats.find(s => s.metric === 'revenue');
    expect(revStats.max).toBe(150000);
    expect(revStats.min).toBe(100000);
    expect(revStats.avg).toBeCloseTo(123333, 0);
  });

  test('آخر فرع في الترتيب', () => {
    const r = compareBranchPerformance(branches, metrics);
    expect(r.bottomBranch).not.toBeNull();
    expect(r.bottomBranch.branchId).toBe('B3');
  });

  test('قائمة فارغة → isValid false', () => {
    expect(compareBranchPerformance([], metrics).isValid).toBe(false);
    expect(compareBranchPerformance(branches, []).isValid).toBe(false);
    expect(compareBranchPerformance(null, metrics).isValid).toBe(false);
  });
});

// ========================================
// EXECUTIVE DASHBOARD
// ========================================
describe('buildExecutiveDashboard', () => {
  const goodData = {
    financials: { revenue: 500000, expenses: 400000, target: 450000 },
    beneficiaries: { total: 200, active: 180, newThisMonth: 15 },
    hr: { totalEmployees: 50, saudizationRate: 75, attendanceRate: 95 },
    operations: { sessionCount: 1200, utilizationRate: 80, qualityScore: 90 },
  };

  test('بناء لوحة التنفيذيين', () => {
    const r = buildExecutiveDashboard(goodData);
    expect(r.isValid).toBe(true);
    expect(r.summary).toBeDefined();
    expect(r.alerts).toBeDefined();
  });

  test('ملخص مالي صحيح', () => {
    const r = buildExecutiveDashboard(goodData);
    expect(r.summary.financial.revenue).toBe(500000);
    expect(r.summary.financial.profit).toBe(100000);
    expect(r.summary.financial.profitMargin).toBeCloseTo(20, 0);
    expect(r.summary.financial.revenueAchievement).toBeCloseTo(111.11, 1);
  });

  test('ملخص المستفيدين', () => {
    const r = buildExecutiveDashboard(goodData);
    expect(r.summary.beneficiaries.total).toBe(200);
    expect(r.summary.beneficiaries.activeRate).toBe(90);
  });

  test('ملخص HR', () => {
    const r = buildExecutiveDashboard(goodData);
    expect(r.summary.hr.totalEmployees).toBe(50);
    expect(r.summary.hr.saudizationRate).toBe(75);
  });

  test('لا تنبيهات عند أداء جيد', () => {
    const r = buildExecutiveDashboard(goodData);
    expect(r.alertCount).toBe(0);
    expect(r.criticalAlerts).toBe(0);
  });

  test('تنبيه هامش ربح منخفض', () => {
    const data = {
      financials: { revenue: 100000, expenses: 95000, target: 120000 },
    };
    const r = buildExecutiveDashboard(data);
    const alert = r.alerts.find(a => a.type === 'financial' && a.severity === 'warning');
    expect(alert).toBeDefined();
    expect(alert.message).toContain('هامش الربح');
  });

  test('تنبيه حرج عند تحقيق إيرادات < 80%', () => {
    const data = {
      financials: { revenue: 60000, expenses: 50000, target: 100000 },
    };
    const r = buildExecutiveDashboard(data);
    const critical = r.alerts.find(a => a.severity === 'critical');
    expect(critical).toBeDefined();
    expect(r.criticalAlerts).toBe(1);
  });

  test('تنبيه سعودة منخفضة', () => {
    const data = { hr: { totalEmployees: 30, saudizationRate: 50, attendanceRate: 90 } };
    const r = buildExecutiveDashboard(data);
    const alert = r.alerts.find(a => a.type === 'hr');
    expect(alert).toBeDefined();
    expect(alert.message).toContain('السعودة');
  });

  test('تنبيه استخدام منخفض', () => {
    const data = { operations: { sessionCount: 500, utilizationRate: 40, qualityScore: 80 } };
    const r = buildExecutiveDashboard(data);
    const alert = r.alerts.find(a => a.type === 'operations');
    expect(alert).toBeDefined();
  });

  test('null → isValid false', () => {
    expect(buildExecutiveDashboard(null).isValid).toBe(false);
    expect(buildExecutiveDashboard('string').isValid).toBe(false);
  });

  test('generatedAt موجود', () => {
    const r = buildExecutiveDashboard(goodData);
    expect(r.generatedAt).toBeDefined();
    expect(new Date(r.generatedAt)).toBeInstanceOf(Date);
  });
});

// ========================================
// AGGREGATE BY PERIOD
// ========================================
describe('aggregateByPeriod', () => {
  const records = [
    { date: '2025-01-05', amount: 1000 },
    { date: '2025-01-15', amount: 2000 },
    { date: '2025-02-10', amount: 1500 },
    { date: '2025-02-20', amount: 500 },
    { date: '2025-03-15', amount: 3000 },
  ];

  test('تجميع شهري', () => {
    const r = aggregateByPeriod(records, 'monthly', 'amount');
    expect(r.isValid).toBe(true);
    expect(r.periodType).toBe('monthly');
    expect(r.periods).toBe(3); // يناير، فبراير، مارس
    expect(r.grandTotal).toBe(8000);
  });

  test('إجمالي كل شهر', () => {
    const r = aggregateByPeriod(records, 'monthly', 'amount');
    const jan = r.data.find(d => d.period === '2025-01');
    const feb = r.data.find(d => d.period === '2025-02');
    const mar = r.data.find(d => d.period === '2025-03');
    expect(jan.total).toBe(3000);
    expect(feb.total).toBe(2000);
    expect(mar.total).toBe(3000);
  });

  test('متوسط الفترة', () => {
    const r = aggregateByPeriod(records, 'monthly', 'amount');
    const jan = r.data.find(d => d.period === '2025-01');
    expect(jan.avg).toBe(1500); // 3000/2
    expect(jan.count).toBe(2);
  });

  test('تجميع سنوي', () => {
    const r = aggregateByPeriod(records, 'annual', 'amount');
    expect(r.periods).toBe(1); // كل السجلات في 2025
    expect(r.data[0].period).toBe('2025');
    expect(r.data[0].total).toBe(8000);
  });

  test('تجميع ربع سنوي', () => {
    const r = aggregateByPeriod(records, 'quarterly', 'amount');
    expect(r.periods).toBeGreaterThan(0);
    expect(r.grandTotal).toBe(8000);
  });

  test('تجميع يومي', () => {
    const r = aggregateByPeriod(records, 'daily', 'amount');
    expect(r.periods).toBe(5); // كل سجل يوم مختلف
  });

  test('min/max لكل فترة', () => {
    const r = aggregateByPeriod(records, 'monthly', 'amount');
    const jan = r.data.find(d => d.period === '2025-01');
    expect(jan.min).toBe(1000);
    expect(jan.max).toBe(2000);
  });

  test('grandAvg محسوب', () => {
    const r = aggregateByPeriod(records, 'monthly', 'amount');
    // (3000+2000+3000)/3 = 2666.67
    expect(r.grandAvg).toBeCloseTo(2666.67, 0);
  });

  test('حقل تاريخ مخصص', () => {
    const data = [{ createdAt: '2025-01-10', value: 100 }];
    const r = aggregateByPeriod(data, 'monthly', 'value', 'createdAt');
    expect(r.isValid).toBe(true);
    expect(r.periods).toBe(1);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(aggregateByPeriod([], 'monthly', 'amount').isValid).toBe(false);
    expect(aggregateByPeriod(null, 'monthly', 'amount').isValid).toBe(false);
  });

  test('حقل قيمة مفقود → isValid false', () => {
    expect(aggregateByPeriod(records, 'monthly', null).isValid).toBe(false);
  });
});

// ========================================
// DISTRIBUTION
// ========================================
describe('calculateDistribution', () => {
  const sessions = [
    { therapist: 'أحمد', service: 'pt', amount: 500 },
    { therapist: 'أحمد', service: 'pt', amount: 700 },
    { therapist: 'سارة', service: 'ot', amount: 400 },
    { therapist: 'سارة', service: 'ot', amount: 600 },
    { therapist: 'خالد', service: 'speech', amount: 300 },
  ];

  test('توزيع حسب عدد', () => {
    const r = calculateDistribution(sessions, 'therapist');
    expect(r.isValid).toBe(true);
    expect(r.groupCount).toBe(3);
    expect(r.total).toBe(5);
  });

  test('توزيع حسب القيمة', () => {
    const r = calculateDistribution(sessions, 'therapist', 'amount');
    const ahmed = r.distribution.find(d => d.label === 'أحمد');
    expect(ahmed.value).toBe(1200); // 500+700
    expect(r.total).toBe(2500);
  });

  test('نسبة مئوية محسوبة', () => {
    const r = calculateDistribution(sessions, 'therapist', 'amount');
    const ahmed = r.distribution.find(d => d.label === 'أحمد');
    expect(ahmed.pct).toBe(48); // 1200/2500 = 48%
    const totalPct = r.distribution.reduce((s, d) => s + d.pct, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  test('ترتيب تنازلي', () => {
    const r = calculateDistribution(sessions, 'therapist', 'amount');
    expect(r.distribution[0].value).toBeGreaterThanOrEqual(r.distribution[1].value);
  });

  test('أعلى وأدنى فئة', () => {
    const r = calculateDistribution(sessions, 'therapist', 'amount');
    expect(r.topCategory.label).toBe('أحمد');
    expect(r.bottomCategory.label).toBe('خالد');
  });

  test('توزيع حسب الخدمة', () => {
    const r = calculateDistribution(sessions, 'service');
    expect(r.distribution.find(d => d.label === 'pt').count).toBe(2);
    expect(r.distribution.find(d => d.label === 'ot').count).toBe(2);
    expect(r.distribution.find(d => d.label === 'speech').count).toBe(1);
  });

  test('عنصر واحد', () => {
    const r = calculateDistribution([{ cat: 'A', val: 100 }], 'cat', 'val');
    expect(r.groupCount).toBe(1);
    expect(r.distribution[0].pct).toBe(100);
  });

  test('قائمة فارغة → isValid false', () => {
    expect(calculateDistribution([], 'therapist').isValid).toBe(false);
    expect(calculateDistribution(null, 'therapist').isValid).toBe(false);
  });

  test('حقل تجميع مفقود → isValid false', () => {
    expect(calculateDistribution(sessions, null).isValid).toBe(false);
  });
});

// ========================================
// INTEGRATION
// ========================================
describe('Integration - تقرير تنفيذي شامل', () => {
  test('من البيانات الخام إلى التقرير الكامل', () => {
    // 1. إحصاءات المستفيدين
    const beneficiaries = [
      { status: 'active', disabilityType: 'autism', gender: 'male', age: 5 },
      { status: 'active', disabilityType: 'autism', gender: 'female', age: 8 },
      { status: 'waitlist', disabilityType: 'cp', gender: 'male', age: 12 },
    ];
    const stats = calculateBeneficiaryStats(beneficiaries);
    expect(stats.active).toBe(2);

    // 2. استخدام الطاقة
    const capacity = calculateCapacityUtilization(100, 75);
    expect(capacity.status).toBe('optimal');

    // 3. قائمة الدخل
    const income = calculateIncomeStatement(
      [{ category: 'sessions', amount: 50000 }],
      [{ category: 'salaries', amount: 35000 }]
    );
    expect(income.isProfitable).toBe(true);
    expect(income.profitMargin).toBe(30);

    // 4. تحليل الاتجاه
    const trend = analyzeTrend([45000, 47000, 50000, 52000]);
    expect(trend.direction).toBe('up');

    // 5. لوحة KPI
    const dashboard = buildKPIDashboard([
      { name: 'الإيرادات', actual: 50000, target: 45000 },
      { name: 'الحضور', actual: 75, target: 100 },
    ]);
    expect(dashboard.achievedCount).toBe(1); // الإيرادات فقط
  });

  test('تقرير مقارنة الفروع مع KPI', () => {
    const branches = [
      { branchId: 'B1', branchName: 'الرياض', revenue: 200000, satisfaction: 92 },
      { branchId: 'B2', branchName: 'جدة', revenue: 150000, satisfaction: 88 },
    ];

    const comparison = compareBranchPerformance(branches, ['revenue', 'satisfaction']);
    expect(comparison.topBranch.branchId).toBe('B1');

    // KPI لأفضل فرع
    const kpi = calculateKPI(200000, 180000, 'إيرادات الرياض');
    expect(kpi.status).toBe('excellent');
    expect(kpi.achieved).toBe(true);
  });

  test('تحليل الديون مع التدفق النقدي', () => {
    const asOf = '2025-04-01';
    const aging = calculateAgingAnalysis(
      [
        { dueDate: '2025-03-30', amount: 10000 },
        { dueDate: '2024-12-01', amount: 5000 }, // أكثر من 90 يوماً قبل 2025-04-01
      ],
      asOf
    );
    expect(aging.requiresAction).toBe(true);

    const cashFlow = calculateCashFlow(
      [{ type: 'collections', amount: 10000 }],
      [{ type: 'expenses', amount: 8000 }]
    );
    expect(cashFlow.isPositive).toBe(true);
  });

  test('تجميع البيانات مع التوزيع', () => {
    const records = [
      { date: '2025-01-10', service: 'pt', amount: 500 },
      { date: '2025-01-20', service: 'ot', amount: 300 },
      { date: '2025-02-15', service: 'pt', amount: 600 },
    ];

    const aggregated = aggregateByPeriod(records, 'monthly', 'amount');
    expect(aggregated.periods).toBe(2);

    const dist = calculateDistribution(records, 'service', 'amount');
    expect(dist.topCategory.label).toBe('pt'); // 500+600=1100 > 300
  });
});

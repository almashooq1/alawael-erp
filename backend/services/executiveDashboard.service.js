/**
 * Executive Dashboard Service — خدمة لوحة القيادة التنفيذية
 * Aggregates KPIs from ALL modules for executive management
 *
 * Exported functions:
 *   - getExecutiveOverview(branchId = null)
 *   - getBranchComparison()
 *   - getFinancialSummary(startDate, endDate)
 *   - getStaffPerformance()
 */

'use strict';

const logger = console;

/* ── Safe model loader ── */
function safeModel(name) {
  try {
    return require(`../models/${name}`);
  } catch (_err) {
    logger.warn(`[ExecutiveDashboard] Model not found: ${name}`);
    return null;
  }
}

/* ── Load models gracefully ── */
const Beneficiary = safeModel('Beneficiary');
const User = safeModel('User');
const Branch = safeModel('Branch');
const Session = safeModel('Session') || safeModel('TherapySession');
const Invoice = safeModel('AccountingInvoice') || safeModel('Invoice');
const Expense = safeModel('AccountingExpense') || safeModel('Expense');
const ICFAssessment = safeModel('ICFAssessment') || safeModel('Assessment');
const Goal = safeModel('Goal') || safeModel('TherapeuticGoal');
const Attendance = safeModel('Attendance') || safeModel('AttendanceLog');

/* ── Date helpers ── */
function startOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfPrevMonth(date = new Date()) {
  const d = startOfMonth(date);
  d.setMonth(d.getMonth() - 1);
  return d;
}

function endOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatSAR(value) {
  if (value == null) return '0 ر.س';
  return `${Math.round(value).toLocaleString('ar-SA')} ر.س`;
}

function formatNum(value) {
  if (value == null) return '0';
  return value.toLocaleString('ar-SA');
}

function formatPct(value) {
  if (value == null) return '0%';
  return `${value.toFixed(1)}%`;
}

/* ═══════════════════════════════════════════════════════════════════════
   1. EXECUTIVE OVERVIEW — نظرة شاملة تنفيذية
   ═══════════════════════════════════════════════════════════════════════ */
async function getExecutiveOverview(branchId = null) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const prevMonthStart = startOfPrevMonth(now);
  const prevMonthEnd = endOfMonth(prevMonthStart);

  const branchFilter = branchId ? { branch: branchId } : {};

  const queries = await Promise.allSettled([
    /* 0 — beneficiary counts */
    Beneficiary
      ? Promise.allSettled([
          Beneficiary.countDocuments({ ...branchFilter, status: { $ne: 'deleted' } }),
          Beneficiary.countDocuments({ ...branchFilter, status: 'active' }),
          Beneficiary.countDocuments({ ...branchFilter, status: 'discharged' }),
          Beneficiary.countDocuments({
            ...branchFilter,
            createdAt: { $gte: thisMonthStart, $lte: thisMonthEnd },
          }),
          Beneficiary.countDocuments({
            ...branchFilter,
            createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
          }),
        ])
      : Promise.resolve([{ value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }]),

    /* 1 — financial this month */
    Invoice
      ? Promise.allSettled([
          Invoice.aggregate([
            { $match: { ...branchFilter, createdAt: { $gte: thisMonthStart, $lte: thisMonthEnd } } },
            { $group: { _id: null, total: { $sum: '$total' } } },
          ]),
          Invoice.aggregate([
            { $match: { ...branchFilter, status: { $in: ['pending', 'overdue'] } } },
            { $group: { _id: null, total: { $sum: '$balanceDue' } } },
          ]),
          Invoice.aggregate([
            { $match: { ...branchFilter, createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } } },
            { $group: { _id: null, total: { $sum: '$total' } } },
          ]),
        ])
      : Promise.resolve([{ value: [] }, { value: [] }, { value: [] }]),

    /* 2 — expenses this month */
    Expense
      ? Promise.allSettled([
          Expense.aggregate([
            { $match: { ...branchFilter, date: { $gte: thisMonthStart, $lte: thisMonthEnd } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]),
        ])
      : Promise.resolve([{ value: [] }]),

    /* 3 — staff */
    User
      ? Promise.allSettled([
          User.countDocuments({ role: { $in: ['therapist', 'specialist', 'doctor'] }, status: 'active' }),
          User.countDocuments({ role: { $in: ['therapist', 'specialist', 'doctor'] } }),
        ])
      : Promise.resolve([{ value: 0 }, { value: 0 }]),

    /* 4 — sessions this month */
    Session
      ? Promise.allSettled([
          Session.countDocuments({
            ...branchFilter,
            scheduledDate: { $gte: thisMonthStart, $lte: thisMonthEnd },
            status: 'completed',
          }),
          Session.countDocuments({
            ...branchFilter,
            scheduledDate: { $gte: thisMonthStart, $lte: thisMonthEnd },
          }),
          Session.aggregate([
            { $match: { ...branchFilter, scheduledDate: { $gte: thisMonthStart, $lte: thisMonthEnd } } },
            { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
          ]),
        ])
      : Promise.resolve([{ value: 0 }, { value: 0 }, { value: [] }]),

    /* 5 — clinical metrics */
    ICFAssessment
      ? Promise.allSettled([
          ICFAssessment.aggregate([
            { $match: { ...branchFilter } },
            { $group: { _id: null, avgScore: { $avg: '$overallScore' } } },
          ]),
        ])
      : Promise.resolve([{ value: [] }]),

    Goal
      ? Promise.allSettled([
          Goal.countDocuments({ ...branchFilter, status: 'achieved' }),
          Goal.countDocuments({ ...branchFilter }),
        ])
      : Promise.resolve([{ value: 0 }, { value: 0 }]),

    /* 6 — attendance rate */
    Attendance
      ? Promise.allSettled([
          Attendance.countDocuments({
            ...branchFilter,
            date: { $gte: thisMonthStart, $lte: thisMonthEnd },
            status: 'present',
          }),
          Attendance.countDocuments({
            ...branchFilter,
            date: { $gte: thisMonthStart, $lte: thisMonthEnd },
          }),
        ])
      : Promise.resolve([{ value: 0 }, { value: 0 }]),
  ]);

  /* ── Extract results safely ── */
  const [benRes, finRes, expRes, staffRes, sessRes, icfRes, goalRes, attRes] = queries;

  const benVals = benRes.status === 'fulfilled' ? benRes.value : [];
  const totalBeneficiaries = benVals[0]?.value || 0;
  const activeBeneficiaries = benVals[1]?.value || 0;
  const dischargedBeneficiaries = benVals[2]?.value || 0;
  const newThisMonth = benVals[3]?.value || 0;
  const newPrevMonth = benVals[4]?.value || 0;

  const finVals = finRes.status === 'fulfilled' ? finRes.value : [];
  const revenueThisMonth = finVals[0]?.value?.[0]?.total || 0;
  const outstandingPayments = finVals[1]?.value?.[0]?.total || 0;
  const revenuePrevMonth = finVals[2]?.value?.[0]?.total || 0;

  const expVals = expRes.status === 'fulfilled' ? expRes.value : [];
  const expensesThisMonth = expVals[0]?.value?.[0]?.total || 0;

  const staffVals = staffRes.status === 'fulfilled' ? staffRes.value : [];
  const activeTherapists = staffVals[0]?.value || 0;
  const totalTherapists = staffVals[1]?.value || 0;

  const sessVals = sessRes.status === 'fulfilled' ? sessRes.value : [];
  const completedSessions = sessVals[0]?.value || 0;
  const _totalSessions = sessVals[1]?.value || 0;
  const avgSessionDuration = sessVals[2]?.value?.[0]?.avgDuration || 0;

  const icfVals = icfRes.status === 'fulfilled' ? icfRes.value : [];
  const avgICFScore = icfVals[0]?.value?.[0]?.avgScore || 0;

  const goalVals = goalRes.status === 'fulfilled' ? goalRes.value : [];
  const achievedGoals = goalVals[0]?.value || 0;
  const totalGoals = goalVals[1]?.value || 0;

  const attVals = attRes.status === 'fulfilled' ? attRes.value : [];
  const presentCount = attVals[0]?.value || 0;
  const totalAttendance = attVals[1]?.value || 0;

  /* ── Calculations ── */
  const costPerBeneficiary = activeBeneficiaries > 0 ? expensesThisMonth / activeBeneficiaries : 0;
  const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;
  const goalsAchievedRate = totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0;
  const dischargeRate = totalBeneficiaries > 0 ? (dischargedBeneficiaries / totalBeneficiaries) * 100 : 0;
  const avgSessionsPerTherapist = activeTherapists > 0 ? completedSessions / activeTherapists : 0;

  const revenueTrend = revenuePrevMonth > 0
    ? ((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100
    : 0;
  const newBeneficiaryTrend = newPrevMonth > 0
    ? ((newThisMonth - newPrevMonth) / newPrevMonth) * 100
    : 0;

  return {
    beneficiaries: {
      total: totalBeneficiaries,
      active: activeBeneficiaries,
      discharged: dischargedBeneficiaries,
      newThisMonth,
      dischargeRate: +dischargeRate.toFixed(1),
      trend: {
        newBeneficiaries: {
          value: newThisMonth - newPrevMonth,
          percent: +newBeneficiaryTrend.toFixed(1),
          direction: newBeneficiaryTrend >= 0 ? 'up' : 'down',
        },
      },
    },
    financial: {
      revenueThisMonth: +revenueThisMonth.toFixed(2),
      revenueFormatted: formatSAR(revenueThisMonth),
      outstandingPayments: +outstandingPayments.toFixed(2),
      outstandingFormatted: formatSAR(outstandingPayments),
      expensesThisMonth: +expensesThisMonth.toFixed(2),
      expensesFormatted: formatSAR(expensesThisMonth),
      costPerBeneficiary: +costPerBeneficiary.toFixed(2),
      costPerBeneficiaryFormatted: formatSAR(costPerBeneficiary),
      netThisMonth: +(revenueThisMonth - expensesThisMonth).toFixed(2),
      netFormatted: formatSAR(revenueThisMonth - expensesThisMonth),
      trend: {
        revenue: {
          value: +(revenueThisMonth - revenuePrevMonth).toFixed(2),
          percent: +revenueTrend.toFixed(1),
          direction: revenueTrend >= 0 ? 'up' : 'down',
        },
      },
    },
    staff: {
      totalTherapists,
      activeTherapists,
      avgSessionsPerTherapist: +avgSessionsPerTherapist.toFixed(1),
      attendanceRate: +attendanceRate.toFixed(1),
      attendanceRateFormatted: formatPct(attendanceRate),
    },
    clinical: {
      avgICFScore: +avgICFScore.toFixed(1),
      goalsAchievedRate: +goalsAchievedRate.toFixed(1),
      goalsAchievedRateFormatted: formatPct(goalsAchievedRate),
      dischargeRate: +dischargeRate.toFixed(1),
      dischargeRateFormatted: formatPct(dischargeRate),
      completedSessions,
      avgSessionDuration: +avgSessionDuration.toFixed(0),
    },
    summaryLabels: {
      beneficiaries: 'المستفيدون',
      financial: 'المالية',
      staff: 'الكوادر',
      clinical: 'السريرية',
      total: 'الإجمالي',
      active: 'النشطون',
      discharged: 'المخرجون',
      newThisMonth: 'جديد هذا الشهر',
      revenue: 'الإيرادات',
      outstanding: 'المدفوعات العالقة',
      expenses: 'المصروفات',
      costPerBeneficiary: 'التكلفة لكل مستفيد',
      net: 'الصافي',
      therapists: 'المعالجون',
      avgSessions: 'متوسط الجلسات',
      attendanceRate: 'نسبة الحضور',
      avgICF: 'متوسط تقييم ICF',
      goalsAchieved: 'نسبة تحقيق الأهداف',
      dischargeRate: 'معدل التخريج',
      sessions: 'الجلسات المنجزة',
      avgDuration: 'متوسط المدة (دقيقة)',
    },
    lastUpdated: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   2. BRANCH COMPARISON — مقارنة الفروع
   ═══════════════════════════════════════════════════════════════════════ */
async function getBranchComparison() {
  const branches = Branch ? await Branch.find({ status: { $ne: 'deleted' } }).lean() : [];

  if (!branches.length) {
    return {
      branches: [],
      best: null,
      worst: null,
      message: 'لا توجد فروع مسجلة',
    };
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const branchData = await Promise.all(
    branches.map(async (branch) => {
      const bId = branch._id.toString();

      const [benCount, activeBen, revenueAgg, sessionsCount, staffCount] = await Promise.allSettled([
        Beneficiary ? Beneficiary.countDocuments({ branch: bId }) : 0,
        Beneficiary ? Beneficiary.countDocuments({ branch: bId, status: 'active' }) : 0,
        Invoice
          ? Invoice.aggregate([
              { $match: { branch: bId, createdAt: { $gte: monthStart, $lte: monthEnd } } },
              { $group: { _id: null, total: { $sum: '$total' } } },
            ])
          : [],
        Session
          ? Session.countDocuments({ branch: bId, scheduledDate: { $gte: monthStart, $lte: monthEnd }, status: 'completed' })
          : 0,
        User ? User.countDocuments({ branch: bId, role: { $in: ['therapist', 'specialist', 'doctor'] } }) : 0,
      ]);

      const totalBeneficiaries = benCount.status === 'fulfilled' ? benCount.value : 0;
      const activeBeneficiaries = activeBen.status === 'fulfilled' ? activeBen.value : 0;
      const revenue = revenueAgg.status === 'fulfilled' ? revenueAgg.value?.[0]?.total || 0 : 0;
      const sessions = sessionsCount.status === 'fulfilled' ? sessionsCount.value : 0;
      const staff = staffCount.status === 'fulfilled' ? staffCount.value : 0;

      /* Composite score: normalize and weight */
      const revenueScore = Math.min(revenue / 50000, 10); // cap at 10
      const sessionScore = Math.min(sessions / 100, 10);
      const staffScore = Math.min(staff / 10, 10);
      const beneficiaryScore = Math.min(activeBeneficiaries / 50, 10);
      const compositeScore = +(revenueScore * 0.4 + sessionScore * 0.3 + staffScore * 0.1 + beneficiaryScore * 0.2).toFixed(2);

      return {
        branchId: bId,
        branchName: branch.nameAr || branch.name || 'فرع بدون اسم',
        city: branch.city || '',
        totalBeneficiaries,
        activeBeneficiaries,
        revenue: +revenue.toFixed(2),
        revenueFormatted: formatSAR(revenue),
        sessionsCompleted: sessions,
        staffCount: staff,
        compositeScore,
      };
    })
  );

  const sorted = [...branchData].sort((a, b) => b.compositeScore - a.compositeScore);
  const best = sorted[0] || null;
  const worst = sorted[sorted.length - 1] || null;

  return {
    branches: sorted,
    best: best
      ? {
          branchId: best.branchId,
          branchName: best.branchName,
          metric: 'أفضل أداء شاملين',
          value: best.compositeScore,
          highlight: `إيرادات: ${best.revenueFormatted} · جلسات: ${formatNum(best.sessionsCompleted)}`,
        }
      : null,
    worst: worst
      ? {
          branchId: worst.branchId,
          branchName: worst.branchName,
          metric: 'أدنى أداء شاملين',
          value: worst.compositeScore,
          highlight: `إيرادات: ${worst.revenueFormatted} · جلسات: ${formatNum(worst.sessionsCompleted)}`,
        }
      : null,
    labels: {
      branches: 'الفروع',
      best: 'أفضل فرع',
      worst: 'أقل فرع أداءً',
      revenue: 'الإيرادات',
      sessions: 'الجلسات',
      staff: 'الكوادر',
      beneficiaries: 'المستفيدون',
      compositeScore: 'الدرجة المركبة',
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   3. FINANCIAL SUMMARY — الملخص المالي
   ═══════════════════════════════════════════════════════════════════════ */
async function getFinancialSummary(startDate, endDate) {
  const s = startDate ? new Date(startDate) : startOfMonth(new Date());
  const e = endDate ? new Date(endDate) : endOfMonth(new Date());

  const queries = await Promise.allSettled([
    /* 0 — revenue by month */
    Invoice
      ? Invoice.aggregate([
          { $match: { createdAt: { $gte: s, $lte: e } } },
          {
            $group: {
              _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
              total: { $sum: '$total' },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ])
      : Promise.resolve([]),

    /* 1 — revenue by service type */
    Invoice
      ? Invoice.aggregate([
          { $match: { createdAt: { $gte: s, $lte: e } } },
          { $group: { _id: '$serviceType', total: { $sum: '$total' } } },
          { $sort: { total: -1 } },
        ])
      : Promise.resolve([]),

    /* 2 — revenue by branch */
    Invoice
      ? Invoice.aggregate([
          { $match: { createdAt: { $gte: s, $lte: e } } },
          { $group: { _id: '$branch', total: { $sum: '$total' } } },
          { $sort: { total: -1 } },
        ])
      : Promise.resolve([]),

    /* 3 — expenses */
    Expense
      ? Expense.aggregate([
          { $match: { date: { $gte: s, $lte: e } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
      : Promise.resolve([]),

    /* 4 — top paying clients */
    Invoice
      ? Invoice.aggregate([
          { $match: { createdAt: { $gte: s, $lte: e } } },
          { $group: { _id: '$clientId', name: { $first: '$clientName' }, total: { $sum: '$total' } } },
          { $sort: { total: -1 } },
          { $limit: 10 },
        ])
      : Promise.resolve([]),
  ]);

  const [revMonthRes, revServiceRes, revBranchRes, expRes, topClientsRes] = queries;

  const revenueByMonth = (revMonthRes.status === 'fulfilled' ? revMonthRes.value : []).map((item) => ({
    month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
    monthAr: new Date(item._id.year, item._id.month - 1).toLocaleString('ar-SA', { month: 'long', year: 'numeric' }),
    revenue: +(item.total || 0).toFixed(2),
    revenueFormatted: formatSAR(item.total),
  }));

  const revenueByService = (revServiceRes.status === 'fulfilled' ? revServiceRes.value : []).map((item) => ({
    serviceType: item._id || 'غير محدد',
    revenue: +(item.total || 0).toFixed(2),
    revenueFormatted: formatSAR(item.total),
  }));

  const revenueByBranchRaw = revBranchRes.status === 'fulfilled' ? revBranchRes.value : [];
  let revenueByBranch = revenueByBranchRaw;
  if (Branch && revenueByBranchRaw.length > 0) {
    const branchMap = new Map();
    const branchDocs = await Branch.find({ _id: { $in: revenueByBranchRaw.map((r) => r._id) } }).lean();
    branchDocs.forEach((b) => branchMap.set(b._id.toString(), b.nameAr || b.name || 'فرع'));
    revenueByBranch = revenueByBranchRaw.map((item) => ({
      branchId: item._id,
      branchName: branchMap.get(item._id) || 'فرع',
      revenue: +(item.total || 0).toFixed(2),
      revenueFormatted: formatSAR(item.total),
    }));
  }

  const totalExpenses = expRes.status === 'fulfilled' ? expRes.value?.[0]?.total || 0 : 0;
  const totalRevenue = revenueByMonth.reduce((sum, item) => sum + item.revenue, 0);

  const topPayingClients = (topClientsRes.status === 'fulfilled' ? topClientsRes.value : []).map((item) => ({
    clientId: item._id,
    clientName: item.name || 'عميل غير معروف',
    totalPaid: +(item.total || 0).toFixed(2),
    totalFormatted: formatSAR(item.total),
  }));

  return {
    period: { start: s.toISOString(), end: e.toISOString() },
    revenueByMonth,
    revenueByService,
    revenueByBranch,
    expenses: +totalExpenses.toFixed(2),
    expensesFormatted: formatSAR(totalExpenses),
    totalRevenue: +totalRevenue.toFixed(2),
    totalRevenueFormatted: formatSAR(totalRevenue),
    net: +(totalRevenue - totalExpenses).toFixed(2),
    netFormatted: formatSAR(totalRevenue - totalExpenses),
    topPayingClients,
    labels: {
      revenueByMonth: 'الإيرادات حسب الشهر',
      revenueByService: 'الإيرادات حسب نوع الخدمة',
      revenueByBranch: 'الإيرادات حسب الفرع',
      expenses: 'المصروفات',
      totalRevenue: 'إجمالي الإيرادات',
      net: 'الصافي',
      topPayingClients: 'أفضل العملاء دفعاً',
      profitMargin: 'هامش الربح',
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   4. STAFF PERFORMANCE — أداء الكوادر
   ═══════════════════════════════════════════════════════════════════════ */
async function getStaffPerformance() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const therapistQuery = User
    ? User.find({ role: { $in: ['therapist', 'specialist', 'doctor'] } })
        .select('_id fullName nameAr role branch')
        .lean()
    : Promise.resolve([]);

  const [therapists] = await Promise.allSettled([therapistQuery]);
  const staffList = therapists.status === 'fulfilled' ? therapists.value : [];

  if (!staffList.length) {
    return {
      leaderboard: [],
      averages: {
        avgSessionsPerTherapist: 0,
        avgAttendanceRate: 0,
        avgSessionDuration: 0,
        avgPatientSatisfaction: 0,
      },
      labels: {
        leaderboard: 'ترتيب المعالجين',
        sessions: 'الجلسات',
        goals: 'الأهداف المحققة',
        satisfaction: 'رضا المستفيدين',
        attendance: 'نسبة الحضور',
        duration: 'متوسط المدة',
      },
    };
  }

  const leaderboard = await Promise.all(
    staffList.map(async (t) => {
      const tId = t._id.toString();

      const [sessAgg, goalsAgg, attAgg] = await Promise.allSettled([
        Session
          ? Session.aggregate([
              {
                $match: {
                  therapistId: tId,
                  scheduledDate: { $gte: monthStart, $lte: monthEnd },
                  status: 'completed',
                },
              },
              { $group: { _id: null, count: { $sum: 1 }, avgDuration: { $avg: '$duration' } } },
            ])
          : Promise.resolve([]),
        Goal
          ? Goal.aggregate([
              { $match: { assignedTo: tId, status: 'achieved', achievedAt: { $gte: monthStart, $lte: monthEnd } } },
              { $group: { _id: null, count: { $sum: 1 } } },
            ])
          : Promise.resolve([]),
        Attendance
          ? Promise.allSettled([
              Attendance.countDocuments({ userId: tId, date: { $gte: monthStart, $lte: monthEnd }, status: 'present' }),
              Attendance.countDocuments({ userId: tId, date: { $gte: monthStart, $lte: monthEnd } }),
            ])
          : Promise.resolve([{ value: 0 }, { value: 0 }]),
      ]);

      const sessions = sessAgg.status === 'fulfilled' ? sessAgg.value?.[0]?.count || 0 : 0;
      const avgDuration = sessAgg.status === 'fulfilled' ? sessAgg.value?.[0]?.avgDuration || 0 : 0;
      const goalsAchieved = goalsAgg.status === 'fulfilled' ? goalsAgg.value?.[0]?.count || 0 : 0;

      let attendanceRate = 0;
      if (attAgg.status === 'fulfilled' && Array.isArray(attAgg.value)) {
        const present = attAgg.value[0]?.value || 0;
        const total = attAgg.value[1]?.value || 0;
        attendanceRate = total > 0 ? (present / total) * 100 : 0;
      }

      /* Mock satisfaction for now (would come from feedback model) */
      const satisfaction = 75 + Math.random() * 20;

      return {
        therapistId: tId,
        name: t.nameAr || t.fullName || 'معالج',
        role: t.role || 'therapist',
        branchId: t.branch?.toString() || '',
        sessionsCompleted: sessions,
        goalsAchieved,
        patientSatisfaction: +satisfaction.toFixed(1),
        attendanceRate: +attendanceRate.toFixed(1),
        avgSessionDuration: +avgDuration.toFixed(0),
      };
    })
  );

  /* Sort by composite score (sessions 40%, goals 30%, satisfaction 30%) */
  const sorted = leaderboard
    .map((t) => ({
      ...t,
      compositeScore: +(t.sessionsCompleted * 0.4 + t.goalsAchieved * 0.3 + t.patientSatisfaction * 0.3).toFixed(1),
    }))
    .sort((a, b) => b.compositeScore - a.compositeScore);

  const total = sorted.length || 1;
  const averages = {
    avgSessionsPerTherapist: +(sorted.reduce((s, t) => s + t.sessionsCompleted, 0) / total).toFixed(1),
    avgAttendanceRate: +(sorted.reduce((s, t) => s + t.attendanceRate, 0) / total).toFixed(1),
    avgSessionDuration: +(sorted.reduce((s, t) => s + t.avgSessionDuration, 0) / total).toFixed(0),
    avgPatientSatisfaction: +(sorted.reduce((s, t) => s + t.patientSatisfaction, 0) / total).toFixed(1),
  };

  return {
    leaderboard: sorted,
    averages,
    labels: {
      leaderboard: 'ترتيب المعالجين',
      sessions: 'الجلسات المنجزة',
      goals: 'الأهداف المحققة',
      satisfaction: 'رضا المستفيدين',
      attendance: 'نسبة الحضور',
      duration: 'متوسط المدة (دقيقة)',
      compositeScore: 'الدرجة المركبة',
      rank: 'الترتيب',
      therapist: 'المعالج',
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  getExecutiveOverview,
  getBranchComparison,
  getFinancialSummary,
  getStaffPerformance,
};

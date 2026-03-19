/* eslint-disable no-unused-vars */
/**
 * 📊 Dashboard Statistics API v2 — Comprehensive Real-Time Aggregation
 * نقاط نهاية لوحة التحكم الاحترافية — الإصدار الثاني
 *
 * Aggregates 30+ MongoDB models for a world-class executive dashboard.
 * Clinical · HR · Finance · Supply Chain · Fleet · System
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

// ── Helpers ────────────────────────────────────────────────────────
const getModel = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};
const safeCount = async (model, filter = {}) => {
  if (!model) return 0;
  try {
    return await model.countDocuments(filter);
  } catch {
    return 0;
  }
};
const safeAggregate = async (model, pipeline) => {
  if (!model) return [];
  try {
    return await model.aggregate(pipeline);
  } catch {
    return [];
  }
};
const safeFind = async (model, query = {}, sort = { createdAt: -1 }, limit = 10) => {
  if (!model) return [];
  try {
    return await model.find(query).sort(sort).limit(limit).lean();
  } catch {
    return [];
  }
};
const safeSum = async (model, field, filter = {}) => {
  if (!model) return 0;
  try {
    const r = await model.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: { $ifNull: [`$${field}`, 0] } } } },
    ]);
    return r[0]?.total || 0;
  } catch {
    return 0;
  }
};

// ── Arabic locale helpers ──────────────────────────────────────────
const arabicMonths = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];
const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const roleLabels = {
  admin: 'مدير',
  manager: 'مشرف',
  hr: 'موارد بشرية',
  accountant: 'محاسب',
  doctor: 'طبيب',
  therapist: 'معالج',
  receptionist: 'استقبال',
  parent: 'ولي أمر',
  user: 'مستخدم',
};

/**
 * GET /api/dashboard/stats
 * Comprehensive dashboard — KPIs, charts, activity, finance, HR, clinical, fleet, supply-chain
 */
router.get('/stats', optionalAuth, async (_req, res) => {
  try {
    // ── Load all models ────────────────────────────────────────
    const User = getModel('User');
    const Beneficiary = getModel('Beneficiary');
    const Session = getModel('Session') || getModel('TherapySession');
    const Employee = getModel('Employee');
    const Attendance = getModel('Attendance');
    const Payment = getModel('Payment') || getModel('FinancialTransaction');
    const Notification = getModel('Notification');
    const AuditLog = getModel('AuditLog');
    const Invoice = getModel('Invoice');
    const Document = getModel('Document');
    // Clinical
    const TherapyProgram = getModel('TherapyProgram');
    const TherapeuticPlan = getModel('TherapeuticPlan');
    const CarePlan = getModel('CarePlan');
    const Assessment = getModel('Assessment');
    const Feedback = getModel('Feedback');
    const Waitlist = getModel('Waitlist');
    const DisabilityProgram = getModel('DisabilityProgram');
    const Goal = getModel('Goal');
    // HR
    const Leave = getModel('Leave');
    const Shift = getModel('Shift');
    const PerformanceEval = getModel('PerformanceEvaluation');
    const ApprovalRequest = getModel('ApprovalRequest');
    // Finance
    const Expense = getModel('Expense');
    const Budget = getModel('Budget');
    const Transaction = getModel('Transaction');
    const CashFlow = getModel('CashFlow');
    // Supply chain
    const Supplier = getModel('Supplier');
    const PurchaseOrder = getModel('PurchaseOrder');
    const Inventory = getModel('Inventory');
    const Contract = getModel('Contract');
    const Product = getModel('Product');
    // Fleet
    const Vehicle = getModel('Vehicle');
    const Trip = getModel('Trip');
    const Driver = getModel('Driver');
    // Ops
    const Maintenance = getModel('Maintenance');
    const Incident = getModel('Incident');
    const Lead = getModel('Lead');
    const Schedule = getModel('Schedule');
    const Asset = getModel('Asset');

    // ── Date boundaries ────────────────────────────────────────
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const sixMonths = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const sevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ════════════════════════════════════════════════════════════
    //  PHASE 1: Core KPIs (parallel)
    // ════════════════════════════════════════════════════════════
    const [
      totalUsers,
      activeUsers,
      totalBeneficiaries,
      activeBeneficiaries,
      totalEmployees,
      totalSessions,
      todaySessions,
      totalPayments,
      monthPayments,
      totalDocuments,
      pendingInvoices,
      todayAttendance,
      recentNotifications,
      recentAuditLogs,
      usersByRole,
      monthlyRegistrations,
      weeklyActivity,
    ] = await Promise.all([
      safeCount(User),
      safeCount(User, { isActive: { $ne: false }, lastLogin: { $gte: thirtyDays } }),
      safeCount(Beneficiary),
      safeCount(Beneficiary, { status: { $in: ['active', 'نشط'] } }),
      safeCount(Employee),
      safeCount(Session),
      safeCount(Session, {
        $or: [
          { date: { $gte: today } },
          { createdAt: { $gte: today } },
          { startTime: { $gte: today } },
        ],
      }),
      safeCount(Payment),
      safeCount(Payment, {
        $or: [{ date: { $gte: thisMonth } }, { createdAt: { $gte: thisMonth } }],
      }),
      safeCount(Document),
      safeCount(Invoice, {
        status: { $in: ['pending', 'unpaid', 'PENDING', 'UNPAID', 'معلّق', 'DRAFT'] },
      }),
      safeCount(Attendance, { $or: [{ date: { $gte: today } }, { createdAt: { $gte: today } }] }),
      safeFind(Notification, {}, { createdAt: -1 }, 12),
      safeFind(AuditLog, {}, { createdAt: -1 }, 20),
      safeAggregate(User, [
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      safeAggregate(User, [
        { $match: { createdAt: { $gte: sixMonths } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      safeAggregate(AuditLog || User, [
        { $match: { createdAt: { $gte: sevenDays } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // ════════════════════════════════════════════════════════════
    //  PHASE 2: Extended Metrics (parallel)
    // ════════════════════════════════════════════════════════════
    const [
      // Clinical
      totalPrograms,
      activePrograms,
      totalCarePlans,
      activeCarePlans,
      totalAssessments,
      waitlistCount,
      totalGoals,
      completedGoals,
      feedbackAvgResult,
      disabilityProgramCount,
      // HR
      pendingLeaves,
      approvedLeaves,
      totalLeaves,
      pendingApprovals,
      totalShifts,
      perfEvalCount,
      // Finance
      monthlyRevAgg,
      totalRevAgg,
      totalExpenses,
      monthExpenses,
      // Supply Chain
      totalSuppliers,
      totalPOs,
      pendingPOs,
      totalInventory,
      lowStockItems,
      totalContracts,
      activeContracts,
      totalProducts,
      // Fleet
      totalVehicles,
      totalTrips,
      totalDrivers,
      // Ops
      openMaintenanceTasks,
      openIncidents,
      totalLeads,
      newLeads,
      todaySchedules,
      totalAssets,
      // Revenue chart (last 6 months)
      monthlyRevenueChart,
      // Session types breakdown
      sessionStatusBreakdown,
      // Expense categories
      expenseCategoryBreakdown,
    ] = await Promise.all([
      // Clinical
      safeCount(TherapyProgram),
      safeCount(TherapyProgram, { isActive: { $ne: false } }),
      safeCount(CarePlan),
      safeCount(CarePlan, { status: { $in: ['active', 'in-progress', 'نشط'] } }),
      safeCount(Assessment),
      safeCount(Waitlist, { status: { $in: ['WAITING', 'waiting', 'قيد الانتظار'] } }),
      safeCount(Goal),
      safeCount(Goal, { status: { $in: ['completed', 'achieved', 'مكتمل'] } }),
      safeAggregate(Feedback, [
        { $group: { _id: null, avg: { $avg: '$npsScore' }, count: { $sum: 1 } } },
      ]),
      safeCount(DisabilityProgram, { status: { $in: ['active', 'نشط'] } }),
      // HR
      safeCount(Leave, { status: { $in: ['pending', 'معلق'] } }),
      safeCount(Leave, { status: { $in: ['approved', 'موافق عليه'] } }),
      safeCount(Leave),
      safeCount(ApprovalRequest, { status: { $in: ['pending', 'معلق'] } }),
      safeCount(Shift),
      safeCount(PerformanceEval),
      // Finance
      safeAggregate(Payment, [
        {
          $match: {
            $or: [
              { date: { $gte: thisMonth } },
              { createdAt: { $gte: thisMonth } },
              { paymentDate: { $gte: thisMonth } },
            ],
          },
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
      ]),
      safeAggregate(Payment, [
        { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
      ]),
      safeSum(Expense, 'amount'),
      safeSum(Expense, 'amount', {
        $or: [{ date: { $gte: thisMonth } }, { createdAt: { $gte: thisMonth } }],
      }),
      // Supply Chain
      safeCount(Supplier),
      safeCount(PurchaseOrder),
      safeCount(PurchaseOrder, { status: { $in: ['pending', 'PENDING', 'معلق'] } }),
      safeCount(Inventory),
      safeCount(Inventory, { $or: [{ quantity: { $lte: 10 } }, { condition: 'low' }] }),
      safeCount(Contract),
      safeCount(Contract, { status: { $in: ['active', 'نشط'] } }),
      safeCount(Product),
      // Fleet
      safeCount(Vehicle),
      safeCount(Trip),
      safeCount(Driver),
      // Ops
      safeCount(Maintenance, { status: { $in: ['open', 'pending', 'in-progress', 'مفتوح'] } }),
      safeCount(Incident, { status: { $in: ['open', 'investigating', 'مفتوح'] } }),
      safeCount(Lead),
      safeCount(Lead, { status: { $in: ['NEW', 'new', 'جديد'] } }),
      safeCount(Schedule, { $or: [{ startDate: { $gte: today } }, { date: { $gte: today } }] }),
      safeCount(Asset),
      // Revenue trend (last 6 months)
      safeAggregate(Payment, [
        {
          $match: {
            $or: [
              { date: { $gte: sixMonths } },
              { createdAt: { $gte: sixMonths } },
              { paymentDate: { $gte: sixMonths } },
            ],
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: { $ifNull: ['$paymentDate', { $ifNull: ['$date', '$createdAt'] }] },
              },
            },
            total: { $sum: { $ifNull: ['$amount', 0] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Session status breakdown
      safeAggregate(Session, [
        { $group: { _id: { $ifNull: ['$status', 'غير محدد'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Expense categories
      safeAggregate(Expense, [
        {
          $group: {
            _id: { $ifNull: ['$category', 'أخرى'] },
            total: { $sum: { $ifNull: ['$amount', 0] } },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 8 },
      ]),
    ]);

    // ── Compute derived values ─────────────────────────────────
    const monthlyRevenue = monthlyRevAgg[0]?.total || 0;
    const totalRevenue = totalRevAgg[0]?.total || 0;
    const feedbackAvg = feedbackAvgResult[0]?.avg
      ? Math.round(feedbackAvgResult[0].avg * 10) / 10
      : 0;
    const feedbackCount = feedbackAvgResult[0]?.count || 0;
    const goalProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    // ── previous month revenue for trend ───────────────────────
    let lastMonthRevenue = 0;
    try {
      if (Payment) {
        const lmr = await Payment.aggregate([
          {
            $match: {
              $or: [
                { date: { $gte: lastMonth, $lt: thisMonth } },
                { createdAt: { $gte: lastMonth, $lt: thisMonth } },
                { paymentDate: { $gte: lastMonth, $lt: thisMonth } },
              ],
            },
          },
          { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
        ]);
        lastMonthRevenue = lmr[0]?.total || 0;
      }
    } catch {
      /* ignore */
    }
    const revenueTrend =
      lastMonthRevenue > 0
        ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

    // ── Build chart data ───────────────────────────────────────
    // Registration chart (6 months)
    const registrationChart = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = monthlyRegistrations.find(r => r._id === key);
      registrationChart.push({ month: arabicMonths[d.getMonth()], value: found?.count || 0 });
    }

    // Activity chart (7 days)
    const activityChart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      const found = weeklyActivity.find(a => a._id === key);
      activityChart.push({ day: arabicDays[d.getDay()], value: found?.count || 0 });
    }

    // Revenue trend chart (6 months)
    const revenueChart = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = monthlyRevenueChart.find(r => r._id === key);
      revenueChart.push({
        month: arabicMonths[d.getMonth()],
        revenue: found?.total || 0,
        transactions: found?.count || 0,
      });
    }

    // Role distribution
    const roleDistribution = usersByRole.map(r => ({
      name: roleLabels[r._id] || r._id || 'غير محدد',
      value: r.count,
    }));

    // Session status pie
    const sessionStatusLabels = {
      SCHEDULED: 'مجدولة',
      COMPLETED: 'مكتملة',
      CANCELLED: 'ملغية',
      IN_PROGRESS: 'جارية',
      MISSED: 'فائتة',
      scheduled: 'مجدولة',
      completed: 'مكتملة',
      cancelled: 'ملغية',
      active: 'نشطة',
    };
    const sessionStatusChart = sessionStatusBreakdown.map(s => ({
      name: sessionStatusLabels[s._id] || s._id || 'غير محدد',
      value: s.count,
    }));

    // Expense categories pie
    const expenseCatLabels = {
      salary: 'رواتب',
      rent: 'إيجار',
      utilities: 'مرافق',
      supplies: 'مستلزمات',
      maintenance: 'صيانة',
      transport: 'نقل',
      other: 'أخرى',
    };
    const expenseCategoryChart = expenseCategoryBreakdown.map(e => ({
      name: expenseCatLabels[e._id] || e._id || 'أخرى',
      value: e.total,
    }));

    // ── Recent activity ────────────────────────────────────────
    const recentActivity = recentAuditLogs.slice(0, 12).map(log => ({
      id: log._id,
      action: log.action || log.operation || log.type || 'نشاط',
      user:
        log.user?.fullName || log.user?.username || log.userEmail || log.performedBy || 'النظام',
      description: log.description || log.message || log.details || '',
      timestamp: log.createdAt || log.timestamp,
      type: log.severity || log.level || 'info',
    }));

    // ── Alerts ─────────────────────────────────────────────────
    const alerts = recentNotifications.slice(0, 10).map(n => ({
      id: n._id,
      title: n.title || n.subject || 'إشعار',
      message: n.message || n.body || n.content || '',
      type: n.type || n.severity || 'info',
      read: n.read || n.isRead || false,
      timestamp: n.createdAt || n.timestamp,
    }));

    // ── System health ──────────────────────────────────────────
    const mem = process.memoryUsage();
    const systemHealth = {
      database: mongoose.connection.readyState === 1 ? 'متصل' : 'غير متصل',
      dbStatus: mongoose.connection.readyState === 1 ? 'healthy' : 'disconnected',
      uptime: process.uptime(),
      memoryUsage: Math.round(mem.heapUsed / 1024 / 1024),
      memoryTotal: Math.round(mem.heapTotal / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      collections: Object.keys(mongoose.connection.collections).length,
      models: mongoose.modelNames().length,
    };

    // ════════════════════════════════════════════════════════════
    //  RESPONSE
    // ════════════════════════════════════════════════════════════
    res.json({
      success: true,
      data: {
        // ─── KPI Summary Cards ───────────────────────────────
        kpis: {
          users: { total: totalUsers, active: activeUsers, label: 'المستخدمون', icon: 'People' },
          beneficiaries: {
            total: totalBeneficiaries,
            active: activeBeneficiaries,
            label: 'المستفيدون',
            icon: 'Accessibility',
          },
          employees: { total: totalEmployees, label: 'الموظفون', icon: 'Badge' },
          sessions: {
            total: totalSessions,
            today: todaySessions,
            label: 'الجلسات',
            icon: 'EventNote',
          },
          payments: {
            total: totalPayments,
            monthCount: monthPayments,
            label: 'المدفوعات',
            icon: 'AccountBalance',
          },
          documents: { total: totalDocuments, label: 'المستندات', icon: 'Description' },
          attendance: { today: todayAttendance, label: 'الحضور اليوم', icon: 'HowToReg' },
          invoices: { pending: pendingInvoices, label: 'الفواتير المعلقة', icon: 'Receipt' },
        },

        // ─── Finance ─────────────────────────────────────────
        finance: {
          monthlyRevenue,
          totalRevenue,
          lastMonthRevenue,
          revenueTrend,
          pendingInvoices,
          totalExpenses,
          monthExpenses,
          netIncome: totalRevenue - totalExpenses,
          monthNetIncome: monthlyRevenue - monthExpenses,
        },

        // ─── Clinical / Rehabilitation ───────────────────────
        clinical: {
          programs: { total: totalPrograms, active: activePrograms, label: 'البرامج العلاجية' },
          carePlans: { total: totalCarePlans, active: activeCarePlans, label: 'خطط الرعاية' },
          assessments: { total: totalAssessments, label: 'التقييمات' },
          waitlist: { count: waitlistCount, label: 'قائمة الانتظار' },
          goals: {
            total: totalGoals,
            completed: completedGoals,
            progress: goalProgress,
            label: 'الأهداف',
          },
          feedback: { average: feedbackAvg, count: feedbackCount, label: 'رضا المستفيدين' },
          disabilityPrograms: { active: disabilityProgramCount, label: 'برامج الإعاقة' },
        },

        // ─── HR & Workforce ──────────────────────────────────
        hr: {
          leaves: {
            pending: pendingLeaves,
            approved: approvedLeaves,
            total: totalLeaves,
            label: 'الإجازات',
          },
          approvals: { pending: pendingApprovals, label: 'طلبات الموافقة' },
          shifts: { total: totalShifts, label: 'الورديات' },
          evaluations: { total: perfEvalCount, label: 'تقييمات الأداء' },
        },

        // ─── Supply Chain & Procurement ──────────────────────
        supplyChain: {
          suppliers: { total: totalSuppliers, label: 'الموردون' },
          orders: { total: totalPOs, pending: pendingPOs, label: 'أوامر الشراء' },
          inventory: { total: totalInventory, lowStock: lowStockItems, label: 'المخزون' },
          contracts: { total: totalContracts, active: activeContracts, label: 'العقود' },
          products: { total: totalProducts, label: 'المنتجات' },
        },

        // ─── Fleet Management ────────────────────────────────
        fleet: {
          vehicles: { total: totalVehicles, label: 'المركبات' },
          trips: { total: totalTrips, label: 'الرحلات' },
          drivers: { total: totalDrivers, label: 'السائقون' },
        },

        // ─── Operations ──────────────────────────────────────
        operations: {
          maintenance: { open: openMaintenanceTasks, label: 'مهام الصيانة' },
          incidents: { open: openIncidents, label: 'الحوادث المفتوحة' },
          leads: { total: totalLeads, new: newLeads, label: 'العملاء المحتملون' },
          schedules: { today: todaySchedules, label: 'مواعيد اليوم' },
          assets: { total: totalAssets, label: 'الأصول' },
        },

        // ─── Charts ──────────────────────────────────────────
        charts: {
          registrations: registrationChart,
          activity: activityChart,
          roleDistribution,
          revenueChart,
          sessionStatus: sessionStatusChart,
          expenseCategories: expenseCategoryChart,
        },

        // ─── Activity & Alerts ───────────────────────────────
        recentActivity,
        alerts,

        // ─── System ──────────────────────────────────────────
        system: systemHealth,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إحصائيات لوحة التحكم',
      error: 'حدث خطأ في الخادم',
    });
  }
});

/**
 * GET /api/dashboard/stats/quick
 * Quick KPIs only (for header/navbar live updates)
 */
router.get('/stats/quick', optionalAuth, async (_req, res) => {
  try {
    const User = getModel('User');
    const Beneficiary = getModel('Beneficiary');
    const Session = getModel('Session') || getModel('TherapySession');
    const Notification = getModel('Notification');
    const Leave = getModel('Leave');
    const Incident = getModel('Incident');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [users, beneficiaries, todaySessions, unreadNotifs, pendingLeaves, openIncidents] =
      await Promise.all([
        safeCount(User),
        safeCount(Beneficiary),
        safeCount(Session, { $or: [{ date: { $gte: today } }, { createdAt: { $gte: today } }] }),
        safeCount(Notification, { $or: [{ read: false }, { isRead: false }] }),
        safeCount(Leave, { status: { $in: ['pending', 'معلق'] } }),
        safeCount(Incident, { status: { $in: ['open', 'investigating', 'مفتوح'] } }),
      ]);

    res.json({
      success: true,
      data: { users, beneficiaries, todaySessions, unreadNotifs, pendingLeaves, openIncidents },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

/**
 * GET /api/dashboard/stats/modules
 * Module-level summary for module cards
 */
router.get('/stats/modules', optionalAuth, async (_req, res) => {
  try {
    const counts = await Promise.all([
      safeCount(getModel('User')),
      safeCount(getModel('Beneficiary')),
      safeCount(getModel('Employee')),
      safeCount(getModel('Session') || getModel('TherapySession')),
      safeCount(getModel('Payment') || getModel('FinancialTransaction')),
      safeCount(getModel('Invoice')),
      safeCount(getModel('TherapyProgram')),
      safeCount(getModel('Leave')),
      safeCount(getModel('Supplier')),
      safeCount(getModel('PurchaseOrder')),
      safeCount(getModel('Vehicle')),
      safeCount(getModel('Lead')),
      safeCount(getModel('Maintenance')),
      safeCount(getModel('Document')),
      safeCount(getModel('Inventory')),
    ]);
    const [
      users,
      beneficiaries,
      employees,
      sessions,
      payments,
      invoices,
      programs,
      leaves,
      suppliers,
      purchaseOrders,
      vehicles,
      leads,
      maintenance,
      documents,
      inventory,
    ] = counts;

    res.json({
      success: true,
      data: {
        userManagement: { users, label: 'إدارة المستخدمين', icon: 'People', color: '#667eea' },
        beneficiaryMgmt: {
          beneficiaries,
          label: 'إدارة المستفيدين',
          icon: 'Accessibility',
          color: '#43e97b',
        },
        hrModule: { employees, leaves, label: 'الموارد البشرية', icon: 'Badge', color: '#4facfe' },
        sessionMgmt: {
          sessions,
          programs,
          label: 'إدارة الجلسات',
          icon: 'EventNote',
          color: '#f093fb',
        },
        financeMgmt: {
          payments,
          invoices,
          label: 'المالية',
          icon: 'AccountBalance',
          color: '#43cea2',
        },
        supplyChain: {
          suppliers,
          purchaseOrders,
          inventory,
          label: 'سلسلة التوريد',
          icon: 'LocalShipping',
          color: '#ffb347',
        },
        fleetMgmt: { vehicles, label: 'إدارة الأسطول', icon: 'DirectionsCar', color: '#fa709a' },
        crm: { leads, label: 'إدارة العملاء', icon: 'Contacts', color: '#a8c0ff' },
        maintenance: { maintenance, label: 'الصيانة', icon: 'Build', color: '#f5af19' },
        documents: { documents, label: 'المستندات', icon: 'Description', color: '#38f9d7' },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

module.exports = router;

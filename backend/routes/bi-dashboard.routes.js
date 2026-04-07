/**
 * BI Dashboard Routes — مسارات لوحة تحكم ذكاء الأعمال المتقدمة
 *
 * Comprehensive Business Intelligence endpoints:
 * - Executive Overview (نظرة تنفيذية شاملة)
 * - KPI Management (إدارة مؤشرات الأداء)
 * - Financial Analytics (التحليلات المالية)
 * - HR Analytics (تحليلات الموارد البشرية)
 * - Operational Analytics (التحليلات التشغيلية)
 * - Trend Analysis (تحليل الاتجاهات)
 * - Report Builder (منشئ التقارير)
 * - Export (تصدير)
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { stripUpdateMeta } = require('../utils/sanitize');

// ── Safe model loader ─────────────────────────────────────────────
function safeModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

// ── Auth middleware ────────────────────────────────────────────────
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════
// 1. EXECUTIVE OVERVIEW — النظرة التنفيذية الشاملة
// ═══════════════════════════════════════════════════════════════════

router.get('/overview', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const prevStartDate = new Date(startDate - (now - startDate));

    // Parallel aggregation across all modules
    const [
      beneficiaryStats,
      staffStats,
      financeStats,
      sessionStats,
      complaintStats,
      attendanceStats,
    ] = await Promise.all([
      aggregateBeneficiaries(startDate, prevStartDate),
      aggregateStaff(startDate, prevStartDate),
      aggregateFinance(startDate, prevStartDate),
      aggregateSessions(startDate, prevStartDate),
      aggregateComplaints(startDate, prevStartDate),
      aggregateAttendance(startDate),
    ]);

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        summary: {
          beneficiaries: beneficiaryStats,
          staff: staffStats,
          finance: financeStats,
          sessions: sessionStats,
          complaints: complaintStats,
          attendance: attendanceStats,
        },
        healthScore: calculateHealthScore({
          beneficiaryStats,
          staffStats,
          financeStats,
          complaintStats,
        }),
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    logger.error('BI overview error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحميل النظرة التنفيذية' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2. KPI ENDPOINTS — مؤشرات الأداء الرئيسية
// ═══════════════════════════════════════════════════════════════════

router.get('/kpis', async (req, res) => {
  try {
    const { category, department } = req.query;
    const BIKPI = safeModel('BIKPI');

    if (BIKPI) {
      const filter = { isActive: true };
      if (category) filter.category = category;
      if (department) filter.department = department;
      const kpis = await BIKPI.find(filter).sort({ sortOrder: 1, category: 1 }).lean();
      return res.json({ success: true, data: kpis });
    }

    // Fallback: Calculate KPIs dynamically
    const kpis = await calculateDynamicKPIs();
    res.json({ success: true, data: kpis });
  } catch (err) {
    logger.error('BI KPIs error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحميل مؤشرات الأداء' });
  }
});

router.get('/kpis/:code', async (req, res) => {
  try {
    const BIKPI = safeModel('BIKPI');
    if (!BIKPI) {
      return res.status(404).json({ success: false, message: 'KPI model not available' });
    }
    const kpi = await BIKPI.findOne({ code: req.params.code }).lean();
    if (!kpi) {
      return res.status(404).json({ success: false, message: 'مؤشر الأداء غير موجود' });
    }
    res.json({ success: true, data: kpi });
  } catch (err) {
    logger.error('BI KPI detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحميل تفاصيل المؤشر' });
  }
});

router.post('/kpis', async (req, res) => {
  try {
    const BIKPI = safeModel('BIKPI');
    if (!BIKPI) {
      return res.status(501).json({ success: false, message: 'KPI model not available' });
    }
    const {
      name,
      code,
      category,
      unit,
      targetValue,
      warningThreshold,
      criticalThreshold,
      frequency,
      dataSource,
      formula,
      description,
      department,
      isActive,
    } = req.body;
    const kpi = new BIKPI({
      name,
      code,
      category,
      unit,
      targetValue,
      warningThreshold,
      criticalThreshold,
      frequency,
      dataSource,
      formula,
      description,
      department,
      isActive,
      owner: req.user._id,
    });
    await kpi.save();
    res.status(201).json({ success: true, data: kpi, message: 'تم إنشاء مؤشر الأداء بنجاح' });
  } catch (err) {
    logger.error('BI KPI create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء مؤشر الأداء' });
  }
});

router.put('/kpis/:code', async (req, res) => {
  try {
    const BIKPI = safeModel('BIKPI');
    if (!BIKPI) {
      return res.status(501).json({ success: false, message: 'KPI model not available' });
    }
    const kpi = await BIKPI.findOneAndUpdate({ code: req.params.code }, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!kpi) {
      return res.status(404).json({ success: false, message: 'مؤشر الأداء غير موجود' });
    }
    res.json({ success: true, data: kpi, message: 'تم تحديث مؤشر الأداء بنجاح' });
  } catch (err) {
    logger.error('BI KPI update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث مؤشر الأداء' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3. FINANCIAL ANALYTICS — التحليلات المالية
// ═══════════════════════════════════════════════════════════════════

router.get('/finance/analytics', async (req, res) => {
  try {
    const { period = 'year', year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();

    const Payment = safeModel('Payment');
    const Invoice = safeModel('Invoice');
    const Expense = safeModel('Expense');

    const monthlyData = [];
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(targetYear, m, 1);
      const monthEnd = new Date(targetYear, m + 1, 1);
      const dateFilter = { $gte: monthStart, $lt: monthEnd };

      const [revenue, expenses, invoiceCount] = await Promise.all([
        Payment
          ? Payment.aggregate([
              { $match: { createdAt: dateFilter, status: { $in: ['completed', 'paid'] } } },
              { $group: { _id: null, total: { $sum: '$amount' } } },
              { $limit: 1000 },
            ])
          : [{ total: 0 }],
        Expense
          ? Expense.aggregate([
              { $match: { date: dateFilter, status: { $ne: 'cancelled' } } },
              { $group: { _id: null, total: { $sum: '$amount' } } },
              { $limit: 1000 },
            ])
          : [{ total: 0 }],
        Invoice ? Invoice.countDocuments({ createdAt: dateFilter }) : 0,
      ]);

      const monthNames = [
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

      monthlyData.push({
        month: monthNames[m],
        monthIndex: m + 1,
        revenue: revenue[0]?.total || 0,
        expenses: expenses[0]?.total || 0,
        netIncome: (revenue[0]?.total || 0) - (expenses[0]?.total || 0),
        invoices: invoiceCount,
      });
    }

    // Calculate totals
    const totals = monthlyData.reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.revenue,
        expenses: acc.expenses + m.expenses,
        netIncome: acc.netIncome + m.netIncome,
        invoices: acc.invoices + m.invoices,
      }),
      { revenue: 0, expenses: 0, netIncome: 0, invoices: 0 }
    );

    res.json({
      success: true,
      data: {
        period,
        year: targetYear,
        monthly: monthlyData,
        totals,
        profitMargin:
          totals.revenue > 0 ? ((totals.netIncome / totals.revenue) * 100).toFixed(1) : 0,
      },
    });
  } catch (err) {
    logger.error('BI finance analytics error:', err);
    res.status(500).json({ success: false, message: 'خطأ في التحليلات المالية' });
  }
});

router.get('/finance/cashflow', async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const now = new Date();
    const Payment = safeModel('Payment');
    const Expense = safeModel('Expense');

    const cashflow = [];
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const [inflow, outflow] = await Promise.all([
        Payment
          ? Payment.aggregate([
              { $match: { createdAt: { $gte: start, $lt: end }, status: 'completed' } },
              { $group: { _id: null, total: { $sum: '$amount' } } },
              { $limit: 1000 },
            ])
          : [{ total: 0 }],
        Expense
          ? Expense.aggregate([
              { $match: { date: { $gte: start, $lt: end } } },
              { $group: { _id: null, total: { $sum: '$amount' } } },
              { $limit: 1000 },
            ])
          : [{ total: 0 }],
      ]);

      cashflow.push({
        month: start.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }),
        inflow: inflow[0]?.total || 0,
        outflow: outflow[0]?.total || 0,
        net: (inflow[0]?.total || 0) - (outflow[0]?.total || 0),
      });
    }

    res.json({ success: true, data: { cashflow } });
  } catch (err) {
    logger.error('BI cashflow error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحليل التدفق النقدي' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 4. HR ANALYTICS — تحليلات الموارد البشرية
// ═══════════════════════════════════════════════════════════════════

router.get('/hr/analytics', async (req, res) => {
  try {
    const Employee = safeModel('Employee');
    const Leave = safeModel('Leave');
    const Attendance = safeModel('Attendance');
    const Evaluation = safeModel('Evaluation') || safeModel('PerformanceEvaluation');

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      totalEmployees,
      activeEmployees,
      departmentDist,
      leaveStats,
      avgAttendance,
      evaluationStats,
    ] = await Promise.all([
      Employee ? Employee.countDocuments() : 0,
      Employee ? Employee.countDocuments({ status: { $in: ['active', 'ACTIVE'] } }) : 0,
      Employee
        ? Employee.aggregate([
            { $match: { status: { $in: ['active', 'ACTIVE'] } } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ])
        : [],
      Leave
        ? Leave.aggregate([
            { $match: { createdAt: { $gte: yearStart } } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalDays: { $sum: '$days' },
              },
            },
            { $limit: 1000 },
          ])
        : [],
      Attendance
        ? Attendance.aggregate([
            { $match: { date: { $gte: yearStart } } },
            {
              $group: {
                _id: { $month: '$date' },
                present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
                total: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 1000 },
          ])
        : [],
      Evaluation
        ? Evaluation.aggregate([
            { $match: { createdAt: { $gte: yearStart } } },
            {
              $group: {
                _id: null,
                avgScore: { $avg: '$overallScore' },
                count: { $sum: 1 },
              },
            },
            { $limit: 1000 },
          ])
        : [],
    ]);

    const turnoverRate =
      totalEmployees > 0
        ? (((totalEmployees - activeEmployees) / totalEmployees) * 100).toFixed(1)
        : 0;

    res.json({
      success: true,
      data: {
        headcount: {
          total: totalEmployees,
          active: activeEmployees,
          turnoverRate: parseFloat(turnoverRate),
        },
        departments: departmentDist.map(d => ({
          name: d._id || 'غير محدد',
          count: d.count,
        })),
        leaves: {
          breakdown: leaveStats.map(l => ({
            status: l._id,
            count: l.count,
            totalDays: l.totalDays,
          })),
        },
        attendance: {
          monthly: avgAttendance.map(a => ({
            month: a._id,
            rate: a.total > 0 ? ((a.present / a.total) * 100).toFixed(1) : 0,
          })),
        },
        performance: {
          avgScore: evaluationStats[0]?.avgScore?.toFixed(1) || 0,
          evaluationsCount: evaluationStats[0]?.count || 0,
        },
      },
    });
  } catch (err) {
    logger.error('BI HR analytics error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحليلات الموارد البشرية' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 5. OPERATIONAL ANALYTICS — التحليلات التشغيلية
// ═══════════════════════════════════════════════════════════════════

router.get('/operations/analytics', async (req, res) => {
  try {
    const Session = safeModel('Session');
    const Complaint = safeModel('Complaint');
    const MaintenanceRequest = safeModel('MaintenanceRequest');
    const Vehicle = safeModel('Vehicle');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [sessionStats, complaintStats, maintenanceStats, fleetStats] = await Promise.all([
      Session
        ? Session.aggregate([
            { $match: { date: { $gte: monthStart } } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
            { $limit: 1000 },
          ])
        : [],
      Complaint
        ? Complaint.aggregate([
            { $match: { createdAt: { $gte: monthStart } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $limit: 1000 },
          ])
        : [],
      MaintenanceRequest
        ? MaintenanceRequest.aggregate([
            { $match: { createdAt: { $gte: monthStart } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $limit: 1000 },
          ])
        : [],
      Vehicle
        ? Vehicle.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $limit: 1000 }])
        : [],
    ]);

    res.json({
      success: true,
      data: {
        sessions: {
          breakdown: sessionStats.map(s => ({ status: s._id, count: s.count })),
          total: sessionStats.reduce((sum, s) => sum + s.count, 0),
        },
        complaints: {
          breakdown: complaintStats.map(c => ({ status: c._id, count: c.count })),
          total: complaintStats.reduce((sum, c) => sum + c.count, 0),
        },
        maintenance: {
          breakdown: maintenanceStats.map(m => ({ status: m._id, count: m.count })),
          total: maintenanceStats.reduce((sum, m) => sum + m.count, 0),
        },
        fleet: {
          breakdown: fleetStats.map(f => ({ status: f._id, count: f.count })),
          total: fleetStats.reduce((sum, f) => sum + f.count, 0),
        },
      },
    });
  } catch (err) {
    logger.error('BI operations analytics error:', err);
    res.status(500).json({ success: false, message: 'خطأ في التحليلات التشغيلية' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 6. TREND ANALYSIS — تحليل الاتجاهات
// ═══════════════════════════════════════════════════════════════════

router.get('/trends', async (req, res) => {
  try {
    const { metric = 'revenue', months = 12 } = req.query;
    const now = new Date();
    const data = [];

    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const value = await getMetricValue(metric, start, end);

      data.push({
        date: start.toISOString().slice(0, 7),
        label: start.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' }),
        value,
      });
    }

    // Calculate trend line (simple linear regression)
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((s, d) => s + d.value, 0);
    const sumXY = data.reduce((s, d, i) => s + i * d.value, 0);
    const sumX2 = data.reduce((s, _, i) => s + i * i, 0);
    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
    const direction = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';

    res.json({
      success: true,
      data: {
        metric,
        points: data,
        trend: { slope: parseFloat(slope.toFixed(2)), direction },
        summary: {
          current: data[data.length - 1]?.value || 0,
          previous: data[data.length - 2]?.value || 0,
          change:
            data.length >= 2
              ? (
                  ((data[data.length - 1].value - data[data.length - 2].value) /
                    (data[data.length - 2].value || 1)) *
                  100
                ).toFixed(1)
              : 0,
        },
      },
    });
  } catch (err) {
    logger.error('BI trends error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحليل الاتجاهات' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 7. SAVED REPORTS / DASHBOARDS — التقارير والنماذج المحفوظة
// ═══════════════════════════════════════════════════════════════════

router.get('/reports', async (req, res) => {
  try {
    const BIReport = safeModel('BIReport');
    if (!BIReport) {
      return res.json({ success: true, data: [] });
    }

    const { category, type, status = 'active' } = req.query;
    const filter = { status };
    if (category) filter.category = category;
    if (type) filter.type = type;

    // Show user's reports + public reports
    filter.$or = [{ owner: req.user._id }, { isPublic: true }];

    const reports = await BIReport.find(filter)
      .populate('owner', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, data: reports });
  } catch (err) {
    logger.error('BI reports list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحميل التقارير' });
  }
});

router.post('/reports', async (req, res) => {
  try {
    const BIReport = safeModel('BIReport');
    if (!BIReport) {
      return res.status(501).json({ success: false, message: 'Report model not available' });
    }

    const {
      title,
      description,
      type,
      period,
      startDate,
      endDate,
      modules,
      sections,
      filters,
      layout,
      isScheduled,
      scheduleConfig,
    } = req.body;
    const report = new BIReport({
      title,
      description,
      type,
      period,
      startDate,
      endDate,
      modules,
      sections,
      filters,
      layout,
      isScheduled,
      scheduleConfig,
      owner: req.user._id,
    });
    await report.save();
    res.status(201).json({
      success: true,
      data: report,
      message: 'تم إنشاء التقرير بنجاح',
    });
  } catch (err) {
    logger.error('BI report create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء التقرير' });
  }
});

router.get('/reports/:id', async (req, res) => {
  try {
    const BIReport = safeModel('BIReport');
    if (!BIReport) {
      return res.status(404).json({ success: false, message: 'Report model not available' });
    }
    const report = await BIReport.findById(req.params.id).populate('owner', 'name email').lean();
    if (!report) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    }
    res.json({ success: true, data: report });
  } catch (err) {
    logger.error('BI report detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحميل التقرير' });
  }
});

router.put('/reports/:id', async (req, res) => {
  try {
    const BIReport = safeModel('BIReport');
    if (!BIReport) {
      return res.status(501).json({ success: false, message: 'Report model not available' });
    }
    const report = await BIReport.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      {
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        period: req.body.period,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        modules: req.body.modules,
        sections: req.body.sections,
        filters: req.body.filters,
        layout: req.body.layout,
        isScheduled: req.body.isScheduled,
        scheduleConfig: req.body.scheduleConfig,
        $inc: { version: 1 },
      },
      { new: true, runValidators: true }
    );
    if (!report) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود أو غير مصرح' });
    }
    res.json({ success: true, data: report, message: 'تم تحديث التقرير بنجاح' });
  } catch (err) {
    logger.error('BI report update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث التقرير' });
  }
});

router.delete('/reports/:id', async (req, res) => {
  try {
    const BIReport = safeModel('BIReport');
    if (!BIReport) {
      return res.status(501).json({ success: false, message: 'Report model not available' });
    }
    const report = await BIReport.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status: 'archived' },
      { new: true }
    );
    if (!report) {
      return res.status(404).json({ success: false, message: 'التقرير غير موجود أو غير مصرح' });
    }
    res.json({ success: true, message: 'تم أرشفة التقرير بنجاح' });
  } catch (err) {
    logger.error('BI report delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف التقرير' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 8. DEPARTMENT COMPARISON — مقارنة الأقسام
// ═══════════════════════════════════════════════════════════════════

router.get('/departments/comparison', async (req, res) => {
  try {
    const Employee = safeModel('Employee');
    const Session = safeModel('Session');
    const Complaint = safeModel('Complaint');

    if (!Employee) {
      return res.json({ success: true, data: [] });
    }

    const departments = await Employee.aggregate([
      { $match: { status: { $in: ['active', 'ACTIVE'] } } },
      { $group: { _id: '$department', headcount: { $sum: 1 } } },
      { $sort: { headcount: -1 } },
      { $limit: 10 },
    ]);

    const comparison = await Promise.all(
      departments.map(async dept => {
        const deptName = dept._id;
        const [sessions, complaints] = await Promise.all([
          Session
            ? Session.countDocuments({
                department: deptName,
                date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
              })
            : 0,
          Complaint
            ? Complaint.countDocuments({
                department: deptName,
                createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
              })
            : 0,
        ]);

        return {
          department: deptName || 'غير محدد',
          headcount: dept.headcount,
          sessions,
          complaints,
          efficiency: dept.headcount > 0 ? ((sessions / dept.headcount) * 100).toFixed(1) : 0,
        };
      })
    );

    res.json({ success: true, data: comparison });
  } catch (err) {
    logger.error('BI department comparison error:', err);
    res.status(500).json({ success: false, message: 'خطأ في مقارنة الأقسام' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 9. REAL-TIME METRICS — المقاييس الآنية
// ═══════════════════════════════════════════════════════════════════

router.get('/realtime', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [todaySessions, todayAttendance, onlineUsers, pendingTasks] = await Promise.all([
      safeModel('Session')
        ? safeModel('Session').countDocuments({ date: { $gte: todayStart } })
        : 0,
      safeModel('Attendance')
        ? safeModel('Attendance').countDocuments({ date: { $gte: todayStart }, status: 'present' })
        : 0,
      safeModel('User')
        ? safeModel('User').countDocuments({
            lastActive: { $gte: new Date(now - 15 * 60 * 1000) },
          })
        : 0,
      safeModel('Task') ? safeModel('Task').countDocuments({ status: 'pending' }) : 0,
    ]);

    res.json({
      success: true,
      data: {
        todaySessions,
        todayAttendance,
        onlineUsers,
        pendingTasks,
        serverTime: now,
        uptime: process.uptime(),
      },
    });
  } catch (err) {
    logger.error('BI realtime error:', err);
    res.status(500).json({ success: false, message: 'خطأ في المقاييس الآنية' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS — الدوال المساعدة
// ═══════════════════════════════════════════════════════════════════

async function aggregateBeneficiaries(startDate, prevStartDate) {
  const Model = safeModel('BeneficiaryFile');
  if (!Model) return { total: 0, active: 0, new: 0, trend: 0 };

  const [total, active, newCount, prevCount] = await Promise.all([
    Model.countDocuments(),
    Model.countDocuments({ status: { $in: ['active', 'ACTIVE'] } }),
    Model.countDocuments({ createdAt: { $gte: startDate } }),
    Model.countDocuments({ createdAt: { $gte: prevStartDate, $lt: startDate } }),
  ]);

  return {
    total,
    active,
    new: newCount,
    trend: prevCount > 0 ? (((newCount - prevCount) / prevCount) * 100).toFixed(1) : 0,
  };
}

async function aggregateStaff(startDate, prevStartDate) {
  const Model = safeModel('User');
  if (!Model) return { total: 0, active: 0, new: 0, trend: 0 };

  const staffFilter = { role: { $ne: 'beneficiary' } };
  const [total, active, newCount, prevCount] = await Promise.all([
    Model.countDocuments(staffFilter),
    Model.countDocuments({ ...staffFilter, isActive: true }),
    Model.countDocuments({ ...staffFilter, createdAt: { $gte: startDate } }),
    Model.countDocuments({
      ...staffFilter,
      createdAt: { $gte: prevStartDate, $lt: startDate },
    }),
  ]);

  return {
    total,
    active,
    new: newCount,
    trend: prevCount > 0 ? (((newCount - prevCount) / prevCount) * 100).toFixed(1) : 0,
  };
}

async function aggregateFinance(startDate) {
  const Payment = safeModel('Payment');
  const Expense = safeModel('Expense');

  const [revenue, expenses] = await Promise.all([
    Payment
      ? Payment.aggregate([
          { $match: { createdAt: { $gte: startDate }, status: { $in: ['completed', 'paid'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
          { $limit: 1000 },
        ])
      : [{ total: 0 }],
    Expense
      ? Expense.aggregate([
          { $match: { date: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
          { $limit: 1000 },
        ])
      : [{ total: 0 }],
  ]);

  const rev = revenue[0]?.total || 0;
  const exp = expenses[0]?.total || 0;

  return {
    revenue: rev,
    expenses: exp,
    netIncome: rev - exp,
    profitMargin: rev > 0 ? (((rev - exp) / rev) * 100).toFixed(1) : 0,
  };
}

async function aggregateSessions(startDate) {
  const Model = safeModel('Session');
  if (!Model) return { total: 0, completed: 0, completionRate: 0 };

  const [total, completed] = await Promise.all([
    Model.countDocuments({ date: { $gte: startDate } }),
    Model.countDocuments({ date: { $gte: startDate }, status: 'completed' }),
  ]);

  return {
    total,
    completed,
    completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
  };
}

async function aggregateComplaints(startDate) {
  const Model = safeModel('Complaint');
  if (!Model) return { total: 0, resolved: 0, open: 0, resolutionRate: 0 };

  const [total, resolved] = await Promise.all([
    Model.countDocuments({ createdAt: { $gte: startDate } }),
    Model.countDocuments({ createdAt: { $gte: startDate }, status: 'resolved' }),
  ]);

  return {
    total,
    resolved,
    open: total - resolved,
    resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : 0,
  };
}

async function aggregateAttendance(startDate) {
  const Model = safeModel('Attendance');
  if (!Model) return { totalDays: 0, presentRate: 0 };

  const [total, present] = await Promise.all([
    Model.countDocuments({ date: { $gte: startDate } }),
    Model.countDocuments({ date: { $gte: startDate }, status: 'present' }),
  ]);

  return {
    totalDays: total,
    presentRate: total > 0 ? ((present / total) * 100).toFixed(1) : 0,
  };
}

function calculateHealthScore({ beneficiaryStats, staffStats, financeStats, complaintStats }) {
  let score = 70; // Base score

  // Adjust based on occupancy
  if (beneficiaryStats.active > 0) score += 5;

  // Finance health
  if (financeStats.netIncome > 0) score += 10;
  if (parseFloat(financeStats.profitMargin) > 20) score += 5;

  // Staff retention
  if (staffStats.active > 0 && staffStats.total > 0) {
    const retention = (staffStats.active / staffStats.total) * 100;
    if (retention > 90) score += 5;
  }

  // Complaint resolution
  if (parseFloat(complaintStats.resolutionRate) > 80) score += 5;

  return Math.min(100, Math.max(0, score));
}

async function getMetricValue(metric, start, end) {
  const dateFilter = { $gte: start, $lt: end };

  switch (metric) {
    case 'revenue': {
      const Payment = safeModel('Payment');
      if (!Payment) return 0;
      const result = await Payment.aggregate([
        { $match: { createdAt: dateFilter, status: { $in: ['completed', 'paid'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
        { $limit: 1000 },
      ]);
      return result[0]?.total || 0;
    }
    case 'beneficiaries': {
      const BF = safeModel('BeneficiaryFile');
      return BF ? BF.countDocuments({ createdAt: dateFilter }) : 0;
    }
    case 'sessions': {
      const Session = safeModel('Session');
      return Session ? Session.countDocuments({ date: dateFilter }) : 0;
    }
    case 'complaints': {
      const Complaint = safeModel('Complaint');
      return Complaint ? Complaint.countDocuments({ createdAt: dateFilter }) : 0;
    }
    case 'attendance': {
      const Att = safeModel('Attendance');
      if (!Att) return 0;
      const [present, total] = await Promise.all([
        Att.countDocuments({ date: dateFilter, status: 'present' }),
        Att.countDocuments({ date: dateFilter }),
      ]);
      return total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0;
    }
    default:
      return 0;
  }
}

async function calculateDynamicKPIs() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const kpis = [
    {
      code: 'BEN_TOTAL',
      name: 'Total Beneficiaries',
      nameAr: 'إجمالي المستفيدين',
      category: 'operational',
      unit: 'number',
      currentValue: await (async () => {
        const M = safeModel('BeneficiaryFile');
        return M ? M.countDocuments() : 0;
      })(),
    },
    {
      code: 'STAFF_ACTIVE',
      name: 'Active Staff',
      nameAr: 'الموظفون النشطون',
      category: 'hr',
      unit: 'number',
      currentValue: await (async () => {
        const M = safeModel('User');
        return M ? M.countDocuments({ role: { $ne: 'beneficiary' }, isActive: true }) : 0;
      })(),
    },
    {
      code: 'REV_MONTH',
      name: 'Monthly Revenue',
      nameAr: 'الإيرادات الشهرية',
      category: 'financial',
      unit: 'currency',
      currentValue: await getMetricValue('revenue', monthStart, now),
      previousValue: await getMetricValue('revenue', prevMonthStart, monthStart),
    },
    {
      code: 'SESSION_MONTH',
      name: 'Monthly Sessions',
      nameAr: 'جلسات الشهر',
      category: 'operational',
      unit: 'number',
      currentValue: await getMetricValue('sessions', monthStart, now),
      previousValue: await getMetricValue('sessions', prevMonthStart, monthStart),
    },
    {
      code: 'COMPLAINT_RESOLUTION',
      name: 'Complaint Resolution Rate',
      nameAr: 'نسبة حل الشكاوى',
      category: 'satisfaction',
      unit: 'percentage',
      currentValue: await (async () => {
        const M = safeModel('Complaint');
        if (!M) return 0;
        const [total, resolved] = await Promise.all([
          M.countDocuments({ createdAt: { $gte: monthStart } }),
          M.countDocuments({ createdAt: { $gte: monthStart }, status: 'resolved' }),
        ]);
        return total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0;
      })(),
    },
    {
      code: 'ATTENDANCE_RATE',
      name: 'Attendance Rate',
      nameAr: 'نسبة الحضور',
      category: 'hr',
      unit: 'percentage',
      currentValue: await getMetricValue('attendance', monthStart, now),
    },
  ];

  // Add trend info
  return kpis.map(kpi => ({
    ...kpi,
    trend:
      kpi.previousValue !== undefined
        ? kpi.currentValue >= kpi.previousValue
          ? 'up'
          : 'down'
        : 'stable',
    trendPercentage:
      kpi.previousValue > 0
        ? parseFloat(
            (((kpi.currentValue - kpi.previousValue) / kpi.previousValue) * 100).toFixed(1)
          )
        : 0,
  }));
}

module.exports = router;

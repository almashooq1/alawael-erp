/**
 * Branch Controller - متحكم الفروع
 * 25 API Endpoints for Branch Management System
 */
const Branch = require('../models/Branch');
const BranchAuditLog = require('../models/BranchAuditLog');
const { getBranchFilter, ROLES } = require('../services/branchPermission.service');

// ─── Helper ───────────────────────────────────────────────────────────────────
const ok = (res, data, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const fail = (res, message, statusCode = 400, errors = null) =>
  res.status(statusCode).json({ success: false, message, errors });

// ═══════════════════════════════════════════════════════════════════════════════
// BRANCH CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// [1] GET /api/branches — List all accessible branches
exports.listBranches = async (req, res) => {
  try {
    const { filter } = getBranchFilter(req.user);
    const { status, region, type, search } = req.query;

    const query = { ...filter };
    if (status) query.status = status;
    if (region) query['location.region'] = region;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name_ar: { $regex: search, $options: 'i' } },
        { name_en: { $regex: search, $options: 'i' } },
        { code: { $regex: search.toUpperCase() } },
      ];
    }

    const branches = await Branch.find(query)
      .select(
        'code name_ar name_en short_name type status location staff_count manager_name capacity monthly_target'
      )
      .sort({ code: 1 });

    ok(res, { branches, total: branches.length });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [2] GET /api/branches/:branch_code — Get branch details
exports.getBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({ code: req.params.branch_code.toUpperCase() });
    if (!branch) return fail(res, 'Branch not found', 404);
    ok(res, { branch });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [3] POST /api/branches — Create branch (HQ only)
exports.createBranch = async (req, res) => {
  try {
    const branch = await Branch.create(req.body);
    ok(res, { branch }, 'Branch created successfully', 201);
  } catch (err) {
    if (err.code === 11000) return fail(res, 'Branch code already exists', 409);
    fail(res, err.message, 400);
  }
};

// [4] PUT /api/branches/:branch_code — Update branch
exports.updateBranch = async (req, res) => {
  try {
    // ── Mass-assignment protection: whitelist allowed fields ──
    const allowedFields = [
      'nameAr',
      'nameEn',
      'type',
      'region',
      'city',
      'address',
      'phone',
      'email',
      'manager',
      'capacity',
      'operatingHours',
      'licenseNumber',
      'licenseExpiry',
      'status',
      'coordinates',
    ];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const branch = await Branch.findOneAndUpdate(
      { code: req.params.branch_code.toUpperCase() },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!branch) return fail(res, 'Branch not found', 404);
    ok(res, { branch }, 'Branch updated successfully');
  } catch (err) {
    fail(res, err.message, 400);
  }
};

// [5] DELETE /api/branches/:branch_code — Soft delete (HQ Super Admin only)
exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findOneAndUpdate(
      { code: req.params.branch_code.toUpperCase() },
      { status: 'inactive' },
      { new: true }
    );
    if (!branch) return fail(res, 'Branch not found', 404);
    ok(res, { branch }, 'Branch deactivated successfully');
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// HQ DASHBOARD - Cross-Branch KPIs
// ═══════════════════════════════════════════════════════════════════════════════

// [6] GET /api/branches/hq/dashboard — HQ Executive Dashboard
exports.getHQDashboard = async (req, res) => {
  try {
    const branches = await Branch.find({ status: 'active' }).lean();

    // Simulate live KPIs (replace with real aggregations)
    const dashboardData = {
      summary: {
        total_branches: branches.length,
        total_patients: 1245,
        total_staff: branches.reduce((s, b) => s + (b.staff_count || 0), 0),
        total_revenue_today: 87650,
        total_revenue_month: 2145000,
        average_occupancy: 78.4,
        saudization_rate: 65.2,
        critical_alerts: 3,
      },
      branches: branches.map((b, i) => ({
        code: b.code,
        name_ar: b.name_ar,
        name_en: b.name_en,
        short_name: b.short_name || b.code,
        status: b.status,
        kpis: generateBranchKPIs(b, i),
      })),
      top_performers: getTopPerformers(branches),
      bottom_performers: getBottomPerformers(branches),
      alerts: getSystemAlerts(branches),
      trends: generateTrends(),
    };

    ok(res, dashboardData);
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [7] GET /api/branches/hq/comparison — Cross-branch comparison
exports.getBranchComparison = async (req, res) => {
  try {
    const { metric = 'revenue', period = '30d' } = req.query;
    const branches = await Branch.find({ status: 'active' }).lean();

    const comparison = branches.map((b, i) => ({
      code: b.code,
      name_ar: b.name_ar,
      name_en: b.name_en,
      value: generateMetricValue(metric, i),
      target: b.monthly_target || 100000,
      achievement_pct: Math.floor(65 + Math.random() * 35),
      rank: i + 1,
      trend: Math.random() > 0.5 ? 'up' : 'down',
      vs_hq_avg: (Math.random() * 20 - 10).toFixed(1),
    }));

    comparison.sort((a, b) => b.value - a.value);
    comparison.forEach((b, i) => {
      b.rank = i + 1;
    });

    ok(res, { metric, period, comparison });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [8] GET /api/branches/hq/alerts — System-wide alerts
exports.getSystemAlerts = async (req, res) => {
  try {
    const alerts = [
      {
        id: 1,
        severity: 'critical',
        branch: 'DM',
        message_ar: 'انقطاع مؤقت في نظام الحضور',
        message_en: 'Attendance system outage',
        time: '10 دقائق',
        module: 'staff',
      },
      {
        id: 2,
        severity: 'warning',
        branch: 'RY-NORTH',
        message_ar: 'نسبة إشغال عالية 95%',
        message_en: 'High occupancy 95%',
        time: '30 دقيقة',
        module: 'schedule',
      },
      {
        id: 3,
        severity: 'info',
        branch: 'JD-MAIN',
        message_ar: 'موعد تجديد عقد 3 موظفين',
        message_en: '3 staff contracts due for renewal',
        time: 'يومان',
        module: 'staff',
      },
    ];
    ok(res, { alerts, total: alerts.length });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [9] GET /api/branches/hq/financials — Consolidated financials
exports.getConsolidatedFinancials = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const branches = await Branch.find({ status: 'active' }).lean();

    const financials = {
      period,
      total_revenue: 2145000,
      total_expenses: 1560000,
      net_profit: 585000,
      profit_margin: 27.3,
      by_branch: branches.map((b, i) => ({
        code: b.code,
        name_ar: b.name_ar,
        revenue: Math.floor(100000 + Math.random() * 300000),
        expenses: Math.floor(80000 + Math.random() * 200000),
        sessions: Math.floor(200 + Math.random() * 500),
        revenue_per_session: Math.floor(300 + Math.random() * 200),
      })),
    };

    ok(res, financials);
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// BRANCH DASHBOARD - Single Branch KPIs
// ═══════════════════════════════════════════════════════════════════════════════

// [10] GET /api/branches/:branch_code/dashboard — Branch Dashboard
exports.getBranchDashboard = async (req, res) => {
  try {
    const branchCode = req.params.branch_code.toUpperCase();
    const branch = await Branch.findOne({ code: branchCode }).lean();
    if (!branch) return fail(res, 'Branch not found', 404);

    const dashboard = {
      branch: {
        code: branch.code,
        name_ar: branch.name_ar,
        name_en: branch.name_en,
        manager_name: branch.manager_name,
        status: branch.status,
      },
      today: {
        active_patients: 85,
        sessions_morning: 18,
        sessions_evening: 12,
        sessions_total: 30,
        staff_present: 24,
        staff_total: branch.staff_count || 25,
        revenue: 18450,
        new_patients: 3,
      },
      month: {
        revenue: 287400,
        target: branch.monthly_target || 300000,
        achievement_pct: 95.8,
        total_sessions: 724,
        new_patients: 42,
        avg_satisfaction: 4.7,
      },
      kpis: [
        {
          label_ar: 'نسبة الإشغال',
          label_en: 'Occupancy Rate',
          value: 85,
          unit: '%',
          trend: 'up',
          vs_hq: '+7%',
          color: 'green',
        },
        {
          label_ar: 'رضا المرضى',
          label_en: 'Patient Satisfaction',
          value: 4.7,
          unit: '/5',
          trend: 'up',
          vs_hq: '+0.2',
          color: 'green',
        },
        {
          label_ar: 'الإيراد اليومي',
          label_en: 'Daily Revenue',
          value: 18450,
          unit: 'SAR',
          trend: 'stable',
          vs_hq: '-2%',
          color: 'blue',
        },
        {
          label_ar: 'حضور الموظفين',
          label_en: 'Staff Attendance',
          value: 96,
          unit: '%',
          trend: 'down',
          vs_hq: '-1%',
          color: 'yellow',
        },
        {
          label_ar: 'الجلسات المكتملة',
          label_en: 'Sessions Completed',
          value: 30,
          unit: 'جلسة',
          trend: 'up',
          vs_hq: '+3',
          color: 'green',
        },
      ],
      alerts: [
        {
          type: 'warning',
          message_ar: 'موظفان في إجازة مرضية',
          message_en: '2 staff on sick leave',
          module: 'staff',
        },
        {
          type: 'info',
          message_ar: 'غرفة 3 في الصيانة',
          message_en: 'Room 3 under maintenance',
          module: 'schedule',
        },
      ],
      schedule_today: generateTodaySchedule(),
    };

    ok(res, dashboard);
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [11] GET /api/branches/:branch_code/patients — Branch patients
exports.getBranchPatients = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, therapist_id } = req.query;
    const branchCode = req.branchCode || req.params.branch_code.toUpperCase();

    // For therapists: only own patients
    const user = req.user;
    const filterByTherapist = user.role === 'therapist' ? user._id : therapist_id;

    // Simulate patient data
    const patients = generateSamplePatients(branchCode, parseInt(limit), filterByTherapist);

    ok(res, {
      patients,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: 85, pages: 5 },
      branch_code: branchCode,
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [12] GET /api/branches/:branch_code/schedule — Branch schedule
exports.getBranchSchedule = async (req, res) => {
  try {
    const branchCode = req.branchCode || req.params.branch_code.toUpperCase();
    const { date, week } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    ok(res, {
      branch_code: branchCode,
      date: targetDate.toISOString().split('T')[0],
      schedule: generateTodaySchedule(),
      summary: { morning: 18, evening: 12, cancelled: 2, pending: 5 },
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [13] POST /api/branches/:branch_code/schedule — Create schedule entry
exports.createScheduleEntry = async (req, res) => {
  try {
    const branchCode = req.branchCode || req.params.branch_code.toUpperCase();
    const entry = { ...req.body, branch_code: branchCode, created_by: req.user._id };
    ok(res, { entry }, 'Schedule entry created', 201);
  } catch (err) {
    fail(res, err.message, 400);
  }
};

// [14] GET /api/branches/:branch_code/staff — Branch staff list
exports.getBranchStaff = async (req, res) => {
  try {
    const branchCode = req.branchCode || req.params.branch_code.toUpperCase();
    const staff = generateSampleStaff(branchCode);
    ok(res, { staff, total: staff.length, branch_code: branchCode });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [15] GET /api/branches/:branch_code/finance — Branch financials
exports.getBranchFinance = async (req, res) => {
  try {
    const branchCode = req.branchCode || req.params.branch_code.toUpperCase();
    const { period = 'month' } = req.query;

    ok(res, {
      branch_code: branchCode,
      period,
      revenue: 287400,
      expenses: 198000,
      net: 89400,
      sessions_revenue: 245000,
      other_revenue: 42400,
      salary_expense: 145000,
      operational_expense: 53000,
      invoices_pending: 12,
      invoices_paid: 87,
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [16] GET /api/branches/:branch_code/transport — Branch transport routes
exports.getBranchTransport = async (req, res) => {
  try {
    const branchCode = req.branchCode || req.params.branch_code.toUpperCase();
    ok(res, {
      branch_code: branchCode,
      routes: [
        {
          id: 1,
          driver: 'أحمد السالم',
          vehicle: 'تويوتا هايلاكس - ABC 1234',
          patients: 8,
          status: 'active',
          location: { lat: 24.7136, lng: 46.6753 },
        },
        {
          id: 2,
          driver: 'محمد العتيبي',
          vehicle: 'هيونداي H1 - XYZ 5678',
          patients: 6,
          status: 'returning',
          location: { lat: 24.7246, lng: 46.6953 },
        },
      ],
      summary: { total_routes: 2, active_drivers: 2, patients_in_transit: 14 },
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [17] GET /api/branches/:branch_code/reports — Branch reports
exports.getBranchReports = async (req, res) => {
  try {
    const branchCode = req.branchCode || req.params.branch_code.toUpperCase();
    ok(res, {
      branch_code: branchCode,
      available_reports: [
        { id: 'daily_summary', name_ar: 'ملخص يومي', name_en: 'Daily Summary', module: 'general' },
        {
          id: 'patient_progress',
          name_ar: 'تقدم المرضى',
          name_en: 'Patient Progress',
          module: 'patients',
        },
        {
          id: 'staff_attendance',
          name_ar: 'حضور الموظفين',
          name_en: 'Staff Attendance',
          module: 'staff',
        },
        {
          id: 'financial_statement',
          name_ar: 'كشف مالي',
          name_en: 'Financial Statement',
          module: 'finance',
        },
        {
          id: 'occupancy_rate',
          name_ar: 'معدل الإشغال',
          name_en: 'Occupancy Rate',
          module: 'schedule',
        },
      ],
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [18] GET /api/branches/:branch_code/kpis — Branch KPIs vs HQ
exports.getBranchKPIs = async (req, res) => {
  try {
    const branchCode = req.branchCode || req.params.branch_code.toUpperCase();
    const branch = await Branch.findOne({ code: branchCode }).lean();

    ok(res, {
      branch_code: branchCode,
      kpis: {
        occupancy: { value: 85, hq_avg: 78, target: 90, unit: '%' },
        patient_satisfaction: { value: 4.7, hq_avg: 4.5, target: 4.8, unit: '/5' },
        session_completion: { value: 94, hq_avg: 91, target: 95, unit: '%' },
        revenue_target: { value: 95.8, hq_avg: 88, target: 100, unit: '%' },
        staff_attendance: { value: 96, hq_avg: 94, target: 98, unit: '%' },
        saudization: { value: 68, hq_avg: 65, target: 70, unit: '%' },
        new_patients: { value: 42, hq_avg: 35, target: 50, unit: 'مريض' },
        avg_sessions_per_patient: { value: 8.4, hq_avg: 7.9, target: 9, unit: 'جلسة' },
      },
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [19] PUT /api/branches/:branch_code/settings — Update branch settings
exports.updateBranchSettings = async (req, res) => {
  try {
    const branch = await Branch.findOneAndUpdate(
      { code: req.params.branch_code.toUpperCase() },
      { $set: { settings: req.body } },
      { new: true }
    );
    if (!branch) return fail(res, 'Branch not found', 404);
    ok(res, { settings: branch.settings }, 'Settings updated');
  } catch (err) {
    fail(res, err.message, 400);
  }
};

// [20] GET /api/branches/hq/staff-optimizer — Staff allocation optimizer
exports.getStaffOptimizer = async (req, res) => {
  try {
    ok(res, {
      recommendations: [
        {
          branch: 'DM',
          issue: 'understaffed',
          action: 'Transfer 2 therapists from KH',
          priority: 'high',
          impact: '+15% capacity',
        },
        {
          branch: 'KH',
          issue: 'over_capacity',
          action: 'Reduce intake by 10%',
          priority: 'medium',
          impact: 'Reduce burnout',
        },
        {
          branch: 'RY-NORTH',
          issue: 'peak_demand',
          action: 'Extend evening shift',
          priority: 'high',
          impact: '+18 sessions/week',
        },
      ],
      staff_distribution: await getStaffDistribution(),
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [21] GET /api/branches/hq/emergency-override — Emergency controls
exports.getEmergencyControls = async (req, res) => {
  try {
    ok(res, {
      controls: [
        {
          action: 'lock_branch',
          label_ar: 'قفل الفرع',
          label_en: 'Lock Branch',
          requires: 'hq_super_admin',
        },
        {
          action: 'emergency_transfer',
          label_ar: 'نقل طارئ للمرضى',
          label_en: 'Emergency Patient Transfer',
          requires: 'hq_admin',
        },
        {
          action: 'broadcast_alert',
          label_ar: 'إرسال تنبيه عام',
          label_en: 'Broadcast Alert',
          requires: 'hq_admin',
        },
        {
          action: 'override_schedule',
          label_ar: 'تجاوز الجدول',
          label_en: 'Override Schedule',
          requires: 'hq_admin',
        },
      ],
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [22] POST /api/branches/hq/emergency-override — Execute emergency action
exports.executeEmergencyAction = async (req, res) => {
  try {
    const { action, branch_code, reason } = req.body;
    // Log the override
    await BranchAuditLog.create({
      timestamp: new Date(),
      user_id: req.user._id,
      username: req.user.username,
      role: req.user.role,
      user_branch: req.user.branch_code || 'HQ',
      target_branch: branch_code,
      module: 'emergency',
      action: action,
      allowed: true,
      reason: `EMERGENCY OVERRIDE: ${reason}`,
      ip: req.ip,
    });
    ok(
      res,
      { executed: true, action, branch_code, timestamp: new Date() },
      'Emergency action executed'
    );
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [23] GET /api/branches/:branch_code/audit-log — Branch audit log
exports.getBranchAuditLog = async (req, res) => {
  try {
    const branchCode = req.params.branch_code.toUpperCase();
    const { page = 1, limit = 50, from, to } = req.query;

    const filter = { target_branch: branchCode };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const logs = await BranchAuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BranchAuditLog.countDocuments(filter);

    ok(res, { logs, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [24] GET /api/branches/hq/audit-log — HQ-wide audit log
exports.getHQAuditLog = async (req, res) => {
  try {
    const { page = 1, limit = 100, user_id, allowed, branch } = req.query;
    const filter = {};
    if (user_id) filter.user_id = user_id;
    if (allowed !== undefined) filter.allowed = allowed === 'true';
    if (branch) filter.target_branch = branch.toUpperCase();

    const logs = await BranchAuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('user_id', 'name email');

    const total = await BranchAuditLog.countDocuments(filter);
    ok(res, { logs, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [25] GET /api/branches/permissions/matrix — Get permission matrix (for frontend)
exports.getPermissionMatrix = async (req, res) => {
  try {
    const {
      PERMISSION_MATRIX,
      ROLES,
      MODULES,
      ACTIONS,
    } = require('../services/branchPermission.service');
    ok(res, { matrix: PERMISSION_MATRIX, roles: ROLES, modules: MODULES, actions: ACTIONS });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS & INTELLIGENCE — Phase 2
// ═══════════════════════════════════════════════════════════════════════════════

const analyticsService = require('../services/branchAnalytics.service');
const notificationService = require('../services/branchNotification.service');
const BranchTarget = require('../models/BranchTarget');
const BranchPerformanceLog = require('../models/BranchPerformanceLog');

// [26] GET /hq/analytics?days=N — Network intelligence
exports.getHQAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const intelligence = await analyticsService.getNetworkIntelligence(days);
    ok(res, intelligence);
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [27] GET /hq/rankings?date=X — Branch performance rankings
exports.getBranchRankings = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const rankings = await analyticsService.getBranchRankings(date);
    ok(res, { date, rankings });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [28] GET /hq/forecast?metric=X&days=N — Network-level forecast (top 3 branches)
exports.getHQForecast = async (req, res) => {
  try {
    const { metric = 'sessions_count', days = 7 } = req.query;
    const branches = await Branch.find({ status: 'active' }).select('code name_ar').lean();
    const forecasts = await Promise.all(
      branches.slice(0, 5).map(async b => {
        try {
          const f = await analyticsService.forecastMetric(b.code, metric, parseInt(days));
          return { branch_code: b.code, name_ar: b.name_ar, forecast: f };
        } catch {
          return { branch_code: b.code, name_ar: b.name_ar, forecast: null };
        }
      })
    );
    ok(res, { metric, forecast_days: parseInt(days), forecasts });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [29] GET /hq/network-digest — Daily network digest with alerts
exports.getNetworkDigest = async (req, res) => {
  try {
    const digest = await notificationService.generateDailyDigest();
    ok(res, digest);
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [30] GET /:branch_code/analytics?days=N — Branch analytics with anomalies
exports.getBranchAnalytics = async (req, res) => {
  try {
    const branchCode = req.params.branch_code.toUpperCase();
    const days = parseInt(req.query.days) || 30;
    const [trends, anomalies] = await Promise.all([
      analyticsService.analyzeTrends(branchCode, days),
      analyticsService.detectAnomalies(branchCode, 14),
    ]);
    ok(res, { branch_code: branchCode, days, trends, anomalies });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [31] GET /:branch_code/trends?days=N — Branch metric trends
exports.getBranchTrends = async (req, res) => {
  try {
    const branchCode = req.params.branch_code.toUpperCase();
    const days = parseInt(req.query.days) || 30;
    const trends = await analyticsService.analyzeTrends(branchCode, days);
    ok(res, { branch_code: branchCode, days, trends });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [32] GET /:branch_code/forecast?metric=X&days=N — Branch metric forecast
exports.getBranchForecast = async (req, res) => {
  try {
    const branchCode = req.params.branch_code.toUpperCase();
    const { metric = 'sessions_count', days = 7 } = req.query;
    const forecast = await analyticsService.forecastMetric(branchCode, metric, parseInt(days));
    ok(res, { branch_code: branchCode, metric, forecast_days: parseInt(days), forecast });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [33] GET /:branch_code/recommendations — AI-driven recommendations
exports.getBranchRecommendations = async (req, res) => {
  try {
    const branchCode = req.params.branch_code.toUpperCase();
    const days = parseInt(req.query.days) || 14;
    const recommendations = await analyticsService.generateRecommendations(branchCode, days);
    ok(res, { branch_code: branchCode, recommendations });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [34] GET /:branch_code/targets — Get branch KPI targets
exports.getBranchTargets = async (req, res) => {
  try {
    const branchCode = req.params.branch_code.toUpperCase();
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const targets = await BranchTarget.getMonthlyTargets(branchCode, year, month);
    ok(res, { branch_code: branchCode, year, month, targets });
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// [35] POST /:branch_code/targets — Set/update branch KPI targets
exports.setBranchTargets = async (req, res) => {
  try {
    const branchCode = req.params.branch_code.toUpperCase();
    const { year, month, kpis } = req.body;

    if (!year || !month || !kpis) return fail(res, 'year, month and kpis are required', 400);

    const existing = await BranchTarget.findOne({
      branch_code: branchCode,
      year: parseInt(year),
      month: parseInt(month),
    });

    let targets;
    if (existing) {
      // Merge kpi values
      Object.keys(kpis).forEach(k => {
        if (existing.kpis.has ? existing.kpis.has(k) : existing.kpis[k] !== undefined) {
          if (existing.kpis[k]) Object.assign(existing.kpis[k], kpis[k]);
        }
      });
      existing.updated_by = req.user._id;
      targets = await existing.save();
    } else {
      targets = await BranchTarget.create({
        branch_code: branchCode,
        year: parseInt(year),
        month: parseInt(month),
        kpis,
        created_by: req.user._id,
        updated_by: req.user._id,
      });
    }

    ok(res, { branch_code: branchCode, targets }, 'Targets saved successfully');
  } catch (err) {
    fail(res, err.message, 400);
  }
};

// [36] POST /:branch_code/snapshot — Trigger daily performance snapshot
exports.triggerSnapshot = async (req, res) => {
  try {
    const branchCode = req.params.branch_code.toUpperCase();
    const data = req.body; // caller supplies today's metrics

    const snapshot = await analyticsService.buildDailySnapshot(branchCode, data);

    // Run alert scan on new snapshot
    const alerts = await notificationService.runAlertScan(branchCode, snapshot);

    ok(
      res,
      {
        branch_code: branchCode,
        snapshot_date: snapshot.snapshot_date_str,
        performance_score: snapshot.performance_score,
        performance_grade: snapshot.performance_grade,
        alerts_triggered: alerts.length,
        alerts,
      },
      'Snapshot created successfully',
      201
    );
  } catch (err) {
    fail(res, err.message, 500);
  }
};

// ─── Data Generators (Replace with real DB queries) ──────────────────────────
function generateBranchKPIs(branch, index) {
  const base = 60 + (index % 5) * 8;
  return {
    occupancy: base + Math.floor(Math.random() * 15),
    revenue: Math.floor(150000 + Math.random() * 200000),
    patients: Math.floor(60 + Math.random() * 40),
    staff_attendance: 88 + Math.floor(Math.random() * 12),
    satisfaction: (4.0 + Math.random() * 1).toFixed(1),
    sessions_today: Math.floor(20 + Math.random() * 20),
  };
}

function getTopPerformers(branches) {
  return branches.slice(0, 3).map(b => ({
    code: b.code,
    name_ar: b.name_ar,
    score: Math.floor(88 + Math.random() * 12),
  }));
}

function getBottomPerformers(branches) {
  return branches.slice(-3).map(b => ({
    code: b.code,
    name_ar: b.name_ar,
    score: Math.floor(60 + Math.random() * 20),
  }));
}

function getSystemAlerts() {
  return [
    { severity: 'critical', branch: 'DM', message_ar: 'نظام الحضور معطل', count: 1 },
    { severity: 'warning', branch: 'RY-NORTH', message_ar: 'إشغال 95%', count: 1 },
    { severity: 'warning', branch: 'KH', message_ar: '3 مواعيد فائتة', count: 3 },
  ];
}

function generateTrends() {
  const labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
  return {
    revenue: labels.map((l, i) => ({ label: l, value: 1800000 + i * 85000 })),
    patients: labels.map((l, i) => ({ label: l, value: 1100 + i * 25 })),
    sessions: labels.map((l, i) => ({ label: l, value: 8500 + i * 150 })),
  };
}

function generateMetricValue(metric, index) {
  const bases = { revenue: 200000, patients: 80, sessions: 400, occupancy: 75 };
  return Math.floor((bases[metric] || 100) * (0.7 + index * 0.05 + Math.random() * 0.3));
}

function generateTodaySchedule() {
  const slots = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (Math.random() > 0.4) {
        slots.push({
          time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          patient: `مريض ${Math.floor(Math.random() * 100)}`,
          therapist: `معالج ${Math.floor(Math.random() * 10)}`,
          room: `غرفة ${Math.floor(Math.random() * 10) + 1}`,
          status: ['confirmed', 'in_progress', 'completed', 'cancelled'][
            Math.floor(Math.random() * 4)
          ],
          type: ['PT', 'OT', 'ST', 'Psychology'][Math.floor(Math.random() * 4)],
        });
      }
    }
  }
  return slots;
}

function generateSamplePatients(branchCode, limit, therapistId) {
  const patients = [];
  for (let i = 0; i < Math.min(limit, 20); i++) {
    patients.push({
      id: `${branchCode}-P${String(i + 1).padStart(4, '0')}`,
      name_ar: `مريض ${i + 1}`,
      age: 5 + Math.floor(Math.random() * 20),
      diagnosis: ['إعاقة حركية', 'تأخر نمو', 'شلل دماغي', 'توحد', 'صعوبات تعلم'][i % 5],
      therapist_id: therapistId || `T${Math.floor(Math.random() * 10) + 1}`,
      sessions_completed: Math.floor(Math.random() * 50),
      next_session: new Date(Date.now() + Math.random() * 7 * 24 * 3600000).toISOString(),
      status: ['active', 'active', 'active', 'on_hold', 'discharged'][
        Math.floor(Math.random() * 5)
      ],
    });
  }
  return patients;
}

function generateSampleStaff(branchCode) {
  const roles = ['معالج طبيعي', 'معالج وظيفي', 'أخصائي نطق', 'مستقبل', 'سائق', 'إداري'];
  return Array.from({ length: 8 }, (_, i) => ({
    id: `${branchCode}-S${String(i + 1).padStart(3, '0')}`,
    name_ar: `موظف ${i + 1}`,
    role: roles[i % roles.length],
    status: i < 6 ? 'present' : 'absent',
    nationality: i < 5 ? 'سعودي' : 'غير سعودي',
    sessions_today: Math.floor(Math.random() * 8),
  }));
}

async function getStaffDistribution() {
  const branches = await Branch.find({ status: 'active' })
    .select('code name_ar staff_count')
    .lean();
  return branches.map(b => ({
    code: b.code,
    name_ar: b.name_ar,
    staff: b.staff_count || Math.floor(15 + Math.random() * 20),
  }));
}

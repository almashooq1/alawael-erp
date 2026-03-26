/**
 * HR Attendance Routes - مسارات الحضور والانصراف الموحدة
 * ═══════════════════════════════════════════════════════════════════
 * API موحد لنظام الحضور والانصراف يشمل:
 *  - تسجيل الحضور/الانصراف (يدوي + بايومتري)
 *  - لوحة التحكم اليومية
 *  - التقارير الشهرية والشاملة
 *  - إدارة الورديات
 *  - التصحيحات والموافقات
 *  - الإحصائيات السريعة
 *
 * Base: /api/hr-attendance
 *
 * @module routes/hr-attendance.routes
 */

const express = require('express');
const router = express.Router();
const AttendanceEngine = require('../services/hr/attendanceEngine');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Maximum records per page — prevents DoS via unbounded queries
const MAX_PAGE_LIMIT = 100;
const clampLimit = (raw, fallback) => Math.min(parseInt(raw, 10) || fallback, MAX_PAGE_LIMIT);

// Safe error message — never leak internal error details in production
const safeErrorMessage = (error) => {
  if (process.env.NODE_ENV === 'production') return 'حدث خطأ في العملية';
  return error.message || 'حدث خطأ في العملية';
};

// جميع المسارات تتطلب تسجيل الدخول
router.use(authenticateToken);

// ════════════════════════════════════════════════════════════════════════════════
//  تسجيل الحضور والانصراف (Check-In / Check-Out)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * POST /check-in
 * تسجيل حضور الموظف الحالي
 */
router.post('/check-in', async (req, res) => {
  try {
    const result = await AttendanceEngine.checkIn(req.user.employeeId || req.user.id, {
      method: req.body.method || 'web_portal',
      location: req.body.location,
      device: req.body.device,
      notes: req.body.notes,
      lateReason: req.body.lateReason,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: safeErrorMessage(error) });
  }
});

/**
 * POST /check-out
 * تسجيل انصراف الموظف الحالي
 */
router.post('/check-out', async (req, res) => {
  try {
    const result = await AttendanceEngine.checkOut(req.user.employeeId || req.user.id, {
      method: req.body.method || 'web_portal',
      location: req.body.location,
      device: req.body.device,
      notes: req.body.notes,
      earlyLeaveReason: req.body.earlyLeaveReason,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: safeErrorMessage(error) });
  }
});

/**
 * GET /today
 * حالة حضور الموظف الحالي اليوم
 */
router.get('/today', async (req, res) => {
  try {
    const result = await AttendanceEngine.getTodayStatus(req.user.employeeId || req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: safeErrorMessage(error) });
  }
});

/**
 * GET /my-records
 * سجلات حضور الموظف الحالي
 */
router.get('/my-records', async (req, res) => {
  try {
    const result = await AttendanceEngine.getEmployeeRecords(req.user.employeeId || req.user.id, {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      month: req.query.month ? parseInt(req.query.month) : undefined,
      year: req.query.year ? parseInt(req.query.year) : undefined,
      limit: clampLimit(req.query.limit, 31),
      page: parseInt(req.query.page) || 1,
      status: req.query.status,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: safeErrorMessage(error) });
  }
});

/**
 * GET /my-monthly-report
 * التقرير الشهري للموظف الحالي
 */
router.get('/my-monthly-report', async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const result = await AttendanceEngine.getMonthlyReport(
      req.user.employeeId || req.user.id,
      month,
      year
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: safeErrorMessage(error) });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
//  لوحة التحكم اليومية (Dashboard) — Manager/HR
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /dashboard
 * لوحة التحكم اليومية مع الإحصائيات
 */
router.get(
  '/dashboard',
  authorizeRole(['manager', 'hr', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const result = await AttendanceEngine.getDailyDashboard(req.query.date, {
        department: req.query.department,
        status: req.query.status,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: clampLimit(req.query.limit, 50),
      });

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: safeErrorMessage(error) });
    }
  }
);

/**
 * GET /quick-stats
 * إحصائيات سريعة
 */
router.get(
  '/quick-stats',
  authorizeRole(['manager', 'hr', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const result = await AttendanceEngine.getQuickStats();
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: safeErrorMessage(error) });
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════════
//  سجلات الموظفين (Manager/HR)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /employee/:employeeId/records
 * سجلات حضور موظف معين
 */
router.get(
  '/employee/:employeeId/records',
  authorizeRole(['manager', 'hr', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const result = await AttendanceEngine.getEmployeeRecords(req.params.employeeId, {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        month: req.query.month ? parseInt(req.query.month) : undefined,
        year: req.query.year ? parseInt(req.query.year) : undefined,
        limit: clampLimit(req.query.limit, 31),
        page: parseInt(req.query.page) || 1,
        status: req.query.status,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: safeErrorMessage(error) });
    }
  }
);

/**
 * GET /employee/:employeeId/monthly-report
 * التقرير الشهري لموظف
 */
router.get(
  '/employee/:employeeId/monthly-report',
  authorizeRole(['manager', 'hr', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const month = parseInt(req.query.month) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year) || new Date().getFullYear();

      const result = await AttendanceEngine.getMonthlyReport(req.params.employeeId, month, year);

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: safeErrorMessage(error) });
    }
  }
);

/**
 * GET /employee/:employeeId/shift
 * وردية موظف
 */
router.get(
  '/employee/:employeeId/shift',
  authorizeRole(['manager', 'hr', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const shift = await AttendanceEngine.getEmployeeShift(req.params.employeeId);
      res.json({ success: true, data: shift });
    } catch (error) {
      res.status(400).json({ success: false, message: safeErrorMessage(error) });
    }
  }
);

/**
 * POST /employee/:employeeId/check-in
 * تسجيل حضور موظف بالنيابة (تسجيل يدوي من المدير)
 */
router.post(
  '/employee/:employeeId/check-in',
  authorizeRole(['manager', 'hr', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const result = await AttendanceEngine.checkIn(req.params.employeeId, {
        method: 'manual',
        notes: req.body.notes || `تسجيل يدوي بواسطة ${req.user.name || req.user.id}`,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: safeErrorMessage(error) });
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════════
//  التقارير الشاملة (Comprehensive Reports) — Manager/HR
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /reports/comprehensive
 * تقرير شامل لفترة معينة
 */
router.get(
  '/reports/comprehensive',
  authorizeRole(['manager', 'hr', 'admin', 'hr_manager', 'finance']),
  async (req, res) => {
    try {
      const startDate = req.query.startDate || new Date(new Date().setDate(1)).toISOString();
      const endDate = req.query.endDate || new Date().toISOString();

      const result = await AttendanceEngine.getComprehensiveReport(startDate, endDate, {
        department: req.query.department,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: safeErrorMessage(error) });
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════════
//  التصحيحات والموافقات (Corrections & Approvals)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * PUT /records/:recordId
 * تعديل سجل حضور
 */
router.put(
  '/records/:recordId',
  authorizeRole(['manager', 'hr', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const result = await AttendanceEngine.updateRecord(
        req.params.recordId,
        req.body,
        req.user.id
      );

      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: safeErrorMessage(error) });
    }
  }
);

/**
 * POST /records/:recordId/approve
 * الموافقة على سجل
 */
router.post(
  '/records/:recordId/approve',
  authorizeRole(['manager', 'hr', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const result = await AttendanceEngine.approveRecord(
        req.params.recordId,
        req.user.id,
        req.body.notes
      );

      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: safeErrorMessage(error) });
    }
  }
);

/**
 * POST /records/:recordId/reject
 * رفض سجل
 */
router.post(
  '/records/:recordId/reject',
  authorizeRole(['manager', 'hr', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const result = await AttendanceEngine.rejectRecord(
        req.params.recordId,
        req.user.id,
        req.body.reason
      );

      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: safeErrorMessage(error) });
    }
  }
);

/**
 * GET /pending-approvals
 * السجلات المعلقة
 */
router.get(
  '/pending-approvals',
  authorizeRole(['manager', 'hr', 'admin', 'hr_manager']),
  async (req, res) => {
    try {
      const result = await AttendanceEngine.getPendingApprovals({
        department: req.query.department,
        page: parseInt(req.query.page) || 1,
        limit: clampLimit(req.query.limit, 50),
      });

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: safeErrorMessage(error) });
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════════
//  إدارة الورديات (Shift Management) — Admin/HR
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /shifts
 * جلب جميع الورديات
 */
router.get('/shifts', async (req, res) => {
  try {
    const shifts = await AttendanceEngine.getShifts();
    res.json({ success: true, data: shifts, count: shifts.length });
  } catch (error) {
    res.status(500).json({ success: false, message: safeErrorMessage(error) });
  }
});

/**
 * POST /shifts
 * إنشاء وردية جديدة
 */
router.post('/shifts', authorizeRole(['admin', 'hr_manager']), async (req, res) => {
  try {
    const shift = await AttendanceEngine.createShift(req.body, req.user.id);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الوردية بنجاح',
      data: shift,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: safeErrorMessage(error) });
  }
});

/**
 * PUT /shifts/:shiftId
 * تعديل وردية
 */
router.put('/shifts/:shiftId', authorizeRole(['admin', 'hr_manager']), async (req, res) => {
  try {
    const shift = await AttendanceEngine.updateShift(req.params.shiftId, req.body, req.user.id);
    res.json({
      success: true,
      message: 'تم تحديث الوردية بنجاح',
      data: shift,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: safeErrorMessage(error) });
  }
});

/**
 * POST /shifts/:shiftId/assign
 * تعيين وردية لقسم أو موظف
 */
router.post('/shifts/:shiftId/assign', authorizeRole(['admin', 'hr_manager']), async (req, res) => {
  try {
    const { targetType, targetId, targetName } = req.body;
    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        message: 'نوع الهدف ومعرفه مطلوبان',
      });
    }

    const shift = await AttendanceEngine.assignShift(
      req.params.shiftId,
      targetType,
      targetId,
      targetName,
      req.user.id
    );

    res.json({
      success: true,
      message: 'تم تعيين الوردية بنجاح',
      data: shift,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: safeErrorMessage(error) });
  }
});

/**
 * GET /my-shift
 * وردية الموظف الحالي
 */
router.get('/my-shift', async (req, res) => {
  try {
    const shift = await AttendanceEngine.getEmployeeShift(req.user.employeeId || req.user.id);
    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(400).json({ success: false, message: safeErrorMessage(error) });
  }
});

module.exports = router;

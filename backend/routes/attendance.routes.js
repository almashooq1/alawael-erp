/**
 * Attendance Routes - مسارات الحضور والغياب
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const HRAttendanceService = require('../services/hr/attendanceService');
const HRNotificationService = require('../services/hr/notificationService');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
// تسجيل الحضور
router.post('/attendance/check-in', authenticateToken, requireBranchAccess, async (req, res) => {
  try {
    const result = await HRAttendanceService.recordAttendance(req.user.employeeId, {
      checkInTime: new Date(),
      location: req.body.location,
      device: req.body.device,
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

// تسجيل الخروج
router.post('/attendance/check-out', authenticateToken, requireBranchAccess, async (req, res) => {
  try {
    const result = await HRAttendanceService.recordCheckOut(req.user.employeeId, req.body);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

// جلب سجل الحضور الشهري
router.get('/attendance/monthly-report', authenticateToken, requireBranchAccess, async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    const report = await HRAttendanceService.getMonthlyAttendanceReport(
      req.user.employeeId,
      parseInt(month),
      parseInt(year)
    );

    res.json(report);
  } catch (error) {
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

// جلب سجل موظف معين (للمديرين)
router.get(
  '/attendance/employee/:employeeId/monthly',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorizeRole(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

      const report = await HRAttendanceService.getMonthlyAttendanceReport(
        req.params.employeeId,
        parseInt(month),
        parseInt(year)
      );

      res.json(report);
    } catch (error) {
      res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
    }
  }
);

// تحليل أنماط الغياب
router.get(
  '/attendance/absence-patterns/:employeeId',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorizeRole(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const { months = 3 } = req.query;

      const analysis = await HRAttendanceService.analyzeAbsencePatterns(
        req.params.employeeId,
        parseInt(months)
      );

      res.json(analysis);
    } catch (error) {
      res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
    }
  }
);

// حساب الراتب مع الحضور
router.get(
  '/attendance/salary-calculation/:employeeId',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorizeRole(['finance', 'hr', 'admin']),
  async (req, res) => {
    try {
      const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

      const salary = await HRAttendanceService.calculateSalaryWithAttendance(
        req.params.employeeId,
        parseInt(month),
        parseInt(year)
      );

      res.json(salary);
    } catch (error) {
      res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
    }
  }
);

// ========== مسارات الإجازات ==========

// طلب إجازة
router.post(
  '/leave/request',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  validate([
    body('type').trim().notEmpty().withMessage('نوع الإجازة مطلوب'),
    body('startDate')
      .notEmpty()
      .withMessage('تاريخ البداية مطلوب')
      .isISO8601()
      .withMessage('تاريخ البداية غير صالح'),
    body('endDate')
      .notEmpty()
      .withMessage('تاريخ النهاية مطلوب')
      .isISO8601()
      .withMessage('تاريخ النهاية غير صالح'),
    body('reason').optional().isString().withMessage('سبب الإجازة يجب أن يكون نصاً'),
  ]),
  async (req, res) => {
    try {
      const result = await HRAttendanceService.requestLeave({
        employeeId: req.user.employeeId,
        type: req.body.type,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        reason: req.body.reason,
        attachment: req.body.attachment,
      });

      if (result.success) {
        // إرسال إشعار للمدير
        const employee = await require('../models/employee.model').findById(req.user.employeeId);
        await HRNotificationService.notifyLeaveRequest(employee, result.leave);
      }

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
    }
  }
);

// الموافقة على الإجازة
router.patch(
  '/leave/:leaveId/approve',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorizeRole(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const result = await HRAttendanceService.approveLeave(req.params.leaveId, {
        approvedBy: req.user.userId,
        notes: req.body.notes,
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
    }
  }
);

// رفض الإجازة
router.patch(
  '/leave/:leaveId/reject',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorizeRole(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const result = await HRAttendanceService.rejectLeave(req.params.leaveId, {
        rejectedBy: req.user.userId,
        reason: req.body.reason,
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
    }
  }
);

// الحصول على الطلبات المعلقة
router.get(
  '/leave/pending',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorizeRole(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const { department, page = 1, limit = 50 } = req.query;

      const result = await HRAttendanceService.getPendingLeaveRequests({
        departmentFilter: department,
        limit: parseInt(limit),
        page: parseInt(page),
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
    }
  }
);

// جلب أيام الإجازة المتبقية
router.get('/leave/remaining-days', authenticateToken, requireBranchAccess, async (req, res) => {
  try {
    const result = await HRAttendanceService.getRemainingLeaveDays(req.user.employeeId);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

// جلب أيام الإجازة المتبقية لموظف معين
router.get(
  '/leave/remaining-days/:employeeId',
  authenticateToken, requireBranchAccess, requireBranchAccess,
  authorizeRole(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const result = await HRAttendanceService.getRemainingLeaveDays(req.params.employeeId);

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
    }
  }
);

module.exports = router;

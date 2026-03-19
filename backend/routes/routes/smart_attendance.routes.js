/**
 * Smart Attendance Routes - مسارات API الحضور والانصراف الذكية
 * مع جميع النقاط الطرفية الضرورية والميزات المتقدمة
 */

const express = require('express');
const router = express.Router();
const SmartAttendanceService = require('../services/hr/smart_attendance_service');
const SmartLeave = require('../models/smart_leave.model');
const SmartAttendance = require('../models/advanced_attendance.model');
const { authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

// ========================
// نقاط نهائية تسجيل الحضور
// ========================

/**
 * تسجيل الدخول الذكي
 * POST /api/attendance/check-in
 */
router.post('/check-in', authMiddleware, async (req, res) => {
  try {
    const result = await SmartAttendanceService.recordSmartCheckIn(
      req.user.id,
      req.body
    );

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * تسجيل الخروج الذكي
 * POST /api/attendance/check-out
 */
router.post('/check-out', authMiddleware, async (req, res) => {
  try {
    const result = await SmartAttendanceService.recordSmartCheckOut(
      req.user.id,
      req.body
    );

    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على سجل حضور اليوم
 * GET /api/attendance/today
 */
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const record = await SmartAttendanceService.getTodayRecord(req.user.id);

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على سجلات الحضور الشهرية
 * GET /api/attendance/monthly/:month/:year
 */
router.get('/monthly/:month/:year', authMiddleware, async (req, res) => {
  try {
    const { month, year } = req.params;

    const report = await SmartAttendanceService.generateMonthlyReport(
      req.user.id,
      parseInt(month),
      parseInt(year)
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على إحصائيات الحضور الشخصية
 * GET /api/attendance/stats
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { month, year } = req.query;

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 1);

    const records = await SmartAttendance.find({
      employeeId: req.user.id,
      date: { $gte: startDate, $lt: endDate },
      isDeleted: false,
    });

    const stats = {
      month: currentMonth,
      year: currentYear,
      summary: {
        totalPresent: records.filter((r) => r.attendanceStatus === 'present')
          .length,
        totalLate: records.filter((r) => r.lateness.isLate).length,
        totalAbsent: records.filter((r) => r.attendanceStatus === 'absent')
          .length,
        totalEarlyLeave: records.filter(
          (r) => r.attendanceStatus === 'early_departure'
        ).length,
        totalWorkHours: records.reduce(
          (sum, r) => sum + (r.workDuration?.totalHours?.regular || 0),
          0
        ),
        totalOvertimeHours: records.reduce(
          (sum, r) => sum + (r.workDuration?.totalHours?.overtime || 0),
          0
        ),
        attendancePercentage: (
          (records.filter((r) => r.attendanceStatus === 'present').length /
            records.length) *
          100
        ).toFixed(2),
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على سجل حضور موظف (مدير أو HR)
 * GET /api/attendance/employee/:employeeId
 */
router.get(
  '/employee/:employeeId',
  authMiddleware,
  roleMiddleware(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { month, year, limit = 30 } = req.query;

      let query = {
        employeeId,
        isDeleted: false,
      };

      if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);
        query.date = { $gte: startDate, $lt: endDate };
      }

      const records = await SmartAttendance
        .find(query)
        .populate('employeeId', 'fullName email department')
        .populate('approvedBy', 'fullName')
        .sort({ date: -1 })
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: records,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * تحديث سجل حضور (للمديرين والموارد البشرية)
 * PUT /api/attendance/:attendanceId
 */
router.put(
  '/:attendanceId',
  authMiddleware,
  roleMiddleware(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const { attendanceId } = req.params;

      const attendance = await SmartAttendance.findById(attendanceId);

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'سجل الحضور غير موجود',
        });
      }

      // تسجيل التعديل في السجل
      if (!attendance.modificationHistory) {
        attendance.modificationHistory = [];
      }

      attendance.modificationHistory.push({
        modifiedBy: req.user.id,
        modificationDate: new Date(),
        fieldChanged: Object.keys(req.body)[0],
        oldValue: attendance[Object.keys(req.body)[0]],
        newValue: Object.values(req.body)[0],
        reason: req.body.reason,
      });

      // تحديث البيانات
      Object.assign(attendance, req.body);

      await attendance.save();

      res.json({
        success: true,
        message: 'تم تحديث السجل بنجاح',
        data: attendance,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * الموافقة على سجل حضور
 * POST /api/attendance/:attendanceId/approve
 */
router.post(
  '/:attendanceId/approve',
  authMiddleware,
  roleMiddleware(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const { attendanceId } = req.params;
      const { notes } = req.body;

      const attendance = await SmartAttendance.findByIdAndUpdate(
        attendanceId,
        {
          approvalStatus: 'approved',
          approvedBy: req.user.id,
          approvalDate: new Date(),
          approvalNotes: notes,
        },
        { new: true }
      );

      res.json({
        success: true,
        message: 'تمت الموافقة على السجل',
        data: attendance,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * رفض سجل حضور
 * POST /api/attendance/:attendanceId/reject
 */
router.post(
  '/:attendanceId/reject',
  authMiddleware,
  roleMiddleware(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const { attendanceId } = req.params;
      const { reason } = req.body;

      const attendance = await SmartAttendance.findByIdAndUpdate(
        attendanceId,
        {
          approvalStatus: 'rejected',
          approvedBy: req.user.id,
          approvalDate: new Date(),
          approvalNotes: reason,
        },
        { new: true }
      );

      res.json({
        success: true,
        message: 'تم رفض السجل',
        data: attendance,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ========================
// نقاط نهائية الإجازات
// ========================

/**
 * طلب إجازة جديد
 * POST /api/attendance/leave/request
 */
router.post('/leave/request', authMiddleware, async (req, res) => {
  try {
    const newLeave = new SmartLeave({
      employeeId: req.user.id,
      leaveType: req.body.leaveType,
      period: {
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        durationInDays: req.body.durationInDays,
      },
      reason: req.body.reason,
      detailedDescription: req.body.detailedDescription,
      attachments: req.body.attachments || [],
      coverage: req.body.coverage,
    });

    // إضافة مستويات الموافقة
    newLeave.approvals = [
      { level: 'direct_manager', status: 'pending' },
      { level: 'hr_manager', status: 'pending' },
    ];

    await newLeave.save();

    res.json({
      success: true,
      message: 'تم تقديم طلب الإجازة بنجاح',
      data: newLeave,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على طلبات الإجازة الشخصية
 * GET /api/attendance/leave/my-requests
 */
router.get('/leave/my-requests', authMiddleware, async (req, res) => {
  try {
    const leaves = await SmartLeave
      .find({ employeeId: req.user.id, isDeleted: false })
      .populate('approvals.approverId', 'fullName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: leaves,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على طلبات الإجازة المعلقة (للمديرين)
 * GET /api/attendance/leave/pending
 */
router.get(
  '/leave/pending',
  authMiddleware,
  roleMiddleware(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const leaves = await SmartLeave
        .find({ overallStatus: 'pending', isDeleted: false })
        .populate('employeeId', 'fullName email department')
        .populate('coverage.alternateEmployeeId', 'fullName')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: leaves,
        count: leaves.length,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * الموافقة على طلب إجازة
 * POST /api/attendance/leave/:leaveId/approve
 */
router.post(
  '/leave/:leaveId/approve',
  authMiddleware,
  roleMiddleware(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const { leaveId } = req.params;
      const { level, comments } = req.body;

      const leave = await SmartLeave.findById(leaveId);

      if (!leave) {
        return res.status(404).json({
          success: false,
          message: 'طلب الإجازة غير موجود',
        });
      }

      await leave.approve(req.user.id, level || 'direct_manager', comments);

      res.json({
        success: true,
        message: 'تمت الموافقة على الإجازة',
        data: leave,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * رفض طلب إجازة
 * POST /api/attendance/leave/:leaveId/reject
 */
router.post(
  '/leave/:leaveId/reject',
  authMiddleware,
  roleMiddleware(['manager', 'hr', 'admin']),
  async (req, res) => {
    try {
      const { leaveId } = req.params;
      const { level, reason } = req.body;

      const leave = await SmartLeave.findById(leaveId);

      if (!leave) {
        return res.status(404).json({
          success: false,
          message: 'طلب الإجازة غير موجود',
        });
      }

      await leave.reject(req.user.id, level || 'direct_manager', reason);

      res.json({
        success: true,
        message: 'تم رفض الإجازة',
        data: leave,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * إلغاء طلب إجازة
 * POST /api/attendance/leave/:leaveId/cancel
 */
router.post('/leave/:leaveId/cancel', authMiddleware, async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { reason } = req.body;

    const leave = await SmartLeave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'طلب الإجازة غير موجود',
      });
    }

    // التحقق من أن المستخدم هو مقدم الطلب أو مدير
    if (leave.employeeId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'لا توجد صلاحية لإلغاء هذا الطلب',
      });
    }

    await leave.cancel(req.user.id, reason);

    res.json({
      success: true,
      message: 'تم إلغاء الإجازة',
      data: leave,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ========================
// نقاط نهائية التقارير
// ========================

/**
 * الحصول على تقرير حضور شامل
 * GET /api/attendance/report/comprehensive
 */
router.get(
  '/report/comprehensive',
  authMiddleware,
  roleMiddleware(['hr', 'admin']),
  async (req, res) => {
    try {
      const { startDate, endDate, department } = req.query;

      let query = { isDeleted: false };

      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      let attendanceRecords = await SmartAttendance
        .find(query)
        .populate('employeeId', 'fullName department')
        .sort({ date: -1 });

      // تصفية حسب الإدارة إذا لزم الأمر
      if (department) {
        attendanceRecords = attendanceRecords.filter(
          (r) => r.employeeId.department === department
        );
      }

      // حساب الإحصائيات الشاملة
      const summary = {
        totalRecords: attendanceRecords.length,
        presentCount: attendanceRecords.filter(
          (r) => r.attendanceStatus === 'present'
        ).length,
        lateCount: attendanceRecords.filter((r) => r.lateness.isLate).length,
        absentCount: attendanceRecords.filter(
          (r) => r.attendanceStatus === 'absent'
        ).length,
        totalWorkHours: attendanceRecords.reduce(
          (sum, r) => sum + (r.workDuration?.totalHours?.regular || 0),
          0
        ),
        totalOvertimeHours: attendanceRecords.reduce(
          (sum, r) => sum + (r.workDuration?.totalHours?.overtime || 0),
          0
        ),
        departmentStats: {},
      };

      // حساب الإحصائيات حسب الإدارة
      attendanceRecords.forEach((record) => {
        const deptName = record.employeeId.department;

        if (!summary.departmentStats[deptName]) {
          summary.departmentStats[deptName] = {
            total: 0,
            present: 0,
            late: 0,
            absent: 0,
          };
        }

        summary.departmentStats[deptName].total += 1;

        if (record.attendanceStatus === 'present') {
          summary.departmentStats[deptName].present += 1;
        }

        if (record.lateness.isLate) {
          summary.departmentStats[deptName].late += 1;
        }

        if (record.attendanceStatus === 'absent') {
          summary.departmentStats[deptName].absent += 1;
        }
      });

      res.json({
        success: true,
        data: {
          records: attendanceRecords.slice(0, 100), // أول 100 سجل
          summary,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

module.exports = router;

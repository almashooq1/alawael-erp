/**
 * مسارات API الحضور والانصراف
 * جميع endpoints نظام الحضور الذكي
 */

const express = require('express');
const router = express.Router();
const { AttendanceService, LeaveService, _ReportService } = require('../services/attendanceService');

// تهيئة الخدمات
const attendanceService = new AttendanceService();
const leaveService = new LeaveService();
const reportService = new ReportService();

// ============================================================================
// 1. مسارات الحضور والانصراف
// ============================================================================

/**
 * تسجيل الحضور
 * POST /api/attendance/check-in
 */
router.post('/check-in', async (req, res) => {
  try {
    const { employeeId, location, photo, verificationMethod, deviceId, ipAddress } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الموظف مطلوب',
      });
    }

    const result = await attendanceService.checkIn(employeeId, {
      location,
      photo,
      verificationMethod,
      deviceId,
      ipAddress: req.ip || ipAddress,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      isLate: result.isLate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * تسجيل الانصراف
 * POST /api/attendance/check-out
 */
router.post('/check-out', async (req, res) => {
  try {
    const { employeeId, location, photo } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الموظف مطلوب',
      });
    }

    const result = await attendanceService.checkOut(employeeId, {
      location,
      photo,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
      workDuration: result.workDuration,
      overtime: result.overtime,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على سجلات الحضور
 * GET /api/attendance/records/:employeeId
 */
router.get('/records/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, status } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ البداية والنهاية مطلوبان',
      });
    }

    const records = await attendanceService.getAttendanceRecords(
      employeeId,
      new Date(startDate),
      new Date(endDate),
      { status }
    );

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * إدخال حضور يدوي (للمديرين)
 * POST /api/attendance/manual-entry
 */
router.post('/manual-entry', async (req, res) => {
  try {
    const { employeeId, checkInTime, checkOutTime, date, status, reason, notes } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({
        success: false,
        message: 'معرف الموظف والتاريخ مطلوبان',
      });
    }

    const result = await attendanceService.manualEntry(employeeId, {
      checkInTime,
      checkOutTime,
      date,
      status,
      reason,
      notes,
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على حالة الحضور اليومية
 * GET /api/attendance/daily-status/:employeeId
 */
router.get('/daily-status/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await attendanceService.getAttendanceRecords(
      employeeId,
      today,
      new Date(today.getTime() + 24 * 60 * 60 * 1000)
    );

    const status = {
      checkedIn: records.length > 0 && records[0].checkInTime ? true : false,
      checkedOut: records.length > 0 && records[0].checkOutTime ? true : false,
      checkInTime: records.length > 0 ? records[0].checkInTime : null,
      checkOutTime: records.length > 0 ? records[0].checkOutTime : null,
      status: records.length > 0 ? records[0].status : null,
      isLate: records.length > 0 ? records[0].checkInStatus === 'متأخر' : false,
      latenessMinutes: records.length > 0 ? records[0].latenessMinutes : 0,
    };

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================================
// 2. مسارات إدارة الإجازات
// ============================================================================

/**
 * طلب إجازة
 * POST /api/leave/request
 */
router.post('/request', async (req, res) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason, documents, isPaidLeave } = req.body;

    if (!employeeId || !leaveType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة',
      });
    }

    const result = await leaveService.requestLeave(employeeId, {
      leaveType,
      startDate,
      endDate,
      reason,
      documents,
      isPaidLeave,
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الموافقة على الإجازة
 * PUT /api/leave/approve/:leaveId
 */
router.put('/approve/:leaveId', async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { approvedBy, reject, rejectionReason } = req.body;

    const result = await leaveService.approveLeave(
      leaveId,
      approvedBy,
      reject ? rejectionReason : null
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على رصيد الإجازات
 * GET /api/leave/balance/:employeeId
 */
router.get('/balance/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    const balance = await leaveService.getLeaveBalance(employeeId);

    res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على طلبات الإجازات المعلقة
 * GET /api/leave/pending
 */
router.get('/pending', async (req, res) => {
  try {
    const { employeeId } = req.query;

    const leaves = await leaveService.getPendingLeaveRequests({
      employeeId,
    });

    res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على تاريخ الإجازات
 * GET /api/leave/history/:employeeId
 */
router.get('/history/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const leaves = await require('../models/attendanceModel')
      .Leave.find({
        employeeId,
        startDate: {
          $gte: new Date(currentYear, 0, 1),
          $lte: new Date(currentYear, 11, 31),
        },
      })
      .sort({ startDate: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================================
// 3. مسارات التقارير
// ============================================================================

/**
 * إنشاء تقرير شهري
 * POST /api/reports/monthly
 */
router.post('/monthly', async (req, res) => {
  try {
    const { employeeId, year, month } = req.body;

    if (!employeeId || !year || !month) {
      return res.status(400).json({
        success: false,
        message: 'معرف الموظف والسنة والشهر مطلوبة',
      });
    }

    const result = await reportService.generateMonthlyReport(employeeId, year, month);

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على التقارير الشهرية
 * GET /api/reports/monthly/:employeeId
 */
router.get('/monthly/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const reports = await reportService.getMonthlyReports(employeeId, currentYear);

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * الحصول على التقرير الشامل
 * GET /api/reports/comprehensive/:employeeId
 */
router.get('/comprehensive/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'تاريخ البداية والنهاية مطلوبان',
      });
    }

    const report = await reportService.getComprehensiveReport(
      employeeId,
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * تقرير الحضور اليومي للقسم
 * GET /api/reports/department-daily
 */
router.get('/department-daily', async (req, res) => {
  try {
    const { departmentId, date } = req.query;

    if (!departmentId || !date) {
      return res.status(400).json({
        success: false,
        message: 'معرف القسم والتاريخ مطلوبان',
      });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const { AttendanceRecord } = require('../models/attendanceModel');
    const records = await AttendanceRecord.find({
      date: {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
      },
    })
      .populate('employeeId', 'name email department')
      .lean();

    const summary = {
      present: records.filter(r => r.status === 'حاضر').length,
      absent: records.filter(r => r.status === 'غياب').length,
      late: records.filter(r => r.checkInStatus === 'متأخر').length,
      onLeave: records.filter(r => r.status === 'إجازة').length,
      total: records.length,
    };

    res.status(200).json({
      success: true,
      date: targetDate,
      summary,
      data: records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * تقرير الحضور السنوي
 * GET /api/reports/annual/:employeeId
 */
router.get('/annual/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const { AttendanceRecord, MonthlyReport } = require('../models/attendanceModel');

    // الحصول على جميع التقارير الشهرية
    const monthlyReports = await MonthlyReport.find({
      employeeId,
      year: currentYear,
    }).sort({ month: 1 });

    // تجميع البيانات
    const annualSummary = {
      year: currentYear,
      totalDaysPresent: 0,
      totalDaysAbsent: 0,
      totalDaysLate: 0,
      totalWorkHours: 0,
      totalOvertimeHours: 0,
      averageAttendance: 0,
      monthlyData: monthlyReports,
    };

    monthlyReports.forEach(report => {
      annualSummary.totalDaysPresent += report.totalDaysPresent || 0;
      annualSummary.totalDaysAbsent += report.totalDaysAbsent || 0;
      annualSummary.totalDaysLate += report.totalDaysLate || 0;
      annualSummary.totalWorkHours += report.totalWorkHours || 0;
      annualSummary.totalOvertimeHours += report.totalOvertimeHours || 0;
    });

    if (monthlyReports.length > 0) {
      annualSummary.averageAttendance =
        (annualSummary.totalDaysPresent /
          (annualSummary.totalDaysPresent + annualSummary.totalDaysAbsent)) *
        100;
    }

    res.status(200).json({
      success: true,
      data: annualSummary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================================
// 4. مسارات الإحصائيات والتحليلات
// ============================================================================

/**
 * إحصائيات الحضور
 * GET /api/attendance/statistics/:employeeId
 */
router.get('/statistics/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { months = 3 } = req.query;

    const { AttendanceRecord } = require('../models/attendanceModel');

    // تحديد تاريخ البداية
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const records = await AttendanceRecord.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate },
    });

    const statistics = {
      period: `آخر ${months} أشهر`,
      totalRecords: records.length,
      attendance: {
        present: records.filter(r => r.status === 'حاضر').length,
        absent: records.filter(r => r.status === 'غياب').length,
        late: records.filter(r => r.checkInStatus === 'متأخر').length,
        onLeave: records.filter(r => r.status === 'إجازة').length,
      },
      time: {
        totalWorkHours: records.reduce((sum, r) => sum + (r.workDuration || 0), 0),
        totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeMinutes || 0) / 60, 0),
        averageDailyHours: 0,
        averageLatenessMinutes: 0,
      },
      quality: {
        attendanceRate: 0,
        punctualityRate: 0,
      },
    };

    if (records.length > 0) {
      statistics.time.averageDailyHours = statistics.time.totalWorkHours / records.length;
      statistics.time.averageLatenessMinutes =
        records.reduce((sum, r) => sum + (r.latenessMinutes || 0), 0) / records.length;
      statistics.quality.attendanceRate = (
        (statistics.attendance.present / records.length) *
        100
      ).toFixed(2);
      statistics.quality.punctualityRate = (
        ((records.length - statistics.attendance.late) / records.length) *
        100
      ).toFixed(2);
    }

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================================
// التصدير
// ============================================================================

module.exports = router;

/**
 * Advanced HR Routes
 * مسارات الموارد البشرية المتقدمة
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');

// Validation helper
const validateInput = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

const {
  PerformanceManagementService,
  LeaveManagementService,
  AttendanceService,
  PayrollService,
  TrainingService,
} = require('../services/hr.advanced.service');

// ============ PERFORMANCE MANAGEMENT ROUTES ============

/**
 * Create Performance Review
 * POST /hr/performance/reviews
 */
router.post('/performance/reviews', authenticateToken, async (req, res) => {
  try {
    validateInput(req.body, ['employeeId', 'ratings', 'reviewerId']);

    const review = await PerformanceManagementService.createPerformanceReview(req.body);

    res.status(201).json({
      message: 'Performance review created successfully',
      review,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get Performance History
 * GET /hr/performance/:employeeId/history
 */
router.get('/performance/:employeeId/history', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { months = 12 } = req.query;

    const history = await PerformanceManagementService.getPerformanceHistory(
      employeeId,
      parseInt(months)
    );

    res.json({
      message: 'Performance history retrieved',
      data: history,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Generate Performance Report (Department)
 * GET /hr/performance/report/:departmentId
 */
router.get('/performance/report/:departmentId', authenticateToken, async (req, res) => {
  try {
    const { departmentId } = req.params;

    const report = await PerformanceManagementService.generatePerformanceReport(departmentId);

    res.json({
      message: 'Performance report generated',
      report,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ LEAVE MANAGEMENT ROUTES ============

/**
 * Submit Leave Request
 * POST /hr/leave/request
 */
router.post('/leave/request', authenticateToken, async (req, res) => {
  try {
    validateInput(req.body, ['leaveType', 'startDate', 'endDate', 'reason']);

    const leaveRequest = await LeaveManagementService.submitLeaveRequest(req.user.id, req.body);

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Approve/Reject Leave Request
 * PUT /hr/leave/request/:leaveRequestId
 */
router.put('/leave/request/:leaveRequestId', authenticateToken, async (req, res) => {
  try {
    const { leaveRequestId } = req.params;
    const { approved, comments } = req.body;

    const leaveRequest = await LeaveManagementService.approveLeaveRequest(
      leaveRequestId,
      req.user.id,
      approved,
      comments
    );

    res.json({
      message: `Leave request ${approved ? 'approved' : 'rejected'} successfully`,
      leaveRequest,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get Leave Balance
 * GET /hr/leave/balance
 */
router.get('/leave/balance', authenticateToken, async (req, res) => {
  try {
    const balance = await LeaveManagementService.getLeaveBalance(req.user.id);

    res.json({
      message: 'Leave balance retrieved',
      balance,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get Employee Leave Requests
 * GET /hr/leave/requests/:employeeId
 */
router.get('/leave/requests/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { LeaveRequest } = require('../models/hr.advanced');

    const requests = await LeaveRequest.find({ employeeId: req.params.employeeId }).sort({
      createdAt: -1,
    });

    res.json({
      message: 'Leave requests retrieved',
      requests,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ ATTENDANCE ROUTES ============

/**
 * Check-In
 * POST /hr/attendance/checkin
 */
router.post('/attendance/checkin', authenticateToken, async (req, res) => {
  try {
    const { location } = req.body;

    const attendance = await AttendanceService.recordCheckIn(req.user.id, location);

    res.status(201).json({
      message: 'Check-in recorded successfully',
      attendance,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Check-Out
 * POST /hr/attendance/checkout
 */
router.post('/attendance/checkout', authenticateToken, async (req, res) => {
  try {
    const attendance = await AttendanceService.recordCheckOut(req.user.id);

    res.json({
      message: 'Check-out recorded successfully',
      attendance,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get Attendance Report
 * GET /hr/attendance/report/:month
 */
router.get('/attendance/report/:month', authenticateToken, async (req, res) => {
  try {
    const { month } = req.params;

    const report = await AttendanceService.getAttendanceReport(req.user.id, month);

    res.json({
      message: 'Attendance report retrieved',
      report,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get Department Attendance Report
 * GET /hr/attendance/department/:departmentId/:month
 */
router.get('/attendance/department/:departmentId/:month', authenticateToken, async (req, res) => {
  try {
    const { Attendance } = require('../models/hr.advanced');
    const Employee = require('../models/Employee');

    const { departmentId, month } = req.params;
    const [year, monthNum] = month.split('-');
    const startDate = new Date(`${year}-${monthNum}-01`);
    const endDate = new Date(year, monthNum, 0);

    // Get all employees in department
    const employees = await Employee.find({ department: departmentId });
    const employeeIds = employees.map(e => e._id);

    const attendance = await Attendance.find({
      employeeId: { $in: employeeIds },
      date: { $gte: startDate, $lte: endDate },
    }).populate('employeeId');

    const stats = {
      totalPresent: attendance.filter(a => a.status === 'present').length,
      totalAbsent: attendance.filter(a => a.status === 'absent').length,
      totalLate: attendance.filter(a => a.status === 'late').length,
      averageAttendanceRate: 0,
    };

    stats.averageAttendanceRate = ((stats.totalPresent / attendance.length) * 100).toFixed(2);

    res.json({
      message: 'Department attendance report retrieved',
      month,
      stats,
      records: attendance,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ PAYROLL ROUTES ============

/**
 * Calculate Payroll
 * POST /hr/payroll/calculate
 */
router.post('/payroll/calculate', authenticateToken, async (req, res) => {
  try {
    validateInput(req.body, ['employeeId', 'payPeriod']);

    const payroll = await PayrollService.calculatePayroll(req.body.employeeId, req.body.payPeriod);

    res.status(201).json({
      message: 'Payroll calculated successfully',
      payroll,
    });
  } catch (error) {
    console.error('Payroll calculate error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Process Payment
 * PUT /hr/payroll/:payrollId/process
 */
router.put('/payroll/:payrollId/process', authenticateToken, async (req, res) => {
  try {
    const { payrollId } = req.params;

    const payroll = await PayrollService.processPayment(payrollId);

    res.json({
      message: 'Payment processed successfully',
      payroll,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Generate Payslip
 * GET /hr/payroll/:payrollId/payslip
 */
router.get('/payroll/:payrollId/payslip', authenticateToken, async (req, res) => {
  try {
    const { payrollId } = req.params;

    const payslip = await PayrollService.generatePayslip(payrollId);

    res.json({
      message: 'Payslip generated successfully',
      payslip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get Employee Payroll History
 * GET /hr/payroll/history/:employeeId
 */
router.get('/payroll/history/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { Payroll } = require('../models/hr.advanced');
    const { employeeId } = req.params;
    const { months = 6 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const payrolls = await Payroll.find({
      employeeId,
      createdAt: { $gte: startDate },
    }).sort({ createdAt: -1 });

    res.json({
      message: 'Payroll history retrieved',
      payrolls,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ TRAINING ROUTES ============

/**
 * Create Training Program
 * POST /hr/training
 */
router.post('/training', authenticateToken, async (req, res) => {
  try {
    validateInput(req.body, ['trainingName', 'startDate', 'endDate']);

    const training = await TrainingService.createTraining(req.body);

    res.status(201).json({
      message: 'Training program created successfully',
      training,
    });
  } catch (error) {
    console.error('Training create error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Register Employee for Training
 * POST /hr/training/:trainingId/register
 */
router.post('/training/:trainingId/register', authenticateToken, async (req, res) => {
  try {
    const { trainingId } = req.params;
    const { employeeId } = req.body;

    const training = await TrainingService.registerEmployee(trainingId, employeeId);

    res.status(201).json({
      message: 'Employee registered for training successfully',
      training,
    });
  } catch (error) {
    console.error('Training register error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Mark Training Attendance
 * PUT /hr/training/:trainingId/attendance
 */
router.put('/training/:trainingId/attendance', authenticateToken, async (req, res) => {
  try {
    const { trainingId } = req.params;
    const { employeeId, status, score } = req.body;

    const training = await TrainingService.markAttendance(trainingId, employeeId, status, score);

    res.json({
      message: 'Attendance marked successfully',
      training,
    });
  } catch (error) {
    console.error('Training attendance error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get All Training Programs
 * GET /hr/training
 */
router.get('/training', authenticateToken, async (req, res) => {
  try {
    const { Training } = require('../models/hr.advanced');

    const trainings = await Training.find().sort({ startDate: -1 });

    res.json({
      message: 'Training programs retrieved',
      trainings,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get Training Details
 * GET /hr/training/:trainingId
 */
router.get('/training/:trainingId', authenticateToken, async (req, res) => {
  try {
    const { Training } = require('../models/hr.advanced');
    const { trainingId } = req.params;

    const training = await Training.findById(trainingId).populate(
      'participants.employeeId',
      'firstName lastName'
    );

    if (!training) {
      return res.status(404).json({ error: 'Training not found' });
    }

    res.json({
      message: 'Training details retrieved',
      training,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ HR ANALYTICS ROUTES ============

/**
 * Get HR Analytics Dashboard
 * GET /hr/analytics/:departmentId/:month
 */
router.get('/analytics/:departmentId/:month', authenticateToken, async (req, res) => {
  try {
    const { HRAnalytics } = require('../models/hr.advanced');
    const { departmentId, month } = req.params;

    const analytics = await HRAnalytics.findOne({
      departmentId,
      month,
    });

    if (!analytics) {
      return res.status(404).json({ error: 'Analytics data not found' });
    }

    res.json({
      message: 'HR analytics retrieved',
      analytics,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Generate HR Analytics Report
 * POST /hr/analytics/generate
 */
router.post('/analytics/generate', authenticateToken, async (req, res) => {
  try {
    const { departmentId, month } = req.body;
    const {
      HRAnalytics,
      PerformanceReview,
      LeaveRequest,
      Attendance,
      Payroll,
      Training,
    } = require('../models/hr.advanced');
    const Employee = require('../models/Employee');

    const employees = await Employee.find({ department: departmentId });
    const employeeIds = employees.map(e => e._id);

    const [year, monthNum] = month.split('-');
    const startDate = new Date(`${year}-${monthNum}-01`);
    const endDate = new Date(year, monthNum, 0);

    // Calculate metrics
    const totalEmployees = employees.length;

    const reviews = await PerformanceReview.find({
      employeeId: { $in: employeeIds },
      reviewDate: { $gte: startDate, $lte: endDate },
    });

    const leaveRequests = await LeaveRequest.find({
      employeeId: { $in: employeeIds },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const attendance = await Attendance.find({
      employeeId: { $in: employeeIds },
      date: { $gte: startDate, $lte: endDate },
    });

    const payrolls = await Payroll.find({
      employeeId: { $in: employeeIds },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const analytics = await HRAnalytics.create({
      month,
      departmentId,
      totalEmployees,
      newHires: 0,
      attrition: 0,
      attritionRate: 0,
      averagePerformanceRating:
        reviews.length > 0
          ? (
              reviews.reduce((sum, r) => sum + parseFloat(r.averageRating), 0) / reviews.length
            ).toFixed(2)
          : 0,
      highPerformers: reviews.filter(r => r.overallAssessment === 'excellent').length,
      needsImprovementCount: reviews.filter(r => r.overallAssessment === 'unsatisfactory').length,
      avgAttendanceRate:
        attendance.length > 0
          ? (
              (attendance.filter(a => a.status === 'present').length / attendance.length) *
              100
            ).toFixed(2)
          : 0,
      totalAbsences: attendance.filter(a => a.status === 'absent').length,
      totalLeaveRequests: leaveRequests.length,
      approvedLeave: leaveRequests.filter(l => l.status === 'approved').length,
      totalPayrollCost: payrolls.reduce((sum, p) => sum + p.netSalary, 0),
      avgSalary:
        payrolls.length > 0
          ? (payrolls.reduce((sum, p) => sum + p.netSalary, 0) / payrolls.length).toFixed(2)
          : 0,
    });

    res.status(201).json({
      message: 'HR analytics generated successfully',
      analytics,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

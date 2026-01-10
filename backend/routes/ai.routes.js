const express = require('express');
const router = express.Router();
const {
  AttendancePrediction,
  SalaryPrediction,
  LeaveTrendAnalysis,
  AutomationWorkflow,
  PerformanceScore,
  SmartInsights,
} = require('../models/AI.memory');
const Employee = require('../models/Employee.memory');
const Attendance = require('../models/Attendance.memory');
const Leave = require('../models/Leave.memory');
const { Expense } = require('../models/Finance.memory');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// ==================== PREDICTIONS ====================

/**
 * @route   GET /api/ai/predictions/attendance
 * @desc    التنبؤ بأنماط الحضور
 */
router.get('/predictions/attendance', async (req, res) => {
  try {
    const { employeeId } = req.query;

    const attendances = await Attendance.find();

    if (employeeId) {
      const prediction = AttendancePrediction.predictAbsence(attendances, employeeId);
      return res.json({
        success: true,
        data: prediction,
      });
    }

    // توقعات لجميع الموظفين
    const employees = await Employee.find();
    const predictions = employees.map(emp => AttendancePrediction.predictAbsence(attendances, emp._id));

    res.json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/ai/predictions/salary
 * @desc    التنبؤ باحتياجات الرواتب
 */
router.get('/predictions/salary', async (req, res) => {
  try {
    const employees = await Employee.find();
    const prediction = SalaryPrediction.predictSalaryNeed(employees);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/ai/predictions/leaves
 * @desc    التنبؤ باحتياجات الإجازات
 */
router.get('/predictions/leaves', async (req, res) => {
  try {
    const employees = await Employee.find();
    const leaves = await Leave.find();

    const prediction = LeaveTrendAnalysis.predictLeaveNeeds(leaves, employees);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== PERFORMANCE ====================

/**
 * @route   GET /api/ai/performance/:employeeId
 * @desc    حساب درجة الأداء
 */
router.get('/performance/:employeeId', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'الموظف غير موجود',
      });
    }

    const attendances = (await Attendance.find()).filter(a => a.employeeId === req.params.employeeId);
    const leaves = (await Leave.find()).filter(l => l.employeeId === req.params.employeeId);

    const score = PerformanceScore.calculate(employee, attendances, leaves);
    const level = PerformanceScore.getPerformanceLevel(score);

    res.json({
      success: true,
      data: {
        employeeId: employee._id,
        employeeName: employee.fullName,
        score,
        level,
        details: {
          attendanceCount: attendances.length,
          leaveCount: leaves.length,
          department: employee.department,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/ai/performance/all
 * @desc    حساب درجات الأداء لجميع الموظفين
 */
router.get('/performance/all', async (req, res) => {
  try {
    const employees = await Employee.find();
    const attendances = await Attendance.find();
    const leaves = await Leave.find();

    const performances = employees
      .map(emp => {
        const empAttendances = attendances.filter(a => a.employeeId === emp._id);
        const empLeaves = leaves.filter(l => l.employeeId === emp._id);
        const score = PerformanceScore.calculate(emp, empAttendances, empLeaves);

        return {
          employeeId: emp._id,
          employeeName: emp.fullName,
          score,
          level: PerformanceScore.getPerformanceLevel(score),
        };
      })
      .sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: performances,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== INSIGHTS ====================

/**
 * @route   GET /api/ai/insights
 * @desc    الحصول على رؤى ذكية
 */
router.get('/insights', async (req, res) => {
  try {
    const employees = await Employee.find();
    const attendances = await Attendance.find();
    const leaves = await Leave.find();
    const expenses = Expense.find();

    const insights = SmartInsights.generateInsights(employees, attendances, leaves, expenses);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ==================== AUTOMATIONS ====================

/**
 * @route   GET /api/ai/automations
 * @desc    الحصول على جميع الأتمتات
 */
router.get('/automations', async (req, res) => {
  try {
    const automations = await AutomationWorkflow.find();
    res.json({
      success: true,
      data: automations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/ai/automations
 * @desc    إنشاء أتمتة جديدة
 */
router.post('/automations', async (req, res) => {
  try {
    const { name, trigger, action } = req.body;

    if (!name || !trigger || !action) {
      return res.status(400).json({
        success: false,
        message: 'name و trigger و action مطلوبة',
      });
    }

    const automation = AutomationWorkflow.create(req.body);

    res.status(201).json({
      success: true,
      data: automation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @route   PATCH /api/ai/automations/:id/toggle
 * @desc    تفعيل/تعطيل أتمتة
 */
router.patch('/automations/:id/toggle', (req, res) => {
  try {
    const automation = AutomationWorkflow.toggleAutomation(req.params.id);

    if (!automation) {
      return res.status(404).json({
        success: false,
        message: 'الأتمتة غير موجودة',
      });
    }

    res.json({
      success: true,
      data: automation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;

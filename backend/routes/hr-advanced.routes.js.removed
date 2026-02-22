/**
 * Advanced HR Routes - Enhanced API Endpoints
 * مسارات الموارد البشرية المتقدمة
 */

const express = require('express');
const router = express.Router();
const hrService = require('../services/hr-advanced.service');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../utils/errorHandler');

// ============= إدارة الموظفين =============

/**
 * إنشاء موظف جديد
 */
router.post(
  '/employees',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const employee = await hrService.createEmployee(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الموظف بنجاح',
      data: employee,
    });
  }),
);

/**
 * الحصول على جميع الموظفين
 */
router.get(
  '/employees',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { department, status, page = 1, limit = 20 } = req.query;
    const Employee = require('../models/employee.model');

    let query = {};
    if (department) query.department = department;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const employees = await Employee.find(query).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });

    const total = await Employee.countDocuments(query);

    res.json({
      success: true,
      data: employees,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
      },
    });
  }),
);

/**
 * الحصول على ملف الموظف الشامل
 */
router.get(
  '/employees/:id/profile',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const profile = await hrService.getEmployeeProfile(req.params.id);
    res.json({
      success: true,
      data: profile,
    });
  }),
);

/**
 * تحديث بيانات الموظف
 */
router.put(
  '/employees/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const employee = await hrService.updateEmployee(req.params.id, req.body);
    res.json({
      success: true,
      message: 'تم تحديث الموظف بنجاح',
      data: employee,
    });
  }),
);

/**
 * البحث عن الموظفين
 */
router.post(
  '/employees/search',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { searchTerm, filters } = req.body;
    const employees = await hrService.searchEmployees(searchTerm, filters);
    res.json({
      success: true,
      data: employees,
    });
  }),
);

// ============= نظام الرواتب =============

/**
 * إنشاء كشف رواتب
 */
router.post(
  '/payroll/generate',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { month, employeeData } = req.body;
    const payrolls = await hrService.generatePayroll(month, employeeData);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء كشف الرواتب',
      data: payrolls,
    });
  }),
);

/**
 * معالجة الرواتب
 */
router.post(
  '/payroll/:month/process',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await hrService.processPayroll(req.params.month);
    res.json({
      success: true,
      message: 'تم معالجة الرواتب',
      data: result,
    });
  }),
);

/**
 * تحويل الرواتب
 */
router.post(
  '/payroll/:month/transfer',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await hrService.transferPayroll(req.params.month);
    res.json({
      success: true,
      message: 'تم تحويل الرواتب',
      data: result,
    });
  }),
);

/**
 * ملخص الرواتب الشهري
 */
router.get(
  '/payroll/:month/summary',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const summary = await hrService.getMonthlyPayrollSummary(req.params.month);
    res.json({
      success: true,
      data: summary,
    });
  }),
);

// ============= التدريب والتطوير =============

/**
 * إنشاء برنامج تدريب
 */
router.post(
  '/training',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const training = await hrService.createTrainingProgram(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء البرنامج التدريبي',
      data: training,
    });
  }),
);

/**
 * تسجيل الموظفين في البرنامج
 */
router.post(
  '/training/:id/enroll',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { employeeIds } = req.body;
    const training = await hrService.enrollEmployees(req.params.id, employeeIds);
    res.json({
      success: true,
      message: 'تم تسجيل الموظفين',
      data: training,
    });
  }),
);

/**
 * إكمال برنامج تدريب
 */
router.post(
  '/training/:trainingId/complete/:employeeId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { score } = req.body;
    const training = await hrService.completeTraining(req.params.trainingId, req.params.employeeId, score);
    res.json({
      success: true,
      message: 'تم إكمال البرنامج',
      data: training,
    });
  }),
);

/**
 * الحصول على برامج التدريب
 */
router.get(
  '/training',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const Training = require('../models/training.model');
    const trainings = await Training.find().populate('participants.employeeId', 'fullName');
    res.json({
      success: true,
      data: trainings,
    });
  }),
);

// ============= إدارة الأداء =============

/**
 * إنشاء تقييم أداء
 */
router.post(
  '/performance',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { employeeId, ...reviewData } = req.body;
    const performance = await hrService.createPerformanceReview(employeeId, reviewData);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء تقييم الأداء',
      data: performance,
    });
  }),
);

/**
 * إضافة تقييم مرحلي
 */
router.post(
  '/performance/:id/interim-review',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { rating, comments } = req.body;
    const employee = await hrService.addInterimReview(req.params.id, rating, comments);
    res.json({
      success: true,
      message: 'تم إضافة التقييم',
      data: employee,
    });
  }),
);

/**
 * الحصول على تقييمات الموظف
 */
router.get(
  '/performance/employee/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const Performance = require('../models/performance.model');
    const reviews = await Performance.find({ employeeId: req.params.id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: reviews,
    });
  }),
);

/**
 * توقيع التقييم من الموظف
 */
router.post(
  '/performance/:id/acknowledge',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const Performance = require('../models/performance.model');
    const performance = await Performance.findById(req.params.id);
    await performance.signByEmployee();
    res.json({
      success: true,
      message: 'تم التوقيع بنجاح',
      data: performance,
    });
  }),
);

/**
 * موافقة المدير
 */
router.post(
  '/performance/:id/approve',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const Performance = require('../models/performance.model');
    const performance = await Performance.findById(req.params.id);
    await performance.approveByManager();
    res.json({
      success: true,
      message: 'تمت الموافقة',
      data: performance,
    });
  }),
);

// ============= الإحصائيات والتقارير =============

/**
 * إحصائيات عامة
 */
router.get(
  '/analytics/summary',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const analytics = await hrService.getHRAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  }),
);

/**
 * العقود المنتهية
 */
router.get(
  '/analytics/expiring-contracts',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const employees = await hrService.getExpiringContracts(parseInt(days));
    res.json({
      success: true,
      data: employees,
    });
  }),
);

/**
 * التقييمات المعلقة
 */
router.get(
  '/analytics/pending-reviews',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const reviews = await hrService.getPendingReviews();
    res.json({
      success: true,
      data: reviews,
    });
  }),
);

/**
 * الرواتب المعلقة
 */
router.get(
  '/analytics/pending-payrolls',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const payrolls = await hrService.getPendingPayrolls();
    res.json({
      success: true,
      data: payrolls,
    });
  }),
);

/**
 * تقرير الرواتب الشهري
 */
router.get(
  '/reports/monthly-payroll/:month',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const summary = await hrService.getMonthlyPayrollSummary(req.params.month);
    res.json({
      success: true,
      data: summary,
    });
  }),
);

/**
 * تقرير الموارد البشرية
 */
router.get(
  '/reports/hr-overview',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const Employee = require('../models/employee.model');
    const Payroll = require('../models/payroll.model');
    const Training = require('../models/training.model');
    const Performance = require('../models/performance.model');

    const [employees, payrolls, trainings, performances] = await Promise.all([
      Employee.find().countDocuments(),
      Payroll.find().countDocuments(),
      Training.find().countDocuments(),
      Performance.find().countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        totalEmployees: employees,
        totalPayrollRecords: payrolls,
        totalTrainingPrograms: trainings,
        totalPerformanceReviews: performances,
      },
    });
  }),
);

module.exports = router;


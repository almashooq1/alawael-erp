/**
 * Noor Integration Routes — مسارات التكامل مع نظام نور
 *
 * @module routes/noor
 * @description Full REST API for Ministry of Education Noor integration:
 *   - Configuration management
 *   - Student enrollment & sync
 *   - Individual Education Plans (IEPs)
 *   - Academic progress reports
 *   - Dashboard analytics
 */

const express = require('express');
const router = express.Router();
const noorService = require('../services/noor.service');
const { authenticateToken, authorize } = require('../middleware/auth');

// Async handler helper
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// All routes require authentication
router.use(authenticateToken);

/* ─── Configuration ─── */

/**
 * @route   GET /api/noor/config
 * @desc    Get Noor integration configuration
 * @access  Admin
 */
router.get(
  '/config',
  authorize(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const config = await noorService.getConfig(req.user.organizationId || req.user.id);
    res.json({ success: true, data: config });
  })
);

/**
 * @route   PUT /api/noor/config
 * @desc    Update Noor integration configuration
 * @access  Admin
 */
router.put(
  '/config',
  authorize(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const config = await noorService.updateConfig(
      req.user.organizationId || req.user.id,
      req.body,
      req.user.id
    );
    res.json({ success: true, data: config, message: 'تم تحديث إعدادات نور بنجاح' });
  })
);

/* ─── Students — الطلاب ─── */

/**
 * @route   GET /api/noor/students
 * @desc    List students with filters
 * @access  Education Manager, Coordinators, Admin
 */
router.get(
  '/students',
  authorize([
    'admin',
    'super_admin',
    'education_manager',
    'special_education_teacher',
    'coordinator',
  ]),
  asyncHandler(async (req, res) => {
    const result = await noorService.getStudents(req.query);
    res.json({ success: true, data: result });
  })
);

/**
 * @route   POST /api/noor/students
 * @desc    Register a new student in Noor integration
 * @access  Education Manager, Admin
 */
router.post(
  '/students',
  authorize(['admin', 'super_admin', 'education_manager']),
  asyncHandler(async (req, res) => {
    const student = await noorService.createStudent(req.body, req.user.id);
    res.status(201).json({
      success: true,
      data: student,
      message: 'تم تسجيل الطالب بنجاح',
    });
  })
);

/**
 * @route   GET /api/noor/students/:id
 * @desc    Get student details
 * @access  Authenticated staff
 */
router.get(
  '/students/:id',
  asyncHandler(async (req, res) => {
    const student = await noorService.getStudentById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'الطالب غير موجود' });
    }
    res.json({ success: true, data: student });
  })
);

/**
 * @route   PUT /api/noor/students/:id
 * @desc    Update student data
 * @access  Education Manager, Admin
 */
router.put(
  '/students/:id',
  authorize(['admin', 'super_admin', 'education_manager']),
  asyncHandler(async (req, res) => {
    const student = await noorService.updateStudent(req.params.id, req.body, req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'الطالب غير موجود' });
    }
    res.json({ success: true, data: student, message: 'تم تحديث بيانات الطالب' });
  })
);

/**
 * @route   POST /api/noor/students/:id/sync
 * @desc    Sync individual student with Noor
 * @access  Education Manager, Admin
 */
router.post(
  '/students/:id/sync',
  authorize(['admin', 'super_admin', 'education_manager']),
  asyncHandler(async (req, res) => {
    const student = await noorService.syncStudent(req.params.id);
    res.json({ success: true, data: student, message: 'تمت مزامنة الطالب مع نور' });
  })
);

/**
 * @route   POST /api/noor/students/bulk-sync
 * @desc    Bulk sync all active students for an academic year
 * @access  Admin
 */
router.post(
  '/students/bulk-sync',
  authorize(['admin', 'super_admin']),
  asyncHandler(async (req, res) => {
    const { academicYear } = req.body;
    if (!academicYear) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد السنة الدراسية' });
    }
    const results = await noorService.bulkSync(academicYear);
    res.json({
      success: true,
      data: results,
      message: `تم مزامنة ${results.synced} طالب, فشل ${results.failed}`,
    });
  })
);

/* ─── IEPs — الخطط التربوية الفردية ─── */

/**
 * @route   GET /api/noor/ieps
 * @desc    List IEPs with filters
 * @access  Education staff
 */
router.get(
  '/ieps',
  authorize([
    'admin',
    'super_admin',
    'education_manager',
    'special_education_teacher',
    'coordinator',
    'therapist',
  ]),
  asyncHandler(async (req, res) => {
    const result = await noorService.getIEPs(req.query);
    res.json({ success: true, data: result });
  })
);

/**
 * @route   POST /api/noor/ieps
 * @desc    Create a new IEP
 * @access  Education Manager, Special Ed Teacher
 */
router.post(
  '/ieps',
  authorize(['admin', 'super_admin', 'education_manager', 'special_education_teacher']),
  asyncHandler(async (req, res) => {
    const iep = await noorService.createIEP(req.body, req.user.id);
    res.status(201).json({
      success: true,
      data: iep,
      message: 'تم إنشاء الخطة التربوية الفردية بنجاح',
    });
  })
);

/**
 * @route   GET /api/noor/ieps/:id
 * @desc    Get IEP details
 * @access  Authenticated staff
 */
router.get(
  '/ieps/:id',
  asyncHandler(async (req, res) => {
    const iep = await noorService.getIEPById(req.params.id);
    if (!iep) {
      return res.status(404).json({ success: false, message: 'الخطة التربوية غير موجودة' });
    }
    res.json({ success: true, data: iep });
  })
);

/**
 * @route   PUT /api/noor/ieps/:id
 * @desc    Update IEP
 * @access  Education Manager, Special Ed Teacher
 */
router.put(
  '/ieps/:id',
  authorize(['admin', 'super_admin', 'education_manager', 'special_education_teacher']),
  asyncHandler(async (req, res) => {
    const iep = await noorService.updateIEP(req.params.id, req.body, req.user.id);
    if (!iep) {
      return res.status(404).json({ success: false, message: 'الخطة التربوية غير موجودة' });
    }
    res.json({ success: true, data: iep, message: 'تم تحديث الخطة التربوية' });
  })
);

/**
 * @route   POST /api/noor/ieps/:id/submit-noor
 * @desc    Submit IEP to Noor system
 * @access  Education Manager, Admin
 */
router.post(
  '/ieps/:id/submit-noor',
  authorize(['admin', 'super_admin', 'education_manager']),
  asyncHandler(async (req, res) => {
    const iep = await noorService.submitIEPToNoor(req.params.id, req.user.id);
    res.json({
      success: true,
      data: iep,
      message: 'تم إرسال الخطة التربوية إلى نظام نور',
    });
  })
);

/**
 * @route   PUT /api/noor/ieps/:id/goals/:goalIndex/progress
 * @desc    Update goal progress in an IEP
 * @access  Education staff
 */
router.put(
  '/ieps/:id/goals/:goalIndex/progress',
  authorize([
    'admin',
    'super_admin',
    'education_manager',
    'special_education_teacher',
    'therapist',
  ]),
  asyncHandler(async (req, res) => {
    const iep = await noorService.updateGoalProgress(
      req.params.id,
      parseInt(req.params.goalIndex, 10),
      req.body,
      req.user.id
    );
    res.json({ success: true, data: iep, message: 'تم تحديث تقدم الهدف' });
  })
);

/* ─── Progress Reports — تقارير الأداء ─── */

/**
 * @route   GET /api/noor/progress-reports
 * @desc    List progress reports
 * @access  Education staff
 */
router.get(
  '/progress-reports',
  authorize([
    'admin',
    'super_admin',
    'education_manager',
    'special_education_teacher',
    'coordinator',
  ]),
  asyncHandler(async (req, res) => {
    const result = await noorService.getProgressReports(req.query);
    res.json({ success: true, data: result });
  })
);

/**
 * @route   POST /api/noor/progress-reports
 * @desc    Create progress report
 * @access  Special Ed Teacher, Education Manager
 */
router.post(
  '/progress-reports',
  authorize(['admin', 'super_admin', 'education_manager', 'special_education_teacher']),
  asyncHandler(async (req, res) => {
    const report = await noorService.createProgressReport(req.body, req.user.id);
    res.status(201).json({
      success: true,
      data: report,
      message: 'تم إنشاء تقرير الأداء بنجاح',
    });
  })
);

/**
 * @route   POST /api/noor/progress-reports/:id/submit-noor
 * @desc    Submit progress report to Noor
 * @access  Education Manager, Admin
 */
router.post(
  '/progress-reports/:id/submit-noor',
  authorize(['admin', 'super_admin', 'education_manager']),
  asyncHandler(async (req, res) => {
    const report = await noorService.submitReportToNoor(req.params.id);
    res.json({
      success: true,
      data: report,
      message: 'تم إرسال التقرير إلى نظام نور',
    });
  })
);

/* ─── Dashboard ─── */

/**
 * @route   GET /api/noor/dashboard
 * @desc    Get Noor integration dashboard analytics
 * @access  Admin, Education Manager
 */
router.get(
  '/dashboard',
  authorize(['admin', 'super_admin', 'education_manager', 'coordinator']),
  asyncHandler(async (req, res) => {
    const dashboard = await noorService.getDashboard(req.query.academicYear);
    res.json({ success: true, data: dashboard });
  })
);

module.exports = router;

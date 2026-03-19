/* eslint-disable no-unused-vars */
/**
 * Special Education API Routes
 * مسارات API للتربية الخاصة
 */

const express = require('express');
const router = express.Router();
const { AdvancedSpecialEducationService } = require('./advanced-special-education-service');

const specialEdService = new AdvancedSpecialEducationService();

// ==========================================
// برامج التربية الخاصة
// ==========================================

/**
 * @route GET /api/special-education/programs
 * @desc الحصول على جميع برامج التربية الخاصة
 */
router.get('/programs', async (req, res) => {
  try {
    const programs = specialEdService.getPrograms();
    res.json({
      success: true,
      count: programs.length,
      data: programs,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ==========================================
// إدارة الطلاب
// ==========================================

/**
 * @route POST /api/special-education/students
 * @desc تسجيل طالب جديد في التربية الخاصة
 */
router.post('/students', async (req, res) => {
  try {
    const student = await specialEdService.enrollStudent(req.body);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل الطالب بنجاح',
      data: student,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route PUT /api/special-education/students/:studentId/program
 * @desc تعيين برنامج لطالب
 */
router.put('/students/:studentId/program', async (req, res) => {
  try {
    const { programId } = req.body;
    const student = await specialEdService.assignProgram(req.params.studentId, programId);
    res.json({
      success: true,
      message: 'تم تعيين البرنامج بنجاح',
      data: student,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ==========================================
// البرامج التعليمية الفردية (IEP)
// ==========================================

/**
 * @route POST /api/special-education/iep
 * @desc إنشاء برنامج تعليمي فردي جديد
 */
router.post('/iep', async (req, res) => {
  try {
    const iep = await specialEdService.createIEP(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء البرنامج التعليمي الفردي بنجاح',
      data: iep,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route POST /api/special-education/iep/:iepId/goals
 * @desc إضافة هدف للبرنامج التعليمي الفردي
 */
router.post('/iep/:iepId/goals', async (req, res) => {
  try {
    const iep = await specialEdService.addIEPGoal(req.params.iepId, req.body);
    res.json({
      success: true,
      message: 'تم إضافة الهدف بنجاح',
      data: iep,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route PUT /api/special-education/iep/:iepId/goals/:goalId/progress
 * @desc تحديث تقدم الهدف
 */
router.put('/iep/:iepId/goals/:goalId/progress', async (req, res) => {
  try {
    const goal = await specialEdService.updateGoalProgress(
      req.params.iepId,
      req.params.goalId,
      req.body
    );
    res.json({
      success: true,
      message: 'تم تحديث التقدم بنجاح',
      data: goal,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ==========================================
// التقييمات
// ==========================================

/**
 * @route POST /api/special-education/assessments
 * @desc إنشاء تقييم جديد
 */
router.post('/assessments', async (req, res) => {
  try {
    const assessment = await specialEdService.createAssessment(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء التقييم بنجاح',
      data: assessment,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ==========================================
// الفصول الدراسية
// ==========================================

/**
 * @route POST /api/special-education/classrooms
 * @desc إنشاء فصل دراسي جديد
 */
router.post('/classrooms', async (req, res) => {
  try {
    const classroom = await specialEdService.createClassroom(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفصل الدراسي بنجاح',
      data: classroom,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route POST /api/special-education/classrooms/:classroomId/students
 * @desc تعيين طالب لفصل دراسي
 */
router.post('/classrooms/:classroomId/students', async (req, res) => {
  try {
    const { studentId } = req.body;
    const classroom = await specialEdService.assignStudentToClassroom(
      req.params.classroomId,
      studentId
    );
    res.json({
      success: true,
      message: 'تم تعيين الطالب للفصل بنجاح',
      data: classroom,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ==========================================
// الموارد التعليمية
// ==========================================

/**
 * @route POST /api/special-education/resources
 * @desc إنشاء مورد تعليمي جديد
 */
router.post('/resources', async (req, res) => {
  try {
    const resource = await specialEdService.createResource(req.body);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء المورد التعليمي بنجاح',
      data: resource,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route POST /api/special-education/resources/:resourceId/borrow
 * @desc استعارة مورد تعليمي
 */
router.post('/resources/:resourceId/borrow', async (req, res) => {
  try {
    const resource = await specialEdService.borrowResource(req.params.resourceId, req.body);
    res.json({
      success: true,
      message: 'تم استعارة المورد بنجاح',
      data: resource,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ==========================================
// التقارير
// ==========================================

/**
 * @route GET /api/special-education/reports
 * @desc إنشاء تقرير شامل للتربية الخاصة
 */
router.get('/reports', async (req, res) => {
  try {
    const { type } = req.query;
    const report = await specialEdService.generateSpecialEducationReport(type);
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

module.exports = router;

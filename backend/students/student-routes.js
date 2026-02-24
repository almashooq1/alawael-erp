/**
 * Student Management Routes
 * مسارات إدارة الطلاب لمراكز التأهيل
 */

const express = require('express');
const router = express.Router();
const { studentService, studentConfig } = require('./student-service');

// ============ Configuration ============

router.get('/config/statuses', (req, res) => {
  res.json({ success: true, data: studentConfig.studentStatuses });
});

router.get('/config/disability-types', (req, res) => {
  res.json({ success: true, data: studentConfig.disabilityTypes });
});

router.get('/config/programs', (req, res) => {
  res.json({ success: true, data: studentConfig.programs });
});

router.get('/config/shifts', (req, res) => {
  res.json({ success: true, data: studentConfig.shifts });
});

router.get('/config/severity-levels', (req, res) => {
  res.json({ success: true, data: studentConfig.severityLevels });
});

// ============ Statistics ============

router.get('/statistics/:centerId', async (req, res) => {
  try {
    const stats = await studentService.getStatistics(req.params.centerId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/attendance/:centerId', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await studentService.getAttendanceReport(
      req.params.centerId,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/progress/:centerId', async (req, res) => {
  try {
    const report = await studentService.getProgressReport(req.params.centerId);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ CRUD ============

router.get('/center/:centerId', async (req, res) => {
  try {
    const options = {
      status: req.query.status,
      disabilityType: req.query.disabilityType,
      limit: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.skip) || 0,
    };
    const students = await studentService.getStudentsByCenter(req.params.centerId, options);
    res.json({ success: true, data: students, count: students.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/branch/:branchId', async (req, res) => {
  try {
    const students = await studentService.getStudentsByBranch(req.params.branchId);
    res.json({ success: true, data: students, count: students.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/national-id/:nationalId', async (req, res) => {
  try {
    const student = await studentService.getStudentByNationalId(req.params.nationalId);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:studentId', async (req, res) => {
  try {
    const student = await studentService.getStudent(req.params.studentId);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const student = await studentService.createStudent({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: student, message: 'تم تسجيل الطالب' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:studentId', async (req, res) => {
  try {
    const student = await studentService.updateStudent(req.params.studentId, req.body);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student, message: 'تم تحديث بيانات الطالب' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:studentId', async (req, res) => {
  try {
    const student = await studentService.deleteStudent(req.params.studentId);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, message: 'تم حذف الطالب' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Attendance ============

router.post('/:studentId/attendance', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const student = await studentService.recordAttendance(req.params.studentId, status, notes);
    res.json({ success: true, data: student, message: 'تم تسجيل الحضور' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/attendance/bulk', async (req, res) => {
  try {
    const { studentIds, status } = req.body;
    const results = await studentService.bulkAttendance(studentIds, status);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Programs ============

router.post('/:studentId/programs', async (req, res) => {
  try {
    const student = await studentService.enrollProgram(req.params.studentId, req.body);
    res.json({ success: true, data: student, message: 'تم تسجيل الطالب في البرنامج' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:studentId/programs/:programId/progress', async (req, res) => {
  try {
    const { progress } = req.body;
    const student = await studentService.updateProgramProgress(
      req.params.studentId,
      req.params.programId,
      progress
    );
    res.json({ success: true, data: student, message: 'تم تحديث التقدم' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Assessments ============

router.post('/:studentId/assessments', async (req, res) => {
  try {
    const student = await studentService.addAssessment(req.params.studentId, req.body);
    res.json({ success: true, data: student, message: 'تم إضافة التقييم' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ IEP (Individualized Education Program) ============

router.post('/:studentId/iep', async (req, res) => {
  try {
    const student = await studentService.createIEP(req.params.studentId, req.body);
    res.json({ success: true, data: student, message: 'تم إنشاء خطة التدخل الفردي' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:studentId/iep/goals/:goalId', async (req, res) => {
  try {
    const { progress, status } = req.body;
    const student = await studentService.updateIEPGoal(
      req.params.studentId,
      req.params.goalId,
      progress,
      status
    );
    res.json({ success: true, data: student, message: 'تم تحديث الهدف' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Behavior Tracking ============

router.post('/:studentId/behavior', async (req, res) => {
  try {
    const { points, behavior, type, notes } = req.body;
    const student = await studentService.addBehaviorPoints(
      req.params.studentId,
      points,
      behavior,
      type,
      notes,
      req.user?.name || 'System'
    );
    res.json({ success: true, data: student, message: 'تم تسجيل السلوك' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:studentId/badges', async (req, res) => {
  try {
    const student = await studentService.awardBadge(req.params.studentId, req.body);
    res.json({ success: true, data: student, message: 'تم منح الشارة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Documents ============

router.post('/:studentId/documents', async (req, res) => {
  try {
    const student = await studentService.addDocument(req.params.studentId, {
      ...req.body,
      uploadedBy: req.user?.id,
    });
    res.json({ success: true, data: student, message: 'تم إضافة الوثيقة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Notes ============

router.post('/:studentId/notes', async (req, res) => {
  try {
    const student = await studentService.addNote(req.params.studentId, {
      ...req.body,
      author: {
        id: req.user?.id,
        name: req.user?.name,
        role: req.user?.role,
      },
    });
    res.json({ success: true, data: student, message: 'تم إضافة الملاحظة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Communications ============

router.post('/:studentId/communications', async (req, res) => {
  try {
    const student = await studentService.addCommunication(req.params.studentId, req.body);
    res.json({ success: true, data: student, message: 'تم تسجيل الاتصال' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ AI Insights ============

router.get('/:studentId/ai-insights', async (req, res) => {
  try {
    const insights = await studentService.generateAIInsights(req.params.studentId);
    res.json({ success: true, data: insights });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
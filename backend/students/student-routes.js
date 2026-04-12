/* eslint-disable no-unused-vars */
/**
 * Student Management Routes
 * مسارات إدارة الطلاب لمراكز التأهيل
 */

const express = require('express');
const router = express.Router();
const { studentService, studentConfig } = require('./student-service');
const safeError = require('../utils/safeError');

// Centralized error handler for route catch blocks
const handleRouteError = (res, error, context = '') => {
  const msg = context ? `[StudentRoutes:${context}]` : '[StudentRoutes]';
  console.error(`${msg} ${error.message || error}`);

  if (error.message === 'Student not found') {
    return res.status(404).json({ success: false, error: 'الطالب غير موجود' });
  }
  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors || {})
      .map(e => e.message)
      .join(', ');
    return res.status(400).json({ success: false, error: `خطأ في البيانات: ${details}` });
  }
  if (error.message?.includes('طالبين')) {
    return res.status(400).json({ success: false, error: error.message });
  }
  safeError(res, error, 'student');
};

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
    handleRouteError(res, error, 'statistics');
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
    handleRouteError(res, error, 'attendanceReport');
  }
});

router.get('/reports/progress/:centerId', async (req, res) => {
  try {
    const report = await studentService.getProgressReport(req.params.centerId);
    res.json({ success: true, data: report });
  } catch (error) {
    handleRouteError(res, error, 'progressReport');
  }
});

// ============ Reports Center Summary ============

router.get('/reports/center-summary/:centerId', async (req, res) => {
  try {
    const summary = await studentService.getCenterReportsSummary(req.params.centerId);
    res.json({ success: true, data: summary });
  } catch (error) {
    handleRouteError(res, error, 'centerSummary');
  }
});

// ============ Periodic Report ============

router.get('/reports/periodic/:centerId', async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    const report = await studentService.getPeriodicReport(req.params.centerId, {
      period,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    });
    res.json({ success: true, data: report });
  } catch (error) {
    handleRouteError(res, error, 'periodicReport');
  }
});

// ============ Comparison Report ============

router.get('/reports/comparison', async (req, res) => {
  try {
    const { studentIds } = req.query;
    const ids = Array.isArray(studentIds)
      ? studentIds
      : (studentIds || '').split(',').filter(Boolean);
    const report = await studentService.getStudentComparisonReport(ids);
    res.json({ success: true, data: report });
  } catch (error) {
    handleRouteError(res, error, 'comparisonReport');
  }
});

// ============ Comprehensive Report ============

router.get('/:studentId/report/comprehensive', async (req, res) => {
  try {
    const report = await studentService.getComprehensiveReport(req.params.studentId);
    res.json({ success: true, data: report });
  } catch (error) {
    handleRouteError(res, error, 'comprehensiveReport');
  }
});

// ============ Parent Report ============

router.get('/:studentId/report/parent', async (req, res) => {
  try {
    const report = await studentService.getParentReport(req.params.studentId);
    res.json({ success: true, data: report });
  } catch (error) {
    handleRouteError(res, error, 'parentReport');
  }
});

// ============ Progress Timeline ============

router.get('/:studentId/report/progress-timeline', async (req, res) => {
  try {
    const timeline = await studentService.getStudentProgressTimeline(req.params.studentId);
    res.json({ success: true, data: timeline });
  } catch (error) {
    handleRouteError(res, error, 'progressTimeline');
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
    handleRouteError(res, error, 'getByCenter');
  }
});

router.get('/branch/:branchId', async (req, res) => {
  try {
    const students = await studentService.getStudentsByBranch(req.params.branchId);
    res.json({ success: true, data: students, count: students.length });
  } catch (error) {
    handleRouteError(res, error, 'getByBranch');
  }
});

router.get('/national-id/:nationalId', async (req, res) => {
  try {
    const student = await studentService.getStudentByNationalId(req.params.nationalId);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    handleRouteError(res, error, 'getByNationalId');
  }
});

router.get('/:studentId', async (req, res) => {
  try {
    const student = await studentService.getStudent(req.params.studentId);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    handleRouteError(res, error, 'getStudent');
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
    handleRouteError(res, error, 'createStudent');
  }
});

router.put('/:studentId', async (req, res) => {
  try {
    const student = await studentService.updateStudent(req.params.studentId, req.body);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student, message: 'تم تحديث بيانات الطالب' });
  } catch (error) {
    handleRouteError(res, error, 'updateStudent');
  }
});

router.delete('/:studentId', async (req, res) => {
  try {
    const student = await studentService.deleteStudent(req.params.studentId);
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, message: 'تم حذف الطالب' });
  } catch (error) {
    handleRouteError(res, error, 'deleteStudent');
  }
});

// ============ Attendance ============

router.post('/:studentId/attendance', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const student = await studentService.recordAttendance(req.params.studentId, status, notes);
    res.json({ success: true, data: student, message: 'تم تسجيل الحضور' });
  } catch (error) {
    handleRouteError(res, error, 'recordAttendance');
  }
});

router.post('/attendance/bulk', async (req, res) => {
  try {
    const { studentIds, status } = req.body;
    const results = await studentService.bulkAttendance(studentIds, status);
    res.json({ success: true, data: results });
  } catch (error) {
    handleRouteError(res, error, 'bulkAttendance');
  }
});

// ============ Programs ============

router.post('/:studentId/programs', async (req, res) => {
  try {
    const student = await studentService.enrollProgram(req.params.studentId, req.body);
    res.json({ success: true, data: student, message: 'تم تسجيل الطالب في البرنامج' });
  } catch (error) {
    handleRouteError(res, error, 'enrollProgram');
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
    handleRouteError(res, error, 'updateProgramProgress');
  }
});

// ============ Assessments ============

router.post('/:studentId/assessments', async (req, res) => {
  try {
    const student = await studentService.addAssessment(req.params.studentId, req.body);
    res.json({ success: true, data: student, message: 'تم إضافة التقييم' });
  } catch (error) {
    handleRouteError(res, error, 'addAssessment');
  }
});

// ============ IEP (Individualized Education Program) ============

router.post('/:studentId/iep', async (req, res) => {
  try {
    const student = await studentService.createIEP(req.params.studentId, req.body);
    res.json({ success: true, data: student, message: 'تم إنشاء خطة التدخل الفردي' });
  } catch (error) {
    handleRouteError(res, error, 'createIEP');
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
    handleRouteError(res, error, 'updateIEPGoal');
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
    handleRouteError(res, error, 'addBehavior');
  }
});

router.post('/:studentId/badges', async (req, res) => {
  try {
    const student = await studentService.awardBadge(req.params.studentId, req.body);
    res.json({ success: true, data: student, message: 'تم منح الشارة' });
  } catch (error) {
    handleRouteError(res, error, 'awardBadge');
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
    handleRouteError(res, error, 'addDocument');
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
    handleRouteError(res, error, 'addNote');
  }
});

// ============ Communications ============

router.post('/:studentId/communications', async (req, res) => {
  try {
    const student = await studentService.addCommunication(req.params.studentId, req.body);
    res.json({ success: true, data: student, message: 'تم تسجيل الاتصال' });
  } catch (error) {
    handleRouteError(res, error, 'addCommunication');
  }
});

// ============ AI Insights ============

router.get('/:studentId/ai-insights', async (req, res) => {
  try {
    const insights = await studentService.generateAIInsights(req.params.studentId);
    res.json({ success: true, data: insights });
  } catch (error) {
    handleRouteError(res, error, 'aiInsights');
  }
});

// ============ NEW: Academic Performance Report ============

router.get('/:studentId/report/academic-performance', async (req, res) => {
  try {
    const report = await studentService.getAcademicPerformanceReport(req.params.studentId);
    res.json({ success: true, data: report });
  } catch (error) {
    handleRouteError(res, error, 'academicPerformance');
  }
});

// ============ NEW: Behavioral Analysis Report ============

router.get('/:studentId/report/behavioral-analysis', async (req, res) => {
  try {
    const report = await studentService.getBehavioralAnalysisReport(req.params.studentId);
    res.json({ success: true, data: report });
  } catch (error) {
    handleRouteError(res, error, 'behavioralAnalysis');
  }
});

// ============ NEW: Health & Wellness Report ============

router.get('/:studentId/report/health-wellness', async (req, res) => {
  try {
    const report = await studentService.getHealthWellnessReport(req.params.studentId);
    res.json({ success: true, data: report });
  } catch (error) {
    handleRouteError(res, error, 'healthWellness');
  }
});

// ============ NEW: Family Engagement Report ============

router.get('/:studentId/report/family-engagement', async (req, res) => {
  try {
    const report = await studentService.getFamilyEngagementReport(req.params.studentId);
    res.json({ success: true, data: report });
  } catch (error) {
    handleRouteError(res, error, 'familyEngagement');
  }
});

// ============ NEW: Transition Readiness Report ============

router.get('/:studentId/report/transition-readiness', async (req, res) => {
  try {
    const report = await studentService.getTransitionReadinessReport(req.params.studentId);
    res.json({ success: true, data: report });
  } catch (error) {
    handleRouteError(res, error, 'transitionReadiness');
  }
});

// ============ NEW: Custom Report Builder ============

router.post('/:studentId/report/custom', async (req, res) => {
  try {
    const { sections } = req.body;
    const report = await studentService.buildCustomReport(req.params.studentId, sections);
    res.json({ success: true, data: report });
  } catch (error) {
    handleRouteError(res, error, 'customReport');
  }
});

// ============ NEW: Therapist Effectiveness Report (Center) ============

router.get('/reports/therapist-effectiveness/:centerId', async (req, res) => {
  try {
    const report = await studentService.getTherapistEffectivenessReport(req.params.centerId);
    res.json({ success: true, data: report });
  } catch (error) {
    handleRouteError(res, error, 'therapistEffectiveness');
  }
});

// ============ NEW: Dashboard Analytics (Center) ============

router.get('/reports/dashboard-analytics/:centerId', async (req, res) => {
  try {
    const analytics = await studentService.getDashboardAnalytics(req.params.centerId);
    res.json({ success: true, data: analytics });
  } catch (error) {
    handleRouteError(res, error, 'dashboardAnalytics');
  }
});

// ============ NEW: Report Schedules ============

router.get('/reports/schedules', (req, res) => {
  try {
    const schedules = studentService.getAvailableReportSchedules();
    res.json({ success: true, data: schedules });
  } catch (error) {
    handleRouteError(res, error, 'reportSchedules');
  }
});

// ============ NEW: Export Report Data ============

router.get('/reports/export/:centerId', async (req, res) => {
  try {
    const { format } = req.query;
    const exportResult = await studentService.exportReportData(
      req.params.centerId,
      format || 'json'
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=students_report.csv');
      // Add BOM for Arabic support in Excel
      return res.send('\uFEFF' + exportResult.data);
    }

    res.json({ success: true, data: exportResult });
  } catch (error) {
    handleRouteError(res, error, 'exportReport');
  }
});

// ═══════════════════════════════════════════════════════════════════
// 📬 REPORT DELIVERY SUBSCRIPTIONS — اشتراكات توصيل التقارير
// ═══════════════════════════════════════════════════════════════════

const { reportSchedulerService } = require('./report-scheduler-service');

// ── Create Subscription ──
router.post('/reports/subscriptions', async (req, res) => {
  try {
    const sub = await reportSchedulerService.createSubscription(req.body);
    res.status(201).json({ success: true, data: sub, message: 'تم إنشاء الاشتراك بنجاح' });
  } catch (error) {
    handleRouteError(res, error, 'createSubscription');
  }
});

// ── List Subscriptions ──
router.get('/reports/subscriptions', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      frequency: req.query.frequency,
      reportType: req.query.reportType,
      centerId: req.query.centerId,
    };
    const subs = await reportSchedulerService.listSubscriptions(filters);
    res.json({ success: true, data: subs });
  } catch (error) {
    handleRouteError(res, error, 'listSubscriptions');
  }
});

// ── Get Subscription Statistics ──
router.get('/reports/subscriptions/statistics', async (req, res) => {
  try {
    const stats = await reportSchedulerService.getStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    handleRouteError(res, error, 'subscriptionStatistics');
  }
});

// ── Get Single Subscription ──
router.get('/reports/subscriptions/:id', async (req, res) => {
  try {
    const sub = await reportSchedulerService.getSubscription(req.params.id);
    if (!sub) return res.status(404).json({ success: false, error: 'الاشتراك غير موجود' });
    res.json({ success: true, data: sub });
  } catch (error) {
    handleRouteError(res, error, 'getSubscription');
  }
});

// ── Update Subscription ──
router.put('/reports/subscriptions/:id', async (req, res) => {
  try {
    const sub = await reportSchedulerService.updateSubscription(req.params.id, req.body);
    res.json({ success: true, data: sub, message: 'تم تحديث الاشتراك بنجاح' });
  } catch (error) {
    handleRouteError(res, error, 'updateSubscription');
  }
});

// ── Delete Subscription ──
router.delete('/reports/subscriptions/:id', async (req, res) => {
  try {
    await reportSchedulerService.deleteSubscription(req.params.id);
    res.json({ success: true, message: 'تم حذف الاشتراك بنجاح' });
  } catch (error) {
    handleRouteError(res, error, 'deleteSubscription');
  }
});

// ── Pause Subscription ──
router.patch('/reports/subscriptions/:id/pause', async (req, res) => {
  try {
    const sub = await reportSchedulerService.pauseSubscription(req.params.id);
    res.json({ success: true, data: sub, message: 'تم إيقاف الاشتراك مؤقتاً' });
  } catch (error) {
    handleRouteError(res, error, 'pauseSubscription');
  }
});

// ── Resume Subscription ──
router.patch('/reports/subscriptions/:id/resume', async (req, res) => {
  try {
    const sub = await reportSchedulerService.resumeSubscription(req.params.id);
    res.json({ success: true, data: sub, message: 'تم استئناف الاشتراك' });
  } catch (error) {
    handleRouteError(res, error, 'resumeSubscription');
  }
});

// ── Execute Now (manual trigger) ──
router.post('/reports/subscriptions/:id/execute', async (req, res) => {
  try {
    await reportSchedulerService.executeNow(req.params.id);
    res.json({ success: true, message: 'تم تنفيذ التوصيل بنجاح' });
  } catch (error) {
    handleRouteError(res, error, 'executeNow');
  }
});

// ── Get Delivery Logs ──
router.get('/reports/subscriptions/:id/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const logs = await reportSchedulerService.getDeliveryLogs(req.params.id, limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    handleRouteError(res, error, 'deliveryLogs');
  }
});

module.exports = router;

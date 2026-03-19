/**
 * Therapist Portal Routes — بوابة المعالج الشاملة
 * واجهة API لبوابة المعالج
 *
 * Delegates to TherapistPortalService for all business logic.
 * Covers: Dashboard, Patients, Schedule, Sessions, Documentation,
 *         Therapeutic Plans, Cases, Documents, Reports, Performance,
 *         Availability, Communications, Messages, Patient Progress.
 *
 * All routes protected via authenticateToken. Therapist ID = req.user.id.
 *
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const svc = require('../services/therapistPortal.service');

// حماية جميع مسارات المعالج
router.use(authenticateToken);

// ─── Async wrapper ──────────────────────────────────────────────
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ═══════════════════════════════════════════════════════════════════════════
//  لوحة المعلومات — Dashboard
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/dashboard',
  wrap(async (req, res) => {
    const data = await svc.getDashboard(req.user.id);
    res.json({
      success: true,
      data: {
        therapist: { id: req.user.id, name: req.user.name || req.user.fullName || 'معالج' },
        ...data,
      },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  المرضى / المستفيدين — Patients  (specific paths BEFORE /:id)
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/patients',
  wrap(async (req, res) => {
    const data = await svc.getPatients(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/patients/:patientId',
  wrap(async (req, res) => {
    const data = await svc.getPatientById(req.user.id, req.params.patientId);
    if (!data) return res.status(404).json({ success: false, error: 'المستفيد غير موجود' });
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  الجدول والمواعيد — Schedule
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/schedule',
  wrap(async (req, res) => {
    const data = await svc.getSchedule(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/schedule',
  wrap(async (req, res) => {
    const data = await svc.addScheduleSession(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/schedule/:sessionId',
  wrap(async (req, res) => {
    const data = await svc.updateScheduleSession(req.user.id, req.params.sessionId, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/schedule/:sessionId',
  wrap(async (req, res) => {
    const deleted = await svc.deleteScheduleSession(req.user.id, req.params.sessionId);
    if (!deleted) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.json({ success: true, message: 'تم الحذف' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  التوفر الأسبوعي — Availability
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/availability',
  wrap(async (req, res) => {
    const data = await svc.getAvailability(req.user.id);
    res.json({ success: true, data });
  })
);

router.put(
  '/availability',
  wrap(async (req, res) => {
    const data = await svc.updateAvailability(req.user.id, req.body);
    res.json({ success: true, data });
  })
);

router.post(
  '/availability/exceptions',
  wrap(async (req, res) => {
    const data = await svc.addException(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  الجلسات العلاجية — Sessions
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/sessions',
  wrap(async (req, res) => {
    const result = await svc.getSessions(req.user.id, req.query);
    res.json({
      success: true,
      data: result.sessions,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  })
);

router.post(
  '/sessions',
  wrap(async (req, res) => {
    const data = await svc.saveSessionReport(req.user.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/sessions/:sessionId',
  wrap(async (req, res) => {
    const data = await svc.getSessionById(req.user.id, req.params.sessionId);
    if (!data) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.put(
  '/sessions/:sessionId',
  wrap(async (req, res) => {
    const data = await svc.updateSession(req.user.id, req.params.sessionId, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/sessions/:sessionId',
  wrap(async (req, res) => {
    const deleted = await svc.deleteSession(req.user.id, req.params.sessionId);
    if (!deleted) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });
    res.json({ success: true, message: 'تم الحذف' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  التوثيق السريري — Session Documentation (SOAP)
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/sessions/:sessionId/documentation',
  wrap(async (req, res) => {
    const data = await svc.getSessionDocumentation(req.user.id, req.params.sessionId);
    res.json({ success: true, data: data || null });
  })
);

router.post(
  '/sessions/:sessionId/documentation',
  wrap(async (req, res) => {
    const data = await svc.createSessionDocumentation(req.user.id, req.params.sessionId, req.body);
    res.status(201).json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  الخطط العلاجية — Therapeutic Plans
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/plans',
  wrap(async (req, res) => {
    const data = await svc.getTherapeuticPlans(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/plans/:planId',
  wrap(async (req, res) => {
    const data = await svc.getPlanById(req.user.id, req.params.planId);
    if (!data) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.patch(
  '/plans/:planId/goals/:goalId',
  wrap(async (req, res) => {
    const data = await svc.updateGoalProgress(
      req.user.id,
      req.params.planId,
      req.params.goalId,
      req.body
    );
    if (!data) return res.status(404).json({ success: false, error: 'الخطة أو الهدف غير موجود' });
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  الحالات — Cases
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/cases',
  wrap(async (req, res) => {
    const data = await svc.getCases(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/cases/:caseId',
  wrap(async (req, res) => {
    const data = await svc.getCaseById(req.user.id, req.params.caseId);
    if (!data) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.put(
  '/cases/:caseId',
  wrap(async (req, res) => {
    const data = await svc.updateCase(req.user.id, req.params.caseId, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'الحالة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.patch(
  '/cases/:caseId/goals/:goalId',
  wrap(async (req, res) => {
    const data = await svc.updateCaseGoal(
      req.user.id,
      req.params.caseId,
      req.params.goalId,
      req.body.status
    );
    if (!data) return res.status(404).json({ success: false, error: 'الحالة أو الهدف غير موجود' });
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  المستندات — Documents
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/documents',
  wrap(async (req, res) => {
    const data = await svc.getDocuments(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/documents',
  wrap(async (req, res) => {
    const data = await svc.uploadDocument(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.delete(
  '/documents/:docId',
  wrap(async (req, res) => {
    const deleted = await svc.deleteDocument(req.user.id, req.params.docId);
    if (!deleted) return res.status(404).json({ success: false, error: 'المستند غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  التقارير والأداء — Reports + Performance KPIs
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/reports',
  wrap(async (req, res) => {
    const data = await svc.getReports(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/performance',
  wrap(async (req, res) => {
    const data = await svc.getPerformanceKPIs(req.user.id);
    res.json({ success: true, data });
  })
);

router.get(
  '/workload',
  wrap(async (req, res) => {
    const data = await svc.getWorkloadAnalytics(req.user.id);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  تتبع تقدم المستفيد — Patient Progress
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/patients/:patientId/progress',
  wrap(async (req, res) => {
    const data = await svc.getPatientProgress(req.user.id, req.params.patientId);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  التواصل والرسائل — Communications & Messages
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/communications',
  wrap(async (req, res) => {
    const data = await svc.getCommunications(req.user.id);
    res.json({ success: true, data: { messages: data } });
  })
);

router.post(
  '/communications',
  wrap(async (req, res) => {
    const data = await svc.sendCommunication(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/messages',
  wrap(async (req, res) => {
    const data = await svc.getMessages(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/messages',
  wrap(async (req, res) => {
    const data = await svc.sendMessage(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

// ─── Error handler ──────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
router.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || 'خطأ في بوابة المعالج';
  res.status(status).json({ success: false, error: message });
});

module.exports = router;

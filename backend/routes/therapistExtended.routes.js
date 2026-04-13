/**
 * Therapist Portal Extended Routes — مسارات بوابة المعالج الموسّعة
 *
 * خدمات إضافية:
 * ─── /treatment-plans    — الخطط العلاجية
 * ─── /assessments        — التقييمات والمقاييس
 * ─── /prescriptions      — الوصفات العلاجية
 * ─── /professional-dev   — التطوير المهني
 * ─── /analytics          — التحليلات المتقدمة
 * ─── /consultations      — الاستشارات والإحالات
 *
 * All routes protected via authenticateToken.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const svc = require('../services/therapistPortal.service');

router.use(authenticateToken);

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ═══════════════════════════════════════════════════════════════════════════
//  الخطط العلاجية — Treatment Plans
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/treatment-plans',
  wrap(async (req, res) => {
    const data = await svc.getTreatmentPlans(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/treatment-plans/:planId',
  wrap(async (req, res) => {
    const data = await svc.getTreatmentPlanDetail(req.user.id, req.params.planId);
    if (!data) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.post(
  '/treatment-plans',
  wrap(async (req, res) => {
    const data = await svc.createTreatmentPlan(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/treatment-plans/:planId',
  wrap(async (req, res) => {
    const data = await svc.updateTreatmentPlan(req.user.id, req.params.planId, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.patch(
  '/treatment-plans/:planId/goals/:goalId',
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
//  التقييمات والمقاييس — Assessments & Scales
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/assessments',
  wrap(async (req, res) => {
    const data = await svc.getAssessments(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/assessments',
  wrap(async (req, res) => {
    const data = await svc.createAssessment(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/assessments/:assessmentId',
  wrap(async (req, res) => {
    const data = await svc.getAssessmentDetail(req.user.id, req.params.assessmentId);
    if (!data) return res.status(404).json({ success: false, error: 'التقييم غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/assessments/:assessmentId',
  wrap(async (req, res) => {
    const deleted = await svc.deleteAssessment(req.user.id, req.params.assessmentId);
    if (!deleted) return res.status(404).json({ success: false, error: 'التقييم غير موجود' });
    res.json({ success: true, message: 'تم حذف التقييم' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  الوصفات العلاجية — Prescriptions
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/prescriptions',
  wrap(async (req, res) => {
    const data = await svc.getPrescriptions(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/prescriptions',
  wrap(async (req, res) => {
    const data = await svc.createPrescription(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/prescriptions/:prescriptionId',
  wrap(async (req, res) => {
    const data = await svc.updatePrescription(req.user.id, req.params.prescriptionId, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'الوصفة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/prescriptions/:prescriptionId',
  wrap(async (req, res) => {
    const deleted = await svc.deletePrescription(req.user.id, req.params.prescriptionId);
    if (!deleted) return res.status(404).json({ success: false, error: 'الوصفة غير موجودة' });
    res.json({ success: true, message: 'تم حذف الوصفة' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  التطوير المهني — Professional Development
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/professional-dev',
  wrap(async (req, res) => {
    const data = await svc.getProfessionalDev(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/professional-dev',
  wrap(async (req, res) => {
    const data = await svc.addProfessionalDev(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/professional-dev/:activityId',
  wrap(async (req, res) => {
    const data = await svc.updateProfessionalDev(req.user.id, req.params.activityId, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'النشاط غير موجود' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/professional-dev/:activityId',
  wrap(async (req, res) => {
    const deleted = await svc.deleteProfessionalDev(req.user.id, req.params.activityId);
    if (!deleted) return res.status(404).json({ success: false, error: 'النشاط غير موجود' });
    res.json({ success: true, message: 'تم حذف النشاط' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  التحليلات المتقدمة — Advanced Analytics
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/analytics',
  wrap(async (req, res) => {
    const data = await svc.getAdvancedAnalytics(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.get(
  '/analytics/productivity',
  wrap(async (req, res) => {
    const data = await svc.getProductivityReport(req.user.id);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  الاستشارات والإحالات — Consultations & Referrals
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/consultations',
  wrap(async (req, res) => {
    const data = await svc.getConsultations(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post(
  '/consultations',
  wrap(async (req, res) => {
    const data = await svc.createConsultation(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.post(
  '/consultations/:consultationId/respond',
  wrap(async (req, res) => {
    const data = await svc.respondToConsultation(req.user.id, req.params.consultationId, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'الاستشارة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.patch(
  '/consultations/:consultationId/status',
  wrap(async (req, res) => {
    const data = await svc.updateConsultationStatus(
      req.user.id,
      req.params.consultationId,
      req.body.status
    );
    if (!data) return res.status(404).json({ success: false, error: 'الاستشارة غير موجودة' });
    res.json({ success: true, data });
  })
);

router.delete(
  '/consultations/:consultationId',
  wrap(async (req, res) => {
    const deleted = await svc.deleteConsultation(req.user.id, req.params.consultationId);
    if (!deleted) return res.status(404).json({ success: false, error: 'الاستشارة غير موجودة' });
    res.json({ success: true, message: 'تم حذف الاستشارة' });
  })
);

// ─── Error handler ──────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
router.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || 'خطأ في خدمات بوابة المعالج الموسّعة';
  res.status(status).json({ success: false, error: message });
});

module.exports = router;

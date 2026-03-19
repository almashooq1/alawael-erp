/**
 * Community Integration Routes — مسارات الدمج المجتمعي
 *
 * REST API endpoints for the full Community Integration module:
 *   - /activities          — Community activities (sports, culture, entertainment)
 *   - /partnerships        — Civil society partnerships
 *   - /participations      — Beneficiary event participation tracking
 *   - /assessments         — Social integration measurement
 *   - /awareness-programs  — Disability rights awareness campaigns
 *   - /dashboard           — Consolidated dashboard
 *
 * All routes require authentication. Write operations require admin/manager role.
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/communityIntegration.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

// ─── COMMUNITY ACTIVITIES ──────────────────────────────────────────────────────

router.get('/activities/stats', controller.getActivityStats);
router.get('/activities', controller.getActivities);
router.get('/activities/:id', controller.getActivityById);
router.post('/activities', authorize('admin', 'manager', 'coordinator'), controller.createActivity);
router.put(
  '/activities/:id',
  authorize('admin', 'manager', 'coordinator'),
  controller.updateActivity
);
router.delete('/activities/:id', authorize('admin', 'manager'), controller.deleteActivity);

// ─── CIVIL PARTNERSHIPS ────────────────────────────────────────────────────────

router.get('/partnerships/stats', controller.getPartnershipStats);
router.get('/partnerships', controller.getPartnerships);
router.get('/partnerships/:id', controller.getPartnershipById);
router.post('/partnerships', authorize('admin', 'manager'), controller.createPartnership);
router.put('/partnerships/:id', authorize('admin', 'manager'), controller.updatePartnership);
router.delete('/partnerships/:id', authorize('admin'), controller.deletePartnership);

// ─── EVENT PARTICIPATION ───────────────────────────────────────────────────────

router.get('/participations/stats', controller.getParticipationStats);
router.get('/participations/beneficiary/:beneficiaryId', controller.getBeneficiaryHistory);
router.get('/participations', controller.getParticipations);
router.get('/participations/:id', controller.getParticipationById);
router.post('/participations', controller.registerParticipation);
router.put(
  '/participations/:id',
  authorize('admin', 'manager', 'coordinator', 'therapist'),
  controller.updateParticipation
);
router.post(
  '/participations/:id/attendance',
  authorize('admin', 'manager', 'coordinator', 'therapist'),
  controller.recordAttendance
);
router.post('/participations/:id/feedback', controller.submitFeedback);

// ─── INTEGRATION ASSESSMENTS ───────────────────────────────────────────────────

router.get('/assessments/stats', controller.getAssessmentStats);
router.get('/assessments/progress/:beneficiaryId', controller.getIntegrationProgress);
router.get('/assessments', controller.getAssessments);
router.get('/assessments/:id', controller.getAssessmentById);
router.post(
  '/assessments',
  authorize('admin', 'manager', 'therapist', 'social_worker'),
  controller.createAssessment
);
router.put(
  '/assessments/:id',
  authorize('admin', 'manager', 'therapist', 'social_worker'),
  controller.updateAssessment
);
router.delete('/assessments/:id', authorize('admin', 'manager'), controller.deleteAssessment);

// ─── AWARENESS PROGRAMS ────────────────────────────────────────────────────────

router.get('/awareness-programs/stats', controller.getAwarenessProgramStats);
router.get('/awareness-programs', controller.getAwarenessPrograms);
router.get('/awareness-programs/:id', controller.getAwarenessProgramById);
router.post(
  '/awareness-programs',
  authorize('admin', 'manager'),
  controller.createAwarenessProgram
);
router.put(
  '/awareness-programs/:id',
  authorize('admin', 'manager'),
  controller.updateAwarenessProgram
);
router.delete('/awareness-programs/:id', authorize('admin'), controller.deleteAwarenessProgram);
router.post(
  '/awareness-programs/:id/workshops',
  authorize('admin', 'manager', 'coordinator'),
  controller.addWorkshop
);
router.post(
  '/awareness-programs/:id/materials',
  authorize('admin', 'manager', 'coordinator'),
  controller.addMaterial
);

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────

router.get('/dashboard', controller.getDashboard);

module.exports = router;

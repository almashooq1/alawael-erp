/**
 * ═══════════════════════════════════════════════════════════════
 * 🎯 Assessment Routes — مسارات نظام التقييم والتشخيص
 * ═══════════════════════════════════════════════════════════════
 *
 * Full CRUD + workflow (approve/reject/archive) + analytics
 * Wires AssessmentController → /api/assessments
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const AssessmentController = require('../controllers/assessmentController');

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', module: 'assessments', timestamp: new Date().toISOString() });
});

// All data routes require authentication
router.use(authenticate);

// ── Static / aggregate routes (must come before /:id) ──
router.get('/statistics', AssessmentController.getStatistics);
router.get('/search', AssessmentController.advancedSearch);
router.get('/pending', AssessmentController.getPendingAssessments);
router.get('/type/:type', AssessmentController.getAssessmentsByType);

// ── CRUD ──
router.post('/', AssessmentController.createAssessment);
router.get('/', AssessmentController.getAssessments);
router.get('/:id', AssessmentController.getAssessmentById);
router.put('/:id', AssessmentController.updateAssessment);
router.delete('/:id', AssessmentController.deleteAssessment);

// ── Workflow actions ──
router.post('/:id/approve', AssessmentController.approveAssessment);
router.post('/:id/reject', AssessmentController.rejectAssessment);
router.post('/:id/archive', AssessmentController.archiveAssessment);

module.exports = router;

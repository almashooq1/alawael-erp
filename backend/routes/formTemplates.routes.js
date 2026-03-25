/**
 * Form Templates Routes — مسارات النماذج الجاهزة
 * Professional form template system with design, versioning,
 * logo/header/footer support, conditional logic, and approval workflows.
 *
 * Refactored from monolithic 3,375-line file into MVC architecture:
 *   Model:      models/FormTemplate.js, models/FormSubmission.js
 *   Service:    services/formTemplate.service.js
 *   Controller: controllers/formTemplate.controller.js
 *   Data:       data/builtInFormTemplates.js (48 built-in templates)
 *
 * @module routes/formTemplates.routes
 * @created 2026-03-13
 * @refactored 2026-03-14
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ─── Models (import to ensure they''re registered before routes fire) ───────
require('../models/FormTemplate');
require('../models/FormSubmission');

// ─── Controller ────────────────────────────────────────────────────────────
const ctrl = require('../controllers/formTemplate.controller');

// ─── Auth Middleware ───────────────────────────────────────────────────────
const { optionalAuth, authenticateToken, requireRole } = require('../middleware/auth');

// ─── Service (for seeding) ─────────────────────────────────────────────────
const formTemplateService = require('../services/formTemplate.service');
const BUILT_IN_TEMPLATES = require('../data/builtInFormTemplates');

// ═══════════════════════════════════════════════════════════════
// 🌱 SEED BUILT-IN TEMPLATES ON STARTUP
// ═══════════════════════════════════════════════════════════════

async function seedOnStartup() {
  try {
    await formTemplateService.seedBuiltInTemplates(BUILT_IN_TEMPLATES);
  } catch (err) {
    logger.warn(`[FormTemplates] Seed skipped: ${err.message}`);
  }
}

if (mongoose.connection.readyState === 1) {
  seedOnStartup();
} else {
  mongoose.connection.once('connected', seedOnStartup);
}

// ═══════════════════════════════════════════════════════════════
// 📋 TEMPLATE ROUTES
// ═══════════════════════════════════════════════════════════════

// Public / read-only routes (optionalAuth — works for both guests and logged-in)
router.get('/',           optionalAuth, ctrl.listTemplates);
router.get('/categories', optionalAuth, ctrl.getCategories);
router.get('/stats',      optionalAuth, ctrl.getStats);

// Submission routes (must be BEFORE /:id to avoid matching "submissions" as an id)
router.get('/submissions/my',      authenticateToken, ctrl.getMySubmissions);
router.get('/submissions/pending', authenticateToken, ctrl.getPendingSubmissions);
router.get('/submissions/:submissionId',            authenticateToken, ctrl.getSubmission);
router.put('/submissions/:submissionId/approve',    authenticateToken, ctrl.approveSubmission);
router.put('/submissions/:submissionId/reject',     authenticateToken, ctrl.rejectSubmission);
router.put('/submissions/:submissionId/return',     authenticateToken, ctrl.returnSubmission);
router.put('/submissions/:submissionId/resubmit',   authenticateToken, ctrl.resubmitForm);
router.post('/submissions/:submissionId/comments',  authenticateToken, ctrl.addComment);
router.get('/submissions/:submissionId/render',     authenticateToken, ctrl.renderSubmission);

// Template CRUD (authenticated)
router.get('/:id',         optionalAuth,      ctrl.getTemplate);
router.post('/',           authenticateToken,  ctrl.createTemplate);
router.put('/:id',         authenticateToken,  ctrl.updateTemplate);
router.delete('/:id',      authenticateToken,  ctrl.deleteTemplate);
router.post('/:id/clone',  authenticateToken,  ctrl.cloneTemplate);

// Design routes (authenticated)
router.put('/:id/design',          authenticateToken, ctrl.updateDesign);
router.put('/:id/logo',            authenticateToken, ctrl.setLogo);
router.put('/:id/secondary-logo',  authenticateToken, ctrl.setSecondaryLogo);
router.put('/:id/header',          authenticateToken, ctrl.updateHeader);
router.put('/:id/footer',          authenticateToken, ctrl.updateFooter);

// Versioning routes (authenticated)
router.get('/:id/versions',                      authenticateToken, ctrl.getVersionHistory);
router.post('/:id/versions/:version/restore',     authenticateToken, ctrl.restoreVersion);

// Form submission
router.post('/:id/submit',  authenticateToken, ctrl.submitForm);

// Preview (template preview with sample data)
router.get('/:id/preview',  optionalAuth, ctrl.previewTemplate);

module.exports = router;
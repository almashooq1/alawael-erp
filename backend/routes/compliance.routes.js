/**
 * Compliance Routes — مسارات الامتثال والاعتماد
 * Mount: /api/v1/compliance
 *
 * Endpoints:
 *   GET  /dashboard
 *   GET  /audits
 *   POST /audits
 *   GET  /audits/:id
 *   PATCH /audits/:id/status
 *   GET  /pending-actions
 *   GET  /upcoming-reviews
 *   GET  /evidence/:auditId
 *   GET  /audit-trail
 */

'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const service = require('../services/compliance.service');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

const QUALITY_ROLES = ['admin', 'super_admin', 'manager', 'quality_manager', 'compliance_officer', 'clinical_director'];

/** Helper: run service call with standardized response */
async function handle(req, res, fn, name) {
  try {
    const result = await fn();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(`[Compliance] ${name} error:`, err.message);
    safeError(res, err, `compliance:${name}`);
  }
}

// ─── 1. Dashboard Overview ────────────────────────────────────────────
router.get(
  '/dashboard',
  requireAuth,
  requireRole(QUALITY_ROLES),
  async (req, res) => {
    const { branchId, standard } = req.query;
    await handle(req, res, () => service.getComplianceDashboard(branchId, standard), 'dashboard');
  }
);

// ─── 2. List Audits ───────────────────────────────────────────────────
router.get(
  '/audits',
  requireAuth,
  requireRole(QUALITY_ROLES),
  async (req, res) => {
    const { standard, category, status, branchId, search, page, limit } = req.query;
    await handle(req, res, () => service.listAudits(
      { standard, category, status, branchId, search },
      { page, limit }
    ), 'list-audits');
  }
);

// ─── 3. Create Audit ──────────────────────────────────────────────────
router.post(
  '/audits',
  requireAuth,
  requireRole(QUALITY_ROLES),
  async (req, res) => {
    await handle(req, res, () => service.createComplianceAudit(req.body), 'create-audit');
  }
);

// ─── 4. Get Single Audit ──────────────────────────────────────────────
router.get(
  '/audits/:id',
  requireAuth,
  requireRole(QUALITY_ROLES),
  async (req, res) => {
    const { id } = req.params;
    await handle(req, res, () => service.getAuditById(id), 'get-audit');
  }
);

// ─── 5. Update Status ─────────────────────────────────────────────────
router.patch(
  '/audits/:id/status',
  requireAuth,
  requireRole(QUALITY_ROLES),
  async (req, res) => {
    const { id } = req.params;
    const { status, evidence } = req.body;
    const changedBy = req.user?._id;
    await handle(req, res, () => service.updateComplianceStatus(id, status, evidence, changedBy), 'update-status');
  }
);

// ─── 6. Pending Actions ─────────────────────────────────────────────
router.get(
  '/pending-actions',
  requireAuth,
  requireRole(QUALITY_ROLES),
  async (req, res) => {
    const { branchId } = req.query;
    await handle(req, res, () => service.getPendingCorrectiveActions(branchId), 'pending-actions');
  }
);

// ─── 7. Upcoming Reviews ──────────────────────────────────────────────
router.get(
  '/upcoming-reviews',
  requireAuth,
  requireRole(QUALITY_ROLES),
  async (req, res) => {
    const { branchId, days } = req.query;
    await handle(req, res, () => service.getUpcomingReviews(branchId, Number(days) || 30), 'upcoming-reviews');
  }
);

// ─── 8. Evidence Registry ─────────────────────────────────────────────
router.get(
  '/evidence/:auditId',
  requireAuth,
  requireRole(QUALITY_ROLES),
  async (req, res) => {
    const { auditId } = req.params;
    await handle(req, res, () => service.getEvidenceRegistry(auditId), 'evidence-registry');
  }
);

// ─── 9. Audit Trail ───────────────────────────────────────────────────
router.get(
  '/audit-trail',
  requireAuth,
  requireRole(QUALITY_ROLES),
  async (req, res) => {
    const { standard, startDate, endDate } = req.query;
    await handle(req, res, () => service.getAuditTrail(standard, startDate, endDate), 'audit-trail');
  }
);

module.exports = router;

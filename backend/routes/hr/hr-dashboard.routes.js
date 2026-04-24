/**
 * hr-dashboard.routes.js — Phase 11 Commit 4 (4.0.21).
 *
 * GET /api/v1/hr/dashboard
 *
 * Executive-level rollup of HR compliance + workforce state produced
 * by `hrDashboardService`. The auth + RBAC gates are applied by the
 * caller when mounting (app.js pattern mirrors beneficiary-red-flags).
 *
 * Query parameters (all optional):
 *   branchId                 narrow to a single branch (HR_MANAGER / manager scope)
 *   overflowThresholdDays    override leave-balance overflow threshold (default 45)
 *
 * Response: 200 with the dashboard payload. Never 500 on partial
 * data — missing sections degrade to `null` inside the payload so
 * the client still renders something. 400 is returned only for
 * malformed branchId.
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');

function createHrDashboardRouter({ service, auditService = null, logger = console } = {}) {
  if (service == null || typeof service.buildDashboard !== 'function') {
    throw new Error('createHrDashboardRouter: service with buildDashboard() is required');
  }

  const router = express.Router();

  router.get('/dashboard', async (req, res) => {
    try {
      const { branchId, overflowThresholdDays } = req.query;

      if (branchId != null) {
        if (typeof branchId !== 'string' || !mongoose.Types.ObjectId.isValid(branchId)) {
          return res.status(400).json({ error: 'invalid branchId' });
        }
      }

      const thresholdDays =
        overflowThresholdDays != null
          ? Number.parseInt(String(overflowThresholdDays), 10)
          : undefined;
      if (thresholdDays != null && (Number.isNaN(thresholdDays) || thresholdDays < 0)) {
        return res.status(400).json({ error: 'invalid overflowThresholdDays' });
      }

      const payload = await service.buildDashboard({
        branchId: branchId ? new mongoose.Types.ObjectId(branchId) : null,
        ...(thresholdDays != null ? { overflowThresholdDays: thresholdDays } : {}),
      });

      // PDPL Art. 30 — record every HR-data access. Fire-and-forget;
      // audit failures never block the response (logged to stderr by
      // the service). `entityType: 'dashboard'` distinguishes this
      // from single-record reads in downstream analytics.
      if (auditService && req.user) {
        auditService
          .logHrAccess({
            actorUserId: req.user.id || req.user._id,
            actorRole: req.user.role,
            entityType: 'dashboard',
            entityId: branchId || null,
            action: 'snapshot',
            ipAddress: req.ip,
            metadata: { thresholdDays: thresholdDays ?? null },
          })
          .catch(() => {
            /* audit errors swallowed — logged by service layer */
          });
      }

      return res.json(payload);
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error('[HrDashboard]', err.message || err);
      }
      return res.status(500).json({ error: 'dashboard build failed' });
    }
  });

  return router;
}

module.exports = { createHrDashboardRouter };

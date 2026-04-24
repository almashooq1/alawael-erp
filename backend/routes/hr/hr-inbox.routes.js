'use strict';

/**
 * hr-inbox.routes.js — Phase 11 Commit 14 (4.0.31).
 *
 *   GET /api/v1/hr/inbox  [?limitPerSection=25]
 *
 * Per-user inbox for the approval workflow. Reads `req.user` to
 * drive branch scope + role gate in the service layer. Returns 200
 * with the inbox payload (sections may be empty arrays, never
 * null). 401 on missing auth.
 */

const express = require('express');

function createHrInboxRouter({ service, logger = console } = {}) {
  if (service == null || typeof service.buildInbox !== 'function') {
    throw new Error('createHrInboxRouter: service with buildInbox() required');
  }
  const router = express.Router();

  router.get('/inbox', async (req, res) => {
    try {
      if (!req.user || !(req.user.id || req.user._id)) {
        return res.status(401).json({ error: 'auth required' });
      }
      const userId = req.user.id || req.user._id;
      const role = req.user.role || null;
      const branchId = req.user.branchId || req.user.branch_id || null;

      const { limitPerSection } = req.query;
      const limit = limitPerSection ? Number.parseInt(String(limitPerSection), 10) : undefined;

      const payload = await service.buildInbox({
        userId,
        role,
        branchId,
        ...(Number.isFinite(limit) ? { limitPerSection: limit } : {}),
      });
      return res.json(payload);
    } catch (err) {
      logger.error && logger.error('[HrInbox]', err.message || err);
      return res.status(500).json({ error: 'inbox build failed' });
    }
  });

  return router;
}

module.exports = { createHrInboxRouter };

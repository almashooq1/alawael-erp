/**
 * red-flag-admin.routes.js — Beneficiary-360 Commit 9.
 *
 * Cross-beneficiary administrative surface. The beneficiary-scoped
 * router (Commit 3c) deals with one individual at a time; this one
 * answers "what's on fire across the whole center right now?"
 *
 * Mount like:
 *
 *   app.use('/api/v1/admin/red-flags',
 *     authenticate, requireRole(['admin', 'quality_coordinator', ...]),
 *     createRedFlagAdminRouter({ aggregateService }));
 *
 * Authorization is the caller's job. The router only enforces
 * input shape.
 */

'use strict';

const express = require('express');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function createRedFlagAdminRouter(deps = {}) {
  const { aggregateService } = deps;
  if (aggregateService == null || typeof aggregateService.aggregate !== 'function') {
    throw new Error('createRedFlagAdminRouter: aggregateService with aggregate() is required');
  }

  const router = express.Router();
  router.use(express.json());

  router.get(
    '/dashboard',
    asyncHandler(async (_req, res) => {
      const summary = await aggregateService.aggregate();
      return res.status(200).json({ data: summary });
    })
  );

  router.use((err, _req, res, _next) => {
    return res.status(500).json({
      error: {
        code: 'RED_FLAG_ADMIN_ERROR',
        message: err && err.message ? err.message : 'internal error',
      },
    });
  });

  return router;
}

module.exports = { createRedFlagAdminRouter };

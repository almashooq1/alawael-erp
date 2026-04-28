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
 *     createRedFlagAdminRouter({ aggregateService }));
 *
 * Auth + role gate are applied inside the factory (defense in depth).
 * Earlier versions of this file deferred authorization to the caller;
 * the canonical mount in app.js only added `authenticate`, leaving any
 * authenticated user (parent / therapist / receptionist) able to read
 * the cross-org dashboard. We now bake authorization into the router
 * so a future mount that forgets the role gate is still safe.
 */

'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const ADMIN_ROLES = [
  'admin',
  'super_admin',
  'superadmin',
  'manager',
  'quality_coordinator',
  'compliance_officer',
];

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
  router.use(authenticate);
  router.use(authorize(ADMIN_ROLES));

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

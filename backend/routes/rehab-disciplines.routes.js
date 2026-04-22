/**
 * rehab-disciplines.routes.js — read-only HTTP surface for the
 * rehabilitation-disciplines registry.
 *
 * Phase 9 Commit 5. Wraps rehabDisciplineService (which wraps the
 * canonical registry) as an Express router. No DB, no mutations —
 * the registry is pure data at rest; clinicians edit operational
 * Program/Measure/Goal records through other routers.
 *
 * Mount pattern (same as other Phase-9-aligned routers):
 *
 *   app.use('/api/v1/rehab/disciplines',
 *     authenticate,
 *     createRehabDisciplinesRouter());
 *
 * Authentication + RBAC are the mount-site's job. The router
 * enforces input shape only.
 */

'use strict';

const express = require('express');
const service = require('../services/rehabDisciplineService');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function createRehabDisciplinesRouter() {
  const router = express.Router();
  router.use(express.json());

  // GET /taxonomy — enum sets for UI dropdowns
  router.get(
    '/taxonomy',
    asyncHandler(async (_req, res) => {
      return res.status(200).json({
        data: {
          domains: [...service.DOMAINS],
          deliveryModes: [...service.DELIVERY_MODES],
          ageBands: [...service.AGE_BANDS],
        },
      });
    })
  );

  // GET /health — orphan + count self-check
  router.get(
    '/health',
    asyncHandler(async (_req, res) => {
      return res.status(200).json({ data: service.healthCheck() });
    })
  );

  // GET /suggest?age_months=X — applicable disciplines for an age
  router.get(
    '/suggest',
    asyncHandler(async (req, res) => {
      const months = Number.parseInt(req.query.age_months, 10);
      if (!Number.isFinite(months) || months < 0) {
        return res.status(400).json({
          error: {
            code: 'BAD_INPUT',
            message: 'age_months must be a non-negative integer',
          },
        });
      }
      return res.status(200).json({
        data: service.suggestForAge(months),
        ageBand: service.ageMonthsToBand(months),
      });
    })
  );

  // GET / — list (summary) with optional filters
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { domain, age_band: ageBand, delivery_mode: deliveryMode } = req.query;
      const data = service.list({ domain, ageBand, deliveryMode });
      return res.status(200).json({ data });
    })
  );

  // GET /:id — full bundle (discipline + resolved kpis + flags + templates)
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const out = service.bundle(req.params.id);
      if (!out) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'discipline not found' },
        });
      }
      return res.status(200).json({ data: out });
    })
  );

  // GET /:id/programs — seed program templates
  router.get(
    '/:id/programs',
    asyncHandler(async (req, res) => {
      const d = service.get(req.params.id);
      if (!d) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'discipline not found' },
        });
      }
      return res.status(200).json({ data: d.programTemplates });
    })
  );

  // GET /:id/interventions — first-line intervention catalogue
  router.get(
    '/:id/interventions',
    asyncHandler(async (req, res) => {
      const d = service.get(req.params.id);
      if (!d) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'discipline not found' },
        });
      }
      return res.status(200).json({ data: d.recommendedInterventions });
    })
  );

  // GET /:id/measures — recommended outcome measures
  router.get(
    '/:id/measures',
    asyncHandler(async (req, res) => {
      const d = service.get(req.params.id);
      if (!d) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'discipline not found' },
        });
      }
      return res.status(200).json({ data: d.recommendedMeasures });
    })
  );

  // GET /:id/goal-templates — SMART-shaped starter goals
  router.get(
    '/:id/goal-templates',
    asyncHandler(async (req, res) => {
      const d = service.get(req.params.id);
      if (!d) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'discipline not found' },
        });
      }
      return res.status(200).json({ data: d.goalTemplates });
    })
  );

  // Terminal error handler

  router.use((err, _req, res, _next) => {
    return res.status(500).json({
      error: {
        code: 'REHAB_DISCIPLINES_ERROR',
        message: err && err.message ? err.message : 'internal error',
      },
    });
  });

  return router;
}

module.exports = { createRehabDisciplinesRouter };

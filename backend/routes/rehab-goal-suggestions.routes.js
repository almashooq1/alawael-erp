/**
 * rehab-goal-suggestions.routes.js — HTTP surface for the SMART-goal
 * + intervention suggestion engine.
 *
 * Phase 9 Commit 8. Exposes goalSuggestionService as three read-only
 * endpoints. Mount under /api/v1/rehab/goal-suggestions behind
 * authenticate; authorisation is the mount-site's job.
 */

'use strict';

const express = require('express');
const suggestionService = require('../services/goalSuggestionService');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function parseCsv(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function createRehabGoalSuggestionsRouter() {
  const router = express.Router();
  router.use(express.json());

  // GET /goals?discipline_ids=a,b&age_months=24&exclude=CODE1,CODE2&limit=10
  router.get(
    '/goals',
    asyncHandler(async (req, res) => {
      const disciplineIds = parseCsv(req.query.discipline_ids);
      const ageMonthsRaw = req.query.age_months;
      const ageMonths =
        ageMonthsRaw != null && ageMonthsRaw !== '' ? Number.parseInt(ageMonthsRaw, 10) : null;
      if (ageMonths != null && (!Number.isFinite(ageMonths) || ageMonths < 0)) {
        return res.status(400).json({
          error: {
            code: 'BAD_INPUT',
            message: 'age_months must be a non-negative integer if provided',
          },
        });
      }
      const existingGoalCodes = parseCsv(req.query.exclude);
      const limitRaw = req.query.limit;
      const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 10;
      if (!Number.isFinite(limit) || limit < 0 || limit > 100) {
        return res.status(400).json({
          error: {
            code: 'BAD_INPUT',
            message: 'limit must be an integer in [0, 100]',
          },
        });
      }

      const out = suggestionService.suggestGoalsForContext({
        disciplineIds,
        ageMonths,
        existingGoalCodes,
        limit,
      });
      return res.status(200).json({ data: out });
    })
  );

  // POST /goals — same as GET but accepts a JSON body for richer input
  router.post(
    '/goals',
    asyncHandler(async (req, res) => {
      const { disciplineIds, ageMonths, existingGoalCodes, limit } = req.body || {};
      if (disciplineIds != null && !Array.isArray(disciplineIds)) {
        return res.status(400).json({
          error: {
            code: 'BAD_INPUT',
            message: 'disciplineIds must be an array of strings',
          },
        });
      }
      if (
        ageMonths != null &&
        (typeof ageMonths !== 'number' || !Number.isFinite(ageMonths) || ageMonths < 0)
      ) {
        return res.status(400).json({
          error: {
            code: 'BAD_INPUT',
            message: 'ageMonths must be a non-negative number if provided',
          },
        });
      }
      const out = suggestionService.suggestGoalsForContext({
        disciplineIds: disciplineIds || [],
        ageMonths: ageMonths == null ? null : ageMonths,
        existingGoalCodes: existingGoalCodes || [],
        limit: Number.isFinite(limit) ? limit : 10,
      });
      return res.status(200).json({ data: out });
    })
  );

  // GET /interventions?discipline_id=X&metric=PERCENTAGE
  router.get(
    '/interventions',
    asyncHandler(async (req, res) => {
      const disciplineId = req.query.discipline_id;
      if (!disciplineId || typeof disciplineId !== 'string') {
        return res.status(400).json({
          error: {
            code: 'BAD_INPUT',
            message: 'discipline_id query parameter is required',
          },
        });
      }
      const out = suggestionService.suggestInterventionsForGoal({
        disciplineId,
        metric: req.query.metric || null,
      });
      if (out.reason === 'unknown_discipline') {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'unknown discipline id' },
        });
      }
      return res.status(200).json({ data: out });
    })
  );

  // GET /draft?template_code=X&age_months=Y&exclude=...
  router.get(
    '/draft',
    asyncHandler(async (req, res) => {
      const templateCode = req.query.template_code;
      if (!templateCode || typeof templateCode !== 'string') {
        return res.status(400).json({
          error: {
            code: 'BAD_INPUT',
            message: 'template_code query parameter is required',
          },
        });
      }
      const ageMonthsRaw = req.query.age_months;
      const ageMonths =
        ageMonthsRaw != null && ageMonthsRaw !== '' ? Number.parseInt(ageMonthsRaw, 10) : null;
      if (ageMonths != null && (!Number.isFinite(ageMonths) || ageMonths < 0)) {
        return res.status(400).json({
          error: { code: 'BAD_INPUT', message: 'age_months invalid' },
        });
      }

      const bundle = suggestionService.draftGoalBundle({
        templateCode,
        ageMonths,
        existingGoalCodes: parseCsv(req.query.exclude),
      });
      if (!bundle) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'template_code not found' },
        });
      }
      return res.status(200).json({ data: bundle });
    })
  );

  // Terminal error handler

  router.use((err, _req, res, _next) => {
    return res.status(500).json({
      error: {
        code: 'REHAB_GOAL_SUGGESTIONS_ERROR',
        message: err && err.message ? err.message : 'internal error',
      },
    });
  });

  return router;
}

module.exports = { createRehabGoalSuggestionsRouter };

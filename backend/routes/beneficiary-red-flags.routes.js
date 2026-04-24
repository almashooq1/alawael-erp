/**
 * beneficiary-red-flags.routes.js — Beneficiary-360 Commit 3c.
 *
 * HTTP surface for the beneficiary red-flag stack. Exposed as a
 * factory so the caller can wire the engine, store, and any
 * middleware they need at bootstrap, and so tests can inject
 * fakes without touching the DB or locator wiring. The router
 * itself is pure: no module-level state, no singletons.
 *
 * Mount like:
 *
 *   const router = createRedFlagRouter({ engine, store });
 *   app.use('/api/v1/beneficiaries', authenticate, router);
 *
 * Endpoints (all scoped to :beneficiaryId):
 *
 *   GET    /:beneficiaryId/red-flags
 *     List currently-active flags for the beneficiary. No
 *     evaluation, no service calls — pure state read. Fast,
 *     cacheable per UI tick.
 *
 *   POST   /:beneficiaryId/red-flags/evaluate
 *     Run the engine (optional filters in body: domains,
 *     severities, flagIds) and reconcile with the store. Returns
 *     the full transition bucket list. This is what a scheduler,
 *     cron job, or manual "re-scan" button calls.
 *
 *   POST   /:beneficiaryId/red-flags/:flagId/resolve
 *     Manual close. Body: { resolvedBy, resolution }. Responds
 *     with the resolved record, or 404 if the flag was not
 *     active.
 *
 *   GET    /:beneficiaryId/red-flags/session-start-check
 *     Pre-flight for schedulers and UI confirmation dialogs.
 *     Returns the guard verdict. Does NOT run a fresh evaluation
 *     — uses current store state only, so the UI stays snappy.
 *
 * Design decisions:
 *
 *   1. Authentication, branch scoping, and rate limiting belong
 *      to the caller — the router does not import auth middleware,
 *      keeping it trivially testable.
 *
 *   2. Errors map to HTTP status codes explicitly. Bad request
 *      (missing/invalid beneficiaryId) → 400. No such active
 *      flag to resolve → 404. Registry/engine misconfiguration
 *      → 500 with a structured error body (no stack trace in
 *      the response).
 *
 *   3. Response envelopes are consistent: always
 *      `{ data, meta? }` on success and
 *      `{ error: { code, message, ... } }` on failure. UI client
 *      hooks need not parse two different shapes.
 */

'use strict';

const express = require('express');
const { canStartSession } = require('../services/redFlagGuard');

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function readFilters(body = {}) {
  const filters = {};
  if (body.domains !== undefined) filters.domains = body.domains;
  if (body.severities !== undefined) filters.severities = body.severities;
  if (body.flagIds !== undefined) filters.flagIds = body.flagIds;
  return filters;
}

function createRedFlagRouter(deps = {}) {
  const { engine, store, overrideLog } = deps;
  if (engine == null || typeof engine.evaluateBeneficiary !== 'function') {
    throw new Error('createRedFlagRouter: engine with evaluateBeneficiary() is required');
  }
  if (store == null || typeof store.applyVerdicts !== 'function') {
    throw new Error('createRedFlagRouter: store with applyVerdicts() is required');
  }
  // `overrideLog` is optional — when provided, POST /override records
  // the bypass event; when absent, that endpoint returns 501 so
  // callers know audit logging isn't configured on this deployment.

  const router = express.Router({ mergeParams: true });
  router.use(express.json());

  // ─── GET /:beneficiaryId/red-flags ─────────────────────────────
  router.get(
    '/:beneficiaryId/red-flags',
    asyncHandler(async (req, res) => {
      const { beneficiaryId } = req.params;
      if (!beneficiaryId) {
        return res.status(400).json({
          error: { code: 'BENEFICIARY_ID_REQUIRED', message: 'beneficiaryId is required' },
        });
      }
      const active = store.getAllActive(beneficiaryId);
      const guard = canStartSession(beneficiaryId, store);
      return res.status(200).json({
        data: {
          beneficiaryId,
          active,
          summary: {
            total: active.length,
            critical: active.filter(r => r.severity === 'critical').length,
            warning: active.filter(r => r.severity === 'warning').length,
            info: active.filter(r => r.severity === 'info').length,
            blocking: guard.blockingFlags.length,
          },
        },
      });
    })
  );

  // ─── POST /:beneficiaryId/red-flags/evaluate ───────────────────
  router.post(
    '/:beneficiaryId/red-flags/evaluate',
    asyncHandler(async (req, res) => {
      const { beneficiaryId } = req.params;
      if (!beneficiaryId) {
        return res.status(400).json({
          error: { code: 'BENEFICIARY_ID_REQUIRED', message: 'beneficiaryId is required' },
        });
      }
      const filters = readFilters(req.body);
      const result = await engine.evaluateBeneficiary(beneficiaryId, filters);
      const transitions = store.applyVerdicts(beneficiaryId, result.verdicts, {
        now: result.evaluatedAt,
      });
      return res.status(200).json({
        data: {
          beneficiaryId,
          evaluatedAt: result.evaluatedAt,
          flagsEvaluated: result.flagsEvaluated,
          transitions,
        },
      });
    })
  );

  // ─── POST /:beneficiaryId/red-flags/:flagId/resolve ────────────
  router.post(
    '/:beneficiaryId/red-flags/:flagId/resolve',
    asyncHandler(async (req, res) => {
      const { beneficiaryId, flagId } = req.params;
      if (!beneficiaryId || !flagId) {
        return res.status(400).json({
          error: {
            code: 'REQUIRED_PARAMS_MISSING',
            message: 'beneficiaryId and flagId are required',
          },
        });
      }
      const { resolvedBy, resolution } = req.body || {};
      const resolved = store.manualResolve(beneficiaryId, flagId, {
        resolvedBy,
        resolution,
      });
      if (!resolved) {
        return res.status(404).json({
          error: {
            code: 'FLAG_NOT_ACTIVE',
            message: `No active flag '${flagId}' for beneficiary '${beneficiaryId}'`,
          },
        });
      }
      return res.status(200).json({ data: resolved });
    })
  );

  // ─── POST /:beneficiaryId/red-flags/override ───────────────────
  // Records an emergency bypass of one or more blocking flags. The
  // guard already approved this on the UI side; this endpoint just
  // persists the audit row.
  router.post(
    '/:beneficiaryId/red-flags/override',
    asyncHandler(async (req, res) => {
      const { beneficiaryId } = req.params;
      if (!beneficiaryId) {
        return res.status(400).json({
          error: { code: 'BENEFICIARY_ID_REQUIRED', message: 'beneficiaryId is required' },
        });
      }
      if (overrideLog == null) {
        return res.status(501).json({
          error: {
            code: 'OVERRIDE_LOG_NOT_CONFIGURED',
            message: 'override logging is not enabled on this deployment',
          },
        });
      }
      const { overriddenBy, reason, blockingFlagIds, context } = req.body || {};
      try {
        const record = await overrideLog.record({
          beneficiaryId,
          overriddenBy,
          reason,
          blockingFlagIds,
          context,
        });
        return res.status(201).json({ data: record });
      } catch (err) {
        return res.status(400).json({
          error: {
            code: 'OVERRIDE_VALIDATION_FAILED',
            message: err.message || 'override validation failed',
          },
        });
      }
    })
  );

  // ─── GET /:beneficiaryId/red-flags/overrides ──────────────────
  router.get(
    '/:beneficiaryId/red-flags/overrides',
    asyncHandler(async (req, res) => {
      const { beneficiaryId } = req.params;
      if (!beneficiaryId) {
        return res.status(400).json({
          error: { code: 'BENEFICIARY_ID_REQUIRED', message: 'beneficiaryId is required' },
        });
      }
      if (overrideLog == null) {
        return res.status(501).json({
          error: {
            code: 'OVERRIDE_LOG_NOT_CONFIGURED',
            message: 'override logging is not enabled on this deployment',
          },
        });
      }
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const records = await overrideLog.listForBeneficiary(beneficiaryId, { limit });
      return res.status(200).json({ data: records });
    })
  );

  // ─── GET /:beneficiaryId/red-flags/session-start-check ─────────
  router.get(
    '/:beneficiaryId/red-flags/session-start-check',
    asyncHandler(async (req, res) => {
      const { beneficiaryId } = req.params;
      if (!beneficiaryId) {
        return res.status(400).json({
          error: { code: 'BENEFICIARY_ID_REQUIRED', message: 'beneficiaryId is required' },
        });
      }
      const emergency = req.query.emergency === 'true';
      const verdict = canStartSession(beneficiaryId, store, { emergency });
      return res.status(verdict.allowed ? 200 : 409).json({
        data: verdict,
      });
    })
  );

  // Error surface: anything thrown past asyncHandler lands here
  // (registry misconfiguration, unexpected evaluator-error, etc).
  router.use((err, req, res, _next) => {
    return res.status(500).json({
      error: {
        code: 'RED_FLAG_INTERNAL_ERROR',
        message: err && err.message ? err.message : 'internal error',
      },
    });
  });

  return router;
}

module.exports = { createRedFlagRouter };

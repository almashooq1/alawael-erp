'use strict';

/**
 * drilldown.routes.js — Wave 21 (Drill-Down Architecture).
 *
 * HTTP surface for the per-KPI drill chain. Read-mostly: every
 * endpoint except /actions/:actionId/invoke is a registry lookup.
 *
 *   GET  /                            — list registered KPIs (kpiId + title + category)
 *   GET  /:kpiId                      — full drill bundle (chain + owner + drivers + actions)
 *   GET  /:kpiId/next?fromLevel=&...  — resolve next-level deepLink
 *   GET  /:kpiId/level/:toLevel?...   — resolve a specific level
 *   GET  /:kpiId/chain?...            — full chain (all levels, substituted)
 *   GET  /:kpiId/owner?branchId=...   — owner resolution
 *   GET  /:kpiId/drivers              — upstream drivers
 *   POST /:kpiId/actions/:actionId/invoke — log an action click
 *
 * Query params for path-substitution (next/level/chain/owner/bundle):
 *   branchId, beneficiaryId, employeeId, invoiceId, complaintId,
 *   incidentId, documentId, carePlanId, goalId, sessionId, date, unitId
 *
 * Status code map:
 *   200 success | 404 KPI_NOT_FOUND / ACTION_NOT_FOUND |
 *   400 INVALID_LEVEL | 409 TERMINAL_LEVEL_REACHED
 */

const express = require('express');
const safeError = require('../utils/safeError');

const REASON_TO_STATUS = Object.freeze({
  KPI_NOT_FOUND: 404,
  LEVEL_NOT_AVAILABLE_FOR_KPI: 404,
  ACTION_NOT_FOUND: 404,
  INVALID_LEVEL: 400,
  TERMINAL_LEVEL_REACHED: 409,
});

// Allowed query keys that we forward as path-substitution params.
// Anything else is dropped so a stray query param can't smuggle a
// :placeholder into a deep link.
const ALLOWED_PARAM_KEYS = new Set([
  'branchId',
  'beneficiaryId',
  'employeeId',
  'invoiceId',
  'complaintId',
  'incidentId',
  'documentId',
  'carePlanId',
  'goalId',
  'sessionId',
  'unitId',
  'date',
]);

function paramsFromQuery(query) {
  const out = {};
  if (!query || typeof query !== 'object') return out;
  for (const k of Object.keys(query)) {
    if (ALLOWED_PARAM_KEYS.has(k) && typeof query[k] === 'string' && query[k].length > 0) {
      out[k] = query[k];
    }
  }
  return out;
}

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
    ip: req.ip,
    params: paramsFromQuery(req.query),
  };
}

function respond(res, result) {
  if (result && result.ok) {
    return res.json({ success: true, data: result });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || 'DRILLDOWN_REJECTED',
    reason: result?.reason,
  });
}

/**
 * @param {object} opts
 *   - drilldown:             createDrilldownService output
 *   - resolveUsersForRole:   same callback the AlertEngine uses for tier-notify.
 *                            When absent, owner endpoint returns role-only.
 *   - auditLogger:           passed to drilldown.invokeAction
 *   - logger:                console-compatible
 */
function createDrilldownRouter({
  drilldown,
  resolveUsersForRole = null,
  auditLogger = null,
  logger = console,
} = {}) {
  if (!drilldown || typeof drilldown.getMetadata !== 'function') {
    throw new Error('drilldown.routes: drilldown service is required');
  }
  void logger;

  const router = express.Router();

  // GET / — list all registered KPIs (id + title + category)
  router.get('/', async (_req, res) => {
    try {
      const kpis = drilldown.listRegisteredKpis().map(id => {
        const m = drilldown.getMetadata(id);
        return m
          ? {
              kpiId: id,
              titleAr: m.titleAr,
              titleEn: m.titleEn,
              category: m.category,
              terminalLevel: m.terminalLevel,
            }
          : { kpiId: id };
      });
      return res.json({ success: true, data: { kpis, count: kpis.length } });
    } catch (err) {
      return safeError(res, err, 'drilldown.list');
    }
  });

  // GET /:kpiId — full bundle (chain + owner + drivers + actions)
  router.get('/:kpiId', async (req, res) => {
    try {
      const params = paramsFromQuery(req.query);
      const ctx = actorFrom(req);
      const bundle = await drilldown.getDrillBundle({
        kpiId: req.params.kpiId,
        params,
        ctx,
        resolveUsersForRole,
      });
      return respond(res, bundle);
    } catch (err) {
      return safeError(res, err, 'drilldown.bundle');
    }
  });

  // GET /:kpiId/next?fromLevel=branch&branchId=...
  router.get('/:kpiId/next', async (req, res) => {
    try {
      const fromLevel = String(req.query.fromLevel || '');
      const params = paramsFromQuery(req.query);
      const result = drilldown.resolveNextLevel({
        kpiId: req.params.kpiId,
        fromLevel,
        params,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'drilldown.next');
    }
  });

  // GET /:kpiId/level/:toLevel?branchId=...
  router.get('/:kpiId/level/:toLevel', async (req, res) => {
    try {
      const params = paramsFromQuery(req.query);
      const result = drilldown.resolveLevel({
        kpiId: req.params.kpiId,
        toLevel: req.params.toLevel,
        params,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'drilldown.level');
    }
  });

  // GET /:kpiId/chain?branchId=...
  router.get('/:kpiId/chain', async (req, res) => {
    try {
      const params = paramsFromQuery(req.query);
      const result = drilldown.getFullChain({ kpiId: req.params.kpiId, params });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'drilldown.chain');
    }
  });

  // GET /:kpiId/owner?branchId=...
  router.get('/:kpiId/owner', async (req, res) => {
    try {
      const ctx = actorFrom(req);
      ctx.branchId = req.query.branchId || ctx.params.branchId || null;
      const result = await drilldown.resolveOwner({
        kpiId: req.params.kpiId,
        ctx,
        resolveUsersForRole,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'drilldown.owner');
    }
  });

  // GET /:kpiId/drivers
  router.get('/:kpiId/drivers', async (req, res) => {
    try {
      const meta = drilldown.getMetadata(req.params.kpiId);
      if (!meta) return respond(res, { ok: false, reason: 'KPI_NOT_FOUND' });
      return res.json({
        success: true,
        data: {
          kpiId: req.params.kpiId,
          drivers: drilldown.getDrivers(req.params.kpiId),
          relatedGeneratorIds: drilldown.getRelatedGeneratorIds(req.params.kpiId),
        },
      });
    } catch (err) {
      return safeError(res, err, 'drilldown.drivers');
    }
  });

  // POST /:kpiId/actions/:actionId/invoke — log the click
  router.post('/:kpiId/actions/:actionId/invoke', async (req, res) => {
    try {
      const ctx = actorFrom(req);
      // Body params (if posted) override query params for substitution.
      if (req.body && typeof req.body === 'object') {
        ctx.params = { ...ctx.params, ...paramsFromQuery(req.body) };
      }
      const result = await drilldown.invokeAction({
        kpiId: req.params.kpiId,
        actionId: req.params.actionId,
        ctx,
        auditLogger,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'drilldown.invoke');
    }
  });

  return router;
}

module.exports = { createDrilldownRouter };

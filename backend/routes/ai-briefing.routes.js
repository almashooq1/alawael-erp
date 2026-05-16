'use strict';

/**
 * ai-briefing.routes.js — Wave 4 (Premium AI Layer).
 *
 *   GET  /status                  — { available, model, cacheSizes }
 *   GET  /morning                 — bilingual 5-bullet morning briefing
 *   GET  /next-best-action        — ranked actionable next-steps (3-5)
 *
 * Mounted at `/api/v1/ai/briefing`. All routes require an authenticated
 * user; the briefings personalize on the JWT-resolved role + branch.
 *
 * Every successful call writes an `ai.briefing.*` audit event so we
 * can answer "who saw what AI-generated content" for compliance.
 */

const express = require('express');
const safeError = require('../utils/safeError');

/**
 * @param {object} opts
 *   - logger:        console-compatible
 *   - briefing:      the service produced by createBriefingService(...)
 *   - getAlerts(req) async → Array<alert>  (injected — knows about Alert model)
 *   - getKpis(req)         → Array<kpi>    (injected — knows about KPI snapshot)
 *   - auditLogger?:  optional logger.log({ ... }) integration
 *   - authenticate:  optional authenticate middleware
 *
 * Why inject `getAlerts` / `getKpis` rather than reach for `req.app.get(...)`:
 * the alerts engine is constructed inside server boot scope and never
 * pushed onto the Express `app` instance, so route-level lookups would
 * always return undefined. Dependency-injection at mount time keeps the
 * router pure, testable, and obvious about what it depends on.
 */
function createAiBriefingRouter({
  logger = console,
  briefing,
  getAlerts = null,
  getKpis = null,
  auditLogger = null,
  authenticate = null,
} = {}) {
  if (!briefing || typeof briefing.morningBriefing !== 'function') {
    throw new Error('ai-briefing.routes: briefing service is required');
  }

  const router = express.Router();
  if (authenticate) router.use(authenticate);

  async function audit(action, req, metadata) {
    if (!auditLogger || typeof auditLogger.log !== 'function') return;
    try {
      await auditLogger.log({
        action,
        actorUserId: req.user?._id || req.user?.id || null,
        actorRole: req.user?.role || null,
        entityType: 'ai_briefing',
        ipAddress: req.ip,
        metadata,
      });
    } catch (err) {
      logger.warn('[ai-briefing] audit failed: ' + err.message);
    }
  }

  router.get('/status', (_req, res) => {
    try {
      res.json({ success: true, data: briefing.stats() });
    } catch (err) {
      safeError(res, err, 'ai-briefing status');
    }
  });

  async function safeGetAlerts(req) {
    if (typeof getAlerts !== 'function') return [];
    try {
      const result = await getAlerts(req);
      return Array.isArray(result) ? result : [];
    } catch (err) {
      logger.warn('[ai-briefing] getAlerts failed: ' + (err.message || err));
      return [];
    }
  }

  function safeGetKpis(req) {
    if (typeof getKpis !== 'function') return [];
    try {
      const result = getKpis(req);
      return Array.isArray(result) ? result : [];
    } catch {
      return [];
    }
  }

  router.get('/morning', async (req, res) => {
    try {
      const role = req.user?.role || req.user?.roleCode || 'unknown';
      const branchId =
        req.user?.activeBranchId ||
        req.user?.branchId ||
        (req.query && typeof req.query.branchId === 'string' ? req.query.branchId : null);
      const alerts = await safeGetAlerts(req);
      const kpis = safeGetKpis(req);
      const result = await briefing.morningBriefing({ role, branchId, alerts, kpis });
      await audit('ai.briefing.morning', req, {
        role,
        branchId: branchId || null,
        alertCount: alerts.length,
        kpiCount: kpis.length,
        source: result.source || null,
        cached: !!result.cached,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      safeError(res, err, 'ai-briefing morning');
    }
  });

  router.get('/next-best-action', async (req, res) => {
    try {
      const role = req.user?.role || req.user?.roleCode || 'unknown';
      const branchId =
        req.user?.activeBranchId ||
        req.user?.branchId ||
        (req.query && typeof req.query.branchId === 'string' ? req.query.branchId : null);
      const alerts = await safeGetAlerts(req);
      const result = await briefing.nextBestActions({ role, branchId, alerts });
      await audit('ai.briefing.next_best_action', req, {
        role,
        branchId: branchId || null,
        alertCount: alerts.length,
        source: result.source || null,
        cached: !!result.cached,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      safeError(res, err, 'ai-briefing next-best-action');
    }
  });

  return router;
}

module.exports = { createAiBriefingRouter };

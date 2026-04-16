/**
 * Alert REST routes — consumer-facing API for the Alerts engine.
 *
 * Mount pattern (see docs/blueprint/app-integration.md):
 *
 *   app.use(
 *     '/api/alerts',
 *     authenticateToken,
 *     enforce({ action: 'read', resourceType: 'Alert' }),
 *     buildRouter({ AlertModel, engine }),
 *   );
 *
 * Route scoping:
 *   - L1/L2 see all active alerts (possibly filtered by branchId).
 *   - L3/L4 see alerts for their branch.
 *   - L5/L6 do not consume this endpoint directly (gated in upstream ABAC).
 */

'use strict';

const express = require('express');

function buildRouter({ AlertModel, engine, audit }) {
  if (!AlertModel) throw new Error('alerts.routes: AlertModel required');
  const router = express.Router();

  // ────────────────────────────────
  // LIST
  // ────────────────────────────────

  router.get('/active', async (req, res, next) => {
    try {
      const { branchId, category, severity, limit = '50' } = req.query || {};
      const q = { resolvedAt: null };
      if (branchId) q.branchId = branchId;
      if (category) q.category = category;
      if (severity) q.severity = severity;
      const lim = Math.min(500, parseInt(limit, 10) || 50);
      const docs = await AlertModel.model.find(q).sort({ severity: 1, firstSeenAt: -1 }).limit(lim);
      res.json({ count: docs.length, active: true, alerts: docs });
    } catch (err) {
      next(err);
    }
  });

  router.get('/history', async (req, res, next) => {
    try {
      const { branchId, ruleId, limit = '100' } = req.query || {};
      const q = {};
      if (branchId) q.branchId = branchId;
      if (ruleId) q.ruleId = ruleId;
      const lim = Math.min(500, parseInt(limit, 10) || 100);
      const docs = await AlertModel.model.find(q).sort({ firstSeenAt: -1 }).limit(lim);
      res.json({ count: docs.length, alerts: docs });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const doc = await AlertModel.model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'not_found' });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  // ────────────────────────────────
  // ACKNOWLEDGE / SNOOZE
  // ────────────────────────────────

  router.post('/:id/acknowledge', async (req, res, next) => {
    try {
      const { note } = req.body || {};
      const doc = await AlertModel.model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'not_found' });
      if (doc.resolvedAt) return res.status(409).json({ error: 'already_resolved' });

      const ack = {
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user && req.user.id,
        note: note || null,
      };
      doc.metadata = doc.metadata || {};
      doc.metadata.acknowledgements = Array.isArray(doc.metadata.acknowledgements)
        ? [...doc.metadata.acknowledgements, ack]
        : [ack];
      doc.markModified && doc.markModified('metadata');
      await doc.save();
      if (audit) audit(req, { action: 'alert.acknowledged', resourceId: doc._id });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/snooze', async (req, res, next) => {
    try {
      const { minutes = 60 } = req.body || {};
      const mins = Math.max(1, Math.min(24 * 60, parseInt(minutes, 10) || 60));
      const doc = await AlertModel.model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'not_found' });
      if (doc.resolvedAt) return res.status(409).json({ error: 'already_resolved' });

      doc.metadata = doc.metadata || {};
      doc.metadata.snoozedUntil = new Date(Date.now() + mins * 60 * 1000);
      doc.metadata.snoozedBy = req.user && req.user.id;
      doc.markModified && doc.markModified('metadata');
      await doc.save();
      if (audit) audit(req, { action: 'alert.snoozed', resourceId: doc._id, meta: { mins } });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  // ────────────────────────────────
  // RULES METADATA
  // ────────────────────────────────

  router.get('/rules/list', (_req, res) => {
    if (!engine) return res.json({ count: 0, rules: [] });
    const rules = Array.from(engine.rules.values()).map(r => ({
      id: r.id,
      severity: r.severity,
      category: r.category,
      description: r.description,
    }));
    res.json({ count: rules.length, rules });
  });

  // Manual re-run (admin utility) — gated by ABAC at mount time.
  router.post('/run-now', async (req, res, next) => {
    try {
      if (!engine) return res.status(501).json({ error: 'engine_not_mounted' });
      const ctx = (req.app.locals && req.app.locals.alertsCtx) || {};
      const out = await engine.runAll(ctx);
      if (audit) audit(req, { action: 'alerts.run_now', meta: { raised: out.raised.length } });
      res.json(out);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { buildRouter };

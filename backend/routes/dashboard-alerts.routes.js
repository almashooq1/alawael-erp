/**
 * dashboard-alerts.routes.js — admin HTTP surface for dashboard
 * alerts.
 *
 * Phase 18 Commit 8.
 *
 * Mounted under `/api/v1/dashboards/alerts`. The coordinator is
 * built once at app boot and attached to `app._alertCoordinator`;
 * this router reads it off `req.app` so tests can inject a fake
 * without touching the DI container.
 *
 * Endpoints:
 *
 *   GET  /            — list active alerts (optionally include suppressed)
 *   GET  /policies    — list the full alert policy catalogue
 *   POST /:key/ack    — acknowledge an alert (clears escalation)
 *   POST /:key/snooze — snooze for N minutes (default 60)
 *   POST /:key/mute   — mute for N hours (default 24) with reason
 *
 * All endpoints expect `req.user` to be populated by the upstream
 * `authenticate` middleware.
 */

'use strict';

const express = require('express');

const { POLICIES, ESCALATION_LADDERS } = require('../config/alert.registry');
// W1191 — self-authenticate. Header says endpoints "expect req.user to be
// populated by the upstream authenticate middleware", but phases.registry mounts
// this via `safeMount` (bare app.use, NO injected auth) → the
// `/api/(v1/)?dashboard-alerts` alias accepted anonymous ack/snooze/mute writes.
// The app.js mount already injects authenticate; this gates EVERY mount.
const { authenticate } = require('../middleware/auth');

function asyncWrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function pickUserId(req) {
  const u = req.user || {};
  return u.id || u._id || u.userId || null;
}

function getCoordinator(req) {
  const coord = req.app && req.app._alertCoordinator;
  if (!coord || typeof coord.listActive !== 'function') return null;
  return coord;
}

function buildRouter() {
  const router = express.Router();
  router.use(authenticate); // W1191 — gate EVERY mount (incl. the auth-less safeMount alias)

  router.get(
    '/',
    asyncWrap(async (req, res) => {
      const coord = getCoordinator(req);
      if (!coord) {
        return res.status(503).json({ ok: false, error: 'alert_coordinator_not_ready' });
      }
      const includeSuppressed =
        String(req.query['includeSuppressed'] || '').toLowerCase() === 'true';
      const alerts = coord.listActive({ includeSuppressed });
      res.json({ ok: true, alerts, count: alerts.length });
    })
  );

  // Phase 18 Commit 8.2 — scheduler observability.
  router.get(
    '/scheduler/status',
    asyncWrap(async (req, res) => {
      const sched = req.app && req.app._alertScheduler;
      if (!sched || typeof sched.status !== 'function') {
        return res.status(503).json({ ok: false, error: 'alert_scheduler_not_ready' });
      }
      res.json({ ok: true, scheduler: sched.status() });
    })
  );

  router.get(
    '/policies',
    asyncWrap(async (_req, res) => {
      res.json({
        ok: true,
        policies: POLICIES,
        ladders: ESCALATION_LADDERS,
      });
    })
  );

  router.post(
    '/:key/ack',
    asyncWrap(async (req, res) => {
      const coord = getCoordinator(req);
      if (!coord) {
        return res.status(503).json({ ok: false, error: 'alert_coordinator_not_ready' });
      }
      const userId = pickUserId(req);
      const key = decodeURIComponent(req.params.key);
      const entry = coord.ack(key, { userId });
      if (!entry) return res.status(404).json({ ok: false, error: 'unknown_alert' });
      res.json({ ok: true, alert: entry });
    })
  );

  router.post(
    '/:key/snooze',
    asyncWrap(async (req, res) => {
      const coord = getCoordinator(req);
      if (!coord) {
        return res.status(503).json({ ok: false, error: 'alert_coordinator_not_ready' });
      }
      const minutes = Number(req.body && req.body.minutes) || 60;
      const key = decodeURIComponent(req.params.key);
      const entry = coord.snooze(key, { minutes });
      if (!entry) return res.status(404).json({ ok: false, error: 'unknown_alert' });
      res.json({ ok: true, alert: entry });
    })
  );

  router.post(
    '/:key/mute',
    asyncWrap(async (req, res) => {
      const coord = getCoordinator(req);
      if (!coord) {
        return res.status(503).json({ ok: false, error: 'alert_coordinator_not_ready' });
      }
      const hours = Number(req.body && req.body.hours) || 24;
      const reason = (req.body && req.body.reason) || null;
      const key = decodeURIComponent(req.params.key);
      const entry = coord.mute(key, { hours, reason });
      if (!entry) return res.status(404).json({ ok: false, error: 'unknown_alert' });
      res.json({ ok: true, alert: entry });
    })
  );

  return router;
}

module.exports = buildRouter();
module.exports.buildRouter = buildRouter;

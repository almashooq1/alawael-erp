'use strict';

/**
 * realtime.routes.js — Wave 427 (Phase A1 — Real-Time Backbone).
 *
 * SSE Gateway HTTP surface backed by the W135 in-process broker
 * (intelligence/realtime-event-broker.service.js). The broker was
 * built complete in W135 then sat orphaned (0 callers in production)
 * — same anti-pattern as W225 wallet. This wave wires it.
 *
 * Routes:
 *   GET /api/realtime/stream
 *     Long-lived SSE connection. Query params:
 *       topic=<dotted.name>       filter to one topic (optional)
 *       branchId=<id>             filter to one branch (optional;
 *                                 clamped to caller's branch scope)
 *       severity=<level>          filter to one severity (optional)
 *     Auth required. Per-event ACL via role-topic allowlist
 *     (intelligence/realtime-topic-acl.registry.js). Cross-tenant
 *     events are dropped at the broker callback layer.
 *
 *   GET /api/realtime/stats
 *     Diagnostic. Returns broker stats (active subs, total queued,
 *     total dropped). Cross-branch role required (admin / DPO).
 *
 *   GET /api/realtime/topics
 *     Returns the caller's allowed topic-prefix list. Useful for
 *     the frontend useRealtime() hook to render a topic picker
 *     without leaking the full ACL.
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchId } = require('../middleware/branchScope.middleware');
const { isTopicAllowed, allowedTopicsFor } = require('../intelligence/realtime-topic-acl.registry');
const { resolveRole, CROSS_BRANCH_ROLES } = require('../config/constants/roles.constants');

/**
 * @param {object} deps
 * @param {object} deps.broker    realtime broker singleton
 * @param {object} [deps.logger]  optional logger (default console)
 * @returns {express.Router}
 */
function createRealtimeRouter({ broker, logger = console } = {}) {
  if (!broker || typeof broker.toSseHandler !== 'function') {
    throw new Error('createRealtimeRouter: broker (with toSseHandler) required');
  }

  const router = express.Router();

  // ── GET /api/realtime/topics ──────────────────────────────────────
  router.get('/topics', authenticate, requireBranchAccess, (req, res) => {
    const role = resolveRole(req.user.role || req.user.roles?.[0]);
    const topics = allowedTopicsFor(role);
    return res.json({
      success: true,
      role,
      topics,
      branchScope: {
        restricted: !!req.branchScope?.restricted,
        branchId: branchId(req),
      },
    });
  });

  // ── GET /api/realtime/stats ───────────────────────────────────────
  // Cross-branch role only. Includes broker counters + the caller's
  // own role/topics so ops dashboards can render a unified view.
  router.get('/stats', authenticate, requireBranchAccess, (req, res) => {
    const role = resolveRole(req.user.role || req.user.roles?.[0]);
    if (!CROSS_BRANCH_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح — يتطلب صلاحية عبر-الفروع',
      });
    }
    return res.json({
      success: true,
      stats: broker.stats(),
    });
  });

  // ── GET /api/realtime/stream ──────────────────────────────────────
  // The actual SSE handler. We compose three guards:
  //   1. authenticate (req.user populated)
  //   2. requireBranchAccess (req.branchScope populated)
  //   3. per-event ACL inside broker subscribe() via authorize +
  //      onEvent topic check
  router.get('/stream', authenticate, requireBranchAccess, (req, res) => {
    const role = resolveRole(req.user.role || req.user.roles?.[0]);
    const allowed = allowedTopicsFor(role);
    if (!allowed.length) {
      // Default-deny: a role with no allowlist gets a 403 INSTEAD
      // of an opened-but-silent SSE stream. Clients distinguish
      // "no permission" from "no events yet" via HTTP status.
      res.statusCode = 403;
      return res.end('forbidden: role has no realtime topics');
    }

    const callerBranchId = branchId(req); // null if cross-branch
    const requestedTopic = req.query?.topic;
    const requestedBranchId = req.query?.branchId;
    const requestedSeverity = req.query?.severity;

    // Clamp branch filter to caller's scope. A restricted caller asking
    // for branchId=OTHER is silently downgraded to their own branch
    // (vs 403) — keeps the same connection alive for valid topics.
    let effectiveBranchFilter;
    if (callerBranchId) {
      effectiveBranchFilter = String(callerBranchId);
    } else if (requestedBranchId) {
      // Cross-branch caller may scope to one branch via query
      effectiveBranchFilter = String(requestedBranchId);
    } else {
      effectiveBranchFilter = null; // all branches
    }

    // If client asked for a specific topic, fast-reject if disallowed.
    if (requestedTopic && !isTopicAllowed(role, requestedTopic)) {
      res.statusCode = 403;
      return res.end(`forbidden: topic ${requestedTopic} not in role allowlist`);
    }

    // ── SSE handshake ───────────────────────────────────────────────
    res.statusCode = 200;
    if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // nginx
    }
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    res.write(': stream-opened\n\n');

    // Build broker filter — broker's own match logic handles topic +
    // branchId + severity. We layer the per-event ACL on top to enforce
    // role-level topic restrictions even when client didn't pass topic=.
    const filter = {
      topic: requestedTopic || undefined,
      branchId: effectiveBranchFilter || undefined,
      severity: requestedSeverity || undefined,
    };

    const { subscription } = broker.subscribe({
      filter,
      onEvent: event => {
        // Defense-in-depth: re-check ACL on every delivery. The broker's
        // filter narrows by topic STRING but doesn't know about roles.
        // Synthetic __overflow events bypass ACL — clients need them.
        if (event.topic !== '__overflow' && !isTopicAllowed(role, event.topic)) {
          return; // drop silently — never reaches the wire
        }
        try {
          const lines = [];
          if (event.eventId) lines.push(`id: ${event.eventId}`);
          if (event.topic) lines.push(`event: ${event.topic}`);
          const data = JSON.stringify({
            payload: event.payload,
            meta: event.meta,
            at: event.at,
          });
          for (const line of data.split('\n')) lines.push(`data: ${line}`);
          res.write(lines.join('\n') + '\n\n');
        } catch (err) {
          logger.warn(`[realtime] sse write failed: ${err.message}`);
        }
      },
      onClose: () => {
        try {
          res.end();
        } catch (_e) {
          void _e;
        }
      },
    });

    // Heartbeat every 25s (under typical nginx/proxy 30s idle timeout).
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
      } catch (err) {
        logger.warn(`[realtime] heartbeat failed: ${err.message}`);
      }
    }, 25000);

    const cleanup = () => {
      clearInterval(heartbeat);
      broker.unsubscribe(subscription);
    };
    if (req && typeof req.on === 'function') {
      req.on('close', cleanup);
      req.on('error', cleanup);
    }
  });

  return router;
}

module.exports = { createRealtimeRouter };

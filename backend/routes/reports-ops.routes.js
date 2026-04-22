/**
 * reports-ops.routes.js — observability endpoint for the Reporting
 * Platform.
 *
 * Phase 10 Commit 17.
 *
 * Provides a single `GET /status` that aggregates everything an ops
 * team needs to know without shelling into the container:
 *
 *   - Delivery stats for the last 24h: total, success rate, failure
 *     rate, by-channel, by-status.
 *   - Escalation + retry counts.
 *   - Approval queue depth.
 *   - Scheduler state — which cron jobs are registered, whether
 *     they're running, last-tick timestamps.
 *   - Catalog summary — counts by periodicity / audience /
 *     confidentiality.
 *   - Rate-limiter current caps + default limits.
 *
 * Mount pattern:
 *
 *   app.use(
 *     '/api/v1/reports/ops',
 *     authenticateToken,
 *     enforce({ action: 'read', resourceType: 'ReportingPlatform' }),
 *     buildRouter({ platform, DeliveryModel, ApprovalModel, catalog }),
 *   );
 *
 * All aggregations run server-side; the endpoint is cheap (one count
 * query per channel + one per status). Safe to hit every 15 seconds
 * from a monitoring dashboard.
 */

'use strict';

const express = require('express');

function asyncWrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function countBy(Model, filter) {
  if (!Model || typeof Model.countDocuments !== 'function') return null;
  try {
    return await Model.countDocuments(filter);
  } catch (_) {
    return null;
  }
}

async function aggregateDeliveries(DeliveryModel, sinceIso) {
  const Model = DeliveryModel && (DeliveryModel.model || DeliveryModel);
  if (!Model) return null;
  const since = new Date(sinceIso);
  const baseFilter = { createdAt: { $gte: since } };

  const [total, sent, delivered, read, failed, escalated, retrying, cancelled] = await Promise.all([
    countBy(Model, baseFilter),
    countBy(Model, { ...baseFilter, status: 'SENT' }),
    countBy(Model, { ...baseFilter, status: 'DELIVERED' }),
    countBy(Model, { ...baseFilter, status: 'READ' }),
    countBy(Model, { ...baseFilter, status: 'FAILED' }),
    countBy(Model, { ...baseFilter, status: 'ESCALATED' }),
    countBy(Model, { ...baseFilter, status: 'RETRYING' }),
    countBy(Model, { ...baseFilter, status: 'CANCELLED' }),
  ]);

  const byChannel = {};
  for (const channel of ['email', 'sms', 'whatsapp', 'in_app', 'portal_inbox', 'pdf_download']) {
    const n = await countBy(Model, { ...baseFilter, channel });
    if (n != null) byChannel[channel] = n;
  }

  // Success = delivered + read (landed somewhere useful). Failure =
  // failed + escalated (gave up). Everything else is in-flight.
  const settled = (delivered || 0) + (read || 0) + (failed || 0) + (escalated || 0);
  const successful = (delivered || 0) + (read || 0);
  const successRate = settled > 0 ? successful / settled : null;
  const failureRate = settled > 0 ? ((failed || 0) + (escalated || 0)) / settled : null;

  return {
    windowStart: sinceIso,
    windowEnd: new Date().toISOString(),
    total: total || 0,
    byStatus: {
      SENT: sent || 0,
      DELIVERED: delivered || 0,
      READ: read || 0,
      FAILED: failed || 0,
      ESCALATED: escalated || 0,
      RETRYING: retrying || 0,
      CANCELLED: cancelled || 0,
    },
    byChannel,
    successRate,
    failureRate,
  };
}

async function aggregateApprovals(ApprovalModel) {
  const Model = ApprovalModel && (ApprovalModel.model || ApprovalModel);
  if (!Model) return null;
  const [pending, approved, rejected, dispatched, expired] = await Promise.all([
    countBy(Model, { state: 'PENDING' }),
    countBy(Model, { state: 'APPROVED' }),
    countBy(Model, { state: 'REJECTED' }),
    countBy(Model, { state: 'DISPATCHED' }),
    countBy(Model, { state: 'EXPIRED' }),
  ]);
  return {
    PENDING: pending || 0,
    APPROVED: approved || 0,
    REJECTED: rejected || 0,
    DISPATCHED: dispatched || 0,
    EXPIRED: expired || 0,
  };
}

function schedulerSnapshot(scheduler) {
  if (!scheduler || !scheduler._jobs) return null;
  const jobs = [];
  for (const [name] of scheduler._jobs) jobs.push(name);
  return {
    running: typeof scheduler.isRunning === 'function' ? scheduler.isRunning() : jobs.length > 0,
    jobCount: scheduler._jobs.size,
    jobs,
  };
}

function catalogSnapshot(catalog) {
  if (!catalog || typeof catalog.classify !== 'function') return null;
  return catalog.classify();
}

function rateLimiterSnapshot(rateLimiter) {
  if (!rateLimiter) return null;
  return {
    limits: rateLimiter.limits || null,
  };
}

function buildRouter({ platform, DeliveryModel, ApprovalModel, catalog, logger = console } = {}) {
  const router = express.Router();

  router.get(
    '/status',
    asyncWrap(async (req, res) => {
      const raw = parseInt(req.query.windowHours, 10);
      const requested = Number.isFinite(raw) ? raw : 24;
      const windowHours = Math.min(168, Math.max(1, requested));
      const sinceIso = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

      const delivery = await aggregateDeliveries(DeliveryModel, sinceIso);
      const approvals = await aggregateApprovals(ApprovalModel);

      res.json({
        windowHours,
        platformVersion: '4.0.16',
        delivery,
        approvals,
        scheduler: platform && platform.scheduler ? schedulerSnapshot(platform.scheduler) : null,
        opsScheduler:
          platform && platform.opsScheduler ? schedulerSnapshot(platform.opsScheduler) : null,
        catalog: catalogSnapshot(catalog),
        rateLimiter: rateLimiterSnapshot(platform && platform.rateLimiter),
        engine:
          platform && platform.engine
            ? {
                valueResolverWired: typeof platform.engine.valueResolver === 'function',
              }
            : null,
      });
    })
  );

  // Health — cheaper; just checks scheduler + engine wiring are present.
  router.get('/health', (req, res) => {
    const ok = !!(platform && platform.engine && platform.scheduler && platform.opsScheduler);
    res.status(ok ? 200 : 503).json({
      ok,
      schedulerRunning: !!(
        platform &&
        platform.scheduler &&
        platform.scheduler.isRunning &&
        platform.scheduler.isRunning()
      ),
      opsSchedulerRunning: !!(
        platform &&
        platform.opsScheduler &&
        platform.opsScheduler.isRunning &&
        platform.opsScheduler.isRunning()
      ),
      valueResolverWired: !!(
        platform &&
        platform.engine &&
        typeof platform.engine.valueResolver === 'function'
      ),
    });
  });

  // Catalog listing — all 30 report types with metadata. Useful for
  // the ops dashboard's "what gets dispatched when" view.
  router.get('/catalog', (req, res) => {
    if (!catalog) return res.status(503).json({ error: 'catalog not wired' });
    const items = (catalog.REPORTS || []).map(r => ({
      id: r.id,
      nameEn: r.nameEn,
      nameAr: r.nameAr,
      category: r.category,
      periodicity: r.periodicity,
      audiences: r.audiences,
      channels: r.channels,
      confidentiality: r.confidentiality,
      approvalRequired: !!r.approvalRequired,
      enabled: r.enabled !== false,
    }));
    res.json({ count: items.length, items });
  });

  return router;
}

module.exports = {
  buildRouter,
  // Exposed for tests:
  aggregateDeliveries,
  aggregateApprovals,
  schedulerSnapshot,
  catalogSnapshot,
  rateLimiterSnapshot,
};

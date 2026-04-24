/**
 * dashboards-platform.routes.js — HTTP surface for the unified
 * 4-level dashboard platform.
 *
 * Phase 18 Commit 1.
 *
 * Endpoints (all mounted under /api/v1/dashboards):
 *
 *   GET /catalog
 *     → list the dashboards the caller's role can access (+ their
 *       level, title, refresh cadence, audience). Zero data fetched.
 *
 *   GET /widgets
 *     → returns the full widget catalog. Used by the frontend on
 *       first boot to hydrate its widget library.
 *
 *   GET /kpis
 *     → returns the full KPI registry (filtered to the role-visible
 *       KPIs across every dashboard the role can access).
 *
 *   GET /:id
 *     → builds the complete dashboard payload for a given id,
 *       including hero KPI values, widget references, and the
 *       AI-assisted narrative. Accepts `?branch=` / `?dateRange=`
 *       / etc. as query-string filters.
 *
 *   GET /:id/narrative
 *     → returns only the narrative block — useful for re-generating
 *       the summary without repaying the KPI resolver cost.
 *
 * Authentication is enforced by the caller (`authenticate` is
 * mounted upstream in app.js). This module does role checks itself
 * so a 403 is returned whenever a role tries to read a dashboard
 * outside its audience.
 *
 * The `kpiResolver` is injected by the mount helper — in tests, a
 * deterministic fake is supplied; in production, the real resolver
 * comes from the reporting-platform / KPI aggregator.
 */

'use strict';

const express = require('express');

const dashboardRegistry = require('../config/dashboard.registry');
const kpiRegistry = require('../config/kpi.registry');
const widgetCatalog = require('../config/widget.catalog');
const aggregator = require('../services/dashboardAggregator.service');
const narrative = require('../services/dashboardNarrative.service');

function asyncWrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function pickRole(req) {
  const u = req.user || {};
  return u.primaryRole || u.role || (Array.isArray(u.roles) && u.roles[0]) || null;
}

function parseFilters(query) {
  const out = {};
  for (const key of dashboardRegistry.FILTER_KEYS) {
    if (query[key] !== undefined) out[key] = query[key];
  }
  return out;
}

/**
 * Default resolver — returns null values with a clear `source` hint.
 * This lets the API stay live (returning full shape + narrative +
 * widgets) even before the real KPI plumbing is attached in a later
 * commit. Dashboards render with "no data yet" placeholders rather
 * than erroring out.
 */
function defaultKpiResolver() {
  return Promise.resolve({
    value: null,
    delta: null,
    sparkline: [],
    asOf: null,
    source: 'pending-resolver',
  });
}

/**
 * buildRouter(options) — factory. Accepts `{ kpiResolver }` for
 * dependency injection. All routes are async; errors bubble to the
 * express error handler via `next(err)`.
 */
function buildRouter({ kpiResolver, narrativeService } = {}) {
  const router = express.Router();
  const resolver = typeof kpiResolver === 'function' ? kpiResolver : defaultKpiResolver;

  router.get(
    '/catalog',
    asyncWrap(async (req, res) => {
      const role = pickRole(req);
      const dashboards = aggregator.listForRole(role);
      res.json({
        ok: true,
        role,
        dashboards,
        levels: dashboardRegistry.DASHBOARD_LEVELS,
        filterKeys: dashboardRegistry.FILTER_KEYS,
      });
    })
  );

  router.get(
    '/widgets',
    asyncWrap(async (req, res) => {
      res.json({
        ok: true,
        widgets: widgetCatalog.WIDGETS,
        dataShapes: widgetCatalog.DATA_SHAPES,
      });
    })
  );

  router.get(
    '/kpis',
    asyncWrap(async (req, res) => {
      const role = pickRole(req);
      const visibleDashboards = aggregator.listForRole(role);
      const idSet = new Set();
      for (const d of visibleDashboards) {
        const full = dashboardRegistry.byId(d.id);
        if (full) for (const id of full.heroKpiIds) idSet.add(id);
      }
      const kpis = Array.from(idSet)
        .map(id => kpiRegistry.byId(id))
        .filter(Boolean);
      res.json({ ok: true, role, kpis });
    })
  );

  router.get(
    '/:id',
    asyncWrap(async (req, res) => {
      const role = pickRole(req);
      try {
        const payload = await aggregator.build({
          dashboardId: req.params.id,
          role,
          filters: parseFilters(req.query),
          kpiResolver: resolver,
          narrativeService,
        });
        res.json({ ok: true, ...payload });
      } catch (err) {
        if (err.code === 'DASHBOARD_NOT_FOUND') {
          return res.status(404).json({ ok: false, error: 'dashboard_not_found' });
        }
        if (err.code === 'DASHBOARD_FORBIDDEN') {
          return res.status(403).json({ ok: false, error: 'dashboard_forbidden' });
        }
        throw err;
      }
    })
  );

  router.get(
    '/:id/narrative',
    asyncWrap(async (req, res) => {
      const role = pickRole(req);
      try {
        const payload = await aggregator.build({
          dashboardId: req.params.id,
          role,
          filters: parseFilters(req.query),
          kpiResolver: resolver,
          narrativeService,
        });
        res.json({ ok: true, narrative: payload.narrative, asOf: payload.asOf });
      } catch (err) {
        if (err.code === 'DASHBOARD_NOT_FOUND') {
          return res.status(404).json({ ok: false, error: 'dashboard_not_found' });
        }
        if (err.code === 'DASHBOARD_FORBIDDEN') {
          return res.status(403).json({ ok: false, error: 'dashboard_forbidden' });
        }
        throw err;
      }
    })
  );

  return router;
}

module.exports = { buildRouter, _defaults: { defaultKpiResolver } };

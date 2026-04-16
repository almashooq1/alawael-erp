/**
 * Executive Dashboard API — exposes KPIs computed from the definitions.
 *
 * Mount under `/api/dashboard` from the main route registry.
 *
 * The router accepts injected dependencies so it can be tested without
 * spinning up Mongo.
 */

'use strict';

const express = require('express');
const { definitions, byCategory, CATEGORIES } = require('./definitions');
const { KpiComputeEngine } = require('./compute');
const { buildComputers } = require('./computers');

/**
 * @param {{
 *   models?: object,                       // injected Mongoose models for KPI computers
 *   authorize?: (req, res, next) => void,  // optional ABAC/RBAC middleware
 * }} deps
 */
function buildRouter(deps = {}) {
  const router = express.Router();
  const engine = new KpiComputeEngine();
  const computers = buildComputers(deps.models || {});
  for (const [id, fn] of Object.entries(computers)) engine.register(id, fn);

  const guard = deps.authorize || ((_req, _res, next) => next());

  // List all KPI definitions + which have computers wired.
  router.get('/kpi-definitions', guard, (_req, res) => {
    const registered = new Set(Object.keys(computers));
    res.json(definitions.map(d => ({ ...d, hasComputer: registered.has(d.id) })));
  });

  // Compute one KPI. Accepts branchId + period (from/to) query params.
  router.get('/kpi/:id', guard, async (req, res, next) => {
    try {
      const { branchId, from, to } = req.query || {};
      const period = from && to ? { from: new Date(from), to: new Date(to) } : undefined;
      const result = await engine.compute(req.params.id, { branchId, period });
      if (result.error) return res.status(500).json({ id: result.id, error: result.error });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Compute all KPIs in one category (or all).
  router.get('/kpi', guard, async (req, res, next) => {
    try {
      const { category, branchId, from, to } = req.query || {};
      if (category && !Object.values(CATEGORIES).includes(category)) {
        return res.status(400).json({ error: 'invalid_category' });
      }
      const period = from && to ? { from: new Date(from), to: new Date(to) } : undefined;
      const selected = category ? byCategory(category) : definitions;
      const results = await Promise.all(
        selected
          .filter(d => engine.computers.has(d.id))
          .map(d => engine.compute(d.id, { branchId, period }))
      );
      res.json({ count: results.length, results });
    } catch (err) {
      next(err);
    }
  });

  // Snapshot for executive dashboard — returns one number per KPI
  // grouped by category. Intended for the CEO/COO landing page.
  router.get('/executive-snapshot', guard, async (req, res, next) => {
    try {
      const { branchId } = req.query || {};
      // Default period = current month
      const now = new Date();
      const period = {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
      const all = await Promise.all(
        definitions
          .filter(d => engine.computers.has(d.id))
          .map(d => engine.compute(d.id, { branchId, period }))
      );
      const grouped = {};
      for (const r of all) {
        const cat = r.definition.category;
        grouped[cat] = grouped[cat] || [];
        grouped[cat].push({
          id: r.id,
          nameAr: r.definition.nameAr,
          nameEn: r.definition.nameEn,
          unit: r.definition.unit,
          direction: r.definition.direction,
          value: r.value,
        });
      }
      res.json({ branchId: branchId || 'all', period, byCategory: grouped });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { buildRouter };

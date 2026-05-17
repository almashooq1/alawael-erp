'use strict';

/**
 * layout-policy.routes.js — Wave 24 (Cognitive Load Framework).
 *
 *   GET /                                — list registered dashboards
 *   GET /:dashboardKey                   — full layout
 *   GET /:dashboardKey/for-role/:groupKey?branchId=&userId=  — role-adjusted layout
 *   GET /:dashboardKey/validation        — scoring + budget report
 *   GET /validation                      — across all dashboards
 *   GET /autosave-profiles               — available auto-save profiles
 */

const express = require('express');
const safeError = require('../utils/safeError');

const REASON_TO_STATUS = Object.freeze({
  DASHBOARD_NOT_FOUND: 404,
  ROLE_NOT_ALLOWED_FOR_DASHBOARD: 403,
});

function respond(res, result) {
  if (result && result.ok) {
    return res.json({ success: true, data: result });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || 'LAYOUT_POLICY_REJECTED',
    reason: result?.reason,
  });
}

function ctxFromReq(req) {
  return {
    branchId: req.query?.branchId || req.user?.branchId || null,
    userId: req.query?.userId || req.user?.id || req.user?._id || null,
  };
}

function createLayoutPolicyRouter({ layoutPolicy, logger = console } = {}) {
  if (!layoutPolicy || typeof layoutPolicy.validateDashboard !== 'function') {
    throw new Error('layout-policy.routes: layoutPolicy service is required');
  }
  void logger;

  const router = express.Router();

  // GET / — list dashboards
  router.get('/', async (_req, res) => {
    try {
      const keys = layoutPolicy.listDashboardKeys();
      const out = keys.map(k => {
        const d = layoutPolicy.getDashboard(k);
        return {
          dashboardKey: k,
          titleAr: d.titleAr,
          titleEn: d.titleEn,
          density: d.density,
          targetRoleGroups: d.targetRoleGroups,
          sectionCount: d.sections.length,
        };
      });
      return res.json({ success: true, data: { dashboards: out, count: out.length } });
    } catch (err) {
      return safeError(res, err, 'layout.list');
    }
  });

  // GET /validation — full report across all dashboards
  // (defined BEFORE /:dashboardKey so 'validation' is not captured as a key)
  router.get('/validation', async (_req, res) => {
    try {
      const reports = layoutPolicy.validateAll();
      const failingCount = reports.filter(r => !r.ok).length;
      return res.json({
        success: true,
        data: { reports, count: reports.length, failingCount },
      });
    } catch (err) {
      return safeError(res, err, 'layout.validation.all');
    }
  });

  // GET /autosave-profiles — catalog
  router.get('/autosave-profiles', async (_req, res) => {
    try {
      const reg = require('../intelligence/layout-policy.registry');
      const profiles = Object.entries(reg.AUTOSAVE_PROFILES).map(([name, p]) => ({
        name,
        ...p,
      }));
      return res.json({ success: true, data: { profiles, count: profiles.length } });
    } catch (err) {
      return safeError(res, err, 'layout.autosaveProfiles');
    }
  });

  // GET /:dashboardKey/for-role/:groupKey — role-adjusted layout
  router.get('/:dashboardKey/for-role/:groupKey', async (req, res) => {
    try {
      const ctx = ctxFromReq(req);
      const result = layoutPolicy.getLayoutForRole(
        req.params.dashboardKey,
        req.params.groupKey,
        ctx
      );
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'layout.forRole');
    }
  });

  // GET /:dashboardKey/validation — scoring report
  router.get('/:dashboardKey/validation', async (req, res) => {
    try {
      const report = layoutPolicy.validateDashboard(req.params.dashboardKey);
      return respond(res, report);
    } catch (err) {
      return safeError(res, err, 'layout.validation.one');
    }
  });

  // GET /:dashboardKey — full layout
  router.get('/:dashboardKey', async (req, res) => {
    try {
      const dash = layoutPolicy.getDashboard(req.params.dashboardKey);
      if (!dash) return respond(res, { ok: false, reason: 'DASHBOARD_NOT_FOUND' });
      return res.json({
        success: true,
        data: { dashboardKey: req.params.dashboardKey, layout: dash },
      });
    } catch (err) {
      return safeError(res, err, 'layout.get');
    }
  });

  return router;
}

module.exports = { createLayoutPolicyRouter };

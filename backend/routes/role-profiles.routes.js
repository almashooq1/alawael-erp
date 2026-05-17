'use strict';

/**
 * role-profiles.routes.js — Wave 23 (Role-Based Decision Support).
 *
 *   GET /                                     — list all role groups
 *   GET /me                                   — current user's role group + profile
 *   GET /me/dashboard?branchId=...            — resolved dashboard bundle
 *   GET /:groupKey                            — one role group profile
 *   GET /by-role/:canonicalRole               — group + dashboard for a named canonical role
 *   GET /by-role/:canonicalRole/dashboard?... — resolved dashboard for that role
 *
 * Authentication is enforced upstream (router mounted behind
 * `authenticate` in app.js). `req.user` carries the canonical role.
 */

const express = require('express');
const safeError = require('../utils/safeError');

const REASON_TO_STATUS = Object.freeze({
  ROLE_NOT_MAPPED: 404,
  PROFILE_NOT_FOUND: 404,
  GROUP_NOT_FOUND: 404,
  CANONICAL_ROLE_REQUIRED: 400,
});

function respond(res, result) {
  if (result && result.ok) {
    return res.json({ success: true, data: result });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || 'ROLE_PROFILE_REJECTED',
    reason: result?.reason,
  });
}

function ctxFromReq(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
    branchId: req.query?.branchId || req.user?.branchId || null,
  };
}

function createRoleProfilesRouter({ roleProfiles, logger = console } = {}) {
  if (!roleProfiles || typeof roleProfiles.resolveDashboardForRole !== 'function') {
    throw new Error('role-profiles.routes: roleProfiles service is required');
  }
  void logger;

  const router = express.Router();

  // GET / — list all role groups (id + titles + key fields)
  router.get('/', async (_req, res) => {
    try {
      const groups = roleProfiles.listGroupKeys().map(key => {
        const p = roleProfiles.getProfile(key);
        return {
          groupKey: key,
          titleAr: p.titleAr,
          titleEn: p.titleEn,
          defaultLanding: p.defaultLanding,
          layoutDensity: p.layoutDensity,
          alertSurfaces: p.alertSurfaces,
          kpiCount: (p.kpiIds || []).length,
          quickActionCount: (p.quickActions || []).length,
        };
      });
      return res.json({ success: true, data: { groups, count: groups.length } });
    } catch (err) {
      return safeError(res, err, 'roleProfiles.list');
    }
  });

  // GET /me — current user's profile (role from req.user)
  router.get('/me', async (req, res) => {
    try {
      const canonicalRole = req.user?.role || req.user?.roleCode || null;
      if (!canonicalRole) return respond(res, { ok: false, reason: 'CANONICAL_ROLE_REQUIRED' });
      const groupKey = roleProfiles.resolveRoleGroup(canonicalRole);
      if (!groupKey) return respond(res, { ok: false, reason: 'ROLE_NOT_MAPPED' });
      const profile = roleProfiles.getProfile(groupKey);
      return res.json({ success: true, data: { canonicalRole, groupKey, profile } });
    } catch (err) {
      return safeError(res, err, 'roleProfiles.me');
    }
  });

  // GET /me/dashboard?branchId=... — resolved dashboard for current user
  router.get('/me/dashboard', async (req, res) => {
    try {
      const ctx = ctxFromReq(req);
      if (!ctx.role) return respond(res, { ok: false, reason: 'CANONICAL_ROLE_REQUIRED' });
      const result = roleProfiles.resolveDashboardForRole(ctx.role, ctx);
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'roleProfiles.meDashboard');
    }
  });

  // GET /by-role/:canonicalRole — group + profile by canonical role name
  // (defined BEFORE /:groupKey so "by-role" doesn't get captured)
  router.get('/by-role/:canonicalRole', async (req, res) => {
    try {
      const groupKey = roleProfiles.resolveRoleGroup(req.params.canonicalRole);
      if (!groupKey) return respond(res, { ok: false, reason: 'ROLE_NOT_MAPPED' });
      const profile = roleProfiles.getProfile(groupKey);
      return res.json({
        success: true,
        data: { canonicalRole: req.params.canonicalRole, groupKey, profile },
      });
    } catch (err) {
      return safeError(res, err, 'roleProfiles.byRole');
    }
  });

  // GET /by-role/:canonicalRole/dashboard?... — resolved dashboard
  router.get('/by-role/:canonicalRole/dashboard', async (req, res) => {
    try {
      const ctx = ctxFromReq(req);
      const result = roleProfiles.resolveDashboardForRole(req.params.canonicalRole, ctx);
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'roleProfiles.byRoleDashboard');
    }
  });

  // GET /:groupKey — full role group profile
  router.get('/:groupKey', async (req, res) => {
    try {
      const p = roleProfiles.getProfile(req.params.groupKey);
      if (!p) return respond(res, { ok: false, reason: 'GROUP_NOT_FOUND' });
      return res.json({ success: true, data: { groupKey: req.params.groupKey, profile: p } });
    } catch (err) {
      return safeError(res, err, 'roleProfiles.get');
    }
  });

  return router;
}

module.exports = { createRoleProfilesRouter };

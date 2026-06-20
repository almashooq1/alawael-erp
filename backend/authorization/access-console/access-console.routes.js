'use strict';
/**
 * access-console.routes.js — W1420
 *
 * READ-ONLY IAM console surface for web-admin /admin/access-control. Serializes
 * the canonical authorization authority (permissions.registry.js + can.js +
 * role-archetype.map.json) so an administrator can finally SEE the policy that
 * the live PDP already enforces — what each role can do, the full role ×
 * permission matrix, and a "can this role do X, and why?" simulator.
 *
 * This adds NO new decision path: every allow/deny is computed through
 * backend/authorization/can.js (ADR-035 §4 / ADR-036). There are NO mutating
 * endpoints here — role↔permission grants are config (seed → generated registry),
 * not runtime-mutable, by deliberate design.
 *
 * Mounted in features.registry.js:
 *   dualMountAuth(app, 'access-control', buildRouter({ UserModel }))
 *   → /api/access-control + /api/v1/access-control  (authenticated)
 */

const express = require('express');
const mongoose = require('mongoose');
const lib = require('./access-console.lib');
const { requireRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { assertBranchMatch } = require('../../middleware/assertBranchMatch');

// Who may VIEW the policy console (read-only; no PHI, no secrets — just the
// access policy itself). Admin / HQ / governance roles.
const VIEW_ROLES = Object.freeze([
  'super_admin',
  'head_office_admin',
  'it_admin',
  'admin',
  'manager',
  'branch_manager',
  'regional_director',
  'ceo',
  'group_gm',
  'compliance_officer',
  'internal_auditor',
  'group_quality_officer',
  'dpo',
]);

// Inspecting a SPECIFIC user's effective access is narrower (touches a person's
// account) → HQ / cross-branch / governance only, plus per-branch enforcement.
const USER_INSPECT_ROLES = Object.freeze([
  'super_admin',
  'head_office_admin',
  'it_admin',
  'admin',
  'ceo',
  'group_gm',
  'compliance_officer',
  'internal_auditor',
  'dpo',
]);

const ok = (res, data) => res.json({ success: true, data });

/**
 * @param {{ UserModel?: import('mongoose').Model<any> }} [deps]
 */
function buildRouter(deps = {}) {
  const router = express.Router();

  const resolveUserModel = () => {
    if (deps.UserModel) return deps.UserModel;
    try {
      return mongoose.model('User');
    } catch {
      return null;
    }
  };

  // Whole console is admin/governance-gated (read-only).
  router.use(requireRole(...VIEW_ROLES));

  // ── Landing / counts ──────────────────────────────────────────────────
  router.get('/overview', (_req, res) => ok(res, lib.overview()));

  // ── Archetypes (the 9 permission families) ────────────────────────────
  router.get('/archetypes', (_req, res) => ok(res, { items: lib.listArchetypes() }));

  // ── Roles (the 46 live roles) ─────────────────────────────────────────
  router.get('/roles', (_req, res) => ok(res, { items: lib.listRoles() }));

  router.get('/roles/:role', (req, res) => {
    const detail = lib.roleDetail(req.params.role);
    if (!detail.mapped) {
      return res.status(404).json({ success: false, error: 'role_not_mapped', role: req.params.role });
    }
    return ok(res, detail);
  });

  // ── Permission catalog ────────────────────────────────────────────────
  router.get('/permissions', (_req, res) => ok(res, { items: lib.listPermissions() }));

  // Keys are colon-delimited (`beneficiary:clinical:read`) — colons stay within
  // one path segment, so `:key` captures the whole key.
  router.get('/permissions/:key', (req, res) => {
    const detail = lib.permissionDetail(req.params.key);
    if (!detail) {
      return res.status(404).json({ success: false, error: 'unknown_permission', key: req.params.key });
    }
    return ok(res, detail);
  });

  // ── Full archetype × permission matrix ────────────────────────────────
  router.get('/matrix', (_req, res) => ok(res, lib.buildMatrix()));

  // ── Access simulator (can this role do X, and why?) ───────────────────
  router.post('/simulate', (req, res) => {
    const { role, permission } = req.body || {};
    if (!role || !permission) {
      return res.status(400).json({ success: false, error: 'role_and_permission_required' });
    }
    return ok(res, lib.simulate(String(role), String(permission)));
  });

  // ── Effective access for a specific user (branch-scoped) ──────────────
  router.get(
    '/users/:id/effective',
    requireRole(...USER_INSPECT_ROLES),
    requireBranchAccess,
    async (req, res) => {
      const Model = resolveUserModel();
      if (!Model) return res.status(503).json({ success: false, error: 'user_model_unavailable' });
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'invalid_user_id' });
      }
      let user;
      try {
        user = await Model.findById(req.params.id)
          .select('name fullName email role roles branchId branch_id permissions customPermissions deniedPermissions')
          .lean();
      } catch (e) {
        return res.status(500).json({ success: false, error: 'user_lookup_failed', message: e.message });
      }
      if (!user) return res.status(404).json({ success: false, error: 'user_not_found' });

      // Branch isolation (W269 doctrine) — a restricted caller cannot inspect a
      // user outside their branch. assertBranchMatch is a no-op for cross-branch
      // roles; requireBranchAccess above populated req.branchScope.
      const userBranch = user.branchId || user.branch_id || null;
      if (userBranch) {
        try {
          assertBranchMatch(req, userBranch, 'user');
        } catch (e) {
          return res.status(e.statusCode || 403).json({ success: false, error: 'cross_branch_denied' });
        }
      }

      const role = user.role || (Array.isArray(user.roles) && user.roles[0]) || 'guest';
      const detail = lib.roleDetail(role);

      // Per-user overrides are surfaced for transparency ONLY — can.js resolves
      // capability at the role/archetype layer; these fields (if present on the
      // User doc) are informational, not re-evaluated here.
      const overrides = {
        custom: Array.isArray(user.customPermissions) ? user.customPermissions : [],
        denied: Array.isArray(user.deniedPermissions) ? user.deniedPermissions : [],
      };

      return ok(res, {
        user: {
          id: String(user._id || req.params.id),
          name: user.fullName || user.name || null,
          email: user.email || null,
          role,
          roles: Array.isArray(user.roles) ? user.roles : role ? [role] : [],
          branchId: userBranch ? String(userBranch) : null,
        },
        effective: detail,
        overrides,
      });
    }
  );

  return router;
}

module.exports = { buildRouter, VIEW_ROLES, USER_INSPECT_ROLES };

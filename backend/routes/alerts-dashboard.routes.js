'use strict';

/**
 * alerts-dashboard.routes.js — Wave 15.
 *
 * Role-aware GET endpoints — one per dashboard surface. Each
 * endpoint:
 *
 *   1. Resolves the right filter via `filters.service.js`
 *   2. Runs the query against AlertModel (with the role-tailored
 *      projection)
 *   3. Pipes the results through `pii-masking.service.js` so the
 *      viewer's role determines which fields they see
 *   4. Returns a uniform envelope: { success, count, items, meta }
 *
 * Why a single router instead of one per dashboard: the variation
 * lives entirely in the filter builder + the role gate. The
 * request/response shape is identical, so consolidating cuts ~5
 * route files down to one tested unit.
 *
 * Role gates per surface (in addition to `authenticate` upstream):
 *   /executive  → executive viewers (ceo, group_*, super_admin, head_office_admin)
 *   /branch     → any role with a branch
 *   /clinical   → clinical roles (doctor, therapist, nurse, clinical_director, supervisor, +mgr)
 *   /hr         → hr roles (+ branch_manager + super_admin)
 *   /finance    → finance roles
 *   /quality    → quality roles
 *   /dpo        → dpo only (PDPL Art.30)
 *   /me         → any authenticated user
 *
 * The role gates here are intentionally restrictive — if a viewer
 * is allowed at the API level but their filter would return nothing
 * (e.g. a therapist trying /executive), we return 403 rather than
 * an empty list, so the UX failure mode is explicit instead of
 * silent.
 */

const express = require('express');
const safeError = require('../utils/safeError');
const filters = require('../alerts/filters.service');
const { maskAlertsForViewer } = require('../alerts/pii-masking.service');

const EXECUTIVE_ROLES = new Set([
  'super_admin',
  'head_office_admin',
  'ceo',
  'group_gm',
  'group_cfo',
  'group_chro',
  'group_quality_officer',
]);

const CLINICAL_ROLES = new Set([
  'doctor',
  'therapist',
  'therapist_pt',
  'therapist_ot',
  'therapist_slp',
  'therapist_psych',
  'teacher',
  'special_ed_teacher',
  'nurse',
  'nursing_supervisor',
  'head_nurse',
  'clinical_director',
  'therapy_supervisor',
  'supervisor',
  'admin',
  'manager',
  'branch_manager',
  'head_office_admin',
  'super_admin',
]);

const HR_ROLES = new Set([
  'hr',
  'hr_manager',
  'hr_supervisor',
  'admin',
  'manager',
  'branch_manager',
  'head_office_admin',
  'group_chro',
  'super_admin',
]);

const FINANCE_ROLES = new Set([
  'accountant',
  'finance',
  'finance_supervisor',
  'admin',
  'manager',
  'branch_manager',
  'head_office_admin',
  'group_cfo',
  'super_admin',
]);

const QUALITY_ROLES = new Set([
  'quality_coordinator',
  'group_quality_officer',
  'compliance_officer',
  'internal_auditor',
  'admin',
  'manager',
  'branch_manager',
  'super_admin',
]);

const DPO_ROLES = new Set(['dpo', 'super_admin']);

function gate(allowedSet, surfaceLabel) {
  return (req, res, next) => {
    const role = req.user?.role || req.user?.roleCode || '';
    if (!allowedSet.has(role)) {
      return res.status(403).json({
        success: false,
        message: `dashboard ${surfaceLabel} requires a different role`,
        surface: surfaceLabel,
      });
    }
    return next();
  };
}

function runWith(filterFn, surfaceLabel) {
  return async (req, res) => {
    try {
      const Model = require('../alerts/alert.model').model;
      const { filter, projection, sort } = filterFn(req.user || {});
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const skip = Math.max(0, Number(req.query.skip) || 0);

      const rows = await Model.find(filter, projection)
        .sort(sort || { lastSeenAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const masked = maskAlertsForViewer(rows, req.user || {});
      return res.json({
        success: true,
        count: masked.length,
        items: masked,
        meta: {
          surface: surfaceLabel,
          limit,
          skip,
          // Echo the role used for masking so the UI can show the
          // "viewing as" chip and the user can spot wrong-account
          // mistakes.
          viewerRole: req.user?.role || null,
        },
      });
    } catch (err) {
      return safeError(res, err, `alerts.dashboard.${surfaceLabel}`);
    }
  };
}

function createAlertsDashboardRouter() {
  const router = express.Router();

  router.get(
    '/executive',
    gate(EXECUTIVE_ROLES, 'executive'),
    runWith(filters.executiveAlertFilter, 'executive')
  );

  // /branch — anyone with a session can see their branch (route is
  // mounted behind `authenticate`). Branch scope handles tenant
  // isolation.
  router.get('/branch', runWith(filters.branchAlertFilter, 'branch'));

  router.get(
    '/clinical',
    gate(CLINICAL_ROLES, 'clinical'),
    runWith(filters.clinicalAlertFilter, 'clinical')
  );
  router.get('/hr', gate(HR_ROLES, 'hr'), runWith(filters.hrAlertFilter, 'hr'));
  router.get(
    '/finance',
    gate(FINANCE_ROLES, 'finance'),
    runWith(filters.financeAlertFilter, 'finance')
  );
  router.get(
    '/quality',
    gate(QUALITY_ROLES, 'quality'),
    runWith(filters.qualityAlertFilter, 'quality')
  );
  router.get('/dpo', gate(DPO_ROLES, 'dpo'), runWith(filters.dpoAlertFilter, 'dpo'));

  // /me — anyone authenticated; the filter handles the missing-id case.
  router.get('/me', runWith(filters.assignedToMeFilter, 'me'));

  return router;
}

module.exports = {
  createAlertsDashboardRouter,
  // Exposed for tests + potential reuse by the Wave-4 briefing service.
  ROLE_GATES: {
    EXECUTIVE_ROLES,
    CLINICAL_ROLES,
    HR_ROLES,
    FINANCE_ROLES,
    QUALITY_ROLES,
    DPO_ROLES,
  },
};

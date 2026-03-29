/**
 * Branch Routes - مسارات الفروع
 * 25 Endpoints with full RBAC enforcement
 *
 * Base: /api/branches
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/branch.controller');
const {
  requireBranchPermission,
  requireHQAccess,
  requireSuperAdmin,
} = require('../middleware/branchAuth.middleware');

// Auth middleware (use existing JWT middleware)
const auth = require('../middleware/auth');

// ─── Public ───────────────────────────────────────────────────────────────────
// [25] Permission Matrix (authenticated, any role)
router.get('/permissions/matrix', auth, ctrl.getPermissionMatrix);

// ─── HQ Executive Routes ─────────────────────────────────────────────────────
// [6]  HQ Dashboard
router.get('/hq/dashboard', auth, requireHQAccess, ctrl.getHQDashboard);
// [7]  Cross-branch comparison
router.get('/hq/comparison', auth, requireHQAccess, ctrl.getBranchComparison);
// [8]  System-wide alerts
router.get('/hq/alerts', auth, requireHQAccess, ctrl.getSystemAlerts);
// [9]  Consolidated financials
router.get('/hq/financials', auth, requireHQAccess, ctrl.getConsolidatedFinancials);
// [20] Staff optimizer
router.get('/hq/staff-optimizer', auth, requireHQAccess, ctrl.getStaffOptimizer);
// [21] Emergency controls (GET - list)
router.get('/hq/emergency-override', auth, requireHQAccess, ctrl.getEmergencyControls);
// [22] Emergency override (POST - execute)
router.post('/hq/emergency-override', auth, requireHQAccess, ctrl.executeEmergencyAction);
// [24] HQ audit log
router.get('/hq/audit-log', auth, requireHQAccess, ctrl.getHQAuditLog);

// ─── HQ Analytics & Intelligence ─────────────────────────────────────────────
// [26] HQ network analytics
router.get('/hq/analytics', auth, requireHQAccess, ctrl.getHQAnalytics);
// [27] Branch rankings
router.get('/hq/rankings', auth, requireHQAccess, ctrl.getBranchRankings);
// [28] HQ forecast
router.get('/hq/forecast', auth, requireHQAccess, ctrl.getHQForecast);
// [29] Network daily digest
router.get('/hq/network-digest', auth, requireHQAccess, ctrl.getNetworkDigest);

// ─── Branch CRUD (HQ only for create/delete) ─────────────────────────────────
// [1]  List branches
router.get('/', auth, ctrl.listBranches);
// [3]  Create branch
router.post('/', auth, requireHQAccess, ctrl.createBranch);
// [2]  Get single branch
router.get('/:branch_code', auth, ctrl.getBranch);
// [4]  Update branch
router.put('/:branch_code', auth, requireBranchPermission('settings', 'write'), ctrl.updateBranch);
// [5]  Deactivate branch (Super Admin only)
router.delete('/:branch_code', auth, requireSuperAdmin, ctrl.deleteBranch);

// ─── Branch Dashboard & KPIs ─────────────────────────────────────────────────
// [10] Branch dashboard
router.get(
  '/:branch_code/dashboard',
  auth,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchDashboard
);
// [18] Branch KPIs vs HQ
router.get(
  '/:branch_code/kpis',
  auth,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchKPIs
);

// ─── Patients ─────────────────────────────────────────────────────────────────
// [11] List patients
router.get(
  '/:branch_code/patients',
  auth,
  requireBranchPermission('patients', 'read'),
  ctrl.getBranchPatients
);

// ─── Schedule ─────────────────────────────────────────────────────────────────
// [12] Get schedule
router.get(
  '/:branch_code/schedule',
  auth,
  requireBranchPermission('schedule', 'read'),
  ctrl.getBranchSchedule
);
// [13] Create schedule entry
router.post(
  '/:branch_code/schedule',
  auth,
  requireBranchPermission('schedule', 'write'),
  ctrl.createScheduleEntry
);

// ─── Staff ─────────────────────────────────────────────────────────────────────
// [14] Staff list
router.get(
  '/:branch_code/staff',
  auth,
  requireBranchPermission('staff', 'read'),
  ctrl.getBranchStaff
);

// ─── Finance ──────────────────────────────────────────────────────────────────
// [15] Finance data
router.get(
  '/:branch_code/finance',
  auth,
  requireBranchPermission('finance', 'read'),
  ctrl.getBranchFinance
);

// ─── Transport ────────────────────────────────────────────────────────────────
// [16] Transport routes
router.get(
  '/:branch_code/transport',
  auth,
  requireBranchPermission('transport', 'read'),
  ctrl.getBranchTransport
);

// ─── Reports ──────────────────────────────────────────────────────────────────
// [17] Available reports
router.get(
  '/:branch_code/reports',
  auth,
  requireBranchPermission('reports', 'read'),
  ctrl.getBranchReports
);

// ─── Settings ─────────────────────────────────────────────────────────────────
// [19] Update settings
router.put(
  '/:branch_code/settings',
  auth,
  requireBranchPermission('settings', 'write'),
  ctrl.updateBranchSettings
);

// ─── Audit Log ────────────────────────────────────────────────────────────────
// [23] Branch audit log
router.get(
  '/:branch_code/audit-log',
  auth,
  requireBranchPermission('audit', 'read'),
  ctrl.getBranchAuditLog
);

// ─── Branch Analytics & Intelligence ─────────────────────────────────────────
// [30] Branch analytics
router.get(
  '/:branch_code/analytics',
  auth,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchAnalytics
);
// [31] Branch trends
router.get(
  '/:branch_code/trends',
  auth,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchTrends
);
// [32] Branch forecast
router.get(
  '/:branch_code/forecast',
  auth,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchForecast
);
// [33] Branch AI recommendations
router.get(
  '/:branch_code/recommendations',
  auth,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchRecommendations
);
// [34] Get branch targets
router.get(
  '/:branch_code/targets',
  auth,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchTargets
);
// [35] Set branch targets
router.post(
  '/:branch_code/targets',
  auth,
  requireBranchPermission('branches', 'write'),
  ctrl.setBranchTargets
);
// [36] Trigger daily snapshot (HQ or branch manager)
router.post(
  '/:branch_code/snapshot',
  auth,
  requireBranchPermission('branches', 'write'),
  ctrl.triggerSnapshot
);

module.exports = router;

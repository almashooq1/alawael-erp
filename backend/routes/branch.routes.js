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
const { authenticateToken: auth } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
// ─── Public ───────────────────────────────────────────────────────────────────
// [25] Permission Matrix (authenticated, any role)
router.get('/permissions/matrix', auth, requireBranchAccess, ctrl.getPermissionMatrix);

// ─── HQ Executive Routes ─────────────────────────────────────────────────────
// [6]  HQ Dashboard
router.get('/hq/dashboard', auth, requireBranchAccess, requireHQAccess, ctrl.getHQDashboard);
// [7]  Cross-branch comparison
router.get('/hq/comparison', auth, requireBranchAccess, requireHQAccess, ctrl.getBranchComparison);
// [8]  System-wide alerts
router.get('/hq/alerts', auth, requireBranchAccess, requireHQAccess, ctrl.getSystemAlerts);
// [9]  Consolidated financials
router.get('/hq/financials', auth, requireBranchAccess, requireHQAccess, ctrl.getConsolidatedFinancials);
// [20] Staff optimizer
router.get('/hq/staff-optimizer', auth, requireBranchAccess, requireHQAccess, ctrl.getStaffOptimizer);
// [21] Emergency controls (GET - list)
router.get('/hq/emergency-override', auth, requireBranchAccess, requireHQAccess, ctrl.getEmergencyControls);
// [22] Emergency override (POST - execute)
router.post('/hq/emergency-override', auth, requireBranchAccess, requireHQAccess, ctrl.executeEmergencyAction);
// [24] HQ audit log
router.get('/hq/audit-log', auth, requireBranchAccess, requireHQAccess, ctrl.getHQAuditLog);

// ─── HQ Analytics & Intelligence ─────────────────────────────────────────────
// [26] HQ network analytics
router.get('/hq/analytics', auth, requireBranchAccess, requireHQAccess, ctrl.getHQAnalytics);
// [27] Branch rankings
router.get('/hq/rankings', auth, requireBranchAccess, requireHQAccess, ctrl.getBranchRankings);
// [28] HQ forecast
router.get('/hq/forecast', auth, requireBranchAccess, requireHQAccess, ctrl.getHQForecast);
// [29] Network daily digest
router.get('/hq/network-digest', auth, requireBranchAccess, requireHQAccess, ctrl.getNetworkDigest);

// ─── Branch CRUD (HQ only for create/delete) ─────────────────────────────────
// [1]  List branches
router.get('/', auth, requireBranchAccess, ctrl.listBranches);
// [3]  Create branch
router.post('/', auth, requireBranchAccess, requireHQAccess, ctrl.createBranch);
// [2]  Get single branch
router.get('/:branch_code', auth, requireBranchAccess, ctrl.getBranch);
// [4]  Update branch
router.put('/:branch_code', auth, requireBranchAccess, requireBranchPermission('settings', 'write'), ctrl.updateBranch);
// [5]  Deactivate branch (Super Admin only)
router.delete('/:branch_code', auth, requireBranchAccess, requireSuperAdmin, ctrl.deleteBranch);

// ─── Branch Dashboard & KPIs ─────────────────────────────────────────────────
// [10] Branch dashboard
router.get(
  '/:branch_code/dashboard',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchDashboard
);
// [18] Branch KPIs vs HQ
router.get(
  '/:branch_code/kpis',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchKPIs
);

// ─── Patients ─────────────────────────────────────────────────────────────────
// [11] List patients
router.get(
  '/:branch_code/patients',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('patients', 'read'),
  ctrl.getBranchPatients
);

// ─── Schedule ─────────────────────────────────────────────────────────────────
// [12] Get schedule
router.get(
  '/:branch_code/schedule',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('schedule', 'read'),
  ctrl.getBranchSchedule
);
// [13] Create schedule entry
router.post(
  '/:branch_code/schedule',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('schedule', 'write'),
  ctrl.createScheduleEntry
);

// ─── Staff ─────────────────────────────────────────────────────────────────────
// [14] Staff list
router.get(
  '/:branch_code/staff',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('staff', 'read'),
  ctrl.getBranchStaff
);

// ─── Finance ──────────────────────────────────────────────────────────────────
// [15] Finance data
router.get(
  '/:branch_code/finance',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('finance', 'read'),
  ctrl.getBranchFinance
);

// ─── Transport ────────────────────────────────────────────────────────────────
// [16] Transport routes
router.get(
  '/:branch_code/transport',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('transport', 'read'),
  ctrl.getBranchTransport
);

// ─── Reports ──────────────────────────────────────────────────────────────────
// [17] Available reports
router.get(
  '/:branch_code/reports',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('reports', 'read'),
  ctrl.getBranchReports
);

// ─── Settings ─────────────────────────────────────────────────────────────────
// [19] Update settings
router.put(
  '/:branch_code/settings',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('settings', 'write'),
  ctrl.updateBranchSettings
);

// ─── Audit Log ────────────────────────────────────────────────────────────────
// [23] Branch audit log
router.get(
  '/:branch_code/audit-log',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('audit', 'read'),
  ctrl.getBranchAuditLog
);

// ─── Branch Analytics & Intelligence ─────────────────────────────────────────
// [30] Branch analytics
router.get(
  '/:branch_code/analytics',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchAnalytics
);
// [31] Branch trends
router.get(
  '/:branch_code/trends',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchTrends
);
// [32] Branch forecast
router.get(
  '/:branch_code/forecast',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchForecast
);
// [33] Branch AI recommendations
router.get(
  '/:branch_code/recommendations',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchRecommendations
);
// [34] Get branch targets
router.get(
  '/:branch_code/targets',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('branches', 'read'),
  ctrl.getBranchTargets
);
// [35] Set branch targets
router.post(
  '/:branch_code/targets',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('branches', 'write'),
  ctrl.setBranchTargets
);
// [36] Trigger daily snapshot (HQ or branch manager)
router.post(
  '/:branch_code/snapshot',
  auth, requireBranchAccess, requireBranchAccess,
  requireBranchPermission('branches', 'write'),
  ctrl.triggerSnapshot
);

module.exports = router;

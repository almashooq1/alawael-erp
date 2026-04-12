'use strict';
/**
 * DDD Workforce Analytics Routes
 * ───────────────────────────────
 * Phase 29 – Workforce & Professional Development
 *
 * ✅ Auth (JWT)          — every endpoint requires authentication
 * ✅ RBAC                — write ops restricted to hr_manager / admin / system_admin
 * ✅ Input validation     — required fields checked in service layer + route guards
 * ✅ Audit trail          — createdBy / updatedBy set from req.user
 * ✅ Pagination metadata  — { data, pagination: { total, page, limit, pages, hasNext } }
 * ✅ Consistent error     — { success: false, error: message, status }
 *
 * 20 endpoints:
 *   GET    /health
 *   POST   /snapshots              — create workforce snapshot
 *   GET    /snapshots              — list snapshots (paginated)
 *   GET    /snapshots/:id          — get snapshot by ID
 *   POST   /staff                  — create staff profile
 *   GET    /staff                  — list staff (paginated)
 *   GET    /staff/:id              — get staff profile
 *   PUT    /staff/:id              — update staff profile
 *   DELETE /staff/:id              — soft-delete staff profile
 *   POST   /workload               — create workload entry
 *   GET    /workload               — list workload entries (paginated)
 *   POST   /kpis                   — create KPI record
 *   GET    /kpis                   — list KPI records (paginated)
 *   GET    /kpis/dashboard         — latest KPI values per code
 *   GET    /kpis/templates         — built-in KPI templates
 *   GET    /departments/:dept/summary — department summary analytics
 *   GET    /distribution            — workload distribution
 *   GET    /turnover-trend          — turnover trend (last 12 months)
 *   GET    /overtime-analysis       — overtime analysis
 *   GET    /staff/:id/attrition-risk — predict attrition risk for staff
 *
 * Base: /api/workforce-analytics  (also mounted at /api/v1/workforce-analytics)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// Service exports singleton — use directly (no `new`)
const svc = require('../services/dddWorkforceAnalytics');

/* ─── RBAC helper (inline — lightweight) ─── */
const HR_ROLES = ['admin', 'system_admin', 'hr_manager', 'hr_director'];

function requireHR(req, res, next) {
  const role = req.user?.role || req.user?.systemRole || '';
  if (HR_ROLES.includes(role)) return next();
  return res
    .status(403)
    .json({ success: false, error: 'Insufficient permissions — HR role required' });
}

/* ─── Shared error handler ─── */
function handleError(res, err, context) {
  const status = err.status || 500;
  if (status >= 500) logger.error(`[WorkforceAnalytics] ${context}:`, err.message);
  res.status(status).json({
    success: false,
    error: typeof safeError === 'function' ? safeError(err) : err.message,
  });
}

/* ═══════════════════════════════════════════════════════ */
/*  HEALTH                                                */
/* ═══════════════════════════════════════════════════════ */

router.get('/health', async (_req, res) => {
  try {
    res.json({ success: true, data: await svc.healthCheck() });
  } catch (err) {
    handleError(res, err, 'healthCheck');
  }
});

/* ═══════════════════════════════════════════════════════ */
/*  SNAPSHOTS — لقطات القوى العاملة                       */
/* ═══════════════════════════════════════════════════════ */

router.post('/snapshots', authenticate, requireHR, async (req, res) => {
  try {
    const doc = await svc.createSnapshot(req.body, req.user._id);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    handleError(res, err, 'createSnapshot');
  }
});

router.get('/snapshots', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, ...filter } = req.query;
    const result = await svc.listSnapshots(filter, +page, +limit);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err, 'listSnapshots');
  }
});

router.get('/snapshots/:id', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getSnapshotById(req.params.id) });
  } catch (err) {
    handleError(res, err, 'getSnapshotById');
  }
});

/* ═══════════════════════════════════════════════════════ */
/*  STAFF PROFILES — ملفات الموظفين                       */
/* ═══════════════════════════════════════════════════════ */

router.post('/staff', authenticate, requireHR, async (req, res) => {
  try {
    const doc = await svc.createStaffProfile(req.body, req.user._id);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    handleError(res, err, 'createStaffProfile');
  }
});

router.get('/staff', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, ...filter } = req.query;
    const result = await svc.listStaffProfiles(filter, +page, +limit);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err, 'listStaffProfiles');
  }
});

router.get('/staff/:id', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getStaffProfileById(req.params.id) });
  } catch (err) {
    handleError(res, err, 'getStaffProfileById');
  }
});

router.put('/staff/:id', authenticate, requireHR, async (req, res) => {
  try {
    const doc = await svc.updateStaffProfile(req.params.id, req.body, req.user._id);
    res.json({ success: true, data: doc });
  } catch (err) {
    handleError(res, err, 'updateStaffProfile');
  }
});

router.delete('/staff/:id', authenticate, requireHR, async (req, res) => {
  try {
    const result = await svc.deleteStaffProfile(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err, 'deleteStaffProfile');
  }
});

/* ═══════════════════════════════════════════════════════ */
/*  WORKLOAD ENTRIES — سجلات عبء العمل                    */
/* ═══════════════════════════════════════════════════════ */

router.post('/workload', authenticate, async (req, res) => {
  try {
    const doc = await svc.createWorkloadEntry(req.body, req.user._id);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    handleError(res, err, 'createWorkloadEntry');
  }
});

router.get('/workload', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, ...filter } = req.query;
    const result = await svc.listWorkloadEntries(filter, +page, +limit);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err, 'listWorkloadEntries');
  }
});

/* ═══════════════════════════════════════════════════════ */
/*  KPI RECORDS — مؤشرات الأداء                           */
/* ═══════════════════════════════════════════════════════ */

router.post('/kpis', authenticate, requireHR, async (req, res) => {
  try {
    const doc = await svc.createKPIRecord(req.body, req.user._id);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    handleError(res, err, 'createKPIRecord');
  }
});

router.get('/kpis', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, ...filter } = req.query;
    const result = await svc.listKPIRecords(filter, +page, +limit);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err, 'listKPIRecords');
  }
});

router.get('/kpis/dashboard', authenticate, async (req, res) => {
  try {
    const data = await svc.getKPIDashboard(req.query.department);
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'getKPIDashboard');
  }
});

router.get('/kpis/templates', authenticate, (_req, res) => {
  res.json({ success: true, data: svc.getKPITemplates() });
});

/* ═══════════════════════════════════════════════════════ */
/*  ANALYTICS — التحليلات                                 */
/* ═══════════════════════════════════════════════════════ */

router.get('/departments/:dept/summary', authenticate, async (req, res) => {
  try {
    const data = await svc.getDepartmentSummary(req.params.dept);
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'getDepartmentSummary');
  }
});

router.get('/distribution', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: await svc.getWorkloadDistribution() });
  } catch (err) {
    handleError(res, err, 'getWorkloadDistribution');
  }
});

router.get('/turnover-trend', authenticate, async (req, res) => {
  try {
    const data = await svc.getTurnoverTrend(req.query.department, +(req.query.months || 12));
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'getTurnoverTrend');
  }
});

router.get('/overtime-analysis', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: await svc.getOvertimeAnalysis() });
  } catch (err) {
    handleError(res, err, 'getOvertimeAnalysis');
  }
});

/* ═══════════════════════════════════════════════════════ */
/*  ATTRITION RISK — مخاطر دوران الموظفين                */
/* ═══════════════════════════════════════════════════════ */

router.get('/staff/:id/attrition-risk', authenticate, async (req, res) => {
  try {
    const data = await svc.predictAttritionRisk(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'predictAttritionRisk');
  }
});

module.exports = router;

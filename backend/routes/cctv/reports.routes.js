/**
 * CCTV fast-reports routes — Wave 1230.
 *
 * Read-only report surface over the IP-cam subsystems. Mounted at
 * /api/cctv/reports + /api/v1/cctv/reports by cctv.registry.js.
 *
 *   GET /employees                 — recognised-staff summary (face terminals)
 *   GET /employees/:employeeId     — per-employee timeline (first-in / last-out per day)
 *   GET /plates                    — ANPR plates seen, registry + fleet joined
 *   GET /plates/:plate             — single-plate movement history
 *   GET /visitors                  — clients / visitors / vendors / unknown plates
 *   GET /ai-overview               — unified analysis across every IP cam
 *
 * Common filters: ?from=ISO&to=ISO (max 92-day window) &branchCode= &limit=
 * Employee endpoints additionally accept ?branchId= (Hikvision side is
 * branchId-keyed; the CCTV event side is branchCode-keyed).
 */
'use strict';

const express = require('express');
const reports = require('../../services/cctv/reports.service');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const { requireBranchAccess } = require('../../middleware/branchScope.middleware');
const { callerCctvBranchCode } = require('../../middleware/cctvBranchScope');

const router = require('./asyncRouter')(express.Router());
router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(requireRole(['admin', 'manager', 'security_officer', 'hr_manager']));

// CCTV-event side is keyed by branchCode (String). For a restricted caller we
// pin to their own branch code (ignoring any ?branchCode= spoof); a cross-branch
// caller (resolver → null) may pass ?branchCode= to scope a specific branch.
// NOTE: `req.user.branchCode` was never populated, so the old fallback provided
// zero isolation — any authed caller could read another branch's child camera data.
async function branchCodeOf(req) {
  const callerCode = await callerCctvBranchCode(req);
  return callerCode || req.query.branchCode || '';
}

// Hikvision workforce side is keyed by branchId (ObjectId). Pin a restricted
// caller to their own branchId; cross-branch callers may pass ?branchId=.
function branchIdOf(req) {
  const bs = req && req.branchScope;
  if (bs && !bs.allBranches && bs.branchId) return String(bs.branchId);
  return req.query.branchId;
}

function wrap(fn) {
  return async (req, res) => {
    try {
      const data = await fn(req);
      res.json({ success: true, data });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({
        success: false,
        message: err.code || (status === 500 ? 'REPORT_FAILED' : err.message),
      });
    }
  };
}

router.get(
  '/employees',
  wrap(req =>
    reports.employeesReport({
      branchId: branchIdOf(req),
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
    })
  )
);

router.get(
  '/employees/:employeeId',
  wrap(req =>
    reports.employeeTimeline({
      employeeId: req.params.employeeId,
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
    })
  )
);

router.get(
  '/plates',
  wrap(async req =>
    reports.platesReport({
      branchCode: await branchCodeOf(req),
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
    })
  )
);

router.get(
  '/plates/:plate',
  wrap(async req =>
    reports.plateHistory({
      plate: req.params.plate,
      branchCode: await branchCodeOf(req),
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
    })
  )
);

router.get(
  '/visitors',
  wrap(async req =>
    reports.visitorsReport({
      branchCode: await branchCodeOf(req),
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
    })
  )
);

router.get(
  '/ai-overview',
  wrap(async req =>
    reports.aiOverview({
      branchCode: await branchCodeOf(req),
      from: req.query.from,
      to: req.query.to,
    })
  )
);

module.exports = router;

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

const router = require('./asyncRouter')(express.Router());
router.use(authenticateToken);
router.use(requireRole(['admin', 'manager', 'security_officer', 'hr_manager']));

function branchOf(req) {
  return req.query.branchCode || req.user?.branchCode || '';
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
      branchId: req.query.branchId,
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
  wrap(req =>
    reports.platesReport({
      branchCode: branchOf(req),
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
    })
  )
);

router.get(
  '/plates/:plate',
  wrap(req =>
    reports.plateHistory({
      plate: req.params.plate,
      branchCode: branchOf(req),
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
    })
  )
);

router.get(
  '/visitors',
  wrap(req =>
    reports.visitorsReport({
      branchCode: branchOf(req),
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
    })
  )
);

router.get(
  '/ai-overview',
  wrap(req =>
    reports.aiOverview({
      branchCode: branchOf(req),
      from: req.query.from,
      to: req.query.to,
    })
  )
);

module.exports = router;

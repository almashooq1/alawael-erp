/**
 * Executive Dashboard Routes — مسارات لوحة القيادة التنفيذية
 * Phase 19 — Executive-level KPI aggregation
 *
 * Mount: /api/v1/executive
 * Endpoints: GET /overview, GET /branches, GET /financial, GET /staff
 * Auth: admin, super_admin, manager, executive roles
 */

'use strict';

const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticateToken: authenticate, authorize } = require('../middleware/auth');
const svc = require('../services/executiveDashboard.service');

const router = express.Router();

/* ── helpers ── */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const EXEC_ROLES = ['admin', 'super_admin', 'manager', 'executive'];

/* ════════════════════════════════════════════
   GET /api/v1/executive/overview
   ════════════════════════════════════════════ */
router.get(
  '/overview',
  authenticate,
  authorize(EXEC_ROLES),
  [
    query('branchId').optional().isString().withMessage('معرّف الفرع يجب أن يكون نصاً'),
  ],
  handleValidation,
  wrap(async (req, res) => {
    const data = await svc.getExecutiveOverview(req.query.branchId || null);
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   GET /api/v1/executive/branches
   ════════════════════════════════════════════ */
router.get(
  '/branches',
  authenticate,
  authorize(EXEC_ROLES),
  wrap(async (req, res) => {
    const data = await svc.getBranchComparison();
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   GET /api/v1/executive/financial
   ════════════════════════════════════════════ */
router.get(
  '/financial',
  authenticate,
  authorize(EXEC_ROLES),
  [
    query('startDate').optional().isISO8601().withMessage('تاريخ البداية غير صالح'),
    query('endDate').optional().isISO8601().withMessage('تاريخ النهاية غير صالح'),
  ],
  handleValidation,
  wrap(async (req, res) => {
    const data = await svc.getFinancialSummary(req.query.startDate, req.query.endDate);
    res.json({ success: true, data });
  })
);

/* ════════════════════════════════════════════
   GET /api/v1/executive/staff
   ════════════════════════════════════════════ */
router.get(
  '/staff',
  authenticate,
  authorize(EXEC_ROLES),
  wrap(async (req, res) => {
    const data = await svc.getStaffPerformance();
    res.json({ success: true, data });
  })
);

module.exports = router;

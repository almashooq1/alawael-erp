'use strict';

/**
 * Report Center Routes — مسارات مركز التقارير السريرية الموحدة
 * ══════════════════════════════════════════════════════════════════
 * GET  /api/v1/report-center/executive          — ملخص تنفيذي
 * GET  /api/v1/report-center/clinical-kpis      — مؤشرات سريرية
 * GET  /api/v1/report-center/beneficiaries      — تقرير المستفيدين
 * GET  /api/v1/report-center/sessions           — تقرير الجلسات
 * GET  /api/v1/report-center/outcomes           — تقرير النتائج
 * GET  /api/v1/report-center/quality            — مؤشرات الجودة
 * GET  /api/v1/report-center/discharge          — تقرير التخريج
 * ══════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const reportCenterSvc = require('../services/reportCenter.service');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

let auth;
try {
  const authMod = require('../middleware/auth');
  auth = authMod.requireAuth || authMod.authenticateToken || authMod;
  if (typeof auth !== 'function') auth = (_req, _res, next) => next();
} catch {
  auth = (_req, _res, next) => next();
}

// Executive summary
router.get(
  '/executive',
  auth,
  wrap(async (req, res) => {
    const data = await reportCenterSvc.getExecutiveSummary({
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ success: true, data });
  })
);

// Clinical KPIs
router.get(
  '/clinical-kpis',
  auth,
  wrap(async (req, res) => {
    const data = await reportCenterSvc.getClinicalKPIs({ from: req.query.from, to: req.query.to });
    res.json({ success: true, data });
  })
);

// Beneficiary report
router.get(
  '/beneficiaries',
  auth,
  wrap(async (req, res) => {
    const { from, to, status, disabilityType, page, limit } = req.query;
    const data = await reportCenterSvc.getBeneficiaryReport({
      from,
      to,
      status,
      disabilityType,
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 50, 200),
    });
    res.json({ success: true, ...data });
  })
);

// Sessions report
router.get(
  '/sessions',
  auth,
  wrap(async (req, res) => {
    const { from, to, therapistId, sessionType, status, page, limit } = req.query;
    const data = await reportCenterSvc.getSessionsReport({
      from,
      to,
      therapistId,
      sessionType,
      status,
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 50, 200),
    });
    res.json({ success: true, ...data });
  })
);

// Outcomes report
router.get(
  '/outcomes',
  auth,
  wrap(async (req, res) => {
    const data = await reportCenterSvc.getOutcomesReport({
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ success: true, data });
  })
);

// Quality indicators
router.get(
  '/quality',
  auth,
  wrap(async (req, res) => {
    const data = await reportCenterSvc.getQualityIndicators({
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ success: true, data });
  })
);

// Discharge report
router.get(
  '/discharge',
  auth,
  wrap(async (req, res) => {
    const { from, to, page, limit } = req.query;
    const data = await reportCenterSvc.getDischargeReport({
      from,
      to,
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 50, 200),
    });
    res.json({ success: true, ...data });
  })
);

module.exports = router;

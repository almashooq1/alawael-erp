/**
 * revenue-forecast-admin.routes.js — short-horizon cashflow projection.
 *
 * Mount at /api/admin/revenue-forecast.
 *
 * Endpoints:
 *   GET /overview         projection + trailing averages + DSO + risk flag
 *   GET /cohorts          per-issue-month collection curve
 *   GET /velocity         per-insurer days-to-paid leaderboard
 *   GET /history          last-12-months raw series (for charting)
 *
 * No CSV export — forecast data is analytical, not record-keeping, so
 * a CSV dump would add noise. The UI exports the underlying /api/admin/
 * revenue CSV instead.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

const Invoice = require('../models/Invoice');
const fc = require('../services/revenueForecastService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'finance',
  'accountant',
  'ceo',
];

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const months = Math.min(12, Math.max(1, parseInt(req.query.months, 10) || 3));
    const all = await Invoice.find({})
      .select('status totalAmount issueDate updatedAt insurance')
      .lean();
    const projection = fc.projectMonths(all, months);
    const dso = fc.dso(all);
    const risk = fc.detectCashflowRisk(all);
    res.json({
      success: true,
      projection,
      dso,
      risk,
      thresholds: {
        trailingMonths: fc.THRESHOLDS.trailingMonths,
        riskDropPct: fc.THRESHOLDS.riskDropPct,
        minHistoryMonths: fc.THRESHOLDS.minHistoryMonths,
      },
    });
  } catch (err) {
    return safeError(res, err, 'forecast.overview');
  }
});

router.get('/cohorts', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await Invoice.find({}).select('status totalAmount issueDate updatedAt').lean();
    res.json({ success: true, cohorts: fc.cohortCollection(all) });
  } catch (err) {
    return safeError(res, err, 'forecast.cohorts');
  }
});

router.get('/velocity', requireRole(READ_ROLES), async (req, res) => {
  try {
    const paid = await Invoice.find({ status: 'PAID' })
      .select('totalAmount issueDate updatedAt insurance')
      .populate('insurance.provider', 'name nameEn')
      .lean();
    const rows = fc.velocityByInsurer(paid);
    // Enrich with display names where the provider was populated.
    const byId = new Map();
    for (const inv of paid) {
      const p = inv.insurance?.provider;
      if (p && typeof p === 'object' && p._id) byId.set(String(p._id), p);
    }
    const enriched = rows.map(r => {
      const prov = byId.get(r.insurer);
      return {
        ...r,
        name: prov?.name || prov?.nameEn || r.insurer,
      };
    });
    res.json({ success: true, items: enriched });
  } catch (err) {
    return safeError(res, err, 'forecast.velocity');
  }
});

router.get('/history', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await Invoice.find({}).select('status totalAmount issueDate updatedAt').lean();
    res.json({ success: true, history: fc.monthlyHistory(all) });
  } catch (err) {
    return safeError(res, err, 'forecast.history');
  }
});

module.exports = router;

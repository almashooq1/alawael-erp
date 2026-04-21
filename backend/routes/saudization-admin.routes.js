/**
 * saudization-admin.routes.js — Nitaqat live dashboard.
 *
 * Mount at /api/admin/saudization.
 *
 * Orthogonal to the Nitaqat calculator (which writes snapshots) —
 * this surface reads snapshots and adds forward-looking analytics:
 * current band + runway to red + band-change history + HR actions.
 *
 * Endpoints:
 *   GET /overview       current status + runway + risk-alarm flag
 *   GET /trend          monthly Saudization % + band
 *   GET /history        band-change event timeline
 *   GET /runway         projection-only detail (regression inputs)
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

const { NitaqatCalculation } = require('../models/nitaqat.models');
const sa = require('../services/saudizationAnalyticsService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'hr_manager', 'ceo'];

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const snapshots = await NitaqatCalculation.find({}).sort({ calculationDate: 1 }).lean();
    const status = sa.currentStatus(snapshots);
    const runway = sa.runwayProjection(snapshots);
    const alarm = sa.detectRiskAlarm(snapshots);
    res.json({
      success: true,
      status,
      runway,
      alarm,
      thresholds: {
        alarmMonths: sa.THRESHOLDS.alarmMonths,
        projectionMinSnapshots: sa.THRESHOLDS.projectionMinSnapshots,
        decliningPctPerMonth: sa.THRESHOLDS.decliningPctPerMonth,
      },
    });
  } catch (err) {
    return safeError(res, err, 'saudization.overview');
  }
});

router.get('/trend', requireRole(READ_ROLES), async (req, res) => {
  try {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 12));
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const snapshots = await NitaqatCalculation.find({ calculationDate: { $gte: cutoff } })
      .sort({ calculationDate: 1 })
      .lean();
    res.json({ success: true, months: sa.monthlyTrend(snapshots) });
  } catch (err) {
    return safeError(res, err, 'saudization.trend');
  }
});

router.get('/history', requireRole(READ_ROLES), async (req, res) => {
  try {
    const snapshots = await NitaqatCalculation.find({}).sort({ calculationDate: 1 }).lean();
    res.json({ success: true, events: sa.bandHistory(snapshots) });
  } catch (err) {
    return safeError(res, err, 'saudization.history');
  }
});

router.get('/runway', requireRole(READ_ROLES), async (req, res) => {
  try {
    const snapshots = await NitaqatCalculation.find({}).sort({ calculationDate: 1 }).lean();
    res.json({ success: true, runway: sa.runwayProjection(snapshots) });
  } catch (err) {
    return safeError(res, err, 'saudization.runway');
  }
});

module.exports = router;

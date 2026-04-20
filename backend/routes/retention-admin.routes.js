/**
 * retention-admin.routes.js — Beneficiary retention + churn analytics.
 *
 * Mount at /api/admin/retention.
 *
 * Endpoints:
 *   GET /overview     summarize + churn-spike flag + thresholds
 *   GET /at-risk      watchlist of at-risk beneficiaries
 *   GET /cohorts      per-enrollment-month retention curve
 *   GET /by-service   per-program-type churn rates
 *   GET /trend        monthly churn history (12mo)
 *   GET /export.csv   at-risk watchlist dump
 *
 * Backed by retentionService — pure math; route does I/O only.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

const Beneficiary = require('../models/Beneficiary');
const TherapySession = require('../models/TherapySession');
const ret = require('../services/retentionService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr',
  'clinical_supervisor',
  'ceo',
];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr'];

/**
 * Pull sessions + beneficiaries with the minimal fields the service needs.
 * Kept small to keep the route fast; retention math is lightweight.
 */
async function loadSnapshot() {
  // Sessions from the last 90 days are enough to classify current activity.
  const cutoff = new Date(Date.now() - 90 * 86400000);
  const [benefs, sessions] = await Promise.all([
    Beneficiary.find({})
      .select(
        '_id firstName_ar lastName_ar firstName lastName status createdAt updatedAt enrolledPrograms'
      )
      .lean(),
    TherapySession.find({ date: { $gte: cutoff } })
      .select('beneficiary date')
      .lean(),
  ]);
  return { benefs, sessions };
}

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { benefs, sessions } = await loadSnapshot();
    const summary = ret.summarize(benefs, sessions);
    const spike = ret.detectChurnSpike(benefs, sessions);
    res.json({
      success: true,
      summary,
      spike,
      thresholds: {
        activeDays: ret.THRESHOLDS.activeDays,
        churnDays: ret.THRESHOLDS.churnDays,
        churnSpikePct: ret.THRESHOLDS.churnSpikePct,
      },
    });
  } catch (err) {
    return safeError(res, err, 'retention.overview');
  }
});

router.get('/at-risk', requireRole(READ_ROLES), async (req, res) => {
  try {
    const n = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const { benefs, sessions } = await loadSnapshot();
    res.json({ success: true, items: ret.atRiskBeneficiaries(benefs, sessions, new Date(), n) });
  } catch (err) {
    return safeError(res, err, 'retention.atRisk');
  }
});

router.get('/cohorts', requireRole(READ_ROLES), async (req, res) => {
  try {
    // Cohort analysis needs older sessions — pull last 2 years.
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 2);
    const [benefs, sessions] = await Promise.all([
      Beneficiary.find({ createdAt: { $gte: cutoff } })
        .select('_id status createdAt')
        .lean(),
      TherapySession.find({ date: { $gte: cutoff } })
        .select('beneficiary date')
        .lean(),
    ]);
    res.json({ success: true, cohorts: ret.cohortRetention(benefs, sessions) });
  } catch (err) {
    return safeError(res, err, 'retention.cohorts');
  }
});

router.get('/by-service', requireRole(READ_ROLES), async (req, res) => {
  try {
    const benefs = await Beneficiary.find({}).select('enrolledPrograms').lean();
    res.json({ success: true, items: ret.churnByService(benefs) });
  } catch (err) {
    return safeError(res, err, 'retention.byService');
  }
});

router.get('/trend', requireRole(READ_ROLES), async (req, res) => {
  try {
    const benefs = await Beneficiary.find({ status: { $in: ['inactive', 'transferred'] } })
      .select('status updatedAt')
      .lean();
    res.json({ success: true, months: ret.monthlyChurnHistory(benefs) });
  } catch (err) {
    return safeError(res, err, 'retention.trend');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const { benefs, sessions } = await loadSnapshot();
    const items = ret.atRiskBeneficiaries(benefs, sessions, new Date(), 10_000);
    res.set('X-Total-Count', String(items.length));
    const esc = v =>
      v == null
        ? ''
        : /[",\n\r]/.test(String(v))
          ? '"' + String(v).replace(/"/g, '""') + '"'
          : String(v);
    const header = [
      'beneficiaryId',
      'name',
      'status',
      'classification',
      'daysSinceLastSession',
      'lastSessionAt',
      'sessionsLast30d',
      'sessionsPrior30d',
      'declining',
    ];
    const rows = items.map(r =>
      [
        r._id,
        r.name,
        r.status,
        r.classification,
        r.daysSinceLastSession,
        r.lastSessionAt ? r.lastSessionAt.slice(0, 10) : '',
        r.sessionsLast30d,
        r.sessionsPrior30d,
        r.declining ? 'yes' : 'no',
      ]
        .map(esc)
        .join(',')
    );
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="retention-at-risk-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'retention.export');
  }
});

module.exports = router;

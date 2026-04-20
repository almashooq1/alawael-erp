/**
 * claims-analytics-admin.routes.js — NPHIES claim analytics.
 *
 * Mount at /api/admin/claims-analytics.
 *
 * Endpoints:
 *   GET /overview          summarize + spike detection
 *   GET /rejection-reasons top N rejection reasons
 *   GET /by-insurer        per-insurer volume + approval rate
 *   GET /trend             monthly submitted/approved/rejected
 *   GET /export.csv        rejected-claims dump (admin only)
 *
 * Backed by claimsAnalyticsService (pure math); route layer does I/O only.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

const NphiesClaim = require('../models/NphiesClaim');
const ca = require('../services/claimsAnalyticsService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'finance',
  'accountant',
  'clinical_supervisor',
];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'finance'];

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await NphiesClaim.find({}).lean();
    const summary = ca.summarize(all);
    const spike = ca.detectRejectionSpike(all);
    res.json({
      success: true,
      summary,
      spike,
      thresholds: {
        rejectionAlarmPct: ca.THRESHOLDS.rejectionAlarmPct,
        alarmWindowDays: ca.THRESHOLDS.alarmWindowDays,
        alarmMinSample: ca.THRESHOLDS.alarmMinSample,
      },
    });
  } catch (err) {
    return safeError(res, err, 'claims.overview');
  }
});

router.get('/rejection-reasons', requireRole(READ_ROLES), async (req, res) => {
  try {
    const n = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const rejected = await NphiesClaim.find({ 'nphies.submission.status': 'REJECTED' }).lean();
    res.json({ success: true, items: ca.rejectionReasons(rejected, n) });
  } catch (err) {
    return safeError(res, err, 'claims.rejectionReasons');
  }
});

router.get('/by-insurer', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await NphiesClaim.find({}).lean();
    res.json({ success: true, items: ca.byInsurer(all) });
  } catch (err) {
    return safeError(res, err, 'claims.byInsurer');
  }
});

router.get('/trend', requireRole(READ_ROLES), async (req, res) => {
  try {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 12));
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const all = await NphiesClaim.find({ serviceDate: { $gte: cutoff } }).lean();
    res.json({ success: true, months: ca.monthlyTrend(all) });
  } catch (err) {
    return safeError(res, err, 'claims.trend');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const filter = { 'nphies.submission.status': 'REJECTED' };
    const total = await NphiesClaim.countDocuments(filter);
    const items = await NphiesClaim.find(filter).sort({ serviceDate: -1 }).limit(10_000).lean();
    res.set('X-Total-Count', String(total));
    if (total > 10_000) {
      res.set('X-Truncated', 'true');
      res.set('X-Truncated-At', '10000');
    }
    const esc = v =>
      v == null
        ? ''
        : /[",\n\r]/.test(String(v))
          ? '"' + String(v).replace(/"/g, '""') + '"'
          : String(v);
    const header = [
      'claimNumber',
      'serviceDate',
      'insurerName',
      'memberId',
      'totalAmount',
      'rejectionReason',
      'submittedAt',
    ];
    const rows = items.map(c =>
      [
        c.claimNumber || '',
        c.serviceDate?.toISOString()?.slice(0, 10) || '',
        c.insurerName || '',
        c.memberId || '',
        c.totalAmount || 0,
        c.nphies?.submission?.reason || '',
        c.nphies?.submission?.submittedAt?.toISOString()?.slice(0, 10) || '',
      ]
        .map(esc)
        .join(',')
    );
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="rejected-claims-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'claims.export');
  }
});

module.exports = router;

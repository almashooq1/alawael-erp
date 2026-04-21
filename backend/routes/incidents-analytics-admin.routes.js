/**
 * incidents-analytics-admin.routes.js — safety / CBAHI analytics.
 *
 * Mount at /api/admin/incidents-analytics.
 * Read-only analytics layer over the existing Incident CRUD surface.
 *
 * Endpoints:
 *   GET /overview         summary + surge + SLA-breach + regulatory count
 *   GET /by-severity      per-severity MTTR with SLA check
 *   GET /by-category      per-category volume + critical count
 *   GET /root-causes      top root causes + permanent-fix rate
 *   GET /trend            monthly reported/resolved/MTTR
 *   GET /backlog          open-past-SLA list
 *   GET /export.csv       open backlog dump (admin/quality only)
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

const Incident = require('../models/Incident');
const ia = require('../services/incidentsAnalyticsService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'quality',
  'safety_officer',
  'ceo',
];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'quality', 'safety_officer'];

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await Incident.find({}).lean();
    const summary = ia.summarize(all);
    const surge = ia.detectSurge(all);
    const backlog = ia.openBacklog(all);
    const slaBreachCount = backlog.filter(b => b.overSla).length;
    res.json({
      success: true,
      summary,
      surge,
      slaBreachCount,
      backlogCount: backlog.length,
      thresholds: {
        sla: {
          CRITICAL: ia.THRESHOLDS.sla.CRITICAL,
          HIGH: ia.THRESHOLDS.sla.HIGH,
          MEDIUM: ia.THRESHOLDS.sla.MEDIUM,
          LOW: ia.THRESHOLDS.sla.LOW,
        },
        surgePct: ia.THRESHOLDS.surgePct,
      },
    });
  } catch (err) {
    return safeError(res, err, 'incidents.overview');
  }
});

router.get('/by-severity', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await Incident.find({})
      .select('severity status discoveryInfo resolution resolvedAt createdAt')
      .lean();
    res.json({ success: true, items: ia.bySeverity(all) });
  } catch (err) {
    return safeError(res, err, 'incidents.bySeverity');
  }
});

router.get('/by-category', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await Incident.find({}).select('category status severity').lean();
    res.json({ success: true, items: ia.byCategory(all) });
  } catch (err) {
    return safeError(res, err, 'incidents.byCategory');
  }
});

router.get('/root-causes', requireRole(READ_ROLES), async (req, res) => {
  try {
    const n = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const all = await Incident.find({ 'resolution.rootCause': { $ne: null } })
      .select('resolution')
      .lean();
    res.json({ success: true, items: ia.rootCauseTopN(all, n) });
  } catch (err) {
    return safeError(res, err, 'incidents.rootCauses');
  }
});

router.get('/trend', requireRole(READ_ROLES), async (req, res) => {
  try {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 12));
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const all = await Incident.find({
      $or: [
        { 'discoveryInfo.reportedAt': { $gte: cutoff } },
        { 'discoveryInfo.discoveredAt': { $gte: cutoff } },
        { createdAt: { $gte: cutoff } },
      ],
    })
      .select('status discoveryInfo resolution resolvedAt createdAt')
      .lean();
    res.json({ success: true, months: ia.monthlyTrend(all) });
  } catch (err) {
    return safeError(res, err, 'incidents.trend');
  }
});

router.get('/backlog', requireRole(READ_ROLES), async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const open = await Incident.find({
      status: {
        $in: [
          'REPORTED',
          'ACKNOWLEDGED',
          'INVESTIGATING',
          'IDENTIFIED',
          'IN_RESOLUTION',
          'REOPENED',
        ],
      },
    })
      .select('incidentNumber title category severity status discoveryInfo createdAt')
      .lean();
    res.json({ success: true, items: ia.openBacklog(open, new Date(), limit) });
  } catch (err) {
    return safeError(res, err, 'incidents.backlog');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const open = await Incident.find({
      status: {
        $in: [
          'REPORTED',
          'ACKNOWLEDGED',
          'INVESTIGATING',
          'IDENTIFIED',
          'IN_RESOLUTION',
          'REOPENED',
        ],
      },
    })
      .select('incidentNumber title category severity status discoveryInfo createdAt')
      .lean();
    const items = ia.openBacklog(open, new Date(), 10_000);
    res.set('X-Total-Count', String(items.length));
    const esc = v =>
      v == null
        ? ''
        : /[",\n\r]/.test(String(v))
          ? '"' + String(v).replace(/"/g, '""') + '"'
          : String(v);
    const header = [
      'incidentNumber',
      'title',
      'category',
      'severity',
      'status',
      'ageHours',
      'slaHours',
      'breachedBy',
      'overSla',
    ];
    const rows = items.map(r =>
      [
        r.incidentNumber || '',
        r.title || '',
        r.category || '',
        r.severity || '',
        r.status || '',
        r.ageHours,
        r.slaHours ?? '',
        r.breachedBy ?? '',
        r.overSla ? 'yes' : 'no',
      ]
        .map(esc)
        .join(',')
    );
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="incidents-backlog-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'incidents.export');
  }
});

module.exports = router;

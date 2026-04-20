/**
 * complaints-analytics-admin.routes.js — complaints pipeline analytics.
 *
 * Mount at /api/admin/complaints-analytics.
 * Orthogonal to /api/crm/complaints (CRUD). This surface is read-only
 * analytics for management + SLA monitoring.
 *
 * Endpoints:
 *   GET /overview        summarize + spike + SLA breach count
 *   GET /by-category     per-category volume + resolution rate
 *   GET /by-submitter    parent/employee/student split
 *   GET /trend           monthly volume + resolution rate
 *   GET /backlog         open past COMPLAINT_BACKLOG_DAYS
 *   GET /sla-breaches    per-priority SLA breach list
 *   GET /export.csv      open backlog dump (admin only)
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

const Complaint = require('../models/Complaint');
const ca = require('../services/complaintsAnalyticsService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'quality', 'ceo'];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'quality'];

router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await Complaint.find({}).lean();
    const summary = ca.summarize(all);
    const spike = ca.detectSpike(all);
    const slaList = ca.slaBreaches(all);
    const backlog = ca.openBacklog(all);
    res.json({
      success: true,
      summary,
      spike,
      slaBreachCount: slaList.length,
      backlogCount: backlog.length,
      thresholds: {
        sla: {
          critical: ca.THRESHOLDS.sla.critical,
          high: ca.THRESHOLDS.sla.high,
          medium: ca.THRESHOLDS.sla.medium,
          low: ca.THRESHOLDS.sla.low,
        },
        backlogDays: ca.THRESHOLDS.backlogDays,
        spikePct: ca.THRESHOLDS.spikePct,
      },
    });
  } catch (err) {
    return safeError(res, err, 'complaints.overview');
  }
});

router.get('/by-category', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await Complaint.find({}).select('category status priority').lean();
    res.json({ success: true, items: ca.byCategory(all) });
  } catch (err) {
    return safeError(res, err, 'complaints.byCategory');
  }
});

router.get('/by-submitter', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await Complaint.find({}).select('submitterType status').lean();
    res.json({ success: true, items: ca.bySubmitterType(all) });
  } catch (err) {
    return safeError(res, err, 'complaints.bySubmitter');
  }
});

router.get('/trend', requireRole(READ_ROLES), async (req, res) => {
  try {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 12));
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const all = await Complaint.find({ createdAt: { $gte: cutoff } })
      .select('createdAt status resolvedAt')
      .lean();
    res.json({ success: true, months: ca.monthlyTrend(all) });
  } catch (err) {
    return safeError(res, err, 'complaints.trend');
  }
});

router.get('/backlog', requireRole(READ_ROLES), async (req, res) => {
  try {
    const n = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const open = await Complaint.find({
      status: { $in: ['new', 'under_review', 'in_progress', 'escalated'] },
    }).lean();
    res.json({ success: true, items: ca.openBacklog(open, new Date(), n) });
  } catch (err) {
    return safeError(res, err, 'complaints.backlog');
  }
});

router.get('/sla-breaches', requireRole(READ_ROLES), async (req, res) => {
  try {
    const all = await Complaint.find({}).lean();
    res.json({ success: true, items: ca.slaBreaches(all) });
  } catch (err) {
    return safeError(res, err, 'complaints.slaBreaches');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const open = await Complaint.find({
      status: { $in: ['new', 'under_review', 'in_progress', 'escalated'] },
    }).lean();
    const items = ca.openBacklog(open, new Date(), 10_000);
    res.set('X-Total-Count', String(items.length));
    const esc = v =>
      v == null
        ? ''
        : /[",\n\r]/.test(String(v))
          ? '"' + String(v).replace(/"/g, '""') + '"'
          : String(v);
    const header = [
      'complaintId',
      'subject',
      'category',
      'priority',
      'status',
      'submitterType',
      'daysOpen',
    ];
    const rows = items.map(r =>
      [
        r.complaintId || '',
        r.subject || '',
        r.category || '',
        r.priority || '',
        r.status || '',
        r.submitterType || '',
        r.daysOpen,
      ]
        .map(esc)
        .join(',')
    );
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="complaints-backlog-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'complaints.export');
  }
});

module.exports = router;

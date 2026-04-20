/**
 * utilization-admin.routes.js — Therapist productivity admin.
 *
 * Mount at /api/admin/utilization. Read-only — joins TherapySession
 * + SessionAttendance in-memory at query time (no new model).
 *
 * Endpoints:
 *   GET /                       per-therapist rollup (all stats)
 *   GET /therapist/:id          single-therapist drill-down + utilization
 *   GET /leaderboard            top N by metric (billableMinutes default)
 *   GET /export.csv             admin-only audit CSV
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const TherapySession = require('../models/TherapySession');
const SessionAttendance = require('../models/SessionAttendance');
const Employee = require('../models/HR/Employee');
const util = require('../services/therapistUtilizationService');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr',
  'hr_manager',
  'clinical_supervisor',
];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'hr_manager'];

function dateWindow(q) {
  const filter = {};
  if (q.from || q.to) {
    filter.date = {};
    if (q.from) filter.date.$gte = new Date(q.from);
    if (q.to) {
      const d = new Date(q.to);
      d.setHours(23, 59, 59, 999);
      filter.date.$lte = d;
    }
  } else {
    // Default: last 30 days.
    filter.date = { $gte: new Date(Date.now() - 30 * 86400000) };
  }
  return filter;
}

router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = dateWindow(req.query);
    const [sessions, attendance] = await Promise.all([
      TherapySession.find(filter).select('_id therapist beneficiary status duration date').lean(),
      SessionAttendance.find({
        scheduledDate: filter.date,
      })
        .select('sessionId status billable')
        .lean(),
    ]);
    const att = util.indexAttendance(attendance);
    const byTherapist = util.summarizeByTherapist(sessions, att);

    // Hydrate names for the response.
    const ids = Object.keys(byTherapist).filter(id => mongoose.isValidObjectId(id));
    const emps = ids.length
      ? await Employee.find({ _id: { $in: ids } })
          .select('firstName_ar lastName_ar employee_code')
          .lean()
      : [];
    const eMap = new Map(emps.map(e => [String(e._id), e]));
    const items = Object.entries(byTherapist).map(([id, stats]) => {
      const e = eMap.get(id);
      return {
        therapistId: id,
        name: e ? [e.firstName_ar, e.lastName_ar].filter(Boolean).join(' ') : '—',
        employeeCode: e?.employee_code || null,
        ...stats,
        utilizationRate: util.utilizationRate(stats),
      };
    });
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'utilization.list');
  }
});

router.get('/therapist/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const filter = dateWindow(req.query);
    filter.therapist = req.params.id;
    const sessions = await TherapySession.find(filter)
      .select('_id therapist beneficiary status duration date')
      .lean();
    const sIds = sessions.map(s => s._id);
    const attendance = sIds.length
      ? await SessionAttendance.find({ sessionId: { $in: sIds } })
          .select('sessionId status billable')
          .lean()
      : [];
    const att = util.indexAttendance(attendance);
    const byTherapist = util.summarizeByTherapist(sessions, att);
    const stats = byTherapist[String(req.params.id)] || null;
    res.json({
      success: true,
      stats,
      utilizationRate: stats ? util.utilizationRate(stats) : null,
      sessionCount: sessions.length,
    });
  } catch (err) {
    return safeError(res, err, 'utilization.byTherapist');
  }
});

router.get('/leaderboard', requireRole(READ_ROLES), async (req, res) => {
  try {
    const metric = String(req.query.metric || 'billableMinutes');
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const filter = dateWindow(req.query);
    const [sessions, attendance] = await Promise.all([
      TherapySession.find(filter).select('_id therapist beneficiary status duration').lean(),
      SessionAttendance.find({ scheduledDate: filter.date })
        .select('sessionId status billable')
        .lean(),
    ]);
    const byTherapist = util.summarizeByTherapist(sessions, util.indexAttendance(attendance));
    const ranked = util.rankByMetric(byTherapist, metric, { limit });

    const ids = ranked.map(r => r.therapistId).filter(id => mongoose.isValidObjectId(id));
    const emps = ids.length
      ? await Employee.find({ _id: { $in: ids } })
          .select('firstName_ar lastName_ar employee_code')
          .lean()
      : [];
    const eMap = new Map(emps.map(e => [String(e._id), e]));
    res.json({
      success: true,
      metric,
      leaderboard: ranked.map(r => ({
        ...r,
        name: eMap.get(r.therapistId)
          ? [eMap.get(r.therapistId).firstName_ar, eMap.get(r.therapistId).lastName_ar]
              .filter(Boolean)
              .join(' ')
          : '—',
        employeeCode: eMap.get(r.therapistId)?.employee_code || null,
      })),
    });
  } catch (err) {
    return safeError(res, err, 'utilization.leaderboard');
  }
});

router.get('/export.csv', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    const filter = dateWindow(req.query);
    const [sessions, attendance] = await Promise.all([
      TherapySession.find(filter).select('_id therapist beneficiary status duration').lean(),
      SessionAttendance.find({ scheduledDate: filter.date })
        .select('sessionId status billable')
        .lean(),
    ]);
    const byTherapist = util.summarizeByTherapist(sessions, util.indexAttendance(attendance));
    const ids = Object.keys(byTherapist).filter(id => mongoose.isValidObjectId(id));
    const emps = ids.length
      ? await Employee.find({ _id: { $in: ids } })
          .select('firstName_ar lastName_ar employee_code')
          .lean()
      : [];
    const eMap = new Map(emps.map(e => [String(e._id), e]));
    const esc = v =>
      v == null
        ? ''
        : /[",\n\r]/.test(String(v))
          ? '"' + String(v).replace(/"/g, '""') + '"'
          : String(v);
    const header = [
      'therapistId',
      'employeeCode',
      'name',
      'sessionsScheduled',
      'sessionsCompleted',
      'billableMinutes',
      'noShowsOnCaseload',
      'uniqueBeneficiaries',
      'completionRate',
      'utilizationRate',
    ];
    const rows = Object.entries(byTherapist).map(([id, s]) => {
      const e = eMap.get(id);
      return [
        id,
        e?.employee_code || '',
        e ? [e.firstName_ar, e.lastName_ar].filter(Boolean).join(' ') : '',
        s.sessionsScheduled,
        s.sessionsCompleted,
        s.billableMinutes,
        s.noShowsOnCaseload,
        s.uniqueBeneficiaries,
        s.completionRate,
        util.utilizationRate(s),
      ]
        .map(esc)
        .join(',');
    });
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="utilization-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'utilization.export');
  }
});

module.exports = router;

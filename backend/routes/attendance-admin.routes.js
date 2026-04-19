/**
 * attendance-admin.routes.js — Session attendance admin surface.
 *
 * Mount at /api/admin/attendance.
 *
 * Endpoints:
 *   GET   /                     — list with filters + pagination
 *   GET   /today                — front-desk today view (branch-scoped)
 *   GET   /overview             — counters + no-show risk buckets
 *   GET   /beneficiary/:id      — attendance history for one beneficiary
 *   POST  /                     — mark a single session's attendance
 *   POST  /bulk                 — mark many at once (front-desk batch)
 *   PATCH /:id                  — correct an entry
 *   DELETE /:id
 *   GET   /export.csv           — UTF-8-BOM CSV audit export
 *
 * All routes authenticated. Receptionist-level roles can mark
 * attendance; corrections + deletes stay admin/manager/hr.
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const SessionAttendance = require('../models/SessionAttendance');
const Beneficiary = require('../models/Beneficiary');
const attendance = require('../services/sessionAttendanceService');
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
  'receptionist',
  'therapist',
];
const MARK_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr',
  'hr_manager',
  'receptionist',
  'therapist',
];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'hr_manager'];

const STATUSES = ['present', 'late', 'absent', 'no_show', 'cancelled'];

function buildFilter(query) {
  const filter = {};
  if (query.beneficiaryId && mongoose.isValidObjectId(query.beneficiaryId)) {
    filter.beneficiaryId = query.beneficiaryId;
  }
  if (query.therapistId && mongoose.isValidObjectId(query.therapistId)) {
    filter.therapistId = query.therapistId;
  }
  if (query.branchId && mongoose.isValidObjectId(query.branchId)) {
    filter.branchId = query.branchId;
  }
  if (query.status && STATUSES.includes(String(query.status))) {
    filter.status = String(query.status);
  }
  if (query.from || query.to) {
    filter.scheduledDate = {};
    if (query.from) filter.scheduledDate.$gte = new Date(query.from);
    if (query.to) {
      const d = new Date(query.to);
      d.setHours(23, 59, 59, 999);
      filter.scheduledDate.$lte = d;
    }
  }
  return filter;
}

// ── GET / — paginated list ──────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      SessionAttendance.find(filter)
        .sort({ scheduledDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      SessionAttendance.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'attendance.list');
  }
});

// ── GET /today — front-desk view ────────────────────────────────────────
router.get('/today', requireRole(READ_ROLES), async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const filter = { scheduledDate: { $gte: start, $lte: end } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const items = await SessionAttendance.find(filter).sort({ scheduledDate: 1 }).lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'attendance.today');
  }
});

// ── GET /overview — counters + no-show risk ────────────────────────────
router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const windowDays = attendance.THRESHOLDS.windowDays;
    const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const records = await SessionAttendance.find({ scheduledDate: { $gte: windowStart } }).lean();
    const summary = attendance.summarize(records, { windowStart });
    const grouped = attendance.groupByBeneficiary(records);
    const buckets = attendance.bucketByNoShowRisk(grouped);

    // Hydrate names for the watchlists so the UI doesn't n+1.
    const ids = [...buckets.attention, ...buckets.critical]
      .map(e => e.beneficiaryId)
      .filter(id => mongoose.isValidObjectId(id));
    const benefs = ids.length
      ? await Beneficiary.find({ _id: { $in: ids } })
          .select('firstName_ar lastName_ar beneficiaryNumber')
          .lean()
      : [];
    const benefMap = new Map(benefs.map(b => [String(b._id), b]));
    const hydrate = entry => ({
      ...entry,
      name:
        [
          benefMap.get(entry.beneficiaryId)?.firstName_ar,
          benefMap.get(entry.beneficiaryId)?.lastName_ar,
        ]
          .filter(Boolean)
          .join(' ') || '—',
      beneficiaryNumber: benefMap.get(entry.beneficiaryId)?.beneficiaryNumber || null,
    });

    res.json({
      success: true,
      windowDays,
      summary,
      attention: buckets.attention.map(hydrate),
      critical: buckets.critical.map(hydrate),
    });
  } catch (err) {
    return safeError(res, err, 'attendance.overview');
  }
});

// ── GET /beneficiary/:id — history ─────────────────────────────────────
router.get('/beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await SessionAttendance.find({ beneficiaryId: req.params.id })
      .sort({ scheduledDate: -1 })
      .limit(500)
      .lean();
    const summary = attendance.summarize(items);
    res.json({ success: true, items, count: items.length, summary });
  } catch (err) {
    return safeError(res, err, 'attendance.byBeneficiary');
  }
});

// ── POST / — mark attendance ────────────────────────────────────────────
router.post('/', requireRole(MARK_ROLES), async (req, res) => {
  try {
    const { sessionId, beneficiaryId, status } = req.body || {};
    if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ success: false, message: 'sessionId مطلوب' });
    }
    if (!beneficiaryId || !mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!STATUSES.includes(String(status))) {
      return res.status(400).json({
        success: false,
        message: `status يجب أن يكون: ${STATUSES.join(' | ')}`,
      });
    }
    if (['absent', 'no_show', 'cancelled'].includes(status) && !req.body?.reason?.trim()) {
      return res.status(400).json({ success: false, message: 'reason مطلوب للحالات غير الحضور' });
    }

    // Upsert: one attendance per session.
    const row = await SessionAttendance.findOneAndUpdate(
      { sessionId },
      {
        ...req.body,
        sessionId,
        beneficiaryId,
        status,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : new Date(),
        markedBy: req.user?.id,
        markedAt: new Date(),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'attendance.mark');
  }
});

// ── POST /bulk — mark many ──────────────────────────────────────────────
router.post('/bulk', requireRole(MARK_ROLES), async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'items مطلوبة (مصفوفة)' });
    }
    const results = [];
    for (const it of items) {
      if (!mongoose.isValidObjectId(it.sessionId)) {
        results.push({ sessionId: it.sessionId, ok: false, message: 'sessionId غير صالح' });
        continue;
      }
      if (!STATUSES.includes(String(it.status))) {
        results.push({ sessionId: it.sessionId, ok: false, message: 'status غير صالح' });
        continue;
      }
      const row = await SessionAttendance.findOneAndUpdate(
        { sessionId: it.sessionId },
        {
          ...it,
          scheduledDate: it.scheduledDate ? new Date(it.scheduledDate) : new Date(),
          markedBy: req.user?.id,
          markedAt: new Date(),
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      results.push({ sessionId: String(it.sessionId), ok: true, id: row._id });
    }
    res.json({ success: true, results, count: results.length });
  } catch (err) {
    return safeError(res, err, 'attendance.bulk');
  }
});

// ── PATCH /:id — correct an entry ──────────────────────────────────────
router.patch('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const body = { ...(req.body || {}) };
    // Don't let PATCH change what session this row belongs to.
    delete body.sessionId;
    delete body.beneficiaryId;
    if (body.scheduledDate) body.scheduledDate = new Date(body.scheduledDate);
    const row = await SessionAttendance.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'attendance.patch');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────
router.delete('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SessionAttendance.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'attendance.delete');
  }
});

// ── GET /export.csv ─────────────────────────────────────────────────────
router.get('/export.csv', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const EXPORT_LIMIT = 10_000;
    const totalMatching = await SessionAttendance.countDocuments(filter);
    const items = await SessionAttendance.find(filter)
      .sort({ scheduledDate: -1 })
      .limit(EXPORT_LIMIT)
      .lean();
    res.set('X-Total-Count', String(totalMatching));
    if (totalMatching > EXPORT_LIMIT) {
      res.set('X-Truncated', 'true');
      res.set('X-Truncated-At', String(EXPORT_LIMIT));
    }

    // Hydrate beneficiary names so the sheet is readable offline.
    const benefIds = [...new Set(items.map(r => String(r.beneficiaryId)).filter(Boolean))];
    const benefs = benefIds.length
      ? await Beneficiary.find({ _id: { $in: benefIds } })
          .select('firstName_ar lastName_ar beneficiaryNumber')
          .lean()
      : [];
    const benefMap = new Map(benefs.map(b => [String(b._id), b]));

    const csvEscape = v => {
      if (v == null) return '';
      const s = String(v);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const header = [
      'scheduledDate',
      'beneficiaryNumber',
      'beneficiaryName',
      'status',
      'checkInTime',
      'checkOutTime',
      'billable',
      'reason',
      'notes',
    ];
    const rows = items.map(r => {
      const b = benefMap.get(String(r.beneficiaryId));
      return [
        r.scheduledDate?.toISOString()?.slice(0, 10),
        b?.beneficiaryNumber || '',
        b ? [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ') : '',
        r.status,
        r.checkInTime?.toISOString() || '',
        r.checkOutTime?.toISOString() || '',
        r.billable,
        r.reason || '',
        r.notes || '',
      ]
        .map(csvEscape)
        .join(',');
    });
    const body = '\uFEFF' + header.join(',') + '\n' + rows.join('\n') + '\n';
    const filename = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'attendance.export');
  }
});

module.exports = router;

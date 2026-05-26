'use strict';

/**
 * beneficiary-day-attendance.routes.js — Wave 174.
 *
 * Daily rollcall surface for day-rehabilitation centers.
 * Mounts under both /api/beneficiary-day-attendance and /api/v1/...
 * via dualMountAuth.
 *
 * One row per (beneficiaryId, date). Distinct from:
 *  • /api/admin/attendance (session-level, SessionAttendance model)
 *  • /api/hr-attendance (employees only)
 *
 * Endpoints:
 *   GET    /                  — list with filters (date/classroom/status) + pagination
 *   GET    /today             — today's rollcall (default date = today)
 *   GET    /summary           — counts by status for a given date
 *   POST   /check-in          — mark a beneficiary present (sets checkInTime)
 *   POST   /check-out         — set checkOutTime
 *   POST   /mark              — set status (absent/late/excused/sent_home) with reason
 *   POST   /bulk              — mark many at once (bus arrival batch)
 *   PATCH  /:id               — correct a row
 *   DELETE /:id
 *   GET    /export.csv        — UTF-8-BOM export
 */

const express = require('express');
const router = express.Router();
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const BeneficiaryDayAttendance = require('../models/BeneficiaryDayAttendance');
const Beneficiary = require('../models/Beneficiary');
const BeneficiarySection = require('../models/BeneficiarySection');
const safeError = require('../utils/safeError');
const { escapeFormulaInjection } = require('../services/importExport/format-helpers');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

/**
 * Lookup the active section a beneficiary is enrolled in.
 * Returns { sectionId, classroomId } or empty object when not assigned.
 * Failures are logged but do not block check-in — auto-link is best-effort.
 */
async function findActiveSection(beneficiaryId) {
  try {
    const section = await BeneficiarySection.findOne({
      beneficiaryIds: beneficiaryId,
      status: 'active',
    })
      .select('_id classroomId')
      .lean();
    if (!section) return {};
    const out = { sectionId: section._id };
    if (section.classroomId) out.classroomId = section.classroomId;
    return out;
  } catch {
    return {};
  }
}

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
  'teacher',
];
const MARK_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'receptionist',
  'therapist',
  'teacher',
];
const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager'];

const STATUSES = ['present', 'absent', 'late', 'excused', 'sent_home'];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function buildFilter(query) {
  const filter = {};
  if (query.beneficiaryId && mongoose.isValidObjectId(query.beneficiaryId)) {
    filter.beneficiaryId = query.beneficiaryId;
  }
  if (query.classroomId && mongoose.isValidObjectId(query.classroomId)) {
    filter.classroomId = query.classroomId;
  }
  if (query.branchId && mongoose.isValidObjectId(query.branchId)) {
    filter.branchId = query.branchId;
  }
  if (query.status && STATUSES.includes(String(query.status))) {
    filter.status = String(query.status);
  }
  if (query.date) {
    const d = new Date(query.date);
    filter.date = { $gte: startOfDay(d), $lte: endOfDay(d) };
  } else if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = startOfDay(new Date(query.from));
    if (query.to) filter.date.$lte = endOfDay(new Date(query.to));
  }
  return filter;
}

async function hydrateBeneficiaries(items) {
  const ids = [...new Set(items.map(r => String(r.beneficiaryId)).filter(Boolean))].filter(id =>
    mongoose.isValidObjectId(id)
  );
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber classroomId')
        .lean()
    : [];
  const benefMap = new Map(benefs.map(b => [String(b._id), b]));
  return items.map(r => ({
    ...r,
    beneficiary: benefMap.get(String(r.beneficiaryId)) || null,
  }));
}

// ── GET / — paginated list ─────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const [rawItems, total] = await Promise.all([
      BeneficiaryDayAttendance.find(filter)
        .sort({ date: -1, checkInTime: 1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      BeneficiaryDayAttendance.countDocuments(filter),
    ]);
    const items = await hydrateBeneficiaries(rawItems);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'dayAttendance.list');
  }
});

// ── GET /today — front-desk rollcall ───────────────────────────────────
router.get('/today', requireRole(READ_ROLES), async (req, res) => {
  try {
    const dateParam = req.query.date ? new Date(req.query.date) : new Date();
    const filter = { date: { $gte: startOfDay(dateParam), $lte: endOfDay(dateParam) } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.classroomId && mongoose.isValidObjectId(req.query.classroomId)) {
      filter.classroomId = req.query.classroomId;
    }
    const rawItems = await BeneficiaryDayAttendance.find(filter)
      .sort({ classroomId: 1, checkInTime: 1 })
      .lean();
    const items = await hydrateBeneficiaries(rawItems);
    res.json({ success: true, items, count: items.length, date: startOfDay(dateParam) });
  } catch (err) {
    return safeError(res, err, 'dayAttendance.today');
  }
});

// ── GET /summary — counts by status for a given date ───────────────────
router.get('/summary', requireRole(READ_ROLES), async (req, res) => {
  try {
    const dateParam = req.query.date ? new Date(req.query.date) : new Date();
    const match = { date: { $gte: startOfDay(dateParam), $lte: endOfDay(dateParam) } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      match.branchId = new mongoose.Types.ObjectId(req.query.branchId);
    }
    const rows = await BeneficiaryDayAttendance.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const summary = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let total = 0;
    for (const r of rows) {
      summary[r._id] = r.count;
      total += r.count;
    }
    res.json({ success: true, date: startOfDay(dateParam), total, summary });
  } catch (err) {
    return safeError(res, err, 'dayAttendance.summary');
  }
});

// ── POST /check-in ─────────────────────────────────────────────────────
router.post('/check-in', requireRole(MARK_ROLES), async (req, res) => {
  try {
    const { beneficiaryId, classroomId, branchId, arrivedByBus, busRouteId, notes } =
      req.body || {};
    if (!beneficiaryId || !mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const date = req.body?.date ? startOfDay(new Date(req.body.date)) : startOfDay(new Date());
    const now = new Date();
    const update = {
      beneficiaryId,
      date,
      status: 'present',
      checkInTime: now,
      markedBy: req.user?.id,
      markedAt: now,
    };
    if (classroomId && mongoose.isValidObjectId(classroomId)) update.classroomId = classroomId;
    if (branchId && mongoose.isValidObjectId(branchId)) update.branchId = branchId;
    if (typeof arrivedByBus === 'boolean') update.arrivedByBus = arrivedByBus;
    if (busRouteId && mongoose.isValidObjectId(busRouteId)) update.busRouteId = busRouteId;
    if (notes) update.notes = String(notes).slice(0, 500);

    // Auto-link: if caller didn't pass classroomId, look up active section enrollment.
    if (!update.classroomId) {
      const auto = await findActiveSection(beneficiaryId);
      if (auto.classroomId) update.classroomId = auto.classroomId;
    }

    const row = await BeneficiaryDayAttendance.findOneAndUpdate({ beneficiaryId, date }, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'dayAttendance.checkIn');
  }
});

// ── POST /check-out ────────────────────────────────────────────────────
router.post('/check-out', requireRole(MARK_ROLES), async (req, res) => {
  try {
    const { beneficiaryId, departedByBus, notes } = req.body || {};
    if (!beneficiaryId || !mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const date = req.body?.date ? startOfDay(new Date(req.body.date)) : startOfDay(new Date());
    const update = {
      checkOutTime: new Date(),
      markedBy: req.user?.id,
      markedAt: new Date(),
    };
    if (typeof departedByBus === 'boolean') update.departedByBus = departedByBus;
    if (notes) update.notes = String(notes).slice(0, 500);

    const row = await BeneficiaryDayAttendance.findOneAndUpdate({ beneficiaryId, date }, update, {
      new: true,
    });
    if (!row) {
      return res
        .status(404)
        .json({ success: false, message: 'لا يوجد سجل حضور لهذا اليوم — لم يتم تسجيل الوصول' });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'dayAttendance.checkOut');
  }
});

// ── POST /mark — set status (absent/late/excused/sent_home) ───────────
router.post('/mark', requireRole(MARK_ROLES), async (req, res) => {
  try {
    const { beneficiaryId, status, notes, classroomId, branchId } = req.body || {};
    if (!beneficiaryId || !mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!STATUSES.includes(String(status))) {
      return res
        .status(400)
        .json({ success: false, message: `status يجب أن يكون: ${STATUSES.join(' | ')}` });
    }
    if (['absent', 'excused', 'sent_home'].includes(status) && !String(notes || '').trim()) {
      return res.status(400).json({ success: false, message: 'السبب مطلوب لهذه الحالة' });
    }
    const date = req.body?.date ? startOfDay(new Date(req.body.date)) : startOfDay(new Date());
    const update = {
      beneficiaryId,
      date,
      status,
      markedBy: req.user?.id,
      markedAt: new Date(),
    };
    if (notes) update.notes = String(notes).slice(0, 500);
    if (classroomId && mongoose.isValidObjectId(classroomId)) update.classroomId = classroomId;
    if (branchId && mongoose.isValidObjectId(branchId)) update.branchId = branchId;
    if (status === 'late') update.checkInTime = new Date();

    const row = await BeneficiaryDayAttendance.findOneAndUpdate({ beneficiaryId, date }, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'dayAttendance.mark');
  }
});

// ── POST /bulk — mark many ─────────────────────────────────────────────
router.post('/bulk', requireRole(MARK_ROLES), async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'items مطلوبة (مصفوفة)' });
    }
    const results = [];
    for (const it of items) {
      if (!mongoose.isValidObjectId(it.beneficiaryId)) {
        results.push({
          beneficiaryId: it.beneficiaryId,
          ok: false,
          message: 'beneficiaryId غير صالح',
        });
        continue;
      }
      if (!STATUSES.includes(String(it.status))) {
        results.push({ beneficiaryId: it.beneficiaryId, ok: false, message: 'status غير صالح' });
        continue;
      }
      const date = it.date ? startOfDay(new Date(it.date)) : startOfDay(new Date());
      const update = {
        beneficiaryId: it.beneficiaryId,
        date,
        status: it.status,
        markedBy: req.user?.id,
        markedAt: new Date(),
      };
      if (it.classroomId && mongoose.isValidObjectId(it.classroomId))
        update.classroomId = it.classroomId;
      if (it.branchId && mongoose.isValidObjectId(it.branchId)) update.branchId = it.branchId;
      if (typeof it.arrivedByBus === 'boolean') update.arrivedByBus = it.arrivedByBus;
      if (it.notes) update.notes = String(it.notes).slice(0, 500);
      if (it.status === 'present') update.checkInTime = new Date();

      const row = await BeneficiaryDayAttendance.findOneAndUpdate(
        { beneficiaryId: it.beneficiaryId, date },
        update,
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      results.push({ beneficiaryId: String(it.beneficiaryId), ok: true, id: row._id });
    }
    res.json({ success: true, results, count: results.length });
  } catch (err) {
    return safeError(res, err, 'dayAttendance.bulk');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────────
router.patch('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const body = { ...(req.body || {}) };
    delete body.beneficiaryId;
    delete body.date;
    if (body.checkInTime) body.checkInTime = new Date(body.checkInTime);
    if (body.checkOutTime) body.checkOutTime = new Date(body.checkOutTime);
    const row = await BeneficiaryDayAttendance.findByIdAndUpdate(req.params.id, body, {
      new: true,
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'dayAttendance.patch');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────
router.delete('/:id', requireRole(ADMIN_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await BeneficiaryDayAttendance.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'dayAttendance.delete');
  }
});

// ── GET /export.csv ────────────────────────────────────────────────────
router.get('/export.csv', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const EXPORT_LIMIT = 10_000;
    const total = await BeneficiaryDayAttendance.countDocuments(filter);
    const items = await BeneficiaryDayAttendance.find(filter)
      .sort({ date: -1 })
      .limit(EXPORT_LIMIT)
      .lean();
    res.set('X-Total-Count', String(total));
    if (total > EXPORT_LIMIT) {
      res.set('X-Truncated', 'true');
      res.set('X-Truncated-At', String(EXPORT_LIMIT));
    }

    const hydrated = await hydrateBeneficiaries(items);
    const csvEscape = v => {
      if (v == null) return '';
      // Defang formula triggers (W423 doctrine) — beneficiaryName +
      // notes columns below carry user-influenced text that would
      // otherwise execute on open in Excel/Sheets if it started with
      // `=` / `+` / `-` / `@` / TAB / CR.
      const s = escapeFormulaInjection(String(v));
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const header = [
      'date',
      'beneficiaryNumber',
      'beneficiaryName',
      'status',
      'checkInTime',
      'checkOutTime',
      'arrivedByBus',
      'departedByBus',
      'notes',
    ];
    const rows = hydrated.map(r => {
      const b = r.beneficiary;
      return [
        r.date?.toISOString()?.slice(0, 10),
        b?.beneficiaryNumber || '',
        b ? [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ') : '',
        r.status,
        r.checkInTime?.toISOString() || '',
        r.checkOutTime?.toISOString() || '',
        r.arrivedByBus ? 'yes' : 'no',
        r.departedByBus ? 'yes' : 'no',
        r.notes || '',
      ]
        .map(csvEscape)
        .join(',');
    });
    const body = '﻿' + header.join(',') + '\n' + rows.join('\n') + '\n';
    const filename = `day-attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(body);
  } catch (err) {
    return safeError(res, err, 'dayAttendance.export');
  }
});

module.exports = router;

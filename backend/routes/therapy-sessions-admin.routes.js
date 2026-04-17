/**
 * therapy-sessions-admin.routes.js — real CRUD for clinical therapy sessions.
 *
 * Mount at /api/admin/therapy-sessions. Covers:
 *  • GET /            — list + filters + pagination
 *  • GET /stats       — dashboard counters (by status, by type, today, week)
 *  • GET /calendar    — grouped by date (range-limited)
 *  • GET /:id         — single session (populate therapist + beneficiary + room)
 *  • POST /           — create (with conflict detection + recurring expansion)
 *  • PATCH /:id       — update (clinical notes, goals progress, etc.)
 *  • POST /:id/status — transition status (with history)
 *  • POST /:id/check-in — quick attendance stamp
 *  • DELETE /:id      — cancel (soft — CANCELLED_BY_CENTER + reason)
 *
 * TherapySession has no branchId → branch-scope is enforced by looking up
 * the beneficiary's branchId for non-HQ roles. HQ roles see everything.
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const TherapySession = require('../models/TherapySession');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

router.use(authenticateToken);

const STAFF_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'specialist',
  'receptionist',
  'coordinator',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'receptionist',
];
const HQ_ROLES = ['admin', 'superadmin', 'super_admin'];

const STATUS_VALUES = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED_BY_PATIENT',
  'CANCELLED_BY_CENTER',
  'NO_SHOW',
  'RESCHEDULED',
];

// ── helpers ──────────────────────────────────────────────────────────────
async function getScopedBeneficiaryIds(req) {
  if (HQ_ROLES.includes(req.user?.role) || !req.user?.branchId) return null;
  const ids = await Beneficiary.find({ branchId: req.user.branchId }).distinct('_id');
  return ids;
}

function parseDateRange(q) {
  const out = {};
  if (q.from) {
    const d = new Date(q.from);
    if (!isNaN(d)) out.$gte = d;
  }
  if (q.to) {
    const d = new Date(q.to);
    if (!isNaN(d)) {
      d.setHours(23, 59, 59, 999);
      out.$lte = d;
    }
  }
  return Object.keys(out).length ? out : null;
}

function timeToMin(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

async function findConflicts({ therapist, room, date, startTime, endTime, excludeId }) {
  if (!date || !startTime || !endTime) return [];
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  const newStart = timeToMin(startTime);
  const newEnd = timeToMin(endTime);
  if (newStart == null || newEnd == null || newEnd <= newStart) return [];

  const or = [];
  if (therapist) or.push({ therapist });
  if (room) or.push({ room });
  if (or.length === 0) return [];

  const query = {
    date: { $gte: dayStart, $lte: dayEnd },
    status: { $nin: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER', 'NO_SHOW'] },
    $or: or,
  };
  if (excludeId) query._id = { $ne: excludeId };

  const candidates = await TherapySession.find(query)
    .select('therapist room startTime endTime beneficiary title')
    .lean();
  return candidates.filter(c => {
    const s = timeToMin(c.startTime);
    const e = timeToMin(c.endTime);
    if (s == null || e == null) return false;
    return s < newEnd && e > newStart;
  });
}

// ── GET / — list ─────────────────────────────────────────────────────────
router.get('/', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { therapist, beneficiary, status, sessionType, q, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (therapist && mongoose.isValidObjectId(therapist)) filter.therapist = therapist;
    if (beneficiary && mongoose.isValidObjectId(beneficiary)) filter.beneficiary = beneficiary;
    if (status) filter.status = status;
    if (sessionType) filter.sessionType = sessionType;
    const range = parseDateRange(req.query);
    if (range) filter.date = range;
    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: rx }, { 'notes.objective': rx }, { 'notes.subjective': rx }];
    }

    const scoped = await getScopedBeneficiaryIds(req);
    if (scoped) filter.beneficiary = { $in: scoped };

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const [items, total] = await Promise.all([
      TherapySession.find(filter)
        .populate('beneficiary', 'firstName lastName firstName_ar lastName_ar beneficiaryNumber')
        .populate('therapist', 'firstName lastName fullName employeeNumber')
        .populate('room', 'name code')
        .sort({ date: -1, startTime: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      TherapySession.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'therapy-sessions.list');
  }
});

// ── GET /stats — dashboard ───────────────────────────────────────────────
router.get('/stats', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const scoped = await getScopedBeneficiaryIds(req);
    const base = scoped ? { beneficiary: { $in: scoped } } : {};
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, today, week, month, byStatus, byType, upcoming] = await Promise.all([
      TherapySession.countDocuments(base),
      TherapySession.countDocuments({ ...base, date: { $gte: todayStart, $lte: todayEnd } }),
      TherapySession.countDocuments({ ...base, date: { $gte: weekStart, $lte: todayEnd } }),
      TherapySession.countDocuments({ ...base, date: { $gte: monthStart, $lte: todayEnd } }),
      TherapySession.aggregate([
        { $match: base },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      TherapySession.aggregate([
        { $match: base },
        { $group: { _id: '$sessionType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      TherapySession.countDocuments({
        ...base,
        date: { $gte: todayStart },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] },
      }),
    ]);

    const statusMap = Object.fromEntries(byStatus.map(r => [r._id, r.count]));
    const completed = statusMap.COMPLETED || 0;
    const doneOrNo =
      (statusMap.COMPLETED || 0) + (statusMap.NO_SHOW || 0) + (statusMap.CANCELLED_BY_PATIENT || 0);
    const completionRate = doneOrNo > 0 ? Math.round((completed / doneOrNo) * 100) : null;

    res.json({
      success: true,
      total,
      today,
      week,
      month,
      upcoming,
      completionRate,
      byStatus: statusMap,
      byType: Object.fromEntries(byType.map(r => [r._id, r.count])),
    });
  } catch (err) {
    return safeError(res, err, 'therapy-sessions.stats');
  }
});

// ── GET /calendar — grouped by date ──────────────────────────────────────
router.get('/calendar', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const range = parseDateRange(req.query);
    const filter = {};
    if (range) filter.date = range;
    else {
      // Default: current month
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }
    if (req.query.therapist && mongoose.isValidObjectId(req.query.therapist)) {
      filter.therapist = req.query.therapist;
    }
    const scoped = await getScopedBeneficiaryIds(req);
    if (scoped) filter.beneficiary = { $in: scoped };

    const items = await TherapySession.find(filter)
      .populate('beneficiary', 'firstName lastName firstName_ar lastName_ar')
      .populate('therapist', 'firstName lastName fullName')
      .populate('room', 'name code')
      .sort({ date: 1, startTime: 1 })
      .limit(500)
      .lean();

    const grouped = {};
    for (const s of items) {
      const key = new Date(s.date).toISOString().slice(0, 10);
      (grouped[key] ||= []).push(s);
    }
    res.json({ success: true, items, grouped });
  } catch (err) {
    return safeError(res, err, 'therapy-sessions.calendar');
  }
});

// ── GET /:id — single ────────────────────────────────────────────────────
router.get('/:id', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const doc = await TherapySession.findById(req.params.id)
      .populate(
        'beneficiary',
        'firstName lastName firstName_ar lastName_ar beneficiaryNumber branchId'
      )
      .populate('therapist', 'firstName lastName fullName employeeNumber')
      .populate('room', 'name code')
      .populate('createdBy', 'firstName lastName fullName')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });

    if (
      !HQ_ROLES.includes(req.user?.role) &&
      req.user?.branchId &&
      doc.beneficiary?.branchId &&
      String(doc.beneficiary.branchId) !== String(req.user.branchId)
    ) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'therapy-sessions.getOne');
  }
});

// ── POST /conflicts — pre-check before create/update ─────────────────────
router.post('/conflicts', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { therapist, room, date, startTime, endTime, excludeId } = req.body || {};
    const conflicts = await findConflicts({ therapist, room, date, startTime, endTime, excludeId });
    res.json({ success: true, hasConflicts: conflicts.length > 0, conflicts });
  } catch (err) {
    return safeError(res, err, 'therapy-sessions.conflicts');
  }
});

// ── POST / — create (with optional recurrence expansion) ─────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.date) return res.status(400).json({ success: false, message: 'تاريخ الجلسة مطلوب' });
    body.createdBy = req.user?.id;

    // Conflict detection (force option to override)
    if (!body.force) {
      const conflicts = await findConflicts({
        therapist: body.therapist,
        room: body.room,
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
      });
      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'يوجد تعارض في الجدولة',
          conflicts,
        });
      }
    }
    delete body.force;

    // Create parent + recurring children
    const parent = await TherapySession.create(body);
    const created = [parent];

    if (body.recurrence && body.recurrence !== 'none' && body.recurrenceEnd) {
      const stepDays = {
        daily: 1,
        weekly: 7,
        biweekly: 14,
        monthly: 30,
      }[body.recurrence];
      if (stepDays) {
        const endDate = new Date(body.recurrenceEnd);
        const cursor = new Date(body.date);
        cursor.setDate(cursor.getDate() + stepDays);
        let safety = 0;
        while (cursor <= endDate && safety < 100) {
          safety++;
          const child = await TherapySession.create({
            ...body,
            date: new Date(cursor),
            recurrenceParent: parent._id,
            status: 'SCHEDULED',
          });
          created.push(child);
          cursor.setDate(cursor.getDate() + stepDays);
        }
      }
    }

    logger.info('[therapy-sessions] created', {
      id: parent._id.toString(),
      recurring: created.length - 1,
      by: req.user?.id,
    });
    res.status(201).json({
      success: true,
      data: parent,
      recurringCreated: created.length - 1,
      message: `تم إنشاء الجلسة${created.length > 1 ? ` + ${created.length - 1} جلسة متكررة` : ''}`,
    });
  } catch (err) {
    if (err?.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    return safeError(res, err, 'therapy-sessions.create');
  }
});

// ── PATCH /:id — update ──────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const body = { ...req.body };
    delete body._id;
    delete body.createdBy;
    delete body.statusHistory;

    // Conflict re-check if scheduling fields touched
    if (
      !body.force &&
      (body.date || body.startTime || body.endTime || body.therapist || body.room)
    ) {
      const current = await TherapySession.findById(req.params.id).lean();
      if (current) {
        const conflicts = await findConflicts({
          therapist: body.therapist || current.therapist,
          room: body.room || current.room,
          date: body.date || current.date,
          startTime: body.startTime || current.startTime,
          endTime: body.endTime || current.endTime,
          excludeId: req.params.id,
        });
        if (conflicts.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'يوجد تعارض في الجدولة',
            conflicts,
          });
        }
      }
    }
    delete body.force;

    const doc = await TherapySession.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    logger.info('[therapy-sessions] updated', { id: req.params.id, by: req.user?.id });
    res.json({ success: true, data: doc, message: 'تم التحديث' });
  } catch (err) {
    if (err?.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    return safeError(res, err, 'therapy-sessions.update');
  }
});

// ── POST /:id/status — status transition ─────────────────────────────────
router.post('/:id/status', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { status, reason } = req.body || {};
    if (!STATUS_VALUES.includes(status))
      return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
    const doc = await TherapySession.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    const from = doc.status;
    if (from === status) return res.json({ success: true, data: doc, message: 'لا تغيير' });
    doc.status = status;
    if (status === 'CANCELLED_BY_CENTER' || status === 'CANCELLED_BY_PATIENT') {
      doc.cancellationReason = reason || doc.cancellationReason;
    }
    if (status === 'NO_SHOW') doc.noShowReason = reason || doc.noShowReason;
    doc.statusHistory = doc.statusHistory || [];
    doc.statusHistory.push({
      from,
      to: status,
      changedBy: req.user?.id,
      changedAt: new Date(),
      reason: reason || '',
    });
    await doc.save();
    res.json({ success: true, data: doc.toObject(), message: 'تم تحديث الحالة' });
  } catch (err) {
    return safeError(res, err, 'therapy-sessions.status');
  }
});

// ── POST /:id/check-in — quick attendance stamp ──────────────────────────
router.post('/:id/check-in', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { arrivalTime, lateMinutes } = req.body || {};
    const now = new Date();
    const arrival =
      arrivalTime ||
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const doc = await TherapySession.findByIdAndUpdate(
      req.params.id,
      {
        'attendance.isPresent': true,
        'attendance.arrivalTime': arrival,
        'attendance.lateMinutes': typeof lateMinutes === 'number' ? lateMinutes : 0,
        status: 'IN_PROGRESS',
      },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc, message: 'تم تسجيل الحضور' });
  } catch (err) {
    return safeError(res, err, 'therapy-sessions.checkin');
  }
});

// ── DELETE /:id — soft cancel ────────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await TherapySession.findByIdAndUpdate(
      req.params.id,
      {
        status: 'CANCELLED_BY_CENTER',
        cancellationReason: req.body?.reason || req.query?.reason || 'ملغاة من المركز',
        $push: {
          statusHistory: {
            to: 'CANCELLED_BY_CENTER',
            changedBy: req.user?.id,
            changedAt: new Date(),
            reason: req.body?.reason || req.query?.reason || 'ملغاة من المركز',
          },
        },
      },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, message: 'تم إلغاء الجلسة' });
  } catch (err) {
    return safeError(res, err, 'therapy-sessions.cancel');
  }
});

module.exports = router;

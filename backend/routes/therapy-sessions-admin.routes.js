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
const logPiiAccess = require('../middleware/piiAccess.middleware');

// BC-04: ABAC for session note amendment window (24h, same signer)
const { PolicyDecisionPoint } = require('../authorization/abac/policy-decision-point');
const policies = require('../authorization/abac/policies');
const { subjectFromReq } = require('../authorization/abac/policy-enforcement-point');

const sessionNotePdp = new PolicyDecisionPoint(policies);

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
    const {
      therapist,
      beneficiary,
      episodeOfCare,
      carePlan,
      status,
      sessionType,
      q,
      page = 1,
      limit = 25,
    } = req.query;
    const filter = {};
    if (therapist && mongoose.isValidObjectId(therapist)) filter.therapist = therapist;
    if (beneficiary && mongoose.isValidObjectId(beneficiary)) filter.beneficiary = beneficiary;
    if (episodeOfCare && mongoose.isValidObjectId(episodeOfCare))
      filter.episodeOfCare = episodeOfCare;
    if (carePlan && mongoose.isValidObjectId(carePlan)) filter.carePlan = carePlan;
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
        .populate('episodeOfCare', 'episodeNumber type status')
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
// PDPL Article 13: therapy sessions contain detailed clinical notes,
// goals progress, and beneficiary identifiers — log every read.
router.get('/:id', requireRole(STAFF_ROLES), logPiiAccess('TherapySession'), async (req, res) => {
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

// ── POST /:id/finalize — lock session note (BC-04) ──────────────────────────
// Marks the note as finalized and records the signing clinician + timestamp.
// Only works when noteStatus is 'draft' and session is COMPLETED.
router.post('/:id/finalize', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const session = await TherapySession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'جلسة غير موجودة' });
    if (session.noteStatus === 'finalized') {
      return res.status(409).json({ success: false, message: 'السجل محكم مسبقاً' });
    }
    session.noteStatus = 'finalized';
    session.signedAt = new Date();
    session.signedBy = req.user?.id || req.user?._id;
    session.statusHistory.push({
      from: session.status,
      to: session.status,
      changedBy: req.user?.id || req.user?._id,
      changedAt: new Date(),
      reason: 'تم إقفال السجل السريري',
    });
    await session.save();
    logger.info(`therapy-sessions: note finalised id=${session._id} by=${session.signedBy}`);
    res.json({
      success: true,
      message: 'تم إقفال السجل السريري',
      data: { noteStatus: session.noteStatus, signedAt: session.signedAt },
    });
  } catch (err) {
    return safeError(res, err, 'therapy-sessions.finalize');
  }
});

// ── POST /:id/amend — amend a finalized note (BC-04 ABAC enforcement) ─────
// ABAC policy: session-amendment-window (24h window, same signer only).
// Outside the window → 403 (supervisor override via X-Override-Approval header in future phase).
router.post('/:id/amend', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const session = await TherapySession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'جلسة غير موجودة' });
    if (session.noteStatus !== 'finalized') {
      return res.status(400).json({ success: false, message: 'السجل ليس محكماً — عدّله مباشرة' });
    }

    const { reason, changes } = req.body;
    if (!reason?.trim()) {
      return res.status(422).json({ success: false, message: 'سبب التعديل مطلوب (reason)' });
    }
    if (!Array.isArray(changes) || changes.length === 0) {
      return res
        .status(422)
        .json({ success: false, message: 'حقل changes مطلوب ولا يجوز أن يكون فارغاً' });
    }

    // ABAC evaluation
    const subject = subjectFromReq(req);
    const resource = {
      type: 'SessionNote',
      id: session._id.toString(),
      status: session.noteStatus,
      signedAt: session.signedAt,
      signedBy: session.signedBy?.toString(),
    };
    const decision = sessionNotePdp.evaluate({
      subject,
      action: 'amend',
      resource,
      env: { time: new Date() },
    });

    if (decision.effect === 'deny') {
      logger.warn(
        `therapy-sessions: amend denied id=${session._id} user=${subject.userId} reason=${decision.reason}`
      );
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        reason: decision.reason,
        policy: decision.denyingPolicy,
      });
    }

    // Apply changes
    const amendmentFields = [];
    for (const change of changes) {
      const { field, newValue } = change;
      if (!field) continue;
      const parts = field.split('.');
      let oldValue;
      // Support dot-path access one level deep (e.g. notes.subjective)
      if (parts.length === 2) {
        oldValue = session[parts[0]]?.[parts[1]];
        if (session[parts[0]] !== undefined) {
          session[parts[0]][parts[1]] = newValue;
        }
      } else {
        oldValue = session[field];
        session[field] = newValue;
      }
      amendmentFields.push({ field, oldValue, newValue });
    }

    session.amendments.push({
      amendedBy: req.user?.id || req.user?._id,
      amendedAt: new Date(),
      reason,
      fields: amendmentFields,
    });

    // Keep noteStatus finalized after amendment
    await session.save();
    logger.info(
      `therapy-sessions: note amended id=${session._id} by=${subject.userId} fields=${amendmentFields.map(f => f.field).join(',')}`
    );
    res.json({
      success: true,
      message: 'تم تسجيل التعديل على السجل السريري',
      data: { amendmentsCount: session.amendments.length },
    });
  } catch (err) {
    return safeError(res, err, 'therapy-sessions.amend');
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

// ── POST /bulk-create-claims — month-end batch driver ──────────────────────
//
// Body:
//   { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', dryRun?, maxBatch? }
//
// Behavior:
//   • Finds COMPLETED sessions in [from, to] (branch-scoped for non-HQ).
//   • For each session that doesn't already have a NphiesClaim, runs the
//     bridge (which auto-resolves price from the tariff table).
//   • Returns a structured report — see services/bulkSessionClaims.js.
//   • DRY-RUN: returns the same shape but `created[].claimId` is null and
//     nothing is written to Mongo.
//
// Hard cap: 500 sessions per call. Use multiple windows for larger ranges.
router.post('/bulk-create-claims', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { from, to, dryRun, maxBatch } = req.body || {};
    if (!from || !to) {
      return res.status(400).json({ ok: false, error: 'from_and_to_required' });
    }

    const branchBeneficiaryIds = await getScopedBeneficiaryIds(req);

    const { runBulk } = require('../services/bulkSessionClaims');
    const report = await runBulk({
      from,
      to,
      branchBeneficiaryIds,
      dryRun: dryRun === true,
      maxBatch,
    });

    if (!report.ok) {
      return res.status(400).json(report);
    }

    logger.info('bulk-create-claims completed', {
      actor: req.user?._id,
      candidateCount: report.candidateCount,
      created: report.created.length,
      skipped: report.skipped.length,
      failed: report.failed.length,
      durationMs: report.durationMs,
      dryRun: report.dryRun,
    });

    return res.status(report.dryRun ? 200 : 201).json(report);
  } catch (err) {
    return res.status(500).json(safeError(err, 'bulk create-claims failed'));
  }
});

// ── POST /:id/create-claim — bridge session into a draft NPHIES claim ────
//
// Returns 201 with the persisted draft. The caller can then submit it via
// POST /api/admin/nphies-claims/:id/submit (which has idempotency + the
// real adapter). Errors block creation; warnings are surfaced for the UI
// to highlight to the billing user but do not prevent the draft.
//
// Body (all optional):
//   { unitPrice, diagnosis: [{code, description}], cptOverride: {code, description, specialty}, dryRun }
router.post('/:id/create-claim', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, error: 'invalid_session_id' });
    }
    const { buildClaimFromSession } = require('../services/sessionToClaimBridge');
    const result = await buildClaimFromSession(req.params.id, {
      unitPrice: req.body?.unitPrice,
      diagnosis: req.body?.diagnosis,
      cptOverride: req.body?.cptOverride,
      dryRun: req.body?.dryRun === true,
    });

    if (!result.ok) {
      return res.status(422).json({
        ok: false,
        errors: result.errors,
        warnings: result.warnings,
      });
    }

    return res.status(result.dryRun ? 200 : 201).json({
      ok: true,
      claim: result.claim,
      warnings: result.warnings,
      dryRun: result.dryRun,
    });
  } catch (err) {
    return res.status(500).json(safeError(err, 'failed to bridge session into claim'));
  }
});

module.exports = router;

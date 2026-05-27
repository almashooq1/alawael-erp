/**
 * therapist-workbench.routes.js — therapist-facing workbench.
 *
 * Access model: authenticated user → Employee (email link).
 * Mount at /api/therapist-workbench.
 *
 * Endpoints:
 *   GET /me           — my employee profile
 *   GET /today        — today's assigned sessions
 *   GET /week         — this week grouped by date
 *   GET /caseload     — my distinct beneficiaries + session counts
 *   GET /session/:id  — single session (must be mine)
 *   PATCH /session/:id/notes    — update SOAP notes + goals progress
 *   POST  /session/:id/check-in — mark attendance / IN_PROGRESS
 *   POST  /session/:id/complete — COMPLETED + save notes
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const Employee = require('../models/HR/Employee');
const TherapySession = require('../models/TherapySession');
const Beneficiary = require('../models/Beneficiary');

router.use(authenticateToken);

const ALLOWED = [
  'therapist',
  'specialist',
  'clinical_supervisor',
  'admin',
  'superadmin',
  'super_admin',
];

const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin'];
const CLINICAL_SPECIALIZATIONS = [
  'pt',
  'ot',
  'speech',
  'aba',
  'psychology',
  'special_education',
  'vocational',
  'nursing',
  'medical',
];

function isAdmin(req) {
  return ADMIN_ROLES.includes(req.user?.role || '');
}

async function getMyEmployee(req) {
  if (!req.user) return null;
  const email = (req.user.email || '').toLowerCase();
  if (email) {
    const byEmail = await Employee.findOne({ email }).lean();
    if (byEmail) return byEmail;
  }
  if (req.user.employeeId && mongoose.isValidObjectId(req.user.employeeId)) {
    return Employee.findById(req.user.employeeId).lean();
  }
  return null;
}

/**
 * Resolve which Employee's data to load.
 *
 * Admins can pass `?employeeId=<id>` to inspect any clinical employee's workbench.
 * Without that param, admins fall back to their own (likely null) Employee record —
 * the caller decides whether to render an empty admin-viewer state.
 *
 * Returns `{ employee, viewerMode, viewing }`:
 *   - therapist/specialist with own Employee → viewerMode 'self'
 *   - admin with ?employeeId pointing to a real Employee → viewerMode 'admin_targeted'
 *   - admin without target → viewerMode 'admin_no_target' (employee null)
 *   - therapist with no Employee record → viewerMode 'orphan' (employee null)
 */
async function resolveTargetEmployee(req) {
  if (isAdmin(req)) {
    const wanted = req.query?.employeeId;
    if (wanted && mongoose.isValidObjectId(wanted)) {
      const target = await Employee.findById(wanted).lean();
      if (target) {
        return { employee: target, viewerMode: 'admin_targeted', viewing: target };
      }
    }
    const own = await getMyEmployee(req);
    if (own) return { employee: own, viewerMode: 'self', viewing: own };
    return { employee: null, viewerMode: 'admin_no_target', viewing: null };
  }
  const own = await getMyEmployee(req);
  if (own) return { employee: own, viewerMode: 'self', viewing: own };
  return { employee: null, viewerMode: 'orphan', viewing: null };
}

function adminViewerPayload(extras = {}) {
  return {
    success: true,
    viewerMode: 'admin_no_target',
    viewing: null,
    message: 'اختر معالجاً من القائمة لمشاهدة لوحته',
    ...extras,
  };
}

function gate(req, res, next) {
  const role = req.user?.role || '';
  if (!ALLOWED.includes(role))
    return res
      .status(403)
      .json({ success: false, message: 'الوصول مقتصر على المعالجين والمختصين' });
  next();
}
router.use(gate);

// ── GET /therapists — admin picker source ────────────────────────────────
router.get('/therapists', async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'متاح للمسؤولين فقط' });
    }
    const items = await Employee.find({
      status: { $ne: 'inactive' },
      specialization: { $in: CLINICAL_SPECIALIZATIONS },
    })
      .select('_id name_ar name_en specialization email')
      .sort({ name_ar: 1 })
      .lean();
    res.json({ success: true, items, total: items.length });
  } catch (err) {
    return safeError(res, err, 'therapist.therapists');
  }
});

async function assertMySession(req, id) {
  if (!mongoose.isValidObjectId(id)) return { ok: false, status: 400, msg: 'معرّف غير صالح' };
  const session = await TherapySession.findById(id);
  if (!session) return { ok: false, status: 404, msg: 'الجلسة غير موجودة' };
  if (['admin', 'superadmin', 'super_admin'].includes(req.user?.role)) return { ok: true, session };
  const me = await getMyEmployee(req);
  if (!me) return { ok: false, status: 403, msg: 'لا يوجد سجل موظف مرتبط بحسابك' };
  if (String(session.therapist) !== String(me._id))
    return { ok: false, status: 403, msg: 'هذه الجلسة ليست من ضمن جلساتك' };
  return { ok: true, session, me };
}

// ── GET /me ──────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const { employee, viewerMode, viewing } = await resolveTargetEmployee(req);
    if (!employee) {
      if (viewerMode === 'admin_no_target') {
        return res.json(adminViewerPayload({ data: null }));
      }
      return res
        .status(404)
        .json({ success: false, message: 'لا يوجد سجل موظف مرتبط — تواصل مع الإدارة' });
    }
    res.json({ success: true, data: employee, viewerMode, viewing });
  } catch (err) {
    return safeError(res, err, 'therapist.me');
  }
});

// ── GET /today ───────────────────────────────────────────────────────────
router.get('/today', async (req, res) => {
  try {
    const { employee, viewerMode, viewing } = await resolveTargetEmployee(req);
    if (!employee) {
      if (viewerMode === 'admin_no_target') {
        return res.json(
          adminViewerPayload({
            items: [],
            totals: { total: 0, completed: 0, inProgress: 0, upcoming: 0 },
          })
        );
      }
      return res.status(404).json({ success: false, message: 'لا يوجد سجل موظف مرتبط' });
    }
    const s = new Date();
    s.setHours(0, 0, 0, 0);
    const e = new Date();
    e.setHours(23, 59, 59, 999);
    const items = await TherapySession.find({
      therapist: employee._id,
      date: { $gte: s, $lte: e },
    })
      .populate('beneficiary', 'firstName lastName firstName_ar lastName_ar beneficiaryNumber')
      .populate('room', 'name')
      .sort({ startTime: 1 })
      .lean();

    const totals = {
      total: items.length,
      completed: items.filter(x => x.status === 'COMPLETED').length,
      inProgress: items.filter(x => x.status === 'IN_PROGRESS').length,
      upcoming: items.filter(x => ['SCHEDULED', 'CONFIRMED'].includes(x.status)).length,
    };
    res.json({ success: true, items, totals, viewerMode, viewing });
  } catch (err) {
    return safeError(res, err, 'therapist.today');
  }
});

// ── GET /week — grouped by date ──────────────────────────────────────────
router.get('/week', async (req, res) => {
  try {
    const { employee, viewerMode, viewing } = await resolveTargetEmployee(req);
    if (!employee) {
      if (viewerMode === 'admin_no_target') {
        return res.json(adminViewerPayload({ items: [], grouped: {} }));
      }
      return res.status(404).json({ success: false, message: 'لا يوجد سجل موظف مرتبط' });
    }
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const items = await TherapySession.find({
      therapist: employee._id,
      date: { $gte: weekStart, $lt: weekEnd },
    })
      .populate('beneficiary', 'firstName lastName firstName_ar lastName_ar beneficiaryNumber')
      .populate('room', 'name')
      .sort({ date: 1, startTime: 1 })
      .lean();
    const grouped = {};
    for (const it of items) {
      const k = new Date(it.date).toISOString().slice(0, 10);
      (grouped[k] ||= []).push(it);
    }
    res.json({ success: true, items, grouped, weekStart, weekEnd, viewerMode, viewing });
  } catch (err) {
    return safeError(res, err, 'therapist.week');
  }
});

// ── GET /caseload ────────────────────────────────────────────────────────
router.get('/caseload', async (req, res) => {
  try {
    const { employee, viewerMode, viewing } = await resolveTargetEmployee(req);
    if (!employee) {
      if (viewerMode === 'admin_no_target') {
        return res.json(adminViewerPayload({ items: [], total: 0 }));
      }
      return res.status(404).json({ success: false, message: 'لا يوجد سجل موظف مرتبط' });
    }
    const agg = await TherapySession.aggregate([
      { $match: { therapist: employee._id } },
      {
        $group: {
          _id: '$beneficiary',
          sessionCount: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
          },
          upcoming: {
            $sum: {
              $cond: [{ $in: ['$status', ['SCHEDULED', 'CONFIRMED']] }, 1, 0],
            },
          },
          lastSession: { $max: '$date' },
        },
      },
      { $sort: { lastSession: -1 } },
      { $limit: 200 },
    ]);
    const ids = agg.map(r => r._id).filter(Boolean);
    const beneficiaries = await Beneficiary.find({ _id: { $in: ids } })
      .select(
        'firstName lastName firstName_ar lastName_ar beneficiaryNumber status disability.primaryType'
      )
      .lean();
    const benMap = Object.fromEntries(beneficiaries.map(b => [String(b._id), b]));
    const items = agg.map(r => ({
      beneficiary: benMap[String(r._id)] || null,
      sessionCount: r.sessionCount,
      completed: r.completed,
      upcoming: r.upcoming,
      lastSession: r.lastSession,
    }));
    res.json({ success: true, items, total: items.length, viewerMode, viewing });
  } catch (err) {
    return safeError(res, err, 'therapist.caseload');
  }
});

// ── GET /session/:id ─────────────────────────────────────────────────────
router.get('/session/:id', async (req, res) => {
  try {
    const chk = await assertMySession(req, req.params.id);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.msg });
    const populated = await TherapySession.findById(req.params.id)
      .populate(
        'beneficiary',
        'firstName lastName firstName_ar lastName_ar beneficiaryNumber dateOfBirth'
      )
      .populate('room', 'name')
      .populate('plan', 'planNumber')
      .lean();
    res.json({ success: true, data: populated });
  } catch (err) {
    return safeError(res, err, 'therapist.session');
  }
});

// ── PATCH /session/:id/notes — SOAP + goals progress ─────────────────────
router.patch('/session/:id/notes', async (req, res) => {
  try {
    const chk = await assertMySession(req, req.params.id);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.msg });
    const { notes, rating, goalsProgress } = req.body || {};
    const update = {};
    if (notes) update.notes = notes;
    if (rating != null) update.rating = rating;
    if (Array.isArray(goalsProgress)) update.goalsProgress = goalsProgress;
    const doc = await TherapySession.findByIdAndUpdate(req.params.id, update, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
    res.json({ success: true, data: doc, message: 'تم حفظ الملاحظات' });
  } catch (err) {
    return safeError(res, err, 'therapist.notes');
  }
});

// ── POST /session/:id/check-in ───────────────────────────────────────────
router.post('/session/:id/check-in', async (req, res) => {
  try {
    const chk = await assertMySession(req, req.params.id);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.msg });
    const now = new Date();
    const arrival =
      req.body?.arrivalTime ||
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const doc = await TherapySession.findByIdAndUpdate(
      req.params.id,
      {
        'attendance.isPresent': true,
        'attendance.arrivalTime': arrival,
        'attendance.lateMinutes': Number(req.body?.lateMinutes) || 0,
        status: 'IN_PROGRESS',
      },
      { returnDocument: 'after' }
    ).lean();
    res.json({ success: true, data: doc, message: 'تم تسجيل الحضور وبدء الجلسة' });
  } catch (err) {
    return safeError(res, err, 'therapist.checkIn');
  }
});

// ── POST /session/:id/complete ───────────────────────────────────────────
router.post('/session/:id/complete', async (req, res) => {
  try {
    const chk = await assertMySession(req, req.params.id);
    if (!chk.ok) return res.status(chk.status).json({ success: false, message: chk.msg });
    const session = chk.session;
    const { notes, rating, goalsProgress, departureTime } = req.body || {};
    const from = session.status;
    if (notes) session.notes = notes;
    if (rating != null) session.rating = rating;
    if (Array.isArray(goalsProgress)) session.goalsProgress = goalsProgress;
    if (departureTime) session.attendance = { ...session.attendance, departureTime };
    session.status = 'COMPLETED';
    session.statusHistory = session.statusHistory || [];
    session.statusHistory.push({
      from,
      to: 'COMPLETED',
      changedBy: req.user?.id,
      changedAt: new Date(),
      reason: 'أكملها المعالج',
    });
    await session.save();
    res.json({ success: true, data: session.toObject(), message: 'تم إنهاء الجلسة' });
  } catch (err) {
    return safeError(res, err, 'therapist.complete');
  }
});

module.exports = router;

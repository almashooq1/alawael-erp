'use strict';

/**
 * restraint-seclusion.routes.js — Wave 193b.
 *
 * Restraint & Seclusion ledger admin surface.
 * Mounted via dualMountAuth at /api/(v1/)?restraint-seclusion.
 *
 * Endpoints:
 *   GET    /today                    — today's events
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id       — per-kid history (last 50)
 *   GET    /stats                    — counts by type/injury for a range
 *   GET    /:id
 *   POST   /                         — start event (status=in_progress)
 *   POST   /:id/end                  — mark event ended, sets endTime + duration
 *   POST   /:id/notify-parent        — record parent notification
 *   POST   /:id/complete             — finalize event (requires parent + debrief)
 *   POST   /:id/review               — manager/supervisor review (immutable after)
 *   PATCH  /:id                      — correct (only when not reviewed)
 *   DELETE /:id                      — admin-only, hard-delete (audit-trail concern)
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const RSEvent = require('../models/RestraintSeclusionEvent');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
  'nurse',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
  'nurse',
];
const REVIEW_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'clinical_supervisor'];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { TYPES, STATUSES } = RSEvent;

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

async function hydrate(items) {
  const ids = [...new Set(items.map(r => String(r.beneficiaryId)).filter(Boolean))].filter(id =>
    mongoose.isValidObjectId(id)
  );
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean()
    : [];
  const map = new Map(benefs.map(b => [String(b._id), b]));
  return items.map(r => ({ ...r, beneficiary: map.get(String(r.beneficiaryId)) || null }));
}

// ── GET /today ────────────────────────────────────────────────────────
router.get('/today', requireRole(READ_ROLES), async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const filter = { date: { $gte: startOfDay(d), $lte: endOfDay(d) } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await RSEvent.find(filter).sort({ startTime: -1 }).lean();
    const items = await hydrate(raw);
    const summary = TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    let injuries = 0;
    let inProgress = 0;
    for (const r of raw) {
      summary[r.type] = (summary[r.type] || 0) + 1;
      if (r.injury) injuries++;
      if (r.status === 'in_progress') inProgress++;
    }
    res.json({
      success: true,
      items,
      count: items.length,
      summary,
      injuries,
      inProgress,
      date: startOfDay(d),
    });
  } catch (err) {
    return safeError(res, err, 'rs.today');
  }
});

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.type && TYPES.includes(String(req.query.type))) {
      filter.type = String(req.query.type);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.date.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      RSEvent.find(filter)
        .sort({ startTime: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      RSEvent.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'rs.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await RSEvent.find({ beneficiaryId: req.params.id })
      .sort({ startTime: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'rs.byBeneficiary');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await RSEvent.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'rs.get');
  }
});

// ── POST / — start event ──────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!TYPES.includes(String(body.type))) {
      return res
        .status(400)
        .json({ success: false, message: `النوع يجب أن يكون: ${TYPES.join(' | ')}` });
    }
    if (!String(body.techniqueUsed || '').trim()) {
      return res.status(400).json({ success: false, message: 'الأسلوب المستخدم مطلوب' });
    }
    if (!String(body.triggerBehavior || '').trim()) {
      return res.status(400).json({ success: false, message: 'السلوك المُحفِّز مطلوب' });
    }
    if (body.type === 'chemical' && !String(body.medicationName || '').trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'اسم الدواء مطلوب للتقييد الكيميائي' });
    }
    if (body.type === 'seclusion' && !String(body.seclusionLocation || '').trim()) {
      return res.status(400).json({ success: false, message: 'مكان العزل مطلوب' });
    }

    const startTime = body.startTime ? new Date(body.startTime) : new Date();
    const doc = await RSEvent.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      behaviorPlanId:
        body.behaviorPlanId && mongoose.isValidObjectId(body.behaviorPlanId)
          ? body.behaviorPlanId
          : null,
      date: startOfDay(startTime),
      startTime,
      type: body.type,
      techniqueUsed: String(body.techniqueUsed).trim().slice(0, 200),
      medicationName: String(body.medicationName || '')
        .trim()
        .slice(0, 100),
      seclusionLocation: String(body.seclusionLocation || '')
        .trim()
        .slice(0, 100),
      triggerBehavior: String(body.triggerBehavior).trim().slice(0, 500),
      lessRestrictiveTried: String(body.lessRestrictiveTried || '').slice(0, 500),
      staffPrimary: req.user?.id || null,
      staffPrimaryName: req.user?.name || body.staffPrimaryName || '',
      staffSupporting: Array.isArray(body.staffSupporting)
        ? body.staffSupporting.slice(0, 10).map(s => String(s).slice(0, 100))
        : [],
      status: 'in_progress',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'rs.create');
  }
});

// ── POST /:id/end — close the active event ────────────────────────────
router.post('/:id/end', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await RSEvent.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status !== 'in_progress') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن إنهاء حدث بحالة ' + row.status });
    }
    const endTime = req.body?.endTime ? new Date(req.body.endTime) : new Date();
    if (endTime < row.startTime) {
      return res
        .status(400)
        .json({ success: false, message: 'وقت النهاية يجب أن يكون بعد البداية' });
    }
    row.endTime = endTime;
    row.durationMinutes = Math.round((endTime - row.startTime) / 60000);
    if (typeof req.body?.injury === 'boolean') row.injury = req.body.injury;
    if (req.body?.injuryNotes) row.injuryNotes = String(req.body.injuryNotes).slice(0, 500);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'rs.end');
  }
});

// ── POST /:id/notify-parent ───────────────────────────────────────────
router.post('/:id/notify-parent', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const method = req.body?.method;
    if (!['phone', 'sms', 'in_person', 'whatsapp', 'email'].includes(method)) {
      return res.status(400).json({ success: false, message: 'طريقة التبليغ مطلوبة' });
    }
    const row = await RSEvent.findByIdAndUpdate(
      req.params.id,
      { parentNotifiedAt: new Date(), parentNotificationMethod: method },
      { new: true }
    );
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'rs.notifyParent');
  }
});

// ── POST /:id/complete — finalize (requires parent + debrief) ─────────
router.post('/:id/complete', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await RSEvent.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'reviewed') {
      return res.status(409).json({ success: false, message: 'السجل مراجَع — لا يمكن تعديله' });
    }
    if (!row.endTime) {
      return res.status(400).json({ success: false, message: 'يجب إنهاء الحدث أولاً (/end)' });
    }
    if (!row.parentNotifiedAt) {
      return res.status(400).json({ success: false, message: 'يجب إبلاغ ولي الأمر أولاً' });
    }
    const debriefNotes = String(req.body?.debriefNotes || '').trim();
    if (!debriefNotes) {
      return res
        .status(400)
        .json({ success: false, message: 'ملاحظات الـ debrief مطلوبة لإكمال السجل' });
    }
    row.debriefDone = true;
    row.debriefAt = new Date();
    row.debriefNotes = debriefNotes.slice(0, 1000);
    if (Array.isArray(req.body?.debriefAttendees)) {
      row.debriefAttendees = req.body.debriefAttendees
        .slice(0, 10)
        .map(s => String(s).slice(0, 100));
    }
    if (req.body?.followUpAction) {
      row.followUpAction = String(req.body.followUpAction).slice(0, 500);
    }
    row.status = 'completed';
    row.finalizedAt = new Date();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'rs.complete');
  }
});

// ── POST /:id/review — supervisor reviews + locks ─────────────────────
router.post('/:id/review', requireRole(REVIEW_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await RSEvent.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status !== 'completed') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن مراجعة سجل بحالة ' + row.status });
    }
    row.status = 'reviewed';
    row.reviewedBy = req.user?.id || null;
    row.reviewedByName = req.user?.name || req.body?.reviewedByName || '';
    row.reviewedAt = new Date();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'rs.review');
  }
});

// ── PATCH /:id — correct (NOT after review) ───────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await RSEvent.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'reviewed') {
      return res.status(409).json({ success: false, message: 'السجل مراجَع — لا يمكن تعديله' });
    }
    const body = { ...(req.body || {}) };
    delete body.beneficiaryId;
    delete body.status;
    delete body.finalizedAt;
    delete body.reviewedBy;
    delete body.reviewedByName;
    delete body.reviewedAt;
    if (body.startTime) body.startTime = new Date(body.startTime);
    if (body.endTime) body.endTime = new Date(body.endTime);
    Object.assign(row, body);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'rs.patch');
  }
});

// ── DELETE /:id — admin only (audit-trail concern) ────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await RSEvent.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'rs.delete');
  }
});

module.exports = router;

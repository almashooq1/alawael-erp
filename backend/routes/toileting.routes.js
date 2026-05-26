'use strict';

/**
 * toileting.routes.js — Wave 178.
 *
 * Endpoints (multi-event per day, NOT upsert):
 *   GET    /today                — today's events sorted by time
 *   GET    /by-beneficiary/:id   — per-kid history (paginated)
 *   GET    /summary              — per-kid counts for a date (type buckets)
 *   POST   /                     — log a new event (always creates)
 *   PATCH  /:id                  — correct
 *   DELETE /:id
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const ToiletingEvent = require('../models/ToiletingEvent');
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
  'receptionist',
  'therapist',
  'teacher',
  'nurse',
  'caregiver',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'receptionist',
  'therapist',
  'teacher',
  'caregiver',
];

const { TYPES } = ToiletingEvent;

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
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await ToiletingEvent.find(filter).sort({ eventTime: -1 }).limit(500).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length, date: startOfDay(d) });
  } catch (err) {
    return safeError(res, err, 'toileting.today');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await ToiletingEvent.find({ beneficiaryId: req.params.id })
      .sort({ eventTime: -1 })
      .limit(200)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'toileting.byBeneficiary');
  }
});

// ── GET /summary?date= — per-beneficiary type counts for one day ──────
router.get('/summary', requireRole(READ_ROLES), async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const match = { date: { $gte: startOfDay(d), $lte: endOfDay(d) } };
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      match.beneficiaryId = new mongoose.Types.ObjectId(req.query.beneficiaryId);
    }
    const rows = await ToiletingEvent.aggregate([
      { $match: match },
      {
        $group: {
          _id: { beneficiaryId: '$beneficiaryId', type: '$type' },
          count: { $sum: 1 },
        },
      },
    ]);
    res.json({ success: true, date: startOfDay(d), rows });
  } catch (err) {
    return safeError(res, err, 'toileting.summary');
  }
});

// ── POST / ──────────────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!TYPES.includes(String(body.type || ''))) {
      return res.status(400).json({
        success: false,
        message: `type يجب أن يكون: ${TYPES.join(' | ')}`,
      });
    }
    const eventTime = body.eventTime ? new Date(body.eventTime) : new Date();
    const date = startOfDay(eventTime);
    const doc = await ToiletingEvent.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      date,
      eventTime,
      type: body.type,
      wasInDiaper: body.wasInDiaper !== false,
      diaperChanged: !!body.diaperChanged,
      successful: body.successful !== false,
      notes: String(body.notes || '').slice(0, 300),
      recordedBy: req.user?.id || null,
      recordedByName: req.user?.name || body.recordedByName || '',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'toileting.create');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const body = { ...(req.body || {}) };
    delete body.beneficiaryId;
    delete body.date;
    if (body.type && !TYPES.includes(body.type)) {
      return res.status(400).json({ success: false, message: 'type غير صالح' });
    }
    const row = await ToiletingEvent.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'toileting.patch');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await ToiletingEvent.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'toileting.delete');
  }
});

module.exports = router;

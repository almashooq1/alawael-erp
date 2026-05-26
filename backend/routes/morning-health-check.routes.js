'use strict';

/**
 * morning-health-check.routes.js — Wave 177.
 *
 * Mounted via dualMountAuth at /api/(v1/)?morning-health-check.
 *
 * Endpoints:
 *   GET    /today           — today's checks (sorted by checkTime)
 *   GET    /                — list w/ filters (date/decision/beneficiary)
 *   GET    /:id
 *   POST   /                — create/upsert (one per beneficiary+day)
 *   PATCH  /:id
 *   POST   /:id/notify-parent — mark parent as notified
 *   DELETE /:id
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const MorningHealthCheck = require('../models/MorningHealthCheck');
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
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'receptionist',
  'nurse',
];

const { DECISIONS } = MorningHealthCheck;

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

// ── GET /today ─────────────────────────────────────────────────────────
router.get('/today', requireRole(READ_ROLES), async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const filter = { date: { $gte: startOfDay(d), $lte: endOfDay(d) } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.decision && DECISIONS.includes(String(req.query.decision))) {
      filter.decision = String(req.query.decision);
    }
    const raw = await MorningHealthCheck.find(filter).sort({ checkTime: -1 }).lean();
    const items = await hydrate(raw);

    // Summary tiles
    const summary = { allow: 0, observe: 0, send_home: 0, fever: 0 };
    for (const r of raw) {
      summary[r.decision] = (summary[r.decision] || 0) + 1;
      if (typeof r.temperatureC === 'number' && r.temperatureC >= 38) summary.fever += 1;
    }
    res.json({ success: true, items, count: items.length, summary, date: startOfDay(d) });
  } catch (err) {
    return safeError(res, err, 'morningCheck.today');
  }
});

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.decision && DECISIONS.includes(String(req.query.decision))) {
      filter.decision = String(req.query.decision);
    }
    if (req.query.date) {
      const d = new Date(req.query.date);
      filter.date = { $gte: startOfDay(d), $lte: endOfDay(d) };
    } else if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.date.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      MorningHealthCheck.find(filter)
        .sort({ date: -1, checkTime: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      MorningHealthCheck.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'morningCheck.list');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await MorningHealthCheck.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'morningCheck.get');
  }
});

// ── POST / — create/upsert ────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!DECISIONS.includes(String(body.decision || ''))) {
      return res.status(400).json({
        success: false,
        message: `decision يجب أن يكون: ${DECISIONS.join(' | ')}`,
      });
    }
    if (body.decision === 'send_home' && !String(body.reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'السبب مطلوب لـ "إعادة للبيت"' });
    }
    const date = body.date ? startOfDay(new Date(body.date)) : startOfDay(new Date());
    const update = {
      beneficiaryId: body.beneficiaryId,
      date,
      checkTime: new Date(),
      decision: body.decision,
      reason: body.reason || '',
      nurseId: req.user?.id || null,
      nurseName: req.user?.name || body.nurseName || '',
    };
    if (body.branchId && mongoose.isValidObjectId(body.branchId)) update.branchId = body.branchId;
    if (typeof body.temperatureC === 'number') update.temperatureC = body.temperatureC;
    if (body.mood) update.mood = body.mood;
    if (body.symptoms && typeof body.symptoms === 'object') update.symptoms = body.symptoms;
    if (Array.isArray(body.otherSymptoms)) update.otherSymptoms = body.otherSymptoms.slice(0, 20);

    const row = await MorningHealthCheck.findOneAndUpdate(
      { beneficiaryId: body.beneficiaryId, date },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'morningCheck.create');
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
    if (body.decision && !DECISIONS.includes(body.decision)) {
      return res.status(400).json({ success: false, message: 'decision غير صالح' });
    }
    if (body.decision === 'send_home' && !String(body.reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'السبب مطلوب' });
    }
    const row = await MorningHealthCheck.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'morningCheck.patch');
  }
});

// ── POST /:id/notify-parent ────────────────────────────────────────────
router.post('/:id/notify-parent', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await MorningHealthCheck.findByIdAndUpdate(
      req.params.id,
      { parentNotified: true, parentNotifiedAt: new Date() },
      { new: true }
    );
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'morningCheck.notify');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await MorningHealthCheck.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'morningCheck.delete');
  }
});

module.exports = router;

'use strict';

/**
 * beneficiary-meals.routes.js — Wave 179.
 *
 * Endpoints (4 meal slots per day, upserted per slot):
 *   GET    /today               — today's meal events
 *   GET    /by-beneficiary/:id  — per-kid history
 *   GET    /summary             — % consumed averaged per beneficiary today
 *   POST   /                    — upsert (beneficiary+date+mealType)
 *   PATCH  /:id
 *   DELETE /:id
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const MealEvent = require('../models/BeneficiaryMealEvent');
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
  'kitchen',
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
  'kitchen',
];

const { MEAL_TYPES } = MealEvent;

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

router.get('/today', requireRole(READ_ROLES), async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const filter = { date: { $gte: startOfDay(d), $lte: endOfDay(d) } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.mealType && MEAL_TYPES.includes(String(req.query.mealType))) {
      filter.mealType = String(req.query.mealType);
    }
    const raw = await MealEvent.find(filter).sort({ servedAt: 1 }).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length, date: startOfDay(d) });
  } catch (err) {
    return safeError(res, err, 'meals.today');
  }
});

router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await MealEvent.find({ beneficiaryId: req.params.id })
      .sort({ date: -1, servedAt: -1 })
      .limit(120)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'meals.byBeneficiary');
  }
});

router.get('/summary', requireRole(READ_ROLES), async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const match = { date: { $gte: startOfDay(d), $lte: endOfDay(d) } };
    const rows = await MealEvent.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$beneficiaryId',
          avgConsumed: { $avg: '$consumedPercent' },
          mealsLogged: { $sum: 1 },
          allergyIncidents: { $sum: { $cond: ['$allergyIncident', 1, 0] } },
        },
      },
    ]);
    res.json({ success: true, date: startOfDay(d), rows });
  } catch (err) {
    return safeError(res, err, 'meals.summary');
  }
});

router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!MEAL_TYPES.includes(String(body.mealType || ''))) {
      return res.status(400).json({
        success: false,
        message: `mealType يجب أن يكون: ${MEAL_TYPES.join(' | ')}`,
      });
    }
    const date = body.date ? startOfDay(new Date(body.date)) : startOfDay(new Date());
    const update = {
      beneficiaryId: body.beneficiaryId,
      date,
      mealType: body.mealType,
      servedAt: body.servedAt ? new Date(body.servedAt) : new Date(),
      menuItems: Array.isArray(body.menuItems) ? body.menuItems.slice(0, 30) : [],
      consumedPercent:
        typeof body.consumedPercent === 'number'
          ? Math.min(100, Math.max(0, body.consumedPercent))
          : null,
      refusedItems: Array.isArray(body.refusedItems) ? body.refusedItems.slice(0, 30) : [],
      allergyIncident: !!body.allergyIncident,
      notes: String(body.notes || '').slice(0, 400),
      recordedBy: req.user?.id || null,
      recordedByName: req.user?.name || body.recordedByName || '',
    };
    if (body.branchId && mongoose.isValidObjectId(body.branchId)) update.branchId = body.branchId;
    const row = await MealEvent.findOneAndUpdate(
      { beneficiaryId: body.beneficiaryId, date, mealType: body.mealType },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'meals.create');
  }
});

router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const body = { ...(req.body || {}) };
    delete body.beneficiaryId;
    delete body.date;
    delete body.mealType;
    const row = await MealEvent.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'meals.patch');
  }
});

router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await MealEvent.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'meals.delete');
  }
});

module.exports = router;

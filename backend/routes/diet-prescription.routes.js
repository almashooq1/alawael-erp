'use strict';

/**
 * diet-prescription.routes.js — Wave 368.
 *
 * Beneficiary diet-prescription surface. One active prescription per
 * beneficiary (unique index). Mounted at /api/(v1/)?diet-prescription.
 *
 * Endpoints:
 *   GET    /                        — list w/ filters
 *   GET    /by-beneficiary/:id      — singleton lookup
 *   GET    /due-review              — active + nextReviewDue passed
 *   GET    /npo-active              — currently NPO
 *   GET    /enteral-active          — currently tube-feeding
 *   GET    /stats
 *   GET    /:id
 *   POST   /                        — create (409 on dup beneficiary)
 *   POST   /:id/activate            — draft → active (gate on prescriber + iddsi)
 *   POST   /:id/start-npo
 *   POST   /:id/end-npo
 *   POST   /:id/start-enteral
 *   POST   /:id/stop-enteral
 *   POST   /:id/review              — record review + advance nextReviewDue
 *   POST   /:id/discontinue
 *   PATCH  /:id
 *   DELETE /:id                     — admin
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Rx = require('../models/BeneficiaryDietPrescription');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'therapist',
  'nurse',
  'dietitian',
  'kitchen',
  'parent',
  'guardian',
  'quality',
];
// Diet prescriptions are clinical orders — write set narrow (SLP / RD / MD)
const PRESCRIBE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'physician',
  'dietitian',
  'speech_language_pathologist',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const {
  FOOD_IDDSI,
  DRINK_IDDSI,
  ENTERAL_ROUTES,
  ENTERAL_DELIVERY,
  PRESCRIBER_DISCIPLINES,
  STATUSES,
  ALLERGENS,
} = Rx;

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

// ── GET / ───────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.npo === 'true') filter.npo = true;
    if (req.query.foodIddsiLevel != null) {
      const n = Number(req.query.foodIddsiLevel);
      if (FOOD_IDDSI.includes(n)) filter.foodIddsiLevel = n;
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      Rx.find(filter)
        .sort({ updatedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Rx.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'diet.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Rx.findOne({ beneficiaryId: req.params.id }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'لا توجد وصفة غذائية' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'diet.byBeneficiary');
  }
});

// ── GET /due-review ─────────────────────────────────────────────────
router.get('/due-review', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const filter = { status: 'active', nextReviewDue: { $ne: null, $lt: now } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Rx.find(filter).sort({ nextReviewDue: 1 }).limit(200).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'diet.dueReview');
  }
});

// ── GET /npo-active ─────────────────────────────────────────────────
router.get('/npo-active', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { status: 'active', npo: true };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Rx.find(filter).sort({ npoStartedAt: -1 }).limit(200).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'diet.npo');
  }
});

// ── GET /enteral-active ─────────────────────────────────────────────
router.get('/enteral-active', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { status: 'active', 'enteralFeeding.active': true };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Rx.find(filter).limit(200).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'diet.enteral');
  }
});

// ── GET /stats ──────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Rx.find(filter)
      .select(
        'status npo foodIddsiLevel drinkIddsiLevel enteralFeeding allergensToAvoid nextReviewDue'
      )
      .lean();
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let npoCount = 0;
    let enteralCount = 0;
    let dysphagiaCount = 0; // foodIddsi <= 6 or drinkIddsi >= 1
    let allergenCount = 0;
    let dueReview = 0;
    const now = Date.now();
    for (const r of raw) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.npo) npoCount++;
      if (r.enteralFeeding && r.enteralFeeding.active) enteralCount++;
      if (r.foodIddsiLevel != null && r.foodIddsiLevel < 7) dysphagiaCount++;
      else if (r.drinkIddsiLevel != null && r.drinkIddsiLevel >= 1) dysphagiaCount++;
      if (Array.isArray(r.allergensToAvoid) && r.allergensToAvoid.length > 0) allergenCount++;
      if (r.status === 'active' && r.nextReviewDue && new Date(r.nextReviewDue).getTime() < now) {
        dueReview++;
      }
    }
    res.json({
      success: true,
      total: raw.length,
      byStatus,
      npoCount,
      enteralCount,
      dysphagiaCount,
      allergenCount,
      dueReview,
    });
  } catch (err) {
    return safeError(res, err, 'diet.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Rx.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'diet.get');
  }
});

// ── POST / ──────────────────────────────────────────────────────────
router.post('/', requireRole(PRESCRIBE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const existing = await Rx.findOne({ beneficiaryId: body.beneficiaryId }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'يوجد وصفة غذائية لهذا المستفيد بالفعل',
        existingId: String(existing._id),
      });
    }
    const doc = await Rx.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      foodIddsiLevel: FOOD_IDDSI.includes(Number(body.foodIddsiLevel))
        ? Number(body.foodIddsiLevel)
        : null,
      drinkIddsiLevel: DRINK_IDDSI.includes(Number(body.drinkIddsiLevel))
        ? Number(body.drinkIddsiLevel)
        : null,
      textureRestrictions: Array.isArray(body.textureRestrictions)
        ? body.textureRestrictions.slice(0, 10).map(s => String(s).slice(0, 100))
        : [],
      chewingAbility: ['none', 'limited', 'partial', 'normal'].includes(String(body.chewingAbility))
        ? String(body.chewingAbility)
        : null,
      allergensToAvoid: Array.isArray(body.allergensToAvoid)
        ? body.allergensToAvoid.filter(a => ALLERGENS.includes(String(a)))
        : [],
      dietaryRestrictions: Array.isArray(body.dietaryRestrictions)
        ? body.dietaryRestrictions.slice(0, 10).map(s => String(s).slice(0, 50))
        : [],
      foodPreferences: Array.isArray(body.foodPreferences)
        ? body.foodPreferences.slice(0, 20).map(s => String(s).slice(0, 100))
        : [],
      targetCaloriesPerDay:
        typeof body.targetCaloriesPerDay === 'number' ? body.targetCaloriesPerDay : null,
      targetProteinGramsPerDay:
        typeof body.targetProteinGramsPerDay === 'number' ? body.targetProteinGramsPerDay : null,
      fluidRestrictionMlPerDay:
        typeof body.fluidRestrictionMlPerDay === 'number' ? body.fluidRestrictionMlPerDay : null,
      behavioralNotes: String(body.behavioralNotes || '').slice(0, 1000),
      feedingAssistanceLevel: [
        'independent',
        'verbal_cues',
        'partial_assist',
        'full_assist',
      ].includes(String(body.feedingAssistanceLevel))
        ? String(body.feedingAssistanceLevel)
        : null,
      positioningNotes: String(body.positioningNotes || '').slice(0, 500),
      notes: String(body.notes || '').slice(0, 2000),
      status: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'diet.create');
  }
});

// ── POST /:id/activate ─────────────────────────────────────────────
router.post('/:id/activate', requireRole(PRESCRIBE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Rx.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    if (!['draft', 'on_hold'].includes(row.status)) {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن التفعيل من حالة ' + row.status });
    }
    const body = req.body || {};
    const discipline = String(body.prescriberDiscipline || '');
    if (!PRESCRIBER_DISCIPLINES.includes(discipline)) {
      return res.status(400).json({
        success: false,
        message: `prescriberDiscipline يجب أن يكون: ${PRESCRIBER_DISCIPLINES.join(' | ')}`,
      });
    }
    row.prescribedBy = req.user?.id || null;
    row.prescribedByName = req.user?.name || body.prescribedByName || '';
    row.prescriberDiscipline = discipline;
    row.prescribedAt = new Date();
    // Default review in 90 days unless caller specified
    const reviewMs =
      body.reviewIntervalDays && typeof body.reviewIntervalDays === 'number'
        ? body.reviewIntervalDays * 86400000
        : 90 * 86400000;
    row.nextReviewDue = body.nextReviewDue
      ? new Date(body.nextReviewDue)
      : new Date(Date.now() + reviewMs);
    row.status = 'active';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'diet.activate');
  }
});

// ── POST /:id/start-npo ────────────────────────────────────────────
router.post('/:id/start-npo', requireRole(PRESCRIBE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Rx.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    if (!String(req.body?.reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'سبب NPO مطلوب' });
    }
    row.npo = true;
    row.npoReason = String(req.body.reason).slice(0, 500);
    row.npoStartedAt = req.body?.startedAt ? new Date(req.body.startedAt) : new Date();
    row.npoExpectedEndAt = req.body?.expectedEndAt ? new Date(req.body.expectedEndAt) : null;
    // Clear IDDSI levels (invariant)
    row.foodIddsiLevel = null;
    row.drinkIddsiLevel = null;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'diet.startNpo');
  }
});

// ── POST /:id/end-npo ──────────────────────────────────────────────
router.post('/:id/end-npo', requireRole(PRESCRIBE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Rx.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    if (!row.npo) {
      return res.status(409).json({ success: false, message: 'الوصفة ليست في NPO حالياً' });
    }
    row.npo = false;
    row.npoReason = '';
    row.npoStartedAt = null;
    row.npoExpectedEndAt = null;
    // Caller must set new IDDSI levels via PATCH afterwards
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'diet.endNpo');
  }
});

// ── POST /:id/start-enteral ────────────────────────────────────────
router.post('/:id/start-enteral', requireRole(PRESCRIBE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Rx.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    const body = req.body || {};
    if (!ENTERAL_ROUTES.includes(String(body.route))) {
      return res.status(400).json({
        success: false,
        message: `route يجب أن يكون: ${ENTERAL_ROUTES.join(' | ')}`,
      });
    }
    if (!String(body.formulaName || '').trim()) {
      return res.status(400).json({ success: false, message: 'formulaName مطلوب' });
    }
    row.enteralFeeding = {
      active: true,
      route: body.route,
      deliveryMode: ENTERAL_DELIVERY.includes(String(body.deliveryMode))
        ? String(body.deliveryMode)
        : 'bolus',
      formulaName: String(body.formulaName).slice(0, 200),
      ratePerHour: typeof body.ratePerHour === 'number' ? body.ratePerHour : null,
      bolusVolumeMl: typeof body.bolusVolumeMl === 'number' ? body.bolusVolumeMl : null,
      bolusFrequencyPerDay:
        typeof body.bolusFrequencyPerDay === 'number' ? body.bolusFrequencyPerDay : null,
      flushVolumeMl: typeof body.flushVolumeMl === 'number' ? body.flushVolumeMl : null,
      flushFrequency: String(body.flushFrequency || '').slice(0, 100),
      additivesNotes: String(body.additivesNotes || '').slice(0, 500),
      tubeInsertedAt: body.tubeInsertedAt ? new Date(body.tubeInsertedAt) : null,
    };
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'diet.startEnteral');
  }
});

// ── POST /:id/stop-enteral ─────────────────────────────────────────
router.post('/:id/stop-enteral', requireRole(PRESCRIBE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Rx.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    if (!row.enteralFeeding || !row.enteralFeeding.active) {
      return res.status(409).json({ success: false, message: 'التغذية الأنبوبية غير مفعّلة' });
    }
    row.enteralFeeding = { active: false };
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'diet.stopEnteral');
  }
});

// ── POST /:id/review ───────────────────────────────────────────────
router.post('/:id/review', requireRole(PRESCRIBE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Rx.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    if (row.status !== 'active') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن مراجعة وصفة بحالة ' + row.status });
    }
    row.lastReviewedAt = new Date();
    const reviewMs =
      req.body?.nextReviewIntervalDays && typeof req.body.nextReviewIntervalDays === 'number'
        ? req.body.nextReviewIntervalDays * 86400000
        : 90 * 86400000;
    row.nextReviewDue = req.body?.nextReviewDue
      ? new Date(req.body.nextReviewDue)
      : new Date(Date.now() + reviewMs);
    if (req.body?.notes) {
      row.notes =
        (row.notes || '') +
        `\n[review ${new Date().toISOString()}] ${String(req.body.notes).slice(0, 500)}`;
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'diet.review');
  }
});

// ── POST /:id/discontinue ──────────────────────────────────────────
router.post('/:id/discontinue', requireRole(PRESCRIBE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Rx.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    if (!String(req.body?.reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'سبب الإيقاف مطلوب' });
    }
    row.discontinuationReason = String(req.body.reason).slice(0, 500);
    row.status = 'discontinued';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'diet.discontinue');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────
router.patch('/:id', requireRole(PRESCRIBE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Rx.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    if (row.status === 'discontinued') {
      return res.status(409).json({ success: false, message: 'الوصفة موقوفة' });
    }
    const editable = [
      'foodIddsiLevel',
      'drinkIddsiLevel',
      'textureRestrictions',
      'chewingAbility',
      'allergensToAvoid',
      'dietaryRestrictions',
      'foodPreferences',
      'targetCaloriesPerDay',
      'targetProteinGramsPerDay',
      'fluidRestrictionMlPerDay',
      'behavioralNotes',
      'feedingAssistanceLevel',
      'positioningNotes',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'diet.patch');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Rx.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'diet.delete');
  }
});

module.exports = router;

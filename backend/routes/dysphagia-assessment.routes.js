'use strict';

/**
 * dysphagia-assessment.routes.js — W670.
 *
 * SLP swallowing-assessment admin surface. Mounted via dualMountAuth at
 * /api/(v1/)?dysphagia-assessment.
 *
 * Endpoints:
 *   GET    /today                  — today's assessments (w/ branch filter)
 *   GET    /                       — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id     — per-kid history (last 100) + current safe diet
 *   GET    /unsafe                 — active unsafe-swallow flags (high risk / NPO / silent)
 *   GET    /stats                  — risk distribution for a range
 *   GET    /:id
 *   POST   /                       — record assessment (draft)
 *   POST   /:id/finalize           — finalize (immutable after)
 *   PATCH  /:id                    — correct (only while status=draft)
 *   DELETE /:id                    — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const DysphagiaAssessment = require('../models/DysphagiaAssessment');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
// W445: branch-scope every endpoint. Model carries `branchId`; without this,
// instance loads via bare findById open cross-tenant IDOR.
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'speech_language_pathologist',
  'teacher',
  'nurse',
  'dietitian',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'speech_language_pathologist',
  'nurse',
];
// Finalizing a swallow-safety verdict is a clinical sign-off — SLP / supervisor.
const FINALIZE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'speech_language_pathologist',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { TOOLS, IDDSI_FOOD, IDDSI_DRINK, RISK_LEVELS, FEEDING_ROUTES, POSITIONS, SWALLOW_SIGNS } =
  DysphagiaAssessment;

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

// Sanitize the embedded swallow-trial array from request input.
function sanitizeTrials(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).map(t => ({
    consistency: String(t?.consistency || '').slice(0, 60),
    amount: String(t?.amount || '').slice(0, 60),
    signs: Array.isArray(t?.signs)
      ? t.signs.filter(s => SWALLOW_SIGNS.includes(String(s))).slice(0, 12)
      : [],
    tolerated: t?.tolerated !== false,
    note: String(t?.note || '').slice(0, 200),
  }));
}

// ── GET /today ──────────────────────────────────────────────────────────
router.get('/today', requireRole(READ_ROLES), async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const filter = {
      ...branchFilter(req), // W445
      date: { $gte: startOfDay(d), $lte: endOfDay(d) },
    };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await DysphagiaAssessment.find(filter).sort({ date: -1 }).lean();
    const items = await hydrate(raw);
    let highRisk = 0;
    let npo = 0;
    let silent = 0;
    for (const r of raw) {
      if (r.aspirationRisk === 'high') highRisk++;
      if (r.npoRecommended) npo++;
      if (r.silentAspirationSuspected) silent++;
    }
    res.json({
      success: true,
      items,
      count: items.length,
      highRisk,
      npo,
      silentAspirationSuspected: silent,
      date: startOfDay(d),
    });
  } catch (err) {
    return safeError(res, err, 'dysphagia.today');
  }
});

// ── GET / ────────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W445 */
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.screeningTool && TOOLS.includes(String(req.query.screeningTool))) {
      filter.screeningTool = String(req.query.screeningTool);
    }
    if (req.query.aspirationRisk && RISK_LEVELS.includes(String(req.query.aspirationRisk))) {
      filter.aspirationRisk = String(req.query.aspirationRisk);
    }
    if (req.query.status && ['draft', 'finalized'].includes(String(req.query.status))) {
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
      DysphagiaAssessment.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      DysphagiaAssessment.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'dysphagia.list');
  }
});

// ── GET /unsafe — active unsafe-swallow flags across the branch ──────────
router.get('/unsafe', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {
      ...branchFilter(req), // W445
      status: 'finalized',
      $or: [
        { aspirationRisk: 'high' },
        { npoRecommended: true },
        { silentAspirationSuspected: true },
      ],
    };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    // Latest assessment per beneficiary is what matters operationally; sort
    // newest-first and let the caller dedupe, but cap to a safe page.
    const raw = await DysphagiaAssessment.find(filter).sort({ date: -1 }).limit(200).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'dysphagia.unsafe');
  }
});

// ── GET /by-beneficiary/:id ──────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await DysphagiaAssessment.find({
      ...branchFilter(req),
      /* W445 */ beneficiaryId: req.params.id,
    })
      .sort({ date: -1 })
      .limit(100)
      .lean();
    // The current safe-diet recommendation = latest finalized assessment.
    const latestFinalized = items.find(r => r.status === 'finalized') || null;
    res.json({
      success: true,
      items,
      count: items.length,
      current: latestFinalized
        ? {
            assessmentId: latestFinalized._id,
            date: latestFinalized.date,
            recommendedIddsiFood: latestFinalized.recommendedIddsiFood,
            recommendedIddsiDrink: latestFinalized.recommendedIddsiDrink,
            feedingRoute: latestFinalized.feedingRoute,
            aspirationRisk: latestFinalized.aspirationRisk,
            npoRecommended: latestFinalized.npoRecommended,
          }
        : null,
    });
  } catch (err) {
    return safeError(res, err, 'dysphagia.byBeneficiary');
  }
});

// ── GET /stats ───────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = {
      ...branchFilter(req), // W445
      date: { $gte: from, $lte: to },
    };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await DysphagiaAssessment.find(filter)
      .select(
        'screeningTool aspirationRisk npoRecommended silentAspirationSuspected slpReferral feedingRoute'
      )
      .lean();
    const byRisk = RISK_LEVELS.reduce((acc, r) => ((acc[r] = 0), acc), {});
    const byTool = TOOLS.reduce((acc, t) => ((acc[t] = 0), acc), {});
    let npo = 0;
    let silent = 0;
    let referrals = 0;
    for (const r of raw) {
      if (r.aspirationRisk) byRisk[r.aspirationRisk] = (byRisk[r.aspirationRisk] || 0) + 1;
      if (r.screeningTool) byTool[r.screeningTool] = (byTool[r.screeningTool] || 0) + 1;
      if (r.npoRecommended) npo++;
      if (r.silentAspirationSuspected) silent++;
      if (r.slpReferral) referrals++;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      byRisk,
      byTool,
      npoRecommended: npo,
      silentAspirationSuspected: silent,
      slpReferrals: referrals,
    });
  } catch (err) {
    return safeError(res, err, 'dysphagia.stats');
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DysphagiaAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean(); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'dysphagia.get');
  }
});

// ── POST / — record assessment (draft) ───────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!TOOLS.includes(String(body.screeningTool))) {
      return res
        .status(400)
        .json({ success: false, message: `أداة الفحص يجب أن تكون: ${TOOLS.join(' | ')}` });
    }
    const date = body.date ? new Date(body.date) : new Date();

    const doc = await DysphagiaAssessment.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      dietPrescriptionId:
        body.dietPrescriptionId && mongoose.isValidObjectId(body.dietPrescriptionId)
          ? body.dietPrescriptionId
          : null,
      date: startOfDay(date),
      reason: String(body.reason || '').slice(0, 300),
      screeningTool: body.screeningTool,
      trials: sanitizeTrials(body.trials),
      aspirationRisk: RISK_LEVELS.includes(String(body.aspirationRisk))
        ? String(body.aspirationRisk)
        : 'none',
      penetrationRisk: RISK_LEVELS.includes(String(body.penetrationRisk))
        ? String(body.penetrationRisk)
        : 'none',
      silentAspirationSuspected: !!body.silentAspirationSuspected,
      recommendedIddsiFood: IDDSI_FOOD.includes(String(body.recommendedIddsiFood))
        ? String(body.recommendedIddsiFood)
        : '',
      recommendedIddsiDrink: IDDSI_DRINK.includes(String(body.recommendedIddsiDrink))
        ? String(body.recommendedIddsiDrink)
        : '',
      feedingRoute: FEEDING_ROUTES.includes(String(body.feedingRoute))
        ? String(body.feedingRoute)
        : 'oral',
      recommendedPosition: POSITIONS.includes(String(body.recommendedPosition))
        ? String(body.recommendedPosition)
        : 'upright_90',
      pacingStrategies: Array.isArray(body.pacingStrategies)
        ? body.pacingStrategies.slice(0, 10).map(s => String(s).slice(0, 100))
        : [],
      npoRecommended: !!body.npoRecommended,
      npoReason: String(body.npoReason || '').slice(0, 300),
      slpReferral: !!body.slpReferral,
      instrumentalAssessmentRecommended: !!body.instrumentalAssessmentRecommended,
      instrumentalType: String(body.instrumentalType || '').slice(0, 40),
      reassessmentDue: body.reassessmentDue ? new Date(body.reassessmentDue) : null,
      notes: String(body.notes || '').slice(0, 1000),
      status: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'dysphagia.create');
  }
});

// ── POST /:id/finalize — sign off the swallow verdict (immutable after) ──
router.post('/:id/finalize', requireRole(FINALIZE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DysphagiaAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'التقييم سبق وأن تم اعتماده' });
    }
    row.assessedBy = req.user?.id || null;
    row.assessedByName = req.user?.name || String(req.body?.assessorName || '').slice(0, 100);
    row.assessedAt = new Date();
    row.status = 'finalized';
    await row.save(); // __invariants enforce high-risk⇒referral, silent⇒instrumental, NPO⇒reason
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'dysphagia.finalize');
  }
});

// ── PATCH /:id — correct while still 'draft' ─────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DysphagiaAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    if ('trials' in req.body) row.trials = sanitizeTrials(req.body.trials);
    const editable = [
      'reason',
      'screeningTool',
      'aspirationRisk',
      'penetrationRisk',
      'silentAspirationSuspected',
      'recommendedIddsiFood',
      'recommendedIddsiDrink',
      'feedingRoute',
      'recommendedPosition',
      'pacingStrategies',
      'npoRecommended',
      'npoReason',
      'slpReferral',
      'instrumentalAssessmentRecommended',
      'instrumentalType',
      'reassessmentDue',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'dysphagia.patch');
  }
});

// ── DELETE /:id — admin-only ─────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DysphagiaAssessment.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'dysphagia.delete');
  }
});

module.exports = router;

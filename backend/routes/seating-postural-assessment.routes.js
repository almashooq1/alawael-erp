'use strict';

/**
 * seating-postural-assessment.routes.js — W675.
 *
 * Seating & postural-management assessment admin surface. Mounted via
 * dualMountAuth at /api/(v1/)?seating-postural-assessment.
 *
 * Endpoints:
 *   GET    /today                  — today's assessments (branch filter)
 *   GET    /                       — list w/ filters (paginated)
 *   GET    /at-risk                — pressure-injury at-risk board (branch)
 *   GET    /due                    — reassessments due (branch)
 *   GET    /by-beneficiary/:id     — per-kid history (last 100) + initial/latest pair
 *   GET    /stats                  — type + risk distribution
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

const SeatingPosturalAssessment = require('../models/SeatingPosturalAssessment');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(requireBranchAccess); // W445
router.use(bodyScopedBeneficiaryGuard); // W441

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'physiotherapist',
  'occupational_therapist',
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
  'physiotherapist',
  'occupational_therapist',
];
const FINALIZE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physiotherapist',
  'occupational_therapist',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const {
  ASSESSMENT_TYPES,
  CONTEXTS,
  GMFCS_LEVELS,
  BODY_SEGMENTS,
  SUPPORT_LEVELS,
  RISK_LEVELS,
  INJURY_STAGES,
  EQUIPMENT_TYPES,
  CUSHION_TYPES,
} = SeatingPosturalAssessment;

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

function sanitizeSupports(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).map(s => ({
    segment: BODY_SEGMENTS.includes(String(s?.segment)) ? String(s.segment) : '',
    support: SUPPORT_LEVELS.includes(String(s?.support)) ? String(s.support) : '',
    device: String(s?.device || '').slice(0, 80),
    note: String(s?.note || '').slice(0, 120),
  }));
}

function sanitizeStrList(raw, max, len) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, max).map(s => String(s).slice(0, len));
}

function num(v, min, max) {
  if (typeof v !== 'number' || Number.isNaN(v)) return null;
  return Math.max(min, Math.min(max, v));
}

// ── GET /today ──────────────────────────────────────────────────────────
router.get('/today', requireRole(READ_ROLES), async (req, res) => {
  try {
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const filter = {
      ...branchFilter(req), // W445
      date: { $gte: startOfDay(d), $lte: endOfDay(d) },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await SeatingPosturalAssessment.find(filter).sort({ date: -1 }).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length, date: startOfDay(d) });
  } catch (err) {
    return safeError(res, err, 'seating.today');
  }
});

// ── GET / ────────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; /* W445 */
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.assessmentType && ASSESSMENT_TYPES.includes(String(req.query.assessmentType))) {
      filter.assessmentType = String(req.query.assessmentType);
    }
    if (
      req.query.pressureInjuryRisk &&
      RISK_LEVELS.includes(String(req.query.pressureInjuryRisk))
    ) {
      filter.pressureInjuryRisk = String(req.query.pressureInjuryRisk);
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
      SeatingPosturalAssessment.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      SeatingPosturalAssessment.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'seating.list');
  }
});

// ── GET /at-risk — pressure-injury board (moderate/high or existing injury) ─
router.get('/at-risk', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {
      ...branchFilter(req), // W445
      $or: [
        { pressureInjuryRisk: { $in: ['moderate', 'high'] } },
        { existingPressureInjury: true },
      ],
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await SeatingPosturalAssessment.find(filter)
      .sort({ pressureInjuryRisk: -1, date: -1 })
      .limit(300)
      .lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'seating.atRisk');
  }
});

// ── GET /due — reassessments due across the branch ───────────────────────
router.get('/due', requireRole(READ_ROLES), async (req, res) => {
  try {
    const by = req.query.by ? endOfDay(new Date(req.query.by)) : endOfDay(new Date());
    const filter = {
      ...branchFilter(req), // W445
      reassessmentDue: { $ne: null, $lte: by },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await SeatingPosturalAssessment.find(filter)
      .sort({ reassessmentDue: 1 })
      .limit(300)
      .lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'seating.due');
  }
});

// ── GET /by-beneficiary/:id ──────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await SeatingPosturalAssessment.find({
      ...branchFilter(req),
      /* W445 */ beneficiaryId: req.params.id,
    })
      .sort({ date: -1 })
      .limit(100)
      .lean();
    const initial = [...items].reverse().find(r => r.assessmentType === 'initial') || null;
    const latest = items.find(r => r.status === 'finalized') || items[0] || null;
    res.json({
      success: true,
      items,
      count: items.length,
      initial: initial
        ? { id: initial._id, date: initial.date, pressureInjuryRisk: initial.pressureInjuryRisk }
        : null,
      latest: latest
        ? { id: latest._id, date: latest.date, pressureInjuryRisk: latest.pressureInjuryRisk }
        : null,
    });
  } catch (err) {
    return safeError(res, err, 'seating.byBeneficiary');
  }
});

// ── GET /stats ───────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = {
      ...branchFilter(req), // W445
      date: { $gte: from, $lte: to },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await SeatingPosturalAssessment.find(filter)
      .select('assessmentType pressureInjuryRisk existingPressureInjury caregiverEducationGiven')
      .lean();
    const byType = ASSESSMENT_TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    const byRisk = RISK_LEVELS.reduce((acc, r) => ((acc[r] = 0), acc), {});
    let withInjury = 0;
    let caregiverEducated = 0;
    for (const r of raw) {
      if (r.assessmentType) byType[r.assessmentType] = (byType[r.assessmentType] || 0) + 1;
      if (r.pressureInjuryRisk)
        byRisk[r.pressureInjuryRisk] = (byRisk[r.pressureInjuryRisk] || 0) + 1;
      if (r.existingPressureInjury) withInjury++;
      if (r.caregiverEducationGiven) caregiverEducated++;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      byType,
      byRisk,
      existingInjuries: withInjury,
      caregiverEducated,
    });
  } catch (err) {
    return safeError(res, err, 'seating.stats');
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeatingPosturalAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean(); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'seating.get');
  }
});

// ── POST / — record assessment (draft) ───────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const date = body.date ? new Date(body.date) : new Date();

    const doc = await SeatingPosturalAssessment.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      assistiveDeviceId:
        body.assistiveDeviceId && mongoose.isValidObjectId(body.assistiveDeviceId)
          ? body.assistiveDeviceId
          : null,
      date: startOfDay(date),
      assessmentType: ASSESSMENT_TYPES.includes(String(body.assessmentType))
        ? String(body.assessmentType)
        : 'initial',
      positioningContext: CONTEXTS.includes(String(body.positioningContext))
        ? String(body.positioningContext)
        : 'sitting',
      gmfcsLevel: GMFCS_LEVELS.includes(String(body.gmfcsLevel)) ? String(body.gmfcsLevel) : '',
      reason: String(body.reason || '').slice(0, 300),
      posturalObservation: String(body.posturalObservation || '').slice(0, 600),
      fixedDeformities: sanitizeStrList(body.fixedDeformities, 20, 60),
      toleratesUpright: body.toleratesUpright !== undefined ? !!body.toleratesUpright : true,
      sittingToleranceMinutes: num(body.sittingToleranceMinutes, 0, 1440),
      posturalSupports: sanitizeSupports(body.posturalSupports),
      pressureInjuryRisk: RISK_LEVELS.includes(String(body.pressureInjuryRisk))
        ? String(body.pressureInjuryRisk)
        : 'none',
      bonyProminenceSites: sanitizeStrList(body.bonyProminenceSites, 20, 40),
      existingPressureInjury: !!body.existingPressureInjury,
      injuryStage: INJURY_STAGES.includes(String(body.injuryStage)) ? String(body.injuryStage) : '',
      injurySite: String(body.injurySite || '').slice(0, 80),
      mitigationPlan: String(body.mitigationPlan || '').slice(0, 1000),
      repositioningIntervalMinutes: num(body.repositioningIntervalMinutes, 0, 1440),
      equipmentType: EQUIPMENT_TYPES.includes(String(body.equipmentType))
        ? String(body.equipmentType)
        : '',
      cushionType: CUSHION_TYPES.includes(String(body.cushionType))
        ? String(body.cushionType)
        : 'none',
      equipmentRecommendation: String(body.equipmentRecommendation || '').slice(0, 1000),
      positioningPlan: String(body.positioningPlan || '').slice(0, 1500),
      goalsSummary: String(body.goalsSummary || '').slice(0, 1000),
      outcomeSummary: String(body.outcomeSummary || '').slice(0, 1000),
      caregiverEducationGiven: !!body.caregiverEducationGiven,
      reassessmentDue: body.reassessmentDue ? new Date(body.reassessmentDue) : null,
      notes: String(body.notes || '').slice(0, 1000),
      status: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'seating.create');
  }
});

// ── POST /:id/finalize ────────────────────────────────────────────────────
router.post('/:id/finalize', requireRole(FINALIZE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeatingPosturalAssessment.findOne({
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
    await row.save(); // __invariants enforce risk⇒mitigationPlan, injury staging, discharge⇒outcome
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'seating.finalize');
  }
});

// ── PATCH /:id — correct while still 'draft' ─────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeatingPosturalAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    if ('posturalSupports' in req.body)
      row.posturalSupports = sanitizeSupports(req.body.posturalSupports);
    if ('fixedDeformities' in req.body)
      row.fixedDeformities = sanitizeStrList(req.body.fixedDeformities, 20, 60);
    if ('bonyProminenceSites' in req.body)
      row.bonyProminenceSites = sanitizeStrList(req.body.bonyProminenceSites, 20, 40);
    const editable = [
      'assessmentType',
      'positioningContext',
      'gmfcsLevel',
      'reason',
      'posturalObservation',
      'toleratesUpright',
      'sittingToleranceMinutes',
      'pressureInjuryRisk',
      'existingPressureInjury',
      'injuryStage',
      'injurySite',
      'mitigationPlan',
      'repositioningIntervalMinutes',
      'equipmentType',
      'cushionType',
      'equipmentRecommendation',
      'positioningPlan',
      'goalsSummary',
      'outcomeSummary',
      'caregiverEducationGiven',
      'reassessmentDue',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'seating.patch');
  }
});

// ── DELETE /:id — admin-only ─────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SeatingPosturalAssessment.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'seating.delete');
  }
});

module.exports = router;

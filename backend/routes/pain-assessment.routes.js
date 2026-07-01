'use strict';

/**
 * pain-assessment.routes.js — W671.
 *
 * Pain assessment admin surface. Mounted via dualMountAuth at
 * /api/(v1/)?pain-assessment.
 *
 * Endpoints:
 *   GET    /today                  — today's assessments (w/ branch filter)
 *   GET    /                       — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id     — per-kid history (last 100) + trend
 *   GET    /significant            — active significant-pain board (branch)
 *   GET    /stats                  — scale + significance distribution
 *   GET    /:id
 *   POST   /                       — record assessment (draft)
 *   POST   /:id/reassess           — record post-intervention reassessment
 *   POST   /:id/finalize           — finalize (immutable after)
 *   PATCH  /:id                    — correct (only while status=draft)
 *   DELETE /:id                    — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const PainAssessment = require('../models/PainAssessment');
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
const FINALIZE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'nurse',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const {
  SCALES,
  SCALE_MAX,
  OBSERVER_TYPES,
  PAIN_QUALITIES,
  TIMING,
  FUNCTIONAL_DOMAINS,
  INTERVENTION_TYPES,
} = PainAssessment;

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

// Significant pain (mirror of the model virtual, for query-side filtering of
// lean docs): >= 40% of the scale max, OR any functional impact while present.
function isSignificant(r) {
  if (!r.painPresent) return false;
  const max = SCALE_MAX[r.scale] || 10;
  const ratio = (r.score || 0) / max;
  return ratio >= 0.4 || (Array.isArray(r.functionalImpact) && r.functionalImpact.length > 0);
}

function sanitizeStrArray(v, maxItems, maxLen) {
  return Array.isArray(v) ? v.slice(0, maxItems).map(s => String(s).slice(0, maxLen)) : [];
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
    const raw = await PainAssessment.find(filter).sort({ date: -1 }).lean();
    const items = await hydrate(raw);
    let withPain = 0;
    let significant = 0;
    for (const r of raw) {
      if (r.painPresent) withPain++;
      if (isSignificant(r)) significant++;
    }
    res.json({
      success: true,
      items,
      count: items.length,
      withPain,
      significant,
      date: startOfDay(d),
    });
  } catch (err) {
    return safeError(res, err, 'pain.today');
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
    if (req.query.scale && SCALES.includes(String(req.query.scale))) {
      filter.scale = String(req.query.scale);
    }
    if (req.query.painPresent === 'true') filter.painPresent = true;
    if (req.query.painPresent === 'false') filter.painPresent = false;
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
      PainAssessment.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      PainAssessment.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'pain.list');
  }
});

// ── GET /significant — active significant-pain board ─────────────────────
router.get('/significant', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const filter = {
      ...branchFilter(req), // W445
      painPresent: true,
      date: { $gte: from },
    };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await PainAssessment.find(filter).sort({ date: -1 }).limit(300).lean();
    const sig = raw.filter(isSignificant);
    const items = await hydrate(sig);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'pain.significant');
  }
});

// ── GET /by-beneficiary/:id ──────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await PainAssessment.find({
      ...branchFilter(req),
      /* W445 */ beneficiaryId: req.params.id,
    })
      .sort({ date: -1 })
      .limit(100)
      .lean();
    // Normalized trend (score / scale-max) for charting across mixed scales.
    const trend = items
      .slice(0, 30)
      .reverse()
      .map(r => ({
        date: r.date,
        scale: r.scale,
        score: r.score,
        normalized: Math.round(((r.score || 0) / (SCALE_MAX[r.scale] || 10)) * 100) / 100,
        painPresent: r.painPresent,
      }));
    res.json({ success: true, items, count: items.length, trend });
  } catch (err) {
    return safeError(res, err, 'pain.byBeneficiary');
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
    const raw = await PainAssessment.find(filter)
      .select('scale score painPresent functionalImpact interventionGiven')
      .lean();
    const byScale = SCALES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let withPain = 0;
    let significant = 0;
    let interventions = 0;
    for (const r of raw) {
      if (r.scale) byScale[r.scale] = (byScale[r.scale] || 0) + 1;
      if (r.painPresent) withPain++;
      if (isSignificant(r)) significant++;
      if (r.interventionGiven) interventions++;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      byScale,
      withPain,
      significant,
      interventionsGiven: interventions,
    });
  } catch (err) {
    return safeError(res, err, 'pain.stats');
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PainAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean(); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'pain.get');
  }
});

// ── POST / — record assessment (draft) ───────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!SCALES.includes(String(body.scale))) {
      return res
        .status(400)
        .json({ success: false, message: `المقياس يجب أن يكون: ${SCALES.join(' | ')}` });
    }
    const date = body.date ? new Date(body.date) : new Date();
    const scale = String(body.scale);
    const max = SCALE_MAX[scale] || 10;
    let score = typeof body.score === 'number' ? body.score : 0;
    score = Math.max(0, Math.min(max, score));

    const doc = await PainAssessment.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      therapySessionId:
        body.therapySessionId && mongoose.isValidObjectId(body.therapySessionId)
          ? body.therapySessionId
          : null,
      date: startOfDay(date),
      reason: String(body.reason || '').slice(0, 300),
      scale,
      observerType: OBSERVER_TYPES.includes(String(body.observerType))
        ? String(body.observerType)
        : 'self_report',
      painPresent: !!body.painPresent,
      score,
      bodyLocations: sanitizeStrArray(body.bodyLocations, 12, 40),
      bodyLocationDetail: String(body.bodyLocationDetail || '').slice(0, 200),
      quality: PAIN_QUALITIES.includes(String(body.quality)) ? String(body.quality) : '',
      timing: TIMING.includes(String(body.timing)) ? String(body.timing) : '',
      triggers: sanitizeStrArray(body.triggers, 10, 60),
      relievingFactors: sanitizeStrArray(body.relievingFactors, 10, 60),
      functionalImpact: Array.isArray(body.functionalImpact)
        ? body.functionalImpact.filter(d => FUNCTIONAL_DOMAINS.includes(String(d)))
        : [],
      interventionGiven: !!body.interventionGiven,
      interventionType: INTERVENTION_TYPES.includes(String(body.interventionType))
        ? String(body.interventionType)
        : '',
      interventionNote: String(body.interventionNote || '').slice(0, 300),
      notes: String(body.notes || '').slice(0, 1000),
      status: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'pain.create');
  }
});

// ── POST /:id/reassess — post-intervention reassessment ──────────────────
router.post('/:id/reassess', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PainAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    const max = SCALE_MAX[row.scale] || 10;
    let rs = typeof req.body?.reassessmentScore === 'number' ? req.body.reassessmentScore : null;
    if (rs == null) {
      return res.status(400).json({ success: false, message: 'reassessmentScore مطلوب' });
    }
    rs = Math.max(0, Math.min(max, rs));
    row.reassessmentScore = rs;
    row.reassessmentAt = req.body?.at ? new Date(req.body.at) : new Date();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pain.reassess');
  }
});

// ── POST /:id/finalize ────────────────────────────────────────────────────
router.post('/:id/finalize', requireRole(FINALIZE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PainAssessment.findOne({
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
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pain.finalize');
  }
});

// ── PATCH /:id — correct while still 'draft' ─────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PainAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل تقييم تم اعتماده' });
    }
    const editable = [
      'reason',
      'scale',
      'observerType',
      'painPresent',
      'score',
      'bodyLocations',
      'bodyLocationDetail',
      'quality',
      'timing',
      'triggers',
      'relievingFactors',
      'functionalImpact',
      'interventionGiven',
      'interventionType',
      'interventionNote',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pain.patch');
  }
});

// ── DELETE /:id — admin-only ─────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PainAssessment.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'pain.delete');
  }
});

module.exports = router;

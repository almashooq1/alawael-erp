'use strict';

/**
 * hearing-screening.routes.js — W724.
 *
 * Functional hearing-screening admin surface. Mounted via dualMountAuth at
 * /api/(v1/)?hearing-screening.
 *
 * Endpoints:
 *   GET    /today                  — today's screenings (branch filter)
 *   GET    /                       — list w/ filters (paginated)
 *   GET    /needs-referral         — outcome=refer board (branch)
 *   GET    /due                    — reassessments due (branch)
 *   GET    /by-beneficiary/:id     — per-kid history (last 100) + first/latest pair
 *   GET    /stats                  — method + outcome distribution
 *   GET    /:id
 *   POST   /                       — record screening (draft)
 *   POST   /:id/finalize           — finalize (immutable after)
 *   PATCH  /:id                    — correct (only while status=draft)
 *   DELETE /:id                    — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const HearingScreening = require('../models/HearingScreening');
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
  'speech_language_pathologist',
  'audiologist',
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
  'speech_language_pathologist',
  'audiologist',
  'nurse',
];
const FINALIZE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'audiologist',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { METHODS, THRESHOLD_BANDS, OUTCOMES, LOSS_TYPES, SEVERITY, FUNCTIONAL_DOMAINS } =
  HearingScreening;

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

function sanitizeEnumList(raw, allowed, max) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(String))].filter(v => allowed.includes(v)).slice(0, max);
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
    const raw = await HearingScreening.find(filter).sort({ date: -1 }).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length, date: startOfDay(d) });
  } catch (err) {
    return safeError(res, err, 'hearing.today');
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
    if (req.query.screeningMethod && METHODS.includes(String(req.query.screeningMethod))) {
      filter.screeningMethod = String(req.query.screeningMethod);
    }
    if (req.query.outcome && OUTCOMES.includes(String(req.query.outcome))) {
      filter.outcome = String(req.query.outcome);
    }
    if (req.query.lossType && LOSS_TYPES.includes(String(req.query.lossType))) {
      filter.lossType = String(req.query.lossType);
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
      HearingScreening.find(filter)
        .sort({ date: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      HearingScreening.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'hearing.list');
  }
});

// ── GET /needs-referral — outcome=refer board ─────────────────────────────
router.get('/needs-referral', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {
      ...branchFilter(req), // W445
      outcome: 'refer',
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await HearingScreening.find(filter).sort({ date: -1 }).limit(300).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'hearing.needsReferral');
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
    const raw = await HearingScreening.find(filter).sort({ reassessmentDue: 1 }).limit(300).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'hearing.due');
  }
});

// ── GET /by-beneficiary/:id ──────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await HearingScreening.find({
      ...branchFilter(req),
      /* W445 */ beneficiaryId: req.params.id,
    })
      .sort({ date: -1 })
      .limit(100)
      .lean();
    const first = [...items].reverse()[0] || null;
    const latest = items.find(r => r.status === 'finalized') || items[0] || null;
    res.json({
      success: true,
      items,
      count: items.length,
      first: first ? { id: first._id, date: first.date, outcome: first.outcome } : null,
      latest: latest ? { id: latest._id, date: latest.date, outcome: latest.outcome } : null,
    });
  } catch (err) {
    return safeError(res, err, 'hearing.byBeneficiary');
  }
});

// ── GET /stats ───────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
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
    const raw = await HearingScreening.find(filter)
      .select('screeningMethod outcome lossDetected lossType hearingAidRecommended')
      .lean();
    const byMethod = METHODS.reduce((acc, m) => ((acc[m] = 0), acc), {});
    const byOutcome = OUTCOMES.reduce((acc, o) => ((acc[o] = 0), acc), {});
    let lossDetected = 0;
    let hearingAids = 0;
    for (const r of raw) {
      if (r.screeningMethod) byMethod[r.screeningMethod] = (byMethod[r.screeningMethod] || 0) + 1;
      if (r.outcome) byOutcome[r.outcome] = (byOutcome[r.outcome] || 0) + 1;
      if (r.lossDetected) lossDetected++;
      if (r.hearingAidRecommended) hearingAids++;
    }
    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      byMethod,
      byOutcome,
      lossDetected,
      hearingAidsRecommended: hearingAids,
    });
  } catch (err) {
    return safeError(res, err, 'hearing.stats');
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await HearingScreening.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean(); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'hearing.get');
  }
});

// ── POST / — record screening (draft) ─────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!METHODS.includes(String(body.screeningMethod))) {
      return res
        .status(400)
        .json({ success: false, message: `أداة الفحص يجب أن تكون: ${METHODS.join(' | ')}` });
    }
    const date = body.date ? new Date(body.date) : new Date();
    const band = v => (THRESHOLD_BANDS.includes(String(v)) ? String(v) : '');
    const num = (v, min, max) =>
      typeof v === 'number' && !Number.isNaN(v) ? Math.max(min, Math.min(max, v)) : null;

    const doc = await HearingScreening.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      carePlanVersionId:
        body.carePlanVersionId && mongoose.isValidObjectId(body.carePlanVersionId)
          ? body.carePlanVersionId
          : null,
      date: startOfDay(date),
      reason: String(body.reason || '').slice(0, 300),
      screeningMethod: String(body.screeningMethod),
      wearsHearingAidDuringScreen: !!body.wearsHearingAidDuringScreen,
      thresholdRight: band(body.thresholdRight),
      thresholdLeft: band(body.thresholdLeft),
      speechRecognitionPct: num(body.speechRecognitionPct, 0, 100),
      lossDetected: !!body.lossDetected,
      rightEarAffected: !!body.rightEarAffected,
      leftEarAffected: !!body.leftEarAffected,
      lossType: LOSS_TYPES.includes(String(body.lossType)) ? String(body.lossType) : 'none',
      severity: SEVERITY.includes(String(body.severity)) ? String(body.severity) : 'none',
      functionalDomainsIntact: sanitizeEnumList(body.functionalDomainsIntact, FUNCTIONAL_DOMAINS, 10),
      tympanometryAbnormal: !!body.tympanometryAbnormal,
      historyOfEarInfections: !!body.historyOfEarInfections,
      outcome: OUTCOMES.includes(String(body.outcome)) ? String(body.outcome) : 'monitor',
      referralReason: String(body.referralReason || '').slice(0, 500),
      referralTo: String(body.referralTo || '').slice(0, 120),
      hearingAidRecommended: !!body.hearingAidRecommended,
      hearingAidDetail: String(body.hearingAidDetail || '').slice(0, 300),
      recommendations: String(body.recommendations || '').slice(0, 1000),
      reassessmentDue: body.reassessmentDue ? new Date(body.reassessmentDue) : null,
      notes: String(body.notes || '').slice(0, 1000),
      status: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'hearing.create');
  }
});

// ── POST /:id/finalize ────────────────────────────────────────────────────
router.post('/:id/finalize', requireRole(FINALIZE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await HearingScreening.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'الفحص سبق وأن تم اعتماده' });
    }
    row.screenedBy = req.user?.id || null;
    row.screenedByName = req.user?.name || String(req.body?.screenerName || '').slice(0, 100);
    row.screenedAt = new Date();
    row.status = 'finalized';
    await row.save(); // __invariants enforce refer⇒reason, aid⇒detail, loss⇒ear
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'hearing.finalize');
  }
});

// ── PATCH /:id — correct while still 'draft' ─────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await HearingScreening.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'finalized') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل فحص تم اعتماده' });
    }
    if ('functionalDomainsIntact' in req.body)
      row.functionalDomainsIntact = sanitizeEnumList(
        req.body.functionalDomainsIntact,
        FUNCTIONAL_DOMAINS,
        10
      );
    const editable = [
      'reason',
      'screeningMethod',
      'wearsHearingAidDuringScreen',
      'thresholdRight',
      'thresholdLeft',
      'speechRecognitionPct',
      'lossDetected',
      'rightEarAffected',
      'leftEarAffected',
      'lossType',
      'severity',
      'tympanometryAbnormal',
      'historyOfEarInfections',
      'outcome',
      'referralReason',
      'referralTo',
      'hearingAidRecommended',
      'hearingAidDetail',
      'recommendations',
      'reassessmentDue',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'hearing.patch');
  }
});

// ── DELETE /:id — admin-only ─────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await HearingScreening.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    }); /* W445 */
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'hearing.delete');
  }
});

module.exports = router;

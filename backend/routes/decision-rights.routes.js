'use strict';

/**
 * decision-rights.routes.js — Wave 515 (Phase B Rights & Voice — REST surface).
 *
 * REST surface for the W461 DecisionRightsAssessment model. CRPD Article 12
 * supported decision-making — capacity is assessed PER DECISION, not blanket.
 *
 * Mounted via dualMountAuth at /api/(v1/)?decision-rights.
 *
 * Endpoints:
 *   GET    /                         — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id       — per-beneficiary history + layer mix
 *   GET    /pending-review           — assessments past nextReviewDue
 *   GET    /stats                    — branch-level layer-routing analytics
 *   GET    /:id
 *   POST   /                         — create new assessment (status=draft)
 *   POST   /:id/finalize             — transition draft → finalized
 *                                       (triggers full Wave-18 invariant check)
 *   POST   /:id/record-outcome       — log decisionOutcome + decisionMadeBy
 *   POST   /:id/supersede            — mark superseded by a newer assessment
 *   PATCH  /:id                      — correct content while status=draft
 *   DELETE /:id                      — admin-only
 *
 * Cross-tenant isolation: every endpoint uses branchFilter(req) and
 * mongoose.isValidObjectId guards per W269 doctrine.
 *
 * Layer routing + composite score are computed by the model's pre-save hook
 * (intelligence/decision-rights.lib). The Wave-18 invariants are enforced
 * at finalization, so the create endpoint is permissive but /finalize is
 * strict — Layer 2/3 + restraint/seclusion/research need supportArrangement
 * + advocateInvolved per the lib.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const DecisionRightsAssessment = require('../models/DecisionRightsAssessment');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

// Decision-rights assessments are tightly scoped — only clinical + advocacy
// roles can read; only physician/psychologist/case_manager/advocate/mdt
// can write (matches the model's assessedByRole enum).
const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'physician',
  'psychologist',
  'nurse',
  'quality',
  'case_manager',
  'social_worker',
  'independent_advocate',
  'cultural_officer',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physician',
  'psychologist',
  'case_manager',
  'independent_advocate',
];
// Finalization is even stricter — finalization closes a snapshot that may be
// referenced by downstream consent/restraint workflows.
const FINALIZE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physician',
  'psychologist',
  'case_manager',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

// Enums mirrored from the model — drift guard wave515 enforces byte-match.
const DECISION_TYPES = [
  'daily_preferences',
  'therapy_participation',
  'plan_change',
  'medication_change',
  'restraint',
  'seclusion',
  'research_consent',
  'complaint',
  'transition_intensity',
  'discharge',
  'data_sharing',
  'other',
];
const ROUTED_LAYERS = ['autonomy', 'supported', 'substituted', 'emergency'];
const STATUSES = ['draft', 'finalized', 'superseded'];
const ASSESSED_BY_ROLES = ['physician', 'psychologist', 'case_manager', 'advocate', 'mdt'];

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

function sanitizeCapacity(input) {
  const c = input && typeof input === 'object' ? input : {};
  const clamp = v => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(3, Math.max(0, Math.round(n)));
  };
  const out = {
    understanding: clamp(c.understanding),
    retention: clamp(c.retention),
    weighing: clamp(c.weighing),
    communication: clamp(c.communication),
  };
  for (const k of Object.keys(out)) {
    if (out[k] === null) return null; // any missing/invalid = reject
  }
  return out;
}

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.decisionType && DECISION_TYPES.includes(String(req.query.decisionType))) {
      filter.decisionType = String(req.query.decisionType);
    }
    if (req.query.routedLayer && ROUTED_LAYERS.includes(String(req.query.routedLayer))) {
      filter.routedLayer = String(req.query.routedLayer);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.from || req.query.to) {
      filter.assessedAt = {};
      if (req.query.from) filter.assessedAt.$gte = startOfDay(new Date(req.query.from));
      if (req.query.to) filter.assessedAt.$lte = endOfDay(new Date(req.query.to));
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      DecisionRightsAssessment.find(filter)
        .sort({ assessedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      DecisionRightsAssessment.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'decisionRights.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await DecisionRightsAssessment.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ assessedAt: -1 })
      .limit(100)
      .lean();

    // Layer mix across this beneficiary's assessments (CRPD posture snapshot)
    const byLayer = ROUTED_LAYERS.reduce((acc, l) => ((acc[l] = 0), acc), {});
    const byType = DECISION_TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    let advocateInvolvedCount = 0;
    let finalizedCount = 0;
    for (const r of items) {
      if (r.routedLayer) byLayer[r.routedLayer] = (byLayer[r.routedLayer] || 0) + 1;
      if (r.decisionType) byType[r.decisionType] = (byType[r.decisionType] || 0) + 1;
      if (r.advocateInvolved) advocateInvolvedCount++;
      if (r.status === 'finalized') finalizedCount++;
    }
    const autonomyShare = items.length
      ? Math.round(((byLayer.autonomy || 0) * 100) / items.length)
      : null;

    res.json({
      success: true,
      items,
      count: items.length,
      byLayer,
      byType,
      finalizedCount,
      advocateInvolvedCount,
      crpdCompliance: { autonomyShare },
    });
  } catch (err) {
    return safeError(res, err, 'decisionRights.byBeneficiary');
  }
});

// ── GET /pending-review ────────────────────────────────────────────────
router.get('/pending-review', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      ...branchFilter(req),
      status: 'finalized',
      nextReviewDue: { $lte: now },
    };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await DecisionRightsAssessment.find(filter)
      .sort({ nextReviewDue: 1 })
      .limit(200)
      .lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length, asOf: now });
  } catch (err) {
    return safeError(res, err, 'decisionRights.pendingReview');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const from = req.query.from
      ? startOfDay(new Date(req.query.from))
      : startOfDay(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date());
    const filter = {
      ...branchFilter(req),
      assessedAt: { $gte: from, $lte: to },
    };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await DecisionRightsAssessment.find(filter)
      .select('decisionType routedLayer status advocateInvolved compositeScore')
      .lean();
    const byLayer = ROUTED_LAYERS.reduce((acc, l) => ((acc[l] = 0), acc), {});
    const byType = DECISION_TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let compositeSum = 0;
    let compositeCount = 0;
    let advocateInvolvedCount = 0;
    for (const r of raw) {
      if (r.routedLayer) byLayer[r.routedLayer] = (byLayer[r.routedLayer] || 0) + 1;
      if (r.decisionType) byType[r.decisionType] = (byType[r.decisionType] || 0) + 1;
      if (r.status) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (typeof r.compositeScore === 'number') {
        compositeSum += r.compositeScore;
        compositeCount++;
      }
      if (r.advocateInvolved) advocateInvolvedCount++;
    }
    const autonomyShare = raw.length
      ? Math.round(((byLayer.autonomy || 0) * 100) / raw.length)
      : null;
    const avgComposite = compositeCount
      ? Math.round((compositeSum * 10) / compositeCount) / 10
      : null;

    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      byLayer,
      byType,
      byStatus,
      avgComposite,
      advocateInvolvedCount,
      crpdCompliance: { autonomyShare },
    });
  } catch (err) {
    return safeError(res, err, 'decisionRights.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DecisionRightsAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'decisionRights.get');
  }
});

// ── POST / — create new assessment (status=draft) ──────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!DECISION_TYPES.includes(String(body.decisionType))) {
      return res.status(400).json({
        success: false,
        message: `decisionType يجب أن يكون: ${DECISION_TYPES.join(' | ')}`,
      });
    }
    if (!ASSESSED_BY_ROLES.includes(String(body.assessedByRole))) {
      return res.status(400).json({
        success: false,
        message: `assessedByRole يجب أن يكون: ${ASSESSED_BY_ROLES.join(' | ')}`,
      });
    }
    const capacity = sanitizeCapacity(body.capacity);
    if (!capacity) {
      return res.status(400).json({
        success: false,
        message:
          'capacity يجب أن يحتوي على understanding + retention + weighing + communication (كل قيمة 0-3)',
      });
    }

    const doc = await DecisionRightsAssessment.create({
      beneficiaryId: body.beneficiaryId,
      branchId:
        body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : undefined,
      decisionType: body.decisionType,
      decisionDescription: String(body.decisionDescription || '').slice(0, 1000) || undefined,
      capacity,
      supportArrangement: String(body.supportArrangement || '').slice(0, 2000) || undefined,
      advocateInvolved: !!body.advocateInvolved,
      advocateUserId:
        body.advocateUserId && mongoose.isValidObjectId(body.advocateUserId)
          ? body.advocateUserId
          : undefined,
      assessedBy: req.user?.id || null,
      assessedByRole: body.assessedByRole,
      assessmentInstrument: String(body.assessmentInstrument || '').slice(0, 200) || undefined,
      assessedAt: body.assessedAt ? new Date(body.assessedAt) : new Date(),
      nextReviewDue: body.nextReviewDue ? new Date(body.nextReviewDue) : undefined,
      notes: String(body.notes || '').slice(0, 2000) || undefined,
      status: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'decisionRights.create');
  }
});

// ── POST /:id/finalize — transition draft → finalized ──────────────────
// Triggers the full Wave-18 invariant chain (lib computes layer + enforces
// supportArrangement on Layer 2/3 + advocateInvolved on restraint/seclusion/
// research/Layer 3). Routes that hit invariants return 400 with the error.
router.post('/:id/finalize', requireRole(FINALIZE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DecisionRightsAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status !== 'draft') {
      return res.status(409).json({
        success: false,
        message: 'لا يمكن إعتماد سجل ليس في حالة draft',
      });
    }
    // Optional last-mile patches the finalizer wants to apply atomically
    const body = req.body || {};
    if (body.supportArrangement != null) {
      row.supportArrangement = String(body.supportArrangement).slice(0, 2000);
    }
    if (body.advocateInvolved != null) row.advocateInvolved = !!body.advocateInvolved;
    if (body.advocateUserId && mongoose.isValidObjectId(body.advocateUserId)) {
      row.advocateUserId = body.advocateUserId;
    }
    if (body.nextReviewDue != null) row.nextReviewDue = new Date(body.nextReviewDue);
    row.status = 'finalized';
    try {
      await row.save();
    } catch (e) {
      // Wave-18 invariant violations bubble up as ValidationError. Return 400
      // with the model's Arabic message so the UI can surface it directly.
      return res.status(400).json({
        success: false,
        message: e.message || 'فشلت قواعد الإعتماد',
      });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'decisionRights.finalize');
  }
});

// ── POST /:id/record-outcome — log the decision outcome ───────────────
router.post('/:id/record-outcome', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const outcome = String(req.body?.decisionOutcome || '').trim();
    if (outcome.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'decisionOutcome مطلوب (5 أحرف على الأقل)',
      });
    }
    const row = await DecisionRightsAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status !== 'finalized') {
      return res.status(409).json({
        success: false,
        message: 'لا يمكن تسجيل النتيجة قبل إعتماد التقييم',
      });
    }
    row.decisionOutcome = outcome.slice(0, 2000);
    row.decisionMadeBy = req.user?.id || null;
    row.decisionMadeAt = req.body?.decisionMadeAt ? new Date(req.body.decisionMadeAt) : new Date();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'decisionRights.recordOutcome');
  }
});

// ── POST /:id/supersede — mark superseded by a newer assessment ───────
router.post('/:id/supersede', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const newerId = req.body?.supersededBy;
    if (!newerId || !mongoose.isValidObjectId(newerId)) {
      return res.status(400).json({ success: false, message: 'supersededBy مطلوب' });
    }
    if (String(newerId) === String(req.params.id)) {
      return res.status(400).json({ success: false, message: 'لا يمكن إستبدال السجل بنفسه' });
    }
    const row = await DecisionRightsAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'superseded') {
      return res.status(409).json({ success: false, message: 'السجل سبق أن استُبدل' });
    }
    const newer = await DecisionRightsAssessment.findOne({
      _id: newerId,
      ...branchFilter(req),
      beneficiaryId: row.beneficiaryId,
      decisionType: row.decisionType,
    }).select('_id beneficiaryId decisionType');
    if (!newer) {
      return res.status(404).json({
        success: false,
        message: 'السجل البديل غير موجود أو لا ينطبق على نفس المستفيد + نوع القرار',
      });
    }
    row.status = 'superseded';
    row.supersededBy = newer._id;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'decisionRights.supersede');
  }
});

// ── PATCH /:id — correct while status=draft ───────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DecisionRightsAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status !== 'draft') {
      return res.status(409).json({
        success: false,
        message: 'لا يمكن تعديل سجل تم إعتماده أو إستبداله',
      });
    }
    const body = req.body || {};
    if (body.decisionType != null) {
      if (!DECISION_TYPES.includes(String(body.decisionType))) {
        return res.status(400).json({ success: false, message: 'decisionType غير صالح' });
      }
      row.decisionType = body.decisionType;
    }
    if (body.decisionDescription != null) {
      row.decisionDescription = String(body.decisionDescription).slice(0, 1000);
    }
    if (body.capacity != null) {
      const cap = sanitizeCapacity(body.capacity);
      if (!cap) {
        return res.status(400).json({ success: false, message: 'capacity غير صالح' });
      }
      row.capacity = cap;
    }
    if (body.supportArrangement != null) {
      row.supportArrangement = String(body.supportArrangement).slice(0, 2000);
    }
    if (body.advocateInvolved != null) row.advocateInvolved = !!body.advocateInvolved;
    if (body.advocateUserId && mongoose.isValidObjectId(body.advocateUserId)) {
      row.advocateUserId = body.advocateUserId;
    }
    if (body.nextReviewDue != null) row.nextReviewDue = new Date(body.nextReviewDue);
    if (body.assessmentInstrument != null) {
      row.assessmentInstrument = String(body.assessmentInstrument).slice(0, 200);
    }
    if (body.notes != null) row.notes = String(body.notes).slice(0, 2000);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'decisionRights.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await DecisionRightsAssessment.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'decisionRights.delete');
  }
});

module.exports = router;

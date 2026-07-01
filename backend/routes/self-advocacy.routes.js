'use strict';

/**
 * self-advocacy.routes.js — Wave 518 (Phase B Rights & Voice — REST surface).
 *
 * REST surface for the W462 SelfAdvocacyTrainingPlan model. Per-beneficiary
 * plan that delivers the 5-Rights self-advocacy curriculum (be_heard /
 * consent / refuse / complain / community) on one of 4 age-banded tracks
 * (early / primary / teen / adult).
 *
 * Mounted via dualMountAuth at /api/(v1/)?self-advocacy.
 *
 * SINGLETON-PER-BENEFICIARY — the W462 schema declares
 *   beneficiaryId: { unique: true }
 * so only one active plan per beneficiary at any time. /by-beneficiary/:id
 * is the primary read; POST / refuses (409) when a plan already exists.
 *
 * Endpoints (12):
 *   GET    /                            list plans (paginated)
 *   GET    /by-beneficiary/:id          the plan for a beneficiary (singleton)
 *   GET    /stats                       branch-level analytics
 *   GET    /:id
 *   POST   /                            create (409 if exists)
 *   POST   /:id/module/:rightCode/start
 *   POST   /:id/module/:rightCode/complete
 *   POST   /:id/module/:rightCode/skip
 *   POST   /:id/hold                    transition active → on_hold
 *   POST   /:id/resume                  transition on_hold → active
 *   PATCH  /:id                         adjust target / adjustments / notes
 *   DELETE /:id                         admin-only
 *
 * Cross-tenant isolation: every endpoint uses branchFilter(req) and
 * mongoose.isValidObjectId guards per W269 doctrine.
 *
 * The model's pre-save hook recomputes completionPercentage via the
 * curriculum lib and auto-flips status to 'completed' once all 5 rights
 * are marked completed. Routes layer never sets completionPercentage or
 * derived fields directly.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const SelfAdvocacyTrainingPlan = require('../models/SelfAdvocacyTrainingPlan');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard);

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
  'therapist',
  'case_manager',
  'social_worker',
  'independent_advocate',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

// Enums mirrored from the model schema — drift guard wave518 enforces
// byte-match against W462 + ModuleCompletionSchema.
const TRACKS = ['track_early', 'track_primary', 'track_teen', 'track_adult'];
const STATUSES = ['active', 'on_hold', 'completed', 'archived'];
const RIGHT_CODES = ['be_heard', 'consent', 'refuse', 'complain', 'community'];
// eslint-disable-next-line no-unused-vars -- contract mirror asserted by self-advocacy-routes-wave518 drift guard
const MODULE_STATUSES = ['not_started', 'in_progress', 'completed', 'skipped'];
const DELIVERED_BY_ROLES = ['advocate', 'therapist', 'case_manager', 'family', 'peer'];

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

function buildInitialModules() {
  // Pre-populate the 5-rights slots so the UI doesn't have to do it.
  return RIGHT_CODES.map(code => ({
    rightCode: code,
    status: 'not_started',
    sessionsRequired: 1,
    sessionsCompleted: 0,
  }));
}

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.track && TRACKS.includes(String(req.query.track))) {
      filter.track = String(req.query.track);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      SelfAdvocacyTrainingPlan.find(filter)
        .sort({ updatedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      SelfAdvocacyTrainingPlan.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'selfAdvocacy.list');
  }
});

// ── GET /by-beneficiary/:id — singleton primary read ──────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SelfAdvocacyTrainingPlan.findOne({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'لا توجد خطة لهذا المستفيد' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'selfAdvocacy.byBeneficiary');
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
      startedAt: { $gte: from, $lte: to },
    };
    if (!filter.branchId && req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await SelfAdvocacyTrainingPlan.find(filter)
      .select('track status completionPercentage modules')
      .lean();
    const byTrack = TRACKS.reduce((acc, t) => ((acc[t] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    const moduleCompletion = RIGHT_CODES.reduce((acc, c) => ((acc[c] = 0), acc), {});
    let totalCompletion = 0;
    let withCompletion = 0;
    let fullyCompleted = 0;
    for (const r of raw) {
      if (r.track) byTrack[r.track] = (byTrack[r.track] || 0) + 1;
      if (r.status) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (typeof r.completionPercentage === 'number') {
        totalCompletion += r.completionPercentage;
        withCompletion++;
        if (r.completionPercentage === 100) fullyCompleted++;
      }
      for (const m of r.modules || []) {
        if (m.status === 'completed' && RIGHT_CODES.includes(m.rightCode)) {
          moduleCompletion[m.rightCode] = (moduleCompletion[m.rightCode] || 0) + 1;
        }
      }
    }
    const avgCompletion = withCompletion ? Math.round(totalCompletion / withCompletion) : null;

    res.json({
      success: true,
      from,
      to,
      total: raw.length,
      byTrack,
      byStatus,
      moduleCompletion,
      avgCompletion,
      fullyCompleted,
    });
  } catch (err) {
    return safeError(res, err, 'selfAdvocacy.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await SelfAdvocacyTrainingPlan.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'selfAdvocacy.get');
  }
});

// ── POST / — create (409 if exists) ────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!TRACKS.includes(String(body.track))) {
      return res.status(400).json({
        success: false,
        message: `track يجب أن يكون: ${TRACKS.join(' | ')}`,
      });
    }

    // Enforce singleton — explicit 409 instead of relying on unique index error
    const existing = await SelfAdvocacyTrainingPlan.findOne({
      ...branchFilter(req),
      beneficiaryId: body.beneficiaryId,
    }).select('_id status');
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'يوجد خطة مسبقة لهذا المستفيد',
        existingPlanId: existing._id,
        existingStatus: existing.status,
      });
    }

    const adjustments = Array.isArray(body.reasonableAdjustments)
      ? body.reasonableAdjustments.slice(0, 20).map(s => String(s).slice(0, 500))
      : [];

    const doc = await SelfAdvocacyTrainingPlan.create({
      beneficiaryId: body.beneficiaryId,
      branchId:
        body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : undefined,
      track: body.track,
      trackSelectionReasoning:
        String(body.trackSelectionReasoning || '').slice(0, 500) || undefined,
      modules: buildInitialModules(),
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
      targetCompletionDate: body.targetCompletionDate
        ? new Date(body.targetCompletionDate)
        : undefined,
      reasonableAdjustments: adjustments,
      createdBy: req.user?.id || null,
      notes: String(body.notes || '').slice(0, 2000) || undefined,
      status: 'active',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'selfAdvocacy.create');
  }
});

// ── Helper: locate the plan + module ───────────────────────────────────
async function findPlanAndModule(req) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return { error: { status: 400, message: 'معرّف غير صالح' } };
  }
  if (!RIGHT_CODES.includes(String(req.params.rightCode))) {
    return {
      error: {
        status: 400,
        message: `rightCode يجب أن يكون: ${RIGHT_CODES.join(' | ')}`,
      },
    };
  }
  const plan = await SelfAdvocacyTrainingPlan.findOne({
    _id: req.params.id,
    ...branchFilter(req),
  });
  if (!plan) return { error: { status: 404, message: 'السجل غير موجود' } };
  if (plan.status !== 'active' && plan.status !== 'on_hold') {
    return {
      error: { status: 409, message: 'لا يمكن تعديل خطة مكتملة أو مؤرشفة' },
    };
  }
  const mod = (plan.modules || []).find(m => m.rightCode === req.params.rightCode);
  if (!mod) return { error: { status: 404, message: 'الموديول غير موجود في الخطة' } };
  return { plan, mod };
}

// ── POST /:id/module/:rightCode/start ──────────────────────────────────
router.post('/:id/module/:rightCode/start', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { plan, mod, error } = await findPlanAndModule(req);
    if (error) return res.status(error.status).json({ success: false, message: error.message });
    if (mod.status === 'completed') {
      return res.status(409).json({ success: false, message: 'الموديول مكتمل' });
    }
    mod.status = 'in_progress';
    mod.startedAt = mod.startedAt || new Date();
    if (
      req.body?.deliveredByRole &&
      DELIVERED_BY_ROLES.includes(String(req.body.deliveredByRole))
    ) {
      mod.deliveredByRole = String(req.body.deliveredByRole);
    }
    if (req.body?.deliveredBy && mongoose.isValidObjectId(req.body.deliveredBy)) {
      mod.deliveredBy = req.body.deliveredBy;
    }
    if (
      typeof req.body?.sessionsRequired === 'number' &&
      req.body.sessionsRequired >= 1 &&
      req.body.sessionsRequired <= 10
    ) {
      mod.sessionsRequired = req.body.sessionsRequired;
    }
    await plan.save();
    res.json({ success: true, data: plan });
  } catch (err) {
    return safeError(res, err, 'selfAdvocacy.moduleStart');
  }
});

// ── POST /:id/module/:rightCode/complete ───────────────────────────────
router.post('/:id/module/:rightCode/complete', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { plan, mod, error } = await findPlanAndModule(req);
    if (error) return res.status(error.status).json({ success: false, message: error.message });
    mod.status = 'completed';
    mod.completedAt = req.body?.completedAt ? new Date(req.body.completedAt) : new Date();
    mod.startedAt = mod.startedAt || mod.completedAt;
    // Sessions counter — increments are bounded by sessionsRequired
    if (typeof req.body?.sessionsCompleted === 'number' && req.body.sessionsCompleted >= 0) {
      mod.sessionsCompleted = Math.min(mod.sessionsRequired, req.body.sessionsCompleted);
    } else {
      mod.sessionsCompleted = mod.sessionsRequired; // default: fully done
    }
    if (req.body?.notes != null) {
      mod.notes = String(req.body.notes).slice(0, 1000);
    }
    if (
      req.body?.deliveredByRole &&
      DELIVERED_BY_ROLES.includes(String(req.body.deliveredByRole))
    ) {
      mod.deliveredByRole = String(req.body.deliveredByRole);
    }
    if (req.body?.deliveredBy && mongoose.isValidObjectId(req.body.deliveredBy)) {
      mod.deliveredBy = req.body.deliveredBy;
    }
    // pre-save hook will recompute completionPercentage + auto-finalize at 100%
    await plan.save();
    res.json({ success: true, data: plan });
  } catch (err) {
    return safeError(res, err, 'selfAdvocacy.moduleComplete');
  }
});

// ── POST /:id/module/:rightCode/skip ──────────────────────────────────
router.post('/:id/module/:rightCode/skip', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const skipReason = String(req.body?.skipReason || '').trim();
    if (skipReason.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'skipReason مطلوب (5 أحرف على الأقل)',
      });
    }
    const { plan, mod, error } = await findPlanAndModule(req);
    if (error) return res.status(error.status).json({ success: false, message: error.message });
    if (mod.status === 'completed') {
      return res.status(409).json({ success: false, message: 'لا يمكن تخطّي موديول مكتمل' });
    }
    mod.status = 'skipped';
    mod.skipReason = skipReason.slice(0, 500);
    await plan.save();
    res.json({ success: true, data: plan });
  } catch (err) {
    return safeError(res, err, 'selfAdvocacy.moduleSkip');
  }
});

// ── POST /:id/hold ─────────────────────────────────────────────────────
router.post('/:id/hold', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const plan = await SelfAdvocacyTrainingPlan.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!plan) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (plan.status !== 'active') {
      return res.status(409).json({
        success: false,
        message: 'لا يمكن إيقاف خطة ليست في حالة active',
      });
    }
    plan.status = 'on_hold';
    if (req.body?.notes != null) plan.notes = String(req.body.notes).slice(0, 2000);
    await plan.save();
    res.json({ success: true, data: plan });
  } catch (err) {
    return safeError(res, err, 'selfAdvocacy.hold');
  }
});

// ── POST /:id/resume ───────────────────────────────────────────────────
router.post('/:id/resume', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const plan = await SelfAdvocacyTrainingPlan.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!plan) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (plan.status !== 'on_hold') {
      return res.status(409).json({
        success: false,
        message: 'لا يمكن استئناف خطة ليست في حالة on_hold',
      });
    }
    plan.status = 'active';
    await plan.save();
    res.json({ success: true, data: plan });
  } catch (err) {
    return safeError(res, err, 'selfAdvocacy.resume');
  }
});

// ── PATCH /:id — adjust track / target / adjustments / notes ──────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const plan = await SelfAdvocacyTrainingPlan.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!plan) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (plan.status === 'completed' || plan.status === 'archived') {
      return res.status(409).json({
        success: false,
        message: 'لا يمكن تعديل خطة مكتملة أو مؤرشفة',
      });
    }
    const body = req.body || {};
    if (body.track != null) {
      if (!TRACKS.includes(String(body.track))) {
        return res.status(400).json({ success: false, message: 'track غير صالح' });
      }
      plan.track = body.track;
    }
    if (body.trackSelectionReasoning != null) {
      plan.trackSelectionReasoning = String(body.trackSelectionReasoning).slice(0, 500);
    }
    if (body.targetCompletionDate != null) {
      plan.targetCompletionDate = body.targetCompletionDate
        ? new Date(body.targetCompletionDate)
        : undefined;
    }
    if (Array.isArray(body.reasonableAdjustments)) {
      plan.reasonableAdjustments = body.reasonableAdjustments
        .slice(0, 20)
        .map(s => String(s).slice(0, 500));
    }
    if (body.notes != null) plan.notes = String(body.notes).slice(0, 2000);
    await plan.save();
    res.json({ success: true, data: plan });
  } catch (err) {
    return safeError(res, err, 'selfAdvocacy.patch');
  }
});

// ── DELETE /:id — admin-only ──────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const plan = await SelfAdvocacyTrainingPlan.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!plan) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'selfAdvocacy.delete');
  }
});

module.exports = router;

'use strict';

/**
 * transition-plan.routes.js — Wave 361.
 *
 * Graduates the in-memory `rehabilitation-services/transition-planning-service.js`
 * scaffold (pre-W361 used `new Map()` only) to a Mongoose-backed surface.
 * Mounted at /api/(v1/)?transition-plan.
 *
 * Endpoints:
 *   GET    /                       — list w/ filters
 *   GET    /by-beneficiary/:id     — all plans for one beneficiary
 *   GET    /overdue                — in_progress + planned date passed
 *   GET    /stats                  — counts by type/status + avg readiness
 *   GET    /:id
 *   POST   /
 *   POST   /:id/assess-readiness   — set domainScores + compositeScore
 *   POST   /:id/start              — flip to in_progress (requires planned date)
 *   POST   /:id/complete           — flip to completed (requires actual date)
 *   POST   /:id/milestones         — add milestone
 *   PATCH  /:id/milestones/:msId   — update milestone status
 *   DELETE /:id/milestones/:msId
 *   POST   /:id/review             — add review entry
 *   PATCH  /:id
 *   DELETE /:id                    — admin only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Plan = require('../models/TransitionPlan');
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
  'branch_manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
  'social_worker',
  'parent',
  'guardian',
  'quality',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
  'social_worker',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { TRANSITION_TYPES, STATUSES, DOMAINS, MILESTONE_STATUSES } = Plan;

async function hydrate(items) {
  const ids = [...new Set(items.map(r => String(r.beneficiaryId)).filter(Boolean))].filter(id =>
    mongoose.isValidObjectId(id)
  );
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber dateOfBirth')
        .lean()
    : [];
  const map = new Map(benefs.map(b => [String(b._id), b]));
  return items.map(r => ({ ...r, beneficiary: map.get(String(r.beneficiaryId)) || null }));
}

function computeComposite(domainScores) {
  if (!Array.isArray(domainScores) || domainScores.length === 0) return null;
  const sum = domainScores.reduce((acc, d) => acc + (typeof d.score === 'number' ? d.score : 0), 0);
  return Math.round((sum / domainScores.length) * 10) / 10;
}

// ── GET / ──────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.transitionType && TRANSITION_TYPES.includes(String(req.query.transitionType))) {
      filter.transitionType = String(req.query.transitionType);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      Plan.find(filter)
        .sort({ updatedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Plan.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await Plan.find({ beneficiaryId: req.params.id })
      .sort({ plannedTransitionDate: 1, createdAt: -1 })
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.byBeneficiary');
  }
});

// ── GET /overdue ───────────────────────────────────────────────────
router.get('/overdue', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const filter = { status: 'in_progress', plannedTransitionDate: { $ne: null, $lt: now } };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Plan.find(filter).sort({ plannedTransitionDate: 1 }).limit(200).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.overdue');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Plan.find(filter)
      .select('transitionType status compositeReadinessScore plannedTransitionDate')
      .lean();
    const byType = TRANSITION_TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    let scored = 0;
    let scoreSum = 0;
    let overdueCount = 0;
    const now = Date.now();
    for (const p of raw) {
      byType[p.transitionType] = (byType[p.transitionType] || 0) + 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      if (typeof p.compositeReadinessScore === 'number') {
        scored++;
        scoreSum += p.compositeReadinessScore;
      }
      if (
        p.status === 'in_progress' &&
        p.plannedTransitionDate &&
        new Date(p.plannedTransitionDate).getTime() < now
      ) {
        overdueCount++;
      }
    }
    res.json({
      success: true,
      total: raw.length,
      byType,
      byStatus,
      averageReadinessScore: scored ? Math.round((scoreSum / scored) * 10) / 10 : null,
      overdueCount,
    });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Plan.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.get');
  }
});

// ── POST / ─────────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!TRANSITION_TYPES.includes(String(body.transitionType))) {
      return res.status(400).json({
        success: false,
        message: `transitionType يجب أن يكون: ${TRANSITION_TYPES.join(' | ')}`,
      });
    }
    const doc = await Plan.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      transitionType: body.transitionType,
      currentAgeMonths: typeof body.currentAgeMonths === 'number' ? body.currentAgeMonths : null,
      currentPlacement: String(body.currentPlacement || '').slice(0, 200),
      targetPlacement: String(body.targetPlacement || '').slice(0, 200),
      plannedTransitionDate: body.plannedTransitionDate
        ? new Date(body.plannedTransitionDate)
        : null,
      barriers: Array.isArray(body.barriers)
        ? body.barriers.slice(0, 20).map(s => String(s).slice(0, 200))
        : [],
      supports: Array.isArray(body.supports)
        ? body.supports.slice(0, 20).map(s => String(s).slice(0, 200))
        : [],
      familyInvolvement: String(body.familyInvolvement || '').slice(0, 1500),
      receivingProgramName: String(body.receivingProgramName || '').slice(0, 200),
      receivingContactName: String(body.receivingContactName || '').slice(0, 100),
      receivingContactPhone: String(body.receivingContactPhone || '').slice(0, 30),
      linkedCarePlanVersionId:
        body.linkedCarePlanVersionId && mongoose.isValidObjectId(body.linkedCarePlanVersionId)
          ? body.linkedCarePlanVersionId
          : null,
      linkedIepId:
        body.linkedIepId && mongoose.isValidObjectId(body.linkedIepId) ? body.linkedIepId : null,
      transitionLeadId: req.user?.id || null,
      transitionLeadName: req.user?.name || body.transitionLeadName || '',
      transitionLeadRole: req.user?.role || body.transitionLeadRole || '',
      status: 'draft',
      notes: String(body.notes || '').slice(0, 2000),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.create');
  }
});

// ── POST /:id/assess-readiness ─────────────────────────────────────
router.post('/:id/assess-readiness', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Plan.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    const body = req.body || {};
    if (!Array.isArray(body.domainScores) || body.domainScores.length === 0) {
      return res.status(400).json({ success: false, message: 'domainScores مطلوب' });
    }
    const cleaned = [];
    for (const ds of body.domainScores) {
      if (!DOMAINS.includes(String(ds.domain))) continue;
      const score = Math.max(1, Math.min(5, Number(ds.score) || 1));
      cleaned.push({
        domain: String(ds.domain),
        score,
        notes: String(ds.notes || '').slice(0, 500),
      });
    }
    if (cleaned.length === 0) {
      return res.status(400).json({ success: false, message: 'لم يتم تمرير domainScores صالحة' });
    }
    row.domainScores = cleaned;
    row.compositeReadinessScore = computeComposite(cleaned);
    row.readinessAssessedAt = new Date();
    row.readinessAssessorId = req.user?.id || null;
    row.readinessAssessorName = req.user?.name || '';
    if (row.status === 'draft') row.status = 'readiness_assessed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.assessReadiness');
  }
});

// ── POST /:id/start ────────────────────────────────────────────────
router.post('/:id/start', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Plan.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    if (!['draft', 'readiness_assessed', 'paused'].includes(row.status)) {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن بدء خطة بحالة ' + row.status });
    }
    const planned = req.body?.plannedTransitionDate
      ? new Date(req.body.plannedTransitionDate)
      : row.plannedTransitionDate;
    if (!planned) {
      return res.status(400).json({ success: false, message: 'plannedTransitionDate مطلوب' });
    }
    row.plannedTransitionDate = planned;
    row.status = 'in_progress';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.start');
  }
});

// ── POST /:id/complete ─────────────────────────────────────────────
router.post('/:id/complete', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Plan.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    if (row.status !== 'in_progress') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن إكمال خطة ليست قيد التنفيذ' });
    }
    row.actualTransitionDate = req.body?.actualTransitionDate
      ? new Date(req.body.actualTransitionDate)
      : new Date();
    row.status = 'completed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.complete');
  }
});

// ── POST /:id/milestones ───────────────────────────────────────────
router.post('/:id/milestones', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Plan.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    const body = req.body || {};
    if (!String(body.title || '').trim()) {
      return res.status(400).json({ success: false, message: 'title مطلوب' });
    }
    if (!body.dueDate) {
      return res.status(400).json({ success: false, message: 'dueDate مطلوب' });
    }
    row.milestones.push({
      title: String(body.title).slice(0, 300),
      description: String(body.description || '').slice(0, 1000),
      domain: DOMAINS.includes(String(body.domain)) ? String(body.domain) : null,
      dueDate: new Date(body.dueDate),
      status: MILESTONE_STATUSES.includes(String(body.status)) ? String(body.status) : 'pending',
      responsibleParty: String(body.responsibleParty || '').slice(0, 100),
      evidenceNotes: String(body.evidenceNotes || '').slice(0, 1000),
    });
    await row.save();
    const created = row.milestones[row.milestones.length - 1];
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.addMilestone');
  }
});

// ── PATCH /:id/milestones/:msId ────────────────────────────────────
router.patch('/:id/milestones/:msId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Plan.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    const ms = row.milestones.id(req.params.msId);
    if (!ms) return res.status(404).json({ success: false, message: 'المعلم غير موجود' });
    if (req.body?.status && MILESTONE_STATUSES.includes(String(req.body.status))) {
      ms.status = String(req.body.status);
      if (ms.status === 'achieved' && !ms.achievedAt) ms.achievedAt = new Date();
    }
    if (req.body?.evidenceNotes != null) {
      ms.evidenceNotes = String(req.body.evidenceNotes).slice(0, 1000);
    }
    if (req.body?.dueDate) ms.dueDate = new Date(req.body.dueDate);
    if (req.body?.responsibleParty != null) {
      ms.responsibleParty = String(req.body.responsibleParty).slice(0, 100);
    }
    await row.save();
    res.json({ success: true, data: ms });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.updateMilestone');
  }
});

// ── DELETE /:id/milestones/:msId ───────────────────────────────────
router.delete('/:id/milestones/:msId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Plan.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    const before = row.milestones.length;
    row.milestones = row.milestones.filter(m => String(m._id) !== String(req.params.msId));
    if (row.milestones.length === before) {
      return res.status(404).json({ success: false, message: 'المعلم غير موجود' });
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.deleteMilestone');
  }
});

// ── POST /:id/review ───────────────────────────────────────────────
router.post('/:id/review', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Plan.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    row.reviews.push({
      reviewDate: req.body?.reviewDate ? new Date(req.body.reviewDate) : new Date(),
      reviewType: String(req.body?.reviewType || '').slice(0, 50),
      reviewerId: req.user?.id || null,
      reviewerName: req.user?.name || '',
      findings: String(req.body?.findings || '').slice(0, 2000),
      nextReviewDate: req.body?.nextReviewDate ? new Date(req.body.nextReviewDate) : null,
    });
    await row.save();
    res.json({ success: true, data: row.reviews[row.reviews.length - 1] });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.addReview');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Plan.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    if (row.status === 'completed' || row.status === 'cancelled') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن تعديل خطة بحالة ' + row.status });
    }
    const editable = [
      'currentPlacement',
      'targetPlacement',
      'plannedTransitionDate',
      'barriers',
      'supports',
      'familyInvolvement',
      'receivingProgramName',
      'receivingContactName',
      'receivingContactPhone',
      'linkedCarePlanVersionId',
      'linkedIepId',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.patch');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Plan.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'transitionPlan.delete');
  }
});

module.exports = router;

'use strict';

/**
 * iep.routes.js — Wave 200b.
 *
 * Endpoints:
 *   GET    /                     — list w/ filters
 *   GET    /by-beneficiary/:id   — kid's plans across years
 *   GET    /:id
 *   POST   /                     — create draft
 *   PATCH  /:id                  — edit (blocked when status=active)
 *   POST   /:id/goals            — add goal
 *   PATCH  /:id/goals/:goalId    — update goal
 *   DELETE /:id/goals/:goalId
 *   POST   /:id/services         — add service
 *   DELETE /:id/services/:serviceId
 *   POST   /:id/sign             — append signature
 *   POST   /:id/transition       — move status (draft → team_review → signed → active)
 *   POST   /:id/review           — add review entry
 *   DELETE /:id                  — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const IEP = require('../models/IndividualEducationPlan');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
  'parent',
  'guardian',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
];
const TRANSITION_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'clinical_supervisor'];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { PLAN_TYPES, STATUSES, DOMAINS, GOAL_STATUSES } = IEP;

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

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.year) {
      const y = parseInt(req.query.year, 10);
      if (!Number.isNaN(y)) filter.planYear = y;
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      IEP.find(filter)
        .sort({ planYear: -1, updatedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean({ virtuals: true }),
      IEP.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'iep.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await IEP.find({ beneficiaryId: req.params.id })
      .sort({ planYear: -1 })
      .lean({ virtuals: true });
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'iep.byBeneficiary');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await IEP.findById(req.params.id).lean({ virtuals: true });
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'iep.get');
  }
});

// ── POST / — create draft ─────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!PLAN_TYPES.includes(body.planType)) {
      return res
        .status(400)
        .json({ success: false, message: `planType يجب أن يكون: ${PLAN_TYPES.join(' | ')}` });
    }
    const year = parseInt(body.planYear, 10);
    if (!year || year < 2020 || year > 2050) {
      return res.status(400).json({ success: false, message: 'planYear مطلوبة (2020-2050)' });
    }
    const doc = await IEP.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      planType: body.planType,
      planYear: year,
      studentAgeMonths: typeof body.studentAgeMonths === 'number' ? body.studentAgeMonths : null,
      primaryDisability: String(body.primaryDisability || '').slice(0, 150),
      secondaryConditions: Array.isArray(body.secondaryConditions)
        ? body.secondaryConditions.slice(0, 10)
        : [],
      strengths: String(body.strengths || '').slice(0, 1500),
      challenges: String(body.challenges || '').slice(0, 1500),
      parentInput: String(body.parentInput || '').slice(0, 1500),
      accommodations: Array.isArray(body.accommodations) ? body.accommodations : [],
      assistiveTech: Array.isArray(body.assistiveTech) ? body.assistiveTech : [],
      nextReviewDate: body.nextReviewDate ? new Date(body.nextReviewDate) : null,
      createdByName: req.user?.name || body.createdByName || '',
      status: 'draft',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'يوجد خطة بهذه السنة لنفس المستفيد' });
    }
    return safeError(res, err, 'iep.create');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await IEP.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    if (row.status === 'active' || row.status === 'archived') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن تعديل خطة بحالة ' + row.status });
    }
    const body = { ...(req.body || {}) };
    delete body.beneficiaryId;
    delete body.planYear;
    delete body.status; // use /transition
    delete body.signatures; // use /sign
    delete body.goals; // use /goals endpoints
    delete body.services; // use /services endpoints
    delete body.reviewHistory; // use /review
    Object.assign(row, body);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'iep.patch');
  }
});

// ── POST /:id/goals ────────────────────────────────────────────────────
router.post('/:id/goals', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const body = req.body || {};
    if (!DOMAINS.includes(body.domain)) {
      return res.status(400).json({ success: false, message: 'domain غير صالح' });
    }
    if (!String(body.text || '').trim() || !String(body.criteria || '').trim()) {
      return res.status(400).json({ success: false, message: 'text و criteria مطلوبان' });
    }
    const row = await IEP.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    if (row.status === 'archived') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل خطة مؤرشفة' });
    }
    row.goals.push({
      domain: body.domain,
      text: String(body.text).trim().slice(0, 500),
      baseline: String(body.baseline || '').slice(0, 500),
      criteria: String(body.criteria).trim().slice(0, 300),
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      status: GOAL_STATUSES.includes(body.status) ? body.status : 'not_started',
      objectives: Array.isArray(body.objectives) ? body.objectives : [],
      notes: String(body.notes || '').slice(0, 500),
    });
    await row.save();
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'iep.addGoal');
  }
});

// ── PATCH /:id/goals/:goalId ───────────────────────────────────────────
router.patch('/:id/goals/:goalId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.goalId)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await IEP.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    const goal = row.goals.id(req.params.goalId);
    if (!goal) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });
    const body = req.body || {};
    for (const k of ['text', 'baseline', 'criteria', 'notes']) {
      if (body[k] !== undefined) goal[k] = body[k];
    }
    if (body.targetDate !== undefined) {
      goal.targetDate = body.targetDate ? new Date(body.targetDate) : null;
    }
    if (body.status && GOAL_STATUSES.includes(body.status)) goal.status = body.status;
    if (body.domain && DOMAINS.includes(body.domain)) goal.domain = body.domain;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'iep.patchGoal');
  }
});

// ── DELETE /:id/goals/:goalId ──────────────────────────────────────────
router.delete('/:id/goals/:goalId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const row = await IEP.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    if (row.status === 'active' || row.status === 'archived') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن حذف هدف من خطة بحالة ' + row.status });
    }
    const goal = row.goals.id(req.params.goalId);
    if (!goal) return res.status(404).json({ success: false, message: 'الهدف غير موجود' });
    goal.deleteOne();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'iep.delGoal');
  }
});

// ── POST /:id/services ─────────────────────────────────────────────────
router.post('/:id/services', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!String(body.name || '').trim()) {
      return res.status(400).json({ success: false, message: 'name مطلوب' });
    }
    const row = await IEP.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    if (row.status === 'archived') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل خطة مؤرشفة' });
    }
    row.services.push({
      name: String(body.name).trim().slice(0, 100),
      provider: String(body.provider || '').slice(0, 100),
      frequencyPerWeek: typeof body.frequencyPerWeek === 'number' ? body.frequencyPerWeek : 1,
      durationMinutes: typeof body.durationMinutes === 'number' ? body.durationMinutes : null,
      location: String(body.location || '').slice(0, 100),
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      notes: String(body.notes || '').slice(0, 300),
    });
    await row.save();
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'iep.addService');
  }
});

// ── DELETE /:id/services/:serviceId ────────────────────────────────────
router.delete('/:id/services/:serviceId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const row = await IEP.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    if (row.status === 'archived') {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل خطة مؤرشفة' });
    }
    const svc = row.services.id(req.params.serviceId);
    if (!svc) return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
    svc.deleteOne();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'iep.delService');
  }
});

// ── POST /:id/sign — append signature ──────────────────────────────────
router.post('/:id/sign', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!String(body.role || '').trim() || !String(body.name || '').trim()) {
      return res.status(400).json({ success: false, message: 'role و name مطلوبان' });
    }
    const row = await IEP.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    if (row.status === 'archived') {
      return res.status(409).json({ success: false, message: 'لا يمكن توقيع خطة مؤرشفة' });
    }
    row.signatures.push({
      role: String(body.role).trim().slice(0, 50),
      name: String(body.name).trim().slice(0, 100),
      signedAt: new Date(),
      nafathRequestId: body.nafathRequestId ? String(body.nafathRequestId).slice(0, 100) : null,
    });
    await row.save();
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'iep.sign');
  }
});

// ── POST /:id/transition ──────────────────────────────────────────────
const TRANSITIONS = {
  draft: ['team_review'],
  team_review: ['draft', 'signed'],
  signed: ['active', 'team_review'],
  active: ['completed', 'archived'],
  completed: ['archived'],
  archived: [],
};
router.post('/:id/transition', requireRole(TRANSITION_ROLES), async (req, res) => {
  try {
    const next = String(req.body?.to || '');
    if (!STATUSES.includes(next)) {
      return res.status(400).json({ success: false, message: 'to غير صالح' });
    }
    const row = await IEP.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    const allowed = TRANSITIONS[row.status] || [];
    if (!allowed.includes(next)) {
      return res
        .status(409)
        .json({ success: false, message: `لا يمكن الانتقال من ${row.status} إلى ${next}` });
    }
    // Activation requires signatures
    if (next === 'active' && (!row.signatures || row.signatures.length === 0)) {
      return res.status(400).json({ success: false, message: 'لا يمكن تفعيل خطة غير موقعة' });
    }
    row.status = next;
    if (next === 'active' && !row.effectiveStartDate) {
      row.effectiveStartDate = new Date();
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'iep.transition');
  }
});

// ── POST /:id/review ──────────────────────────────────────────────────
router.post('/:id/review', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const summary = String(req.body?.summary || '').trim();
    if (!summary) {
      return res.status(400).json({ success: false, message: 'ملخص المراجعة مطلوب' });
    }
    const row = await IEP.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    row.reviewHistory.push({
      reviewDate: new Date(),
      summary: summary.slice(0, 1000),
      attendees: Array.isArray(req.body?.attendees) ? req.body.attendees.slice(0, 10) : [],
    });
    await row.save();
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'iep.review');
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    const row = await IEP.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'iep.delete');
  }
});

module.exports = router;

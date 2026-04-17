/**
 * care-plans-admin.routes.js — CRUD for CarePlan (IEP + therapeutic + life skills).
 *
 * Mount at /api/admin/care-plans. Covers:
 *  • GET /            — list + filters + pagination
 *  • GET /stats       — dashboard counters
 *  • GET /beneficiary/:id — all plans for a beneficiary
 *  • GET /:id         — single plan (full structure)
 *  • POST /           — create (auto planNumber)
 *  • PATCH /:id       — update (header + sections)
 *  • POST /:id/goals/:domainPath — add goal to a domain section
 *  • PATCH /:id/goals/:goalId — update a goal (progress, status)
 *  • DELETE /:id      — archive
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const CarePlan = require('../models/CarePlan');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

router.use(authenticateToken);

const STAFF_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'specialist',
  'coordinator',
  'social_worker',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'specialist',
];

function generatePlanNumber() {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CP-${y}-${rand}`;
}

// ── GET / — list ─────────────────────────────────────────────────────────
router.get('/', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { status, beneficiary, q, from, to, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (beneficiary && mongoose.isValidObjectId(beneficiary)) filter.beneficiary = beneficiary;
    if (from || to) {
      filter.startDate = {};
      if (from) filter.startDate.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        filter.startDate.$lte = d;
      }
    }
    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.planNumber = rx;
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const [items, total] = await Promise.all([
      CarePlan.find(filter)
        .select(
          'planNumber beneficiary startDate reviewDate status educational.enabled therapeutic.enabled lifeSkills.enabled createdAt updatedAt'
        )
        .sort({ startDate: -1, createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      CarePlan.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'care-plans.list');
  }
});

// ── GET /stats ───────────────────────────────────────────────────────────
router.get('/stats', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 30);

    const [total, byStatus, dueReview, active, withEducation, withTherapy, withLifeSkills] =
      await Promise.all([
        CarePlan.countDocuments({}),
        CarePlan.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        CarePlan.countDocuments({
          reviewDate: { $gte: now, $lte: soon },
          status: 'ACTIVE',
        }),
        CarePlan.countDocuments({ status: 'ACTIVE' }),
        CarePlan.countDocuments({ 'educational.enabled': true }),
        CarePlan.countDocuments({ 'therapeutic.enabled': true }),
        CarePlan.countDocuments({ 'lifeSkills.enabled': true }),
      ]);

    // Goal aggregate across all plans
    const goalStats = await CarePlan.aggregate([
      { $match: { status: 'ACTIVE' } },
      {
        $project: {
          allGoals: {
            $concatArrays: [
              { $ifNull: ['$educational.domains.academic.goals', []] },
              { $ifNull: ['$educational.domains.classroom.goals', []] },
              { $ifNull: ['$educational.domains.communication.goals', []] },
              { $ifNull: ['$therapeutic.domains.speech.goals', []] },
              { $ifNull: ['$therapeutic.domains.occupational.goals', []] },
              { $ifNull: ['$therapeutic.domains.physical.goals', []] },
              { $ifNull: ['$therapeutic.domains.behavioral.goals', []] },
              { $ifNull: ['$therapeutic.domains.psychological.goals', []] },
              { $ifNull: ['$lifeSkills.domains.selfCare.goals', []] },
              { $ifNull: ['$lifeSkills.domains.homeSkills.goals', []] },
              { $ifNull: ['$lifeSkills.domains.social.goals', []] },
              { $ifNull: ['$lifeSkills.domains.transport.goals', []] },
              { $ifNull: ['$lifeSkills.domains.financial.goals', []] },
            ],
          },
        },
      },
      { $unwind: '$allGoals' },
      {
        $group: {
          _id: '$allGoals.status',
          count: { $sum: 1 },
          avgProgress: { $avg: '$allGoals.progress' },
        },
      },
    ]);

    res.json({
      success: true,
      total,
      active,
      dueReview30d: dueReview,
      withEducation,
      withTherapy,
      withLifeSkills,
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      goals: Object.fromEntries(
        goalStats.map(r => [
          r._id || 'UNKNOWN',
          { count: r.count, avgProgress: r.avgProgress ? Math.round(r.avgProgress) : 0 },
        ])
      ),
    });
  } catch (err) {
    return safeError(res, err, 'care-plans.stats');
  }
});

// ── GET /beneficiary/:id — all plans for a beneficiary ───────────────────
router.get('/beneficiary/:id', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const items = await CarePlan.find({ beneficiary: req.params.id })
      .sort({ startDate: -1 })
      .lean();
    res.json({ success: true, items });
  } catch (err) {
    return safeError(res, err, 'care-plans.byBeneficiary');
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const doc = await CarePlan.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'care-plans.getOne');
  }
});

// ── POST / — create ──────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.beneficiary)
      return res.status(400).json({ success: false, message: 'معرّف المستفيد مطلوب' });
    if (!body.startDate)
      return res.status(400).json({ success: false, message: 'تاريخ البداية مطلوب' });
    if (!body.planNumber) body.planNumber = generatePlanNumber();

    const doc = await CarePlan.create(body);
    logger.info('[care-plans] created', { id: doc._id.toString(), by: req.user?.id });
    res.status(201).json({ success: true, data: doc, message: 'تم إنشاء خطة الرعاية' });
  } catch (err) {
    if (err?.code === 11000)
      return res.status(409).json({ success: false, message: 'رقم الخطة مستخدم مسبقاً' });
    if (err?.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    return safeError(res, err, 'care-plans.create');
  }
});

// ── PATCH /:id — update ──────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const body = { ...req.body };
    delete body._id;
    delete body.createdAt;
    const doc = await CarePlan.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    logger.info('[care-plans] updated', { id: req.params.id, by: req.user?.id });
    res.json({ success: true, data: doc, message: 'تم التحديث' });
  } catch (err) {
    if (err?.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    return safeError(res, err, 'care-plans.update');
  }
});

// ── POST /:id/goals/:domainPath — add goal ───────────────────────────────
// domainPath format: "educational.academic" | "therapeutic.speech" | "lifeSkills.selfCare"
router.post('/:id/goals/:domainPath', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const [plan, domain] = req.params.domainPath.split('.');
    if (!plan || !domain)
      return res.status(400).json({ success: false, message: 'مسار المجال غير صالح' });

    const path = `${plan}.domains.${domain}.goals`;
    const doc = await CarePlan.findByIdAndUpdate(
      req.params.id,
      {
        $push: { [path]: req.body },
        [`${plan}.enabled`]: true,
      },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc, message: 'تمت إضافة الهدف' });
  } catch (err) {
    return safeError(res, err, 'care-plans.addGoal');
  }
});

// ── PATCH /:id/goals/:goalId — update a goal anywhere in the plan ─────────
router.patch('/:id/goals/:goalId', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const plan = await CarePlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'غير موجود' });

    const allDomainPaths = [
      'educational.domains.academic.goals',
      'educational.domains.classroom.goals',
      'educational.domains.communication.goals',
      'therapeutic.domains.speech.goals',
      'therapeutic.domains.occupational.goals',
      'therapeutic.domains.physical.goals',
      'therapeutic.domains.behavioral.goals',
      'therapeutic.domains.psychological.goals',
      'lifeSkills.domains.selfCare.goals',
      'lifeSkills.domains.homeSkills.goals',
      'lifeSkills.domains.social.goals',
      'lifeSkills.domains.transport.goals',
      'lifeSkills.domains.financial.goals',
    ];

    let matched = false;
    for (const p of allDomainPaths) {
      const parts = p.split('.');
      let cur = plan;
      for (const part of parts) {
        cur = cur ? cur[part] : undefined;
      }
      if (Array.isArray(cur)) {
        const goal = cur.id
          ? cur.id(req.params.goalId)
          : cur.find(g => String(g._id) === req.params.goalId);
        if (goal) {
          Object.assign(goal, req.body);
          matched = true;
          break;
        }
      }
    }

    if (!matched)
      return res.status(404).json({ success: false, message: 'الهدف غير موجود داخل هذه الخطة' });
    await plan.save();
    res.json({ success: true, data: plan.toObject(), message: 'تم تحديث الهدف' });
  } catch (err) {
    return safeError(res, err, 'care-plans.updateGoal');
  }
});

// ── DELETE /:id — archive ────────────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await CarePlan.findByIdAndUpdate(
      req.params.id,
      { status: 'ARCHIVED' },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, message: 'تم الأرشفة' });
  } catch (err) {
    return safeError(res, err, 'care-plans.archive');
  }
});

module.exports = router;

/**
 * assessments-admin.routes.js — CRUD for ClinicalAssessment records.
 *
 * Mount at /api/admin/assessments. Covers:
 *  • GET /            — list + filters + pagination
 *  • GET /stats       — dashboard counters
 *  • GET /tools       — distinct tool list (for filters / autocomplete)
 *  • GET /beneficiary/:id/trend — per-tool score trend for a beneficiary
 *  • GET /:id         — single (populate beneficiary + therapist)
 *  • POST /           — create
 *  • PATCH /:id       — update
 *  • DELETE /:id      — archive
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const ClinicalAssessment = require('../models/ClinicalAssessment');
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
const HQ_ROLES = ['admin', 'superadmin', 'super_admin'];

function applyBranchScope(req, filter) {
  if (HQ_ROLES.includes(req.user?.role)) return filter;
  if (req.user?.branchId) filter.branchId = req.user.branchId;
  return filter;
}

// ── GET / — list ─────────────────────────────────────────────────────────
router.get('/', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const {
      beneficiary,
      therapist,
      tool,
      category,
      status,
      from,
      to,
      q,
      page = 1,
      limit = 25,
    } = req.query;
    let filter = {};
    if (beneficiary && mongoose.isValidObjectId(beneficiary)) filter.beneficiary = beneficiary;
    if (therapist && mongoose.isValidObjectId(therapist)) filter.therapist = therapist;
    if (tool) filter.tool = tool;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (from || to) {
      filter.assessmentDate = {};
      if (from) filter.assessmentDate.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        filter.assessmentDate.$lte = d;
      }
    }
    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ tool: rx }, { observations: rx }];
    }
    filter = applyBranchScope(req, filter);

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const [items, total] = await Promise.all([
      ClinicalAssessment.find(filter)
        .populate('beneficiary', 'firstName lastName firstName_ar lastName_ar beneficiaryNumber')
        .populate('therapist', 'firstName lastName fullName employeeNumber')
        .sort({ assessmentDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      ClinicalAssessment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'assessments.list');
  }
});

// ── GET /stats ───────────────────────────────────────────────────────────
router.get('/stats', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const branchFilter = applyBranchScope(req, {});
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [total, last30, byCategory, byTool, byInterpretation, avgScore] = await Promise.all([
      ClinicalAssessment.countDocuments(branchFilter),
      ClinicalAssessment.countDocuments({ ...branchFilter, createdAt: { $gte: since } }),
      ClinicalAssessment.aggregate([
        { $match: branchFilter },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ClinicalAssessment.aggregate([
        { $match: branchFilter },
        { $group: { _id: '$tool', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      ClinicalAssessment.aggregate([
        { $match: { ...branchFilter, interpretation: { $ne: null } } },
        { $group: { _id: '$interpretation', count: { $sum: 1 } } },
      ]),
      ClinicalAssessment.aggregate([
        { $match: { ...branchFilter, score: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$score' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      total,
      last30days: last30,
      avgScore: avgScore[0]?.avg ? Math.round(avgScore[0].avg) : null,
      scoredCount: avgScore[0]?.count || 0,
      byCategory: Object.fromEntries(byCategory.map(r => [r._id || 'other', r.count])),
      topTools: byTool.map(r => ({ tool: r._id, count: r.count })),
      byInterpretation: Object.fromEntries(byInterpretation.map(r => [r._id, r.count])),
    });
  } catch (err) {
    return safeError(res, err, 'assessments.stats');
  }
});

// ── GET /tools — distinct tool list ──────────────────────────────────────
router.get('/tools', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const branchFilter = applyBranchScope(req, {});
    const tools = await ClinicalAssessment.distinct('tool', branchFilter);
    res.json({ success: true, items: tools.filter(Boolean).sort() });
  } catch (err) {
    return safeError(res, err, 'assessments.tools');
  }
});

// ── GET /beneficiary/:id/trend — per-tool score history ─────────────────
router.get('/beneficiary/:id/trend', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const filter = { beneficiary: req.params.id };
    if (req.query.tool) filter.tool = req.query.tool;
    const items = await ClinicalAssessment.find(filter)
      .sort({ assessmentDate: 1 })
      .select('tool assessmentDate score rawScore interpretation scoreBreakdown')
      .lean();
    const byTool = {};
    for (const a of items) {
      (byTool[a.tool] ||= []).push({
        date: a.assessmentDate,
        score: a.score,
        rawScore: a.rawScore,
        interpretation: a.interpretation,
      });
    }
    res.json({ success: true, byTool, count: items.length });
  } catch (err) {
    return safeError(res, err, 'assessments.trend');
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const doc = await ClinicalAssessment.findById(req.params.id)
      .populate(
        'beneficiary',
        'firstName lastName firstName_ar lastName_ar beneficiaryNumber branchId'
      )
      .populate('therapist', 'firstName lastName fullName')
      .populate('reviewer', 'firstName lastName fullName')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });

    if (
      !HQ_ROLES.includes(req.user?.role) &&
      req.user?.branchId &&
      doc.branchId &&
      String(doc.branchId) !== String(req.user.branchId)
    ) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'assessments.getOne');
  }
});

// ── POST / ───────────────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = { ...req.body };
    if (!HQ_ROLES.includes(req.user?.role) && req.user?.branchId) body.branchId = req.user.branchId;
    body.createdBy = req.user?.id;

    const doc = await ClinicalAssessment.create(body);
    logger.info('[assessments] created', { id: doc._id.toString(), by: req.user?.id });
    res.status(201).json({ success: true, data: doc, message: 'تم حفظ التقييم' });
  } catch (err) {
    if (err?.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    return safeError(res, err, 'assessments.create');
  }
});

// ── PATCH /:id ───────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const body = { ...req.body };
    delete body._id;
    delete body.createdBy;
    body.updatedBy = req.user?.id;

    const doc = await ClinicalAssessment.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    logger.info('[assessments] updated', { id: req.params.id, by: req.user?.id });
    res.json({ success: true, data: doc, message: 'تم التحديث' });
  } catch (err) {
    if (err?.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    return safeError(res, err, 'assessments.update');
  }
});

// ── DELETE /:id — archive ────────────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await ClinicalAssessment.findByIdAndUpdate(
      req.params.id,
      { status: 'archived', updatedBy: req.user?.id },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, message: 'تم الأرشفة' });
  } catch (err) {
    return safeError(res, err, 'assessments.archive');
  }
});

module.exports = router;

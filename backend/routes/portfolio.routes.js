'use strict';

/**
 * portfolio.routes.js — Wave 199b.
 *
 * Per-beneficiary portfolio of photos/videos/artwork/achievements.
 * Phase 1: URL-based. Phase 2: file upload pipeline.
 *
 * Endpoints:
 *   GET    /by-beneficiary/:id    — gallery (sorted by achievementDate desc)
 *   GET    /milestones/:id        — only isMilestone=true items for /care/360 panel
 *   GET    /:id                   — single item
 *   POST   /                      — create item
 *   PATCH  /:id                   — edit metadata (title/desc/tags/visibility/milestone)
 *   DELETE /:id
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Portfolio = require('../models/BeneficiaryPortfolioItem');
const safeError = require('../utils/safeError');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
  'receptionist',
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
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'clinical_supervisor'];

const { TYPES, VISIBILITIES } = Portfolio;

/**
 * Apply role-based visibility filter on lists.
 * Parent role: only parent_and_staff + parent_only.
 * Staff roles: all.
 */
function visibilityFilter(req) {
  const role = String(req.user?.role || req.user?.roleCode || '').toLowerCase();
  if (role === 'parent' || role === 'guardian') {
    return { visibility: { $in: ['parent_and_staff', 'parent_only'] } };
  }
  return {};
}

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const filter = { beneficiaryId: req.params.id, ...visibilityFilter(req) };
    if (req.query.type && TYPES.includes(String(req.query.type))) {
      filter.type = String(req.query.type);
    }
    if (req.query.tag) {
      filter.tags = String(req.query.tag).trim();
    }
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const items = await Portfolio.find(filter).sort({ achievementDate: -1 }).limit(l).lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'portfolio.byBeneficiary');
  }
});

// ── GET /milestones/:id — only milestones for /care/360 panel ─────────
router.get('/milestones/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const items = await Portfolio.find({
      beneficiaryId: req.params.id,
      isMilestone: true,
      ...visibilityFilter(req),
    })
      .sort({ achievementDate: -1 })
      .limit(12)
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'portfolio.milestones');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Portfolio.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: 'العنصر غير موجود' });
    // Parents can't see staff_only items even by direct ID.
    const role = String(req.user?.role || req.user?.roleCode || '').toLowerCase();
    if ((role === 'parent' || role === 'guardian') && row.visibility === 'staff_only') {
      return res.status(403).json({ success: false, message: 'العنصر غير متاح' });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'portfolio.get');
  }
});

// ── POST / — create ───────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!TYPES.includes(String(body.type))) {
      return res
        .status(400)
        .json({ success: false, message: `النوع يجب أن يكون: ${TYPES.join(' | ')}` });
    }
    if (!String(body.title || '').trim()) {
      return res.status(400).json({ success: false, message: 'العنوان مطلوب' });
    }
    if (!String(body.url || '').trim()) {
      return res.status(400).json({ success: false, message: 'الرابط مطلوب' });
    }
    if (!body.achievementDate) {
      return res.status(400).json({ success: false, message: 'تاريخ الإنجاز مطلوب' });
    }
    const doc = await Portfolio.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      sectionId: body.sectionId && mongoose.isValidObjectId(body.sectionId) ? body.sectionId : null,
      type: body.type,
      title: String(body.title).trim().slice(0, 150),
      description: String(body.description || '').slice(0, 1000),
      url: String(body.url).trim().slice(0, 1000),
      thumbnailUrl: String(body.thumbnailUrl || '')
        .trim()
        .slice(0, 1000),
      mimeType: String(body.mimeType || '').slice(0, 100),
      sizeBytes: typeof body.sizeBytes === 'number' ? body.sizeBytes : null,
      achievementDate: new Date(body.achievementDate),
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 20).map(t => String(t).slice(0, 50)) : [],
      visibility: VISIBILITIES.includes(body.visibility) ? body.visibility : 'parent_and_staff',
      isMilestone: !!body.isMilestone,
      uploadedBy: req.user?.id || null,
      uploadedByName: req.user?.name || body.uploadedByName || '',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'portfolio.create');
  }
});

// ── PATCH /:id — edit metadata ────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const body = { ...(req.body || {}) };
    delete body.beneficiaryId;
    delete body.url;
    delete body.uploadedBy;
    if (body.type && !TYPES.includes(body.type)) {
      return res.status(400).json({ success: false, message: 'النوع غير صالح' });
    }
    if (body.visibility && !VISIBILITIES.includes(body.visibility)) {
      return res.status(400).json({ success: false, message: 'المستوى غير صالح' });
    }
    if (body.achievementDate) body.achievementDate = new Date(body.achievementDate);
    const row = await Portfolio.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!row) return res.status(404).json({ success: false, message: 'العنصر غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'portfolio.patch');
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Portfolio.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'العنصر غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'portfolio.delete');
  }
});

module.exports = router;

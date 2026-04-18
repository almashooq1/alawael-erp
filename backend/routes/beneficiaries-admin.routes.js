/**
 * beneficiaries-admin.routes.js — real CRUD for Beneficiaries.
 *
 * Distinct from the legacy `beneficiaries.js` (which is stubs/portal-auth
 * only). Mount at /api/admin/beneficiaries. Branch-scoped: non-HQ roles
 * see only their branch's beneficiaries.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');
const { normalize, buildOrClause } = require('../utils/arabicSearch');

router.use(authenticateToken);

const STAFF_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'specialist',
  'receptionist',
  'coordinator',
  'social_worker',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'receptionist',
];

// Apply branch scope for non-HQ roles.
function applyBranchScope(req, filter) {
  const role = req.user?.role || '';
  const HQ = ['admin', 'superadmin', 'super_admin'];
  if (HQ.includes(role)) return filter;
  if (req.user?.branchId) filter.branchId = req.user.branchId;
  return filter;
}

// ── GET / — list with filters + pagination ────────────────────────────────
router.get('/', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { status, gender, disabilityType, q, page = 1, limit = 25 } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (gender) filter.gender = gender;
    if (disabilityType) filter['disability.primaryType'] = disabilityType;
    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { firstName: rx },
        { lastName: rx },
        { firstName_ar: rx },
        { lastName_ar: rx },
        { nationalId: rx },
        { beneficiaryNumber: rx },
        { 'contact.primaryPhone': rx },
      ];
    }
    filter = applyBranchScope(req, filter);

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const [items, total] = await Promise.all([
      Beneficiary.find(filter)
        .select(
          'firstName lastName firstName_ar lastName_ar beneficiaryNumber nationalId dateOfBirth gender status disability.primaryType contact.primaryPhone branchId enrollmentDate createdAt'
        )
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Beneficiary.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'beneficiaries.list');
  }
});

// ── GET /search — Arabic-aware typeahead (names + IDs) ──────────────────
// Tuned for receptionist-at-front-desk: they often type ~3 chars and
// expect the match to survive alef variants (أحمد/احمد), ta-marbuta
// (فاطمة/فاطمه), and Arabic-Indic digits (١٢٣٤ vs 1234). Returns a
// compact projection (id + name + dob + phone + status), capped at 20.
router.get('/search', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ success: true, items: [], note: 'min 2 chars' });
    }

    const filter = applyBranchScope(req, {});
    const normalized = normalize(q);

    // Exact ID matches (beneficiary number, national ID) get priority —
    // receptionist types the whole ID, not a prefix.
    const exactId = {
      $or: [{ beneficiaryNumber: normalized.toUpperCase() }, { nationalId: normalized }],
    };

    // Arabic/English name prefix across 4 canonical fields
    const nameOr = buildOrClause(q, [
      'firstName_ar',
      'lastName_ar',
      'firstName',
      'lastName',
      'name',
    ]);
    // Numeric digits → also try substring match on phone (guardians call in)
    const digitsOnly = normalized.replace(/\D/g, '');
    const phoneOr =
      digitsOnly.length >= 3 ? [{ 'contact.primaryPhone': new RegExp(digitsOnly, 'i') }] : [];

    const combined = {
      $and: [filter, { $or: [exactId, ...(nameOr || []), ...phoneOr].flat() }],
    };

    const items = await Beneficiary.find(combined)
      .limit(20)
      .select(
        'firstName firstName_ar lastName lastName_ar beneficiaryNumber dateOfBirth status contact.primaryPhone'
      )
      .lean();

    res.json({
      success: true,
      items: items.map(b => ({
        _id: b._id,
        beneficiaryNumber: b.beneficiaryNumber,
        name_ar: [b.firstName_ar, b.lastName_ar].filter(Boolean).join(' ') || null,
        name_en: [b.firstName, b.lastName].filter(Boolean).join(' ') || null,
        dateOfBirth: b.dateOfBirth,
        status: b.status,
        phone: b.contact?.primaryPhone,
      })),
      count: items.length,
    });
  } catch (err) {
    return safeError(res, err, 'beneficiaries-admin.search');
  }
});

// ── GET /stats — counters for dashboard ──────────────────────────────────
router.get('/stats', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const branchFilter = applyBranchScope(req, {});
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [total, byStatus, byGender, byDisability, last30] = await Promise.all([
      Beneficiary.countDocuments(branchFilter),
      Beneficiary.aggregate([
        { $match: branchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Beneficiary.aggregate([
        { $match: branchFilter },
        { $group: { _id: '$gender', count: { $sum: 1 } } },
      ]),
      Beneficiary.aggregate([
        { $match: branchFilter },
        { $group: { _id: '$disability.primaryType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Beneficiary.countDocuments({ ...branchFilter, createdAt: { $gte: since } }),
    ]);

    res.json({
      success: true,
      total,
      last30days: last30,
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      byGender: Object.fromEntries(byGender.map(r => [r._id, r.count])),
      byDisability: byDisability.map(r => ({ type: r._id || 'غير محدد', count: r.count })),
    });
  } catch (err) {
    return safeError(res, err, 'beneficiaries.stats');
  }
});

// ── GET /:id — single beneficiary (full) ─────────────────────────────────
router.get('/:id', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const doc = await Beneficiary.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });

    // Branch-scope check
    const HQ = ['admin', 'superadmin', 'super_admin'];
    if (
      !HQ.includes(req.user?.role) &&
      req.user?.branchId &&
      String(doc.branchId) !== String(req.user.branchId)
    ) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'beneficiaries.getOne');
  }
});

// ── POST / — create new beneficiary ─────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = { ...req.body };
    // Auto-assign branch for non-HQ roles
    const HQ = ['admin', 'superadmin', 'super_admin'];
    if (!HQ.includes(req.user?.role) && req.user?.branchId) body.branchId = req.user.branchId;
    body.createdBy = req.user?.id;

    const doc = await Beneficiary.create(body);
    logger.info('[beneficiaries] created', { id: doc._id.toString(), by: req.user?.id });
    res.status(201).json({ success: true, data: doc, message: 'تم تسجيل المستفيد بنجاح' });
  } catch (err) {
    if (err?.code === 11000)
      return res.status(409).json({ success: false, message: 'رقم الهوية مسجَّل مسبقاً' });
    if (err?.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    return safeError(res, err, 'beneficiaries.create');
  }
});

// ── PATCH /:id — update ─────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = { ...req.body };
    delete body._id;
    body.updatedBy = req.user?.id;
    const doc = await Beneficiary.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    logger.info('[beneficiaries] updated', { id: req.params.id, by: req.user?.id });
    res.json({ success: true, data: doc, message: 'تم التحديث' });
  } catch (err) {
    if (err?.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    return safeError(res, err, 'beneficiaries.update');
  }
});

// ── DELETE /:id — soft delete (archive) ─────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await Beneficiary.findByIdAndUpdate(
      req.params.id,
      { isArchived: true, archivedAt: new Date(), archivedBy: req.user?.id, status: 'inactive' },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    logger.info('[beneficiaries] archived', { id: req.params.id, by: req.user?.id });
    res.json({ success: true, message: 'تم أرشفة المستفيد (soft delete — قابل للاسترجاع)' });
  } catch (err) {
    return safeError(res, err, 'beneficiaries.archive');
  }
});

module.exports = router;

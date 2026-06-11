'use strict';

/**
 * biomedical-waste.routes.js — W1123.
 *
 * Healthcare (biomedical) waste cradle-to-grave tracking. Mounted at
 * /api/(v1/)?biomedical-waste via features.registry (dualMountAuth).
 *
 * Endpoints:
 *   GET    /                     — list w/ filters (category/status/department)
 *   GET    /pending-collection   — generated|stored (awaiting pickup)
 *   GET    /overdue-storage      — stored past maxStorageHours (compliance breach)
 *   GET    /awaiting-disposal    — collected, not yet treated
 *   GET    /by-category          — kg + count aggregated per waste category
 *   GET    /stats                — counts + total kg by status + overdue count
 *   GET    /:id
 *   POST   /                     — create (segregate at source)
 *   PATCH  /:id                  — update mutable fields (non-lifecycle)
 *   POST   /:id/store            — → stored   (storageLocation)
 *   POST   /:id/collect          — → collected (vendor + manifest)
 *   POST   /:id/dispose          — → disposed (method + facility + certificate)
 *   POST   /:id/reject           — → rejected (reason)
 *   DELETE /:id                  — admin soft-delete
 *
 * Cross-branch isolation: branchFilter(req) on every query; every :id mutation
 * re-scopes by branch (findOne({_id, ...branchFilter})). No req.body spread
 * (anti mass-assignment, W506/W507). Org-scoped (no beneficiaryId).
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { requireRole } = require('../middleware/auth');
const { branchFilter, requireBranchAccess } = require('../middleware/branchScope.middleware');
const { effectiveBranchScope } = require('../middleware/assertBranchMatch');
const safeError = require('../utils/safeError');

const Waste = require('../models/BiomedicalWasteRecord');
const { CATEGORIES, STATUSES, DISPOSAL_METHODS } = Waste;

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'facility_manager',
  'safety_officer',
  'infection_control',
  'compliance',
  'quality',
  'nursing',
  'housekeeping',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'facility_manager',
  'safety_officer',
  'infection_control',
  'nursing',
  'housekeeping',
];
// Disposal is the compliance-critical terminal step (certificate of destruction).
const DISPOSE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'facility_manager',
  'safety_officer',
  'infection_control',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

router.use(requireBranchAccess);

const num = (v, d) =>
  v === undefined || v === null || v === '' || isNaN(Number(v)) ? d : Number(v);
const bad = (res, msg) => res.status(400).json({ success: false, message: msg });

// ── List ────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req), deletedAt: null };
    if (req.query.status && STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.wasteCategory && CATEGORIES.includes(req.query.wasteCategory)) {
      filter.wasteCategory = req.query.wasteCategory;
    }
    if (req.query.generationDepartment)
      filter.generationDepartment = req.query.generationDepartment;
    const limit = Math.min(num(req.query.limit, 100), 500);
    const rows = await Waste.find(filter).sort({ generationDate: -1 }).limit(limit);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    return safeError(res, err, 'biomedical-waste.list');
  }
});

// ── Cohorts ─────────────────────────────────────────────────────────
router.get('/pending-collection', requireRole(READ_ROLES), async (req, res) => {
  try {
    const rows = await Waste.find({
      ...branchFilter(req),
      deletedAt: null,
      status: { $in: ['generated', 'stored'] },
    }).sort({ generationDate: 1 });
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    return safeError(res, err, 'biomedical-waste.pending');
  }
});

router.get('/overdue-storage', requireRole(READ_ROLES), async (req, res) => {
  try {
    const rows = await Waste.find({
      ...branchFilter(req),
      deletedAt: null,
      status: 'stored',
    });
    const overdue = rows.filter(r => r.storageOverdue);
    res.json({ success: true, data: overdue, count: overdue.length });
  } catch (err) {
    return safeError(res, err, 'biomedical-waste.overdue');
  }
});

router.get('/awaiting-disposal', requireRole(READ_ROLES), async (req, res) => {
  try {
    const rows = await Waste.find({
      ...branchFilter(req),
      deletedAt: null,
      status: 'collected',
    }).sort({ collectionDate: 1 });
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    return safeError(res, err, 'biomedical-waste.awaiting-disposal');
  }
});

router.get('/by-category', requireRole(READ_ROLES), async (req, res) => {
  try {
    const branchId = effectiveBranchScope(req);
    const match = {
      deletedAt: null,
      ...(branchId ? { branchId: new mongoose.Types.ObjectId(branchId) } : {}),
    };
    const agg = await Waste.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$wasteCategory',
          totalKg: { $sum: '$quantityKg' },
          containers: { $sum: '$containerCount' },
          records: { $sum: 1 },
        },
      },
      { $sort: { totalKg: -1 } },
    ]);
    res.json({ success: true, data: agg });
  } catch (err) {
    return safeError(res, err, 'biomedical-waste.by-category');
  }
});

router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req), deletedAt: null };
    const [total, byStatus, kgAgg, storedRows] = await Promise.all([
      Waste.countDocuments(filter),
      Waste.aggregate([
        { $match: { deletedAt: null, ...(filter.branchId ? { branchId: filter.branchId } : {}) } },
        { $group: { _id: '$status', n: { $sum: 1 }, kg: { $sum: '$quantityKg' } } },
      ]),
      Waste.aggregate([
        { $match: { deletedAt: null, ...(filter.branchId ? { branchId: filter.branchId } : {}) } },
        { $group: { _id: null, totalKg: { $sum: '$quantityKg' } } },
      ]),
      Waste.find({ ...filter, status: 'stored' }),
    ]);
    const overdueStorage = storedRows.filter(r => r.storageOverdue).length;
    res.json({
      success: true,
      data: {
        total,
        byStatus: byStatus.reduce((m, s) => ((m[s._id] = { count: s.n, kg: s.kg }), m), {}),
        totalKg: kgAgg[0] ? kgAgg[0].totalKg : 0,
        overdueStorage,
      },
    });
  } catch (err) {
    return safeError(res, err, 'biomedical-waste.stats');
  }
});

// ── Read one ────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Waste.findOne({ _id: req.params.id, ...branchFilter(req), deletedAt: null });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'biomedical-waste.get');
  }
});

// ── Create (segregate at source) ────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const b = req.body || {};
    const branchId = effectiveBranchScope(req) || b.branchId;
    if (!branchId) return bad(res, 'الفرع مطلوب');
    if (!CATEGORIES.includes(b.wasteCategory)) return bad(res, 'فئة النفايات غير صالحة');
    if (!(Number(b.quantityKg) > 0)) return bad(res, 'الكمية (كجم) يجب أن تكون أكبر من صفر');

    // Explicit whitelist — no req.body spread (anti mass-assignment).
    const doc = await Waste.create({
      branchId,
      wasteCategory: b.wasteCategory,
      containerColor: b.containerColor,
      punctureProofContainer: b.punctureProofContainer === true,
      quantityKg: Number(b.quantityKg),
      containerCount: num(b.containerCount, 1),
      generationDate: b.generationDate ? new Date(b.generationDate) : new Date(),
      generationDepartment: b.generationDepartment,
      generationLocationNote: b.generationLocationNote,
      segregatedByName: b.segregatedByName,
      segregatedBy: mongoose.isValidObjectId(b.segregatedBy) ? b.segregatedBy : undefined,
      maxStorageHours: num(b.maxStorageHours, 48),
      notes: b.notes,
      handledBy: req.user && mongoose.isValidObjectId(req.user.id) ? req.user.id : undefined,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err.name === 'ValidationError') return bad(res, err.message);
    return safeError(res, err, 'biomedical-waste.create');
  }
});

// ── Update mutable (non-lifecycle) fields ───────────────────────────
const MUTABLE = [
  'containerColor',
  'punctureProofContainer',
  'quantityKg',
  'containerCount',
  'generationDepartment',
  'generationLocationNote',
  'segregatedByName',
  'maxStorageHours',
  'notes',
];
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Waste.findOne({ _id: req.params.id, ...branchFilter(req), deletedAt: null });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    for (const k of MUTABLE) {
      if (req.body[k] !== undefined) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.name === 'ValidationError') return bad(res, err.message);
    return safeError(res, err, 'biomedical-waste.update');
  }
});

// ── Lifecycle transitions ───────────────────────────────────────────
router.post('/:id/store', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Waste.findOne({ _id: req.params.id, ...branchFilter(req), deletedAt: null });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (!String(req.body?.storageLocation || '').trim()) return bad(res, 'موقع التخزين مطلوب');
    row.storageLocation = String(req.body.storageLocation).slice(0, 200);
    if (req.body.maxStorageHours !== undefined)
      row.maxStorageHours = num(req.body.maxStorageHours, 48);
    row.storedAt = new Date();
    row.status = 'stored';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.name === 'ValidationError') return bad(res, err.message);
    return safeError(res, err, 'biomedical-waste.store');
  }
});

router.post('/:id/collect', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Waste.findOne({ _id: req.params.id, ...branchFilter(req), deletedAt: null });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (!String(req.body?.collectionVendor || '').trim())
      return bad(res, 'جهة النقل المرخّصة مطلوبة');
    row.collectionVendor = String(req.body.collectionVendor).slice(0, 200);
    row.collectedByName = String(req.body.collectedByName || '').slice(0, 120);
    row.manifestNumber = String(req.body.manifestNumber || '').slice(0, 100);
    row.collectionDate = req.body.collectionDate ? new Date(req.body.collectionDate) : new Date();
    row.status = 'collected';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.name === 'ValidationError') return bad(res, err.message);
    return safeError(res, err, 'biomedical-waste.collect');
  }
});

router.post('/:id/dispose', requireRole(DISPOSE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Waste.findOne({ _id: req.params.id, ...branchFilter(req), deletedAt: null });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (!DISPOSAL_METHODS.includes(req.body?.disposalMethod))
      return bad(res, 'طريقة التخلّص غير صالحة');
    if (!String(req.body?.disposalFacility || '').trim()) return bad(res, 'منشأة المعالجة مطلوبة');
    row.disposalMethod = req.body.disposalMethod;
    row.disposalFacility = String(req.body.disposalFacility).slice(0, 200);
    row.treatmentCertificateRef = String(req.body.treatmentCertificateRef || '').slice(0, 200);
    row.disposalDate = req.body.disposalDate ? new Date(req.body.disposalDate) : new Date();
    row.status = 'disposed';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.name === 'ValidationError') return bad(res, err.message);
    return safeError(res, err, 'biomedical-waste.dispose');
  }
});

router.post('/:id/reject', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Waste.findOne({ _id: req.params.id, ...branchFilter(req), deletedAt: null });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (!String(req.body?.reason || '').trim()) return bad(res, 'سبب الرفض مطلوب');
    row.rejectedReason = String(req.body.reason).slice(0, 500);
    row.status = 'rejected';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.name === 'ValidationError') return bad(res, err.message);
    return safeError(res, err, 'biomedical-waste.reject');
  }
});

// ── Soft-delete (admin) ─────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return bad(res, 'معرّف غير صالح');
    const row = await Waste.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    row.deletedAt = new Date();
    await row.save();
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'biomedical-waste.delete');
  }
});

module.exports = router;

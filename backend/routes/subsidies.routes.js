'use strict';

/**
 * subsidies.routes.js — Wave 205b.
 *
 * Endpoints:
 *   GET    /                    — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id  — kid's history (current + prior years)
 *   GET    /summary             — per-type sums for a given year (and optional month)
 *   POST   /                    — upsert (beneficiary+year+month+type)
 *   PATCH  /:id                 — update fields
 *   POST   /:id/mark-received   — mark received w/ date + receipt#
 *   DELETE /:id
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');

const Subsidy = require('../models/BeneficiarySubsidyEntry');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');
const { assertBeneficiaryInScope } = require('../utils/beneficiaryBranchGate');

router.use(authenticateToken);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'social_worker',
  'finance',
  'receptionist',
];
const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'social_worker', 'finance'];

const { TYPES, STATUSES } = Subsidy;

async function getScopedBeneficiaryIds(req) {
  if (req.branchScope?.allBranches) return null;
  if (Array.isArray(req._subsidyScopedBeneficiaryIds)) return req._subsidyScopedBeneficiaryIds;
  const kids = await Beneficiary.find(branchFilter(req)).select('_id').lean();
  req._subsidyScopedBeneficiaryIds = kids.map(k => k._id);
  return req._subsidyScopedBeneficiaryIds;
}

async function mergeScopedBeneficiaryFilter(req, filter = {}) {
  const scopedIds = await getScopedBeneficiaryIds(req);
  if (scopedIds === null) return filter;
  if (filter.beneficiaryId) {
    const inScope = scopedIds.some(id => String(id) === String(filter.beneficiaryId));
    if (!inScope) return { ...filter, beneficiaryId: { $in: [] } };
    return filter;
  }
  return { ...filter, beneficiaryId: { $in: scopedIds } };
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

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.year) filter.year = parseInt(req.query.year, 10) || filter.year;
    if (req.query.month) filter.month = parseInt(req.query.month, 10) || filter.month;
    if (req.query.subsidyType && TYPES.includes(String(req.query.subsidyType))) {
      filter.subsidyType = String(req.query.subsidyType);
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    const scopedFilter = await mergeScopedBeneficiaryFilter(req, filter);
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      Subsidy.find(scopedFilter)
        .sort({ year: -1, month: -1, subsidyType: 1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Subsidy.countDocuments(scopedFilter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'subsidies.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const denied = await assertBeneficiaryInScope(req, req.params.id, res);
    if (denied) return denied;
    const items = await Subsidy.find({ beneficiaryId: req.params.id })
      .sort({ year: -1, month: -1 })
      .lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'subsidies.byBeneficiary');
  }
});

// ── GET /summary?year=2026[&month=5] ──────────────────────────────────
router.get('/summary', requireRole(READ_ROLES), async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const match = { year };
    if (req.query.month) match.month = parseInt(req.query.month, 10);
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      match.branchId = new mongoose.Types.ObjectId(req.query.branchId);
    }
    const scopedBeneficiaryIds = await getScopedBeneficiaryIds(req);
    if (scopedBeneficiaryIds !== null) {
      match.beneficiaryId = { $in: scopedBeneficiaryIds };
    }
    const rows = await Subsidy.aggregate([
      { $match: match },
      {
        $group: {
          _id: { type: '$subsidyType', status: '$status' },
          total: { $sum: '$amountSAR' },
          count: { $sum: 1 },
        },
      },
    ]);
    // Reshape: per type → { expected, received, overdue, cancelled, total }
    const byType = {};
    let grandTotal = 0;
    for (const t of TYPES) {
      byType[t] = {
        expected: 0,
        received: 0,
        overdue: 0,
        cancelled: 0,
        totalReceived: 0,
        count: 0,
      };
    }
    for (const r of rows) {
      const type = r._id.type;
      const status = r._id.status;
      if (!byType[type]) continue;
      byType[type][status] = r.total;
      byType[type].count += r.count;
      if (status === 'received') {
        byType[type].totalReceived += r.total;
        grandTotal += r.total;
      }
    }
    res.json({
      success: true,
      year,
      month: match.month || null,
      byType,
      grandTotalReceived: grandTotal,
    });
  } catch (err) {
    return safeError(res, err, 'subsidies.summary');
  }
});

// ── POST / — upsert ───────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const denied = await assertBeneficiaryInScope(req, body.beneficiaryId, res);
    if (denied) return denied;
    const beneficiary = await Beneficiary.findById(body.beneficiaryId).select('branchId').lean();
    const year = parseInt(body.year, 10);
    const month = parseInt(body.month, 10);
    if (!year || year < 2020 || year > 2050) {
      return res.status(400).json({ success: false, message: 'year مطلوبة (2020-2050)' });
    }
    if (!month || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'month مطلوب (1-12)' });
    }
    if (!TYPES.includes(body.subsidyType)) {
      return res.status(400).json({
        success: false,
        message: `subsidyType يجب أن يكون: ${TYPES.join(' | ')}`,
      });
    }
    if (typeof body.amountSAR !== 'number' || body.amountSAR < 0) {
      return res.status(400).json({ success: false, message: 'amountSAR مطلوب وغير سالب' });
    }
    const update = {
      beneficiaryId: body.beneficiaryId,
      branchId: beneficiary?.branchId || null,
      year,
      month,
      subsidyType: body.subsidyType,
      amountSAR: body.amountSAR,
      status: STATUSES.includes(body.status) ? body.status : 'expected',
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
      receivedDate: body.receivedDate ? new Date(body.receivedDate) : null,
      receiptNumber: String(body.receiptNumber || '').slice(0, 50),
      notes: String(body.notes || '').slice(0, 500),
      enteredByName: req.user?.name || body.enteredByName || '',
    };
    const doc = await Subsidy.findOneAndUpdate(
      { beneficiaryId: body.beneficiaryId, year, month, subsidyType: body.subsidyType },
      update,
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'subsidies.create');
  }
});

// ── PATCH /:id ────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const body = { ...(req.body || {}) };
    delete body.beneficiaryId;
    delete body.year;
    delete body.month;
    delete body.subsidyType;
    if (body.status && !STATUSES.includes(body.status)) {
      return res.status(400).json({ success: false, message: 'status غير صالح' });
    }
    if (body.expectedDate) body.expectedDate = new Date(body.expectedDate);
    if (body.receivedDate) body.receivedDate = new Date(body.receivedDate);
    const scopedFilter = await mergeScopedBeneficiaryFilter(req, { _id: req.params.id });
    const row = await Subsidy.findOneAndUpdate(scopedFilter, body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'subsidies.patch');
  }
});

// ── POST /:id/mark-received ───────────────────────────────────────────
router.post('/:id/mark-received', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const update = {
      status: 'received',
      receivedDate: req.body?.receivedDate ? new Date(req.body.receivedDate) : new Date(),
    };
    if (req.body?.receiptNumber) {
      update.receiptNumber = String(req.body.receiptNumber).slice(0, 50);
    }
    const scopedFilter = await mergeScopedBeneficiaryFilter(req, { _id: req.params.id });
    const row = await Subsidy.findOneAndUpdate(scopedFilter, update, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'subsidies.markReceived');
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const scopedFilter = await mergeScopedBeneficiaryFilter(req, { _id: req.params.id });
    const row = await Subsidy.findOneAndDelete(scopedFilter);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'subsidies.delete');
  }
});

module.exports = router;

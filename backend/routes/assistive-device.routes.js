'use strict';

/**
 * assistive-device.routes.js — Wave 359.
 *
 * Assistive device catalog + loan + maintenance lifecycle surface.
 * Mounted at /api/(v1/)?assistive-device.
 *
 * Endpoints (catalog):
 *   GET    /                         — list w/ filters
 *   GET    /available                — availability=available + category filter
 *   GET    /due-maintenance          — nextMaintenanceDue in past
 *   GET    /overdue-loans            — expected-return passed
 *   GET    /stats                    — counts by category + availability
 *   GET    /:id
 *   POST   /
 *   PATCH  /:id
 *   POST   /:id/retire
 *   DELETE /:id                      — admin only
 *
 * Endpoints (loans):
 *   POST   /:id/loans                — request + (auto-approve if approved=true)
 *   POST   /:id/loans/:loanId/approve
 *   POST   /:id/loans/:loanId/check-out
 *   POST   /:id/loans/:loanId/return
 *   POST   /:id/loans/:loanId/mark-lost
 *   POST   /:id/loans/:loanId/mark-damaged
 *   POST   /:id/loans/:loanId/cancel
 *
 * Endpoints (maintenance):
 *   POST   /:id/maintenance          — record maintenance event
 *   POST   /:id/maintenance/start    — flip availability → maintenance
 *   POST   /:id/maintenance/end      — flip back to available
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Device = require('../models/AssistiveDevice');
const Beneficiary = require('../models/Beneficiary');
const safeError = require('../utils/safeError');
const { escapeRegex } = require('../utils/sanitize');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');

router.use(authenticateToken);
// W443: branch-scope every assistive-device endpoint. Pre-W443 the
// model carried `branchId` but the routes filtered only optionally
// (when ?branchId= was supplied) and instance reads (findById) had
// zero branch check — a clinician in branch A could read, modify,
// retire, loan, or delete devices in branch B simply by knowing the
// ObjectId. `requireBranchAccess` populates `req.branchScope`;
// `branchFilter(req)` returns `{ branchId: <user's branch> }` for
// scoped users and `{}` for unrestricted (admin/super_admin).
router.use(requireBranchAccess);
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
  'nurse',
  'inventory',
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
  'inventory',
];
const APPROVE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'inventory',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { CATEGORIES, AVAILABILITY, LOAN_STATUSES, MAINTENANCE_KINDS, CONDITION_GRADES } = Device;

function pushLoanCapped(doc, loanObj) {
  doc.loans.push(loanObj);
  if (doc.loans.length > 50) {
    doc.loans = doc.loans.slice(-50);
  }
}
function pushMaintenanceCapped(doc, entry) {
  doc.maintenance.push(entry);
  if (doc.maintenance.length > 30) {
    doc.maintenance = doc.maintenance.slice(-30);
  }
}

async function hydrateLoans(items) {
  // For listings — hydrate currentLoaneeId
  const ids = [...new Set(items.map(r => String(r.currentLoaneeId)).filter(Boolean))].filter(id =>
    mongoose.isValidObjectId(id)
  );
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean()
    : [];
  const map = new Map(benefs.map(b => [String(b._id), b]));
  return items.map(r => ({
    ...r,
    currentLoanee: map.get(String(r.currentLoaneeId)) || null,
  }));
}

// ─── Catalog endpoints ───────────────────────────────────────────────

// ── GET / ──────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; // W443: enforce caller's branch scope
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      // Allow narrowing to a sub-branch only if caller can already see it
      // (branchFilter constrains the OR-set; this is an AND-narrow).
      filter.branchId = req.query.branchId;
    }
    if (req.query.category && CATEGORIES.includes(String(req.query.category))) {
      filter.category = String(req.query.category);
    }
    if (req.query.availability && AVAILABILITY.includes(String(req.query.availability))) {
      filter.availability = String(req.query.availability);
    }
    if (req.query.assetTag) {
      // escapeRegex defangs catastrophic-backtracking patterns like
      // `(a+)+$` that would otherwise let the caller pin a Mongo query
      // for minutes / seconds via ReDoS. Slice keeps the input bounded
      // even after escaping.
      filter.assetTag = new RegExp(escapeRegex(String(req.query.assetTag).slice(0, 50)), 'i');
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      Device.find(filter)
        .sort({ updatedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Device.countDocuments(filter),
    ]);
    const items = await hydrateLoans(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'device.list');
  }
});

// ── GET /available ─────────────────────────────────────────────────
router.get('/available', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req), availability: 'available' }; // W443
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.category && CATEGORIES.includes(String(req.query.category))) {
      filter.category = String(req.query.category);
    }
    const items = await Device.find(filter).sort({ name: 1 }).limit(500).lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'device.available');
  }
});

// ── GET /due-maintenance ───────────────────────────────────────────
router.get('/due-maintenance', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      ...branchFilter(req), // W443
      availability: { $ne: 'retired' },
      nextMaintenanceDue: { $ne: null, $lt: now },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const items = await Device.find(filter).sort({ nextMaintenanceDue: 1 }).limit(200).lean();
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'device.dueMaintenance');
  }
});

// ── GET /overdue-loans ─────────────────────────────────────────────
router.get('/overdue-loans', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      ...branchFilter(req), // W443
      availability: 'loaned',
      currentLoanExpectedReturnAt: { $ne: null, $lt: now },
    };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Device.find(filter)
      .sort({ currentLoanExpectedReturnAt: 1 })
      .limit(200)
      .lean();
    const items = await hydrateLoans(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'device.overdueLoans');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) }; // W443
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Device.find(filter)
      .select('category availability nextMaintenanceDue currentLoanExpectedReturnAt')
      .lean();
    const byCategory = CATEGORIES.reduce((acc, c) => ((acc[c] = 0), acc), {});
    const byAvailability = AVAILABILITY.reduce((acc, a) => ((acc[a] = 0), acc), {});
    let overdueLoanCount = 0;
    let dueMaintenanceCount = 0;
    const now = Date.now();
    for (const d of raw) {
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;
      byAvailability[d.availability] = (byAvailability[d.availability] || 0) + 1;
      if (
        d.availability === 'loaned' &&
        d.currentLoanExpectedReturnAt &&
        new Date(d.currentLoanExpectedReturnAt).getTime() < now
      ) {
        overdueLoanCount++;
      }
      if (
        d.availability !== 'retired' &&
        d.nextMaintenanceDue &&
        new Date(d.nextMaintenanceDue).getTime() < now
      ) {
        dueMaintenanceCount++;
      }
    }
    res.json({
      success: true,
      total: raw.length,
      byCategory,
      byAvailability,
      overdueLoanCount,
      dueMaintenanceCount,
    });
  } catch (err) {
    return safeError(res, err, 'device.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    // W443: findOne with branch filter so cross-tenant IDs 404 instead
    // of leaking the device row.
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    const [hydrated] = await hydrateLoans([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'device.get');
  }
});

// ── POST / ─────────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!String(body.assetTag || '').trim()) {
      return res.status(400).json({ success: false, message: 'assetTag مطلوب' });
    }
    if (!String(body.name || '').trim()) {
      return res.status(400).json({ success: false, message: 'name مطلوب' });
    }
    if (!CATEGORIES.includes(String(body.category))) {
      return res.status(400).json({
        success: false,
        message: `الفئة يجب أن تكون: ${CATEGORIES.join(' | ')}`,
      });
    }
    const doc = await Device.create({
      assetTag: String(body.assetTag).slice(0, 50),
      serialNumber: String(body.serialNumber || '').slice(0, 100),
      name: String(body.name).slice(0, 200),
      nameAr: String(body.nameAr || '').slice(0, 200),
      category: body.category,
      manufacturer: String(body.manufacturer || '').slice(0, 100),
      modelNumber: String(body.modelNumber || '').slice(0, 100),
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      storageLocation: String(body.storageLocation || '').slice(0, 200),
      acquiredAt: body.acquiredAt ? new Date(body.acquiredAt) : null,
      acquiredFrom: String(body.acquiredFrom || '').slice(0, 200),
      acquisitionCost:
        typeof body.acquisitionCost === 'number' ? Math.max(0, body.acquisitionCost) : 0,
      fundingSource: body.fundingSource || null,
      warrantyExpiresAt: body.warrantyExpiresAt ? new Date(body.warrantyExpiresAt) : null,
      currentCondition: CONDITION_GRADES.includes(String(body.currentCondition))
        ? String(body.currentCondition)
        : 'good',
      maintenanceIntervalDays:
        typeof body.maintenanceIntervalDays === 'number' ? body.maintenanceIntervalDays : null,
      nextMaintenanceDue: body.nextMaintenanceDue ? new Date(body.nextMaintenanceDue) : null,
      availability: 'available',
      notes: String(body.notes || '').slice(0, 2000),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'device.create');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }); // W443
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    if (row.availability === 'retired') {
      return res.status(409).json({ success: false, message: 'الجهاز متقاعد ولا يمكن تعديله' });
    }
    const editable = [
      'name',
      'nameAr',
      'manufacturer',
      'modelNumber',
      'storageLocation',
      'acquiredFrom',
      'acquisitionCost',
      'fundingSource',
      'warrantyExpiresAt',
      'currentCondition',
      'maintenanceIntervalDays',
      'nextMaintenanceDue',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'device.patch');
  }
});

// ── POST /:id/retire ───────────────────────────────────────────────
router.post('/:id/retire', requireRole(APPROVE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }); // W443
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    if (row.availability === 'loaned') {
      return res.status(409).json({ success: false, message: 'لا يمكن تقاعد جهاز مُعار حالياً' });
    }
    if (!String(req.body?.retirementReason || '').trim()) {
      return res.status(400).json({ success: false, message: 'سبب التقاعد مطلوب' });
    }
    row.availability = 'retired';
    row.retiredAt = new Date();
    row.retirementReason = String(req.body.retirementReason).slice(0, 500);
    row.currentLoaneeId = null;
    row.currentLoanStartedAt = null;
    row.currentLoanExpectedReturnAt = null;
    row.inMaintenanceSince = null;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'device.retire');
  }
});

// ─── Loan endpoints ──────────────────────────────────────────────────

// ── POST /:id/loans ────────────────────────────────────────────────
router.post('/:id/loans', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }); // W443
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    if (row.availability !== 'available') {
      return res
        .status(409)
        .json({ success: false, message: `لا يمكن طلب جهاز بحالة ${row.availability}` });
    }
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    const loan = {
      beneficiaryId: body.beneficiaryId,
      requestedAt: new Date(),
      requestedBy: req.user?.id || null,
      requestedByName: req.user?.name || '',
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
      expectedReturnAt: body.expectedReturnAt ? new Date(body.expectedReturnAt) : null,
      status: 'requested',
      conditionOnCheckout: CONDITION_GRADES.includes(String(body.conditionOnCheckout))
        ? String(body.conditionOnCheckout)
        : 'good',
      purpose: String(body.purpose || '').slice(0, 300),
      deposit: typeof body.deposit === 'number' ? Math.max(0, body.deposit) : 0,
      fee: typeof body.fee === 'number' ? Math.max(0, body.fee) : 0,
      notes: String(body.notes || '').slice(0, 500),
    };
    pushLoanCapped(row, loan);
    await row.save();
    const created = row.loans[row.loans.length - 1];
    res.status(201).json({ success: true, data: created, deviceId: row._id });
  } catch (err) {
    return safeError(res, err, 'device.loanRequest');
  }
});

// ── POST /:id/loans/:loanId/approve ────────────────────────────────
router.post('/:id/loans/:loanId/approve', requireRole(APPROVE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }); // W443
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    const loan = row.loans.id(req.params.loanId);
    if (!loan) return res.status(404).json({ success: false, message: 'طلب الإعارة غير موجود' });
    if (loan.status !== 'requested') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن اعتماد إعارة بحالة ' + loan.status });
    }
    loan.status = 'approved';
    loan.approvedAt = new Date();
    loan.approvedBy = req.user?.id || null;
    loan.approvedByName = req.user?.name || '';
    await row.save();
    res.json({ success: true, data: loan });
  } catch (err) {
    return safeError(res, err, 'device.loanApprove');
  }
});

// ── POST /:id/loans/:loanId/check-out ──────────────────────────────
router.post('/:id/loans/:loanId/check-out', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }); // W443
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    if (row.availability !== 'available') {
      return res
        .status(409)
        .json({ success: false, message: `الجهاز ليس متاحاً (الحالة: ${row.availability})` });
    }
    const loan = row.loans.id(req.params.loanId);
    if (!loan) return res.status(404).json({ success: false, message: 'طلب الإعارة غير موجود' });
    if (loan.status !== 'approved') {
      return res.status(409).json({ success: false, message: 'يجب اعتماد الإعارة قبل التسليم' });
    }
    loan.status = 'checked_out';
    loan.startedAt = new Date();
    row.availability = 'loaned';
    row.currentLoaneeId = loan.beneficiaryId;
    row.currentLoanStartedAt = loan.startedAt;
    row.currentLoanExpectedReturnAt = loan.expectedReturnAt;
    await row.save();
    res.json({ success: true, data: loan, device: row });
  } catch (err) {
    return safeError(res, err, 'device.loanCheckout');
  }
});

// ── POST /:id/loans/:loanId/return ─────────────────────────────────
router.post('/:id/loans/:loanId/return', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }); // W443
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    const loan = row.loans.id(req.params.loanId);
    if (!loan) return res.status(404).json({ success: false, message: 'طلب الإعارة غير موجود' });
    if (loan.status !== 'checked_out') {
      return res.status(409).json({ success: false, message: 'الإعارة ليست في حالة تسليم' });
    }
    loan.status = 'returned';
    loan.returnedAt = new Date();
    if (CONDITION_GRADES.includes(String(req.body?.conditionOnReturn))) {
      loan.conditionOnReturn = String(req.body.conditionOnReturn);
      row.currentCondition = String(req.body.conditionOnReturn);
    }
    row.availability = 'available';
    row.currentLoaneeId = null;
    row.currentLoanStartedAt = null;
    row.currentLoanExpectedReturnAt = null;
    await row.save();
    res.json({ success: true, data: loan, device: row });
  } catch (err) {
    return safeError(res, err, 'device.loanReturn');
  }
});

// ── POST /:id/loans/:loanId/mark-lost ──────────────────────────────
router.post('/:id/loans/:loanId/mark-lost', requireRole(APPROVE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }); // W443
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    const loan = row.loans.id(req.params.loanId);
    if (!loan) return res.status(404).json({ success: false, message: 'طلب الإعارة غير موجود' });
    loan.status = 'lost';
    loan.incidentReportedAt = new Date();
    loan.incidentDetails = String(req.body?.incidentDetails || '').slice(0, 500);
    row.availability = 'retired';
    row.retiredAt = new Date();
    row.retirementReason = 'lost during loan';
    row.currentLoaneeId = null;
    row.currentLoanStartedAt = null;
    row.currentLoanExpectedReturnAt = null;
    await row.save();
    res.json({ success: true, data: loan, device: row });
  } catch (err) {
    return safeError(res, err, 'device.loanLost');
  }
});

// ── POST /:id/loans/:loanId/mark-damaged ───────────────────────────
router.post('/:id/loans/:loanId/mark-damaged', requireRole(APPROVE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }); // W443
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    const loan = row.loans.id(req.params.loanId);
    if (!loan) return res.status(404).json({ success: false, message: 'طلب الإعارة غير موجود' });
    loan.status = 'damaged';
    loan.incidentReportedAt = new Date();
    loan.incidentDetails = String(req.body?.incidentDetails || '').slice(0, 500);
    loan.conditionOnReturn = 'poor';
    row.availability = 'maintenance';
    row.inMaintenanceSince = new Date();
    row.currentCondition = 'poor';
    row.currentLoaneeId = null;
    row.currentLoanStartedAt = null;
    row.currentLoanExpectedReturnAt = null;
    await row.save();
    res.json({ success: true, data: loan, device: row });
  } catch (err) {
    return safeError(res, err, 'device.loanDamaged');
  }
});

// ── POST /:id/loans/:loanId/cancel ─────────────────────────────────
router.post('/:id/loans/:loanId/cancel', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }); // W443
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    const loan = row.loans.id(req.params.loanId);
    if (!loan) return res.status(404).json({ success: false, message: 'طلب الإعارة غير موجود' });
    if (!['requested', 'approved'].includes(loan.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن إلغاء إعارة بعد التسليم' });
    }
    loan.status = 'cancelled';
    await row.save();
    res.json({ success: true, data: loan });
  } catch (err) {
    return safeError(res, err, 'device.loanCancel');
  }
});

// ─── Maintenance endpoints ───────────────────────────────────────────

// ── POST /:id/maintenance/start ────────────────────────────────────
router.post('/:id/maintenance/start', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }); // W443
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    if (row.availability === 'loaned') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن صيانة جهاز مُعار - يجب إرجاعه أولاً' });
    }
    if (row.availability === 'retired') {
      return res.status(409).json({ success: false, message: 'الجهاز متقاعد' });
    }
    row.availability = 'maintenance';
    row.inMaintenanceSince = new Date();
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'device.maintenanceStart');
  }
});

// ── POST /:id/maintenance/end ──────────────────────────────────────
router.post('/:id/maintenance/end', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }); // W443
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    if (row.availability !== 'maintenance') {
      return res.status(409).json({ success: false, message: 'الجهاز ليس في حالة صيانة' });
    }
    row.availability = 'available';
    row.inMaintenanceSince = null;
    if (CONDITION_GRADES.includes(String(req.body?.condition))) {
      row.currentCondition = String(req.body.condition);
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'device.maintenanceEnd');
  }
});

// ── POST /:id/maintenance ──────────────────────────────────────────
router.post('/:id/maintenance', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Device.findOne({ _id: req.params.id, ...branchFilter(req) }); // W443
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    const body = req.body || {};
    if (!MAINTENANCE_KINDS.includes(String(body.kind))) {
      return res
        .status(400)
        .json({ success: false, message: `kind يجب أن يكون: ${MAINTENANCE_KINDS.join(' | ')}` });
    }
    const entry = {
      kind: body.kind,
      performedAt: body.performedAt ? new Date(body.performedAt) : new Date(),
      performedBy: req.user?.id || null,
      performedByName: req.user?.name || '',
      vendorName: String(body.vendorName || '').slice(0, 150),
      description: String(body.description || '').slice(0, 1000),
      partsReplaced: Array.isArray(body.partsReplaced)
        ? body.partsReplaced.slice(0, 20).map(s => String(s).slice(0, 100))
        : [],
      cost: typeof body.cost === 'number' ? Math.max(0, body.cost) : 0,
      nextDueAt: body.nextDueAt ? new Date(body.nextDueAt) : null,
      invoiceRef: String(body.invoiceRef || '').slice(0, 100),
    };
    pushMaintenanceCapped(row, entry);
    if (entry.nextDueAt) row.nextMaintenanceDue = entry.nextDueAt;
    await row.save();
    const created = row.maintenance[row.maintenance.length - 1];
    res.status(201).json({ success: true, data: created, device: row });
  } catch (err) {
    return safeError(res, err, 'device.maintenanceLog');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    // W443: findOneAndDelete with branch filter so cross-tenant
    // delete attempts 404 instead of removing the wrong row.
    const row = await Device.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'device.delete');
  }
});

module.exports = router;

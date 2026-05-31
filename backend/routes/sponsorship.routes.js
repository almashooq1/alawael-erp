'use strict';

/**
 * sponsorship.routes.js — Wave 682.
 *
 * Kafala (الكفالة) — donor↔beneficiary sponsorship surface. Mounted via
 * dualMountAuth at /api/(v1/)?sponsorship.
 *
 * Closes the audit gap: Donor/Donation/Campaign existed but nothing linked
 * a donor to a specific beneficiary over time. This is that link + a
 * monthly commitment + a payment ledger (cross-linking Donation receipts).
 *
 * Endpoints (10):
 *   GET    /                  — list w/ filters (paginated)
 *   GET    /by-beneficiary/:id
 *   GET    /by-donor/:id
 *   GET    /stats             — active count + monthly committed + paid
 *   GET    /:id
 *   POST   /                  — create kafala
 *   POST   /:id/transition    — status state machine
 *   POST   /:id/payment       — record a payment (ledger append)
 *   PATCH  /:id
 *   DELETE /:id               — admin-only
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Sponsorship = require('../models/Sponsorship');
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
  'finance',
  'accountant',
  'social_worker',
  'coordinator',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'finance',
  'accountant',
  'social_worker',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { TYPES, RECURRING_TYPES, STATUSES, TRANSITIONS, COVERAGE_ITEMS } = Sponsorship;

function lazyModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

async function hydrate(items) {
  const benefIds = [...new Set(items.map(r => String(r.beneficiaryId)).filter(Boolean))].filter(
    id => mongoose.isValidObjectId(id)
  );
  const donorIds = [...new Set(items.map(r => String(r.donorId)).filter(Boolean))].filter(id =>
    mongoose.isValidObjectId(id)
  );
  const Donor = lazyModel('Donor');
  const [benefs, donors] = await Promise.all([
    benefIds.length
      ? Beneficiary.find({ _id: { $in: benefIds } })
          .select('firstName_ar lastName_ar beneficiaryNumber')
          .lean()
      : [],
    Donor && donorIds.length
      ? Donor.find({ _id: { $in: donorIds } })
          .select('name name_ar fullName donorType')
          .lean()
          .catch(() => [])
      : [],
  ]);
  const bMap = new Map(benefs.map(b => [String(b._id), b]));
  const dMap = new Map((donors || []).map(d => [String(d._id), d]));
  return items.map(r => ({
    ...r,
    beneficiary: bMap.get(String(r.beneficiaryId)) || null,
    donor: dMap.get(String(r.donorId)) || null,
  }));
}

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.donorId && mongoose.isValidObjectId(req.query.donorId)) {
      filter.donorId = req.query.donorId;
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.sponsorshipType && TYPES.includes(String(req.query.sponsorshipType))) {
      filter.sponsorshipType = String(req.query.sponsorshipType);
    }
    if (req.query.isZakat === 'true') filter.isZakat = true;
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      Sponsorship.find(filter)
        .sort({ status: 1, startDate: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Sponsorship.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'sponsorship.list');
  }
});

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const raw = await Sponsorship.find({
      ...branchFilter(req),
      beneficiaryId: req.params.id,
    })
      .sort({ startDate: -1 })
      .limit(100)
      .lean();
    const items = await hydrate(raw);
    const activeSponsorship = items.find(r => r.status === 'active') || null;
    res.json({ success: true, items, count: items.length, activeSponsorship });
  } catch (err) {
    return safeError(res, err, 'sponsorship.byBeneficiary');
  }
});

// ── GET /by-donor/:id ──────────────────────────────────────────────────
router.get('/by-donor/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const raw = await Sponsorship.find({ ...branchFilter(req), donorId: req.params.id })
      .sort({ startDate: -1 })
      .limit(200)
      .lean();
    const items = await hydrate(raw);
    const activeCount = items.filter(r => r.status === 'active').length;
    const monthlyCommitted = items
      .filter(r => r.status === 'active' && RECURRING_TYPES.includes(r.sponsorshipType))
      .reduce((s, r) => s + (r.monthlyAmount || 0), 0);
    res.json({ success: true, items, count: items.length, activeCount, monthlyCommitted });
  } catch (err) {
    return safeError(res, err, 'sponsorship.byDonor');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { ...branchFilter(req) };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branchId = req.query.branchId;
    }
    const raw = await Sponsorship.find(filter)
      .select('status sponsorshipType monthlyAmount isZakat payments endDate')
      .lean();
    const byStatus = STATUSES.reduce((acc, s) => ((acc[s] = 0), acc), {});
    const byType = TYPES.reduce((acc, t) => ((acc[t] = 0), acc), {});
    let monthlyCommitted = 0;
    let totalPaid = 0;
    let zakatCount = 0;
    let expiredActive = 0;
    const now = Date.now();
    for (const r of raw) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byType[r.sponsorshipType] = (byType[r.sponsorshipType] || 0) + 1;
      if (r.status === 'active' && RECURRING_TYPES.includes(r.sponsorshipType)) {
        monthlyCommitted += r.monthlyAmount || 0;
      }
      if (Array.isArray(r.payments)) {
        totalPaid += r.payments.reduce((s, p) => s + (p.amount || 0), 0);
      }
      if (r.isZakat) zakatCount++;
      if (
        r.endDate &&
        !['completed', 'cancelled'].includes(r.status) &&
        new Date(r.endDate).getTime() < now
      ) {
        expiredActive++;
      }
    }
    res.json({
      success: true,
      total: raw.length,
      activeCount: byStatus.active || 0,
      monthlyCommitted,
      totalPaid,
      zakatCount,
      expiredActive,
      byStatus,
      byType,
    });
  } catch (err) {
    return safeError(res, err, 'sponsorship.stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Sponsorship.findOne({ _id: req.params.id, ...branchFilter(req) }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'الكفالة غير موجودة' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'sponsorship.get');
  }
});

// ── POST / — create kafala ─────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.donorId || !mongoose.isValidObjectId(body.donorId)) {
      return res.status(400).json({ success: false, message: 'donorId مطلوب' });
    }
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!TYPES.includes(String(body.sponsorshipType || 'full'))) {
      return res
        .status(400)
        .json({ success: false, message: `نوع الكفالة يجب أن يكون: ${TYPES.join(' | ')}` });
    }

    // Derive branchId from the beneficiary when not supplied, so branch
    // isolation (branchFilter) works for restricted readers.
    let branchId = body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null;
    if (!branchId) {
      const benef = await Beneficiary.findById(body.beneficiaryId).select('branchId branch').lean();
      branchId = benef?.branchId || benef?.branch || null;
    }

    const doc = await Sponsorship.create({
      donorId: body.donorId,
      beneficiaryId: body.beneficiaryId,
      branchId,
      sponsorshipType: TYPES.includes(String(body.sponsorshipType))
        ? String(body.sponsorshipType)
        : 'full',
      monthlyAmount:
        typeof body.monthlyAmount === 'number' && body.monthlyAmount >= 0 ? body.monthlyAmount : 0,
      currency: String(body.currency || 'SAR').slice(0, 3),
      coverageItems: Array.isArray(body.coverageItems)
        ? body.coverageItems.filter(c => COVERAGE_ITEMS.includes(String(c)))
        : [],
      isZakat: !!body.isZakat,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : null,
      agreementRef: String(body.agreementRef || '').slice(0, 200),
      createdByName: req.user?.name || String(body.createdByName || '').slice(0, 100),
      notes: String(body.notes || '').slice(0, 1000),
      status: 'pending',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'sponsorship.create');
  }
});

// ── POST /:id/transition — status state machine ────────────────────────
router.post('/:id/transition', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const toStatus = String(req.body?.toStatus || '');
    if (!STATUSES.includes(toStatus)) {
      return res.status(400).json({ success: false, message: `حالة غير معروفة: ${toStatus}` });
    }
    const row = await Sponsorship.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الكفالة غير موجودة' });

    const allowed = TRANSITIONS[row.status] || [];
    if (!allowed.includes(toStatus)) {
      return res.status(409).json({
        success: false,
        message: `لا يمكن الانتقال من ${row.status} إلى ${toStatus}`,
        allowed,
      });
    }
    if (toStatus === 'paused') {
      row.pauseReason = String(req.body?.pauseReason || '').slice(0, 300);
    }
    if (toStatus === 'cancelled') {
      row.cancelReason = String(req.body?.cancelReason || '').slice(0, 300);
    }
    if (toStatus === 'completed') row.completedAt = new Date();
    if (toStatus === 'active') row.pauseReason = '';
    row.status = toStatus;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sponsorship.transition');
  }
});

// ── POST /:id/payment — record a payment (ledger append) ───────────────
router.post('/:id/payment', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const b = req.body || {};
    const amount = Number(b.amount);
    if (!(amount >= 0) || Number.isNaN(amount)) {
      return res.status(400).json({ success: false, message: 'المبلغ مطلوب ويجب ألا يكون سالباً' });
    }
    const row = await Sponsorship.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الكفالة غير موجودة' });
    if (['cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن تسجيل دفعة لكفالة ملغاة' });
    }
    row.payments.push({
      date: b.date ? new Date(b.date) : new Date(),
      amount,
      method: String(b.method || '').slice(0, 50),
      donationId: b.donationId && mongoose.isValidObjectId(b.donationId) ? b.donationId : null,
      reference: String(b.reference || '').slice(0, 100),
      recordedBy: req.user?.id || null,
      notes: String(b.notes || '').slice(0, 300),
    });
    await row.save();
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sponsorship.payment');
  }
});

// ── PATCH /:id ─────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Sponsorship.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!row) return res.status(404).json({ success: false, message: 'الكفالة غير موجودة' });
    if (['completed', 'cancelled'].includes(row.status)) {
      return res.status(409).json({ success: false, message: 'لا يمكن تعديل كفالة منتهية' });
    }
    const editable = [
      'sponsorshipType',
      'monthlyAmount',
      'currency',
      'coverageItems',
      'isZakat',
      'endDate',
      'agreementRef',
      'notes',
    ];
    for (const k of editable) {
      if (k in req.body) row[k] = req.body[k];
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'sponsorship.patch');
  }
});

// ── DELETE /:id — admin-only ───────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Sponsorship.findOneAndDelete({
      _id: req.params.id,
      ...branchFilter(req),
    });
    if (!row) return res.status(404).json({ success: false, message: 'الكفالة غير موجودة' });
    res.json({ success: true, deleted: true, id: req.params.id });
  } catch (err) {
    return safeError(res, err, 'sponsorship.delete');
  }
});

module.exports = router;

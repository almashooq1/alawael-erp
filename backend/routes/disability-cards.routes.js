'use strict';

/**
 * disability-cards.routes.js — Wave 204b.
 *
 * Endpoints:
 *   GET    /              — list w/ filters
 *   GET    /expiring      — cards expiring within 90 days
 *   GET    /by-beneficiary/:id
 *   GET    /:id
 *   POST   /              — upsert per beneficiary (one card max)
 *   PATCH  /:id           — edit
 *   POST   /:id/sync      — Phase 2 hook (Saudi Authority API). For now,
 *                           just refreshes lastSyncedAt + sets
 *                           syncedFromAuthority=true (mock).
 *   DELETE /:id
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Card = require('../models/BeneficiaryDisabilityCard');
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
  'clinical_supervisor',
  'social_worker',
  'receptionist',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'social_worker',
];

const { DISABILITY_LEVELS, STATUSES } = Card;

async function hydrate(items) {
  const ids = [...new Set(items.map(r => String(r.beneficiaryId)).filter(Boolean))].filter(id =>
    mongoose.isValidObjectId(id)
  );
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber nationalId')
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
    if (
      req.query.disabilityLevel &&
      DISABILITY_LEVELS.includes(String(req.query.disabilityLevel))
    ) {
      filter.disabilityLevel = String(req.query.disabilityLevel);
    }
    if (req.query.nationalId) {
      filter.nationalId = String(req.query.nationalId).trim();
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      Card.find(filter)
        .sort({ updatedAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean({ virtuals: true }),
      Card.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'cards.list');
  }
});

// ── GET /expiring ─────────────────────────────────────────────────────
router.get('/expiring', requireRole(READ_ROLES), async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 90));
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const raw = await Card.find({
      expiryDate: { $ne: null, $lte: horizon },
      status: { $ne: 'pending_renewal' },
    })
      .sort({ expiryDate: 1 })
      .lean({ virtuals: true });
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length, horizonDays: days });
  } catch (err) {
    return safeError(res, err, 'cards.expiring');
  }
});

// ── GET /by-beneficiary/:id ───────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const card = await Card.findOne({ beneficiaryId: req.params.id }).lean({ virtuals: true });
    if (!card)
      return res.status(404).json({ success: false, message: 'لا توجد بطاقة لهذا المستفيد' });
    const [hydrated] = await hydrate([card]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'cards.byBeneficiary');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const card = await Card.findById(req.params.id).lean({ virtuals: true });
    if (!card) return res.status(404).json({ success: false, message: 'البطاقة غير موجودة' });
    res.json({ success: true, data: card });
  } catch (err) {
    return safeError(res, err, 'cards.get');
  }
});

// ── POST / — upsert per beneficiary ────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    if (!String(body.nationalId || '').trim()) {
      return res.status(400).json({ success: false, message: 'رقم الهوية مطلوب' });
    }
    if (!DISABILITY_LEVELS.includes(String(body.disabilityLevel))) {
      return res.status(400).json({
        success: false,
        message: `درجة الإعاقة يجب أن تكون: ${DISABILITY_LEVELS.join(' | ')}`,
      });
    }
    const update = {
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      nationalId: String(body.nationalId).trim().slice(0, 20),
      cardNumber: String(body.cardNumber || '')
        .trim()
        .slice(0, 30),
      disabilityLevel: body.disabilityLevel,
      disabilityTypes: Array.isArray(body.disabilityTypes)
        ? body.disabilityTypes.slice(0, 10).map(t => String(t).slice(0, 50))
        : [],
      issuedDate: body.issuedDate ? new Date(body.issuedDate) : null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      issuingAuthorityArea: String(body.issuingAuthorityArea || '').slice(0, 100),
      entitledServices: Array.isArray(body.entitledServices)
        ? body.entitledServices.slice(0, 20).map(s => String(s).slice(0, 100))
        : [],
      monthlySubsidySAR: typeof body.monthlySubsidySAR === 'number' ? body.monthlySubsidySAR : null,
      status: STATUSES.includes(body.status) ? body.status : 'active',
      notes: String(body.notes || '').slice(0, 500),
      enteredByName: req.user?.name || body.enteredByName || '',
      syncedFromAuthority: false, // Manual entry
    };
    const doc = await Card.findOneAndUpdate({ beneficiaryId: body.beneficiaryId }, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'يوجد بطاقة مسجّلة لهذا المستفيد' });
    }
    return safeError(res, err, 'cards.create');
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
    if (body.disabilityLevel && !DISABILITY_LEVELS.includes(body.disabilityLevel)) {
      return res.status(400).json({ success: false, message: 'درجة الإعاقة غير صالحة' });
    }
    if (body.status && !STATUSES.includes(body.status)) {
      return res.status(400).json({ success: false, message: 'الحالة غير صالحة' });
    }
    if (body.issuedDate) body.issuedDate = new Date(body.issuedDate);
    if (body.expiryDate) body.expiryDate = new Date(body.expiryDate);
    const row = await Card.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!row) return res.status(404).json({ success: false, message: 'البطاقة غير موجودة' });
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'cards.patch');
  }
});

// ── POST /:id/sync — Phase 2 Authority API hook ───────────────────────
router.post('/:id/sync', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Card.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البطاقة غير موجودة' });

    // Phase 1: mock sync — just refreshes timestamp.
    // Phase 2: replace with real Authority API call using
    // services/disabilityAuthority.service.js or new sync service.
    row.lastSyncedAt = new Date();
    row.syncedFromAuthority = true;
    row.syncError = '';
    await row.save();

    res.json({
      success: true,
      data: row,
      message: 'تم التحقق (Phase 1: تحديث طابع زمني فقط. Phase 2: مزامنة API فعلية)',
    });
  } catch (err) {
    return safeError(res, err, 'cards.sync');
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await Card.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'البطاقة غير موجودة' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'cards.delete');
  }
});

module.exports = router;

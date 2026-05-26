'use strict';

/**
 * pickup-authorization.routes.js — Wave 196b.
 *
 * Endpoints:
 *   GET    /              — list (filters: beneficiary/status/active-only)
 *   GET    /active        — currently valid + signed authorizations
 *   GET    /:id
 *   POST   /              — create request (status=requested)
 *   POST   /:id/sign      — parent (or admin on parent's behalf) signs
 *   POST   /:id/use       — staff records pickup happened
 *   POST   /:id/revoke    — parent revokes
 *   DELETE /:id           — admin-only hard delete
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const PickupAuth = require('../models/PickupAuthorization');
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
  'receptionist',
  'guardian',
  'parent',
];
const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'receptionist', 'parent'];
const STAFF_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'receptionist'];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

const { STATUSES } = PickupAuth;

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
    if (req.query.status && STATUSES.includes(String(req.query.status))) {
      filter.status = String(req.query.status);
    }
    if (req.query.nationalId) {
      filter.pickupPersonNationalId = String(req.query.nationalId).trim();
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [raw, total] = await Promise.all([
      PickupAuth.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      PickupAuth.countDocuments(filter),
    ]);
    const items = await hydrate(raw);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'pickupAuth.list');
  }
});

// ── GET /active — currently valid + signed ────────────────────────────
router.get('/active', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      status: 'signed',
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    };
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    const raw = await PickupAuth.find(filter).sort({ validUntil: 1 }).lean();
    const items = await hydrate(raw);
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'pickupAuth.active');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PickupAuth.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    const [hydrated] = await hydrate([row]);
    res.json({ success: true, data: hydrated });
  } catch (err) {
    return safeError(res, err, 'pickupAuth.get');
  }
});

// ── POST / — create request ────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.beneficiaryId || !mongoose.isValidObjectId(body.beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId مطلوب' });
    }
    for (const f of ['pickupPersonName', 'pickupPersonRelationship', 'pickupPersonNationalId']) {
      if (!String(body[f] || '').trim()) {
        return res.status(400).json({ success: false, message: `${f} مطلوب` });
      }
    }
    const validFrom = body.validFrom ? new Date(body.validFrom) : new Date();
    const validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if (!validUntil || isNaN(validUntil.getTime())) {
      return res.status(400).json({ success: false, message: 'تاريخ الانتهاء مطلوب' });
    }
    if (validFrom >= validUntil) {
      return res
        .status(400)
        .json({ success: false, message: 'تاريخ الانتهاء يجب أن يكون بعد البداية' });
    }
    const doc = await PickupAuth.create({
      beneficiaryId: body.beneficiaryId,
      branchId: body.branchId && mongoose.isValidObjectId(body.branchId) ? body.branchId : null,
      pickupPersonName: String(body.pickupPersonName).trim().slice(0, 100),
      pickupPersonRelationship: String(body.pickupPersonRelationship).trim().slice(0, 50),
      pickupPersonNationalId: String(body.pickupPersonNationalId).trim().slice(0, 20),
      pickupPersonPhone: String(body.pickupPersonPhone || '')
        .trim()
        .slice(0, 20),
      validFrom,
      validUntil,
      notes: String(body.notes || '').slice(0, 500),
      createdByName: req.user?.name || body.createdByName || '',
      status: 'requested',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'pickupAuth.create');
  }
});

// ── POST /:id/sign — parent signs (Phase 1: self-attest; Phase 2: Nafath) ──
router.post('/:id/sign', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PickupAuth.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status !== 'requested') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن توقيع تصريح بحالة ' + row.status });
    }
    row.status = 'signed';
    row.signedByParentAt = new Date();
    row.signedByParentName =
      req.user?.name || String(req.body?.signedByParentName || '').slice(0, 100);
    // Phase 2 hook: if body.nafathRequestId, store it for verification.
    if (req.body?.nafathRequestId) {
      row.nafathRequestId = String(req.body.nafathRequestId).slice(0, 100);
    }
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pickupAuth.sign');
  }
});

// ── POST /:id/use — staff records actual pickup ───────────────────────
router.post('/:id/use', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const presentedNationalId = String(req.body?.presentedNationalId || '').trim();
    if (!presentedNationalId) {
      return res.status(400).json({ success: false, message: 'رقم الهوية المُقدَّم مطلوب' });
    }
    const row = await PickupAuth.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status !== 'signed') {
      return res
        .status(409)
        .json({ success: false, message: 'التصريح غير صالح (الحالة: ' + row.status + ')' });
    }
    const now = new Date();
    if (now < row.validFrom || now > row.validUntil) {
      return res.status(409).json({ success: false, message: 'التصريح خارج فترة الصلاحية' });
    }
    if (presentedNationalId !== row.pickupPersonNationalId) {
      return res.status(403).json({
        success: false,
        message: 'رقم الهوية المُقدَّم لا يطابق المسجّل في التصريح',
      });
    }
    row.status = 'used';
    row.usedAt = now;
    row.usedByName = req.user?.name || String(req.body?.usedByName || '').slice(0, 100);
    row.usedByRole = req.user?.role || String(req.body?.usedByRole || '').slice(0, 50);
    row.nationalIdVerified = true;
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pickupAuth.use');
  }
});

// ── POST /:id/revoke ──────────────────────────────────────────────────
router.post('/:id/revoke', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'سبب الإلغاء مطلوب' });
    }
    const row = await PickupAuth.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (row.status === 'used') {
      return res.status(409).json({ success: false, message: 'لا يمكن إلغاء تصريح تم استخدامه' });
    }
    row.status = 'revoked';
    row.revokedAt = new Date();
    row.revokedReason = reason.slice(0, 300);
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    return safeError(res, err, 'pickupAuth.revoke');
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await PickupAuth.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    return safeError(res, err, 'pickupAuth.delete');
  }
});

module.exports = router;

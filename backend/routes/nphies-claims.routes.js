/**
 * nphies-claims.routes.js — insurance claim management with NPHIES submission.
 *
 * Mount at /api/admin/nphies-claims.
 *
 * Endpoints:
 *   GET    /                         — list + filters
 *   GET    /stats                    — counters (byStatus + monthly amount)
 *   GET    /:id                      — single claim
 *   POST   /                         — create draft
 *   PATCH  /:id                      — update
 *   POST   /eligibility              — quick eligibility check (no persist)
 *   POST   /:id/check-eligibility    — run + persist eligibility on a claim
 *   POST   /:id/submit               — submit claim to NPHIES
 *   DELETE /:id                      — cancel
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const NphiesClaim = require('../models/NphiesClaim');
const nphies = require('../services/nphiesAdapter');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

router.use(authenticateToken);

const STAFF_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'finance',
  'accountant',
  'insurance_officer',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'finance',
  'insurance_officer',
];

function generateClaimNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CLM-${y}${m}-${rand}`;
}

// ── GET / — list ─────────────────────────────────────────────────────────
router.get('/', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { status, submissionStatus, beneficiary, q, from, to, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (submissionStatus) filter['nphies.submission.status'] = submissionStatus;
    if (beneficiary && mongoose.isValidObjectId(beneficiary)) filter.beneficiary = beneficiary;
    if (from || to) {
      filter.serviceDate = {};
      if (from) filter.serviceDate.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        filter.serviceDate.$lte = d;
      }
    }
    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ claimNumber: rx }, { memberId: rx }, { insurerName: rx }];
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const [items, total] = await Promise.all([
      NphiesClaim.find(filter)
        .populate('beneficiary', 'firstName lastName firstName_ar lastName_ar beneficiaryNumber')
        .sort({ serviceDate: -1, createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      NphiesClaim.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'nphies.list');
  }
});

// ── GET /stats ───────────────────────────────────────────────────────────
router.get('/stats', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [total, byStatus, bySubmission, totalsMonth] = await Promise.all([
      NphiesClaim.countDocuments({}),
      NphiesClaim.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      NphiesClaim.aggregate([{ $group: { _id: '$nphies.submission.status', count: { $sum: 1 } } }]),
      NphiesClaim.aggregate([
        { $match: { serviceDate: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            claimed: { $sum: '$totalAmount' },
            approved: { $sum: { $ifNull: ['$approvedAmount', 0] } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      total,
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      bySubmission: Object.fromEntries(bySubmission.map(r => [r._id || 'NOT_SUBMITTED', r.count])),
      thisMonth: totalsMonth[0] || { claimed: 0, approved: 0, count: 0 },
    });
  } catch (err) {
    return safeError(res, err, 'nphies.stats');
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const doc = await NphiesClaim.findById(req.params.id)
      .populate('beneficiary', 'firstName lastName firstName_ar lastName_ar beneficiaryNumber')
      .populate('invoice', 'invoiceNumber totalAmount')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'nphies.getOne');
  }
});

// ── POST /eligibility — quick check (no persist) ─────────────────────────
router.post('/eligibility', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { memberId, insurerId, serviceDate } = req.body || {};
    if (!memberId) return res.status(400).json({ success: false, message: 'رقم العضوية مطلوب' });
    const result = await nphies.checkEligibility({ memberId, insurerId, serviceDate });
    res.json({ success: true, result });
  } catch (err) {
    return safeError(res, err, 'nphies.eligibility');
  }
});

// ── POST / — create ──────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.beneficiary)
      return res.status(400).json({ success: false, message: 'المستفيد مطلوب' });
    if (!body.memberId)
      return res.status(400).json({ success: false, message: 'رقم العضوية مطلوب' });
    if (!body.serviceDate)
      return res.status(400).json({ success: false, message: 'تاريخ الخدمة مطلوب' });

    if (!body.claimNumber) body.claimNumber = generateClaimNumber();

    // Compute line totals + total if not provided
    if (Array.isArray(body.services)) {
      body.services = body.services.map(s => ({
        ...s,
        total: Number(s.quantity || 0) * Number(s.unitPrice || 0),
      }));
      if (body.totalAmount == null) {
        body.totalAmount = body.services.reduce((sum, s) => sum + (s.total || 0), 0);
      }
    }

    body.createdBy = req.user?.id;
    const doc = await NphiesClaim.create(body);
    logger.info('[nphies] claim created', { id: doc._id.toString(), by: req.user?.id });
    res.status(201).json({ success: true, data: doc, message: 'تم إنشاء المطالبة' });
  } catch (err) {
    if (err?.code === 11000)
      return res.status(409).json({ success: false, message: 'رقم المطالبة مستخدم مسبقاً' });
    if (err?.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    return safeError(res, err, 'nphies.create');
  }
});

// ── PATCH /:id ───────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = { ...req.body };
    delete body._id;
    delete body.nphies; // controlled via explicit endpoints
    if (Array.isArray(body.services)) {
      body.services = body.services.map(s => ({
        ...s,
        total: Number(s.quantity || 0) * Number(s.unitPrice || 0),
      }));
      if (body.totalAmount == null) {
        body.totalAmount = body.services.reduce((sum, s) => sum + (s.total || 0), 0);
      }
    }
    const doc = await NphiesClaim.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc, message: 'تم التحديث' });
  } catch (err) {
    return safeError(res, err, 'nphies.update');
  }
});

// ── POST /:id/check-eligibility ──────────────────────────────────────────
router.post('/:id/check-eligibility', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const claim = await NphiesClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ success: false, message: 'غير موجود' });

    const result = await nphies.checkEligibility({
      memberId: claim.memberId,
      insurerId: claim.insurerId,
      serviceDate: claim.serviceDate,
    });

    claim.nphies = claim.nphies || {};
    claim.nphies.eligibility = {
      status: result.status,
      checkedAt: new Date(),
      message: result.message,
      mode: result.mode,
    };
    if (result.copay != null) claim.copay = result.copay;
    if (result.deductible != null) claim.deductible = result.deductible;
    if (result.planName) claim.planName = result.planName;
    if (result.status === 'eligible' && claim.status === 'DRAFT') claim.status = 'READY';
    await claim.save();

    logger.info('[nphies] eligibility checked', {
      id: String(claim._id),
      status: result.status,
      mode: result.mode,
      by: req.user?.id,
    });
    res.json({ success: true, data: claim.toObject(), result });
  } catch (err) {
    return safeError(res, err, 'nphies.checkEligibility');
  }
});

// ── POST /:id/submit — submit to NPHIES ──────────────────────────────────
router.post('/:id/submit', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const claim = await NphiesClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ success: false, message: 'غير موجود' });
    if (claim.nphies?.submission?.status === 'APPROVED')
      return res.status(400).json({ success: false, message: 'المطالبة مقبولة مسبقاً' });

    const result = await nphies.submitClaim({
      memberId: claim.memberId,
      insurerId: claim.insurerId,
      services: claim.services,
      totalAmount: claim.totalAmount,
      diagnosis: claim.diagnosis,
    });

    claim.nphies = claim.nphies || {};
    claim.nphies.submission = {
      status: result.status,
      submittedAt: new Date(),
      claimReference: result.claimReference,
      reason: result.reason,
      message: result.message,
      mode: result.mode,
    };

    if (result.status === 'APPROVED') {
      claim.approvedAmount = result.approvedAmount ?? claim.totalAmount;
      claim.patientShare = result.remainingBalance ?? 0;
      claim.status = 'PAID';
    } else if (result.status === 'REJECTED') {
      claim.status = 'DENIED';
    } else if (result.status === 'PENDING_REVIEW') {
      claim.status = 'SUBMITTED';
    }

    await claim.save();

    logger.info('[nphies] claim submitted', {
      id: String(claim._id),
      status: result.status,
      mode: result.mode,
      by: req.user?.id,
    });
    res.json({ success: true, data: claim.toObject(), result });
  } catch (err) {
    return safeError(res, err, 'nphies.submit');
  }
});

// ── DELETE /:id ──────────────────────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await NphiesClaim.findByIdAndUpdate(
      req.params.id,
      { status: 'CANCELLED' },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, message: 'تم الإلغاء' });
  } catch (err) {
    return safeError(res, err, 'nphies.cancel');
  }
});

module.exports = router;

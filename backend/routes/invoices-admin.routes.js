/**
 * invoices-admin.routes.js — CRUD for Invoice with ZATCA Phase-2 envelope.
 *
 * Mount at /api/admin/invoices.
 *
 * Endpoints:
 *   GET /          — list + filters + pagination
 *   GET /stats     — counters (DRAFT/ISSUED/PAID/…, revenue month)
 *   GET /:id       — single with ZATCA envelope details
 *   POST /         — create draft
 *   PATCH /:id     — update (lines, dates, etc.)
 *   POST /:id/issue — compute ZATCA envelope + set status=ISSUED
 *   POST /:id/pay  — mark PAID (records method)
 *   POST /:id/cancel — cancel
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Invoice = require('../models/Invoice');
const { buildEnvelope } = require('../services/zatcaEnvelope');
const fatoora = require('../services/fatooraAdapter');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');
const idempotency = require('../middleware/idempotency.middleware');

router.use(authenticateToken);

// Tenant-scoped idempotency for ZATCA issuance — duplicate POSTs with the
// same Idempotency-Key return the cached envelope instead of submitting a
// second invoice to FATOORA and breaking the chain.
const invoiceIdempotency = idempotency({
  scope: req => (req.user && (req.user.tenantId || req.user.branchId)) || 'global',
});

const STAFF_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'finance',
  'accountant',
  'receptionist',
  'cashier',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'finance',
  'accountant',
  'cashier',
];

function generateInvoiceNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${y}${m}-${rand}`;
}

function computeLineTotals(items) {
  return (items || []).map(it => ({
    ...it,
    total: Number(it.quantity || 0) * Number(it.unitPrice || 0),
  }));
}

function recalcTotals(invoice) {
  const items = computeLineTotals(invoice.items);
  const subTotal = items.reduce((s, it) => s + (it.total || 0), 0);
  const discount = Number(invoice.discount || 0);
  const taxRate = Number(invoice.taxRate ?? 0.15); // Saudi VAT 15% default
  const afterDiscount = Math.max(0, subTotal - discount);
  const taxAmount =
    invoice.taxAmount != null
      ? Number(invoice.taxAmount)
      : Math.round(afterDiscount * taxRate * 100) / 100;
  const totalAmount = Math.round((afterDiscount + taxAmount) * 100) / 100;
  return { items, subTotal, discount, taxAmount, totalAmount };
}

// ── GET / — list ─────────────────────────────────────────────────────────
router.get('/', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { status, beneficiary, q, from, to, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (beneficiary && mongoose.isValidObjectId(beneficiary)) filter.beneficiary = beneficiary;
    if (from || to) {
      filter.issueDate = {};
      if (from) filter.issueDate.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        filter.issueDate.$lte = d;
      }
    }
    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.invoiceNumber = rx;
    }
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const [items, total] = await Promise.all([
      Invoice.find(filter)
        .populate('beneficiary', 'firstName lastName firstName_ar lastName_ar beneficiaryNumber')
        .sort({ issueDate: -1, createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Invoice.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'invoices.list');
  }
});

// ── GET /stats ───────────────────────────────────────────────────────────
router.get('/stats', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [total, byStatus, revenueMonth, overdueCount, pendingAmount] = await Promise.all([
      Invoice.countDocuments({}),
      Invoice.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Invoice.aggregate([
        { $match: { status: 'PAID', issueDate: { $gte: monthStart } } },
        { $group: { _id: null, sum: { $sum: '$totalAmount' } } },
      ]),
      Invoice.countDocuments({
        dueDate: { $lt: new Date() },
        status: { $nin: ['PAID', 'CANCELLED'] },
      }),
      Invoice.aggregate([
        { $match: { status: { $in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } } },
        { $group: { _id: null, sum: { $sum: '$totalAmount' } } },
      ]),
    ]);

    res.json({
      success: true,
      total,
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      revenueThisMonth: revenueMonth[0]?.sum || 0,
      overdueCount,
      pendingAmount: pendingAmount[0]?.sum || 0,
    });
  } catch (err) {
    return safeError(res, err, 'invoices.stats');
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const doc = await Invoice.findById(req.params.id)
      .populate(
        'beneficiary',
        'firstName lastName firstName_ar lastName_ar beneficiaryNumber nationalId'
      )
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'invoices.getOne');
  }
});

// ── POST / — create draft ────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.beneficiary)
      return res.status(400).json({ success: false, message: 'المستفيد مطلوب' });
    if (!body.invoiceNumber) body.invoiceNumber = generateInvoiceNumber();
    const totals = recalcTotals(body);
    body.items = totals.items;
    body.subTotal = totals.subTotal;
    body.discount = totals.discount;
    body.taxAmount = totals.taxAmount;
    body.totalAmount = totals.totalAmount;
    body.issuer = req.user?.id;
    body.status = body.status || 'DRAFT';

    const doc = await Invoice.create(body);
    logger.info('[invoices] created', { id: doc._id.toString(), by: req.user?.id });
    res.status(201).json({ success: true, data: doc, message: 'تم إنشاء الفاتورة' });
  } catch (err) {
    if (err?.code === 11000)
      return res.status(409).json({ success: false, message: 'رقم الفاتورة مستخدم مسبقاً' });
    if (err?.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    return safeError(res, err, 'invoices.create');
  }
});

// ── PATCH /:id ───────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const body = { ...req.body };
    delete body._id;
    delete body.createdAt;
    delete body.zatca; // ZATCA envelope only via /issue
    if (body.items) {
      const totals = recalcTotals(body);
      body.items = totals.items;
      body.subTotal = totals.subTotal;
      body.discount = totals.discount;
      body.taxAmount = totals.taxAmount;
      body.totalAmount = totals.totalAmount;
    }
    const doc = await Invoice.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc, message: 'تم التحديث' });
  } catch (err) {
    if (err?.name === 'ValidationError')
      return res.status(400).json({ success: false, message: err.message });
    return safeError(res, err, 'invoices.update');
  }
});

// ── POST /:id/issue — build ZATCA envelope + status=ISSUED ───────────────
router.post('/:id/issue', invoiceIdempotency, requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'غير موجود' });
    if (invoice.status === 'CANCELLED')
      return res.status(400).json({ success: false, message: 'لا يمكن إصدار فاتورة ملغاة' });

    // Find previous issued invoice to chain hash
    const prev = await Invoice.findOne({
      _id: { $ne: invoice._id },
      'zatca.invoiceHash': { $exists: true, $ne: null },
    })
      .sort({ 'zatca.icv': -1 })
      .select('zatca.invoiceHash zatca.icv')
      .lean();

    const envelope = buildEnvelope(invoice.toObject(), {
      sellerName: req.body?.sellerName || process.env.ZATCA_SELLER_NAME,
      sellerVatNumber: req.body?.sellerVatNumber || process.env.ZATCA_SELLER_VAT,
      buyerName: req.body?.buyerName,
      buyerVatNumber: req.body?.buyerVatNumber,
      previousInvoiceHash: prev?.zatca?.invoiceHash || '0',
      icv: (prev?.zatca?.icv || 0) + 1,
    });

    invoice.zatca = { ...(invoice.zatca || {}), ...envelope };
    invoice.status = 'ISSUED';
    if (!invoice.issueDate) invoice.issueDate = new Date();
    await invoice.save();

    logger.info('[invoices] issued + ZATCA envelope', {
      id: invoice._id.toString(),
      icv: envelope.icv,
      by: req.user?.id,
    });
    res.json({
      success: true,
      data: invoice.toObject(),
      message: 'تم إصدار الفاتورة + مُعرّف ZATCA',
    });
  } catch (err) {
    return safeError(res, err, 'invoices.issue');
  }
});

// ── POST /:id/pay ────────────────────────────────────────────────────────
router.post('/:id/pay', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { paymentMethod = 'CASH' } = req.body || {};
    const doc = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'PAID', paymentMethod, paidAt: new Date() },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc, message: 'تم تسجيل الدفع' });
  } catch (err) {
    return safeError(res, err, 'invoices.pay');
  }
});

// ── POST /:id/cancel ─────────────────────────────────────────────────────
router.post('/:id/cancel', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'CANCELLED', notes: req.body?.reason || '' },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc, message: 'تم الإلغاء' });
  } catch (err) {
    return safeError(res, err, 'invoices.cancel');
  }
});

// ── POST /:id/submit-to-zatca — send to Fatoora ──────────────────────────
router.post('/:id/submit-to-zatca', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'غير موجود' });
    if (!invoice.zatca?.uuid || !invoice.zatca?.invoiceHash) {
      return res.status(400).json({
        success: false,
        message: 'يجب إصدار الفاتورة (POST /issue) قبل الإرسال إلى ZATCA',
      });
    }
    if (invoice.zatca.zatcaStatus === 'ACCEPTED' || invoice.zatca.zatcaStatus === 'REPORTED') {
      return res.status(400).json({
        success: false,
        message: 'الفاتورة مُرسَلة مسبقاً',
        data: invoice.toObject(),
      });
    }

    const result = await fatoora.submit({
      invoice: invoice.toObject(),
      uuid: invoice.zatca.uuid,
      invoiceHash: invoice.zatca.invoiceHash,
      invoiceXmlB64: req.body?.invoiceXmlB64, // optional, required only in live mode
    });

    invoice.zatca.zatcaStatus =
      result.status === 'ACCEPTED' || result.status === 'REPORTED'
        ? result.status === 'ACCEPTED'
          ? 'ACCEPTED'
          : 'SUBMITTED'
        : result.status === 'REJECTED'
          ? 'REJECTED'
          : 'NOT_SUBMITTED';
    invoice.zatca.submittedToZatcaAt = new Date();
    if (result.zatcaReference) invoice.zatca.zatcaReference = result.zatcaReference;
    if (result.errors?.length) {
      invoice.zatca.zatcaErrors = result.errors.map(
        e => `[${e.code || 'ERR'}] ${e.message || 'unknown'}`
      );
    } else {
      invoice.zatca.zatcaErrors = [];
    }
    await invoice.save();

    logger.info('[invoices] submitted to ZATCA', {
      id: invoice._id.toString(),
      status: result.status,
      mode: result.mode,
      by: req.user?.id,
    });

    res.json({
      success: result.status !== 'ERROR' && result.status !== 'REJECTED',
      data: invoice.toObject(),
      result,
      message:
        result.status === 'ACCEPTED'
          ? 'تم قبول الفاتورة من ZATCA (Clearance)'
          : result.status === 'REPORTED'
            ? 'تم إبلاغ ZATCA (Reporting)'
            : result.status === 'REJECTED'
              ? 'رُفضت الفاتورة — راجع الأخطاء'
              : 'فشل الإرسال',
    });
  } catch (err) {
    return safeError(res, err, 'invoices.submitZatca');
  }
});

module.exports = router;

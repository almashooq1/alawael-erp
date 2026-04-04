/**
 * Payment Transactions Routes — System 38
 * بوابة الدفع الإلكتروني: Moyasar, HyperPay, PayTabs, Tap, SADAD, Tabby, Tamara, STC Pay
 *
 * Endpoints:
 *   GET    /api/payment-transactions              — قائمة المعاملات
 *   GET    /api/payment-transactions/stats        — إحصائيات
 *   GET    /api/payment-transactions/reconciliation — تقرير التسوية
 *   POST   /api/payment-transactions              — بدء معاملة دفع
 *   GET    /api/payment-transactions/:id          — تفاصيل معاملة
 *   POST   /api/payment-transactions/:id/refund   — طلب استرداد
 *   GET    /api/payment-transactions/:id/zatca    — فاتورة ZATCA
 *   POST   /api/payment-transactions/webhook/:gateway — استقبال Webhook
 *   GET    /api/payment-transactions/subscriptions — قائمة الاشتراكات
 *   POST   /api/payment-transactions/subscriptions — إنشاء اشتراك
 *   DELETE /api/payment-transactions/subscriptions/:id — إلغاء اشتراك
 *   GET    /api/payment-transactions/refunds       — قائمة الاستردادات
 *   GET    /api/payment-transactions/installments  — خطط التقسيط
 */

'use strict';

const router = require('express').Router();
const paymentGatewayService = require('../services/paymentGateway.service');
const PaymentTransaction = require('../models/PaymentTransaction');
const PaymentRefund = require('../models/PaymentRefund');
const PaymentSubscription = require('../models/PaymentSubscription');
const PaymentWebhook = require('../models/PaymentWebhook');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Auth on all routes except webhooks ───────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOKS — يجب أن تكون قبل authenticate (لا تحتاج توكن)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /webhook/:gateway
 * استقبال Webhook من بوابات الدفع
 */
router.post(
  '/webhook/:gateway',
  wrap(async (req, res) => {
    const { gateway } = req.params;
    const payload = req.body;
    const signature = req.headers['x-signature'] || req.headers['authorization'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress;

    try {
      await paymentGatewayService.handleWebhook(gateway, payload, signature, ipAddress);
      res.json({ success: true, status: 'received' });
    } catch (err) {
      logger.error(`[PaymentWebhook] ${gateway} error:`, { message: err.message });
      // نعيد 200 حتى لا تكرر البوابة الإرسال بشكل مفرط
      res.status(200).json({ success: false, message: err.message });
    }
  })
);

// ── Apply auth middleware for the remaining routes ────────────────────────────
router.use(authenticate);

// ══════════════════════════════════════════════════════════════════════════════
// STATS & REPORTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /stats
 * إحصائيات لوحة تحكم المدفوعات
 */
router.get(
  '/stats',
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const branchId = req.query.branch_id || req.user.branchId;
    const data = await paymentGatewayService.getStats(branchId);
    res.json({ success: true, data });
  })
);

/**
 * GET /reconciliation
 * تقرير التسوية اليومية
 */
router.get(
  '/reconciliation',
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const { date_from, date_to, branch_id } = req.query;
    if (!date_from || !date_to) {
      return res.status(400).json({ success: false, message: 'date_from و date_to مطلوبان' });
    }
    const branchId = branch_id || req.user.branchId;
    const data = await paymentGatewayService.getReconciliationReport(branchId, date_from, date_to);
    res.json({ success: true, data });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS — المعاملات
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /
 * قائمة معاملات الدفع مع فلترة
 */
router.get(
  '/',
  authorize(['admin', 'finance', 'manager', 'receptionist']),
  wrap(async (req, res) => {
    const filters = {
      ...req.query,
      branchId: req.query.branch_id || req.user.branchId,
    };
    const data = await paymentGatewayService.list(filters);
    res.json({ success: true, ...data });
  })
);

/**
 * POST /
 * بدء معاملة دفع جديدة
 */
router.post(
  '/',
  authorize(['admin', 'finance', 'receptionist']),
  wrap(async (req, res) => {
    const data = await paymentGatewayService.initiatePayment({
      ...req.body,
      branchId: req.user.branchId,
      userId: req.user._id,
    });
    res.status(201).json({ success: true, data });
  })
);

/**
 * GET /:id
 * تفاصيل معاملة واحدة
 */
router.get(
  '/:id',
  wrap(async (req, res) => {
    const tx = await PaymentTransaction.findOne({ _id: req.params.id, deletedAt: null })
      .populate('beneficiaryId', 'name nationalId phone')
      .lean();
    if (!tx) return res.status(404).json({ success: false, message: 'المعاملة غير موجودة' });
    res.json({ success: true, data: tx });
  })
);

/**
 * POST /:id/refund
 * طلب استرداد مبلغ
 */
router.post(
  '/:id/refund',
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const { amount, reason } = req.body;
    if (!amount || !reason) {
      return res.status(400).json({ success: false, message: 'amount و reason مطلوبان' });
    }
    const refund = await paymentGatewayService.processRefund(
      req.params.id,
      parseFloat(amount),
      reason,
      req.user._id
    );
    res.json({ success: true, data: refund, message: 'تم طلب الاسترداد بنجاح' });
  })
);

/**
 * GET /:id/zatca
 * فاتورة ZATCA للمعاملة
 */
router.get(
  '/:id/zatca',
  wrap(async (req, res) => {
    const tx = await PaymentTransaction.findOne({ _id: req.params.id, deletedAt: null });
    if (!tx) return res.status(404).json({ success: false, message: 'المعاملة غير موجودة' });

    const invoice = {
      invoiceUuid: tx.zatcaInvoiceUuid,
      invoiceHash: tx.zatcaInvoiceHash,
      qrCode: tx.zatcaQrCode,
      transactionNumber: tx.transactionNumber,
      amount: tx.amount,
      vatAmount: tx.vatAmount,
      currency: tx.currency,
      status: tx.zatcaReported ? 'reported' : 'pending',
      reportedAt: tx.zatcaReportedAt,
    };
    res.json({ success: true, data: invoice });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTIONS — الاشتراكات المتكررة
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /subscriptions
 * قائمة الاشتراكات
 */
router.get(
  '/subscriptions/list',
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 15;
    const query = { deletedAt: null };
    if (req.query.branch_id) query.branchId = req.query.branch_id;
    if (req.query.status) query.status = req.query.status;
    if (req.query.beneficiary_id) query.beneficiaryId = req.query.beneficiary_id;

    const [docs, total] = await Promise.all([
      PaymentSubscription.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PaymentSubscription.countDocuments(query),
    ]);
    res.json({ success: true, docs, total, page, pages: Math.ceil(total / limit) });
  })
);

/**
 * POST /subscriptions
 * إنشاء اشتراك دفع متكرر
 */
router.post(
  '/subscriptions',
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const sub = await PaymentSubscription.create({
      ...req.body,
      branchId: req.user.branchId,
      createdBy: req.user._id,
      subscriptionNumber: `SUB-${Date.now()}`,
    });
    res.status(201).json({ success: true, data: sub });
  })
);

/**
 * PATCH /subscriptions/:id/cancel
 * إلغاء اشتراك
 */
router.patch(
  '/subscriptions/:id/cancel',
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const sub = await PaymentSubscription.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', updatedBy: req.user._id },
      { new: true }
    );
    if (!sub) return res.status(404).json({ success: false, message: 'الاشتراك غير موجود' });
    res.json({ success: true, data: sub, message: 'تم إلغاء الاشتراك' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// REFUNDS — الاستردادات
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /refunds/list
 * قائمة الاستردادات
 */
router.get(
  '/refunds/list',
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 15;
    const query = { deletedAt: null };
    if (req.query.branch_id) query.branchId = req.query.branch_id;
    if (req.query.status) query.status = req.query.status;
    if (req.query.date_from || req.query.date_to) {
      query.createdAt = {};
      if (req.query.date_from) query.createdAt.$gte = new Date(req.query.date_from);
      if (req.query.date_to) query.createdAt.$lte = new Date(req.query.date_to + 'T23:59:59');
    }
    const [docs, total] = await Promise.all([
      PaymentRefund.find(query)
        .populate('transactionId', 'transactionNumber amount gateway')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PaymentRefund.countDocuments(query),
    ]);
    res.json({ success: true, docs, total, page, pages: Math.ceil(total / limit) });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOKS LOG — سجل الـ Webhooks الواردة
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /webhooks/log
 * سجل الـ Webhooks المستلمة
 */
router.get(
  '/webhooks/log',
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 20;
    const query = {};
    if (req.query.gateway) query.gateway = req.query.gateway;
    if (req.query.status) query.status = req.query.status;

    const [docs, total] = await Promise.all([
      PaymentWebhook.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PaymentWebhook.countDocuments(query),
    ]);
    res.json({ success: true, docs, total, page, pages: Math.ceil(total / limit) });
  })
);

module.exports = router;

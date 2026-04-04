'use strict';

const router = require('express').Router();
const paymentGatewayService = require('../services/paymentGateway.service');
const { authenticate, authorize } = require('../middleware/auth');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── قائمة المعاملات ─────────────────────────────────────────────────────────
router.get(
  '/transactions',
  authenticate,
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const data = await paymentGatewayService.list({ ...req.query, branchId: req.user.branchId });
    res.json({ success: true, ...data });
  })
);

// ── إحصائيات ────────────────────────────────────────────────────────────────
router.get(
  '/stats',
  authenticate,
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const data = await paymentGatewayService.getStats(req.user.branchId);
    res.json({ success: true, data });
  })
);

// ── تقرير التسوية ───────────────────────────────────────────────────────────
router.get(
  '/reconciliation',
  authenticate,
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const { dateFrom, dateTo, gateway } = req.query;
    const data = await paymentGatewayService.getReconciliationReport(
      req.user.branchId,
      dateFrom,
      dateTo,
      gateway
    );
    res.json({ success: true, data });
  })
);

// ── بدء معاملة دفع ──────────────────────────────────────────────────────────
router.post(
  '/initiate',
  authenticate,
  wrap(async (req, res) => {
    const data = await paymentGatewayService.initiatePayment({
      ...req.body,
      branchId: req.user.branchId,
      userId: req.user._id,
    });
    res.status(201).json({ success: true, data });
  })
);

// ── استرداد مبلغ ────────────────────────────────────────────────────────────
router.post(
  '/:id/refund',
  authenticate,
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const data = await paymentGatewayService.processRefund(req.params.id, {
      ...req.body,
      userId: req.user._id,
    });
    res.json({ success: true, data });
  })
);

// ── إعادة محاولة المعاملات الفاشلة ─────────────────────────────────────────
router.post(
  '/retry-failed',
  authenticate,
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const data = await paymentGatewayService.retryFailedPayments(req.user.branchId);
    res.json({ success: true, data });
  })
);

// ── عرض معاملة واحدة ────────────────────────────────────────────────────────
router.get(
  '/transactions/:id',
  authenticate,
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const PaymentTransaction = require('../models/PaymentTransaction');
    const tx = await PaymentTransaction.findOne({ _id: req.params.id, deletedAt: null });
    if (!tx) return res.status(404).json({ success: false, message: 'المعاملة غير موجودة' });
    res.json({ success: true, data: tx });
  })
);

// ── Webhook من بوابات الدفع (بدون مصادقة — يستخدم HMAC) ────────────────────
router.post(
  '/webhook/:gateway',
  wrap(async (req, res) => {
    const { gateway } = req.params;
    const signature = req.headers['x-signature'] || req.headers['x-webhook-signature'] || '';
    await paymentGatewayService.handleWebhook(gateway, req.body, signature);
    res.json({ received: true });
  })
);

module.exports = router;

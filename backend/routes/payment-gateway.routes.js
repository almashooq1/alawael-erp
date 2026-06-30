'use strict';

const router = require('express').Router();
const paymentGatewayService = require('../services/paymentGateway.service');
const { authenticate, authorize } = require('../middleware/auth');
const idempotency = require('../middleware/idempotency.middleware');

const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { effectiveBranchScope } = require('../middleware/assertBranchMatch');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const paymentIdempotency = idempotency({
  // branchId is NOT in the JWT payload — fall back to per-user scoping so
  // idempotency keys never collide across users (was collapsing to 'global').
  scope: req =>
    (req.user && (req.user.tenantId || (req.user._id && String(req.user._id)))) || 'global',
});

// ── قائمة المعاملات ─────────────────────────────────────────────────────────
router.get(
  '/transactions',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const data = await paymentGatewayService.list({
      ...req.query,
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, ...data });
  })
);

// ── إحصائيات ────────────────────────────────────────────────────────────────
router.get(
  '/stats',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const data = await paymentGatewayService.getStats(effectiveBranchScope(req));
    res.json({ success: true, data });
  })
);

// ── تقرير التسوية ───────────────────────────────────────────────────────────
router.get(
  '/reconciliation',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const { dateFrom, dateTo, gateway } = req.query;
    const data = await paymentGatewayService.getReconciliationReport(
      effectiveBranchScope(req),
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
  requireBranchAccess,
  paymentIdempotency,
  wrap(async (req, res) => {
    const data = await paymentGatewayService.initiatePayment({
      ...req.body,
      branchId: effectiveBranchScope(req),
      userId: req.user._id,
    });
    res.status(201).json({ success: true, data });
  })
);

// ── استرداد مبلغ ────────────────────────────────────────────────────────────
router.post(
  '/:id/refund',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance']),
  paymentIdempotency,
  wrap(async (req, res) => {
    const data = await paymentGatewayService.processRefund(
      req.params.id,
      req.body.amount,
      req.body.reason,
      req.user._id,
      // W1552: confine refunds to the caller's branch (null = cross-branch/HQ).
      effectiveBranchScope(req)
    );
    res.json({ success: true, data });
  })
);

// ── إعادة محاولة المعاملات الفاشلة ─────────────────────────────────────────
router.post(
  '/retry-failed',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const data = await paymentGatewayService.retryFailedPayments(effectiveBranchScope(req));
    res.json({ success: true, data });
  })
);

// ── عرض معاملة واحدة ────────────────────────────────────────────────────────
router.get(
  '/transactions/:id',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const PaymentTransaction = require('../models/PaymentTransaction');
    // W1552: branch-scope the single-transaction read (its sibling list/stats
    // endpoints already do via effectiveBranchScope). null = cross-branch/HQ.
    const _branch = effectiveBranchScope(req);
    const tx = await PaymentTransaction.findOne({
      _id: req.params.id,
      deletedAt: null,
      ...(_branch ? { branchId: _branch } : {}),
    });
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

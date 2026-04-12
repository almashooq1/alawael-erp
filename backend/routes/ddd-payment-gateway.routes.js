'use strict';
/**
 * PaymentGateway Routes
 * Auto-extracted from services/dddPaymentGateway.js
 * 22 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const safeError = require('../utils/safeError');
const v = require('../validations/payment-gateway.validation');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddPaymentGateway');

// Service imported as singleton above;

/* ── Gateways ── */
router.get('/payment-gateway/gateways', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listGateways(req.query) });
  } catch (e) {
    safeError(res, e, 'payment-gateway');
  }
});
router.get('/payment-gateway/gateways/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getGateway(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'payment-gateway');
  }
});
router.post(
  '/payment-gateway/gateways',
  authenticate,
  validate(v.createGateway),
  async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createGateway(req.body) });
    } catch (e) {
      safeError(res, e, 'payment-gateway');
    }
  }
);
router.put(
  '/payment-gateway/gateways/:id',
  authenticate,
  validate(v.updateGateway),
  async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateGateway(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'payment-gateway');
    }
  }
);

/* ── Transactions ── */
router.get('/payment-gateway/transactions', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listTransactions(req.query) });
  } catch (e) {
    safeError(res, e, 'payment-gateway');
  }
});
router.get('/payment-gateway/transactions/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getTransaction(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'payment-gateway');
  }
});
router.post(
  '/payment-gateway/transactions',
  authenticate,
  validate(v.initiateTransaction),
  async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.initiateTransaction(req.body) });
    } catch (e) {
      safeError(res, e, 'payment-gateway');
    }
  }
);
router.post('/payment-gateway/transactions/:id/complete', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.completeTransaction(req.params.id, req.body) });
  } catch (e) {
    safeError(res, e, 'payment-gateway');
  }
});
router.post(
  '/payment-gateway/transactions/:id/fail',
  authenticate,
  validate(v.failTransaction),
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.failTransaction(req.params.id, req.body.errorCode, req.body.errorMessage),
      });
    } catch (e) {
      safeError(res, e, 'payment-gateway');
    }
  }
);
router.post(
  '/payment-gateway/transactions/:id/refund',
  authenticate,
  validate(v.refundTransaction),
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.refundTransaction(req.params.id, req.body.amount, req.body.reason),
      });
    } catch (e) {
      safeError(res, e, 'payment-gateway');
    }
  }
);

/* ── Payment Plans ── */
router.get('/payment-gateway/plans', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listPaymentPlans(req.query) });
  } catch (e) {
    safeError(res, e, 'payment-gateway');
  }
});
router.get('/payment-gateway/plans/overdue', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: await svc.getOverdueInstallments() });
  } catch (e) {
    safeError(res, e, 'payment-gateway');
  }
});
router.get('/payment-gateway/plans/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getPaymentPlan(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'payment-gateway');
  }
});
router.post(
  '/payment-gateway/plans',
  authenticate,
  validate(v.createPaymentPlan),
  async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPaymentPlan(req.body) });
    } catch (e) {
      safeError(res, e, 'payment-gateway');
    }
  }
);
router.post(
  '/payment-gateway/plans/:id/activate',
  authenticate,
  validate(v.activatePaymentPlan),
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.activatePaymentPlan(req.params.id, req.body.approvedBy),
      });
    } catch (e) {
      safeError(res, e, 'payment-gateway');
    }
  }
);
router.post(
  '/payment-gateway/plans/:id/pay-installment',
  authenticate,
  validate(v.recordInstallmentPayment),
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.recordInstallmentPayment(
          req.params.id,
          req.body.installmentNumber,
          req.body.transactionId,
          req.body.amount
        ),
      });
    } catch (e) {
      safeError(res, e, 'payment-gateway');
    }
  }
);

/* ── Reconciliation ── */
router.get('/payment-gateway/reconciliation', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listReconciliations(req.query) });
  } catch (e) {
    safeError(res, e, 'payment-gateway');
  }
});
router.get('/payment-gateway/reconciliation/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getReconciliation(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'payment-gateway');
  }
});
router.post(
  '/payment-gateway/reconciliation',
  authenticate,
  validate(v.createReconciliation),
  async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createReconciliation(req.body) });
    } catch (e) {
      safeError(res, e, 'payment-gateway');
    }
  }
);
router.post(
  '/payment-gateway/reconciliation/:id/resolve',
  authenticate,
  validate(v.resolveDiscrepancy),
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.resolveDiscrepancy(
          req.params.id,
          req.body.index,
          req.body.resolution,
          req.body.userId
        ),
      });
    } catch (e) {
      safeError(res, e, 'payment-gateway');
    }
  }
);

/* ── Revenue Analytics ── */
router.get('/payment-gateway/revenue', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getRevenueAnalytics(req.query.from, req.query.to) });
  } catch (e) {
    safeError(res, e, 'payment-gateway');
  }
});

/* ── Health ── */
router.get('/payment-gateway/health', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: await svc.healthCheck() });
  } catch (e) {
    safeError(res, e, 'payment-gateway');
  }
});

module.exports = router;

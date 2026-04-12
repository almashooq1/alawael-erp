'use strict';
/**
 * BillingEngine Routes
 * Auto-extracted from services/dddBillingEngine.js
 * 22 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const safeError = require('../utils/safeError');
const v = require('../validations/billing-engine.validation');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddBillingEngine');

// Service imported as singleton above;

/* ── Service Charges ── */
router.get('/billing/service-charges', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listServiceCharges(req.query) });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.get('/billing/service-charges/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getServiceCharge(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.post(
  '/billing/service-charges',
  authenticate,
  validate(v.createServiceCharge),
  async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createServiceCharge(req.body) });
    } catch (e) {
      safeError(res, e, 'billing-engine');
    }
  }
);
router.put(
  '/billing/service-charges/:id',
  authenticate,
  validate(v.updateServiceCharge),
  async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateServiceCharge(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'billing-engine');
    }
  }
);

/* ── Billing Accounts ── */
router.get('/billing/accounts', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listBillingAccounts(req.query) });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.get('/billing/accounts/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getBillingAccount(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.post(
  '/billing/accounts',
  authenticate,
  validate(v.createBillingAccount),
  async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBillingAccount(req.body) });
    } catch (e) {
      safeError(res, e, 'billing-engine');
    }
  }
);
router.put(
  '/billing/accounts/:id',
  authenticate,
  validate(v.updateBillingAccount),
  async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateBillingAccount(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'billing-engine');
    }
  }
);
router.get('/billing/accounts/:id/statement', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: await svc.getAccountStatement(req.params.id, req.query.from, req.query.to),
    });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});

/* ── Invoices ── */
router.get('/billing/invoices', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listInvoices(req.query) });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.get('/billing/invoices/overdue', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: await svc.getOverdueInvoices() });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.get('/billing/invoices/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getInvoice(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.post('/billing/invoices', authenticate, validate(v.createInvoice), async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await svc.createInvoice(req.body) });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.put('/billing/invoices/:id', authenticate, validate(v.updateInvoice), async (req, res) => {
  try {
    res.json({ success: true, data: await svc.updateInvoice(req.params.id, req.body) });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.post('/billing/invoices/:id/send', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.sendInvoice(req.params.id) });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.post(
  '/billing/invoices/:id/cancel',
  authenticate,
  validate(v.cancelInvoice),
  async (req, res) => {
    try {
      res.json({ success: true, data: await svc.cancelInvoice(req.params.id, req.body.reason) });
    } catch (e) {
      safeError(res, e, 'billing-engine');
    }
  }
);

/* ── Payments ── */
router.get('/billing/payments', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listPayments(req.query) });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.get('/billing/payments/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getPayment(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.post('/billing/payments', authenticate, validate(v.recordPayment), async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await svc.recordPayment(req.body) });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});
router.post(
  '/billing/payments/:id/refund',
  authenticate,
  validate(v.refundPayment),
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.refundPayment(req.params.id, req.body.amount, req.body.reason),
      });
    } catch (e) {
      safeError(res, e, 'billing-engine');
    }
  }
);

/* ── Financial Summary ── */
router.get('/billing/summary', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getFinancialSummary(req.query) });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});

/* ── Health ── */
router.get('/billing/health', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: await svc.healthCheck() });
  } catch (e) {
    safeError(res, e, 'billing-engine');
  }
});

module.exports = router;

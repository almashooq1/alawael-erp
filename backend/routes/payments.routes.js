const express = require('express');
const router = express.Router();
const paymentService = require('../services/payment-gateway.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Stripe
router.post('/stripe', authenticateToken, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const result = await paymentService.processStripePayment(req.user.id, amount, currency);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PayPal
router.post('/paypal', authenticateToken, async (req, res) => {
  try {
    const { amount, description } = req.body;
    const result = await paymentService.processPayPalPayment(req.user.id, amount, description);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Installment
router.post('/installment', authenticateToken, async (req, res) => {
  try {
    const { amount, months } = req.body;
    const result = await paymentService.processInstallmentPayment(req.user.id, amount, months);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Subscriptions
router.post('/subscriptions/create', authenticateToken, async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;
    const subscription = await paymentService.createSubscription(req.user.id, plan, billingCycle);
    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// History
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const payments = await paymentService.getPaymentHistory(req.user.id);
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Admin: Get All Payments
router.get('/all', authenticateToken, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const payments = await paymentService.getAllPayments();
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Admin: Get All Invoices
router.get('/invoices/all', authenticateToken, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const invoices = await paymentService.getAllInvoices();
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Create Invoice
router.post('/invoices/create', authenticateToken, authorizeRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { userId, items, notes } = req.body;
    const invoice = await paymentService.createInvoice(userId, items, notes);
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;

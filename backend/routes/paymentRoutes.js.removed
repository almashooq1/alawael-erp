/**
 * Payment Gateway API Routes
 * Stripe, PayPal, and KNET (Saudi Arabia) integration
 */

const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const authMiddleware = require('../middleware/authMiddleware');
const AuditLogger = require('../services/audit-logger');
const Payment = require('../models/payment.model');
const mongoose = require('mongoose');

// Webhook helpers
const rawJson = express.raw({ type: 'application/json' });

/**
 * POST /api/payments/initialize-stripe
 * Initialize Stripe payment
 */
router.post('/initialize-stripe', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { amount, currency = 'SAR', metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount required',
      });
    }

    const result = await paymentService.initializeStripePayment(userId, amount, currency, metadata);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/confirm-stripe
 * Confirm Stripe payment
 */
router.post('/confirm-stripe', authMiddleware, async (req, res) => {
  try {
    const { paymentId, paymentMethodId } = req.body;

    if (!paymentId || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID and method ID required',
      });
    }

    const result = await paymentService.confirmStripePayment(paymentId, paymentMethodId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/initialize-paypal
 * Initialize PayPal payment
 */
router.post('/initialize-paypal', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { amount, currency = 'SAR', metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount required',
      });
    }

    const result = await paymentService.initializePayPalPayment(userId, amount, currency, metadata);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/initialize-knet
 * Initialize KNET payment (Saudi Arabia)
 */
router.post('/initialize-knet', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { amount, metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount required',
      });
    }

    const result = await paymentService.initializeKNETPayment(userId, amount, 'SAR', metadata);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/status/:paymentId
 * Get payment status
 */
router.get('/status/:paymentId', authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const result = await paymentService.getPaymentStatus(paymentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/create-invoice
 * Create invoice
 */
router.post('/create-invoice', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { items, metadata = {} } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items required',
      });
    }

    const result = await paymentService.createInvoice(userId, items, metadata);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/send-invoice
 * Send invoice to recipient
 */
router.post('/send-invoice', authMiddleware, async (req, res) => {
  try {
    const { invoiceId, recipientEmail } = req.body;

    if (!invoiceId || !recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'Invoice ID and email required',
      });
    }

    const result = await paymentService.sendInvoice(invoiceId, recipientEmail);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/save-payment-method
 * Save payment method for future use
 */
router.post('/save-payment-method', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { type, lastFour, expiryDate, isDefault = false } = req.body;

    if (!type || !lastFour) {
      return res.status(400).json({
        success: false,
        error: 'Type and lastFour required',
      });
    }

    const result = await paymentService.savePaymentMethod(userId, {
      type,
      lastFour,
      expiryDate,
      isDefault,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/saved-methods
 * Get saved payment methods
 */
router.get('/saved-methods', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await paymentService.getSavedPaymentMethods(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/payments/saved-methods/:methodId
 * Delete saved payment method
 */
router.delete('/saved-methods/:methodId', authMiddleware, async (req, res) => {
  try {
    const { methodId } = req.params;

    const result = await paymentService.deletePaymentMethod(methodId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/refund
 * Refund payment
 */
router.post('/refund', authMiddleware, async (req, res) => {
  try {
    const { paymentId, reason = '' } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID required',
      });
    }

    const result = await paymentService.refundPayment(paymentId, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/history
 * Get payment history
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 50 } = req.query;

    const result = await paymentService.getPaymentHistory(userId, parseInt(limit));
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/statistics
 * Get payment statistics
 */
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await paymentService.getPaymentStats(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============== Health & Monitoring ==============
router.get('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const paymentCount = await Payment.countDocuments();
    const recentPayments = await Payment.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date(),
      database: dbStatus,
      metrics: {
        totalPayments: paymentCount,
        last24Hours: recentPayments,
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Admin: Get audit trail for a payment
router.get('/audit/:paymentId', authMiddleware, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findOne({ transactionId: paymentId });
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });

    const logs = await AuditLogger.getResourceLogs('payment', payment._id, 50);
    res.json({ success: true, payment: payment.transactionId, logs });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get payment metrics (admin)
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalPayments, completedToday, pendingPayments, totalRevenue] = await Promise.all([
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'completed', completedAt: { $gte: today } }),
      Payment.countDocuments({ status: 'pending' }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      success: true,
      metrics: {
        totalPayments,
        completedToday,
        pendingPayments,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;

// ============== Webhooks ==============
// Stripe webhook (uses raw body for signature compatibility if middleware order allows)
router.post('/webhook/stripe', rawJson, async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const payload = req.body && req.body.length ? JSON.parse(req.body.toString()) : req.body; // fallback if raw buffer
    const result = await paymentService.handleStripeWebhook(payload, signature);
    if (!result.success) return res.status(400).json(result);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PayPal webhook
router.post('/webhook/paypal', async (req, res) => {
  try {
    const result = await paymentService.handlePayPalWebhook(req.body || {});
    if (!result.success) return res.status(400).json(result);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// KNET webhook (basic placeholder)
router.post('/webhook/knet', async (req, res) => {
  try {
    const result = await paymentService.handleKNETWebhook(req.body || {});
    if (!result.success) return res.status(400).json(result);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

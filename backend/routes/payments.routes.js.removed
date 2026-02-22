const express = require('express');
const router = express.Router();
const PaymentGatewayService = require('../services/payment-gateway.service');
const paymentService = new PaymentGatewayService();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  sanitizeInput,
  commonValidations,
  handleValidationErrors,
} = require('../middleware/requestValidation');
const { body } = require('express-validator');

// Apply global protections
router.use(apiLimiter);
router.use(sanitizeInput);

// Health check
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'payments ok' });
});

// Echo test to validate express-validator pipeline
router.post(
  '/echo',
  [body('foo').exists().withMessage('foo required'), handleValidationErrors],
  (req, res) => {
    res.json({ success: true, foo: req.body.foo });
  }
);

// Debug: return raw body
router.post('/debug/body', (req, res) => {
  res.json({ success: true, body: req.body });
});

// Stripe
router.post(
  '/stripe',
  authenticateToken,
  [
    body('amount')
      .custom(value => {
        const num = typeof value === 'number' ? value : parseFloat(value);
        return !isNaN(num) && num >= 0.01 && num <= 100000;
      })
      .withMessage('Invalid amount'),
    body('currency').isIn(['USD', 'EUR', 'SAR', 'AED']).withMessage('Invalid currency'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { amount, currency } = req.body;
      const userId = (req.user && req.user.id) || 'user-test';
      const result = await paymentService.processStripePayment(userId, amount, currency);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// Debug route without auth to isolate service errors
router.post(
  '/debug/stripe',
  [
    body('amount')
      .custom(value => {
        const num = typeof value === 'number' ? value : parseFloat(value);
        return !isNaN(num) && num >= 0.01 && num <= 100000;
      })
      .withMessage('Invalid amount'),
    body('currency').isIn(['USD', 'EUR', 'SAR', 'AED']).withMessage('Invalid currency'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { amount, currency } = req.body;
      const result = await paymentService.processStripePayment('user-test', amount, currency);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// PayPal
router.post(
  '/paypal',
  authenticateToken,
  [
    body('amount')
      .custom(value => {
        const num = typeof value === 'number' ? value : parseFloat(value);
        return !isNaN(num) && num >= 0.01 && num <= 100000;
      })
      .withMessage('Invalid amount'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { amount, description } = req.body;
      const userId = (req.user && req.user.id) || 'user-test';
      const result = await paymentService.processPayPalPayment(userId, amount, description);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// Installment
router.post(
  '/installment',
  authenticateToken,
  [
    body('amount')
      .custom(value => {
        const num = typeof value === 'number' ? value : parseFloat(value);
        return !isNaN(num) && num >= 0.01 && num <= 100000;
      })
      .withMessage('Invalid amount'),
    body('months').isInt({ min: 1, max: 60 }).toInt().withMessage('Months must be 1-60'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { amount, months } = req.body;
      const userId = (req.user && req.user.id) || 'user-test';
      const result = await paymentService.processInstallmentPayment(userId, amount, months);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// Subscriptions
router.post(
  '/subscriptions/create',
  authenticateToken,
  [
    body('plan').isString().isLength({ min: 2, max: 100 }).withMessage('Invalid plan'),
    body('billingCycle').isIn(['monthly', 'quarterly', 'annual']).withMessage('Invalid cycle'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { plan, billingCycle } = req.body;
      const userId = (req.user && req.user.id) || 'user-test';
      const subscription = await paymentService.createSubscription(userId, plan, billingCycle);
      res.json({ success: true, data: subscription });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// History
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = (req.user && req.user.id) || 'user-test';
    const payments = await paymentService.getPaymentHistory(userId);
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
router.get(
  '/invoices/all',
  authenticateToken,
  authorizeRole(['admin', 'super_admin']),
  async (req, res) => {
    try {
      const invoices = await paymentService.getAllInvoices();
      res.json({ success: true, data: invoices });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// Create Invoice
router.post(
  '/invoices/create',
  authenticateToken,
  authorizeRole(['admin', 'super_admin']),
  [
    body('userId').isString().isLength({ min: 2 }).withMessage('Invalid userId'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('Items array required')
      .custom(items => items.every(i => i.productId && i.quantity && i.price)),
    body('notes').optional().isLength({ max: 500 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { userId, items, notes } = req.body;
      const invoice = await paymentService.createInvoice(userId, items, notes);
      res.json({ success: true, data: invoice });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;


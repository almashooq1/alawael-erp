const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { sensitiveOperationLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const Payment = require('../models/Payment');

router.use(authenticate);

// ── Payment-specific rate limiter (5 write operations / hour) ──
router.use(['/', '/:id'], (req, res, next) => {
  // Only rate-limit write operations, not reads
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return sensitiveOperationLimiter(req, res, next);
  }
  next();
});

// ── Whitelist helper: pick only allowed fields from request body ──
const ALLOWED_PAYMENT_FIELDS = [
  'invoiceId',
  'reference',
  'paymentDate',
  'amount',
  'currency',
  'paymentMethod',
  'accountId',
  'checkNumber',
  'bankName',
  'transactionId',
  'notes',
];

function pickFields(body, allowedFields) {
  const result = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) result[key] = body[key];
  }
  return result;
}

function validatePaymentBody(body) {
  const errors = [];
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (isNaN(amount) || amount < 0) errors.push('المبلغ يجب أن يكون رقماً موجباً');
  }
  if (body.paymentMethod !== undefined) {
    const valid = [
      'cash',
      'bank_transfer',
      'check',
      'credit_card',
      'debit_card',
      'online',
      'other',
    ];
    if (!valid.includes(body.paymentMethod)) errors.push('طريقة الدفع غير صالحة');
  }
  return errors;
}

// GET /all
router.get('/all', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Payment.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    logger.error('Payments all error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب المدفوعات' });
  }
});

// GET /history
router.get('/history', async (req, res) => {
  try {
    const data = await Payment.find({ userId: req.user?.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Payment history error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب سجل المدفوعات' });
  }
});

// POST /stripe
router.post('/stripe', async (req, res) => {
  try {
    const errors = validatePaymentBody(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(', ') });
    const fields = pickFields(req.body, ALLOWED_PAYMENT_FIELDS);
    const payment = await Payment.create({
      ...fields,
      method: 'stripe',
      userId: req.user?.id,
      status: 'pending',
    });
    res.status(201).json({ success: true, data: payment, message: 'تم إنشاء طلب الدفع' });
  } catch (err) {
    logger.error('Stripe payment error:', err);
    res.status(500).json({ success: false, message: 'خطأ في معالجة الدفع' });
  }
});

// POST /paypal
router.post('/paypal', async (req, res) => {
  try {
    const errors = validatePaymentBody(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(', ') });
    const fields = pickFields(req.body, ALLOWED_PAYMENT_FIELDS);
    const payment = await Payment.create({
      ...fields,
      method: 'paypal',
      userId: req.user?.id,
      status: 'pending',
    });
    res.status(201).json({ success: true, data: payment, message: 'تم إنشاء طلب الدفع' });
  } catch (err) {
    logger.error('PayPal payment error:', err);
    res.status(500).json({ success: false, message: 'خطأ في معالجة الدفع' });
  }
});

// POST /installment
router.post('/installment', async (req, res) => {
  try {
    const errors = validatePaymentBody(req.body);
    if (errors.length) return res.status(400).json({ success: false, message: errors.join(', ') });
    const fields = pickFields(req.body, ALLOWED_PAYMENT_FIELDS);
    const payment = await Payment.create({
      ...fields,
      method: 'installment',
      userId: req.user?.id,
      status: 'pending',
    });
    res.status(201).json({ success: true, data: payment, message: 'تم إنشاء خطة التقسيط' });
  } catch (err) {
    logger.error('Installment error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء خطة التقسيط' });
  }
});

// POST /subscriptions/create
router.post('/subscriptions/create', async (req, res) => {
  try {
    const Subscription = require('../models/subscription.model');
    const allowedSubFields = [
      'plan',
      'startDate',
      'endDate',
      'amount',
      'currency',
      'paymentMethod',
      'notes',
    ];
    const fields = pickFields(req.body, allowedSubFields);
    const sub = await Subscription.create({ ...fields, userId: req.user?.id, status: 'active' });
    res.status(201).json({ success: true, data: sub, message: 'تم إنشاء الاشتراك' });
  } catch (err) {
    logger.error('Subscription create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الاشتراك' });
  }
});

module.exports = router;

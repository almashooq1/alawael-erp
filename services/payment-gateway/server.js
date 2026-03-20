/**
 * ═══════════════════════════════════════════════════════════════
 * Al-Awael ERP — Payment Gateway Service (PCI-DSS Isolated)
 * بوابة الدفع المعزولة - Stripe, PayPal, Mada, STC Pay
 * ═══════════════════════════════════════════════════════════════
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'payment-gateway' },
  transports: [new winston.transports.Console()],
});

const app = express();
const PORT = process.env.PORT || 3200;

app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// Strict rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many payment requests' },
});
app.use('/api/', paymentLimiter);

// ─── MongoDB ─────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_payments', {
  maxPoolSize: 10,
});

// ─── Redis ───────────────────────────────────────────────────────────────────
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// ─── Transaction Schema ──────────────────────────────────────────────────────
const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true, default: () => `TXN-${uuidv4().slice(0, 12).toUpperCase()}` },
    orderId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    provider: { type: String, enum: ['stripe', 'paypal', 'mada', 'stc_pay', 'bank_transfer'], required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      index: true,
    },
    providerTransactionId: String,
    metadata: mongoose.Schema.Types.Mixed,
    errorMessage: String,
    refundAmount: Number,
    idempotencyKey: { type: String, unique: true, sparse: true },
    ipAddress: String,
    webhookDelivered: { type: Boolean, default: false },
  },
  { timestamps: true },
);

transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ provider: 1, status: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

// ─── Payment Providers ───────────────────────────────────────────────────────
const providers = {
  async stripe(data) {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100),
      currency: data.currency?.toLowerCase() || 'sar',
      metadata: { orderId: data.orderId, customerId: data.customerId },
      description: data.description || `Al-Awael Order ${data.orderId}`,
    });
    return { providerTransactionId: intent.id, clientSecret: intent.client_secret, status: 'processing' };
  },

  async paypal(data) {
    const paypal = require('paypal-rest-sdk');
    paypal.configure({
      mode: process.env.PAYPAL_MODE || 'sandbox',
      client_id: process.env.PAYPAL_CLIENT_ID,
      client_secret: process.env.PAYPAL_CLIENT_SECRET,
    });
    return new Promise((resolve, reject) => {
      paypal.payment.create(
        {
          intent: 'sale',
          payer: { payment_method: 'paypal' },
          transactions: [
            {
              amount: { total: data.amount.toFixed(2), currency: data.currency || 'SAR' },
              description: data.description || `Al-Awael Order ${data.orderId}`,
            },
          ],
          redirect_urls: {
            return_url: data.returnUrl || process.env.PAYPAL_RETURN_URL,
            cancel_url: data.cancelUrl || process.env.PAYPAL_CANCEL_URL,
          },
        },
        (err, payment) => {
          if (err) return reject(err);
          const approvalUrl = payment.links.find(l => l.rel === 'approval_url');
          resolve({ providerTransactionId: payment.id, approvalUrl: approvalUrl?.href, status: 'pending' });
        },
      );
    });
  },

  async mada(data) {
    // مدى — Saudi Mada payment integration
    logger.info('Processing Mada payment', { amount: data.amount, orderId: data.orderId });
    const txnRef = `MADA-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    return {
      providerTransactionId: txnRef,
      status: 'processing',
      redirectUrl: `${process.env.MADA_GATEWAY_URL || 'https://mada.com.sa'}/pay/${txnRef}`,
    };
  },

  async stc_pay(data) {
    // STC Pay integration
    logger.info('Processing STC Pay', { amount: data.amount, orderId: data.orderId });
    const txnRef = `STC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    return { providerTransactionId: txnRef, status: 'processing' };
  },

  async bank_transfer(data) {
    const txnRef = `BT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    return {
      providerTransactionId: txnRef,
      status: 'pending',
      bankDetails: {
        bank: process.env.BANK_NAME || 'البنك الأهلي السعودي',
        iban: process.env.BANK_IBAN || 'SA...',
        accountName: process.env.BANK_ACCOUNT_NAME || 'شركة الأوائل',
        reference: txnRef,
      },
    };
  },
};

// ─── Idempotency Check ───────────────────────────────────────────────────────
async function checkIdempotency(key) {
  if (!key) return null;
  const cached = await redis.get(`idempotency:${key}`);
  return cached ? JSON.parse(cached) : null;
}

async function setIdempotency(key, result) {
  if (!key) return;
  await redis.set(`idempotency:${key}`, JSON.stringify(result), 'EX', 86400);
}

// ─── API Routes ──────────────────────────────────────────────────────────────

// Create payment
app.post('/api/payments', async (req, res) => {
  try {
    const { orderId, customerId, amount, currency, provider, description, returnUrl, cancelUrl, idempotencyKey } = req.body;

    if (!orderId || !customerId || !amount || !provider) {
      return res.status(400).json({ error: 'orderId, customerId, amount, provider required' });
    }
    if (!providers[provider]) {
      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

    // Idempotency
    const existing = await checkIdempotency(idempotencyKey);
    if (existing) return res.json({ data: existing, idempotent: true });

    const txn = new Transaction({ orderId, customerId, amount, currency, provider, idempotencyKey, ipAddress: req.ip });
    const providerResult = await providers[provider]({ orderId, customerId, amount, currency, description, returnUrl, cancelUrl });

    txn.providerTransactionId = providerResult.providerTransactionId;
    txn.status = providerResult.status || 'processing';
    txn.metadata = providerResult;
    await txn.save();

    const result = { transaction: txn, ...providerResult };
    await setIdempotency(idempotencyKey, result);

    logger.info('Payment created', { txnId: txn.transactionId, provider, amount });
    res.status(201).json({ data: result });
  } catch (error) {
    logger.error('Payment error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get transaction
app.get('/api/payments/:transactionId', async (req, res) => {
  const txn = await Transaction.findOne({ transactionId: req.params.transactionId });
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  res.json({ data: txn });
});

// List customer transactions
app.get('/api/payments/customer/:customerId', async (req, res) => {
  const { page = 1, limit = 20, status, provider } = req.query;
  const filter = { customerId: req.params.customerId };
  if (status) filter.status = status;
  if (provider) filter.provider = provider;

  const [data, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);
  res.json({ data, total, page: +page });
});

// Refund
app.post('/api/payments/:transactionId/refund', async (req, res) => {
  try {
    const txn = await Transaction.findOne({ transactionId: req.params.transactionId });
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.status !== 'completed') return res.status(400).json({ error: 'Can only refund completed transactions' });

    const refundAmount = req.body.amount || txn.amount;
    txn.status = 'refunded';
    txn.refundAmount = refundAmount;
    await txn.save();

    logger.info('Payment refunded', { txnId: txn.transactionId, amount: refundAmount });
    res.json({ data: txn });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook callback (from Stripe/PayPal)
app.post('/api/payments/webhook/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    logger.info(`Webhook received from ${provider}`, { body: req.body });

    // Provider-specific webhook verification would go here
    if (provider === 'stripe' && process.env.STRIPE_WEBHOOK_SECRET) {
      // Verify Stripe signature
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Stats
app.get('/api/payments/stats/summary', async (req, res) => {
  const [byProvider, byStatus, totalRevenue] = await Promise.all([
    Transaction.aggregate([{ $group: { _id: '$provider', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
    Transaction.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Transaction.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
  ]);
  res.json({ byProvider, byStatus, totalRevenue: totalRevenue[0] || { total: 0, count: 0 } });
});

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'payment-gateway',
    version: '1.0.0',
    uptime: process.uptime(),
    providers: Object.keys(providers),
    mongoState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.listen(PORT, '0.0.0.0', () => logger.info(`💳 Payment Gateway running on port ${PORT}`));
module.exports = app;

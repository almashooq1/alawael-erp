/**
 * ═══════════════════════════════════════════════════════════════
 *  Al-Awael ERP — Payment Gateway Service (بوابة الدفع)
 *  Port: 3690
 *  Phase 8F — Payment processing, recurring invoices, multi-method
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');
const CryptoJS = require('crypto-js');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3690;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_payments';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PAYMENT_SECRET = process.env.PAYMENT_SECRET || 'Alawael@PaymentSign@2026!';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 50, 2000),
});

/* ─── Schemas ─────────────────────────────────────────────────── */

// معاملة الدفع
const TransactionSchema = new mongoose.Schema({
  txnId: { type: String, unique: true },
  invoiceId: { type: String, index: true },
  studentId: { type: String, index: true },
  parentId: { type: String, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'SAR' },
  method: {
    type: String,
    enum: ['credit-card', 'debit-card', 'bank-transfer', 'mada', 'apple-pay', 'stc-pay', 'sadad', 'cash', 'cheque', 'wallet'],
    required: true,
  },
  gateway: { type: String, enum: ['internal', 'moyasar', 'hyperpay', 'tap', 'payfort', 'manual'], default: 'internal' },
  type: { type: String, enum: ['payment', 'refund', 'partial-refund', 'adjustment', 'fee-waiver'], default: 'payment' },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially-refunded'],
    default: 'pending',
  },
  description: { type: String },
  descriptionAr: { type: String },
  gatewayRef: { type: String }, // external gateway reference
  gatewayResponse: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed },
  paidAt: { type: Date },
  failedAt: { type: Date },
  failureReason: { type: String },
  signature: { type: String }, // integrity signature
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ method: 1 });

TransactionSchema.pre('save', async function (next) {
  if (!this.txnId) {
    this.txnId = `TXN-${dayjs().format('YYYYMMDD')}-${uuidv4().slice(0, 8).toUpperCase()}`;
  }
  // Create integrity signature
  const payload = `${this.txnId}|${this.amount}|${this.currency}|${this.method}|${this.studentId}`;
  this.signature = CryptoJS.HmacSHA256(payload, PAYMENT_SECRET).toString();
  this.updatedAt = new Date();
  next();
});

// فاتورة
const InvoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, unique: true },
  studentId: { type: String, required: true, index: true },
  parentId: { type: String, index: true },
  type: {
    type: String,
    enum: ['tuition', 'registration', 'transport', 'uniform', 'books', 'meals', 'activities', 'therapy', 'late-fee', 'other'],
    default: 'tuition',
  },
  items: [
    {
      description: String,
      descriptionAr: String,
      quantity: { type: Number, default: 1 },
      unitPrice: Number,
      total: Number,
      taxRate: { type: Number, default: 0.15 }, // 15% VAT
      taxAmount: Number,
    },
  ],
  subtotal: { type: Number },
  taxTotal: { type: Number },
  total: { type: Number, required: true },
  currency: { type: String, default: 'SAR' },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'void'], default: 'draft' },
  paidAmount: { type: Number, default: 0 },
  balance: { type: Number },
  dueDate: { type: Date },
  sentAt: { type: Date },
  paidAt: { type: Date },
  recurringId: { type: String }, // link to recurring schedule
  notes: { type: String },
  notesAr: { type: String },
  academicYear: { type: String },
  term: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ dueDate: 1 });

InvoiceSchema.pre('save', async function (next) {
  if (!this.invoiceId) {
    const c = await mongoose.model('Invoice').countDocuments();
    this.invoiceId = `INV-${dayjs().format('YYYYMM')}-${String(c + 1).padStart(5, '0')}`;
  }
  // Calculate totals
  if (this.items?.length) {
    this.subtotal = this.items.reduce((s, i) => {
      i.total = (i.quantity || 1) * (i.unitPrice || 0);
      i.taxAmount = i.total * (i.taxRate || 0.15);
      return s + i.total;
    }, 0);
    this.taxTotal = this.items.reduce((s, i) => s + (i.taxAmount || 0), 0);
    this.total = this.subtotal + this.taxTotal;
  }
  this.balance = this.total - (this.paidAmount || 0);
  if (this.balance <= 0 && this.status !== 'cancelled' && this.status !== 'void') {
    this.status = 'paid';
    if (!this.paidAt) this.paidAt = new Date();
  }
  this.updatedAt = new Date();
  next();
});

// الدفع المتكرر
const RecurringScheduleSchema = new mongoose.Schema({
  scheduleId: { type: String, unique: true },
  studentId: { type: String, required: true },
  parentId: { type: String },
  name: { type: String },
  nameAr: { type: String },
  type: { type: String, enum: ['tuition', 'transport', 'meals', 'activities', 'therapy', 'other'], default: 'tuition' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'SAR' },
  frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'], default: 'monthly' },
  items: [{ description: String, descriptionAr: String, quantity: Number, unitPrice: Number, taxRate: Number }],
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  nextDueDate: { type: Date },
  isActive: { type: Boolean, default: true },
  totalGenerated: { type: Number, default: 0 },
  academicYear: { type: String },
  createdAt: { type: Date, default: Date.now },
});
RecurringScheduleSchema.pre('save', async function (next) {
  if (!this.scheduleId) {
    const c = await mongoose.model('RecurringSchedule').countDocuments();
    this.scheduleId = `REC-${String(c + 1).padStart(4, '0')}`;
  }
  next();
});

// طريقة دفع محفوظة
const PaymentMethodSchema = new mongoose.Schema({
  methodId: { type: String, unique: true },
  parentId: { type: String, required: true, index: true },
  type: { type: String, enum: ['credit-card', 'debit-card', 'mada', 'bank-account', 'wallet'] },
  label: { type: String }, // "Visa ending 4242"
  last4: { type: String },
  brand: { type: String }, // visa, mastercard, mada
  expiryMonth: { type: Number },
  expiryYear: { type: Number },
  isDefault: { type: Boolean, default: false },
  gatewayToken: { type: String }, // tokenized card reference
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
PaymentMethodSchema.pre('save', async function (next) {
  if (!this.methodId) {
    const c = await mongoose.model('PaymentMethod').countDocuments();
    this.methodId = `PM-${String(c + 1).padStart(5, '0')}`;
  }
  next();
});

// سجل التسوية
const SettlementSchema = new mongoose.Schema({
  settlementId: { type: String, unique: true },
  period: { start: Date, end: Date },
  totalTransactions: { type: Number },
  totalAmount: { type: Number },
  totalRefunds: { type: Number },
  netAmount: { type: Number },
  status: { type: String, enum: ['pending', 'reconciled', 'discrepancy'], default: 'pending' },
  transactions: [{ type: String }],
  generatedAt: { type: Date, default: Date.now },
});

const Transaction = mongoose.model('Transaction', TransactionSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const RecurringSchedule = mongoose.model('RecurringSchedule', RecurringScheduleSchema);
const PaymentMethod = mongoose.model('PaymentMethod', PaymentMethodSchema);
const Settlement = mongoose.model('Settlement', SettlementSchema);

/* ─── BullMQ ──────────────────────────────────────────────────── */
const paymentQueue = new Queue('payment-tasks', { connection: redis });

const worker = new Worker(
  'payment-tasks',
  async job => {
    if (job.data.type === 'process-payment') {
      const txn = await Transaction.findOne({ txnId: job.data.txnId });
      if (!txn || txn.status !== 'pending') return;

      txn.status = 'processing';
      await txn.save();

      try {
        // Simulate gateway processing (in production, call actual gateway APIs)
        await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));

        // 95% success rate simulation
        const success = Math.random() < 0.95;

        if (success) {
          txn.status = 'completed';
          txn.paidAt = new Date();
          txn.gatewayRef = `GW-${uuidv4().slice(0, 12).toUpperCase()}`;
          txn.gatewayResponse = { status: 'approved', code: '00', message: 'Transaction approved' };
          await txn.save();

          // Update invoice if linked
          if (txn.invoiceId) {
            const inv = await Invoice.findOne({ invoiceId: txn.invoiceId });
            if (inv) {
              inv.paidAmount = (inv.paidAmount || 0) + txn.amount;
              if (inv.paidAmount >= inv.total) {
                inv.status = 'paid';
                inv.paidAt = new Date();
              } else {
                inv.status = 'partial';
              }
              await inv.save();
            }
          }

          await redis.hincrby('payment:stats', 'successful', 1);
          await redis.hincrbyfloat('payment:stats', 'total_collected', txn.amount);
        } else {
          txn.status = 'failed';
          txn.failedAt = new Date();
          txn.failureReason = 'Gateway declined transaction';
          txn.gatewayResponse = { status: 'declined', code: '05', message: 'Insufficient funds' };
          await txn.save();
          await redis.hincrby('payment:stats', 'failed', 1);
        }
      } catch (err) {
        txn.status = 'failed';
        txn.failedAt = new Date();
        txn.failureReason = err.message;
        await txn.save();
      }
    }

    if (job.data.type === 'generate-recurring') {
      const schedules = await RecurringSchedule.find({
        isActive: true,
        nextDueDate: { $lte: new Date() },
        $or: [{ endDate: null }, { endDate: { $gte: new Date() } }],
      });

      for (const sched of schedules) {
        try {
          const invoice = await Invoice.create({
            studentId: sched.studentId,
            parentId: sched.parentId,
            type: sched.type,
            items: sched.items?.length
              ? sched.items
              : [
                  {
                    descriptionAr: sched.nameAr || sched.name,
                    description: sched.name,
                    quantity: 1,
                    unitPrice: sched.amount,
                    taxRate: 0.15,
                  },
                ],
            total: sched.amount,
            currency: sched.currency,
            status: 'sent',
            sentAt: new Date(),
            dueDate: dayjs(sched.nextDueDate).add(30, 'day').toDate(),
            recurringId: sched.scheduleId,
            academicYear: sched.academicYear,
          });

          // Calculate next due date
          const freq = {
            weekly: [1, 'week'],
            monthly: [1, 'month'],
            quarterly: [3, 'month'],
            'semi-annual': [6, 'month'],
            annual: [1, 'year'],
          };
          const [n, unit] = freq[sched.frequency] || [1, 'month'];
          sched.nextDueDate = dayjs(sched.nextDueDate).add(n, unit).toDate();
          sched.totalGenerated++;
          await sched.save();

          console.log(`📋 Generated recurring invoice ${invoice.invoiceId} for ${sched.scheduleId}`);
        } catch (e) {
          console.error(`Recurring gen error for ${sched.scheduleId}:`, e.message);
        }
      }
    }
  },
  { connection: redis, concurrency: 5 },
);

/* ─── Health ──────────────────────────────────────────────────── */
app.get('/health', async (_req, res) => {
  try {
    const db = mongoose.connection.readyState === 1;
    const rd = redis.status === 'ready';
    res.status(db && rd ? 200 : 503).json({
      status: db && rd ? 'healthy' : 'degraded',
      service: 'payment-gateway-service',
      port: PORT,
      mongodb: db ? 'connected' : 'disconnected',
      redis: rd ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});

/* ─── Invoices ────────────────────────────────────────────────── */
app.post('/api/payments/invoices', async (req, res) => {
  try {
    const inv = await Invoice.create(req.body);
    res.status(201).json(inv);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/payments/invoices', async (req, res) => {
  try {
    const { studentId, parentId, status, type, from, to, page = 1, limit = 50 } = req.query;
    const q = {};
    if (studentId) q.studentId = studentId;
    if (parentId) q.parentId = parentId;
    if (status) q.status = status;
    if (type) q.type = type;
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Invoice.find(q).sort('-createdAt').skip(skip).limit(Number(limit)),
      Invoice.countDocuments(q),
    ]);
    res.json({ data: items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/payments/invoices/:id', async (req, res) => {
  try {
    const inv = await Invoice.findOne({ invoiceId: req.params.id });
    if (!inv) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    res.json(inv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/payments/invoices/:id', async (req, res) => {
  try {
    const inv = await Invoice.findOne({ invoiceId: req.params.id });
    if (!inv) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    Object.assign(inv, req.body);
    await inv.save();
    res.json(inv);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/payments/invoices/:id/send', async (req, res) => {
  try {
    const inv = await Invoice.findOne({ invoiceId: req.params.id });
    if (!inv) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    inv.status = 'sent';
    inv.sentAt = new Date();
    await inv.save();
    res.json({ message: 'تم إرسال الفاتورة', invoiceId: inv.invoiceId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/payments/invoices/:id/cancel', async (req, res) => {
  try {
    const inv = await Invoice.findOne({ invoiceId: req.params.id });
    if (!inv) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    if (inv.status === 'paid') return res.status(400).json({ error: 'لا يمكن إلغاء فاتورة مدفوعة' });
    inv.status = 'cancelled';
    await inv.save();
    res.json({ message: 'تم إلغاء الفاتورة' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Transactions / Pay ──────────────────────────────────────── */
app.post('/api/payments/pay', async (req, res) => {
  try {
    const { invoiceId, amount, method, gateway, parentId, studentId, metadata } = req.body;
    if (!amount || !method) return res.status(400).json({ error: 'المبلغ وطريقة الدفع مطلوبان' });

    // Verify invoice if provided
    if (invoiceId) {
      const inv = await Invoice.findOne({ invoiceId });
      if (!inv) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
      if (inv.status === 'paid') return res.status(400).json({ error: 'الفاتورة مدفوعة بالكامل' });
      if (inv.status === 'cancelled') return res.status(400).json({ error: 'الفاتورة ملغاة' });
    }

    const txn = await Transaction.create({
      invoiceId,
      amount,
      method,
      gateway: gateway || 'internal',
      type: 'payment',
      studentId,
      parentId,
      metadata,
      ipAddress: req.ip,
    });

    // Queue for processing
    await paymentQueue.add('process', { txnId: txn.txnId, type: 'process-payment' });

    res.status(201).json({ txnId: txn.txnId, status: 'pending', message: 'جاري معالجة الدفع' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/payments/transactions', async (req, res) => {
  try {
    const { studentId, parentId, status, method, type, from, to, page = 1, limit = 50 } = req.query;
    const q = {};
    if (studentId) q.studentId = studentId;
    if (parentId) q.parentId = parentId;
    if (status) q.status = status;
    if (method) q.method = method;
    if (type) q.type = type;
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Transaction.find(q).sort('-createdAt').skip(skip).limit(Number(limit)),
      Transaction.countDocuments(q),
    ]);
    res.json({ data: items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/payments/transactions/:id', async (req, res) => {
  try {
    const t = await Transaction.findOne({ txnId: req.params.id });
    if (!t) return res.status(404).json({ error: 'المعاملة غير موجودة' });
    res.json(t);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Refund ──────────────────────────────────────────────────── */
app.post('/api/payments/refund', async (req, res) => {
  try {
    const { txnId, amount, reason } = req.body;
    const original = await Transaction.findOne({ txnId, status: 'completed' });
    if (!original) return res.status(404).json({ error: 'المعاملة غير موجودة أو لم تكتمل' });
    if (amount > original.amount) return res.status(400).json({ error: 'مبلغ الاسترداد أكبر من المعاملة الأصلية' });

    const refund = await Transaction.create({
      invoiceId: original.invoiceId,
      studentId: original.studentId,
      parentId: original.parentId,
      amount: amount || original.amount,
      currency: original.currency,
      method: original.method,
      gateway: original.gateway,
      type: amount && amount < original.amount ? 'partial-refund' : 'refund',
      status: 'completed',
      descriptionAr: reason || `استرداد للمعاملة ${txnId}`,
      paidAt: new Date(),
      metadata: { originalTxnId: txnId },
    });

    // Update original transaction status
    original.status = refund.type === 'refund' ? 'refunded' : 'partially-refunded';
    await original.save();

    // Update invoice balance
    if (original.invoiceId) {
      const inv = await Invoice.findOne({ invoiceId: original.invoiceId });
      if (inv) {
        inv.paidAmount = Math.max(0, (inv.paidAmount || 0) - refund.amount);
        if (inv.paidAmount < inv.total) inv.status = inv.paidAmount > 0 ? 'partial' : 'sent';
        await inv.save();
      }
    }

    res.status(201).json(refund);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Recurring Schedules ─────────────────────────────────────── */
app.post('/api/payments/recurring', async (req, res) => {
  try {
    const sched = await RecurringSchedule.create({
      ...req.body,
      nextDueDate: req.body.nextDueDate || req.body.startDate,
    });
    res.status(201).json(sched);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/payments/recurring', async (req, res) => {
  try {
    const { studentId, isActive } = req.query;
    const q = {};
    if (studentId) q.studentId = studentId;
    if (isActive !== undefined) q.isActive = isActive === 'true';
    res.json(await RecurringSchedule.find(q).sort('-createdAt'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/payments/recurring/:id', async (req, res) => {
  try {
    const s = await RecurringSchedule.findOneAndUpdate({ scheduleId: req.params.id }, req.body, { new: true });
    if (!s) return res.status(404).json({ error: 'الجدول غير موجود' });
    res.json(s);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/payments/recurring/:id', async (req, res) => {
  try {
    const s = await RecurringSchedule.findOneAndUpdate({ scheduleId: req.params.id }, { isActive: false }, { new: true });
    if (!s) return res.status(404).json({ error: 'الجدول غير موجود' });
    res.json({ message: 'تم إيقاف الجدول المتكرر' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Saved Payment Methods ───────────────────────────────────── */
app.post('/api/payments/methods', async (req, res) => {
  try {
    // If setting as default, unset others
    if (req.body.isDefault) {
      await PaymentMethod.updateMany({ parentId: req.body.parentId }, { isDefault: false });
    }
    const pm = await PaymentMethod.create(req.body);
    res.status(201).json(pm);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/payments/methods/:parentId', async (req, res) => {
  try {
    res.json(await PaymentMethod.find({ parentId: req.params.parentId, isActive: true }).sort('-isDefault'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/payments/methods/:id', async (req, res) => {
  try {
    await PaymentMethod.findOneAndUpdate({ methodId: req.params.id }, { isActive: false });
    res.json({ message: 'تم حذف طريقة الدفع' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Student Balance ─────────────────────────────────────────── */
app.get('/api/payments/balance/:studentId', async (req, res) => {
  try {
    const [invoices, payments, refunds] = await Promise.all([
      Invoice.aggregate([
        { $match: { studentId: req.params.studentId, status: { $nin: ['cancelled', 'void'] } } },
        { $group: { _id: null, totalInvoiced: { $sum: '$total' }, totalPaid: { $sum: '$paidAmount' } } },
      ]),
      Transaction.aggregate([
        { $match: { studentId: req.params.studentId, type: 'payment', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { studentId: req.params.studentId, type: { $in: ['refund', 'partial-refund'] }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const inv = invoices[0] || { totalInvoiced: 0, totalPaid: 0 };
    res.json({
      studentId: req.params.studentId,
      totalInvoiced: inv.totalInvoiced,
      totalPaid: inv.totalPaid,
      totalPayments: payments[0]?.total || 0,
      totalRefunds: refunds[0]?.total || 0,
      balance: inv.totalInvoiced - inv.totalPaid,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Settlement / Reconciliation ─────────────────────────────── */
app.post('/api/payments/settlements', async (req, res) => {
  try {
    const { start, end } = req.body;
    const q = {
      status: 'completed',
      paidAt: { $gte: new Date(start), $lte: new Date(end) },
    };

    const [txns, refundSum] = await Promise.all([
      Transaction.find({ ...q, type: 'payment' }),
      Transaction.aggregate([
        { $match: { ...q, type: { $in: ['refund', 'partial-refund'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalAmount = txns.reduce((s, t) => s + t.amount, 0);
    const totalRefunds = refundSum[0]?.total || 0;
    const c = await Settlement.countDocuments();

    const settlement = await Settlement.create({
      settlementId: `STL-${dayjs().format('YYYYMMDD')}-${String(c + 1).padStart(4, '0')}`,
      period: { start: new Date(start), end: new Date(end) },
      totalTransactions: txns.length,
      totalAmount,
      totalRefunds,
      netAmount: totalAmount - totalRefunds,
      status: 'reconciled',
      transactions: txns.map(t => t.txnId),
    });

    res.status(201).json(settlement);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/payments/settlements', async (_req, res) => {
  try {
    res.json(await Settlement.find().sort('-generatedAt').limit(50));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Dashboard ───────────────────────────────────────────────── */
app.get('/api/payments/dashboard', async (req, res) => {
  try {
    const cached = await redis.get('payment:dashboard');
    if (cached) return res.json(JSON.parse(cached));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalInvoices,
      overdueInvoices,
      totalTransactions,
      todayTransactions,
      monthlyRevenue,
      pendingAmount,
      methodBreakdown,
      statusBreakdown,
      recentTxns,
      activeRecurring,
    ] = await Promise.all([
      Invoice.countDocuments(),
      Invoice.countDocuments({ status: 'overdue' }),
      Transaction.countDocuments(),
      Transaction.countDocuments({ createdAt: { $gte: todayStart } }),
      Transaction.aggregate([
        { $match: { status: 'completed', type: 'payment', paidAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Invoice.aggregate([
        { $match: { status: { $in: ['sent', 'partial', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$balance' } } },
      ]),
      Transaction.aggregate([
        { $match: { status: 'completed', type: 'payment' } },
        { $group: { _id: '$method', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
        { $sort: { amount: -1 } },
      ]),
      Invoice.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Transaction.find().sort('-createdAt').limit(10).select('txnId amount method status paidAt createdAt'),
      RecurringSchedule.countDocuments({ isActive: true }),
    ]);

    const data = {
      totalInvoices,
      overdueInvoices,
      totalTransactions,
      todayTransactions,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      pendingAmount: pendingAmount[0]?.total || 0,
      activeRecurring,
      methodBreakdown: methodBreakdown.reduce((a, c) => ({ ...a, [c._id]: { count: c.count, amount: c.amount } }), {}),
      invoiceStatusBreakdown: statusBreakdown.reduce((a, c) => ({ ...a, [c._id]: c.count }), {}),
      recentTransactions: recentTxns,
      currency: 'SAR',
      timestamp: new Date().toISOString(),
    };

    await redis.setex('payment:dashboard', 30, JSON.stringify(data));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ─── Cron ────────────────────────────────────────────────────── */
// Mark overdue invoices
cron.schedule('0 8 * * *', async () => {
  try {
    const r = await Invoice.updateMany({ status: { $in: ['sent', 'partial'] }, dueDate: { $lt: new Date() } }, { status: 'overdue' });
    if (r.modifiedCount) console.log(`⚠️ Marked ${r.modifiedCount} invoices as overdue`);
  } catch (e) {
    console.error('Overdue cron error:', e.message);
  }
});

// Process recurring invoices
cron.schedule('0 6 * * *', async () => {
  try {
    await paymentQueue.add('recurring', { type: 'generate-recurring' });
    console.log('🔁 Recurring invoice generation queued');
  } catch (e) {
    console.error('Recurring cron error:', e.message);
  }
});

/* ─── Seed ────────────────────────────────────────────────────── */
async function seedPaymentData() {
  const count = await Invoice.countDocuments();
  if (count > 0) return;

  const students = ['STD-001', 'STD-002', 'STD-003', 'STD-004', 'STD-005'];
  const invoices = [];
  const types = ['tuition', 'transport', 'books', 'meals', 'activities'];
  const statuses = ['paid', 'sent', 'partial', 'overdue', 'draft'];

  for (let i = 0; i < students.length; i++) {
    invoices.push({
      studentId: students[i],
      parentId: `PAR-${String(i + 1).padStart(3, '0')}`,
      type: types[i],
      items: [
        {
          descriptionAr:
            types[i] === 'tuition'
              ? 'رسوم دراسية'
              : types[i] === 'transport'
                ? 'رسوم النقل'
                : types[i] === 'books'
                  ? 'رسوم الكتب'
                  : types[i] === 'meals'
                    ? 'رسوم الوجبات'
                    : 'رسوم الأنشطة',
          description: types[i],
          quantity: 1,
          unitPrice: [5000, 1500, 800, 1200, 2000][i],
          taxRate: 0.15,
        },
      ],
      total: [5750, 1725, 920, 1380, 2300][i],
      status: statuses[i],
      paidAmount: statuses[i] === 'paid' ? [5750, 1725, 920, 1380, 2300][i] : statuses[i] === 'partial' ? 500 : 0,
      dueDate: dayjs()
        .add(statuses[i] === 'overdue' ? -10 : 30, 'day')
        .toDate(),
      academicYear: '2025-2026',
      term: 'الفصل الأول',
    });
  }
  await Invoice.insertMany(invoices);
  console.log(`🌱 Seeded ${invoices.length} sample invoices`);
}

/* ─── Start ───────────────────────────────────────────────────── */
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected — alawael_payments');
    await seedPaymentData();
    app.listen(PORT, () => console.log(`💳 Payment Gateway running → http://localhost:${PORT}`));
  })
  .catch(e => {
    console.error('❌ MongoDB error:', e.message);
    process.exit(1);
  });

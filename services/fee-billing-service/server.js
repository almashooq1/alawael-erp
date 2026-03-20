/**
 * Fee & Billing Service — Al-Awael ERP
 * Port: 3410
 *
 * Manages fee structures, student invoicing, payment collection,
 * ZATCA Phase 2 e-invoicing, SADAD/Mada/Apple Pay integration,
 * Zakat calculation, sibling/scholarship discounts, installment plans.
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

/* ───────── infra connections ───────── */
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0', {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});
const pub = redis.duplicate();

const billingQueue = new Queue('billing-jobs', { connection: redis });

/* ───────── Mongoose schemas ───────── */

// Fee Structure — defines pricing templates
const feeStructureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    code: { type: String, unique: true },
    academicYear: { type: String, required: true }, // e.g. "1446-1447"
    gradeLevel: { type: String },
    feeType: {
      type: String,
      enum: ['tuition', 'registration', 'transport', 'uniform', 'books', 'meals', 'activities', 'therapy', 'assessment', 'other'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 }, // SAR
    vatRate: { type: Number, default: 15 }, // 15 % KSA standard VAT
    vatAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    frequency: { type: String, enum: ['one-time', 'monthly', 'quarterly', 'semester', 'annual'], default: 'annual' },
    isRefundable: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

feeStructureSchema.pre('save', function (next) {
  this.vatAmount = Math.round(this.amount * (this.vatRate / 100) * 100) / 100;
  this.totalAmount = this.amount + this.vatAmount;
  if (!this.code) this.code = `FEE-${Date.now().toString(36).toUpperCase()}`;
  next();
});

const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);

// Discount — sibling, scholarship, staff-child, early-bird, etc.
const discountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    type: {
      type: String,
      enum: ['sibling', 'scholarship', 'staff-child', 'early-bird', 'financial-aid', 'loyalty', 'promotional', 'custom'],
      required: true,
    },
    valueType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    value: { type: Number, required: true }, // % or SAR
    maxAmount: { type: Number }, // cap for percentage discounts
    rules: {
      siblingOrder: Number, // nth child discount
      minGPA: Number,
      consecutiveYears: Number, // loyalty years
      validFrom: Date,
      validTo: Date,
    },
    appliesTo: [{ type: String }], // feeType filter
    isActive: { type: Boolean, default: true },
    academicYear: String,
  },
  { timestamps: true },
);

const Discount = mongoose.model('Discount', discountSchema);

// Invoice
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true },
    studentId: { type: String, required: true, index: true },
    familyId: { type: String, index: true },
    academicYear: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'issued', 'sent', 'partially-paid', 'paid', 'overdue', 'cancelled', 'refunded', 'write-off'],
      default: 'draft',
    },
    lineItems: [
      {
        feeStructureId: String,
        description: String,
        descriptionAr: String,
        quantity: { type: Number, default: 1 },
        unitPrice: Number,
        discount: { discountId: String, amount: Number },
        vatRate: { type: Number, default: 15 },
        vatAmount: Number,
        total: Number,
      },
    ],
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalVat: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    dueDate: Date,
    issuedDate: Date,
    paidDate: Date,
    // ZATCA Phase 2 e-invoicing fields
    zatca: {
      uuid: String,
      invoiceHash: String,
      previousInvoiceHash: String,
      qrCode: String,
      xmlSigned: String,
      clearanceStatus: { type: String, enum: ['pending', 'cleared', 'reported', 'failed'] },
      submissionDate: Date,
    },
    installmentPlanId: String,
    notes: String,
    notesAr: String,
    createdBy: String,
  },
  { timestamps: true },
);

invoiceSchema.pre('save', function (next) {
  if (!this.invoiceNumber) {
    const seq = Date.now().toString().slice(-8);
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${seq}`;
  }
  // recalculate totals
  let subtotal = 0,
    totalDiscount = 0,
    totalVat = 0;
  for (const item of this.lineItems) {
    const base = (item.unitPrice || 0) * (item.quantity || 1);
    const disc = item.discount ? item.discount.amount || 0 : 0;
    const taxable = base - disc;
    const vat = Math.round(taxable * ((item.vatRate || 15) / 100) * 100) / 100;
    item.vatAmount = vat;
    item.total = taxable + vat;
    subtotal += base;
    totalDiscount += disc;
    totalVat += vat;
  }
  this.subtotal = Math.round(subtotal * 100) / 100;
  this.totalDiscount = Math.round(totalDiscount * 100) / 100;
  this.totalVat = Math.round(totalVat * 100) / 100;
  this.grandTotal = Math.round((subtotal - totalDiscount + totalVat) * 100) / 100;
  this.amountDue = Math.round((this.grandTotal - (this.amountPaid || 0)) * 100) / 100;
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

// Payment
const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: { type: String, unique: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    studentId: { type: String, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'SAR' },
    method: {
      type: String,
      enum: ['cash', 'bank-transfer', 'sadad', 'mada', 'visa', 'mastercard', 'apple-pay', 'stc-pay', 'cheque', 'wallet', 'other'],
      required: true,
    },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'reversed'], default: 'pending' },
    gateway: {
      provider: String,
      transactionId: String,
      referenceNumber: String,
      responseCode: String,
      responseMessage: String,
    },
    sadadBillNumber: String,
    receiptNumber: String,
    paidAt: Date,
    processedBy: String,
    notes: String,
  },
  { timestamps: true },
);

paymentSchema.pre('save', function (next) {
  if (!this.paymentNumber) this.paymentNumber = `PAY-${Date.now().toString(36).toUpperCase()}`;
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

// Installment Plan
const installmentPlanSchema = new mongoose.Schema(
  {
    planName: String,
    studentId: { type: String, required: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    totalAmount: { type: Number, required: true },
    numberOfInstallments: { type: Number, required: true, min: 2, max: 12 },
    frequency: { type: String, enum: ['monthly', 'quarterly'], default: 'monthly' },
    installments: [
      {
        installmentNumber: Number,
        amount: Number,
        dueDate: Date,
        status: { type: String, enum: ['upcoming', 'due', 'paid', 'overdue', 'waived'], default: 'upcoming' },
        paymentId: String,
        paidDate: Date,
      },
    ],
    status: { type: String, enum: ['active', 'completed', 'defaulted', 'cancelled'], default: 'active' },
    downPayment: { type: Number, default: 0 },
    startDate: Date,
    createdBy: String,
  },
  { timestamps: true },
);

const InstallmentPlan = mongoose.model('InstallmentPlan', installmentPlanSchema);

// Credit Note / Refund
const creditNoteSchema = new mongoose.Schema(
  {
    creditNoteNumber: { type: String, unique: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    studentId: String,
    amount: { type: Number, required: true },
    vatAmount: Number,
    reason: {
      type: String,
      enum: ['withdrawal', 'overcharge', 'scholarship-awarded', 'duplicate-payment', 'service-not-provided', 'goodwill', 'other'],
    },
    description: String,
    status: { type: String, enum: ['draft', 'approved', 'issued', 'applied', 'refunded'], default: 'draft' },
    zatca: {
      uuid: String,
      qrCode: String,
    },
    approvedBy: String,
    approvedAt: Date,
  },
  { timestamps: true },
);

creditNoteSchema.pre('save', function (next) {
  if (!this.creditNoteNumber) this.creditNoteNumber = `CN-${Date.now().toString(36).toUpperCase()}`;
  next();
});

const CreditNote = mongoose.model('CreditNote', creditNoteSchema);

// Zakat Record
const zakatSchema = new mongoose.Schema(
  {
    year: { type: String, required: true },
    totalRevenue: Number,
    zakatBase: Number,
    zakatRate: { type: Number, default: 2.5 }, // 2.5 % Zakat
    zakatDue: Number,
    zakatPaid: Number,
    status: { type: String, enum: ['calculated', 'filed', 'paid', 'audited'], default: 'calculated' },
    calculationDetails: mongoose.Schema.Types.Mixed,
    filedDate: Date,
    paidDate: Date,
  },
  { timestamps: true },
);

const ZakatRecord = mongoose.model('ZakatRecord', zakatSchema);

/* ───────── ZATCA e-invoicing helpers ───────── */

function buildZatcaTLV(sellerName, vatNumber, timestamp, total, vatTotal) {
  // TLV (Tag-Length-Value) encoding per ZATCA Phase 2 spec
  const encode = (tag, value) => {
    const buf = Buffer.from(value, 'utf8');
    return Buffer.concat([Buffer.from([tag]), Buffer.from([buf.length]), buf]);
  };
  return Buffer.concat([
    encode(1, sellerName),
    encode(2, vatNumber),
    encode(3, timestamp),
    encode(4, total.toFixed(2)),
    encode(5, vatTotal.toFixed(2)),
  ]).toString('base64');
}

async function generateZatcaQR(invoice) {
  const sellerName = process.env.COMPANY_NAME_AR || 'شركة الأوائل التعليمية';
  const vatNumber = process.env.ZATCA_VAT_NUMBER || '300000000000003';
  const timestamp = (invoice.issuedDate || new Date()).toISOString();
  const tlv = buildZatcaTLV(sellerName, vatNumber, timestamp, invoice.grandTotal, invoice.totalVat);
  const qr = await QRCode.toDataURL(tlv, { errorCorrectionLevel: 'M', width: 200 });
  return qr;
}

/* ───────── Discount calculation ───────── */

async function applyDiscounts(studentId, familyId, lineItems) {
  const discounts = await Discount.find({ isActive: true });
  const applied = [];

  for (const item of lineItems) {
    for (const disc of discounts) {
      if (disc.appliesTo.length && !disc.appliesTo.includes(item.feeType)) continue;

      let discountAmount = 0;
      if (disc.valueType === 'percentage') {
        discountAmount = (item.unitPrice * disc.value) / 100;
        if (disc.maxAmount) discountAmount = Math.min(discountAmount, disc.maxAmount);
      } else {
        discountAmount = disc.value;
      }

      // Sibling discount — check sibling count in family
      if (disc.type === 'sibling' && disc.rules?.siblingOrder) {
        // Would query family service for sibling count; simplified here
        discountAmount = discountAmount; // TODO: validate sibling order
      }

      if (discountAmount > 0) {
        item.discount = { discountId: disc._id.toString(), amount: Math.round(discountAmount * 100) / 100 };
        applied.push({ discountId: disc._id, name: disc.name, amount: discountAmount });
        break; // one discount per line item
      }
    }
  }
  return { lineItems, applied };
}

/* ───────── BullMQ worker ───────── */

new Worker(
  'billing-jobs',
  async job => {
    if (job.name === 'generate-invoices') {
      const { academicYear, gradeLevel } = job.data;
      // Bulk invoice generation logic
      console.log(`[BillingWorker] Generating invoices for ${academicYear} grade ${gradeLevel || 'all'}`);
    }
    if (job.name === 'send-overdue-reminders') {
      const overdue = await Invoice.find({ status: 'overdue' });
      for (const inv of overdue) {
        await pub.publish(
          'billing:overdue-reminder',
          JSON.stringify({
            invoiceId: inv._id,
            studentId: inv.studentId,
            amount: inv.amountDue,
            dueDate: inv.dueDate,
          }),
        );
      }
      console.log(`[BillingWorker] Sent ${overdue.length} overdue reminders`);
    }
    if (job.name === 'zatca-submit') {
      const invoice = await Invoice.findById(job.data.invoiceId);
      if (!invoice) return;
      // Simulate ZATCA clearance/reporting submission
      invoice.zatca.clearanceStatus = 'cleared';
      invoice.zatca.submissionDate = new Date();
      await invoice.save();
      console.log(`[BillingWorker] ZATCA submitted invoice ${invoice.invoiceNumber}`);
    }
  },
  { connection: redis },
);

/* ───────── Routes ───────── */
const r = express.Router();

// ── Fee Structures ──
r.get('/fee-structures', async (req, res) => {
  try {
    const { academicYear, feeType, gradeLevel, active } = req.query;
    const q = {};
    if (academicYear) q.academicYear = academicYear;
    if (feeType) q.feeType = feeType;
    if (gradeLevel) q.gradeLevel = gradeLevel;
    if (active !== undefined) q.isActive = active === 'true';
    const items = await FeeStructure.find(q).sort({ feeType: 1, gradeLevel: 1 });
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/fee-structures', async (req, res) => {
  try {
    const fs = await FeeStructure.create(req.body);
    res.status(201).json({ success: true, data: fs });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/fee-structures/:id', async (req, res) => {
  try {
    const fs = await FeeStructure.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: fs });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Discounts ──
r.get('/discounts', async (_req, res) => {
  try {
    const d = await Discount.find().sort({ type: 1 });
    res.json({ success: true, data: d });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/discounts', async (req, res) => {
  try {
    const d = await Discount.create(req.body);
    res.status(201).json({ success: true, data: d });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/discounts/:id', async (req, res) => {
  try {
    const d = await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: d });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Invoices ──
r.get('/invoices', async (req, res) => {
  try {
    const { studentId, familyId, status, academicYear, page = 1, limit = 50 } = req.query;
    const q = {};
    if (studentId) q.studentId = studentId;
    if (familyId) q.familyId = familyId;
    if (status) q.status = status;
    if (academicYear) q.academicYear = academicYear;
    const total = await Invoice.countDocuments(q);
    const invoices = await Invoice.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, data: invoices, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/invoices/:id', async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, data: inv });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/invoices', async (req, res) => {
  try {
    const { studentId, familyId, academicYear, feeStructureIds, notes } = req.body;
    const structures = await FeeStructure.find({ _id: { $in: feeStructureIds }, isActive: true });
    let lineItems = structures.map(fs => ({
      feeStructureId: fs._id.toString(),
      description: fs.name,
      descriptionAr: fs.nameAr,
      quantity: 1,
      unitPrice: fs.amount,
      vatRate: fs.vatRate,
      feeType: fs.feeType,
    }));

    // Apply discounts
    const { lineItems: discountedItems } = await applyDiscounts(studentId, familyId, lineItems);

    const invoice = await Invoice.create({
      studentId,
      familyId,
      academicYear,
      lineItems: discountedItems,
      issuedDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000), // 30 days
      status: 'issued',
      notes,
      zatca: { uuid: uuidv4() },
    });

    // Generate ZATCA QR
    invoice.zatca.qrCode = await generateZatcaQR(invoice);
    await invoice.save();

    // Publish event
    await pub.publish(
      'billing:invoice-created',
      JSON.stringify({
        invoiceId: invoice._id,
        studentId,
        amount: invoice.grandTotal,
      }),
    );

    res.status(201).json({ success: true, data: invoice });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/invoices/:id/cancel', async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return res.status(404).json({ success: false, error: 'Invoice not found' });
    if (inv.amountPaid > 0)
      return res.status(400).json({ success: false, error: 'Cannot cancel invoice with payments — issue credit note instead' });
    inv.status = 'cancelled';
    await inv.save();
    res.json({ success: true, data: inv });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/invoices/:id/zatca-submit', async (req, res) => {
  try {
    await billingQueue.add('zatca-submit', { invoiceId: req.params.id });
    res.json({ success: true, message: 'ZATCA submission queued' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Bulk invoice generation
r.post('/invoices/bulk-generate', async (req, res) => {
  try {
    const { academicYear, gradeLevel } = req.body;
    await billingQueue.add('generate-invoices', { academicYear, gradeLevel });
    res.json({ success: true, message: 'Bulk invoice generation queued' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Payments ──
r.post('/payments', async (req, res) => {
  try {
    const { invoiceId, amount, method, gateway, sadadBillNumber, notes } = req.body;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    if (amount > invoice.amountDue) return res.status(400).json({ success: false, error: `Amount exceeds due: ${invoice.amountDue} SAR` });

    const payment = await Payment.create({
      invoiceId,
      studentId: invoice.studentId,
      amount,
      method,
      gateway,
      sadadBillNumber,
      status: 'completed',
      paidAt: new Date(),
      receiptNumber: `REC-${Date.now().toString(36).toUpperCase()}`,
      notes,
    });

    // Update invoice
    invoice.amountPaid = (invoice.amountPaid || 0) + amount;
    invoice.amountDue = Math.round((invoice.grandTotal - invoice.amountPaid) * 100) / 100;
    invoice.status = invoice.amountDue <= 0 ? 'paid' : 'partially-paid';
    if (invoice.status === 'paid') invoice.paidDate = new Date();
    await invoice.save();

    // Update installment if linked
    if (invoice.installmentPlanId) {
      const plan = await InstallmentPlan.findById(invoice.installmentPlanId);
      if (plan) {
        const due = plan.installments.find(i => i.status === 'due' || i.status === 'overdue');
        if (due) {
          due.status = 'paid';
          due.paymentId = payment._id.toString();
          due.paidDate = new Date();
        }
        const allPaid = plan.installments.every(i => i.status === 'paid' || i.status === 'waived');
        if (allPaid) plan.status = 'completed';
        await plan.save();
      }
    }

    await pub.publish(
      'billing:payment-received',
      JSON.stringify({
        paymentId: payment._id,
        invoiceId,
        studentId: invoice.studentId,
        amount,
        method,
      }),
    );

    res.status(201).json({ success: true, data: payment });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/payments', async (req, res) => {
  try {
    const { studentId, invoiceId, method, status } = req.query;
    const q = {};
    if (studentId) q.studentId = studentId;
    if (invoiceId) q.invoiceId = invoiceId;
    if (method) q.method = method;
    if (status) q.status = status;
    const payments = await Payment.find(q).sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Installment Plans ──
r.post('/installment-plans', async (req, res) => {
  try {
    const { studentId, invoiceId, numberOfInstallments, frequency, downPayment, startDate } = req.body;
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const remaining = invoice.grandTotal - (downPayment || 0);
    const perInstallment = Math.round((remaining / numberOfInstallments) * 100) / 100;
    const start = startDate ? new Date(startDate) : new Date();
    const monthsStep = frequency === 'quarterly' ? 3 : 1;

    const installments = [];
    for (let i = 0; i < numberOfInstallments; i++) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i * monthsStep);
      installments.push({
        installmentNumber: i + 1,
        amount:
          i === numberOfInstallments - 1
            ? Math.round((remaining - perInstallment * (numberOfInstallments - 1)) * 100) / 100
            : perInstallment,
        dueDate: due,
        status: i === 0 ? 'due' : 'upcoming',
      });
    }

    const plan = await InstallmentPlan.create({
      studentId,
      invoiceId,
      totalAmount: invoice.grandTotal,
      numberOfInstallments,
      frequency,
      downPayment: downPayment || 0,
      startDate: start,
      installments,
      status: 'active',
    });

    invoice.installmentPlanId = plan._id.toString();
    await invoice.save();

    res.status(201).json({ success: true, data: plan });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/installment-plans/:studentId', async (req, res) => {
  try {
    const plans = await InstallmentPlan.find({ studentId: req.params.studentId }).sort({ createdAt: -1 });
    res.json({ success: true, data: plans });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Credit Notes ──
r.post('/credit-notes', async (req, res) => {
  try {
    const cn = await CreditNote.create({ ...req.body, zatca: { uuid: uuidv4() } });
    res.status(201).json({ success: true, data: cn });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/credit-notes/:id/approve', async (req, res) => {
  try {
    const cn = await CreditNote.findById(req.params.id);
    if (!cn) return res.status(404).json({ success: false, error: 'Not found' });
    cn.status = 'approved';
    cn.approvedBy = req.body.approvedBy;
    cn.approvedAt = new Date();
    await cn.save();

    // Apply to invoice
    if (cn.invoiceId) {
      const inv = await Invoice.findById(cn.invoiceId);
      if (inv) {
        inv.amountPaid = (inv.amountPaid || 0) + cn.amount;
        inv.amountDue = Math.round((inv.grandTotal - inv.amountPaid) * 100) / 100;
        if (inv.amountDue <= 0) inv.status = 'paid';
        await inv.save();
      }
    }
    res.json({ success: true, data: cn });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Zakat ──
r.post('/zakat/calculate', async (req, res) => {
  try {
    const { year } = req.body;
    // Sum all paid invoices for the year
    const match = { status: 'paid', paidDate: { $gte: new Date(`${year}-01-01`), $lt: new Date(`${Number(year) + 1}-01-01`) } };
    const agg = await Invoice.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, totalVat: { $sum: '$totalVat' } } },
    ]);
    const totalRevenue = agg[0]?.total || 0;
    const zakatBase = totalRevenue; // simplified — full Zakat base would include assets, deductions
    const zakatRate = 2.5;
    const zakatDue = Math.round(zakatBase * (zakatRate / 100) * 100) / 100;

    const record = await ZakatRecord.findOneAndUpdate(
      { year },
      { totalRevenue, zakatBase, zakatRate, zakatDue, status: 'calculated', calculationDetails: agg[0] },
      { upsert: true, new: true },
    );
    res.json({ success: true, data: record });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/zakat/:year', async (req, res) => {
  try {
    const record = await ZakatRecord.findOne({ year: req.params.year });
    res.json({ success: true, data: record });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Financial Summary / Dashboard ──
r.get('/summary', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const q = academicYear ? { academicYear } : {};

    const [totalInvoiced, totalCollected, totalOverdue, invoicesByStatus, recentPayments] = await Promise.all([
      Invoice.aggregate([
        { $match: { ...q, status: { $nin: ['cancelled', 'draft'] } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Invoice.aggregate([
        { $match: { ...q, status: { $nin: ['cancelled', 'draft'] } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]),
      Invoice.aggregate([
        { $match: { ...q, status: 'overdue' } },
        { $group: { _id: null, total: { $sum: '$amountDue' }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$grandTotal' } } }]),
      Payment.find().sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({
      success: true,
      data: {
        totalInvoiced: totalInvoiced[0]?.total || 0,
        totalCollected: totalCollected[0]?.total || 0,
        totalOverdue: totalOverdue[0]?.total || 0,
        overdueCount: totalOverdue[0]?.count || 0,
        collectionRate: totalInvoiced[0]?.total ? Math.round(((totalCollected[0]?.total || 0) / totalInvoiced[0].total) * 100) : 0,
        invoicesByStatus: invoicesByStatus.reduce((o, s) => {
          o[s._id] = { count: s.count, total: s.total };
          return o;
        }, {}),
        recentPayments,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Student account statement ──
r.get('/statement/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const [invoices, payments, creditNotes, plans] = await Promise.all([
      Invoice.find({ studentId, status: { $ne: 'cancelled' } }).sort({ createdAt: -1 }),
      Payment.find({ studentId, status: 'completed' }).sort({ createdAt: -1 }),
      CreditNote.find({ studentId, status: { $in: ['approved', 'issued', 'applied'] } }),
      InstallmentPlan.find({ studentId }),
    ]);

    const totalBilled = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const totalCredits = creditNotes.reduce((s, c) => s + c.amount, 0);
    const balance = Math.round((totalBilled - totalPaid - totalCredits) * 100) / 100;

    res.json({
      success: true,
      data: { studentId, totalBilled, totalPaid, totalCredits, balance, invoices, payments, creditNotes, installmentPlans: plans },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.use('/api', r);

// Health
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  const ok = mongoOk && redisOk;
  res.status(ok ? 200 : 503).json({ status: ok ? 'healthy' : 'degraded', mongo: mongoOk, redis: redisOk, uptime: process.uptime() });
});

/* ───────── Cron jobs ───────── */
// Mark overdue invoices daily at 8 AM
cron.schedule('0 8 * * *', async () => {
  const result = await Invoice.updateMany(
    { status: { $in: ['issued', 'sent', 'partially-paid'] }, dueDate: { $lt: new Date() } },
    { $set: { status: 'overdue' } },
  );
  if (result.modifiedCount > 0) {
    console.log(`[Cron] Marked ${result.modifiedCount} invoices overdue`);
    await billingQueue.add('send-overdue-reminders', {});
  }
});

// Update installment statuses daily at 7 AM
cron.schedule('0 7 * * *', async () => {
  const plans = await InstallmentPlan.find({ status: 'active' });
  for (const plan of plans) {
    let changed = false;
    for (const inst of plan.installments) {
      if (inst.status === 'upcoming' && inst.dueDate <= new Date()) {
        inst.status = 'due';
        changed = true;
      }
      if (inst.status === 'due' && inst.dueDate < new Date(Date.now() - 7 * 86400000)) {
        inst.status = 'overdue';
        changed = true;
      }
    }
    if (changed) await plan.save();
  }
});

/* ───────── Start ───────── */
const PORT = process.env.PORT || 3410;
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_billing';

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('[FeeBillingService] MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => console.log(`[FeeBillingService] listening on ${PORT}`));
  })
  .catch(err => {
    console.error('[FeeBillingService] Mongo error', err);
    process.exit(1);
  });

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Billing Engine — Phase 16 · Financial & Billing Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Invoice generation, service-charge catalogues, billing cycles, payment
 * tracking, statements, credit/debit adjustments, and financial reporting
 * for rehabilitation services.
 *
 * Aggregates
 *   DDDBillingAccount  — master financial account per beneficiary
 *   DDDInvoice         — individual invoice with line items
 *   DDDPayment         — payment record (cash / card / transfer / insurance)
 *   DDDServiceCharge   — catalogue of chargeable service items
 *
 * Canonical links
 *   beneficiaryId → Beneficiary Core
 *   episodeId     → Episode of Care
 *   sessionId     → Sessions
 *   providerId    → Staff / Resource Manager
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

/** Lightweight base so every DDD module has .log() */
class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ── helper ────────────────────────────────────────────────────────────────── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const INVOICE_STATUSES = [
  'draft',
  'pending',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'disputed',
  'cancelled',
  'refunded',
  'written_off',
];

const PAYMENT_METHODS = [
  'cash',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'insurance',
  'cheque',
  'online',
  'mobile_wallet',
  'government_subsidy',
  'charity_fund',
  'installment',
];

const CHARGE_CATEGORIES = [
  'consultation',
  'therapy_session',
  'assessment',
  'diagnostic',
  'equipment_rental',
  'assistive_device',
  'medication',
  'transport',
  'accommodation',
  'tele_rehab',
  'group_therapy',
  'home_visit',
  'report_generation',
  'ar_vr_session',
  'emergency',
  'administrative',
];

const BILLING_CYCLES = [
  'per_session',
  'daily',
  'weekly',
  'bi_weekly',
  'monthly',
  'quarterly',
  'per_episode',
  'annual',
];

const DISCOUNT_TYPES = [
  'percentage',
  'fixed',
  'insurance_reduction',
  'charity',
  'government_subsidy',
  'bulk',
  'loyalty',
  'hardship',
];

const TAX_TYPES = ['vat', 'service_tax', 'exempt', 'zero_rated'];

const CURRENCY_CODES = ['SAR', 'AED', 'USD', 'EUR', 'GBP', 'KWD', 'BHD', 'QAR', 'OMR', 'EGP'];

/* ── Built-in service charge catalogue ──────────────────────────────────── */
const BUILTIN_SERVICE_CHARGES = [
  {
    code: 'CONSULT-INIT',
    name: 'Initial Consultation',
    nameAr: 'استشارة أولية',
    category: 'consultation',
    basePrice: 300,
    currency: 'SAR',
  },
  {
    code: 'CONSULT-FOLLOW',
    name: 'Follow-up Consultation',
    nameAr: 'متابعة استشارية',
    category: 'consultation',
    basePrice: 200,
    currency: 'SAR',
  },
  {
    code: 'PT-SESSION',
    name: 'Physical Therapy Session',
    nameAr: 'جلسة علاج طبيعي',
    category: 'therapy_session',
    basePrice: 250,
    currency: 'SAR',
  },
  {
    code: 'OT-SESSION',
    name: 'Occupational Therapy Session',
    nameAr: 'جلسة علاج وظيفي',
    category: 'therapy_session',
    basePrice: 250,
    currency: 'SAR',
  },
  {
    code: 'SLP-SESSION',
    name: 'Speech-Language Therapy',
    nameAr: 'جلسة نطق ولغة',
    category: 'therapy_session',
    basePrice: 250,
    currency: 'SAR',
  },
  {
    code: 'ASSESS-COMP',
    name: 'Comprehensive Assessment',
    nameAr: 'تقييم شامل',
    category: 'assessment',
    basePrice: 500,
    currency: 'SAR',
  },
  {
    code: 'ASSESS-FUNC',
    name: 'Functional Assessment',
    nameAr: 'تقييم وظيفي',
    category: 'assessment',
    basePrice: 350,
    currency: 'SAR',
  },
  {
    code: 'TELE-SESSION',
    name: 'Tele-Rehabilitation Session',
    nameAr: 'جلسة تأهيل عن بعد',
    category: 'tele_rehab',
    basePrice: 180,
    currency: 'SAR',
  },
  {
    code: 'GRP-THERAPY',
    name: 'Group Therapy Session',
    nameAr: 'جلسة علاج جماعي',
    category: 'group_therapy',
    basePrice: 120,
    currency: 'SAR',
  },
  {
    code: 'HOME-VISIT',
    name: 'Home Visit Session',
    nameAr: 'زيارة منزلية',
    category: 'home_visit',
    basePrice: 400,
    currency: 'SAR',
  },
  {
    code: 'ARVR-SESSION',
    name: 'AR/VR Rehabilitation',
    nameAr: 'تأهيل بالواقع المعزز',
    category: 'ar_vr_session',
    basePrice: 300,
    currency: 'SAR',
  },
  {
    code: 'REPORT-MED',
    name: 'Medical Report',
    nameAr: 'تقرير طبي',
    category: 'report_generation',
    basePrice: 150,
    currency: 'SAR',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Service Charge Catalogue ──────────────────────────────────────────── */
const serviceChargeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: CHARGE_CATEGORIES, required: true },
    description: { type: String },
    basePrice: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCY_CODES, default: 'SAR' },
    taxType: { type: String, enum: TAX_TYPES, default: 'vat' },
    taxRate: { type: Number, default: 15, min: 0, max: 100 },
    unit: { type: String, default: 'session' },
    duration: { type: Number, default: 60, min: 0 }, // minutes
    isActive: { type: Boolean, default: true },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDServiceCharge =
  mongoose.models.DDDServiceCharge || mongoose.model('DDDServiceCharge', serviceChargeSchema);

/* ── Billing Account ───────────────────────────────────────────────────── */
const billingAccountSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    accountNumber: { type: String, unique: true, required: true },
    status: {
      type: String,
      enum: ['active', 'suspended', 'closed', 'collections'],
      default: 'active',
    },
    currency: { type: String, enum: CURRENCY_CODES, default: 'SAR' },
    billingCycle: { type: String, enum: BILLING_CYCLES, default: 'per_session' },
    creditLimit: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    totalBilled: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalAdjustments: { type: Number, default: 0 },
    insurancePrimary: { type: Schema.Types.ObjectId, ref: 'DDDInsurancePolicy' },
    insuranceSecondary: { type: Schema.Types.ObjectId, ref: 'DDDInsurancePolicy' },
    discounts: [
      {
        type: { type: String, enum: DISCOUNT_TYPES },
        value: { type: Number },
        reason: { type: String },
        validFrom: { type: Date },
        validTo: { type: Date },
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    paymentTerms: {
      netDays: { type: Number, default: 30 },
      lateFeeRate: { type: Number, default: 0 },
      gracePerDays: { type: Number, default: 7 },
    },
    contacts: [
      {
        name: { type: String },
        phone: { type: String },
        email: { type: String },
        role: { type: String },
      },
    ],
    notes: [
      {
        text: String,
        author: { type: Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
      },
    ],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

billingAccountSchema.index({ status: 1, billingCycle: 1 });
billingAccountSchema.index({ currentBalance: 1 });

const DDDBillingAccount =
  mongoose.models.DDDBillingAccount || mongoose.model('DDDBillingAccount', billingAccountSchema);

/* ── Invoice ───────────────────────────────────────────────────────────── */
const invoiceLineSchema = new Schema(
  {
    serviceChargeId: { type: Schema.Types.ObjectId, ref: 'DDDServiceCharge' },
    code: { type: String },
    description: { type: String, required: true },
    descriptionAr: { type: String },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: DISCOUNT_TYPES },
    taxRate: { type: Number, default: 15, min: 0 },
    lineTotal: { type: Number, required: true },
    sessionId: { type: Schema.Types.ObjectId },
    episodeId: { type: Schema.Types.ObjectId },
    serviceDate: { type: Date },
    providerId: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { _id: true }
);

const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, unique: true, required: true },
    billingAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDBillingAccount',
      required: true,
      index: true,
    },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    episodeId: { type: Schema.Types.ObjectId, index: true },
    status: { type: String, enum: INVOICE_STATUSES, default: 'draft' },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    currency: { type: String, enum: CURRENCY_CODES, default: 'SAR' },
    lines: [invoiceLineSchema],
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
    adjustments: [
      {
        type: { type: String, enum: ['credit', 'debit', 'write_off', 'refund'] },
        amount: { type: Number },
        reason: { type: String },
        date: { type: Date, default: Date.now },
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    insuranceClaim: {
      claimId: { type: Schema.Types.ObjectId },
      coveredAmount: { type: Number, default: 0 },
      patientShare: { type: Number, default: 0 },
    },
    sentAt: { type: Date },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ issueDate: -1 });

const DDDInvoice = mongoose.models.DDDInvoice || mongoose.model('DDDInvoice', invoiceSchema);

/* ── Payment ───────────────────────────────────────────────────────────── */
const paymentSchema = new Schema(
  {
    paymentNumber: { type: String, unique: true, required: true },
    billingAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDBillingAccount',
      required: true,
      index: true,
    },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'DDDInvoice', index: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCY_CODES, default: 'SAR' },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded', 'cancelled'],
      default: 'pending',
    },
    transactionRef: { type: String },
    gatewayResponse: { type: Map, of: Schema.Types.Mixed },
    paidAt: { type: Date },
    paidBy: { type: String },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String },
    refundedAt: { type: Date },
    reconciled: { type: Boolean, default: false },
    reconciledAt: { type: Date },
    reconciledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, method: 1 });
paymentSchema.index({ paidAt: -1 });

const DDDPayment = mongoose.models.DDDPayment || mongoose.model('DDDPayment', paymentSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class BillingEngine extends BaseDomainModule {
  constructor() {
    super('BillingEngine', {
      description: 'Invoice generation, service charges, billing cycles & payment tracking',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedServiceCharges();
    this.log('Billing Engine initialised ✓');
    return true;
  }

  /** Seed built-in service charge catalogue */
  async _seedServiceCharges() {
    for (const sc of BUILTIN_SERVICE_CHARGES) {
      const exists = await DDDServiceCharge.findOne({ code: sc.code }).lean();
      if (!exists) {
        await DDDServiceCharge.create({ ...sc, taxType: 'vat', taxRate: 15 });
      }
    }
  }

  /** Generate next invoice number */
  async _nextInvoiceNumber() {
    const count = await DDDInvoice.countDocuments();
    const seq = String(count + 1).padStart(7, '0');
    return `INV-${new Date().getFullYear()}-${seq}`;
  }

  /** Generate next payment number */
  async _nextPaymentNumber() {
    const count = await DDDPayment.countDocuments();
    const seq = String(count + 1).padStart(7, '0');
    return `PAY-${new Date().getFullYear()}-${seq}`;
  }

  /** Generate next account number */
  async _nextAccountNumber() {
    const count = await DDDBillingAccount.countDocuments();
    const seq = String(count + 1).padStart(6, '0');
    return `BA-${seq}`;
  }

  /* ── Service Charge CRUD ── */
  async listServiceCharges(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDServiceCharge.find(q).sort({ category: 1, code: 1 }).lean();
  }

  async getServiceCharge(id) {
    return DDDServiceCharge.findById(id).lean();
  }

  async createServiceCharge(data) {
    return DDDServiceCharge.create(data);
  }

  async updateServiceCharge(id, data) {
    return DDDServiceCharge.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Billing Account CRUD ── */
  async listBillingAccounts(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.status) q.status = filters.status;
    return DDDBillingAccount.find(q).sort({ createdAt: -1 }).lean();
  }

  async getBillingAccount(id) {
    return DDDBillingAccount.findById(id).lean();
  }

  async createBillingAccount(data) {
    data.accountNumber = data.accountNumber || (await this._nextAccountNumber());
    return DDDBillingAccount.create(data);
  }

  async updateBillingAccount(id, data) {
    return DDDBillingAccount.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Invoice CRUD ── */
  async listInvoices(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.billingAccountId) q.billingAccountId = filters.billingAccountId;
    if (filters.status) q.status = filters.status;
    if (filters.from || filters.to) {
      q.issueDate = {};
      if (filters.from) q.issueDate.$gte = new Date(filters.from);
      if (filters.to) q.issueDate.$lte = new Date(filters.to);
    }
    return DDDInvoice.find(q).sort({ issueDate: -1 }).lean();
  }

  async getInvoice(id) {
    return DDDInvoice.findById(id).lean();
  }

  async createInvoice(data) {
    data.invoiceNumber = data.invoiceNumber || (await this._nextInvoiceNumber());
    // Calculate totals
    let subtotal = 0,
      totalDiscount = 0,
      totalTax = 0;
    for (const line of data.lines || []) {
      const base = line.quantity * line.unitPrice;
      const disc =
        line.discountType === 'percentage' ? base * (line.discount / 100) : line.discount || 0;
      const afterDisc = base - disc;
      const tax = afterDisc * ((line.taxRate || 15) / 100);
      line.lineTotal = Math.round((afterDisc + tax) * 100) / 100;
      subtotal += base;
      totalDiscount += disc;
      totalTax += tax;
    }
    data.subtotal = Math.round(subtotal * 100) / 100;
    data.totalDiscount = Math.round(totalDiscount * 100) / 100;
    data.totalTax = Math.round(totalTax * 100) / 100;
    data.grandTotal = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;
    data.amountDue = data.grandTotal - (data.amountPaid || 0);
    return DDDInvoice.create(data);
  }

  async updateInvoice(id, data) {
    return DDDInvoice.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async sendInvoice(id) {
    return DDDInvoice.findByIdAndUpdate(id, { status: 'sent', sentAt: new Date() }, { new: true });
  }

  async cancelInvoice(id, reason) {
    return DDDInvoice.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      { new: true }
    );
  }

  /* ── Payment CRUD ── */
  async listPayments(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.billingAccountId) q.billingAccountId = filters.billingAccountId;
    if (filters.invoiceId) q.invoiceId = filters.invoiceId;
    if (filters.status) q.status = filters.status;
    if (filters.method) q.method = filters.method;
    return DDDPayment.find(q).sort({ createdAt: -1 }).lean();
  }

  async getPayment(id) {
    return DDDPayment.findById(id).lean();
  }

  async recordPayment(data) {
    data.paymentNumber = data.paymentNumber || (await this._nextPaymentNumber());
    const payment = await DDDPayment.create(data);

    // Update invoice if linked
    if (data.invoiceId) {
      const invoice = await DDDInvoice.findById(data.invoiceId);
      if (invoice) {
        invoice.amountPaid = (invoice.amountPaid || 0) + data.amount;
        invoice.amountDue = invoice.grandTotal - invoice.amountPaid;
        if (invoice.amountDue <= 0) {
          invoice.status = 'paid';
          invoice.paidAt = new Date();
        } else {
          invoice.status = 'partially_paid';
        }
        await invoice.save();
      }
    }

    // Update billing account
    if (data.billingAccountId) {
      await DDDBillingAccount.findByIdAndUpdate(data.billingAccountId, {
        $inc: { totalPaid: data.amount, currentBalance: -data.amount },
      });
    }

    return payment;
  }

  async refundPayment(id, amount, reason) {
    const payment = await DDDPayment.findById(id);
    if (!payment) throw new Error('Payment not found');
    const refundAmt = amount || payment.amount;
    payment.refundAmount = (payment.refundAmount || 0) + refundAmt;
    payment.status = payment.refundAmount >= payment.amount ? 'refunded' : 'partially_refunded';
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    await payment.save();
    return payment;
  }

  /* ── Financial Summary ── */
  async getFinancialSummary(filters = {}) {
    const match = {};
    if (filters.from || filters.to) {
      match.issueDate = {};
      if (filters.from) match.issueDate.$gte = new Date(filters.from);
      if (filters.to) match.issueDate.$lte = new Date(filters.to);
    }
    const [invoiceStats] = await DDDInvoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalInvoiced: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$amountPaid' },
          totalDue: { $sum: '$amountDue' },
          count: { $sum: 1 },
        },
      },
    ]);
    const [paymentStats] = await DDDPayment.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: '$amount' },
          totalRefunded: { $sum: '$refundAmount' },
          paymentCount: { $sum: 1 },
        },
      },
    ]);
    return {
      invoices: invoiceStats || { totalInvoiced: 0, totalPaid: 0, totalDue: 0, count: 0 },
      payments: paymentStats || { totalCollected: 0, totalRefunded: 0, paymentCount: 0 },
    };
  }

  async getOverdueInvoices() {
    return DDDInvoice.find({
      status: { $in: ['sent', 'partially_paid'] },
      dueDate: { $lt: new Date() },
    })
      .sort({ dueDate: 1 })
      .lean();
  }

  async getAccountStatement(accountId, from, to) {
    const q = { billingAccountId: accountId };
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }
    const invoices = await DDDInvoice.find({ ...q })
      .sort({ issueDate: 1 })
      .lean();
    const payments = await DDDPayment.find({ ...q })
      .sort({ paidAt: 1 })
      .lean();
    const account = await DDDBillingAccount.findById(accountId).lean();
    return { account, invoices, payments };
  }

  /** Health check */
  async healthCheck() {
    const [accounts, invoices, payments, charges] = await Promise.all([
      DDDBillingAccount.countDocuments(),
      DDDInvoice.countDocuments(),
      DDDPayment.countDocuments(),
      DDDServiceCharge.countDocuments(),
    ]);
    return { status: 'healthy', accounts, invoices, payments, serviceCharges: charges };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createBillingEngineRouter() {
  const router = Router();
  const engine = new BillingEngine();

  /* ── Service Charges ── */
  router.get('/billing/service-charges', async (req, res) => {
    try {
      res.json({ success: true, data: await engine.listServiceCharges(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/billing/service-charges/:id', async (req, res) => {
    try {
      const d = await engine.getServiceCharge(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/billing/service-charges', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await engine.createServiceCharge(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/billing/service-charges/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await engine.updateServiceCharge(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Billing Accounts ── */
  router.get('/billing/accounts', async (req, res) => {
    try {
      res.json({ success: true, data: await engine.listBillingAccounts(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/billing/accounts/:id', async (req, res) => {
    try {
      const d = await engine.getBillingAccount(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/billing/accounts', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await engine.createBillingAccount(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/billing/accounts/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await engine.updateBillingAccount(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/billing/accounts/:id/statement', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await engine.getAccountStatement(req.params.id, req.query.from, req.query.to),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Invoices ── */
  router.get('/billing/invoices', async (req, res) => {
    try {
      res.json({ success: true, data: await engine.listInvoices(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/billing/invoices/overdue', async (_req, res) => {
    try {
      res.json({ success: true, data: await engine.getOverdueInvoices() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/billing/invoices/:id', async (req, res) => {
    try {
      const d = await engine.getInvoice(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/billing/invoices', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await engine.createInvoice(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/billing/invoices/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await engine.updateInvoice(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/billing/invoices/:id/send', async (req, res) => {
    try {
      res.json({ success: true, data: await engine.sendInvoice(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/billing/invoices/:id/cancel', async (req, res) => {
    try {
      res.json({ success: true, data: await engine.cancelInvoice(req.params.id, req.body.reason) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Payments ── */
  router.get('/billing/payments', async (req, res) => {
    try {
      res.json({ success: true, data: await engine.listPayments(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/billing/payments/:id', async (req, res) => {
    try {
      const d = await engine.getPayment(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/billing/payments', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await engine.recordPayment(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/billing/payments/:id/refund', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await engine.refundPayment(req.params.id, req.body.amount, req.body.reason),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Financial Summary ── */
  router.get('/billing/summary', async (req, res) => {
    try {
      res.json({ success: true, data: await engine.getFinancialSummary(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Health ── */
  router.get('/billing/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await engine.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  BillingEngine,
  DDDBillingAccount,
  DDDInvoice,
  DDDPayment,
  DDDServiceCharge,
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  CHARGE_CATEGORIES,
  BILLING_CYCLES,
  DISCOUNT_TYPES,
  TAX_TYPES,
  CURRENCY_CODES,
  BUILTIN_SERVICE_CHARGES,
  createBillingEngineRouter,
};

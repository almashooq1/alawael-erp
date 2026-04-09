/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Payment Gateway — Phase 16 · Financial & Billing Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Payment processing, multi-gateway integration, refund management,
 * financial reconciliation, revenue cycle analytics, and payment plan
 * management for rehabilitation services.
 *
 * Aggregates
 *   DDDPaymentGatewayConfig — gateway provider configuration
 *   DDDTransaction          — individual financial transaction record
 *   DDDPaymentPlan          — installment/payment plan for beneficiaries
 *   DDDReconciliation       — batch reconciliation records
 *
 * Canonical links
 *   beneficiaryId    → Beneficiary Core
 *   billingAccountId → DDDBillingAccount
 *   invoiceId        → DDDInvoice
 *   paymentId        → DDDPayment
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

const GATEWAY_PROVIDERS = [
  'mada',
  'visa',
  'mastercard',
  'apple_pay',
  'stc_pay',
  'sadad',
  'moyasar',
  'hyperpay',
  'tap',
  'payfort',
  'bank_transfer',
  'cash',
  'cheque',
];

const TRANSACTION_TYPES = [
  'payment',
  'refund',
  'partial_refund',
  'chargeback',
  'void',
  'capture',
  'authorization',
  'settlement',
  'adjustment',
  'fee',
  'transfer',
];

const TRANSACTION_STATUSES = [
  'initiated',
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'reversed',
  'disputed',
  'settled',
  'expired',
];

const PAYMENT_PLAN_STATUSES = [
  'draft',
  'active',
  'on_hold',
  'completed',
  'defaulted',
  'cancelled',
  'renegotiated',
];

const PAYMENT_PLAN_FREQUENCIES = [
  'weekly',
  'bi_weekly',
  'monthly',
  'bi_monthly',
  'quarterly',
  'custom',
];

const RECONCILIATION_STATUSES = [
  'pending',
  'in_progress',
  'matched',
  'discrepancy',
  'resolved',
  'completed',
];

const CURRENCY_CODES = ['SAR', 'AED', 'USD', 'EUR', 'GBP', 'KWD', 'BHD', 'QAR', 'OMR', 'EGP'];

/* ── Built-in gateway configurations ───────────────────────────────────── */
const BUILTIN_GATEWAYS = [
  {
    code: 'GW-MADA',
    name: 'Mada Payment Network',
    nameAr: 'شبكة مدى',
    provider: 'mada',
    isActive: true,
    supportedCurrencies: ['SAR'],
  },
  {
    code: 'GW-VISA',
    name: 'Visa Payment Gateway',
    nameAr: 'بوابة فيزا',
    provider: 'visa',
    isActive: true,
    supportedCurrencies: ['SAR', 'USD', 'EUR'],
  },
  {
    code: 'GW-MC',
    name: 'Mastercard Gateway',
    nameAr: 'بوابة ماستركارد',
    provider: 'mastercard',
    isActive: true,
    supportedCurrencies: ['SAR', 'USD', 'EUR'],
  },
  {
    code: 'GW-APPLE',
    name: 'Apple Pay',
    nameAr: 'أبل باي',
    provider: 'apple_pay',
    isActive: true,
    supportedCurrencies: ['SAR', 'USD'],
  },
  {
    code: 'GW-STC',
    name: 'STC Pay',
    nameAr: 'إس تي سي باي',
    provider: 'stc_pay',
    isActive: true,
    supportedCurrencies: ['SAR'],
  },
  {
    code: 'GW-SADAD',
    name: 'SADAD Payment System',
    nameAr: 'نظام سداد',
    provider: 'sadad',
    isActive: true,
    supportedCurrencies: ['SAR'],
  },
  {
    code: 'GW-MOYASAR',
    name: 'Moyasar Gateway',
    nameAr: 'بوابة ميسر',
    provider: 'moyasar',
    isActive: true,
    supportedCurrencies: ['SAR', 'USD'],
  },
  {
    code: 'GW-CASH',
    name: 'Cash Payment',
    nameAr: 'دفع نقدي',
    provider: 'cash',
    isActive: true,
    supportedCurrencies: ['SAR'],
  },
  {
    code: 'GW-BANK',
    name: 'Bank Transfer',
    nameAr: 'تحويل بنكي',
    provider: 'bank_transfer',
    isActive: true,
    supportedCurrencies: ['SAR', 'USD', 'EUR'],
  },
  {
    code: 'GW-HYPERPAY',
    name: 'HyperPay Gateway',
    nameAr: 'بوابة هايبرباي',
    provider: 'hyperpay',
    isActive: true,
    supportedCurrencies: ['SAR', 'AED', 'USD'],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Gateway Configuration ─────────────────────────────────────────────── */
const gatewayConfigSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    provider: { type: String, enum: GATEWAY_PROVIDERS, required: true },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    supportedCurrencies: [{ type: String, enum: CURRENCY_CODES }],
    config: {
      merchantId: { type: String },
      apiKey: { type: String },
      secretKey: { type: String },
      webhookUrl: { type: String },
      callbackUrl: { type: String },
      environment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
    },
    fees: {
      fixedFee: { type: Number, default: 0 },
      percentageFee: { type: Number, default: 0 },
      currency: { type: String, default: 'SAR' },
    },
    limits: {
      minTransaction: { type: Number, default: 1 },
      maxTransaction: { type: Number, default: 100000 },
      dailyLimit: { type: Number, default: 500000 },
    },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDPaymentGatewayConfig =
  mongoose.models.DDDPaymentGatewayConfig ||
  mongoose.model('DDDPaymentGatewayConfig', gatewayConfigSchema);

/* ── Transaction ───────────────────────────────────────────────────────── */
const transactionSchema = new Schema(
  {
    transactionNumber: { type: String, unique: true, required: true },
    gatewayId: { type: Schema.Types.ObjectId, ref: 'DDDPaymentGatewayConfig', index: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
    billingAccountId: { type: Schema.Types.ObjectId, ref: 'DDDBillingAccount' },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'DDDInvoice' },
    paymentId: { type: Schema.Types.ObjectId, ref: 'DDDPayment' },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    status: { type: String, enum: TRANSACTION_STATUSES, default: 'initiated' },
    amount: { type: Number, required: true },
    currency: { type: String, enum: CURRENCY_CODES, default: 'SAR' },
    fees: { type: Number, default: 0 },
    netAmount: { type: Number },
    gatewayRef: { type: String },
    authCode: { type: String },
    cardLast4: { type: String },
    cardBrand: { type: String },
    cardHolderName: { type: String },
    bankRef: { type: String },
    errorCode: { type: String },
    errorMessage: { type: String },
    parentTransactionId: { type: Schema.Types.ObjectId, ref: 'DDDTransaction' },
    initiatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    failedAt: { type: Date },
    settledAt: { type: Date },
    ipAddress: { type: String },
    userAgent: { type: String },
    gatewayResponse: { type: Map, of: Schema.Types.Mixed },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

transactionSchema.index({ status: 1, type: 1 });
transactionSchema.index({ transactionNumber: 1 });
transactionSchema.index({ initiatedAt: -1 });
transactionSchema.index({ gatewayRef: 1 });

const DDDTransaction =
  mongoose.models.DDDTransaction || mongoose.model('DDDTransaction', transactionSchema);

/* ── Payment Plan ──────────────────────────────────────────────────────── */
const installmentSchema = new Schema(
  {
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'waived', 'partial'],
      default: 'pending',
    },
    paidAmount: { type: Number, default: 0 },
    paidAt: { type: Date },
    transactionId: { type: Schema.Types.ObjectId, ref: 'DDDTransaction' },
    lateFee: { type: Number, default: 0 },
    notes: { type: String },
  },
  { _id: true }
);

const paymentPlanSchema = new Schema(
  {
    planNumber: { type: String, unique: true, required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    billingAccountId: { type: Schema.Types.ObjectId, ref: 'DDDBillingAccount' },
    invoiceIds: [{ type: Schema.Types.ObjectId, ref: 'DDDInvoice' }],
    status: { type: String, enum: PAYMENT_PLAN_STATUSES, default: 'draft' },
    totalAmount: { type: Number, required: true },
    downPayment: { type: Number, default: 0 },
    remainingAmount: { type: Number },
    numberOfInstallments: { type: Number, required: true, min: 2 },
    frequency: { type: String, enum: PAYMENT_PLAN_FREQUENCIES, default: 'monthly' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    interestRate: { type: Number, default: 0 },
    lateFeeAmount: { type: Number, default: 0 },
    lateFeePercent: { type: Number, default: 0 },
    gracePeriodDays: { type: Number, default: 5 },
    installments: [installmentSchema],
    totalPaid: { type: Number, default: 0 },
    totalRemaining: { type: Number },
    missedPayments: { type: Number, default: 0 },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentPlanSchema.index({ status: 1 });

const DDDPaymentPlan =
  mongoose.models.DDDPaymentPlan || mongoose.model('DDDPaymentPlan', paymentPlanSchema);

/* ── Reconciliation ────────────────────────────────────────────────────── */
const reconciliationSchema = new Schema(
  {
    batchNumber: { type: String, unique: true, required: true },
    gatewayId: { type: Schema.Types.ObjectId, ref: 'DDDPaymentGatewayConfig', index: true },
    status: { type: String, enum: RECONCILIATION_STATUSES, default: 'pending' },
    periodFrom: { type: Date, required: true },
    periodTo: { type: Date, required: true },
    totalTransactions: { type: Number, default: 0 },
    matchedCount: { type: Number, default: 0 },
    discrepancyCount: { type: Number, default: 0 },
    systemTotal: { type: Number, default: 0 },
    gatewayTotal: { type: Number, default: 0 },
    difference: { type: Number, default: 0 },
    discrepancies: [
      {
        transactionId: { type: Schema.Types.ObjectId, ref: 'DDDTransaction' },
        systemAmount: { type: Number },
        gatewayAmount: { type: Number },
        difference: { type: Number },
        type: {
          type: String,
          enum: [
            'amount_mismatch',
            'missing_in_system',
            'missing_in_gateway',
            'status_mismatch',
            'duplicate',
          ],
        },
        resolved: { type: Boolean, default: false },
        resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        resolvedAt: { type: Date },
        resolution: { type: String },
      },
    ],
    reconciledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reconciledAt: { type: Date },
    completedAt: { type: Date },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDReconciliation =
  mongoose.models.DDDReconciliation || mongoose.model('DDDReconciliation', reconciliationSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class PaymentGateway extends BaseDomainModule {
  constructor() {
    super('PaymentGateway', {
      description: 'Payment processing, multi-gateway integration, reconciliation & payment plans',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedGateways();
    this.log('Payment Gateway initialised ✓');
    return true;
  }

  async _seedGateways() {
    for (const gw of BUILTIN_GATEWAYS) {
      const exists = await DDDPaymentGatewayConfig.findOne({ code: gw.code }).lean();
      if (!exists) await DDDPaymentGatewayConfig.create(gw);
    }
  }

  /* ── Sequence generators ── */
  async _nextTxnNumber() {
    const count = await DDDTransaction.countDocuments();
    return `TXN-${new Date().getFullYear()}-${String(count + 1).padStart(8, '0')}`;
  }
  async _nextPlanNumber() {
    const count = await DDDPaymentPlan.countDocuments();
    return `PP-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  async _nextReconciliationNumber() {
    const count = await DDDReconciliation.countDocuments();
    return `REC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  /* ── Gateway Config CRUD ── */
  async listGateways(filters = {}) {
    const q = {};
    if (filters.provider) q.provider = filters.provider;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDPaymentGatewayConfig.find(q).sort({ name: 1 }).lean();
  }
  async getGateway(id) {
    return DDDPaymentGatewayConfig.findById(id).lean();
  }
  async createGateway(data) {
    return DDDPaymentGatewayConfig.create(data);
  }
  async updateGateway(id, data) {
    return DDDPaymentGatewayConfig.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Transaction Processing ── */
  async listTransactions(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.gatewayId) q.gatewayId = filters.gatewayId;
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.from || filters.to) {
      q.initiatedAt = {};
      if (filters.from) q.initiatedAt.$gte = new Date(filters.from);
      if (filters.to) q.initiatedAt.$lte = new Date(filters.to);
    }
    return DDDTransaction.find(q).sort({ initiatedAt: -1 }).lean();
  }

  async getTransaction(id) {
    return DDDTransaction.findById(id).lean();
  }

  async initiateTransaction(data) {
    data.transactionNumber = data.transactionNumber || (await this._nextTxnNumber());

    // Calculate fees
    if (data.gatewayId) {
      const gw = await DDDPaymentGatewayConfig.findById(data.gatewayId).lean();
      if (gw && gw.fees) {
        data.fees = (gw.fees.fixedFee || 0) + data.amount * ((gw.fees.percentageFee || 0) / 100);
        data.fees = Math.round(data.fees * 100) / 100;
      }
    }
    data.netAmount = data.amount - (data.fees || 0);
    return DDDTransaction.create(data);
  }

  async completeTransaction(id, response = {}) {
    return DDDTransaction.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        completedAt: new Date(),
        gatewayRef: response.gatewayRef,
        authCode: response.authCode,
        gatewayResponse: response,
      },
      { new: true }
    );
  }

  async failTransaction(id, errorCode, errorMessage) {
    return DDDTransaction.findByIdAndUpdate(
      id,
      {
        status: 'failed',
        failedAt: new Date(),
        errorCode,
        errorMessage,
      },
      { new: true }
    );
  }

  async refundTransaction(id, amount, reason) {
    const original = await DDDTransaction.findById(id);
    if (!original) throw new Error('Transaction not found');
    const refundTxn = await this.initiateTransaction({
      type: amount && amount < original.amount ? 'partial_refund' : 'refund',
      amount: amount || original.amount,
      currency: original.currency,
      beneficiaryId: original.beneficiaryId,
      billingAccountId: original.billingAccountId,
      invoiceId: original.invoiceId,
      gatewayId: original.gatewayId,
      parentTransactionId: original._id,
      metadata: { reason, originalTransactionNumber: original.transactionNumber },
    });
    return refundTxn;
  }

  /* ── Payment Plans ── */
  async listPaymentPlans(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.status) q.status = filters.status;
    return DDDPaymentPlan.find(q).sort({ createdAt: -1 }).lean();
  }
  async getPaymentPlan(id) {
    return DDDPaymentPlan.findById(id).lean();
  }

  async createPaymentPlan(data) {
    data.planNumber = data.planNumber || (await this._nextPlanNumber());
    data.remainingAmount = data.totalAmount - (data.downPayment || 0);
    data.totalRemaining = data.remainingAmount;

    // Generate installments
    const installmentAmount =
      Math.round((data.remainingAmount / data.numberOfInstallments) * 100) / 100;
    const installments = [];
    let currentDate = new Date(data.startDate);

    for (let i = 1; i <= data.numberOfInstallments; i++) {
      const dueDate = new Date(currentDate);
      const isLast = i === data.numberOfInstallments;
      const amt = isLast
        ? data.remainingAmount - installmentAmount * (data.numberOfInstallments - 1)
        : installmentAmount;

      installments.push({
        installmentNumber: i,
        dueDate,
        amount: Math.round(amt * 100) / 100,
      });

      // Advance date based on frequency
      switch (data.frequency) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'bi_weekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'bi_monthly':
          currentDate.setMonth(currentDate.getMonth() + 2);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        default:
          currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    data.installments = installments;
    data.endDate = installments[installments.length - 1]?.dueDate;
    return DDDPaymentPlan.create(data);
  }

  async activatePaymentPlan(id, approvedBy) {
    return DDDPaymentPlan.findByIdAndUpdate(
      id,
      {
        status: 'active',
        approvedBy,
        approvedAt: new Date(),
      },
      { new: true }
    );
  }

  async recordInstallmentPayment(planId, installmentNumber, transactionId, amount) {
    const plan = await DDDPaymentPlan.findById(planId);
    if (!plan) throw new Error('Payment plan not found');
    const inst = plan.installments.find(i => i.installmentNumber === installmentNumber);
    if (!inst) throw new Error('Installment not found');

    inst.paidAmount = (inst.paidAmount || 0) + amount;
    inst.status = inst.paidAmount >= inst.amount ? 'paid' : 'partial';
    inst.paidAt = new Date();
    inst.transactionId = transactionId;

    plan.totalPaid = plan.installments.reduce((s, i) => s + (i.paidAmount || 0), 0);
    plan.totalRemaining = plan.remainingAmount - plan.totalPaid;

    const allPaid = plan.installments.every(i => i.status === 'paid' || i.status === 'waived');
    if (allPaid) plan.status = 'completed';

    await plan.save();
    return plan;
  }

  async getOverdueInstallments() {
    const plans = await DDDPaymentPlan.find({ status: 'active' }).lean();
    const overdue = [];
    const now = new Date();
    for (const plan of plans) {
      for (const inst of plan.installments || []) {
        if (inst.status === 'pending' && new Date(inst.dueDate) < now) {
          overdue.push({
            planId: plan._id,
            planNumber: plan.planNumber,
            beneficiaryId: plan.beneficiaryId,
            installmentNumber: inst.installmentNumber,
            amount: inst.amount,
            dueDate: inst.dueDate,
            daysOverdue: Math.floor((now - new Date(inst.dueDate)) / (1000 * 60 * 60 * 24)),
          });
        }
      }
    }
    return overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  /* ── Reconciliation ── */
  async listReconciliations(filters = {}) {
    const q = {};
    if (filters.gatewayId) q.gatewayId = filters.gatewayId;
    if (filters.status) q.status = filters.status;
    return DDDReconciliation.find(q).sort({ createdAt: -1 }).lean();
  }
  async getReconciliation(id) {
    return DDDReconciliation.findById(id).lean();
  }

  async createReconciliation(data) {
    data.batchNumber = data.batchNumber || (await this._nextReconciliationNumber());
    // Count transactions in period
    const txns = await DDDTransaction.find({
      gatewayId: data.gatewayId,
      initiatedAt: { $gte: new Date(data.periodFrom), $lte: new Date(data.periodTo) },
      status: 'completed',
    }).lean();
    data.totalTransactions = txns.length;
    data.systemTotal = txns.reduce((s, t) => s + (t.amount || 0), 0);
    return DDDReconciliation.create(data);
  }

  async resolveDiscrepancy(reconciliationId, discrepancyIndex, resolution, userId) {
    const rec = await DDDReconciliation.findById(reconciliationId);
    if (!rec) throw new Error('Reconciliation not found');
    if (rec.discrepancies[discrepancyIndex]) {
      rec.discrepancies[discrepancyIndex].resolved = true;
      rec.discrepancies[discrepancyIndex].resolvedBy = userId;
      rec.discrepancies[discrepancyIndex].resolvedAt = new Date();
      rec.discrepancies[discrepancyIndex].resolution = resolution;
    }
    const allResolved = rec.discrepancies.every(d => d.resolved);
    if (allResolved) {
      rec.status = 'resolved';
      rec.completedAt = new Date();
    }
    await rec.save();
    return rec;
  }

  /* ── Revenue Analytics ── */
  async getRevenueAnalytics(from, to) {
    const match = { status: 'completed', type: 'payment' };
    if (from || to) {
      match.completedAt = {};
      if (from) match.completedAt.$gte = new Date(from);
      if (to) match.completedAt.$lte = new Date(to);
    }

    const [byGateway] = await DDDTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$gatewayId',
          total: { $sum: '$amount' },
          fees: { $sum: '$fees' },
          count: { $sum: 1 },
        },
      },
    ]).then(r => [r]);

    const [daily] = await DDDTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).then(r => [r]);

    const totalRevenue = await DDDTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          fees: { $sum: '$fees' },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      byGateway: byGateway || [],
      daily: daily || [],
      totals: totalRevenue[0] || { total: 0, fees: 0, count: 0 },
    };
  }

  /** Health check */
  async healthCheck() {
    const [gateways, transactions, plans, reconciliations] = await Promise.all([
      DDDPaymentGatewayConfig.countDocuments(),
      DDDTransaction.countDocuments(),
      DDDPaymentPlan.countDocuments(),
      DDDReconciliation.countDocuments(),
    ]);
    return { status: 'healthy', gateways, transactions, paymentPlans: plans, reconciliations };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createPaymentGatewayRouter() {
  const router = Router();
  const gw = new PaymentGateway();

  /* ── Gateways ── */
  router.get('/payment-gateway/gateways', async (req, res) => {
    try {
      res.json({ success: true, data: await gw.listGateways(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/payment-gateway/gateways/:id', async (req, res) => {
    try {
      const d = await gw.getGateway(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/payment-gateway/gateways', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await gw.createGateway(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/payment-gateway/gateways/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await gw.updateGateway(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Transactions ── */
  router.get('/payment-gateway/transactions', async (req, res) => {
    try {
      res.json({ success: true, data: await gw.listTransactions(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/payment-gateway/transactions/:id', async (req, res) => {
    try {
      const d = await gw.getTransaction(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/payment-gateway/transactions', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await gw.initiateTransaction(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/payment-gateway/transactions/:id/complete', async (req, res) => {
    try {
      res.json({ success: true, data: await gw.completeTransaction(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/payment-gateway/transactions/:id/fail', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await gw.failTransaction(req.params.id, req.body.errorCode, req.body.errorMessage),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/payment-gateway/transactions/:id/refund', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await gw.refundTransaction(req.params.id, req.body.amount, req.body.reason),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Payment Plans ── */
  router.get('/payment-gateway/plans', async (req, res) => {
    try {
      res.json({ success: true, data: await gw.listPaymentPlans(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/payment-gateway/plans/overdue', async (_req, res) => {
    try {
      res.json({ success: true, data: await gw.getOverdueInstallments() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/payment-gateway/plans/:id', async (req, res) => {
    try {
      const d = await gw.getPaymentPlan(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/payment-gateway/plans', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await gw.createPaymentPlan(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/payment-gateway/plans/:id/activate', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await gw.activatePaymentPlan(req.params.id, req.body.approvedBy),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/payment-gateway/plans/:id/pay-installment', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await gw.recordInstallmentPayment(
          req.params.id,
          req.body.installmentNumber,
          req.body.transactionId,
          req.body.amount
        ),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Reconciliation ── */
  router.get('/payment-gateway/reconciliation', async (req, res) => {
    try {
      res.json({ success: true, data: await gw.listReconciliations(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/payment-gateway/reconciliation/:id', async (req, res) => {
    try {
      const d = await gw.getReconciliation(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/payment-gateway/reconciliation', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await gw.createReconciliation(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/payment-gateway/reconciliation/:id/resolve', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await gw.resolveDiscrepancy(
          req.params.id,
          req.body.index,
          req.body.resolution,
          req.body.userId
        ),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Revenue Analytics ── */
  router.get('/payment-gateway/revenue', async (req, res) => {
    try {
      res.json({ success: true, data: await gw.getRevenueAnalytics(req.query.from, req.query.to) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Health ── */
  router.get('/payment-gateway/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await gw.healthCheck() });
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
  PaymentGateway,
  DDDPaymentGatewayConfig,
  DDDTransaction,
  DDDPaymentPlan,
  DDDReconciliation,
  GATEWAY_PROVIDERS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  PAYMENT_PLAN_STATUSES,
  PAYMENT_PLAN_FREQUENCIES,
  RECONCILIATION_STATUSES,
  BUILTIN_GATEWAYS,
  createPaymentGatewayRouter,
};

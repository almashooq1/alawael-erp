'use strict';
/**
 * DddPaymentGateway — Mongoose Models & Constants
 * Auto-extracted from services/dddPaymentGateway.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  GATEWAY_PROVIDERS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  PAYMENT_PLAN_STATUSES,
  PAYMENT_PLAN_FREQUENCIES,
  RECONCILIATION_STATUSES,
  CURRENCY_CODES,
  BUILTIN_GATEWAYS,
  DDDPaymentGatewayConfig,
  DDDTransaction,
  DDDPaymentPlan,
  DDDReconciliation,
};

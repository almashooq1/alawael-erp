'use strict';
/**
 * DddBillingEngine — Mongoose Models & Constants
 * Auto-extracted from services/dddBillingEngine.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Models ═══════════════════ */

const DDDInvoice = mongoose.models.DDDInvoice || mongoose.model('DDDInvoice', invoiceSchema);

/* ── Payment ───────────────────────────────────────────────────────────── */
const DDDPayment = mongoose.models.DDDPayment || mongoose.model('DDDPayment', paymentSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  CHARGE_CATEGORIES,
  BILLING_CYCLES,
  DISCOUNT_TYPES,
  TAX_TYPES,
  CURRENCY_CODES,
  BUILTIN_SERVICE_CHARGES,
  DDDServiceCharge,
  DDDBillingAccount,
  DDDInvoice,
  DDDPayment,
};

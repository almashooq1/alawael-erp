'use strict';
/**
 * DddContractManager — Mongoose Models & Constants
 * Auto-extracted from services/dddContractManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const CONTRACT_TYPES = [
  'service_agreement',
  'employment',
  'vendor',
  'lease',
  'licensing',
  'partnership',
  'nda',
  'mou',
  'consulting',
  'maintenance',
  'insurance',
  'procurement',
];

const CONTRACT_STATUSES = [
  'draft',
  'pending_review',
  'under_negotiation',
  'approved',
  'active',
  'suspended',
  'expired',
  'terminated',
  'renewed',
  'archived',
];

const OBLIGATION_TYPES = [
  'payment',
  'delivery',
  'reporting',
  'compliance',
  'performance',
  'confidentiality',
  'indemnification',
  'insurance',
  'audit',
  'renewal_notice',
  'termination_notice',
  'regulatory',
];

const OBLIGATION_STATUSES = [
  'pending',
  'in_progress',
  'fulfilled',
  'overdue',
  'waived',
  'breached',
  'escalated',
  'cancelled',
  'partially_fulfilled',
  'under_review',
];

const AMENDMENT_TYPES = [
  'addendum',
  'modification',
  'extension',
  'renewal',
  'scope_change',
  'price_adjustment',
  'term_change',
  'party_change',
  'schedule_change',
  'compliance_update',
];

const TEMPLATE_CATEGORIES = [
  'service_level',
  'employment',
  'vendor_supply',
  'lease_rental',
  'partnership',
  'research',
  'consulting',
  'maintenance',
  'insurance',
  'procurement',
  'confidentiality',
  'regulatory',
];

const BUILTIN_CONTRACT_TEMPLATES = [
  {
    code: 'TPL-SLA',
    name: 'Service Level Agreement',
    nameAr: 'اتفاقية مستوى الخدمة',
    category: 'service_level',
  },
  { code: 'TPL-EMP', name: 'Employment Contract', nameAr: 'عقد عمل', category: 'employment' },
  { code: 'TPL-VND', name: 'Vendor Agreement', nameAr: 'اتفاقية مورد', category: 'vendor_supply' },
  { code: 'TPL-LSE', name: 'Lease Agreement', nameAr: 'عقد إيجار', category: 'lease_rental' },
  {
    code: 'TPL-NDA',
    name: 'Non-Disclosure Agreement',
    nameAr: 'اتفاقية عدم إفشاء',
    category: 'confidentiality',
  },
  {
    code: 'TPL-PRT',
    name: 'Partnership Agreement',
    nameAr: 'اتفاقية شراكة',
    category: 'partnership',
  },
  { code: 'TPL-CNS', name: 'Consulting Agreement', nameAr: 'عقد استشارات', category: 'consulting' },
  { code: 'TPL-MNT', name: 'Maintenance Contract', nameAr: 'عقد صيانة', category: 'maintenance' },
  { code: 'TPL-INS', name: 'Insurance Agreement', nameAr: 'عقد تأمين', category: 'insurance' },
  { code: 'TPL-PRC', name: 'Procurement Contract', nameAr: 'عقد شراء', category: 'procurement' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Schemas ═══════════════════ */

const contractSchema = new Schema(
  {
    contractCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    type: { type: String, enum: CONTRACT_TYPES, required: true },
    status: { type: String, enum: CONTRACT_STATUSES, default: 'draft' },
    partyA: { type: String, required: true },
    partyB: { type: String, required: true },
    value: { type: Number },
    currency: { type: String, default: 'SAR' },
    startDate: { type: Date },
    endDate: { type: Date },
    signedDate: { type: Date },
    renewalDate: { type: Date },
    autoRenew: { type: Boolean, default: false },
    templateId: { type: Schema.Types.ObjectId, ref: 'DDDContractTemplate' },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
    description: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

contractSchema.index({ type: 1, status: 1 });
contractSchema.index({ endDate: 1 });

const contractTemplateSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: TEMPLATE_CATEGORIES, required: true },
    content: { type: String },
    clauses: [{ title: String, text: String, required: Boolean }],
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDContractTemplate =
  mongoose.models.DDDContractTemplate ||
  mongoose.model('DDDContractTemplate', contractTemplateSchema);

const contractAmendmentSchema = new Schema(
  {
    amendmentCode: { type: String, required: true, unique: true },
    contractId: { type: Schema.Types.ObjectId, ref: 'DDDContract', required: true },
    type: { type: String, enum: AMENDMENT_TYPES, required: true },
    description: { type: String },
    effectiveDate: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'applied'],
      default: 'draft',
    },
    changes: { type: Map, of: Schema.Types.Mixed },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

contractAmendmentSchema.index({ contractId: 1 });

const DDDContractAmendment =
  mongoose.models.DDDContractAmendment ||
  mongoose.model('DDDContractAmendment', contractAmendmentSchema);

const contractObligationSchema = new Schema(
  {
    obligationCode: { type: String, required: true, unique: true },
    contractId: { type: Schema.Types.ObjectId, ref: 'DDDContract', required: true },
    type: { type: String, enum: OBLIGATION_TYPES, required: true },
    status: { type: String, enum: OBLIGATION_STATUSES, default: 'pending' },
    description: { type: String },
    dueDate: { type: Date },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    reminderSent: { type: Boolean, default: false },
    escalated: { type: Boolean, default: false },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

contractObligationSchema.index({ contractId: 1, status: 1 });
contractObligationSchema.index({ dueDate: 1 });

const DDDContractObligation =
  mongoose.models.DDDContractObligation ||
  mongoose.model('DDDContractObligation', contractObligationSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Models ═══════════════════ */

const DDDContract = mongoose.models.DDDContract || mongoose.model('DDDContract', contractSchema);


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  CONTRACT_TYPES,
  CONTRACT_STATUSES,
  OBLIGATION_TYPES,
  OBLIGATION_STATUSES,
  AMENDMENT_TYPES,
  TEMPLATE_CATEGORIES,
  BUILTIN_CONTRACT_TEMPLATES,
  DDDContract,
  DDDContractTemplate,
  DDDContractAmendment,
  DDDContractObligation,
};

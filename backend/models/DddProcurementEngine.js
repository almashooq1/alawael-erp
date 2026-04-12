'use strict';
/**
 * DddProcurementEngine — Mongoose Models & Constants
 * Auto-extracted from services/dddProcurementEngine.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const SUPPLIER_CATEGORIES = [
  'medical_equipment',
  'rehabilitation_supplies',
  'pharmaceuticals',
  'assistive_technology',
  'orthotics_prosthetics',
  'it_services',
  'facility_maintenance',
  'office_supplies',
  'laboratory',
  'cleaning_services',
  'food_services',
  'consulting',
  'training_services',
  'logistics',
];

const SUPPLIER_STATUSES = [
  'active',
  'inactive',
  'pending_approval',
  'suspended',
  'blacklisted',
  'probation',
  'preferred',
  'archived',
  'under_review',
];

const PO_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'sent_to_supplier',
  'partially_received',
  'fully_received',
  'invoiced',
  'closed',
  'cancelled',
  'on_hold',
  'disputed',
];

const REQUISITION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'converted_to_po',
  'cancelled',
  'partially_fulfilled',
  'fulfilled',
];

const PAYMENT_TERMS = [
  'net_15',
  'net_30',
  'net_45',
  'net_60',
  'net_90',
  'cod',
  'prepaid',
  'installment',
  'on_delivery',
  'end_of_month',
  'custom',
];

const EVALUATION_CRITERIA = [
  'quality',
  'delivery_timeliness',
  'pricing_competitiveness',
  'communication',
  'documentation',
  'after_sales_support',
  'compliance',
  'flexibility',
  'innovation',
  'financial_stability',
  'sustainability',
];

/* ── Built-in suppliers ─────────────────────────────────────────────────── */
const BUILTIN_SUPPLIERS = [
  {
    code: 'SUP-MEDDEV01',
    name: 'Al-Shifa Medical Devices',
    nameAr: 'الشفاء للأجهزة الطبية',
    category: 'medical_equipment',
    status: 'preferred',
  },
  {
    code: 'SUP-REHAB01',
    name: 'Gulf Rehabilitation Supplies',
    nameAr: 'مستلزمات التأهيل الخليجية',
    category: 'rehabilitation_supplies',
    status: 'preferred',
  },
  {
    code: 'SUP-PHARMA01',
    name: 'Saudi Pharma Co',
    nameAr: 'الشركة السعودية للأدوية',
    category: 'pharmaceuticals',
    status: 'active',
  },
  {
    code: 'SUP-ASSIST01',
    name: 'TechAbility Solutions',
    nameAr: 'حلول القدرة التقنية',
    category: 'assistive_technology',
    status: 'active',
  },
  {
    code: 'SUP-ORTHO01',
    name: 'Precision Orthotics',
    nameAr: 'الأجهزة التعويضية الدقيقة',
    category: 'orthotics_prosthetics',
    status: 'active',
  },
  {
    code: 'SUP-IT01',
    name: 'MedTech IT Services',
    nameAr: 'خدمات تقنية المعلومات الطبية',
    category: 'it_services',
    status: 'active',
  },
  {
    code: 'SUP-FACIL01',
    name: 'CleanCare Facility Services',
    nameAr: 'خدمات المرافق نظيفة',
    category: 'facility_maintenance',
    status: 'active',
  },
  {
    code: 'SUP-LAB01',
    name: 'Diagnostic Labs Supplies',
    nameAr: 'مستلزمات المختبرات التشخيصية',
    category: 'laboratory',
    status: 'active',
  },
  {
    code: 'SUP-TRAIN01',
    name: 'HealthEd Training Corp',
    nameAr: 'شركة التدريب الصحي',
    category: 'training_services',
    status: 'active',
  },
  {
    code: 'SUP-LOGIS01',
    name: 'MedLogistics Arabia',
    nameAr: 'اللوجستيات الطبية العربية',
    category: 'logistics',
    status: 'active',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Supplier ──────────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const supplierSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: SUPPLIER_CATEGORIES, required: true },
    status: { type: String, enum: SUPPLIER_STATUSES, default: 'active' },
    contactPerson: { type: String },
    email: { type: String },
    phone: { type: String },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    taxId: { type: String },
    paymentTerms: { type: String, enum: PAYMENT_TERMS, default: 'net_30' },
    currency: { type: String, default: 'SAR' },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    certifications: [{ name: String, expiryDate: Date }],
    bankDetails: {
      bankName: String,
      accountNumber: String,
      iban: String,
      swiftCode: String,
    },
    contractStartDate: { type: Date },
    contractEndDate: { type: Date },
    tags: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

supplierSchema.index({ category: 1, status: 1 });
supplierSchema.index({ code: 1 });

const purchaseOrderSchema = new Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'DDDSupplier', required: true },
    status: { type: String, enum: PO_STATUSES, default: 'draft' },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId },
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number },
        receivedQty: { type: Number, default: 0 },
        uom: { type: String },
      },
    ],
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    paymentTerms: { type: String, enum: PAYMENT_TERMS },
    expectedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    shippingAddress: { type: String },
    notes: { type: String },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    requisitionId: { type: Schema.Types.ObjectId, ref: 'DDDRequisition' },
    attachments: [{ name: String, url: String, type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ supplierId: 1, status: 1 });
purchaseOrderSchema.index({ poNumber: 1 });

const DDDPurchaseOrder =
  mongoose.models.DDDPurchaseOrder || mongoose.model('DDDPurchaseOrder', purchaseOrderSchema);

/* ── Requisition ───────────────────────────────────────────────────────── */
const requisitionSchema = new Schema(
  {
    reqNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    status: { type: String, enum: REQUISITION_STATUSES, default: 'draft' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true },
        estimatedCost: { type: Number },
        suggestedSupplierId: { type: Schema.Types.ObjectId, ref: 'DDDSupplier' },
        notes: { type: String },
      },
    ],
    justification: { type: String },
    estimatedTotal: { type: Number, default: 0 },
    departmentId: { type: Schema.Types.ObjectId },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'DDDPurchaseOrder' },
    neededByDate: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

requisitionSchema.index({ status: 1, createdAt: -1 });

const DDDRequisition =
  mongoose.models.DDDRequisition || mongoose.model('DDDRequisition', requisitionSchema);

/* ── Supplier Evaluation ───────────────────────────────────────────────── */
const supplierEvaluationSchema = new Schema(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'DDDSupplier', required: true },
    period: { type: String, required: true },
    evaluatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scores: [
      {
        criterion: { type: String, enum: EVALUATION_CRITERIA },
        score: { type: Number, min: 1, max: 5 },
        weight: { type: Number, default: 1 },
        comments: { type: String },
      },
    ],
    overallScore: { type: Number, min: 0, max: 5 },
    recommendation: {
      type: String,
      enum: ['continue', 'probation', 'terminate', 'upgrade_to_preferred'],
    },
    strengths: [{ type: String }],
    improvements: [{ type: String }],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

supplierEvaluationSchema.index({ supplierId: 1, period: 1 });

const DDDSupplierEvaluation =
  mongoose.models.DDDSupplierEvaluation ||
  mongoose.model('DDDSupplierEvaluation', supplierEvaluationSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Models ═══════════════════ */

const DDDSupplier = mongoose.models.DDDSupplier || mongoose.model('DDDSupplier', supplierSchema);

/* ── Purchase Order ────────────────────────────────────────────────────── */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  SUPPLIER_CATEGORIES,
  SUPPLIER_STATUSES,
  PO_STATUSES,
  REQUISITION_STATUSES,
  PAYMENT_TERMS,
  EVALUATION_CRITERIA,
  BUILTIN_SUPPLIERS,
  DDDSupplier,
  DDDPurchaseOrder,
  DDDRequisition,
  DDDSupplierEvaluation,
};

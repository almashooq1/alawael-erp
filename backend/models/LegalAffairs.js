/**
 * Legal Affairs Models — نماذج الشؤون القانونية
 */
const mongoose = require('mongoose');

// ── Legal Case Schema ────────────────────────────────────────────
const legalCaseSchema = new mongoose.Schema(
  {
    caseNumber: { type: String, unique: true, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        'litigation',
        'arbitration',
        'labor',
        'commercial',
        'administrative',
        'regulatory',
        'other',
      ],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'internal',
        'external',
        'government',
        'insurance',
        'contract_dispute',
        'employment',
        'compliance',
      ],
      default: 'external',
    },
    status: {
      type: String,
      enum: [
        'open',
        'in_progress',
        'pending_hearing',
        'pending_judgment',
        'appealed',
        'closed',
        'settled',
        'won',
        'lost',
      ],
      default: 'open',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    description: String,
    court: { name: String, city: String, chamber: String },
    judge: String,
    opposingParty: { name: String, lawyer: String, contact: String },
    internalLawyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    externalLawyer: { name: String, firm: String, phone: String, email: String },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    filingDate: Date,
    nextHearing: Date,
    hearings: [
      {
        date: Date,
        description: String,
        outcome: String,
        notes: String,
      },
    ],
    documents: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    financials: {
      claimAmount: { type: Number, default: 0 },
      settlementAmount: { type: Number, default: 0 },
      legalFees: { type: Number, default: 0 },
      courtFees: { type: Number, default: 0 },
    },
    tags: [String],
    closedAt: Date,
    closureReason: String,
    notes: String,
  },
  { timestamps: true }
);

legalCaseSchema.index({ status: 1, type: 1 });
legalCaseSchema.index({ priority: 1 });
legalCaseSchema.index({ nextHearing: 1 });
legalCaseSchema.index({ department: 1 });

// ── Legal Consultation Schema ────────────────────────────────────
const legalConsultationSchema = new mongoose.Schema(
  {
    consultationNumber: { type: String, unique: true, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        'contract_review',
        'legal_opinion',
        'compliance',
        'risk_assessment',
        'general',
        'employment',
      ],
      default: 'general',
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    status: {
      type: String,
      enum: ['pending', 'in_review', 'completed', 'cancelled'],
      default: 'pending',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    description: String,
    opinion: String,
    recommendation: String,
    relatedCase: { type: mongoose.Schema.Types.ObjectId, ref: 'LegalCase' },
    relatedContract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
    dueDate: Date,
    completedAt: Date,
    attachments: [{ name: String, url: String }],
    notes: String,
  },
  { timestamps: true }
);

legalConsultationSchema.index({ status: 1, type: 1 });
legalConsultationSchema.index({ assignedTo: 1 });
legalConsultationSchema.index({ dueDate: 1 });

// ── Legal Contract Template Schema ───────────────────────────────
const legalContractTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['employment', 'vendor', 'service', 'lease', 'nda', 'partnership', 'other'],
      required: true,
    },
    content: String,
    clauses: [{ title: String, text: String, isRequired: { type: Boolean, default: true } }],
    status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
    version: { type: Number, default: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const LegalCase = mongoose.models.LegalCase || mongoose.model('LegalCase', legalCaseSchema);
const LegalConsultation =
  mongoose.models.LegalConsultation || mongoose.model('LegalConsultation', legalConsultationSchema);
const LegalContractTemplate =
  mongoose.models.LegalContractTemplate ||
  mongoose.model('LegalContractTemplate', legalContractTemplateSchema);

module.exports = { LegalCase, LegalConsultation, LegalContractTemplate };

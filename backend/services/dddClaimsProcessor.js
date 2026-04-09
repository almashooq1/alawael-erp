/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Claims Processor — Phase 16 · Financial & Billing Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Insurance claims submission, adjudication tracking, EOB processing,
 * denial management, appeals workflow, batch claims, and NPHIES integration
 * for rehabilitation services.
 *
 * Aggregates
 *   DDDClaim          — individual insurance claim
 *   DDDClaimBatch     — batch submission of claims
 *   DDDClaimAppeal    — appeals for denied claims
 *   DDDEOB            — Explanation of Benefits records
 *
 * Canonical links
 *   beneficiaryId → Beneficiary Core
 *   invoiceId     → DDDInvoice
 *   policyId      → DDDInsurancePolicy
 *   preAuthId     → DDDPreAuthorization
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

const CLAIM_STATUSES = [
  'draft',
  'validated',
  'submitted',
  'acknowledged',
  'in_review',
  'approved',
  'partially_approved',
  'denied',
  'paid',
  'partially_paid',
  'appealed',
  'resubmitted',
  'cancelled',
  'voided',
];

const CLAIM_TYPES = [
  'professional',
  'institutional',
  'pharmacy',
  'dental',
  'vision',
  'rehabilitation',
  'mental_health',
  'assistive_technology',
  'home_health',
  'transport',
];

const DENIAL_REASONS = [
  'not_covered',
  'pre_auth_missing',
  'pre_auth_expired',
  'benefit_exhausted',
  'duplicate_claim',
  'coding_error',
  'untimely_filing',
  'incomplete_documentation',
  'out_of_network',
  'non_medical_necessity',
  'patient_ineligible',
  'coordination_of_benefits',
  'prior_treatment_required',
  'experimental_treatment',
];

const APPEAL_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'denied',
  'escalated',
  'withdrawn',
  'expired',
];

const APPEAL_LEVELS = ['first_level', 'second_level', 'external_review', 'arbitration'];

const SUBMISSION_CHANNELS = ['electronic', 'portal', 'nphies', 'fax', 'mail', 'manual'];

const EOB_TYPES = ['payment', 'denial', 'adjustment', 'reversal'];

const ADJUDICATION_TYPES = [
  'eligible',
  'copay',
  'deductible',
  'coinsurance',
  'non_covered',
  'benefit',
  'tax',
  'adjustment',
];

/* ── Built-in claim templates ───────────────────────────────────────────── */
const BUILTIN_CLAIM_TEMPLATES = [
  {
    code: 'CLM-PT',
    name: 'Physical Therapy Claim',
    nameAr: 'مطالبة علاج طبيعي',
    claimType: 'rehabilitation',
  },
  {
    code: 'CLM-OT',
    name: 'Occupational Therapy Claim',
    nameAr: 'مطالبة علاج وظيفي',
    claimType: 'rehabilitation',
  },
  {
    code: 'CLM-SLP',
    name: 'Speech Therapy Claim',
    nameAr: 'مطالبة نطق ولغة',
    claimType: 'rehabilitation',
  },
  {
    code: 'CLM-PSY',
    name: 'Psychological Services Claim',
    nameAr: 'مطالبة خدمات نفسية',
    claimType: 'mental_health',
  },
  {
    code: 'CLM-ASSESS',
    name: 'Assessment Claim',
    nameAr: 'مطالبة تقييم',
    claimType: 'professional',
  },
  {
    code: 'CLM-TELE',
    name: 'Tele-Rehab Claim',
    nameAr: 'مطالبة تأهيل عن بعد',
    claimType: 'rehabilitation',
  },
  {
    code: 'CLM-DEVICE',
    name: 'Assistive Device Claim',
    nameAr: 'مطالبة أجهزة مساعدة',
    claimType: 'assistive_technology',
  },
  {
    code: 'CLM-HOME',
    name: 'Home Health Claim',
    nameAr: 'مطالبة رعاية منزلية',
    claimType: 'home_health',
  },
  {
    code: 'CLM-GROUP',
    name: 'Group Therapy Claim',
    nameAr: 'مطالبة علاج جماعي',
    claimType: 'rehabilitation',
  },
  {
    code: 'CLM-TRANS',
    name: 'Medical Transport Claim',
    nameAr: 'مطالبة نقل طبي',
    claimType: 'transport',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Claim ─────────────────────────────────────────────────────────────── */
const claimLineSchema = new Schema(
  {
    lineNumber: { type: Number, required: true },
    serviceCode: { type: String, required: true },
    description: { type: String, required: true },
    descriptionAr: { type: String },
    serviceDate: { type: Date, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    totalCharge: { type: Number, required: true },
    diagnosisRef: [{ type: String }],
    providerId: { type: Schema.Types.ObjectId, ref: 'User' },
    modifier: [{ type: String }],
    placeOfService: { type: String },
    adjudication: [
      {
        type: { type: String, enum: ADJUDICATION_TYPES },
        amount: { type: Number },
        reason: { type: String },
      },
    ],
    approvedAmount: { type: Number },
    deniedAmount: { type: Number },
    notes: { type: String },
  },
  { _id: true }
);

const claimSchema = new Schema(
  {
    claimNumber: { type: String, unique: true, required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    policyId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDInsurancePolicy',
      required: true,
      index: true,
    },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDInsuranceProvider', required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'DDDInvoice', index: true },
    preAuthId: { type: Schema.Types.ObjectId, ref: 'DDDPreAuthorization' },
    episodeId: { type: Schema.Types.ObjectId, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'DDDClaimBatch' },
    claimType: { type: String, enum: CLAIM_TYPES, required: true },
    status: { type: String, enum: CLAIM_STATUSES, default: 'draft' },
    priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
    submissionChannel: { type: String, enum: SUBMISSION_CHANNELS, default: 'electronic' },
    serviceFrom: { type: Date, required: true },
    serviceTo: { type: Date },
    diagnosis: [
      {
        code: { type: String, required: true },
        system: { type: String, default: 'ICD-10' },
        description: { type: String },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    lines: [claimLineSchema],
    totalCharged: { type: Number, default: 0 },
    totalApproved: { type: Number, default: 0 },
    totalDenied: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    patientShare: { type: Number, default: 0 },
    insuranceShare: { type: Number, default: 0 },
    submittedAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    adjudicatedAt: { type: Date },
    paidAt: { type: Date },
    deniedAt: { type: Date },
    denialReasons: [{ type: String, enum: DENIAL_REASONS }],
    denialNotes: { type: String },
    payerClaimRef: { type: String },
    nphiesRef: { type: String },
    eobId: { type: Schema.Types.ObjectId, ref: 'DDDEOB' },
    filingDeadline: { type: Date },
    attachments: [{ name: String, url: String, type: String }],
    history: [
      {
        action: { type: String },
        date: { type: Date, default: Date.now },
        actor: { type: String },
        notes: { type: String },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

claimSchema.index({ status: 1, claimType: 1 });
claimSchema.index({ submittedAt: -1 });
claimSchema.index({ claimNumber: 1 });

const DDDClaim = mongoose.models.DDDClaim || mongoose.model('DDDClaim', claimSchema);

/* ── Claim Batch ───────────────────────────────────────────────────────── */
const claimBatchSchema = new Schema(
  {
    batchNumber: { type: String, unique: true, required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDInsuranceProvider', required: true },
    status: {
      type: String,
      enum: [
        'draft',
        'validated',
        'submitted',
        'processing',
        'completed',
        'partially_completed',
        'failed',
      ],
      default: 'draft',
    },
    channel: { type: String, enum: SUBMISSION_CHANNELS, default: 'electronic' },
    claimIds: [{ type: Schema.Types.ObjectId, ref: 'DDDClaim' }],
    totalClaims: { type: Number, default: 0 },
    totalCharged: { type: Number, default: 0 },
    totalApproved: { type: Number, default: 0 },
    totalDenied: { type: Number, default: 0 },
    submittedAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    responseRef: { type: String },
    errors: [
      {
        claimId: { type: Schema.Types.ObjectId },
        code: { type: String },
        message: { type: String },
      },
    ],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDClaimBatch =
  mongoose.models.DDDClaimBatch || mongoose.model('DDDClaimBatch', claimBatchSchema);

/* ── Claim Appeal ──────────────────────────────────────────────────────── */
const claimAppealSchema = new Schema(
  {
    appealNumber: { type: String, unique: true, required: true },
    claimId: { type: Schema.Types.ObjectId, ref: 'DDDClaim', required: true, index: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    policyId: { type: Schema.Types.ObjectId, ref: 'DDDInsurancePolicy' },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDInsuranceProvider' },
    status: { type: String, enum: APPEAL_STATUSES, default: 'draft' },
    level: { type: String, enum: APPEAL_LEVELS, default: 'first_level' },
    denialReasons: [{ type: String, enum: DENIAL_REASONS }],
    appealReason: { type: String, required: true },
    clinicalJustification: { type: String },
    supportingDocs: [{ name: String, url: String, type: String }],
    requestedAmount: { type: Number },
    approvedAmount: { type: Number },
    submittedAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    resolvedAt: { type: Date },
    deadline: { type: Date },
    history: [
      {
        action: { type: String },
        date: { type: Date, default: Date.now },
        actor: { type: String },
        notes: { type: String },
      },
    ],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

claimAppealSchema.index({ status: 1, level: 1 });

const DDDClaimAppeal =
  mongoose.models.DDDClaimAppeal || mongoose.model('DDDClaimAppeal', claimAppealSchema);

/* ── Explanation of Benefits (EOB) ─────────────────────────────────────── */
const eobSchema = new Schema(
  {
    eobNumber: { type: String, unique: true, required: true },
    claimId: { type: Schema.Types.ObjectId, ref: 'DDDClaim', required: true, index: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    policyId: { type: Schema.Types.ObjectId, ref: 'DDDInsurancePolicy' },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDInsuranceProvider' },
    type: { type: String, enum: EOB_TYPES, default: 'payment' },
    processedDate: { type: Date, default: Date.now },
    serviceFrom: { type: Date },
    serviceTo: { type: Date },
    totalCharged: { type: Number },
    allowedAmount: { type: Number },
    paidAmount: { type: Number },
    patientResponsibility: { type: Number },
    adjustments: [
      {
        type: { type: String, enum: ADJUDICATION_TYPES },
        amount: { type: Number },
        reason: { type: String },
      },
    ],
    lineDetails: [
      {
        serviceCode: { type: String },
        charged: { type: Number },
        allowed: { type: Number },
        paid: { type: Number },
        adjustment: { type: Number },
        remark: { type: String },
      },
    ],
    paymentRef: { type: String },
    checkNumber: { type: String },
    paymentDate: { type: Date },
    remarks: [{ code: String, description: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDEOB = mongoose.models.DDDEOB || mongoose.model('DDDEOB', eobSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class ClaimsProcessor extends BaseDomainModule {
  constructor() {
    super('ClaimsProcessor', {
      description: 'Claims submission, adjudication, denial management, appeals & EOB processing',
      version: '1.0.0',
    });
  }

  async initialize() {
    this.log('Claims Processor initialised ✓');
    return true;
  }

  /* ── Sequence generators ── */
  async _nextClaimNumber() {
    const count = await DDDClaim.countDocuments();
    return `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(7, '0')}`;
  }
  async _nextBatchNumber() {
    const count = await DDDClaimBatch.countDocuments();
    return `BATCH-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  async _nextAppealNumber() {
    const count = await DDDClaimAppeal.countDocuments();
    return `APL-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  async _nextEOBNumber() {
    const count = await DDDEOB.countDocuments();
    return `EOB-${new Date().getFullYear()}-${String(count + 1).padStart(7, '0')}`;
  }

  /* ── Claim CRUD ── */
  async listClaims(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.policyId) q.policyId = filters.policyId;
    if (filters.providerId) q.providerId = filters.providerId;
    if (filters.status) q.status = filters.status;
    if (filters.claimType) q.claimType = filters.claimType;
    if (filters.from || filters.to) {
      q.submittedAt = {};
      if (filters.from) q.submittedAt.$gte = new Date(filters.from);
      if (filters.to) q.submittedAt.$lte = new Date(filters.to);
    }
    return DDDClaim.find(q).sort({ createdAt: -1 }).lean();
  }

  async getClaim(id) {
    return DDDClaim.findById(id).lean();
  }

  async createClaim(data) {
    data.claimNumber = data.claimNumber || (await this._nextClaimNumber());
    // Calculate totals from lines
    let totalCharged = 0;
    for (const line of data.lines || []) {
      line.totalCharge = line.quantity * line.unitPrice;
      totalCharged += line.totalCharge;
    }
    data.totalCharged = totalCharged;
    data.history = [{ action: 'created', date: new Date(), actor: 'system' }];
    return DDDClaim.create(data);
  }

  async updateClaim(id, data) {
    return DDDClaim.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async validateClaim(id) {
    const claim = await DDDClaim.findById(id);
    if (!claim) throw new Error('Claim not found');
    const errors = [];
    if (!claim.diagnosis || claim.diagnosis.length === 0)
      errors.push('At least one diagnosis required');
    if (!claim.lines || claim.lines.length === 0) errors.push('At least one service line required');
    if (!claim.policyId) errors.push('Insurance policy required');
    if (errors.length > 0) return { valid: false, errors };
    claim.status = 'validated';
    claim.history.push({ action: 'validated', date: new Date(), actor: 'system' });
    await claim.save();
    return { valid: true, claim };
  }

  async submitClaim(id, userId) {
    const claim = await DDDClaim.findById(id);
    if (!claim) throw new Error('Claim not found');
    claim.status = 'submitted';
    claim.submittedAt = new Date();
    claim.submittedBy = userId;
    claim.history.push({ action: 'submitted', date: new Date(), actor: String(userId) });
    await claim.save();
    return claim;
  }

  async adjudicateClaim(id, adjudicationData) {
    const claim = await DDDClaim.findById(id);
    if (!claim) throw new Error('Claim not found');

    let totalApproved = 0,
      totalDenied = 0;
    for (const lineAdj of adjudicationData.lines || []) {
      const line = claim.lines.id(lineAdj.lineId);
      if (line) {
        line.adjudication = lineAdj.adjudication || [];
        line.approvedAmount = lineAdj.approvedAmount || 0;
        line.deniedAmount = lineAdj.deniedAmount || 0;
        totalApproved += line.approvedAmount;
        totalDenied += line.deniedAmount;
      }
    }

    claim.totalApproved = totalApproved;
    claim.totalDenied = totalDenied;
    claim.adjudicatedAt = new Date();
    claim.payerClaimRef = adjudicationData.payerClaimRef || claim.payerClaimRef;

    if (totalDenied > 0 && totalApproved === 0) {
      claim.status = 'denied';
      claim.deniedAt = new Date();
      claim.denialReasons = adjudicationData.denialReasons || [];
      claim.denialNotes = adjudicationData.denialNotes;
    } else if (totalDenied > 0) {
      claim.status = 'partially_approved';
    } else {
      claim.status = 'approved';
    }

    claim.history.push({
      action: 'adjudicated',
      date: new Date(),
      actor: 'payer',
      notes: `Approved: ${totalApproved}, Denied: ${totalDenied}`,
    });
    await claim.save();
    return claim;
  }

  async markClaimPaid(id, paymentData) {
    const claim = await DDDClaim.findById(id);
    if (!claim) throw new Error('Claim not found');
    claim.totalPaid = paymentData.amount || claim.totalApproved;
    claim.status = claim.totalPaid >= claim.totalApproved ? 'paid' : 'partially_paid';
    claim.paidAt = new Date();
    claim.history.push({
      action: 'paid',
      date: new Date(),
      actor: 'payer',
      notes: `Amount: ${claim.totalPaid}`,
    });
    await claim.save();
    return claim;
  }

  /* ── Batch Claims ── */
  async listBatches(filters = {}) {
    const q = {};
    if (filters.providerId) q.providerId = filters.providerId;
    if (filters.status) q.status = filters.status;
    return DDDClaimBatch.find(q).sort({ createdAt: -1 }).lean();
  }

  async getBatch(id) {
    return DDDClaimBatch.findById(id).lean();
  }

  async createBatch(data) {
    data.batchNumber = data.batchNumber || (await this._nextBatchNumber());
    data.totalClaims = (data.claimIds || []).length;
    return DDDClaimBatch.create(data);
  }

  async submitBatch(id, userId) {
    const batch = await DDDClaimBatch.findById(id);
    if (!batch) throw new Error('Batch not found');
    batch.status = 'submitted';
    batch.submittedAt = new Date();
    batch.submittedBy = userId;
    // Update individual claims
    await DDDClaim.updateMany(
      { _id: { $in: batch.claimIds } },
      { status: 'submitted', submittedAt: new Date(), submittedBy: userId, batchId: batch._id }
    );
    await batch.save();
    return batch;
  }

  /* ── Appeals ── */
  async listAppeals(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.claimId) q.claimId = filters.claimId;
    if (filters.status) q.status = filters.status;
    if (filters.level) q.level = filters.level;
    return DDDClaimAppeal.find(q).sort({ createdAt: -1 }).lean();
  }
  async getAppeal(id) {
    return DDDClaimAppeal.findById(id).lean();
  }

  async createAppeal(data) {
    data.appealNumber = data.appealNumber || (await this._nextAppealNumber());
    data.history = [{ action: 'created', date: new Date(), actor: 'system' }];
    // Update claim status
    await DDDClaim.findByIdAndUpdate(data.claimId, {
      status: 'appealed',
      $push: { history: { action: 'appeal_filed', date: new Date(), actor: 'system' } },
    });
    return DDDClaimAppeal.create(data);
  }

  async submitAppeal(id, userId) {
    return DDDClaimAppeal.findByIdAndUpdate(
      id,
      {
        status: 'submitted',
        submittedAt: new Date(),
        submittedBy: userId,
        $push: { history: { action: 'submitted', date: new Date(), actor: String(userId) } },
      },
      { new: true }
    );
  }

  async resolveAppeal(id, resolution) {
    const update = {
      status: resolution.approved ? 'approved' : 'denied',
      reviewedAt: new Date(),
      reviewedBy: resolution.reviewer,
      resolvedAt: new Date(),
      $push: {
        history: {
          action: resolution.approved ? 'approved' : 'denied',
          date: new Date(),
          actor: resolution.reviewer,
        },
      },
    };
    if (resolution.approvedAmount) update.approvedAmount = resolution.approvedAmount;
    return DDDClaimAppeal.findByIdAndUpdate(id, update, { new: true });
  }

  /* ── EOBs ── */
  async listEOBs(filters = {}) {
    const q = {};
    if (filters.beneficiaryId) q.beneficiaryId = filters.beneficiaryId;
    if (filters.claimId) q.claimId = filters.claimId;
    if (filters.type) q.type = filters.type;
    return DDDEOB.find(q).sort({ processedDate: -1 }).lean();
  }
  async getEOB(id) {
    return DDDEOB.findById(id).lean();
  }

  async createEOB(data) {
    data.eobNumber = data.eobNumber || (await this._nextEOBNumber());
    const eob = await DDDEOB.create(data);
    // Link EOB to claim
    if (data.claimId) {
      await DDDClaim.findByIdAndUpdate(data.claimId, { eobId: eob._id });
    }
    return eob;
  }

  /* ── Analytics ── */
  async getClaimsSummary(filters = {}) {
    const match = {};
    if (filters.from || filters.to) {
      match.createdAt = {};
      if (filters.from) match.createdAt.$gte = new Date(filters.from);
      if (filters.to) match.createdAt.$lte = new Date(filters.to);
    }
    const [statusBreakdown] = await DDDClaim.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCharged: { $sum: '$totalCharged' },
          totalApproved: { $sum: '$totalApproved' },
          totalDenied: { $sum: '$totalDenied' },
          totalPaid: { $sum: '$totalPaid' },
        },
      },
    ]).then(r => [r]);
    const deniedClaims = await DDDClaim.countDocuments({ ...match, status: 'denied' });
    const totalClaims = await DDDClaim.countDocuments(match);
    return {
      byStatus: statusBreakdown || [],
      denialRate: totalClaims > 0 ? Math.round((deniedClaims / totalClaims) * 10000) / 100 : 0,
      totalClaims,
    };
  }

  async getAgingReport() {
    const now = new Date();
    const ranges = [
      { label: '0-30 days', min: 0, max: 30 },
      { label: '31-60 days', min: 31, max: 60 },
      { label: '61-90 days', min: 61, max: 90 },
      { label: '91-120 days', min: 91, max: 120 },
      { label: '120+ days', min: 121, max: 9999 },
    ];
    const results = [];
    for (const range of ranges) {
      const from = new Date(now);
      from.setDate(from.getDate() - range.max);
      const to = new Date(now);
      to.setDate(to.getDate() - range.min);
      const claims = await DDDClaim.find({
        status: { $in: ['submitted', 'in_review', 'acknowledged'] },
        submittedAt: { $gte: from, $lte: to },
      }).lean();
      const totalAmount = claims.reduce((s, c) => s + (c.totalCharged || 0), 0);
      results.push({ ...range, count: claims.length, totalAmount });
    }
    return results;
  }

  /* ── Health Check ── */
  async healthCheck() {
    const [claims, batches, appeals, eobs] = await Promise.all([
      DDDClaim.countDocuments(),
      DDDClaimBatch.countDocuments(),
      DDDClaimAppeal.countDocuments(),
      DDDEOB.countDocuments(),
    ]);
    return { status: 'healthy', claims, batches, appeals, eobs };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createClaimsProcessorRouter() {
  const router = Router();
  const proc = new ClaimsProcessor();

  /* ── Claims ── */
  router.get('/claims', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.listClaims(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/claims/summary', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.getClaimsSummary(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/claims/aging', async (_req, res) => {
    try {
      res.json({ success: true, data: await proc.getAgingReport() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/claims/:id', async (req, res) => {
    try {
      const d = await proc.getClaim(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/claims', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await proc.createClaim(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/claims/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.updateClaim(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/claims/:id/validate', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.validateClaim(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/claims/:id/submit', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.submitClaim(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/claims/:id/adjudicate', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.adjudicateClaim(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/claims/:id/mark-paid', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.markClaimPaid(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Batches ── */
  router.get('/claims/batches/list', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.listBatches(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/claims/batches/:id', async (req, res) => {
    try {
      const d = await proc.getBatch(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/claims/batches', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await proc.createBatch(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/claims/batches/:id/submit', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.submitBatch(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Appeals ── */
  router.get('/claims/appeals/list', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.listAppeals(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/claims/appeals/:id', async (req, res) => {
    try {
      const d = await proc.getAppeal(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/claims/appeals', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await proc.createAppeal(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/claims/appeals/:id/submit', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.submitAppeal(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/claims/appeals/:id/resolve', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.resolveAppeal(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── EOBs ── */
  router.get('/claims/eobs', async (req, res) => {
    try {
      res.json({ success: true, data: await proc.listEOBs(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/claims/eobs/:id', async (req, res) => {
    try {
      const d = await proc.getEOB(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/claims/eobs', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await proc.createEOB(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Health ── */
  router.get('/claims/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await proc.healthCheck() });
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
  ClaimsProcessor,
  DDDClaim,
  DDDClaimBatch,
  DDDClaimAppeal,
  DDDEOB,
  CLAIM_STATUSES,
  CLAIM_TYPES,
  DENIAL_REASONS,
  APPEAL_STATUSES,
  APPEAL_LEVELS,
  SUBMISSION_CHANNELS,
  EOB_TYPES,
  ADJUDICATION_TYPES,
  BUILTIN_CLAIM_TEMPLATES,
  createClaimsProcessorRouter,
};

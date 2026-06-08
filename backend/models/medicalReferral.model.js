/**
 * Medical Referral Model — نموذج الإحالات الطبية
 *
 * Schemas:
 *   MedicalReferral    — الإحالة الطبية
 *   ReferralFollowUp   — متابعة الإحالة
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ═══════════════════════════════════════════════════════════════════════════
// MEDICAL REFERRAL — الإحالة الطبية
// ═══════════════════════════════════════════════════════════════════════════

const MedicalReferralSchema = new Schema(
  {
    referralNumber: {
      type: String,
      unique: true,
      default: function () {
        return (
          'REF-' +
          Date.now().toString(36).toUpperCase() +
          Math.random().toString(36).substring(2, 6).toUpperCase()
        );
      },
    },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    // W621 — branch tenancy denormalization (R4). A referral belongs to its
    // beneficiary's branch; derived in the pre-save hook below. Required so
    // /dashboard/stats aggregates can branch-scope (aggregate() bypasses the
    // tenantScope plugin). Additive/non-breaking; backfill via
    // `npm run backfill:referral-branchid`.
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    referralType: {
      type: String,
      enum: [
        'internal',
        'external_outgoing',
        'external_incoming',
        'emergency',
        'second_opinion',
        'consultation',
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'emergency', 'stat'],
      default: 'routine',
    },
    // Referring provider (from)
    referringProvider: {
      practitioner: { type: Schema.Types.ObjectId, ref: 'User' },
      department: { type: Schema.Types.ObjectId, ref: 'Department' },
      facility: String,
      phone: String,
    },
    // Referred to (destination)
    referredTo: {
      practitioner: { type: Schema.Types.ObjectId, ref: 'User' },
      department: { type: Schema.Types.ObjectId, ref: 'Department' },
      specialty: {
        type: String,
        enum: [
          'neurology',
          'orthopedics',
          'cardiology',
          'pulmonology',
          'gastroenterology',
          'endocrinology',
          'dermatology',
          'ophthalmology',
          'ent',
          'urology',
          'nephrology',
          'hematology',
          'oncology',
          'psychiatry',
          'psychology',
          'pediatrics',
          'geriatrics',
          'physical_therapy',
          'occupational_therapy',
          'speech_therapy',
          'audiology',
          'dentistry',
          'radiology',
          'laboratory',
          'nutrition',
          'social_work',
          'pain_management',
          'general_surgery',
          'plastic_surgery',
          'rheumatology',
          'allergy_immunology',
          'infectious_disease',
          'other',
        ],
      },
      facility: String,
      externalFacility: {
        name: { ar: String, en: String },
        address: String,
        phone: String,
        fax: String,
        email: String,
        licenseNumber: String,
      },
    },
    // Clinical information
    clinicalInfo: {
      reasonForReferral: { ar: String, en: String },
      clinicalHistory: { ar: String, en: String },
      currentDiagnosis: [
        {
          code: String, // ICD-10
          description: { ar: String, en: String },
        },
      ],
      currentMedications: [
        {
          name: String,
          dosage: String,
          frequency: String,
        },
      ],
      relevantFindings: { ar: String, en: String },
      specificQuestions: { ar: String, en: String },
      functionalStatus: String,
    },
    // Service requested
    requestedService: {
      type: {
        type: String,
        enum: ['evaluation', 'treatment', 'procedure', 'investigation', 'opinion'],
      },
      description: { ar: String, en: String },
      estimatedSessions: Number,
    },
    // Insurance & authorization
    insurance: {
      contract: { type: Schema.Types.ObjectId, ref: 'InsuranceContract' },
      preAuthorization: { type: Schema.Types.ObjectId, ref: 'PreAuthorization' },
      membershipNumber: String,
      requiresPreAuth: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: [
        'draft',
        'pending_approval',
        'approved',
        'rejected',
        'sent',
        'accepted',
        'declined',
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
        'expired',
        'returned_to_referrer',
      ],
      default: 'draft',
    },
    statusHistory: [
      {
        status: String,
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
    appointmentDate: Date,
    expiryDate: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days default
      },
    },
    // Response from referred provider
    consultationResponse: {
      receivedDate: Date,
      findings: { ar: String, en: String },
      diagnosis: [
        {
          code: String,
          description: { ar: String, en: String },
        },
      ],
      recommendations: { ar: String, en: String },
      treatmentPlan: { ar: String, en: String },
      followUpNeeded: Boolean,
      followUpDate: Date,
      respondedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    attachments: [
      {
        name: String,
        type: {
          type: String,
          enum: [
            'clinical_report',
            'lab_result',
            'imaging',
            'prescription',
            'referral_letter',
            'response_letter',
            'other',
          ],
        },
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    communicationLog: [
      {
        type: { type: String, enum: ['phone', 'fax', 'email', 'portal', 'in_person'] },
        direction: { type: String, enum: ['inbound', 'outbound'] },
        summary: String,
        date: { type: Date, default: Date.now },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    notes: String,
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

MedicalReferralSchema.index({ beneficiary: 1, status: 1 });
// W621 — branch-scoped dashboard stats (R4)
MedicalReferralSchema.index({ branchId: 1, status: 1 });
// W621 — denormalize branchId from the (required) beneficiary. async style.
MedicalReferralSchema.pre('save', async function deriveBranchFromBeneficiary() {
  if (this.branchId || !this.beneficiary) return;
  try {
    const Beneficiary = mongoose.model('Beneficiary');
    const ben = await Beneficiary.findById(this.beneficiary).select('branchId').lean();
    if (ben && ben.branchId) this.branchId = ben.branchId;
  } catch {
    /* model unavailable — leave unset (safe) */
  }
});
MedicalReferralSchema.index({ 'referringProvider.practitioner': 1 });
MedicalReferralSchema.index({ 'referredTo.practitioner': 1 });
MedicalReferralSchema.index({ status: 1, createdAt: -1 });
MedicalReferralSchema.index({ referralType: 1 });

// ═══════════════════════════════════════════════════════════════════════════
// REFERRAL FOLLOW-UP — متابعة الإحالة
// ═══════════════════════════════════════════════════════════════════════════

const ReferralFollowUpSchema = new Schema(
  {
    referral: { type: Schema.Types.ObjectId, ref: 'MedicalReferral', required: true },
    followUpNumber: { type: Number, required: true },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: [
        'check_status',
        'response_received',
        'appointment_set',
        'treatment_update',
        'completion',
        'escalation',
      ],
      required: true,
    },
    contactedVia: {
      type: String,
      enum: ['phone', 'email', 'fax', 'portal', 'in_person'],
    },
    outcome: { ar: String, en: String },
    nextFollowUpDate: Date,
    actionRequired: String,
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ReferralFollowUpSchema.index({ referral: 1, date: -1 });

// ─── Unified-core producer (W1001) ───────────────────────────────────────────
// Emit medical_referral.completed exactly once when a beneficiary's medical
// referral reaches 'completed' (the consultation/treatment loop concluded). The
// flag is computed in an async pre('save') to match the existing async hook
// style on this schema (W483 gate); the event publishes in post('save').
MedicalReferralSchema.pre('save', async function markCompletedTransition() {
  this.$__referralCompletedNow =
    this.status === 'completed' && (this.isNew || this.isModified('status'));
});

MedicalReferralSchema.post('save', async function publishReferralCompleted(doc) {
  try {
    if (!this.$__referralCompletedNow) return;
    if (!doc.beneficiary) return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    integrationBus.publish('medical-referrals', 'medical_referral.completed', {
      referralId: String(doc._id),
      referralNumber: doc.referralNumber || null,
      beneficiaryId: String(doc.beneficiary),
      branchId: doc.branchId ? String(doc.branchId) : null,
      referralType: doc.referralType || null,
      specialty: (doc.referredTo && doc.referredTo.specialty) || null,
      completedAt: doc.updatedAt || new Date(),
    });
  } catch (_err) {
    // Producer must never break the save path.
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  MedicalReferral:
    mongoose.models.MedicalReferral || mongoose.model('MedicalReferral', MedicalReferralSchema),
  ReferralFollowUp:
    mongoose.models.ReferralFollowUp || mongoose.model('ReferralFollowUp', ReferralFollowUpSchema),
};

/**
 * نموذج الشكاوى والمقترحات الموحّد
 * Unified Complaint Model — employees, students, customers, suggestions
 */
const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  content: { type: String, required: true },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  respondedAt: { type: Date, default: Date.now },
});

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, unique: true },
    type: {
      type: String,
      required: true,
      enum: ['complaint', 'suggestion', 'grievance', 'feedback'],
      default: 'complaint',
    },
    source: {
      type: String,
      required: true,
      enum: ['employee', 'student', 'customer', 'parent', 'other'],
    },
    category: {
      type: String,
      enum: [
        'administrative',
        'technical',
        'financial',
        'service',
        'hr',
        'safety',
        'academic',
        'other',
      ],
      default: 'other',
    },
    subject: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, required: true, maxlength: 5000 },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['new', 'under_review', 'in_progress', 'escalated', 'resolved', 'closed', 'rejected'],
      default: 'new',
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submitterName: { type: String },
    submitterEmail: { type: String },
    submitterPhone: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: String },
    responses: [responseSchema],
    resolution: { type: String },
    resolvedAt: { type: Date },
    rating: { type: Number, min: 1, max: 5 },
    isAnonymous: { type: Boolean, default: false },
    attachments: [{ name: String, url: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ─── W465 — CRPD reasonable adjustments + advocate linkage ─────────
    // CRPD Article 13 (Access to justice) + Article 21 (Freedom of
    // expression) require that complaint mechanisms be accessible to
    // persons with disabilities. The reasonableAdjustments[] array
    // documents what accommodations were granted for THIS complaint's
    // submission + handling.
    reasonableAdjustments: [
      {
        type: { type: String, maxlength: 100 }, // e.g. 'aac_supported', 'audio_recording', 'sign_language'
        description: { type: String, maxlength: 500 },
        grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        grantedAt: { type: Date, default: Date.now },
      },
    ],

    // Independent Advocate involvement (per CRPD Art. 12 — required for
    // complaints by W461 requiresAdvocate doctrine)
    advocateInvolved: { type: Boolean, default: false },
    advocateUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    advocateNotifiedAt: { type: Date },

    // Voice log linkage — complaint may originate from a voice entry
    // (W460 entryKind='complaint' → triggers actionTaken='complaint_opened')
    originVoiceLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'BeneficiaryVoiceLog' },

    // Beneficiary linkage (when source='student' or 'parent' and the
    // complaint is about a specific beneficiary's care)
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
  },
  { timestamps: true }
);

// Auto-generate complaint ID
complaintSchema.pre('save', async function () {
  if (!this.complaintId) {
    const count = await mongoose.model('Complaint').countDocuments();
    const prefix = this.type === 'suggestion' ? 'SUG' : 'CMP';
    this.complaintId = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
});

complaintSchema.index({ source: 1, status: 1 });
complaintSchema.index({ type: 1, priority: 1 });
complaintSchema.index({ assignedTo: 1 });
complaintSchema.index({ createdAt: -1 });
// W465 — fast lookup by beneficiary + advocate-required filter
complaintSchema.index({ beneficiaryId: 1, status: 1 });
complaintSchema.index({ advocateInvolved: 1, status: 1 });

// W465 Wave-18 invariant — when a complaint is about a beneficiary
// (beneficiaryId set OR source in {student, parent}) and goes beyond
// 'new' status, advocate involvement is REQUIRED per CRPD Art. 12 +
// W461 requiresAdvocate doctrine. Enforced as soft-validation: warns
// in non-finalized states, blocks on final closure without advocate.
complaintSchema.pre('save', function (next) {
  const beneficiaryComplaint = this.beneficiaryId || ['student', 'parent'].includes(this.source);
  const closingWithoutAdvocate =
    beneficiaryComplaint &&
    ['resolved', 'closed'].includes(this.status) &&
    !this.advocateInvolved;
  if (closingWithoutAdvocate) {
    return next(
      new Error(
        'Complaint: beneficiary-related complaint cannot be resolved/closed without advocateInvolved=true (CRPD Article 12 — W464)'
      )
    );
  }
  next();
});

module.exports = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);

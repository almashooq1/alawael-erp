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

    // ─── W613 — branch tenancy denormalization (R4) ───────────────────
    // Complaint is multi-source (employee / student / customer), so its
    // branch is the branch of WHOEVER filed it (set at the route from
    // req.branchScope), with a pre-save fallback to the linked
    // beneficiary's branch. Required so /stats aggregates + the list
    // filter can branch-scope (aggregate() bypasses the tenantScope
    // plugin; the plugin also couldn't scope a model with no branchId).
    // Optional/defaulted → additive, non-breaking on existing docs;
    // backfill via `npm run backfill:complaint-branchid`.
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
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
// W613 — branch-scoped stats/list (R4)
complaintSchema.index({ branchId: 1, status: 1 });

// W613 — denormalize branchId from the linked beneficiary when the route
// didn't set it (e.g. a beneficiary-linked complaint created outside the
// HTTP path). async to match the two sibling pre-save hooks (W483 — mixed
// async/callback dispatch silently breaks the chain).
complaintSchema.pre('save', async function deriveBranchFromBeneficiary() {
  if (this.branchId || !this.beneficiaryId) return;
  try {
    const Beneficiary = mongoose.model('Beneficiary');
    const ben = await Beneficiary.findById(this.beneficiaryId).select('branchId').lean();
    if (ben && ben.branchId) this.branchId = ben.branchId;
  } catch {
    /* model unavailable / lookup failed — leave branchId unset (safe) */
  }
});

// W465 Wave-18 invariant — when a complaint is about a beneficiary
// (beneficiaryId set OR source in {student, parent}) and goes beyond
// 'new' status, advocate involvement is REQUIRED per CRPD Art. 12 +
// W461 requiresAdvocate doctrine. Enforced as soft-validation: warns
// in non-finalized states, blocks on final closure without advocate.
// W483: converted from callback-style to async style — Mongoose was
// dispatching this as a Promise hook because the SIBLING pre-save at
// line 100 is async, and Kareem's mixed-style dispatch left `next`
// undefined here, throwing TypeError on every Complaint.create. The
// blast radius was every parent-portal-v2 + complaint-creation route
// (CI parent-portal-v2.api.test.js was RED on main as of W477+).
complaintSchema.pre('save', async function () {
  const beneficiaryComplaint = this.beneficiaryId || ['student', 'parent'].includes(this.source);
  const closingWithoutAdvocate =
    beneficiaryComplaint && ['resolved', 'closed'].includes(this.status) && !this.advocateInvolved;
  if (closingWithoutAdvocate) {
    throw new Error(
      'Complaint: beneficiary-related complaint cannot be resolved/closed without advocateInvolved=true (CRPD Article 12 — W464)'
    );
  }
});

// ── W1136 — beneficiary-linked complaint resolved → unified core timeline ──
// Complaints resolve via TWO writer paths: doc.save() transitions and the
// PUT /:id route's findOneAndUpdate (returnDocument:'after'). Both producer
// hooks emit the same contract event; lazy require + try/catch so the bus
// can never block or fail a complaint write. async style per W483.
function emitComplaintResolved(doc, resolvedAt) {
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('complaint', 'complaint.resolved', {
      complaintId: doc._id,
      ...(doc.complaintId ? { complaintNumber: doc.complaintId } : {}),
      beneficiaryId: doc.beneficiaryId,
      ...(doc.branchId ? { branchId: doc.branchId } : {}),
      type: doc.type,
      priority: doc.priority,
      source: doc.source,
      advocateInvolved: Boolean(doc.advocateInvolved),
      resolvedAt: resolvedAt || doc.resolvedAt || new Date(),
    });
  } catch (err) {
    void err; // bus unavailable — never block the complaint write
  }
}

complaintSchema.pre('save', async function flagComplaintResolved() {
  this.$__complaintResolved =
    this.isModified('status') && this.status === 'resolved' && Boolean(this.beneficiaryId);
});

complaintSchema.post('save', function onComplaintSaved(doc) {
  if (!doc.$__complaintResolved) return;
  doc.$__complaintResolved = false;
  emitComplaintResolved(doc);
});

complaintSchema.post('findOneAndUpdate', async function onComplaintUpdated(doc) {
  if (!doc || !doc.beneficiaryId) return;
  const update = this.getUpdate() || {};
  const set = update.$set || update;
  if (set.status !== 'resolved') return;
  emitComplaintResolved(doc, set.resolvedAt);
});

module.exports = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);

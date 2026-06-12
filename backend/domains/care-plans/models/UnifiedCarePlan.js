/**
 * UnifiedCarePlan Model — خطة الرعاية الموحدة
 *
 * خطة علاجية شاملة مرتبطة بالمستفيد والحلقة العلاجية.
 * تدعم: تعليمية، علاجية، مهارات حياتية، سلوكية، متعددة التخصصات.
 *
 * @module domains/care-plans/models/UnifiedCarePlan
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

// ─── W1252: integrity layer (ADR-040 option (b) step 1, owner-approved) ─────
// Lifted from CarePlanVersion (the W41-51 clinical-legal document) so that
// UnifiedCarePlan — the model the UI actually writes — carries the same
// compliance guarantees: an append-only hash-chained signature trail + a
// sha256 evidence lock over the clinical body. Signature-hash payload format
// is IDENTICAL to CarePlanVersion.computeSignatureHash for cross-model
// verifiability during the staged migration.
const SignatureSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true, maxlength: 100 },
    action: { type: String, required: true, maxlength: 100 },
    signedAt: { type: Date, required: true, default: Date.now },
    nafathSignatureId: { type: String, default: null, maxlength: 200 },
    prevHash: { type: String, default: null, maxlength: 128 },
    hash: { type: String, required: true, maxlength: 128 },
  },
  { _id: false }
);

// W1254 — same shape as CarePlanVersion.FamilyNotificationSchema (field-for-
// field) so the W45 retry worker's attempt logic is shared verbatim.
const FamilyNotificationSchema = new mongoose.Schema(
  {
    attemptId: { type: String, required: true, maxlength: 100 },
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'portal', 'manual'],
      required: true,
    },
    attemptedAt: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'read', 'failed', 'manual_override'],
      required: true,
    },
    retries: { type: Number, default: 0, min: 0, max: 5 },
    failureReason: { type: String, default: null, maxlength: 500 },
    acknowledgedAt: { type: Date, default: null },
  },
  { _id: false }
);

const goalRefSchema = new mongoose.Schema(
  {
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticGoal' },
    title: String,
    type: {
      type: String,
      enum: [
        'academic',
        'behavioral',
        'communication',
        'motor',
        'speech',
        'social',
        'life_skill',
        'cognitive',
        'sensory',
        'vocational',
        'other',
      ],
    },
    baseline: String,
    target: String,
    criteria: String,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'achieved', 'discontinued', 'modified'],
      default: 'pending',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    notes: String,
  },
  { _id: true }
);

const interventionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    title_ar: String,
    description: String,
    domain: {
      type: String,
      enum: [
        'speech_therapy',
        'occupational_therapy',
        'physical_therapy',
        'behavioral_therapy',
        'psychological',
        'educational',
        'social_work',
        'nursing',
        'vocational',
        'recreational',
        'assistive_technology',
        'family_training',
        'other',
      ],
    },
    frequency: String,
    duration: String,
    responsibleId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    responsibleRole: String,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['planned', 'active', 'paused', 'completed', 'cancelled'],
      default: 'planned',
    },
    evidence: String,
    notes: String,
  },
  { _id: true }
);

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    name_ar: String,
    specialistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    specialistRole: String,
    assessments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalAssessment' }],
    goals: [goalRefSchema],
    interventions: [interventionSchema],
    frequency: String,
    notes: String,
  },
  { _id: true }
);

const reviewSchema = new mongoose.Schema(
  {
    reviewDate: { type: Date, required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewType: {
      type: String,
      enum: ['periodic', 'progress', 'modification', 'mdt', 'discharge'],
    },
    findings: String,
    modifications: [String],
    nextReviewDate: Date,
    decision: {
      type: String,
      enum: ['continue', 'modify', 'intensify', 'reduce', 'discharge'],
    },
    attendees: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: String }],
  },
  { _id: true }
);

const unifiedCarePlanSchema = new mongoose.Schema(
  {
    // ── Core Links ─────────────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      required: true,
      index: true,
    },

    // ── Identity ───────────────────────────────────────────────────────
    planNumber: { type: String, unique: true, sparse: true },
    title: String,
    title_ar: String,

    // ── Type & Status ──────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['comprehensive', 'focused', 'iep', 'irp', 'crisis', 'maintenance', 'transition'],
      default: 'comprehensive',
    },
    status: {
      type: String,
      enum: [
        'draft',
        'pending_approval',
        'active',
        'under_review',
        'modified',
        'completed',
        'archived',
      ],
      default: 'draft',
      index: true,
    },

    // ── Timeline ───────────────────────────────────────────────────────
    startDate: { type: Date, required: true },
    endDate: Date,
    reviewDate: Date,
    nextReviewDate: Date,
    reviewCycle: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'custom'],
      default: 'monthly',
    },

    // ── Plan Domains (أقسام الخطة) ─────────────────────────────────
    educational: {
      domains: {
        academic: sectionSchema,
        classroom: sectionSchema,
        communication: sectionSchema,
      },
    },
    therapeutic: {
      domains: {
        speech: sectionSchema,
        occupational: sectionSchema,
        physical: sectionSchema,
        behavioral: sectionSchema,
        psychological: sectionSchema,
      },
    },
    lifeSkills: {
      domains: {
        selfCare: sectionSchema,
        homeSkills: sectionSchema,
        social: sectionSchema,
        transport: sectionSchema,
        financial: sectionSchema,
        vocational: sectionSchema,
      },
    },

    // ── Global Goals (أهداف شاملة) ─────────────────────────────────
    globalGoals: [goalRefSchema],

    // ── Global Interventions ────────────────────────────────────────
    globalInterventions: [interventionSchema],

    // ── Family Component ────────────────────────────────────────────
    familyComponent: {
      homeProgram: String,
      parentTraining: [String],
      familyGoals: [String],
      communicationPlan: String,
      nextFamilyMeeting: Date,
    },

    // ── Reviews ─────────────────────────────────────────────────────
    reviews: [reviewSchema],

    // ── Approval Workflow ────────────────────────────────────────────
    approvals: [
      {
        role: String,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        date: Date,
        comments: String,
      },
    ],
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,

    // ── Integrity layer (W1252 — lifted from CarePlanVersion) ────────
    signatureChain: { type: [SignatureSchema], default: () => [] },
    evidenceHash: { type: String, default: null, maxlength: 128 },

    // ── Family notifications (W1254 — lifted from CarePlanVersion so the
    // W45 family-retry worker can serve UI-authored plans) ───────────
    familyNotifications: { type: [FamilyNotificationSchema], default: () => [] },

    // ── Version Control ─────────────────────────────────────────────
    version: { type: Number, default: 1 },
    previousVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'UnifiedCarePlan' },

    // ── Multi-Tenancy & Audit ───────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    tags: [String],
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'unified_care_plans',
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────

unifiedCarePlanSchema.index({ beneficiaryId: 1, status: 1 });
unifiedCarePlanSchema.index({ episodeId: 1, status: 1 });
unifiedCarePlanSchema.index({ status: 1, reviewDate: 1 });
unifiedCarePlanSchema.index({ nextReviewDate: 1, status: 1 });
unifiedCarePlanSchema.index({ createdAt: -1 });

// ─── Virtuals ───────────────────────────────────────────────────────────────

unifiedCarePlanSchema.virtual('overallProgress').get(function () {
  const allGoals = [...(this.globalGoals || [])];
  // Collect goals from all sections
  const gatherSection = domainGroup => {
    if (!domainGroup?.domains) return;
    Object.values(domainGroup.domains).forEach(section => {
      if (section?.goals) allGoals.push(...section.goals);
    });
  };
  gatherSection(this.educational);
  gatherSection(this.therapeutic);
  gatherSection(this.lifeSkills);

  if (allGoals.length === 0) return 0;
  const totalProgress = allGoals.reduce((sum, g) => sum + (g.progress || 0), 0);
  return Math.round(totalProgress / allGoals.length);
});

unifiedCarePlanSchema.virtual('isOverdueForReview').get(function () {
  if (!this.nextReviewDate) return false;
  return new Date() > new Date(this.nextReviewDate);
});

unifiedCarePlanSchema.virtual('daysUntilReview').get(function () {
  if (!this.nextReviewDate) return null;
  const diff = new Date(this.nextReviewDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ─── Pre-save ───────────────────────────────────────────────────────────────

unifiedCarePlanSchema.pre('save', async function () {
  if (!this.planNumber && this.isNew) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.planNumber = `CP-${dateStr}-${random}`;
  }
});

// ─── W1252: evidenceHash immutability (mirrors CarePlanVersion invariant 6:
// "evidenceHash, once set on approval, cannot change") ───────────────────────
unifiedCarePlanSchema.pre('save', async function () {
  if (!this.isNew && this.isModified('evidenceHash')) {
    const prior = await this.constructor.findById(this._id).select('evidenceHash').lean();
    if (prior && prior.evidenceHash && prior.evidenceHash !== this.evidenceHash) {
      throw new Error('evidenceHash is immutable once set (W1252 integrity invariant)');
    }
  }
});

// ─── W1252: integrity statics + methods ─────────────────────────────────────

/** Deterministic deep canonical JSON (recursively sorted object keys). */
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

/**
 * The clinical substance the evidence lock covers — plan content only,
 * excluding volatile workflow/audit fields (status, approvals, timestamps,
 * the chain itself).
 */
unifiedCarePlanSchema.statics.extractClinicalBody = function (plan) {
  const src = typeof plan.toObject === 'function' ? plan.toObject() : plan;
  return {
    type: src.type ?? null,
    startDate: src.startDate ?? null,
    endDate: src.endDate ?? null,
    reviewCycle: src.reviewCycle ?? null,
    educational: src.educational ?? null,
    therapeutic: src.therapeutic ?? null,
    lifeSkills: src.lifeSkills ?? null,
    globalGoals: src.globalGoals ?? [],
    globalInterventions: src.globalInterventions ?? [],
    familyComponent: src.familyComponent ?? null,
  };
};

unifiedCarePlanSchema.statics.computeEvidenceHash = function (planBody) {
  return crypto.createHash('sha256').update(canonicalJson(planBody)).digest('hex');
};

// IDENTICAL payload format to CarePlanVersion.computeSignatureHash —
// cross-model verifiability during the staged ADR-040 (b) migration.
unifiedCarePlanSchema.statics.computeSignatureHash = function ({
  userId,
  role,
  action,
  signedAt,
  prevHash,
}) {
  const payload = `${userId}|${role}|${action}|${
    signedAt instanceof Date ? signedAt.toISOString() : signedAt
  }|${prevHash || ''}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/** Append a hash-chained signature entry. Returns the appended entry. */
unifiedCarePlanSchema.methods.appendSignature = function ({
  userId,
  role,
  action,
  signedAt = new Date(),
  nafathSignatureId = null,
}) {
  const chain = this.signatureChain || [];
  const prevHash = chain.length > 0 ? chain[chain.length - 1].hash : null;
  const hash = this.constructor.computeSignatureHash({ userId, role, action, signedAt, prevHash });
  const entry = { userId, role, action, signedAt, nafathSignatureId, prevHash, hash };
  this.signatureChain.push(entry);
  return entry;
};

/** Walk the chain re-computing every link. */
unifiedCarePlanSchema.methods.verifySignatureChain = function () {
  const chain = this.signatureChain || [];
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    const expectedPrev = i === 0 ? null : chain[i - 1].hash;
    if ((e.prevHash || null) !== expectedPrev) return { ok: false, brokenAt: i };
    const recomputed = this.constructor.computeSignatureHash({
      userId: e.userId,
      role: e.role,
      action: e.action,
      signedAt: e.signedAt,
      prevHash: e.prevHash,
    });
    if (recomputed !== e.hash) return { ok: false, brokenAt: i };
  }
  return { ok: true, brokenAt: null };
};

/** Lock the clinical body (idempotent; immutability enforced by pre-save). */
unifiedCarePlanSchema.methods.sealEvidence = function () {
  if (this.evidenceHash) return this.evidenceHash;
  this.evidenceHash = this.constructor.computeEvidenceHash(
    this.constructor.extractClinicalBody(this)
  );
  return this.evidenceHash;
};

/** Recompute the body hash and compare against the stored lock. */
unifiedCarePlanSchema.methods.verifyEvidence = function () {
  if (!this.evidenceHash) return { ok: false, reason: 'no evidenceHash set' };
  const recomputed = this.constructor.computeEvidenceHash(
    this.constructor.extractClinicalBody(this)
  );
  return recomputed === this.evidenceHash
    ? { ok: true, reason: null }
    : { ok: false, reason: 'clinical body diverged from sealed evidenceHash' };
};

// ─── Static Methods ─────────────────────────────────────────────────────────

unifiedCarePlanSchema.statics.getActiveForEpisode = function (episodeId) {
  return this.findOne({ episodeId, status: 'active', isDeleted: { $ne: true } });
};

unifiedCarePlanSchema.statics.getOverdueReviews = function (branchId) {
  const match = {
    isDeleted: { $ne: true },
    status: { $in: ['active', 'under_review'] },
    nextReviewDate: { $lt: new Date() },
  };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  return this.find(match)
    .populate('beneficiaryId', 'firstName lastName fullNameArabic mrn')
    .sort({ nextReviewDate: 1 })
    .lean({ virtuals: true });
};

const UnifiedCarePlan =
  mongoose.models.UnifiedCarePlan || mongoose.model('UnifiedCarePlan', unifiedCarePlanSchema);

module.exports = { UnifiedCarePlan, unifiedCarePlanSchema };

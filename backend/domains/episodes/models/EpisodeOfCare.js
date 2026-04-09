/**
 * EpisodeOfCare Model — الحلقة العلاجية الموحدة
 *
 * الكيان المركزي الذي يربط:
 *  - المستفيد → التقييمات → خطط الرعاية → الجلسات → الأهداف → المقاييس
 *
 * كل حلقة علاجية تمثل مسار تأهيلي واحد من القبول حتى الخروج.
 * المستفيد يمكن أن يكون لديه عدة حلقات عبر الزمن (طولياً).
 *
 * @module domains/episodes/models/EpisodeOfCare
 */

const mongoose = require('mongoose');

// ─── Sub-Schemas ──────────────────────────────────────────────────────────────

const teamMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: [
        'lead_therapist',
        'speech_therapist',
        'occupational_therapist',
        'physical_therapist',
        'psychologist',
        'behavioral_therapist',
        'social_worker',
        'special_educator',
        'nurse',
        'physician',
        'coordinator',
        'supervisor',
      ],
      required: true,
    },
    specialty: String,
    assignedAt: { type: Date, default: Date.now },
    removedAt: Date,
    isActive: { type: Boolean, default: true },
    isPrimary: { type: Boolean, default: false },
    weeklyHours: Number,
    notes: String,
  },
  { _id: true }
);

const phaseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: [
        'referral',
        'intake',
        'triage',
        'initial_assessment',
        'mdt_review',
        'care_plan_approval',
        'active_treatment',
        'reassessment',
        'outcome_review',
        'discharge_planning',
        'discharge',
        'post_discharge_followup',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped'],
      default: 'pending',
    },
    startedAt: Date,
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    duration: Number, // in days
    notes: String,
    requiredApprovals: [
      {
        role: String,
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        status: { type: String, enum: ['pending', 'approved', 'rejected'] },
        comments: String,
      },
    ],
    blockers: [
      {
        description: String,
        raisedAt: { type: Date, default: Date.now },
        resolvedAt: Date,
      },
    ],
  },
  { _id: true }
);

const diagnosisSchema = new mongoose.Schema(
  {
    code: String, // ICD-10 / ICD-11
    system: {
      type: String,
      enum: ['ICD-10', 'ICD-11', 'ICF', 'DSM-5', 'custom'],
      default: 'ICD-10',
    },
    description: String,
    description_ar: String,
    isPrimary: { type: Boolean, default: false },
    diagnosedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    diagnosedAt: Date,
    notes: String,
  },
  { _id: true }
);

const outcomeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'goal_achievement',
        'functional_improvement',
        'satisfaction',
        'quality_of_life',
        'custom',
      ],
    },
    measureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Measure' },
    baselineValue: Number,
    targetValue: Number,
    actualValue: Number,
    achievementPercentage: Number,
    evaluatedAt: Date,
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { _id: true }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const episodeOfCareSchema = new mongoose.Schema(
  {
    // ── Identity ───────────────────────────────────────────────────────
    episodeNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    // ── Beneficiary Link (الرابط المركزي) ──────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },

    // ── Episode Type & Status ──────────────────────────────────────────
    type: {
      type: String,
      enum: [
        'initial',
        'continuation',
        'readmission',
        'intensive',
        'maintenance',
        'crisis',
        'tele_rehab',
        'home_based',
        'community',
      ],
      default: 'initial',
    },
    status: {
      type: String,
      enum: ['planned', 'active', 'on_hold', 'suspended', 'completed', 'cancelled', 'transferred'],
      default: 'planned',
      index: true,
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'emergency'],
      default: 'routine',
    },

    // ── Timeline ───────────────────────────────────────────────────────
    startDate: { type: Date, required: true },
    expectedEndDate: Date,
    actualEndDate: Date,
    suspendedAt: Date,
    resumedAt: Date,

    // ── Phases (مراحل الرحلة العلاجية) ─────────────────────────────
    currentPhase: {
      type: String,
      enum: [
        'referral',
        'intake',
        'triage',
        'initial_assessment',
        'mdt_review',
        'care_plan_approval',
        'active_treatment',
        'reassessment',
        'outcome_review',
        'discharge_planning',
        'discharge',
        'post_discharge_followup',
      ],
      default: 'referral',
    },
    phases: [phaseSchema],

    // ── Clinical Context ───────────────────────────────────────────────
    diagnoses: [diagnosisSchema],
    primaryDiagnosis: String,
    icfProfile: {
      bodyFunctions: [String],
      bodyStructures: [String],
      activitiesParticipation: [String],
      environmentalFactors: [String],
      personalFactors: [String],
    },
    clinicalNotes: String,
    precautions: [String],
    contraindications: [String],

    // ── Care Team (الفريق العلاجي) ─────────────────────────────────
    careTeam: [teamMemberSchema],
    leadTherapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // ── Service Configuration ──────────────────────────────────────────
    serviceType: {
      type: String,
      enum: ['individual', 'group', 'mixed'],
      default: 'individual',
    },
    serviceModality: {
      type: String,
      enum: ['in_person', 'tele_rehab', 'home_visit', 'community', 'hybrid'],
      default: 'in_person',
    },
    sessionsPerWeek: { type: Number, min: 0, max: 30 },
    sessionDurationMinutes: { type: Number, min: 15, max: 240, default: 45 },
    expectedTotalSessions: Number,
    completedSessions: { type: Number, default: 0 },

    // ── Linked Entities (روابط الكيانات) ────────────────────────────
    assessmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalAssessment' }],
    carePlanIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UnifiedCarePlan' }],
    sessionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalSession' }],
    goalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticGoal' }],
    measureApplicationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MeasureApplication' }],

    // ── Active Care Plan ───────────────────────────────────────────────
    activeCarePlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UnifiedCarePlan',
    },

    // ── Outcomes ───────────────────────────────────────────────────────
    outcomes: [outcomeSchema],
    overallOutcome: {
      type: String,
      enum: ['improved', 'maintained', 'declined', 'not_assessed'],
    },
    dischargeReason: {
      type: String,
      enum: [
        'goals_achieved',
        'maximum_benefit',
        'family_request',
        'non_compliance',
        'transferred',
        'relocated',
        'funding_exhausted',
        'medical_reason',
        'other',
      ],
    },
    dischargeSummary: String,
    dischargedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Referral Context ───────────────────────────────────────────────
    referralSource: {
      type: String,
      enum: [
        'self',
        'physician',
        'hospital',
        'school',
        'social_services',
        'government',
        'ngo',
        'internal',
        'other',
      ],
    },
    referredBy: String,
    referralDocument: String,
    referralNotes: String,

    // ── Multi-Tenancy ──────────────────────────────────────────────────
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
    },

    // ── Audit ──────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,

    // ── Tags & Notes ───────────────────────────────────────────────────
    tags: [String],
    internalNotes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'episodes_of_care',
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────

episodeOfCareSchema.index({ beneficiaryId: 1, status: 1 });
episodeOfCareSchema.index({ beneficiaryId: 1, startDate: -1 });
episodeOfCareSchema.index({ status: 1, currentPhase: 1 });
episodeOfCareSchema.index({ leadTherapistId: 1, status: 1 });
episodeOfCareSchema.index({ branchId: 1, status: 1 });
episodeOfCareSchema.index({ 'careTeam.userId': 1 });
episodeOfCareSchema.index({ startDate: -1 });
episodeOfCareSchema.index({ createdAt: -1 });

// ─── Virtuals ───────────────────────────────────────────────────────────────

episodeOfCareSchema.virtual('durationDays').get(function () {
  const end = this.actualEndDate || new Date();
  const start = this.startDate;
  if (!start) return 0;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
});

episodeOfCareSchema.virtual('completionPercentage').get(function () {
  if (!this.expectedTotalSessions || this.expectedTotalSessions === 0) return 0;
  return Math.round((this.completedSessions / this.expectedTotalSessions) * 100);
});

episodeOfCareSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

episodeOfCareSchema.virtual('activeCareTeam').get(function () {
  if (!this.careTeam) return [];
  return this.careTeam.filter(m => m.isActive);
});

episodeOfCareSchema.virtual('phaseProgress').get(function () {
  if (!this.phases || this.phases.length === 0) return 0;
  const completed = this.phases.filter(p => p.status === 'completed').length;
  return Math.round((completed / this.phases.length) * 100);
});

// Virtual populate
episodeOfCareSchema.virtual('beneficiary', {
  ref: 'Beneficiary',
  localField: 'beneficiaryId',
  foreignField: '_id',
  justOne: true,
});

episodeOfCareSchema.virtual('timelineEvents', {
  ref: 'CareTimeline',
  localField: '_id',
  foreignField: 'episodeId',
  options: { sort: { occurredAt: -1 } },
});

// ─── Pre-save Middleware ─────────────────────────────────────────────────────

episodeOfCareSchema.pre('save', function (next) {
  // Auto-generate episode number
  if (!this.episodeNumber && this.isNew) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.episodeNumber = `EP-${dateStr}-${random}`;
  }

  // Ensure lead therapist is in care team
  if (this.leadTherapistId && this.careTeam) {
    const leadInTeam = this.careTeam.some(
      m => m.userId?.toString() === this.leadTherapistId?.toString() && m.isActive
    );
    if (!leadInTeam) {
      this.careTeam.push({
        userId: this.leadTherapistId,
        role: 'lead_therapist',
        isPrimary: true,
        assignedAt: new Date(),
      });
    }
  }

  // Initialize default phases if empty
  if (this.isNew && (!this.phases || this.phases.length === 0)) {
    this.phases = [
      { name: 'referral', status: 'completed', startedAt: new Date(), completedAt: new Date() },
      { name: 'intake', status: 'pending' },
      { name: 'triage', status: 'pending' },
      { name: 'initial_assessment', status: 'pending' },
      { name: 'mdt_review', status: 'pending' },
      { name: 'care_plan_approval', status: 'pending' },
      { name: 'active_treatment', status: 'pending' },
      { name: 'reassessment', status: 'pending' },
      { name: 'outcome_review', status: 'pending' },
      { name: 'discharge_planning', status: 'pending' },
      { name: 'discharge', status: 'pending' },
    ];
  }

  next();
});

// ─── Instance Methods ───────────────────────────────────────────────────────

episodeOfCareSchema.methods.advancePhase = function (completedBy) {
  const currentPhaseIndex = this.phases.findIndex(p => p.name === this.currentPhase);
  if (currentPhaseIndex < 0) return this;

  // Complete current phase
  this.phases[currentPhaseIndex].status = 'completed';
  this.phases[currentPhaseIndex].completedAt = new Date();
  this.phases[currentPhaseIndex].completedBy = completedBy;

  // Move to next
  const nextIndex = currentPhaseIndex + 1;
  if (nextIndex < this.phases.length) {
    this.phases[nextIndex].status = 'in_progress';
    this.phases[nextIndex].startedAt = new Date();
    this.currentPhase = this.phases[nextIndex].name;
  }

  return this.save();
};

episodeOfCareSchema.methods.addTeamMember = function (member) {
  // Check if already in team
  const existing = this.careTeam.find(
    m => m.userId?.toString() === member.userId?.toString() && m.isActive
  );
  if (existing) return this;

  this.careTeam.push({
    ...member,
    assignedAt: new Date(),
    isActive: true,
  });
  return this.save();
};

episodeOfCareSchema.methods.removeTeamMember = function (userId) {
  const member = this.careTeam.find(m => m.userId?.toString() === userId?.toString() && m.isActive);
  if (member) {
    member.isActive = false;
    member.removedAt = new Date();
  }
  return this.save();
};

episodeOfCareSchema.methods.suspend = function (reason, userId) {
  this.status = 'on_hold';
  this.suspendedAt = new Date();
  this.internalNotes =
    (this.internalNotes || '') + `\n[${new Date().toISOString()}] Suspended: ${reason}`;
  this.lastModifiedBy = userId;
  return this.save();
};

episodeOfCareSchema.methods.resume = function (userId) {
  this.status = 'active';
  this.resumedAt = new Date();
  this.lastModifiedBy = userId;
  return this.save();
};

episodeOfCareSchema.methods.discharge = function ({ reason, summary, outcomes, dischargedBy }) {
  this.status = 'completed';
  this.actualEndDate = new Date();
  this.dischargeReason = reason;
  this.dischargeSummary = summary;
  if (outcomes) this.outcomes = outcomes;
  this.dischargedBy = dischargedBy;
  this.currentPhase = 'discharge';

  // Complete discharge phase
  const dischargePhase = this.phases.find(p => p.name === 'discharge');
  if (dischargePhase) {
    dischargePhase.status = 'completed';
    dischargePhase.completedAt = new Date();
    dischargePhase.completedBy = dischargedBy;
  }

  return this.save();
};

episodeOfCareSchema.methods.getSummary = function () {
  return {
    id: this._id,
    episodeNumber: this.episodeNumber,
    beneficiaryId: this.beneficiaryId,
    type: this.type,
    status: this.status,
    currentPhase: this.currentPhase,
    startDate: this.startDate,
    durationDays: this.durationDays,
    completionPercentage: this.completionPercentage,
    phaseProgress: this.phaseProgress,
    teamSize: this.activeCareTeam?.length || 0,
    completedSessions: this.completedSessions,
    expectedTotalSessions: this.expectedTotalSessions,
  };
};

// ─── Static Methods ─────────────────────────────────────────────────────────

episodeOfCareSchema.statics.getActiveForBeneficiary = function (beneficiaryId) {
  return this.findOne({
    beneficiaryId,
    status: 'active',
    isDeleted: { $ne: true },
  }).sort({ startDate: -1 });
};

episodeOfCareSchema.statics.getStatistics = async function (branchId) {
  const match = { isDeleted: { $ne: true } };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  const [stats] = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        onHold: { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        avgDuration: {
          $avg: { $subtract: [{ $ifNull: ['$actualEndDate', new Date()] }, '$startDate'] },
        },
      },
    },
  ]);

  const byPhase = await this.aggregate([
    { $match: { ...match, status: 'active' } },
    { $group: { _id: '$currentPhase', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const byType = await this.aggregate([
    { $match: match },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    ...(stats || { total: 0, active: 0, onHold: 0, completed: 0, avgDuration: 0 }),
    avgDurationDays: stats?.avgDuration ? Math.round(stats.avgDuration / (1000 * 60 * 60 * 24)) : 0,
    byPhase,
    byType,
  };
};

// ─── Export ──────────────────────────────────────────────────────────────────

const EpisodeOfCare =
  mongoose.models.EpisodeOfCare || mongoose.model('EpisodeOfCare', episodeOfCareSchema);

module.exports = { EpisodeOfCare, episodeOfCareSchema };

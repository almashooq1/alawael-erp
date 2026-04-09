/**
 * ClinicalSession Model — نموذج الجلسة العلاجية الموحدة
 *
 * جلسة فردية أو جماعية مرتبطة بالمستفيد والحلقة العلاجية وخطة الرعاية.
 * تدعم: حضورية، عن بعد (Tele-Rehab)، منزلية، مجتمعية.
 *
 * @module domains/sessions/models/ClinicalSession
 */

const mongoose = require('mongoose');

const goalProgressSchema = new mongoose.Schema(
  {
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticGoal' },
    goalTitle: String,
    progressBefore: Number,
    progressAfter: Number,
    rating: {
      type: String,
      enum: ['not_attempted', 'emerging', 'developing', 'achieved', 'maintained', 'regressed'],
    },
    notes: String,
    trialData: { attempts: Number, successes: Number, accuracy: Number },
  },
  { _id: true }
);

const vitalSignSchema = new mongoose.Schema(
  {
    heartRate: Number,
    bloodPressure: { systolic: Number, diastolic: Number },
    temperature: Number,
    oxygenSaturation: Number,
    painLevel: { type: Number, min: 0, max: 10 },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    name_ar: String,
    domain: {
      type: String,
      enum: [
        'motor_gross',
        'motor_fine',
        'speech',
        'language',
        'communication',
        'cognitive',
        'social',
        'behavioral',
        'sensory',
        'self_care',
        'academic',
        'vocational',
        'play',
        'other',
      ],
    },
    durationMinutes: Number,
    materials: [String],
    instructions: String,
    response: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'refused', 'unable'],
    },
    assistanceLevel: {
      type: String,
      enum: ['independent', 'minimal', 'moderate', 'maximal', 'dependent'],
    },
    notes: String,
  },
  { _id: true }
);

const clinicalSessionSchema = new mongoose.Schema(
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
    carePlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UnifiedCarePlan',
    },

    // ── Identity ───────────────────────────────────────────────────────
    sessionNumber: { type: String, unique: true, sparse: true },
    sequenceInEpisode: Number,

    // ── Type & Modality ────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['individual', 'group', 'family', 'consultation', 'evaluation', 'crisis', 'followup'],
      default: 'individual',
    },
    modality: {
      type: String,
      enum: ['in_person', 'tele_rehab', 'home_visit', 'community', 'hybrid'],
      default: 'in_person',
    },
    specialty: {
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
        'multidisciplinary',
        'other',
      ],
    },

    // ── Status ─────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'scheduled',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'late_cancel',
        'rescheduled',
      ],
      default: 'scheduled',
      index: true,
    },

    // ── Scheduling ─────────────────────────────────────────────────────
    scheduledDate: { type: Date, required: true, index: true },
    scheduledStartTime: String,
    scheduledEndTime: String,
    scheduledDurationMinutes: { type: Number, default: 45 },
    actualStartTime: Date,
    actualEndTime: Date,
    actualDurationMinutes: Number,

    // ── Therapist ──────────────────────────────────────────────────────
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    additionalTherapists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ── Location ───────────────────────────────────────────────────────
    location: {
      type: { type: String, enum: ['center', 'home', 'school', 'community', 'virtual'] },
      room: String,
      building: String,
      address: String,
      teleRehabLink: String,
    },

    // ── Activities ─────────────────────────────────────────────────────
    activities: [activitySchema],

    // ── Goal Progress (تقدم الأهداف) ───────────────────────────────
    goalProgress: [goalProgressSchema],

    // ── Clinical Notes ─────────────────────────────────────────────────
    subjective: String, // S — ما يبلغه المريض/الأسرة
    objective: String, // O — ملاحظات الأخصائي
    assessment: String, // A — تحليل الأخصائي
    plan: String, // P — الخطة التالية
    soapNotes: String, // Combined SOAP

    // ── Clinical Observations ──────────────────────────────────────────
    observations: {
      attention: { type: String, enum: ['poor', 'fair', 'good', 'excellent'] },
      motivation: { type: String, enum: ['low', 'moderate', 'high'] },
      cooperation: { type: String, enum: ['poor', 'fair', 'good', 'excellent'] },
      fatigue: { type: String, enum: ['none', 'mild', 'moderate', 'severe'] },
      emotionalState: String,
      behaviorNotes: String,
    },

    // ── Vital Signs ────────────────────────────────────────────────────
    vitalSigns: {
      pre: vitalSignSchema,
      post: vitalSignSchema,
    },

    // ── Attendance ─────────────────────────────────────────────────────
    attendance: {
      status: {
        type: String,
        enum: ['present', 'absent', 'late', 'early_leave'],
        default: 'present',
      },
      checkinTime: Date,
      checkoutTime: Date,
      absenceReason: String,
      excused: { type: Boolean, default: false },
      guardianPresent: Boolean,
      guardianName: String,
    },

    // ── Home Program ───────────────────────────────────────────────────
    homeProgram: {
      assigned: { type: Boolean, default: false },
      instructions: String,
      exercises: [{ name: String, frequency: String, duration: String, notes: String }],
      compliance: { type: String, enum: ['not_assigned', 'not_done', 'partial', 'full'] },
    },

    // ── Group Session ──────────────────────────────────────────────────
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    groupParticipants: [
      {
        beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
        attended: Boolean,
        notes: String,
      },
    ],

    // ── Cancellation ───────────────────────────────────────────────────
    cancellation: {
      cancelledAt: Date,
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      rescheduledTo: Date,
    },

    // ── Billing ────────────────────────────────────────────────────────
    billing: {
      serviceCode: String,
      units: Number,
      amount: Number,
      insuranceClaim: Boolean,
      claimStatus: { type: String, enum: ['pending', 'submitted', 'approved', 'rejected'] },
    },

    // ── Attachments ────────────────────────────────────────────────────
    attachments: [
      {
        title: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Multi-Tenancy & Audit ──────────────────────────────────────────
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
    collection: 'clinical_sessions',
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────

clinicalSessionSchema.index({ beneficiaryId: 1, scheduledDate: -1 });
clinicalSessionSchema.index({ therapistId: 1, scheduledDate: 1 });
clinicalSessionSchema.index({ episodeId: 1, scheduledDate: -1 });
clinicalSessionSchema.index({ status: 1, scheduledDate: 1 });
clinicalSessionSchema.index({ scheduledDate: 1, status: 1, branchId: 1 });

// ─── Virtuals ───────────────────────────────────────────────────────────────

clinicalSessionSchema.virtual('isCompleted').get(function () {
  return this.status === 'completed';
});

clinicalSessionSchema.virtual('averageGoalProgress').get(function () {
  if (!this.goalProgress || this.goalProgress.length === 0) return 0;
  const totalDelta = this.goalProgress.reduce(
    (sum, g) => sum + ((g.progressAfter || 0) - (g.progressBefore || 0)),
    0
  );
  return Math.round(totalDelta / this.goalProgress.length);
});

// ─── Pre-save ───────────────────────────────────────────────────────────────

clinicalSessionSchema.pre('save', function (next) {
  if (!this.sessionNumber && this.isNew) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.sessionNumber = `SES-${dateStr}-${random}`;
  }

  // Calculate actual duration
  if (this.actualStartTime && this.actualEndTime) {
    this.actualDurationMinutes = Math.round(
      (this.actualEndTime - this.actualStartTime) / (1000 * 60)
    );
  }

  next();
});

// ─── Static Methods ─────────────────────────────────────────────────────────

clinicalSessionSchema.statics.getTherapistSchedule = async function (
  therapistId,
  startDate,
  endDate
) {
  return this.find({
    therapistId,
    scheduledDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    isDeleted: { $ne: true },
    status: { $nin: ['cancelled'] },
  })
    .populate('beneficiaryId', 'firstName lastName fullNameArabic mrn')
    .sort({ scheduledDate: 1 })
    .lean({ virtuals: true });
};

clinicalSessionSchema.statics.getStatistics = async function (filter = {}) {
  const match = {
    isDeleted: { $ne: true },
    ...(filter.branchId && { branchId: new mongoose.Types.ObjectId(filter.branchId) }),
  };
  if (filter.startDate || filter.endDate) {
    match.scheduledDate = {};
    if (filter.startDate) match.scheduledDate.$gte = new Date(filter.startDate);
    if (filter.endDate) match.scheduledDate.$lte = new Date(filter.endDate);
  }

  const [stats] = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
        avgDuration: { $avg: '$actualDurationMinutes' },
      },
    },
  ]);

  return {
    ...(stats || { total: 0, completed: 0, cancelled: 0, noShow: 0, avgDuration: 0 }),
    attendanceRate:
      stats && stats.total > 0
        ? Math.round((stats.completed / (stats.total - (stats.cancelled || 0))) * 100)
        : 0,
  };
};

const ClinicalSession =
  mongoose.models.ClinicalSession || mongoose.model('ClinicalSession', clinicalSessionSchema);

module.exports = { ClinicalSession, clinicalSessionSchema };

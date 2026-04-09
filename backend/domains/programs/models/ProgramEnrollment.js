/**
 * ProgramEnrollment — نموذج تسجيل المستفيد في برنامج
 *
 * يمثل إسناد مستفيد (أو مجموعة) لبرنامج تأهيلي محدد
 * مع متابعة التقدم، الحضور، وتقييم النتائج.
 *
 * @module domains/programs/models/ProgramEnrollment
 */

const mongoose = require('mongoose');

// ─── Module Progress Sub-schema ─────────────────────────────────────────────

const moduleProgressSchema = new mongoose.Schema(
  {
    moduleId: { type: mongoose.Schema.Types.ObjectId },
    moduleName: String,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'skipped'],
      default: 'not_started',
    },
    startedAt: Date,
    completedAt: Date,
    sessionsCompleted: { type: Number, default: 0 },
    sessionsTotal: Number,
    notes: String,
  },
  { _id: true }
);

// ─── Session Log Sub-schema ─────────────────────────────────────────────────

const sessionLogSchema = new mongoose.Schema(
  {
    sessionDate: { type: Date, required: true },
    sessionNumber: Number,
    moduleIndex: Number,
    sessionTemplateIndex: Number,
    clinicalSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalSession' },
    status: {
      type: String,
      enum: ['completed', 'partial', 'cancelled', 'no_show', 'rescheduled'],
      default: 'completed',
    },
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    duration: Number,
    attendanceStatus: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
    },
    objectives: [
      {
        title: String,
        achieved: Boolean,
        notes: String,
      },
    ],
    notes: String,
  },
  { _id: true }
);

// ─── Outcome Sub-schema ─────────────────────────────────────────────────────

const outcomeSchema = new mongoose.Schema(
  {
    measureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Measure' },
    measureApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'MeasureApplication' },
    purpose: { type: String, enum: ['baseline', 'progress', 'outcome'] },
    score: Number,
    date: Date,
    changeFromBaseline: Number,
    changePercent: Number,
  },
  { _id: false }
);

// ─── Main Schema ────────────────────────────────────────────────────────────

const enrollmentSchema = new mongoose.Schema(
  {
    // ── Context ───────────────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      index: true,
    },

    // ── Group (if group program) ──────────────────────────────────────
    groupId: { type: mongoose.Schema.Types.ObjectId, index: true },
    groupName: String,

    // ── Enrollment Info ───────────────────────────────────────────────
    enrollmentDate: { type: Date, default: Date.now },
    expectedStartDate: Date,
    actualStartDate: Date,
    expectedEndDate: Date,
    actualEndDate: Date,

    // ── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'pending', // في انتظار الموافقة
        'approved', // تمت الموافقة
        'active', // نشط
        'on_hold', // متوقف مؤقتاً
        'completed', // مكتمل
        'withdrawn', // انسحب
        'transferred', // محوّل لبرنامج آخر
        'cancelled', // ملغى
      ],
      default: 'pending',
      index: true,
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
      },
    ],

    // ── Assignment ────────────────────────────────────────────────────
    leadTherapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    team: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: String,
      },
    ],

    // ── Progress ──────────────────────────────────────────────────────
    moduleProgress: [moduleProgressSchema],

    sessionsCompleted: { type: Number, default: 0 },
    sessionsTotal: Number,
    sessionsLog: [sessionLogSchema],

    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    currentModuleIndex: { type: Number, default: 0 },

    // ── Attendance ────────────────────────────────────────────────────
    attendanceRate: { type: Number, min: 0, max: 100 },
    absences: { type: Number, default: 0 },
    maxAllowedAbsences: Number,

    // ── Outcomes ──────────────────────────────────────────────────────
    outcomes: [outcomeSchema],

    // ── Completion ────────────────────────────────────────────────────
    completionStatus: {
      type: String,
      enum: [
        'not_assessed',
        'goals_achieved',
        'partial_improvement',
        'no_improvement',
        'goals_exceeded',
      ],
    },
    completionReport: String,
    completionScore: Number, // 0-100

    // ── Satisfaction ──────────────────────────────────────────────────
    satisfaction: {
      beneficiarySatisfaction: { type: Number, min: 1, max: 5 },
      familySatisfaction: { type: Number, min: 1, max: 5 },
      notes: String,
    },

    // ── Goals linked from TherapeuticGoal ─────────────────────────────
    linkedGoals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TherapeuticGoal',
      },
    ],

    // ── Notes ─────────────────────────────────────────────────────────
    notes: String,
    clinicalNotes: String,

    // ── Audit ─────────────────────────────────────────────────────────
    enrolledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,

    // ── Multi-tenant ──────────────────────────────────────────────────
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────

enrollmentSchema.index({ beneficiaryId: 1, programId: 1 });
enrollmentSchema.index({ beneficiaryId: 1, status: 1 });
enrollmentSchema.index({ programId: 1, status: 1 });
enrollmentSchema.index({ groupId: 1, status: 1 });
enrollmentSchema.index({ leadTherapistId: 1, status: 1 });
enrollmentSchema.index({ expectedEndDate: 1, status: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────

enrollmentSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

enrollmentSchema.virtual('daysRemaining').get(function () {
  if (!this.expectedEndDate) return null;
  return Math.ceil((this.expectedEndDate - Date.now()) / (1000 * 60 * 60 * 24));
});

enrollmentSchema.virtual('isOverdue').get(function () {
  return this.status === 'active' && this.expectedEndDate && new Date() > this.expectedEndDate;
});

// ─── Methods ──────────────────────────────────────────────────────────────

enrollmentSchema.methods.updateProgress = function () {
  if (!this.sessionsTotal || this.sessionsTotal === 0) return;
  this.progressPercentage = Math.round((this.sessionsCompleted / this.sessionsTotal) * 100);

  // Update attendance rate
  const totalLogged = this.sessionsLog?.length || 0;
  if (totalLogged > 0) {
    const attended = this.sessionsLog.filter(
      s => s.attendanceStatus === 'present' || s.attendanceStatus === 'late'
    ).length;
    this.attendanceRate = Math.round((attended / totalLogged) * 100);
    this.absences = this.sessionsLog.filter(s => s.attendanceStatus === 'absent').length;
  }
};

enrollmentSchema.methods.logSession = function (sessionData) {
  this.sessionsLog.push(sessionData);
  this.sessionsCompleted = this.sessionsLog.filter(
    s => s.status === 'completed' || s.status === 'partial'
  ).length;
  this.updateProgress();
  return this.save();
};

enrollmentSchema.methods.changeStatus = function (newStatus, userId, reason) {
  this.statusHistory.push({
    status: newStatus,
    changedBy: userId,
    reason,
  });
  this.status = newStatus;

  if (newStatus === 'active' && !this.actualStartDate) {
    this.actualStartDate = new Date();
  }
  if (['completed', 'withdrawn', 'cancelled'].includes(newStatus)) {
    this.actualEndDate = new Date();
  }

  return this.save();
};

// ─── Statics ──────────────────────────────────────────────────────────────

/**
 * إحصائيات التسجيل لبرنامج
 */
enrollmentSchema.statics.getProgramStats = async function (programId) {
  return this.aggregate([
    { $match: { programId: new mongoose.Types.ObjectId(programId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProgress: { $avg: '$progressPercentage' },
        avgAttendance: { $avg: '$attendanceRate' },
      },
    },
  ]);
};

/**
 * المستفيدون النشطون في برنامج
 */
enrollmentSchema.statics.getActiveEnrollments = function (programId) {
  return this.find({ programId, status: 'active' })
    .populate('beneficiaryId', 'name fileNumber personalInfo')
    .populate('leadTherapistId', 'name firstName lastName')
    .sort({ enrollmentDate: -1 });
};

/**
 * لوحة تحكم المعالج — تسجيلاته النشطة
 */
enrollmentSchema.statics.getTherapistDashboard = function (therapistId) {
  return this.find({
    $or: [{ leadTherapistId: therapistId }, { 'team.userId': therapistId }],
    status: 'active',
  })
    .populate('beneficiaryId', 'name fileNumber personalInfo')
    .populate('programId', 'name name_ar code type category')
    .sort({ expectedEndDate: 1 });
};

/**
 * التسجيلات المتأخرة (overdue)
 */
enrollmentSchema.statics.getOverdueEnrollments = function (branchId) {
  const query = {
    status: 'active',
    expectedEndDate: { $lt: new Date() },
  };
  if (branchId) query.branchId = branchId;

  return this.find(query)
    .populate('beneficiaryId', 'name fileNumber')
    .populate('programId', 'name name_ar code')
    .sort({ expectedEndDate: 1 });
};

const ProgramEnrollment =
  mongoose.models.ProgramEnrollment || mongoose.model('ProgramEnrollment', enrollmentSchema);

module.exports = { ProgramEnrollment, enrollmentSchema };

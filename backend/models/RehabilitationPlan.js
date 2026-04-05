/**
 * RehabilitationPlan — نموذج خطة التأهيل الفردية
 *
 * يُمثّل خطة تأهيل شخصية مدتها 12 أسبوعًا لمستفيد واحد.
 * يتكامل مع:
 *   - IndividualizedRehabilitationPlanService (الخدمة الأصلية)
 *   - AIAssessmentService (تقييم الذكاء الاصطناعي)
 *   - TeleRehabilitationService (الجلسات عن بُعد)
 *   - QualityAssuranceService (ضمان الجودة)
 *
 * المعايير الدولية المُطبَّقة:
 *   WHO-ICF · APTA · ICD-11 · SMART Framework · ISO 9001:2015
 */

const mongoose = require('mongoose');

const { Schema } = mongoose;

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

/**
 * هدف SMART واحد ضمن خطة التأهيل
 */
const SmartGoalSchema = new Schema(
  {
    domain: {
      type: String,
      enum: [
        'motorSkills',
        'communication',
        'dailyLiving',
        'adaptiveBehavior',
        'academic',
        'vocational',
        'sensory',
        'cognitive',
        'social',
        'pain',
      ],
      required: true,
    },
    area: { type: String, trim: true }, // مجال فرعي (grossMotor, fineMotor, …)
    goalText: { type: String, required: true, trim: true },
    measurableTarget: { type: String, trim: true }, // المعيار القابل للقياس
    measurementTool: { type: String, trim: true }, // FIM / NRS / Goniometer / …
    baselineValue: { type: Number }, // القيمة الأساسية عند البدء
    targetValue: { type: Number }, // القيمة المستهدفة
    currentValue: { type: Number }, // القيمة الحالية
    targetWeek: { type: Number, min: 1, max: 12 },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'achieved', 'partially_achieved', 'discontinued'],
      default: 'not_started',
    },
    progressHistory: [
      {
        week: Number,
        value: Number,
        notes: String,
        recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        recordedAt: { type: Date, default: Date.now },
        qualityFlag: { type: Boolean, default: false }, // ← QA flag من QualityAssuranceService
      },
    ],
    achievedAt: Date,
    notes: String,
  },
  { _id: true }
);

/**
 * جلسة علاجية واحدة مسجّلة
 */
const SessionRecordSchema = new Schema(
  {
    sessionNumber: Number,
    week: { type: Number, min: 1, max: 12 },
    phase: { type: Number, min: 1, max: 3 }, // المرحلة (1/2/3)
    sessionType: {
      type: String,
      enum: ['in_person', 'tele', 'home', 'group', 'assessment'],
      default: 'in_person',
    },
    date: { type: Date, required: true },
    duration: { type: Number, comment: 'بالدقائق' },
    therapist: { type: Schema.Types.ObjectId, ref: 'User' },
    attendanceStatus: {
      type: String,
      enum: ['present', 'absent_excused', 'absent_unexcused', 'cancelled'],
      default: 'present',
    },
    exercisesPerformed: [String],
    patientCooperation: { type: Number, min: 1, max: 5 },
    painLevelPre: { type: Number, min: 0, max: 10 },
    painLevelPost: { type: Number, min: 0, max: 10 },
    clinicalNotes: String,
    goalsAddressed: [{ type: Schema.Types.ObjectId }], // مراجع للأهداف المُعالَجة
    teleSessionId: String, // إذا كانت جلسة TeleRehab
    aiMotionAnalysis: {
      performed: { type: Boolean, default: false },
      deviationsDetected: [String],
      overallScore: Number, // 0-100
      reportUrl: String,
    },
  },
  { _id: true }
);

/**
 * خدمة تأهيلية محددة ضمن الخطة
 */
const PlanServiceSchema = new Schema(
  {
    serviceType: { type: String, required: true, trim: true },
    description: String,
    frequency: String, // مثل: "3 مرات أسبوعيًا"
    duration: String, // مثل: "60 دقيقة"
    startWeek: { type: Number, min: 1, max: 12 },
    endWeek: { type: Number, min: 1, max: 12 },
    responsibleTherapist: { type: Schema.Types.ObjectId, ref: 'User' },
    sessions: [SessionRecordSchema],
  },
  { _id: true }
);

/**
 * تقييم AI لحالة المستفيد
 */
const AIAssessmentSchema = new Schema(
  {
    conductedAt: { type: Date, default: Date.now },
    conductedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    version: { type: String, default: 'v6.0' },
    overallRiskScore: { type: Number, min: 0, max: 100 },
    riskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
    },
    predictedOutcome: { type: Number, min: 0, max: 100, comment: 'نسبة التحسن المتوقعة %' },
    predictionConfidence: { type: Number, min: 0, max: 1 },
    estimatedWeeksToGoal: Number,
    riskFactors: [String],
    protectiveFactors: [String],
    recommendations: [String],
    clinicalScores: {
      FIM: Number,
      WHODAS: Number,
      Barthel: Number,
      NRS_pain: Number,
      custom: Schema.Types.Mixed,
    },
    complianceRateExpected: Number,
    familySupportScore: { type: Number, min: 0, max: 10 },
    rawData: Schema.Types.Mixed, // بيانات خام من الخوارزمية
  },
  { _id: true }
);

/**
 * مراجعة رسمية للخطة (عند منتصف البرنامج ونهايته)
 */
const PlanReviewSchema = new Schema(
  {
    reviewType: {
      type: String,
      enum: ['midpoint', 'final', 'ad_hoc', 'family_conference'],
      required: true,
    },
    reviewDate: { type: Date, default: Date.now },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    attendees: [String],
    overallProgress: { type: Number, min: 0, max: 100, comment: '% من الأهداف المحققة' },
    goalsAchieved: Number,
    goalsInProgress: Number,
    goalsMissed: Number,
    modifications: [String], // التعديلات المُدخَلة على الخطة
    nextSteps: [String],
    dischargeRecommendation: {
      type: String,
      enum: ['continue', 'modify', 'discharge', 'refer', 'intensify'],
    },
    familySatisfactionScore: { type: Number, min: 1, max: 5 },
    notes: String,
    generatedReportId: String, // معرّف التقرير المُولَّد من ReportsService
  },
  { _id: true }
);

/**
 * جلسة Tele-Rehabilitation مجدولة
 */
const TeleSessionSchema = new Schema(
  {
    scheduledAt: Date,
    platform: { type: String, default: 'zoom' },
    meetingLink: String,
    meetingId: String,
    therapist: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
    },
    durationMinutes: Number,
    notes: String,
  },
  { _id: true }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const RehabilitationPlanSchema = new Schema(
  {
    // ── تعريف الخطة ──────────────────────────────────────────────────────
    planCode: {
      type: String,
      uppercase: true,
      trim: true,
      comment: 'كود مرجعي فريد مُولَّد تلقائيًا — مثل: RHP-2026-00042',
    },
    planTitle: { type: String, trim: true },
    templateUsed: {
      type: String,
      enum: [
        'comprehensive',
        'vocational',
        'educational',
        'earlyIntervention',
        'independentLiving',
        'custom',
      ],
      default: 'comprehensive',
    },

    // ── المستفيد والمعالج ──────────────────────────────────────────────
    beneficiary: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    primaryTherapist: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    secondaryTherapists: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    supervisingPhysician: { type: Schema.Types.ObjectId, ref: 'User' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    center: { type: Schema.Types.ObjectId, ref: 'RehabCenter' },

    // ── التشخيص والتصنيف ──────────────────────────────────────────────
    primaryDiagnosis: { type: String, required: true, trim: true },
    icd11Code: { type: String, trim: true }, // رمز ICD-11
    icfCategories: [String], // تصنيفات WHO-ICF
    disabilityCategory: {
      type: String,
      enum: [
        'physical',
        'sensory_visual',
        'sensory_hearing',
        'intellectual',
        'autism',
        'multiple',
        'other',
      ],
    },
    injuryDate: Date,
    injuryDuration: { type: String, comment: 'مدة الإصابة عند البدء' },
    medicalHistory: String,
    contraindications: [String], // موانع طبية

    // ── التقييم الأولي ────────────────────────────────────────────────
    initialAssessment: {
      assessmentDate: Date,
      FIM_score: { type: Number, min: 1, max: 7 },
      NRS_pain: { type: Number, min: 0, max: 10 },
      muscleStrengthNotes: String,
      ROM_notes: String,
      balanceLevel: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },
      mobilityLevel: {
        type: String,
        enum: ['independent', 'supervised', 'assisted', 'dependent'],
      },
      ADL_level: {
        type: String,
        enum: [
          'independent',
          'modified_independent',
          'supervised',
          'minimal_assist',
          'moderate_assist',
          'maximal_assist',
          'dependent',
        ],
      },
      specialConsiderations: String,
    },

    // ── الجدول الزمني ────────────────────────────────────────────────
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalWeeks: { type: Number, default: 12 },
    sessionsPerWeek: { type: Number, default: 3 },
    sessionDurationMinutes: { type: Number, default: 60 },
    totalSessionsPlanned: { type: Number, default: 36 },

    // ── الأهداف والخدمات ────────────────────────────────────────────
    goals: [SmartGoalSchema],
    services: [PlanServiceSchema],

    // ── تقييمات الذكاء الاصطناعي ─────────────────────────────────────
    aiAssessments: [AIAssessmentSchema],
    latestRiskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
    },
    latestPredictedOutcome: Number,

    // ── جلسات Tele-Rehab ──────────────────────────────────────────────
    teleSessions: [TeleSessionSchema],

    // ── المراجعات الرسمية ────────────────────────────────────────────
    reviews: [PlanReviewSchema],

    // ── مؤشرات التقدم المُجمَّعة ──────────────────────────────────────
    progressMetrics: {
      mobility: { type: Number, min: 0, max: 100, default: 0 },
      strength: { type: Number, min: 0, max: 100, default: 0 },
      ROM: { type: Number, min: 0, max: 100, default: 0 },
      painReduction: { type: Number, min: 0, max: 100, default: 0 },
      ADL: { type: Number, min: 0, max: 100, default: 0 },
      balance: { type: Number, min: 0, max: 100, default: 0 },
      overallProgress: { type: Number, min: 0, max: 100, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },

    // ── الحالة ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'active', 'on_hold', 'completed', 'discharged', 'cancelled'],
      default: 'draft',
      index: true,
    },

    // ── الجودة والمعايير ──────────────────────────────────────────────
    qualityMetrics: {
      sessionAttendanceRate: { type: Number, min: 0, max: 100 },
      goalAchievementRate: { type: Number, min: 0, max: 100 },
      familySatisfactionAvg: { type: Number, min: 1, max: 5 },
      cbahiCompliance: { type: Boolean, default: true },
      iso9001Compliant: { type: Boolean, default: true },
      lastQAReviewDate: Date,
      qualityFlags: [String],
    },

    // ── معلومات الإنهاء ───────────────────────────────────────────────
    dischargeSummary: {
      dischargeDate: Date,
      dischargeReason: {
        type: String,
        enum: [
          'goals_achieved',
          'patient_request',
          'medical_transfer',
          'funding_ended',
          'non_compliance',
          'other',
        ],
      },
      finalFIM_score: Number,
      finalNRS_pain: Number,
      finalOverallProgress: Number,
      homeExerciseProgram: String,
      followUpPlan: String,
      recommendations: String,
    },

    // ── بيانات تكاملية مع أنظمة ERP الأخرى ──────────────────────────
    integration: {
      schedulerJobId: String, // SmartSchedulingService
      alertsSubscriptionId: String, // AlertsNotificationsService
      reportIds: [String], // RehabilitationReportsService
      financeInvoiceIds: [String], // نظام الفواتير
      insuranceAuthId: String, // TreatmentAuthorization
      noorSyncId: String, // نظام نور (إذا طالب)
    },

    // ── أوديت ────────────────────────────────────────────────────────
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    version: { type: Number, default: 1 }, // رقم الإصدار — يزداد عند كل مراجعة
    notes: String,
    tags: [String],
  },
  {
    timestamps: true,
    collection: 'rehabilitation_plans',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

RehabilitationPlanSchema.index({ beneficiary: 1, status: 1 });
RehabilitationPlanSchema.index({ primaryTherapist: 1, status: 1 });
RehabilitationPlanSchema.index({ branch: 1, status: 1 });
RehabilitationPlanSchema.index({ startDate: 1, endDate: 1 });
RehabilitationPlanSchema.index({ 'goals.status': 1 });
RehabilitationPlanSchema.index({ planCode: 1 }, { unique: true, sparse: true });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

/** نسبة الأهداف المحققة */
RehabilitationPlanSchema.virtual('goalAchievementRate').get(function () {
  if (!this.goals || this.goals.length === 0) return 0;
  const achieved = this.goals.filter(g => g.status === 'achieved').length;
  return Math.round((achieved / this.goals.length) * 100);
});

/** عدد الجلسات الفعلية المنجزة */
RehabilitationPlanSchema.virtual('completedSessionsCount').get(function () {
  return this.services.reduce((total, svc) => {
    return total + svc.sessions.filter(s => s.attendanceStatus === 'present').length;
  }, 0);
});

/** عدد الأسابيع المتبقية */
RehabilitationPlanSchema.virtual('weeksRemaining').get(function () {
  if (!this.endDate) return null;
  const diff = this.endDate - new Date();
  return Math.max(0, Math.ceil(diff / (7 * 24 * 60 * 60 * 1000)));
});

/** آخر تقييم AI */
RehabilitationPlanSchema.virtual('latestAIAssessment').get(function () {
  if (!this.aiAssessments || this.aiAssessments.length === 0) return null;
  return this.aiAssessments[this.aiAssessments.length - 1];
});

// ─── Pre-save Hooks ────────────────────────────────────────────────────────────

/** توليد كود مرجعي فريد عند الإنشاء */
RehabilitationPlanSchema.pre('save', async function (next) {
  if (!this.planCode) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('RehabilitationPlan').countDocuments();
    this.planCode = `RHP-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  // تحديث مؤشر التقدم الإجمالي
  if (this.goals && this.goals.length > 0) {
    const achieved = this.goals.filter(g => g.status === 'achieved').length;
    this.progressMetrics.overallProgress = Math.round((achieved / this.goals.length) * 100);
    this.progressMetrics.lastUpdated = new Date();
  }
  next();
});

/** تحديث latestRiskLevel عند حفظ تقييم AI جديد */
RehabilitationPlanSchema.pre('save', function (next) {
  if (this.aiAssessments && this.aiAssessments.length > 0) {
    const latest = this.aiAssessments[this.aiAssessments.length - 1];
    this.latestRiskLevel = latest.riskLevel;
    this.latestPredictedOutcome = latest.predictedOutcome;
  }
  next();
});

// ─── Static Methods ────────────────────────────────────────────────────────────

/**
 * إحصائيات ملخصة لمعالج معين
 */
RehabilitationPlanSchema.statics.getTherapistStats = async function (therapistId) {
  return this.aggregate([
    { $match: { primaryTherapist: new mongoose.Types.ObjectId(therapistId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProgress: { $avg: '$progressMetrics.overallProgress' },
      },
    },
  ]);
};

/**
 * خطط تحتاج مراجعة (وصلت للأسبوع 6 أو 12 ولم تُراجَع)
 */
RehabilitationPlanSchema.statics.getPlansNeedingReview = async function () {
  const now = new Date();
  const sixWeeksIn = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);
  return this.find({
    status: 'active',
    startDate: { $lte: sixWeeksIn },
    'reviews.reviewType': { $nin: ['midpoint', 'final'] },
  }).populate('beneficiary primaryTherapist', 'name fullName');
};

// ─── Export ────────────────────────────────────────────────────────────────────

module.exports =
  mongoose.models.RehabilitationPlan ||
  mongoose.models.RehabilitationPlan ||
  mongoose.model('RehabilitationPlan', RehabilitationPlanSchema);

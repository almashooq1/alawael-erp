/**
 * Post-Rehabilitation Follow-Up System Models
 * نماذج نظام المتابعة ما بعد التأهيل
 *
 * Covers:
 *  1. PostRehabCase          – حالة متابعة ما بعد التأهيل
 *  2. FollowUpVisit          – زيارات المتابعة الدورية (منزلية / عن بعد)
 *  3. ImpactMeasurement      – قياس الأثر طويل المدى
 *  4. PostRehabSurvey        – استبيانات الرضا والنتائج
 *  5. ReEnrollmentRequest    – طلبات إعادة التسجيل التلقائي
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-SCHEMAS — مخططات فرعية
// ═══════════════════════════════════════════════════════════════════════════════

// ── Contact Attempt Log ──
const contactAttemptSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: ['PHONE', 'SMS', 'EMAIL', 'WHATSAPP', 'HOME_VISIT', 'VIDEO_CALL'],
      required: true,
    },
    outcome: {
      type: String,
      enum: ['REACHED', 'NO_ANSWER', 'WRONG_NUMBER', 'REFUSED', 'RESCHEDULED', 'LEFT_MESSAGE'],
      required: true,
    },
    notes: { type: String },
    contactedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true }
);

// ── Functional Domain Score (sub-schema for impact measurement) ──
const domainScoreSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      enum: [
        'COMMUNICATION',
        'DAILY_LIVING',
        'SOCIALIZATION',
        'MOTOR_SKILLS',
        'COGNITIVE',
        'EMOTIONAL',
        'VOCATIONAL',
        'ACADEMIC',
        'SELF_CARE',
        'COMMUNITY_PARTICIPATION',
      ],
      required: true,
    },
    domainAr: { type: String },
    scoreAtDischarge: { type: Number, min: 0, max: 100 },
    currentScore: { type: Number, min: 0, max: 100 },
    targetScore: { type: Number, min: 0, max: 100 },
    trend: {
      type: String,
      enum: ['IMPROVING', 'STABLE', 'DECLINING', 'FLUCTUATING'],
    },
    notes: { type: String },
  },
  { _id: false }
);

// ── Alert/Flag ──
const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'REGRESSION',
        'MISSED_VISIT',
        'LOW_SATISFACTION',
        'URGENT_NEED',
        'RE_ENROLLMENT_RECOMMENDED',
        'CRITICAL_DECLINE',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    message: { type: String },
    messageAr: { type: String },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isResolved: { type: Boolean, default: false },
  },
  { _id: true }
);

// ── Survey Question Response ──
const surveyResponseSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    questionAr: { type: String },
    questionType: {
      type: String,
      enum: ['RATING', 'YES_NO', 'MULTIPLE_CHOICE', 'TEXT', 'SCALE_1_10', 'LIKERT'],
      required: true,
    },
    answer: { type: mongoose.Schema.Types.Mixed },
    score: { type: Number },
  },
  { _id: false }
);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. POST-REHAB CASE — حالة متابعة ما بعد التأهيل
// ═══════════════════════════════════════════════════════════════════════════════

const postRehabCaseSchema = new mongoose.Schema(
  {
    // ── References ──
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    originalProgram: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
    },
    originalProgramName: { type: String },
    originalProgramNameAr: { type: String },

    // ── Case Info ──
    caseNumber: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'RE_ENROLLED', 'LOST_TO_FOLLOW_UP'],
      default: 'ACTIVE',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    category: {
      type: String,
      enum: [
        'EARLY_INTERVENTION',
        'PHYSICAL_REHAB',
        'SPEECH_THERAPY',
        'OCCUPATIONAL_THERAPY',
        'BEHAVIORAL_THERAPY',
        'VOCATIONAL_REHAB',
        'EDUCATIONAL',
        'PSYCHOLOGICAL',
        'COMPREHENSIVE',
        'OTHER',
      ],
    },
    categoryAr: { type: String },

    // ── Discharge Info ──
    dischargeDate: { type: Date, required: true },
    dischargeReason: {
      type: String,
      enum: ['COMPLETED_PROGRAM', 'GOALS_MET', 'FAMILY_REQUEST', 'TRANSFERRED', 'AGE_OUT', 'OTHER'],
    },
    dischargeNotes: { type: String },
    dischargeScores: [domainScoreSchema],

    // ── Follow-up Plan ──
    followUpPlan: {
      frequency: {
        type: String,
        enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'],
        default: 'MONTHLY',
      },
      duration: {
        type: String,
        enum: ['3_MONTHS', '6_MONTHS', '1_YEAR', '2_YEARS', '3_YEARS', 'INDEFINITE'],
        default: '2_YEARS',
      },
      preferredMethod: {
        type: String,
        enum: ['HOME_VISIT', 'PHONE', 'VIDEO_CALL', 'IN_PERSON', 'MIXED'],
        default: 'MIXED',
      },
      startDate: { type: Date },
      endDate: { type: Date },
      nextScheduledVisit: { type: Date },
      totalPlannedVisits: { type: Number, default: 0 },
      completedVisits: { type: Number, default: 0 },
      missedVisits: { type: Number, default: 0 },
    },

    // ── Impact Milestones ──
    impactMilestones: [
      {
        milestone: {
          type: String,
          enum: ['6_MONTHS', '1_YEAR', '2_YEARS'],
          required: true,
        },
        dueDate: { type: Date },
        completedDate: { type: Date },
        isCompleted: { type: Boolean, default: false },
        measurementId: { type: mongoose.Schema.Types.ObjectId, ref: 'ImpactMeasurement' },
      },
    ],

    // ── Alerts ──
    alerts: [alertSchema],

    // ── Contact History ──
    contactAttempts: [contactAttemptSchema],

    // ── Assigned Team ──
    assignedSpecialist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    supervisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Metadata ──
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    notes: { type: String },
    notesAr: { type: String },
    tags: [String],
  },
  { timestamps: true }
);

// ── Indexes ──
postRehabCaseSchema.index({ beneficiary: 1, status: 1 });
postRehabCaseSchema.index({ status: 1, 'followUpPlan.nextScheduledVisit': 1 });
postRehabCaseSchema.index({ assignedSpecialist: 1, status: 1 });
postRehabCaseSchema.index({ dischargeDate: 1 });

// ── Auto-generate case number ──
postRehabCaseSchema.pre('save', async function (next) {
  if (!this.caseNumber) {
    const count = await mongoose.model('PostRehabCase').countDocuments();
    const year = new Date().getFullYear();
    this.caseNumber = `PRF-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── Virtuals ──
postRehabCaseSchema.virtual('completionRate').get(function () {
  const total = this.followUpPlan?.totalPlannedVisits || 0;
  if (total === 0) return 0;
  return Math.round(((this.followUpPlan?.completedVisits || 0) / total) * 100);
});

postRehabCaseSchema.virtual('daysSinceDischarge').get(function () {
  if (!this.dischargeDate) return 0;
  return Math.floor((Date.now() - this.dischargeDate.getTime()) / (1000 * 60 * 60 * 24));
});

postRehabCaseSchema.set('toJSON', { virtuals: true });
postRehabCaseSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════════════════════
// 2. FOLLOW-UP VISIT — زيارة متابعة
// ═══════════════════════════════════════════════════════════════════════════════

const followUpVisitSchema = new mongoose.Schema(
  {
    postRehabCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PostRehabCase',
      required: true,
    },
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },

    // ── Visit Info ──
    visitNumber: { type: Number, required: true },
    visitType: {
      type: String,
      enum: [
        'HOME_VISIT',
        'PHONE_CALL',
        'VIDEO_CALL',
        'IN_PERSON',
        'SCHOOL_VISIT',
        'WORKPLACE_VISIT',
      ],
      required: true,
    },
    visitTypeAr: { type: String },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED', 'RESCHEDULED', 'IN_PROGRESS'],
      default: 'SCHEDULED',
    },

    // ── Timing ──
    scheduledDate: { type: Date, required: true },
    actualDate: { type: Date },
    duration: { type: Number }, // minutes

    // ── Location (for home visits) ──
    location: {
      type: { type: String, default: 'HOME' },
      address: { type: String },
      city: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },

    // ── Assessment ──
    domainScores: [domainScoreSchema],
    overallProgress: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_ATTENTION', 'CRITICAL'],
    },
    progressPercentage: { type: Number, min: 0, max: 100 },
    goalsReviewed: [
      {
        goalDescription: { type: String },
        goalDescriptionAr: { type: String },
        status: {
          type: String,
          enum: ['ACHIEVED', 'IN_PROGRESS', 'NOT_STARTED', 'REGRESSED', 'MODIFIED'],
        },
        notes: { type: String },
      },
    ],

    // ── Family/Caregiver Feedback ──
    familyFeedback: {
      overallSatisfaction: { type: Number, min: 1, max: 5 },
      concerns: [String],
      requests: [String],
      strengthsObserved: [String],
      challengesFaced: [String],
    },

    // ── Specialist Observations ──
    observations: { type: String },
    observationsAr: { type: String },
    recommendations: [String],
    recommendationsAr: [String],
    needsReEnrollment: { type: Boolean, default: false },
    reEnrollmentReason: { type: String },

    // ── Attachments ──
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Metadata ──
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    notesAr: { type: String },
  },
  { timestamps: true }
);

followUpVisitSchema.index({ postRehabCase: 1, scheduledDate: 1 });
followUpVisitSchema.index({ beneficiary: 1, status: 1 });
followUpVisitSchema.index({ conductedBy: 1, scheduledDate: 1 });
followUpVisitSchema.index({ status: 1, scheduledDate: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 3. IMPACT MEASUREMENT — قياس الأثر طويل المدى
// ═══════════════════════════════════════════════════════════════════════════════

const impactMeasurementSchema = new mongoose.Schema(
  {
    postRehabCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PostRehabCase',
      required: true,
    },
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },

    // ── Measurement Period ──
    milestone: {
      type: String,
      enum: ['6_MONTHS', '1_YEAR', '2_YEARS'],
      required: true,
    },
    milestoneAr: { type: String },
    measurementDate: { type: Date, default: Date.now },
    monthsSinceDischarge: { type: Number },

    // ── Domain Scores ──
    domainScores: [domainScoreSchema],
    overallScore: { type: Number, min: 0, max: 100 },
    overallScoreAtDischarge: { type: Number, min: 0, max: 100 },
    improvementPercentage: { type: Number },

    // ── Quality of Life ──
    qualityOfLife: {
      physicalWellbeing: { type: Number, min: 0, max: 10 },
      emotionalWellbeing: { type: Number, min: 0, max: 10 },
      socialInclusion: { type: Number, min: 0, max: 10 },
      independenceLevel: { type: Number, min: 0, max: 10 },
      familySatisfaction: { type: Number, min: 0, max: 10 },
      overallScore: { type: Number, min: 0, max: 10 },
    },

    // ── Functional Independence ──
    functionalIndependence: {
      selfCareLevel: {
        type: String,
        enum: [
          'FULLY_INDEPENDENT',
          'MOSTLY_INDEPENDENT',
          'PARTIALLY_DEPENDENT',
          'MOSTLY_DEPENDENT',
          'FULLY_DEPENDENT',
        ],
      },
      mobilityLevel: {
        type: String,
        enum: [
          'FULLY_INDEPENDENT',
          'MOSTLY_INDEPENDENT',
          'PARTIALLY_DEPENDENT',
          'MOSTLY_DEPENDENT',
          'FULLY_DEPENDENT',
        ],
      },
      communicationLevel: {
        type: String,
        enum: [
          'FULLY_INDEPENDENT',
          'MOSTLY_INDEPENDENT',
          'PARTIALLY_DEPENDENT',
          'MOSTLY_DEPENDENT',
          'FULLY_DEPENDENT',
        ],
      },
      socialLevel: {
        type: String,
        enum: [
          'FULLY_INDEPENDENT',
          'MOSTLY_INDEPENDENT',
          'PARTIALLY_DEPENDENT',
          'MOSTLY_DEPENDENT',
          'FULLY_DEPENDENT',
        ],
      },
    },

    // ── Education / Employment ──
    educationStatus: {
      enrolled: { type: Boolean },
      schoolType: {
        type: String,
        enum: [
          'MAINSTREAM',
          'SPECIAL_EDUCATION',
          'INCLUSIVE',
          'HOME_SCHOOLING',
          'VOCATIONAL',
          'NOT_APPLICABLE',
        ],
      },
      gradeLevel: { type: String },
      performanceLevel: {
        type: String,
        enum: ['EXCELLENT', 'GOOD', 'AVERAGE', 'BELOW_AVERAGE', 'STRUGGLING'],
      },
      supportsReceived: [String],
    },
    employmentStatus: {
      employed: { type: Boolean },
      employmentType: {
        type: String,
        enum: [
          'FULL_TIME',
          'PART_TIME',
          'SHELTERED',
          'SUPPORTED',
          'SELF_EMPLOYED',
          'NOT_APPLICABLE',
        ],
      },
      employer: { type: String },
      jobSatisfaction: { type: Number, min: 1, max: 5 },
    },

    // ── Community Integration ──
    communityIntegration: {
      participatesInActivities: { type: Boolean },
      activityTypes: [String],
      socialNetworkSize: {
        type: String,
        enum: ['NONE', 'SMALL', 'MODERATE', 'LARGE'],
      },
      communityBarriers: [String],
      usesPublicServices: { type: Boolean },
    },

    // ── Analysis ──
    overallTrend: {
      type: String,
      enum: [
        'SIGNIFICANT_IMPROVEMENT',
        'MODERATE_IMPROVEMENT',
        'STABLE',
        'SLIGHT_DECLINE',
        'SIGNIFICANT_DECLINE',
      ],
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      default: 'LOW',
    },
    needsIntervention: { type: Boolean, default: false },
    interventionRecommendations: [String],

    // ── Metadata ──
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    notesAr: { type: String },
  },
  { timestamps: true }
);

impactMeasurementSchema.index({ postRehabCase: 1, milestone: 1 });
impactMeasurementSchema.index({ beneficiary: 1, measurementDate: -1 });
impactMeasurementSchema.index({ overallTrend: 1, riskLevel: 1 });

// ── Auto-calculate months since discharge ──
impactMeasurementSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('measurementDate')) {
    try {
      const postRehabCase = await mongoose.model('PostRehabCase').findById(this.postRehabCase);
      if (postRehabCase?.dischargeDate) {
        this.monthsSinceDischarge = Math.round(
          (this.measurementDate - postRehabCase.dischargeDate) / (1000 * 60 * 60 * 24 * 30.44)
        );
      }
    } catch {
      // silent
    }
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. POST-REHAB SURVEY — استبيان ما بعد التأهيل
// ═══════════════════════════════════════════════════════════════════════════════

const postRehabSurveySchema = new mongoose.Schema(
  {
    postRehabCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PostRehabCase',
      required: true,
    },
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },

    // ── Survey Info ──
    surveyType: {
      type: String,
      enum: [
        'SATISFACTION',
        'OUTCOME',
        'QUALITY_OF_LIFE',
        'FAMILY_FEEDBACK',
        'COMPREHENSIVE',
        'CUSTOM',
      ],
      required: true,
    },
    surveyTypeAr: { type: String },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    descriptionAr: { type: String },
    milestone: {
      type: String,
      enum: ['3_MONTHS', '6_MONTHS', '1_YEAR', '2_YEARS', 'AD_HOC'],
    },

    // ── Status ──
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
    },
    sentDate: { type: Date },
    completedDate: { type: Date },
    expiryDate: { type: Date },
    deliveryMethod: {
      type: String,
      enum: ['EMAIL', 'SMS', 'WHATSAPP', 'IN_PERSON', 'PORTAL', 'PHONE'],
    },

    // ── Respondent ──
    respondentType: {
      type: String,
      enum: ['BENEFICIARY', 'PARENT', 'GUARDIAN', 'CAREGIVER', 'TEACHER', 'EMPLOYER'],
      default: 'BENEFICIARY',
    },
    respondentName: { type: String },
    respondentRelation: { type: String },

    // ── Responses ──
    responses: [surveyResponseSchema],
    totalScore: { type: Number },
    maxScore: { type: Number },
    scorePercentage: { type: Number, min: 0, max: 100 },
    satisfactionLevel: {
      type: String,
      enum: ['VERY_SATISFIED', 'SATISFIED', 'NEUTRAL', 'DISSATISFIED', 'VERY_DISSATISFIED'],
    },

    // ── Analysis ──
    keyFindings: [String],
    keyFindingsAr: [String],
    areasOfImprovement: [String],
    areasOfImprovementAr: [String],

    // ── Metadata ──
    administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    notesAr: { type: String },
  },
  { timestamps: true }
);

postRehabSurveySchema.index({ postRehabCase: 1, surveyType: 1 });
postRehabSurveySchema.index({ status: 1, sentDate: 1 });
postRehabSurveySchema.index({ beneficiary: 1, milestone: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 5. RE-ENROLLMENT REQUEST — طلب إعادة تسجيل
// ═══════════════════════════════════════════════════════════════════════════════

const reEnrollmentRequestSchema = new mongoose.Schema(
  {
    postRehabCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PostRehabCase',
      required: true,
    },
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },

    // ── Request Info ──
    requestNumber: { type: String, unique: true },
    requestType: {
      type: String,
      enum: ['AUTOMATIC', 'SPECIALIST_RECOMMENDATION', 'FAMILY_REQUEST', 'EMERGENCY'],
      required: true,
    },
    requestTypeAr: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ENROLLED', 'CANCELLED'],
      default: 'PENDING',
    },

    // ── Trigger Info (why re-enrollment is needed) ──
    triggerType: {
      type: String,
      enum: [
        'REGRESSION_DETECTED',
        'LOW_IMPACT_SCORE',
        'FAMILY_CONCERN',
        'SPECIALIST_OBSERVATION',
        'SURVEY_RESULT',
        'MISSED_MILESTONES',
        'NEW_DIAGNOSIS',
        'LIFE_CHANGE',
      ],
      required: true,
    },
    triggerDetails: { type: String },
    triggerDetailsAr: { type: String },

    // ── Evidence ──
    supportingEvidence: {
      impactMeasurement: { type: mongoose.Schema.Types.ObjectId, ref: 'ImpactMeasurement' },
      followUpVisit: { type: mongoose.Schema.Types.ObjectId, ref: 'FollowUpVisit' },
      survey: { type: mongoose.Schema.Types.ObjectId, ref: 'PostRehabSurvey' },
      domainScoresAtTrigger: [domainScoreSchema],
      riskLevel: {
        type: String,
        enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      },
    },

    // ── Recommended Program ──
    recommendedProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    recommendedProgramName: { type: String },
    recommendedServices: [String],
    urgencyLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },

    // ── Review Process ──
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewDate: { type: Date },
    reviewNotes: { type: String },
    reviewNotesAr: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: { type: Date },
    rejectionReason: { type: String },

    // ── New Enrollment ──
    newEnrollmentId: { type: mongoose.Schema.Types.ObjectId },
    enrollmentDate: { type: Date },

    // ── Metadata ──
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    notesAr: { type: String },
  },
  { timestamps: true }
);

reEnrollmentRequestSchema.index({ postRehabCase: 1, status: 1 });
reEnrollmentRequestSchema.index({ beneficiary: 1 });
reEnrollmentRequestSchema.index({ status: 1, urgencyLevel: 1 });

// ── Auto-generate request number ──
reEnrollmentRequestSchema.pre('save', async function (next) {
  if (!this.requestNumber) {
    const count = await mongoose.model('ReEnrollmentRequest').countDocuments();
    const year = new Date().getFullYear();
    this.requestNumber = `RER-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

const PostRehabCase =
  mongoose.models.PostRehabCase || mongoose.model('PostRehabCase', postRehabCaseSchema);
const FollowUpVisit =
  mongoose.models.FollowUpVisit || mongoose.model('FollowUpVisit', followUpVisitSchema);
const ImpactMeasurement =
  mongoose.models.ImpactMeasurement || mongoose.model('ImpactMeasurement', impactMeasurementSchema);
const PostRehabSurvey =
  mongoose.models.PostRehabSurvey || mongoose.model('PostRehabSurvey', postRehabSurveySchema);
const ReEnrollmentRequest =
  mongoose.models.ReEnrollmentRequest ||
  mongoose.model('ReEnrollmentRequest', reEnrollmentRequestSchema);

module.exports = {
  PostRehabCase,
  FollowUpVisit,
  ImpactMeasurement,
  PostRehabSurvey,
  ReEnrollmentRequest,
};

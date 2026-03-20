/**
 * RehabProgramTemplate — قوالب برامج التأهيل المتخصصة
 *
 * يتضمن:
 *   - قوالب البرامج التأهيلية (12 برنامج)
 *   - مراحل البرنامج وأهدافه
 *   - أنشطة وتدخلات كل مرحلة
 *   - تسجيل المستفيدين في البرامج
 *   - تتبع التقدم
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ─── Sub-schemas ──────────────────────────────────────────────────────────── */

const ActivitySchema = new Schema(
  {
    nameAr: { type: String, required: true },
    nameEn: { type: String },
    description: { type: String },
    duration: { type: Number, default: 30 }, // minutes
    frequency: {
      type: String,
      enum: ['daily', 'twice_weekly', 'three_weekly', 'weekly', 'biweekly', 'monthly', 'as_needed'],
      default: 'weekly',
    },
    materials: [{ type: String }],
    instructions: { type: String },
    targetDomain: { type: String },
    difficultyLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
  },
  { _id: false }
);

const PhaseSchema = new Schema(
  {
    phaseNumber: { type: Number, required: true },
    nameAr: { type: String, required: true },
    nameEn: { type: String },
    description: { type: String },
    durationWeeks: { type: Number, required: true },
    objectives: [
      {
        textAr: { type: String, required: true },
        textEn: { type: String },
        measurable: { type: Boolean, default: true },
        targetMetric: { type: String },
        targetValue: { type: Number },
      },
    ],
    activities: [ActivitySchema],
    assessmentRequired: { type: Boolean, default: false },
    requiredScales: [{ type: String }], // scale codes from SpecializedAssessmentScale
    entryRequirements: { type: String },
    exitCriteria: { type: String },
  },
  { _id: false }
);

const OutcomeMeasureSchema = new Schema(
  {
    name: { type: String, required: true },
    measureType: {
      type: String,
      enum: [
        'scale_score',
        'goal_achievement',
        'behavior_frequency',
        'independence_level',
        'participation_rate',
        'custom',
      ],
      required: true,
    },
    scaleCode: { type: String },
    targetImprovement: { type: Number }, // percentage
    measureFrequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'per_phase'],
      default: 'monthly',
    },
  },
  { _id: false }
);

/* ─── Main Template Schema ──────────────────────────────────────────── */

const RehabProgramTemplateSchema = new Schema(
  {
    programCode: {
      type: String,
      required: [true, 'رمز البرنامج مطلوب'],
      unique: true,
      uppercase: true,
      trim: true,
    },

    nameAr: { type: String, required: [true, 'اسم البرنامج بالعربية مطلوب'] },
    nameEn: { type: String },
    abbreviation: { type: String },

    category: {
      type: String,
      required: true,
      enum: [
        'early_intervention', // التدخل المبكر
        'aba_therapy', // تحليل السلوك التطبيقي
        'sensory_integration', // التكامل الحسي
        'speech_language', // التأهيل النطقي واللغوي
        'physical_therapy', // العلاج الطبيعي المكثف
        'occupational_therapy', // العلاج الوظيفي
        'cognitive_rehab', // التأهيل المعرفي
        'vocational_rehab', // التأهيل المهني
        'life_skills', // المهارات الحياتية
        'social_skills', // المهارات الاجتماعية
        'family_training', // تدريب الأسرة
        'community_integration', // الدمج المجتمعي
        'assistive_technology', // التقنيات المساعدة
        'transition_planning', // التخطيط الانتقالي
        'behavioral_support', // الدعم السلوكي
      ],
    },

    targetDisabilities: [
      {
        type: String,
        enum: [
          'autism',
          'physical',
          'visual',
          'hearing',
          'intellectual',
          'learning',
          'multiple',
          'speech',
          'behavioral',
          'developmental',
          'down_syndrome',
          'cerebral_palsy',
          'adhd',
          'sensory_processing',
        ],
      },
    ],

    targetAgeRange: {
      minMonths: { type: Number },
      maxMonths: { type: Number },
      label: { type: String },
    },

    severityLevels: [
      {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'profound', 'all'],
        default: ['all'],
      },
    ],

    description: { type: String },
    rationale: { type: String },
    evidenceBase: { type: String },

    totalDurationWeeks: { type: Number, required: true },
    sessionsPerWeek: { type: Number, required: true },
    sessionDuration: { type: Number, required: true }, // minutes
    groupSize: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 1 },
      type_: { type: String, enum: ['individual', 'group', 'both'], default: 'individual' },
    },

    phases: [PhaseSchema],

    requiredTeam: [
      {
        role: {
          type: String,
          enum: [
            'physical_therapist',
            'occupational_therapist',
            'speech_therapist',
            'psychologist',
            'behavior_analyst',
            'special_educator',
            'social_worker',
            'vocational_counselor',
            'nurse',
            'physician',
            'assistive_tech_specialist',
            'family_counselor',
            'recreation_therapist',
          ],
          required: true,
        },
        roleNameAr: { type: String },
        isPrimary: { type: Boolean, default: false },
        minimumQualification: { type: String },
      },
    ],

    prerequisites: {
      assessments: [{ type: String }], // required scale codes
      skills: [{ type: String }],
      medicalClearance: { type: Boolean, default: false },
      familyCommitment: { type: Boolean, default: false },
    },

    outcomeMeasures: [OutcomeMeasureSchema],

    expectedOutcomes: [
      {
        outcomeAr: { type: String },
        outcomeEn: { type: String },
        measureMethod: { type: String },
      },
    ],

    contraindications: [{ type: String }],
    modifications: {
      forMild: { type: String },
      forModerate: { type: String },
      forSevere: { type: String },
    },

    costEstimate: {
      perSession: { type: Number },
      totalEstimate: { type: Number },
      currency: { type: String, default: 'SAR' },
    },

    isActive: { type: Boolean, default: true },
    isBuiltIn: { type: Boolean, default: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ─── Indexes ──────────────────────────────────────────────────────────────── */

RehabProgramTemplateSchema.index({ category: 1, isActive: 1 });
RehabProgramTemplateSchema.index({ targetDisabilities: 1 });
RehabProgramTemplateSchema.index({ nameAr: 'text', nameEn: 'text', description: 'text' });

/* ─── Virtuals ─────────────────────────────────────────────────────────────── */

RehabProgramTemplateSchema.virtual('phaseCount').get(function () {
  return this.phases ? this.phases.length : 0;
});

RehabProgramTemplateSchema.virtual('totalSessions').get(function () {
  return this.totalDurationWeeks * this.sessionsPerWeek;
});

/* ═══════════════════════════════════════════════════════════════════════════ *
 * Enrollment — تسجيل المستفيد في البرنامج
 * ═══════════════════════════════════════════════════════════════════════════ */

const EnrollmentGoalSchema = new Schema({
  goalText: { type: String, required: true },
  domain: { type: String },
  targetDate: { type: Date },
  baseline: { type: Number },
  target: { type: Number },
  current: { type: Number, default: 0 },
  status: {
    type: String,
    enum: [
      'not_started',
      'in_progress',
      'achieved',
      'partially_achieved',
      'not_achieved',
      'discontinued',
    ],
    default: 'not_started',
  },
  progressNotes: [
    {
      date: { type: Date, default: Date.now },
      value: { type: Number },
      note: { type: String },
      recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
  ],
});

const SessionLogSchema = new Schema(
  {
    sessionNumber: { type: Number, required: true },
    date: { type: Date, required: true },
    duration: { type: Number }, // actual minutes
    therapist: { type: Schema.Types.ObjectId, ref: 'User' },
    phaseNumber: { type: Number },
    activitiesCompleted: [{ type: String }],
    attendance: {
      type: String,
      enum: ['present', 'absent', 'late', 'cancelled', 'makeup'],
      default: 'present',
    },
    beneficiaryMood: {
      type: String,
      enum: ['excellent', 'good', 'neutral', 'poor', 'distressed'],
    },
    engagement: {
      type: String,
      enum: ['highly_engaged', 'engaged', 'partially_engaged', 'disengaged'],
    },
    goalsAddressed: [{ type: Schema.Types.ObjectId }],
    progressRating: { type: Number, min: 1, max: 5 },
    soapNotes: {
      subjective: { type: String },
      objective: { type: String },
      assessment: { type: String },
      plan: { type: String },
    },
    notes: { type: String },
  },
  { timestamps: true }
);

const ProgramEnrollmentSchema = new Schema(
  {
    programTemplate: { type: Schema.Types.ObjectId, ref: 'RehabProgramTemplate', required: true },
    programCode: { type: String, required: true },

    beneficiary: { type: Schema.Types.ObjectId, ref: 'BeneficiaryFile', required: true },

    enrollmentDate: { type: Date, required: true, default: Date.now },
    expectedEndDate: { type: Date },
    actualEndDate: { type: Date },

    status: {
      type: String,
      enum: ['pending', 'active', 'on_hold', 'completed', 'graduated', 'withdrawn', 'transferred'],
      default: 'pending',
    },

    currentPhase: { type: Number, default: 1 },
    completedPhases: [{ type: Number }],

    primaryTherapist: { type: Schema.Types.ObjectId, ref: 'User' },
    teamMembers: [
      {
        member: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        joinDate: { type: Date, default: Date.now },
      },
    ],

    individualGoals: [EnrollmentGoalSchema],
    sessionLogs: [SessionLogSchema],

    assessmentResults: [
      {
        scaleCode: { type: String },
        resultId: { type: Schema.Types.ObjectId, ref: 'SpecializedScaleResult' },
        date: { type: Date },
        score: { type: Number },
        phase: { type: Number },
        type: { type: String, enum: ['baseline', 'progress', 'final'] },
      },
    ],

    overallProgress: {
      baselineDate: { type: Date },
      lastUpdateDate: { type: Date },
      overallPercentage: { type: Number, default: 0 },
      goalsAchieved: { type: Number, default: 0 },
      totalGoals: { type: Number, default: 0 },
      sessionsAttended: { type: Number, default: 0 },
      totalSessionsScheduled: { type: Number, default: 0 },
      attendanceRate: { type: Number, default: 0 },
    },

    familyInvolvement: {
      participationLevel: {
        type: String,
        enum: ['high', 'moderate', 'low', 'none'],
        default: 'moderate',
      },
      homeExercises: { type: Boolean, default: false },
      trainingCompleted: [{ type: String }],
      satisfactionRating: { type: Number, min: 1, max: 5 },
    },

    modifications: [
      {
        date: { type: Date, default: Date.now },
        modifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        description: { type: String },
        reason: { type: String },
      },
    ],

    dischargeSummary: {
      dischargeDate: { type: Date },
      reason: { type: String },
      outcomeSummary: { type: String },
      goalsAchieved: [{ type: String }],
      recommendations: [{ type: String }],
      followUpPlan: { type: String },
      referrals: [{ type: String }],
    },

    enrolledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ─── Indexes ──────────────────────────────────────────────────────────────── */

ProgramEnrollmentSchema.index({ beneficiary: 1, status: 1 });
ProgramEnrollmentSchema.index({ programTemplate: 1, status: 1 });
ProgramEnrollmentSchema.index({ primaryTherapist: 1, status: 1 });
ProgramEnrollmentSchema.index({ enrollmentDate: -1 });
ProgramEnrollmentSchema.index({ programCode: 1, beneficiary: 1 });

/* ─── Virtuals ─────────────────────────────────────────────────────────────── */

ProgramEnrollmentSchema.virtual('durationDays').get(function () {
  if (!this.enrollmentDate) return 0;
  const end = this.actualEndDate || new Date();
  return Math.ceil((end - this.enrollmentDate) / (1000 * 60 * 60 * 24));
});

ProgramEnrollmentSchema.virtual('completionRate').get(function () {
  if (!this.overallProgress || !this.overallProgress.totalGoals) return 0;
  return Math.round((this.overallProgress.goalsAchieved / this.overallProgress.totalGoals) * 100);
});

/* ─── Export ───────────────────────────────────────────────────────────────── */

const RehabProgramTemplate = mongoose.model('RehabProgramTemplate', RehabProgramTemplateSchema);
const ProgramEnrollment = mongoose.model('ProgramEnrollment', ProgramEnrollmentSchema);

module.exports = { RehabProgramTemplate, ProgramEnrollment };

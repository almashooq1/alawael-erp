/**
 * Mental Health & Psychosocial Support Models
 * نماذج الدعم النفسي والصحة النفسية
 *
 * Models:
 *  1. CounselingSession   — جلسات الإرشاد النفسي (فردي / جماعي)
 *  2. MentalHealthProgram — برامج دعم الصحة النفسية
 *  3. PsychologicalAssessment — التقييمات النفسية الدورية
 *  4. CrisisIntervention  — خطط التدخل للأزمات النفسية
 *  5. SupportGroup        — مجموعات الدعم النفسي الاجتماعي
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ══════════════════════════════════════════════════════════════════════════════
// 1. CounselingSession — جلسات الإرشاد النفسي
// ══════════════════════════════════════════════════════════════════════════════

const counselingSessionSchema = new Schema(
  {
    sessionNumber: { type: String, unique: true },
    type: {
      type: String,
      enum: ['فردي', 'جماعي', 'أسري', 'زوجي', 'individual', 'group', 'family', 'couples'],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'مجدولة',
        'جارية',
        'مكتملة',
        'ملغية',
        'لم يحضر',
        'scheduled',
        'in-progress',
        'completed',
        'cancelled',
        'no-show',
      ],
      default: 'مجدولة',
    },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    counselor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledDate: { type: Date, required: true },
    startTime: { type: String }, // HH:mm
    endTime: { type: String },
    actualDurationMinutes: { type: Number, min: 0 },
    location: {
      type: String,
      enum: [
        'مكتب',
        'غرفة علاج',
        'عن بعد',
        'منزلي',
        'office',
        'therapy-room',
        'remote',
        'home-visit',
      ],
      default: 'مكتب',
    },
    remoteSessionLink: { type: String },

    // Clinical info
    chiefComplaint: { type: String },
    sessionGoals: [{ type: String }],
    interventionsUsed: [
      {
        type: String,
        enum: [
          'العلاج المعرفي السلوكي',
          'العلاج بالتحدث',
          'العلاج بالفن',
          'العلاج باللعب',
          'الاسترخاء',
          'إعادة الهيكلة المعرفية',
          'التعرض التدريجي',
          'حل المشكلات',
          'التدريب على المهارات الاجتماعية',
          'CBT',
          'talk-therapy',
          'art-therapy',
          'play-therapy',
          'relaxation',
          'cognitive-restructuring',
          'gradual-exposure',
          'problem-solving',
          'social-skills-training',
          'other',
        ],
      },
    ],
    sessionNotes: {
      subjective: { type: String }, // تقرير المستفيد
      objective: { type: String }, // ملاحظات الأخصائي الموضوعية
      assessment: { type: String }, // التقييم
      plan: { type: String }, // الخطة
    },
    moodRating: { type: Number, min: 1, max: 10 },
    progressRating: { type: Number, min: 1, max: 10 },
    riskLevel: {
      type: String,
      enum: ['منخفض', 'متوسط', 'مرتفع', 'حرج', 'low', 'moderate', 'high', 'critical'],
      default: 'منخفض',
    },
    homework: [{ description: String, completed: { type: Boolean, default: false } }],
    nextSessionDate: { type: Date },
    referrals: [{ to: String, reason: String, date: Date }],
    consentObtained: { type: Boolean, default: false },
    confidentialityNoted: { type: Boolean, default: true },

    // Group session specific
    groupSize: { type: Number, min: 0 },
    participants: [{ type: Schema.Types.ObjectId, ref: 'Beneficiary' }],
    groupTopic: { type: String },

    // Attachments
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

counselingSessionSchema.virtual('durationMinutes').get(function () {
  if (this.startTime && this.endTime) {
    const toMin = t => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return toMin(this.endTime) - toMin(this.startTime);
  }
  return this.actualDurationMinutes || 0;
});

counselingSessionSchema.pre('save', async function () {
  if (!this.sessionNumber) {
    const count = await mongoose.model('CounselingSession').countDocuments();
    this.sessionNumber = `CS-${String(count + 1).padStart(6, '0')}`;
  }
});

counselingSessionSchema.index({ beneficiary: 1, scheduledDate: -1 });
counselingSessionSchema.index({ counselor: 1, scheduledDate: -1 });
counselingSessionSchema.index({ status: 1 });
counselingSessionSchema.index({ type: 1 });

// ══════════════════════════════════════════════════════════════════════════════
// 2. MentalHealthProgram — برامج دعم الصحة النفسية
// ══════════════════════════════════════════════════════════════════════════════

const mentalHealthProgramSchema = new Schema(
  {
    programCode: { type: String, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    category: {
      type: String,
      enum: [
        'إدارة القلق',
        'إدارة الاكتئاب',
        'دعم الأسرة',
        'تعزيز المرونة',
        'إدارة الغضب',
        'مهارات التكيف',
        'إدارة الضغوط',
        'الصحة النفسية للأطفال',
        'anxiety-management',
        'depression-management',
        'family-support',
        'resilience-building',
        'anger-management',
        'coping-skills',
        'stress-management',
        'child-mental-health',
      ],
      required: true,
    },
    targetAudience: {
      type: String,
      enum: [
        'مستفيدين',
        'أسر',
        'أطفال',
        'مراهقين',
        'بالغين',
        'كبار السن',
        'beneficiaries',
        'families',
        'children',
        'adolescents',
        'adults',
        'elderly',
      ],
      default: 'مستفيدين',
    },
    status: {
      type: String,
      enum: [
        'مخطط',
        'فعّال',
        'مكتمل',
        'معلّق',
        'ملغى',
        'planned',
        'active',
        'completed',
        'suspended',
        'cancelled',
      ],
      default: 'مخطط',
    },
    startDate: { type: Date },
    endDate: { type: Date },
    durationWeeks: { type: Number, min: 1 },
    sessionsPerWeek: { type: Number, min: 1, default: 1 },
    maxParticipants: { type: Number, min: 1 },
    enrolledParticipants: [{ type: Schema.Types.ObjectId, ref: 'Beneficiary' }],
    programLead: { type: Schema.Types.ObjectId, ref: 'User' },
    facilitators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    goals: [
      { description: String, measurable: { type: Boolean, default: true }, targetMetric: String },
    ],
    curriculum: [
      {
        weekNumber: Number,
        topic: String,
        activities: [String],
        materials: [String],
      },
    ],
    outcomes: {
      averageImprovement: { type: Number },
      completionRate: { type: Number },
      satisfactionScore: { type: Number },
      notes: { type: String },
    },
    budget: { type: Number, min: 0 },
    tags: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

mentalHealthProgramSchema.virtual('enrollmentCount').get(function () {
  return this.enrolledParticipants ? this.enrolledParticipants.length : 0;
});

mentalHealthProgramSchema.virtual('isFull').get(function () {
  if (!this.maxParticipants) return false;
  return (this.enrolledParticipants?.length || 0) >= this.maxParticipants;
});

mentalHealthProgramSchema.pre('save', async function () {
  if (!this.programCode) {
    const count = await mongoose.model('MentalHealthProgram').countDocuments();
    this.programCode = `MHP-${String(count + 1).padStart(5, '0')}`;
  }
});

mentalHealthProgramSchema.index({ status: 1 });
mentalHealthProgramSchema.index({ category: 1 });
mentalHealthProgramSchema.index({ targetAudience: 1 });

// ══════════════════════════════════════════════════════════════════════════════
// 3. PsychologicalAssessment — التقييمات النفسية الدورية
// ══════════════════════════════════════════════════════════════════════════════

const assessmentItemSchema = new Schema(
  {
    question: { type: String, required: true },
    questionAr: { type: String },
    score: { type: Number, min: 0 },
    maxScore: { type: Number, min: 0 },
    response: { type: String },
  },
  { _id: false }
);

const psychologicalAssessmentSchema = new Schema(
  {
    assessmentCode: { type: String, unique: true },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assessmentDate: { type: Date, required: true, default: Date.now },
    type: {
      type: String,
      enum: [
        'قلق',
        'اكتئاب',
        'تكيف',
        'ضغوط ما بعد الصدمة',
        'احترام الذات',
        'مهارات اجتماعية',
        'شامل',
        'anxiety',
        'depression',
        'adjustment',
        'ptsd',
        'self-esteem',
        'social-skills',
        'comprehensive',
      ],
      required: true,
    },
    toolUsed: {
      type: String,
      enum: [
        'PHQ-9',
        'GAD-7',
        'BDI-II',
        'BAI',
        'PCL-5',
        'DASS-21',
        'PSS-10',
        'WHO-5',
        'K10',
        'SDQ',
        'RCMAS',
        'CDI',
        'custom',
        'أخرى',
      ],
      default: 'custom',
    },
    status: {
      type: String,
      enum: ['مسودة', 'مكتمل', 'مراجع', 'معتمد', 'draft', 'completed', 'reviewed', 'approved'],
      default: 'مسودة',
    },
    items: [assessmentItemSchema],
    totalScore: { type: Number, min: 0 },
    maxPossibleScore: { type: Number, min: 0 },
    percentageScore: { type: Number, min: 0, max: 100 },
    severityLevel: {
      type: String,
      enum: [
        'طبيعي',
        'خفيف',
        'متوسط',
        'شديد',
        'شديد جداً',
        'normal',
        'mild',
        'moderate',
        'severe',
        'very-severe',
      ],
    },
    clinicalInterpretation: { type: String },
    recommendations: [{ type: String }],
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },
    previousAssessment: { type: Schema.Types.ObjectId, ref: 'PsychologicalAssessment' },
    changeFromPrevious: {
      direction: {
        type: String,
        enum: ['تحسن', 'تراجع', 'مستقر', 'improved', 'declined', 'stable'],
      },
      scoreDifference: { type: Number },
    },
    notes: { type: String },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

psychologicalAssessmentSchema.pre('save', async function () {
  // Auto-calculate totals
  if (this.items && this.items.length > 0) {
    this.totalScore = this.items.reduce((sum, item) => sum + (item.score || 0), 0);
    this.maxPossibleScore = this.items.reduce((sum, item) => sum + (item.maxScore || 0), 0);
    if (this.maxPossibleScore > 0) {
      this.percentageScore = Math.round((this.totalScore / this.maxPossibleScore) * 100);
    }
  }
  if (!this.assessmentCode) {
    const count = await mongoose.model('PsychologicalAssessment').countDocuments();
    this.assessmentCode = `PA-${String(count + 1).padStart(6, '0')}`;
  }
});

psychologicalAssessmentSchema.index({ beneficiary: 1, assessmentDate: -1 });
psychologicalAssessmentSchema.index({ type: 1 });
psychologicalAssessmentSchema.index({ severityLevel: 1 });
psychologicalAssessmentSchema.index({ assessor: 1 });

// ══════════════════════════════════════════════════════════════════════════════
// 4. CrisisIntervention — خطط التدخل للأزمات النفسية
// ══════════════════════════════════════════════════════════════════════════════

const crisisInterventionSchema = new Schema(
  {
    caseNumber: { type: String, unique: true },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    reportedDate: { type: Date, required: true, default: Date.now },
    resolvedDate: { type: Date },

    crisisType: {
      type: String,
      enum: [
        'أفكار انتحارية',
        'إيذاء ذاتي',
        'عنف',
        'انهيار نفسي',
        'ذهان حاد',
        'صدمة',
        'إدمان',
        'فقدان وحداد',
        'suicidal-ideation',
        'self-harm',
        'violence',
        'psychotic-break',
        'acute-psychosis',
        'trauma',
        'substance-abuse',
        'grief-loss',
        'other',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['منخفض', 'متوسط', 'مرتفع', 'حرج', 'low', 'moderate', 'high', 'critical'],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'مبلّغ',
        'قيد التقييم',
        'قيد التدخل',
        'مستقر',
        'تم الحل',
        'متابعة',
        'محوّل',
        'reported',
        'assessing',
        'intervening',
        'stabilized',
        'resolved',
        'follow-up',
        'referred',
      ],
      default: 'مبلّغ',
    },
    description: { type: String, required: true },

    riskAssessment: {
      immediateDanger: { type: Boolean, default: false },
      accessToMeans: { type: Boolean, default: false },
      previousAttempts: { type: Boolean, default: false },
      supportSystemAvailable: { type: Boolean, default: true },
      protectiveFactors: [{ type: String }],
      riskFactors: [{ type: String }],
      overallRiskScore: { type: Number, min: 0, max: 10 },
    },

    interventionPlan: {
      immediateActions: [
        { action: String, responsible: String, completed: { type: Boolean, default: false } },
      ],
      safetyPlan: {
        warningSignals: [{ type: String }],
        copingStrategies: [{ type: String }],
        supportContacts: [{ name: String, phone: String, relationship: String }],
        professionalContacts: [{ name: String, phone: String, role: String }],
        environmentSafety: [{ type: String }],
        reasonsForLiving: [{ type: String }],
      },
      shortTermGoals: [{ goal: String, timeline: String }],
      longTermGoals: [{ goal: String, timeline: String }],
    },

    timeline: [
      {
        date: { type: Date, default: Date.now },
        action: String,
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        notes: String,
      },
    ],

    referrals: [
      {
        referredTo: String,
        reason: String,
        date: Date,
        status: { type: String, enum: ['pending', 'accepted', 'completed', 'declined'] },
      },
    ],

    followUps: [
      {
        date: Date,
        notes: String,
        conductedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        beneficiaryStable: { type: Boolean },
      },
    ],

    outcome: {
      type: String,
      enum: [
        'تم الحل',
        'محوّل لعلاج طويل',
        'محوّل لمستشفى',
        'مستمر بالمتابعة',
        'resolved',
        'referred-long-term',
        'hospitalized',
        'ongoing-monitoring',
      ],
    },

    confidential: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

crisisInterventionSchema.virtual('resolutionDays').get(function () {
  if (this.resolvedDate && this.reportedDate) {
    return Math.ceil((this.resolvedDate - this.reportedDate) / (1000 * 60 * 60 * 24));
  }
  return null;
});

crisisInterventionSchema.pre('save', async function () {
  if (!this.caseNumber) {
    const count = await mongoose.model('CrisisIntervention').countDocuments();
    this.caseNumber = `CI-${String(count + 1).padStart(6, '0')}`;
  }
});

crisisInterventionSchema.index({ beneficiary: 1, reportedDate: -1 });
crisisInterventionSchema.index({ severity: 1, status: 1 });
crisisInterventionSchema.index({ assignedTo: 1 });
crisisInterventionSchema.index({ crisisType: 1 });

// ══════════════════════════════════════════════════════════════════════════════
// 5. SupportGroup — مجموعات الدعم النفسي الاجتماعي
// ══════════════════════════════════════════════════════════════════════════════

const supportGroupSchema = new Schema(
  {
    groupCode: { type: String, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    category: {
      type: String,
      enum: [
        'دعم الأقران',
        'دعم أسري',
        'دعم مقدمي الرعاية',
        'مهارات حياتية',
        'إدارة الغضب',
        'التعافي',
        'الفقدان والحداد',
        'peer-support',
        'family-support',
        'caregiver-support',
        'life-skills',
        'anger-management',
        'recovery',
        'grief-bereavement',
        'other',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'فعّالة',
        'معلّقة',
        'مكتملة',
        'ملغاة',
        'active',
        'suspended',
        'completed',
        'cancelled',
      ],
      default: 'فعّالة',
    },
    facilitator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coFacilitator: { type: Schema.Types.ObjectId, ref: 'User' },
    members: [
      {
        beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
        joinedDate: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['active', 'inactive', 'graduated', 'withdrawn'],
          default: 'active',
        },
      },
    ],
    maxMembers: { type: Number, min: 2, default: 12 },
    meetingSchedule: {
      dayOfWeek: {
        type: String,
        enum: [
          'الأحد',
          'الاثنين',
          'الثلاثاء',
          'الأربعاء',
          'الخميس',
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
        ],
      },
      time: { type: String }, // HH:mm
      frequency: {
        type: String,
        enum: ['أسبوعي', 'نصف شهري', 'شهري', 'weekly', 'biweekly', 'monthly'],
        default: 'أسبوعي',
      },
      location: { type: String },
      durationMinutes: { type: Number, default: 90 },
    },
    startDate: { type: Date },
    endDate: { type: Date },
    sessions: [
      {
        sessionNumber: Number,
        date: Date,
        topic: String,
        attendees: [{ type: Schema.Types.ObjectId, ref: 'Beneficiary' }],
        facilitatorNotes: String,
        groupDynamicsRating: { type: Number, min: 1, max: 10 },
        keyThemes: [{ type: String }],
      },
    ],
    rules: [{ type: String }],
    goals: [{ type: String }],
    outcomes: {
      averageSatisfaction: { type: Number },
      attendanceRate: { type: Number },
      completionRate: { type: Number },
      qualitativeResults: { type: String },
    },
    tags: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

supportGroupSchema.virtual('activeMemberCount').get(function () {
  return this.members ? this.members.filter(m => m.status === 'active').length : 0;
});

supportGroupSchema.virtual('totalSessions').get(function () {
  return this.sessions ? this.sessions.length : 0;
});

supportGroupSchema.pre('save', async function () {
  if (!this.groupCode) {
    const count = await mongoose.model('SupportGroup').countDocuments();
    this.groupCode = `SG-${String(count + 1).padStart(5, '0')}`;
  }
});

supportGroupSchema.index({ status: 1 });
supportGroupSchema.index({ category: 1 });
supportGroupSchema.index({ facilitator: 1 });
supportGroupSchema.index({ 'members.beneficiary': 1 });

// ══════════════════════════════════════════════════════════════════════════════
// Export Models
// ══════════════════════════════════════════════════════════════════════════════

const CounselingSession =
  mongoose.models.CounselingSession || mongoose.model('CounselingSession', counselingSessionSchema);

const MentalHealthProgram =
  mongoose.models.MentalHealthProgram ||
  mongoose.model('MentalHealthProgram', mentalHealthProgramSchema);

const PsychologicalAssessment =
  mongoose.models.PsychologicalAssessment ||
  mongoose.model('PsychologicalAssessment', psychologicalAssessmentSchema);

const CrisisIntervention =
  mongoose.models.CrisisIntervention ||
  mongoose.model('CrisisIntervention', crisisInterventionSchema);

const SupportGroup =
  mongoose.models.SupportGroup || mongoose.model('SupportGroup', supportGroupSchema);

module.exports = {
  CounselingSession,
  MentalHealthProgram,
  PsychologicalAssessment,
  CrisisIntervention,
  SupportGroup,
};

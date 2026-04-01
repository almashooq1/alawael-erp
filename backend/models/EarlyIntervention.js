/**
 * Early Intervention System Models — نماذج نظام التدخل المبكر
 *
 * Covers:
 *  1. EarlyInterventionChild  – ملف الطفل (0–3 سنوات)
 *  2. DevelopmentalScreening   – الفحص والكشف المبكر
 *  3. DevelopmentalMilestone   – تتبع المعالم التنموية
 *  4. IFSP                    – خطة الخدمات الأسرية الفردية
 *  5. EarlyReferral           – الإحالات المبكرة
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-SCHEMAS — مخططات فرعية
// ═══════════════════════════════════════════════════════════════════════════════

// ── Birth Information ──
const birthInfoSchema = new mongoose.Schema(
  {
    birthDate: { type: Date, required: true },
    gestationalAge: { type: Number, min: 20, max: 45 }, // weeks
    birthWeight: { type: Number }, // grams
    birthLength: { type: Number }, // cm
    headCircumference: { type: Number }, // cm
    apgarScore1Min: { type: Number, min: 0, max: 10 },
    apgarScore5Min: { type: Number, min: 0, max: 10 },
    deliveryType: {
      type: String,
      enum: ['VAGINAL', 'CESAREAN', 'ASSISTED', 'OTHER'],
    },
    complications: [String],
    nicu: { type: Boolean, default: false },
    nicuDays: { type: Number, default: 0 },
    birthHospital: { type: String },
    birthHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { _id: false }
);

// ── Parent / Guardian Contact ──
const parentInfoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    relationship: {
      type: String,
      enum: ['MOTHER', 'FATHER', 'GUARDIAN', 'GRANDPARENT', 'OTHER'],
      required: true,
    },
    nationalId: { type: String },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    city: { type: String },
    isEmergencyContact: { type: Boolean, default: false },
    isPrimaryCaregiver: { type: Boolean, default: false },
    educationLevel: {
      type: String,
      enum: ['NONE', 'PRIMARY', 'SECONDARY', 'DIPLOMA', 'BACHELOR', 'MASTER', 'PHD'],
    },
    occupation: { type: String },
    preferredLanguage: { type: String, default: 'ar' },
  },
  { _id: true }
);

// ── Medical History Entry ──
const medicalHistorySchema = new mongoose.Schema(
  {
    condition: { type: String, required: true },
    conditionAr: { type: String },
    diagnosedDate: { type: Date },
    diagnosedBy: { type: String },
    hospital: { type: String },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED', 'CHRONIC', 'MONITORING'],
      default: 'ACTIVE',
    },
    medications: [String],
    notes: { type: String },
  },
  { _id: true }
);

// ── Risk Factor ──
const riskFactorSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['PRENATAL', 'PERINATAL', 'POSTNATAL', 'GENETIC', 'ENVIRONMENTAL', 'FAMILIAL', 'OTHER'],
      required: true,
    },
    factor: { type: String, required: true },
    factorAr: { type: String },
    severity: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      default: 'MODERATE',
    },
    identifiedDate: { type: Date },
    notes: { type: String },
  },
  { _id: true }
);

// ── Screening Tool Result ──
const screeningToolResultSchema = new mongoose.Schema(
  {
    toolName: { type: String, required: true },
    toolNameAr: { type: String },
    toolType: {
      type: String,
      enum: [
        'ASQ_3',
        'ASQ_SE',
        'DENVER_II',
        'BAYLEY_III',
        'M_CHAT_R',
        'PEDS',
        'AGES_STAGES',
        'CDCL',
        'PALSI',
        'CUSTOM',
      ],
    },
    domain: {
      type: String,
      enum: [
        'COMMUNICATION',
        'GROSS_MOTOR',
        'FINE_MOTOR',
        'PROBLEM_SOLVING',
        'PERSONAL_SOCIAL',
        'COGNITIVE',
        'ADAPTIVE',
        'SOCIO_EMOTIONAL',
        'SENSORY',
        'ALL',
      ],
    },
    rawScore: { type: Number },
    standardScore: { type: Number },
    percentile: { type: Number, min: 0, max: 100 },
    ageEquivalent: { type: Number }, // months
    cutoffResult: {
      type: String,
      enum: ['ABOVE_CUTOFF', 'MONITORING_ZONE', 'BELOW_CUTOFF', 'AT_RISK', 'TYPICAL'],
    },
    notes: { type: String },
  },
  { _id: true }
);

// ── IFSP Goal ──
const ifspGoalSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      enum: ['COGNITIVE', 'COMMUNICATION', 'PHYSICAL', 'ADAPTIVE', 'SOCIAL_EMOTIONAL', 'SENSORY'],
      required: true,
    },
    goalStatement: { type: String, required: true },
    goalStatementAr: { type: String },
    currentLevel: { type: String },
    targetLevel: { type: String },
    criteria: { type: String },
    timeline: { type: String },
    startDate: { type: Date },
    targetDate: { type: Date },
    strategies: [String],
    responsibleParty: { type: String },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'MODIFIED', 'DISCONTINUED'],
      default: 'NOT_STARTED',
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    progressNotes: [
      {
        date: { type: Date, default: Date.now },
        note: String,
        progressPercent: Number,
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { _id: true }
);

// ── IFSP Service ──
const ifspServiceSchema = new mongoose.Schema(
  {
    serviceType: {
      type: String,
      enum: [
        'SPEECH_THERAPY',
        'OCCUPATIONAL_THERAPY',
        'PHYSICAL_THERAPY',
        'BEHAVIORAL_THERAPY',
        'SPECIAL_EDUCATION',
        'AUDIOLOGY',
        'VISION_SERVICES',
        'NUTRITION',
        'PSYCHOLOGY',
        'SOCIAL_WORK',
        'NURSING',
        'ASSISTIVE_TECHNOLOGY',
        'FAMILY_TRAINING',
        'TRANSPORTATION',
        'RESPITE_CARE',
        'OTHER',
      ],
      required: true,
    },
    serviceTypeAr: { type: String },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    providerName: { type: String },
    providerOrganization: { type: String },
    frequency: { type: String }, // e.g. "2 sessions/week"
    duration: { type: Number }, // minutes per session
    location: {
      type: String,
      enum: ['HOME', 'CENTER', 'HOSPITAL', 'COMMUNITY', 'VIRTUAL', 'SCHOOL'],
    },
    startDate: { type: Date },
    endDate: { type: Date },
    cost: { type: Number },
    fundingSource: {
      type: String,
      enum: ['GOVERNMENT', 'INSURANCE', 'SELF_PAY', 'CHARITY', 'MIXED'],
    },
    status: {
      type: String,
      enum: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
      default: 'PLANNED',
    },
    notes: { type: String },
  },
  { _id: true }
);

// ── Transition Plan (from EI to preschool) ──
const transitionPlanSchema = new mongoose.Schema(
  {
    transitionDate: { type: Date },
    receivingProgram: { type: String },
    receivingProgramType: {
      type: String,
      enum: ['PRESCHOOL', 'SPECIAL_EDUCATION', 'INCLUSIVE_PROGRAM', 'CONTINUED_EI', 'OTHER'],
    },
    contactPerson: { type: String },
    contactPhone: { type: String },
    steps: [
      {
        description: String,
        dueDate: Date,
        completedDate: Date,
        status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'], default: 'PENDING' },
        responsibleParty: String,
      },
    ],
    familyPreparedness: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'READY'],
      default: 'NOT_STARTED',
    },
    notes: { type: String },
  },
  { _id: false }
);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. EARLY INTERVENTION CHILD — ملف الطفل
// ═══════════════════════════════════════════════════════════════════════════════

const earlyInterventionChildSchema = new mongoose.Schema(
  {
    // ── Identifiers ──
    childNumber: { type: String, unique: true },
    nationalId: { type: String },
    firstName: { type: String, required: true },
    firstNameAr: { type: String },
    lastName: { type: String, required: true },
    lastNameAr: { type: String },
    gender: { type: String, enum: ['MALE', 'FEMALE'], required: true },
    photo: { type: String },

    // ── Birth & Medical ──
    birthInfo: birthInfoSchema,
    bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    medicalHistory: [medicalHistorySchema],
    riskFactors: [riskFactorSchema],
    primaryDiagnosis: { type: String },
    primaryDiagnosisAr: { type: String },
    icdCode: { type: String },
    disabilityType: {
      type: String,
      enum: [
        'INTELLECTUAL',
        'PHYSICAL',
        'SENSORY_VISUAL',
        'SENSORY_AUDITORY',
        'SPEECH_LANGUAGE',
        'AUTISM_SPECTRUM',
        'DEVELOPMENTAL_DELAY',
        'GENETIC',
        'NEUROLOGICAL',
        'MULTIPLE',
        'AT_RISK',
        'UNDIAGNOSED',
        'OTHER',
      ],
    },
    disabilitySeverity: {
      type: String,
      enum: ['MILD', 'MODERATE', 'SEVERE', 'PROFOUND'],
    },

    // ── Family ──
    parents: [parentInfoSchema],
    familySize: { type: Number },
    siblingCount: { type: Number },
    familyIncome: {
      type: String,
      enum: ['LOW', 'MIDDLE', 'HIGH'],
    },
    homeLanguage: { type: String, default: 'ar' },
    interpreterNeeded: { type: Boolean, default: false },

    // ── Enrollment ──
    enrollmentDate: { type: Date },
    referralSource: {
      type: String,
      enum: [
        'HOSPITAL',
        'PEDIATRICIAN',
        'SELF_REFERRAL',
        'NATIONAL_SCREENING',
        'SCHOOL',
        'COMMUNITY',
        'OTHER',
      ],
    },
    referralSourceDetail: { type: String },
    eligibilityStatus: {
      type: String,
      enum: ['PENDING', 'ELIGIBLE', 'NOT_ELIGIBLE', 'CONDITIONAL'],
      default: 'PENDING',
    },
    eligibilityDate: { type: Date },
    eligibilityNotes: { type: String },

    // ── Current Status ──
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'TRANSITIONED', 'DISCHARGED', 'WAITLISTED', 'REFERRED'],
      default: 'ACTIVE',
    },
    dischargeDate: { type: Date },
    dischargeReason: { type: String },

    // ── Coordination ──
    primaryCoordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    careTeam: [
      {
        member: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        specialty: { type: String },
        startDate: { type: Date },
      },
    ],

    // ── Hospital Integration ──
    birthHospitalRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    pediatricianRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    insuranceInfo: {
      provider: { type: String },
      policyNumber: { type: String },
      coverageType: { type: String },
      expiryDate: { type: Date },
    },

    // ── Attachments ──
    attachments: [
      {
        name: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
        uploadDate: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        category: {
          type: String,
          enum: ['MEDICAL', 'ASSESSMENT', 'LEGAL', 'PHOTO', 'OTHER'],
        },
      },
    ],

    // ── Notes ──
    notes: { type: String },

    // ── Refs ──
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-generate childNumber
earlyInterventionChildSchema.pre('save', async function (next) {
  if (!this.childNumber) {
    const count = await mongoose.model('EarlyInterventionChild').countDocuments();
    this.childNumber = `EIC-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes
earlyInterventionChildSchema.index({ nationalId: 1 });
earlyInterventionChildSchema.index({ status: 1 });
earlyInterventionChildSchema.index({ 'birthInfo.birthDate': 1 });
earlyInterventionChildSchema.index({ eligibilityStatus: 1 });
earlyInterventionChildSchema.index({ primaryCoordinator: 1 });
earlyInterventionChildSchema.index({ organization: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DEVELOPMENTAL SCREENING — الفحص والكشف المبكر
// ═══════════════════════════════════════════════════════════════════════════════

const developmentalScreeningSchema = new mongoose.Schema(
  {
    screeningNumber: { type: String, unique: true },
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'EarlyInterventionChild', required: true },

    // ── Screening Details ──
    screeningDate: { type: Date, required: true },
    childAgeMonths: { type: Number, required: true }, // Age at screening in months
    screeningType: {
      type: String,
      enum: ['INITIAL', 'FOLLOW_UP', 'PERIODIC', 'REFERRAL_BASED', 'RE_EVALUATION'],
      default: 'INITIAL',
    },

    // ── Results by Tool ──
    toolResults: [screeningToolResultSchema],

    // ── Overall Assessment ──
    overallResult: {
      type: String,
      enum: ['TYPICAL', 'AT_RISK', 'DELAYED', 'SIGNIFICANT_DELAY', 'INCONCLUSIVE'],
      required: true,
    },
    delayedDomains: [
      {
        type: String,
        enum: [
          'COMMUNICATION',
          'GROSS_MOTOR',
          'FINE_MOTOR',
          'PROBLEM_SOLVING',
          'PERSONAL_SOCIAL',
          'COGNITIVE',
          'ADAPTIVE',
          'SOCIO_EMOTIONAL',
          'SENSORY',
        ],
      },
    ],
    developmentalAge: { type: Number }, // months
    developmentalQuotient: { type: Number }, // DQ = (developmental age / chronological age) × 100

    // ── Recommendations ──
    recommendation: {
      type: String,
      enum: [
        'NO_ACTION',
        'RESCREEN',
        'MONITOR',
        'REFER_EVALUATION',
        'REFER_INTERVENTION',
        'IMMEDIATE_INTERVENTION',
      ],
    },
    rescreenDate: { type: Date },
    referralGenerated: { type: Boolean, default: false },
    referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'EarlyReferral' },

    // ── Screener ──
    screener: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    screenerNotes: { type: String },
    parentConcerns: { type: String },
    parentConsentObtained: { type: Boolean, default: false },
    parentConsentDate: { type: Date },

    // ── Location ──
    screeningLocation: {
      type: String,
      enum: ['HOSPITAL', 'CLINIC', 'HOME', 'CENTER', 'COMMUNITY_EVENT', 'VIRTUAL'],
    },
    facilityName: { type: String },

    // ── Status ──
    status: {
      type: String,
      enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NEEDS_FOLLOW_UP'],
      default: 'SCHEDULED',
    },

    attachments: [
      {
        name: String,
        fileUrl: String,
        uploadDate: { type: Date, default: Date.now },
      },
    ],

    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

developmentalScreeningSchema.pre('save', async function (next) {
  if (!this.screeningNumber) {
    const count = await mongoose.model('DevelopmentalScreening').countDocuments();
    this.screeningNumber = `SCR-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

developmentalScreeningSchema.index({ child: 1, screeningDate: -1 });
developmentalScreeningSchema.index({ overallResult: 1 });
developmentalScreeningSchema.index({ status: 1 });
developmentalScreeningSchema.index({ screener: 1 });
developmentalScreeningSchema.index({ organization: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DEVELOPMENTAL MILESTONE — المعالم التنموية
// ═══════════════════════════════════════════════════════════════════════════════

const developmentalMilestoneSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'EarlyInterventionChild', required: true },

    domain: {
      type: String,
      enum: [
        'COGNITIVE',
        'COMMUNICATION',
        'GROSS_MOTOR',
        'FINE_MOTOR',
        'SOCIAL_EMOTIONAL',
        'ADAPTIVE',
        'SENSORY',
      ],
      required: true,
    },

    milestone: { type: String, required: true },
    milestoneAr: { type: String },
    expectedAgeMonths: { type: Number, required: true }, // typical age milestone is reached
    actualAgeMonths: { type: Number }, // when child actually reached it

    status: {
      type: String,
      enum: ['NOT_YET', 'EMERGING', 'ACHIEVED', 'SKIPPED', 'REGRESSED', 'NOT_APPLICABLE'],
      default: 'NOT_YET',
    },

    achievedDate: { type: Date },
    assessedDate: { type: Date },
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Delay Calculation ──
    delayMonths: { type: Number }, // positive = delayed, negative = advanced
    isDelayed: { type: Boolean, default: false },
    delaySeverity: {
      type: String,
      enum: ['NONE', 'MILD', 'MODERATE', 'SEVERE', 'PROFOUND'],
      default: 'NONE',
    },

    supportNeeded: { type: String },
    strategies: [String],
    notes: { type: String },

    // ── Evidence ──
    evidence: [
      {
        type: { type: String, enum: ['OBSERVATION', 'PARENT_REPORT', 'ASSESSMENT', 'VIDEO'] },
        description: String,
        fileUrl: String,
        date: { type: Date, default: Date.now },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

developmentalMilestoneSchema.index({ child: 1, domain: 1 });
developmentalMilestoneSchema.index({ child: 1, expectedAgeMonths: 1 });
developmentalMilestoneSchema.index({ status: 1 });
developmentalMilestoneSchema.index({ isDelayed: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 4. IFSP — خطة الخدمات الأسرية الفردية (Individualized Family Service Plan)
// ═══════════════════════════════════════════════════════════════════════════════

const ifspSchema = new mongoose.Schema(
  {
    planNumber: { type: String, unique: true },
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'EarlyInterventionChild', required: true },

    // ── Plan Info ──
    planType: {
      type: String,
      enum: ['INITIAL', 'ANNUAL_REVIEW', 'PERIODIC_REVIEW', 'AMENDMENT'],
      default: 'INITIAL',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    reviewDate: { type: Date },
    nextReviewDate: { type: Date },

    // ── Family Assessment ──
    familyConcerns: { type: String },
    familyPriorities: { type: String },
    familyResources: { type: String },
    familyStrengths: { type: String },
    homeEnvironment: { type: String },

    // ── Child's Present Levels ──
    presentLevels: {
      cognitive: { type: String },
      communication: { type: String },
      physical: { type: String },
      adaptive: { type: String },
      socialEmotional: { type: String },
      sensory: { type: String },
    },

    // ── Goals & Outcomes ──
    goals: [ifspGoalSchema],

    // ── Services ──
    services: [ifspServiceSchema],

    // ── Natural Environments ──
    naturalEnvironment: {
      description: { type: String },
      justificationIfNotNatural: { type: String },
      environmentTypes: [
        {
          type: String,
          enum: ['HOME', 'DAYCARE', 'PARK', 'COMMUNITY', 'CENTER', 'OTHER'],
        },
      ],
    },

    // ── Transition Plan ──
    transitionPlan: transitionPlanSchema,

    // ── Team ──
    serviceCoordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teamMembers: [
      {
        member: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        specialty: { type: String },
      },
    ],

    // ── Consent ──
    parentConsent: { type: Boolean, default: false },
    parentConsentDate: { type: Date },
    parentSignature: { type: String },
    parentConsentNotes: { type: String },

    // ── Status ──
    status: {
      type: String,
      enum: [
        'DRAFT',
        'PENDING_APPROVAL',
        'ACTIVE',
        'IN_REVIEW',
        'AMENDED',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'DRAFT',
    },

    // ── Review History ──
    reviews: [
      {
        reviewDate: { type: Date },
        reviewType: { type: String, enum: ['6_MONTH', 'ANNUAL', 'PARENT_REQUEST', 'TEAM_REQUEST'] },
        reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        findings: { type: String },
        modifications: { type: String },
        nextReviewDate: { type: Date },
      },
    ],

    attachments: [
      {
        name: String,
        fileUrl: String,
        fileType: String,
        uploadDate: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    notes: { type: String },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ifspSchema.pre('save', async function (next) {
  if (!this.planNumber) {
    const count = await mongoose.model('IFSP').countDocuments();
    this.planNumber = `IFSP-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

ifspSchema.index({ child: 1 });
ifspSchema.index({ status: 1 });
ifspSchema.index({ serviceCoordinator: 1 });
ifspSchema.index({ startDate: -1 });
ifspSchema.index({ organization: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 5. EARLY REFERRAL — الإحالات المبكرة
// ═══════════════════════════════════════════════════════════════════════════════

const earlyReferralSchema = new mongoose.Schema(
  {
    referralNumber: { type: String, unique: true },
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'EarlyInterventionChild' },

    // ── Direction ──
    referralDirection: {
      type: String,
      enum: ['INBOUND', 'OUTBOUND'],
      required: true,
    },

    // ── Source (who is sending) ──
    sourceType: {
      type: String,
      enum: [
        'MATERNITY_HOSPITAL',
        'PEDIATRIC_CLINIC',
        'NICU',
        'NATIONAL_SCREENING_PROGRAM',
        'PRIMARY_CARE',
        'SELF_REFERRAL',
        'COMMUNITY_HEALTH',
        'DAYCARE',
        'EARLY_INTERVENTION_CENTER',
        'SPECIALIST',
        'OTHER',
      ],
      required: true,
    },
    sourceFacility: { type: String },
    sourceFacilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    sourceContact: { type: String },
    sourcePhone: { type: String },
    sourceEmail: { type: String },
    referringPhysician: { type: String },
    referringPhysicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Destination (who is receiving) ──
    destinationType: {
      type: String,
      enum: [
        'EARLY_INTERVENTION_CENTER',
        'PEDIATRIC_SPECIALIST',
        'AUDIOLOGY',
        'OPHTHALMOLOGY',
        'NEUROLOGY',
        'GENETICS',
        'SPEECH_THERAPY',
        'OCCUPATIONAL_THERAPY',
        'PHYSICAL_THERAPY',
        'PSYCHOLOGY',
        'NATIONAL_SCREENING_PROGRAM',
        'SOCIAL_SERVICES',
        'OTHER',
      ],
    },
    destinationFacility: { type: String },
    destinationFacilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    destinationContact: { type: String },
    destinationPhone: { type: String },

    // ── Referral Details ──
    referralDate: { type: Date, required: true },
    urgency: {
      type: String,
      enum: ['ROUTINE', 'URGENT', 'EMERGENT'],
      default: 'ROUTINE',
    },
    reason: { type: String, required: true },
    reasonAr: { type: String },
    concerns: { type: String },
    clinicalFindings: { type: String },

    // ── National Screening Program Integration ──
    nationalScreeningId: { type: String },
    screeningProgramName: { type: String },
    screeningResult: { type: String },
    screeningDate: { type: Date },

    // ── Status Tracking ──
    status: {
      type: String,
      enum: [
        'DRAFT',
        'SUBMITTED',
        'RECEIVED',
        'ACCEPTED',
        'SCHEDULED',
        'IN_PROGRESS',
        'COMPLETED',
        'REJECTED',
        'CANCELLED',
        'EXPIRED',
      ],
      default: 'DRAFT',
    },
    acceptedDate: { type: Date },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    rejectionReason: { type: String },

    // ── Outcome ──
    outcome: { type: String },
    outcomeDate: { type: Date },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },
    followUpNotes: { type: String },

    // ── Consent ──
    parentConsent: { type: Boolean, default: false },
    parentConsentDate: { type: Date },
    consentDocumentUrl: { type: String },

    // ── Communication Log ──
    communications: [
      {
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ['PHONE', 'EMAIL', 'FAX', 'IN_PERSON', 'SYSTEM'] },
        direction: { type: String, enum: ['INBOUND', 'OUTBOUND'] },
        contact: { type: String },
        summary: { type: String },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    attachments: [
      {
        name: String,
        fileUrl: String,
        fileType: String,
        uploadDate: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    notes: { type: String },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

earlyReferralSchema.pre('save', async function (next) {
  if (!this.referralNumber) {
    const count = await mongoose.model('EarlyReferral').countDocuments();
    this.referralNumber = `REF-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

earlyReferralSchema.index({ child: 1 });
earlyReferralSchema.index({ status: 1 });
earlyReferralSchema.index({ referralDirection: 1 });
earlyReferralSchema.index({ sourceType: 1 });
earlyReferralSchema.index({ urgency: 1 });
earlyReferralSchema.index({ referralDate: -1 });
earlyReferralSchema.index({ organization: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

const EarlyInterventionChild =
  mongoose.models.EarlyInterventionChild ||
  mongoose.models.EarlyInterventionChild ||
  mongoose.model('EarlyInterventionChild', earlyInterventionChildSchema);
const DevelopmentalScreening =
  mongoose.models.DevelopmentalScreening ||
  mongoose.models.DevelopmentalScreening ||
  mongoose.model('DevelopmentalScreening', developmentalScreeningSchema);
const DevelopmentalMilestone =
  mongoose.models.DevelopmentalMilestone ||
  mongoose.models.DevelopmentalMilestone ||
  mongoose.model('DevelopmentalMilestone', developmentalMilestoneSchema);
const IFSP = mongoose.models.IFSP || mongoose.model('IFSP', ifspSchema);
const EarlyReferral =
  mongoose.models.EarlyReferral || mongoose.model('EarlyReferral', earlyReferralSchema);

module.exports = {
  EarlyInterventionChild,
  DevelopmentalScreening,
  DevelopmentalMilestone,
  IFSP,
  EarlyReferral,
};

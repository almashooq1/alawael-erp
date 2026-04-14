'use strict';

const mongoose = require('mongoose');

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

const IFSP = mongoose.models.IFSP || mongoose.model('IFSP', ifspSchema);

module.exports = IFSP;

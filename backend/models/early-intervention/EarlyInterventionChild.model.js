'use strict';

const mongoose = require('mongoose');

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

// ── Early Intervention Child (main schema) ──
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

const EarlyInterventionChild =
  mongoose.models.EarlyInterventionChild ||
  mongoose.model('EarlyInterventionChild', earlyInterventionChildSchema);

module.exports = EarlyInterventionChild;

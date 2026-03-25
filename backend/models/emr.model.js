/**
 * EMR (Electronic Medical Record) Lite Model — نموذج السجل الطبي الإلكتروني المبسط
 *
 * Schemas:
 *   MedicalRecord   — السجل الطبي الرئيسي
 *   VitalSign       — العلامات الحيوية
 *   LabResult       — نتائج المختبر
 *   ClinicalNote    — الملاحظات السريرية (SOAP)
 *   Allergy         — الحساسية
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ═══════════════════════════════════════════════════════════════════════════
// MEDICAL RECORD — السجل الطبي
// ═══════════════════════════════════════════════════════════════════════════

const MedicalRecordSchema = new Schema(
  {
    mrn: {
      type: String,
      unique: true,
      default: function () {
        return (
          'MRN-' +
          Date.now().toString(36).toUpperCase() +
          Math.random().toString(36).substring(2, 6).toUpperCase()
        );
      },
    },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, unique: true },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
    },
    primaryDiagnosis: [
      {
        code: String, // ICD-10
        description: { ar: String, en: String },
        diagnosedDate: Date,
        diagnosedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        status: {
          type: String,
          enum: ['active', 'resolved', 'chronic', 'recurrence'],
          default: 'active',
        },
      },
    ],
    chronicConditions: [
      {
        condition: { ar: String, en: String },
        code: String,
        onset: Date,
        managedBy: String,
        controlStatus: {
          type: String,
          enum: ['well_controlled', 'partially_controlled', 'uncontrolled'],
        },
      },
    ],
    surgicalHistory: [
      {
        procedure: { ar: String, en: String },
        code: String,
        date: Date,
        hospital: String,
        surgeon: String,
        outcome: String,
      },
    ],
    familyHistory: [
      {
        condition: String,
        relationship: {
          type: String,
          enum: ['father', 'mother', 'sibling', 'grandparent', 'uncle_aunt', 'other'],
        },
        notes: String,
      },
    ],
    socialHistory: {
      smoking: {
        type: String,
        enum: ['never', 'former', 'current', 'unknown'],
        default: 'unknown',
      },
      alcohol: {
        type: String,
        enum: ['never', 'former', 'current', 'unknown'],
        default: 'unknown',
      },
      exercise: String,
      occupation: String,
      maritalStatus: String,
      livingSituation: String,
    },
    immunizations: [
      {
        vaccine: String,
        date: Date,
        lot: String,
        site: String,
        administeredBy: String,
      },
    ],
    disabilities: [
      {
        type: { type: String },
        description: { ar: String, en: String },
        severity: { type: String, enum: ['mild', 'moderate', 'severe', 'profound'] },
        onset: Date,
        functionalImpact: String,
      },
    ],
    advanceDirectives: {
      hasDirective: { type: Boolean, default: false },
      type: String,
      documentPath: String,
      lastReviewed: Date,
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      alternatePhone: String,
    },
    primaryProvider: { type: Schema.Types.ObjectId, ref: 'User' },
    careTeam: [
      {
        provider: { type: Schema.Types.ObjectId, ref: 'User' },
        role: String,
        since: Date,
      },
    ],
    lastVisitDate: Date,
    notes: String,
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// mrn and beneficiary already have unique: true (auto-indexed)

// ═══════════════════════════════════════════════════════════════════════════
// VITAL SIGN — العلامات الحيوية
// ═══════════════════════════════════════════════════════════════════════════

const VitalSignSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    medicalRecord: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    recordedAt: { type: Date, default: Date.now, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    encounter: { type: Schema.Types.ObjectId }, // Reference to visit/appointment
    temperature: {
      value: Number, // Celsius
      method: { type: String, enum: ['oral', 'axillary', 'rectal', 'tympanic', 'temporal'] },
    },
    bloodPressure: {
      systolic: Number,
      diastolic: Number,
      position: { type: String, enum: ['sitting', 'standing', 'supine'] },
      arm: { type: String, enum: ['left', 'right'] },
    },
    heartRate: {
      value: Number, // BPM
      rhythm: { type: String, enum: ['regular', 'irregular'] },
    },
    respiratoryRate: { type: Number }, // Breaths per minute
    oxygenSaturation: {
      value: Number, // Percentage
      onOxygen: { type: Boolean, default: false },
      oxygenFlow: Number, // L/min
    },
    weight: {
      value: Number, // kg
      method: { type: String, enum: ['standing', 'wheelchair', 'bed', 'estimated'] },
    },
    height: { type: Number }, // cm
    bmi: { type: Number },
    painLevel: {
      score: { type: Number, min: 0, max: 10 },
      location: String,
      type: { type: String, enum: ['sharp', 'dull', 'throbbing', 'burning', 'aching', 'other'] },
    },
    bloodGlucose: {
      value: Number, // mg/dL
      timing: { type: String, enum: ['fasting', 'random', 'pre_meal', 'post_meal', 'bedtime'] },
    },
    headCircumference: Number, // cm (pediatric)
    glasgowComaScale: {
      eye: { type: Number, min: 1, max: 4 },
      verbal: { type: Number, min: 1, max: 5 },
      motor: { type: Number, min: 1, max: 6 },
      total: Number,
    },
    abnormalFlags: [String],
    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

VitalSignSchema.index({ beneficiary: 1, recordedAt: -1 });

// Auto-calculate BMI
VitalSignSchema.pre('save', function (next) {
  if (this.weight?.value && this.height) {
    const heightM = this.height / 100;
    this.bmi = Math.round((this.weight.value / (heightM * heightM)) * 10) / 10;
  }
  if (this.glasgowComaScale?.eye && this.glasgowComaScale?.verbal && this.glasgowComaScale?.motor) {
    this.glasgowComaScale.total =
      this.glasgowComaScale.eye + this.glasgowComaScale.verbal + this.glasgowComaScale.motor;
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// LAB RESULT — نتائج المختبر
// ═══════════════════════════════════════════════════════════════════════════

const LabResultSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    medicalRecord: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    labOrderNumber: {
      type: String,
      unique: true,
      default: function () {
        return (
          'LAB-' +
          Date.now().toString(36).toUpperCase() +
          Math.random().toString(36).substring(2, 6).toUpperCase()
        );
      },
    },
    orderedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    orderedDate: { type: Date, required: true },
    collectionDate: Date,
    reportDate: Date,
    category: {
      type: String,
      enum: [
        'hematology',
        'chemistry',
        'microbiology',
        'urinalysis',
        'serology',
        'immunology',
        'endocrinology',
        'coagulation',
        'toxicology',
        'genetic',
        'pathology',
        'other',
      ],
      required: true,
    },
    testName: {
      ar: { type: String, required: true },
      en: { type: String },
    },
    loincCode: String,
    specimen: {
      type: {
        type: String,
        enum: ['blood', 'urine', 'csf', 'stool', 'swab', 'tissue', 'sputum', 'other'],
      },
      collectedAt: Date,
      collectedBy: String,
    },
    results: [
      {
        parameter: { ar: String, en: String },
        value: String,
        unit: String,
        referenceRange: { low: String, high: String, text: String },
        flag: {
          type: String,
          enum: ['normal', 'low', 'high', 'critical_low', 'critical_high', 'abnormal'],
        },
      },
    ],
    overallStatus: {
      type: String,
      enum: ['ordered', 'collected', 'processing', 'completed', 'cancelled', 'preliminary'],
      default: 'ordered',
    },
    interpretation: { ar: String, en: String },
    criticalValues: {
      hasCritical: { type: Boolean, default: false },
      notifiedTo: String,
      notifiedAt: Date,
      acknowledgedBy: String,
    },
    attachments: [
      {
        name: String,
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    reportedBy: String,
    performingLab: String,
    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LabResultSchema.index({ beneficiary: 1, orderedDate: -1 });
LabResultSchema.index({ category: 1, overallStatus: 1 });

// ═══════════════════════════════════════════════════════════════════════════
// CLINICAL NOTE — الملاحظة السريرية (SOAP)
// ═══════════════════════════════════════════════════════════════════════════

const ClinicalNoteSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    medicalRecord: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    encounter: { type: Schema.Types.ObjectId }, // Appointment or visit reference
    noteType: {
      type: String,
      enum: [
        'progress_note',
        'admission_note',
        'discharge_summary',
        'consultation_note',
        'procedure_note',
        'therapy_note',
        'nursing_note',
        'social_work_note',
        'dietitian_note',
        'psychology_note',
        'iep_note',
        'evaluation_note',
        'daily_note',
        'telephone_note',
        'other',
      ],
      required: true,
    },
    // SOAP Format
    subjective: {
      chiefComplaint: { ar: String, en: String },
      historyOfPresentIllness: { ar: String, en: String },
      reviewOfSystems: { ar: String, en: String },
      patientReported: { ar: String, en: String },
    },
    objective: {
      physicalExam: { ar: String, en: String },
      vitalSigns: { type: Schema.Types.ObjectId, ref: 'VitalSign' },
      observations: { ar: String, en: String },
      functionalStatus: { ar: String, en: String },
    },
    assessment: {
      clinicalImpression: { ar: String, en: String },
      diagnosis: [
        {
          code: String,
          description: { ar: String, en: String },
          type: { type: String, enum: ['primary', 'secondary'] },
        },
      ],
      problemList: [{ ar: String, en: String }],
      goalsProgress: { ar: String, en: String },
    },
    plan: {
      treatmentPlan: { ar: String, en: String },
      medications: [
        {
          name: String,
          dosage: String,
          frequency: String,
          duration: String,
          instructions: String,
        },
      ],
      orders: [
        {
          type: {
            type: String,
            enum: ['lab', 'imaging', 'therapy', 'referral', 'procedure', 'other'],
          },
          description: String,
        },
      ],
      patientEducation: { ar: String, en: String },
      followUp: {
        interval: String,
        instructions: { ar: String, en: String },
        nextAppointment: Date,
      },
    },
    // Therapy-specific fields (rehab center)
    therapyDetails: {
      sessionNumber: Number,
      sessionDuration: Number, // Minutes
      goals: [
        {
          goal: { ar: String, en: String },
          status: {
            type: String,
            enum: ['not_started', 'in_progress', 'achieved', 'modified', 'discontinued'],
          },
          progress: String,
        },
      ],
      interventions: [
        {
          intervention: { ar: String, en: String },
          response: String,
          duration: Number, // Minutes
        },
      ],
      functionalOutcome: {
        measure: String,
        score: Number,
        previousScore: Number,
        change: String,
      },
      homeExercises: { ar: String, en: String },
    },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coSignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    coSignedAt: Date,
    status: {
      type: String,
      enum: ['draft', 'final', 'amended', 'addended', 'error'],
      default: 'draft',
    },
    amendments: [
      {
        date: Date,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        changes: String,
      },
    ],
    confidentiality: {
      type: String,
      enum: ['normal', 'restricted', 'highly_restricted'],
      default: 'normal',
    },
    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ClinicalNoteSchema.index({ beneficiary: 1, createdAt: -1 });
ClinicalNoteSchema.index({ noteType: 1 });
ClinicalNoteSchema.index({ author: 1 });
ClinicalNoteSchema.index({ status: 1 });

// ═══════════════════════════════════════════════════════════════════════════
// ALLERGY — الحساسية
// ═══════════════════════════════════════════════════════════════════════════

const AllergySchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    medicalRecord: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    allergen: {
      name: { ar: { type: String, required: true }, en: String },
      code: String,
      type: {
        type: String,
        enum: ['medication', 'food', 'environmental', 'biological', 'chemical', 'latex', 'other'],
        required: true,
      },
    },
    reaction: {
      description: { ar: String, en: String },
      manifestation: {
        type: String,
        enum: [
          'rash',
          'hives',
          'itching',
          'swelling',
          'anaphylaxis',
          'respiratory',
          'gastrointestinal',
          'cardiovascular',
          'neurological',
          'other',
        ],
      },
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'life_threatening'],
        required: true,
      },
    },
    clinicalStatus: {
      type: String,
      enum: ['active', 'inactive', 'resolved'],
      default: 'active',
    },
    verificationStatus: {
      type: String,
      enum: ['unconfirmed', 'confirmed', 'refuted', 'entered_in_error'],
      default: 'unconfirmed',
    },
    onsetDate: Date,
    recordedDate: { type: Date, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastOccurrence: Date,
    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AllergySchema.index({ beneficiary: 1, clinicalStatus: 1 });
AllergySchema.index({ 'allergen.type': 1 });

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  MedicalRecord:
    mongoose.models.MedicalRecord || mongoose.model('MedicalRecord', MedicalRecordSchema),
  VitalSign: mongoose.models.VitalSign || mongoose.model('VitalSign', VitalSignSchema),
  LabResult: mongoose.models.LabResult || mongoose.model('LabResult', LabResultSchema),
  ClinicalNote: mongoose.models.ClinicalNote || mongoose.model('ClinicalNote', ClinicalNoteSchema),
  Allergy: mongoose.models.Allergy || mongoose.model('Allergy', AllergySchema),
};

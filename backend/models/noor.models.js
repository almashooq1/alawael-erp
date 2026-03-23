/**
 * Noor Integration Models — نظام نور (وزارة التعليم)
 *
 * Integration with Saudi Ministry of Education's student-information system.
 * Covers: student enrollment sync, IEPs, academic progress, attendance,
 *         special-education classifications, and ministry compliance.
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/* ──────────────────────────────────────────────────────────
 * 1. Student Enrollment Sync — مزامنة بيانات الطلاب
 * ────────────────────────────────────────────────────────── */
const NoorStudentSchema = new Schema(
  {
    beneficiary: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    noorId: { type: String, required: true, unique: true },
    nationalId: { type: String, required: true, index: true },
    studentName: {
      ar: { type: String, required: true },
      en: { type: String },
    },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    disabilityType: {
      type: String,
      enum: [
        'intellectual',
        'physical',
        'hearing',
        'visual',
        'autism',
        'learning_disability',
        'speech_language',
        'multiple',
        'other',
      ],
      required: true,
    },
    disabilitySeverity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'profound'],
      default: 'moderate',
    },
    educationalPlacement: {
      type: String,
      enum: [
        'special_center',
        'special_class',
        'resource_room',
        'inclusive',
        'home_based',
        'hospital_based',
      ],
      default: 'special_center',
    },
    gradeLevel: { type: String },
    academicYear: {
      type: String,
      required: true,
      match: /^\d{4}-\d{4}$/,
    },
    enrollmentStatus: {
      type: String,
      enum: ['active', 'transferred', 'graduated', 'withdrawn', 'suspended'],
      default: 'active',
      index: true,
    },
    school: {
      noorSchoolId: { type: String },
      name: { ar: String, en: String },
      district: { type: String },
      city: { type: String },
    },
    guardian: {
      name: { ar: String, en: String },
      nationalId: { type: String },
      phone: { type: String },
      relationship: { type: String },
    },
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'error', 'not_synced'],
      default: 'not_synced',
    },
    lastSyncAt: { type: Date },
    syncErrors: [{ message: String, occurredAt: Date }],
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

NoorStudentSchema.index({ academicYear: 1, enrollmentStatus: 1 });
NoorStudentSchema.index({ disabilityType: 1, educationalPlacement: 1 });

/* ──────────────────────────────────────────────────────────
 * 2. Individual Education Plan (IEP) — الخطة التربوية الفردية
 * ────────────────────────────────────────────────────────── */
const NoorIEPSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'NoorStudent',
      required: true,
      index: true,
    },
    noorStudentId: { type: String, required: true },
    academicYear: { type: String, required: true },
    semester: { type: Number, enum: [1, 2], required: true },
    planNumber: { type: String, unique: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'cancelled'],
      default: 'draft',
    },
    team: [
      {
        role: {
          type: String,
          enum: [
            'special_education_teacher',
            'speech_therapist',
            'occupational_therapist',
            'psychologist',
            'physical_therapist',
            'social_worker',
            'parent',
            'coordinator',
          ],
        },
        name: String,
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    presentLevels: {
      academic: { type: String },
      behavioral: { type: String },
      communication: { type: String },
      motor: { type: String },
      selfCare: { type: String },
      social: { type: String },
    },
    goals: [
      {
        domain: {
          type: String,
          enum: [
            'academic',
            'behavioral',
            'communication',
            'motor',
            'self_care',
            'social',
            'vocational',
          ],
        },
        description: { type: String, required: true },
        measurableCriteria: { type: String },
        targetDate: { type: Date },
        objectives: [
          {
            description: String,
            status: {
              type: String,
              enum: [
                'not_started',
                'in_progress',
                'achieved',
                'partially_achieved',
                'not_achieved',
              ],
              default: 'not_started',
            },
            progressPercent: { type: Number, min: 0, max: 100, default: 0 },
            notes: String,
          },
        ],
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'achieved', 'partially_achieved', 'not_achieved'],
          default: 'not_started',
        },
        progressPercent: { type: Number, min: 0, max: 100, default: 0 },
      },
    ],
    accommodations: [
      {
        category: {
          type: String,
          enum: [
            'instructional',
            'environmental',
            'assessment',
            'assistive_technology',
            'behavioral',
          ],
        },
        description: String,
        frequency: String,
      },
    ],
    services: [
      {
        serviceType: {
          type: String,
          enum: [
            'speech_therapy',
            'occupational_therapy',
            'physical_therapy',
            'behavioral_therapy',
            'counseling',
            'assistive_technology',
            'transportation',
          ],
        },
        sessionsPerWeek: Number,
        durationMinutes: Number,
        provider: String,
        startDate: Date,
        endDate: Date,
      },
    ],
    reviewDates: [
      {
        scheduledDate: Date,
        actualDate: Date,
        reviewNotes: String,
        outcome: {
          type: String,
          enum: ['continue', 'modify', 'discontinue', 'transition'],
        },
      },
    ],
    noorSubmissionStatus: {
      type: String,
      enum: ['not_submitted', 'submitted', 'approved', 'rejected', 'revision_required'],
      default: 'not_submitted',
    },
    noorSubmissionDate: { type: Date },
    noorApprovalDate: { type: Date },
    noorRejectionReason: { type: String },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

NoorIEPSchema.index({ academicYear: 1, semester: 1, status: 1 });

/* ──────────────────────────────────────────────────────────
 * 3. Academic Progress Report — تقرير الأداء الأكاديمي
 * ────────────────────────────────────────────────────────── */
const NoorProgressReportSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'NoorStudent',
      required: true,
      index: true,
    },
    iep: { type: Schema.Types.ObjectId, ref: 'NoorIEP' },
    academicYear: { type: String, required: true },
    semester: { type: Number, enum: [1, 2], required: true },
    reportPeriod: {
      type: String,
      enum: ['monthly', 'quarterly', 'semester', 'annual'],
      required: true,
    },
    reportDate: { type: Date, required: true },
    overallProgress: {
      type: String,
      enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'unsatisfactory'],
      required: true,
    },
    domainProgress: [
      {
        domain: {
          type: String,
          enum: [
            'academic',
            'behavioral',
            'communication',
            'motor',
            'self_care',
            'social',
            'vocational',
          ],
        },
        level: {
          type: String,
          enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'unsatisfactory'],
        },
        notes: String,
        goalProgress: [
          {
            goalDescription: String,
            progressPercent: Number,
            status: String,
          },
        ],
      },
    ],
    attendance: {
      totalDays: { type: Number, min: 0 },
      presentDays: { type: Number, min: 0 },
      absentDays: { type: Number, min: 0 },
      excusedAbsences: { type: Number, min: 0, default: 0 },
      attendanceRate: { type: Number, min: 0, max: 100 },
    },
    teacherNotes: { type: String },
    parentFeedback: { type: String },
    recommendations: [String],
    noorSubmitted: { type: Boolean, default: false },
    noorSubmissionDate: { type: Date },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

NoorProgressReportSchema.index({ academicYear: 1, semester: 1, reportPeriod: 1 });

/* ──────────────────────────────────────────────────────────
 * 4. Noor Sync Configuration — إعدادات التكامل مع نور
 * ────────────────────────────────────────────────────────── */
const NoorConfigSchema = new Schema(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
    },
    enabled: { type: Boolean, default: false },
    apiEndpoint: { type: String },
    credentials: {
      schoolNoorId: { type: String },
      username: { type: String },
      // encrypted – never returned to frontend
      encryptedApiKey: { type: String },
    },
    syncSchedule: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'manual'],
        default: 'weekly',
      },
      lastSyncAt: { type: Date },
      nextSyncAt: { type: Date },
      autoSync: { type: Boolean, default: false },
    },
    mappings: {
      disabilityTypes: { type: Map, of: String },
      gradeMapping: { type: Map, of: String },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* ──────────────────────────────────────────────────────────
 * Exports
 * ────────────────────────────────────────────────────────── */
const NoorStudent = mongoose.models.NoorStudent || mongoose.model('NoorStudent', NoorStudentSchema);
const NoorIEP = mongoose.models.NoorIEP || mongoose.model('NoorIEP', NoorIEPSchema);
const NoorProgressReport =
  mongoose.models.NoorProgressReport ||
  mongoose.models.NoorProgressReport || mongoose.model('NoorProgressReport', NoorProgressReportSchema);
const NoorConfig = mongoose.models.NoorConfig || mongoose.model('NoorConfig', NoorConfigSchema);

module.exports = {
  NoorStudent,
  NoorIEP,
  NoorProgressReport,
  NoorConfig,
};

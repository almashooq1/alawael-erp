/**
 * Research Study Model — نموذج الدراسة البحثية
 *
 * Represents a scientific research study using anonymized rehabilitation data.
 * Supports longitudinal studies, outcome measurement, and evidence-based practice.
 */
const mongoose = require('mongoose');

const researchStudySchema = new mongoose.Schema(
  {
    // ─── Core Information ──────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'عنوان الدراسة مطلوب'],
      trim: true,
      index: true,
    },
    titleAr: {
      type: String,
      trim: true,
    },
    abstract: {
      type: String,
      required: [true, 'ملخص الدراسة مطلوب'],
      maxlength: 5000,
    },
    abstractAr: {
      type: String,
      maxlength: 5000,
    },
    studyType: {
      type: String,
      enum: [
        'retrospective', // بأثر رجعي
        'prospective', // استشرافي
        'cross-sectional', // مقطعي
        'longitudinal', // طولي
        'case-study', // دراسة حالة
        'randomized-control', // تجربة عشوائية
        'meta-analysis', // تحليل تجميعي
        'systematic-review', // مراجعة منهجية
        'cohort', // أتراب
        'quality-improvement', // تحسين الجودة
      ],
      required: [true, 'نوع الدراسة مطلوب'],
      index: true,
    },
    status: {
      type: String,
      enum: [
        'draft', // مسودة
        'protocol-review', // مراجعة البروتوكول
        'ethics-pending', // بانتظار لجنة الأخلاقيات
        'ethics-approved', // معتمد من لجنة الأخلاقيات
        'data-collection', // جمع البيانات
        'data-analysis', // تحليل البيانات
        'peer-review', // مراجعة الأقران
        'published', // منشور
        'archived', // مؤرشف
      ],
      default: 'draft',
      index: true,
    },

    // ─── Research Team ─────────────────────────────────────────────────
    principalInvestigator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'الباحث الرئيسي مطلوب'],
      index: true,
    },
    coInvestigators: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: ['co-pi', 'researcher', 'statistician', 'data-analyst', 'coordinator'],
        },
        institution: String,
      },
    ],
    externalCollaborators: [
      {
        name: String,
        institution: String,
        email: String,
        role: String,
      },
    ],

    // ─── Ethics & Compliance ───────────────────────────────────────────
    ethicsApproval: {
      approved: { type: Boolean, default: false },
      committeeId: String,
      committeeName: String,
      approvalNumber: String,
      approvalDate: Date,
      expiryDate: Date,
      conditions: [String],
      documents: [
        {
          title: String,
          fileUrl: String,
          uploadDate: { type: Date, default: Date.now },
        },
      ],
    },
    dataProtection: {
      anonymizationMethod: {
        type: String,
        enum: [
          'k-anonymity',
          'l-diversity',
          'differential-privacy',
          'pseudonymization',
          'full-anonymization',
        ],
        default: 'full-anonymization',
      },
      dataRetentionYears: { type: Number, default: 5 },
      consentRequired: { type: Boolean, default: true },
      consentObtained: { type: Number, default: 0 },
      dataAccessRestrictions: [String],
    },

    // ─── Study Parameters ──────────────────────────────────────────────
    methodology: {
      sampleSize: { type: Number, min: 0 },
      targetSampleSize: { type: Number, min: 1 },
      inclusionCriteria: [String],
      exclusionCriteria: [String],
      interventionDescription: String,
      controlGroupDescription: String,
      randomizationMethod: String,
      blindingType: {
        type: String,
        enum: ['none', 'single-blind', 'double-blind', 'triple-blind'],
      },
      studyDurationMonths: Number,
      followUpPeriodMonths: Number,
    },

    // ─── Target Population ─────────────────────────────────────────────
    targetPopulation: {
      disabilityTypes: [
        {
          type: String,
          enum: [
            'physical',
            'intellectual',
            'visual',
            'hearing',
            'speech',
            'autism',
            'learning',
            'multiple',
            'psychosocial',
            'other',
          ],
        },
      ],
      ageRange: {
        min: { type: Number, min: 0 },
        max: { type: Number, max: 150 },
      },
      genders: [{ type: String, enum: ['male', 'female', 'all'] }],
      severityLevels: [{ type: String, enum: ['mild', 'moderate', 'severe', 'profound'] }],
    },

    // ─── Outcome Measures ──────────────────────────────────────────────
    outcomeMeasures: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OutcomeMeasure',
      },
    ],

    // ─── Timeline ──────────────────────────────────────────────────────
    timeline: {
      plannedStartDate: Date,
      actualStartDate: Date,
      plannedEndDate: Date,
      actualEndDate: Date,
      milestones: [
        {
          title: String,
          plannedDate: Date,
          completedDate: Date,
          status: { type: String, enum: ['pending', 'in-progress', 'completed', 'delayed'] },
        },
      ],
    },

    // ─── Publication ───────────────────────────────────────────────────
    publication: {
      journal: String,
      doi: String,
      publishedDate: Date,
      citation: String,
      impactFactor: Number,
      openAccess: Boolean,
      pdfUrl: String,
    },

    // ─── Tags & Classification ─────────────────────────────────────────
    tags: [{ type: String, trim: true }],
    keywords: [{ type: String, trim: true }],
    icdCodes: [String],
    icfCodes: [String],

    // ─── Metadata ──────────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────
researchStudySchema.index({ status: 1, studyType: 1 });
researchStudySchema.index({ principalInvestigator: 1, status: 1 });
researchStudySchema.index({ 'ethicsApproval.approved': 1 });
researchStudySchema.index({ tags: 1 });
researchStudySchema.index({ createdAt: -1 });
researchStudySchema.index({ title: 'text', abstract: 'text', keywords: 'text' });

// ─── Virtuals ──────────────────────────────────────────────────────────────
researchStudySchema.virtual('enrollmentRate').get(function () {
  if (!this.methodology || !this.methodology.targetSampleSize) return 0;
  return Math.round(((this.methodology.sampleSize || 0) / this.methodology.targetSampleSize) * 100);
});

researchStudySchema.virtual('dataCollections', {
  ref: 'AnonymizedDataset',
  localField: '_id',
  foreignField: 'studyId',
});

module.exports = mongoose.model('ResearchStudy', researchStudySchema);

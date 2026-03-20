/**
 * Anonymized Dataset Model — نموذج مجموعة البيانات مجهولة الهوية
 *
 * Stores de-identified data collected for research studies.
 * Ensures privacy compliance with k-anonymity / differential privacy.
 */
const mongoose = require('mongoose');

const anonymizedDatasetSchema = new mongoose.Schema(
  {
    // ─── Core ──────────────────────────────────────────────────────────
    studyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchStudy',
      required: [true, 'معرف الدراسة مطلوب'],
      index: true,
    },
    datasetName: {
      type: String,
      required: [true, 'اسم مجموعة البيانات مطلوب'],
      trim: true,
    },
    description: String,

    // ─── Data Source ────────────────────────────────────────────────────
    sourceModule: {
      type: String,
      enum: [
        'disability-rehabilitation',
        'therapy-sessions',
        'assessments',
        'rehab-programs',
        'early-intervention',
        'mhpss',
        'independent-living',
        'post-rehab-followup',
        'icf-assessments',
        'student-reports',
        'custom',
      ],
      required: true,
    },
    dateRange: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },

    // ─── Anonymization Details ─────────────────────────────────────────
    anonymization: {
      method: {
        type: String,
        enum: [
          'k-anonymity',
          'l-diversity',
          'differential-privacy',
          'pseudonymization',
          'full-removal',
        ],
        required: true,
      },
      kValue: Number, // k-anonymity level
      epsilonValue: Number, // differential privacy epsilon
      fieldsRemoved: [String], // e.g., ['name', 'nationalId', 'phone', 'address']
      fieldsGeneralized: [
        {
          field: String,
          generalizationLevel: String, // e.g., 'age → age-range', 'city → region'
        },
      ],
      fieldsPerturbed: [
        {
          field: String,
          noiseType: String, // 'laplace', 'gaussian'
          noiseLevel: Number,
        },
      ],
      anonymizationDate: { type: Date, default: Date.now },
      anonymizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      qualityCheck: {
        passed: Boolean,
        reIdentificationRisk: Number, // 0-1 probability
        checkedDate: Date,
        checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    },

    // ─── Dataset Metadata ──────────────────────────────────────────────
    recordCount: {
      type: Number,
      required: true,
      min: 0,
    },
    variables: [
      {
        name: String,
        type: {
          type: String,
          enum: ['numeric', 'categorical', 'ordinal', 'date', 'text', 'boolean'],
        },
        description: String,
        descriptionAr: String,
        unit: String,
        possibleValues: [String],
        missingValueCount: Number,
      },
    ],

    // ─── Demographics Summary (Aggregated, never individual) ───────────
    demographicsSummary: {
      totalParticipants: Number,
      ageDistribution: {
        mean: Number,
        median: Number,
        stdDev: Number,
        ranges: [{ range: String, count: Number, percentage: Number }],
      },
      genderDistribution: [{ gender: String, count: Number, percentage: Number }],
      disabilityTypeDistribution: [{ type: String, count: Number, percentage: Number }],
      severityDistribution: [{ level: String, count: Number, percentage: Number }],
    },

    // ─── Storage ───────────────────────────────────────────────────────
    format: {
      type: String,
      enum: ['json', 'csv', 'spss', 'stata', 'r-data', 'parquet', 'excel'],
      default: 'json',
    },
    fileUrl: String,
    fileSize: Number, // bytes
    checksum: String, // SHA-256

    // ─── Data Access Log ───────────────────────────────────────────────
    accessLog: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        action: { type: String, enum: ['view', 'download', 'export', 'analyze'] },
        timestamp: { type: Date, default: Date.now },
        ipAddress: String,
        purpose: String,
      },
    ],

    // ─── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['preparing', 'anonymizing', 'quality-check', 'ready', 'exported', 'archived'],
      default: 'preparing',
      index: true,
    },

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
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────
anonymizedDatasetSchema.index({ studyId: 1, status: 1 });
anonymizedDatasetSchema.index({ sourceModule: 1 });
anonymizedDatasetSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AnonymizedDataset', anonymizedDatasetSchema);

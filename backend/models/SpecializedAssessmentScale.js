/**
 * SpecializedAssessmentScale — مقاييس التقييم المتخصصة لذوي الإعاقة
 *
 * 25 مقياساً متخصصاً مصنفة حسب نوع الإعاقة:
 *   - التوحد (5 مقاييس)
 *   - الحركية (4 مقاييس)
 *   - الذهنية (4 مقاييس)
 *   - النطق واللغة (4 مقاييس)
 *   - السلوكية (4 مقاييس)
 *   - النمائية (4 مقاييس)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ─── Sub-schemas ──────────────────────────────────────────────────────────── */

const ScaleItemSchema = new Schema(
  {
    itemNumber: { type: Number, required: true },
    textAr: { type: String, required: [true, 'نص البند بالعربية مطلوب'] },
    textEn: { type: String },
    domain: { type: String, required: true },
    scoringOptions: [
      {
        value: { type: Number, required: true },
        labelAr: { type: String, required: true },
        labelEn: { type: String },
        description: { type: String },
      },
    ],
    isReversed: { type: Boolean, default: false },
    weight: { type: Number, default: 1 },
  },
  { _id: false }
);

const DomainSchema = new Schema(
  {
    key: { type: String, required: true },
    nameAr: { type: String, required: true },
    nameEn: { type: String },
    description: { type: String },
    maxScore: { type: Number, required: true },
    itemCount: { type: Number, default: 0 },
    weight: { type: Number, default: 1 },
  },
  { _id: false }
);

const InterpretationSchema = new Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    levelKey: { type: String, required: true },
    labelAr: { type: String, required: true },
    labelEn: { type: String },
    severity: {
      type: String,
      enum: [
        'normal',
        'mild',
        'moderate',
        'severe',
        'profound',
        'at_risk',
        'below_average',
        'average',
        'above_average',
      ],
      required: true,
    },
    colorHex: { type: String, default: '#757575' },
    recommendation: { type: String },
  },
  { _id: false }
);

const AgeRangeSchema = new Schema(
  {
    minMonths: { type: Number, required: true },
    maxMonths: { type: Number, required: true },
    label: { type: String },
  },
  { _id: false }
);

/* ─── Main Schema ──────────────────────────────────────────────────────────── */

const SpecializedAssessmentScaleSchema = new Schema(
  {
    scaleCode: {
      type: String,
      required: [true, 'رمز المقياس مطلوب'],
      unique: true,
      uppercase: true,
      trim: true,
    },

    nameAr: { type: String, required: [true, 'اسم المقياس بالعربية مطلوب'] },
    nameEn: { type: String },
    abbreviation: { type: String, required: true },

    category: {
      type: String,
      required: true,
      enum: [
        'autism', // طيف التوحد
        'motor', // حركية
        'intellectual', // ذهنية
        'speech', // نطق ولغة
        'behavioral', // سلوكية
        'developmental', // نمائية
        'sensory', // حسية
        'adaptive', // تكيفية
        'vocational', // مهنية
        'psychological', // نفسية
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

    description: { type: String },
    purpose: { type: String },
    developer: { type: String },
    yearPublished: { type: Number },
    version: { type: String, default: '1.0' },

    ageRange: AgeRangeSchema,
    administrationTime: { type: Number }, // minutes
    administrationType: {
      type: String,
      enum: [
        'individual',
        'group',
        'observation',
        'interview',
        'self_report',
        'parent_report',
        'teacher_report',
        'mixed',
      ],
      default: 'individual',
    },

    domains: [DomainSchema],
    totalMaxScore: { type: Number, required: true },
    scoringMethod: {
      type: String,
      enum: [
        'sum',
        'average',
        'weighted_sum',
        'percentile',
        'standard_score',
        'age_equivalent',
        'custom',
      ],
      default: 'sum',
    },

    items: [ScaleItemSchema],

    interpretation: [InterpretationSchema],

    reliability: {
      cronbachAlpha: { type: Number },
      testRetest: { type: Number },
      interRater: { type: Number },
    },

    normReference: {
      type: String,
      enum: ['saudi', 'arab', 'international', 'local'],
      default: 'arab',
    },

    requiredQualification: {
      type: String,
      enum: ['specialist', 'therapist', 'psychologist', 'any_trained', 'supervisor'],
      default: 'specialist',
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

SpecializedAssessmentScaleSchema.index({ category: 1, isActive: 1 });
SpecializedAssessmentScaleSchema.index({ targetDisabilities: 1 });
SpecializedAssessmentScaleSchema.index({ nameAr: 'text', nameEn: 'text', description: 'text' });

/* ─── Virtuals ─────────────────────────────────────────────────────────────── */

SpecializedAssessmentScaleSchema.virtual('domainCount').get(function () {
  return this.domains ? this.domains.length : 0;
});

SpecializedAssessmentScaleSchema.virtual('itemCount').get(function () {
  return this.items ? this.items.length : 0;
});

/* ─── Assessment Result (تسجيل نتائج التقييم) ─────────────────────────────── */

const ScaleResultSchema = new Schema(
  {
    scale: { type: Schema.Types.ObjectId, ref: 'SpecializedAssessmentScale', required: true },
    scaleCode: { type: String, required: true },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'BeneficiaryFile', required: true },

    assessmentDate: { type: Date, required: true, default: Date.now },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    supervisedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    domainScores: [
      {
        domainKey: { type: String, required: true },
        domainNameAr: { type: String },
        rawScore: { type: Number, required: true },
        maxScore: { type: Number, required: true },
        percentageScore: { type: Number },
        standardScore: { type: Number },
        ageEquivalent: { type: String },
        percentileRank: { type: Number },
        severityLevel: { type: String },
      },
    ],

    itemResponses: [
      {
        itemNumber: { type: Number },
        response: { type: Number },
        notes: { type: String },
      },
    ],

    totalRawScore: { type: Number, required: true },
    totalPercentage: { type: Number },
    totalStandardScore: { type: Number },

    interpretationLevel: {
      type: String,
      enum: [
        'normal',
        'mild',
        'moderate',
        'severe',
        'profound',
        'at_risk',
        'below_average',
        'average',
        'above_average',
      ],
    },
    interpretationLabelAr: { type: String },

    comparisonWithPrevious: {
      previousResultId: { type: Schema.Types.ObjectId },
      previousScore: { type: Number },
      changePercent: { type: Number },
      trend: { type: String, enum: ['improved', 'stable', 'declined'] },
    },

    clinicalNotes: { type: String },
    recommendations: [{ type: String }],
    nextAssessmentDate: { type: Date },

    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    status: {
      type: String,
      enum: ['draft', 'completed', 'reviewed', 'approved'],
      default: 'completed',
    },

    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ScaleResultSchema.index({ beneficiary: 1, scale: 1, assessmentDate: -1 });
ScaleResultSchema.index({ assessor: 1, assessmentDate: -1 });
ScaleResultSchema.index({ scaleCode: 1, assessmentDate: -1 });
ScaleResultSchema.index({ status: 1 });

const SpecializedAssessmentScale =
  mongoose.models.SpecializedAssessmentScale ||
  mongoose.models.SpecializedAssessmentScale ||
  mongoose.models.SpecializedAssessmentScale ||
  mongoose.model('SpecializedAssessmentScale', SpecializedAssessmentScaleSchema);
const SpecializedScaleResult =
  mongoose.models.SpecializedScaleResult ||
  mongoose.models.SpecializedScaleResult ||
  mongoose.models.SpecializedScaleResult ||
  mongoose.model('SpecializedScaleResult', ScaleResultSchema);

module.exports = { SpecializedAssessmentScale, SpecializedScaleResult };

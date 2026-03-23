/**
 * Outcome Measure Model — نموذج مقياس النتائج
 *
 * Internationally recognized outcome measures used in rehabilitation research.
 * Supports standard scales like FIM, WHODAS, Barthel, COPM, GAS, etc.
 */
const mongoose = require('mongoose');

const outcomeMeasureSchema = new mongoose.Schema(
  {
    // ─── Measure Identity ──────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'اسم المقياس مطلوب'],
      trim: true,
      index: true,
    },
    nameAr: {
      type: String,
      trim: true,
    },
    abbreviation: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    descriptionAr: String,

    // ─── Classification ────────────────────────────────────────────────
    category: {
      type: String,
      enum: [
        'functional-independence', // الاستقلالية الوظيفية
        'quality-of-life', // جودة الحياة
        'participation', // المشاركة
        'pain', // الألم
        'mental-health', // الصحة النفسية
        'motor-function', // الوظيفة الحركية
        'cognitive', // الإدراكية
        'communication', // التواصل
        'self-care', // الرعاية الذاتية
        'pediatric', // أطفال
        'disability-specific', // محدد للإعاقة
        'social-integration', // الاندماج الاجتماعي
        'caregiver-burden', // عبء مقدم الرعاية
        'satisfaction', // الرضا
        'general', // عام
      ],
      required: true,
      index: true,
    },
    domain: {
      type: String,
      enum: [
        'body-functions', // وظائف الجسم (ICF)
        'body-structures', // هياكل الجسم (ICF)
        'activities-participation', // الأنشطة والمشاركة (ICF)
        'environmental-factors', // العوامل البيئية (ICF)
        'personal-factors', // العوامل الشخصية (ICF)
        'multi-domain', // متعدد المجالات
      ],
      default: 'multi-domain',
    },

    // ─── Standard Recognition ──────────────────────────────────────────
    standardBody: {
      type: String,
      enum: ['WHO', 'NIH', 'APTA', 'AOTA', 'APA', 'ASHA', 'custom', 'other'],
    },
    internationallyRecognized: {
      type: Boolean,
      default: false,
    },
    validatedLanguages: [String],
    arabicValidation: {
      validated: { type: Boolean, default: false },
      validationStudyRef: String,
      validationYear: Number,
    },

    // ─── Scoring ───────────────────────────────────────────────────────
    scoringType: {
      type: String,
      enum: ['numeric', 'ordinal', 'likert', 'binary', 'percentage', 'composite', 'custom'],
      required: true,
    },
    scoreRange: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    higherScoreMeaning: {
      type: String,
      enum: ['better', 'worse'],
      required: true,
    },
    minimumClinicallyImportantDifference: {
      type: Number, // MCID
    },
    subscales: [
      {
        name: String,
        nameAr: String,
        scoreRange: { min: Number, max: Number },
        items: [
          {
            itemNumber: Number,
            text: String,
            textAr: String,
            options: [{ value: Number, label: String, labelAr: String }],
          },
        ],
      },
    ],

    // ─── Administration ────────────────────────────────────────────────
    administrationMethod: {
      type: String,
      enum: ['self-report', 'clinician-rated', 'observer-rated', 'performance-based', 'mixed'],
      required: true,
    },
    administrationTimeMinutes: Number,
    targetPopulation: {
      ageRange: { min: Number, max: Number },
      disabilityTypes: [String],
    },
    trainingRequired: { type: Boolean, default: false },
    licenseRequired: { type: Boolean, default: false },
    licenseInfo: String,

    // ─── Psychometric Properties ───────────────────────────────────────
    psychometrics: {
      reliability: {
        internalConsistency: Number, // Cronbach's alpha
        testRetest: Number, // ICC
        interRater: Number, // ICC
      },
      validity: {
        content: String, // description
        construct: String, // description
        criterion: String, // description
      },
      responsiveness: Number,
      floorEffect: Number, // percentage
      ceilingEffect: Number, // percentage
    },

    // ─── Predefined Standard Measures ──────────────────────────────────
    predefined: {
      type: Boolean,
      default: false,
    },
    version: String,
    referenceUrl: String,
    citationText: String,

    // ─── Metadata ──────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────
outcomeMeasureSchema.index({ category: 1, internationallyRecognized: 1 });
outcomeMeasureSchema.index({ abbreviation: 1 }, { unique: true });
outcomeMeasureSchema.index({ name: 'text', description: 'text', abbreviation: 'text' });

module.exports = mongoose.models.OutcomeMeasure || mongoose.model('OutcomeMeasure', outcomeMeasureSchema);

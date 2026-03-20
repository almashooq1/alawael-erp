/**
 * Program Effectiveness Report Model — نموذج تقرير فعالية البرنامج
 *
 * Evidence-based reports measuring rehabilitation program effectiveness.
 * Supports pre/post comparison, effect size calculation, and trend analysis.
 */
const mongoose = require('mongoose');

const programEffectivenessSchema = new mongoose.Schema(
  {
    // ─── Core ──────────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'عنوان التقرير مطلوب'],
      trim: true,
    },
    titleAr: String,
    studyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchStudy',
      index: true,
    },
    programType: {
      type: String,
      enum: [
        'physical-therapy', // العلاج الطبيعي
        'occupational-therapy', // العلاج الوظيفي
        'speech-therapy', // علاج النطق
        'cognitive-rehab', // التأهيل الإدراكي
        'psychosocial', // الدعم النفسي الاجتماعي
        'vocational-rehab', // التأهيل المهني
        'early-intervention', // التدخل المبكر
        'independent-living', // الحياة المستقلة
        'assistive-technology', // التقنيات المساعدة
        'cardiac-pulmonary', // تأهيل قلبي رئوي
        'neurological', // عصبي
        'pediatric', // أطفال
        'geriatric', // كبار السن
        'multi-disciplinary', // متعدد التخصصات
        'other',
      ],
      required: true,
      index: true,
    },

    // ─── Evaluation Period ─────────────────────────────────────────────
    evaluationPeriod: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },

    // ─── Sample ────────────────────────────────────────────────────────
    sample: {
      totalParticipants: { type: Number, required: true },
      completedParticipants: Number,
      dropoutRate: Number,
      dropoutReasons: [{ reason: String, count: Number }],
    },

    // ─── Outcome Results ───────────────────────────────────────────────
    outcomeResults: [
      {
        measureId: { type: mongoose.Schema.Types.ObjectId, ref: 'OutcomeMeasure' },
        measureName: String,
        measureAbbreviation: String,
        preIntervention: {
          mean: Number,
          median: Number,
          stdDev: Number,
          min: Number,
          max: Number,
          n: Number,
        },
        postIntervention: {
          mean: Number,
          median: Number,
          stdDev: Number,
          min: Number,
          max: Number,
          n: Number,
        },
        followUp: [
          {
            monthsAfter: Number,
            mean: Number,
            median: Number,
            stdDev: Number,
            n: Number,
          },
        ],
        statisticalAnalysis: {
          testUsed: String, // 't-test', 'wilcoxon', 'anova', 'mann-whitney'
          testStatistic: Number,
          pValue: Number,
          confidenceInterval: { lower: Number, upper: Number },
          effectSize: Number, // Cohen's d or eta-squared
          effectSizeInterpretation: {
            type: String,
            enum: ['negligible', 'small', 'medium', 'large', 'very-large'],
          },
          clinicallySignificant: Boolean,
        },
        improvementPercentage: Number,
        responderRate: Number, // % of participants meeting MCID
      },
    ],

    // ─── Goal Attainment ───────────────────────────────────────────────
    goalAttainment: {
      totalGoalsSet: Number,
      goalsFullyAchieved: Number,
      goalsPartiallyAchieved: Number,
      goalsNotAchieved: Number,
      gasScore: Number, // Goal Attainment Scaling composite
    },

    // ─── Patient Satisfaction ──────────────────────────────────────────
    satisfaction: {
      overallScore: Number, // 0-100
      responseRate: Number, // percentage
      dimensions: [
        {
          dimension: String, // e.g., 'staff', 'facilities', 'outcomes', 'communication'
          score: Number,
          maxScore: Number,
        },
      ],
      qualitativeFeedback: {
        positiveThemes: [String],
        negativeThemes: [String],
        suggestions: [String],
      },
    },

    // ─── Cost-Effectiveness ────────────────────────────────────────────
    costEffectiveness: {
      totalProgramCost: Number,
      costPerParticipant: Number,
      costPerQALY: Number, // Quality-Adjusted Life Year
      costBenefitRatio: Number,
      comparisonWithStandard: String,
    },

    // ─── Conclusions ───────────────────────────────────────────────────
    conclusions: {
      summary: String,
      summaryAr: String,
      strengths: [String],
      limitations: [String],
      recommendations: [String],
      evidenceLevel: {
        type: String,
        enum: ['1a', '1b', '2a', '2b', '3a', '3b', '4', '5'], // Oxford CEBM
      },
      recommendationGrade: {
        type: String,
        enum: ['A', 'B', 'C', 'D'], // Grade based on evidence level
      },
    },

    // ─── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'in-review', 'approved', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewDate: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: Date,

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
programEffectivenessSchema.index({ programType: 1, status: 1 });
programEffectivenessSchema.index({ 'evaluationPeriod.from': 1, 'evaluationPeriod.to': 1 });
programEffectivenessSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ProgramEffectiveness', programEffectivenessSchema);

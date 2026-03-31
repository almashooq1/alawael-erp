/**
 * AssessmentComparison Model — مقارنة التقييمات
 * Based on: assessment_comparisons table (prompt_02 §5.3)
 * يقيس مدى التقدم بين تقييمين لنفس المستفيد
 */
const mongoose = require('mongoose');

const AssessmentComparisonSchema = new mongoose.Schema(
  {
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    // تقييم الخط القاعدي (الأقدم)
    baselineAssessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true,
    },
    // التقييم الحالي (الأحدث)
    currentAssessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    // بيانات المقارنة لكل مجال
    comparisonData: [
      {
        domain: String,
        subDomain: String,
        baselineScore: Number,
        currentScore: Number,
        change: Number, // الفرق
        changePercent: Number, // نسبة التغيير
        trend: {
          // الاتجاه
          type: String,
          enum: ['improved', 'declined', 'stable'],
        },
      },
    ],
    // نسبة التحسن الإجمالية
    improvementPercentage: { type: Number },
    // تحليل نصي
    analysisAr: { type: String },
    analysisEn: { type: String },
    // توصيات
    recommendationsAr: { type: String },
    // الفترة الزمنية بين التقييمين
    intervalDays: { type: Number },
    // من أنشأ المقارنة
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // حالة المقارنة
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

AssessmentComparisonSchema.index({ beneficiary: 1, createdAt: -1 });
AssessmentComparisonSchema.index({ baselineAssessment: 1, currentAssessment: 1 }, { unique: true });

module.exports = mongoose.model('AssessmentComparison', AssessmentComparisonSchema);

/**
 * @module models/IndependentLivingProgress
 * @description نموذج تتبع التقدم نحو الاستقلالية
 * يسجل التقدم الدوري والمراحل التي يمر بها المستفيد
 */

const mongoose = require('mongoose');

// ─── مخطط قياس مهارة ───
const skillMeasurementSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        'cooking',
        'cleaning',
        'shopping',
        'transportation',
        'personal_care',
        'money_management',
        'communication',
        'safety',
      ],
      required: true,
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    previousLevel: {
      type: Number,
      min: 1,
      max: 5,
    },
    currentLevel: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    targetLevel: {
      type: Number,
      min: 1,
      max: 5,
    },
    change: {
      type: String,
      enum: ['improved', 'maintained', 'declined'],
      default: 'maintained',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

// ─── مخطط معلم (Milestone) ───
const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'عنوان المعلم مطلوب'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'cooking',
        'cleaning',
        'shopping',
        'transportation',
        'personal_care',
        'money_management',
        'communication',
        'safety',
        'general',
      ],
    },
    achievedAt: {
      type: Date,
      default: Date.now,
    },
    significance: {
      type: String,
      enum: ['minor', 'moderate', 'major', 'breakthrough'],
      default: 'moderate',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: true }
);

// ─── المخطط الرئيسي لتتبع التقدم ───
const independentLivingProgressSchema = new mongoose.Schema(
  {
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'المستفيد مطلوب'],
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IndependentLivingPlan',
      required: [true, 'خطة التدريب مطلوبة'],
      index: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'مسجل التقدم مطلوب'],
    },

    // فترة التقييم
    period: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'quarterly'],
      required: [true, 'فترة التقييم مطلوبة'],
    },
    periodStart: {
      type: Date,
      required: [true, 'بداية الفترة مطلوبة'],
    },
    periodEnd: {
      type: Date,
      required: [true, 'نهاية الفترة مطلوبة'],
    },

    // ─── القياسات ───
    measurements: [skillMeasurementSchema],

    // ─── الدرجات الإجمالية ───
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    previousOverallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    categoryScores: {
      cooking: { type: Number, min: 0, max: 100, default: 0 },
      cleaning: { type: Number, min: 0, max: 100, default: 0 },
      shopping: { type: Number, min: 0, max: 100, default: 0 },
      transportation: { type: Number, min: 0, max: 100, default: 0 },
      personal_care: { type: Number, min: 0, max: 100, default: 0 },
      money_management: { type: Number, min: 0, max: 100, default: 0 },
      communication: { type: Number, min: 0, max: 100, default: 0 },
      safety: { type: Number, min: 0, max: 100, default: 0 },
    },

    // ─── مستوى الاستقلالية ───
    independenceLevel: {
      type: String,
      enum: [
        'dependent',
        'mostly_dependent',
        'partially_independent',
        'mostly_independent',
        'independent',
      ],
    },
    previousIndependenceLevel: {
      type: String,
      enum: [
        'dependent',
        'mostly_dependent',
        'partially_independent',
        'mostly_independent',
        'independent',
      ],
    },

    // ─── المعالم المحقّقة ───
    milestones: [milestoneSchema],

    // ─── الجلسات في هذه الفترة ───
    sessionsAttended: {
      type: Number,
      min: 0,
      default: 0,
    },
    sessionsScheduled: {
      type: Number,
      min: 0,
      default: 0,
    },
    attendanceRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // ─── التحليل ───
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining', 'mixed'],
      default: 'stable',
    },
    improvementRate: {
      type: Number, // نسبة التحسن
      default: 0,
    },
    areasOfImprovement: [String],
    areasNeedingAttention: [String],

    // ─── الملخص والتوصيات ───
    summary: {
      type: String,
      trim: true,
      maxlength: [5000, 'الملخص لا يتجاوز 5000 حرف'],
    },
    recommendations: {
      type: String,
      trim: true,
      maxlength: [3000, 'التوصيات لا تتجاوز 3000 حرف'],
    },
    nextSteps: {
      type: String,
      trim: true,
      maxlength: [2000, 'الخطوات القادمة لا تتجاوز 2000 حرف'],
    },

    // ─── الحالة ───
    status: {
      type: String,
      enum: ['draft', 'submitted', 'reviewed', 'approved'],
      default: 'draft',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───
independentLivingProgressSchema.index({ beneficiary: 1, periodEnd: -1 });
independentLivingProgressSchema.index({ plan: 1, periodEnd: -1 });
independentLivingProgressSchema.index({ status: 1 });

// ─── حساب الاتجاه والنسب قبل الحفظ ───
independentLivingProgressSchema.pre('save', function (next) {
  // حساب نسبة الحضور
  if (this.sessionsScheduled > 0) {
    this.attendanceRate = Math.round((this.sessionsAttended / this.sessionsScheduled) * 100);
  }

  // حساب درجات الفئات من القياسات
  if (this.measurements && this.measurements.length > 0) {
    const categoryMeasurements = {};
    for (const m of this.measurements) {
      if (!categoryMeasurements[m.category]) {
        categoryMeasurements[m.category] = [];
      }
      categoryMeasurements[m.category].push(m.currentLevel);
    }

    for (const [cat, levels] of Object.entries(categoryMeasurements)) {
      if (this.categoryScores[cat] !== undefined) {
        const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
        this.categoryScores[cat] = Math.round(((avg - 1) / 4) * 100);
      }
    }

    // الدرجة العامة
    const allLevels = this.measurements.map(m => m.currentLevel);
    const overallAvg = allLevels.reduce((a, b) => a + b, 0) / allLevels.length;
    this.overallScore = Math.round(((overallAvg - 1) / 4) * 100);
  }

  // تحديد الاتجاه
  if (this.previousOverallScore !== undefined && this.previousOverallScore !== null) {
    const diff = this.overallScore - this.previousOverallScore;
    if (diff > 5) this.trend = 'improving';
    else if (diff < -5) this.trend = 'declining';
    else this.trend = 'stable';

    this.improvementRate =
      this.previousOverallScore > 0
        ? Math.round(
            ((this.overallScore - this.previousOverallScore) / this.previousOverallScore) * 100
          )
        : 0;
  }

  // تحديد مستوى الاستقلالية
  if (this.overallScore >= 85) this.independenceLevel = 'independent';
  else if (this.overallScore >= 65) this.independenceLevel = 'mostly_independent';
  else if (this.overallScore >= 45) this.independenceLevel = 'partially_independent';
  else if (this.overallScore >= 25) this.independenceLevel = 'mostly_dependent';
  else this.independenceLevel = 'dependent';

  next();
});

// ─── Virtuals ───
independentLivingProgressSchema.virtual('totalMilestones').get(function () {
  return this.milestones?.length || 0;
});

independentLivingProgressSchema.virtual('scoreChange').get(function () {
  if (this.previousOverallScore !== undefined) {
    return this.overallScore - this.previousOverallScore;
  }
  return null;
});

module.exports = mongoose.models.IndependentLivingProgress || mongoose.model('IndependentLivingProgress', independentLivingProgressSchema);

/**
 * @module models/IndependentLivingPlan
 * @description نموذج خطط التدريب الفردية على المهارات الحياتية
 * يشمل: الطبخ، التنظيف، التسوق، استخدام المواصلات
 */

const mongoose = require('mongoose');

// ─── مخطط هدف تدريبي ───
const trainingGoalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'عنوان الهدف مطلوب'],
      trim: true,
      maxlength: [200, 'عنوان الهدف لا يتجاوز 200 حرف'],
    },
    titleAr: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'الوصف لا يتجاوز 2000 حرف'],
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
      ],
      required: [true, 'فئة الهدف مطلوبة'],
    },
    targetLevel: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'المستوى المستهدف مطلوب'],
    },
    currentLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    // الخطوات التفصيلية لتحقيق الهدف
    steps: [
      {
        stepNumber: { type: Number, required: true },
        description: { type: String, required: true, trim: true },
        isCompleted: { type: Boolean, default: false },
        completedAt: Date,
        notes: { type: String, trim: true },
      },
    ],
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'achieved', 'on_hold', 'cancelled'],
      default: 'not_started',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    targetDate: Date,
    achievedAt: Date,
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  { _id: true, timestamps: true }
);

// ─── مخطط جلسة تدريب ───
const trainingSessionSchema = new mongoose.Schema(
  {
    sessionDate: {
      type: Date,
      required: [true, 'تاريخ الجلسة مطلوب'],
      default: Date.now,
    },
    duration: {
      type: Number, // بالدقائق
      min: [5, 'مدة الجلسة لا تقل عن 5 دقائق'],
      max: [480, 'مدة الجلسة لا تتجاوز 480 دقيقة'],
    },
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'المدرب مطلوب'],
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
      ],
      required: true,
    },
    // المهارات التي تم التدريب عليها
    skillsPracticed: [
      {
        skillName: { type: String, required: true },
        performanceRating: { type: Number, min: 1, max: 5 },
        notes: String,
      },
    ],
    objectives: {
      type: String,
      trim: true,
    },
    activities: {
      type: String,
      trim: true,
      maxlength: [3000, 'الأنشطة لا تتجاوز 3000 حرف'],
    },
    outcome: {
      type: String,
      trim: true,
      maxlength: [2000, 'النتائج لا تتجاوز 2000 حرف'],
    },
    behaviorNotes: {
      type: String,
      trim: true,
    },
    attendance: {
      type: String,
      enum: ['present', 'absent', 'late', 'cancelled'],
      default: 'present',
    },
    // تقييم الجلسة العام
    sessionRating: {
      type: String,
      enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
      default: 'satisfactory',
    },
  },
  { _id: true, timestamps: true }
);

// ─── المخطط الرئيسي لخطة التدريب ───
const independentLivingPlanSchema = new mongoose.Schema(
  {
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'المستفيد مطلوب'],
      index: true,
    },
    // مرجع تقييم ADL الأساسي
    baselineAssessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ADLAssessment',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'منشئ الخطة مطلوب'],
    },
    assignedTeam: [
      {
        member: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: ['lead_trainer', 'trainer', 'therapist', 'supervisor', 'social_worker'],
        },
        assignedAt: { type: Date, default: Date.now },
      },
    ],

    title: {
      type: String,
      required: [true, 'عنوان الخطة مطلوب'],
      trim: true,
      maxlength: [300, 'العنوان لا يتجاوز 300 حرف'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'الوصف لا يتجاوز 5000 حرف'],
    },

    // مدة الخطة
    startDate: {
      type: Date,
      required: [true, 'تاريخ البدء مطلوب'],
    },
    endDate: {
      type: Date,
      required: [true, 'تاريخ الانتهاء مطلوب'],
    },

    // الأهداف التدريبية
    goals: [trainingGoalSchema],

    // جلسات التدريب
    sessions: [trainingSessionSchema],

    // الجدول الأسبوعي
    weeklySchedule: {
      sunday: [{ time: String, category: String, activity: String }],
      monday: [{ time: String, category: String, activity: String }],
      tuesday: [{ time: String, category: String, activity: String }],
      wednesday: [{ time: String, category: String, activity: String }],
      thursday: [{ time: String, category: String, activity: String }],
      friday: [{ time: String, category: String, activity: String }],
      saturday: [{ time: String, category: String, activity: String }],
    },

    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
      default: 'draft',
    },

    // ─── التقدم العام ───
    overallProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    categoryProgress: {
      cooking: { type: Number, min: 0, max: 100, default: 0 },
      cleaning: { type: Number, min: 0, max: 100, default: 0 },
      shopping: { type: Number, min: 0, max: 100, default: 0 },
      transportation: { type: Number, min: 0, max: 100, default: 0 },
      personal_care: { type: Number, min: 0, max: 100, default: 0 },
      money_management: { type: Number, min: 0, max: 100, default: 0 },
      communication: { type: Number, min: 0, max: 100, default: 0 },
      safety: { type: Number, min: 0, max: 100, default: 0 },
    },

    // ─── المراجعات ───
    reviews: [
      {
        reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewDate: { type: Date, default: Date.now },
        findings: String,
        recommendations: String,
        adjustments: String,
        nextReviewDate: Date,
      },
    ],

    // ملاحظات عامة
    notes: {
      type: String,
      trim: true,
      maxlength: [5000, 'الملاحظات لا تتجاوز 5000 حرف'],
    },

    attachments: [
      {
        filename: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───
independentLivingPlanSchema.index({ beneficiary: 1, status: 1 });
independentLivingPlanSchema.index({ createdBy: 1 });
independentLivingPlanSchema.index({ startDate: 1, endDate: 1 });

// ─── حساب التقدم قبل الحفظ ───
independentLivingPlanSchema.pre('save', function (next) {
  if (this.goals && this.goals.length > 0) {
    // حساب تقدم الفئات
    const categoryGoals = {};
    for (const goal of this.goals) {
      if (!categoryGoals[goal.category]) {
        categoryGoals[goal.category] = [];
      }
      categoryGoals[goal.category].push(goal.progressPercentage || 0);
    }

    for (const [cat, progressArr] of Object.entries(categoryGoals)) {
      if (this.categoryProgress[cat] !== undefined) {
        const avg = progressArr.reduce((a, b) => a + b, 0) / progressArr.length;
        this.categoryProgress[cat] = Math.round(avg);
      }
    }

    // حساب التقدم العام
    const totalProgress = this.goals.reduce((acc, g) => acc + (g.progressPercentage || 0), 0);
    this.overallProgress = Math.round(totalProgress / this.goals.length);
  }
  next();
});

// ─── Virtuals ───
independentLivingPlanSchema.virtual('totalSessions').get(function () {
  return this.sessions?.length || 0;
});

independentLivingPlanSchema.virtual('completedGoals').get(function () {
  return this.goals?.filter(g => g.status === 'achieved').length || 0;
});

independentLivingPlanSchema.virtual('activeGoals').get(function () {
  return this.goals?.filter(g => g.status === 'in_progress').length || 0;
});

independentLivingPlanSchema.virtual('durationWeeks').get(function () {
  if (this.startDate && this.endDate) {
    const ms = this.endDate - this.startDate;
    return Math.ceil(ms / (7 * 24 * 60 * 60 * 1000));
  }
  return 0;
});

module.exports = mongoose.model('IndependentLivingPlan', independentLivingPlanSchema);

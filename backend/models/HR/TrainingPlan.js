/**
 * نموذج خطة التدريب الذكية (Smart Training Plan)
 * يربط بين فجوات المهارات والتدريب المطلوب مع توصيات AI
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const trainingItemSchema = new Schema({
  title: { type: String, required: true },
  titleEn: { type: String },
  type: {
    type: String,
    enum: [
      'دورة داخلية',
      'دورة خارجية',
      'ورشة عمل',
      'تدريب إلكتروني',
      'شهادة مهنية',
      'توجيه',
      'تعلم ذاتي',
    ],
    default: 'دورة داخلية',
  },
  provider: { type: String },
  description: { type: String },
  skillsCovered: [{ type: String }],
  duration: {
    hours: { type: Number },
    days: { type: Number },
  },
  startDate: { type: Date },
  endDate: { type: Date },
  completedDate: { type: Date },
  status: {
    type: String,
    enum: ['مخطط', 'مسجل', 'جاري', 'مكتمل', 'ملغى', 'مؤجل'],
    default: 'مخطط',
  },
  cost: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    budgetCode: { type: String },
  },
  result: {
    passed: { type: Boolean },
    score: { type: Number, min: 0, max: 100 },
    certificate: { type: String }, // رابط الشهادة
    feedback: { type: String },
  },
  // توصية AI
  aiRecommended: { type: Boolean, default: false },
  aiReason: { type: String },
  aiPriority: { type: Number, min: 1, max: 10 },
  order: { type: Number, default: 0 },
});

const trainingPlanSchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    planName: { type: String, required: true },
    year: { type: Number, required: true },
    quarter: { type: Number, min: 1, max: 4 },
    department: { type: String },

    // الأهداف التطويرية
    objectives: [
      {
        title: { type: String },
        description: { type: String },
        linkedSkills: [{ type: String }],
        status: { type: String, enum: ['نشط', 'محقق', 'ملغى'], default: 'نشط' },
      },
    ],

    // عناصر التدريب
    items: [trainingItemSchema],

    // ملخص
    summary: {
      totalItems: { type: Number, default: 0 },
      completedItems: { type: Number, default: 0 },
      totalHours: { type: Number, default: 0 },
      completedHours: { type: Number, default: 0 },
      totalBudget: { type: Number, default: 0 },
      spentBudget: { type: Number, default: 0 },
      progress: { type: Number, default: 0, min: 0, max: 100 },
    },

    // تحليل AI
    aiAnalysis: {
      skillImprovementForecast: { type: Number, min: 0, max: 100 },
      roi: { type: Number }, // العائد على التدريب المتوقع
      suggestions: [{ type: String }],
      alternativeCourses: [
        {
          title: { type: String },
          provider: { type: String },
          reason: { type: String },
          cost: { type: Number },
        },
      ],
      lastAnalyzedAt: { type: Date },
    },

    // الموافقات
    approvals: [
      {
        approverRole: { type: String },
        approverId: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['معلق', 'موافق', 'مرفوض'] },
        comment: { type: String },
        date: { type: Date },
      },
    ],

    status: {
      type: String,
      enum: ['مسودة', 'قيد الموافقة', 'معتمد', 'جاري التنفيذ', 'مكتمل', 'ملغى'],
      default: 'مسودة',
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

// حساب الملخص تلقائياً
trainingPlanSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    const items = this.items;
    this.summary.totalItems = items.length;
    this.summary.completedItems = items.filter(i => i.status === 'مكتمل').length;
    this.summary.totalHours = items.reduce((s, i) => s + (i.duration?.hours || 0), 0);
    this.summary.completedHours = items
      .filter(i => i.status === 'مكتمل')
      .reduce((s, i) => s + (i.duration?.hours || 0), 0);
    this.summary.totalBudget = items.reduce((s, i) => s + (i.cost?.amount || 0), 0);
    this.summary.spentBudget = items
      .filter(i => ['مكتمل', 'جاري'].includes(i.status))
      .reduce((s, i) => s + (i.cost?.amount || 0), 0);
    this.summary.progress = Math.round(
      (this.summary.completedItems / this.summary.totalItems) * 100
    );
  }
  next();
});

trainingPlanSchema.index({ year: 1, department: 1 });
trainingPlanSchema.index({ status: 1 });

module.exports = mongoose.model('TrainingPlan', trainingPlanSchema);

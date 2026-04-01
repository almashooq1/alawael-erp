/**
 * نموذج المسار الوظيفي (Career Path)
 * يتتبع تطور الموظف المهني مع توصيات AI
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const milestoneSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  targetDate: { type: Date },
  achievedDate: { type: Date },
  status: {
    type: String,
    enum: ['مخطط', 'جاري', 'مكتمل', 'ملغى'],
    default: 'مخطط',
  },
  requiredSkills: [{ type: String }],
  requiredCourses: [{ type: String }],
  kpiTargets: [
    {
      name: { type: String },
      target: { type: Number },
      actual: { type: Number },
    },
  ],
});

const skillGapSchema = new Schema({
  skillName: { type: String, required: true },
  currentLevel: { type: Number, min: 0, max: 10, default: 0 },
  requiredLevel: { type: Number, min: 0, max: 10 },
  gap: { type: Number }, // auto-calc
  priority: { type: String, enum: ['حرجة', 'عالية', 'متوسطة', 'منخفضة'], default: 'متوسطة' },
  suggestedActions: [{ type: String }],
  aiRecommendation: { type: String },
});

const careerPathSchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    // الوظيفة الحالية
    currentPosition: {
      title: { type: String },
      level: { type: String },
      department: { type: String },
      since: { type: Date },
    },

    // الأهداف المهنية
    careerGoals: [
      {
        title: { type: String },
        targetRole: { type: String },
        targetLevel: { type: String },
        timeline: { type: String }, // مثلاً "6 أشهر"
        status: { type: String, enum: ['نشط', 'محقق', 'معلق'], default: 'نشط' },
      },
    ],

    // المسار المقترح (AI)
    suggestedPath: [
      {
        step: { type: Number },
        role: { type: String },
        department: { type: String },
        timeframe: { type: String },
        probability: { type: Number, min: 0, max: 100 }, // AI confidence
        requirements: [{ type: String }],
      },
    ],

    // المحطات / الإنجازات
    milestones: [milestoneSchema],

    // فجوات المهارات
    skillGaps: [skillGapSchema],

    // ملخص AI
    aiAnalysis: {
      readinessScore: { type: Number, min: 0, max: 100 },
      promotionLikelihood: { type: Number, min: 0, max: 100 },
      retentionRisk: { type: String, enum: ['منخفض', 'متوسط', 'عالي', 'حرج'] },
      strengths: [{ type: String }],
      developmentAreas: [{ type: String }],
      summary: { type: String },
      lastAnalyzedAt: { type: Date },
    },

    // مراجعات المدير
    managerReviews: [
      {
        managerId: { type: Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String },
        rating: { type: Number, min: 1, max: 5 },
        date: { type: Date, default: Date.now },
      },
    ],

    status: {
      type: String,
      enum: ['نشط', 'معلق', 'مكتمل', 'ملغى'],
      default: 'نشط',
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

// حساب الفجوة تلقائياً
careerPathSchema.pre('save', function (next) {
  if (this.skillGaps) {
    this.skillGaps.forEach(sg => {
      sg.gap = (sg.requiredLevel || 0) - (sg.currentLevel || 0);
    });
  }
  next();
});

careerPathSchema.index({ 'aiAnalysis.retentionRisk': 1 });
careerPathSchema.index({ 'aiAnalysis.readinessScore': -1 });
careerPathSchema.index({ status: 1 });

module.exports = mongoose.models.CareerPath || mongoose.model('CareerPath', careerPathSchema);

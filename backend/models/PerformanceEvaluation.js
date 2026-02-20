/**
 * نموذج نظام التقييم المتقدم
 * Advanced Performance Evaluation System Model
 */

const mongoose = require('mongoose');

// Schema لمعايير التقييم
const EvaluationCriteriaSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: [
      'technical_skills',      // المهارات التقنية
      'soft_skills',            // المهارات اللينة
      'leadership',             // القيادة
      'teamwork',               // العمل الجماعي
      'communication',          // التواصل
      'productivity',           // الإنتاجية
      'quality',                // جودة العمل
      'reliability',            // الموثوقية
      'innovation',             // الابتكار
      'customer_service'        // خدمة العملاء
    ]
  },
  criteriaName: String,
  description: String,
  weight: Number, // وزن المعيار من 0-1
  maxScore: {
    type: Number,
    default: 5
  }
});

// Schema لتقييم الفرد الواحد
const IndividualEvaluationSchema = new mongoose.Schema({
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  evaluationType: {
    type: String,
    enum: ['management', 'peer', 'recipient', 'self'],
    required: true
  },
  score: Number, // النتيجة الإجمالية
  scores: [{
    criteriaId: String,
    criteriaName: String,
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String
  }],
  comments: String,
  strengths: [String],
  areasForImprovement: [String],
  recommendations: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Schema الرئيسي للتقييم الشامل
const PerformanceEvaluationSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  evaluationPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  
  // التقييمات من الجهات المختلفة
  evaluations: {
    // تقييم من الإدارة
    managementEvaluation: IndividualEvaluationSchema,
    
    // تقييمات الزملاء
    peerEvaluations: [IndividualEvaluationSchema],
    
    // تقييمات المستفيدين/الأسر
    recipientEvaluations: [IndividualEvaluationSchema],
    
    // التقييم الذاتي
    selfEvaluation: IndividualEvaluationSchema
  },

  // التحليل والملخص
  summary: {
    // النتائج المرجحة
    weightedScores: {
      management: Number,      // وزن 40%
      peers: Number,           // وزن 30%
      recipients: Number,      // وزن 20%
      self: Number             // وزن 10%
    },
    
    // النتيجة النهائية
    overallScore: Number,
    overallRating: {
      type: String,
      enum: ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف'],
      required: true
    },
    
    // الملخص التنفيذي
    executiveSummary: String,
    keyAchievements: [String],
    mainChallenges: [String],
    
    // التوصيات العامة
    promotionRecommended: Boolean,
    trainingNeeds: [String],
    careerPathRecommendation: String,
    salaryAdjustmentRecommended: Boolean,
    salaryAdjustmentPercentage: Number
  },

  // معلومات الموارد البشرية
  hrNotes: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date,

  // حالة التقييم
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'pending_review', 'approved', 'archived'],
    default: 'draft'
  },

  // الجدول الزمني
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  submittedAt: Date,
  reviewedAt: Date
});

// Indexes
PerformanceEvaluationSchema.index({ employeeId: 1, 'evaluationPeriod.startDate': -1 });
PerformanceEvaluationSchema.index({ status: 1 });
PerformanceEvaluationSchema.index({ 'summary.overallRating': 1 });

// Virtual للحصول على مدة التقييم
PerformanceEvaluationSchema.virtual('evaluationDuration').get(function() {
  return this.evaluationPeriod.endDate - this.evaluationPeriod.startDate;
});

// Method لحساب النتيجة النهائية
PerformanceEvaluationSchema.methods.calculateOverallScore = function() {
  const weights = {
    management: 0.4,
    peers: 0.3,
    recipients: 0.2,
    self: 0.1
  };

  let weightedTotal = 0;
  let totalWeight = 0;

  if (this.evaluations.managementEvaluation && this.evaluations.managementEvaluation.score) {
    weightedTotal += this.evaluations.managementEvaluation.score * weights.management;
    totalWeight += weights.management;
  }

  if (this.evaluations.peerEvaluations && this.evaluations.peerEvaluations.length > 0) {
    const peerAverage = this.evaluations.peerEvaluations.reduce((sum, eval) => sum + eval.score, 0) / this.evaluations.peerEvaluations.length;
    weightedTotal += peerAverage * weights.peers;
    totalWeight += weights.peers;
  }

  if (this.evaluations.recipientEvaluations && this.evaluations.recipientEvaluations.length > 0) {
    const recipientAverage = this.evaluations.recipientEvaluations.reduce((sum, eval) => sum + eval.score, 0) / this.evaluations.recipientEvaluations.length;
    weightedTotal += recipientAverage * weights.recipients;
    totalWeight += weights.recipients;
  }

  if (this.evaluations.selfEvaluation && this.evaluations.selfEvaluation.score) {
    weightedTotal += this.evaluations.selfEvaluation.score * weights.self;
    totalWeight += weights.self;
  }

  this.summary.overallScore = totalWeight > 0 ? weightedTotal / totalWeight : 0;

  // تحديد التقييم على أساس النتيجة
  if (this.summary.overallScore >= 4.5) {
    this.summary.overallRating = 'ممتاز';
  } else if (this.summary.overallScore >= 4) {
    this.summary.overallRating = 'جيد جداً';
  } else if (this.summary.overallScore >= 3.5) {
    this.summary.overallRating = 'جيد';
  } else if (this.summary.overallScore >= 2.5) {
    this.summary.overallRating = 'مقبول';
  } else {
    this.summary.overallRating = 'ضعيف';
  }

  return this.summary.overallScore;
};

module.exports = mongoose.model('PerformanceEvaluation', PerformanceEvaluationSchema);

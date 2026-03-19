/**
 * نموذج خطة التطوير الفردية
 * Development Plan Model
 */

const mongoose = require('mongoose');

const DevelopmentPlanSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // الأهداف التنموية
  developmentGoals: [{
    goal: String,
    category: {
      type: String,
      enum: ['technical', 'leadership', 'soft_skills', 'domain_knowledge', 'other']
    },
    targetDate: Date,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'on_hold'],
      default: 'not_started'
    },
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    createdAt: { type: Date, default: Date.now }
  }],

  // الدورات التدريبية المخطط لها
  plannedTrainings: [{
    trainingTitle: String,
    provider: String,
    startDate: Date,
    endDate: Date,
    duration: Number,
    cost: Number,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    status: {
      type: String,
      enum: ['planned', 'approved', 'completed', 'cancelled'],
      default: 'planned'
    },
    certificateReceived: Boolean,
    certificateNumber: String,
    createdAt: { type: Date, default: Date.now }
  }],

  // المسؤوليات الإضافية/المشاريع
  expandedResponsibilities: [{
    responsibility: String,
    purpose: String,
    startDate: Date,
    expectedDuration: Number,
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'assigned'
    },
    completionPercentage: {
      type: Number,
      default: 0
    },
    learningOutcomes: [String],
    createdAt: { type: Date, default: Date.now }
  }],

  // الملاحظات الدورية
  reviewNotes: [{
    reviewDate: Date,
    reviewer: mongoose.Schema.Types.ObjectId,
    goalsProgress: String,
    trainingsProgress: String,
    overallProgress: String,
    nextSteps: String,
    rating: {
      type: String,
      enum: ['on_track', 'needs_attention', 'exceeding', 'behind'],
      default: 'on_track'
    }
  }],

  // معلومات التخطيط
  planPeriod: {
    startDate: Date,
    endDate: Date
  },

  // المؤشرات والتقدم
  progress: {
    goalsCompletion: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    trainingsCompletion: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    responsibilitiesCompletion: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    overallProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },

  // الحالة والتاريخ
  status: {
    type: String,
    enum: ['draft', 'active', 'on_hold', 'completed', 'archived'],
    default: 'draft'
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: mongoose.Schema.Types.ObjectId,
  reviewedBy: mongoose.Schema.Types.ObjectId,
  reviewDate: Date
});

// Index للبحث السريع
DevelopmentPlanSchema.index({ employeeId: 1 });
DevelopmentPlanSchema.index({ status: 1 });
DevelopmentPlanSchema.index({ 'planPeriod.startDate': 1 });

// Virtual لحساب إجمالي الأهداف المكتملة
DevelopmentPlanSchema.virtual('completedGoals').get(function() {
  return this.developmentGoals.filter(g => g.status === 'completed').length;
});

// Method لحساب نسبة التقدم
DevelopmentPlanSchema.methods.calculateProgress = function() {
  const totalGoals = this.developmentGoals.length;
  const totalTrainings = this.plannedTrainings.length;
  const totalResponsibilities = this.expandedResponsibilities.length;
  
  if (totalGoals === 0 && totalTrainings === 0 && totalResponsibilities === 0) {
    return 0;
  }

  let totalCompletion = 0;
  let totalItems = 0;

  if (totalGoals > 0) {
    const goalsCompletion = this.developmentGoals.reduce((sum, goal) => sum + (goal.completionPercentage || 0), 0) / totalGoals;
    totalCompletion += goalsCompletion * 0.4;
    totalItems += 0.4;
  }

  if (totalTrainings > 0) {
    const trainingsCompletion = this.plannedTrainings.filter(t => t.status === 'completed').length / totalTrainings * 100;
    totalCompletion += trainingsCompletion * 0.35;
    totalItems += 0.35;
  }

  if (totalResponsibilities > 0) {
    const responsibilitiesCompletion = this.expandedResponsibilities.reduce((sum, r) => sum + (r.completionPercentage || 0), 0) / totalResponsibilities;
    totalCompletion += responsibilitiesCompletion * 0.25;
    totalItems += 0.25;
  }

  this.progress.overallProgress = totalItems > 0 ? totalCompletion / totalItems : 0;
  return this.progress.overallProgress;
};

module.exports = mongoose.model('DevelopmentPlan', DevelopmentPlanSchema);

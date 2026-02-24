/**
 * نموذج تخطيط التعاقب الوظيفي
 * Succession Planning Model
 */

const mongoose = require('mongoose');

// Schema لخطة التطوير الفردية
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
      max: 100
    }
  }],

  // الدورات التدريبية المخطط لها
  plannedTrainings: [{
    trainingTitle: String,
    provider: String,
    startDate: Date,
    endDate: Date,
    cost: Number,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    status: {
      type: String,
      enum: ['planned', 'approved', 'completed', 'cancelled'],
      default: 'planned'
    }
  }],

  // المهام والمسؤوليات الإضافية
  expandedResponsibilities: [{
    responsibility: String,
    purpose: String,
    startDate: Date,
    expectedDuration: Number, // بالأشهر
    supervisor: mongoose.Schema.Types.ObjectId,
    status: {
      type: String,
      enum: ['assigned', 'in_progress', 'completed'],
      default: 'assigned'
    }
  }],

  // الملاحظات والتعليقات
  notes: String,
  reviewDates: [Date],

  // الجدول الزمني
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: mongoose.Schema.Types.ObjectId,
  reviewedBy: mongoose.Schema.Types.ObjectId,
  reviewDate: Date
});

// Schema لمرشح الخلافة
const SuccessionCandidateSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  readinessLevel: {
    type: String,
    enum: ['ready_now', 'ready_1_year', 'ready_3_years', 'developing'],
    required: true
  },
  readinessPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  keyStrengths: [String],
  developmentNeeds: [String],
  developmentPlan: DevelopmentPlanSchema,
  developmentPlanId: mongoose.Schema.Types.ObjectId,
  
  // الملاحظات
  assessmentComments: String,
  assessedBy: mongoose.Schema.Types.ObjectId,
  assessmentDate: Date
});

// Schema الرئيسي لتخطيط التعاقب
const SuccessionPlanSchema = new mongoose.Schema({
  // الموضع/الوظيفة
  positionId: {
    type: String,
    required: true
  },
  positionTitle: String,
  department: String,
  
  // الموظف الحالي
  currentHolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // الكفاءات المطلوبة للوظيفة
  requiredCompetencies: [{
    competency: String,
    proficiencyLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert']
    },
    criticality: {
      type: String,
      enum: ['critical', 'important', 'desirable']
    }
  }],

  // مرشحو الخلافة
  successors: [SuccessionCandidateSchema],

  // خطة الطوارئ
  emergencySuccessor: {
    employeeId: mongoose.Schema.Types.ObjectId,
    readinessLevel: String,
    notes: String
  },

  // المعايير والأهداف
  riskLevel: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'high'
  },
  riskAssessment: String,

  // الجدول الزمني
  planningTimeline: {
    immediateNeed: Boolean,
    planningHorizon: String, // مثل: 1-3 years
    expectedRetirementDate: Date,
    expectedPromotionDate: Date
  },

  // الموارد والدعم
  mentorshipProgram: {
    mentorId: mongoose.Schema.Types.ObjectId,
    startDate: Date,
    objectives: [String],
    status: {
      type: String,
      enum: ['active', 'completed', 'on_hold']
    }
  },

  // برنامج الإعداد القيادي
  leadershipProgram: {
    programName: String,
    provider: String,
    startDate: Date,
    endDate: Date,
    participants: [mongoose.Schema.Types.ObjectId],
    objectives: [String],
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed'],
      default: 'planned'
    }
  },

  // الملاحظات والمراجعات
  notes: String,
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'archived'],
    default: 'draft'
  },

  // الجدول الزمني للخطة
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  nextReviewDate: Date,
  createdBy: mongoose.Schema.Types.ObjectId,
  reviewedBy: mongoose.Schema.Types.ObjectId
});

// Indexes
SuccessionPlanSchema.index({ positionId: 1 });
SuccessionPlanSchema.index({ 'currentHolder': 1 });
SuccessionPlanSchema.index({ status: 1 });
SuccessionPlanSchema.index({ riskLevel: 1 });

// Virtual لحساب الجاهزية الإجمالية
SuccessionPlanSchema.virtual('overallReadiness').get(function() {
  if (this.successors && this.successors.length > 0) {
    const totalReadiness = this.successors.reduce((sum, successor) => {
      return sum + (successor.readinessPercentage || 0);
    }, 0);
    return totalReadiness / this.successors.length;
  }
  return 0;
});

// Method للحصول على أفضل مرشح
SuccessionPlanSchema.methods.getBestCandidate = function() {
  if (!this.successors || this.successors.length === 0) {
    return null;
  }
  
  // ترتيب حسب الجاهزية والنسبة المئوية
  return this.successors.sort((a, b) => {
    const readinessOrder = { 'ready_now': 0, 'ready_1_year': 1, 'ready_3_years': 2, 'developing': 3 };
    if (readinessOrder[a.readinessLevel] !== readinessOrder[b.readinessLevel]) {
      return readinessOrder[a.readinessLevel] - readinessOrder[b.readinessLevel];
    }
    return (b.readinessPercentage || 0) - (a.readinessPercentage || 0);
  })[0];
};

module.exports = mongoose.model('SuccessionPlan', SuccessionPlanSchema);

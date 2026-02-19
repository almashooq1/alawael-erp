/**
 * SupportPlan.js - Support Plan Model
 * Comprehensive support planning and intervention tracking
 *
 * @module models/BeneficiaryManagement/SupportPlan
 */

const mongoose = require('mongoose');

const supportPlanSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: [true, 'Beneficiary ID is required'],
    index: true
  },

  // Plan Information
  planStatus: {
    type: String,
    enum: ['active', 'inactive', 'completed', 'on_hold', 'reviewed'],
    default: 'active',
    index: true
  },

  planType: {
    type: String,
    enum: ['academic', 'behavioral', 'financial', 'health', 'comprehensive'],
    required: [true, 'Plan type is required']
  },

  // Assessment Information
  initialAssessment: {
    date: { type: Date, default: Date.now },
    academicConcern: Boolean,
    behavioralConcern: Boolean,
    financialConcern: Boolean,
    healthConcern: Boolean,
    socialConcern: Boolean,
    emotionalConcern: Boolean,
    assessmentNotes: String
  },

  concerns: [String],
  assessmentNotes: {
    type: String,
    maxlength: 1000
  },

  // Coordinator Information
  coordinatorId: {
    type: String,
    required: [true, 'Coordinator ID is required']
  },
  coordinatorName: String,

  // Goals
  goals: [{
    goalId: mongoose.Schema.Types.ObjectId,
    description: {
      type: String,
      required: true
    },
    targetDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'achieved', 'not_achieved'],
      default: 'pending'
    },
    completionDate: Date,
    measurableIndicator: String
  }],

  // Interventions & Recommendations
  recommendedInterventions: [{
    interventionType: String, // 'counseling', 'tutoring', 'mentoring', 'financial_aid', 'medical'
    description: String,
    frequency: String, // 'weekly', 'bi-weekly', 'monthly'
    expectedDuration: String,
    provider: String,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['recommended', 'scheduled', 'in_progress', 'completed'],
      default: 'recommended'
    }
  }],

  // Review Schedule
  reviewSchedule: {
    nextReviewDate: {
      type: Date,
      required: true
    },
    reviewFrequency: {
      type: String,
      enum: ['weekly', 'bi-weekly', 'monthly', 'quarterly'],
      default: 'monthly'
    },
    reviewStatus: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending'
    }
  },

  // Review History
  reviews: [{
    reviewDate: { type: Date, default: Date.now },
    reviewedBy: String,
    progressNotes: String,
    goalsAchieved: [String],
    newConcerns: [String],
    updatedGoals: [String],
    recommendations: String
  }],

  // Support Services Activated
  activatedServices: [{
    serviceType: String,
    serviceProvider: String,
    activationDate: Date,
    status: {
      type: String,
      enum: ['active', 'inactive', 'completed'],
      default: 'active'
    }
  }],

  // Emergency Contact
  emergencyContact: {
    name: String,
    phone: String,
    availability: String
  },

  // Plan Duration
  planStartDate: {
    type: Date,
    default: Date.now
  },

  planEndDate: Date,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  auditLog: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    performedBy: String,
    details: String
  }]
}, {
  timestamps: true,
  collection: 'supportPlans'
});

// Indexes
supportPlanSchema.index({ beneficiaryId: 1 });
supportPlanSchema.index({ planStatus: 1 });
supportPlanSchema.index({ planType: 1 });
supportPlanSchema.index({ 'reviewSchedule.nextReviewDate': 1 });
supportPlanSchema.index({ coordinatorId: 1 });

// Pre-save middleware
supportPlanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods
supportPlanSchema.methods.scheduleReview = function(scheduledDate) {
  this.reviewSchedule.nextReviewDate = scheduledDate;
  this.reviewSchedule.reviewStatus = 'pending';
  return this.save();
};

supportPlanSchema.methods.completeReview = function(reviewData) {
  this.reviews.push({
    reviewDate: new Date(),
    ...reviewData
  });

  this.reviewSchedule.reviewStatus = 'completed';

  // Schedule next review
  const nextReview = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  this.reviewSchedule.nextReviewDate = nextReview;

  return this.save();
};

supportPlanSchema.methods.addGoal = function(goalData) {
  this.goals.push({
    goalId: new mongoose.Types.ObjectId(),
    ...goalData,
    status: 'pending'
  });

  return this.save();
};

supportPlanSchema.methods.updateGoalStatus = function(goalId, status, completionDate = null) {
  const goal = this.goals.find(g => g.goalId.toString() === goalId.toString());

  if (!goal) {
    throw new Error('Goal not found');
  }

  goal.status = status;
  if (completionDate) {
    goal.completionDate = completionDate;
  }

  return this.save();
};

supportPlanSchema.methods.activateIntervention = function(interventionData) {
  this.recommendedInterventions.push({
    ...interventionData,
    status: 'in_progress'
  });

  return this.save();
};

supportPlanSchema.methods.completePlan = function(completionNotes = '') {
  this.planStatus = 'completed';
  this.planEndDate = new Date();

  this.auditLog.push({
    action: 'PLAN_COMPLETED',
    timestamp: new Date(),
    details: completionNotes
  });

  return this.save();
};

// Statics
supportPlanSchema.statics.findByBeneficiary = function(beneficiaryId) {
  return this.findOne({ beneficiaryId, planStatus: 'active' });
};

supportPlanSchema.statics.findActivePlans = function() {
  return this.find({ planStatus: 'active' });
};

supportPlanSchema.statics.findPendingReviews = function() {
  return this.find({
    planStatus: 'active',
    'reviewSchedule.reviewStatus': 'pending',
    'reviewSchedule.nextReviewDate': { $lte: new Date() }
  });
};

const SupportPlan = mongoose.model('SupportPlan', supportPlanSchema);

module.exports = SupportPlan;

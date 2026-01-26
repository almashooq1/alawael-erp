const mongoose = require('mongoose');

/**
 * SMART Goals Schema
 * Specific, Measurable, Achievable, Relevant, Time-bound
 */
const smartGoalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        'motor',
        'cognitive',
        'social',
        'communication',
        'self_care',
        'behavioral',
        'academic',
      ],
      required: true,
    },
    // SMART Criteria
    specific: {
      what: String, // What will be accomplished
      who: String, // Who will accomplish it
      where: String, // Where it will happen
      why: String, // Why it's important
    },
    measurable: {
      metric: String, // How progress will be measured
      unit: String, // Unit of measurement (%, times, seconds, etc.)
      baseline: Number, // Starting point
      target: Number, // Target to achieve
      current: Number, // Current progress
      milestones: [
        {
          value: Number,
          date: Date,
          achieved: Boolean,
          achievedDate: Date,
        },
      ],
    },
    achievable: {
      isRealistic: Boolean,
      requiredResources: [String],
      potentialBarriers: [String],
      supportStrategies: [String],
    },
    relevant: {
      alignsWithOverallGoals: Boolean,
      benefitDescription: String,
      priorityLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
    },
    timeBound: {
      startDate: {
        type: Date,
        required: true,
      },
      targetDate: {
        type: Date,
        required: true,
      },
      reviewDates: [Date],
      extensionRequests: [
        {
          requestDate: Date,
          newTargetDate: Date,
          reason: String,
          approved: Boolean,
          approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
    },
    // Progress Tracking
    progressUpdates: [
      {
        date: Date,
        value: Number,
        percentage: Number,
        notes: String,
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        attachments: [
          {
            type: String,
            url: String,
          },
        ],
      },
    ],
    // Status
    status: {
      type: String,
      enum: [
        'draft',
        'active',
        'on_track',
        'at_risk',
        'delayed',
        'achieved',
        'revised',
        'cancelled',
      ],
      default: 'draft',
    },
    achievementPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // Alerts and Warnings
    alerts: [
      {
        type: {
          type: String,
          enum: [
            'progress_delay',
            'milestone_missed',
            'review_due',
            'target_date_approaching',
            'no_progress',
          ],
        },
        severity: {
          type: String,
          enum: ['info', 'warning', 'critical'],
        },
        message: String,
        date: Date,
        acknowledged: Boolean,
        acknowledgedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        acknowledgedDate: Date,
      },
    ],
  },
  { _id: false }
);

/**
 * Assessment Schema for periodic evaluations
 */
const assessmentSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    type: {
      type: String,
      enum: ['initial', 'quarterly', 'semi_annual', 'annual', 'ad_hoc'],
      required: true,
    },
    assessor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Overall Assessment
    overallProgress: {
      type: String,
      enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
      required: true,
    },
    overallNotes: String,
    // Domain-specific assessments
    domains: [
      {
        name: {
          type: String,
          enum: [
            'motor',
            'cognitive',
            'social',
            'communication',
            'self_care',
            'behavioral',
            'academic',
          ],
        },
        score: Number,
        maxScore: Number,
        percentage: Number,
        notes: String,
        improvements: [String],
        concerns: [String],
      },
    ],
    // Recommendations
    recommendations: [
      {
        type: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high'],
        },
        implementBy: Date,
      },
    ],
    // Goal modifications
    goalsToModify: [
      {
        goalId: mongoose.Schema.Types.ObjectId,
        action: {
          type: String,
          enum: ['continue', 'revise', 'extend', 'discontinue', 'achieve'],
        },
        reason: String,
      },
    ],
    // Attachments
    attachments: [
      {
        name: String,
        url: String,
        type: String,
      },
    ],
    // Next assessment date
    nextAssessmentDate: Date,
    // Family feedback
    familyPresent: Boolean,
    familyFeedback: String,
    familySignature: String,
    familySignatureDate: Date,
  },
  { _id: false }
);

/**
 * Smart IRP Main Schema
 */
const smartIRPSchema = new mongoose.Schema(
  {
    // Beneficiary Info
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    beneficiaryName: String,
    beneficiaryAge: Number,
    beneficiaryGender: String,

    // Program Info
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RehabilitationProgram',
    },
    programName: String,

    // IRP Metadata
    irpNumber: {
      type: String,
      unique: true,
      required: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'under_review', 'revised', 'completed', 'archived'],
      default: 'draft',
    },

    // Team Members
    team: [
      {
        member: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['coordinator', 'therapist', 'specialist', 'teacher', 'doctor', 'family', 'other'],
        },
        specialization: String,
        responsibilities: [String],
      },
    ],

    // Initial Assessment
    initialAssessment: {
      date: Date,
      strengths: [String],
      challenges: [String],
      familyPriorities: [String],
      medicalHistory: String,
      functionalBaseline: String,
    },

    // SMART Goals
    goals: [smartGoalSchema],

    // Periodic Assessments
    assessments: [assessmentSchema],

    // KPIs and Benchmarks
    kpis: {
      overallProgress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      goalsOnTrack: Number,
      goalsAtRisk: Number,
      goalsAchieved: Number,
      goalsDelayed: Number,
      averageGoalCompletion: Number,
      // Benchmark comparison
      benchmarks: {
        nationalAverage: Number,
        programAverage: Number,
        ageGroupAverage: Number,
        comparisonStatus: {
          type: String,
          enum: ['above_average', 'average', 'below_average'],
        },
      },
    },

    // Auto Review Settings
    autoReview: {
      enabled: {
        type: Boolean,
        default: true,
      },
      frequency: {
        type: String,
        enum: ['weekly', 'biweekly', 'monthly', 'quarterly'],
        default: 'monthly',
      },
      nextReviewDate: Date,
      lastReviewDate: Date,
      autoAlerts: {
        type: Boolean,
        default: true,
      },
      alertRecipients: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },

    // Reports and Documents
    reports: [
      {
        type: {
          type: String,
          enum: ['progress', 'quarterly', 'annual', 'ad_hoc', 'family'],
        },
        generatedDate: Date,
        reportPeriod: {
          start: Date,
          end: Date,
        },
        url: String,
        sentToFamily: Boolean,
        sentDate: Date,
        familyViewed: Boolean,
        familyViewedDate: Date,
        familyFeedback: String,
      },
    ],

    // Audit Trail
    history: [
      {
        action: String,
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: mongoose.Schema.Types.Mixed,
      },
    ],

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    activatedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes (irpNumber already has unique:true, creates automatic index)
smartIRPSchema.index({ beneficiary: 1, status: 1 });
smartIRPSchema.index({ 'team.member': 1 });
smartIRPSchema.index({ status: 1, 'autoReview.nextReviewDate': 1 });
smartIRPSchema.index({ createdAt: -1 });

// Virtual for active goals
smartIRPSchema.virtual('activeGoals').get(function () {
  return this.goals.filter(g => ['active', 'on_track', 'at_risk', 'delayed'].includes(g.status));
});

// Methods

/**
 * Calculate overall progress
 */
smartIRPSchema.methods.calculateOverallProgress = function () {
  if (this.goals.length === 0) return 0;

  const totalProgress = this.goals.reduce((sum, goal) => {
    return sum + (goal.achievementPercentage || 0);
  }, 0);

  return Math.round(totalProgress / this.goals.length);
};

/**
 * Update KPIs
 */
smartIRPSchema.methods.updateKPIs = function () {
  const goals = this.goals;

  this.kpis.goalsOnTrack = goals.filter(g => g.status === 'on_track').length;
  this.kpis.goalsAtRisk = goals.filter(g => g.status === 'at_risk').length;
  this.kpis.goalsAchieved = goals.filter(g => g.status === 'achieved').length;
  this.kpis.goalsDelayed = goals.filter(g => g.status === 'delayed').length;
  this.kpis.overallProgress = this.calculateOverallProgress();

  if (goals.length > 0) {
    this.kpis.averageGoalCompletion = this.kpis.overallProgress;
  }
};

/**
 * Check for alerts
 */
smartIRPSchema.methods.checkForAlerts = function () {
  const alerts = [];
  const now = new Date();

  this.goals.forEach((goal, index) => {
    // Check if target date is approaching (within 7 days)
    const daysUntilTarget = Math.ceil((goal.timeBound.targetDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilTarget <= 7 && daysUntilTarget > 0 && goal.achievementPercentage < 80) {
      alerts.push({
        goalIndex: index,
        type: 'target_date_approaching',
        severity: 'warning',
        message: `Goal "${goal.title}" target date is approaching in ${daysUntilTarget} days but only ${goal.achievementPercentage}% complete`,
        date: now,
      });
    }

    // Check if target date passed without achievement
    if (now > goal.timeBound.targetDate && goal.status !== 'achieved') {
      alerts.push({
        goalIndex: index,
        type: 'milestone_missed',
        severity: 'critical',
        message: `Goal "${goal.title}" target date has passed without achievement`,
        date: now,
      });

      // Auto-update status to delayed
      goal.status = 'delayed';
    }

    // Check for no progress in last 30 days
    if (goal.progressUpdates.length > 0) {
      const lastUpdate = goal.progressUpdates[goal.progressUpdates.length - 1];
      const daysSinceUpdate = Math.ceil((now - lastUpdate.date) / (1000 * 60 * 60 * 24));

      if (daysSinceUpdate > 30) {
        alerts.push({
          goalIndex: index,
          type: 'no_progress',
          severity: 'warning',
          message: `No progress update for goal "${goal.title}" in ${daysSinceUpdate} days`,
          date: now,
        });
      }
    }

    // Check if progress is too slow
    const elapsed = now - goal.timeBound.startDate;
    const total = goal.timeBound.targetDate - goal.timeBound.startDate;
    const expectedProgress = (elapsed / total) * 100;

    if (goal.achievementPercentage < expectedProgress - 20) {
      alerts.push({
        goalIndex: index,
        type: 'progress_delay',
        severity: 'warning',
        message: `Goal "${goal.title}" is behind schedule. Expected ${Math.round(expectedProgress)}% but at ${goal.achievementPercentage}%`,
        date: now,
      });

      // Auto-update status to at_risk
      if (goal.status === 'on_track') {
        goal.status = 'at_risk';
      }
    }
  });

  return alerts;
};

/**
 * Add history entry
 */
smartIRPSchema.methods.addHistory = function (action, performedBy, details = {}) {
  this.history.push({
    action,
    performedBy,
    details,
    timestamp: new Date(),
  });
};

/**
 * Schedule next review
 */
smartIRPSchema.methods.scheduleNextReview = function () {
  if (!this.autoReview.enabled) return null;

  const now = new Date();
  let nextDate = new Date(now);

  switch (this.autoReview.frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
  }

  this.autoReview.nextReviewDate = nextDate;
  this.autoReview.lastReviewDate = now;

  return nextDate;
};

// Middleware to update timestamps
smartIRPSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const SmartIRP = mongoose.model('SmartIRP', smartIRPSchema);

module.exports = SmartIRP;

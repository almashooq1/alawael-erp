const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  // Core
  title: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  category: {
    type: String,
    enum: ['physical', 'cognitive', 'emotional', 'social', 'behavioral'],
    index: true
  },

  // Relationships
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DisabilityProgram',
    required: true,
    index: true
  },
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Goal Definition
  measurableOutcome: String,
  baselineValue: String,
  targetValue: String,
  unit: String,
  successCriteria: [String],

  // Status Tracking
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'achieved', 'failed', 'on-hold'],
    default: 'not-started',
    index: true
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },

  // Progress
  startDate: Date,
  targetDate: Date,
  completionDate: Date,
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  progressUpdates: [{
    date: Date,
    value: String,
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Resources and Interventions
  interventions: [String],
  resources: [String],
  expectedOutcome: String,
  actualOutcome: String,

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: -1
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for common queries
goalSchema.index({ programId: 1, participantId: 1 });
goalSchema.index({ status: 1, priority: 1 });
goalSchema.index({ participantId: 1, status: 1 });
goalSchema.index({ createdBy: 1, createdAt: -1 });

// Pre-save middleware
goalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Goal', goalSchema);

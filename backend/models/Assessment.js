const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  // Core
  title: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  type: {
    type: String,
    enum: ['baseline', 'progress', 'final', 'periodic'],
    required: true,
    index: true
  },

  // Relationships
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DisabilityProgram',
    required: true,
    index: true
  },
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DisabilitySession'
  },

  // Assessment Details
  assessmentDate: {
    type: Date,
    required: true,
    index: -1
  },
  duration: Number, // minutes
  location: String,

  // Assessment Results
  results: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  scoreBreakdown: [{
    category: String,
    score: Number,
    maxScore: Number,
    percentage: Number,
    notes: String
  }],

  // Observations
  observations: String,
  strengths: [String],
  areasForImprovement: [String],
  recommendations: [String],
  feedback: String,

  // Tool Used
  assessmentTool: String,
  toolVersion: String,
  instrumentUsed: [String],

  // Changes from Previous
  previousScore: Number,
  scoreChange: Number,
  improvement: Boolean,

  // Status & Follow-up
  status: {
    type: String,
    enum: ['pending', 'completed', 'reviewed', 'archived'],
    default: 'completed',
    index: true
  },
  reviewed: Boolean,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedDate: Date,
  reviewNotes: String,

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
assessmentSchema.index({ programId: 1, beneficiaryId: 1 });
assessmentSchema.index({ beneficiaryId: 1, assessmentDate: -1 });
assessmentSchema.index({ type: 1, status: 1 });
assessmentSchema.index({ therapistId: 1, assessmentDate: -1 });

// Pre-save middleware
assessmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Assessment', assessmentSchema);

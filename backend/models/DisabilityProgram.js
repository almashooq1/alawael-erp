const mongoose = require('mongoose');

const disabilityProgramSchema = new mongoose.Schema({
  // Core
  name: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  category: {
    type: String,
    enum: ['physical', 'cognitive', 'occupational', 'speech', 'behavioral'],
    required: true,
    index: true
  },

  // Program Details
  duration: Number, // days
  targetParticipants: Number,
  currentParticipants: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed', 'paused'],
    default: 'active',
    index: true
  },

  // Tracking
  startDate: Date,
  endDate: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  therapists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Statistics
  completionRate: Number,
  averageScore: Number,
  successfulOutcomes: {
    type: Number,
    default: 0
  },

  // Metadata
  tags: [String],
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
disabilityProgramSchema.index({ category: 1, status: 1 });
disabilityProgramSchema.index({ createdBy: 1, createdAt: -1 });
disabilityProgramSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware
disabilityProgramSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('DisabilityProgram', disabilityProgramSchema);

const mongoose = require('mongoose');

const disabilitySessionSchema = new mongoose.Schema({
  // Core
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
  sessionNumber: Number,

  // Session Details
  date: {
    type: Date,
    required: true,
    index: -1
  },
  duration: Number, // minutes
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  location: String,

  // Session Content
  objectives: [String],
  activities: [String],
  notes: String,
  materials: [String],

  // Progress Tracking
  statusBefore: String,
  statusAfter: String,
  progressScore: {
    type: Number,
    min: 0,
    max: 100
  },
  attendance: {
    type: String,
    enum: ['present', 'absent', 'excused', 'late'],
    default: 'present'
  },
  abilityImprovements: [String],
  challenges: [String],
  recommendations: [String],

  // Status
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'postponed'],
    default: 'scheduled',
    index: true
  },

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
disabilitySessionSchema.index({ programId: 1, participantId: 1 });
disabilitySessionSchema.index({ therapist: 1, date: -1 });
disabilitySessionSchema.index({ status: 1, date: -1 });
disabilitySessionSchema.index({ participantId: 1, date: -1 });

// Pre-save middleware
disabilitySessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('DisabilitySession', disabilitySessionSchema);

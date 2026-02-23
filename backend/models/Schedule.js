const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    default: null
  },
  resourceId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['event', 'meeting', 'training', 'maintenance', 'appointment'],
    default: 'event'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  attendees: [{
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
    status: {
      type: String,
      enum: ['accepted', 'declined', 'pending'],
      default: 'pending'
    }
  }],
  reminders: [{
    type: Date
  }],
  location: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  confirmedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'schedules'
});

// Index for frequently queried fields
scheduleSchema.index({ resourceId: 1, startDate: 1 });
scheduleSchema.index({ status: 1, startDate: 1 });
scheduleSchema.index({ createdBy: 1, createdAt: -1 });

// Middleware to update updatedAt
scheduleSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Schedule', scheduleSchema);

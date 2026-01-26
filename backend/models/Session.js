const mongoose = require('mongoose');

/**
 * User Session Schema for active session tracking
 * Enables session management, concurrent login limits, and forced logout
 */
const SessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    refreshToken: {
      type: String,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: String,
    device: {
      type: String,
      browser: String,
      os: String,
    },
    location: {
      country: String,
      city: String,
      latitude: Number,
      longitude: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // index removed - using TTL index below instead
    },
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
SessionSchema.index({ userId: 1, isActive: 1, expiresAt: 1 });

// Auto-expire sessions using TTL index
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if session is valid
SessionSchema.methods.isValid = function () {
  return this.isActive && new Date() < this.expiresAt;
};

// Method to extend session
SessionSchema.methods.extend = function (hours = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  this.lastActivity = new Date();
  return this.save();
};

// Method to terminate session
SessionSchema.methods.terminate = function () {
  this.isActive = false;
  return this.save();
};

// Static method to cleanup expired sessions
SessionSchema.statics.cleanupExpired = async function () {
  return this.deleteMany({
    $or: [{ expiresAt: { $lt: new Date() } }, { isActive: false }],
  });
};

// Static method to get active sessions for user
SessionSchema.statics.getActiveSessions = async function (userId) {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivity: -1 });
};

// Static method to terminate all user sessions
SessionSchema.statics.terminateAllForUser = async function (userId) {
  return this.updateMany({ userId, isActive: true }, { isActive: false });
};

module.exports = mongoose.models.Session || mongoose.model('Session', SessionSchema);

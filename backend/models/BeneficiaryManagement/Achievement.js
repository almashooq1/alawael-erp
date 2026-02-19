/**
 * Achievement.js - Achievement & Recognition Model
 * Tracks certifications, awards, and achievements
 *
 * @module models/BeneficiaryManagement/Achievement
 */

const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: [true, 'Beneficiary ID is required'],
    index: true
  },

  // Achievement Details
  title: {
    type: String,
    required: [true, 'Achievement title is required'],
    trim: true
  },

  description: {
    type: String,
    required: [true, 'Achievement description is required'],
    maxlength: 1000
  },

  type: {
    type: String,
    enum: ['academic', 'certification', 'award', 'special'],
    required: [true, 'Achievement type is required'],
    index: true
  },

  // Points & Gamification
  pointsAwarded: {
    type: Number,
    required: [true, 'Points must be awarded'],
    min: 0,
    enum: [50, 75, 100, 150] // Based on type: academic=50, award=75, cert=100, special=150
  },

  // Dates
  achievedDate: {
    type: Date,
    required: [true, 'Achievement date is required']
  },

  recordedDate: {
    type: Date,
    default: Date.now
  },

  expiresDate: Date,

  // Issuer Information
  issuerName: {
    type: String,
    required: [true, 'Issuer name is required']
  },

  issuerType: {
    type: String,
    enum: ['internal', 'external', 'governmental'],
    default: 'internal'
  },

  // Certificate Information
  certificateNumber: String,
  certificateURL: String,
  certificateVerificationCode: String,

  // Evidence & Documentation
  evidenceURL: String,
  evidenceType: String,

  // Verification
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },

  verifiedBy: String,
  verificationDate: Date,

  // Category Tags
  tags: [String],

  // Recognition Level
  recognitionLevel: {
    type: String,
    enum: ['local', 'regional', 'national', 'international'],
    default: 'local'
  },

  // Audit Trail
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
  collection: 'achievements'
});

// Indexes
achievementSchema.index({ beneficiaryId: 1 });
achievementSchema.index({ type: 1 });
achievementSchema.index({ achievedDate: -1 });
achievementSchema.index({ verificationStatus: 1 });
achievementSchema.index({ pointsAwarded: 1 });
achievementSchema.index({ tags: 1 });

// Pre-save middleware
achievementSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Auto-assign points based on type if not specified
  if (!this.pointsAwarded) {
    const pointMap = {
      'academic': 50,
      'award': 75,
      'certification': 100,
      'special': 150
    };
    this.pointsAwarded = pointMap[this.type] || 50;
  }

  next();
});

// Methods
achievementSchema.methods.verify = function(verifiedBy) {
  this.verificationStatus = 'verified';
  this.verifiedBy = verifiedBy;
  this.verificationDate = new Date();

  this.auditLog.push({
    action: 'VERIFIED',
    timestamp: new Date(),
    performedBy: verifiedBy,
    details: 'Achievement verified'
  });

  return this.save();
};

achievementSchema.methods.reject = function(rejectedBy, reason) {
  this.verificationStatus = 'rejected';

  this.auditLog.push({
    action: 'REJECTED',
    timestamp: new Date(),
    performedBy: rejectedBy,
    details: reason
  });

  return this.save();
};

// Statics
achievementSchema.statics.findByBeneficiary = function(beneficiaryId) {
  return this.find({ beneficiaryId }).sort({ achievedDate: -1 });
};

achievementSchema.statics.findVerified = function(beneficiaryId) {
  return this.find({
    beneficiaryId,
    verificationStatus: 'verified'
  }).sort({ achievedDate: -1 });
};

achievementSchema.statics.findByType = function(beneficiaryId, type) {
  return this.find({ beneficiaryId, type }).sort({ achievedDate: -1 });
};

achievementSchema.statics.calculateTotalPoints = function(beneficiaryId) {
  return this.aggregate([
    { $match: { beneficiaryId: mongoose.Types.ObjectId(beneficiaryId) } },
    { $group: { _id: null, totalPoints: { $sum: '$pointsAwarded' } } }
  ]);
};

const Achievement = mongoose.model('Achievement', achievementSchema);

module.exports = Achievement;

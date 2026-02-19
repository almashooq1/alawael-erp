/**
 * CounselingSession.js - Counseling Session Model
 * Tracks counseling sessions and interactions
 *
 * @module models/BeneficiaryManagement/CounselingSession
 */

const mongoose = require('mongoose');

const counselingSessionSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: [true, 'Beneficiary ID is required'],
    index: true
  },

  // Session Information
  sessionStatus: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled',
    index: true
  },

  sessionType: {
    type: String,
    enum: ['individual', 'group', 'family', 'emergency'],
    required: [true, 'Session type is required']
  },

  // Counselor Information
  counselorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Counselor'
  },
  counselorName: {
    type: String,
    required: [true, 'Counselor name is required']
  },
  counselorSpecialization: String,

  // Schedule Details
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required'],
    index: true
  },

  scheduledTime: String, // HH:mm format
  estimatedDuration: {
    type: Number,
    default: 60 // minutes
  },

  actualStartTime: Date,
  actualEndTime: Date,
  actualDuration: Number,

  // Location/Format
  sessionFormat: {
    type: String,
    enum: ['in_person', 'virtual', 'phone'],
    default: 'in_person'
  },

  location: String, // room/office number or video link
  virtualMeetingLink: String,

  // Session Topic
  topic: {
    type: String,
    required: [true, 'Session topic is required']
  },

  concerns: [String],

  // Session Content
  sessionNotes: {
    type: String,
    maxlength: 2000
  },

  // Outcomes & Progress
  outcomes: [{
    outcomeDescription: String,
    status: {
      type: String,
      enum: ['identified', 'in_progress', 'addressed', 'ongoing'],
      default: 'identified'
    }
  }],

  // Recommendations
  recommendations: [{
    recommendation: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    followUpAction: String,
    targetCompletionDate: Date
  }],

  // Resources Provided
  resourcesProvided: [{
    resourceName: String,
    resourceType: String,
    resourceURL: String,
    descriptionProvided: String
  }],

  // Referrals
  referrals: [{
    referralTo: String, // 'medical', 'psychiatric', 'financial_aid', 'academic', 'other'
    referralContactInfo: String,
    referralReason: String,
    referralDate: Date,
    referralAccepted: Boolean,
    referralStatus: String
  }],

  // Follow-up
  nextSessionScheduled: Boolean,
  nextSessionDate: Date,
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpReason: String,

  // Confidentiality & Consent
  consentProvided: {
    type: Boolean,
    default: true
  },
  confidentialityAcknowledged: {
    type: Boolean,
    default: true
  },

  // Risk Assessment (if applicable)
  riskAssessmentConducted: Boolean,
  riskLevel: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical'],
    default: 'low'
  },
  safetyPlan: String,
  emergencyProtocolActivated: Boolean,

  // Attendance
  beneficiaryAttendance: {
    type: String,
    enum: ['present', 'late', 'absent', 'no_show'],
    default: 'present'
  },

  // Cancellation Details (if applicable)
  cancellationReason: String,
  cancellationDate: Date,
  cancelledBy: String, // 'beneficiary' or 'counselor'

  // Session Quality Rating
  beneficiaryRating: {
    type: Number,
    min: 1,
    max: 5
  },
  beneficiaryFeedback: String,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'counselingSessions'
});

// Indexes
counselingSessionSchema.index({ beneficiaryId: 1 });
counselingSessionSchema.index({ counselorId: 1 });
counselingSessionSchema.index({ sessionStatus: 1 });
counselingSessionSchema.index({ scheduledDate: 1 });
counselingSessionSchema.index({ riskLevel: 1 });
counselingSessionSchema.index({ createdAt: -1 });

// Pre-save middleware
counselingSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Calculate actual duration if both times are present
  if (this.actualStartTime && this.actualEndTime) {
    this.actualDuration = (this.actualEndTime - this.actualStartTime) / (1000 * 60); // in minutes
  }

  next();
});

// Methods
counselingSessionSchema.methods.completeSession = function(sessionData) {
  this.sessionStatus = 'completed';
  this.actualStartTime = sessionData.startTime || new Date();
  this.actualEndTime = sessionData.endTime || new Date();
  this.sessionNotes = sessionData.notes;

  if (sessionData.outcomes) {
    this.outcomes = sessionData.outcomes;
  }

  return this.save();
};

counselingSessionSchema.methods.cancelSession = function(reason, cancelledBy = 'system') {
  this.sessionStatus = 'cancelled';
  this.cancellationReason = reason;
  this.cancellationDate = new Date();
  this.cancelledBy = cancelledBy;

  return this.save();
};

counselingSessionSchema.methods.scheduleFollowUp = function(followUpDate) {
  this.nextSessionScheduled = true;
  this.nextSessionDate = followUpDate;
  this.followUpRequired = true;

  return this.save();
};

counselingSessionSchema.methods.addReferral = function(referralData) {
  this.referrals.push({
    ...referralData,
    referralDate: new Date(),
    referralStatus: 'pending'
  });

  return this.save();
};

counselingSessionSchema.methods.recordRating = function(rating, feedback = '') {
  this.beneficiaryRating = rating;
  this.beneficiaryFeedback = feedback;

  return this.save();
};

// Statics
counselingSessionSchema.statics.findByCounselor = function(counselorId) {
  return this.find({ counselorId }).sort({ scheduledDate: -1 });
};

counselingSessionSchema.statics.findUpcomingSessions = function(counselorId) {
  return this.find({
    counselorId,
    sessionStatus: 'scheduled',
    scheduledDate: { $gte: new Date() }
  }).sort({ scheduledDate: 1 });
};

counselingSessionSchema.statics.findCompletedSessions = function(beneficiaryId) {
  return this.find({
    beneficiaryId,
    sessionStatus: 'completed'
  }).sort({ scheduledDate: -1 });
};

counselingSessionSchema.statics.findHighRiskSessions = function() {
  return this.find({ riskLevel: { $in: ['high', 'critical'] } });
};

const CounselingSession = mongoose.model('CounselingSession', counselingSessionSchema);

module.exports = CounselingSession;

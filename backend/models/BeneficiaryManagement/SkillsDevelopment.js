/**
 * SkillsDevelopment.js - Skills Tracking Model
 * Tracks skill development and proficiency levels
 * 
 * @module models/BeneficiaryManagement/SkillsDevelopment
 */

const mongoose = require('mongoose');

const skillsDevelopmentSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: [true, 'Beneficiary ID is required'],
    index: true
  },

  // Skill Information
  skillName: {
    type: String,
    required: [true, 'Skill name is required'],
    trim: true
  },

  skillCategory: {
    type: String,
    enum: ['technical', 'soft', 'academic', 'behavioral', 'professional'],
    required: [true, 'Skill category is required'],
    index: true
  },

  // Proficiency Level
  currentLevel: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    required: [true, 'Level must be 1-5'],
    default: 1
  },

  levelLabels: {
    1: 'Novice',
    2: 'Beginner',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Expert'
  },

  // Level Progression History
  levelHistory: [{
    level: Number,
    achievedDate: { type: Date, default: Date.now },
    assessment: String,
    assessor: String
  }],

  // Skill Details
  description: {
    type: String,
    maxlength: 500
  },

  evidence: [{
    evidenceType: String, // 'project', 'certification', 'practical_test', 'assessment'
    description: String,
    documentURL: String,
    submittedDate: Date,
    verified: Boolean,
    verifierName: String
  }],

  // Development Goals
  developmentGoals: [{
    goal: String,
    targetLevel: Number,
    targetDate: Date,
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    startDate: Date,
    completionDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'abandoned'],
      default: 'pending'
    }
  }],

  // Endorsements
  endorsements: [{
    endorsedBy: String,
    endorserRole: String,
    endorsementDate: { type: Date, default: Date.now },
    comment: String
  }],

  endorsementCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Assessments & Evaluations
  assessments: [{
    assessmentDate: { type: Date, default: Date.now },
    assessor: String,
    assessmentType: String,
    score: Number,
    feedback: String,
    recommendedLevel: Number
  }],

  // Learning Resources
  associatedResources: [{
    resourceName: String,
    resourceType: String, // 'course', 'book', 'tutorial', 'workshop'
    resourceURL: String,
    completionStatus: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started'
    }
  }],

  // Activity Tracking
  lastAssessmentDate: Date,
  nextReviewDate: Date,

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
  collection: 'skillsDevelopment'
});

// Indexes
skillsDevelopmentSchema.index({ beneficiaryId: 1, skillCategory: 1 });
skillsDevelopmentSchema.index({ skillName: 1 });
skillsDevelopmentSchema.index({ currentLevel: -1 });
skillsDevelopmentSchema.index({ endorsementCount: -1 });
skillsDevelopmentSchema.index({ skillCategory: 1 });

// Pre-save middleware
skillsDevelopmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update endorsement count
  if (this.endorsements) {
    this.endorsementCount = this.endorsements.length;
  }

  next();
});

// Methods
skillsDevelopmentSchema.methods.updateLevel = function(newLevel, assessor, assessment = '') {
  if (newLevel < 1 || newLevel > 5) {
    throw new Error('Level must be between 1 and 5');
  }

  const oldLevel = this.currentLevel;
  this.currentLevel = newLevel;

  this.levelHistory.push({
    level: newLevel,
    achievedDate: new Date(),
    assessment,
    assessor
  });

  // Update next review date
  this.lastAssessmentDate = new Date();
  this.nextReviewDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

  return this.save();
};

skillsDevelopmentSchema.methods.addEndorsement = function(endorsedBy, endorserRole, comment = '') {
  this.endorsements.push({
    endorsedBy,
    endorserRole,
    comment,
    endorsementDate: new Date()
  });

  this.endorsementCount = this.endorsements.length;
  return this.save();
};

skillsDevelopmentSchema.methods.addEvidence = function(evidenceData) {
  this.evidence.push({
    ...evidenceData,
    submittedDate: new Date()
  });

  return this.save();
};

skillsDevelopmentSchema.methods.addAssessment = function(assessmentData) {
  this.assessments.push({
    ...assessmentData,
    assessmentDate: new Date()
  });

  this.lastAssessmentDate = new Date();
  this.nextReviewDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return this.save();
};

// Statics
skillsDevelopmentSchema.statics.findByBeneficiary = function(beneficiaryId) {
  return this.find({ beneficiaryId }).sort({ currentLevel: -1 });
};

skillsDevelopmentSchema.statics.findByCategory = function(beneficiaryId, category) {
  return this.find({ beneficiaryId, skillCategory: category }).sort({ currentLevel: -1 });
};

skillsDevelopmentSchema.statics.findTopEndorsed = function(beneficiaryId, limit = 5) {
  return this.find({ beneficiaryId }).sort({ endorsementCount: -1 }).limit(limit);
};

const SkillsDevelopment = mongoose.model('SkillsDevelopment', skillsDevelopmentSchema);

module.exports = SkillsDevelopment;

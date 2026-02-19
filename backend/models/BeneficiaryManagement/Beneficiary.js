/**
 * Beneficiary.js - Core Beneficiary Model
 * Represents a beneficiary in the system with personal, academic, and engagement data
 * 
 * @module models/BeneficiaryManagement/Beneficiary
 */

const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  emailAddress: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  nationalIdNumber: {
    type: String,
    required: [true, 'National ID is required'],
    unique: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+?[0-9]{10,15}$/, 'Please provide a valid phone number']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },

  // Academic Information
  program: {
    type: String,
    required: [true, 'Program is required'],
    enum: [
      'Primary Education',
      'Secondary Education',
      'Tertiary Education',
      'Technical Training',
      'Professional Development'
    ]
  },
  enrollmentDate: {
    type: Date,
    required: [true, 'Enrollment date is required'],
    default: Date.now
  },
  academicStatus: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'suspended', 'withdrawn'],
    default: 'active'
  },
  currentLevel: {
    type: String,
    required: true
  },
  expectedGraduationDate: {
    type: Date
  },

  // Academic Performance
  currentGPA: {
    type: Number,
    min: 0,
    max: 4.0,
    default: 0
  },
  gpaHistory: [{
    semester: String,
    gpa: Number,
    recordedDate: { type: Date, default: Date.now }
  }],

  // Engagement & Gamification
  totalPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  gamificationLevel: {
    type: String,
    enum: ['Beginner', 'Participant', 'Contributor', 'Leader', 'Achiever', 'Champion'],
    default: 'Beginner'
  },

  // Account Management
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'verified'],
    default: 'active'
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  lastLoginDate: Date,

  // Beneficiary Classification
  beneficiaryType: {
    type: String,
    enum: ['scholarship_recipient', 'financial_aid', 'program_participant', 'general'],
    default: 'program_participant'
  },

  // Support & Services
  hasActiveSupportPlan: {
    type: Boolean,
    default: false
  },
  activeSupportPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportPlan'
  },

  // Guardian/Parent Information
  guardian: {
    name: String,
    relationship: String,
    contact: String,
    email: String
  },

  // Timestamps & Audit
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  updatedBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true,
  collection: 'beneficiaries'
});

// Indexes for performance
beneficiarySchema.index({ emailAddress: 1 });
beneficiarySchema.index({ nationalIdNumber: 1 });
beneficiarySchema.index({ program: 1 });
beneficiarySchema.index({ academicStatus: 1 });
beneficiarySchema.index({ enrollmentDate: 1 });
beneficiarySchema.index({ currentGPA: 1 });
beneficiarySchema.index({ totalPoints: -1 });
beneficiarySchema.index({ createdAt: -1 });

// Virtual for full name
beneficiarySchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to update timestamp
beneficiarySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods
beneficiarySchema.methods.updateGPA = function(newGPA) {
  if (newGPA < 0 || newGPA > 4.0) {
    throw new Error('GPA must be between 0 and 4.0');
  }
  this.gpaHistory.push({
    semester: `${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
    gpa: newGPA
  });
  this.currentGPA = newGPA;
  return this.save();
};

beneficiarySchema.methods.addPoints = function(points, reason = '') {
  this.totalPoints += points;
  return this.save();
};

beneficiarySchema.methods.updateGamificationLevel = function() {
  const points = this.totalPoints;
  if (points < 100) this.gamificationLevel = 'Beginner';
  else if (points < 300) this.gamificationLevel = 'Participant';
  else if (points < 600) this.gamificationLevel = 'Contributor';
  else if (points < 1000) this.gamificationLevel = 'Leader';
  else if (points < 1500) this.gamificationLevel = 'Achiever';
  else this.gamificationLevel = 'Champion';
  
  return this.save();
};

// Statics
beneficiarySchema.statics.findByEmail = function(email) {
  return this.findOne({ emailAddress: email });
};

beneficiarySchema.statics.findByIdNumber = function(idNumber) {
  return this.findOne({ nationalIdNumber: idNumber });
};

beneficiarySchema.statics.findActiveStudents = function() {
  return this.find({ academicStatus: 'active' });
};

beneficiarySchema.statics.findByProgram = function(program) {
  return this.find({ program });
};

const Beneficiary = mongoose.model('Beneficiary', beneficiarySchema);

module.exports = Beneficiary;

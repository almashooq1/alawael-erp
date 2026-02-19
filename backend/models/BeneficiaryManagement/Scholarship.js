/**
 * Scholarship.js - Scholarship Application & Management Model
 * Manages scholarship applications, approvals, and disbursements
 *
 * @module models/BeneficiaryManagement/Scholarship
 */

const mongoose = require('mongoose');

const scholarshipSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: [true, 'Beneficiary ID is required'],
    index: true
  },

  // Application Details
  applicationStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'EXTENDED'],
    default: 'PENDING',
    index: true
  },

  programName: {
    type: String,
    required: [true, 'Program name is required']
  },

  scholarshipType: {
    type: String,
    enum: ['full_tuition', 'partial_tuition', 'living_stipend', 'book_allowance', 'mixed'],
    required: [true, 'Scholarship type is required']
  },

  requestedAmount: {
    type: Number,
    required: [true, 'Requested amount is required'],
    min: 0
  },

  approvedAmount: {
    type: Number,
    min: 0
  },

  // Academic Year
  academicYear: {
    type: String,
    required: [true, 'Academic year is required']
  },

  semester: {
    type: String,
    enum: ['fall', 'spring', 'summer'],
    required: true
  },

  // Application Dates
  applicationDate: {
    type: Date,
    default: Date.now,
    required: true
  },

  approvalDate: Date,
  effectiveDate: Date,
  completionDate: Date,

  // Approval Information
  approvedBy: {
    type: String,
    trim: true
  },

  approvalNotes: String,

  // Eligibility Data
  eligibleAtApplicationTime: {
    gpaQualified: Boolean,
    enrollmentQualified: Boolean,
    disciplinaryQualified: Boolean
  },

  // Performance Monitoring
  performanceMonitoring: [{
    checkDate: { type: Date, default: Date.now },
    currentGPA: Number,
    attendanceRate: Number,
    academicProgress: String,
    alert: Boolean,
    alertMessage: String
  }],

  // Disbursement Information
  disbursements: [{
    disbursementId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    disbursementDate: Date,
    method: {
      type: String,
      enum: ['bank_transfer', 'check', 'direct_payment'],
      default: 'bank_transfer'
    },
    referenceNumber: String,
    status: {
      type: String,
      enum: ['pending', 'processed', 'completed'],
      default: 'pending'
    },
    verificationCode: String
  }],

  totalDisbursed: {
    type: Number,
    default: 0,
    min: 0
  },

  // Documentation
  supportingDocuments: [{
    documentName: String,
    documentType: String,
    uploadDate: Date,
    fileURL: String,
    status: {
      type: String,
      enum: ['pending_review', 'approved', 'rejected'],
      default: 'pending_review'
    }
  }],

  // Conditions & Requirements
  conditions: [{
    condition: String,
    status: {
      type: String,
      enum: ['pending', 'satisfied', 'violated'],
      default: 'pending'
    },
    completionDate: Date
  }],

  // Contact Information for Coordination
  contactPersonName: String,
  contactPersonPhone: String,
  contactPersonEmail: String,

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
  collection: 'scholarships'
});

// Indexes
scholarshipSchema.index({ beneficiaryId: 1 });
scholarshipSchema.index({ applicationStatus: 1 });
scholarshipSchema.index({ academicYear: 1 });
scholarshipSchema.index({ applicationDate: -1 });
scholarshipSchema.index({ approvalDate: -1 });

// Pre-save middleware
scholarshipSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods
scholarshipSchema.methods.approve = function(approvedAmount, approvedBy, notes = '') {
  this.applicationStatus = 'APPROVED';
  this.approvedAmount = approvedAmount;
  this.approvedBy = approvedBy;
  this.approvalNotes = notes;
  this.approvalDate = new Date();

  this.auditLog.push({
    action: 'APPROVED',
    timestamp: new Date(),
    performedBy: approvedBy,
    details: `Approved for ${approvedAmount}`
  });

  return this.save();
};

scholarshipSchema.methods.reject = function(rejectedBy, reason) {
  this.applicationStatus = 'REJECTED';
  this.approvalNotes = reason;

  this.auditLog.push({
    action: 'REJECTED',
    timestamp: new Date(),
    performedBy: rejectedBy,
    details: reason
  });

  return this.save();
};

scholarshipSchema.methods.processDisbursement = function(amount, method, processedBy) {
  if (this.totalDisbursed + amount > this.approvedAmount) {
    throw new Error('Disbursement amount exceeds approved amount');
  }

  const disbursement = {
    disbursementId: new mongoose.Types.ObjectId(),
    amount,
    disbursementDate: new Date(),
    method,
    status: 'processed',
    referenceNumber: `DISB-${Date.now()}`
  };

  this.disbursements.push(disbursement);
  this.totalDisbursed += amount;

  if (this.totalDisbursed === this.approvedAmount) {
    this.applicationStatus = 'COMPLETED';
  }

  if (this.applicationStatus === 'APPROVED') {
    this.applicationStatus = 'ACTIVE';
    this.effectiveDate = new Date();
  }

  return this.save();
};

scholarshipSchema.methods.recordPerformanceCheck = function(checkData) {
  const check = {
    checkDate: new Date(),
    ...checkData
  };

  this.performanceMonitoring.push(check);
  return this.save();
};

// Statics
scholarshipSchema.statics.findByBeneficiary = function(beneficiaryId) {
  return this.find({ beneficiaryId }).sort({ applicationDate: -1 });
};

scholarshipSchema.statics.findPendingApprovals = function() {
  return this.find({ applicationStatus: 'PENDING' }).sort({ applicationDate: 1 });
};

scholarshipSchema.statics.findActiveScholarships = function() {
  return this.find({ applicationStatus: { $in: ['ACTIVE', 'APPROVED'] } });
};

const Scholarship = mongoose.model('Scholarship', scholarshipSchema);

module.exports = Scholarship;

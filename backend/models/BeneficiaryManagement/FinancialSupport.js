/**
 * FinancialSupport.js - Financial Support Model
 * Tracks financial aid requests and disbursements
 *
 * @module models/BeneficiaryManagement/FinancialSupport
 */

const mongoose = require('mongoose');

const financialSupportSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: [true, 'Beneficiary ID is required'],
    index: true
  },

  // Support Request Information
  supportType: {
    type: String,
    enum: ['emergency', 'food', 'transportation', 'housing', 'other'],
    required: [true, 'Support type is required'],
    index: true
  },

  requestStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'disbursed', 'completed'],
    default: 'pending',
    index: true
  },

  // Amount Information
  requestedAmount: {
    type: Number,
    required: [true, 'Requested amount is required'],
    min: 0
  },

  approvedAmount: {
    type: Number,
    min: 0
  },

  disbursedAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Justification
  justification: {
    type: String,
    required: [true, 'Justification is required'],
    maxlength: 1000
  },

  additionalNotes: {
    type: String,
    maxlength: 500
  },

  // Request Details
  requestDate: {
    type: Date,
    default: Date.now,
    required: true
  },

  urgencyLevel: {
    type: String,
    enum: ['routine', 'urgent', 'emergency'],
    default: 'routine'
  },

  requiredByDate: Date,

  // Eligibility
  eligibilityStatus: {
    type: String,
    enum: ['eligible', 'ineligible', 'conditionally_eligible', 'pending_review'],
    default: 'pending_review'
  },

  eligibilityNotes: String,

  // Approval Information
  approvalDate: Date,
  approvedBy: {
    type: String,
    trim: true
  },

  approvalNotes: String,

  // Rejection Information (if applicable)
  rejectionDate: Date,
  rejectedBy: String,
  rejectionReason: String,

  // Limitations
  maxRequestsPerMonth: {
    type: Number,
    default: 2
  },

  requestsThisMonth: {
    type: Number,
    default: 0
  },

  canRequestMore: {
    type: Boolean,
    default: true
  },

  // Disbursement Information
  disbursementMethod: {
    type: String,
    enum: ['bank_transfer', 'check', 'direct_payment', 'voucher'],
    default: 'bank_transfer'
  },

  disbursements: [{
    disbursementId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    disbursementDate: Date,
    method: String,
    referenceNumber: String,
    status: {
      type: String,
      enum: ['pending', 'processed', 'completed', 'failed'],
      default: 'pending'
    },
    verifiedBy: String,
    verificationDate: Date
  }],

  // Bank Details (for transfer)
  bankAccountName: String,
  bankAccountNumber: String,
  bankCode: String,
  bankBranchCode: String,

  // Documentation
  supportingDocuments: [{
    documentName: String,
    documentType: String,
    documentURL: String,
    uploadDate: Date,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  }],

  // Impact Assessment
  impactAssessment: {
    conductedDate: Date,
    impactLevel: {
      type: String,
      enum: ['high', 'moderate', 'low'],
      default: 'moderate'
    },
    beneficiaryFeedback: String,
    assessor: String
  },

  // Follow-up
  followUpRequired: {
    type: Boolean,
    default: false
  },

  followUpSchedule: {
    date: Date,
    reason: String,
    completedDate: Date,
    completedBy: String,
    outcome: String
  },

  // Related Information
  relatedSupportPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportPlan'
  },

  notes: {
    type: String,
    maxlength: 1000
  },

  // Timestamps
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
  collection: 'financialSupport'
});

// Indexes
financialSupportSchema.index({ beneficiaryId: 1 });
financialSupportSchema.index({ supportType: 1 });
financialSupportSchema.index({ requestStatus: 1 });
financialSupportSchema.index({ requestDate: -1 });
financialSupportSchema.index({ urgencyLevel: 1 });
financialSupportSchema.index({ eligibilityStatus: 1 });
financialSupportSchema.index({ approvalDate: -1 });

// Pre-save middleware
financialSupportSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Validate amount consistency
  if (this.disbursedAmount > this.approvedAmount) {
    throw new Error('Disbursed amount cannot exceed approved amount');
  }

  next();
});

// Methods
financialSupportSchema.methods.approve = function(approvedAmount, approvedBy, notes = '') {
  this.requestStatus = 'approved';
  this.approvedAmount = approvedAmount;
  this.approvedBy = approvedBy;
  this.approvalNotes = notes;
  this.approvalDate = new Date();
  this.eligibilityStatus = 'eligible';

  this.auditLog.push({
    action: 'APPROVED',
    timestamp: new Date(),
    performedBy: approvedBy,
    details: `Approved for ${approvedAmount}`
  });

  return this.save();
};

financialSupportSchema.methods.reject = function(rejectedBy, reason) {
  this.requestStatus = 'rejected';
  this.rejectedBy = rejectedBy;
  this.rejectionReason = reason;
  this.rejectionDate = new Date();

  this.auditLog.push({
    action: 'REJECTED',
    timestamp: new Date(),
    performedBy: rejectedBy,
    details: reason
  });

  return this.save();
};

financialSupportSchema.methods.processDisbursement = function(disbursementData) {
  if (this.requestStatus !== 'approved') {
    throw new Error('Request must be approved before disbursement');
  }

  if (this.disbursedAmount + disbursementData.amount > this.approvedAmount) {
    throw new Error('Disbursement amount exceeds approved amount');
  }

  const disbursement = {
    disbursementId: new mongoose.Types.ObjectId(),
    amount: disbursementData.amount,
    disbursementDate: new Date(),
    method: disbursementData.method,
    referenceNumber: `DISB-${Date.now()}`,
    status: 'processed'
  };

  this.disbursements.push(disbursement);
  this.disbursedAmount += disbursementData.amount;

  if (this.disbursedAmount === this.approvedAmount) {
    this.requestStatus = 'disbursed';
  }

  this.auditLog.push({
    action: 'DISBURSED',
    timestamp: new Date(),
    performedBy: disbursementData.processedBy || 'system',
    details: `Disbursed ${disbursementData.amount}`
  });

  return this.save();
};

financialSupportSchema.methods.verifyDisbursement = function(disbursementId, verifiedBy) {
  const disbursement = this.disbursements.find(d => d.disbursementId.toString() === disbursementId.toString());

  if (!disbursement) {
    throw new Error('Disbursement not found');
  }

  disbursement.status = 'completed';
  disbursement.verifiedBy = verifiedBy;
  disbursement.verificationDate = new Date();

  return this.save();
};

financialSupportSchema.methods.scheduleFollowUp = function(followUpDate, reason) {
  this.followUpRequired = true;
  this.followUpSchedule = {
    date: followUpDate,
    reason
  };

  return this.save();
};

// Statics
financialSupportSchema.statics.findByBeneficiary = function(beneficiaryId) {
  return this.find({ beneficiaryId }).sort({ requestDate: -1 });
};

financialSupportSchema.statics.findPendingRequests = function() {
  return this.find({ requestStatus: 'pending' }).sort({ requestDate: 1 });
};

financialSupportSchema.statics.findByType = function(supportType) {
  return this.find({ supportType }).sort({ requestDate: -1 });
};

financialSupportSchema.statics.findApprovedNotDisbursed = function() {
  return this.find({
    requestStatus: 'approved',
    $expr: { $gt: ['$approvedAmount', '$disbursedAmount'] }
  });
};

financialSupportSchema.statics.getMonthlyStats = function() {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return this.aggregate([
    {
      $match: {
        requestDate: { $gte: startOfMonth }
      }
    },
    {
      $group: {
        _id: '$supportType',
        totalRequested: { $sum: '$requestedAmount' },
        totalApproved: { $sum: '$approvedAmount' },
        totalDisbursed: { $sum: '$disbursedAmount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

const FinancialSupport = mongoose.model('FinancialSupport', financialSupportSchema);

module.exports = FinancialSupport;

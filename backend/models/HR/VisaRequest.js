'use strict';

const mongoose = require('mongoose');

const VisaRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    candidateName: { type: String, maxlength: 200 },
    nationality: { type: String, maxlength: 100 },
    jobTitle: { type: String, maxlength: 200 },
    visaType: {
      type: String,
      enum: [
        'work_visa',
        'family_visit',
        'business_visit',
        'transfer_in',
        'transfer_out',
        'exit_reentry',
        'final_exit',
        'profession_change',
      ],
      required: true,
      index: true,
    },
    visaNumber: { type: String, maxlength: 100 },
    iqamaNumber: { type: String, maxlength: 100 },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted_to_qiwa',
        'approved',
        'rejected',
        'issued',
        'cancelled',
        'completed',
      ],
      default: 'draft',
      index: true,
    },
    submittedDate: { type: Date, default: null },
    expectedIssueDate: { type: Date, default: null },
    issuedDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    fees: { type: Number, default: 0 },
    notes: { type: String, maxlength: 2000 },
    submittedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'hr_visa_requests' }
);

// W1133 — denormalize branchId from the employee (nullable for candidate visas).
VisaRequestSchema.plugin(require('./plugins/hrBranchScope.plugin'));

module.exports =
  mongoose.models.HrVisaRequest || mongoose.model('HrVisaRequest', VisaRequestSchema);

'use strict';

const mongoose = require('mongoose');

const checklistResponseSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    compliant: { type: Boolean, required: true },
    notes: { type: String, default: null },
    photoPath: { type: String, default: null },
    correctiveAction: { type: String, default: null },
  },
  { _id: false }
);

const checklistSubmissionSchema = new mongoose.Schema(
  {
    checklistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Checklist', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    submissionDate: { type: Date, required: true },
    responses: { type: [checklistResponseSchema], default: [] },
    totalItems: { type: Number, default: 0 },
    compliantItems: { type: Number, default: 0 },
    nonCompliantItems: { type: Number, default: 0 },
    complianceRate: { type: Number, default: 0 }, // نسبة مئوية 0-100
    overallNotes: { type: String, default: null },
    status: {
      type: String,
      enum: ['submitted', 'reviewed', 'action_required', 'closed'],
      default: 'submitted',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

checklistSubmissionSchema.index({ branchId: 1, submissionDate: -1 });
checklistSubmissionSchema.index({ checklistId: 1, branchId: 1 });

const ChecklistSubmission =
  mongoose.models.ChecklistSubmission ||
  mongoose.model('ChecklistSubmission', checklistSubmissionSchema);

module.exports = ChecklistSubmission;

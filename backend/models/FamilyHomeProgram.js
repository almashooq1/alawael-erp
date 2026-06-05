'use strict';

const mongoose = require('mongoose');

const taskLogSchema = new mongoose.Schema(
  {
    completedAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true, maxlength: 500 },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true }
);

const programTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    instructions: { type: String, trim: true, maxlength: 2000 },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'custom'],
      default: 'weekly',
    },
    targetPerWeek: { type: Number, min: 1, max: 21, default: 3 },
    isActive: { type: Boolean, default: true },
    logs: [taskLogSchema],
  },
  { _id: true }
);

const familyHomeProgramSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    tasks: [programTaskSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'family_home_programs',
  }
);

familyHomeProgramSchema.index({ beneficiaryId: 1, status: 1 });
familyHomeProgramSchema.index({ branchId: 1, createdAt: -1 });

familyHomeProgramSchema.pre('validate', function validateInvariants(next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'endDate must be greater than or equal to startDate');
    return next();
  }
  return next();
});

module.exports =
  mongoose.models.FamilyHomeProgram || mongoose.model('FamilyHomeProgram', familyHomeProgramSchema);

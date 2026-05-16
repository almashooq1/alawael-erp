'use strict';

/**
 * WorkforcePosition.js — a planned/budgeted seat (not a person).
 * Decouples headcount budgeting from actual hires. The position can be
 * filled by a current employee (filledByEmployeeId set) or vacant.
 */
const mongoose = require('mongoose');

const WorkforcePositionSchema = new mongoose.Schema(
  {
    positionCode: { type: String, required: true, unique: true, maxlength: 30 },
    title: { type: String, required: true, maxlength: 200 },
    titleAr: { type: String, maxlength: 200 },
    department: { type: String, required: true, maxlength: 100, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    bandCode: { type: String, maxlength: 20 }, // → CompensationBand
    reportsToPositionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkforcePosition',
      default: null,
    },
    budgetedSalary: { type: Number, default: 0 },
    fiscalYear: { type: Number, required: true, index: true },
    status: {
      type: String,
      enum: ['planned', 'approved', 'open', 'filled', 'frozen', 'eliminated'],
      default: 'planned',
      index: true,
    },
    filledByEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    filledAt: { type: Date, default: null },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true, collection: 'hr_workforce_positions' }
);

module.exports =
  mongoose.models.WorkforcePosition || mongoose.model('WorkforcePosition', WorkforcePositionSchema);

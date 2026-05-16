'use strict';

/**
 * EmployeeGoal.js — Phase 30 OKR/Performance Goals.
 *
 * Quarterly/yearly SMART goals assigned to employees. Tracked
 * separately from performance evaluations because:
 *   - goals are set BEFORE the evaluation period (forward-looking)
 *   - they get progress updates throughout the period
 *   - finalized goals feed into the evaluation (criterion scoring)
 *
 * Visibility rules (enforced at the route layer, not the model):
 *   - employee  → can read + update progress on their own goals
 *   - manager   → can read + create goals for their direct reports
 *   - hr_manager → read all
 */

const mongoose = require('mongoose');

const EmployeeGoalSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    assignedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedByName: { type: String, maxlength: 200 },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 2000 },
    category: {
      type: String,
      enum: ['individual', 'team', 'department', 'company', 'development'],
      default: 'individual',
      index: true,
    },
    period: {
      kind: {
        type: String,
        enum: ['quarterly', 'biannual', 'annual', 'custom'],
        default: 'quarterly',
      },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      label: { type: String, maxlength: 50 }, // e.g. "Q1 2026"
    },
    metric: {
      kind: {
        type: String,
        enum: ['percent', 'count', 'currency', 'boolean', 'text'],
        default: 'percent',
      },
      target: { type: Number, default: 100 },
      unit: { type: String, maxlength: 50 },
    },
    weight: { type: Number, min: 0, max: 100, default: 10 }, // % weight in performance review
    status: {
      type: String,
      enum: ['draft', 'active', 'at_risk', 'achieved', 'missed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    progress: {
      currentValue: { type: Number, default: 0 },
      percentComplete: { type: Number, min: 0, max: 100, default: 0 },
      lastUpdatedAt: { type: Date, default: null },
      checkIns: [
        {
          _id: false,
          at: { type: Date, default: Date.now },
          byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          byName: { type: String, maxlength: 200 },
          currentValue: { type: Number },
          percentComplete: { type: Number, min: 0, max: 100 },
          note: { type: String, maxlength: 1000 },
        },
      ],
    },
    parentGoalId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeGoal', default: null },
    tags: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'hr_employee_goals' }
);

EmployeeGoalSchema.index({ employeeId: 1, 'period.startDate': -1 });
EmployeeGoalSchema.index({ status: 1, 'period.endDate': 1 });

module.exports = mongoose.models.EmployeeGoal || mongoose.model('EmployeeGoal', EmployeeGoalSchema);

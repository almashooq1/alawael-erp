'use strict';

/**
 * EmployeeCompetency.js — one assessed competency level for an employee (W1201).
 *
 * Employee-keyed, so branchId is denormalised from the employee by the shared
 * hrBranchScope plugin (W1133) — cross-branch isolation for free. One row per
 * (employeeId, competencyKey); currentLevel 0-5 (0 = not yet demonstrated).
 * Validation is schema-level (min/max/required/unique) so the only pre('validate')
 * hook is the plugin's async branchId derive — no hook-style mixing.
 */

const mongoose = require('mongoose');

const EmployeeCompetencySchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    competencyKey: { type: String, required: true, trim: true, maxlength: 60 },
    competencyNameAr: { type: String, maxlength: 160 },
    currentLevel: { type: Number, required: true, min: 0, max: 5 },
    assessedAt: { type: Date, default: Date.now },
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true, collection: 'hr_employee_competencies' }
);

EmployeeCompetencySchema.index({ employeeId: 1, competencyKey: 1 }, { unique: true });
EmployeeCompetencySchema.index({ branchId: 1, competencyKey: 1 });

// W1133 — denormalise branchId from the employee (cross-branch isolation).
EmployeeCompetencySchema.plugin(require('./hrBranchScope.plugin'));

module.exports =
  mongoose.models.EmployeeCompetency ||
  mongoose.model('EmployeeCompetency', EmployeeCompetencySchema);

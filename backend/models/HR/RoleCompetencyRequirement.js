'use strict';

/**
 * RoleCompetencyRequirement.js — the competency baseline for a job title (W1201).
 *
 * Org-global REFERENCE data (a "Senior Therapist" needs the same competencies in
 * every branch), like CompensationBand — so NO branchId / no branch isolation.
 * One row per (jobTitle, competencyKey). Drives skills-gap analysis against each
 * employee's assessed EmployeeCompetency levels.
 */

const mongoose = require('mongoose');

const RoleCompetencyRequirementSchema = new mongoose.Schema(
  {
    jobTitle: { type: String, required: true, trim: true, maxlength: 120, index: true },
    competencyKey: { type: String, required: true, trim: true, maxlength: 60 },
    competencyNameAr: { type: String, required: true, maxlength: 160 },
    requiredLevel: { type: Number, required: true, min: 1, max: 5 },
    criticality: { type: String, enum: ['core', 'important', 'nice'], default: 'important' },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'hr_role_competency_requirements' }
);

// one requirement per (jobTitle, competencyKey)
RoleCompetencyRequirementSchema.index({ jobTitle: 1, competencyKey: 1 }, { unique: true });

module.exports =
  mongoose.models.RoleCompetencyRequirement ||
  mongoose.model('RoleCompetencyRequirement', RoleCompetencyRequirementSchema);

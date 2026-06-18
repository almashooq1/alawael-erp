'use strict';

/**
 * JobBandMapping.js — maps a job title to a compensation band (W1385).
 *
 * Org-global REFERENCE data (a "Senior Therapist" sits in the same pay band in
 * every branch), like CompensationBand + RoleCompetencyRequirement — so NO
 * branchId / no branch isolation. One row per jobTitle. Drives the compa-ratio
 * lens of pay-equity: an employee's role → this mapping → CompensationBand →
 * band midpoint → compa-ratio = salary / midpoint.
 *
 * `bandCode` is a soft reference to CompensationBand.bandCode (a string key, not
 * an ObjectId) — bands are themselves keyed by a human code like "L4". An unknown
 * or inactive bandCode simply yields no compa-ratio (graceful, never misleading).
 */

const mongoose = require('mongoose');

const JobBandMappingSchema = new mongoose.Schema(
  {
    // matches Employee.job_title_en / job_title_ar (HR keys mappings on the title
    // exactly as RoleCompetencyRequirement does).
    // unique index declared below (one band per title) — that covers indexing too,
    // so NO `index: true` here (it would collide with the unique jobTitle_1 index).
    jobTitle: { type: String, required: true, trim: true, maxlength: 120 },
    bandCode: { type: String, required: true, trim: true, maxlength: 20 }, // → CompensationBand.bandCode
    active: { type: Boolean, default: true },
    note: { type: String, maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'hr_job_band_mappings' }
);

// one band per job title
JobBandMappingSchema.index({ jobTitle: 1 }, { unique: true });

module.exports =
  mongoose.models.JobBandMapping || mongoose.model('JobBandMapping', JobBandMappingSchema);

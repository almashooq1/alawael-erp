'use strict';

/**
 * VitalSign — clinical measurements feed for the rehab/day-care beneficiary.
 *
 * Initial scope is the pediatric weight-loss red-flag adapter
 * (`clinical.pediatric.weight.drop_5pct` — see services/redFlagObservations/
 * vitalsObservations.js). The schema is intentionally loose around
 * `measurementType` so future adapters (height growth, blood-pressure spike,
 * temperature, heart rate, …) can land without a migration.
 *
 * Validation philosophy: one row per measurement, no aggregation. Operators
 * record vitals at the moment of capture; the analytics services derive
 * windows / deltas from raw rows. Indexes are picked to make the common
 * `findOne({ beneficiaryId, measurementType, recordedAt })` shape served by
 * `vitalsObservations.js` an index hit.
 */

const mongoose = require('mongoose');

const VitalSignSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    measurementType: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      trim: true,
    },
    recordedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

VitalSignSchema.index({ beneficiaryId: 1, measurementType: 1, recordedAt: -1 });

const VitalSign = mongoose.models.VitalSign || mongoose.model('VitalSign', VitalSignSchema);

module.exports = { VitalSign, VitalSignSchema };
module.exports.default = VitalSign;

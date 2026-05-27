'use strict';

/**
 * SafetyProtocol — therapist-portal safety procedure with attached
 * incident log. Used by `routes/therapistUltra.routes.js` `/safety`.
 * Distinct from `models/quality/Incident.model.js` (formal CBAHI
 * incident reports) — this is the lighter therapist-side log that
 * may roll up to the formal incident system if escalated.
 */

const mongoose = require('mongoose');

if (mongoose.models.SafetyProtocol) {
  module.exports = mongoose.models.SafetyProtocol;
} else {
  const incidentSchema = new mongoose.Schema(
    {
      reportedAt: { type: Date, default: Date.now },
      reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
      description: { type: String, required: true },
      affectedBeneficiary: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Beneficiary',
        default: null,
      },
      resolved: { type: Boolean, default: false },
      resolvedAt: { type: Date, default: null },
      resolution: { type: String, default: null },
    },
    { _id: true }
  );

  const schema = new mongoose.Schema(
    {
      protocolNumber: { type: String, unique: true, sparse: true },
      title: { type: String, required: true, trim: true },
      category: {
        type: String,
        enum: [
          'fall_prevention',
          'infection_control',
          'fire',
          'medication',
          'patient_handling',
          'other',
        ],
        default: 'other',
      },
      content: { type: String, required: true },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
      effectiveFrom: { type: Date, default: Date.now },
      reviewDueDate: { type: Date, default: null },
      status: { type: String, enum: ['draft', 'active', 'archived'], default: 'active' },
      incidents: { type: [incidentSchema], default: [] },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'safetyprotocols' }
  );

  schema.index({ category: 1, status: 1 });

  module.exports =
    mongoose.models.SafetyProtocol || mongoose.model('SafetyProtocol', schema);
}

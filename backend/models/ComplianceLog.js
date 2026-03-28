/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const complianceLogSchema = new mongoose.Schema(
  {
    domain: { type: String, enum: ['HR', 'FLEET', 'CLINICAL', 'FACILITY'], required: true },

    issueType: { type: String, required: true }, // e.g. "EXPIRED_LICENSE", "MISSING_NOTE"

    description: { type: String, required: true },

    relatedId: { type: mongoose.Schema.Types.ObjectId }, // ID of Employee, Vehicle, Session
    relatedModel: { type: String }, // 'Employee', 'Vehicle', 'TherapySession'

    severity: { type: String, enum: ['CRITICAL', 'WARNING', 'INFO'], default: 'WARNING' },

    status: { type: String, enum: ['OPEN', 'RESOLVED', 'IGNORED'], default: 'OPEN' },

    detectedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);


// ── Indexes ───────────────────────────────────────────────────────────────
complianceLogSchema.index({ domain: 1 });
complianceLogSchema.index({ status: 1 });
complianceLogSchema.index({ severity: 1 });
complianceLogSchema.index({ relatedId: 1 });
complianceLogSchema.index({ domain: 1, status: 1 });
complianceLogSchema.index({ detectedAt: -1 });
module.exports = mongoose.models.ComplianceLog || mongoose.model('ComplianceLog', complianceLogSchema);

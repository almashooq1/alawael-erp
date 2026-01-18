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
  { timestamps: true },
);

module.exports = mongoose.model('ComplianceLog', complianceLogSchema);

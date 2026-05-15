'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * An audit scope is the unit that gets audited periodically — e.g. a
 * department, a clinical process, a controlled-document set, or a
 * standard like ISO 9001 §9.2.
 */
const scopeSchema = new Schema(
  {
    scopeCode: { type: String, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    department: { type: String, default: null },
    standardCode: { type: String, default: null }, // optional: links to standardsTraceability
    clauseCodes: { type: [String], default: [] },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    leadAuditorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    lastAuditedAt: { type: Date, default: null },
    nextScheduledDate: { type: Date, default: null },
    active: { type: Boolean, default: true, index: true },
    notes: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'audit_scopes' }
);

scopeSchema.pre('validate', async function () {
  if (!this.scopeCode) {
    const year = new Date().getUTCFullYear();
    const Model = mongoose.model('AuditScope');
    const count = await Model.countDocuments({ scopeCode: { $regex: `^SCOPE-${year}-` } });
    this.scopeCode = `SCOPE-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.models.AuditScope || mongoose.model('AuditScope', scopeSchema);

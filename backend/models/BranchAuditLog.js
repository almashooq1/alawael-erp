/**
 * Branch Audit Log Model - سجل تدقيق الفروع
 * Immutable audit trail for all branch access attempts
 */
const mongoose = require('mongoose');

const branchAuditLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    username: { type: String },
    role: { type: String },
    user_branch: { type: String, index: true },
    target_branch: { type: String, index: true },
    module: { type: String },
    action: { type: String },
    allowed: { type: Boolean, index: true },
    reason: { type: String },
    ip: { type: String },
    endpoint: { type: String },
    method: { type: String },
    response_code: { type: Number },
  },
  {
    timestamps: false,
    // Capped collection: auto-delete old entries (100MB max)
    // capped: { size: 104857600, max: 1000000 }
  }
);

// REMOVED DUPLICATE: branchAuditLogSchema.index({ timestamp: -1 }); — field already has index:true
branchAuditLogSchema.index({ user_id: 1, timestamp: -1 });
branchAuditLogSchema.index({ target_branch: 1, timestamp: -1 });
branchAuditLogSchema.index({ allowed: 1, timestamp: -1 });

module.exports =
  mongoose.models.BranchAuditLog || mongoose.model('BranchAuditLog', branchAuditLogSchema);

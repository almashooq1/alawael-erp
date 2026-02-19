/**
 * AuditLog Model
 * سجل التدقيق الشامل لجميع العمليات والتغييرات
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    logId: { type: String, required: true, unique: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
    
    user: {
      userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
      username: String,
      email: String,
      role: String,
      ipAddress: String
    },
    
    operation: {
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'export', 'import', 'approve', 'reject', 'login', 'logout'],
      required: true,
      index: true
    },
    
    entity: {
      type: String,
      enum: ['JournalEntry', 'CashFlow', 'RiskAssessment', 'FinancialReport', 'Validation', 'Compliance'],
      required: true,
      index: true
    },
    
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String,
    
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
      description: String,
      changedFields: [String]
    },
    
    status: { type: String, enum: ['success', 'failure'], default: 'success', index: true },
    errorMessage: String,
    
    timestamp: { type: Date, default: Date.now, index: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    
    details: { method: String, endpoint: String, duration: Number, affectedRecords: Number },
    
    isSensitive: { type: Boolean, default: false },
    sensitiveFields: [String],
    
    complianceRelevant: { type: Boolean, default: false, index: true },
    complianceType: String
  },
  { timestamps: true, collection: 'audit_logs' }
);

auditLogSchema.index({ 'user.userId': 1, timestamp: -1 });
auditLogSchema.index({ entity: 1, operation: 1 });

auditLogSchema.statics.getUserActions = function(userId, limit = 50) {
  return this.find({ 'user.userId': userId }).sort({ timestamp: -1 }).limit(limit);
};

auditLogSchema.statics.getEntityHistory = function(entityId, entityType) {
  return this.find({ entityId, entity: entityType }).sort({ timestamp: -1 });
};

auditLogSchema.statics.getComplianceLog = function(organizationId) {
  return this.find({ organizationId, complianceRelevant: true }).sort({ timestamp: -1 });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true, // e.g., 'CREATE_EMPLOYEE', 'DELETE_INVOICE'
  },
  module: {
    type: String,
    required: true,
    index: true, // e.g., 'HR', 'FINANCE'
  },
  actor: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    role: String,
    ip: String,
  },
  resource: {
    id: String,
    type: String, // e.g., 'Employee', 'Invoice'
    name: String,
  },
  meta: {
    userAgent: String,
    method: String,
    url: String,
    statusCode: Number,
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'WARNING'],
    default: 'SUCCESS',
  },
  description: String,
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 31536000, // Auto-delete after 1 year (TTL)
  },
});

// Compound index for common queries
auditLogSchema.index({ module: 1, timestamp: -1 });
auditLogSchema.index({ 'actor.id': 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;

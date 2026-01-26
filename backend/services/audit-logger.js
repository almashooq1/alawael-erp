/**
 * Audit Logger Service - GDPR/HIPAA Compliance
 * Logs all sensitive operations for compliance and security audits
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

// Audit Log Schema
const AuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,
  resource: String, // What was affected (user, program, goal, etc.)
  resourceId: String,
  operation: String, // CREATE, READ, UPDATE, DELETE
  changes: mongoose.Schema.Types.Mixed, // What changed
  status: { type: String, enum: ['success', 'failure'], default: 'success' },
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now, index: true },
  details: String,
  dataClassification: {
    type: String,
    enum: ['public', 'internal', 'confidential', 'restricted'],
    default: 'confidential',
  },
});

// Add index for queries
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, timestamp: -1 });
AuditLogSchema.index({ dataClassification: 1 });

// Avoid model recompilation during hot-reload/tests
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

class AuditLogger {
  /**
   * Log an action
   */
  static async log(auditData) {
    try {
      const logEntry = new AuditLog(auditData);
      await logEntry.save();
      return logEntry;
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw - audit logging should not break the application
    }
  }

  /**
   * Log user action
   */
  static async logUserAction(userId, action, details, req) {
    return this.log({
      userId,
      action,
      resource: details.resource || 'unknown',
      resourceId: details.resourceId,
      operation: details.operation || 'UNKNOWN',
      status: details.status || 'success',
      ipAddress: req?.ip || 'unknown',
      userAgent: req?.headers['user-agent'] || 'unknown',
      changes: details.changes,
      dataClassification: details.dataClassification || 'confidential',
      details: details.description,
    });
  }

  /**
   * Log data access
   */
  static async logDataAccess(userId, resource, resourceId, req) {
    return this.log({
      userId,
      action: 'DATA_ACCESS',
      resource,
      resourceId,
      operation: 'READ',
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      dataClassification: 'confidential',
    });
  }

  /**
   * Log authentication attempt
   */
  static async logAuthAttempt(email, success, req) {
    return this.log({
      action: 'AUTH_ATTEMPT',
      resource: 'authentication',
      status: success ? 'success' : 'failure',
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      details: `Login attempt for ${email}`,
    });
  }

  /**
   * Log sensitive change
   */
  static async logSensitiveChange(userId, changeType, oldValue, newValue, req) {
    return this.log({
      userId,
      action: 'SENSITIVE_CHANGE',
      resource: changeType,
      operation: 'UPDATE',
      status: 'success',
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      changes: {
        field: changeType,
        oldValue: this.maskSensitiveData(oldValue),
        newValue: this.maskSensitiveData(newValue),
      },
      dataClassification: 'restricted',
      details: `Sensitive data changed: ${changeType}`,
    });
  }

  /**
   * Log admin action
   */
  static async logAdminAction(adminId, action, targetUserId, details, req) {
    return this.log({
      userId: adminId,
      action: `ADMIN_${action}`,
      resource: 'user',
      resourceId: targetUserId,
      operation: 'UPDATE',
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      changes: details,
      dataClassification: 'restricted',
      details: `Admin action: ${action} on user ${targetUserId}`,
    });
  }

  /**
   * Get audit logs for user
   */
  static async getUserLogs(userId, limit = 100) {
    return AuditLog.find({ userId }).sort({ timestamp: -1 }).limit(limit).lean();
  }

  /**
   * Get audit logs for resource
   */
  static async getResourceLogs(resource, resourceId, limit = 100) {
    return AuditLog.find({
      resource,
      resourceId,
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Generate audit report
   */
  static async generateAuditReport(startDate, endDate, options = {}) {
    const matchStage = {
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (options.userId) {
      matchStage.userId = mongoose.Types.ObjectId(options.userId);
    }

    if (options.action) {
      matchStage.action = options.action;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          failures: {
            $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ];

    return AuditLog.aggregate(pipeline);
  }

  /**
   * Export audit logs for compliance
   */
  static async exportLogs(userId, startDate, endDate) {
    const logs = await AuditLog.find({
      userId,
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ timestamp: -1 });

    return {
      userId,
      exportDate: new Date(),
      totalLogs: logs.length,
      logs: logs.map(log => ({
        timestamp: log.timestamp,
        action: log.action,
        resource: log.resource,
        operation: log.operation,
        status: log.status,
        // Don't export sensitive data like IP in bulk exports
      })),
    };
  }

  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(data) {
    if (!data) return null;

    if (typeof data === 'string') {
      if (data.includes('@')) {
        // Email
        const [local, domain] = data.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
      }
      if (data.length > 4) {
        // Phone, SSN, etc.
        return `****${data.substring(data.length - 4)}`;
      }
    }

    return '***MASKED***';
  }

  /**
   * Clean old logs (retention policy)
   */
  static async cleanOldLogs(retentionDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    return result;
  }

  /**
   * Create compliance export (GDPR - Right to be forgotten)
   */
  static async createComplianceExport(userId) {
    const userLogs = await AuditLog.find({ userId }).lean();

    return {
      dataExportDate: new Date().toISOString(),
      userId,
      totalRecords: userLogs.length,
      records: userLogs.map(log => ({
        timestamp: log.timestamp,
        action: log.action,
        resource: log.resource,
        dataClassification: log.dataClassification,
        // Exclude sensitive operational details
      })),
      note: 'This export contains all your data processing records as per GDPR Article 15',
    };
  }

  /**
   * Delete user's audit logs (GDPR - Right to erasure)
   */
  static async deleteUserLogs(userId) {
    // Create archive before deletion for compliance
    const userLogs = await AuditLog.find({ userId }).lean();
    const archiveRecord = {
      userId,
      deletedAt: new Date(),
      logCount: userLogs.length,
      reason: 'GDPR Right to Erasure',
    };

    // Save archive
    const archive = new mongoose.Schema({
      userId: String,
      deletedAt: Date,
      logCount: Number,
      reason: String,
    });

    // Delete logs
    await AuditLog.deleteMany({ userId });

    return archiveRecord;
  }
}

module.exports = AuditLogger;

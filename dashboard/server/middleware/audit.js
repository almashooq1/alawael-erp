/**
 * ALAWAEL Quality Dashboard - Advanced Audit Logging
 * Security & Compliance Audit Trail
 * Phase 13 - Pillar 1: Advanced Features
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class AuditLogger extends EventEmitter {
  constructor(options = {}) {
    super();
    this.auditDir = options.auditDir || path.join(__dirname, '../../data/audit');
    this.maxLogSize = options.maxLogSize || 1024 * 1024 * 100; // 100MB
    this.retentionDays = options.retentionDays || 90;
    this.db = {};

    // Ensure audit directory exists
    if (!fs.existsSync(this.auditDir)) {
      fs.mkdirSync(this.auditDir, { recursive: true });
    }

    this.initializeAuditFile();
  }

  initializeAuditFile() {
    const today = new Date().toISOString().split('T')[0];
    this.auditFile = path.join(this.auditDir, `audit-${today}.jsonl`);

    if (!fs.existsSync(this.auditFile)) {
      fs.writeFileSync(this.auditFile, '');
    }
  }

  /**
   * Log authentication events
   */
  logAuthEvent(userId, email, action, success, details = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      category: 'AUTHENTICATION',
      userId,
      email,
      action, // LOGIN, LOGOUT, FAILED_LOGIN, TOKEN_REFRESH, etc.
      success,
      details,
      severity: success ? 'INFO' : 'WARNING',
    };

    this.writeAuditLog(event);
    this.emit('auth-event', event);
    return event;
  }

  /**
   * Log authorization events
   */
  logAuthorizationEvent(userId, action, resource, allowed, reason = '', details = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      category: 'AUTHORIZATION',
      userId,
      action,
      resource,
      allowed,
      reason,
      details,
      severity: allowed ? 'INFO' : 'WARNING',
    };

    this.writeAuditLog(event);
    this.emit('auth-event', event);
    return event;
  }

  /**
   * Log data access events
   */
  logDataAccess(userId, action, resource, dataType, recordCount = 1, details = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      category: 'DATA_ACCESS',
      userId,
      action, // READ, WRITE, UPDATE, DELETE
      resource,
      dataType,
      recordCount,
      details,
      severity: ['DELETE', 'UPDATE'].includes(action) ? 'WARNING' : 'INFO',
    };

    this.writeAuditLog(event);
    this.emit('data-access', event);
    return event;
  }

  /**
   * Log configuration changes
   */
  logConfigChange(userId, configKey, oldValue, newValue, reason = '', details = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      category: 'CONFIGURATION',
      userId,
      configKey,
      oldValue,
      newValue,
      reason,
      details,
      severity: 'WARNING', // Config changes are always important
    };

    this.writeAuditLog(event);
    this.emit('config-change', event);
    return event;
  }

  /**
   * Log security events
   */
  logSecurityEvent(severity, type, description, details = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      category: 'SECURITY',
      severity, // CRITICAL, HIGH, MEDIUM, LOW
      type, // INTRUSION_ATTEMPT, RATE_LIMIT_EXCEEDED, INVALID_TOKEN, etc.
      description,
      details,
      ip: details.ip,
      userId: details.userId,
    };

    this.writeAuditLog(event);
    this.emit('security-event', event);

    if (['CRITICAL', 'HIGH'].includes(severity)) {
      console.error(`🚨 SECURITY EVENT [${severity}] ${type}: ${description}`);
    }

    return event;
  }

  /**
   * Log API calls
   */
  logAPICall(userId, method, endpoint, statusCode, duration, details = {}) {
    const event = {
      timestamp: new Date().toISOString(),
      category: 'API_CALL',
      userId,
      method,
      endpoint,
      statusCode,
      duration, // milliseconds
      details,
      severity: statusCode >= 400 ? 'WARNING' : 'INFO',
    };

    this.writeAuditLog(event);
    this.emit('api-call', event);
    return event;
  }

  /**
   * Write audit log to file
   */
  writeAuditLog(event) {
    try {
      const logLine = JSON.stringify(event) + '\n';
      fs.appendFileSync(this.auditFile, logLine);

      // Check file size and rotate if needed
      const stats = fs.statSync(this.auditFile);
      if (stats.size > this.maxLogSize) {
        this.rotateAuditLog();
      }
    } catch (error) {
      console.error('❌ Error writing audit log:', error);
    }
  }

  /**
   * Rotate audit log file
   */
  rotateAuditLog() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = this.auditFile.replace('.jsonl', `-${timestamp}.jsonl`);
      fs.renameSync(this.auditFile, backupFile);
      fs.writeFileSync(this.auditFile, '');
      console.log(`✅ Audit log rotated: ${backupFile}`);
    } catch (error) {
      console.error('❌ Error rotating audit log:', error);
    }
  }

  /**
   * Query audit logs
   */
  queryLogs(filters = {}) {
    try {
      const logs = [];
      const content = fs.readFileSync(this.auditFile, 'utf-8');

      content.split('\n').forEach(line => {
        if (!line.trim()) return;

        try {
          const event = JSON.parse(line);

          // Apply filters
          let matches = true;
          if (filters.userId && event.userId !== filters.userId) matches = false;
          if (filters.action && event.action !== filters.action) matches = false;
          if (filters.severity && event.severity !== filters.severity) matches = false;
          if (filters.category && event.category !== filters.category) matches = false;
          if (filters.startDate && new Date(event.timestamp) < new Date(filters.startDate))
            matches = false;
          if (filters.endDate && new Date(event.timestamp) > new Date(filters.endDate))
            matches = false;

          if (matches) {
            logs.push(event);
          }
        } catch (e) {
          // Skip malformed lines
        }
      });

      return logs;
    } catch (error) {
      console.error('❌ Error querying logs:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  getAuditStats(days = 7) {
    try {
      const logs = this.queryLogs();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentLogs = logs.filter(log => new Date(log.timestamp) > cutoffDate);

      const stats = {
        totalEvents: recentLogs.length,
        byCategory: {},
        bySeverity: {},
        byUser: {},
        topActions: {},
        securityEvents: [],
      };

      recentLogs.forEach(log => {
        // Count by category
        stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;

        // Count by severity
        stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;

        // Count by user
        if (log.userId) {
          stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
        }

        // Count by action
        if (log.action) {
          stats.topActions[log.action] = (stats.topActions[log.action] || 0) + 1;
        }

        // Collect security events
        if (log.category === 'SECURITY') {
          stats.securityEvents.push(log);
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ Error calculating audit stats:', error);
      return null;
    }
  }

  /**
   * Export audit logs for compliance
   */
  exportLogs(filters = {}, format = 'json') {
    try {
      const logs = this.queryLogs(filters);

      if (format === 'csv') {
        return this.logsToCSV(logs);
      }

      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('❌ Error exporting logs:', error);
      return null;
    }
  }

  /**
   * Convert logs to CSV format
   */
  logsToCSV(logs) {
    if (logs.length === 0) return 'No logs found';

    const headers = Object.keys(logs[0]);
    const rows = [headers.join(',')];

    logs.forEach(log => {
      const values = headers.map(header => {
        const value = log[header];
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      rows.push(values.join(','));
    });

    return rows.join('\n');
  }

  /**
   * Cleanup old audit logs
   */
  cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.auditDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      files.forEach(file => {
        const filePath = path.join(this.auditDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Deleted old audit log: ${file}`);
        }
      });
    } catch (error) {
      console.error('❌ Error cleaning up old logs:', error);
    }
  }
}

module.exports = AuditLogger;

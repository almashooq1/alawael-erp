/**
 * Audit Log Service
 * خدمة سجل التدقيق
 * 
 * المسؤوليات:
 * - تسجيل جميع قرارات الوصول
 * - تتبع تاريخ التغييرات
 * - توليد تقارير التدقيق
 * - الفحص والاستعلام عن السجلات
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

class AuditLogService extends EventEmitter {
  constructor() {
    super();
    this.logger = Logger;

    // Audit logs storage
    this.logs = [];

    // Index for fast lookup
    this.logIndex = new Map();

    // Retention settings
    this.retentionDays = 90;
    this.maxLogs = 100000;

    // Filters and searches
    this.filters = new Map();

    // Statistics
    this.stats = {
      totalLogs: 0,
      allowDecisions: 0,
      denyDecisions: 0,
      policyEvaluations: 0,
      roleChanges: 0,
      permissionChanges: 0
    };

    // Start retention check
    this._startRetentionCheck();
  }

  /**
   * Log policy evaluation decision
   * تسجيل قرار تقييم السياسة
   * 
   * @param {Object} logData - Log data
   */
  logPolicyEvaluation(logData) {
    try {
      const {
        userId,
        action,
        resource,
        policies,
        decision,
        reason,
        conditions,
        evaluationTime,
        ipAddress,
        userAgent,
        metadata = {}
      } = logData;

      const logId = `log-${uuidv4()}`;
      const timestamp = new Date();

      const logEntry = {
        id: logId,
        type: 'POLICY_EVALUATION',
        userId,
        action,
        resource,
        policies: policies || [],
        decision, // 'Allow' or 'Deny'
        reason: reason || 'No reason provided',
        conditions: conditions || {},
        evaluationTime,
        ipAddress,
        userAgent,
        timestamp,
        status: 'LOGGED',
        metadata: {
          ...metadata,
          retries: 0,
          correlationId: metadata.correlationId || uuidv4()
        }
      };

      this.logs.push(logEntry);
      this.logIndex.set(logId, this.logs.length - 1);

      // Update statistics
      this.stats.totalLogs++;
      this.stats.policyEvaluations++;
      if (decision === 'Allow') {
        this.stats.allowDecisions++;
      } else {
        this.stats.denyDecisions++;
      }

      // Emit event
      this.emit('log:policy_evaluation', logEntry);
      this.logger.info(`Policy evaluation logged: ${logId} (${decision})`);

      return logEntry;
    } catch (error) {
      this.logger.error(`Error logging policy evaluation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log role assignment
   * تسجيل تعيين الدور
   * 
   * @param {Object} logData - Log data
   */
  logRoleAssignment(logData) {
    try {
      const {
        userId,
        roleId,
        assignedBy,
        action, // 'ASSIGN' or 'REMOVE'
        reason,
        metadata = {}
      } = logData;

      const logId = `log-${uuidv4()}`;
      const timestamp = new Date();

      const logEntry = {
        id: logId,
        type: 'ROLE_CHANGE',
        userId,
        roleId,
        action,
        assignedBy,
        reason: reason || 'No reason provided',
        timestamp,
        status: 'LOGGED',
        metadata: {
          ...metadata,
          changeType: 'ROLE_ASSIGNMENT',
          correlationId: metadata.correlationId || uuidv4()
        }
      };

      this.logs.push(logEntry);
      this.logIndex.set(logId, this.logs.length - 1);

      this.stats.totalLogs++;
      this.stats.roleChanges++;

      this.emit('log:role_change', logEntry);
      this.logger.info(`Role ${action} logged for user ${userId}`);

      return logEntry;
    } catch (error) {
      this.logger.error(`Error logging role assignment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log permission change
   * تسجيل تغيير الإذن
   * 
   * @param {Object} logData - Log data
   */
  logPermissionChange(logData) {
    try {
      const {
        roleId,
        permissionId,
        action, // 'ADD' or 'REMOVE'
        changedBy,
        reason,
        metadata = {}
      } = logData;

      const logId = `log-${uuidv4()}`;
      const timestamp = new Date();

      const logEntry = {
        id: logId,
        type: 'PERMISSION_CHANGE',
        roleId,
        permissionId,
        action,
        changedBy,
        reason: reason || 'No reason provided',
        timestamp,
        status: 'LOGGED',
        metadata: {
          ...metadata,
          changeType: 'PERMISSION_MODIFICATION',
          correlationId: metadata.correlationId || uuidv4()
        }
      };

      this.logs.push(logEntry);
      this.logIndex.set(logId, this.logs.length - 1);

      this.stats.totalLogs++;
      this.stats.permissionChanges++;

      this.emit('log:permission_change', logEntry);
      this.logger.info(`Permission ${action} logged for role ${roleId}`);

      return logEntry;
    } catch (error) {
      this.logger.error(`Error logging permission change: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log custom audit event
   * تسجيل حدث تدقيق مخصص
   * 
   * @param {Object} logData - Log data
   */
  logCustomEvent(logData) {
    try {
      const {
        eventType,
        userId,
        action,
        details,
        severity = 'INFO', // INFO, WARNING, ERROR, CRITICAL
        metadata = {}
      } = logData;

      const logId = `log-${uuidv4()}`;
      const timestamp = new Date();

      const logEntry = {
        id: logId,
        type: eventType,
        userId,
        action,
        details: details || {},
        severity,
        timestamp,
        status: 'LOGGED',
        metadata: {
          ...metadata,
          correlationId: metadata.correlationId || uuidv4()
        }
      };

      this.logs.push(logEntry);
      this.logIndex.set(logId, this.logs.length - 1);

      this.stats.totalLogs++;

      this.emit(`log:custom_${eventType.toLowerCase()}`, logEntry);
      this.logger.info(`Custom event logged: ${eventType} (${severity})`);

      return logEntry;
    } catch (error) {
      this.logger.error(`Error logging custom event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Query logs with filters
   * الاستعلام عن السجلات بالمرشحات
   * 
   * @param {Object} filters - Query filters
   * @returns {Array} Matching logs
   */
  queryLogs(filters) {
    try {
      let results = [...this.logs];

      // Apply filters
      if (filters.userId) {
        results = results.filter(log => log.userId === filters.userId);
      }

      if (filters.type) {
        results = results.filter(log => log.type === filters.type);
      }

      if (filters.action) {
        results = results.filter(log => log.action === filters.action);
      }

      if (filters.decision) {
        results = results.filter(log => log.decision === filters.decision);
      }

      if (filters.severity) {
        results = results.filter(log => log.severity === filters.severity);
      }

      if (filters.startDate) {
        results = results.filter(log => log.timestamp >= new Date(filters.startDate));
      }

      if (filters.endDate) {
        results = results.filter(log => log.timestamp <= new Date(filters.endDate));
      }

      if (filters.ipAddress) {
        results = results.filter(log => log.ipAddress === filters.ipAddress);
      }

      // Sorting
      const sortBy = filters.sortBy || 'timestamp';
      const sortOrder = filters.sortOrder || 'desc';

      results.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        if (aVal instanceof Date && bVal instanceof Date) {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return sortOrder === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const start = (page - 1) * limit;

      return {
        data: results.slice(start, start + limit),
        pagination: {
          total: results.length,
          page,
          limit,
          pages: Math.ceil(results.length / limit)
        }
      };
    } catch (error) {
      this.logger.error(`Error querying logs: ${error.message}`);
      return { data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } };
    }
  }

  /**
   * Get logs by user
   * الحصول على السجلات حسب المستخدم
   * 
   * @param {String} userId - User ID
   * @returns {Array} User logs
   */
  getLogsByUser(userId, options = {}) {
    return this.queryLogs({
      userId,
      limit: options.limit || 100,
      page: options.page || 1,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  /**
   * Get logs by type
   * الحصول على السجلات حسب النوع
   * 
   * @param {String} type - Log type
   * @returns {Array} Typed logs
   */
  getLogsByType(type, options = {}) {
    return this.queryLogs({
      type,
      limit: options.limit || 100,
      page: options.page || 1,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });
  }

  /**
   * Get decision statistics
   * الحصول على إحصائيات القرارات
   * 
   * @returns {Object} Statistics
   */
  getDecisionStats() {
    try {
      const allow = this.logs.filter(log => log.decision === 'Allow').length;
      const deny = this.logs.filter(log => log.decision === 'Deny').length;
      const total = allow + deny;

      return {
        totalDecisions: total,
        allowed: allow,
        denied: deny,
        allowPercentage: total > 0 ? ((allow / total) * 100).toFixed(2) : 0,
        denyPercentage: total > 0 ? ((deny / total) * 100).toFixed(2) : 0
      };
    } catch (error) {
      this.logger.error(`Error getting decision stats: ${error.message}`);
      return {};
    }
  }

  /**
   * Get user activity report
   * الحصول على تقرير نشاط المستخدم
   * 
   * @param {String} userId - User ID
   * @returns {Object} Activity report
   */
  getUserActivityReport(userId) {
    try {
      const userLogs = this.logs.filter(log => log.userId === userId);

      return {
        userId,
        totalActions: userLogs.length,
        roleChanges: userLogs.filter(log => log.type === 'ROLE_CHANGE').length,
        permissionChanges: userLogs.filter(log => log.type === 'PERMISSION_CHANGE').length,
        policyEvaluations: userLogs.filter(log => log.type === 'POLICY_EVALUATION').length,
        deniedActions: userLogs.filter(log => log.decision === 'Deny').length,
        lastActivity: userLogs.length > 0 ? userLogs[userLogs.length - 1].timestamp : null,
        ipAddresses: [...new Set(userLogs.map(log => log.ipAddress))].filter(ip => ip)
      };
    } catch (error) {
      this.logger.error(`Error generating user activity report: ${error.message}`);
      return {};
    }
  }

  /**
   * Get compliance report
   * الحصول على تقرير الامتثال
   * 
   * @returns {Object} Compliance report
   */
  getComplianceReport() {
    try {
      const roles = {};
      const permissions = {};
      const users = new Set();

      this.logs.forEach(log => {
        if (log.type === 'ROLE_CHANGE') {
          if (!roles[log.roleId]) {
            roles[log.roleId] = { assigns: 0, removes: 0 };
          }
          if (log.action === 'ASSIGN') {
            roles[log.roleId].assigns++;
          } else {
            roles[log.roleId].removes++;
          }
          users.add(log.userId);
        }

        if (log.type === 'PERMISSION_CHANGE') {
          if (!permissions[log.permissionId]) {
            permissions[log.permissionId] = { adds: 0, removes: 0 };
          }
          if (log.action === 'ADD') {
            permissions[log.permissionId].adds++;
          } else {
            permissions[log.permissionId].removes++;
          }
        }
      });

      return {
        reportDate: new Date(),
        totalAuditLogs: this.logs.length,
        uniqueUsers: users.size,
        roleModifications: Object.keys(roles).length,
        permissionModifications: Object.keys(permissions).length,
        roleDetails: roles,
        permissionDetails: permissions
      };
    } catch (error) {
      this.logger.error(`Error generating compliance report: ${error.message}`);
      return {};
    }
  }

  /**
   * Export logs
   * تصدير السجلات
   * 
   * @param {Object} filters - Export filters
   * @param {String} format - Export format (json, csv)
   * @returns {Object} Exported data
   */
  exportLogs(filters = {}, format = 'json') {
    try {
      const result = this.queryLogs({ ...filters, limit: this.maxLogs });
      const logs = result.data;

      if (format === 'csv') {
        return this._convertToCSV(logs);
      }

      return JSON.stringify(logs, null, 2);
    } catch (error) {
      this.logger.error(`Error exporting logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert logs to CSV format
   * تحويل السجلات إلى صيغة CSV
   * 
   * @private
   */
  _convertToCSV(logs) {
    if (logs.length === 0) return 'No data';

    const headers = Object.keys(logs[0]);
    const csv = [
      headers.join(','),
      ...logs.map(log =>
        headers
          .map(header => {
            const value = log[header];
            if (typeof value === 'object') {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(',')
      )
    ].join('\n');

    return csv;
  }

  /**
   * Delete logs older than retention days
   * حذف السجلات الأقدم من أيام الاحتفاظ
   * 
   * @private
   */
  _deleteOldLogs() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const initialCount = this.logs.length;
      this.logs = this.logs.filter(log => log.timestamp > cutoffDate);

      const deletedCount = initialCount - this.logs.length;

      if (deletedCount > 0) {
        this.logger.info(`Deleted ${deletedCount} old audit logs`);
        this.emit('logs:retention_executed', { deletedCount, newTotal: this.logs.length });
      }

      // Rebuild index
      this._rebuildIndex();
    } catch (error) {
      this.logger.error(`Error deleting old logs: ${error.message}`);
    }
  }

  /**
   * Rebuild log index
   * إعادة بناء فهرس السجل
   * 
   * @private
   */
  _rebuildIndex() {
    this.logIndex.clear();
    this.logs.forEach((log, index) => {
      this.logIndex.set(log.id, index);
    });
  }

  /**
   * Start retention check interval
   * بدء فترة الفحص الدوري للاحتفاظ
   * 
   * @private
   */
  _startRetentionCheck() {
    // Run retention check daily
    setInterval(() => {
      this._deleteOldLogs();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Get statistics
   * الحصول على الإحصائيات
   * 
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      totalDecisions: this.stats.allowDecisions + this.stats.denyDecisions,
      allowRate: this.stats.denyDecisions + this.stats.allowDecisions > 0
        ? ((this.stats.allowDecisions / (this.stats.denyDecisions + this.stats.allowDecisions)) * 100).toFixed(2)
        : 0
    };
  }
}

module.exports = new AuditLogService();

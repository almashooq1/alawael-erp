/**
 * 📋 Comprehensive Audit Logging System
 *
 * Complete audit trail and compliance logging
 * - Action logging
 * - Data change tracking
 * - User activity monitoring
 * - Compliance reporting
 */

class AuditLogger {
  constructor(options = {}) {
    this.logs = [];
    this.maxLogs = options.maxLogs || 100000;
    this.categories = new Map();
    this.categories.set('authentication', { name: 'Authentication', priority: 'high' });
    this.categories.set('authorization', { name: 'Authorization', priority: 'high' });
    this.categories.set('data_access', { name: 'Data Access', priority: 'medium' });
    this.categories.set('data_modification', { name: 'Data Modification', priority: 'high' });
    this.categories.set('admin_action', { name: 'Admin Action', priority: 'high' });
    this.categories.set('system_event', { name: 'System Event', priority: 'medium' });
    this.retention = options.retention || 90 * 24 * 60 * 60 * 1000; // 90 days
    this.indexes = {
      byUser: new Map(),
      byCategory: new Map(),
      byAction: new Map(),
      byResource: new Map(),
    };

    this.startRetentionPolicy();
  }

  /**
   * Log audit event
   */
  logEvent(category, action, details = {}) {
    if (!this.categories.has(category)) {
      throw new Error(`Unknown category: ${category}`);
    }

    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      category,
      action,
      details,
      userId: details.userId || 'anonymous',
      resource: details.resource || null,
      resourceId: details.resourceId || null,
      severity: details.severity || this.categories.get(category).priority,
      ip: details.ip || null,
      userAgent: details.userAgent || null,
      status: details.status || 'success', // success, failure
      statusCode: details.statusCode || null,
      duration: details.duration || null,
    };

    this.logs.push(logEntry);
    this.updateIndexes(logEntry);

    // Enforce max logs
    if (this.logs.length > this.maxLogs) {
      const removed = this.logs.shift();
      this.removeFromIndexes(removed);
    }

    return logEntry;
  }

  /**
   * Log authentication event
   */
  logAuthenticationEvent(action, userId, details = {}) {
    return this.logEvent('authentication', action, {
      ...details,
      userId,
    });
  }

  /**
   * Log authorization event
   */
  logAuthorizationEvent(userId, permission, granted, details = {}) {
    return this.logEvent('authorization', granted ? 'permission_granted' : 'permission_denied', {
      ...details,
      userId,
      permission,
      granted,
    });
  }

  /**
   * Log data access
   */
  logDataAccess(userId, resource, resourceId, details = {}) {
    return this.logEvent('data_access', 'data_accessed', {
      ...details,
      userId,
      resource,
      resourceId,
    });
  }

  /**
   * Log data modification
   */
  logDataModification(userId, resource, resourceId, action, changes = {}, details = {}) {
    return this.logEvent('data_modification', `${resource}_${action}`, {
      ...details,
      userId,
      resource,
      resourceId,
      changes,
      changeCount: Object.keys(changes).length,
    });
  }

  /**
   * Track detailed changes
   */
  trackChanges(userId, resource, resourceId, before, after) {
    const changes = {};

    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (before[key] !== after[key]) {
        changes[key] = {
          before: before[key],
          after: after[key],
        };
      }
    }

    return this.logDataModification(userId, resource, resourceId, 'modified', changes);
  }

  /**
   * Log admin action
   */
  logAdminAction(userId, action, target, details = {}) {
    return this.logEvent('admin_action', action, {
      ...details,
      userId,
      target,
      adminAction: true,
    });
  }

  /**
   * Update indexes
   */
  updateIndexes(logEntry) {
    // By user
    if (!this.indexes.byUser.has(logEntry.userId)) {
      this.indexes.byUser.set(logEntry.userId, []);
    }
    this.indexes.byUser.get(logEntry.userId).push(logEntry.id);

    // By category
    if (!this.indexes.byCategory.has(logEntry.category)) {
      this.indexes.byCategory.set(logEntry.category, []);
    }
    this.indexes.byCategory.get(logEntry.category).push(logEntry.id);

    // By action
    if (!this.indexes.byAction.has(logEntry.action)) {
      this.indexes.byAction.set(logEntry.action, []);
    }
    this.indexes.byAction.get(logEntry.action).push(logEntry.id);

    // By resource
    if (logEntry.resource) {
      if (!this.indexes.byResource.has(logEntry.resource)) {
        this.indexes.byResource.set(logEntry.resource, []);
      }
      this.indexes.byResource.get(logEntry.resource).push(logEntry.id);
    }
  }

  /**
   * Remove from indexes
   */
  removeFromIndexes(logEntry) {
    const removeFromIndex = (map, key, id) => {
      const list = map.get(key);
      if (list) {
        const idx = list.indexOf(id);
        if (idx !== -1) list.splice(idx, 1);
      }
    };

    removeFromIndex(this.indexes.byUser, logEntry.userId, logEntry.id);
    removeFromIndex(this.indexes.byCategory, logEntry.category, logEntry.id);
    removeFromIndex(this.indexes.byAction, logEntry.action, logEntry.id);
    if (logEntry.resource) {
      removeFromIndex(this.indexes.byResource, logEntry.resource, logEntry.id);
    }
  }

  /**
   * Query logs
   */
  query(filters = {}) {
    let results = [...this.logs];

    if (filters.userId) {
      results = results.filter(log => log.userId === filters.userId);
    }

    if (filters.category) {
      results = results.filter(log => log.category === filters.category);
    }

    if (filters.action) {
      results = results.filter(log => log.action === filters.action);
    }

    if (filters.resource) {
      results = results.filter(log => log.resource === filters.resource);
    }

    if (filters.resourceId) {
      results = results.filter(log => log.resourceId === filters.resourceId);
    }

    if (filters.startTime) {
      results = results.filter(log => log.timestamp >= filters.startTime);
    }

    if (filters.endTime) {
      results = results.filter(log => log.timestamp <= filters.endTime);
    }

    if (filters.severity) {
      results = results.filter(log => log.severity === filters.severity);
    }

    if (filters.status) {
      results = results.filter(log => log.status === filters.status);
    }

    // Sort
    const sortBy = filters.sortBy || 'timestamp';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    results.sort((a, b) => {
      if (sortBy === 'timestamp') {
        return sortOrder * (a.timestamp - b.timestamp);
      }
      return 0;
    });

    // Paginate
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const start = (page - 1) * pageSize;

    return {
      total: results.length,
      page,
      pageSize,
      pages: Math.ceil(results.length / pageSize),
      logs: results.slice(start, start + pageSize),
    };
  }

  /**
   * Get user activity summary
   */
  getUserActivitySummary(userId, timeWindow = 24 * 60 * 60 * 1000) {
    const threshold = Date.now() - timeWindow;
    const userLogs = this.logs.filter(log => log.userId === userId && log.timestamp >= threshold);

    const summary = {
      userId,
      totalActions: userLogs.length,
      actions: {},
      categories: {},
      failures: userLogs.filter(l => l.status === 'failure').length,
      resources: {},
    };

    for (const log of userLogs) {
      summary.actions[log.action] = (summary.actions[log.action] || 0) + 1;
      summary.categories[log.category] = (summary.categories[log.category] || 0) + 1;

      if (log.resource) {
        summary.resources[log.resource] = (summary.resources[log.resource] || 0) + 1;
      }
    }

    return summary;
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(startTime, endTime) {
    const logs = this.logs.filter(log => log.timestamp >= startTime && log.timestamp <= endTime);

    const report = {
      period: {
        start: new Date(startTime).toISOString(),
        end: new Date(endTime).toISOString(),
      },
      summary: {
        totalEvents: logs.length,
        categories: {},
        failures: logs.filter(l => l.status === 'failure').length,
      },
      securityEvents: {
        failedAuthentications: logs.filter(
          l => l.category === 'authentication' && l.status === 'failure'
        ).length,
        unauthorizedAccess: logs.filter(
          l => l.category === 'authorization' && l.status === 'failure'
        ).length,
      },
      dataChanges: logs.filter(l => l.category === 'data_modification').length,
      adminActions: logs.filter(l => l.category === 'admin_action').length,
    };

    for (const log of logs) {
      report.summary.categories[log.category] = (report.summary.categories[log.category] || 0) + 1;
    }

    return report;
  }

  /**
   * Detect anomalies
   */
  detectAnomalies() {
    const anomalies = [];

    // Detect multiple failed authentication attempts
    const failedAuths = this.logs.filter(
      log => log.category === 'authentication' && log.status === 'failure'
    );

    const userFailures = {};
    for (const log of failedAuths) {
      userFailures[log.userId] = (userFailures[log.userId] || 0) + 1;
    }

    for (const [userId, count] of Object.entries(userFailures)) {
      if (count > 5) {
        anomalies.push({
          type: 'brute_force_attempt',
          severity: 'critical',
          userId,
          failureCount: count,
        });
      }
    }

    return anomalies;
  }

  /**
   * Start retention policy
   */
  startRetentionPolicy() {
    this.retentionInterval = setInterval(
      () => {
        const threshold = Date.now() - this.retention;
        const initialLength = this.logs.length;

        this.logs = this.logs.filter(log => {
          if (log.timestamp < threshold) {
            this.removeFromIndexes(log);
            return false;
          }
          return true;
        });

        if (this.logs.length < initialLength) {
          console.log(`[AuditLogger] Removed ${initialLength - this.logs.length} old logs`);
        }
      },
      60 * 60 * 1000
    ); // Check every hour
  }

  /**
   * Stop retention policy
   */
  stop() {
    if (this.retentionInterval) {
      clearInterval(this.retentionInterval);
    }
  }
}

module.exports = { AuditLogger };

/**
 * 🔍 Advanced Log Aggregation System
 *
 * Centralized log collection and analysis
 * - Structured logging
 * - Full-text search
 * - Log filtering and querying
 * - Log retention policies
 */

const fs = require('fs');
const path = require('path');

class LogAggregator {
  constructor(options = {}) {
    this.logs = [];
    this.indexes = {
      byLevel: new Map(),
      byService: new Map(),
      byTimestamp: new Map(),
      byUser: new Map(),
    };
    this.maxLogs = options.maxLogs || 100000;
    this.retentionDays = options.retentionDays || 7;
    this.logPath = options.logPath || './logs';
    this.searchCacheSize = options.searchCacheSize || 1000;
    this.searchCache = new Map();

    this.ensureLogDirectory();
    this.startRetentionPolicy();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }

  /**
   * Aggregate log entry
   */
  addLog(logEntry) {
    const enrichedLog = {
      id: Date.now() + Math.random(),
      timestamp: logEntry.timestamp || Date.now(),
      level: logEntry.level,
      service: logEntry.service,
      message: logEntry.message,
      userId: logEntry.userId,
      requestId: logEntry.requestId,
      data: logEntry.data,
      context: logEntry.context,
      metadata: {
        duration: logEntry.duration,
        statusCode: logEntry.statusCode,
        error: logEntry.error,
      },
    };

    // Add to main logs
    this.logs.push(enrichedLog);

    // Update indexes
    this.updateIndexes(enrichedLog);

    // Enforce max logs
    if (this.logs.length > this.maxLogs) {
      const removed = this.logs.shift();
      this.removeFromIndexes(removed);
    }

    return enrichedLog;
  }

  /**
   * Update all indexes for new log
   */
  updateIndexes(log) {
    // By level
    if (!this.indexes.byLevel.has(log.level)) {
      this.indexes.byLevel.set(log.level, []);
    }
    this.indexes.byLevel.get(log.level).push(log.id);

    // By service
    if (log.service) {
      if (!this.indexes.byService.has(log.service)) {
        this.indexes.byService.set(log.service, []);
      }
      this.indexes.byService.get(log.service).push(log.id);
    }

    // By timestamp (buckets)
    const bucket = Math.floor(log.timestamp / 60000); // 1-minute buckets
    if (!this.indexes.byTimestamp.has(bucket)) {
      this.indexes.byTimestamp.set(bucket, []);
    }
    this.indexes.byTimestamp.get(bucket).push(log.id);

    // By user
    if (log.userId) {
      if (!this.indexes.byUser.has(log.userId)) {
        this.indexes.byUser.set(log.userId, []);
      }
      this.indexes.byUser.get(log.userId).push(log.id);
    }
  }

  /**
   * Remove log from indexes
   */
  removeFromIndexes(log) {
    // By level
    const levelLogs = this.indexes.byLevel.get(log.level);
    if (levelLogs) {
      const idx = levelLogs.indexOf(log.id);
      if (idx !== -1) levelLogs.splice(idx, 1);
    }

    // By service
    if (log.service) {
      const serviceLogs = this.indexes.byService.get(log.service);
      if (serviceLogs) {
        const idx = serviceLogs.indexOf(log.id);
        if (idx !== -1) serviceLogs.splice(idx, 1);
      }
    }

    // By user
    if (log.userId) {
      const userLogs = this.indexes.byUser.get(log.userId);
      if (userLogs) {
        const idx = userLogs.indexOf(log.id);
        if (idx !== -1) userLogs.splice(idx, 1);
      }
    }
  }

  /**
   * Search logs with complex filters
   */
  search(query) {
    const cacheKey = JSON.stringify(query);
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    let results = [...this.logs];

    // Filter by level
    if (query.level) {
      results = results.filter(log => log.level === query.level);
    }

    // Filter by service
    if (query.service) {
      results = results.filter(log => log.service === query.service);
    }

    // Filter by user
    if (query.userId) {
      results = results.filter(log => log.userId === query.userId);
    }

    // Filter by time range
    if (query.startTime || query.endTime) {
      const start = query.startTime || 0;
      const end = query.endTime || Date.now();
      results = results.filter(log => log.timestamp >= start && log.timestamp <= end);
    }

    // Full-text search in message
    if (query.text) {
      const searchText = query.text.toLowerCase();
      results = results.filter(
        log =>
          log.message.toLowerCase().includes(searchText) ||
          JSON.stringify(log.data).toLowerCase().includes(searchText)
      );
    }

    // Filter by request ID
    if (query.requestId) {
      results = results.filter(log => log.requestId === query.requestId);
    }

    // Filter by status code
    if (query.statusCode) {
      results = results.filter(log => log.metadata.statusCode === query.statusCode);
    }

    // Sort
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    results.sort((a, b) => {
      if (sortBy === 'timestamp') {
        return sortOrder * (a.timestamp - b.timestamp);
      }
      return 0;
    });

    // Paginate
    const page = query.page || 1;
    const pageSize = query.pageSize || 50;
    const start = (page - 1) * pageSize;
    const paginated = results.slice(start, start + pageSize);

    const result = {
      total: results.length,
      page,
      pageSize,
      pages: Math.ceil(results.length / pageSize),
      logs: paginated,
    };

    // Cache result
    if (this.searchCache.size >= this.searchCacheSize) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
    this.searchCache.set(cacheKey, result);

    return result;
  }

  /**
   * Get logs by level
   */
  getByLevel(level) {
    const logIds = this.indexes.byLevel.get(level) || [];
    return logIds.map(id => this.logs.find(l => l.id === id)).filter(Boolean);
  }

  /**
   * Get logs by service
   */
  getByService(service) {
    const logIds = this.indexes.byService.get(service) || [];
    return logIds.map(id => this.logs.find(l => l.id === id)).filter(Boolean);
  }

  /**
   * Get logs by user
   */
  getByUser(userId) {
    const logIds = this.indexes.byUser.get(userId) || [];
    return logIds.map(id => this.logs.find(l => l.id === id)).filter(Boolean);
  }

  /**
   * Get log statistics
   */
  getStats() {
    const stats = {
      totalLogs: this.logs.length,
      byLevel: {},
      byService: {},
      errorRate: 0,
      avgResponseTime: 0,
    };

    this.indexes.byLevel.forEach((logIds, level) => {
      stats.byLevel[level] = logIds.length;
    });

    this.indexes.byService.forEach((logIds, service) => {
      stats.byService[service] = logIds.length;
    });

    // Calculate error rate
    const errorLogs = this.logs.filter(l => l.level === 'ERROR');
    stats.errorRate = this.logs.length > 0 ? (errorLogs.length / this.logs.length) * 100 : 0;

    // Calculate avg response time
    const logsWithDuration = this.logs.filter(l => l.metadata.duration);
    if (logsWithDuration.length > 0) {
      const totalDuration = logsWithDuration.reduce((sum, l) => sum + l.metadata.duration, 0);
      stats.avgResponseTime = totalDuration / logsWithDuration.length;
    }

    return stats;
  }

  /**
   * Export logs to file
   */
  exportToFile(filename, format = 'json', filters = {}) {
    const results = this.search(filters);
    const filePath = path.join(this.logPath, filename);

    let content;
    if (format === 'json') {
      content = JSON.stringify(results.logs, null, 2);
    } else if (format === 'csv') {
      const headers = ['timestamp', 'level', 'service', 'message', 'userId', 'statusCode'];
      const rows = results.logs.map(log =>
        [
          log.timestamp,
          log.level,
          log.service,
          `"${log.message.replace(/"/g, '""')}"`,
          log.userId || '',
          log.metadata.statusCode || '',
        ].join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
    }

    fs.writeFileSync(filePath, content);
    return filePath;
  }

  /**
   * Start retention policy
   */
  startRetentionPolicy() {
    this.retentionInterval = setInterval(
      () => {
        const now = Date.now();
        const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;
        const threshold = now - retentionMs;

        // Remove old logs
        const initialLength = this.logs.length;
        this.logs = this.logs.filter(log => {
          if (log.timestamp < threshold) {
            this.removeFromIndexes(log);
            return false;
          }
          return true;
        });

        if (this.logs.length < initialLength) {
          console.log(`[LogAggregator] Removed ${initialLength - this.logs.length} old logs`);
        }
      },
      60 * 60 * 1000
    ); // Check every hour
  }

  /**
   * Clear logs
   */
  clear() {
    this.logs = [];
    this.indexes = {
      byLevel: new Map(),
      byService: new Map(),
      byTimestamp: new Map(),
      byUser: new Map(),
    };
    this.searchCache.clear();
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

module.exports = { LogAggregator };

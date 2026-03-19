/**
 * Offline Sync Manager Service
 * خدمة إدارة المزامنة في وضع بلا إنترنت
 * 
 * المسؤوليات:
 * - إدارة قائمة انتظار العمليات بدون اتصال
 * - حل التعارضات عند المزامنة
 * - تتبع حالة البيانات
 * - ضغط البيانات للنقل
 * - إدارة المزامنة التلقائية
 */

const EventEmitter = require('events');
const uuid = require('crypto').randomUUID;
const { Logger } = require('../utils/logger');

class OfflineSyncManager extends EventEmitter {
  constructor() {
    super();
    this.syncQueue = new Map();
    this.dataCache = new Map();
    this.conflictLog = new Map();
    this.syncHistory = new Map();
    this.pendingOperations = new Map();
  }

  /**
   * إضافة عملية إلى قائمة الانتظار بدون اتصال
   * Queue offline operation
   */
  queueOperation(data) {
    try {
      const operationId = uuid();
      const operation = {
        id: operationId,
        userId: data.userId,
        deviceId: data.deviceId,
        type: data.type, // write, update, delete, patch
        resource: data.resource,
        resourceId: data.resourceId,
        payload: data.payload,
        timestamp: new Date(),
        status: 'pending',
        retries: 0,
        maxRetries: 3,
        checksum: this._generateChecksum(data),
        compressed: false,
        priority: data.priority || 'normal',
        dependencies: data.dependencies || [],
        metadata: {
          offlineQueuedAt: new Date(),
          attemptedAt: null,
          error: null,
        },
      };

      this.syncQueue.set(operationId, operation);

      Logger.info(`📤 Operation queued: ${operationId} (${data.type})`);

      this.emit('operation:queued', {
        operationId,
        type: data.type,
        resource: data.resource,
      });

      return operation;
    } catch (error) {
      Logger.error('Queue operation error:', error);
      throw error;
    }
  }

  /**
   * مزامنة العمليات المعلقة
   * Sync pending operations
   */
  async syncOperations(userId, deviceId) {
    try {
      const userOperations = Array.from(this.syncQueue.values())
        .filter(op => op.userId === userId && op.deviceId === deviceId)
        .sort((a, b) => {
          // Process by priority and timestamp
          const priorityMap = { high: 0, normal: 1, low: 2 };
          return priorityMap[a.priority] - priorityMap[b.priority] ||
                 a.timestamp - b.timestamp;
        });

      const results = {
        successful: [],
        failed: [],
        conflicts: [],
        totalCount: userOperations.length,
      };

      for (const operation of userOperations) {
        try {
          operation.status = 'syncing';
          operation.metadata.attemptedAt = new Date();

          const result = await this._executeOperation(operation);

          if (result.conflict) {
            operation.status = 'conflict';
            results.conflicts.push({
              operationId: operation.id,
              conflict: result.conflict,
            });

            this._logConflict(userId, operation, result.conflict);
          } else {
            operation.status = 'synced';
            this.syncQueue.delete(operation.id);
            results.successful.push(operation.id);
          }
        } catch (error) {
          operation.retries++;
          operation.metadata.error = error.message;

          if (operation.retries >= operation.maxRetries) {
            operation.status = 'failed';
            results.failed.push({
              operationId: operation.id,
              error: error.message,
            });
          } else {
            operation.status = 'pending';
          }
        }
      }

      this._recordSyncHistory(userId, deviceId, results);

      Logger.info(
        `🔄 Sync completed: ${results.successful.length} synced, ${results.failed.length} failed`
      );

      this.emit('sync:completed', {
        userId,
        deviceId,
        results,
      });

      return results;
    } catch (error) {
      Logger.error('Sync operations error:', error);
      throw error;
    }
  }

  /**
   * الحصول على العمليات المعلقة
   * Get pending operations
   */
  getPendingOperations(userId, deviceId) {
    return Array.from(this.syncQueue.values())
      .filter(op => op.userId === userId && op.deviceId === deviceId && op.status === 'pending')
      .map(op => ({
        id: op.id,
        type: op.type,
        resource: op.resource,
        timestamp: op.timestamp,
        priority: op.priority,
      }));
  }

  /**
   * ضغط البيانات للمزامنة
   * Compress data for sync
   */
  compressData(data) {
    try {
      // Simple compression: remove null/undefined values
      const compressed = JSON.stringify(this._removeNullValues(data));

      const compressionRatio = ((1 - compressed.length / JSON.stringify(data).length) * 100).toFixed(2);

      Logger.info(`📦 Data compressed: ${compressionRatio}% reduction`);

      return {
        compressed: Buffer.from(compressed).toString('base64'),
        ratio: parseFloat(compressionRatio),
        originalSize: JSON.stringify(data).length,
        compressedSize: compressed.length,
      };
    } catch (error) {
      Logger.error('Data compression error:', error);
      return { compressed: data, ratio: 0 };
    }
  }

  /**
   * فك ضغط البيانات
   * Decompress data
   */
  decompressData(compressedData) {
    try {
      const decompressed = JSON.parse(
        Buffer.from(compressedData, 'base64').toString('utf8')
      );
      return decompressed;
    } catch (error) {
      Logger.error('Data decompression error:', error);
      throw error;
    }
  }

  /**
   * حل التعارضات في البيانات
   * Resolve conflicts
   */
  resolveConflict(conflictData) {
    try {
      const {
        operationId,
        localData,
        remoteData,
        strategy = 'remote', // remote, local, merge
      } = conflictData;

      let resolved;

      switch (strategy) {
        case 'remote':
          resolved = remoteData;
          break;
        case 'local':
          resolved = localData;
          break;
        case 'merge':
          resolved = this._mergeData(localData, remoteData);
          break;
        default:
          resolved = remoteData;
      }

      const operation = this.syncQueue.get(operationId);
      if (operation) {
        operation.status = 'resolved';
        operation.resolvedData = resolved;
      }

      this.emit('conflict:resolved', {
        operationId,
        strategy,
        timestamp: new Date(),
      });

      return resolved;
    } catch (error) {
      Logger.error('Conflict resolution error:', error);
      throw error;
    }
  }

  /**
   * الحصول على سجل المزامنة
   * Get sync history
   */
  getSyncHistory(userId, deviceId, limit = 50) {
    const key = `${userId}:${deviceId}`;
    const history = this.syncHistory.get(key) || [];

    return history.slice(-limit).reverse();
  }

  /**
   * حول حالة المزامنة
   * Get sync status
   */
  getSyncStatus(userId, deviceId) {
    const pending = Array.from(this.syncQueue.values())
      .filter(op => op.userId === userId && op.deviceId === deviceId && op.status === 'pending')
      .length;

    const conflicts = Array.from(this.syncQueue.values())
      .filter(op => op.userId === userId && op.deviceId === deviceId && op.status === 'conflict')
      .length;

    const syncing = Array.from(this.syncQueue.values())
      .filter(op => op.userId === userId && op.deviceId === deviceId && op.status === 'syncing')
      .length;

    const history = this.getSyncHistory(userId, deviceId, 1);
    const lastSync = history.length > 0 ? history[0].timestamp : null;

    return {
      pending,
      conflicts,
      syncing,
      lastSync,
      queueSize: pending + syncing + conflicts,
    };
  }

  /**
   * مسح قائمة الانتظار
   * Clear sync queue
   */
  clearQueue(userId, deviceId) {
    let cleared = 0;

    for (const [operationId, operation] of this.syncQueue) {
      if (operation.userId === userId && operation.deviceId === deviceId) {
        this.syncQueue.delete(operationId);
        cleared++;
      }
    }

    Logger.info(`🗑️  Cleared ${cleared} operations from sync queue`);

    this.emit('queue:cleared', {
      userId,
      deviceId,
      operationsCleared: cleared,
    });

    return cleared;
  }

  /**
   * فعّل المزامنة التلقائية
   * Enable auto sync
   */
  enableAutoSync(userId, deviceId, intervalSeconds = 300) {
    const key = `${userId}:${deviceId}`;

    if (this.pendingOperations.has(key)) {
      clearInterval(this.pendingOperations.get(key).intervalId);
    }

    const intervalId = setInterval(async () => {
      await this.syncOperations(userId, deviceId);
    }, intervalSeconds * 1000);

    this.pendingOperations.set(key, {
      intervalId,
      enabled: true,
      interval: intervalSeconds,
      startedAt: new Date(),
    });

    Logger.info(`⚙️  Auto sync enabled for ${userId}/${deviceId} (${intervalSeconds}s)`);

    return { intervalId, enabled: true };
  }

  /**
   * عطّل المزامنة التلقائية
   * Disable auto sync
   */
  disableAutoSync(userId, deviceId) {
    const key = `${userId}:${deviceId}`;
    const autoSync = this.pendingOperations.get(key);

    if (autoSync) {
      clearInterval(autoSync.intervalId);
      this.pendingOperations.delete(key);
    }

    Logger.info(`⏸️  Auto sync disabled for ${userId}/${deviceId}`);

    return true;
  }

  /**
   * ===== Private Methods =====
   */

  /**
   * Execute operation
   */
  async _executeOperation(operation) {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          conflict: null,
        });
      }, 100);
    });
  }

  /**
   * Log conflict
   */
  _logConflict(userId, operation, conflict) {
    const key = `${userId}:${operation.deviceId}`;

    if (!this.conflictLog.has(key)) {
      this.conflictLog.set(key, []);
    }

    this.conflictLog.get(key).push({
      operationId: operation.id,
      type: operation.type,
      resource: operation.resource,
      conflict,
      timestamp: new Date(),
      resolved: false,
    });
  }

  /**
   * Record sync history
   */
  _recordSyncHistory(userId, deviceId, results) {
    const key = `${userId}:${deviceId}`;

    if (!this.syncHistory.has(key)) {
      this.syncHistory.set(key, []);
    }

    this.syncHistory.get(key).push({
      timestamp: new Date(),
      successful: results.successful.length,
      failed: results.failed.length,
      conflicts: results.conflicts.length,
      total: results.totalCount,
    });
  }

  /**
   * Generate checksum
   */
  _generateChecksum(data) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Remove null values for compression
   */
  _removeNullValues(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this._removeNullValues(item));
    }

    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .filter(key => obj[key] !== null && obj[key] !== undefined)
        .reduce((result, key) => {
          result[key] = this._removeNullValues(obj[key]);
          return result;
        }, {});
    }

    return obj;
  }

  /**
   * Merge data
   */
  _mergeData(local, remote) {
    const merged = { ...remote };

    for (const key in local) {
      if (local.hasOwnProperty(key) && typeof local[key] === 'object') {
        merged[key] = this._mergeData(local[key], remote[key] || {});
      }
    }

    return merged;
  }
}

module.exports = new OfflineSyncManager();

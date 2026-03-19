/**
 * Widget Persistence Service
 * خدمة حفظ الويدجط
 * 
 * المسؤوليات:
 * - حفظ واستعادة بيانات الويدجط في قاعدة البيانات
 * - إدارة التخزين المؤقت للأداء
 * - نسخ احتياطية تلقائية
 * - استيراد وتصدير الإعدادات
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

class WidgetPersistenceService extends EventEmitter {
  constructor() {
    super();
    this.logger = Logger;

    // Persistent storage (simulated database)
    this.storage = new Map();

    // In-memory cache
    this.cache = new Map();

    // Backup history
    this.backups = new Map();

    // Sync queue for offline support
    this.syncQueue = [];

    // Last sync timestamp
    this.lastSync = {};
  }

  /**
   * Save widget to database
   * حفظ الويدجت في قاعدة البيانات
   * 
   * @param {String} userId - User ID
   * @param {String} dashboardId - Dashboard ID
   * @param {Object} widgetData - Widget data
   * @returns {Object} Saved widget with ID
   */
  async saveWidget(userId, dashboardId, widgetData) {
    try {
      const widgetId = widgetData.id || uuidv4();

      const storageKey = `${userId}:${dashboardId}:${widgetId}`;

      const persistedWidget = {
        id: widgetId,
        userId,
        dashboardId,
        ...widgetData,
        metadata: {
          ...widgetData.metadata,
          savedAt: new Date(),
          syncStatus: 'synced',
          version: (widgetData.metadata?.version || 0) + 1
        }
      };

      // Save to storage
      this.storage.set(storageKey, persistedWidget);

      // Update cache
      this._updateCache(storageKey, persistedWidget);

      // Record sync
      this.lastSync[storageKey] = new Date();

      this.emit('widget:saved', { widgetId, dashboardId });
      this.logger.info(`Widget saved: ${widgetId}`);

      return persistedWidget;
    } catch (error) {
      this.logger.error(`Error saving widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load widget from database
   * تحميل الويدجت من قاعدة البيانات
   * 
   * @param {String} userId - User ID
   * @param {String} dashboardId - Dashboard ID
   * @param {String} widgetId - Widget ID
   * @returns {Object} Widget data
   */
  async loadWidget(userId, dashboardId, widgetId) {
    try {
      const storageKey = `${userId}:${dashboardId}:${widgetId}`;

      // Check cache first
      const cached = this.cache.get(storageKey);
      if (cached && this._isCacheValid(storageKey)) {
        this.logger.debug(`Widget loaded from cache: ${widgetId}`);
        return cached;
      }

      // Load from storage
      const widget = this.storage.get(storageKey);
      if (!widget) {
        throw new Error(`Widget not found: ${widgetId}`);
      }

      // Update cache
      this._updateCache(storageKey, widget);

      this.emit('widget:loaded', { widgetId, dashboardId });
      return widget;
    } catch (error) {
      this.logger.error(`Error loading widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load all widgets for dashboard
   * تحميل جميع الويدجطس للوحة المعلومات
   * 
   * @param {String} userId - User ID
   * @param {String} dashboardId - Dashboard ID
   * @returns {Array} Widgets
   */
  async loadDashboardWidgets(userId, dashboardId) {
    try {
      const prefix = `${userId}:${dashboardId}:`;
      const widgets = [];

      for (const [key, widget] of this.storage.entries()) {
        if (key.startsWith(prefix)) {
          widgets.push(widget);
        }
      }

      // Sort by creation date
      widgets.sort((a, b) => 
        new Date(a.metadata.savedAt) - new Date(b.metadata.savedAt)
      );

      this.logger.info(`Loaded ${widgets.length} widgets for dashboard: ${dashboardId}`);
      return widgets;
    } catch (error) {
      this.logger.error(`Error loading dashboard widgets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update widget data
   * تحديث بيانات الويدجت
   * 
   * @param {String} userId - User ID
   * @param {String} dashboardId - Dashboard ID
   * @param {String} widgetId - Widget ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated widget
   */
  async updateWidget(userId, dashboardId, widgetId, updates) {
    try {
      const storageKey = `${userId}:${dashboardId}:${widgetId}`;

      const widget = this.storage.get(storageKey);
      if (!widget) {
        throw new Error(`Widget not found: ${widgetId}`);
      }

      // Create backup before update
      const backup = JSON.parse(JSON.stringify(widget));
      this._saveBackup(`${widgetId}-backup`, backup);

      // Apply updates
      Object.assign(widget, updates);
      widget.metadata.updatedAt = new Date();
      widget.metadata.version++;
      widget.metadata.syncStatus = 'synced';

      // Save updated widget
      this.storage.set(storageKey, widget);
      this._updateCache(storageKey, widget);
      this.lastSync[storageKey] = new Date();

      this.emit('widget:updated', { widgetId, dashboardId, updates });
      this.logger.info(`Widget updated: ${widgetId}`);

      return widget;
    } catch (error) {
      this.logger.error(`Error updating widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete widget
   * حذف الويدجت
   * 
   * @param {String} userId - User ID
   * @param {String} dashboardId - Dashboard ID
   * @param {String} widgetId - Widget ID
   */
  async deleteWidget(userId, dashboardId, widgetId) {
    try {
      const storageKey = `${userId}:${dashboardId}:${widgetId}`;

      // Create backup before deletion
      const widget = this.storage.get(storageKey);
      if (widget) {
        this._saveBackup(`${widgetId}-deleted`, widget);
      }

      this.storage.delete(storageKey);
      this.cache.delete(storageKey);

      this.emit('widget:deleted', { widgetId, dashboardId });
      this.logger.info(`Widget deleted: ${widgetId}`);
    } catch (error) {
      this.logger.error(`Error deleting widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch save widgets
   * حفظ مجموعة من الويدجطس
   * 
   * @param {String} userId - User ID
   * @param {String} dashboardId - Dashboard ID
   * @param {Array} widgets - Widgets to save
   * @returns {Array} Saved widgets
   */
  async batchSaveWidgets(userId, dashboardId, widgets) {
    try {
      const saved = [];

      for (const widget of widgets) {
        const saved_widget = await this.saveWidget(userId, dashboardId, widget);
        saved.push(saved_widget);
      }

      this.emit('widgets:batchSaved', { dashboardId, count: saved.length });
      this.logger.info(`Batch saved ${saved.length} widgets`);

      return saved;
    } catch (error) {
      this.logger.error(`Error batch saving widgets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export dashboard configuration
   * تصدير إعدادات لوحة المعلومات
   * 
   * @param {String} userId - User ID
   * @param {String} dashboardId - Dashboard ID
   * @returns {Object} Exportable configuration
   */
  async exportDashboard(userId, dashboardId) {
    try {
      const widgets = await this.loadDashboardWidgets(userId, dashboardId);

      const config = {
        version: '1.0',
        exportedAt: new Date(),
        userId,
        dashboardId,
        widgetCount: widgets.length,
        widgets: widgets.map(w => ({
          type: w.type,
          title: w.title,
          config: w.config,
          position: w.position,
          size: w.size,
          refreshInterval: w.refreshInterval
        }))
      };

      this.emit('dashboard:exported', { dashboardId });
      this.logger.info(`Dashboard exported: ${dashboardId}`);

      return config;
    } catch (error) {
      this.logger.error(`Error exporting dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Import dashboard configuration
   * استيراد إعدادات لوحة المعلومات
   * 
   * @param {String} userId - User ID
   * @param {String} dashboardId - Dashboard ID
   * @param {Object} config - Configuration to import
   * @returns {Array} Imported widgets
   */
  async importDashboard(userId, dashboardId, config) {
    try {
      const { widgets } = config;

      if (!widgets || !Array.isArray(widgets)) {
        throw new Error('Invalid configuration format');
      }

      const imported = [];

      for (const widgetConfig of widgets) {
        const widget = await this.saveWidget(userId, dashboardId, {
          id: uuidv4(),
          ...widgetConfig
        });
        imported.push(widget);
      }

      this.emit('dashboard:imported', { dashboardId, count: imported.length });
      this.logger.info(`Dashboard imported: ${dashboardId} with ${imported.length} widgets`);

      return imported;
    } catch (error) {
      this.logger.error(`Error importing dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create automatic backup
   * إنشاء نسخة احتياطية تلقائية
   * 
   * @param {String} userId - User ID
   * @param {String} dashboardId - Dashboard ID
   * @returns {String} Backup ID
   */
  async createBackup(userId, dashboardId) {
    try {
      const widgets = await this.loadDashboardWidgets(userId, dashboardId);
      const backupId = `backup-${uuidv4()}`;

      const backup = {
        id: backupId,
        userId,
        dashboardId,
        widgets,
        createdAt: new Date(),
        size: JSON.stringify(widgets).length
      };

      this._saveBackup(backupId, backup);

      // Keep only last 10 backups
      const backupKey = `${userId}:${dashboardId}`;
      const backups = this.backups.get(backupKey) || [];
      backups.push(backupId);

      if (backups.length > 10) {
        const oldBackupId = backups.shift();
        const oldBackup = this.backups.get(oldBackupId);
        if (oldBackup) {
          this.backups.delete(oldBackupId);
        }
      }

      this.backups.set(backupKey, backups);

      this.emit('backup:created', { backupId, dashboardId });
      this.logger.info(`Backup created: ${backupId}`);

      return backupId;
    } catch (error) {
      this.logger.error(`Error creating backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore from backup
   * الاستعادة من نسخة احتياطية
   * 
   * @param {String} userId - User ID
   * @param {String} dashboardId - Dashboard ID
   * @param {String} backupId - Backup ID
   * @returns {Array} Restored widgets
   */
  async restoreFromBackup(userId, dashboardId, backupId) {
    try {
      const backup = this.backups.get(backupId);
      if (!backup) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      // Clear existing widgets
      const prefix = `${userId}:${dashboardId}:`;
      for (const [key] of this.storage.entries()) {
        if (key.startsWith(prefix)) {
          this.storage.delete(key);
          this.cache.delete(key);
        }
      }

      // Restore widgets
      const restored = [];
      for (const widget of backup.widgets) {
        const saved = await this.saveWidget(userId, dashboardId, widget);
        restored.push(saved);
      }

      this.emit('backup:restored', { backupId, dashboardId });
      this.logger.info(`Backup restored: ${backupId}`);

      return restored;
    } catch (error) {
      this.logger.error(`Error restoring backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get storage statistics
   * الحصول على إحصائيات التخزين
   * 
   * @returns {Object} Storage stats
   */
  getStorageStats() {
    try {
      const stats = {
        totalWidgets: this.storage.size,
        cachedWidgets: this.cache.size,
        totalBackups: this.backups.size,
        totalSyncQueue: this.syncQueue.length,
        cacheHitRate: this.cache.size > 0 
          ? ((this.cache.size / (this.cache.size + this.storage.size)) * 100).toFixed(2)
          : 0,
        estimatedSize: this._estimateStorageSize()
      };

      return stats;
    } catch (error) {
      this.logger.error(`Error getting storage stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear cache
   * مسح الذاكرة المؤقتة
   * 
   * @params {String} storageKey - Optional specific key to clear
   */
  clearCache(storageKey = null) {
    try {
      if (storageKey) {
        this.cache.delete(storageKey);
        this.logger.info(`Cache cleared for: ${storageKey}`);
      } else {
        this.cache.clear();
        this.logger.info('All cache cleared');
      }

      this.emit('cache:cleared');
    } catch (error) {
      this.logger.error(`Error clearing cache: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue operation for offline sync
   * إضافة عملية في قائمة الانتظار للمزامنة بدون اتصال
   * 
   * @param {Object} operation - Operation to queue
   */
  queueOperation(operation) {
    try {
      const {
        type,
        userId,
        dashboardId,
        widgetId,
        data
      } = operation;

      const queuedOp = {
        id: uuidv4(),
        type,
        userId,
        dashboardId,
        widgetId,
        data,
        timestamp: new Date(),
        status: 'pending',
        retries: 0
      };

      this.syncQueue.push(queuedOp);

      this.emit('operation:queued', { operationId: queuedOp.id });
      this.logger.info(`Operation queued: ${type}`);

      return queuedOp.id;
    } catch (error) {
      this.logger.error(`Error queuing operation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process sync queue
   * معالجة قائمة الانتظار للمزامنة
   * 
   * @returns {Object} Sync result
   */
  async processSyncQueue() {
    try {
      const results = {
        successful: 0,
        failed: 0,
        pending: this.syncQueue.filter(op => op.status === 'pending').length,
        operations: []
      };

      for (const operation of this.syncQueue) {
        if (operation.status === 'pending') {
          try {
            // Process operation
            operation.status = 'synced';
            results.successful++;
            results.operations.push({ id: operation.id, status: 'synced' });
          } catch (error) {
            operation.retries++;
            if (operation.retries >= 3) {
              operation.status = 'failed';
              results.failed++;
            }
          }
        }
      }

      // Remove completed operations
      this.syncQueue = this.syncQueue.filter(op => op.status === 'pending');

      this.emit('syncQueue:processed', results);
      this.logger.info(`Sync queue processed: ${results.successful} successful, ${results.failed} failed`);

      return results;
    } catch (error) {
      this.logger.error(`Error processing sync queue: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update cache
   * تحديث الذاكرة المؤقتة
   * 
   * @private
   */
  _updateCache(storageKey, widget) {
    this.cache.set(storageKey, {
      data: widget,
      timestamp: new Date(),
      ttl: 5 * 60 * 1000  // 5 minutes
    });
  }

  /**
   * Check if cache is valid
   * التحقق من صحة الذاكرة المؤقتة
   * 
   * @private
   */
  _isCacheValid(storageKey) {
    const cached = this.cache.get(storageKey);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age < cached.ttl;
  }

  /**
   * Save backup
   * حفظ نسخة احتياطية
   * 
   * @private
   */
  _saveBackup(backupId, backup) {
    this.backups.set(backupId, backup);
  }

  /**
   * Estimate storage size
   * تقدير حجم التخزين
   * 
   * @private
   */
  _estimateStorageSize() {
    let totalSize = 0;

    for (const [, widget] of this.storage.entries()) {
      totalSize += JSON.stringify(widget).length;
    }

    return `${(totalSize / 1024).toFixed(2)} KB`;
  }
}

module.exports = new WidgetPersistenceService();

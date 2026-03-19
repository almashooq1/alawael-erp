/**
 * Widget Manager Service
 * خدمة إدارة الويدجطs المخصصة للوحة المعلومات
 * 
 * المسؤوليات:
 * - إنشاء وتحديث أنواع الويدجت المختلفة
 * - إدارة خصائص وإعدادات الويدجت
 * - تحديث البيانات الفعلية للويدجت
 * - التعامل مع تحديثات الويدجت المباشرة
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

class WidgetManager extends EventEmitter {
  constructor() {
    super();
    this.logger = Logger;
    
    // Widget template types
    this.widgetTypes = {
      'KPI': {
        name: 'Key Performance Indicator',
        fields: ['title', 'metric', 'value', 'target', 'trend'],
        defaultSize: { width: 2, height: 1 },
        icon: '📊',
        category: 'analytics'
      },
      'CHART': {
        name: 'Chart Widget',
        fields: ['title', 'chartType', 'data', 'labels'],
        defaultSize: { width: 3, height: 2 },
        icon: '📈',
        category: 'visualization'
      },
      'TABLE': {
        name: 'Data Table',
        fields: ['title', 'columns', 'data', 'pageSize'],
        defaultSize: { width: 4, height: 3 },
        icon: '📋',
        category: 'data'
      },
      'GAUGE': {
        name: 'Gauge Chart',
        fields: ['title', 'value', 'min', 'max', 'unit'],
        defaultSize: { width: 2, height: 2 },
        icon: '🎯',
        category: 'visualization'
      },
      'CARD': {
        name: 'Info Card',
        fields: ['title', 'description', 'icon', 'color'],
        defaultSize: { width: 2, height: 1 },
        icon: '🎴',
        category: 'display'
      },
      'TIMELINE': {
        name: 'Timeline Widget',
        fields: ['title', 'events', 'startDate', 'endDate'],
        defaultSize: { width: 3, height: 2 },
        icon: '⏱️',
        category: 'tracking'
      },
      'HEATMAP': {
        name: 'Heatmap Widget',
        fields: ['title', 'data', 'colorScheme'],
        defaultSize: { width: 3, height: 2 },
        icon: '🔥',
        category: 'visualization'
      },
      'CUSTOM': {
        name: 'Custom Widget',
        fields: ['title', 'content', 'html', 'css', 'javascript'],
        defaultSize: { width: 2, height: 2 },
        icon: '⚙️',
        category: 'advanced'
      }
    };
    
    // Active widget instances
    this.widgets = new Map();
    
    // Widget subscriptions for real-time updates
    this.subscriptions = new Map();
    
    // Real-time update queue
    this.updateQueue = [];
    this.updateProcessing = false;
  }

  /**
   * Create a new widget
   * إنشاء ويدجت جديد
   * 
   * @param {Object} widgetData - Widget data
   * @returns {Object} Created widget
   */
  createWidget(widgetData) {
    try {
      const {
        userId,
        dashboardId,
        type,
        title,
        config,
        position,
        size,
        refreshInterval = 5000
      } = widgetData;

      // Validate widget type
      if (!this.widgetTypes[type]) {
        throw new Error(`Invalid widget type: ${type}`);
      }

      const widgetId = uuidv4();
      const widgetTemplate = this.widgetTypes[type];

      const widget = {
        id: widgetId,
        userId,
        dashboardId,
        type,
        title: title || widgetTemplate.name,
        config: {
          ...config,
          icon: widgetTemplate.icon
        },
        position: position || { x: 0, y: 0 },
        size: size || widgetTemplate.defaultSize,
        refreshInterval,
        data: null,
        lastUpdated: null,
        status: 'idle',
        errorCount: 0,
        warnings: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          version: 1
        }
      };

      this.widgets.set(widgetId, widget);
      this.emit('widget:created', { widgetId, widget });

      this.logger.info(`Widget created: ${widgetId} (Type: ${type})`);
      return widget;
    } catch (error) {
      this.logger.error(`Error creating widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update widget configuration
   * تحديث إعدادات الويدجت
   * 
   * @param {String} widgetId - Widget ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated widget
   */
  updateWidget(widgetId, updates) {
    try {
      const widget = this.widgets.get(widgetId);
      if (!widget) {
        throw new Error(`Widget not found: ${widgetId}`);
      }

      // Update allowed fields
      const allowedFields = ['title', 'config', 'position', 'size', 'refreshInterval'];
      
      allowedFields.forEach(field => {
        if (field in updates) {
          if (field === 'config') {
            widget.config = { ...widget.config, ...updates[field] };
          } else {
            widget[field] = updates[field];
          }
        }
      });

      widget.metadata.updatedAt = new Date();
      widget.metadata.version++;

      this.emit('widget:updated', { widgetId, updates });
      this.logger.info(`Widget updated: ${widgetId}`);
      return widget;
    } catch (error) {
      this.logger.error(`Error updating widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update widget data in real-time
   * تحديث بيانات الويدجت بشكل فعلي
   * 
   * @param {String} widgetId - Widget ID
   * @param {Object} data - New data
   * @param {Boolean} immediate - Process immediately or queue
   */
  updateWidgetData(widgetId, data, immediate = false) {
    try {
      const widget = this.widgets.get(widgetId);
      if (!widget) {
        throw new Error(`Widget not found: ${widgetId}`);
      }

      const updateRecord = {
        widgetId,
        data,
        timestamp: new Date(),
        version: widget.metadata.version
      };

      if (immediate) {
        this._processWidgetUpdate(updateRecord);
      } else {
        this.updateQueue.push(updateRecord);
        this._processQueue();
      }
    } catch (error) {
      this.logger.error(`Error updating widget data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process queued widget updates
   * معالجة تحديثات الويدجت المقطوعة
   * 
   * @private
   */
  _processQueue() {
    if (this.updateProcessing || this.updateQueue.length === 0) {
      return;
    }

    this.updateProcessing = true;

    // Process in batches of 10
    const batch = this.updateQueue.splice(0, 10);
    batch.forEach(update => this._processWidgetUpdate(update));

    this.updateProcessing = false;

    if (this.updateQueue.length > 0) {
      setImmediate(() => this._processQueue());
    }
  }

  /**
   * Process individual widget update
   * معالجة تحديث ويدجت واحد
   * 
   * @private
   */
  _processWidgetUpdate(updateRecord) {
    try {
      const { widgetId, data, timestamp } = updateRecord;
      const widget = this.widgets.get(widgetId);

      if (!widget) return;

      widget.data = data;
      widget.lastUpdated = timestamp;
      widget.status = 'updated';
      widget.errorCount = 0;

      this.emit('widget:dataUpdated', {
        widgetId,
        data,
        timestamp
      });
    } catch (error) {
      this.logger.error(`Error processing widget update: ${error.message}`);
    }
  }

  /**
   * Subscribe to widget updates
   * الاشتراك في تحديثات الويدجت
   * 
   * @param {String} widgetId - Widget ID
   * @param {Function} callback - Update callback
   * @returns {String} Subscription ID
   */
  subscribeToWidget(widgetId, callback) {
    try {
      const subscriptionId = uuidv4();
      
      if (!this.subscriptions.has(widgetId)) {
        this.subscriptions.set(widgetId, []);
      }

      this.subscriptions.get(widgetId).push({
        id: subscriptionId,
        callback,
        subscribedAt: new Date()
      });

      this.logger.info(`Subscription created: ${subscriptionId} for widget ${widgetId}`);
      return subscriptionId;
    } catch (error) {
      this.logger.error(`Error subscribing to widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unsubscribe from widget updates
   * إلغاء الاشتراك في تحديثات الويدجت
   * 
   * @param {String} widgetId - Widget ID
   * @param {String} subscriptionId - Subscription ID
   */
  unsubscribeFromWidget(widgetId, subscriptionId) {
    try {
      const subs = this.subscriptions.get(widgetId);
      if (!subs) return;

      const index = subs.findIndex(s => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        this.logger.info(`Subscription removed: ${subscriptionId}`);
      }
    } catch (error) {
      this.logger.error(`Error unsubscribing: ${error.message}`);
    }
  }

  /**
   * Batch update widget data
   * تحديث دفعة من بيانات الويدجت
   * 
   * @param {Object} updates - { widgetId: data }
   */
  batchUpdateWidgets(updates) {
    try {
      const results = [];
      
      Object.entries(updates).forEach(([widgetId, data]) => {
        const widget = this.widgets.get(widgetId);
        if (widget) {
          widget.data = data;
          widget.lastUpdated = new Date();
          widget.status = 'updated';
          results.push({ widgetId, success: true });
          this.emit('widget:dataUpdated', { widgetId, data });
        }
      });

      this.logger.info(`Batch updated ${results.length} widgets`);
      return results;
    } catch (error) {
      this.logger.error(`Error batch updating widgets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get widget by ID
   * الحصول على ويدجت بـ ID
   * 
   * @param {String} widgetId - Widget ID
   * @returns {Object} Widget
   */
  getWidget(widgetId) {
    try {
      const widget = this.widgets.get(widgetId);
      if (!widget) {
        throw new Error(`Widget not found: ${widgetId}`);
      }
      return widget;
    } catch (error) {
      this.logger.error(`Error getting widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all widgets for dashboard
   * الحصول على جميع الويدجطس للوحة المعلومات
   * 
   * @param {String} dashboardId - Dashboard ID
   * @returns {Array} Widgets
   */
  getDashboardWidgets(dashboardId) {
    try {
      const widgets = Array.from(this.widgets.values()).filter(
        w => w.dashboardId === dashboardId
      );
      return widgets;
    } catch (error) {
      this.logger.error(`Error getting dashboard widgets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get widgets by type
   * الحصول على الويدجطس حسب النوع
   * 
   * @param {String} type - Widget type
   * @returns {Array} Widgets
   */
  getWidgetsByType(type) {
    try {
      const widgets = Array.from(this.widgets.values()).filter(
        w => w.type === type
      );
      return widgets;
    } catch (error) {
      this.logger.error(`Error getting widgets by type: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete widget
   * حذف ويدجت
   * 
   * @param {String} widgetId - Widget ID
   */
  deleteWidget(widgetId) {
    try {
      const widget = this.widgets.get(widgetId);
      if (!widget) {
        throw new Error(`Widget not found: ${widgetId}`);
      }

      // Remove subscriptions
      this.subscriptions.delete(widgetId);

      // Remove widget
      this.widgets.delete(widgetId);

      this.emit('widget:deleted', { widgetId, widget });
      this.logger.info(`Widget deleted: ${widgetId}`);
    } catch (error) {
      this.logger.error(`Error deleting widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reorder widget position
   * إعادة ترتيب موضع الويدجت
   * 
   * @param {String} widgetId - Widget ID
   * @param {Object} position - New position { x, y }
   */
  reorderWidget(widgetId, position) {
    try {
      const widget = this.widgets.get(widgetId);
      if (!widget) {
        throw new Error(`Widget not found: ${widgetId}`);
      }

      widget.position = position;
      widget.metadata.updatedAt = new Date();

      this.emit('widget:reordered', { widgetId, position });
      this.logger.info(`Widget reordered: ${widgetId}`);
    } catch (error) {
      this.logger.error(`Error reordering widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Resize widget
   * تغيير حجم الويدجت
   * 
   * @param {String} widgetId - Widget ID
   * @param {Object} size - New size { width, height }
   */
  resizeWidget(widgetId, size) {
    try {
      const widget = this.widgets.get(widgetId);
      if (!widget) {
        throw new Error(`Widget not found: ${widgetId}`);
      }

      // Validate minimum size
      if (size.width < 1 || size.height < 1) {
        throw new Error('Minimum widget size is 1x1');
      }

      widget.size = size;
      widget.metadata.updatedAt = new Date();

      this.emit('widget:resized', { widgetId, size });
      this.logger.info(`Widget resized: ${widgetId}`);
    } catch (error) {
      this.logger.error(`Error resizing widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get widget availability stats
   * الحصول على إحصائيات توفر الويدجت
   * 
   * @returns {Object} Statistics
   */
  getWidgetStats() {
    try {
      const stats = {
        totalWidgets: this.widgets.size,
        byType: {},
        activeSubscriptions: 0,
        queuedUpdates: this.updateQueue.length,
        types: Object.keys(this.widgetTypes)
      };

      // Count by type
      this.widgets.forEach(widget => {
        stats.byType[widget.type] = (stats.byType[widget.type] || 0) + 1;
      });

      // Count subscriptions
      this.subscriptions.forEach(subs => {
        stats.activeSubscriptions += subs.length;
      });

      return stats;
    } catch (error) {
      this.logger.error(`Error getting widget stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available widget types
   * الحصول على أنواع الويدجط المتاحة
   * 
   * @returns {Object} Widget types
   */
  getAvailableTypes() {
    try {
      const types = {};
      
      Object.entries(this.widgetTypes).forEach(([key, value]) => {
        types[key] = {
          name: value.name,
          icon: value.icon,
          defaultSize: value.defaultSize,
          category: value.category,
          fields: value.fields
        };
      });

      return types;
    } catch (error) {
      this.logger.error(`Error getting available types: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate widget data
   * التحقق من صحة بيانات الويدجت
   * 
   * @param {Object} widgetData - Widget data
   * @returns {Object} Validation result
   */
  validateWidget(widgetData) {
    try {
      const { type, title, config } = widgetData;
      const errors = [];
      const warnings = [];

      // Check type
      if (!this.widgetTypes[type]) {
        errors.push(`Invalid widget type: ${type}`);
      }

      // Check title
      if (!title || title.length === 0) {
        warnings.push('Widget title is empty');
      }

      if (title && title.length > 100) {
        warnings.push('Widget title is longer than 100 characters');
      }

      // Check config
      if (!config || typeof config !== 'object') {
        errors.push('Config must be an object');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      this.logger.error(`Error validating widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clone widget
   * نسخ ويدجت
   * 
   * @param {String} widgetId - Widget ID to clone
   * @param {Object} newData - New widget data
   * @returns {Object} New widget
   */
  cloneWidget(widgetId, newData = {}) {
    try {
      const original = this.widgets.get(widgetId);
      if (!original) {
        throw new Error(`Widget not found: ${widgetId}`);
      }

      const cloned = {
        ...original,
        id: uuidv4(),
        title: newData.title || `${original.title} (Copy)`,
        position: newData.position || { x: original.position.x + 1, y: original.position.y + 1 },
        metadata: {
          ...original.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1
        }
      };

      this.widgets.set(cloned.id, cloned);
      this.emit('widget:cloned', { original: widgetId, cloned: cloned.id });

      return cloned;
    } catch (error) {
      this.logger.error(`Error cloning widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export widgets configuration
   * تصدير إعدادات الويدجط
   * 
   * @param {String} dashboardId - Dashboard ID
   * @returns {Array} Widgets configuration
   */
  exportWidgets(dashboardId) {
    try {
      const widgets = this.getDashboardWidgets(dashboardId);
      return widgets.map(w => ({
        type: w.type,
        title: w.title,
        config: w.config,
        position: w.position,
        size: w.size,
        refreshInterval: w.refreshInterval
      }));
    } catch (error) {
      this.logger.error(`Error exporting widgets: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new WidgetManager();

/**
 * Dashboard Configuration Service
 * خدمة إعدادات لوحة المعلومات
 * 
 * المسؤوليات:
 * - إدارة إعدادات لوحات المعلومات
 * - حفظ واستعادة تكوينات الوحات
 * - نسخ احتياطية وإصدارات الإعدادات
 * - Undo/Redo للتغييرات
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

class DashboardConfigurationService extends EventEmitter {
  constructor() {
    super();
    this.logger = Logger;

    // Dashboard configurations
    this.dashboards = new Map();

    // Configuration history for undo/redo
    this.history = new Map();

    // Snapshots for quick restore
    this.snapshots = new Map();

    // Theme configurations
    this.themes = this._initializeThemes();
  }

  /**
   * Initialize theme templates
   * تهيئة قوالب المواضيع
   * 
   * @private
   */
  _initializeThemes() {
    return {
      'light': {
        name: 'Light Theme',
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          success: '#28a745',
          danger: '#dc3545',
          warning: '#ffc107',
          info: '#17a2b8',
          background: '#ffffff',
          text: '#000000'
        },
        fonts: {
          primary: 'Segoe UI',
          secondary: 'Arial'
        }
      },
      'dark': {
        name: 'Dark Theme',
        colors: {
          primary: '#4a9eff',
          secondary: '#b0b0b0',
          success: '#2ecc71',
          danger: '#e74c3c',
          warning: '#f39c12',
          info: '#3498db',
          background: '#1a1a1a',
          text: '#ffffff'
        },
        fonts: {
          primary: 'Segoe UI',
          secondary: 'Arial'
        }
      },
      'professional': {
        name: 'Professional Theme',
        colors: {
          primary: '#1f4788',
          secondary: '#4a5568',
          success: '#3d7e2a',
          danger: '#c53030',
          warning: '#b7860b',
          info: '#2c5aa0',
          background: '#f5f7fa',
          text: '#2d3748'
        },
        fonts: {
          primary: 'Inter',
          secondary: 'Roboto'
        }
      }
    };
  }

  /**
   * Create new dashboard configuration
   * إنشاء تكوين لوحة معلومات جديد
   * 
   * @param {Object} configData - Configuration data
   * @returns {Object} Created dashboard
   */
  createDashboard(configData) {
    try {
      const {
        userId,
        name,
        description,
        theme = 'light',
        gridSize = 12,
        widgets = [],
        isPublic = false
      } = configData;

      // Validate required fields
      if (!name) throw new Error('Dashboard name is required');

      const dashboardId = uuidv4();

      const dashboard = {
        id: dashboardId,
        userId,
        name,
        description: description || '',
        theme,
        gridSize,
        widgets,
        layout: 'grid',
        refreshInterval: 30000, // 30 seconds default
        autoRefresh: true,
        isPublic,
        locked: false,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          viewCount: 0,
          lastViewedBy: [],
          collaborators: [userId]
        },
        permissions: {
          canEdit: [userId],
          canView: [userId],
          canShare: [userId]
        }
      };

      this.dashboards.set(dashboardId, dashboard);

      // Initialize history for this dashboard
      this.history.set(dashboardId, [{
        version: 1,
        timestamp: new Date(),
        changes: [],
        snapshot: JSON.parse(JSON.stringify(dashboard))
      }]);

      this.emit('dashboard:created', { dashboardId, dashboard });
      this.logger.info(`Dashboard created: ${dashboardId}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Error creating dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update dashboard configuration
   * تحديث إعدادات لوحة المعلومات
   * 
   * @param {String} dashboardId - Dashboard ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated dashboard
   */
  updateDashboard(dashboardId, updates) {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      // Create backup before update
      const backup = JSON.parse(JSON.stringify(dashboard));

      // Update allowed fields
      const allowedFields = ['name', 'description', 'theme', 'gridSize', 'refreshInterval', 'autoRefresh', 'layout', 'isPublic'];

      allowedFields.forEach(field => {
        if (field in updates) {
          dashboard[field] = updates[field];
        }
      });

      dashboard.metadata.updatedAt = new Date();

      // Record in history
      this._addToHistory(dashboardId, {
        changes: Object.keys(updates),
        previousValues: backup
      });

      this.emit('dashboard:updated', { dashboardId, updates });
      this.logger.info(`Dashboard updated: ${dashboardId}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Error updating dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add widget to dashboard
   * إضافة ويدجت إلى لوحة المعلومات
   * 
   * @param {String} dashboardId - Dashboard ID
   * @param {Object} widgetData - Widget data
   * @returns {Object} Updated dashboard
   */
  addWidget(dashboardId, widgetData) {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      dashboard.widgets.push(widgetData);
      dashboard.metadata.updatedAt = new Date();

      this._addToHistory(dashboardId, {
        changes: ['widgets'],
        action: 'widget:added',
        widgetData
      });

      this.emit('dashboard:widgetAdded', { dashboardId, widget: widgetData });
      this.logger.info(`Widget added to dashboard: ${dashboardId}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Error adding widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove widget from dashboard
   * إزالة ويدجت من لوحة المعلومات
   * 
   * @param {String} dashboardId - Dashboard ID
   * @param {String} widgetId - Widget ID
   * @returns {Object} Updated dashboard
   */
  removeWidget(dashboardId, widgetId) {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      const index = dashboard.widgets.findIndex(w => w.id === widgetId);
      if (index === -1) {
        throw new Error(`Widget not found: ${widgetId}`);
      }

      const removed = dashboard.widgets.splice(index, 1)[0];
      dashboard.metadata.updatedAt = new Date();

      this._addToHistory(dashboardId, {
        changes: ['widgets'],
        action: 'widget:removed',
        widgetId
      });

      this.emit('dashboard:widgetRemoved', { dashboardId, widgetId });
      this.logger.info(`Widget removed from dashboard: ${dashboardId}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Error removing widget: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reorder widgets on dashboard
   * إعادة ترتيب الويدجطس على لوحة المعلومات
   * 
   * @param {String} dashboardId - Dashboard ID
   * @param {Array} newOrder - New widget order
   * @returns {Object} Updated dashboard
   */
  reorderWidgets(dashboardId, newOrder) {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      dashboard.widgets = newOrder;
      dashboard.metadata.updatedAt = new Date();

      this._addToHistory(dashboardId, {
        changes: ['widgets'],
        action: 'widgets:reordered'
      });

      this.emit('dashboard:reordered', { dashboardId });
      this.logger.info(`Dashboard reordered: ${dashboardId}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Error reordering widgets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get dashboard by ID
   * الحصول على لوحة المعلومات بـ ID
   * 
   * @param {String} dashboardId - Dashboard ID
   * @returns {Object} Dashboard
   */
  getDashboard(dashboardId) {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      // Track view
      dashboard.metadata.viewCount++;
      dashboard.metadata.lastViewedBy.push({
        timestamp: new Date(),
        viewDuration: 0
      });

      return dashboard;
    } catch (error) {
      this.logger.error(`Error getting dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's dashboards
   * الحصول على لوحات المستخدم
   * 
   * @param {String} userId - User ID
   * @returns {Array} Dashboards
   */
  getUserDashboards(userId) {
    try {
      const dashboards = Array.from(this.dashboards.values()).filter(
        d => d.userId === userId || d.permissions.canView.includes(userId)
      );

      return dashboards.sort((a, b) => 
        b.metadata.updatedAt - a.metadata.updatedAt
      );
    } catch (error) {
      this.logger.error(`Error getting user dashboards: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete dashboard
   * حذف لوحة المعلومات
   * 
   * @param {String} dashboardId - Dashboard ID
   */
  deleteDashboard(dashboardId) {
    try {
      if (!this.dashboards.has(dashboardId)) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      this.dashboards.delete(dashboardId);
      this.history.delete(dashboardId);
      this.snapshots.delete(dashboardId);

      this.emit('dashboard:deleted', { dashboardId });
      this.logger.info(`Dashboard deleted: ${dashboardId}`);
    } catch (error) {
      this.logger.error(`Error deleting dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply theme to dashboard
   * تطبيق موضوع على لوحة المعلومات
   * 
   * @param {String} dashboardId - Dashboard ID
   * @param {String} themeName - Theme name
   * @returns {Object} Updated dashboard
   */
  applyTheme(dashboardId, themeName) {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      if (!this.themes[themeName]) {
        throw new Error(`Theme not found: ${themeName}`);
      }

      dashboard.theme = themeName;
      dashboard.metadata.updatedAt = new Date();

      this._addToHistory(dashboardId, {
        changes: ['theme'],
        action: 'theme:applied',
        theme: themeName
      });

      this.emit('dashboard:themeApplied', { dashboardId, theme: themeName });
      this.logger.info(`Theme applied to dashboard: ${dashboardId}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Error applying theme: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available themes
   * الحصول على المواضيع المتاحة
   * 
   * @returns {Object} Themes
   */
  getAvailableThemes() {
    try {
      return Object.entries(this.themes).map(([key, value]) => ({
        id: key,
        name: value.name,
        colors: value.colors
      }));
    } catch (error) {
      this.logger.error(`Error getting themes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create snapshot of dashboard
   * إنشاء صورة حفظ للوحة المعلومات
   * 
   * @param {String} dashboardId - Dashboard ID
   * @param {String} name - Snapshot name
   * @returns {String} Snapshot ID
   */
  createSnapshot(dashboardId, name = '') {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      const snapshotId = uuidv4();

      const snapshot = {
        id: snapshotId,
        dashboardId,
        name: name || `Snapshot ${new Date().toLocaleString()}`,
        data: JSON.parse(JSON.stringify(dashboard)),
        createdAt: new Date()
      };

      if (!this.snapshots.has(dashboardId)) {
        this.snapshots.set(dashboardId, []);
      }

      this.snapshots.get(dashboardId).push(snapshot);

      // Keep only last 20 snapshots
      const snaps = this.snapshots.get(dashboardId);
      if (snaps.length > 20) {
        snaps.shift();
      }

      this.emit('snapshot:created', { dashboardId, snapshotId });
      this.logger.info(`Snapshot created: ${snapshotId}`);
      return snapshotId;
    } catch (error) {
      this.logger.error(`Error creating snapshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore dashboard from snapshot
   * استعادة لوحة المعلومات من صورة حفظ
   * 
   * @param {String} dashboardId - Dashboard ID
   * @param {String} snapshotId - Snapshot ID
   * @returns {Object} Restored dashboard
   */
  restoreSnapshot(dashboardId, snapshotId) {
    try {
      const snapshots = this.snapshots.get(dashboardId);
      if (!snapshots) {
        throw new Error('No snapshots found for dashboard');
      }

      const snapshot = snapshots.find(s => s.id === snapshotId);
      if (!snapshot) {
        throw new Error(`Snapshot not found: ${snapshotId}`);
      }

      const dashboard = this.dashboards.get(dashboardId);
      const backup = JSON.parse(JSON.stringify(dashboard));

      // Copy snapshot data
      Object.assign(dashboard, JSON.parse(JSON.stringify(snapshot.data)));
      dashboard.metadata.updatedAt = new Date();

      this._addToHistory(dashboardId, {
        changes: ['all'],
        action: 'snapshot:restored',
        snapshotId
      });

      this.emit('snapshot:restored', { dashboardId, snapshotId });
      this.logger.info(`Snapshot restored: ${snapshotId}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Error restoring snapshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get snapshots for dashboard
   * الحصول على صور الحفظ للوحة المعلومات
   * 
   * @param {String} dashboardId - Dashboard ID
   * @returns {Array} Snapshots
   */
  getSnapshots(dashboardId) {
    try {
      const snapshots = this.snapshots.get(dashboardId) || [];
      return snapshots.map(s => ({
        id: s.id,
        name: s.name,
        createdAt: s.createdAt
      }));
    } catch (error) {
      this.logger.error(`Error getting snapshots: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add to history
   * إضافة إلى السجل
   * 
   * @private
   */
  _addToHistory(dashboardId, record) {
    try {
      const dashboardHistory = this.history.get(dashboardId) || [];
      const lastVersion = dashboardHistory[dashboardHistory.length - 1]?.version || 0;

      dashboardHistory.push({
        version: lastVersion + 1,
        timestamp: new Date(),
        ...record,
        snapshot: JSON.parse(JSON.stringify(this.dashboards.get(dashboardId)))
      });

      // Keep only last 50 versions
      if (dashboardHistory.length > 50) {
        dashboardHistory.shift();
      }

      this.history.set(dashboardId, dashboardHistory);
    } catch (error) {
      this.logger.error(`Error adding to history: ${error.message}`);
    }
  }

  /**
   * Get history for dashboard
   * الحصول على السجل للوحة المعلومات
   * 
   * @param {String} dashboardId - Dashboard ID
   * @param {Number} limit - Result limit
   * @returns {Array} History
   */
  getHistory(dashboardId, limit = 10) {
    try {
      const history = this.history.get(dashboardId) || [];
      return history.slice(-limit).map(h => ({
        version: h.version,
        timestamp: h.timestamp,
        changes: h.changes,
        action: h.action
      }));
    } catch (error) {
      this.logger.error(`Error getting history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Undo last change
   * التراجع عن آخر تغيير
   * 
   * @param {String} dashboardId - Dashboard ID
   * @returns {Object} Restored dashboard
   */
  undo(dashboardId) {
    try {
      const history = this.history.get(dashboardId) || [];
      if (history.length < 2) {
        throw new Error('No undo history available');
      }

      // Go back to previous version
      const previousVersion = history[history.length - 2];
      const dashboard = this.dashboards.get(dashboardId);

      Object.assign(dashboard, JSON.parse(JSON.stringify(previousVersion.snapshot)));
      dashboard.metadata.updatedAt = new Date();

      // Remove last history entry
      history.pop();

      this.emit('dashboard:undone', { dashboardId });
      this.logger.info(`Change undone for dashboard: ${dashboardId}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Error undoing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lock/unlock dashboard
   * قفل/فتح لوحة المعلومات
   * 
   * @param {String} dashboardId - Dashboard ID
   * @param {Boolean} locked - Lock status
   * @returns {Object} Updated dashboard
   */
  setLockStatus(dashboardId, locked) {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard not found: ${dashboardId}`);
      }

      dashboard.locked = locked;
      dashboard.metadata.updatedAt = new Date();

      this.emit('dashboard:lockStatusChanged', { dashboardId, locked });
      this.logger.info(`Dashboard lock status changed: ${dashboardId} -> ${locked}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Error changing lock status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get dashboard stats
   * الحصول على إحصائيات لوحة المعلومات
   * 
   * @returns {Object} Statistics
   */
  getDashboardStats() {
    try {
      const dashboards = Array.from(this.dashboards.values());

      return {
        total: dashboards.length,
        public: dashboards.filter(d => d.isPublic).length,
        private: dashboards.filter(d => !d.isPublic).length,
        locked: dashboards.filter(d => d.locked).length,
        totalWidgets: dashboards.reduce((sum, d) => sum + d.widgets.length, 0),
        averageWidgetsPerDashboard: dashboards.length > 0 
          ? (dashboards.reduce((sum, d) => sum + d.widgets.length, 0) / dashboards.length).toFixed(2)
          : 0
      };
    } catch (error) {
      this.logger.error(`Error getting dashboard stats: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new DashboardConfigurationService();

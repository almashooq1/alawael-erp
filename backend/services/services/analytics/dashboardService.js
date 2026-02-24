/**
 * Dashboard Service - Phase 10 Advanced Reporting & Analytics
 * Manages dashboard creation, manipulation, and real-time data
 */

const crypto = require('crypto');

class DashboardService {
  constructor() {
    this.dashboards = new Map();
    this.widgets = new Map();
    this.subscriptions = new Map();
  }

  /**
   * Create a new dashboard
   * @param {string} userId - User ID
   * @param {Object} dashboardData - Dashboard configuration
   * @returns {Object} Created dashboard
   */
  createDashboard(userId, dashboardData) {
    const dashboardId = crypto.randomUUID();
    const dashboard = {
      id: dashboardId,
      userId,
      name: dashboardData.name || 'Untitled Dashboard',
      description: dashboardData.description || '',
      layout: dashboardData.layout || 'grid',
      widgets: [],
      sharedWith: dashboardData.sharedWith || [],
      isPublic: dashboardData.isPublic || false,
      settings: {
        refreshInterval: dashboardData.refreshInterval || 30000,
        rowHeight: dashboardData.rowHeight || 300,
        columns: dashboardData.columns || 12,
        ...dashboardData.settings
      },
      created_at: new Date(),
      updated_at: new Date()
    };

    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  /**
   * Get dashboard by ID
   * @param {string} dashboardId - Dashboard ID
   * @returns {Object} Dashboard object
   */
  getDashboard(dashboardId) {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }
    return dashboard;
  }

  /**
   * List dashboards for user
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Array} List of dashboards
   */
  listDashboards(userId, filters = {}) {
    const dashboards = Array.from(this.dashboards.values()).filter(d => {
      const isOwner = d.userId === userId;
      const isShared = d.sharedWith.includes(userId);
      const isPublic = d.isPublic;

      if (filters.owned && !isOwner) return false;
      if (filters.shared && !isShared) return false;
      if (filters.public && !isPublic) return false;

      return isOwner || isShared || isPublic;
    });

    return dashboards.sort((a, b) => b.updated_at - a.updated_at);
  }

  /**
   * Update dashboard
   * @param {string} dashboardId - Dashboard ID
   * @param {Object} updates - Update fields
   * @returns {Object} Updated dashboard
   */
  updateDashboard(dashboardId, updates) {
    const dashboard = this.getDashboard(dashboardId);
    
    Object.assign(dashboard, updates, {
      updated_at: new Date()
    });

    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  /**
   * Delete dashboard
   * @param {string} dashboardId - Dashboard ID
   * @returns {boolean} Success
   */
  deleteDashboard(dashboardId) {
    return this.dashboards.delete(dashboardId);
  }

  /**
   * Add widget to dashboard
   * @param {string} dashboardId - Dashboard ID
   * @param {Object} widgetData - Widget configuration
   * @returns {Object} Created widget
   */
  addWidget(dashboardId, widgetData) {
    const dashboard = this.getDashboard(dashboardId);
    const widgetId = crypto.randomUUID();

    const widget = {
      id: widgetId,
      dashboardId,
      type: widgetData.type, // metric-card, line-chart, bar-chart, etc.
      title: widgetData.title || 'Untitled Widget',
      position: widgetData.position || { x: 0, y: 0, width: 6, height: 4 },
      config: widgetData.config || {},
      dataSource: widgetData.dataSource || null,
      refreshInterval: widgetData.refreshInterval || 30000,
      cache: null,
      lastUpdate: null,
      created_at: new Date()
    };

    this.widgets.set(widgetId, widget);
    dashboard.widgets.push(widgetId);
    dashboard.updated_at = new Date();

    return widget;
  }

  /**
   * Remove widget from dashboard
   * @param {string} dashboardId - Dashboard ID
   * @param {string} widgetId - Widget ID
   * @returns {boolean} Success
   */
  removeWidget(dashboardId, widgetId) {
    const dashboard = this.getDashboard(dashboardId);
    const index = dashboard.widgets.indexOf(widgetId);
    
    if (index > -1) {
      dashboard.widgets.splice(index, 1);
      dashboard.updated_at = new Date();
      this.widgets.delete(widgetId);
      return true;
    }
    return false;
  }

  /**
   * Update widget configuration
   * @param {string} widgetId - Widget ID
   * @param {Object} config - New configuration
   * @returns {Object} Updated widget
   */
  updateWidget(widgetId, config) {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    Object.assign(widget.config, config);
    widget.lastUpdate = new Date();
    
    return widget;
  }

  /**
   * Get widget data
   * @param {string} widgetId - Widget ID
   * @returns {Object} Widget data
   */
  getWidgetData(widgetId) {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    return {
      id: widget.id,
      title: widget.title,
      type: widget.type,
      config: widget.config,
      data: widget.cache || this._generateDummyData(widget.type),
      lastUpdate: widget.lastUpdate
    };
  }

  /**
   * Refresh widget data
   * @param {string} widgetId - Widget ID
   * @returns {Object} Refreshed data
   */
  refreshWidget(widgetId) {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    widget.cache = this._generateDummyData(widget.type);
    widget.lastUpdate = new Date();

    return {
      id: widget.id,
      data: widget.cache,
      lastUpdate: widget.lastUpdate,
      status: 'success'
    };
  }

  /**
   * Share dashboard with users
   * @param {string} dashboardId - Dashboard ID
   * @param {Array} userIds - User IDs to share with
   * @returns {Object} Updated dashboard
   */
  shareDashboard(dashboardId, userIds) {
    const dashboard = this.getDashboard(dashboardId);
    dashboard.sharedWith = [...new Set([...dashboard.sharedWith, ...userIds])];
    dashboard.updated_at = new Date();
    return dashboard;
  }

  /**
   * Subscribe to dashboard updates (real-time)
   * @param {string} dashboardId - Dashboard ID
   * @param {Function} callback - Callback function
   * @returns {string} Subscription ID
   */
  subscribeToDashboard(dashboardId, callback) {
    const subscriptionId = crypto.randomUUID();
    
    if (!this.subscriptions.has(dashboardId)) {
      this.subscriptions.set(dashboardId, []);
    }

    this.subscriptions.get(dashboardId).push({
      id: subscriptionId,
      callback,
      createdAt: new Date()
    });

    return subscriptionId;
  }

  /**
   * Unsubscribe from dashboard updates
   * @param {string} dashboardId - Dashboard ID
   * @param {string} subscriptionId - Subscription ID
   * @returns {boolean} Success
   */
  unsubscribeToDashboard(dashboardId, subscriptionId) {
    const subscriptions = this.subscriptions.get(dashboardId);
    if (!subscriptions) return false;

    const index = subscriptions.findIndex(s => s.id === subscriptionId);
    if (index > -1) {
      subscriptions.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get dashboard statistics
   * @param {string} dashboardId - Dashboard ID
   * @returns {Object} Dashboard statistics
   */
  getDashboardStats(dashboardId) {
    const dashboard = this.getDashboard(dashboardId);
    const widgets = dashboard.widgets.map(wId => this.widgets.get(wId));

    return {
      dashboardId,
      totalWidgets: dashboard.widgets.length,
      widgetTypes: this._groupBy(widgets, w => w.type),
      totalSharedWith: dashboard.sharedWith.length,
      isPublic: dashboard.isPublic,
      lastUpdated: dashboard.updated_at,
      createdAt: dashboard.created_at
    };
  }

  /**
   * Generate dummy data for widget
   * @private
   */
  _generateDummyData(widgetType) {
    const data = {
      timestamp: new Date(),
      value: Math.random() * 100
    };

    switch (widgetType) {
      case 'line-chart':
      case 'area-chart':
        return this._generateTimeSeriesData(30);
      case 'bar-chart':
        return this._generateCategoryData();
      case 'pie-chart':
        return this._generateDistributionData();
      case 'metric-card':
        return { value: Math.floor(Math.random() * 10000), change: (Math.random() - 0.5) * 20 };
      default:
        return data;
    }
  }

  /**
   * Generate time series data
   * @private
   */
  _generateTimeSeriesData(points) {
    const data = [];
    const now = Date.now();
    for (let i = points; i > 0; i--) {
      data.push({
        timestamp: new Date(now - i * 60000),
        value: Math.random() * 100 + 50
      });
    }
    return data;
  }

  /**
   * Generate category data
   * @private
   */
  _generateCategoryData() {
    return [
      { category: 'Q1', value: Math.random() * 100 },
      { category: 'Q2', value: Math.random() * 100 },
      { category: 'Q3', value: Math.random() * 100 },
      { category: 'Q4', value: Math.random() * 100 }
    ];
  }

  /**
   * Generate distribution data
   * @private
   */
  _generateDistributionData() {
    return [
      { label: 'Category A', value: 30 },
      { label: 'Category B', value: 25 },
      { label: 'Category C', value: 20 },
      { label: 'Category D', value: 15 },
      { label: 'Category E', value: 10 }
    ];
  }

  /**
   * Group array by key
   * @private
   */
  _groupBy(array, keyFn) {
    return array.reduce((result, item) => {
      const key = keyFn(item);
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
  }
}

module.exports = new DashboardService();

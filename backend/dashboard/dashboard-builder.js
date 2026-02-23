/**
 * Dashboard Builder Service - خدمة بناء اللوحات
 * Enterprise Dashboard Builder for Alawael ERP
 */

const mongoose = require('mongoose');

/**
 * Dashboard Configuration
 */
const dashboardConfig = {
  // Default refresh intervals
  refreshIntervals: [0, 5000, 10000, 30000, 60000, 300000],
  
  // Widget types
  widgetTypes: [
    'stat', 'chart', 'table', 'list', 'gauge', 'map', 'pie',
    'line', 'bar', 'area', 'scatter', 'heatmap', 'treemap',
    'calendar', 'timeline', 'kpi', 'progress', 'counter',
  ],
  
  // Limits
  maxWidgetsPerDashboard: 50,
  maxDashboardsPerUser: 20,
};

/**
 * Dashboard Schema
 */
const DashboardSchema = new mongoose.Schema({
  // Identification
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  
  // Layout
  layout: {
    columns: { type: Number, default: 12 },
    rowHeight: { type: Number, default: 100 },
    gap: { type: Number, default: 16 },
  },
  
  // Widgets
  widgets: [{
    id: { type: String, required: true },
    type: { type: String, required: true },
    title: String,
    
    // Position
    position: {
      x: Number,
      y: Number,
      width: { type: Number, default: 4 },
      height: { type: Number, default: 3 },
    },
    
    // Data source
    dataSource: {
      type: { type: String, enum: ['api', 'query', 'static', 'realtime'] },
      endpoint: String,
      query: String,
      refreshInterval: { type: Number, default: 30000 },
    },
    
    // Configuration
    config: {
      chartType: String,
      colors: [String],
      showLegend: { type: Boolean, default: true },
      showGrid: { type: Boolean, default: true },
      animate: { type: Boolean, default: true },
      format: String, // number, currency, percent, date
      prefix: String,
      suffix: String,
      decimals: Number,
      thresholds: mongoose.Schema.Types.Mixed,
      goal: Number,
      sparkline: { type: Boolean, default: false },
    },
    
    // Filters
    filters: [{
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed,
    }],
    
    // Styling
    styling: {
      backgroundColor: String,
      textColor: String,
      borderColor: String,
      borderRadius: Number,
      shadow: Boolean,
    },
  }],
  
  // Filters (global)
  filters: [{
    name: String,
    type: { type: String, enum: ['select', 'multiselect', 'date', 'daterange', 'number', 'text'] },
    defaultValue: mongoose.Schema.Types.Mixed,
    options: [String],
    required: { type: Boolean, default: false },
  }],
  
  // Settings
  settings: {
    refreshInterval: { type: Number, default: 30000 },
    autoRefresh: { type: Boolean, default: true },
    showTimestamp: { type: Boolean, default: true },
    allowExport: { type: Boolean, default: true },
    allowPrint: { type: Boolean, default: true },
  },
  
  // Permissions
  permissions: {
    isPublic: { type: Boolean, default: false },
    roles: [String],
    users: [String],
  },
  
  // Owner
  createdBy: String,
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'dashboards',
});

/**
 * Widget Template Schema
 */
const WidgetTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String,
  type: { type: String, required: true },
  config: mongoose.Schema.Types.Mixed,
  preview: String,
  isDefault: { type: Boolean, default: false },
}, {
  collection: 'widget_templates',
});

/**
 * Dashboard Service Class
 */
class DashboardService {
  constructor() {
    this.Dashboard = null;
    this.WidgetTemplate = null;
    this.dataProviders = new Map();
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.Dashboard = connection.model('Dashboard', DashboardSchema);
    this.WidgetTemplate = connection.model('WidgetTemplate', WidgetTemplateSchema);
    
    // Register default data providers
    this.registerDefaultProviders();
    
    // Create default templates
    await this.createDefaultTemplates();
    
    console.log('✅ Dashboard Builder initialized');
  }
  
  /**
   * Register default data providers
   */
  registerDefaultProviders() {
    // Stats provider
    this.registerDataProvider('stats', async (params) => {
      return { value: Math.floor(Math.random() * 1000), change: Math.random() * 20 - 10 };
    });
    
    // Chart data provider
    this.registerDataProvider('chart', async (params) => {
      const labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
      const data = labels.map(() => Math.floor(Math.random() * 100));
      return { labels, datasets: [{ data }] };
    });
    
    // Table data provider
    this.registerDataProvider('table', async (params) => {
      return {
        columns: params.columns || [],
        rows: params.rows || [],
      };
    });
    
    // KPI provider
    this.registerDataProvider('kpi', async (params) => {
      return {
        current: Math.floor(Math.random() * 100),
        target: params.target || 100,
        previous: Math.floor(Math.random() * 80),
      };
    });
  }
  
  /**
   * Register data provider
   */
  registerDataProvider(name, handler) {
    this.dataProviders.set(name, handler);
  }
  
  /**
   * Create default widget templates
   */
  async createDefaultTemplates() {
    const templates = [
      {
        name: 'إحصائية بسيطة',
        category: 'stats',
        type: 'stat',
        config: {
          format: 'number',
          sparkline: true,
        },
        isDefault: true,
      },
      {
        name: 'رسم بياني خطي',
        category: 'charts',
        type: 'line',
        config: {
          showLegend: true,
          showGrid: true,
          animate: true,
        },
        isDefault: true,
      },
      {
        name: 'رسم بياني عمودي',
        category: 'charts',
        type: 'bar',
        config: {
          showLegend: true,
          showGrid: true,
        },
        isDefault: true,
      },
      {
        name: 'رسم دائري',
        category: 'charts',
        type: 'pie',
        config: {
          showLegend: true,
        },
        isDefault: true,
      },
      {
        name: 'مقياس',
        category: 'gauges',
        type: 'gauge',
        config: {
          thresholds: { warning: 70, critical: 90 },
        },
        isDefault: true,
      },
      {
        name: 'جدول بيانات',
        category: 'tables',
        type: 'table',
        config: {
          pagination: true,
          sortable: true,
        },
        isDefault: true,
      },
      {
        name: 'مؤشر أداء KPI',
        category: 'kpi',
        type: 'kpi',
        config: {
          showTrend: true,
          showGoal: true,
        },
        isDefault: true,
      },
      {
        name: 'عداد',
        category: 'stats',
        type: 'counter',
        config: {
          animate: true,
          duration: 2000,
        },
        isDefault: true,
      },
    ];
    
    for (const template of templates) {
      const existing = await this.WidgetTemplate.findOne({ name: template.name });
      if (!existing) {
        await this.WidgetTemplate.create(template);
      }
    }
  }
  
  /**
   * Create dashboard
   */
  async createDashboard(data) {
    // Generate slug
    if (!data.slug) {
      data.slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    }
    
    return this.Dashboard.create(data);
  }
  
  /**
   * Get dashboard
   */
  async getDashboard(slug) {
    return this.Dashboard.findOne({ slug });
  }
  
  /**
   * Get dashboard by ID
   */
  async getDashboardById(id) {
    return this.Dashboard.findById(id);
  }
  
  /**
   * List dashboards
   */
  async listDashboards(options = {}) {
    const filter = {};
    if (options.tenantId) filter.tenantId = options.tenantId;
    if (options.createdBy) filter.createdBy = options.createdBy;
    if (options.isPublic !== undefined) filter['permissions.isPublic'] = options.isPublic;
    
    return this.Dashboard.find(filter).sort({ createdAt: -1 });
  }
  
  /**
   * Update dashboard
   */
  async updateDashboard(id, data) {
    data.updatedAt = new Date();
    return this.Dashboard.findByIdAndUpdate(id, data, { new: true });
  }
  
  /**
   * Delete dashboard
   */
  async deleteDashboard(id) {
    return this.Dashboard.findByIdAndDelete(id);
  }
  
  /**
   * Add widget to dashboard
   */
  async addWidget(dashboardId, widget) {
    const dashboard = await this.Dashboard.findById(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');
    
    if (dashboard.widgets.length >= dashboardConfig.maxWidgetsPerDashboard) {
      throw new Error('Maximum widgets per dashboard reached');
    }
    
    dashboard.widgets.push(widget);
    dashboard.updatedAt = new Date();
    await dashboard.save();
    
    return dashboard;
  }
  
  /**
   * Update widget
   */
  async updateWidget(dashboardId, widgetId, data) {
    const dashboard = await this.Dashboard.findById(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');
    
    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) throw new Error('Widget not found');
    
    dashboard.widgets[widgetIndex] = { ...dashboard.widgets[widgetIndex].toObject(), ...data };
    dashboard.updatedAt = new Date();
    await dashboard.save();
    
    return dashboard;
  }
  
  /**
   * Remove widget
   */
  async removeWidget(dashboardId, widgetId) {
    const dashboard = await this.Dashboard.findById(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');
    
    dashboard.widgets = dashboard.widgets.filter(w => w.id !== widgetId);
    dashboard.updatedAt = new Date();
    await dashboard.save();
    
    return dashboard;
  }
  
  /**
   * Get widget data
   */
  async getWidgetData(dashboardId, widgetId, filters = {}) {
    const dashboard = await this.Dashboard.findById(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');
    
    const widget = dashboard.widgets.find(w => w.id === widgetId);
    if (!widget) throw new Error('Widget not found');
    
    const { dataSource } = widget;
    
    if (dataSource.type === 'api' && dataSource.endpoint) {
      // Fetch from API
      const axios = require('axios');
      const response = await axios.get(dataSource.endpoint, { params: filters });
      return response.data;
    } else if (dataSource.type === 'query' && dataSource.query) {
      // Execute query (would need model reference)
      return [];
    } else if (this.dataProviders.has(widget.type)) {
      // Use registered provider
      return this.dataProviders.get(widget.type)({ ...widget.config, filters });
    }
    
    return null;
  }
  
  /**
   * Get all widget data for dashboard
   */
  async getDashboardData(dashboardId, filters = {}) {
    const dashboard = await this.Dashboard.findById(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');
    
    const data = {};
    
    for (const widget of dashboard.widgets) {
      try {
        data[widget.id] = await this.getWidgetData(dashboardId, widget.id, filters);
      } catch (error) {
        data[widget.id] = { error: error.message };
      }
    }
    
    return {
      dashboard: dashboard.toObject(),
      data,
      timestamp: new Date(),
    };
  }
  
  /**
   * Get widget templates
   */
  async getWidgetTemplates(category = null) {
    const filter = {};
    if (category) filter.category = category;
    return this.WidgetTemplate.find(filter);
  }
  
  /**
   * Duplicate dashboard
   */
  async duplicateDashboard(id, newName) {
    const original = await this.Dashboard.findById(id);
    if (!original) throw new Error('Dashboard not found');
    
    const duplicate = original.toObject();
    delete duplicate._id;
    duplicate.name = newName || `${original.name} (نسخة)`;
    duplicate.slug = duplicate.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    duplicate.createdAt = new Date();
    duplicate.updatedAt = new Date();
    
    return this.Dashboard.create(duplicate);
  }
  
  /**
   * Export dashboard
   */
  async exportDashboard(id) {
    const dashboard = await this.Dashboard.findById(id);
    if (!dashboard) throw new Error('Dashboard not found');
    
    return {
      version: '1.0',
      exportedAt: new Date(),
      dashboard: dashboard.toObject(),
    };
  }
  
  /**
   * Import dashboard
   */
  async importDashboard(data, options = {}) {
    const dashboard = data.dashboard;
    
    // Reset IDs
    delete dashboard._id;
    dashboard.slug = `${dashboard.slug}-${Date.now()}`;
    dashboard.createdBy = options.userId;
    dashboard.tenantId = options.tenantId;
    dashboard.createdAt = new Date();
    dashboard.updatedAt = new Date();
    
    // Reset widget IDs
    dashboard.widgets = dashboard.widgets.map(w => ({
      ...w,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));
    
    return this.Dashboard.create(dashboard);
  }
}

// Singleton instance
const dashboardService = new DashboardService();

/**
 * Pre-built Dashboard Templates
 */
const dashboardTemplates = {
  // Executive Dashboard
  executive: {
    name: 'لوحة القيادة التنفيذية',
    slug: 'executive-dashboard',
    description: 'نظرة عامة على أداء الشركة',
    layout: { columns: 12, rowHeight: 100 },
    widgets: [
      { id: 'w1', type: 'stat', title: 'إجمالي المبيعات', position: { x: 0, y: 0, width: 3, height: 2 }, config: { format: 'currency', sparkline: true } },
      { id: 'w2', type: 'stat', title: 'عدد العملاء', position: { x: 3, y: 0, width: 3, height: 2 }, config: { format: 'number' } },
      { id: 'w3', type: 'stat', title: 'الطلبات النشطة', position: { x: 6, y: 0, width: 3, height: 2 }, config: { format: 'number' } },
      { id: 'w4', type: 'stat', title: 'الإيرادات الشهرية', position: { x: 9, y: 0, width: 3, height: 2 }, config: { format: 'currency' } },
      { id: 'w5', type: 'line', title: 'اتجاه المبيعات', position: { x: 0, y: 2, width: 8, height: 4 } },
      { id: 'w6', type: 'pie', title: 'توزيع المبيعات', position: { x: 8, y: 2, width: 4, height: 4 } },
    ],
  },
  
  // Sales Dashboard
  sales: {
    name: 'لوحة المبيعات',
    slug: 'sales-dashboard',
    description: 'تفاصيل المبيعات والأداء',
    layout: { columns: 12, rowHeight: 100 },
    widgets: [
      { id: 'w1', type: 'kpi', title: 'هدف المبيعات', position: { x: 0, y: 0, width: 4, height: 3 }, config: { goal: 100000 } },
      { id: 'w2', type: 'bar', title: 'المبيعات حسب المنتج', position: { x: 4, y: 0, width: 8, height: 3 } },
      { id: 'w3', type: 'table', title: 'أحدث الطلبات', position: { x: 0, y: 3, width: 12, height: 4 } },
    ],
  },
  
  // HR Dashboard
  hr: {
    name: 'لوحة الموارد البشرية',
    slug: 'hr-dashboard',
    description: 'إحصائيات الموظفين',
    layout: { columns: 12, rowHeight: 100 },
    widgets: [
      { id: 'w1', type: 'counter', title: 'عدد الموظفين', position: { x: 0, y: 0, width: 3, height: 2 } },
      { id: 'w2', type: 'stat', title: 'الحضور اليوم', position: { x: 3, y: 0, width: 3, height: 2 } },
      { id: 'w3', type: 'stat', title: 'الإجازات', position: { x: 6, y: 0, width: 3, height: 2 } },
      { id: 'w4', type: 'stat', title: 'الوظائف الشاغرة', position: { x: 9, y: 0, width: 3, height: 2 } },
      { id: 'w5', type: 'bar', title: 'توزيع الأقسام', position: { x: 0, y: 2, width: 6, height: 4 } },
      { id: 'w6', type: 'line', title: 'معدل الحضور', position: { x: 6, y: 2, width: 6, height: 4 } },
    ],
  },
  
  // Inventory Dashboard
  inventory: {
    name: 'لوحة المخزون',
    slug: 'inventory-dashboard',
    description: 'حالة المخزون والمنتجات',
    layout: { columns: 12, rowHeight: 100 },
    widgets: [
      { id: 'w1', type: 'gauge', title: 'نسبة المخزون', position: { x: 0, y: 0, width: 4, height: 3 } },
      { id: 'w2', type: 'stat', title: 'منتجات منخفضة', position: { x: 4, y: 0, width: 4, height: 2 } },
      { id: 'w3', type: 'stat', title: 'قيمة المخزون', position: { x: 8, y: 0, width: 4, height: 2 } },
      { id: 'w4', type: 'table', title: 'المنتجات المنخفضة', position: { x: 0, y: 3, width: 12, height: 4 } },
    ],
  },
};

module.exports = {
  DashboardService,
  dashboardService,
  dashboardConfig,
  dashboardTemplates,
};
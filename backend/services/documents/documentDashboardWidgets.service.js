/**
 * Document Dashboard Widgets Service — خدمة عناصر لوحة التحكم
 * ──────────────────────────────────────────────────────────────
 * لوحة تحكم قابلة للتخصيص: إنشاء/إدارة الويدجت،
 * التخطيطات، البيانات المباشرة، التقارير السريعة
 *
 * @module documentDashboardWidgets.service
 */

const mongoose = require('mongoose');

/* ─── Widget Definition Model ────────────────────────────────── */
const widgetSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: String,
    category: {
      type: String,
      enum: ['statistics', 'charts', 'lists', 'activity', 'calendar', 'quick_actions', 'custom'],
      default: 'statistics',
    },
    type: {
      type: String,
      enum: [
        'counter',
        'trend',
        'pie_chart',
        'bar_chart',
        'line_chart',
        'area_chart',
        'table',
        'list',
        'timeline',
        'calendar_mini',
        'progress',
        'gauge',
        'map',
        'heatmap',
        'kpi',
        'custom',
      ],
      required: true,
    },
    icon: String,
    color: { type: String, default: '#3b82f6' },
    description: String,
    descriptionAr: String,
    dataSource: {
      service: String, // e.g. 'documentAnalytics', 'documentCalendar'
      method: String, // e.g. 'getStats'
      params: mongoose.Schema.Types.Mixed,
      refresh: { type: Number, default: 300000 }, // 5 min
    },
    defaultSize: {
      cols: { type: Number, default: 3, min: 1, max: 12 },
      rows: { type: Number, default: 2, min: 1, max: 6 },
    },
    minSize: { cols: { type: Number, default: 2 }, rows: { type: Number, default: 1 } },
    maxSize: { cols: { type: Number, default: 12 }, rows: { type: Number, default: 6 } },
    isSystem: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'document_widgets' }
);

const Widget = mongoose.models.DocumentWidget || mongoose.model('DocumentWidget', widgetSchema);

/* ─── User Dashboard Layout Model ────────────────────────────── */
const dashboardLayoutSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, default: 'اللوحة الرئيسية' },
    nameAr: String,
    isDefault: { type: Boolean, default: false },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system', 'compact', 'spacious'],
      default: 'light',
    },
    columns: { type: Number, default: 12, min: 4, max: 16 },
    widgets: [
      {
        widgetKey: { type: String, required: true },
        position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
        size: { cols: { type: Number, default: 3 }, rows: { type: Number, default: 2 } },
        config: mongoose.Schema.Types.Mixed, // User-specific configs per widget
        isVisible: { type: Boolean, default: true },
      },
    ],
    filters: {
      department: String,
      dateRange: { start: Date, end: Date },
      documentTypes: [String],
    },
  },
  { timestamps: true, collection: 'document_dashboard_layouts' }
);

dashboardLayoutSchema.index({ userId: 1, isDefault: -1 });

const DashboardLayout =
  mongoose.models.DocumentDashboardLayout ||
  mongoose.model('DocumentDashboardLayout', dashboardLayoutSchema);

/* ─── Default Widgets ────────────────────────────────────────── */
const DEFAULT_WIDGETS = [
  {
    key: 'total_documents',
    name: 'Total Documents',
    nameAr: 'إجمالي المستندات',
    category: 'statistics',
    type: 'counter',
    icon: '📄',
    color: '#3b82f6',
    descriptionAr: 'العدد الكلي للمستندات في النظام',
    dataSource: { service: 'documentAnalytics', method: 'getUsageAnalytics' },
    defaultSize: { cols: 3, rows: 1 },
    isSystem: true,
    order: 1,
  },
  {
    key: 'pending_approvals',
    name: 'Pending Approvals',
    nameAr: 'بانتظار الاعتماد',
    category: 'statistics',
    type: 'counter',
    icon: '⏳',
    color: '#f59e0b',
    descriptionAr: 'المستندات المعلقة التي تنتظر الاعتماد',
    dataSource: { service: 'documentWorkflow', method: 'getPendingCount' },
    defaultSize: { cols: 3, rows: 1 },
    isSystem: true,
    order: 2,
  },
  {
    key: 'overdue_deadlines',
    name: 'Overdue Deadlines',
    nameAr: 'متأخرة',
    category: 'statistics',
    type: 'counter',
    icon: '🔴',
    color: '#ef4444',
    descriptionAr: 'المستندات المتأخرة عن موعدها النهائي',
    dataSource: { service: 'documentCalendar', method: 'getOverdue' },
    defaultSize: { cols: 3, rows: 1 },
    isSystem: true,
    order: 3,
  },
  {
    key: 'shared_with_me',
    name: 'Shared With Me',
    nameAr: 'مشارك معي',
    category: 'statistics',
    type: 'counter',
    icon: '🤝',
    color: '#22c55e',
    descriptionAr: 'المستندات المشتركة معك',
    dataSource: { service: 'documentSharing', method: 'getSharedWithMe' },
    defaultSize: { cols: 3, rows: 1 },
    isSystem: true,
    order: 4,
  },
  {
    key: 'documents_by_type',
    name: 'Documents by Type',
    nameAr: 'المستندات حسب النوع',
    category: 'charts',
    type: 'pie_chart',
    icon: '📊',
    color: '#8b5cf6',
    descriptionAr: 'توزيع المستندات حسب النوع',
    dataSource: { service: 'documentAnalytics', method: 'getStorageAnalytics' },
    defaultSize: { cols: 4, rows: 3 },
    isSystem: true,
    order: 5,
  },
  {
    key: 'activity_timeline',
    name: 'Activity Timeline',
    nameAr: 'سجل النشاط',
    category: 'activity',
    type: 'timeline',
    icon: '📋',
    color: '#06b6d4',
    descriptionAr: 'آخر الأنشطة على المستندات',
    dataSource: { service: 'documentAudit', method: 'getRecent' },
    defaultSize: { cols: 4, rows: 3 },
    isSystem: true,
    order: 6,
  },
  {
    key: 'upcoming_deadlines',
    name: 'Upcoming Deadlines',
    nameAr: 'المواعيد القادمة',
    category: 'calendar',
    type: 'list',
    icon: '📅',
    color: '#f97316',
    descriptionAr: 'المواعيد النهائية القادمة خلال 7 أيام',
    dataSource: {
      service: 'documentCalendar',
      method: 'getUpcomingDeadlines',
      params: { days: 7 },
    },
    defaultSize: { cols: 4, rows: 3 },
    isSystem: true,
    order: 7,
  },
  {
    key: 'monthly_trend',
    name: 'Monthly Trend',
    nameAr: 'الاتجاه الشهري',
    category: 'charts',
    type: 'line_chart',
    icon: '📈',
    color: '#14b8a6',
    descriptionAr: 'اتجاه إنشاء المستندات شهرياً',
    dataSource: { service: 'documentAnalytics', method: 'getUsageAnalytics' },
    defaultSize: { cols: 6, rows: 3 },
    isSystem: true,
    order: 8,
  },
  {
    key: 'workflow_status',
    name: 'Workflow Status',
    nameAr: 'حالة سير العمل',
    category: 'charts',
    type: 'bar_chart',
    icon: '🔄',
    color: '#6366f1',
    descriptionAr: 'توزيع المستندات حسب حالة سير العمل',
    dataSource: { service: 'documentWorkflow', method: 'getStats' },
    defaultSize: { cols: 6, rows: 3 },
    isSystem: true,
    order: 9,
  },
  {
    key: 'quick_actions',
    name: 'Quick Actions',
    nameAr: 'إجراءات سريعة',
    category: 'quick_actions',
    type: 'custom',
    icon: '⚡',
    color: '#a855f7',
    descriptionAr: 'إجراءات سريعة: إنشاء، رفع، بحث',
    defaultSize: { cols: 3, rows: 2 },
    isSystem: true,
    order: 10,
  },
  {
    key: 'storage_usage',
    name: 'Storage Usage',
    nameAr: 'استهلاك التخزين',
    category: 'statistics',
    type: 'gauge',
    icon: '💾',
    color: '#ec4899',
    descriptionAr: 'مساحة التخزين المستخدمة',
    dataSource: { service: 'documentAnalytics', method: 'getStorageAnalytics' },
    defaultSize: { cols: 3, rows: 2 },
    isSystem: true,
    order: 11,
  },
  {
    key: 'top_tags',
    name: 'Top Tags',
    nameAr: 'أكثر الوسوم استخداماً',
    category: 'lists',
    type: 'list',
    icon: '🏷️',
    color: '#64748b',
    descriptionAr: 'أكثر الوسوم استخداماً على المستندات',
    dataSource: { service: 'documentTags', method: 'getCloud' },
    defaultSize: { cols: 3, rows: 2 },
    isSystem: true,
    order: 12,
  },
];

/* ─── Service ────────────────────────────────────────────────── */
class DocumentDashboardWidgetsService {
  /* ── Initialize default widgets ───────────────────────────── */
  async initDefaults() {
    for (const widget of DEFAULT_WIDGETS) {
      await Widget.findOneAndUpdate(
        { key: widget.key },
        { $setOnInsert: widget },
        { upsert: true, new: true }
      );
    }
    return { success: true, initialized: DEFAULT_WIDGETS.length };
  }

  /* ── Get Available Widgets ────────────────────────────────── */
  async getAvailableWidgets(options = {}) {
    const { category, type } = options;
    const filter = { isVisible: true };
    if (category) filter.category = category;
    if (type) filter.type = type;

    const widgets = await Widget.find(filter).sort({ order: 1 }).lean();

    // Init defaults if empty
    if (widgets.length === 0) {
      await this.initDefaults();
      return this.getAvailableWidgets(options);
    }

    return { success: true, widgets };
  }

  /* ── Create Custom Widget ─────────────────────────────────── */
  async createWidget(data) {
    const key = `custom_${data.name?.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const widget = new Widget({ ...data, key, isSystem: false });
    await widget.save();
    return { success: true, widget };
  }

  /* ── Update Widget ────────────────────────────────────────── */
  async updateWidget(widgetId, updates) {
    const widget = await Widget.findByIdAndUpdate(
      widgetId,
      { $set: updates },
      { new: true }
    ).lean();
    if (!widget) return { success: false, error: 'العنصر غير موجود' };
    return { success: true, widget };
  }

  /* ── Delete Widget ────────────────────────────────────────── */
  async deleteWidget(widgetId) {
    const widget = await Widget.findById(widgetId);
    if (!widget) return { success: false, error: 'العنصر غير موجود' };
    if (widget.isSystem) return { success: false, error: 'لا يمكن حذف عنصر النظام' };
    await widget.deleteOne();
    return { success: true };
  }

  /* ── Get User Dashboard Layout ────────────────────────────── */
  async getUserLayout(userId) {
    let layout = await DashboardLayout.findOne({ userId, isDefault: true }).lean();

    if (!layout) {
      // Create default layout
      layout = await this._createDefaultLayout(userId);
    }

    return { success: true, layout };
  }

  /* ── Get All User Layouts ─────────────────────────────────── */
  async getUserLayouts(userId) {
    const layouts = await DashboardLayout.find({ userId })
      .sort({ isDefault: -1, updatedAt: -1 })
      .lean();
    return { success: true, layouts };
  }

  /* ── Save Layout ──────────────────────────────────────────── */
  async saveLayout(userId, layoutData) {
    const { name, nameAr, widgets, theme, columns, filters, layoutId } = layoutData;

    if (layoutId) {
      const layout = await DashboardLayout.findOneAndUpdate(
        { _id: layoutId, userId },
        { $set: { name, nameAr, widgets, theme, columns, filters } },
        { new: true }
      ).lean();
      if (!layout) return { success: false, error: 'التخطيط غير موجود' };
      return { success: true, layout };
    }

    const layout = new DashboardLayout({
      userId,
      name,
      nameAr,
      widgets,
      theme,
      columns,
      filters,
    });
    await layout.save();
    return { success: true, layout };
  }

  /* ── Set Default Layout ───────────────────────────────────── */
  async setDefaultLayout(userId, layoutId) {
    await DashboardLayout.updateMany({ userId }, { isDefault: false });
    const layout = await DashboardLayout.findOneAndUpdate(
      { _id: layoutId, userId },
      { isDefault: true },
      { new: true }
    ).lean();
    if (!layout) return { success: false, error: 'التخطيط غير موجود' };
    return { success: true, layout };
  }

  /* ── Delete Layout ────────────────────────────────────────── */
  async deleteLayout(userId, layoutId) {
    const layout = await DashboardLayout.findOneAndDelete({ _id: layoutId, userId });
    if (!layout) return { success: false, error: 'التخطيط غير موجود' };
    return { success: true };
  }

  /* ── Add Widget to Layout ─────────────────────────────────── */
  async addWidgetToLayout(userId, layoutId, widgetConfig) {
    const layout = await DashboardLayout.findOneAndUpdate(
      { _id: layoutId, userId },
      { $push: { widgets: widgetConfig } },
      { new: true }
    ).lean();
    if (!layout) return { success: false, error: 'التخطيط غير موجود' };
    return { success: true, layout };
  }

  /* ── Remove Widget from Layout ────────────────────────────── */
  async removeWidgetFromLayout(userId, layoutId, widgetKey) {
    const layout = await DashboardLayout.findOneAndUpdate(
      { _id: layoutId, userId },
      { $pull: { widgets: { widgetKey } } },
      { new: true }
    ).lean();
    if (!layout) return { success: false, error: 'التخطيط غير موجود' };
    return { success: true, layout };
  }

  /* ── Update Widget Position in Layout ─────────────────────── */
  async updateWidgetPosition(userId, layoutId, widgetKey, position, size) {
    const layout = await DashboardLayout.findOneAndUpdate(
      { _id: layoutId, userId, 'widgets.widgetKey': widgetKey },
      {
        $set: {
          'widgets.$.position': position,
          ...(size && { 'widgets.$.size': size }),
        },
      },
      { new: true }
    ).lean();
    if (!layout) return { success: false, error: 'العنصر غير موجود في التخطيط' };
    return { success: true, layout };
  }

  /* ── Get Widget Data ──────────────────────────────────────── */
  async getWidgetData(widgetKey, options = {}) {
    const widget = await Widget.findOne({ key: widgetKey }).lean();
    if (!widget) return { success: false, error: 'العنصر غير موجود' };

    const { dataSource } = widget;
    if (!dataSource?.service || !dataSource?.method) {
      return { success: true, widget, data: null };
    }

    try {
      const servicePath = `../documents/${dataSource.service}.service`;
      const service = require(servicePath);
      if (typeof service[dataSource.method] !== 'function') {
        return { success: true, widget, data: null, error: 'الدالة غير موجودة' };
      }
      const data = await service[dataSource.method]({ ...dataSource.params, ...options });
      return { success: true, widget, data };
    } catch (err) {
      return { success: true, widget, data: null, error: err.message };
    }
  }

  /* ── Bulk Get Widget Data ─────────────────────────────────── */
  async getBulkWidgetData(widgetKeys, options = {}) {
    const results = {};
    await Promise.all(
      widgetKeys.map(async key => {
        results[key] = await this.getWidgetData(key, options);
      })
    );
    return { success: true, data: results };
  }

  /* ── Reset User Layout ────────────────────────────────────── */
  async resetLayout(userId, layoutId) {
    const defaultLayout = this._getDefaultWidgetConfigs();
    const layout = await DashboardLayout.findOneAndUpdate(
      { _id: layoutId, userId },
      { $set: { widgets: defaultLayout } },
      { new: true }
    ).lean();
    if (!layout) return { success: false, error: 'التخطيط غير موجود' };
    return { success: true, layout };
  }

  /* ── Duplicate Layout ─────────────────────────────────────── */
  async duplicateLayout(userId, layoutId, newName) {
    const source = await DashboardLayout.findOne({ _id: layoutId, userId }).lean();
    if (!source) return { success: false, error: 'التخطيط غير موجود' };

    const newLayout = new DashboardLayout({
      userId,
      name: newName || `${source.name} (نسخة)`,
      nameAr: source.nameAr ? `${source.nameAr} (نسخة)` : undefined,
      theme: source.theme,
      columns: source.columns,
      widgets: source.widgets,
      filters: source.filters,
      isDefault: false,
    });
    await newLayout.save();
    return { success: true, layout: newLayout };
  }

  /* ── Create Default Layout ────────────────────────────────── */
  async _createDefaultLayout(userId) {
    const widgetConfigs = this._getDefaultWidgetConfigs();
    const layout = new DashboardLayout({
      userId,
      name: 'اللوحة الرئيسية',
      nameAr: 'اللوحة الرئيسية',
      isDefault: true,
      theme: 'light',
      columns: 12,
      widgets: widgetConfigs,
    });
    await layout.save();
    return layout.toObject();
  }

  _getDefaultWidgetConfigs() {
    let x = 0,
      y = 0;
    return DEFAULT_WIDGETS.map(w => {
      const config = {
        widgetKey: w.key,
        position: { x, y },
        size: { ...w.defaultSize },
        isVisible: true,
      };
      x += w.defaultSize.cols;
      if (x >= 12) {
        x = 0;
        y += w.defaultSize.rows;
      }
      return config;
    });
  }

  /* ── Get Widget Categories ────────────────────────────────── */
  getCategories() {
    return [
      { key: 'statistics', labelAr: 'إحصائيات', icon: '📊' },
      { key: 'charts', labelAr: 'رسوم بيانية', icon: '📈' },
      { key: 'lists', labelAr: 'قوائم', icon: '📋' },
      { key: 'activity', labelAr: 'نشاط', icon: '🔔' },
      { key: 'calendar', labelAr: 'تقويم', icon: '📅' },
      { key: 'quick_actions', labelAr: 'إجراءات سريعة', icon: '⚡' },
      { key: 'custom', labelAr: 'مخصص', icon: '🛠️' },
    ];
  }

  /* ── Statistics ───────────────────────────────────────────── */
  async getStats() {
    const [totalWidgets, totalLayouts, avgWidgetsPerLayout] = await Promise.all([
      Widget.countDocuments(),
      DashboardLayout.countDocuments(),
      DashboardLayout.aggregate([
        { $project: { widgetCount: { $size: '$widgets' } } },
        { $group: { _id: null, avg: { $avg: '$widgetCount' } } },
      ]),
    ]);

    return {
      success: true,
      stats: {
        totalWidgets,
        totalLayouts,
        avgWidgetsPerLayout: avgWidgetsPerLayout[0]?.avg?.toFixed(1) || 0,
      },
    };
  }
}

module.exports = new DocumentDashboardWidgetsService();

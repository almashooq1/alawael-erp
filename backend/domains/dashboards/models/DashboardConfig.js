/**
 * DashboardConfig Model — نموذج تكوين لوحة المعلومات
 *
 * يمثل لوحة معلومات مخصصة قابلة للتخصيص لكل مستخدم/دور
 * مع أدوات (Widgets) قابلة للسحب والإفلات ومؤشرات أداء رئيسية
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const widgetSchema = new Schema(
  {
    widgetId: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'kpi_card',
        'chart_line',
        'chart_bar',
        'chart_pie',
        'chart_donut',
        'chart_area',
        'chart_radar',
        'table',
        'list',
        'calendar',
        'heatmap',
        'progress_bar',
        'gauge',
        'map',
        'alert_feed',
        'activity_feed',
        'stat_comparison',
        'custom',
      ],
      required: true,
    },
    title: { type: String, required: true },
    titleAr: String,
    dataSource: {
      domain: {
        type: String,
        enum: [
          'core',
          'episodes',
          'assessments',
          'care-plans',
          'sessions',
          'goals',
          'programs',
          'ai-recommendations',
          'quality',
          'family',
          'reports',
          'group-therapy',
          'tele-rehab',
          'ar-vr',
          'behavior',
          'research',
          'field-training',
          'cross-domain',
        ],
        required: true,
      },
      metric: { type: String, required: true },
      aggregation: {
        type: String,
        enum: ['count', 'sum', 'avg', 'min', 'max', 'percentage', 'trend', 'custom'],
        default: 'count',
      },
      filters: Schema.Types.Mixed,
      timeRange: {
        type: String,
        enum: [
          'today',
          'this_week',
          'this_month',
          'this_quarter',
          'this_year',
          'last_7_days',
          'last_30_days',
          'last_90_days',
          'last_365_days',
          'custom',
        ],
        default: 'last_30_days',
      },
      customDateRange: { from: Date, to: Date },
      refreshInterval: { type: Number, default: 300 },
    },
    layout: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      w: { type: Number, default: 4, min: 1, max: 12 },
      h: { type: Number, default: 3, min: 1, max: 12 },
    },
    visualization: {
      colorScheme: String,
      showLegend: { type: Boolean, default: true },
      showLabels: { type: Boolean, default: true },
      thresholds: [{ value: Number, color: String, label: String }],
    },
    isVisible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const dashboardConfigSchema = new Schema(
  {
    // Owner
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    role: {
      type: String,
      enum: [
        'admin',
        'clinical_director',
        'branch_manager',
        'therapist',
        'quality_officer',
        'researcher',
        'family_member',
        'executive',
        'supervisor',
        'custom',
      ],
    },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },

    // Dashboard info
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    type: {
      type: String,
      enum: ['personal', 'role_default', 'branch', 'organization', 'template'],
      default: 'personal',
      index: true,
    },
    category: {
      type: String,
      enum: [
        'clinical',
        'operational',
        'quality',
        'executive',
        'research',
        'training',
        'family',
        'custom',
      ],
      default: 'clinical',
    },

    // Widgets
    widgets: [widgetSchema],

    // Layout
    layout: {
      columns: { type: Number, default: 12 },
      rowHeight: { type: Number, default: 80 },
      compactType: { type: String, enum: ['vertical', 'horizontal', 'none'], default: 'vertical' },
      theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    },

    // Sharing
    isShared: { type: Boolean, default: false },
    sharedWith: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: String,
        permission: { type: String, enum: ['view', 'edit'], default: 'view' },
      },
    ],

    // Status
    isDefault: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    lastViewedAt: Date,
    viewCount: { type: Number, default: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'dashboard_configs',
  }
);

dashboardConfigSchema.index({ userId: 1, type: 1 });
dashboardConfigSchema.index({ role: 1, type: 1 });
dashboardConfigSchema.index({ type: 1, isDefault: 1 });

module.exports =
  mongoose.models.DashboardConfig || mongoose.model('DashboardConfig', dashboardConfigSchema);

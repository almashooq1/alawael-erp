/**
 * Financial Dashboard Configuration Models
 * لوحات البيانات المخصصة - Custom Dashboard Builder
 * Widgets, Data Sources, KPIs, Layout management
 */
const mongoose = require('mongoose');

const dashboardConfigSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    dashboardNumber: { type: String, unique: true },
    name: { type: String, required: true },
    nameEn: { type: String },
    description: { type: String },
    dashboardType: {
      type: String,
      enum: ['executive', 'operational', 'financial', 'kpi', 'analytics', 'compliance', 'custom'],
      default: 'custom',
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived', 'shared'],
      default: 'draft',
    },
    layout: {
      columns: { type: Number, default: 12 },
      rows: { type: Number, default: 8 },
      theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
      direction: { type: String, enum: ['rtl', 'ltr'], default: 'rtl' },
    },
    widgets: [
      {
        widgetId: { type: String },
        widgetType: {
          type: String,
          enum: [
            'kpi_card',
            'line_chart',
            'bar_chart',
            'pie_chart',
            'donut_chart',
            'table',
            'metric',
            'gauge',
            'heatmap',
            'treemap',
            'funnel',
            'scatter',
            'area_chart',
            'text_block',
          ],
        },
        title: { type: String },
        titleEn: { type: String },
        position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
        size: { width: { type: Number, default: 3 }, height: { type: Number, default: 2 } },
        dataSource: {
          type: {
            type: String,
            enum: ['api', 'query', 'static', 'calculated', 'aggregation'],
          },
          endpoint: { type: String },
          model: { type: String },
          filters: { type: mongoose.Schema.Types.Mixed },
          aggregation: { type: String, enum: ['sum', 'avg', 'count', 'min', 'max', 'custom'] },
          field: { type: String },
          dateRange: {
            type: String,
            enum: ['today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'custom'],
          },
        },
        formatting: {
          currency: { type: String, default: 'SAR' },
          numberFormat: { type: String, default: '#,##0.00' },
          colorScheme: [{ type: String }],
          showTrend: { type: Boolean, default: false },
          showComparison: { type: Boolean, default: false },
          comparisonPeriod: {
            type: String,
            enum: ['previous_period', 'same_period_last_year', 'budget'],
          },
        },
        drillDown: {
          enabled: { type: Boolean, default: false },
          targetDashboard: { type: mongoose.Schema.Types.ObjectId, ref: 'DashboardConfig' },
          targetWidget: { type: String },
          filters: { type: mongoose.Schema.Types.Mixed },
        },
        refreshInterval: { type: Number, default: 300 },
        visible: { type: Boolean, default: true },
      },
    ],
    dataSources: [
      {
        sourceId: { type: String },
        name: { type: String },
        type: { type: String, enum: ['model', 'api', 'query', 'external'] },
        config: { type: mongoose.Schema.Types.Mixed },
        cacheTimeout: { type: Number, default: 300 },
      },
    ],
    sharing: {
      isPublic: { type: Boolean, default: false },
      sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      roles: [{ type: String }],
    },
    schedule: {
      autoRefresh: { type: Boolean, default: true },
      refreshIntervalSeconds: { type: Number, default: 300 },
      emailReport: { type: Boolean, default: false },
      emailSchedule: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      recipients: [{ type: String }],
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

dashboardConfigSchema.pre('save', async function () {
  if (!this.dashboardNumber) {
    const count = await this.constructor.countDocuments();
    this.dashboardNumber = `DSH-${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.models.DashboardConfig || mongoose.model('DashboardConfig', dashboardConfigSchema);

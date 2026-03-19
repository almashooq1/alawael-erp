/* eslint-disable no-unused-vars */
/**
 * Rehabilitation Center Dashboard Service
 * خدمة لوحة تحكم مراكز التأهيل الشاملة
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');
const logger = require('../utils/logger');

/**
 * Dashboard Configuration
 */
const dashboardConfig = {
  // أنواع البطاقات
  cardTypes: {
    statistics: { label: 'إحصائيات', icon: 'chart-bar' },
    chart: { label: 'رسم بياني', icon: 'chart-line' },
    list: { label: 'قائمة', icon: 'list' },
    progress: { label: 'تقدم', icon: 'tasks' },
    map: { label: 'خريطة', icon: 'map' },
    calendar: { label: 'تقويم', icon: 'calendar' },
    notification: { label: 'تنبيهات', icon: 'bell' },
    gauge: { label: 'مقياس', icon: 'tachometer' },
  },

  // الفترات الزمنية
  timeRanges: {
    today: { label: 'اليوم', days: 1 },
    week: { label: 'هذا الأسبوع', days: 7 },
    month: { label: 'هذا الشهر', days: 30 },
    quarter: { label: 'هذا الربع', days: 90 },
    year: { label: 'هذا العام', days: 365 },
  },

  // ألوان الحالة
  statusColors: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    primary: '#6366F1',
    secondary: '#8B5CF6',
  },

  // مؤشرات الأداء
  kpis: {
    attendance_rate: { label: 'نسبة الحضور', target: 90, unit: '%' },
    satisfaction_rate: { label: 'نسبة الرضا', target: 85, unit: '%' },
    active_beneficiaries: { label: 'المستفيدون النشطون', target: null, unit: '' },
    sessions_completed: { label: 'الجلسات المكتملة', target: null, unit: '' },
    staff_attendance: { label: 'حضور الموظفين', target: 95, unit: '%' },
    transport_efficiency: { label: 'كفاءة النقل', target: 90, unit: '%' },
  },
};

/**
 * Dashboard Widget Schema
 */
const DashboardWidgetSchema = new mongoose.Schema(
  {
    widgetId: { type: String, unique: true },
    centerId: String,

    info: {
      title: String,
      titleAr: String,
      type: { type: String, enum: Object.keys(dashboardConfig.cardTypes) },
      size: { type: String, enum: ['small', 'medium', 'large', 'full'] },
      position: { x: Number, y: Number },
      order: Number,
    },

    settings: {
      dataSource: String,
      refreshInterval: Number,
      timeRange: { type: String, enum: Object.keys(dashboardConfig.timeRanges) },
      filters: mongoose.Schema.Types.Mixed,
      chartType: { type: String, enum: ['line', 'bar', 'pie', 'donut', 'area', 'gauge'] },
      showLegend: { type: Boolean, default: true },
    },

    cachedData: {
      data: mongoose.Schema.Types.Mixed,
      lastUpdated: Date,
      expiresAt: Date,
    },

    active: { type: Boolean, default: true },
    tenantId: String,
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: 'dashboard_widgets',
  }
);

/**
 * Dashboard Alert Schema
 */
const DashboardAlertSchema = new mongoose.Schema(
  {
    alertId: { type: String, unique: true },
    centerId: String,

    info: {
      title: String,
      titleAr: String,
      message: String,
      messageAr: String,
      type: { type: String, enum: ['info', 'warning', 'error', 'success'] },
      priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    },

    data: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ['active', 'acknowledged', 'resolved'], default: 'active' },
    expiresAt: Date,
    tenantId: String,
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: 'dashboard_alerts',
  }
);

/**
 * Rehabilitation Dashboard Service
 */
class RehabilitationDashboardService extends EventEmitter {
  constructor() {
    super();
    this.Widget = null;
    this.Alert = null;
    this.services = {};
  }

  async initialize(connection, services = {}) {
    this.Widget = connection.model('DashboardWidget', DashboardWidgetSchema);
    this.Alert = connection.model('DashboardAlert', DashboardAlertSchema);
    this.services = services;
    logger.info('✅ Rehabilitation Dashboard Service initialized');
  }

  // ============ Main Dashboard Data ============

  async getDashboardData(centerId, userId, options = {}) {
    const timeRange = options.timeRange || 'today';

    const [overview, beneficiariesStats, staffStats, transportStats, alerts] = await Promise.all([
      this.getOverviewStats(centerId, timeRange),
      this.getBeneficiariesStats(centerId, timeRange),
      this.getStaffStats(centerId, timeRange),
      this.getTransportStats(centerId, timeRange),
      this.getActiveAlerts(centerId),
    ]);

    return {
      overview,
      beneficiaries: beneficiariesStats,
      staff: staffStats,
      transport: transportStats,
      alerts,
      lastUpdated: new Date(),
    };
  }

  async getOverviewStats(centerId, timeRange) {
    return {
      totalBeneficiaries: 150,
      activeBeneficiaries: 128,
      totalStaff: 45,
      presentStaff: 42,
      activeRoutes: 8,
      sessionsToday: 35,
      attendanceRate: 92,
      satisfactionRate: 87,
    };
  }

  async getBeneficiariesStats(centerId, timeRange) {
    return {
      byDisability: {
        physical: 35,
        visual: 25,
        hearing: 20,
        intellectual: 30,
        autism: 25,
        multiple: 15,
      },
      byGender: { male: 85, female: 65 },
      byStatus: { active: 128, waiting: 22 },
      newThisMonth: 12,
      graduatedThisMonth: 5,
    };
  }

  async getStaffStats(centerId, timeRange) {
    return {
      byDepartment: {
        physical_therapy: 12,
        occupational_therapy: 8,
        speech_therapy: 7,
        behavioral_therapy: 6,
        administration: 5,
        other: 7,
      },
      attendanceToday: 93,
      onLeave: 3,
      avgPerformance: 4.3,
    };
  }

  async getTransportStats(centerId, timeRange) {
    return {
      totalVehicles: 12,
      activeVehicles: 10,
      underMaintenance: 2,
      routesOptimized: 8,
      onTimeRate: 94,
      distanceCovered: 1250,
    };
  }

  async getAttendanceChartData(centerId, timeRange) {
    const days = this.getDaysInRange(timeRange);
    const labels = days.map(d => d.toLocaleDateString('ar-SA', { weekday: 'short' }));

    return {
      labels,
      datasets: [
        {
          label: 'الحضور',
          data: days.map(() => Math.floor(Math.random() * 20) + 80),
          backgroundColor: dashboardConfig.statusColors.success,
        },
        {
          label: 'الغياب',
          data: days.map(() => Math.floor(Math.random() * 10) + 5),
          backgroundColor: dashboardConfig.statusColors.danger,
        },
      ],
    };
  }

  // ============ Alerts ============

  async getActiveAlerts(centerId) {
    if (!this.Alert) return [];
    return this.Alert.find({
      centerId,
      status: 'active',
    })
      .sort({ 'info.priority': -1 })
      .limit(10);
  }

  async createAlert(data) {
    if (!this.Alert) return null;
    const alertId = `ALERT-${Date.now()}`;
    return this.Alert.create({ ...data, alertId, status: 'active' });
  }

  async acknowledgeAlert(alertId) {
    if (!this.Alert) return null;
    return this.Alert.findOneAndUpdate({ alertId }, { status: 'acknowledged' }, { new: true });
  }

  // ============ KPIs ============

  async getKPIs(centerId) {
    return [
      {
        key: 'attendance_rate',
        label: 'نسبة الحضور',
        value: 92,
        target: 90,
        unit: '%',
        trend: 'up',
      },
      {
        key: 'satisfaction_rate',
        label: 'نسبة الرضا',
        value: 87,
        target: 85,
        unit: '%',
        trend: 'up',
      },
      {
        key: 'active_beneficiaries',
        label: 'المستفيدون النشطون',
        value: 128,
        unit: '',
        trend: 'up',
      },
      { key: 'sessions_completed', label: 'الجلسات المكتملة', value: 350, unit: '', trend: 'up' },
      {
        key: 'staff_attendance',
        label: 'حضور الموظفين',
        value: 93,
        target: 95,
        unit: '%',
        trend: 'stable',
      },
      {
        key: 'transport_efficiency',
        label: 'كفاءة النقل',
        value: 94,
        target: 90,
        unit: '%',
        trend: 'up',
      },
    ];
  }

  // ============ Real-time ============

  async getRealTimeMetrics(centerId) {
    return {
      timestamp: new Date(),
      activeSessions: 18,
      pendingPickups: 3,
      vehiclesOnRoute: 6,
      staffPresent: 42,
      beneficiariesPresent: 95,
      alertsActive: 2,
    };
  }

  // ============ Widgets ============

  async getWidgets(centerId) {
    if (!this.Widget) return [];
    return this.Widget.find({ centerId, active: true }).sort({ 'info.order': 1 });
  }

  async createWidget(data) {
    if (!this.Widget) return null;
    const widgetId = `WGT-${Date.now()}`;
    return this.Widget.create({ ...data, widgetId });
  }

  // ============ Helpers ============

  getDaysInRange(timeRange) {
    const days = [];
    const range = dashboardConfig.timeRanges[timeRange] || dashboardConfig.timeRanges.week;
    const today = new Date();

    for (let i = range.days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }

    return days;
  }

  getConfig() {
    return dashboardConfig;
  }
}

// Singleton
const rehabilitationDashboardService = new RehabilitationDashboardService();

module.exports = {
  RehabilitationDashboardService,
  rehabilitationDashboardService,
  dashboardConfig,
};

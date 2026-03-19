/**
 * Executive Analytics Service
 * Advanced analytics, KPI tracking, and business intelligence
 * Provides comprehensive insights for executive decision-making
 * 
 * Features:
 * - Real-time KPI monitoring
 * - Trend analysis and forecasting
 * - Comparative analysis across departments
 * - Custom metrics and dimensions
 * - Performance benchmarking
 * - Alert management
 */

const logger = require('../utils/logger');

class ExecutiveAnalyticsService {
  constructor() {
    this.kpis = new Map();
    this.metrics = new Map();
    this.trends = new Map();
    this.benchmarks = new Map();
    this.alerts = [];
    this.customDashboards = new Map();
    this.performanceData = [];
  }

  /**
   * Initialize executive analytics
   */
  async initialize() {
    try {
      logger.info('🚀 Executive Analytics Service: Initializing...');
      
      // Initialize default KPIs
      this.initializeDefaultKPIs();
      
      // Initialize performance tracking
      this.initializePerformanceTracking();
      
      logger.info('✅ Executive Analytics Service: Initialized');
      return true;
    } catch (error) {
      logger.error('❌ Executive Analytics Service: Initialization failed', error);
      return false;
    }
  }

  /**
   * Initialize default KPIs for the organization
   */
  initializeDefaultKPIs() {
    const defaultKPIs = [
      {
        id: 'kpi_revenue',
        name: 'Total Revenue',
        name_ar: 'إجمالي الإيرادات',
        category: 'Financial',
        target: 1000000,
        current: 850000,
        unit: 'SAR',
        trend: 'up',
        changePercent: 12.5,
        frequency: 'monthly',
        owner: 'CFO',
        description: 'Total revenue across all services',
      },
      {
        id: 'kpi_customer_satisfaction',
        name: 'Customer Satisfaction',
        name_ar: 'رضا العملاء',
        category: 'Customer',
        target: 95,
        current: 92,
        unit: '%',
        trend: 'up',
        changePercent: 2.3,
        frequency: 'monthly',
        owner: 'COO',
        description: 'Overall customer satisfaction score',
      },
      {
        id: 'kpi_operational_efficiency',
        name: 'Operational Efficiency',
        name_ar: 'كفاءة العمليات',
        category: 'Operations',
        target: 90,
        current: 87,
        unit: '%',
        trend: 'stable',
        changePercent: 0.5,
        frequency: 'weekly',
        owner: 'COO',
        description: 'Overall operational efficiency metric',
      },
      {
        id: 'kpi_employee_productivity',
        name: 'Employee Productivity',
        name_ar: 'إنتاجية الموظفين',
        category: 'HR',
        target: 85,
        current: 82,
        unit: 'index',
        trend: 'up',
        changePercent: 3.1,
        frequency: 'monthly',
        owner: 'CHRO',
        description: 'Average employee productivity index',
      },
      {
        id: 'kpi_market_share',
        name: 'Market Share',
        name_ar: 'حصة السوق',
        category: 'Market',
        target: 25,
        current: 22,
        unit: '%',
        trend: 'up',
        changePercent: 1.8,
        frequency: 'quarterly',
        owner: 'CEO',
        description: 'Market share percentage',
      },
    ];

    defaultKPIs.forEach(kpi => {
      this.kpis.set(kpi.id, {
        ...kpi,
        createdAt: new Date(),
        updatedAt: new Date(),
        history: [{
          timestamp: new Date(),
          value: kpi.current,
          target: kpi.target,
        }],
        alerts: [],
        insights: [],
      });
    });
  }

  /**
   * Initialize performance tracking
   */
  initializePerformanceTracking() {
    const performanceMetrics = [
      { metric: 'System Uptime', value: 99.98, unit: '%' },
      { metric: 'Average Response Time', value: 125, unit: 'ms' },
      { metric: 'Error Rate', value: 0.02, unit: '%' },
      { metric: 'Cache Hit Rate', value: 94.5, unit: '%' },
      { metric: 'Database Query Time', value: 45, unit: 'ms' },
    ];

    this.metrics.set('system_performance', {
      timestamp: new Date(),
      data: performanceMetrics,
      status: 'healthy',
    });
  }

  /**
   * Get all KPIs with detailed information
   */
  getAllKPIs(filters = {}) {
    let kpis = Array.from(this.kpis.values());

    // Apply filters
    if (filters.category) {
      kpis = kpis.filter(k => k.category === filters.category);
    }
    if (filters.owner) {
      kpis = kpis.filter(k => k.owner === filters.owner);
    }
    if (filters.frequency) {
      kpis = kpis.filter(k => k.frequency === filters.frequency);
    }

    return kpis.map(kpi => this.formatKPIResponse(kpi));
  }

  /**
   * Get specific KPI details
   */
  getKPIDetails(kpiId) {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) {
      return null;
    }

    return {
      ...this.formatKPIResponse(kpi),
      history: kpi.history.slice(-30), // Last 30 data points
      alerts: kpi.alerts,
      insights: this.generateKPIInsights(kpi),
      forecast: this.generateForecast(kpi),
      comparison: this.getComparitiveAnalysis(kpiId),
    };
  }

  /**
   * Format KPI response
   */
  formatKPIResponse(kpi) {
    const variance = kpi.current - kpi.target;
    const variancePercent = ((variance / kpi.target) * 100).toFixed(2);
    const status = this.getKPIStatus(variance, variancePercent);

    return {
      id: kpi.id,
      name: kpi.name,
      name_ar: kpi.name_ar,
      category: kpi.category,
      target: kpi.target,
      current: kpi.current,
      variance,
      variancePercent: parseFloat(variancePercent),
      unit: kpi.unit,
      status,
      trend: kpi.trend,
      changePercent: kpi.changePercent,
      frequency: kpi.frequency,
      owner: kpi.owner,
      description: kpi.description,
      lastUpdated: kpi.updatedAt,
      alertsCount: kpi.alerts.length,
    };
  }

  /**
   * Get KPI status based on target achievement
   */
  getKPIStatus(variance, variancePercent) {
    if (variancePercent >= -5) return 'on_track';
    if (variancePercent >= -10) return 'at_risk';
    return 'critical';
  }

  /**
   * Generate insights for a KPI
   */
  generateKPIInsights(kpi) {
    const insights = [];
    const variancePercent = ((kpi.current - kpi.target) / kpi.target) * 100;

    if (variancePercent < -10) {
      insights.push({
        type: 'warning',
        message: `${kpi.name} is ${Math.abs(variancePercent).toFixed(1)}% below target`,
        severity: 'high',
      });
    }

    if (kpi.trend === 'down' && variancePercent < 0) {
      insights.push({
        type: 'alert',
        message: `${kpi.name} shows negative trend and is below target`,
        severity: 'high',
        recommendation: 'Take immediate action to reverse the trend',
      });
    }

    if (variancePercent > 10) {
      insights.push({
        type: 'positive',
        message: `${kpi.name} is ${variancePercent.toFixed(1)}% above target`,
        severity: 'low',
      });
    }

    return insights;
  }

  /**
   * Generate forecast for KPI based on historical data
   */
  generateForecast(kpi) {
    if (kpi.history.length < 3) {
      return null;
    }

    // Simple trend-based forecast
    const recentData = kpi.history.slice(-6);
    const avg = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;
    const trend = recentData[recentData.length - 1].value - recentData[0].value;
    
    const projected30Days = avg + (trend / 6) * 1;
    const projected90Days = avg + (trend / 6) * 3;

    return {
      confidence: 0.75,
      projectedValues: {
        '30days': Math.round(projected30Days),
        '90days': Math.round(projected90Days),
      },
      trend: trend > 0 ? 'increasing' : 'decreasing',
    };
  }

  /**
   * Get comparative analysis for KPI
   */
  getComparitiveAnalysis(kpiId) {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return null;

    return {
      vs_target: {
        percent: ((kpi.current / kpi.target) * 100).toFixed(1),
        status: kpi.current >= kpi.target ? 'exceeding' : 'below',
      },
      vs_previous: {
        value: kpi.history.length > 1 ? kpi.history[kpi.history.length - 2].value : kpi.current,
        change: kpi.changePercent,
      },
      vs_industry: {
        percentile: Math.floor(Math.random() * 100), // Placeholder
        status: 'needs_analysis',
      },
    };
  }

  /**
   * Update KPI value
   */
  updateKPIValue(kpiId, newValue, timestamp = new Date()) {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) {
      return { success: false, error: 'KPI not found' };
    }

    const previousValue = kpi.current;
    const changePercent = ((newValue - previousValue) / previousValue * 100).toFixed(2);

    kpi.current = newValue;
    kpi.changePercent = parseFloat(changePercent);
    kpi.updatedAt = timestamp;
    kpi.trend = newValue > previousValue ? 'up' : newValue < previousValue ? 'down' : 'stable';

    // Add to history
    kpi.history.push({
      timestamp,
      value: newValue,
      target: kpi.target,
    });

    // Keep history length manageable
    if (kpi.history.length > 365) {
      kpi.history = kpi.history.slice(-365);
    }

    // Check for alerts
    this.checkKPIAlerts(kpiId);

    return { success: true, kpi: this.formatKPIResponse(kpi) };
  }

  /**
   * Check if KPI violates alert thresholds
   */
  checkKPIAlerts(kpiId) {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return;

    const variance = kpi.current - kpi.target;
    const variancePercent = (variance / kpi.target) * 100;

    kpi.alerts = [];

    if (variancePercent < -15) {
      kpi.alerts.push({
        type: 'critical',
        message: `${kpi.name} is critically below target (${variancePercent.toFixed(1)}%)`,
        timestamp: new Date(),
      });
    } else if (variancePercent < -5) {
      kpi.alerts.push({
        type: 'warning',
        message: `${kpi.name} is below target (${variancePercent.toFixed(1)}%)`,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get executive dashboard summary
   */
  getExecutiveDashboard() {
    const kpisArray = Array.from(this.kpis.values());
    
    const summary = {
      timestamp: new Date(),
      totalKPIs: kpisArray.length,
      kpisOnTrack: kpisArray.filter(k => {
        const variance = ((k.current - k.target) / k.target) * 100;
        return variance >= -5;
      }).length,
      kpisAtRisk: kpisArray.filter(k => {
        const variance = ((k.current - k.target) / k.target) * 100;
        return variance < -5 && variance >= -10;
      }).length,
      kpisCritical: kpisArray.filter(k => {
        const variance = ((k.current - k.target) / k.target) * 100;
        return variance < -10;
      }).length,
      totalAlerts: kpisArray.reduce((sum, k) => sum + k.alerts.length, 0),
      kpis: kpisArray.map(k => this.formatKPIResponse(k)),
      topPerformers: kpisArray
        .map(k => this.formatKPIResponse(k))
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 5),
      needsAttention: kpisArray
        .map(k => this.formatKPIResponse(k))
        .filter(k => k.status !== 'on_track')
        .slice(0, 5),
    };

    return summary;
  }

  /**
   * Get department performance comparison
   */
  getDepartmentComparison() {
    const byCategory = {};
    
    for (const kpi of this.kpis.values()) {
      if (!byCategory[kpi.category]) {
        byCategory[kpi.category] = {
          category: kpi.category,
          kpis: [],
          avgPerformance: 0,
          status: 'stable',
        };
      }
      byCategory[kpi.category].kpis.push(this.formatKPIResponse(kpi));
    }

    // Calculate average performance
    for (const category in byCategory) {
      const kpis = byCategory[category].kpis;
      const avgVariance = kpis.reduce((sum, k) => sum + k.variancePercent, 0) / kpis.length;
      byCategory[category].avgPerformance = avgVariance;
      byCategory[category].status = avgVariance >= -5 ? 'on_track' : 'at_risk';
    }

    return Object.values(byCategory);
  }

  /**
   * Generate executive report
   */
  generateExecutiveReport(timeframe = 'monthly') {
    const summary = this.getExecutiveDashboard();
    const departmentComparison = this.getDepartmentComparison();

    return {
      title: `Executive Performance Report - ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`,
      date: new Date(),
      executive_summary: {
        total_kpis: summary.totalKPIs,
        on_track: summary.kpisOnTrack,
        at_risk: summary.kpisAtRisk,
        critical: summary.kpisCritical,
        total_alerts: summary.totalAlerts,
        overall_status: summary.kpisCritical > 0 ? 'Critical' : summary.kpisAtRisk > 0 ? 'At Risk' : 'Healthy',
      },
      top_performers: summary.topPerformers,
      needs_attention: summary.needsAttention,
      department_performance: departmentComparison,
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Generate recommendations based on data
   */
  generateRecommendations() {
    const recommendations = [];
    const criticalKPIs = Array.from(this.kpis.values()).filter(k => {
      const variance = ((k.current - k.target) / k.target) * 100;
      return variance < -10;
    });

    if (criticalKPIs.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Action Required',
        message: `${criticalKPIs.length} critical KPIs require immediate attention`,
        details: criticalKPIs.map(k => k.name),
      });
    }

    const downwardTrends = Array.from(this.kpis.values()).filter(k => k.trend === 'down');
    if (downwardTrends.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Trend Analysis',
        message: `${downwardTrends.length} KPIs show negative trends`,
        details: downwardTrends.map(k => `${k.name}: ${k.changePercent.toFixed(1)}%`),
      });
    }

    return recommendations;
  }

  /**
   * Get custom dashboard by ID
   */
  getCustomDashboard(dashboardId) {
    return this.customDashboards.get(dashboardId);
  }

  /**
   * Create custom dashboard
   */
  createCustomDashboard(dashboardData) {
    const id = `dashboard_${Date.now()}`;
    const dashboard = {
      id,
      name: dashboardData.name,
      name_ar: dashboardData.name_ar,
      description: dashboardData.description,
      owner: dashboardData.owner,
      widgets: dashboardData.widgets || [],
      isDefault: dashboardData.isDefault || false,
      isPublic: dashboardData.isPublic || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      refreshInterval: dashboardData.refreshInterval || 300000, // 5 minutes
    };

    this.customDashboards.set(id, dashboard);
    return dashboard;
  }

  /**
   * Update custom dashboard
   */
  updateCustomDashboard(dashboardId, updates) {
    const dashboard = this.customDashboards.get(dashboardId);
    if (!dashboard) {
      return { success: false, error: 'Dashboard not found' };
    }

    Object.assign(dashboard, updates, { updatedAt: new Date() });
    return { success: true, dashboard };
  }

  /**
   * Add widget to dashboard
   */
  addWidgetToDashboard(dashboardId, widget) {
    const dashboard = this.customDashboards.get(dashboardId);
    if (!dashboard) {
      return { success: false, error: 'Dashboard not found' };
    }

    const newWidget = {
      id: `widget_${Date.now()}`,
      ...widget,
      position: widget.position || { x: 0, y: 0 },
      size: widget.size || { width: 4, height: 3 },
    };

    dashboard.widgets.push(newWidget);
    dashboard.updatedAt = new Date();

    return { success: true, widget: newWidget };
  }
}

module.exports = new ExecutiveAnalyticsService();

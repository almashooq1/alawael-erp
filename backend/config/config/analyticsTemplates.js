/**
 * analyticsTemplates.js
 * AlAwael ERP - Pre-built Analytics Dashboard Templates
 * Real-time KPI dashboards, trends, and business intelligence
 * February 22, 2026
 */

// ===========================
// EXECUTIVE DASHBOARD
// ===========================
const EXECUTIVE_DASHBOARD = {
  id: 'exec_dashboard',
  name: 'executiveDashboard',
  title: 'Executive Dashboard',
  description: 'High-level business metrics and KPIs',
  icon: 'chart-line',
  refreshInterval: 300000, // 5 minutes
  widgets: [
    {
      id: 'total_revenue',
      type: 'metric',
      title: 'Total Revenue',
      metric: 'totalRevenue',
      unit: 'SAR',
      size: 'small',
      position: { row: 0, col: 0 },
      settings: {
        showTrend: true,
        showHistory: true,
        decimals: 0,
        prefix: 'SAR ',
        threshold: { warning: 50000, critical: 30000 }
      }
    },
    {
      id: 'profit_margin',
      type: 'metric',
      title: 'Profit Margin',
      metric: 'profitMargin',
      unit: '%',
      size: 'small',
      position: { row: 0, col: 1 },
      settings: {
        showTrend: true,
        decimals: 2,
        suffix: '%',
        threshold: { warning: 15, critical: 10 }
      }
    },
    {
      id: 'customer_satisfaction',
      type: 'metric',
      title: 'Customer Satisfaction',
      metric: 'satisfaction',
      unit: '%',
      size: 'small',
      position: { row: 0, col: 2 },
      settings: {
        showTrend: true,
        decimals: 1,
        suffix: '%',
        threshold: { warning: 80, critical: 70 }
      }
    },
    {
      id: 'market_share',
      type: 'metric',
      title: 'Market Share',
      metric: 'marketShare',
      unit: '%',
      size: 'small',
      position: { row: 0, col: 3 },
      settings: {
        showTrend: true,
        decimals: 2,
        suffix: '%'
      }
    },
    {
      id: 'revenue_trend',
      type: 'chart',
      title: '30-Day Revenue Trend',
      chart: 'revenueTrend30',
      size: 'large',
      position: { row: 1, col: 0, colspan: 2 },
      settings: {
        type: 'line',
        period: '30days',
        showForecast: true,
        colors: ['#3b82f6', '#10b981']
      }
    },
    {
      id: 'profit_trend',
      type: 'chart',
      title: '30-Day Profit Trend',
      chart: 'profitTrend30',
      size: 'large',
      position: { row: 1, col: 2, colspan: 2 },
      settings: {
        type: 'line',
        period: '30days',
        showForecast: true,
        colors: ['#8b5cf6', '#ec4899']
      }
    },
    {
      id: 'department_performance',
      type: 'chart',
      title: 'Department Performance',
      chart: 'departmentPerformance',
      size: 'medium',
      position: { row: 2, col: 0, colspan: 2 },
      settings: {
        type: 'bar',
        metric: 'profitMargin'
      }
    },
    {
      id: 'product_revenue',
      type: 'chart',
      title: 'Top Products by Revenue',
      chart: 'topProductRevenue',
      size: 'medium',
      position: { row: 2, col: 2, colspan: 2 },
      settings: {
        type: 'pie',
        limit: 5,
        showLegend: true
      }
    }
  ]
};

// ===========================
// SALES ANALYTICS DASHBOARD
// ===========================
const SALES_DASHBOARD = {
  id: 'sales_dashboard',
  name: 'salesDashboard',
  title: 'Sales Analytics',
  description: 'Detailed sales performance, conversion, and forecast',
  icon: 'trending-up',
  refreshInterval: 180000, // 3 minutes
  widgets: [
    {
      id: 'daily_sales',
      type: 'metric',
      title: 'Today Sales',
      metric: 'todaySales',
      unit: 'SAR',
      size: 'small',
      position: { row: 0, col: 0 },
      settings: {
        showTrend: true,
        prefix: 'SAR ',
        decimals: 0
      }
    },
    {
      id: 'orders_today',
      type: 'metric',
      title: 'Orders Today',
      metric: 'ordersToday',
      unit: '#',
      size: 'small',
      position: { row: 0, col: 1 },
      settings: {
        showTrend: true,
        decimals: 0
      }
    },
    {
      id: 'avg_order_value',
      type: 'metric',
      title: 'Average Order Value',
      metric: 'avgOrderValue',
      unit: 'SAR',
      size: 'small',
      position: { row: 0, col: 2 },
      settings: {
        showTrend: true,
        prefix: 'SAR ',
        decimals: 0
      }
    },
    {
      id: 'conversion_rate',
      type: 'metric',
      title: 'Conversion Rate',
      metric: 'conversionRate',
      unit: '%',
      size: 'small',
      position: { row: 0, col: 3 },
      settings: {
        showTrend: true,
        suffix: '%',
        decimals: 2
      }
    },
    {
      id: 'sales_forecast',
      type: 'chart',
      title: 'Sales Forecast (30 Days)',
      chart: 'salesForecast30',
      size: 'large',
      position: { row: 1, col: 0, colspan: 2 },
      settings: {
        type: 'area',
        showConfidenceInterval: true,
        colors: ['#3b82f6', '#e0e7ff']
      }
    },
    {
      id: 'daily_sales_trend',
      type: 'chart',
      title: 'Daily Sales Trend',
      chart: 'dailySalesTrend',
      size: 'large',
      position: { row: 1, col: 2, colspan: 2 },
      settings: {
        type: 'bar',
        period: '30days'
      }
    },
    {
      id: 'customer_acquisition',
      type: 'chart',
      title: 'Customer Acquisition',
      chart: 'customerAcquisition',
      size: 'medium',
      position: { row: 2, col: 0, colspan: 2 },
      settings: {
        type: 'line',
        period: '90days'
      }
    },
    {
      id: 'sales_by_region',
      type: 'chart',
      title: 'Sales by Region',
      chart: 'salesByRegion',
      size: 'medium',
      position: { row: 2, col: 2, colspan: 2 },
      settings: {
        type: 'pie',
        showLegend: true
      }
    }
  ]
};

// ===========================
// OPERATIONAL DASHBOARD
// ===========================
const OPERATIONAL_DASHBOARD = {
  id: 'operational_dashboard',
  name: 'operationalDashboard',
  title: 'Operational Dashboard',
  description: 'Real-time operational metrics and KPIs',
  icon: 'activity',
  refreshInterval: 120000, // 2 minutes
  widgets: [
    {
      id: 'active_orders',
      type: 'metric',
      title: 'Active Orders',
      metric: 'activeOrders',
      unit: '#',
      size: 'small',
      position: { row: 0, col: 0 },
      settings: {
        showTrend: true,
        decimals: 0,
        threshold: { warning: 100, critical: 150 }
      }
    },
    {
      id: 'avg_fulfillment_time',
      type: 'metric',
      title: 'Avg Fulfillment Time',
      metric: 'avgFulfillmentTime',
      unit: 'hours',
      size: 'small',
      position: { row: 0, col: 1 },
      settings: {
        showTrend: true,
        decimals: 1,
        suffix: 'h',
        threshold: { warning: 48, critical: 72 }
      }
    },
    {
      id: 'inventory_health',
      type: 'metric',
      title: 'Inventory Health',
      metric: 'inventoryHealth',
      unit: '%',
      size: 'small',
      position: { row: 0, col: 2 },
      settings: {
        showTrend: true,
        decimals: 1,
        suffix: '%',
        threshold: { warning: 60, critical: 40 }
      }
    },
    {
      id: 'system_uptime',
      type: 'metric',
      title: 'System Uptime',
      metric: 'systemUptime',
      unit: '%',
      size: 'small',
      position: { row: 0, col: 3 },
      settings: {
        showTrend: false,
        decimals: 2,
        suffix: '%',
        threshold: { warning: 99.5, critical: 99 }
      }
    },
    {
      id: 'order_status_distribution',
      type: 'chart',
      title: 'Order Status Distribution',
      chart: 'orderStatusDistribution',
      size: 'medium',
      position: { row: 1, col: 0, colspan: 2 },
      settings: {
        type: 'donut',
        showLegend: true
      }
    },
    {
      id: 'fulfillment_timeline',
      type: 'chart',
      title: 'Fulfillment Timeline',
      chart: 'fulfillmentTimeline',
      size: 'medium',
      position: { row: 1, col: 2, colspan: 2 },
      settings: {
        type: 'bar',
        categories: ['pending', 'processing', 'shipped', 'delivered']
      }
    },
    {
      id: 'warehouse_capacity',
      type: 'chart',
      title: 'Warehouse Capacity',
      chart: 'warehouseCapacity',
      size: 'large',
      position: { row: 2, col: 0, colspan: 2 },
      settings: {
        type: 'bar',
        stacked: true,
        categories: ['WH-Riyadh', 'WH-Jeddah', 'WH-Dammam']
      }
    },
    {
      id: 'system_performance',
      type: 'chart',
      title: 'System Performance',
      chart: 'systemPerformance',
      size: 'large',
      position: { row: 2, col: 2, colspan: 2 },
      settings: {
        type: 'line',
        metrics: ['cpuUsage', 'memoryUsage', 'diskUsage']
      }
    }
  ]
};

// ===========================
// FINANCIAL DASHBOARD
// ===========================
const FINANCIAL_DASHBOARD = {
  id: 'financial_dashboard',
  name: 'financialDashboard',
  title: 'Financial Dashboard',
  description: 'Financial metrics, cash flow, and profitability',
  icon: 'dollar-sign',
  refreshInterval: 600000, // 10 minutes
  widgets: [
    {
      id: 'monthly_revenue',
      type: 'metric',
      title: 'Monthly Revenue',
      metric: 'monthlyRevenue',
      unit: 'SAR',
      size: 'small',
      position: { row: 0, col: 0 },
      settings: {
        showTrend: true,
        prefix: 'SAR ',
        decimals: 0
      }
    },
    {
      id: 'monthly_expenses',
      type: 'metric',
      title: 'Monthly Expenses',
      metric: 'monthlyExpenses',
      unit: 'SAR',
      size: 'small',
      position: { row: 0, col: 1 },
      settings: {
        showTrend: true,
        prefix: 'SAR ',
        decimals: 0
      }
    },
    {
      id: 'net_income',
      type: 'metric',
      title: 'Net Income',
      metric: 'netIncome',
      unit: 'SAR',
      size: 'small',
      position: { row: 0, col: 2 },
      settings: {
        showTrend: true,
        prefix: 'SAR ',
        decimals: 0
      }
    },
    {
      id: 'cash_flow',
      type: 'metric',
      title: 'Cash Flow',
      metric: 'cashFlow',
      unit: 'SAR',
      size: 'small',
      position: { row: 0, col: 3 },
      settings: {
        showTrend: true,
        prefix: 'SAR ',
        decimals: 0
      }
    },
    {
      id: 'revenue_expenses_trend',
      type: 'chart',
      title: 'Revenue vs Expenses',
      chart: 'revenueExpensesTrend',
      size: 'large',
      position: { row: 1, col: 0, colspan: 2 },
      settings: {
        type: 'bar',
        period: '12months',
        stacked: false
      }
    },
    {
      id: 'profit_trend_financial',
      type: 'chart',
      title: 'Profit Trend',
      chart: 'profitTrendFinancial',
      size: 'large',
      position: { row: 1, col: 2, colspan: 2 },
      settings: {
        type: 'area',
        period: '12months'
      }
    },
    {
      id: 'expense_breakdown',
      type: 'chart',
      title: 'Expense Breakdown',
      chart: 'expenseBreakdown',
      size: 'medium',
      position: { row: 2, col: 0, colspan: 2 },
      settings: {
        type: 'pie',
        categories: ['Salaries', 'Operations', 'Marketing', 'Tech', 'Other']
      }
    },
    {
      id: 'revenue_sources',
      type: 'chart',
      title: 'Revenue Sources',
      chart: 'revenueSources',
      size: 'medium',
      position: { row: 2, col: 2, colspan: 2 },
      settings: {
        type: 'pie',
        showLegend: true
      }
    }
  ]
};

// ===========================
// CUSTOMER ANALYTICS DASHBOARD
// ===========================
const CUSTOMER_DASHBOARD = {
  id: 'customer_dashboard',
  name: 'customerDashboard',
  title: 'Customer Analytics',
  description: 'Customer behavior, retention, and lifetime value',
  icon: 'users',
  refreshInterval: 300000, // 5 minutes
  widgets: [
    {
      id: 'total_customers',
      type: 'metric',
      title: 'Total Customers',
      metric: 'totalCustomers',
      unit: '#',
      size: 'small',
      position: { row: 0, col: 0 },
      settings: {
        showTrend: true,
        decimals: 0
      }
    },
    {
      id: 'active_customers',
      type: 'metric',
      title: 'Active Customers',
      metric: 'activeCustomers',
      unit: '#',
      size: 'small',
      position: { row: 0, col: 1 },
      settings: {
        showTrend: true,
        decimals: 0
      }
    },
    {
      id: 'customer_retention',
      type: 'metric',
      title: 'Retention Rate',
      metric: 'retentionRate',
      unit: '%',
      size: 'small',
      position: { row: 0, col: 2 },
      settings: {
        showTrend: true,
        suffix: '%',
        decimals: 2
      }
    },
    {
      id: 'avg_customer_lifetime',
      type: 'metric',
      title: 'Avg Customer LTV',
      metric: 'avgCustomerLTV',
      unit: 'SAR',
      size: 'small',
      position: { row: 0, col: 3 },
      settings: {
        showTrend: true,
        prefix: 'SAR ',
        decimals: 0
      }
    },
    {
      id: 'customer_growth',
      type: 'chart',
      title: 'Customer Growth',
      chart: 'customerGrowth',
      size: 'large',
      position: { row: 1, col: 0, colspan: 2 },
      settings: {
        type: 'area',
        period: '90days'
      }
    },
    {
      id: 'customer_segments',
      type: 'chart',
      title: 'Customer Segments',
      chart: 'customerSegments',
      size: 'large',
      position: { row: 1, col: 2, colspan: 2 },
      settings: {
        type: 'donut',
        segments: ['VIP', 'Premium', 'Regular', 'At-Risk']
      }
    },
    {
      id: 'churn_analysis',
      type: 'chart',
      title: 'Churn Analysis',
      chart: 'churnAnalysis',
      size: 'medium',
      position: { row: 2, col: 0, colspan: 2 },
      settings: {
        type: 'bar',
        period: '12months'
      }
    },
    {
      id: 'customer_satisfaction_trends',
      type: 'chart',
      title: 'Satisfaction Trends',
      chart: 'satisfactionTrends',
      size: 'medium',
      position: { row: 2, col: 2, colspan: 2 },
      settings: {
        type: 'line',
        period: '90days'
      }
    }
  ]
};

// ===========================
// TEMPLATE INITIALIZATION
// ===========================
function initializeDashboardTemplates(analyticsService) {
  try {
    const templates = [
      EXECUTIVE_DASHBOARD,
      SALES_DASHBOARD,
      OPERATIONAL_DASHBOARD,
      FINANCIAL_DASHBOARD,
      CUSTOMER_DASHBOARD
    ];

    const templateMap = {};

    for (const template of templates) {
      analyticsService.createDashboard(
        template.name,
        template.title,
        template.description
      );

      const dashboard = analyticsService.getDashboard(template.name);

      // Add all widgets to dashboard
      for (const widget of template.widgets) {
        dashboard.addWidget(widget);
      }

      templateMap[template.name] = template;
    }

    console.log('✅ Dashboard templates initialized successfully');
    return templateMap;
  } catch (error) {
    console.error('❌ Error initializing dashboard templates:', error);
    throw error;
  }
}

module.exports = {
  EXECUTIVE_DASHBOARD,
  SALES_DASHBOARD,
  OPERATIONAL_DASHBOARD,
  FINANCIAL_DASHBOARD,
  CUSTOMER_DASHBOARD,
  initializeDashboardTemplates
};

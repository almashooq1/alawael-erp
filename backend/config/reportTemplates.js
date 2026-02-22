/**
 * Pre-built Report Templates
 * Sales, Inventory, Financial, User reports
 * Created: February 22, 2026
 */

const { ReportTemplate, ReportBuilder } = require('../services/ReportingService');

// Sales Report Template
const salesReport = new ReportTemplate(
  'sales',
  'sales',
  'Sales Report',
  'Monthly sales analysis with revenue breakdown',
  [
    { key: 'date', label: 'Date', width: 12 },
    { key: 'orderId', label: 'Order ID', width: 15 },
    { key: 'customer', label: 'Customer', width: 20 },
    { key: 'amount', label: 'Amount (SAR)', width: 15 },
    { key: 'quantity', label: 'Qty', width: 8 },
    { key: 'status', label: 'Status', width: 12 },
  ],
  {
    includeSummary: true,
    includeCharts: true,
    pageSize: 'A4',
  }
);

// Inventory Report Template
const inventoryReport = new ReportTemplate(
  'inventory',
  'inventory',
  'Inventory Report',
  'Stock levels and movement tracking',
  [
    { key: 'productId', label: 'Product ID', width: 12 },
    { key: 'productName', label: 'Product Name', width: 25 },
    { key: 'sku', label: 'SKU', width: 12 },
    { key: 'quantity', label: 'Qty On Hand', width: 12 },
    { key: 'reorderLevel', label: 'Reorder Level', width: 14 },
    { key: 'status', label: 'Status', width: 12 },
    { key: 'lastUpdated', label: 'Last Updated', width: 15 },
  ],
  {
    includeSummary: true,
    includeCharts: false,
    pageSize: 'A4',
  }
);

// Financial Report Template
const financialReport = new ReportTemplate(
  'financial',
  'financial',
  'Financial Report',
  'Revenue, expenses, and profit analysis',
  [
    { key: 'date', label: 'Date', width: 12 },
    { key: 'category', label: 'Category', width: 15 },
    { key: 'revenue', label: 'Revenue (SAR)', width: 15 },
    { key: 'expenses', label: 'Expenses (SAR)', width: 15 },
    { key: 'profit', label: 'Profit (SAR)', width: 15 },
    { key: 'margin', label: 'Margin %', width: 10 },
  ],
  {
    includeSummary: true,
    includeCharts: true,
    pageSize: 'A4',
  }
);

// User Activity Report Template
const userActivityReport = new ReportTemplate(
  'userActivity',
  'users',
  'User Activity Report',
  'User engagement and activity metrics',
  [
    { key: 'userId', label: 'User ID', width: 12 },
    { key: 'name', label: 'Name', width: 20 },
    { key: 'email', label: 'Email', width: 25 },
    { key: 'lastLogin', label: 'Last Login', width: 15 },
    { key: 'loginCount', label: 'Logins', width: 10 },
    { key: 'actions', label: 'Actions', width: 10 },
  ],
  {
    includeSummary: true,
    includeCharts: false,
    pageSize: 'A4',
  }
);

// Customer Report Template
const customerReport = new ReportTemplate(
  'customers',
  'custom',
  'Customer Report',
  'Customer information and purchase history',
  [
    { key: 'customerId', label: 'Customer ID', width: 12 },
    { key: 'name', label: 'Name', width: 20 },
    { key: 'email', label: 'Email', width: 22 },
    { key: 'phone', label: 'Phone', width: 14 },
    { key: 'totalOrders', label: 'Total Orders', width: 12 },
    { key: 'totalSpent', label: 'Total Spent (SAR)', width: 16 },
    { key: 'lastPurchase', label: 'Last Purchase', width: 15 },
  ],
  {
    includeSummary: true,
    includeCharts: false,
    pageSize: 'A4',
  }
);

// Performance Report Template
const performanceReport = new ReportTemplate(
  'performance',
  'custom',
  'Performance Report',
  'System and application performance metrics',
  [
    { key: 'timestamp', label: 'Timestamp', width: 15 },
    { key: 'metric', label: 'Metric', width: 20 },
    { key: 'value', label: 'Value', width: 12 },
    { key: 'threshold', label: 'Threshold', width: 12 },
    { key: 'status', label: 'Status', width: 12 },
    { key: 'details', label: 'Details', width: 25 },
  ],
  {
    includeSummary: true,
    includeCharts: true,
    pageSize: 'A4',
  }
);

/**
 * Initialize all templates
 */
function initializeTemplates(reportingService) {
  reportingService.registerTemplate(salesReport);
  reportingService.registerTemplate(inventoryReport);
  reportingService.registerTemplate(financialReport);
  reportingService.registerTemplate(userActivityReport);
  reportingService.registerTemplate(customerReport);
  reportingService.registerTemplate(performanceReport);

  return {
    sales: salesReport,
    inventory: inventoryReport,
    financial: financialReport,
    userActivity: userActivityReport,
    customers: customerReport,
    performance: performanceReport,
  };
}

module.exports = {
  salesReport,
  inventoryReport,
  financialReport,
  userActivityReport,
  customerReport,
  performanceReport,
  initializeTemplates,
};

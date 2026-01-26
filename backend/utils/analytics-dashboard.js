/**
 * PHASE 16: ANALYTICS DASHBOARD
 * Real-time Reports & Visualizations
 * AlAwael Analytics v1.0 | 2026-01-24
 */

// ============================================================================
// 1. DASHBOARD MANAGER
// ============================================================================
export class AnalyticsDashboardManager {
  constructor(database) {
    this.db = database;
    this.cachedDashboards = new Map();
    this.updateInterval = 5000; // 5 seconds
  }

  /**
   * Initialize dashboard
   */
  async initializeDashboard(userId) {
    try {
      const dashboard = {
        id: `dashboard_${userId}_${Date.now()}`,
        userId,
        createdAt: new Date(),
        widgets: [],
        layout: 'default',
      };

      await this.db.collection('dashboards').insertOne(dashboard);
      this.cachedDashboards.set(userId, dashboard);

      return { success: true, dashboard };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(userId, widget) {
    try {
      const dashboard =
        this.cachedDashboards.get(userId) ||
        (await this.db.collection('dashboards').findOne({ userId }));

      if (!dashboard) {
        return { success: false, error: 'Dashboard not found' };
      }

      widget.id = `widget_${Date.now()}`;
      dashboard.widgets.push(widget);

      await this.db
        .collection('dashboards')
        .updateOne({ userId }, { $set: { widgets: dashboard.widgets } });

      return { success: true, widget };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove widget from dashboard
   */
  async removeWidget(userId, widgetId) {
    try {
      await this.db
        .collection('dashboards')
        .updateOne({ userId }, { $pull: { widgets: { id: widgetId } } });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update widget data
   */
  async updateWidgetData(userId, widgetId, data) {
    try {
      await this.db
        .collection('dashboards')
        .updateOne(
          { userId, 'widgets.id': widgetId },
          { $set: { 'widgets.$.data': data, 'widgets.$.lastUpdated': new Date() } }
        );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get dashboard with real-time data
   */
  async getDashboardWithData(userId) {
    try {
      const dashboard = await this.db.collection('dashboards').findOne({ userId });

      if (!dashboard) {
        return { success: false, error: 'Dashboard not found' };
      }

      // Load real-time data for each widget
      const enrichedWidgets = await Promise.all(
        dashboard.widgets.map(widget => this.loadWidgetData(widget))
      );

      return {
        success: true,
        dashboard: { ...dashboard, widgets: enrichedWidgets },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Load widget data
   */
  async loadWidgetData(widget) {
    try {
      const data = await this.db
        .collection(`widget_data_${widget.type}`)
        .findOne({ widgetId: widget.id }, { sort: { createdAt: -1 } });

      return { ...widget, data: data?.data || null };
    } catch (error) {
      return widget;
    }
  }
}

// ============================================================================
// 2. REPORT GENERATOR
// ============================================================================
export class ReportGenerator {
  constructor(database) {
    this.db = database;
  }

  /**
   * Generate sales report
   */
  async generateSalesReport(startDate, endDate, groupBy = 'day') {
    try {
      const sales = await this.db
        .collection('sales')
        .aggregate([
          {
            $match: {
              date: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: this.getGroupKey(groupBy),
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 },
              avgAmount: { $avg: '$amount' },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      const report = {
        type: 'sales',
        title: `Sales Report (${startDate} - ${endDate})`,
        generatedAt: new Date(),
        data: sales,
        summary: {
          totalSales: sales.reduce((sum, s) => sum + s.totalAmount, 0),
          averageSale: sales.reduce((sum, s) => sum + s.avgAmount, 0) / sales.length,
          transactionCount: sales.reduce((sum, s) => sum + s.count, 0),
        },
      };

      await this.db.collection('reports').insertOne(report);
      return { success: true, report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport() {
    try {
      const inventory = await this.db.collection('inventory').find({}).toArray();

      const report = {
        type: 'inventory',
        title: 'Inventory Report',
        generatedAt: new Date(),
        data: inventory,
        summary: {
          totalItems: inventory.length,
          totalValue: inventory.reduce((sum, item) => sum + item.quantity * item.price, 0),
          lowStockItems: inventory.filter(item => item.quantity < item.minStock).length,
          averageStockLevel:
            inventory.reduce((sum, item) => sum + item.quantity, 0) / inventory.length,
        },
      };

      await this.db.collection('reports').insertOne(report);
      return { success: true, report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate customer report
   */
  async generateCustomerReport() {
    try {
      const customers = await this.db
        .collection('customers')
        .aggregate([
          {
            $lookup: {
              from: 'sales',
              localField: '_id',
              foreignField: 'customerId',
              as: 'sales',
            },
          },
          {
            $project: {
              name: 1,
              email: 1,
              totalPurchases: { $sum: '$sales.amount' },
              transactionCount: { $size: '$sales' },
              lastPurchase: { $max: '$sales.date' },
            },
          },
          { $sort: { totalPurchases: -1 } },
        ])
        .toArray();

      const report = {
        type: 'customer',
        title: 'Customer Report',
        generatedAt: new Date(),
        data: customers,
        summary: {
          totalCustomers: customers.length,
          totalRevenue: customers.reduce((sum, c) => sum + c.totalPurchases, 0),
          averageCustomerValue:
            customers.reduce((sum, c) => sum + c.totalPurchases, 0) / customers.length,
          activeCustomers: customers.filter(c => c.transactionCount > 0).length,
        },
      };

      await this.db.collection('reports').insertOne(report);
      return { success: true, report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate financial report
   */
  async generateFinancialReport(startDate, endDate) {
    try {
      const sales = await this.db
        .collection('sales')
        .find({ date: { $gte: startDate, $lte: endDate } })
        .toArray();

      const expenses = await this.db
        .collection('expenses')
        .find({ date: { $gte: startDate, $lte: endDate } })
        .toArray();

      const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalRevenue - totalExpenses;

      const report = {
        type: 'financial',
        title: `Financial Report (${startDate} - ${endDate})`,
        generatedAt: new Date(),
        data: { sales, expenses },
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin: ((netProfit / totalRevenue) * 100).toFixed(2) + '%',
          transactionCount: sales.length + expenses.length,
        },
      };

      await this.db.collection('reports').insertOne(report);
      return { success: true, report };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getGroupKey(groupBy) {
    switch (groupBy) {
      case 'day':
        return { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
      case 'week':
        return { $week: '$date' };
      case 'month':
        return { $dateToString: { format: '%Y-%m', date: '$date' } };
      case 'year':
        return { $year: '$date' };
      default:
        return { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    }
  }
}

// ============================================================================
// 3. EXPORT SERVICE
// ============================================================================
export class ExportService {
  /**
   * Export to CSV
   */
  static exportToCSV(data, filename) {
    try {
      if (!data || data.length === 0) {
        return { success: false, error: 'No data to export' };
      }

      const headers = Object.keys(data[0]);
      const rows = data.map(item =>
        headers
          .map(header => {
            const value = item[header];
            // Escape quotes and wrap in quotes if contains comma
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(',')
      );

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      return {
        success: true,
        url,
        filename: `${filename}.csv`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Export to Excel
   */
  static exportToExcel(data, sheetName = 'Sheet1') {
    try {
      // Note: In production, use xlsx library
      const workbook = {
        sheets: [
          {
            name: sheetName,
            data: data,
          },
        ],
      };

      return {
        success: true,
        workbook,
        filename: `export_${Date.now()}.xlsx`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Export to PDF
   */
  static exportToPDF(reportData, filename) {
    try {
      // Note: In production, use pdfkit or similar
      const pdfContent = {
        title: reportData.title,
        generatedAt: reportData.generatedAt,
        summary: reportData.summary,
        data: reportData.data,
      };

      return {
        success: true,
        content: pdfContent,
        filename: `${filename}.pdf`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Export to JSON
   */
  static exportToJSON(data, filename) {
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      return {
        success: true,
        url,
        filename: `${filename}.json`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// 4. REAL-TIME DATA STREAM
// ============================================================================
export class RealTimeDataStream {
  constructor(io) {
    this.io = io;
    this.subscriptions = new Map();
  }

  /**
   * Subscribe to dashboard updates
   */
  subscribe(userId, callback) {
    const subscription = {
      userId,
      callback,
      createdAt: new Date(),
    };

    this.subscriptions.set(`user_${userId}`, subscription);

    // Setup socket listener
    this.io.on(`dashboard_${userId}`, data => {
      callback(data);
    });

    return subscription;
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(userId) {
    this.subscriptions.delete(`user_${userId}`);
    this.io.off(`dashboard_${userId}`);
    return { success: true };
  }

  /**
   * Broadcast dashboard update
   */
  broadcastUpdate(userId, data) {
    this.io.to(userId).emit(`dashboard_${userId}`, {
      timestamp: new Date(),
      data,
    });
  }

  /**
   * Broadcast to all connected users
   */
  broadcastToAll(event, data) {
    this.io.emit(event, {
      timestamp: new Date(),
      data,
    });
  }
}

// ============================================================================
// 5. DATA VISUALIZATION CONFIG
// ============================================================================
export const visualizationConfig = {
  // Chart types
  charts: {
    line: {
      type: 'line',
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    },
    bar: {
      type: 'bar',
      options: {
        responsive: true,
        indexAxis: 'x',
      },
    },
    pie: {
      type: 'pie',
      options: {
        responsive: true,
        maintainAspectRatio: true,
      },
    },
    doughnut: {
      type: 'doughnut',
      options: {
        responsive: true,
      },
    },
    area: {
      type: 'line',
      options: {
        fill: true,
        responsive: true,
      },
    },
  },

  // Color schemes
  colors: {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    info: '#00B0FF',
    neutral: '#8E8E93',
  },

  // Default datasets
  defaultDataset: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 2,
    tension: 0.4,
    fill: true,
  },
};

export default {
  AnalyticsDashboardManager,
  ReportGenerator,
  ExportService,
  RealTimeDataStream,
  visualizationConfig,
};

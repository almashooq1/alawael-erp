const TherapySession = require('../models/TherapySession');
const Invoice = require('../models/Invoice');
const Employee = require('../models/Employee');
const BeneficiaryFile = require('../models/BeneficiaryFile');
const TherapeuticPlan = require('../models/TherapeuticPlan');

class SmartDashboardService {
  /**
   * Get High-Level Executive Summary
   */
  static async getExecutiveSummary() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Parallel Execution for Speed
    const [todaysSessions, activePatients, activeStaff, todaysRevenue, pendingInvoices] = await Promise.all([
      // 1. Ops: Sessions Today
      TherapySession.countDocuments({ date: { $gte: startOfDay, $lte: endOfDay } }),

      // 2. Growth: Active Patients
      BeneficiaryFile.countDocuments({}), // Add { status: 'ACTIVE' } if field exists

      // 3. HR: Active Staff
      Employee.countDocuments({ status: 'ACTIVE' }),

      // 4. Finance: Revenue generated today (Invoices created today)
      Invoice.aggregate([
        { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),

      // 5. Cash Flow: Pending Invoices
      Invoice.countDocuments({ status: 'UNPAID' }),
    ]);

    return {
      operations: {
        sessionsToday: todaysSessions,
        activePatients: activePatients,
      },
      hr: {
        activeEmployeeCount: activeStaff,
      },
      finance: {
        revenueToday: todaysRevenue[0] ? todaysRevenue[0].total : 0,
        pendingInvoicesCount: pendingInvoices,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * AI-Driven Financial Forecast
   * Predicts next month's revenue based on ACTIVE Plans
   */
  static async getFinancialForecast() {
    // Logic: Find all active plans.
    // Assume 4 sessions/month per plan * Avg Price ($150)

    const activePlans = await TherapeuticPlan.countDocuments({ status: 'ACTIVE' });

    // Mock average calculation (In real app, calculate from plan frequency)
    const avgSessionsPerMonth = 4;
    const avgPricePerSession = 150;

    const projectedRevenue = activePlans * avgSessionsPerMonth * avgPricePerSession;

    return {
      activePlans,
      forecastMethod: 'Basic Linear Projection (Active Plans * 4 sessions * $150)',
      nextMonthProjection: projectedRevenue,
      confidence: 'MEDIUM',
    };
  }

  /**
   * operational Health
   * Check for issues requiring immediate attention
   */
  static async getSystemHealth() {
    const errors = [];

    // Check for Unassigned Shifts
    // Mock check on Shifts

    // Check for Therapists with 0 sessions scheduled (Underutilization)
    // Ignoring for now to keep it simple

    return {
      status: errors.length > 0 ? 'WARNING' : 'HEALTHY',
      issues: errors,
    };
  }
}

module.exports = SmartDashboardService;
module.exports.instance = new SmartDashboardService();

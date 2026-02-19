/**
 * Advanced Analytics Service - Phase 9
 * KPI tracking, predictive analytics, and business intelligence
 */

class AnalyticsService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Calculate KPIs for an organization
   */
  async calculateKPIs(organizationId) {
    const [
      totalEmployees,
      activeEmployees,
      turnoverRate,
      avgSalary,
      departmentMetrics,
      leaveMetrics,
      performanceMetrics,
    ] = await Promise.all([
      this.getTotalEmployees(organizationId),
      this.getActiveEmployees(organizationId),
      this.calculateTurnoverRate(organizationId),
      this.getAverageSalary(organizationId),
      this.getDepartmentMetrics(organizationId),
      this.getLeaveMetrics(organizationId),
      this.getPerformanceMetrics(organizationId),
    ]);

    return {
      summary: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees: totalEmployees - activeEmployees,
        turnoverRate: `${(turnoverRate * 100).toFixed(2)}%`,
      },
      financial: {
        totalPayroll: avgSalary * activeEmployees,
        averageSalary: avgSalary,
        payrollGrowthRate: await this.getPayrollGrowth(organizationId),
      },
      departments: departmentMetrics,
      leave: leaveMetrics,
      performance: performanceMetrics,
      timestamp: new Date(),
    };
  }

  /**
   * Get total employees
   */
  async getTotalEmployees(organizationId) {
    const result = await this.db.collection('employees').countDocuments({
      organizationId,
      status: { $ne: 'deleted' },
    });
    return result;
  }

  /**
   * Get active employees
   */
  async getActiveEmployees(organizationId) {
    const result = await this.db.collection('employees').countDocuments({
      organizationId,
      status: 'active',
    });
    return result;
  }

  /**
   * Calculate turnover rate
   */
  async calculateTurnoverRate(organizationId) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const separated = await this.db.collection('employees').countDocuments({
      organizationId,
      status: 'separated',
      separationDate: { $gte: sixMonthsAgo },
    });

    const avgEmployees = await this.getTotalEmployees(organizationId);
    return avgEmployees > 0 ? separated / avgEmployees / 0.5 : 0; // Annualized
  }

  /**
   * Get average salary
   */
  async getAverageSalary(organizationId) {
    const result = await this.db
      .collection('employees')
      .aggregate([
        {
          $match: {
            organizationId,
            status: 'active',
          },
        },
        {
          $group: {
            _id: null,
            average: { $avg: '$salary' },
          },
        },
      ])
      .toArray();

    return result.length > 0 ? result[0].average : 0;
  }

  /**
   * Get department metrics
   */
  async getDepartmentMetrics(organizationId) {
    const departments = await this.db
      .collection('employees')
      .aggregate([
        {
          $match: {
            organizationId,
            status: 'active',
          },
        },
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 },
            averageSalary: { $avg: '$salary' },
            avgTenure: {
              $avg: {
                $divide: [{ $subtract: [new Date(), '$joinDate'] }, 1000 * 60 * 60 * 24 * 365],
              },
            },
          },
        },
        {
          $sort: { count: -1 },
        },
      ])
      .toArray();

    return departments.map(d => ({
      department: d._id,
      employees: d.count,
      averageSalary: Math.round(d.averageSalary),
      averageTenureYears: Math.round(d.avgTenure * 10) / 10,
    }));
  }

  /**
   * Get leave metrics
   */
  async getLeaveMetrics(organizationId) {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const leaveData = await this.db
      .collection('leave_requests')
      .aggregate([
        {
          $match: {
            organizationId,
            startDate: { $gte: startOfYear, $lte: endOfYear },
            status: 'approved',
          },
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: 1 },
            totalDays: { $sum: '$numberOfDays' },
          },
        },
      ])
      .toArray();

    const pendingRequests = await this.db.collection('leave_requests').countDocuments({
      organizationId,
      status: 'pending',
    });

    return {
      byType: Object.fromEntries(
        leaveData.map(d => [d._id, { requests: d.total, days: d.totalDays }])
      ),
      pendingApproval: pendingRequests,
    };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(organizationId) {
    const ratings = await this.db
      .collection('performance_reviews')
      .aggregate([
        {
          $match: {
            organizationId,
            year: new Date().getFullYear(),
          },
        },
        {
          $group: {
            _id: '$overallRating',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ])
      .toArray();

    return {
      distributionByRating: Object.fromEntries(ratings.map(r => [r._id, r.count])),
      totalReviewsCompleted: ratings.reduce((sum, r) => sum + r.count, 0),
    };
  }

  /**
   * Get payroll growth rate
   */
  async getPayrollGrowth(organizationId) {
    const months = 12;
    const monthlyPayroll = [];

    for (let i = 0; i < months; i++) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);

      const payroll = await this.db
        .collection('payroll')
        .aggregate([
          {
            $match: {
              organizationId,
              month: month.getMonth() + 1,
              year: month.getFullYear(),
            },
          },
          {
            $group: {
              _id: null,
              totalPayroll: { $sum: '$grossSalary' },
            },
          },
        ])
        .toArray();

      monthlyPayroll.unshift({
        month: month.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        payroll: payroll.length > 0 ? payroll[0].totalPayroll : 0,
      });
    }

    if (monthlyPayroll.length < 2) return 0;

    const currentPayroll = monthlyPayroll[monthlyPayroll.length - 1].payroll;
    const lastYearPayroll = monthlyPayroll[0].payroll;

    return lastYearPayroll > 0 ? ((currentPayroll - lastYearPayroll) / lastYearPayroll) * 100 : 0;
  }

  /**
   * Get predictive analytics - Turnover Risk
   */
  async predictTurnoverRisk(organizationId) {
    const employees = await this.db
      .collection('employees')
      .find({
        organizationId,
        status: 'active',
      })
      .toArray();

    const riskAssessments = employees.map(emp => {
      let riskScore = 0;

      // Tenure (lower tenure = higher risk)
      const tenure = (Date.now() - new Date(emp.joinDate)) / (1000 * 60 * 60 * 24 * 365);
      if (tenure < 1) riskScore += 30;
      else if (tenure < 3) riskScore += 15;

      // Last promotion (long time without promotion = higher risk)
      if (emp.lastPromotion) {
        const promotionGap =
          (Date.now() - new Date(emp.lastPromotion)) / (1000 * 60 * 60 * 24 * 365);
        if (promotionGap > 3) riskScore += 20;
      } else {
        riskScore += 25;
      }

      // Performance rating (low performance = higher risk)
      if (emp.lastPerformanceRating) {
        const ratingMap = {
          'Below Average': 25,
          Average: 10,
          'Above Average': 0,
          Excellent: -5,
        };
        riskScore += ratingMap[emp.lastPerformanceRating] || 0;
      }

      // Salary (low salary = higher risk)
      if (emp.salary < 30000) riskScore += 15;

      return {
        employeeId: emp._id,
        name: emp.name,
        riskScore: Math.min(100, Math.max(0, riskScore)),
        riskLevel: riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW',
        riskFactors: [],
      };
    });

    return riskAssessments
      .filter(r => r.riskLevel !== 'LOW')
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Generate custom report
   */
  async generateCustomReport(organizationId, config) {
    const report = {
      title: config.title,
      generatedAt: new Date(),
      metrics: {},
    };

    if (config.includeKPIs) {
      report.metrics.kpis = await this.calculateKPIs(organizationId);
    }

    if (config.includeTurnoverRisk) {
      report.metrics.turnoverRisk = await this.predictTurnoverRisk(organizationId);
    }

    if (config.includeDepartmentAnalysis) {
      report.metrics.departments = await this.getDepartmentMetrics(organizationId);
    }

    if (config.includeLeaveAnalysis) {
      report.metrics.leave = await this.getLeaveMetrics(organizationId);
    }

    return report;
  }

  /**
   * Export report as PDF (integration with pdfkit)
   */
  async exportReportAsPDF(report) {
    // Implementation would use pdfkit to generate PDF
    console.log(`Exporting report: ${report.title}`);
    return {
      filename: `report_${Date.now()}.pdf`,
      size: 1024 * 100, // bytes
    };
  }

  /**
   * Export report as CSV
   */
  async exportReportAsCSV(report) {
    // Implementation would generate CSV data
    console.log(`Exporting report as CSV: ${report.title}`);
    return {
      filename: `report_${Date.now()}.csv`,
      headers: Object.keys(report.metrics),
    };
  }
}

module.exports = AnalyticsService;

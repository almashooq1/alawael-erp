/**
 * Guardian Portal Service
 * 
 * Business logic for guardian portal operations
 * - Multi-beneficiary management
 * - Advanced analytics
 * - Financial management
 * - Comprehensive reporting
 */

const Guardian = require('../models/Guardian');
const Beneficiary = require('../models/Beneficiary');
const BeneficiaryProgress = require('../models/BeneficiaryProgress');
const PortalPayment = require('../models/PortalPayment');
const PortalNotification = require('../models/PortalNotification');
const BeneficiaryService = require('./beneficiary.service');

class GuardianService {
  /**
   * Get comprehensive dashboard for guardian
   * @param {String} guardianId
   */
  static async getComprehensiveDashboard(guardianId) {
    const guardian = await Guardian.findById(guardianId)
      .populate('beneficiaries', 'firstName_ar firstName_en academicScore attendanceRate')
      .lean();

    const beneficiaryIds = guardian.beneficiaries.map(b => b._id);

    // Get latest progress for all beneficiaries
    const progressData = await BeneficiaryProgress.find({
      beneficiaryId: { $in: beneficiaryIds }
    })
      .sort({ month: -1 })
      .limit(beneficiaryIds.length)
      .lean();

    // Get financial summary
    const payments = await PortalPayment.find({ guardianId }).lean();
    const totalDue = payments
      .filter(p => ['pending', 'partially_paid', 'overdue'].includes(p.status))
      .reduce((sum, p) => sum + (p.amount - (p.amountPaid || 0)), 0);

    // Get unread notifications
    const unreadNotifications = await PortalNotification.countDocuments({
      guardianId,
      isRead: false
    });

    const dashboard = {
      guardian: {
        name: guardian.firstName_ar + ' ' + guardian.lastName_ar,
        email: guardian.email,
        phone: guardian.phone,
        verified: guardian.accountStatus === 'verified'
      },
      beneficiaries: {
        count: beneficiaryIds.length,
        list: guardian.beneficiaries.map(b => {
          const progress = progressData.find(p => p.beneficiaryId.toString() === b._id.toString());
          return {
            id: b._id,
            name: b.firstName_ar + ' ' + b.firstName_en,
            score: progress?.academicScore || 0,
            attendance: progress?.attendanceRate || 0,
            status: progress?.performanceStatus || 'pending'
          };
        })
      },
      financial: {
        totalDue: totalDue.toFixed(2),
        pendingPayments: payments.filter(p => p.status === 'pending').length,
        overduePayments: payments.filter(p => p.status === 'overdue').length
      },
      notifications: {
        unread: unreadNotifications
      }
    };

    return dashboard;
  }

  /**
   * Get performance comparison across beneficiaries
   * @param {String} guardianId
   */
  static async getPerformanceComparison(guardianId) {
    const guardian = await Guardian.findById(guardianId)
      .populate('beneficiaries', '_id firstName_ar')
      .lean();

    const beneficiaryIds = guardian.beneficiaries.map(b => b._id);

    const comparison = await Promise.all(
      guardian.beneficiaries.map(async (beneficiary) => {
        const progress = await BeneficiaryProgress.findOne({
          beneficiaryId: beneficiary._id
        })
          .sort({ month: -1 })
          .lean();

        const alerts = await BeneficiaryService.getAllAlerts(beneficiary._id);

        return {
          beneficiaryId: beneficiary._id,
          name: beneficiary.firstName_ar,
          score: progress?.academicScore || 0,
          attendance: progress?.attendanceRate || 0,
          behavior: progress?.behaviorRating || 0,
          alerts: alerts.total,
          status: progress?.performanceStatus || 'pending'
        };
      })
    );

    return {
      beneficiaries: comparison,
      topPerformer: comparison.sort((a, b) => b.score - a.score)[0] || null,
      bottomPerformer: comparison.sort((a, b) => a.score - b.score)[0] || null,
      averageScore: (comparison.reduce((sum, b) => sum + b.score, 0) / comparison.length).toFixed(2)
    };
  }

  /**
   * Get advanced analytics for all beneficiaries
   * @param {String} guardianId
   */
  static async getAdvancedAnalytics(guardianId) {
    const guardian = await Guardian.findById(guardianId)
      .populate('beneficiaries', '_id')
      .lean();

    const beneficiaryIds = guardian.beneficiaries.map(b => b._id);

    // Get 12 months of data
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const progressData = await BeneficiaryProgress.find({
      beneficiaryId: { $in: beneficiaryIds },
      createdAt: { $gte: twelveMonthsAgo }
    })
      .sort({ month: 1 })
      .lean();

    // Aggregate statistics
    const analytics = {
      academic: {
        averageScore: (progressData.reduce((sum, p) => sum + p.academicScore, 0) / progressData.length).toFixed(2),
        trend: progressData.length >= 2 ? 
          (progressData[progressData.length - 1].academicScore - progressData[0].academicScore) : 0,
        distribution: {
          excellent: progressData.filter(p => p.academicScore >= 80).length,
          good: progressData.filter(p => p.academicScore >= 70 && p.academicScore < 80).length,
          satisfactory: progressData.filter(p => p.academicScore >= 60 && p.academicScore < 70).length,
          needsImprovement: progressData.filter(p => p.academicScore < 60).length
        }
      },
      attendance: {
        averageRate: (progressData.reduce((sum, p) => sum + p.attendanceRate, 0) / progressData.length).toFixed(2),
        totalAbsences: progressData.reduce((sum, p) => sum + p.absenceDays, 0),
        totalLateArrivals: progressData.reduce((sum, p) => sum + p.lateDays, 0)
      },
      behavior: {
        averageRating: (progressData.reduce((sum, p) => sum + p.behaviorRating, 0) / progressData.length).toFixed(2)
      },
      activities: {
        averageCompletion: (progressData.reduce((sum, p) => sum + p.activityCompletionRate, 0) / progressData.length).toFixed(2)
      }
    };

    return analytics;
  }

  /**
   * Get financial forecast
   * @param {String} guardianId
   */
  static async getFinancialForecast(guardianId) {
    const guardian = await Guardian.findById(guardianId);
    const payments = await PortalPayment.find({ guardianId }).lean();

    // Next 3 months forecast
    const forecast = {
      nextMonth: 0,
      nextThreeMonths: 0,
      nextSixMonths: 0,
      trend: 'stable',
      recommendations: []
    };

    const now = new Date();

    const nextMonth = payments
      .filter(p => {
        const paymentDate = new Date(p.dueDate);
        return paymentDate > now && paymentDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      })
      .reduce((sum, p) => sum + (p.amount - (p.amountPaid || 0)), 0);

    const nextThreeMonths = payments
      .filter(p => {
        const paymentDate = new Date(p.dueDate);
        return paymentDate > now && paymentDate <= new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      })
      .reduce((sum, p) => sum + (p.amount - (p.amountPaid || 0)), 0);

    forecast.nextMonth = nextMonth;
    forecast.nextThreeMonths = nextThreeMonths;

    if (guardian.totalOverdue > 0) {
      forecast.recommendations.push('Address overdue payments immediately');
    }

    if (nextThreeMonths > 5000) {
      forecast.recommendations.push('Large payments expected; plan accordingly');
    }

    if (guardian.totalDue === 0) {
      forecast.trend = 'excellent';
      forecast.recommendations.push('All payments current; maintain this status');
    }

    return forecast;
  }

  /**
   * Generate comprehensive progress report for all beneficiaries
   * @param {String} guardianId
   * @param {String} month
   */
  static async generateComprehensiveReport(guardianId, month = null) {
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const guardian = await Guardian.findById(guardianId)
      .populate('beneficiaries', '_id firstName_ar')
      .lean();

    const report = {
      generatedAt: new Date(),
      month: currentMonth,
      beneficiaries: []
    };

    for (const beneficiary of guardian.beneficiaries) {
      const progress = await BeneficiaryProgress.findOne({
        beneficiaryId: beneficiary._id,
        month: currentMonth
      }).lean();

      const alerts = await BeneficiaryService.getAllAlerts(beneficiary._id);
      const atRisk = await BeneficiaryService.isStudentAtRisk(beneficiary._id);

      report.beneficiaries.push({
        name: beneficiary.firstName_ar,
        progress: progress || { message: 'No data available' },
        alerts: alerts,
        atRisk: atRisk.atRisk
      });
    }

    return report;
  }

  /**
   * Send periodic progress notifications to guardian
   * @param {String} guardianId
   */
  static async sendPeriodicNotifications(guardianId) {
    const guardian = await Guardian.findById(guardianId)
      .populate('beneficiaries', '_id')
      .lean();

    const beneficiaryIds = guardian.beneficiaries.map(b => b._id);

    // Check for alerts
    let totalAlerts = 0;
    const alertDetails = [];

    for (const beneficiaryId of beneficiaryIds) {
      const alerts = await BeneficiaryService.getAllAlerts(beneficiaryId);
      totalAlerts += alerts.total;

      if (alerts.total > 0) {
        alertDetails.push({
          beneficiaryId,
          alertCount: alerts.total
        });
      }
    }

    if (totalAlerts > 0) {
      await PortalNotification.createAndSend({
        guardianId,
        type: 'alert',
        priority: totalAlerts > 3 ? 'urgent' : 'normal',
        title_ar: 'تنبيهات أداء الطالب',
        title_en: 'Student Performance Alerts',
        message_ar: `يوجد ${totalAlerts} تنبيهات تتطلب انتباهك`,
        message_en: `You have ${totalAlerts} alerts requiring your attention`
      });
    }

    return { sent: true, alertCount: totalAlerts };
  }

  /**
   * Get actionable insights
   * @param {String} guardianId
   */
  static async getActionableInsights(guardianId) {
    const guardian = await Guardian.findById(guardianId)
      .populate('beneficiaries', '_id')
      .lean();

    const insights = {
      academic: [],
      attendance: [],
      financial: [],
      behavioral: []
    };

    for (const beneficiary of guardian.beneficiaries) {
      const alerts = await BeneficiaryService.getAllAlerts(beneficiary._id);
      const atRisk = await BeneficiaryService.isStudentAtRisk(beneficiary._id);

      if (alerts.academic.length > 0) {
        insights.academic.push({
          beneficiaryId: beneficiary._id,
          alerts: alerts.academic,
          action: 'Review academic support options'
        });
      }

      if (alerts.attendance.length > 0) {
        insights.attendance.push({
          beneficiaryId: beneficiary._id,
          alerts: alerts.attendance,
          action: 'Follow up on attendance issues'
        });
      }

      if (alerts.behavior.length > 0) {
        insights.behavioral.push({
          beneficiaryId: beneficiary._id,
          alerts: alerts.behavior,
          action: 'Discuss behavioral concerns'
        });
      }
    }

    const payments = await PortalPayment.find({ guardianId }).lean();
    if (payments.some(p => p.status === 'overdue')) {
      insights.financial.push({
        action: 'Address overdue payments',
        urgency: 'high'
      });
    }

    return {
      insights,
      summary: {
        academicIssues: insights.academic.length,
        attendanceIssues: insights.attendance.length,
        behavioralIssues: insights.behavioral.length,
        financialIssues: insights.financial.length
      }
    };
  }

  /**
   * Export all beneficiary data for guardian
   * @param {String} guardianId
   * @param {String} format
   */
  static async exportAllData(guardianId, format = 'json') {
    const guardian = await Guardian.findById(guardianId)
      .populate('beneficiaries')
      .lean();

    const data = {
      guardian: {
        name: guardian.firstName_ar,
        email: guardian.email,
        phone: guardian.phone
      },
      beneficiaries: []
    };

    for (const beneficiary of guardian.beneficiaries) {
      const progress = await BeneficiaryProgress.find({
        beneficiaryId: beneficiary._id
      })
        .limit(24)
        .lean();

      data.beneficiaries.push({
        name: beneficiary.firstName_ar,
        progress: progress
      });
    }

    return data;
  }

  /**
   * Get payment summary and history
   * @param {String} guardianId
   */
  static async getPaymentSummaryAndHistory(guardianId) {
    const payments = await PortalPayment.find({ guardianId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const summary = {
      totalPayments: payments.length,
      totalPaid: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amountPaid, 0),
      totalDue: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount - p.amountPaid), 0),
      overdueDue: payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + (p.amount - p.amountPaid), 0),
      paymentStatus: {
        paid: payments.filter(p => p.status === 'paid').length,
        pending: payments.filter(p => p.status === 'pending').length,
        partially_paid: payments.filter(p => p.status === 'partially_paid').length,
        overdue: payments.filter(p => p.status === 'overdue').length
      }
    };

    return {
      summary,
      history: payments.map(p => ({
        date: p.createdAt,
        amount: p.amount,
        paid: p.amountPaid,
        status: p.status,
        dueDate: p.dueDate
      }))
    };
  }

  /**
   * Validate guardian data integrity
   * @param {String} guardianId
   */
  static async validateDataIntegrity(guardianId) {
    const guardian = await Guardian.findById(guardianId)
      .populate('beneficiaries')
      .lean();

    const issues = [];

    if (!guardian.email) issues.push('Email not provided');
    if (!guardian.phone) issues.push('Phone not provided');
    if (!guardian.street) issues.push('Address not complete');
    if (guardian.accountStatus !== 'verified') issues.push('Account not verified');

    // Check beneficiary relationships
    for (const beneficiary of guardian.beneficiaries) {
      if (!beneficiary.guardians.includes(guardian._id)) {
        issues.push(`Relationship mismatch with beneficiary ${beneficiary._id}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations: this._getRecommendations(issues)
    };
  }

  /**
   * Get recommendations based on data issues
   * @private
   */
  static _getRecommendations(issues) {
    const recommendations = [];

    if (issues.some(i => i.includes('Email'))) {
      recommendations.push('Update email address for communication');
    }

    if (issues.some(i => i.includes('verified'))) {
      recommendations.push('Verify account to unlock all features');
    }

    if (issues.some(i => i.includes('Address'))) {
      recommendations.push('Complete address information for records');
    }

    return recommendations;
  }
}

module.exports = GuardianService;

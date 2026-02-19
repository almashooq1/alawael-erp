/**
 * Beneficiary Portal Service
 * 
 * Business logic for beneficiary portal operations
 * - Progress calculations
 * - Performance analysis
 * - Guardian notifications
 * - Academic tracking
 */

const Beneficiary = require('../models/Beneficiary');
const BeneficiaryProgress = require('../models/BeneficiaryProgress');
const PortalNotification = require('../models/PortalNotification');
const Guardian = require('../models/Guardian');

class BeneficiaryService {
  /**
   * Get beneficiary performance status
   * @param {String} beneficiaryId
   * @returns {String} performance status
   */
  static async getPerformanceStatus(beneficiaryId) {
    const progress = await BeneficiaryProgress.findOne({ beneficiaryId })
      .sort({ month: -1 })
      .lean();

    if (!progress) return 'pending';

    if (progress.academicScore >= 80) return 'excellent';
    if (progress.academicScore >= 70) return 'good';
    if (progress.academicScore >= 60) return 'satisfactory';
    return 'needs_improvement';
  }

  /**
   * Calculate academic trend
   * @param {String} beneficiaryId
   * @returns {Object} trend data
   */
  static async calculateAcademicTrend(beneficiaryId) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const records = await BeneficiaryProgress.find({
      beneficiaryId,
      createdAt: { $gte: sixMonthsAgo }
    })
      .sort({ month: 1 })
      .select('academicScore month')
      .lean();

    if (records.length < 2) {
      return { trend: 'insufficient_data', improvement: 0 };
    }

    const firstScore = records[0].academicScore;
    const lastScore = records[records.length - 1].academicScore;
    const improvement = lastScore - firstScore;

    return {
      trend: improvement > 0 ? 'improving' : improvement < 0 ? 'declining' : 'stable',
      improvement,
      firstScore,
      lastScore,
      months: records.length
    };
  }

  /**
   * Generate monthly progress report
   * @param {String} beneficiaryId
   * @param {String} month
   */
  static async generateMonthlyReport(beneficiaryId, month = null) {
    const currentMonth = month || new Date().toISOString().slice(0, 7);

    let progress = await BeneficiaryProgress.findOne({
      beneficiaryId,
      month: currentMonth
    });

    if (!progress) {
      return { error: 'No progress record for this month' };
    }

    // Calculate metrics
    progress.reportGenerated = true;
    progress.reportGeneratedAt = new Date();

    // Auto-calculate trend
    const trend = await this.calculateAcademicTrend(beneficiaryId);
    progress.scoreImprovement = trend.improvement;

    await progress.save();

    // Notify guardians
    const beneficiary = await Beneficiary.findById(beneficiaryId);
    for (const guardianId of beneficiary.guardians) {
      await PortalNotification.createAndSend({
        guardianId,
        beneficiaryId,
        type: 'report',
        title_ar: 'تقرير الأداء الشهري',
        title_en: 'Monthly Performance Report',
        message_ar: `تقرير أداء الطالب للشهر ${currentMonth}`,
        message_en: `Student performance report for ${currentMonth}`,
        relatedType: 'progress_report',
        relatedId: progress._id
      });
    }

    progress.reportSentToGuardian = true;
    progress.reportSentAt = new Date();
    await progress.save();

    return progress.toObject();
  }

  /**
   * Get attendance alerts
   * @param {String} beneficiaryId
   */
  static async getAttendanceAlerts(beneficiaryId) {
    const progress = await BeneficiaryProgress.findOne({ beneficiaryId })
      .sort({ month: -1 })
      .lean();

    if (!progress) return [];

    const alerts = [];

    if (progress.attendanceRate < 80) {
      alerts.push({
        type: 'low_attendance',
        severity: 'high',
        message: `Attendance below 80%: ${progress.attendanceRate}%`,
        absenceDays: progress.absenceDays,
        lateDays: progress.lateDays
      });
    }

    if (progress.absenceDays > 5) {
      alerts.push({
        type: 'excessive_absences',
        severity: 'critical',
        message: `Excessive absences: ${progress.absenceDays} days`,
        absenceDays: progress.absenceDays
      });
    }

    return alerts;
  }

  /**
   * Get academic performance alerts
   * @param {String} beneficiaryId
   */
  static async getAcademicAlerts(beneficiaryId) {
    const progress = await BeneficiaryProgress.findOne({ beneficiaryId })
      .sort({ month: -1 })
      .lean();

    if (!progress) return [];

    const alerts = [];

    if (progress.academicScore < 60) {
      alerts.push({
        type: 'low_grades',
        severity: 'critical',
        message: `Academic score below 60: ${progress.academicScore}`,
        score: progress.academicScore
      });
    }

    if (progress.scoreImprovement < 0) {
      alerts.push({
        type: 'declining_performance',
        severity: 'high',
        message: `Grade declined by ${Math.abs(progress.scoreImprovement)} points`,
        declined: Math.abs(progress.scoreImprovement)
      });
    }

    if (progress.activityCompletionRate < 70) {
      alerts.push({
        type: 'low_activity_completion',
        severity: 'medium',
        message: `Activity completion below 70%: ${progress.activityCompletionRate}%`,
        rate: progress.activityCompletionRate
      });
    }

    return alerts;
  }

  /**
   * Get behavior alerts
   * @param {String} beneficiaryId
   */
  static async getBehaviorAlerts(beneficiaryId) {
    const progress = await BeneficiaryProgress.findOne({ beneficiaryId })
      .sort({ month: -1 })
      .lean();

    if (!progress) return [];

    const alerts = [];

    if (progress.behaviorRating < 5) {
      alerts.push({
        type: 'poor_behavior',
        severity: 'high',
        message: `Behavior rating needs improvement: ${progress.behaviorRating}/10`,
        rating: progress.behaviorRating
      });
    }

    return alerts;
  }

  /**
   * Get all performance alerts for beneficiary
   * @param {String} beneficiaryId
   */
  static async getAllAlerts(beneficiaryId) {
    const [attendanceAlerts, academicAlerts, behaviorAlerts] = await Promise.all([
      this.getAttendanceAlerts(beneficiaryId),
      this.getAcademicAlerts(beneficiaryId),
      this.getBehaviorAlerts(beneficiaryId)
    ]);

    return {
      attendance: attendanceAlerts,
      academic: academicAlerts,
      behavior: behaviorAlerts,
      total: attendanceAlerts.length + academicAlerts.length + behaviorAlerts.length
    };
  }

  /**
   * Notify guardians of important alerts
   * @param {String} beneficiaryId
   */
  static async notifyGuardiansOfAlerts(beneficiaryId) {
    const alerts = await this.getAllAlerts(beneficiaryId);

    if (alerts.total === 0) return;

    const beneficiary = await Beneficiary.findById(beneficiaryId);

    for (const guardianId of beneficiary.guardians) {
      // Create high-priority alerts
      if (alerts.academic.length > 0) {
        await PortalNotification.createAndSend({
          guardianId,
          beneficiaryId,
          type: 'alert',
          priority: 'urgent',
          title_ar: 'تنبيه أكاديمي',
          title_en: 'Academic Alert',
          message_ar: `الطالب يحتاج إلى دعم أكاديمي`,
          message_en: 'Student needs academic support',
          relatedType: 'beneficiary',
          relatedId: beneficiaryId
        });
      }

      if (alerts.attendance.some(a => a.severity === 'critical')) {
        await PortalNotification.createAndSend({
          guardianId,
          beneficiaryId,
          type: 'alert',
          priority: 'urgent',
          title_ar: 'تنبيه الحضور',
          title_en: 'Attendance Alert',
          message_ar: `الحضور منخفض جداً`,
          message_en: 'Attendance is critically low'
        });
      }
    }
  }

  /**
   * Calculate grade distribution
   * @param {String} beneficiaryId
   */
  static async calculateGradeDistribution(beneficiaryId) {
    const records = await BeneficiaryProgress.find({ beneficiaryId })
      .select('academicScore')
      .lean();

    if (records.length === 0) {
      return {
        excellent: 0,
        good: 0,
        satisfactory: 0,
        needsImprovement: 0,
        total: 0
      };
    }

    const distribution = {
      excellent: records.filter(r => r.academicScore >= 80).length,
      good: records.filter(r => r.academicScore >= 70 && r.academicScore < 80).length,
      satisfactory: records.filter(r => r.academicScore >= 60 && r.academicScore < 70).length,
      needsImprovement: records.filter(r => r.academicScore < 60).length,
      total: records.length
    };

    return distribution;
  }

  /**
   * Get comparative performance
   * @param {String} beneficiaryId
   */
  static async getComparativePerformance(beneficiaryId) {
    const beneficiary = await Beneficiary.findById(beneficiaryId);
    const currentProgress = await BeneficiaryProgress.findOne({ beneficiaryId })
      .sort({ month: -1 })
      .lean();

    if (!currentProgress) return null;

    // Get class average (if available)
    const classAverage = await BeneficiaryProgress.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$academicScore' } } }
    ]);

    return {
      beneficiaryScore: currentProgress.academicScore,
      classAverage: classAverage[0]?.avgScore || 0,
      aboveAverage: currentProgress.academicScore > (classAverage[0]?.avgScore || 0),
      percentile: Math.round((currentProgress.academicScore / 100) * 100) // Simplified
    };
  }

  /**
   * Export progress data
   * @param {String} beneficiaryId
   * @param {String} format (json, csv, pdf)
   */
  static async exportProgressData(beneficiaryId, format = 'json') {
    const beneficiary = await Beneficiary.findById(beneficiaryId);
    const progress = await BeneficiaryProgress.find({ beneficiaryId })
      .sort({ month: -1 })
      .limit(24); // Last 2 years

    const data = {
      beneficiary: {
        name: beneficiary.firstName_ar + ' ' + beneficiary.lastName_ar,
        enrollmentDate: beneficiary.enrollmentDate,
        level: beneficiary.currentLevel
      },
      progressData: progress.map(p => ({
        month: p.month,
        academicScore: p.academicScore,
        attendance: p.attendanceRate,
        behavior: p.behaviorRating,
        completion: p.activityCompletionRate
      }))
    };

    return data;
  }

  /**
   * Get year summary
   * @param {String} beneficiaryId
   * @param {Number} year
   */
  static async getYearSummary(beneficiaryId, year) {
    const records = await BeneficiaryProgress.find({
      beneficiaryId,
      month: { $regex: year.toString() }
    }).lean();

    if (records.length === 0) return null;

    return {
      year,
      totalMonths: records.length,
      averageScore: (records.reduce((sum, r) => sum + r.academicScore, 0) / records.length).toFixed(2),
      averageAttendance: (records.reduce((sum, r) => sum + r.attendanceRate, 0) / records.length).toFixed(2),
      highestScore: Math.max(...records.map(r => r.academicScore)),
      lowestScore: Math.min(...records.map(r => r.academicScore)),
      totalAbsences: records.reduce((sum, r) => sum + r.absenceDays, 0)
    };
  }

  /**
   * Check if student is at risk
   * @param {String} beneficiaryId
   */
  static async isStudentAtRisk(beneficiaryId) {
    const alerts = await this.getAllAlerts(beneficiaryId);

    const riskFactors = {
      lowGrades: alerts.academic.some(a => a.type === 'low_grades'),
      lowAttendance: alerts.attendance.some(a => a.severity === 'critical'),
      poorBehavior: alerts.behavior.some(a => a.severity === 'high'),
      decliningPerformance: alerts.academic.some(a => a.type === 'declining_performance')
    };

    const riskScore = Object.values(riskFactors).filter(Boolean).length;

    return {
      atRisk: riskScore >= 2,
      riskScore,
      factors: riskFactors,
      recommendation: riskScore >= 2 ? 'Immediate intervention required' : 'Monitor closely'
    };
  }
}

module.exports = BeneficiaryService;

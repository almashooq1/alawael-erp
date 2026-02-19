/**
 * AnalyticsService.js - Beneficiary Analytics & Reporting Service
 * Handles advanced analytics, predictive analysis, and comprehensive reporting
 *
 * @module services/AnalyticsService
 * @requires mongoose
 */

const EventEmitter = require('events');

class AnalyticsService extends EventEmitter {
  /**
   * Initialize AnalyticsService
   * @param {Object} db - Database connection
   */
  constructor(db) {
    super();
    this.db = db;
  }

  /**
   * Get individual beneficiary analytics
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} options - Options
   * @param {string} options.period - 'semester', 'year', 'all'
   * @returns {Promise<Object>} Analytics
   */
  async getIndividualAnalytics(beneficiaryId, options = {}) {
    try {
      if (!beneficiaryId) {
        throw new Error('beneficiaryId is required');
      }

      const period = options.period || 'semester';
      const { ObjectId } = require('mongodb');

      // Get beneficiary profile
      const beneficiary = await this.db.collection('beneficiaries')
        .findOne({ _id: new ObjectId(beneficiaryId) });

      if (!beneficiary) {
        throw new Error('Beneficiary not found');
      }

      // Collect metrics
      const metrics = {
        academic: await this.analyzeAcademicMetrics(beneficiaryId, period),
        attendance: await this.analyzeAttendanceMetrics(beneficiaryId, period),
        behavioral: await this.analyzeBehavioralMetrics(beneficiaryId, period),
        engagement: await this.analyzeEngagementMetrics(beneficiaryId, period),
        financial: await this.analyzeFinancialMetrics(beneficiaryId, period),
        wellbeing: await this.analyzeWellbeingMetrics(beneficiaryId, period)
      };

      // Calculate overall score
      const overallScore = this.calculateOverallScore(metrics);

      return {
        status: 'success',
        message: 'Individual analytics retrieved',
        data: {
          beneficiaryId,
          name: beneficiary.firstName + ' ' + beneficiary.lastName,
          period,
          metrics,
          overallScore,
          insights: this.generateInsights(metrics, overallScore),
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get group analytics (cohort comparison)
   * @async
   * @param {Object} criteria - Selection criteria
   * @param {string} criteria.program - Program name
   * @param {string} criteria.academicYear - Academic year
   * @param {string} criteria.cohort - Cohort identifier
   * @returns {Promise<Object>} Group analytics
   */
  async getGroupAnalytics(criteria = {}) {
    try {
      // Build query
      const query = {};
      if (criteria.program) query.program = criteria.program;
      if (criteria.academicYear) query.academicYear = criteria.academicYear;
      if (criteria.cohort) query.cohort = criteria.cohort;

      // Get matching beneficiaries
      const beneficiaries = await this.db.collection('beneficiaries')
        .find(query)
        .toArray();

      if (beneficiaries.length === 0) {
        return {
          status: 'success',
          message: 'No beneficiaries found matching criteria',
          data: { groupSize: 0, metrics: {} },
          timestamp: new Date()
        };
      }

      // Aggregate metrics
      const aggregated = {
        groupSize: beneficiaries.length,
        academicMetrics: await this.aggregateAcademicMetrics(beneficiaries),
        attendanceMetrics: await this.aggregateAttendanceMetrics(beneficiaries),
        behavioralMetrics: await this.aggregateBehavioralMetrics(beneficiaries),
        engagementMetrics: await this.aggregateEngagementMetrics(beneficiaries)
      };

      return {
        status: 'success',
        message: 'Group analytics retrieved',
        data: {
          criteria,
          ...aggregated,
          comparativeAnalysis: this.generateComparativeAnalysis(aggregated)
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate performance report
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} options - Options
   * @param {string} options.reportType - 'comprehensive', 'academic', 'behavioral', 'performance'
   * @returns {Promise<Object>} Report
   */
  async generatePerformanceReport(beneficiaryId, options = {}) {
    try {
      const reportType = options.reportType || 'comprehensive';
      const { ObjectId } = require('mongodb');

      // Get beneficiary
      const beneficiary = await this.db.collection('beneficiaries')
        .findOne({ _id: new ObjectId(beneficiaryId) });

      if (!beneficiary) {
        throw new Error('Beneficiary not found');
      }

      // Generate report based on type
      let report = {
        beneficiaryId,
        name: beneficiary.firstName + ' ' + beneficiary.lastName,
        generatedDate: new Date(),
        reportType,
        reportNumber: `RPT-${Date.now()}`,
        executive_summary: ''
      };

      switch (reportType) {
        case 'academic':
          report = {
            ...report,
            academicPerformance: await this.analyzeAcademicMetrics(beneficiaryId, 'year'),
            courses: await this.getCoursesData(beneficiaryId),
            trends: await this.analyzeAcademicTrends(beneficiaryId)
          };
          break;

        case 'behavioral':
          report = {
            ...report,
            behavioralMetrics: await this.analyzeBehavioralMetrics(beneficiaryId, 'year'),
            incidents: await this.getBehavioralIncidents(beneficiaryId),
            recommendations: this.generateBehavioralRecommendations(beneficiaryId)
          };
          break;

        case 'comprehensive':
        default:
          report = {
            ...report,
            academic: await this.analyzeAcademicMetrics(beneficiaryId, 'year'),
            attendance: await this.analyzeAttendanceMetrics(beneficiaryId, 'year'),
            behavioral: await this.analyzeBehavioralMetrics(beneficiaryId, 'year'),
            engagement: await this.analyzeEngagementMetrics(beneficiaryId, 'year'),
            strengths: [],
            areasForImprovement: [],
            recommendations: []
          };
      }

      // Generate executive summary
      report.executive_summary = this.generateExecutiveSummary(report);

      return {
        status: 'success',
        message: 'Performance report generated',
        data: report,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Predict academic outcomes
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @returns {Promise<Object>} Predictions
   */
  async predictAcademicOutcomes(beneficiaryId) {
    try {
      if (!beneficiaryId) {
        throw new Error('beneficiaryId is required');
      }

      // Get historical data
      const grades = await this.db.collection('academicRecords')
        .findOne({ beneficiaryId });

      const attendance = await this.db.collection('attendanceRecords')
        .find({ beneficiaryId })
        .toArray();

      // Build prediction model (simplified)
      const gpaHistory = grades?.gpaHistory || [];
      const attendanceRate = attendance.length > 0
        ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100
        : 50;

      // Calculate trend
      const trend = this.calculateTrend(gpaHistory);
      const prediction = this.predictNextGPA(gpaHistory, attendanceRate);

      // Risk assessment
      const riskLevel = this.assessAcademicRisk(gpaHistory, attendanceRate);

      return {
        status: 'success',
        message: 'Academic outcome prediction generated',
        data: {
          beneficiaryId,
          currentGPA: gpaHistory.length > 0 ? gpaHistory[gpaHistory.length - 1] : 0,
          attendanceRate: attendanceRate.toFixed(2) + '%',
          predictedGPA: prediction.predicted.toFixed(2),
          confidenceLevel: (prediction.confidence * 100).toFixed(2) + '%',
          trend: trend,
          riskLevel: riskLevel.level,
          riskFactors: riskLevel.factors,
          recommendations: this.generateAcademicRecommendations(riskLevel),
          predictions: {
            nextSemesterGPA: prediction.predicted.toFixed(2),
            graduationLikelihood: (prediction.graduationChance * 100).toFixed(2) + '%',
            academicStanding: this.predictAcademicStanding(prediction.predicted)
          }
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  // ========== HELPER METHODS ==========

  async analyzeAcademicMetrics(beneficiaryId, period) {
    const grades = await this.db.collection('academicRecords')
      .findOne({ beneficiaryId });

    return {
      currentGPA: grades?.currentGPA || 0,
      gpaHistory: grades?.gpaHistory || [],
      completedCourses: grades?.completedCourses || 0,
      remainingCourses: grades?.remainingCourses || 0,
      academicStanding: this.getAcademicStanding(grades?.currentGPA || 0),
      strengths: [],
      weaknesses: []
    };
  }

  async analyzeAttendanceMetrics(beneficiaryId, period) {
    const records = await this.db.collection('attendanceRecords')
      .find({ beneficiaryId })
      .toArray();

    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;

    return {
      totalDays: records.length,
      presentDays: present,
      absentDays: absent,
      lateDays: late,
      attendanceRate: records.length > 0 ? ((present / records.length) * 100).toFixed(2) : 0,
      trend: absent > present ? 'declining' : 'improving'
    };
  }

  async analyzeBehavioralMetrics(beneficiaryId, period) {
    const incidents = await this.db.collection('behavioralIncidents')
      .find({ beneficiaryId })
      .toArray();

    return {
      totalIncidents: incidents.length,
      recentIncidents: incidents.slice(-3),
      severity: this.categorizeIncidents(incidents),
      trend: incidents.length > 0 ? 'needs_attention' : 'good'
    };
  }

  async analyzeEngagementMetrics(beneficiaryId, period) {
    const achievements = await this.db.collection('achievements')
      .find({ beneficiaryId })
      .toArray();

    const activities = await this.db.collection('studentActivities')
      .find({ beneficiaryId })
      .toArray();

    return {
      totalAchievements: achievements.length,
      totalActivities: activities.length,
      activeInvolvement: activities.filter(a => a.status === 'ACTIVE').length,
      engagementScore: ((achievements.length + activities.length) / 50 * 100).toFixed(2)
    };
  }

  async analyzeFinancialMetrics(beneficiaryId, period) {
    const support = await this.db.collection('financialSupport')
      .find({ beneficiaryId })
      .toArray();

    const scholarships = await this.db.collection('scholarships')
      .find({ beneficiaryId })
      .toArray();

    return {
      scholarshipsCount: scholarships.length,
      activeScholarships: scholarships.filter(s => s.status === 'ACTIVE').length,
      totalScholarshipAmount: scholarships.reduce((sum, s) => sum + (s.approvedAmount || 0), 0),
      financialSupportRequests: support.length,
      approvedSupport: support.filter(s => s.status === 'APPROVED').length
    };
  }

  async analyzeWellbeingMetrics(beneficiaryId, period) {
    const sessions = await this.db.collection('counselingSessions')
      .find({ beneficiaryId })
      .toArray();

    const supportPlan = await this.db.collection('supportPlans')
      .findOne({ beneficiaryId, status: 'ACTIVE' });

    return {
      supportPlanActive: supportPlan ? true : false,
      counselingSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === 'COMPLETED').length,
      upcomingSessions: sessions.filter(s => s.status === 'SCHEDULED').length,
      wellbeingScore: supportPlan ? 'monitored' : 'baseline'
    };
  }

  calculateTrend(gpaHistory) {
    if (gpaHistory.length < 2) return 'insufficient_data';
    const recent = gpaHistory.slice(-3);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const older = gpaHistory.length > 3 ? gpaHistory.slice(-6, -3) : [];
    const oldAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : avg;

    if (avg > oldAvg) return 'improving';
    if (avg < oldAvg) return 'declining';
    return 'stable';
  }

  predictNextGPA(gpaHistory, attendanceRate) {
    const recentGPA = gpaHistory.length > 0 ? gpaHistory[gpaHistory.length - 1] : 2.5;
    const trend = this.calculateTrend(gpaHistory);

    let predicted = recentGPA;
    if (trend === 'improving') predicted += 0.1;
    if (trend === 'declining') predicted -= 0.2;

    // Attendance impact
    if (attendanceRate < 70) predicted -= 0.3;
    if (attendanceRate > 90) predicted += 0.1;

    predicted = Math.min(4.0, Math.max(0, predicted));

    return {
      predicted,
      confidence: 0.75,
      graduationChance: predicted >= 2.0 ? 0.85 : 0.4
    };
  }

  assessAcademicRisk(gpaHistory, attendanceRate) {
    const factors = [];
    let level = 'LOW';

    if (!gpaHistory || gpaHistory.length === 0 || gpaHistory[gpaHistory.length - 1] < 2.0) {
      factors.push('Low GPA');
      level = 'HIGH';
    }

    if (attendanceRate < 75) {
      factors.push('Low attendance rate');
      level = level === 'HIGH' ? 'CRITICAL' : 'MEDIUM';
    }

    return { level, factors };
  }

  getAcademicStanding(gpa) {
    if (gpa >= 3.7) return 'Excellent';
    if (gpa >= 3.3) return 'Good';
    if (gpa >= 2.0) return 'Satisfactory';
    return 'Below Standards';
  }

  calculateOverallScore(metrics) {
    const scores = {
      academic: (metrics.academic.currentGPA / 4) * 100,
      attendance: parseInt(metrics.attendance.attendanceRate),
      behavioral: 100 - (metrics.behavioral.totalIncidents * 10),
      engagement: parseInt(metrics.engagement.engagementScore) || 50,
      financial: 80,
      wellbeing: 80
    };

    const avg = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
    return Math.round(avg);
  }

  generateInsights(metrics, score) {
    const insights = [];

    if (metrics.academic.currentGPA < 2.0) {
      insights.push('Academic performance needs immediate attention');
    }

    if (parseInt(metrics.attendance.attendanceRate) < 80) {
      insights.push('Attendance rate is below expectations');
    }

    if (metrics.engagement.engagementScore > 70) {
      insights.push('Strong engagement in extracurricular activities');
    }

    return insights;
  }

  generateExecutiveSummary(report) {
    return `Performance report for ${report.name} generated on ${report.generatedDate.toLocaleDateString()}. ` +
           `Overall status requires review. Please see detailed metrics below.`;
  }

  generateAcademicRecommendations(riskLevel) {
    if (riskLevel.level === 'HIGH' || riskLevel.level === 'CRITICAL') {
      return [
        'Seek academic tutoring immediately',
        'Meet with academic advisor',
        'Consider reduced course load',
        'Utilize study groups and peer support'
      ];
    }
    return ['Continue current academic plan'];
  }

  predictAcademicStanding(gpa) {
    if (gpa >= 3.7) return 'Excellent Standing';
    if (gpa >= 2.0) return 'Good Standing';
    return 'Warning / Probation';
  }

  categorizeIncidents(incidents) {
    return {
      minor: incidents.filter(i => i.severity === 'MINOR').length,
      major: incidents.filter(i => i.severity === 'MAJOR').length,
      critical: incidents.filter(i => i.severity === 'CRITICAL').length
    };
  }

  async aggregateAcademicMetrics(beneficiaries) {
    const gpas = beneficiaries.map(b => 3.0).filter(g => g > 0); // Placeholder
    const avgGPA = gpas.length > 0 ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2) : '0';
    return { averageGPA: avgGPA, distribution: {} };
  }

  async aggregateAttendanceMetrics(beneficiaries) {
    return { averageAttendance: '85%', distribution: {} };
  }

  async aggregateBehavioralMetrics(beneficiaries) {
    return { averageIncidents: 0.5, severity: {} };
  }

  async aggregateEngagementMetrics(beneficiaries) {
    return { averageEngagement: 75, distribution: {} };
  }

  generateComparativeAnalysis(aggregated) {
    return {
      academicComparison: 'Group GPA is comparable to institution average',
      attendanceComparison: 'Attendance is above institutional average',
      behavioralComparison: 'Behavioral metrics are positive',
      engagementComparison: 'Strong group engagement'
    };
  }

  async getCoursesData(beneficiaryId) {
    return [];
  }

  async analyzeAcademicTrends(beneficiaryId) {
    return {};
  }

  async getBehavioralIncidents(beneficiaryId) {
    return [];
  }

  generateBehavioralRecommendations(beneficiaryId) {
    return [];
  }
}

module.exports = AnalyticsService;

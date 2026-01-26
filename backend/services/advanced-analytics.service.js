/**
 * Advanced Analytics Service
 * Comprehensive data analytics and insights for disability rehabilitation system
 */

const DisabilityRehabilitation = require('../models/disability-rehabilitation.model');
const mongoose = require('mongoose');

class AdvancedAnalyticsService {
  /**
   * Get comprehensive dashboard analytics with trends
   * @param {Object} filters - Date range and filtering options
   * @returns {Object} - Complete analytics data
   */
  async getDashboardAnalytics(filters = {}) {
    const { startDate, endDate, disabilityType } = filters;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage['program_info.start_date'] = {};
      if (startDate) matchStage['program_info.start_date'].$gte = new Date(startDate);
      if (endDate) matchStage['program_info.start_date'].$lte = new Date(endDate);
    }
    if (disabilityType) {
      matchStage['disability_info.primary_disability'] = disabilityType;
    }

    // Summary statistics
    const totalPrograms = await DisabilityRehabilitation.countDocuments(matchStage);
    const activePrograms = await DisabilityRehabilitation.countDocuments({
      ...matchStage,
      'program_info.status': 'active',
    });
    const completedPrograms = await DisabilityRehabilitation.countDocuments({
      ...matchStage,
      'program_info.status': 'completed',
    });

    // Success rate calculation
    const successRate =
      completedPrograms > 0 ? ((completedPrograms / totalPrograms) * 100).toFixed(2) : 0;

    // Average program duration
    const avgDuration = await DisabilityRehabilitation.aggregate([
      { $match: { ...matchStage, 'program_info.status': 'completed' } },
      {
        $project: {
          duration: {
            $dateDiff: {
              startDate: '$program_info.start_date',
              endDate: '$program_info.end_date',
              unit: 'day',
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    // Programs by disability type
    const programsByDisability = await DisabilityRehabilitation.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$disability_info.primary_disability',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$program_info.status', 'active'] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$program_info.status', 'completed'] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Programs by status
    const programsByStatus = await DisabilityRehabilitation.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$program_info.status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Monthly trends (last 12 months)
    const monthlyTrends = await this.getMonthlyTrends(matchStage);

    // Goal achievement rate
    const goalStats = await DisabilityRehabilitation.aggregate([
      { $match: matchStage },
      { $unwind: '$rehabilitation_goals' },
      {
        $group: {
          _id: '$rehabilitation_goals.status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Service utilization
    const serviceUtilization = await DisabilityRehabilitation.aggregate([
      { $match: matchStage },
      { $unwind: '$rehabilitation_services' },
      {
        $group: {
          _id: '$rehabilitation_services.type',
          count: { $sum: 1 },
          avgSessionDuration: { $avg: '$rehabilitation_services.duration_per_session_minutes' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Attendance statistics
    const attendanceStats = await DisabilityRehabilitation.aggregate([
      { $match: matchStage },
      { $unwind: '$therapy_sessions' },
      {
        $group: {
          _id: '$therapy_sessions.attendance',
          count: { $sum: 1 },
        },
      },
    ]);

    // Budget analysis
    const budgetAnalysis = await DisabilityRehabilitation.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalAllocated: { $sum: '$program_info.budget_allocated' },
          totalSpent: { $sum: '$program_info.budget_spent' },
          avgAllocated: { $avg: '$program_info.budget_allocated' },
          avgSpent: { $avg: '$program_info.budget_spent' },
        },
      },
    ]);

    return {
      summary: {
        totalPrograms,
        activePrograms,
        completedPrograms,
        pendingPrograms: totalPrograms - activePrograms - completedPrograms,
        successRate: parseFloat(successRate),
        avgDuration: avgDuration[0]?.avgDuration || 0,
      },
      distribution: {
        byDisability: programsByDisability,
        byStatus: programsByStatus,
      },
      trends: {
        monthly: monthlyTrends,
      },
      goals: {
        statistics: goalStats,
        achievementRate: this.calculateAchievementRate(goalStats),
      },
      services: {
        utilization: serviceUtilization,
        totalServices: serviceUtilization.reduce((sum, s) => sum + s.count, 0),
      },
      attendance: {
        statistics: attendanceStats,
        presentRate: this.calculatePresentRate(attendanceStats),
      },
      budget: budgetAnalysis[0] || {
        totalAllocated: 0,
        totalSpent: 0,
        avgAllocated: 0,
        avgSpent: 0,
      },
    };
  }

  /**
   * Get monthly trends for the last 12 months
   * @param {Object} matchStage - Base match conditions
   * @returns {Array} - Monthly trend data
   */
  async getMonthlyTrends(matchStage = {}) {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const trends = await DisabilityRehabilitation.aggregate([
      {
        $match: {
          ...matchStage,
          'program_info.start_date': { $gte: last12Months },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$program_info.start_date' },
            month: { $month: '$program_info.start_date' },
          },
          newPrograms: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$program_info.status', 'completed'] }, 1, 0] },
          },
          active: {
            $sum: { $cond: [{ $eq: ['$program_info.status', 'active'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return trends.map(t => ({
      year: t._id.year,
      month: t._id.month,
      monthName: this.getMonthName(t._id.month),
      newPrograms: t.newPrograms,
      completed: t.completed,
      active: t.active,
    }));
  }

  /**
   * Get detailed program performance metrics
   * @param {String} programId - Program ID
   * @returns {Object} - Detailed performance metrics
   */
  async getProgramPerformanceMetrics(programId) {
    const program = await DisabilityRehabilitation.findById(programId);
    if (!program) {
      throw new Error('Program not found');
    }

    // Goal progress analysis
    const goalProgress = program.rehabilitation_goals.map(goal => ({
      goalId: goal.goal_id,
      category: goal.category,
      status: goal.status,
      progress: goal.progress_percentage,
      priority: goal.priority,
      daysRemaining: this.calculateDaysRemaining(goal.target_date),
    }));

    // Session statistics
    const sessionStats = {
      total: program.therapy_sessions.length,
      present: program.therapy_sessions.filter(s => s.attendance === 'present').length,
      absent: program.therapy_sessions.filter(s => s.attendance === 'absent').length,
      attendanceRate: (
        (program.therapy_sessions.filter(s => s.attendance === 'present').length /
          program.therapy_sessions.length) *
        100
      ).toFixed(2),
    };

    // Service delivery metrics
    const serviceMetrics = program.rehabilitation_services.map(service => ({
      type: service.type,
      frequency: service.frequency,
      totalSessions: program.therapy_sessions.filter(s => s.service_id === service.service_id)
        .length,
      status: service.status,
    }));

    // Progress tracking
    const progressTracking = {
      overall: program.progress_tracking.overall_progress_percentage,
      goalCompletion: program.progress_tracking.goal_completion_rate,
      achievements: program.progress_tracking.achievements,
      challenges: program.progress_tracking.challenges,
    };

    // Budget efficiency
    const budgetEfficiency = {
      allocated: program.program_info.budget_allocated,
      spent: program.program_info.budget_spent,
      remaining: program.program_info.budget_allocated - program.program_info.budget_spent,
      utilizationRate: (
        (program.program_info.budget_spent / program.program_info.budget_allocated) *
        100
      ).toFixed(2),
    };

    return {
      programInfo: {
        id: program._id,
        name: program.program_info.name_ar,
        status: program.program_info.status,
        severity: program.program_info.severity,
        disabilityType: program.disability_info.primary_disability,
      },
      goalProgress,
      sessionStats,
      serviceMetrics,
      progressTracking,
      budgetEfficiency,
      assessments: program.assessments.length,
      lastUpdate: program.progress_tracking.last_update,
    };
  }

  /**
   * Get comparative analysis across programs
   * @param {Array} programIds - Array of program IDs to compare
   * @returns {Object} - Comparative analysis
   */
  async getComparativeAnalysis(programIds) {
    const programs = await DisabilityRehabilitation.find({
      _id: { $in: programIds },
    });

    const comparison = programs.map(program => ({
      programId: program._id,
      name: program.program_info.name_ar,
      disabilityType: program.disability_info.primary_disability,
      status: program.program_info.status,
      progressPercentage: program.progress_tracking.overall_progress_percentage,
      goalCompletionRate: program.progress_tracking.goal_completion_rate,
      sessionCount: program.therapy_sessions.length,
      attendanceRate: program.calculateAttendanceRate(),
      budgetUtilization: (
        (program.program_info.budget_spent / program.program_info.budget_allocated) *
        100
      ).toFixed(2),
      duration: this.calculateProgramDuration(
        program.program_info.start_date,
        program.program_info.end_date
      ),
    }));

    return {
      programs: comparison,
      averages: this.calculateAverages(comparison),
      bestPerforming: this.identifyBestPerforming(comparison),
      needsAttention: this.identifyNeedsAttention(comparison),
    };
  }

  /**
   * Get predictive insights using historical data
   * @param {String} disabilityType - Type of disability
   * @returns {Object} - Predictive insights
   */
  async getPredictiveInsights(disabilityType) {
    const historicalData = await DisabilityRehabilitation.find({
      'disability_info.primary_disability': disabilityType,
      'program_info.status': 'completed',
    });

    if (historicalData.length < 5) {
      return {
        message: 'Insufficient data for predictive analysis',
        dataPoints: historicalData.length,
      };
    }

    // Calculate average success metrics
    const avgDuration =
      historicalData.reduce((sum, p) => {
        const duration = this.calculateProgramDuration(
          p.program_info.start_date,
          p.program_info.end_date
        );
        return sum + duration;
      }, 0) / historicalData.length;

    const avgGoalCompletion =
      historicalData.reduce((sum, p) => sum + p.progress_tracking.goal_completion_rate, 0) /
      historicalData.length;

    const avgSessionCount =
      historicalData.reduce((sum, p) => sum + p.therapy_sessions.length, 0) / historicalData.length;

    const avgBudget =
      historicalData.reduce((sum, p) => sum + p.program_info.budget_spent, 0) /
      historicalData.length;

    // Common successful service types
    const serviceFrequency = {};
    historicalData.forEach(p => {
      p.rehabilitation_services.forEach(s => {
        serviceFrequency[s.type] = (serviceFrequency[s.type] || 0) + 1;
      });
    });

    const topServices = Object.entries(serviceFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => ({ type, frequency: count }));

    return {
      disabilityType,
      predictions: {
        expectedDuration: Math.round(avgDuration),
        expectedGoalCompletionRate: avgGoalCompletion.toFixed(2),
        recommendedSessionCount: Math.round(avgSessionCount),
        estimatedBudget: Math.round(avgBudget),
      },
      recommendations: {
        topServices,
        successFactors: this.identifySuccessFactors(historicalData),
      },
      dataPoints: historicalData.length,
      confidence: this.calculateConfidenceLevel(historicalData.length),
    };
  }

  /**
   * Get beneficiary journey analytics
   * @param {String} beneficiaryId - Beneficiary ID
   * @returns {Object} - Journey analytics
   */
  async getBeneficiaryJourneyAnalytics(beneficiaryId) {
    const programs = await DisabilityRehabilitation.find({
      'beneficiary.id': beneficiaryId,
    }).sort({ 'program_info.start_date': 1 });

    if (programs.length === 0) {
      return { message: 'No programs found for this beneficiary' };
    }

    const journey = programs.map((program, index) => ({
      programNumber: index + 1,
      programId: program._id,
      name: program.program_info.name_ar,
      disabilityType: program.disability_info.primary_disability,
      startDate: program.program_info.start_date,
      endDate: program.program_info.end_date,
      status: program.program_info.status,
      progress: program.progress_tracking.overall_progress_percentage,
      goalCompletion: program.progress_tracking.goal_completion_rate,
      sessions: program.therapy_sessions.length,
    }));

    // Overall progress across all programs
    const overallProgress = {
      totalPrograms: programs.length,
      completedPrograms: programs.filter(p => p.program_info.status === 'completed').length,
      activePrograms: programs.filter(p => p.program_info.status === 'active').length,
      totalSessions: programs.reduce((sum, p) => sum + p.therapy_sessions.length, 0),
      avgProgress: (
        programs.reduce((sum, p) => sum + p.progress_tracking.overall_progress_percentage, 0) /
        programs.length
      ).toFixed(2),
    };

    return {
      beneficiary: programs[0].beneficiary,
      journey,
      overallProgress,
      timeline: this.createTimeline(programs),
    };
  }

  // Helper methods

  calculateAchievementRate(goalStats) {
    const achieved = goalStats.find(g => g._id === 'achieved')?.count || 0;
    const total = goalStats.reduce((sum, g) => sum + g.count, 0);
    return total > 0 ? ((achieved / total) * 100).toFixed(2) : 0;
  }

  calculatePresentRate(attendanceStats) {
    const present = attendanceStats.find(a => a._id === 'present')?.count || 0;
    const total = attendanceStats.reduce((sum, a) => sum + a.count, 0);
    return total > 0 ? ((present / total) * 100).toFixed(2) : 0;
  }

  calculateDaysRemaining(targetDate) {
    const now = new Date();
    const target = new Date(targetDate);
    const diffTime = target - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  calculateProgramDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  calculateAverages(comparison) {
    return {
      avgProgress: (
        comparison.reduce((sum, p) => sum + p.progressPercentage, 0) / comparison.length
      ).toFixed(2),
      avgGoalCompletion: (
        comparison.reduce((sum, p) => sum + p.goalCompletionRate, 0) / comparison.length
      ).toFixed(2),
      avgAttendance: (
        comparison.reduce((sum, p) => sum + parseFloat(p.attendanceRate), 0) / comparison.length
      ).toFixed(2),
      avgBudgetUtilization: (
        comparison.reduce((sum, p) => sum + parseFloat(p.budgetUtilization), 0) / comparison.length
      ).toFixed(2),
    };
  }

  identifyBestPerforming(comparison) {
    return comparison.sort((a, b) => b.progressPercentage - a.progressPercentage).slice(0, 3);
  }

  identifyNeedsAttention(comparison) {
    return comparison
      .filter(p => p.progressPercentage < 50 || parseFloat(p.attendanceRate) < 70)
      .sort((a, b) => a.progressPercentage - b.progressPercentage);
  }

  identifySuccessFactors(historicalData) {
    // Analyze common patterns in successful programs
    const factors = [];

    // Check if early assessments correlate with success
    const earlyAssessments = historicalData.filter(p => p.assessments.length >= 2);
    if (earlyAssessments.length / historicalData.length > 0.7) {
      factors.push('Regular assessments (2+ assessments)');
    }

    // Check attendance correlation
    const highAttendance = historicalData.filter(p => p.calculateAttendanceRate() > 85);
    if (highAttendance.length / historicalData.length > 0.6) {
      factors.push('High attendance rate (>85%)');
    }

    // Check family involvement
    const familyInvolvement = historicalData.filter(
      p => p.family_involvement && p.family_involvement.participation_level === 'regular'
    );
    if (familyInvolvement.length / historicalData.length > 0.5) {
      factors.push('Regular family involvement');
    }

    return factors;
  }

  calculateConfidenceLevel(dataPoints) {
    if (dataPoints < 5) return 'Low';
    if (dataPoints < 15) return 'Medium';
    if (dataPoints < 30) return 'High';
    return 'Very High';
  }

  createTimeline(programs) {
    return programs.map(p => ({
      date: p.program_info.start_date,
      event: `Started: ${p.program_info.name_ar}`,
      status: p.program_info.status,
    }));
  }

  getMonthName(month) {
    const months = [
      'يناير',
      'فبراير',
      'مارس',
      'إبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];
    return months[month - 1];
  }
}

module.exports = new AdvancedAnalyticsService();

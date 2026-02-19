/**
 * ALAWAEL ERP - PERFORMANCE MANAGEMENT SERVICE
 * Advanced Performance Reviews, Competency Assessment, Goal Tracking
 * Phase 22 - Performance Management System
 *
 * Features:
 * - Performance review management
 * - Multi-rater 360-degree feedback
 * - Competency assessment & gap analysis
 * - SMART goal setting & tracking
 * - KPI definition & tracking
 * - Employee calibration & ranking
 * - Development planning
 * - Performance analytics
 */

const crypto = require('crypto');

class PerformanceManagementService {
  constructor() {
    this.reviews = [];
    this.feedback = [];
    this.competencies = [];
    this.goals = [];
    this.kpis = [];
    this.developmentPlans = [];
    this.calibrationData = [];
    this.performanceHistory = [];
  }

  /**
   * PERFORMANCE REVIEW MANAGEMENT
   * Comprehensive review creation, tracking, and workflow
   */

  async createReview(reviewData) {
    try {
      const {
        employeeId,
        supervisorId,
        reviewPeriod,
        ratingScale = 5,
        status = 'draft',
        reviewDate = new Date(),
      } = reviewData;

      if (!employeeId || !supervisorId || !reviewPeriod) {
        throw new Error('Missing required fields: employeeId, supervisorId, reviewPeriod');
      }

      const review = {
        id: `REV-${crypto.randomUUID()}`,
        employeeId,
        supervisorId,
        reviewPeriod,
        ratingScale,
        status,
        reviewDate,
        overallRating: null,
        feedback: [],
        goals: [],
        strengths: [],
        developmentAreas: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.reviews.push(review);
      this.performanceHistory.push({
        event: 'review_created',
        reviewId: review.id,
        timestamp: new Date(),
      });

      return review;
    } catch (error) {
      throw new Error(`Failed to create review: ${error.message}`);
    }
  }

  async getReview(reviewId) {
    try {
      const review = this.reviews.find(r => r.id === reviewId);
      if (!review) throw new Error('Review not found');

      return {
        ...review,
        feedbackCount: review.feedback.length,
        completeness: this._calculateReviewCompleteness(review),
      };
    } catch (error) {
      throw new Error(`Failed to retrieve review: ${error.message}`);
    }
  }

  async updateReview(reviewId, updates) {
    try {
      const review = this.reviews.find(r => r.id === reviewId);
      if (!review) throw new Error('Review not found');

      Object.assign(review, updates, { updatedAt: new Date() });

      if (updates.status) {
        this.performanceHistory.push({
          event: 'review_status_updated',
          reviewId,
          status: updates.status,
          timestamp: new Date(),
        });
      }

      return review;
    } catch (error) {
      throw new Error(`Failed to update review: ${error.message}`);
    }
  }

  async finalizeReview(reviewId, finalizationData) {
    try {
      const review = this.reviews.find(r => r.id === reviewId);
      if (!review) throw new Error('Review not found');

      const { overallRating, performanceRating, potentialRating, approver, comments } =
        finalizationData;

      Object.assign(review, {
        status: 'finalized',
        overallRating,
        performanceRating,
        potentialRating,
        approver,
        approvalComments: comments,
        finalizedDate: new Date(),
        updatedAt: new Date(),
      });

      this.performanceHistory.push({
        event: 'review_finalized',
        reviewId,
        rating: overallRating,
        timestamp: new Date(),
      });

      return review;
    } catch (error) {
      throw new Error(`Failed to finalize review: ${error.message}`);
    }
  }

  async addFeedback(reviewId, feedbackData) {
    try {
      const review = this.reviews.find(r => r.id === reviewId);
      if (!review) throw new Error('Review not found');

      const {
        feedbackProviderId,
        feedbackType, // peer, subordinate, self, supervisor
        content,
        rating,
      } = feedbackData;

      const feedback = {
        id: `FB-${crypto.randomUUID()}`,
        reviewId,
        feedbackProviderId,
        feedbackType,
        content,
        rating,
        createdAt: new Date(),
      };

      review.feedback.push(feedback);
      this.feedback.push(feedback);

      return feedback;
    } catch (error) {
      throw new Error(`Failed to add feedback: ${error.message}`);
    }
  }

  async getEmployeeReviews(employeeId) {
    try {
      const reviews = this.reviews.filter(r => r.employeeId === employeeId);
      return reviews.sort((a, b) => b.reviewDate - a.reviewDate);
    } catch (error) {
      throw new Error(`Failed to retrieve employee reviews: ${error.message}`);
    }
  }

  async getReviewStats(filters = {}) {
    try {
      const { department, reviewPeriod, status } = filters;
      let filtered = this.reviews;

      if (status) {
        filtered = filtered.filter(r => r.status === status);
      }
      if (reviewPeriod) {
        filtered = filtered.filter(r => r.reviewPeriod === reviewPeriod);
      }

      const avgRating =
        filtered.length > 0
          ? (
              filtered.reduce((sum, r) => sum + (r.overallRating || 0), 0) / filtered.length
            ).toFixed(2)
          : 0;

      return {
        totalReviews: filtered.length,
        averageRating: parseFloat(avgRating),
        completedReviews: filtered.filter(r => r.status === 'finalized').length,
        pendingReviews: filtered.filter(r => r.status === 'draft').length,
        totalFeedback: filtered.reduce((sum, r) => sum + r.feedback.length, 0),
        ratingDistribution: this._calculateRatingDistribution(filtered),
      };
    } catch (error) {
      throw new Error(`Failed to get review stats: ${error.message}`);
    }
  }

  /**
   * COMPETENCY ASSESSMENT
   * Define and assess employee competencies
   */

  async createCompetency(competencyData) {
    try {
      const { competencyName, category, proficiencyLevels = 5, description } = competencyData;

      if (!competencyName || !category) {
        throw new Error('Missing required fields: competencyName, category');
      }

      const competency = {
        id: `COMP-${crypto.randomUUID()}`,
        competencyName,
        category,
        proficiencyLevels,
        description,
        createdAt: new Date(),
      };

      this.competencies.push(competency);
      return competency;
    } catch (error) {
      throw new Error(`Failed to create competency: ${error.message}`);
    }
  }

  async assessEmployee(employeeId, assessmentData) {
    try {
      const {
        competencies, // [{ competencyId, currentLevel, targetLevel }]
        assessmentDate = new Date(),
      } = assessmentData;

      if (!competencies || competencies.length === 0) {
        throw new Error('No competencies to assess');
      }

      const assessment = {
        id: `ASS-${crypto.randomUUID()}`,
        employeeId,
        competencies,
        assessmentDate,
        gaps: this._calculateCompetencyGaps(competencies),
        createdAt: new Date(),
      };

      this.competencies.push(assessment);
      return assessment;
    } catch (error) {
      throw new Error(`Failed to assess employee: ${error.message}`);
    }
  }

  async getCompetencyGaps(employeeId) {
    try {
      const assessment = this.competencies.find(c => c.employeeId === employeeId);
      if (!assessment) throw new Error('No assessment found for employee');

      return {
        employeeId,
        totalGaps: assessment.gaps.length,
        gaps: assessment.gaps.sort((a, b) => b.priority - a.priority),
        developmentPriority: assessment.gaps.length > 0 ? 'high' : 'low',
      };
    } catch (error) {
      throw new Error(`Failed to get competency gaps: ${error.message}`);
    }
  }

  async createDevelopmentPlan(planData) {
    try {
      const { employeeId, competencyGaps, targetCompletionDate, developmentActivities } = planData;

      if (!employeeId || !competencyGaps || competencyGaps.length === 0) {
        throw new Error('Missing required development plan fields');
      }

      const plan = {
        id: `DEV-${crypto.randomUUID()}`,
        employeeId,
        competencyGaps,
        developmentActivities,
        targetCompletionDate,
        status: 'active',
        progress: 0,
        createdAt: new Date(),
      };

      this.developmentPlans.push(plan);
      return plan;
    } catch (error) {
      throw new Error(`Failed to create development plan: ${error.message}`);
    }
  }

  /**
   * GOAL SETTING & TRACKING
   * SMART goals with alignment and progress tracking
   */

  async setGoal(goalData) {
    try {
      const {
        employeeId,
        goalTitle,
        description,
        category, // strategic, operational, development
        targetValue,
        deadline,
        alignment,
        weight = 1,
      } = goalData;

      if (!employeeId || !goalTitle || !deadline) {
        throw new Error('Missing required goal fields');
      }

      const goal = {
        id: `GOAL-${crypto.randomUUID()}`,
        employeeId,
        goalTitle,
        description,
        category,
        targetValue,
        currentValue: 0,
        deadline,
        alignment,
        weight,
        status: 'active',
        progress: 0,
        createdAt: new Date(),
      };

      this.goals.push(goal);
      return goal;
    } catch (error) {
      throw new Error(`Failed to set goal: ${error.message}`);
    }
  }

  async updateGoalProgress(goalId, progressData) {
    try {
      const goal = this.goals.find(g => g.id === goalId);
      if (!goal) throw new Error('Goal not found');

      const { currentValue, progressNotes, status } = progressData;

      goal.currentValue = currentValue;
      goal.progress = ((currentValue / goal.targetValue) * 100).toFixed(2);
      goal.progressNotes = progressNotes;
      if (status) goal.status = status;
      goal.lastUpdated = new Date();

      return goal;
    } catch (error) {
      throw new Error(`Failed to update goal progress: ${error.message}`);
    }
  }

  async getEmployeeGoals(employeeId) {
    try {
      const goals = this.goals.filter(g => g.employeeId === employeeId);
      const completed = goals.filter(g => g.progress >= 100).length;
      const onTrack = goals.filter(g => g.progress >= 75 && g.progress < 100).length;
      const atRisk = goals.filter(g => g.progress < 75).length;

      return {
        employeeId,
        totalGoals: goals.length,
        goals: goals.sort((a, b) => b.weight - a.weight),
        summary: { completed, onTrack, atRisk },
        overallProgress:
          goals.length > 0
            ? (goals.reduce((sum, g) => sum + parseFloat(g.progress), 0) / goals.length).toFixed(2)
            : 0,
      };
    } catch (error) {
      throw new Error(`Failed to get employee goals: ${error.message}`);
    }
  }

  async trackAchievement(employeeId, periodFilters = {}) {
    try {
      const employeeGoals = this.goals.filter(g => g.employeeId === employeeId);
      const completedGoals = employeeGoals.filter(g => g.progress >= 100);

      return {
        employeeId,
        totalGoalsSet: employeeGoals.length,
        achievedGoals: completedGoals.length,
        achievementRate:
          employeeGoals.length > 0
            ? ((completedGoals.length / employeeGoals.length) * 100).toFixed(2)
            : 0,
        averageProgress:
          employeeGoals.length > 0
            ? (
                employeeGoals.reduce((sum, g) => sum + parseFloat(g.progress), 0) /
                employeeGoals.length
              ).toFixed(2)
            : 0,
      };
    } catch (error) {
      throw new Error(`Failed to track achievement: ${error.message}`);
    }
  }

  /**
   * KPI MANAGEMENT
   * Define and track key performance indicators
   */

  async defineKPI(kpiData) {
    try {
      const {
        kpiName,
        department,
        targetValue,
        unit,
        frequency, // weekly, monthly, quarterly, annual
        owner,
      } = kpiData;

      if (!kpiName || !targetValue || !unit) {
        throw new Error('Missing required KPI fields');
      }

      const kpi = {
        id: `KPI-${crypto.randomUUID()}`,
        kpiName,
        department,
        targetValue,
        unit,
        frequency,
        owner,
        currentValue: 0,
        status: 'active',
        createdAt: new Date(),
      };

      this.kpis.push(kpi);
      return kpi;
    } catch (error) {
      throw new Error(`Failed to define KPI: ${error.message}`);
    }
  }

  async trackMetric(kpiId, metricData) {
    try {
      const kpi = this.kpis.find(k => k.id === kpiId);
      if (!kpi) throw new Error('KPI not found');

      const { actualValue, timestamp = new Date() } = metricData;

      kpi.currentValue = actualValue;
      kpi.variance = (((actualValue - kpi.targetValue) / kpi.targetValue) * 100).toFixed(2);
      kpi.lastMeasured = timestamp;

      return {
        ...kpi,
        performanceStatus: actualValue >= kpi.targetValue ? 'achieved' : 'below-target',
      };
    } catch (error) {
      throw new Error(`Failed to track metric: ${error.message}`);
    }
  }

  async calculateScores(employeeId) {
    try {
      const employeeGoals = this.goals.filter(g => g.employeeId === employeeId);
      const employeeKPIs = this.kpis.filter(k => !k.department || k.department === employeeId);

      const goalScore =
        employeeGoals.length > 0
          ? (
              employeeGoals.reduce((sum, g) => sum + parseFloat(g.progress) * g.weight, 0) /
              employeeGoals.reduce((sum, g) => sum + g.weight, 0)
            ).toFixed(2)
          : 0;

      const kpiScore =
        employeeKPIs.length > 0
          ? (
              (employeeKPIs.filter(k => k.actualValue >= k.targetValue).length /
                employeeKPIs.length) *
              100
            ).toFixed(2)
          : 0;

      const performanceScore = (parseFloat(goalScore) * 0.6 + parseFloat(kpiScore) * 0.4).toFixed(
        2
      );

      return {
        employeeId,
        goalScore: parseFloat(goalScore),
        kpiScore: parseFloat(kpiScore),
        performanceScore: parseFloat(performanceScore),
        performanceLevel: this._getPerformanceLevel(performanceScore),
      };
    } catch (error) {
      throw new Error(`Failed to calculate scores: ${error.message}`);
    }
  }

  async benchmarkPerformance(department) {
    try {
      const deptGoals = this.goals.filter(g => {
        const emp = { department }; // Simplified for demo
        return true;
      });

      const avgProgress =
        deptGoals.length > 0
          ? (
              deptGoals.reduce((sum, g) => sum + parseFloat(g.progress), 0) / deptGoals.length
            ).toFixed(2)
          : 0;

      return {
        department,
        benchmarks: {
          averageProgress: parseFloat(avgProgress),
          topPerformers: this._getTopPerformers(5),
          medianPerformance: this._getMedianPerformance(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to benchmark performance: ${error.message}`);
    }
  }

  /**
   * CALIBRATION & RANKING
   * Employee ranking and succession planning
   */

  async rankEmployees(departmentId, rankingCriteria = {}) {
    try {
      const {
        performanceWeight = 0.4,
        potentialWeight = 0.3,
        retentionRiskWeight = 0.3,
      } = rankingCriteria;

      const rankings = this.reviews
        .filter(r => r.departmentId === departmentId && r.status === 'finalized')
        .map(r => ({
          employeeId: r.employeeId,
          performanceScore: r.performanceRating || 0,
          potentialScore: r.potentialRating || 0,
          retentionRisk: this._calculateRetentionRisk(r.employeeId),
          compositeScore: (
            (r.performanceRating || 0) * performanceWeight +
            (r.potentialRating || 0) * potentialWeight +
            (100 - this._calculateRetentionRisk(r.employeeId)) * retentionRiskWeight
          ).toFixed(2),
        }))
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .map((emp, index) => ({ ...emp, rank: index + 1 }));

      this.calibrationData.push({
        id: `CAL-${crypto.randomUUID()}`,
        departmentId,
        rankings,
        calibrationDate: new Date(),
      });

      return rankings;
    } catch (error) {
      throw new Error(`Failed to rank employees: ${error.message}`);
    }
  }

  async calculateDistribution(rankings) {
    try {
      const distribution = {
        excellent: rankings.filter(r => r.compositeScore >= 80).length,
        good: rankings.filter(r => r.compositeScore >= 60 && r.compositeScore < 80).length,
        satisfactory: rankings.filter(r => r.compositeScore >= 40 && r.compositeScore < 60).length,
        needsImprovement: rankings.filter(r => r.compositeScore < 40).length,
      };

      return {
        distribution,
        percentages: {
          excellent: ((distribution.excellent / rankings.length) * 100).toFixed(2),
          good: ((distribution.good / rankings.length) * 100).toFixed(2),
          satisfactory: ((distribution.satisfactory / rankings.length) * 100).toFixed(2),
          needsImprovement: ((distribution.needsImprovement / rankings.length) * 100).toFixed(2),
        },
      };
    } catch (error) {
      throw new Error(`Failed to calculate distribution: ${error.message}`);
    }
  }

  async assessRiskRetention(employeeId) {
    try {
      const riskScore = this._calculateRetentionRisk(employeeId);
      const riskLevel = riskScore > 70 ? 'high' : riskScore > 50 ? 'medium' : 'low';

      return {
        employeeId,
        retentionRiskScore: riskScore,
        riskLevel,
        recommendations: this._getRetentionRecommendations(riskLevel),
      };
    } catch (error) {
      throw new Error(`Failed to assess retention risk: ${error.message}`);
    }
  }

  /**
   * HELPER METHODS
   */

  _calculateReviewCompleteness(review) {
    let completeness = 0;
    if (review.overallRating) completeness += 25;
    if (review.strengths.length > 0) completeness += 25;
    if (review.developmentAreas.length > 0) completeness += 25;
    if (review.feedback.length > 0) completeness += 25;
    return completeness;
  }

  _calculateRatingDistribution(reviews) {
    const distribution = {};
    reviews.forEach(r => {
      const rating = Math.ceil(r.overallRating || 0);
      distribution[rating] = (distribution[rating] || 0) + 1;
    });
    return distribution;
  }

  _calculateCompetencyGaps(competencies) {
    return competencies
      .filter(c => c.currentLevel < c.targetLevel)
      .map(c => ({
        competencyId: c.competencyId,
        gap: c.targetLevel - c.currentLevel,
        priority: Math.abs(c.targetLevel - c.currentLevel),
      }));
  }

  _getPerformanceLevel(score) {
    const numScore = parseFloat(score);
    if (numScore >= 80) return 'Excellent';
    if (numScore >= 60) return 'Good';
    if (numScore >= 40) return 'Satisfactory';
    return 'Needs Improvement';
  }

  _getTopPerformers(limit) {
    return this.reviews
      .filter(r => r.status === 'finalized')
      .sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0))
      .slice(0, limit)
      .map(r => ({ employeeId: r.employeeId, rating: r.overallRating }));
  }

  _getMedianPerformance() {
    const ratings = this.reviews
      .filter(r => r.status === 'finalized')
      .map(r => r.overallRating || 0)
      .sort((a, b) => a - b);
    return ratings.length > 0 ? ratings[Math.floor(ratings.length / 2)] : 0;
  }

  _calculateRetentionRisk(employeeId) {
    // Simplified risk calculation
    return Math.random() * 100;
  }

  _getRetentionRecommendations(riskLevel) {
    const recommendations = {
      high: [
        'Schedule immediate retention conversation',
        'Review compensation',
        'Create career development plan',
      ],
      medium: ['Regular check-ins', 'Growth opportunities', 'Skills development'],
      low: ['Maintain engagement', 'Continue development'],
    };
    return recommendations[riskLevel] || [];
  }
}

module.exports = PerformanceManagementService;

/**
 * AI/ML Integration Module - Phase 9
 * Predictive analytics, intelligent automation, and NLP features
 */

class AIMLIntegration {
  /**
   * Predictive Analytics Engine
   */
  static class PredictiveAnalytics {
    /**
     * Predict employee turnover probability
     * Uses simple ML model pattern
     */
    static predictTurnover(employeeData) {
      let turnoverProbability = 0;

      // Factor 1: Tenure (0-30 points)
      const tenure =
        (Date.now() - new Date(employeeData.joinDate)) /
        (1000 * 60 * 60 * 24 * 365);
      if (tenure < 1) turnoverProbability += 30;
      else if (tenure < 2) turnoverProbability += 20;
      else if (tenure < 3) turnoverProbability += 10;

      // Factor 2: Recent promotion (0-20 points)
      if (employeeData.lastPromotion) {
        const monthsSincePromotion =
          (Date.now() - new Date(employeeData.lastPromotion)) /
          (1000 * 60 * 60 * 24 * 30);
        if (monthsSincePromotion > 36) turnoverProbability += 20;
        else if (monthsSincePromotion > 24) turnoverProbability += 10;
      } else {
        turnoverProbability += 20;
      }

      // Factor 3: Performance rating (0-25 points)
      const performanceScores = {
        'Below Average': 25,
        Average: 15,
        'Above Average': 5,
        Excellent: 0
      };
      turnoverProbability +=
        performanceScores[employeeData.lastPerformanceRating] || 10;

      // Factor 4: Salary competitiveness (0-25 points)
      if (employeeData.salary < 30000) turnoverProbability += 25;
      else if (employeeData.salary < 50000) turnoverProbability += 15;
      else if (employeeData.salary < 75000) turnoverProbability += 5;

      return {
        employeeId: employeeData._id,
        name: employeeData.name,
        probability: Math.min(100, Math.max(0, turnoverProbability)),
        riskLevel:
          turnoverProbability > 75
            ? 'CRITICAL'
            : turnoverProbability > 50
            ? 'HIGH'
            : turnoverProbability > 25
            ? 'MEDIUM'
            : 'LOW',
        recommendations: this.generateTurnoverRecommendations(
          employeeData,
          turnoverProbability
        )
      };
    }

    /**
     * Generate recommendations to prevent turnover
     */
    static generateTurnoverRecommendations(employeeData, probability) {
      const recommendations = [];

      if (!employeeData.lastPromotion) {
        recommendations.push('Consider promotion opportunity');
      }

      const tenure =
        (Date.now() - new Date(employeeData.joinDate)) /
        (1000 * 60 * 60 * 24 * 365);
      if (tenure < 2) {
        recommendations.push('Increase onboarding support');
        recommendations.push('Schedule regular check-ins');
      }

      if (
        employeeData.lastPerformanceRating === 'Below Average' ||
        employeeData.lastPerformanceRating === 'Average'
      ) {
        recommendations.push('Provide professional development opportunities');
        recommendations.push('Conduct career development conversation');
      }

      if (employeeData.salary < 35000) {
        recommendations.push('Review salary competitiveness');
      }

      return recommendations;
    }

    /**
     * Predict salary increase percentage
     */
    static predictSalaryIncrease(employeeData, marketData) {
      let increasePercent = 3; // Base 3%

      // Performance-based increase
      const performanceBonus = {
        'Below Average': 0,
        Average: 1,
        'Above Average': 3,
        Excellent: 5
      };
      increasePercent +=
        performanceBonus[employeeData.lastPerformanceRating] || 1;

      // Inflation adjustment (simplified)
      const inflation = marketData.inflationRate || 2;
      increasePercent += inflation;

      // Market comparison
      if (
        employeeData.salary <
        marketData.marketAverage * 0.8
      ) {
        increasePercent += 2; // Adjust to market
      }

      return {
        recommendedIncrease: increasePercent.toFixed(2) + '%',
        newSalary: (
          employeeData.salary *
          (1 + increasePercent / 100)
        ).toFixed(2),
        factors: [
          'performance',
          'inflation',
          'market_competitiveness'
        ]
      };
    }

    /**
     * Predict department hiring needs
     */
    static predictHiringNeeds(departmentMetrics, historicalData) {
      const predictions = [];

      // Based on turnover trends
      const expectedTurnover =
        historicalData.avgTurnoverRate * departmentMetrics.employeeCount;

      // Based on growth trends
      const growthFactor = historicalData.growthRate || 0.05;
      const growthHires = Math.ceil(
        departmentMetrics.employeeCount * growthFactor
      );

      const totalNeeded = Math.ceil(expectedTurnover + growthHires);

      return {
        department: departmentMetrics.department,
        currentHeadcount: departmentMetrics.employeeCount,
        expectedTurnover: Math.floor(expectedTurnover),
        growthHires: growthHires,
        totalHiringNeed: totalNeeded,
        recommendedTimeline: this.calculateHiringTimeline(
          totalNeeded,
          departmentMetrics
        )
      };
    }

    /**
     * Calculate hiring timeline
     */
    static calculateHiringTimeline(hiringNeed, departmentMetrics) {
      // Simplified: assume 2-4 weeks per hire
      const weeksPerHire = 3;
      const totalWeeks = hiringNeed * weeksPerHire;

      return {
        immediateNeeds: Math.ceil(hiringNeed * 0.4),
        shortTermNeeds: Math.ceil(hiringNeed * 0.6),
        estimatedDuration: totalWeeks + ' weeks',
        startRecruitmentBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
    }
  }

  /**
   * NLP & Sentiment Analysis
   */
  static class NLPService {
    /**
     * Analyze sentiment in employee feedback
     */
    static analyzeFeedbackSentiment(feedbackText) {
      // Simplified sentiment analysis
      // In production, would use libraries like sentiment or tensorflow.js

      const positiveKeywords = [
        'good',
        'great',
        'excellent',
        'happy',
        'satisfied',
        'appreciate',
        'enjoy',
        'love'
      ];
      const negativeKeywords = [
        'bad',
        'poor',
        'terrible',
        'unhappy',
        'frustrated',
        'disappointed',
        'hate',
        'difficult'
      ];

      const lowerText = feedbackText.toLowerCase();
      const positiveCount = positiveKeywords.filter(kw =>
        lowerText.includes(kw)
      ).length;
      const negativeCount = negativeKeywords.filter(kw =>
        lowerText.includes(kw)
      ).length;

      const sentiment =
        positiveCount > negativeCount
          ? 'positive'
          : negativeCount > positiveCount
          ? 'negative'
          : 'neutral';

      return {
        sentiment,
        score:
          (
            (positiveCount - negativeCount) /
            (positiveCount + negativeCount || 1)
          ).toFixed(2) || 0,
        keywords: {
          positive: positiveKeywords.filter(kw => lowerText.includes(kw)),
          negative: negativeKeywords.filter(kw => lowerText.includes(kw))
        }
      };
    }

    /**
     * Extract key topics from text
     */
    static extractTopics(text, maxTopics = 5) {
      // Simplified topic extraction
      // In production, would use NLP libraries

      const words = text.toLowerCase().split(/\s+/);
      const commonStopwords = [
        'the',
        'a',
        'an',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'is',
        'was'
      ];

      const filtered = words.filter(
        w => w.length > 3 && !commonStopwords.includes(w)
      );

      // Count word frequency
      const frequency = {};
      filtered.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
      });

      // Get top topics
      const topics = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxTopics)
        .map(([word, count]) => ({
          word,
          frequency: count
        }));

      return topics;
    }

    /**
     * Categorize feedback comment
     */
    static categorizeComment(comment) {
      const categories = {
        compensation: [
          'salary',
          'pay',
          'bonus',
          'benefits',
          'raise'
        ],
        management: [
          'manager',
          'boss',
          'leadership',
          'direction',
          'support'
        ],
        culture: [
          'culture',
          'team',
          'environment',
          'values',
          'community'
        ],
        career: [
          'growth',
          'development',
          'career',
          'opportunity',
          'learn'
        ],
        worklife: [
          'balance',
          'flexibility',
          'hours',
          'remote',
          'schedule'
        ]
      };

      const lowerComment = comment.toLowerCase();
      const matched = [];

      Object.entries(categories).forEach(([category, keywords]) => {
        const matches = keywords.filter(kw =>
          lowerComment.includes(kw)
        ).length;
        if (matches > 0) {
          matched.push({
            category,
            confidence: (matches / keywords.length * 100).toFixed(0) + '%'
          });
        }
      });

      return {
        categories: matched,
        primaryCategory: matched.length > 0 ? matched[0].category : 'other'
      };
    }
  }

  /**
   * Intelligent Automation
   */
  static class IntelligentAutomation {
    /**
     * Auto-approve low-risk leave requests
     */
    static shouldAutoApproveLeave(leaveRequest, employeeData) {
      let approvalScore = 0;

      // Check leave balance
      if (employeeData.leaveBalance > leaveRequest.numberOfDays) {
        approvalScore += 30;
      }

      // Check attendance record (no recent absences)
      if (employeeData.attendanceScore > 0.95) {
        approvalScore += 25;
      }

      // Check no conflicting approvals policy
      if (!this.hasConflictingPolicies(leaveRequest)) {
        approvalScore += 20;
      }

      // Check performance (good performers can be trusted)
      if (employeeData.lastPerformanceRating === 'Excellent') {
        approvalScore += 20;
      }

      // Check if during critical period
      if (!this.isCriticalPeriod(leaveRequest.startDate)) {
        approvalScore += 5;
      }

      return {
        shouldAutoApprove: approvalScore >= 75,
        score: approvalScore,
        reason:
          approvalScore >= 75
            ? 'Low-risk leave request'
            : 'Requires manual review'
      };
    }

    /**
     * Check for conflicting policies
     */
    static hasConflictingPolicies(leaveRequest) {
      // Implementation would check company policies
      return false;
    }

    /**
     * Check if during critical business period
     */
    static isCriticalPeriod(date) {
      // Implementation would check fiscal year-end, etc.
      return false;
    }

    /**
     * Detect anomalies in attendance
     */
    static detectAttendanceAnomalies(employeeAttendance) {
      const recentDays = employeeAttendance.last30Days;
      const avgAbsentDays = (
        recentDays.filter(d => d.status === 'absent').length / 30
      ).toFixed(2);

      const anomalies = [];

      if (avgAbsentDays > 0.15) {
        anomalies.push({
          type: 'UNUSUAL_ABSENCE_RATE',
          severity: 'medium',
          description: `High absence rate: ${avgAbsentDays * 100}% of days`
        });
      }

      // Check for consecutive absences
      let consecutiveDays = 0;
      for (const day of recentDays) {
        if (day.status === 'absent') {
          consecutiveDays++;
          if (consecutiveDays > 3) {
            anomalies.push({
              type: 'CONSECUTIVE_ABSENCES',
              severity: 'high',
              description: `${consecutiveDays} consecutive days absent`
            });
            break;
          }
        } else {
          consecutiveDays = 0;
        }
      }

      return anomalies;
    }
  }

  /**
   * Recommendation Engine
   */
  static class RecommendationEngine {
    /**
     * Recommend training courses for employees
     */
    static recommendTrainings(employeeData, completedTrainings = []) {
      const recommendations = [];

      // Recommend based on role
      const roleBasedCourses = {
        'Software Engineer': [
          'Advanced JavaScript',
          'System Design',
          'Database Optimization'
        ],
        'Product Manager': [
          'Product Strategy',
          'Data Analysis for PMs',
          'User Research'
        ],
        'Sales': ['Sales Techniques', 'Negotiation', 'CRM Mastery'],
        Manager: ['Team Management', 'Leadership', 'Conflict Resolution']
      };

      const suggested =
        roleBasedCourses[employeeData.position] || [];
      for (const course of suggested) {
        if (!completedTrainings.includes(course)) {
          recommendations.push({
            course,
            type: 'role-based',
            priority: 'high'
          });
        }
      }

      // Recommend based on performance gaps
      if (employeeData.lastPerformanceRating === 'Below Average') {
        recommendations.push({
          course: 'Performance Improvement Program',
          type: 'remedial',
          priority: 'critical'
        });
      }

      return recommendations;
    }

    /**
     * Recommend mentors for employees
     */
    static recommendMentors(employeeData, candidateMentors) {
      const recommendations = [];

      for (const mentor of candidateMentors) {
        let score = 0;

        // Same department
        if (mentor.department === employeeData.department) {
          score += 20;
        }

        // Relevant expertise
        if (mentor.expertise.includes(employeeData.targetSkill)) {
          score += 30;
        }

        // Available (low mentee count)
        if (mentor.menteeCount < 3) {
          score += 20;
        }

        // Performance level
        if (mentor.performanceRating === 'Excellent') {
          score += 20;
        }

        if (score > 40) {
          recommendations.push({
            mentorId: mentor._id,
            name: mentor.name,
            matchScore: score
          });
        }
      }

      return recommendations
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 3);
    }
  }
}

module.exports = AIMLIntegration;

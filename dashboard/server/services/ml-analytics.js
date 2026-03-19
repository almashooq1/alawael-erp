/**
 * ML Analytics Engine
 * Predictive analytics and intelligent insights for quality monitoring
 */

const database = require('./database');

class MLAnalytics {
  constructor() {
    this.models = {
      failurePrediction: null,
      riskScoring: null,
      patternRecognition: null,
    };
  }

  /**
   * Analyze historical data and detect patterns
   */
  async analyzePatterns(serviceName, days = 30) {
    try {
      const history = await database.getServiceHistory(serviceName, days);

      if (history.length < 5) {
        return {
          hasEnoughData: false,
          message: 'Insufficient data for pattern analysis (need at least 5 runs)',
        };
      }

      // Calculate statistics
      const stats = this.calculateStatistics(history);

      // Detect trends
      const trend = this.detectTrend(history);

      // Identify anomalies
      const anomalies = this.detectAnomalies(history, stats);

      // Time-based patterns
      const timePatterns = this.analyzeTimePatterns(history);

      return {
        hasEnoughData: true,
        service: serviceName,
        stats,
        trend,
        anomalies,
        timePatterns,
        recommendations: this.generateRecommendations(stats, trend, anomalies),
      };
    } catch (error) {
      console.error('Error analyzing patterns:', error);
      throw error;
    }
  }

  /**
   * Calculate basic statistics
   */
  calculateStatistics(history) {
    const successRates = history.map(h => {
      const total = h.tests_total || 0;
      return total > 0 ? (h.tests_passed / total) * 100 : 0;
    });

    const durations = history.map(h => h.duration_ms || 0);
    const coverages = history.filter(h => h.coverage).map(h => h.coverage);

    return {
      runs: history.length,
      avgSuccessRate: this.mean(successRates),
      minSuccessRate: Math.min(...successRates),
      maxSuccessRate: Math.max(...successRates),
      stdDevSuccessRate: this.standardDeviation(successRates),
      avgDuration: this.mean(durations),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      avgCoverage: coverages.length > 0 ? this.mean(coverages) : null,
      failureRate: (history.filter(h => h.status === 'failed').length / history.length) * 100,
    };
  }

  /**
   * Detect trend direction
   */
  detectTrend(history) {
    if (history.length < 3) {
      return { direction: 'unknown', confidence: 0 };
    }

    // Use last 10 runs or all available
    const recentHistory = history.slice(-10);
    const successRates = recentHistory.map(h => {
      const total = h.tests_total || 0;
      return total > 0 ? (h.tests_passed / total) * 100 : 0;
    });

    // Simple linear regression
    const regression = this.linearRegression(successRates);

    let direction = 'stable';
    if (regression.slope > 2) direction = 'improving';
    else if (regression.slope < -2) direction = 'declining';

    // Calculate confidence based on R²
    const confidence = Math.abs(regression.r2) * 100;

    return {
      direction,
      confidence: confidence.toFixed(2),
      slope: regression.slope.toFixed(2),
      r2: regression.r2.toFixed(4),
    };
  }

  /**
   * Detect anomalies in test results
   */
  detectAnomalies(history, stats) {
    const anomalies = [];

    // Z-score method for anomaly detection
    const threshold = 2; // 2 standard deviations

    history.forEach((run, index) => {
      const total = run.tests_total || 0;
      const successRate = total > 0 ? (run.tests_passed / total) * 100 : 0;

      const zScore = Math.abs((successRate - stats.avgSuccessRate) / stats.stdDevSuccessRate);

      if (zScore > threshold) {
        anomalies.push({
          timestamp: run.timestamp,
          type: successRate < stats.avgSuccessRate ? 'sudden_drop' : 'sudden_spike',
          successRate: successRate.toFixed(2),
          expected: stats.avgSuccessRate.toFixed(2),
          severity: zScore > 3 ? 'high' : 'medium',
          zScore: zScore.toFixed(2),
        });
      }

      // Duration anomalies
      const durationZScore = Math.abs(
        (run.duration_ms - stats.avgDuration) / (stats.maxDuration - stats.minDuration + 1)
      );

      if (durationZScore > 2 && run.duration_ms > stats.avgDuration * 1.5) {
        anomalies.push({
          timestamp: run.timestamp,
          type: 'slow_execution',
          duration: run.duration_ms,
          expected: stats.avgDuration.toFixed(0),
          severity: 'medium',
        });
      }
    });

    return anomalies;
  }

  /**
   * Analyze time-based patterns
   */
  analyzeTimePatterns(history) {
    const patterns = {
      dayOfWeek: {},
      hourOfDay: {},
      consecutiveFailures: 0,
      maxConsecutiveFailures: 0,
    };

    let currentStreak = 0;

    history.forEach(run => {
      const date = new Date(run.timestamp);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();

      // Day of week pattern
      if (!patterns.dayOfWeek[day]) {
        patterns.dayOfWeek[day] = { total: 0, failed: 0 };
      }
      patterns.dayOfWeek[day].total++;
      if (run.status === 'failed') {
        patterns.dayOfWeek[day].failed++;
      }

      // Hour of day pattern
      if (!patterns.hourOfDay[hour]) {
        patterns.hourOfDay[hour] = { total: 0, failed: 0 };
      }
      patterns.hourOfDay[hour].total++;
      if (run.status === 'failed') {
        patterns.hourOfDay[hour].failed++;
      }

      // Consecutive failures
      if (run.status === 'failed') {
        currentStreak++;
        patterns.maxConsecutiveFailures = Math.max(patterns.maxConsecutiveFailures, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    patterns.consecutiveFailures = currentStreak;

    // Find most problematic day
    let worstDay = null;
    let worstFailureRate = 0;
    Object.entries(patterns.dayOfWeek).forEach(([day, data]) => {
      const rate = (data.failed / data.total) * 100;
      if (rate > worstFailureRate) {
        worstFailureRate = rate;
        worstDay = day;
      }
    });

    patterns.worstDay = worstDay;
    patterns.worstDayFailureRate = worstFailureRate.toFixed(2);

    return patterns;
  }

  /**
   * Predict failure probability for next run
   */
  async predictFailure(serviceName) {
    try {
      const patterns = await this.analyzePatterns(serviceName, 30);

      if (!patterns.hasEnoughData) {
        return {
          predicted: false,
          probability: 0,
          confidence: 0,
          message: 'Insufficient data for prediction',
        };
      }

      // Simple prediction model based on multiple factors
      let failureProbability = patterns.stats.failureRate;

      // Adjust based on trend
      if (patterns.trend.direction === 'declining') {
        failureProbability += 20;
      } else if (patterns.trend.direction === 'improving') {
        failureProbability -= 10;
      }

      // Adjust based on consecutive failures
      if (patterns.timePatterns.consecutiveFailures > 0) {
        failureProbability += patterns.timePatterns.consecutiveFailures * 10;
      }

      // Adjust based on recent anomalies
      const recentAnomalies = patterns.anomalies.filter(a => {
        const diff = Date.now() - new Date(a.timestamp).getTime();
        return diff < 24 * 60 * 60 * 1000; // Last 24 hours
      });
      if (recentAnomalies.length > 0) {
        failureProbability += 15;
      }

      // Normalize to 0-100
      failureProbability = Math.max(0, Math.min(100, failureProbability));

      // Confidence based on data quality
      const confidence = Math.min(100, (patterns.stats.runs / 30) * 100);

      return {
        predicted: failureProbability > 50,
        probability: failureProbability.toFixed(2),
        confidence: confidence.toFixed(2),
        factors: {
          historicalFailureRate: patterns.stats.failureRate.toFixed(2),
          trend: patterns.trend.direction,
          consecutiveFailures: patterns.timePatterns.consecutiveFailures,
          recentAnomalies: recentAnomalies.length,
        },
        recommendation: this.getPredictionRecommendation(failureProbability),
      };
    } catch (error) {
      console.error('Error predicting failure:', error);
      throw error;
    }
  }

  /**
   * Calculate risk score for a service
   */
  async calculateRiskScore(serviceName) {
    try {
      const patterns = await this.analyzePatterns(serviceName, 30);
      const prediction = await this.predictFailure(serviceName);

      if (!patterns.hasEnoughData) {
        return {
          score: 0,
          level: 'unknown',
          message: 'Insufficient data for risk scoring',
        };
      }

      // Risk factors (0-100 each)
      const factors = {
        failureRate: patterns.stats.failureRate,
        trendRisk:
          patterns.trend.direction === 'declining'
            ? 80
            : patterns.trend.direction === 'improving'
              ? 20
              : 50,
        volatility: (patterns.stats.stdDevSuccessRate / 100) * 100,
        consecutiveFailures: Math.min(100, patterns.timePatterns.consecutiveFailures * 25),
        anomalies: Math.min(100, patterns.anomalies.length * 10),
        predictedFailure: parseFloat(prediction.probability),
      };

      // Weighted risk score
      const weights = {
        failureRate: 0.3,
        trendRisk: 0.2,
        volatility: 0.15,
        consecutiveFailures: 0.15,
        anomalies: 0.1,
        predictedFailure: 0.1,
      };

      let riskScore = 0;
      Object.keys(factors).forEach(key => {
        riskScore += factors[key] * weights[key];
      });

      // Determine risk level
      let level = 'low';
      let color = 'green';
      if (riskScore > 70) {
        level = 'critical';
        color = 'red';
      } else if (riskScore > 50) {
        level = 'high';
        color = 'orange';
      } else if (riskScore > 30) {
        level = 'medium';
        color = 'yellow';
      }

      return {
        score: riskScore.toFixed(2),
        level,
        color,
        factors,
        weights,
        recommendations: this.getRiskRecommendations(riskScore, factors),
      };
    } catch (error) {
      console.error('Error calculating risk score:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(stats, trend, anomalies) {
    const recommendations = [];

    // Success rate recommendations
    if (stats.avgSuccessRate < 80) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        message: 'Success rate is below 80%. Consider reviewing and fixing failing tests.',
        action: 'Review test failures and improve code quality',
      });
    }

    // Trend recommendations
    if (trend.direction === 'declining') {
      recommendations.push({
        type: 'trend',
        priority: 'high',
        message: `Quality is declining (confidence: ${trend.confidence}%). Immediate action required.`,
        action: 'Investigate recent changes and address quality degradation',
      });
    }

    // Volatility recommendations
    if (stats.stdDevSuccessRate > 20) {
      recommendations.push({
        type: 'stability',
        priority: 'medium',
        message: 'High volatility in test results. Tests may be flaky or unstable.',
        action: 'Identify and fix flaky tests, improve test reliability',
      });
    }

    // Anomaly recommendations
    if (anomalies.length > 3) {
      recommendations.push({
        type: 'anomaly',
        priority: 'medium',
        message: `${anomalies.length} anomalies detected in recent history.`,
        action: 'Review anomalous test runs and identify patterns',
      });
    }

    // Coverage recommendations
    if (stats.avgCoverage !== null && stats.avgCoverage < 70) {
      recommendations.push({
        type: 'coverage',
        priority: 'medium',
        message: `Code coverage is ${stats.avgCoverage.toFixed(2)}%, below recommended 70%.`,
        action: 'Add more tests to increase code coverage',
      });
    }

    return recommendations;
  }

  /**
   * Get prediction-based recommendation
   */
  getPredictionRecommendation(probability) {
    if (probability > 70) {
      return 'High failure risk! Run tests immediately and review recent changes.';
    } else if (probability > 50) {
      return 'Moderate failure risk. Consider running tests before deployment.';
    } else if (probability > 30) {
      return 'Low failure risk, but monitor closely.';
    } else {
      return 'Tests are likely to pass. System is stable.';
    }
  }

  /**
   * Get risk-based recommendations
   */
  getRiskRecommendations(score, factors) {
    const recommendations = [];

    if (score > 70) {
      recommendations.push('CRITICAL: Immediate attention required');
      recommendations.push('Run full test suite immediately');
      recommendations.push('Review recent code changes');
      recommendations.push('Consider rolling back if deployment is recent');
    } else if (score > 50) {
      recommendations.push('HIGH RISK: Schedule immediate review');
      recommendations.push('Increase monitoring frequency');
      recommendations.push('Review failing tests');
    } else if (score > 30) {
      recommendations.push('MEDIUM RISK: Monitor closely');
      recommendations.push('Schedule regular test runs');
      recommendations.push('Review test coverage');
    } else {
      recommendations.push('LOW RISK: Continue normal monitoring');
      recommendations.push('Maintain current quality practices');
    }

    // Factor-specific recommendations
    if (factors.consecutiveFailures > 2) {
      recommendations.push(
        `Address consecutive failures (${factors.consecutiveFailures} in a row)`
      );
    }

    if (factors.volatility > 50) {
      recommendations.push('High volatility detected - stabilize tests');
    }

    return recommendations;
  }

  // Helper methods for statistics
  mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  standardDeviation(arr) {
    const avg = this.mean(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  linearRegression(y) {
    const n = y.length;
    const x = Array.from({ length: n }, (_, i) => i);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const r2 = 1 - ssResidual / ssTotal;

    return { slope, intercept, r2 };
  }
}

// Create singleton instance
const mlAnalytics = new MLAnalytics();

module.exports = mlAnalytics;

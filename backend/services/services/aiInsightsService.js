/**
 * AI-Powered Insights Service
 * Intelligent analysis, anomaly detection, and recommendations
 * 
 * Features:
 * - Anomaly detection in KPIs
 * - Predictive analytics
 * - Smart recommendations
 * - Pattern recognition
 * - Seasonal analysis
 * - Correlation analysis
 * - Auto-generated insights
 */

const logger = require('../utils/logger');

class AIInsightsService {
  constructor() {
    this.anomalies = [];
    this.insights = [];
    this.predictions = new Map();
    this.patterns = new Map();
    this.correlations = [];
  }

  /**
   * Detect anomalies in metric data
   */
  detectAnomalies(metric, dataPoints = []) {
    if (dataPoints.length < 3) {
      return [];
    }

    const anomalies = [];
    const values = dataPoints.map(d => d.value);
    
    // Calculate mean and standard deviation
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Find anomalies (values outside 2 standard deviations)
    values.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      
      if (zScore > 2) {
        anomalies.push({
          timestamp: dataPoints[index].timestamp,
          value,
          zScore: zScore.toFixed(2),
          severity: zScore > 3 ? 'critical' : 'warning',
          message: `Unusual value detected: ${value} (${zScore.toFixed(2)}σ from mean)`,
        });
      }
    });

    return anomalies;
  }

  /**
   * Analyze trends in data
   */
  analyzeTrend(dataPoints = []) {
    if (dataPoints.length < 2) {
      return { trend: 'insufficient_data' };
    }

    const values = dataPoints.map(d => d.value);
    const n = values.length;

    // Simple linear regression
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const trend = slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable';
    const strength = Math.abs(slope);

    // Calculate trend percentage
    const firstValue = values[0];
    const lastValue = values[n - 1];
    const trendPercent = ((lastValue - firstValue) / firstValue * 100).toFixed(2);

    return {
      trend,
      strength: strength.toFixed(3),
      trendPercent: parseFloat(trendPercent),
      direction: slope > 0 ? 'upward' : 'downward',
      hasSignificantChange: Math.abs(parseFloat(trendPercent)) > 5,
    };
  }

  /**
   * Generate intelligent insights from data
   */
  generateInsights(kpiId, kpiData, dataPoints = []) {
    const insights = [];
    const trend = this.analyzeTrend(dataPoints);
    const anomalies = this.detectAnomalies(kpiData, dataPoints);

    // Trend-based insights
    if (trend.trend === 'increasing' && trend.strength > 0.01) {
      insights.push({
        type: 'positive',
        severity: 'info',
        message: `${kpiData.name} shows positive trend with ${trend.trendPercent}% change`,
        recommendation: 'Continue current strategy',
      });
    } else if (trend.trend === 'decreasing' && trend.strength > 0.01) {
      insights.push({
        type: 'negative',
        severity: 'warning',
        message: `${kpiData.name} shows negative trend with ${trend.trendPercent}% decline`,
        recommendation: 'Review current operations and identify improvement areas',
      });
    }

    // Anomaly-based insights
    if (anomalies.length > 0) {
      insights.push({
        type: 'anomaly',
        severity: anomalies[0].severity,
        message: `Detected ${anomalies.length} anomaly(ies) in recent data`,
        details: anomalies.slice(0, 3),
        recommendation: 'Investigate unusual values and update monitoring thresholds',
      });
    }

    // Performance gap insights
    const currentValue = kpiData.current;
    const target = kpiData.target;
    const gap = target - currentValue;
    const gapPercent = (gap / target * 100);

    if (gap > 0 && gapPercent > 10) {
      insights.push({
        type: 'gap',
        severity: gapPercent > 20 ? 'critical' : 'warning',
        message: `Performance gap of ${gapPercent.toFixed(1)}% from target`,
        gap,
        recommendation: `Close the gap by improving at least ${(gap / dataPoints.length || gap / 4).toFixed(0)} per period`,
      });
    }

    // Volatility analysis
    if (dataPoints.length > 5) {
      const recentValues = dataPoints.slice(-5).map(d => d.value);
      const recentMean = recentValues.reduce((a, b) => a + b) / recentValues.length;
      const recentVariance = recentValues.reduce((a, b) => a + Math.pow(b - recentMean, 2)) / recentValues.length;
      const volatility = Math.sqrt(recentVariance);

      if (volatility > currentValue * 0.1) {
        insights.push({
          type: 'volatility',
          severity: 'warning',
          message: `High volatility detected (${volatility.toFixed(0)} variation)`,
          recommendation: 'Stabilize processes and reduce variability',
        });
      }
    }

    return insights;
  }

  /**
   * Predict future KPI values
   */
  predictFutureValue(dataPoints = [], periods = 4) {
    if (dataPoints.length < 3) {
      return null;
    }

    const values = dataPoints.map(d => d.value);
    const n = values.length;

    // Simple exponential smoothing
    let alpha = 0.3;
    let forecast = values[n - 1];
    const predictions = [];

    // Calculate suitable alpha
    if (n > 10) {
      alpha = 0.2;
    } else if (n > 20) {
      alpha = 0.15;
    }

    // Generate forecasts
    for (let i = 1; i <= periods; i++) {
      forecast = alpha * values[n - 1] + (1 - alpha) * forecast;
      predictions.push({
        period: i,
        predictedValue: Math.round(forecast),
        confidence: (95 - (i * 3)).toFixed(0), // Decreasing confidence
      });
    }

    return {
      method: 'exponential_smoothing',
      lastObservedValue: values[n - 1],
      predictions,
      averagePrediction: Math.round(predictions.reduce((a, b) => a + b.predictedValue, 0) / predictions.length),
    };
  }

  /**
   * Detect patterns in data
   */
  detectPatterns(dataPoints = [], periodLength = 7) {
    if (dataPoints.length < periodLength * 2) {
      return [];
    }

    const patterns = [];
    const values = dataPoints.map(d => d.value);

    // Weekly pattern detection
    const weeklyPattern = [];
    for (let i = 0; i < periodLength; i++) {
      const periodValues = [];
      for (let j = i; j < values.length; j += periodLength) {
        periodValues.push(values[j]);
      }
      const avg = periodValues.reduce((a, b) => a + b) / periodValues.length;
      weeklyPattern.push({ day: i, averageValue: avg });
    }

    // Find peak and low days
    const maxDay = weeklyPattern.reduce((max, p) => p.averageValue > max.averageValue ? p : max);
    const minDay = weeklyPattern.reduce((min, p) => p.averageValue < min.averageValue ? p : min);

    patterns.push({
      type: 'weekly',
      peakDay: maxDay.day,
      peakValue: maxDay.averageValue,
      lowDay: minDay.day,
      lowValue: minDay.averageValue,
      variation: ((maxDay.averageValue - minDay.averageValue) / minDay.averageValue * 100).toFixed(1),
    });

    return patterns;
  }

  /**
   * Analyze correlations between KPIs
   */
  analyzeCorrelations(kpi1Values = [], kpi2Values = []) {
    if (kpi1Values.length < 2 || kpi2Values.length < 2 || kpi1Values.length !== kpi2Values.length) {
      return null;
    }

    // Calculate Pearson correlation
    const n = kpi1Values.length;
    const mean1 = kpi1Values.reduce((a, b) => a + b) / n;
    const mean2 = kpi2Values.reduce((a, b) => a + b) / n;

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = kpi1Values[i] - mean1;
      const diff2 = kpi2Values[i] - mean2;
      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }

    const correlation = numerator / Math.sqrt(denominator1 * denominator2);

    return {
      correlation: correlation.toFixed(3),
      strength: Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.4 ? 'moderate' : 'weak',
      direction: correlation > 0 ? 'positive' : 'negative',
      isSignificant: Math.abs(correlation) > 0.5,
    };
  }

  /**
   * Generate smart recommendations
   */
  generateRecommendations(kpiData, insights = [], trend = {}) {
    const recommendations = [];

    insights.forEach(insight => {
      switch (insight.type) {
        case 'negative':
          recommendations.push({
            priority: 'high',
            action: 'Review and Optimize',
            details: `The declining trend in ${kpiData.name} requires immediate review of underlying processes`,
            estimatedImpact: `Potential recovery: ${Math.abs(insight.trendPercent * 2).toFixed(1)}% improvement possible`,
          });
          break;

        case 'gap':
          if (insight.gapPercent > 15) {
            recommendations.push({
              priority: 'high',
              action: 'Increase Focus',
              details: `Significant gap (${insight.gapPercent.toFixed(1)}%) from target requires focused effort`,
              estimatedImpact: `Closing gap needs ${Math.ceil(insight.gap / 3)} per period improvement`,
            });
          }
          break;

        case 'volatility':
          recommendations.push({
            priority: 'medium',
            action: 'Standardize Processes',
            details: 'High volatility indicates inconsistent performance - standardize processes',
            estimatedImpact: 'Reducing volatility could improve predictability and target achievement',
          });
          break;

        case 'anomaly':
          recommendations.push({
            priority: 'medium',
            action: 'Investigate',
            details: 'Unusual data patterns detected - investigate root causes',
          });
          break;
      }
    });

    return recommendations.slice(0, 5);
  }

  /**
   * Generate AI-powered dashboard summary
   */
  generateAISummary(kpis = []) {
    const summary = {
      timestamp: new Date(),
      totalKPIs: kpis.length,
      analysisStatus: 'complete',
      keyFindings: [],
      recommendations: [],
      alerts: [],
    };

    // Analyze all KPIs
    let criticalCount = 0;
    let warningCount = 0;
    const allRecommendations = [];

    kpis.forEach(kpi => {
      const insights = this.generateInsights(kpi.id, kpi, kpi.history || []);
      const predictions = this.predictFutureValue(kpi.history || []);

      insights.forEach(insight => {
        if (insight.severity === 'critical') criticalCount++;
        if (insight.severity === 'warning') warningCount++;
      });

      const recs = this.generateRecommendations(kpi, insights);
      allRecommendations.push(...recs);
    });

    summary.keyFindings = [
      { finding: `${criticalCount} Critical Issues`, severity: 'high' },
      { finding: `${warningCount} Warnings`, severity: 'medium' },
      { finding: `${kpis.filter(k => k.trend === 'up').length} Positive Trends`, severity: 'info' },
    ];

    summary.recommendations = allRecommendations.slice(0, 10);

    return summary;
  }

  /**
   * Generate executive briefing
   */
  generateExecutiveBriefing(kpis = []) {
    const aiSummary = this.generateAISummary(kpis);

    return {
      title: 'AI-Generated Executive Briefing',
      date: new Date(),
      summary: {
        totalKPIs: aiSummary.totalKPIs,
        criticalIssues: aiSummary.keyFindings.filter(f => f.severity === 'high').length,
        optionsApproval: aiSummary.keyFindings.filter(f => f.severity === 'medium').length,
      },
      keyInsights: aiSummary.keyFindings,
      topRecommendations: aiSummary.recommendations.slice(0, 5),
      predictedOutcome: this.generateOutcomePrediction(kpis),
      riskAssessment: this.assessRisks(kpis),
    };
  }

  /**
   * Generate outcome predictions
   */
  generateOutcomePrediction(kpis = []) {
    const predictions = [];
    let totalConfidence = 0;

    kpis.forEach(kpi => {
      if (kpi.history && kpi.history.length > 3) {
        const pred = this.predictFutureValue(kpi.history, 4);
        if (pred) {
          predictions.push({
            kpi: kpi.name,
            currentValue: kpi.current,
            predictedValue: pred.averagePrediction,
            trend: kpi.current < pred.averagePrediction ? 'will improve' : 'will decline',
            confidence: parseInt(pred.predictions[0].confidence),
          });
          totalConfidence += parseInt(pred.predictions[0].confidence);
        }
      }
    });

    return {
      period: 'next_4_periods',
      predictions: predictions.slice(0, 5),
      overallConfidence: Math.round(totalConfidence / predictions.length) || 0,
      recommendation: totalConfidence / predictions.length > 75 ? 'Trust predictions for planning' : 'Gather more data for reliable predictions',
    };
  }

  /**
   * Assess risks in KPI performance
   */
  assessRisks(kpis = []) {
    const risks = [];

    kpis.forEach(kpi => {
      const variance = ((kpi.current - kpi.target) / kpi.target) * 100;

      if (variance < -10) {
        risks.push({
          kpi: kpi.name,
          riskLevel: 'high',
          gap: Math.abs(variance).toFixed(1),
          recoveryTime: Math.ceil(Math.abs(variance) / 2),
          mitigation: `Implement corrective actions to close ${Math.abs(variance).toFixed(1)}% gap`,
        });
      } else if (variance < -5) {
        risks.push({
          kpi: kpi.name,
          riskLevel: 'medium',
          gap: Math.abs(variance).toFixed(1),
          recoveryTime: Math.ceil(Math.abs(variance) / 3),
          mitigation: `Monitor closely and prepare contingency plans`,
        });
      }
    });

    return {
      totalRisks: risks.length,
      highRisks: risks.filter(r => r.riskLevel === 'high').length,
      mediumRisks: risks.filter(r => r.riskLevel === 'medium').length,
      details: risks.slice(0, 5),
    };
  }
}

module.exports = new AIInsightsService();

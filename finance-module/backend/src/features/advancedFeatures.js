/**
 * Advanced Finance Module Features
 * ML-Based Forecasting, WebSocket Real-Time Updates, Notifications
 * 
 * Features:
 * - Machine Learning forecasting with trend analysis
 * - Real-time WebSocket updates for all dashboards
 * - Intelligent alerts and notifications
 * - Advanced analytics and predictions
 */

const tf = require('@tensorflow/tfjs'); // Optional: for ML
const simple = require('simple-statistics'); // Statistical functions

/**
 * ML-Based Cash Flow Forecasting
 * Uses historical data to predict future cash flows with confidence intervals
 */
class MLCashFlowForecaster {
  /**
   * Predict cash flow for next periods using time series analysis
   * @param {Array} historicalData - Past 12-24 months of data
   * @param {Number} periods - Number of periods to forecast
   * @return {Object} Forecast with predictions and confidence intervals
   */
  static async predictCashFlow(historicalData, periods = 12) {
    try {
      // Extract numerical values
      const inflows = historicalData.map(d => d.inflow || 0);
      const outflows = historicalData.map(d => d.outflow || 0);
      const netFlow = inflows.map((inf, i) => inf - (outflows[i] || 0));

      // Calculate statistics
      const flowMean = simple.mean(netFlow);
      const flowStdDev = simple.standardDeviation(netFlow);

      // Detect trends using linear regression
      const trend = this._calculateTrend(netFlow);

      // Generate forecast with 3 scenarios
      const forecast = {
        baseline: [],
        optimistic: [],
        pessimistic: [],
        conservative: [],
        confidence: {
          lower: [],
          upper: []
        },
        trend: trend,
        seasonality: this._detectSeasonality(netFlow),
        predictions: []
      };

      for (let i = 0; i < periods; i++) {
        const baseValue = flowMean + (trend * (i + 1));
        const confidence = Math.abs(flowStdDev * 1.96); // 95% CI

        forecast.baseline.push(baseValue);
        forecast.optimistic.push(baseValue + (baseValue * 0.20)); // +20%
        forecast.pessimistic.push(baseValue - (baseValue * 0.20)); // -20%
        forecast.conservative.push(baseValue); // No variance

        forecast.confidence.lower.push(baseValue - confidence);
        forecast.confidence.upper.push(baseValue + confidence);

        forecast.predictions.push({
          period: i + 1,
          baseline: baseValue,
          lower95: baseValue - confidence,
          upper95: baseValue + confidence,
          scenarios: {
            optimistic: baseValue + (baseValue * 0.20),
            pessimistic: baseValue - (baseValue * 0.20),
            conservative: baseValue
          }
        });
      }

      return {
        success: true,
        data: forecast,
        accuracy: this._estimateAccuracy(historicalData),
        timestamp: new Date()
      };
    } catch (error) {
      console.error('[ML Forecaster] Error:', error);
      return {
        success: false,
        error: error.message,
        fallbackForecast: this._generateBasicForecast(historicalData, periods)
      };
    }
  }

  /**
   * Calculate linear trend in data
   */
  static _calculateTrend(data) {
    if (data.length < 2) return 0;
    const x = Array.from({length: data.length}, (_, i) => i);
    const result = simple.linearRegression(x.map((xi, i) => [xi, data[i]]));
    return result.m; // Slope
  }

  /**
   * Detect seasonal patterns
   */
  static _detectSeasonality(data) {
    const seasonalVariance = [];
    for (let i = 0; i < 12 && i < data.length; i++) {
      const seasonal = data.slice(i, data.length).filter((_, idx) => idx % 12 === 0);
      seasonalVariance.push(simple.variance(seasonal));
    }
    return {
      detected: Math.max(...seasonalVariance) > simple.variance(data) * 0.5,
      pattern: 'monthly',  // Can be improved with FFT
      strength: Math.max(...seasonalVariance) / simple.variance(data)
    };
  }

  /**
   * Estimate forecast accuracy based on historical variance
   */
  static _estimateAccuracy(data) {
    const volatility = simple.standardDeviation(data.map(d => d.netFlow || 0));
    return Math.max(0.6, 1 - (volatility / 100)); // 60-100% accuracy range
  }

  /**
   * Fallback basic forecast for errors
   */
  static _generateBasicForecast(data, periods) {
    const avg = simple.mean(data.map(d => d.netFlow || 0));
    const forecast = Array(periods).fill(avg);
    return {
      baseline: forecast,
      optimistic: forecast.map(f => f * 1.20),
      pessimistic: forecast.map(f => f * 0.80),
      conservative: forecast,
      confidence: { lower: forecast, upper: forecast }
    };
  }
}

/**
 * Anomaly Detection Engine
 * Identifies unusual financial events requiring attention
 */
class AnomalyDetector {
  /**
   * Detect anomalies in transaction data
   * Uses Z-score method (threshold: 2.5 standard deviations)
   */
  static detectAnomalies(transactions, threshold = 2.5) {
    const amounts = transactions.map(t => t.amount || 0);
    const mean = simple.mean(amounts);
    const stdDev = simple.standardDeviation(amounts);

    const anomalies = transactions
      .filter(t => {
        const zscore = Math.abs((t.amount - mean) / stdDev);
        return zscore > threshold;
      })
      .map(t => ({
        transaction: t,
        severity: this._calculateSeverity(t.amount, mean, stdDev),
        recommendation: this._generateRecommendation(t, mean),
        timestamp: new Date()
      }));

    return {
      count: anomalies.length,
      anomalies: anomalies,
      summary: this._generateSummary(anomalies),
      riskLevel: this._assessRiskLevel(anomalies)
    };
  }

  /**
   * Calculate anomaly severity (1-10 scale)
   */
  static _calculateSeverity(value, mean, stdDev) {
    const zscore = Math.abs((value - mean) / stdDev);
    return Math.min(10, Math.round(zscore));
  }

  /**
   * Generate recommendation for anomalous transactions
   */
  static _generateRecommendation(transaction, mean) {
    if (transaction.amount > mean * 2) {
      return 'Review for potential fraud or unusual high-value transaction';
    } else if (transaction.amount < mean / 2) {
      return 'Investigate unusually low transaction value';
    }
    return 'Monitor for recurring patterns';
  }

  /**
   * Generate anomaly summary
   */
  static _generateSummary(anomalies) {
    return {
      high: anomalies.filter(a => a.severity >= 7).length,
      medium: anomalies.filter(a => a.severity >= 4 && a.severity < 7).length,
      low: anomalies.filter(a => a.severity < 4).length
    };
  }

  /**
   * Assess overall risk level
   */
  static _assessRiskLevel(anomalies) {
    const highRisk = anomalies.filter(a => a.severity >= 8).length;
    if (highRisk >= 5) return 'critical';
    if (highRisk >= 2) return 'high';
    if (anomalies.length > 10) return 'medium';
    return 'low';
  }
}

/**
 * WebSocket Real-Time Updates Manager
 * Coordinates real-time updates across finance module
 */
class FinanceRealtimeManager {
  constructor(io) {
    this.io = io;
    this.financeNS = io.of('/finance');
    this.subscribers = new Map();
    this.activeDashboards = new Set();
  }

  /**
   * Initialize real-time updates
   */
  initialize() {
    this.financeNS.on('connection', (socket) => {
      console.log(`[Finance Realtime] User ${socket.id} connected`);

      // Subscribe to violations in real-time
      socket.on('watch:violations', (params) => {
        socket.join(`violations:${params.userId || 'all'}`);
        socket.emit('subscribed', { 
          channel: 'violations',
          timestamp: new Date()
        });
      });

      // Subscribe to cash flow updates
      socket.on('watch:cashflow', (params) => {
        socket.join(`cashflow:${params.userId || 'all'}`);
        socket.emit('subscribed', { 
          channel: 'cashflow',
          timestamp: new Date()
        });
      });

      // Subscribe to risk matrix changes
      socket.on('watch:risks', (params) => {
        socket.join(`risks:${params.userId || 'all'}`);
        socket.emit('subscribed', { 
          channel: 'risks',
          timestamp: new Date()
        });
      });

      // Unsubscribe handlers
      socket.on('unwatch:violations', (params) => {
        socket.leave(`violations:${params.userId || 'all'}`);
      });

      socket.on('disconnect', () => {
        console.log(`[Finance Realtime] User ${socket.id} disconnected`);
      });
    });
  }

  /**
   * Broadcast violation created event
   */
  broadcastViolationCreated(violation, userId) {
    this.financeNS.to(`violations:${userId}`).emit('violation:created', {
      violation,
      timestamp: new Date(),
      action: 'created'
    });
  }

  /**
   * Broadcast violation resolved event
   */
  broadcastViolationResolved(violationId, userId) {
    this.financeNS.to(`violations:${userId}`).emit('violation:resolved', {
      violationId,
      timestamp: new Date(),
      action: 'resolved'
    });
  }

  /**
   * Broadcast cash flow forecast available
   */
  broadcastForecastGenerated(forecast, userId) {
    this.financeNS.to(`cashflow:${userId}`).emit('forecast:generated', {
      forecast,
      timestamp: new Date(),
      action: 'forecast_ready'
    });
  }

  /**
   * Broadcast anomaly detected
   */
  broadcastAnomalyDetected(anomaly, userId) {
    this.financeNS.to(`cashflow:${userId}`).emit('anomaly:detected', {
      anomaly,
      timestamp: new Date(),
      severity: anomaly.severity,
      action: 'anomaly_alert'
    });
  }

  /**
   * Broadcast risk matrix updated
   */
  broadcastRiskMatrixUpdated(riskData, userId) {
    this.financeNS.to(`risks:${userId}`).emit('risk:matrix_updated', {
      riskData,
      timestamp: new Date(),
      action: 'matrix_refresh'
    });
  }
}

/**
 * Intelligent Alerts System
 * Generates contextual alerts for financial events
 */
class FinanceAlertEngine {
  /**
   * Generate alerts based on business rules
   */
  static generateAlerts(financialData) {
    const alerts = [];

    // Check liquidity
    if (financialData.adequacyRatio < 0.8) {
      alerts.push({
        type: 'liquidity_warning',
        severity: 'high',
        message: 'Liquidity below 80% target',
        recommendation: 'Increase reserves immediately',
        action: 'reserve_adjustment'
      });
    }

    // Check compliance violations
    if (financialData.violationCount > 10) {
      alerts.push({
        type: 'compliance_threshold',
        severity: 'medium',
        message: `${financialData.violationCount} outstanding violations`,
        recommendation: 'Schedule compliance review',
        action: 'compliance_review'
      });
    }

    // Check critical risks
    if (financialData.criticalRisks > 0) {
      alerts.push({
        type: 'critical_risk',
        severity: 'critical',
        message: `${financialData.criticalRisks} critical risks identified`,
        recommendation: 'Activate risk mitigation plan',
        action: 'risk_mitigation'
      });
    }

    // Check forecast confidence
    if (financialData.forecastConfidence < 0.7) {
      alerts.push({
        type: 'low_forecast_confidence',
        severity: 'low',
        message: 'Forecast confidence below 70%',
        recommendation: 'Use forecasts with caution',
        action: 'manual_review'
      });
    }

    return alerts;
  }
}

/**
 * Export functions for external use
 */
module.exports = {
  MLCashFlowForecaster,
  AnomalyDetector,
  FinanceRealtimeManager,
  FinanceAlertEngine
};

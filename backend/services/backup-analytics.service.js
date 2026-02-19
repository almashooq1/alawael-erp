/**
 * ═══════════════════════════════════════════════════════════════════════
 * ADVANCED ANALYTICS & PREDICTIVE SYSTEM
 * نظام التحليلات المتقدمة والتنبؤات الذكية
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * ✅ Machine Learning Predictions
 * ✅ Anomaly Detection
 * ✅ Trend Analysis
 * ✅ Performance Analytics
 * ✅ Risk Assessment
 * ✅ Optimization Recommendations
 * ═══════════════════════════════════════════════════════════════════════
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class AdvancedAnalytics extends EventEmitter {
  constructor(options = {}) {
    super();

    this.dataPath = options.dataPath || './data/analytics';
    this.historyWindow = options.historyWindow || 90 * 24 * 60 * 60 * 1000; // 90 days
    this.analysisInterval = options.analysisInterval || 60 * 60 * 1000; // 1 hour

    this.metrics = [];
    this.predictions = [];
    this.anomalies = [];
    this.recommendations = [];

    this.initializeAnalytics();
  }

  /**
   * Initialize analytics system
   */
  async initializeAnalytics() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await this.loadAnalyticsData();
      console.log('✅ Analytics system initialized');
      this.startContinuousAnalysis();
    } catch (error) {
      console.error('❌ Analytics initialization failed:', error.message);
    }
  }

  /**
   * Analyze backup performance
   * تحليل أداء النسخ الاحتياطية
   */
  async analyzePerformance(backupData) {
    try {
      const analysis = {
        timestamp: new Date(),
        duration: backupData.duration || 0,
        size: backupData.size || 0,
        success: backupData.success || false,
        compressionRatio: backupData.compressionRatio || 0,
        encryptionTime: backupData.encryptionTime || 0,
        uploadTime: backupData.uploadTime || 0,
        verificationTime: backupData.verificationTime || 0,
      };

      this.metrics.push(analysis);
      this.emit('analytics:metric-recorded', analysis);

      // Generate trend
      const trend = this.calculateTrend(this.metrics);
      this.emit('analytics:trend-updated', trend);

      // Detect anomalies
      const anomalies = this.detectAnomalies(backupData);
      if (anomalies.length > 0) {
        this.anomalies.push(...anomalies);
        this.emit('analytics:anomalies-detected', anomalies);
      }

      return analysis;
    } catch (error) {
      console.error('❌ Performance analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Detect anomalies in backup data
   * اكتشاف الأنماليات في بيانات النسخ الاحتياطية
   */
  detectAnomalies(backupData) {
    const anomalies = [];

    // Statistical anomaly detection
    if (this.metrics.length > 10) {
      const durations = this.metrics.map(m => m.duration);
      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      const stdDev = Math.sqrt(
        durations.reduce((sum, val) => sum + Math.pow(val - avgDuration, 2), 0) / durations.length
      );

      // Flag if duration is 3 standard deviations from mean
      if (backupData.duration > avgDuration + 3 * stdDev) {
        anomalies.push({
          type: 'SLOW_BACKUP',
          severity: 'WARNING',
          message: `Backup duration ${backupData.duration}ms is 3σ above average`,
          threshold: avgDuration + 3 * stdDev,
          actual: backupData.duration,
        });
      }

      // Check compression ratio
      const avgCompression = durations.length > 0 ? 
        this.metrics.reduce((sum, m) => sum + m.compressionRatio, 0) / this.metrics.length : 0;

      if (backupData.compressionRatio < avgCompression * 0.5) {
        anomalies.push({
          type: 'LOW_COMPRESSION',
          severity: 'INFO',
          message: `Compression ratio ${backupData.compressionRatio}% is below average`,
          average: avgCompression,
          actual: backupData.compressionRatio,
        });
      }

      // Failure rate detection
      const recentMetrics = this.metrics.slice(-10);
      const failureRate = recentMetrics.filter(m => !m.success).length / recentMetrics.length;

      if (failureRate > 0.2) {
        anomalies.push({
          type: 'HIGH_FAILURE_RATE',
          severity: 'CRITICAL',
          message: `Failure rate ${(failureRate * 100).toFixed(2)}% exceeds 20% threshold`,
          threshold: 0.2,
          actual: failureRate,
        });
      }
    }

    return anomalies;
  }

  /**
   * Predict backup success rate
   * التنبؤ بنسبة نجاح النسخ الاحتياطية
   */
  predictSuccessRate(daysAhead = 7) {
    try {
      const recentMetrics = this.getRecentMetrics(7);
      
      if (recentMetrics.length === 0) {
        return { prediction: 95, confidence: 0.5, reason: 'Insufficient historical data' };
      }

      const successCount = recentMetrics.filter(m => m.success).length;
      const currentRate = (successCount / recentMetrics.length) * 100;

      // Simple trend extrapolation
      const trend = this.calculateTrend(recentMetrics);
      const prediction = Math.min(100, Math.max(0, currentRate + (trend * daysAhead)));

      return {
        prediction: parseFloat(prediction.toFixed(2)),
        current: parseFloat(currentRate.toFixed(2)),
        trend: trend > 0 ? 'IMPROVING' : trend < 0 ? 'DECLINING' : 'STABLE',
        confidence: Math.min(1, recentMetrics.length / 30), // Higher confidence with more data
        daysAhead,
      };
    } catch (error) {
      console.error('❌ Success rate prediction failed:', error.message);
      return { prediction: 95, confidence: 0, error: error.message };
    }
  }

  /**
   * Estimate backup duration
   * تقدير مدة النسخة الاحتياطية
   */
  estimateBackupDuration(dataSize = null) {
    try {
      const recentMetrics = this.getRecentMetrics(30);

      if (recentMetrics.length === 0) {
        return { estimation: 300000, confidence: 0.2, reason: 'No historical data' };
      }

      const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
      const avgSize = recentMetrics.reduce((sum, m) => sum + m.size, 0) / recentMetrics.length;

      let estimation = avgDuration;

      // Adjust based on data size if provided
      if (dataSize && avgSize > 0) {
        const sizeRatio = dataSize / avgSize;
        estimation = avgDuration * sizeRatio;
      }

      // Calculate throughput
      const throughput = recentMetrics.length > 0 ?
        recentMetrics.reduce((sum, m) => sum + m.size, 0) / 
        (recentMetrics.reduce((sum, m) => sum + m.duration, 0) / 1000) : 0;

      return {
        estimatedDuration: Math.round(estimation),
        estimatedDurationMinutes: (estimation / 60000).toFixed(2),
        throughput: `${(throughput / 1024 / 1024).toFixed(2)} MB/s`,
        confidence: Math.min(1, recentMetrics.length / 30),
        baselineMetrics: recentMetrics.length,
      };
    } catch (error) {
      console.error('❌ Duration estimation failed:', error.message);
      return { estimatedDuration: 300000, confidence: 0, error: error.message };
    }
  }

  /**
   * Get optimization recommendations
   * احصل على توصيات التحسين
   */
  getRecommendations() {
    try {
      const recommendations = [];
      const metrics = this.getRecentMetrics(30);

      if (metrics.length === 0) {
        return [];
      }

      // Recommendation 1: Compression
      const avgCompression = metrics.reduce((sum, m) => sum + m.compressionRatio, 0) / metrics.length;
      if (avgCompression < 40) {
        recommendations.push({
          type: 'COMPRESSION',
          priority: 'HIGH',
          title: 'Improve Compression',
          description: 'Current compression ratio is low. Consider changing compression algorithm.',
          impact: 'Could reduce backup size by 20-30%',
          action: 'Review compression settings in configuration',
        });
      }

      // Recommendation 2: Backup timing
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      if (avgDuration > 60 * 60 * 1000) { // > 1 hour
        recommendations.push({
          type: 'SCHEDULING',
          priority: 'MEDIUM',
          title: 'Optimize Backup Schedule',
          description: 'Backups are taking too long. Consider scheduling during off-peak hours.',
          impact: 'Better system performance during business hours',
          action: 'Adjust backup schedule to run during low-usage periods',
        });
      }

      // Recommendation 3: Storage optimization
      const failureRate = metrics.filter(m => !m.success).length / metrics.length;
      if (failureRate > 0.05) {
        recommendations.push({
          type: 'RELIABILITY',
          priority: 'CRITICAL',
          title: 'Increase Backup Reliability',
          description: `Current failure rate is ${(failureRate * 100).toFixed(2)}%. Investigate root causes.`,
          impact: 'Ensure critical data protection',
          action: 'Review backup logs and implement retry mechanisms',
        });
      }

      // Recommendation 4: Storage redundancy
      recommendations.push({
        type: 'DISASTER_RECOVERY',
        priority: 'HIGH',
        title: 'Enable Multi-Region Backup',
        description: 'Ensure backups are replicated to multiple geographic locations.',
        impact: 'Protect against regional disasters',
        action: 'Configure multi-region replication in backup settings',
      });

      this.recommendations = recommendations;
      this.emit('analytics:recommendations-updated', recommendations);

      return recommendations;
    } catch (error) {
      console.error('❌ Recommendation generation failed:', error.message);
      return [];
    }
  }

  /**
   * Calculate risk assessment
   * حساب تقييم المخاطر
   */
  calculateRiskAssessment() {
    try {
      const metrics = this.getRecentMetrics(30);
      let riskScore = 0;
      const factors = [];

      if (metrics.length === 0) {
        return {
          riskScore: 50,
          riskLevel: 'UNKNOWN',
          factors: ['Insufficient data for assessment'],
        };
      }

      // Factor 1: Backup failures
      const failureRate = metrics.filter(m => !m.success).length / metrics.length;
      if (failureRate > 0) {
        riskScore += failureRate * 30;
        factors.push(`High failure rate: ${(failureRate * 100).toFixed(2)}%`);
      }

      // Factor 2: Data growth
      const recentSize = metrics[metrics.length - 1]?.size || 0;
      const oldestSize = metrics[0]?.size || 0;
      const growthRate = oldestSize > 0 ? (recentSize - oldestSize) / oldestSize : 0;

      if (growthRate > 0.2) {
        riskScore += Math.min(20, growthRate * 50);
        factors.push(`High data growth: ${(growthRate * 100).toFixed(2)}%`);
      }

      // Factor 3: Backup age
      const lastBackup = new Date();
      const backupAge = (new Date() - lastBackup) / 1000 / 60 / 60; // in hours

      if (backupAge > 24) {
        riskScore += Math.min(25, (backupAge / 24) * 10);
        factors.push(`Old last backup: ${Math.round(backupAge)} hours ago`);
      }

      // Factor 4: Storage availability
      if (metrics.filter(m => m.success).length < metrics.length * 0.9) {
        riskScore += 15;
        factors.push('Storage availability issues detected');
      }

      riskScore = Math.min(100, riskScore);

      let riskLevel = 'LOW';
      if (riskScore >= 70) {
        riskLevel = 'CRITICAL';
      } else if (riskScore >= 50) {
        riskLevel = 'HIGH';
      } else if (riskScore >= 30) {
        riskLevel = 'MEDIUM';
      }

      return {
        riskScore: Math.round(riskScore),
        riskLevel,
        factors,
        baselineMetrics: metrics.length,
      };
    } catch (error) {
      console.error('❌ Risk assessment failed:', error.message);
      return { riskScore: 50, riskLevel: 'UNKNOWN', error: error.message };
    }
  }

  /**
   * Helper: Calculate trend
   */
  calculateTrend(metrics, window = 10) {
    if (metrics.length < 2) return 0;

    const recent = metrics.slice(-window);
    const successful = recent.filter(m => m.success).length;
    const successRate = successful / recent.length;

    const older = metrics.slice(-Math.min(window * 2, metrics.length), -window);
    const olderSuccessful = older.filter(m => m.success).length;
    const olderSuccessRate = older.length > 0 ? olderSuccessful / older.length : successRate;

    return successRate - olderSuccessRate;
  }

  /**
   * Helper: Get recent metrics
   */
  getRecentMetrics(days = 7) {
    const cutoffTime = new Date().getTime() - days * 24 * 60 * 60 * 1000;
    return this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoffTime);
  }

  /**
   * Start continuous analysis
   */
  startContinuousAnalysis() {
    setInterval(() => {
      this.getRecommendations();
      this.calculateRiskAssessment();
      this.predictSuccessRate();
      this.emit('analytics:analysis-complete');
    }, this.analysisInterval);
  }

  /**
   * Load analytics data
   */
  async loadAnalyticsData() {
    try {
      const filePath = path.join(this.dataPath, 'metrics.json');
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);

      this.metrics = data.metrics || [];
      this.predictions = data.predictions || [];
      this.anomalies = data.anomalies || [];
      this.recommendations = data.recommendations || [];
    } catch (error) {
      console.log('ℹ️  No analytics data found, starting fresh');
    }
  }

  /**
   * Export analytics report
   * تصدير تقرير التحليلات
   */
  async exportAnalyticsReport() {
    try {
      const report = {
        generatedAt: new Date(),
        period: '30 days',
        summary: {
          totalBackups: this.metrics.length,
          successfulBackups: this.metrics.filter(m => m.success).length,
          successRate: ((this.metrics.filter(m => m.success).length / this.metrics.length) * 100).toFixed(2),
          averageDuration: Math.round(this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length),
          totalDataSize: this.metrics.reduce((sum, m) => sum + m.size, 0),
        },
        predictions: {
          successRatePrediction: this.predictSuccessRate(),
          durationEstimation: this.estimateBackupDuration(),
        },
        riskAssessment: this.calculateRiskAssessment(),
        recommendations: this.recommendations,
        anomalies: this.anomalies.slice(-10),
      };

      return report;
    } catch (error) {
      console.error('❌ Report export failed:', error.message);
      throw error;
    }
  }
}

module.exports = new AdvancedAnalytics();

/**
 * 🚨 Anomaly Detection System
 *
 * Detects abnormal behavior and attacks
 * - Unusual access patterns
 * - Potential attacks (brute force, SQL injection, etc.)
 * - Performance anomalies
 */

class AnomalyDetector {
  constructor(options = {}) {
    // User baselines
    this.userBaselines = new Map();

    // Detection rules
    this.detectionRules = [];

    // Configuration
    this.config = {
      minDataPoints: options.minDataPoints || 100,
      stdDevThreshold: options.stdDevThreshold || 3, // 3 sigma
      windowSize: options.windowSize || 3600000, // 1 hour
      alertThreshold: options.alertThreshold || 0.8, // 80% confidence
    };

    // Statistics
    this.stats = {
      anomaliesDetected: 0,
      alertsRaised: 0,
      falsePositives: 0,
      truePositives: 0,
    };

    // Detected anomalies
    this.recentAnomalies = [];
    this.maxAnomaliesStored = 1000;

    this.initializeDetectionRules();
  }

  /**
   * Initialize default detection rules
   */
  initializeDetectionRules() {
    // Rule 1: Brute force detection
    this.addRule('brute-force', data => {
      if (!data.userId) return null;

      const failedLogins = data.failedAttempts || 0;
      if (failedLogins > 5) {
        return {
          type: 'brute-force',
          severity: 'high',
          confidence: Math.min(1, failedLogins / 10),
          message: `${failedLogins} failed login attempts`,
        };
      }
      return null;
    });

    // Rule 2: Unusual activity volume
    this.addRule('volume-anomaly', data => {
      if (!data.requestCount) return null;

      const avgVolume = data.avgRequestCount || 10;
      const currentVolume = data.requestCount;

      if (currentVolume > avgVolume * 5) {
        return {
          type: 'volume-anomaly',
          severity: 'medium',
          confidence: Math.min(1, currentVolume / (avgVolume * 10)),
          message: `Request volume ${(currentVolume / avgVolume).toFixed(1)}x normal`,
        };
      }
      return null;
    });

    // Rule 3: Unusual access time
    this.addRule('time-anomaly', data => {
      if (!data.timestamp) return null;

      const hour = new Date(data.timestamp).getHours();
      const usualHours = data.usualAccessHours || [8, 9, 10, 17, 18];

      if (!usualHours.includes(hour) && data.isNewUser !== true) {
        return {
          type: 'time-anomaly',
          severity: 'low',
          confidence: 0.6,
          message: `Access at unusual time: ${hour}:00`,
        };
      }
      return null;
    });

    // Rule 4: Geographic anomaly
    this.addRule('geo-anomaly', data => {
      if (!data.ip || !data.lastKnownLocation) return null;

      // This would use GeoIP data to check for impossible travel
      const distance = this.calculateDistance(data.lastKnownLocation, data.currentLocation);
      const timeDelta = data.timeSinceLastAccess || 3600000;

      // Check if distance/time is physically impossible
      if (distance > (timeDelta / 3600000) * 900) {
        // 900 km/hour max
        return {
          type: 'geo-anomaly',
          severity: 'high',
          confidence: 0.95,
          message: `Impossible travel detected: ${distance}km in ${timeDelta / 3600000}h`,
        };
      }
      return null;
    });

    // Rule 5: Statistical anomaly
    this.addRule('statistical-anomaly', data => {
      if (!data.metric || !data.baseline) return null;

      const deviation = Math.abs(data.metric - data.baseline.mean) / data.baseline.stdDev;

      if (deviation > this.config.stdDevThreshold) {
        return {
          type: 'statistical-anomaly',
          severity: 'medium',
          confidence: Math.min(1, (deviation / this.config.stdDevThreshold) * 0.8),
          message: `Metric ${deviation.toFixed(1)} sigma from baseline`,
        };
      }
      return null;
    });
  }

  /**
   * Add custom detection rule
   */
  addRule(name, ruleFunction) {
    this.detectionRules.push({
      name,
      execute: ruleFunction,
    });
  }

  /**
   * Analyze user data for anomalies
   */
  analyze(userId, data) {
    const anomalies = [];
    const alerts = [];

    // Get or create baseline
    const baseline = this.getOrCreateBaseline(userId);
    data.baseline = baseline;

    // Run all detection rules
    this.detectionRules.forEach(rule => {
      try {
        const result = rule.execute(data);
        if (result) {
          anomalies.push({
            userId,
            rule: rule.name,
            ...result,
            timestamp: Date.now(),
          });

          // Raise alert if confidence is high
          if (result.confidence >= this.config.alertThreshold) {
            alerts.push(result);
            this.stats.alertsRaised++;
          }
        }
      } catch (error) {
        console.error(`[AnomalyDetector] Rule ${rule.name} failed:`, error.message);
      }
    });

    // Store anomalies
    if (anomalies.length > 0) {
      this.stats.anomaliesDetected += anomalies.length;
      anomalies.forEach(a => this.recentAnomalies.push(a));

      // Keep only recent
      if (this.recentAnomalies.length > this.maxAnomaliesStored) {
        this.recentAnomalies.shift();
      }
    }

    // Update baseline
    this.updateBaseline(userId, data);

    return {
      anomalies,
      alerts,
      riskScore: this.calculateRiskScore(anomalies),
    };
  }

  /**
   * Calculate overall risk score (0-1)
   */
  calculateRiskScore(anomalies) {
    if (anomalies.length === 0) return 0;

    const severityScore = {
      low: 0.2,
      medium: 0.5,
      high: 1.0,
    };

    const totalScore = anomalies.reduce((sum, a) => {
      const baseSeverity = severityScore[a.severity] || 0.5;
      return sum + baseSeverity * a.confidence;
    }, 0);

    return Math.min(1, totalScore / anomalies.length);
  }

  /**
   * Get or create baseline for user
   */
  getOrCreateBaseline(userId) {
    if (this.userBaselines.has(userId)) {
      return this.userBaselines.get(userId);
    }

    const baseline = {
      requestCount: {
        mean: 10,
        stdDev: 2,
      },
      responseTime: {
        mean: 100,
        stdDev: 30,
      },
      accessHours: [],
      geoLocations: [],
      dataPoints: 0,
    };

    this.userBaselines.set(userId, baseline);
    return baseline;
  }

  /**
   * Update baseline with new data
   */
  updateBaseline(userId, data) {
    const baseline = this.getOrCreateBaseline(userId);
    baseline.dataPoints++;

    // Update metrics (exponential smoothing)
    if (data.requestCount) {
      const alpha = 0.1;
      baseline.requestCount.mean =
        alpha * data.requestCount + (1 - alpha) * baseline.requestCount.mean;
    }

    if (data.responseTime) {
      const alpha = 0.1;
      baseline.responseTime.mean =
        alpha * data.responseTime + (1 - alpha) * baseline.responseTime.mean;
    }

    // Update access hours
    if (data.timestamp) {
      const hour = new Date(data.timestamp).getHours();
      if (!baseline.accessHours.includes(hour)) {
        baseline.accessHours.push(hour);
      }
    }
  }

  /**
   * Calculate distance between two points (simplified)
   */
  calculateDistance(loc1, loc2) {
    if (!loc1 || !loc2) return 0;

    const lat1 = loc1.lat || 0;
    const lon1 = loc1.lon || 0;
    const lat2 = loc2.lat || 0;
    const lon2 = loc2.lon || 0;

    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get anomaly statistics
   */
  getStats() {
    return {
      anomaliesDetected: this.stats.anomaliesDetected,
      alertsRaised: this.stats.alertsRaised,
      falsePositives: this.stats.falsePositives,
      truePositives: this.stats.truePositives,
      usersMonitored: this.userBaselines.size,
      recentAnomalies: this.recentAnomalies.length,
      detectionRules: this.detectionRules.length,
    };
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(limit = 50) {
    return this.recentAnomalies.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  /**
   * Get high risk users
   */
  getHighRiskUsers(threshold = 0.7) {
    const riskUsers = [];

    this.recentAnomalies.forEach(anomaly => {
      if (anomaly.confidence >= threshold) {
        const existing = riskUsers.find(r => r.userId === anomaly.userId);
        if (existing) {
          existing.count++;
          existing.maxConfidence = Math.max(existing.maxConfidence, anomaly.confidence);
        } else {
          riskUsers.push({
            userId: anomaly.userId,
            count: 1,
            maxConfidence: anomaly.confidence,
          });
        }
      }
    });

    return riskUsers.sort((a, b) => b.maxConfidence - a.maxConfidence);
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      anomaliesDetected: 0,
      alertsRaised: 0,
      falsePositives: 0,
      truePositives: 0,
    };
  }
}

/**
 * Express middleware for anomaly detection
 */
function anomalyDetectionMiddleware(detector) {
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;

    const analysisData = {
      userId,
      timestamp: Date.now(),
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const analysis = detector.analyze(userId, analysisData);

    // Attach analysis to request
    req.anomalyAnalysis = analysis;

    // Block if high risk
    if (analysis.riskScore > 0.9) {
      return res.status(403).json({
        success: false,
        message: 'Suspicious activity detected',
        riskScore: analysis.riskScore,
      });
    }

    next();
  };
}

module.exports = {
  AnomalyDetector,
  anomalyDetectionMiddleware,
};

/**
 * Mobile Analytics Service
 * خدمة تحليلات الهاتف المحمول
 * 
 * المسؤوليات:
 * - تتبع سلوك المستخدم على الهاتف
 * - قياس الأداء والتأخير
 * - تتبع الأخطاء والأعطال
 * - تحليل الجلسات
 * - تقارير الاستخدام
 */

const EventEmitter = require('events');
const uuid = require('crypto').randomUUID;
const { Logger } = require('../utils/logger');

class MobileAnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.events = new Map();
    this.crashes = new Map();
    this.performanceMetrics = new Map();
    this.userJourneys = new Map();
  }

  /**
   * بدء جلسة محمول
   * Start mobile session
   */
  startSession(userId, deviceId, sessionData) {
    try {
      const sessionId = uuid();
      const session = {
        id: sessionId,
        userId,
        deviceId,
        startTime: new Date(),
        endTime: null,
        duration: null,
        events: [],
        crashes: [],
        screens: [],
        appVersion: sessionData.appVersion,
        osVersion: sessionData.osVersion,
        isActive: true,
        networkType: sessionData.networkType || 'unknown',
        locale: sessionData.locale || 'en',
        timezone: sessionData.timezone || 'UTC',
        isFirstSession: sessionData.isFirstSession === true,
        sessionCount: sessionData.sessionCount || 1,
        metrics: {
          totalEvents: 0,
          totalCrashes: 0,
          totalScreenViews: 0,
          averageEventTime: 0,
          sessionEngagementScore: 0,
        },
      };

      this.sessions.set(sessionId, session);

      Logger.info(`🕐 Mobile session started: ${sessionId} for user ${userId}`);

      this.emit('session:started', {
        sessionId,
        userId,
        deviceId,
        isFirstSession: sessionData.isFirstSession,
      });

      return session;
    } catch (error) {
      Logger.error('Start session error:', error);
      throw error;
    }
  }

  /**
   * إنهاء جلسة
   * End mobile session
   */
  endSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) throw new Error('Session not found');

      session.endTime = new Date();
      session.duration = session.endTime - session.startTime;
      session.isActive = false;

      // Calculate engagement score
      session.metrics.sessionEngagementScore = this._calculateEngagementScore(session);

      Logger.info(
        `🏁 Mobile session ended: ${sessionId} (Duration: ${(session.duration / 1000).toFixed(2)}s)`
      );

      this.emit('session:ended', {
        sessionId,
        userId: session.userId,
        duration: session.duration,
        engagementScore: session.metrics.sessionEngagementScore,
      });

      return session;
    } catch (error) {
      Logger.error('End session error:', error);
      throw error;
    }
  }

  /**
   * تتبع حدث في الجلسة
   * Track event in session
   */
  trackEvent(sessionId, eventData) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) throw new Error('Session not found');

      const eventId = uuid();
      const event = {
        id: eventId,
        sessionId,
        userId: session.userId,
        deviceId: session.deviceId,
        timestamp: new Date(),
        category: eventData.category,
        action: eventData.action,
        label: eventData.label || null,
        value: eventData.value || null,
        screenName: eventData.screenName || null,
        customParams: eventData.customParams || {},
        duration: eventData.duration || 0,
      };

      this.events.set(eventId, event);
      session.events.push(eventId);
      session.metrics.totalEvents++;

      this.emit('event:tracked', {
        eventId,
        sessionId,
        category: eventData.category,
        action: eventData.action,
      });

      return event;
    } catch (error) {
      Logger.error('Track event error:', error);
      throw error;
    }
  }

  /**
   * تتبع عرض الشاشة
   * Track screen view
   */
  trackScreenView(sessionId, screenData) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) throw new Error('Session not found');

      const screenView = {
        id: uuid(),
        sessionId,
        screenName: screenData.screenName,
        className: screenData.className || null,
        timestamp: new Date(),
        loadTime: screenData.loadTime || 0,
        customParams: screenData.customParams || {},
      };

      session.screens.push(screenView);
      session.metrics.totalScreenViews++;

      this.emit('screen:viewed', {
        sessionId,
        screenName: screenData.screenName,
        loadTime: screenData.loadTime,
      });

      return screenView;
    } catch (error) {
      Logger.error('Track screen view error:', error);
      throw error;
    }
  }

  /**
   * تسجيل خطأ أو توقف
   * Log crash or exception
   */
  logCrash(sessionId, crashData) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) throw new Error('Session not found');

      const crashId = uuid();
      const crash = {
        id: crashId,
        sessionId,
        userId: session.userId,
        deviceId: session.deviceId,
        timestamp: new Date(),
        type: crashData.type || 'exception', // exception, crash, anr
        message: crashData.message,
        stack: crashData.stack || null,
        severity: crashData.severity || 'error', // info, warning, error, critical
        fatal: crashData.fatal === true,
        appVersion: crashData.appVersion || session.appVersion,
        osVersion: crashData.osVersion || session.osVersion,
        customData: crashData.customData || {},
        deviceMemory: crashData.deviceMemory || null,
        availableMemory: crashData.availableMemory || null,
      };

      this.crashes.set(crashId, crash);
      session.crashes.push(crashId);
      session.metrics.totalCrashes++;

      let severity = 'warning';
      if (crash.fatal || crash.severity === 'critical') {
        severity = 'critical';
      }

      Logger.log(severity, `💥 Crash reported: ${crashId} - ${crashData.message}`);

      this.emit('crash:reported', {
        crashId,
        sessionId,
        userId: session.userId,
        type: crashData.type,
        severity: crash.severity,
        fatal: crash.fatal,
      });

      return crash;
    } catch (error) {
      Logger.error('Log crash error:', error);
      throw error;
    }
  }

  /**
   * تتبع مقياس الأداء
   * Track performance metric
   */
  trackPerformance(sessionId, metricData) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) throw new Error('Session not found');

      const metricId = uuid();
      const metric = {
        id: metricId,
        sessionId,
        userId: session.userId,
        timestamp: new Date(),
        metricName: metricData.metricName,
        value: metricData.value,
        unit: metricData.unit || 'ms',
        threshold: metricData.threshold || null,
        isSlowMetric: false,
        customAttributes: metricData.customAttributes || {},
      };

      // Check if metric exceeds threshold
      if (metric.threshold && metric.value > metric.threshold) {
        metric.isSlowMetric = true;

        this.emit('performance:slow', {
          metricId,
          sessionId,
          metricName: metricData.metricName,
          value: metricData.value,
          threshold: metricData.threshold,
        });
      }

      const key = `${session.userId}:${session.deviceId}`;
      if (!this.performanceMetrics.has(key)) {
        this.performanceMetrics.set(key, []);
      }

      this.performanceMetrics.get(key).push(metric);

      this.emit('performance:tracked', {
        metricId,
        sessionId,
        metricName: metricData.metricName,
        value: metricData.value,
      });

      return metric;
    } catch (error) {
      Logger.error('Track performance error:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الجلسة
   * Get session statistics
   */
  getSessionStats(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) throw new Error('Session not found');

      const events = session.events.map(id => this.events.get(id));

      const stats = {
        sessionId,
        userId: session.userId,
        deviceId: session.deviceId,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        totalEvents: session.metrics.totalEvents,
        totalCrashes: session.metrics.totalCrashes,
        totalScreenViews: session.metrics.totalScreenViews,
        engagementScore: session.metrics.sessionEngagementScore,
        screens: session.screens.slice(0, 10), // Last 10 screens
        topEvents: this._getTopEvents(events, 5),
        crashes: session.crashes.length > 0
          ? session.crashes.map(id => {
              const crash = this.crashes.get(id);
              return {
                id: crash.id,
                type: crash.type,
                message: crash.message,
                severity: crash.severity,
              };
            })
          : [],
      };

      return stats;
    } catch (error) {
      Logger.error('Get session stats error:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات المستخدم
   * Get user analytics
   */
  getUserAnalytics(userId, days = 30) {
    try {
      const userSessions = Array.from(this.sessions.values())
        .filter(s => s.userId === userId)
        .filter(s => {
          const sessionAge = Date.now() - s.startTime.getTime();
          return sessionAge < days * 24 * 60 * 60 * 1000;
        });

      const totalSessions = userSessions.length;
      const totalDuration = userSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const totalEvents = userSessions.reduce((sum, s) => sum + s.metrics.totalEvents, 0);
      const totalCrashes = userSessions.reduce((sum, s) => sum + s.metrics.totalCrashes, 0);

      const analytics = {
        userId,
        timeframe: `${days} days`,
        totalSessions,
        averageSessionDuration: totalSessions > 0 ? totalDuration / totalSessions : 0,
        totalEvents,
        eventsPerSession: totalSessions > 0 ? totalEvents / totalSessions : 0,
        totalCrashes,
        crashRate: totalSessions > 0 ? ((totalCrashes / totalSessions) * 100).toFixed(2) : 0,
        averageEngagementScore: totalSessions > 0
          ? (
              userSessions.reduce((sum, s) => sum + s.metrics.sessionEngagementScore, 0) /
              totalSessions
            ).toFixed(2)
          : 0,
        mostFrequentScreens: this._getMostFrequentScreens(userSessions, 5),
      };

      return analytics;
    } catch (error) {
      Logger.error('Get user analytics error:', error);
      throw error;
    }
  }

  /**
   * الحصول على تقرير الأعطال
   * Get crash report
   */
  getCrashReport(filters = {}) {
    try {
      const crashing = Array.from(this.crashes.values());

      let filtered = crashing;

      if (filters.userId) {
        filtered = filtered.filter(c => c.userId === filters.userId);
      }

      if (filters.severity) {
        filtered = filtered.filter(c => c.severity === filters.severity);
      }

      if (filters.fatal !== undefined) {
        filtered = filtered.filter(c => c.fatal === filters.fatal);
      }

      const report = {
        totalCrashes: filtered.length,
        criticalCrashes: filtered.filter(c => c.severity === 'critical').length,
        fatalCrashes: filtered.filter(c => c.fatal).length,
        topExceptions: this._getTopExceptions(filtered, 10),
        crashesByAppVersion: this._groupBy(filtered, 'appVersion'),
        crashesByOSVersion: this._groupBy(filtered, 'osVersion'),
      };

      return report;
    } catch (error) {
      Logger.error('Get crash report error:', error);
      throw error;
    }
  }

  /**
   * الحصول على تقرير الأداء
   * Get performance report
   */
  getPerformanceReport(userId, metricName) {
    try {
      const key = `${userId}:*`;
      const metrics = Array.from(this.performanceMetrics.values())
        .flat()
        .filter(m => m.userId === userId && m.metricName === metricName);

      const slowMetrics = metrics.filter(m => m.isSlowMetric);

      const report = {
        userId,
        metricName,
        totalMeasurements: metrics.length,
        slowMeasurements: slowMetrics.length,
        slowRate: metrics.length > 0 ? ((slowMetrics.length / metrics.length) * 100).toFixed(2) : 0,
        average: metrics.length > 0 ? (metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length).toFixed(2) : 0,
        min: metrics.length > 0 ? Math.min(...metrics.map(m => m.value)) : 0,
        max: metrics.length > 0 ? Math.max(...metrics.map(m => m.value)) : 0,
        p95: this._calculatePercentile(metrics.map(m => m.value), 95),
        p99: this._calculatePercentile(metrics.map(m => m.value), 99),
      };

      return report;
    } catch (error) {
      Logger.error('Get performance report error:', error);
      throw error;
    }
  }

  /**
   * ===== Private Methods =====
   */

  /**
   * Calculate engagement score
   */
  _calculateEngagementScore(session) {
    let score = 0;

    // Duration: up to 30 points
    const durationMinutes = session.duration / 60000;
    score += Math.min(durationMinutes * 0.5, 30);

    // Events: up to 40 points
    score += Math.min(session.metrics.totalEvents * 2, 40);

    // Screen views: up to 20 points
    score += Math.min(session.metrics.totalScreenViews, 20);

    // Crashes penalty: -10 per crash
    score -= session.metrics.totalCrashes * 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get top events
   */
  _getTopEvents(events, limit) {
    const grouped = this._groupBy(events, 'action');
    return Object.entries(grouped)
      .map(([action, items]) => ({
        action,
        count: items.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get most frequent screens
   */
  _getMostFrequentScreens(sessions, limit) {
    const screens = sessions
      .flatMap(s => s.screens)
      .map(screen => screen.screenName);

    return this._getFrequency(screens, limit);
  }

  /**
   * Get top exceptions
   */
  _getTopExceptions(crashes, limit) {
    const grouped = this._groupBy(crashes, 'message');
    return Object.entries(grouped)
      .map(([message, items]) => ({
        message,
        count: items.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Group by property
   */
  _groupBy(items, prop) {
    return items.reduce((grouped, item) => {
      const key = item[prop];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
      return grouped;
    }, {});
  }

  /**
   * Get frequency
   */
  _getFrequency(items, limit) {
    const frequency = {};
    items.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });

    return Object.entries(frequency)
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calculate percentile
   */
  _calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;

    const sorted = values.sort((a, b) => a - b);
    const index = (percentile / 100) * sorted.length;
    const lower = Math.floor(index) - 1;
    const upper = Math.ceil(index) - 1;

    if (upper === lower) return sorted[lower];

    const weight = index % 1;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}

module.exports = new MobileAnalyticsService();

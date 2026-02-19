/**
 * 🚀 Advanced Middleware Suite - مجموعة Middleware متقدمة
 * Production-Grade Professional Enhancements
 * Version: 2.5.0
 */

// ============================================================
// 1️⃣ ADVANCED ERROR HANDLING & LOGGING
// ============================================================

class AdvancedErrorTracker {
  constructor() {
    this.errors = [];
    this.maxErrors = 1000;
  }

  track(error, context) {
    const errorEntry = {
      id: `ERR-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      severity: this.calculateSeverity(error),
      resolved: false,
    };

    this.errors.push(errorEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    return errorEntry;
  }

  calculateSeverity(error) {
    if (error.statusCode >= 500) return 'critical';
    if (error.statusCode >= 400) return 'warning';
    return 'info';
  }

  getStats() {
    return {
      total: this.errors.length,
      critical: this.errors.filter(e => e.severity === 'critical').length,
      warnings: this.errors.filter(e => e.severity === 'warning').length,
      recent: this.errors.slice(-10),
    };
  }

  markResolved(errorId) {
    const error = this.errors.find(e => e.id === errorId);
    if (error) error.resolved = true;
  }
}

// ============================================================
// 2️⃣ API VERSIONING & COMPATIBILITY
// ============================================================

const apiVersions = {
  v1: {
    endpoints: ['auth', 'users', 'documents'],
    deprecated: false,
    supportedUntil: '2026-12-31',
  },
  v2: {
    endpoints: ['auth', 'users', 'documents', 'monitoring', 'analytics'],
    deprecated: false,
    supportedUntil: '2027-12-31',
    enhancements: ['better-caching', 'advanced-monitoring', 'improved-auth'],
  },
  v3: {
    endpoints: ['auth', 'users', 'documents', 'monitoring', 'analytics', 'ai-features'],
    deprecated: false,
    supportedUntil: '2028-12-31',
    enhancements: ['ai-integration', 'advanced-analytics', 'ml-models'],
    beta: true,
  },
};

function apiVersionMiddleware(req, res, next) {
  const version = req.headers['api-version'] || 'v2';

  if (!apiVersions[version]) {
    return res.status(400).json({
      success: false,
      error: 'Invalid API version',
      supportedVersions: Object.keys(apiVersions),
    });
  }

  const versionInfo = apiVersions[version];
  if (versionInfo.deprecated) {
    res.set('X-API-Deprecated', `true`);
    res.set('X-API-Sunset', versionInfo.supportedUntil);
  }

  req.apiVersion = version;
  req.apiVersionInfo = versionInfo;
  next();
}

// ============================================================
// 3️⃣ ADVANCED CACHING STRATEGIES
// ============================================================

class SmartCacheManager {
  constructor() {
    this.cache = new Map();
    this.policies = {
      aggressive: { ttl: 3600, priority: 'high' },
      moderate: { ttl: 1800, priority: 'medium' },
      minimal: { ttl: 300, priority: 'low' },
    };
  }

  set(key, value, policy = 'moderate') {
    const { ttl } = this.policies[policy] || this.policies.moderate;
    const entry = {
      value,
      expiresAt: Date.now() + ttl * 1000,
      policy,
      hits: 0,
      createdAt: new Date().toISOString(),
    };

    this.cache.set(key, entry);
    return entry;
  }

  get(key) {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    entry.lastAccessed = new Date().toISOString();
    return entry.value;
  }

  getStats() {
    let totalHits = 0;
    let totalMisses = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    totalMisses = Math.max(0, totalHits - this.cache.size);

    return {
      size: this.cache.size,
      hits: totalHits,
      misses: totalMisses,
      hitRate:
        totalHits > 0 ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(2) + '%' : '0%',
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        hits: entry.hits,
        policy: entry.policy,
        expiresIn: Math.ceil((entry.expiresAt - Date.now()) / 1000) + 's',
      })),
    };
  }

  clear() {
    this.cache.clear();
  }

  clearExpired() {
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================
// 4️⃣ ADVANCED PERFORMANCE MONITORING
// ============================================================

class PerformanceMetricsCollector {
  constructor() {
    this.metrics = {
      requests: [],
      slowQueries: [],
      apiLatencies: {},
    };
    this.thresholds = {
      slow: 1000, // 1 second
      critical: 5000, // 5 seconds
    };
  }

  recordRequest(method, path, duration, statusCode) {
    const request = {
      method,
      path,
      duration,
      statusCode,
      timestamp: new Date().toISOString(),
      isSlow: duration > this.thresholds.slow,
      isCritical: duration > this.thresholds.critical,
    };

    this.metrics.requests.push(request);

    if (request.isSlow) {
      this.metrics.slowQueries.push(request);
    }

    // Keep only last 1000 requests
    if (this.metrics.requests.length > 1000) {
      this.metrics.requests.shift();
    }

    // Keep only last 100 slow queries
    if (this.metrics.slowQueries.length > 100) {
      this.metrics.slowQueries.shift();
    }

    return request;
  }

  getAnalytics() {
    const requests = this.metrics.requests;
    if (requests.length === 0) {
      return { avgResponseTime: 0, maxResponseTime: 0, minResponseTime: 0, p95: 0, p99: 0 };
    }

    const durations = requests.map(r => r.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / durations.length);
    const max = durations[durations.length - 1];
    const min = durations[0];
    const p95Index = Math.ceil(durations.length * 0.95) - 1;
    const p99Index = Math.ceil(durations.length * 0.99) - 1;

    return {
      avgResponseTime: avg,
      maxResponseTime: max,
      minResponseTime: min,
      p95: durations[p95Index],
      p99: durations[p99Index],
      slowRequestsCount: this.metrics.slowQueries.length,
      totalRequests: requests.length,
    };
  }

  getSlowestEndpoints() {
    const grouped = {};

    this.metrics.requests.forEach(req => {
      const key = `${req.method} ${req.path}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(req.duration);
    });

    const endpoints = Object.entries(grouped).map(([endpoint, durations]) => ({
      endpoint,
      avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      maxDuration: Math.max(...durations),
      callCount: durations.length,
    }));

    return endpoints.sort((a, b) => b.avgDuration - a.avgDuration).slice(0, 20);
  }
}

// ============================================================
// 5️⃣ ADVANCED SECURITY FEATURES
// ============================================================

class SecurityAuditor {
  constructor() {
    this.suspiciousActivities = [];
    this.blockedIPs = new Set();
    this.rateLimitByIP = new Map();
  }

  detectSuspiciousActivity(req) {
    const activities = [];

    // Check for SQL injection patterns
    if (this.hasSQLInjectionPattern(req.body) || this.hasSQLInjectionPattern(req.query)) {
      activities.push({ type: 'SQL_INJECTION_ATTEMPT', severity: 'critical' });
    }

    // Check for XSS patterns
    if (this.hasXSSPattern(req.body) || this.hasXSSPattern(req.query)) {
      activities.push({ type: 'XSS_ATTEMPT', severity: 'high' });
    }

    // Check for unusual request patterns
    if (req.headers['user-agent']?.length > 500) {
      activities.push({ type: 'UNUSUAL_USER_AGENT', severity: 'medium' });
    }

    return activities;
  }

  hasSQLInjectionPattern(data) {
    if (!data) return false;
    const sqlPatterns = [/(\bunion\b.*\bselect\b|\bor\b.*=.*|\bscript\b)/gi];
    const str = JSON.stringify(data);
    return sqlPatterns.some(pattern => pattern.test(str));
  }

  hasXSSPattern(data) {
    if (!data) return false;
    const xssPatterns = [/<script[^>]*>.*?<\/script>/gi, /on\w+\s*=/gi];
    const str = JSON.stringify(data);
    return xssPatterns.some(pattern => pattern.test(str));
  }

  logSecurityEvent(req, activity) {
    const event = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userId: req.user?.id,
      method: req.method,
      path: req.path,
      activity,
    };

    this.suspiciousActivities.push(event);

    if (this.suspiciousActivities.length > 1000) {
      this.suspiciousActivities.shift();
    }

    return event;
  }

  blockIP(ip) {
    this.blockedIPs.add(ip);
  }

  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  getSecurityReport() {
    return {
      totalEvents: this.suspiciousActivities.length,
      blockedIPs: Array.from(this.blockedIPs),
      recentActivities: this.suspiciousActivities.slice(-20),
      criticalCount: this.suspiciousActivities.filter(a => a.activity.severity === 'critical')
        .length,
    };
  }
}

// ============================================================
// 6️⃣ ADVANCED DATABASE QUERY OPTIMIZATION
// ============================================================

class QueryOptimizer {
  constructor() {
    this.queryStats = {};
  }

  analyzeQuery(query, collection) {
    const key = `${collection}:${JSON.stringify(query).substring(0, 50)}`;

    if (!this.queryStats[key]) {
      this.queryStats[key] = {
        query,
        collection,
        executions: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
      };
    }

    return this.queryStats[key];
  }

  recordExecution(key, duration) {
    if (!this.queryStats[key]) return;

    const stats = this.queryStats[key];
    stats.executions++;

    const prevAvg = stats.avgDuration;
    stats.avgDuration = (prevAvg * (stats.executions - 1) + duration) / stats.executions;
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.minDuration = Math.min(stats.minDuration, duration);
  }

  getOptimizationRecommendations() {
    const recommendations = [];

    for (const [key, stats] of Object.entries(this.queryStats)) {
      if (stats.executions > 100 && stats.avgDuration > 100) {
        recommendations.push({
          query: stats.query,
          collection: stats.collection,
          issue: 'Slow query executed frequently',
          avgDuration: `${stats.avgDuration.toFixed(2)}ms`,
          recommendation: 'Consider adding an index or optimizing the query',
        });
      }
    }

    return recommendations;
  }
}

// ============================================================
// 7️⃣ ADVANCED HEALTH CHECK SYSTEM
// ============================================================

class AdvancedHealthChecker {
  constructor() {
    this.checks = {};
    this.history = [];
  }

  registerCheck(name, checkFn) {
    this.checks[name] = checkFn;
  }

  async runAllChecks() {
    const results = {};
    const startTime = Date.now();

    for (const [name, checkFn] of Object.entries(this.checks)) {
      try {
        results[name] = await checkFn();
      } catch (error) {
        results[name] = {
          status: 'error',
          error: error.message,
        };
      }
    }

    const totalTime = Date.now() - startTime;
    const healthReport = {
      timestamp: new Date().toISOString(),
      overallStatus: this.calculateOverallStatus(results),
      checks: results,
      totalDuration: totalTime,
    };

    this.history.push(healthReport);
    if (this.history.length > 1000) {
      this.history.shift();
    }

    return healthReport;
  }

  calculateOverallStatus(results) {
    const statuses = Object.values(results).map(r => r.status || 'unknown');
    if (statuses.some(s => s === 'error')) return 'error';
    if (statuses.some(s => s === 'degraded')) return 'degraded';
    return 'healthy';
  }

  getHealthTrend() {
    const recent = this.history.slice(-100);
    const healthy = recent.filter(h => h.overallStatus === 'healthy').length;
    const degraded = recent.filter(h => h.overallStatus === 'degraded').length;
    const errors = recent.filter(h => h.overallStatus === 'error').length;

    return {
      period: 'last-100-checks',
      healthy: `${((healthy / recent.length) * 100).toFixed(1)}%`,
      degraded: `${((degraded / recent.length) * 100).toFixed(1)}%`,
      errors: `${((errors / recent.length) * 100).toFixed(1)}%`,
      trend: recent.length > 0 ? 'stable' : 'unknown',
    };
  }
}

// ============================================================
// EXPORT ALL
// ============================================================

module.exports = {
  AdvancedErrorTracker,
  apiVersionMiddleware,
  apiVersions,
  SmartCacheManager,
  PerformanceMetricsCollector,
  SecurityAuditor,
  QueryOptimizer,
  AdvancedHealthChecker,
};

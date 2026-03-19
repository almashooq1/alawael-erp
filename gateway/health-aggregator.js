/**
 * Professional Health Aggregator — مجمّع صحة الخدمات
 *
 * Checks health of all services and provides a unified health dashboard.
 * Used by the gateway and monitoring systems.
 *
 * @module gateway/health-aggregator
 */

const http = require('http');
const https = require('https');
const logger = require('./logger');

// ─── Service Definitions ─────────────────────────────────────────────────────
const DEFAULT_SERVICES = {
  backend: {
    name: 'Backend API',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    healthPath: '/health',
    critical: true,
  },
  gateway: {
    name: 'API Gateway',
    url: `http://localhost:${process.env.GATEWAY_PORT || 8080}`,
    healthPath: '/health',
    critical: true,
  },
  whatsapp: {
    name: 'WhatsApp Service',
    url: process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3010',
    healthPath: '/health',
    critical: false,
  },
  intelligentAgent: {
    name: 'Intelligent Agent',
    url: process.env.INTELLIGENT_AGENT_URL || 'http://localhost:3020',
    healthPath: '/health',
    critical: false,
  },
  finance: {
    name: 'Finance Module',
    url: process.env.FINANCE_SERVICE_URL || 'http://localhost:3030',
    healthPath: '/health',
    critical: false,
  },
  scm: {
    name: 'Supply Chain',
    url: process.env.SCM_SERVICE_URL || 'http://localhost:3040',
    healthPath: '/health',
    critical: false,
  },
};

// ─── Health Check Function ───────────────────────────────────────────────────

/**
 * Check health of a single service.
 * @returns {{ status, responseTime, details, error }}
 */
const checkServiceHealth = (serviceKey, service, timeoutMs = 5000) => {
  return new Promise(resolve => {
    const startTime = Date.now();
    const url = new URL(service.healthPath, service.url);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.get(url.href, { timeout: timeoutMs }, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        let parsedData = {};
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          /* ignore */
        }

        const isHealthy = res.statusCode >= 200 && res.statusCode < 300;
        resolve({
          key: serviceKey,
          name: service.name,
          status: isHealthy ? 'healthy' : 'degraded',
          statusCode: res.statusCode,
          responseTime,
          critical: service.critical,
          details: parsedData,
          url: service.url,
          lastChecked: new Date().toISOString(),
        });
      });
    });

    req.on('error', err => {
      resolve({
        key: serviceKey,
        name: service.name,
        status: 'down',
        statusCode: null,
        responseTime: Date.now() - startTime,
        critical: service.critical,
        details: null,
        error: err.message,
        url: service.url,
        lastChecked: new Date().toISOString(),
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        key: serviceKey,
        name: service.name,
        status: 'timeout',
        statusCode: null,
        responseTime: timeoutMs,
        critical: service.critical,
        details: null,
        error: `Timeout after ${timeoutMs}ms`,
        url: service.url,
        lastChecked: new Date().toISOString(),
      });
    });
  });
};

// ─── Aggregate Health Check ──────────────────────────────────────────────────

/**
 * Check health of all registered services.
 * @returns {{ overallStatus, services, uptime, timestamp, metrics }}
 */
const checkAllServices = async (services = DEFAULT_SERVICES) => {
  const startTime = Date.now();

  const results = await Promise.all(Object.entries(services).map(([key, svc]) => checkServiceHealth(key, svc)));

  const totalDuration = Date.now() - startTime;
  const serviceResults = {};
  results.forEach(r => {
    serviceResults[r.key] = r;
  });

  // Calculate overall status
  const criticalDown = results.filter(r => r.critical && r.status !== 'healthy');
  const anyDown = results.filter(r => r.status !== 'healthy');

  let overallStatus = 'healthy';
  if (criticalDown.length > 0) overallStatus = 'critical';
  else if (anyDown.length > 0) overallStatus = 'degraded';

  // Metrics
  const healthyCount = results.filter(r => r.status === 'healthy').length;
  const avgResponseTime = Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length);

  return {
    overallStatus,
    timestamp: new Date().toISOString(),
    checkDuration: totalDuration,
    uptime: process.uptime(),
    services: serviceResults,
    metrics: {
      total: results.length,
      healthy: healthyCount,
      degraded: results.filter(r => r.status === 'degraded').length,
      down: results.filter(r => r.status === 'down').length,
      timeout: results.filter(r => r.status === 'timeout').length,
      healthPercentage: Math.round((healthyCount / results.length) * 100),
      avgResponseTime,
    },
    summary: `${healthyCount}/${results.length} services healthy (${overallStatus})`,
  };
};

// ─── Express Routes ──────────────────────────────────────────────────────────

/**
 * Mount health aggregator routes on an Express app.
 */
const mountHealthRoutes = app => {
  // Quick health check
  app.get('/health/status', async (req, res) => {
    const health = await checkAllServices();
    const statusCode = health.overallStatus === 'healthy' ? 200 : health.overallStatus === 'degraded' ? 207 : 503;
    res.status(statusCode).json(health);
  });

  // Detailed service health
  app.get('/health/services', async (req, res) => {
    const health = await checkAllServices();
    res.json(health);
  });

  // Individual service health
  app.get('/health/services/:service', async (req, res) => {
    const { service } = req.params;
    const svc = DEFAULT_SERVICES[service];
    if (!svc) {
      return res.status(404).json({ error: 'Service not found', available: Object.keys(DEFAULT_SERVICES) });
    }
    const result = await checkServiceHealth(service, svc);
    res.json(result);
  });

  // Readiness probe (for Kubernetes)
  app.get('/health/ready', async (req, res) => {
    const health = await checkAllServices();
    const criticalDown = Object.values(health.services).filter(s => s.critical && s.status !== 'healthy');
    if (criticalDown.length > 0) {
      return res.status(503).json({ ready: false, criticalDown: criticalDown.map(s => s.name) });
    }
    res.json({ ready: true });
  });

  // Liveness probe
  app.get('/health/live', (req, res) => {
    res.json({ alive: true, uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  logger.info('[HealthAggregator] Routes mounted: /health/status, /health/services, /health/ready, /health/live');
};

module.exports = {
  checkServiceHealth,
  checkAllServices,
  mountHealthRoutes,
  DEFAULT_SERVICES,
};

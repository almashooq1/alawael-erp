/**
 * Professional Service Registry & Discovery — سجل الخدمات واكتشافها
 *
 * Features:
 *  - Dynamic service registration/deregistration
 *  - Health-based service discovery
 *  - Weighted load balancing
 *  - Service metadata & versioning
 *  - TTL-based auto-cleanup
 *
 * @module gateway/service-registry
 */

const logger = require('./logger');

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
    this.CHECK_INTERVAL_MS = 15_000; // 15 seconds
    this.TTL_MS = 60_000; // 60 seconds without heartbeat → mark unhealthy

    // Start health-check loop
    this._checkInterval = setInterval(() => this._runHealthChecks(), this.CHECK_INTERVAL_MS);
  }

  // ─── Registration ────────────────────────────────────────────────────────

  /**
   * Register a service instance.
   * @param {string} name - Service name (e.g., 'auth', 'hr')
   * @param {Object} instance - { url, version, weight, metadata }
   */
  register(name, { url, version = '1.0.0', weight = 1, metadata = {} }) {
    const id = `${name}:${url}`;
    const entry = {
      id,
      name,
      url,
      version,
      weight,
      metadata,
      status: 'healthy',
      lastHeartbeat: Date.now(),
      registeredAt: new Date().toISOString(),
      requestCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
    };

    if (!this.services.has(name)) {
      this.services.set(name, new Map());
    }
    this.services.get(name).set(id, entry);

    logger.info(`[ServiceRegistry] Registered: ${id} (v${version}, weight=${weight})`);
    return entry;
  }

  /**
   * Remove a service instance.
   */
  deregister(name, url) {
    const id = `${name}:${url}`;
    const instances = this.services.get(name);
    if (instances) {
      instances.delete(id);
      if (instances.size === 0) this.services.delete(name);
      logger.info(`[ServiceRegistry] Deregistered: ${id}`);
    }
  }

  /**
   * Heartbeat from a service instance.
   */
  heartbeat(name, url) {
    const id = `${name}:${url}`;
    const instances = this.services.get(name);
    if (instances?.has(id)) {
      const entry = instances.get(id);
      entry.lastHeartbeat = Date.now();
      entry.status = 'healthy';
    }
  }

  // ─── Discovery ───────────────────────────────────────────────────────────

  /**
   * Get a healthy instance of a service (weighted random selection).
   * @param {string} name - Service name
   * @returns {Object|null} Service instance or null
   */
  resolve(name) {
    const instances = this.services.get(name);
    if (!instances || instances.size === 0) return null;

    const healthy = [...instances.values()].filter(i => i.status === 'healthy');
    if (healthy.length === 0) return null;

    // Weighted random selection
    const totalWeight = healthy.reduce((sum, i) => sum + i.weight, 0);
    let random = Math.random() * totalWeight;
    for (const instance of healthy) {
      random -= instance.weight;
      if (random <= 0) return instance;
    }
    return healthy[0];
  }

  /**
   * Get all instances of a service.
   */
  getInstances(name) {
    const instances = this.services.get(name);
    return instances ? [...instances.values()] : [];
  }

  /**
   * Get all registered services overview.
   */
  getOverview() {
    const overview = {};
    for (const [name, instances] of this.services) {
      const all = [...instances.values()];
      overview[name] = {
        total: all.length,
        healthy: all.filter(i => i.status === 'healthy').length,
        unhealthy: all.filter(i => i.status !== 'healthy').length,
        instances: all.map(i => ({
          url: i.url,
          version: i.version,
          status: i.status,
          weight: i.weight,
          uptime: Date.now() - new Date(i.registeredAt).getTime(),
          requestCount: i.requestCount,
          errorCount: i.errorCount,
          avgResponseTime: i.avgResponseTime,
        })),
      };
    }
    return overview;
  }

  // ─── Metrics Tracking ────────────────────────────────────────────────────

  /**
   * Record a request result for a service instance.
   */
  recordRequest(name, url, { durationMs, success = true }) {
    const id = `${name}:${url}`;
    const instances = this.services.get(name);
    if (instances?.has(id)) {
      const entry = instances.get(id);
      entry.requestCount++;
      if (!success) entry.errorCount++;

      // Rolling average response time
      entry.avgResponseTime = (entry.avgResponseTime * (entry.requestCount - 1) + durationMs) / entry.requestCount;
    }
  }

  // ─── Health Checks ───────────────────────────────────────────────────────

  async _runHealthChecks() {
    const now = Date.now();
    for (const [name, instances] of this.services) {
      for (const [id, entry] of instances) {
        if (now - entry.lastHeartbeat > this.TTL_MS) {
          if (entry.status === 'healthy') {
            entry.status = 'unhealthy';
            logger.warn(`[ServiceRegistry] ${id} marked unhealthy (no heartbeat for ${this.TTL_MS}ms)`);
          }
        }
      }
    }
  }

  /**
   * Register a custom health check function for a service.
   */
  setHealthCheck(name, checkFn) {
    this.healthChecks.set(name, checkFn);
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  destroy() {
    clearInterval(this._checkInterval);
    this.services.clear();
    this.healthChecks.clear();
  }
}

// Singleton
const registry = new ServiceRegistry();

module.exports = registry;

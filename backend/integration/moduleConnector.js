/**
 * Module Connector — موصل الوحدات
 *
 * Provides loose-coupling service discovery and module-to-module
 * communication with circuit breaker pattern, replacing direct
 * require() imports for cross-module service calls.
 *
 * Features:
 *  - Service registry & discovery
 *  - Circuit breaker per service
 *  - Automatic retry with backoff
 *  - Cross-module request/response via integration bus
 *  - Health aggregation from all modules
 *
 * @module integration/moduleConnector
 */

'use strict';

const EventEmitter = require('events');

// ═══════════════════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════════════════

const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',       // Normal — requests flow through
  OPEN: 'OPEN',           // Tripped — all requests short-circuit
  HALF_OPEN: 'HALF_OPEN', // Probing — limited requests to test recovery
};

const DEFAULT_CIRCUIT_OPTIONS = {
  failureThreshold: 5,      // Failures before opening circuit
  successThreshold: 3,      // Successes in half-open to close
  timeout: 30000,           // ms before half-open probe
  resetTimeout: 60000,      // ms full reset window
};

const MODULE_STATUS = {
  REGISTERED: 'registered',
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Circuit Breaker
// ═══════════════════════════════════════════════════════════════════════════════

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.options = { ...DEFAULT_CIRCUIT_OPTIONS, ...options };
    this.state = CIRCUIT_STATE.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.lastAttemptTime = null;
    this.stats = { totalCalls: 0, totalFailures: 0, totalSuccesses: 0, trips: 0 };
  }

  async execute(fn) {
    this.stats.totalCalls++;
    this.lastAttemptTime = Date.now();

    if (this.state === CIRCUIT_STATE.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.options.timeout) {
        this.state = CIRCUIT_STATE.HALF_OPEN;
      } else {
        throw new Error(`Circuit breaker [${this.name}] is OPEN — service unavailable`);
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      throw error;
    }
  }

  _onSuccess() {
    this.stats.totalSuccesses++;
    this.failures = 0;

    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = CIRCUIT_STATE.CLOSED;
        this.successes = 0;
      }
    }
  }

  _onFailure() {
    this.stats.totalFailures++;
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.state = CIRCUIT_STATE.OPEN;
      this.successes = 0;
      this.stats.trips++;
    } else if (this.failures >= this.options.failureThreshold) {
      this.state = CIRCUIT_STATE.OPEN;
      this.stats.trips++;
    }
  }

  reset() {
    this.state = CIRCUIT_STATE.CLOSED;
    this.failures = 0;
    this.successes = 0;
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      ...this.stats,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Module Connector
// ═══════════════════════════════════════════════════════════════════════════════

class ModuleConnector extends EventEmitter {
  constructor() {
    super();
    this.modules = new Map();       // name → { metadata, services, healthFn, circuitBreaker }
    this.services = new Map();      // global service name → handler
    this.integrationBus = null;
    this.initialized = false;
  }

  /**
   * Wire to the SystemIntegrationBus for cross-module pub/sub
   */
  initialize({ integrationBus } = {}) {
    if (integrationBus) {
      this.integrationBus = integrationBus;
    }
    this.initialized = true;
    this.emit('initialized');
    return this;
  }

  // ─── Module Registration ─────────────────────────────────────────────

  /**
   * Register a module (domain) with its services
   *
   * @param {string} name         - Module name (e.g. 'hr', 'finance')
   * @param {Object} config
   * @param {string} config.version    - Module version
   * @param {Object} config.services   - { serviceName: handlerFn }
   * @param {Function} config.healthFn - async () => { status, details }
   * @param {Object} config.circuitOptions - Override default circuit breaker options
   */
  registerModule(name, config = {}) {
    const { version = '1.0.0', services = {}, healthFn = null, circuitOptions = {} } = config;

    const circuitBreaker = new CircuitBreaker(name, circuitOptions);

    this.modules.set(name, {
      name,
      version,
      registeredAt: new Date().toISOString(),
      status: MODULE_STATUS.REGISTERED,
      services: Object.keys(services),
      healthFn,
      circuitBreaker,
    });

    // Register each service globally
    for (const [serviceName, handler] of Object.entries(services)) {
      const qualifiedName = `${name}.${serviceName}`;
      this.services.set(qualifiedName, { module: name, handler });
    }

    this.emit('module:registered', { name, version, services: Object.keys(services) });
    return this;
  }

  // ─── Service Invocation ──────────────────────────────────────────────

  /**
   * Invoke a service on another module with circuit breaker protection
   *
   * @param {string} qualifiedName - 'module.serviceName' e.g. 'finance.createInvoice'
   * @param {Object} params        - Parameters to pass to the service
   * @param {Object} options       - { timeout, retries, retryDelay }
   * @returns {Promise<any>}
   */
  async invoke(qualifiedName, params = {}, options = {}) {
    const { timeout = 10000, retries = 0, retryDelay = 1000 } = options;

    const service = this.services.get(qualifiedName);
    if (!service) {
      throw new Error(`Service "${qualifiedName}" not found in connector registry`);
    }

    const moduleEntry = this.modules.get(service.module);
    if (!moduleEntry) {
      throw new Error(`Module "${service.module}" not found`);
    }

    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await moduleEntry.circuitBreaker.execute(async () => {
          return Promise.race([
            service.handler(params),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
            ),
          ]);
        });

        return result;
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    this.emit('service:error', {
      service: qualifiedName,
      error: lastError.message,
    });

    throw lastError;
  }

  /**
   * Check if a service exists
   */
  hasService(qualifiedName) {
    return this.services.has(qualifiedName);
  }

  /**
   * List all services for a module
   */
  getModuleServices(moduleName) {
    const mod = this.modules.get(moduleName);
    return mod ? mod.services : [];
  }

  // ─── Request/Reply via Integration Bus ───────────────────────────────

  /**
   * Send a request to a module and wait for reply (via message queue)
   * Uses the SystemIntegrationBus as transport
   */
  async request(targetModule, action, payload = {}, options = {}) {
    if (!this.integrationBus) {
      throw new Error('Integration bus not connected — cannot send cross-module request');
    }

    const { timeout = 10000 } = options;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request to ${targetModule}.${action} timed out`));
      }, timeout);

      // Listen for reply
      const replyHandler = (event) => {
        if (event.payload && event.payload._requestId === requestId) {
          clearTimeout(timer);
          resolve(event.payload.result);
        }
      };

      this.integrationBus.subscribe(`${targetModule}.reply.${action}`, replyHandler);

      // Publish request
      this.integrationBus.publish(targetModule, `request.${action}`, {
        _requestId: requestId,
        ...payload,
      }).catch(err => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  // ─── Health Check ────────────────────────────────────────────────────

  /**
   * Perform health check across all registered modules
   */
  async healthCheck() {
    const results = {};

    for (const [name, mod] of this.modules) {
      try {
        if (mod.healthFn) {
          const health = await Promise.race([
            mod.healthFn(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Health check timeout')), 5000)
            ),
          ]);
          results[name] = {
            status: health.status || MODULE_STATUS.HEALTHY,
            details: health.details || {},
            circuit: mod.circuitBreaker.getStatus(),
          };
        } else {
          results[name] = {
            status: MODULE_STATUS.HEALTHY,
            details: { note: 'No health function registered' },
            circuit: mod.circuitBreaker.getStatus(),
          };
        }
      } catch (error) {
        results[name] = {
          status: MODULE_STATUS.UNHEALTHY,
          error: error.message,
          circuit: mod.circuitBreaker.getStatus(),
        };
      }
    }

    const allStatuses = Object.values(results).map(r => r.status);
    const overallStatus = allStatuses.includes(MODULE_STATUS.UNHEALTHY)
      ? MODULE_STATUS.UNHEALTHY
      : allStatuses.includes(MODULE_STATUS.DEGRADED)
        ? MODULE_STATUS.DEGRADED
        : MODULE_STATUS.HEALTHY;

    return {
      status: overallStatus,
      modulesCount: this.modules.size,
      servicesCount: this.services.size,
      modules: results,
    };
  }

  /**
   * Get high-level stats
   */
  getStats() {
    const moduleStats = {};
    for (const [name, mod] of this.modules) {
      moduleStats[name] = {
        version: mod.version,
        services: mod.services.length,
        circuit: mod.circuitBreaker.getStatus(),
      };
    }

    return {
      totalModules: this.modules.size,
      totalServices: this.services.size,
      modules: moduleStats,
    };
  }

  /**
   * Reset circuit breakers
   */
  resetCircuit(moduleName) {
    const mod = this.modules.get(moduleName);
    if (mod) {
      mod.circuitBreaker.reset();
      return true;
    }
    return false;
  }

  resetAllCircuits() {
    for (const mod of this.modules.values()) {
      mod.circuitBreaker.reset();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Express Routes — API endpoints for connector management
// ═══════════════════════════════════════════════════════════════════════════════

function mountModuleConnectorRoutes(app) {
  const express = require('express');
  const router = express.Router();

  router.get('/status', async (req, res) => {
    try {
      const health = await moduleConnector.healthCheck();
      res.json({ success: true, data: health });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/modules', (req, res) => {
    const stats = moduleConnector.getStats();
    res.json({ success: true, data: stats });
  });

  router.get('/modules/:name/services', (req, res) => {
    const services = moduleConnector.getModuleServices(req.params.name);
    res.json({ success: true, data: { module: req.params.name, services } });
  });

  router.post('/modules/:name/reset-circuit', (req, res) => {
    const reset = moduleConnector.resetCircuit(req.params.name);
    res.json({ success: true, data: { module: req.params.name, reset } });
  });

  app.use('/api/v2/module-connector', router);
}

// ─── Singleton & Exports ─────────────────────────────────────────────────────

const moduleConnector = new ModuleConnector();

module.exports = {
  ModuleConnector,
  CircuitBreaker,
  CIRCUIT_STATE,
  MODULE_STATUS,
  moduleConnector,
  mountModuleConnectorRoutes,
};

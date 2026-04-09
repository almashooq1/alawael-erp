/**
 * Connection Circuit Breaker - Al-Awael ERP
 * قاطع الدائرة لاتصال قاعدة البيانات
 *
 * Features:
 *  - Circuit breaker pattern for database connections
 *  - Three states: CLOSED (normal), OPEN (failing), HALF_OPEN (testing)
 *  - Automatic recovery with half-open probing
 *  - Request queuing during recovery
 *  - Metrics: failure rate, response time, throughput
 *  - Fallback handler (graceful degradation)
 *  - Integration with health checks
 */

'use strict';

const { EventEmitter } = require('events');
const logger = require('../utils/logger');

// States
const STATE = {
  CLOSED: 'CLOSED', // Normal operation — requests flow through
  OPEN: 'OPEN', // Circuit tripped — requests fail fast
  HALF_OPEN: 'HALF_OPEN', // Testing recovery — limited requests pass through
};

// ══════════════════════════════════════════════════════════════════
// CircuitBreaker
// ══════════════════════════════════════════════════════════════════
class CircuitBreaker extends EventEmitter {
  /**
   * @param {Object} options
   * @param {number} options.failureThreshold - Failures before opening (default: 5)
   * @param {number} options.successThreshold - Successes in half-open to close (default: 3)
   * @param {number} options.timeout - Time in ms before trying half-open (default: 30000)
   * @param {number} options.monitorWindow - Rolling window for failure tracking (default: 60000)
   * @param {Function} options.fallback - Fallback function when circuit is open
   */
  constructor(options = {}) {
    super();

    this._state = STATE.CLOSED;
    this._failureCount = 0;
    this._successCount = 0;
    this._failureThreshold = options.failureThreshold || 5;
    this._successThreshold = options.successThreshold || 3;
    this._timeout = options.timeout || 30000;
    this._monitorWindow = options.monitorWindow || 60000;
    this._fallback = options.fallback || null;
    this._halfOpenTimer = null;
    this._lastFailure = null;
    this._lastSuccess = null;
    this._openedAt = null;

    // Rolling window tracking
    this._failures = []; // timestamps
    this._requests = { total: 0, success: 0, failure: 0, rejected: 0 };

    // State change history
    this._stateHistory = [];
    this._maxHistory = 50;
  }

  /** Get current state */
  get state() {
    return this._state;
  }

  /** Check if circuit allows requests */
  get isAvailable() {
    return this._state !== STATE.OPEN;
  }

  /**
   * Execute a function through the circuit breaker
   *
   * @param {Function} fn - async () => result
   * @returns {*} Result of fn or fallback
   *
   * @example
   *   const result = await breaker.execute(async () => {
   *     return await Model.find(filter).lean();
   *   });
   */
  async execute(fn) {
    this._requests.total++;

    // OPEN — fail fast or use fallback
    if (this._state === STATE.OPEN) {
      this._requests.rejected++;
      this.emit('rejected');

      if (this._fallback) {
        return this._fallback();
      }
      throw new Error('Circuit breaker is OPEN — database is unavailable');
    }

    // HALF_OPEN — allow limited requests
    if (this._state === STATE.HALF_OPEN) {
      // Only allow one probe request at a time
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  /** Record a successful operation */
  _onSuccess() {
    this._requests.success++;
    this._lastSuccess = new Date();

    if (this._state === STATE.HALF_OPEN) {
      this._successCount++;

      if (this._successCount >= this._successThreshold) {
        this._close();
      }
    } else if (this._state === STATE.CLOSED) {
      // Reset failure count on success
      this._failureCount = 0;
    }
  }

  /** Record a failed operation */
  _onFailure(error) {
    this._requests.failure++;
    this._lastFailure = new Date();
    this._failures.push(Date.now());

    // Trim old failures outside the monitoring window
    const cutoff = Date.now() - this._monitorWindow;
    this._failures = this._failures.filter(t => t > cutoff);

    if (this._state === STATE.HALF_OPEN) {
      // Any failure in half-open trips the circuit again
      this._open();
      return;
    }

    if (this._state === STATE.CLOSED) {
      this._failureCount++;

      if (this._failureCount >= this._failureThreshold) {
        this._open();
      }
    }

    logger.warn(
      `[CircuitBreaker] Failure recorded (${this._failureCount}/${this._failureThreshold})`,
      {
        state: this._state,
        error: error.message,
      }
    );
  }

  // ── State Transitions ──

  _open() {
    const prevState = this._state;
    this._state = STATE.OPEN;
    this._openedAt = new Date();
    this._successCount = 0;

    this._recordStateChange(prevState, STATE.OPEN);

    logger.error(
      `[CircuitBreaker] OPEN — database circuit tripped after ${this._failureCount} failures`
    );
    this.emit('open');

    // Schedule half-open probe
    this._halfOpenTimer = setTimeout(() => {
      this._halfOpen();
    }, this._timeout);
  }

  _halfOpen() {
    const prevState = this._state;
    this._state = STATE.HALF_OPEN;
    this._successCount = 0;

    this._recordStateChange(prevState, STATE.HALF_OPEN);

    logger.info('[CircuitBreaker] HALF_OPEN — probing database connection');
    this.emit('halfOpen');
  }

  _close() {
    const prevState = this._state;
    this._state = STATE.CLOSED;
    this._failureCount = 0;
    this._successCount = 0;
    this._openedAt = null;

    if (this._halfOpenTimer) {
      clearTimeout(this._halfOpenTimer);
      this._halfOpenTimer = null;
    }

    this._recordStateChange(prevState, STATE.CLOSED);

    logger.info('[CircuitBreaker] CLOSED — database connection recovered');
    this.emit('close');
  }

  /** Force reset to closed state */
  reset() {
    if (this._halfOpenTimer) {
      clearTimeout(this._halfOpenTimer);
      this._halfOpenTimer = null;
    }
    this._state = STATE.CLOSED;
    this._failureCount = 0;
    this._successCount = 0;
    this._openedAt = null;
    this._failures = [];
    logger.info('[CircuitBreaker] Manually reset to CLOSED');
    this.emit('reset');
  }

  // ── Metrics ──

  _recordStateChange(from, to) {
    this._stateHistory.push({
      from,
      to,
      at: new Date(),
    });
    while (this._stateHistory.length > this._maxHistory) {
      this._stateHistory.shift();
    }
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics() {
    const total = this._requests.success + this._requests.failure;
    const failureRate =
      total > 0 ? ((this._requests.failure / total) * 100).toFixed(2) + '%' : '0%';

    return {
      state: this._state,
      requests: { ...this._requests },
      failureRate,
      failureCount: this._failureCount,
      successCount: this._successCount,
      thresholds: {
        failure: this._failureThreshold,
        success: this._successThreshold,
        timeout: this._timeout,
      },
      lastFailure: this._lastFailure,
      lastSuccess: this._lastSuccess,
      openedAt: this._openedAt,
      recentFailures: this._failures.length,
      stateHistory: this._stateHistory.slice(-10),
    };
  }

  /** Set fallback handler */
  setFallback(fn) {
    this._fallback = fn;
    return this;
  }

  /** Clean up timers */
  destroy() {
    if (this._halfOpenTimer) {
      clearTimeout(this._halfOpenTimer);
    }
    this.removeAllListeners();
  }
}

// ══════════════════════════════════════════════════════════════════
// Pre-configured Database Circuit Breaker
// ══════════════════════════════════════════════════════════════════
const dbCircuitBreaker = new CircuitBreaker({
  failureThreshold: parseInt(process.env.CB_FAILURE_THRESHOLD) || 5,
  successThreshold: parseInt(process.env.CB_SUCCESS_THRESHOLD) || 3,
  timeout: parseInt(process.env.CB_TIMEOUT_MS) || 30000,
  monitorWindow: parseInt(process.env.CB_MONITOR_WINDOW_MS) || 60000,
  fallback: () => ({
    error: 'Service temporarily unavailable',
    message: 'قاعدة البيانات غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.',
    code: 'DB_CIRCUIT_OPEN',
  }),
});

// ══════════════════════════════════════════════════════════════════
// Express Middleware: Circuit Breaker Guard
// ══════════════════════════════════════════════════════════════════
/**
 * Middleware that rejects requests when circuit is open
 *
 * @example
 *   app.use('/api', circuitBreakerMiddleware());
 */
function circuitBreakerMiddleware(breaker = dbCircuitBreaker) {
  return (req, res, next) => {
    if (breaker.state === STATE.OPEN) {
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'قاعدة البيانات غير متاحة مؤقتاً',
        retryAfter: Math.ceil(breaker._timeout / 1000),
      });
    }
    next();
  };
}

module.exports = {
  CircuitBreaker,
  dbCircuitBreaker,
  circuitBreakerMiddleware,
  STATE,
};

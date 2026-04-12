'use strict';
/**
 * DDD Circuit Breaker
 * ═══════════════════════════════════════════════════════════════════════
 * Circuit breaker pattern for external service calls, retry policies
 * with exponential backoff, and graceful service degradation.
 *
 * Features:
 *  - Three-state circuit: closed → open → half-open
 *  - Configurable failure thresholds & reset timeouts
 *  - Automatic recovery with half-open probing
 *  - Retry with exponential backoff + jitter
 *  - Fallback support for graceful degradation
 *  - Persistent circuit state (MongoDB)
 *  - Circuit dashboard & monitoring
 *
 * @module dddCircuitBreaker
 */

const { DDDCircuitState, DDDCircuitEvent } = require('../models/DddCircuitBreaker');

/** Default circuit breaker configuration */
const CIRCUIT_DEFAULTS = {
  failureThreshold: 5, // failures before opening
  resetTimeoutMs: 30000, // ms before half-open probe
  halfOpenRequests: 3, // successes needed to close from half-open
};

class CircuitBreaker {
  /**
   * @param {string} serviceName - Unique service identifier
   * @param {Object} config - Circuit configuration overrides
   */
  constructor(serviceName, config = {}) {
    this.serviceName = serviceName;
    this.config = { ...CIRCUIT_DEFAULTS, ...config };
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenSuccesses = 0;
    this.lastFailure = null;
    this.lastError = null;
    this._initialized = false;
  }

  async _init() {
    if (this._initialized) return;
    try {
      const stored = await DDDCircuitState.findOne({ serviceName: this.serviceName });
      if (stored) {
        this.state = stored.state;
        this.failureCount = stored.failureCount;
        this.successCount = stored.successCount;
        this.halfOpenSuccesses = stored.halfOpenSuccesses;
        this.lastFailure = stored.lastFailure;
        this.lastError = stored.lastError;
      }
    } catch {
      /* first run */
    }
    this._initialized = true;
  }

  async _persist(eventType, extra = {}) {
    try {
      await DDDCircuitState.findOneAndUpdate(
        { serviceName: this.serviceName },
        {
          $set: {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            halfOpenSuccesses: this.halfOpenSuccesses,
            lastFailure: this.lastFailure,
            lastError: this.lastError,
            lastStateChange: new Date(),
            config: this.config,
          },
          $inc: {
            totalRequests: 1,
            ...(extra.failed ? { totalFailures: 1 } : { totalSuccesses: 1 }),
          },
        },
        { upsert: true }
      );

      if (eventType) {
        await DDDCircuitEvent.create({
          serviceName: this.serviceName,
          eventType,
          previousState: extra.prevState,
          newState: this.state,
          error: extra.error,
          durationMs: extra.durationMs,
        });
      }
    } catch {
      /* persistence failure shouldn't break circuit logic */
    }
  }

  /**
   * Execute a function through the circuit breaker.
   *
   * @param {Function} fn - Async function to execute
   * @param {Function} [fallback] - Fallback function if circuit is open
   * @returns {Promise<any>}
   */
  async execute(fn, fallback) {
    await this._init();

    /* Check if circuit should transition from open to half-open */
    if (this.state === 'open') {
      const elapsed = Date.now() - (this.lastFailure?.getTime() || 0);
      if (elapsed >= this.config.resetTimeoutMs) {
        const prevState = this.state;
        this.state = 'half-open';
        this.halfOpenSuccesses = 0;
        await this._persist('half-open', { prevState });
      } else {
        /* Circuit is open — use fallback or throw */
        if (fallback) {
          await this._persist('fallback', { failed: true });
          return fallback();
        }
        throw new Error(
          `Circuit breaker OPEN for ${this.serviceName}. Retry after ${Math.ceil((this.config.resetTimeoutMs - elapsed) / 1000)}s`
        );
      }
    }

    /* Execute the function */
    const start = Date.now();
    try {
      const result = await fn();
      await this._onSuccess(Date.now() - start);
      return result;
    } catch (err) {
      await this._onFailure(err, Date.now() - start);
      if (fallback) return fallback();
      throw err;
    }
  }

  async _onSuccess(durationMs) {
    this.successCount++;

    if (this.state === 'half-open') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
        const prevState = this.state;
        this.state = 'closed';
        this.failureCount = 0;
        this.halfOpenSuccesses = 0;
        await this._persist('reset', { prevState, durationMs });
        return;
      }
    } else {
      this.failureCount = Math.max(0, this.failureCount - 1); // decay on success
    }

    await this._persist('success', { durationMs });
  }

  async _onFailure(err, durationMs) {
    this.failureCount++;
    this.lastFailure = new Date();
    this.lastError = err.message;

    if (this.state === 'half-open') {
      /* Any failure in half-open trips immediately */
      const prevState = this.state;
      this.state = 'open';
      await this._persist('trip', { prevState, error: err.message, durationMs, failed: true });
      return;
    }

    if (this.failureCount >= this.config.failureThreshold) {
      const prevState = this.state;
      this.state = 'open';
      await this._persist('trip', { prevState, error: err.message, durationMs, failed: true });
    } else {
      await this._persist('failure', { error: err.message, durationMs, failed: true });
    }
  }

  async reset() {
    const prevState = this.state;
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenSuccesses = 0;
    this.lastError = null;
    await this._persist('manual-reset', { prevState });
  }

  getStatus() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      config: this.config,
      lastFailure: this.lastFailure,
      lastError: this.lastError,
    };
  }
}

module.exports = new CircuitBreaker();

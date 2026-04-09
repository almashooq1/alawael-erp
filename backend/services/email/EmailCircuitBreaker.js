'use strict';

/**
 * Email Circuit Breaker — قاطع دائرة البريد الإلكتروني
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * when the email provider is down or degraded:
 *
 *  CLOSED  →  failures exceed threshold  →  OPEN
 *  OPEN    →  cooldown expires           →  HALF_OPEN
 *  HALF_OPEN → probe succeeds            →  CLOSED
 *  HALF_OPEN → probe fails               →  OPEN
 *
 * Features:
 * - Automatic state transitions
 * - Configurable thresholds and cooldowns
 * - Health statistics
 * - Manual reset capability
 * - Event callbacks for state changes
 */

const logger = require('../../utils/logger');

const STATE = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

class EmailCircuitBreaker {
  /**
   * @param {Object} options
   * @param {number}   [options.failureThreshold=5]    — failures before tripping
   * @param {number}   [options.successThreshold=2]    — successes in HALF_OPEN to close
   * @param {number}   [options.cooldownMs=60000]      — ms to wait before half-opening
   * @param {number}   [options.monitorWindow=120000]  — ms window to count failures
   * @param {Function} [options.onStateChange]         — callback(oldState, newState)
   * @param {Array}    [options.fallbackProviders=[]]  — ordered list of fallback provider fns
   * @param {boolean}  [options.autoFailover=true]     — auto-switch to fallback when OPEN
   */
  constructor(options = {}) {
    this._failureThreshold = options.failureThreshold ?? 5;
    this._successThreshold = options.successThreshold ?? 2;
    this._cooldownMs = options.cooldownMs ?? 60_000;
    this._monitorWindow = options.monitorWindow ?? 120_000;
    this._onStateChange = options.onStateChange || null;

    // Provider failover
    this._fallbackProviders = options.fallbackProviders || [];
    this._autoFailover = options.autoFailover !== false;
    this._currentFallbackIndex = -1; // -1 = primary provider

    this._state = STATE.CLOSED;
    this._failures = []; // timestamps of recent failures
    this._halfOpenSuccesses = 0;
    this._lastOpenedAt = null;
    this._totalTrips = 0;

    // Stats
    this._stats = {
      totalCalls: 0,
      totalSuccess: 0,
      totalFailed: 0,
      totalRejected: 0,
      totalTrips: 0,
      totalFailovers: 0,
      lastFailure: null,
      lastSuccess: null,
      lastTrip: null,
      lastRecovery: null,
      lastFailoverAt: null,
      activeProvider: 'primary',
    };
  }

  /** Current state */
  get state() {
    this._checkCooldown();
    return this._state;
  }

  /** Is the circuit allowing requests? */
  get isAllowed() {
    this._checkCooldown();
    return this._state !== STATE.OPEN;
  }

  /** Get health report */
  get stats() {
    return {
      state: this.state,
      ...this._stats,
      recentFailures: this._failures.length,
      halfOpenSuccesses: this._halfOpenSuccesses,
      cooldownMs: this._cooldownMs,
      failureThreshold: this._failureThreshold,
      fallbackProvidersCount: this._fallbackProviders.length,
      currentFallbackIndex: this._currentFallbackIndex,
      autoFailover: this._autoFailover,
    };
  }

  /**
   * Register a fallback provider function.
   * @param {Function} providerFn — async (mailOptions) => result
   * @param {string}   [name='fallback'] — human-readable provider name
   */
  addFallbackProvider(providerFn, name = 'fallback') {
    this._fallbackProviders.push({ fn: providerFn, name });
  }

  /**
   * Execute an async action through the circuit breaker.
   * If circuit is OPEN and failover is enabled, tries fallback providers.
   * @param {Function} action    — async function to execute (primary provider)
   * @param {Function} [fallback] — optional fallback when all providers fail
   * @returns {Promise<*>}
   */
  async execute(action, fallback) {
    this._checkCooldown();
    this._stats.totalCalls++;

    // ── Circuit is OPEN → try fallback providers then reject ─────────
    if (this._state === STATE.OPEN) {
      // Auto-failover to backup providers
      if (this._autoFailover && this._fallbackProviders.length > 0) {
        for (let i = 0; i < this._fallbackProviders.length; i++) {
          try {
            const provider = this._fallbackProviders[i];
            const result = await provider.fn();
            this._currentFallbackIndex = i;
            this._stats.totalFailovers++;
            this._stats.lastFailoverAt = new Date();
            this._stats.activeProvider = provider.name || `fallback_${i}`;
            logger.info(`[EmailCircuitBreaker] 🔄 Failover to ${provider.name} succeeded`);
            return result;
          } catch (err) {
            logger.warn(
              `[EmailCircuitBreaker] Fallback provider ${this._fallbackProviders[i].name} also failed: ${err.message}`
            );
          }
        }
      }

      this._stats.totalRejected++;
      if (fallback) return fallback();
      throw new Error('Email circuit breaker is OPEN — provider appears down');
    }

    // ── Circuit is HALF_OPEN → allow probe request ───────────────────
    // ── Circuit is CLOSED → allow normally ───────────────────────────
    try {
      const result = await action();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  /**
   * Wrap an async function with circuit breaker protection.
   * Returns a new function that routes through execute().
   * @param {Function} fn
   * @param {Function} [fallback]
   * @returns {Function}
   */
  wrap(fn, fallback) {
    return (...args) => this.execute(() => fn(...args), fallback);
  }

  /** Record a success */
  _onSuccess() {
    this._stats.totalSuccess++;
    this._stats.lastSuccess = new Date();

    if (this._state === STATE.HALF_OPEN) {
      this._halfOpenSuccesses++;
      if (this._halfOpenSuccesses >= this._successThreshold) {
        this._transition(STATE.CLOSED);
        this._failures = [];
        this._halfOpenSuccesses = 0;
        this._currentFallbackIndex = -1;
        this._stats.activeProvider = 'primary';
        this._stats.lastRecovery = new Date();
        logger.info('[EmailCircuitBreaker] ✅ Circuit CLOSED — provider recovered');
      }
    }
  }

  /** Record a failure */
  _onFailure(error) {
    this._stats.totalFailed++;
    this._stats.lastFailure = new Date();

    const now = Date.now();
    this._failures.push(now);

    // Prune failures outside the monitor window
    this._failures = this._failures.filter(t => now - t < this._monitorWindow);

    if (this._state === STATE.HALF_OPEN) {
      // Probe failed → reopen
      this._transition(STATE.OPEN);
      this._lastOpenedAt = now;
      this._halfOpenSuccesses = 0;
      logger.warn(`[EmailCircuitBreaker] 🔴 Circuit re-OPENED — probe failed: ${error.message}`);
    } else if (this._state === STATE.CLOSED && this._failures.length >= this._failureThreshold) {
      // Threshold crossed → trip
      this._transition(STATE.OPEN);
      this._lastOpenedAt = now;
      this._totalTrips++;
      this._stats.totalTrips++;
      this._stats.lastTrip = new Date();
      logger.warn(
        `[EmailCircuitBreaker] 🔴 Circuit OPENED — ${this._failures.length} failures in ${this._monitorWindow / 1000}s (threshold: ${this._failureThreshold})`
      );
    }
  }

  /** Automatically transition to HALF_OPEN after cooldown */
  _checkCooldown() {
    if (this._state === STATE.OPEN && this._lastOpenedAt) {
      if (Date.now() - this._lastOpenedAt >= this._cooldownMs) {
        this._transition(STATE.HALF_OPEN);
        this._halfOpenSuccesses = 0;
        logger.info('[EmailCircuitBreaker] 🟡 Circuit HALF_OPEN — probing provider');
      }
    }
  }

  /** Transition to a new state */
  _transition(newState) {
    const oldState = this._state;
    this._state = newState;
    if (this._onStateChange) {
      try {
        this._onStateChange(oldState, newState);
      } catch (_) {
        /* callback errors must not break the breaker */
      }
    }
  }

  /** Force-reset to CLOSED (admin override) */
  reset() {
    this._transition(STATE.CLOSED);
    this._failures = [];
    this._halfOpenSuccesses = 0;
    this._lastOpenedAt = null;
    this._currentFallbackIndex = -1;
    this._stats.activeProvider = 'primary';
    this._stats.lastRecovery = new Date();
    logger.info('[EmailCircuitBreaker] 🔧 Circuit manually RESET to CLOSED');
  }

  /** Force-open the circuit (maintenance mode) */
  trip(reason = 'manual') {
    this._transition(STATE.OPEN);
    this._lastOpenedAt = Date.now();
    this._totalTrips++;
    this._stats.totalTrips++;
    this._stats.lastTrip = new Date();
    logger.warn(`[EmailCircuitBreaker] 🔴 Circuit manually TRIPPED: ${reason}`);
  }
}

module.exports = { EmailCircuitBreaker, STATE };

/**
 * Circuit Breaker Pattern - نمط قاطع الدائرة
 * Professional Resilience Patterns for Alawael ERP
 */

const EventEmitter = require('events');

// Circuit States
const CircuitState = {
  CLOSED: 'CLOSED',       // Normal operation
  OPEN: 'OPEN',           // Failing, rejecting requests
  HALF_OPEN: 'HALF_OPEN', // Testing if service recovered
};

// Default Configuration
const defaultConfig = {
  // Failure threshold
  failureThreshold: 5,           // Number of failures before opening
  failureThresholdPercent: 50,   // Percentage of failures before opening
  volumeThreshold: 10,           // Minimum requests before calculating percentage
  
  // Success threshold (for half-open state)
  successThreshold: 3,           // Successful requests to close circuit
  
  // Timeout
  timeout: 30000,                // Time in ms before attempting retry (open state)
  responseTimeout: 10000,        // Timeout for individual requests
  
  // Reset
  resetTimeout: 60000,           // Time to reset failure counts
  
  // Monitoring
  enabled: true,
  rollingCountTimeout: 10000,    // Rolling window for stats
};

/**
 * Circuit Breaker Class
 */
class CircuitBreaker extends EventEmitter {
  constructor(name, options = {}) {
    super();
    
    this.name = name;
    this.config = { ...defaultConfig, ...options };
    this.state = CircuitState.CLOSED;
    
    // Statistics
    this.stats = {
      failures: 0,
      successes: 0,
      timeouts: 0,
      rejects: 0,
      fires: 0,
      fallbacks: 0,
    };
    
    // Rolling window for stats
    this.rollingWindow = [];
    
    // Half-open state tracking
    this.halfOpenSuccesses = 0;
    this.halfOpenFailures = 0;
    
    // Timers
    this.openTimer = null;
    this.resetTimer = null;
    
    // Fallback function
    this.fallbackFn = null;
    
    // Enabled state
    this.enabled = this.config.enabled;
  }
  
  /**
   * Execute a function with circuit breaker protection
   */
  async fire(fn, ...args) {
    if (!this.enabled) {
      return fn(...args);
    }
    
    this.stats.fires++;
    
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      this.stats.rejects++;
      this.emit('reject', { name: this.name });
      
      if (this.fallbackFn) {
        this.stats.fallbacks++;
        return this.fallbackFn(...args);
      }
      
      throw new CircuitBreakerError(
        `Circuit breaker '${this.name}' is OPEN`,
        'CIRCUIT_OPEN'
      );
    }
    
    // Execute with timeout
    try {
      const result = await this._executeWithTimeout(fn, args);
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }
  
  /**
   * Execute function with timeout
   */
  async _executeWithTimeout(fn, args) {
    return new Promise((resolve, reject) => {
      let timeoutId;
      
      const timeoutPromise = new Promise((_, rejectTimeout) => {
        timeoutId = setTimeout(() => {
          this.stats.timeouts++;
          rejectTimeout(new CircuitBreakerError(
            `Circuit breaker '${this.name}' timed out after ${this.config.responseTimeout}ms`,
            'TIMEOUT'
          ));
        }, this.config.responseTimeout);
      });
      
      Promise.resolve(fn(...args))
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
      
      // Race between execution and timeout
      Promise.race([Promise.resolve(fn(...args)), timeoutPromise])
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }
  
  /**
   * Handle successful execution
   */
  _onSuccess() {
    this.stats.successes++;
    this._addToRollingWindow(true);
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses++;
      this.emit('halfOpenSuccess', { name: this.name, count: this.halfOpenSuccesses });
      
      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this._close();
      }
    }
  }
  
  /**
   * Handle failed execution
   */
  _onFailure(error) {
    this.stats.failures++;
    this._addToRollingWindow(false);
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenFailures++;
      this.emit('halfOpenFailure', { name: this.name, count: this.halfOpenFailures });
      this._open();
      return;
    }
    
    // Check if should open circuit
    if (this._shouldOpen()) {
      this._open();
    }
  }
  
  /**
   * Add result to rolling window
   */
  _addToRollingWindow(success) {
    const now = Date.now();
    this.rollingWindow.push({ success, timestamp: now });
    
    // Clean old entries
    const cutoff = now - this.config.rollingCountTimeout;
    this.rollingWindow = this.rollingWindow.filter(entry => entry.timestamp > cutoff);
  }
  
  /**
   * Check if circuit should open
   */
  _shouldOpen() {
    const windowSize = this.rollingWindow.length;
    
    // Need minimum volume
    if (windowSize < this.config.volumeThreshold) {
      return false;
    }
    
    // Count failures in window
    const failures = this.rollingWindow.filter(e => !e.success).length;
    
    // Check absolute threshold
    if (failures >= this.config.failureThreshold) {
      return true;
    }
    
    // Check percentage threshold
    const failurePercent = (failures / windowSize) * 100;
    if (failurePercent >= this.config.failureThresholdPercent) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Open the circuit
   */
  _open() {
    const previousState = this.state;
    this.state = CircuitState.OPEN;
    
    this.emit('open', { 
      name: this.name, 
      previousState,
      stats: this.getStats(),
    });
    
    // Set timer to attempt half-open
    this.openTimer = setTimeout(() => {
      this._halfOpen();
    }, this.config.timeout);
  }
  
  /**
   * Move to half-open state
   */
  _halfOpen() {
    const previousState = this.state;
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenSuccesses = 0;
    this.halfOpenFailures = 0;
    
    this.emit('halfOpen', { 
      name: this.name, 
      previousState,
    });
  }
  
  /**
   * Close the circuit
   */
  _close() {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.halfOpenSuccesses = 0;
    this.halfOpenFailures = 0;
    
    // Clear timers
    if (this.openTimer) {
      clearTimeout(this.openTimer);
      this.openTimer = null;
    }
    
    this.emit('close', { 
      name: this.name, 
      previousState,
      stats: this.getStats(),
    });
    
    // Schedule stats reset
    this._scheduleReset();
  }
  
  /**
   * Schedule stats reset
   */
  _scheduleReset() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    
    this.resetTimer = setTimeout(() => {
      this.rollingWindow = [];
    }, this.config.resetTimeout);
  }
  
  /**
   * Set fallback function
   */
  fallback(fn) {
    this.fallbackFn = fn;
    return this;
  }
  
  /**
   * Get current state
   */
  getState() {
    return this.state;
  }
  
  /**
   * Check if circuit is open
   */
  isOpen() {
    return this.state === CircuitState.OPEN;
  }
  
  /**
   * Check if circuit is closed
   */
  isClosed() {
    return this.state === CircuitState.CLOSED;
  }
  
  /**
   * Check if circuit is half-open
   */
  isHalfOpen() {
    return this.state === CircuitState.HALF_OPEN;
  }
  
  /**
   * Get statistics
   */
  getStats() {
    const windowFailures = this.rollingWindow.filter(e => !e.success).length;
    const windowSuccesses = this.rollingWindow.filter(e => e.success).length;
    const windowTotal = this.rollingWindow.length;
    
    return {
      name: this.name,
      state: this.state,
      enabled: this.enabled,
      
      // Overall stats
      ...this.stats,
      
      // Rolling window stats
      window: {
        failures: windowFailures,
        successes: windowSuccesses,
        total: windowTotal,
        failureRate: windowTotal > 0 ? (windowFailures / windowTotal) * 100 : 0,
      },
      
      // Half-open state
      halfOpen: {
        successes: this.halfOpenSuccesses,
        failures: this.halfOpenFailures,
      },
    };
  }
  
  /**
   * Enable circuit breaker
   */
  enable() {
    this.enabled = true;
    this.emit('enable', { name: this.name });
  }
  
  /**
   * Disable circuit breaker
   */
  disable() {
    this.enabled = false;
    this.emit('disable', { name: this.name });
  }
  
  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.stats = {
      failures: 0,
      successes: 0,
      timeouts: 0,
      rejects: 0,
      fires: 0,
      fallbacks: 0,
    };
    this.rollingWindow = [];
    this.halfOpenSuccesses = 0;
    this.halfOpenFailures = 0;
    
    if (this.openTimer) {
      clearTimeout(this.openTimer);
      this.openTimer = null;
    }
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    
    this.emit('reset', { name: this.name });
  }
  
  /**
   * Shutdown circuit breaker
   */
  shutdown() {
    this.reset();
    this.removeAllListeners();
  }
}

/**
 * Circuit Breaker Error Class
 */
class CircuitBreakerError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.code = code;
    this.isCircuitBreakerError = true;
  }
}

/**
 * Retry Policy Class
 */
class RetryPolicy {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 100;
    this.maxDelay = options.maxDelay || 5000;
    this.multiplier = options.multiplier || 2;
    this.jitter = options.jitter || true;
    this.retryableErrors = options.retryableErrors || [];
  }
  
  /**
   * Execute function with retry
   */
  async execute(fn, ...args) {
    let lastError;
    let delay = this.initialDelay;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this._isRetryable(error)) {
          throw error;
        }
        
        // Last attempt, throw error
        if (attempt === this.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const actualDelay = this._calculateDelay(delay);
        
        // Wait before retry
        await this._sleep(actualDelay);
        
        // Increase delay for next attempt
        delay = Math.min(delay * this.multiplier, this.maxDelay);
      }
    }
    
    throw lastError;
  }
  
  /**
   * Check if error is retryable
   */
  _isRetryable(error) {
    if (this.retryableErrors.length === 0) {
      // Default retryable errors
      const defaultRetryable = [
        'ECONNREFUSED',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'EAI_AGAIN',
      ];
      return defaultRetryable.includes(error.code) || 
             error.code === 'TIMEOUT' ||
             error.isCircuitBreakerError;
    }
    
    return this.retryableErrors.some(retryable => 
      error.code === retryable || 
      error.name === retryable ||
      error.message.includes(retryable)
    );
  }
  
  /**
   * Calculate delay with optional jitter
   */
  _calculateDelay(baseDelay) {
    if (this.jitter) {
      // Add random jitter (0-30% of delay)
      const jitterAmount = baseDelay * 0.3 * Math.random();
      return baseDelay + jitterAmount;
    }
    return baseDelay;
  }
  
  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Bulkhead Pattern - Isolate failures
 */
class Bulkhead {
  constructor(name, options = {}) {
    this.name = name;
    this.maxConcurrent = options.maxConcurrent || 10;
    this.maxQueueSize = options.maxQueueSize || 0;
    
    this.running = 0;
    this.queue = [];
    this.rejected = 0;
  }
  
  /**
   * Execute function with bulkhead protection
   */
  async execute(fn, ...args) {
    if (this.running >= this.maxConcurrent) {
      if (this.maxQueueSize === 0 || this.queue.length >= this.maxQueueSize) {
        this.rejected++;
        throw new BulkheadError(
          `Bulkhead '${this.name}' has reached maximum capacity`,
          'BULKHEAD_FULL'
        );
      }
      
      // Queue the request
      return new Promise((resolve, reject) => {
        this.queue.push({ fn, args, resolve, reject });
      });
    }
    
    this.running++;
    
    try {
      const result = await fn(...args);
      return result;
    } finally {
      this.running--;
      this._processQueue();
    }
  }
  
  /**
   * Process queued requests
   */
  _processQueue() {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const { fn, args, resolve, reject } = this.queue.shift();
      this.execute(fn, ...args).then(resolve).catch(reject);
    }
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      name: this.name,
      running: this.running,
      queued: this.queue.length,
      rejected: this.rejected,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
    };
  }
}

/**
 * Bulkhead Error Class
 */
class BulkheadError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'BulkheadError';
    this.code = code;
    this.isBulkheadError = true;
  }
}

/**
 * Circuit Breaker Factory - Manage multiple breakers
 */
class CircuitBreakerFactory {
  constructor() {
    this.breakers = new Map();
    this.defaultOptions = { ...defaultConfig };
  }
  
  /**
   * Create or get circuit breaker
   */
  get(name, options = {}) {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(name, {
        ...this.defaultOptions,
        ...options,
      });
      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name);
  }
  
  /**
   * Set default options
   */
  setDefaults(options) {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }
  
  /**
   * Get all breakers
   */
  getAll() {
    return Array.from(this.breakers.values());
  }
  
  /**
   * Get all stats
   */
  getAllStats() {
    const stats = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }
  
  /**
   * Reset all breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
  
  /**
   * Shutdown all breakers
   */
  shutdownAll() {
    for (const breaker of this.breakers.values()) {
      breaker.shutdown();
    }
    this.breakers.clear();
  }
}

// Singleton factory
const factory = new CircuitBreakerFactory();

/**
 * Decorator for wrapping functions with circuit breaker
 */
const withCircuitBreaker = (name, options = {}) => {
  const breaker = factory.get(name, options);
  
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args) {
      return breaker.fire(originalMethod.bind(this), ...args);
    };
    
    return descriptor;
  };
};

/**
 * Wrap function with circuit breaker
 */
const wrap = (name, fn, options = {}) => {
  const breaker = factory.get(name, options);
  return (...args) => breaker.fire(fn, ...args);
};

module.exports = {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitBreakerFactory,
  CircuitState,
  RetryPolicy,
  Bulkhead,
  BulkheadError,
  factory,
  withCircuitBreaker,
  wrap,
  defaultConfig,
};
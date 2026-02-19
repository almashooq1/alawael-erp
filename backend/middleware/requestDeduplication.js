/**
 * 🎯 Request Deduplication System
 *
 * Prevents duplicate requests from being processed multiple times
 * Useful for:
 * - Handling network retries
 * - Preventing double submissions
 * - Reducing database load
 */

class RequestDeduplicator {
  constructor(options = {}) {
    // Store in-flight requests
    this.inFlightRequests = new Map();

    // Store completed request results (for deduplication)
    this.completedRequests = new Map();

    // Configuration
    this.resultCacheTTL = options.resultCacheTTL || 60000; // 1 minute
    this.cleanupInterval = options.cleanupInterval || 30000; // 30 seconds

    // Statistics
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      cacheHits: 0,
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Generate request fingerprint
   */
  generateFingerprint(req) {
    const fingerprint = {
      userId: req.user?.id || 'anonymous',
      method: req.method,
      path: req.path,
      query: JSON.stringify(req.query),
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    };

    const crypto = require('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
  }

  /**
   * Check if request is duplicate
   */
  isDuplicate(fingerprint) {
    // Check if request is in-flight
    if (this.inFlightRequests.has(fingerprint)) {
      return true;
    }

    // Check if request result is cached
    const cached = this.completedRequests.get(fingerprint);
    if (cached && Date.now() - cached.timestamp < this.resultCacheTTL) {
      this.stats.cacheHits++;
      return true;
    }

    return false;
  }

  /**
   * Get duplicate result
   */
  getDuplicateResult(fingerprint) {
    // Check in-flight
    if (this.inFlightRequests.has(fingerprint)) {
      return this.inFlightRequests.get(fingerprint);
    }

    // Check completed
    const cached = this.completedRequests.get(fingerprint);
    if (cached && Date.now() - cached.timestamp < this.resultCacheTTL) {
      return cached.result;
    }

    return null;
  }

  /**
   * Track in-flight request
   */
  trackInFlightRequest(fingerprint, promise) {
    this.inFlightRequests.set(fingerprint, promise);

    // Remove from in-flight when done
    promise
      .then(result => {
        this.inFlightRequests.delete(fingerprint);
        // Cache the result
        this.completedRequests.set(fingerprint, {
          result,
          timestamp: Date.now(),
        });
        return result;
      })
      .catch(error => {
        this.inFlightRequests.delete(fingerprint);
        throw error;
      });

    return promise;
  }

  /**
   * Cleanup old cached results
   */
  cleanupOldResults() {
    const now = Date.now();
    let cleaned = 0;

    for (const [fingerprint, cached] of this.completedRequests.entries()) {
      if (now - cached.timestamp > this.resultCacheTTL) {
        this.completedRequests.delete(fingerprint);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Deduplication] Cleaned ${cleaned} old cached results`);
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldResults();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalRequests: this.stats.totalRequests,
      deduplicatedRequests: this.stats.deduplicatedRequests,
      cacheHits: this.stats.cacheHits,
      deduplicationRate:
        ((this.stats.deduplicatedRequests / this.stats.totalRequests) * 100 || 0).toFixed(2) + '%',
      inFlightRequests: this.inFlightRequests.size,
      cachedResults: this.completedRequests.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      cacheHits: 0,
    };
  }

  /**
   * Clear all caches
   */
  clear() {
    this.inFlightRequests.clear();
    this.completedRequests.clear();
  }

  /**
   * Destroy deduplicator
   */
  destroy() {
    this.stopCleanupTimer();
    this.clear();
  }
}

/**
 * Express middleware for request deduplication
 */
function requestDeduplicationMiddleware(deduplicator) {
  return async (req, res, next) => {
    // Skip deduplication for certain methods
    if (req.method === 'GET' || req.method === 'HEAD') {
      return next();
    }

    // Generate request fingerprint
    const fingerprint = deduplicator.generateFingerprint(req);
    deduplicator.stats.totalRequests++;

    // Check for duplicate
    if (deduplicator.isDuplicate(fingerprint)) {
      deduplicator.stats.deduplicatedRequests++;

      const duplicateResult = deduplicator.getDuplicateResult(fingerprint);

      // If in-flight, wait for result
      if (duplicateResult instanceof Promise) {
        try {
          const result = await duplicateResult;
          return res.json({
            success: true,
            data: result,
            isDuplicate: true,
            message: 'This is a duplicate request. Result from previous request.',
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            message: 'Original request failed',
            error: error.message,
          });
        }
      }

      // If cached, return cached result
      return res.json({
        success: true,
        data: duplicateResult,
        isDuplicate: true,
        message: 'Cached result from previous identical request.',
      });
    }

    // Store original send method
    const originalSend = res.send.bind(res);
    const responsePromise = new Promise(resolve => {
      res.send = function (data) {
        resolve(data);
        return originalSend(data);
      };
    });

    // Track in-flight request
    deduplicator.trackInFlightRequest(fingerprint, responsePromise);

    next();
  };
}

// Global deduplicator instance
let globalDeduplicator = null;

/**
 * Initialize global deduplicator
 */
function initializeDeduplicator(options = {}) {
  globalDeduplicator = new RequestDeduplicator(options);
  return globalDeduplicator;
}

/**
 * Get global deduplicator
 */
function getDeduplicator() {
  if (!globalDeduplicator) {
    globalDeduplicator = new RequestDeduplicator();
  }
  return globalDeduplicator;
}

module.exports = {
  RequestDeduplicator,
  requestDeduplicationMiddleware,
  initializeDeduplicator,
  getDeduplicator,
};

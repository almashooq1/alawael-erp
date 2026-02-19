/**
 * 🤖 Predictive Caching with Machine Learning
 *
 * Predicts which data will be needed next using:
 * - User behavior patterns
 * - Time-based patterns
 * - Access sequence analysis
 * - Machine learning models
 */

const fs = require('fs');
const path = require('path');

class PredictiveCacheManager {
  constructor(options = {}) {
    // Pattern storage
    this.patterns = new Map();

    // User behavior history
    this.userBehavior = new Map();

    // Access sequences
    this.accessSequences = [];

    // ML model parameters
    this.modelConfig = {
      maxHistoryLength: options.maxHistoryLength || 1000,
      minPatternFrequency: options.minPatternFrequency || 5,
      confidenceThreshold: options.confidenceThreshold || 0.6,
      decayFactor: options.decayFactor || 0.95,
    };

    // Statistics
    this.stats = {
      predictions: 0,
      correctPredictions: 0,
      incorrectPredictions: 0,
      accuracy: 0,
      warmedItems: 0,
    };
  }

  /**
   * Record access for learning
   */
  recordAccess(userId, resource, metadata = {}) {
    // Update user behavior
    if (!this.userBehavior.has(userId)) {
      this.userBehavior.set(userId, {
        accessHistory: [],
        patterns: [],
        preferences: {},
      });
    }

    const userData = this.userBehavior.get(userId);

    // Add to history
    userData.accessHistory.push({
      resource,
      timestamp: Date.now(),
      metadata,
    });

    // Keep only recent history
    if (userData.accessHistory.length > this.modelConfig.maxHistoryLength) {
      userData.accessHistory.shift();
    }

    // Update patterns
    this.updatePatterns(userId, userData);

    // Record sequence
    this.accessSequences.push({
      userId,
      resource,
      timestamp: Date.now(),
    });
  }

  /**
   * Update access patterns using simple ML
   */
  updatePatterns(userId, userData) {
    const history = userData.accessHistory;
    if (history.length < 2) return;

    // Find frequent sequences
    const sequences = this.findSequences(history);

    // Update patterns with decay
    sequences.forEach(({ current, next, frequency }) => {
      const patternKey = `${userId}:${current}->${next}`;

      const pattern = this.patterns.get(patternKey) || {
        count: 0,
        lastSeen: Date.now(),
        confidence: 0,
      };

      pattern.count += frequency;
      pattern.lastSeen = Date.now();

      // Calculate confidence (0-1)
      pattern.confidence = Math.min(1, pattern.count / this.modelConfig.minPatternFrequency);

      this.patterns.set(patternKey, pattern);
    });
  }

  /**
   * Find access sequences in history
   */
  findSequences(history) {
    const sequences = new Map();

    for (let i = 0; i < history.length - 1; i++) {
      const current = history[i].resource;
      const next = history[i + 1].resource;

      const key = `${current}->${next}`;
      sequences.set(key, (sequences.get(key) || 0) + 1);
    }

    // Filter by minimum frequency
    return Array.from(sequences.entries())
      .filter(([_, freq]) => freq >= this.modelConfig.minPatternFrequency)
      .map(([sequence, frequency]) => {
        const [current, next] = sequence.split('->');
        return { current, next, frequency };
      });
  }

  /**
   * Predict next resources for user
   */
  predictNext(userId, currentResource, topN = 5) {
    const predictions = [];

    // Look for patterns
    this.patterns.forEach((pattern, key) => {
      if (key.startsWith(`${userId}:${currentResource}->`)) {
        const [_, resource] = key.split('->');

        if (pattern.confidence >= this.modelConfig.confidenceThreshold) {
          predictions.push({
            resource,
            confidence: pattern.confidence,
            count: pattern.count,
          });
        }
      }
    });

    // Sort by confidence
    predictions.sort((a, b) => b.confidence - a.confidence);

    this.stats.predictions++;

    return predictions.slice(0, topN);
  }

  /**
   * Predict based on time patterns
   */
  predictByTime(userId, currentHour = null) {
    currentHour = currentHour || new Date().getHours();

    const timePatterns = [];
    const userData = this.userBehavior.get(userId);

    if (!userData) return timePatterns;

    // Find resources accessed at this time
    const accessByHour = new Map();

    userData.accessHistory.forEach(access => {
      const hour = new Date(access.timestamp).getHours();
      if (hour === currentHour) {
        const key = access.resource;
        accessByHour.set(key, (accessByHour.get(key) || 0) + 1);
      }
    });

    // Return top resources for this hour
    return Array.from(accessByHour.entries())
      .map(([resource, count]) => ({
        resource,
        frequency: count,
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Predictively warm cache for user
   */
  async predictiveWarm(userId, cacheManager, dataFetcher) {
    const predictions = this.predictNext(userId, 'home', 10);
    const timePatterns = this.predictByTime(userId);

    const toWarm = [];

    // Add predicted resources
    predictions.forEach(pred => {
      if (pred.confidence >= 0.7) {
        toWarm.push(pred.resource);
      }
    });

    // Add time-based patterns
    timePatterns.slice(0, 3).forEach(pattern => {
      toWarm.push(pattern.resource);
    });

    // Warm cache
    for (const resource of toWarm) {
      try {
        const data = await dataFetcher(userId, resource);
        await cacheManager.set(`predict:${userId}:${resource}`, {}, data, 600);
        this.stats.warmedItems++;
      } catch (error) {
        console.error(`[PredictiveCache] Failed to warm ${resource}:`, error.message);
      }
    }

    return toWarm;
  }

  /**
   * Record prediction feedback (was it correct?)
   */
  recordFeedback(userId, prediction, wasCorrect) {
    if (wasCorrect) {
      this.stats.correctPredictions++;
    } else {
      this.stats.incorrectPredictions++;
    }

    // Update accuracy
    const total = this.stats.correctPredictions + this.stats.incorrectPredictions;
    this.stats.accuracy = ((this.stats.correctPredictions / total) * 100).toFixed(2);
  }

  /**
   * Get predictions for multiple users (batch)
   */
  getPredictionsForUsers(userIds, topN = 5) {
    const allPredictions = {};

    userIds.forEach(userId => {
      allPredictions[userId] = this.predictNext(userId, 'home', topN);
    });

    return allPredictions;
  }

  /**
   * Get model statistics
   */
  getStats() {
    return {
      predictions: this.stats.predictions,
      correctPredictions: this.stats.correctPredictions,
      incorrectPredictions: this.stats.incorrectPredictions,
      accuracy: `${this.stats.accuracy}%`,
      warmedItems: this.stats.warmedItems,
      patternsLearned: this.patterns.size,
      usersTracked: this.userBehavior.size,
      accessSequencesRecorded: this.accessSequences.length,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      predictions: 0,
      correctPredictions: 0,
      incorrectPredictions: 0,
      accuracy: 0,
      warmedItems: 0,
    };
  }

  /**
   * Export model for persistence
   */
  exportModel() {
    return {
      patterns: Array.from(this.patterns.entries()),
      userBehavior: Array.from(this.userBehavior.entries()),
      stats: this.stats,
    };
  }

  /**
   * Import model from persistence
   */
  importModel(data) {
    this.patterns = new Map(data.patterns);
    this.userBehavior = new Map(data.userBehavior);
    this.stats = data.stats;
  }
}

/**
 * Express middleware for predictive caching
 */
function predictiveCacheMiddleware(predictiveCache, cacheManager) {
  return async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next();

    // Record the access
    predictiveCache.recordAccess(userId, req.path, {
      method: req.method,
      query: req.query,
    });

    // Attach prediction helper
    req.getPredictions = (topN = 5) => {
      return predictiveCache.predictNext(userId, req.path, topN);
    };

    // Warm cache predictively
    if (req.path === '/' || req.path === '/dashboard') {
      await predictiveCache.predictiveWarm(userId, cacheManager, async (uId, resource) => {
        // This would be replaced with actual data fetcher
        return { resource, data: [] };
      });
    }

    next();
  };
}

// Global predictive cache instance
let globalPredictiveCache = null;

/**
 * Initialize global predictive cache
 */
function initializePredictiveCache(options = {}) {
  globalPredictiveCache = new PredictiveCacheManager(options);
  return globalPredictiveCache;
}

/**
 * Get global predictive cache
 */
function getPredictiveCache() {
  if (!globalPredictiveCache) {
    globalPredictiveCache = new PredictiveCacheManager();
  }
  return globalPredictiveCache;
}

module.exports = {
  PredictiveCacheManager,
  predictiveCacheMiddleware,
  initializePredictiveCache,
  getPredictiveCache,
};

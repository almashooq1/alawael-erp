/**
 * Recommendations Engine Service
 * خدمة محرك التوصيات
 * 
 * المسؤوليات:
 * - توليد التوصيات الشخصية
 * - تحليل سلوك المستخدم
 * - تصنيف التوصيات
 * - مراقبة ردود الفعل
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');
const aiModels = require('./aiModels.service');

class RecommendationsEngineService extends EventEmitter {
  constructor() {
    super();
    this.logger = Logger;

    // Recommendation cache
    this.recommendationCache = new Map();

    // User preferences
    this.userPreferences = new Map();

    // Recommendation history
    this.recommendationHistory = new Map();

    // User feedback collection
    this.userFeedback = new Map();

    // A/B test variations
    this.abTests = new Map();

    // Recommendation strategies
    this.strategies = new Map();

    // Statistics
    this.stats = {
      totalRecommendations: 0,
      totalFeedback: 0,
      positiveRatings: 0,
      averageRating: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    this._initializeStrategies();
  }

  /**
   * Initialize recommendation strategies
   * تهيئة استراتيجيات التوصية
   * 
   * @private
   */
  _initializeStrategies() {
    try {
      this.strategies.set('collaborative_filtering', {
        name: 'Collaborative Filtering',
        description: 'يوصي بناءً على تفضيلات المستخدمين المشابهين',
        weight: 0.35,
        active: true
      });

      this.strategies.set('content_based', {
        name: 'Content-Based Filtering',
        description: 'يوصي بناءً على خصائص المحتوى المفضل',
        weight: 0.30,
        active: true
      });

      this.strategies.set('hybrid', {
        name: 'Hybrid Recommendation',
        description: 'يجمع بين عدة استراتيجيات',
        weight: 0.25,
        active: true
      });

      this.strategies.set('context_aware', {
        name: 'Context-Aware Recommendation',
        description: 'يأخذ في الاعتبار السياق والموقع والوقت',
        weight: 0.10,
        active: true
      });

      this.logger.info('✅ Recommendation strategies initialized');
    } catch (error) {
      this.logger.error(`Error initializing strategies: ${error.message}`);
    }
  }

  /**
   * Generate recommendations for user
   * توليد التوصيات للمستخدم
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} userId - User ID
   * @param {Object} params - Generation parameters
   * @returns {Object} Recommendations
   */
  generateRecommendations(tenantId, userId, params = {}) {
    try {
      const cacheKey = `${tenantId}:${userId}`;
      
      // Check cache
      if (this.recommendationCache.has(cacheKey)) {
        const cached = this.recommendationCache.get(cacheKey);
        if (new Date() - cached.timestamp < (params.cacheMaxAge || 5 * 60 * 1000)) {
          this.stats.cacheHits++;
          return cached.recommendations;
        }
      }

      this.stats.cacheMisses++;

      // Get user context
      const userContext = this._getUserContext(tenantId, userId);
      
      // Generate recommendations using different strategies
      let recommendations = [];

      // Collaborative filtering
      const cfRecs = this._collaborativeFiltering(tenantId, userId, userContext);
      recommendations.push(...cfRecs.map(r => ({ ...r, strategy: 'collaborative_filtering', score: r.score * 0.35 })));

      // Content-based filtering
      const cbRecs = this._contentBasedFiltering(tenantId, userId, userContext);
      recommendations.push(...cbRecs.map(r => ({ ...r, strategy: 'content_based', score: r.score * 0.30 })));

      // Hybrid approach
      const hybridRecs = this._hybridRecommendation(tenantId, userId, userContext);
      recommendations.push(...hybridRecs.map(r => ({ ...r, strategy: 'hybrid', score: r.score * 0.25 })));

      // Context-aware
      const contextRecs = this._contextAwareRecommendation(tenantId, userId, userContext);
      recommendations.push(...contextRecs.map(r => ({ ...r, strategy: 'context_aware', score: r.score * 0.10 })));

      // Deduplicate and aggregate scores
      const aggregated = this._aggregateRecommendations(recommendations);

      // Sort by score
      aggregated.sort((a, b) => b.finalScore - a.finalScore);

      // Apply limit
      const limit = params.limit || 10;
      const result = {
        tenantId,
        userId,
        recommendations: aggregated.slice(0, limit),
        count: Math.min(limit, aggregated.length),
        generatedAt: new Date(),
        strategies: Array.from(this.strategies.entries())
          .filter(([, s]) => s.active)
          .map(([key, s]) => ({ id: key, ...s }))
      };

      // Cache results
      this.recommendationCache.set(cacheKey, {
        recommendations: result,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (params.cacheTTL || 5 * 60 * 1000))
      });

      // Store in history
      this._storeRecommendationHistory(tenantId, userId, result);

      this.stats.totalRecommendations++;
      this.emit('recommendations:generated', { tenantId, userId, count: result.count });

      return result;
    } catch (error) {
      this.logger.error(`Error generating recommendations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Record user feedback on recommendation
   * تسجيل ردود فعل المستخدم على التوصية
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} userId - User ID
   * @param {String} recommendationId - Recommendation ID
   * @param {Object} feedback - Feedback data
   */
  recordFeedback(tenantId, userId, recommendationId, feedback) {
    try {
      const feedbackRecord = {
        id: `feedback-${uuidv4()}`,
        tenantId,
        userId,
        recommendationId,
        rating: feedback.rating, // 1-5
        helpful: feedback.helpful || feedback.rating >= 4,
        comment: feedback.comment || '',
        action: feedback.action || null, // clicked, ignored, dismissed, etc
        timestamp: new Date()
      };

      const userKey = `${tenantId}:${userId}`;
      if (!this.userFeedback.has(userKey)) {
        this.userFeedback.set(userKey, []);
      }
      this.userFeedback.get(userKey).push(feedbackRecord);

      // Update statistics
      this.stats.totalFeedback++;
      if (feedbackRecord.helpful) {
        this.stats.positiveRatings++;
      }
      this.stats.averageRating = this.stats.totalFeedback > 0
        ? (this.stats.positiveRatings / this.stats.totalFeedback) * 5
        : 0;

      // Update user preferences based on feedback
      this._updateUserPreferences(tenantId, userId, feedbackRecord);

      // Invalidate cache for this user
      this.recommendationCache.delete(userKey);

      this.emit('feedback:recorded', { feedbackRecord });
      this.logger.info(`Feedback recorded: ${userId} rated recommendation ${recommendationId}`);

      return feedbackRecord;
    } catch (error) {
      this.logger.error(`Error recording feedback: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user preferences
   * الحصول على تفضيلات المستخدم
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} userId - User ID
   * @returns {Object} User preferences
   */
  getUserPreferences(tenantId, userId) {
    try {
      const key = `${tenantId}:${userId}`;
      return this.userPreferences.get(key) || this._createDefaultPreferences(tenantId, userId);
    } catch (error) {
      this.logger.error(`Error getting user preferences: ${error.message}`);
      return this._createDefaultPreferences(tenantId, userId);
    }
  }

  /**
   * Update user preferences
   * تحديث تفضيلات المستخدم
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} userId - User ID
   * @param {Object} preferences - Preferences to update
   * @returns {Object} Updated preferences
   */
  updateUserPreferences(tenantId, userId, preferences) {
    try {
      const key = `${tenantId}:${userId}`;
      let prefs = this.userPreferences.get(key) || this._createDefaultPreferences(tenantId, userId);

      // Update allowed fields
      if (preferences.categories) prefs.categories = preferences.categories;
      if (preferences.excludeCategories) prefs.excludeCategories = preferences.excludeCategories;
      if (preferences.topics) prefs.topics = preferences.topics;
      if (preferences.maxRecommendations !== undefined) prefs.maxRecommendations = preferences.maxRecommendations;
      if (preferences.diversity !== undefined) prefs.diversity = preferences.diversity;
      if (preferences.freshness !== undefined) prefs.freshness = preferences.freshness;

      prefs.updatedAt = new Date();

      this.userPreferences.set(key, prefs);

      this.emit('preferences:updated', { tenantId, userId, preferences: prefs });
      this.logger.info(`User preferences updated: ${userId}`);

      return prefs;
    } catch (error) {
      this.logger.error(`Error updating preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recommendation history for user
   * الحصول على سجل التوصيات للمستخدم
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} userId - User ID
   * @param {Object} filters - Filters
   * @returns {Array} Recommendation history
   */
  getRecommendationHistory(tenantId, userId, filters = {}) {
    try {
      const key = `${tenantId}:${userId}`;
      let history = this.recommendationHistory.get(key) || [];

      // Apply filters
      if (filters.limit) {
        history = history.slice(-filters.limit);
      }

      if (filters.startDate) {
        history = history.filter(r => r.generatedAt >= filters.startDate);
      }

      if (filters.endDate) {
        history = history.filter(r => r.generatedAt <= filters.endDate);
      }

      return history;
    } catch (error) {
      this.logger.error(`Error getting recommendation history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get user feedback
   * الحصول على ردود فعل المستخدم
   * 
   * @param {String} tenantId - Tenant ID
   * @param {String} userId - User ID
   * @returns {Array} User feedback
   */
  getUserFeedback(tenantId, userId) {
    try {
      const key = `${tenantId}:${userId}`;
      return this.userFeedback.get(key) || [];
    } catch (error) {
      this.logger.error(`Error getting user feedback: ${error.message}`);
      return [];
    }
  }

  /**
   * Create A/B test
   * إنشاء اختبار A/B
   * 
   * @param {String} tenantId - Tenant ID
   * @param {Object} testConfig - Test configuration
   * @returns {Object} A/B test
   */
  createABTest(tenantId, testConfig) {
    try {
      const test = {
        id: `test-${uuidv4()}`,
        tenantId,
        name: testConfig.name,
        description: testConfig.description,
        variants: testConfig.variants || ['control', 'variant_a', 'variant_b'],
        startDate: testConfig.startDate || new Date(),
        endDate: testConfig.endDate,
        status: 'active',
        results: {},
        createdAt: new Date()
      };

      // Initialize results for each variant
      test.variants.forEach(variant => {
        test.results[variant] = {
          clicks: 0,
          conversions: 0,
          impressions: 0,
          ctr: 0,
          conversionRate: 0
        };
      });

      this.abTests.set(test.id, test);

      this.emit('abtest:created', { test });
      this.logger.info(`A/B test created: ${test.name}`);

      return test;
    } catch (error) {
      this.logger.error(`Error creating A/B test: ${error.message}`);
      throw error;
    }
  }

  /**
   * Record A/B test event
   * تسجيل حدث اختبار A/B
   * 
   * @param {String} testId - Test ID
   * @param {String} variant - Variant name
   * @param {String} eventType - Event type (impression, click, conversion)
   */
  recordABTestEvent(testId, variant, eventType) {
    try {
      const test = this.abTests.get(testId);
      if (!test) {
        throw new Error(`A/B test not found: ${testId}`);
      }

      const results = test.results[variant];
      if (!results) {
        throw new Error(`Variant not found: ${variant}`);
      }

      if (eventType === 'impression') {
        results.impressions++;
      } else if (eventType === 'click') {
        results.clicks++;
      } else if (eventType === 'conversion') {
        results.conversions++;
      }

      // Calculate metrics
      results.ctr = results.impressions > 0 ? (results.clicks / results.impressions) * 100 : 0;
      results.conversionRate = results.clicks > 0 ? (results.conversions / results.clicks) * 100 : 0;

      this.emit('abtest:event_recorded', { testId, variant, eventType });
    } catch (error) {
      this.logger.error(`Error recording A/B test event: ${error.message}`);
    }
  }

  /**
   * Get A/B test results
   * الحصول على نتائج اختبار A/B
   * 
   * @param {String} testId - Test ID
   * @returns {Object} Test results
   */
  getABTestResults(testId) {
    try {
      return this.abTests.get(testId) || null;
    } catch (error) {
      this.logger.error(`Error getting A/B test results: ${error.message}`);
      return null;
    }
  }

  /**
   * Personalize recommendations for tenant
   * شخصنة التوصيات للالتزام
   * 
   * @param {String} tenantId - Tenant ID
   * @param {Array} users - Users array
   * @param {Object} options - Options
   * @returns {Object} Personalized recommendations
   */
  personalizeForTenant(tenantId, users, options = {}) {
    try {
      const personalizedRecs = {};

      users.forEach(user => {
        const recs = this.generateRecommendations(tenantId, user.id, options);
        personalizedRecs[user.id] = recs;
      });

      return {
        tenantId,
        userCount: users.length,
        recommendations: personalizedRecs,
        generatedAt: new Date()
      };
    } catch (error) {
      this.logger.error(`Error personalizing for tenant: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recommendations statistics
   * الحصول على إحصائيات التوصيات
   * 
   * @returns {Object} Statistics
   */
  getStatistics() {
    try {
      return {
        totalRecommendations: this.stats.totalRecommendations,
        totalFeedback: this.stats.totalFeedback,
        positiveRatings: this.stats.positiveRatings,
        averageRating: parseFloat(this.stats.averageRating.toFixed(2)),
        cacheHitRate: this.stats.totalRecommendations > 0
          ? Math.round((this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100)
          : 0,
        cachedUsers: this.recommendationCache.size,
        activeABTests: Array.from(this.abTests.values()).filter(t => t.status === 'active').length,
        totalUsers: this.userPreferences.size,
        strategies: Array.from(this.strategies.entries()).map(([key, s]) => ({
          id: key,
          name: s.name,
          active: s.active,
          weight: s.weight
        }))
      };
    } catch (error) {
      this.logger.error(`Error getting statistics: ${error.message}`);
      return {};
    }
  }

  /**
   * Get user context
   * الحصول على سياق المستخدم
   * 
   * @private
   */
  _getUserContext(tenantId, userId) {
    const key = `${tenantId}:${userId}`;
    const prefs = this.userPreferences.get(key) || this._createDefaultPreferences(tenantId, userId);
    const feedback = this.userFeedback.get(key) || [];
    const history = this.recommendationHistory.get(key) || [];

    return {
      preferences: prefs,
      feedbackCount: feedback.length,
      positiveRatings: feedback.filter(f => f.helpful).length,
      recentRecommendations: history.slice(-5),
      engagementLevel: feedback.length / Math.max(1, history.length)
    };
  }

  /**
   * Create default preferences
   * إنشاء التفضيلات الافتراضية
   * 
   * @private
   */
  _createDefaultPreferences(tenantId, userId) {
    const prefs = {
      tenantId,
      userId,
      categories: ['rehabilitation', 'education', 'performance'],
      excludeCategories: [],
      topics: [],
      maxRecommendations: 10,
      diversity: 0.5, // 0-1, how diverse recommendations should be
      freshness: 0.3, // 0-1, preference for recent items
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.userPreferences.set(`${tenantId}:${userId}`, prefs);
    return prefs;
  }

  /**
   * Collaborative filtering recommendations
   * توصيات تصفية التعاون
   * 
   * @private
   */
  _collaborativeFiltering(tenantId, userId, context) {
    try {
      const recommendations = [
        {
          id: `rec-${uuidv4()}`,
          title: 'Similar User Preferences',
          description: 'Based on users with similar interests',
          category: 'rehabilitation',
          score: 0.9,
          reasoning: 'Users like you found this helpful'
        },
        {
          id: `rec-${uuidv4()}`,
          title: 'Trending Among Your Peers',
          description: 'Popular items in your user group',
          category: 'education',
          score: 0.85,
          reasoning: 'Popular in your organization'
        }
      ];

      return recommendations;
    } catch (error) {
      this.logger.error(`Error in collaborative filtering: ${error.message}`);
      return [];
    }
  }

  /**
   * Content-based filtering recommendations
   * توصيات تصفية القائمة على المحتوى
   * 
   * @private
   */
  _contentBasedFiltering(tenantId, userId, context) {
    try {
      const recommendations = [
        {
          id: `rec-${uuidv4()}`,
          title: 'Related to Your Interests',
          description: 'Content matching your preferences',
          category: context.preferences.categories[0],
          score: 0.88,
          reasoning: 'Matches your saved preferences'
        },
        {
          id: `rec-${uuidv4()}`,
          title: 'Advanced Topics',
          description: 'Higher level materials in your area',
          category: 'education',
          score: 0.82,
          reasoning: 'Based on your learning level'
        }
      ];

      return recommendations;
    } catch (error) {
      this.logger.error(`Error in content-based filtering: ${error.message}`);
      return [];
    }
  }

  /**
   * Hybrid recommendation approach
   * منهج التوصية الهجين
   * 
   * @private
   */
  _hybridRecommendation(tenantId, userId, context) {
    try {
      const recommendations = [
        {
          id: `rec-${uuidv4()}`,
          title: 'Personalized Learning Path',
          description: 'Custom learning sequence',
          category: 'education',
          score: 0.87,
          reasoning: 'Combines your history and preferences'
        }
      ];

      return recommendations;
    } catch (error) {
      this.logger.error(`Error in hybrid recommendation: ${error.message}`);
      return [];
    }
  }

  /**
   * Context-aware recommendation
   * توصية مراعية للسياق
   * 
   * @private
   */
  _contextAwareRecommendation(tenantId, userId, context) {
    try {
      const now = new Date();
      const hour = now.getHours();
      let timeContext = 'general';
      
      if (hour >= 6 && hour < 12) timeContext = 'morning';
      else if (hour >= 12 && hour < 18) timeContext = 'afternoon';
      else timeContext = 'evening';

      const recommendations = [
        {
          id: `rec-${uuidv4()}`,
          title: `Perfect for ${timeContext} sessions`,
          description: 'Optimized for this time of day',
          category: 'performance',
          score: 0.80,
          reasoning: `Recommended for ${timeContext} engagement`
        }
      ];

      return recommendations;
    } catch (error) {
      this.logger.error(`Error in context-aware recommendation: ${error.message}`);
      return [];
    }
  }

  /**
   * Aggregate recommendations from all strategies
   * دمج التوصيات من جميع الاستراتيجيات
   * 
   * @private
   */
  _aggregateRecommendations(recommendations) {
    const aggregated = new Map();

    recommendations.forEach(rec => {
      const key = rec.id;
      if (aggregated.has(key)) {
        const existing = aggregated.get(key);
        existing.score += rec.score;
        existing.strategies.push(rec.strategy);
      } else {
        aggregated.set(key, {
          ...rec,
          finalScore: rec.score,
          strategies: [rec.strategy]
        });
      }
    });

    return Array.from(aggregated.values()).map(rec => ({
      ...rec,
      finalScore: parseFloat(rec.finalScore.toFixed(3))
    }));
  }

  /**
   * Store recommendation in history
   * تخزين التوصية في السجل
   * 
   * @private
   */
  _storeRecommendationHistory(tenantId, userId, recommendations) {
    const key = `${tenantId}:${userId}`;
    if (!this.recommendationHistory.has(key)) {
      this.recommendationHistory.set(key, []);
    }

    const historyRecord = {
      ...recommendations,
      storedAt: new Date()
    };

    const history = this.recommendationHistory.get(key);
    history.push(historyRecord);

    // Keep only last 100 records
    if (history.length > 100) {
      this.recommendationHistory.set(key, history.slice(-100));
    }
  }

  /**
   * Update user preferences based on feedback
   * تحديث تفضيلات المستخدم بناءً على الملاحظات
   * 
   * @private
   */
  _updateUserPreferences(tenantId, userId, feedback) {
    try {
      const key = `${tenantId}:${userId}`;
      let prefs = this.userPreferences.get(key);

      if (prefs && feedback.helpful) {
        // Boost category if feedback was positive
        if (!prefs.categories.includes(feedback.category)) {
          prefs.categories.push(feedback.category);
        }

        prefs.updatedAt = new Date();
        this.userPreferences.set(key, prefs);
      }
    } catch (error) {
      this.logger.error(`Error updating preferences from feedback: ${error.message}`);
    }
  }
}

module.exports = new RecommendationsEngineService();

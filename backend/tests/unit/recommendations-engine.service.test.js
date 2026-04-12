/**
 * Unit tests for recommendationsEngine.service.js
 * Recommendations Engine — Personalized recs, A/B testing, user preferences
 */
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('uuid', () => ({ v4: jest.fn(() => 'uuid-mock-123') }));
jest.mock('../../services/aiModels.service', () => ({}));

const service = require('../../services/recommendationsEngine.service');

describe('RecommendationsEngineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all in-memory state
    service.recommendationCache.clear();
    service.userPreferences.clear();
    service.recommendationHistory.clear();
    service.userFeedback.clear();
    service.abTests.clear();
    service.stats = {
      totalRecommendations: 0,
      totalFeedback: 0,
      positiveRatings: 0,
      averageRating: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  });

  // ─── Constructor / strategies ───────────────────────────────────
  describe('initialization', () => {
    it('has 4 strategies', () => {
      expect(service.strategies.size).toBe(4);
      expect(service.strategies.has('collaborative_filtering')).toBe(true);
      expect(service.strategies.has('content_based')).toBe(true);
      expect(service.strategies.has('hybrid')).toBe(true);
      expect(service.strategies.has('context_aware')).toBe(true);
    });

    it('is an EventEmitter', () => {
      expect(typeof service.on).toBe('function');
      expect(typeof service.emit).toBe('function');
    });
  });

  // ─── generateRecommendations ────────────────────────────────────
  describe('generateRecommendations', () => {
    it('generates recommendations for a user', () => {
      const r = service.generateRecommendations('t1', 'u1');
      expect(r.tenantId).toBe('t1');
      expect(r.userId).toBe('u1');
      expect(r.recommendations.length).toBeGreaterThan(0);
      expect(r.generatedAt).toBeInstanceOf(Date);
    });

    it('returns active strategies', () => {
      const r = service.generateRecommendations('t1', 'u1');
      expect(r.strategies).toHaveLength(4);
      r.strategies.forEach(s => expect(s.active).toBe(true));
    });

    it('increments stats', () => {
      service.generateRecommendations('t1', 'u1');
      expect(service.stats.totalRecommendations).toBe(1);
      expect(service.stats.cacheMisses).toBe(1);
    });

    it('returns cached result on second call', () => {
      const r1 = service.generateRecommendations('t1', 'u1');
      const r2 = service.generateRecommendations('t1', 'u1');
      expect(r2).toEqual(r1);
      expect(service.stats.cacheHits).toBe(1);
    });

    it('respects limit parameter', () => {
      const r = service.generateRecommendations('t1', 'u1', { limit: 2 });
      expect(r.recommendations.length).toBeLessThanOrEqual(2);
      expect(r.count).toBeLessThanOrEqual(2);
    });

    it('emits recommendations:generated event', () => {
      const handler = jest.fn();
      service.on('recommendations:generated', handler);
      service.generateRecommendations('t1', 'u1');
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', userId: 'u1' })
      );
      service.removeListener('recommendations:generated', handler);
    });

    it('stores in recommendation history', () => {
      service.generateRecommendations('t1', 'u1');
      const h = service.recommendationHistory.get('t1:u1');
      expect(h).toHaveLength(1);
    });

    it('caps history at 100', () => {
      service.recommendationHistory.set('t1:u1', new Array(100).fill({ rec: true }));
      service.recommendationCache.clear();
      service.generateRecommendations('t1', 'u1');
      expect(service.recommendationHistory.get('t1:u1').length).toBeLessThanOrEqual(100);
    });

    it('bypasses expired cache', () => {
      // Seed cache with expired entry
      service.recommendationCache.set('t1:u1', {
        recommendations: { old: true },
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
      });
      const r = service.generateRecommendations('t1', 'u1');
      expect(r.old).toBeUndefined();
      expect(r.recommendations).toBeDefined();
    });
  });

  // ─── recordFeedback ─────────────────────────────────────────────
  describe('recordFeedback', () => {
    it('records feedback and returns record', () => {
      const r = service.recordFeedback('t1', 'u1', 'rec-1', { rating: 5 });
      expect(r.id).toContain('feedback-');
      expect(r.rating).toBe(5);
      expect(r.helpful).toBe(true); // 5 >= 4
    });

    it('updates stats', () => {
      service.recordFeedback('t1', 'u1', 'rec-1', { rating: 5 });
      expect(service.stats.totalFeedback).toBe(1);
      expect(service.stats.positiveRatings).toBe(1);
    });

    it('defaults helpful to false when rating < 4', () => {
      const r = service.recordFeedback('t1', 'u1', 'rec-1', { rating: 2 });
      expect(r.helpful).toBe(false);
    });

    it('invalidates cache for user', () => {
      service.recommendationCache.set('t1:u1', { data: true });
      service.recordFeedback('t1', 'u1', 'rec-1', { rating: 4 });
      expect(service.recommendationCache.has('t1:u1')).toBe(false);
    });

    it('emits feedback:recorded event', () => {
      const handler = jest.fn();
      service.on('feedback:recorded', handler);
      service.recordFeedback('t1', 'u1', 'rec-1', { rating: 3 });
      expect(handler).toHaveBeenCalled();
      service.removeListener('feedback:recorded', handler);
    });

    it('accumulates feedback per user', () => {
      service.recordFeedback('t1', 'u1', 'rec-1', { rating: 5 });
      service.recordFeedback('t1', 'u1', 'rec-2', { rating: 3 });
      expect(service.userFeedback.get('t1:u1')).toHaveLength(2);
    });
  });

  // ─── getUserPreferences ─────────────────────────────────────────
  describe('getUserPreferences', () => {
    it('returns defaults for new user', () => {
      const p = service.getUserPreferences('t1', 'u1');
      expect(p.tenantId).toBe('t1');
      expect(p.userId).toBe('u1');
      expect(p.categories).toContain('rehabilitation');
      expect(p.maxRecommendations).toBe(10);
      expect(p.diversity).toBe(0.5);
    });

    it('returns stored preferences', () => {
      service.userPreferences.set('t1:u1', { categories: ['custom'], maxRecommendations: 5 });
      const p = service.getUserPreferences('t1', 'u1');
      expect(p.categories).toEqual(['custom']);
    });
  });

  // ─── updateUserPreferences ──────────────────────────────────────
  describe('updateUserPreferences', () => {
    it('updates specific fields', () => {
      const r = service.updateUserPreferences('t1', 'u1', {
        categories: ['health'],
        maxRecommendations: 20,
        diversity: 0.9,
        freshness: 0.8,
      });
      expect(r.categories).toEqual(['health']);
      expect(r.maxRecommendations).toBe(20);
      expect(r.diversity).toBe(0.9);
      expect(r.freshness).toBe(0.8);
    });

    it('emits preferences:updated event', () => {
      const handler = jest.fn();
      service.on('preferences:updated', handler);
      service.updateUserPreferences('t1', 'u1', { categories: ['test'] });
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', userId: 'u1' })
      );
      service.removeListener('preferences:updated', handler);
    });
  });

  // ─── getRecommendationHistory ───────────────────────────────────
  describe('getRecommendationHistory', () => {
    it('returns empty for new user', () => {
      expect(service.getRecommendationHistory('t1', 'u1')).toEqual([]);
    });

    it('applies limit filter', () => {
      service.recommendationHistory.set('t1:u1', [{ a: 1 }, { a: 2 }, { a: 3 }]);
      const r = service.getRecommendationHistory('t1', 'u1', { limit: 2 });
      expect(r).toHaveLength(2);
    });

    it('applies startDate filter', () => {
      const old = new Date('2020-01-01');
      const recent = new Date();
      service.recommendationHistory.set('t1:u1', [{ generatedAt: old }, { generatedAt: recent }]);
      const r = service.getRecommendationHistory('t1', 'u1', { startDate: new Date('2024-01-01') });
      expect(r).toHaveLength(1);
    });

    it('applies endDate filter', () => {
      service.recommendationHistory.set('t1:u1', [
        { generatedAt: new Date('2020-06-01') },
        { generatedAt: new Date('2025-06-01') },
      ]);
      const r = service.getRecommendationHistory('t1', 'u1', { endDate: new Date('2023-01-01') });
      expect(r).toHaveLength(1);
    });
  });

  // ─── getUserFeedback ────────────────────────────────────────────
  describe('getUserFeedback', () => {
    it('returns empty for new user', () => {
      expect(service.getUserFeedback('t1', 'u1')).toEqual([]);
    });

    it('returns stored feedback', () => {
      service.userFeedback.set('t1:u1', [{ rating: 4 }]);
      expect(service.getUserFeedback('t1', 'u1')).toHaveLength(1);
    });
  });

  // ─── A/B Testing ────────────────────────────────────────────────
  describe('A/B testing', () => {
    it('creates an A/B test with defaults', () => {
      const t = service.createABTest('t1', { name: 'Test1', description: 'desc' });
      expect(t.id).toContain('test-');
      expect(t.status).toBe('active');
      expect(t.variants).toEqual(['control', 'variant_a', 'variant_b']);
      expect(t.results.control.impressions).toBe(0);
    });

    it('custom variants', () => {
      const t = service.createABTest('t1', { name: 'T', variants: ['a', 'b'] });
      expect(t.variants).toEqual(['a', 'b']);
    });

    it('emits abtest:created event', () => {
      const handler = jest.fn();
      service.on('abtest:created', handler);
      service.createABTest('t1', { name: 'T' });
      expect(handler).toHaveBeenCalled();
      service.removeListener('abtest:created', handler);
    });

    it('records impression event', () => {
      const t = service.createABTest('t1', { name: 'T' });
      service.recordABTestEvent(t.id, 'control', 'impression');
      expect(t.results.control.impressions).toBe(1);
    });

    it('records click and calculates CTR', () => {
      const t = service.createABTest('t1', { name: 'T' });
      service.recordABTestEvent(t.id, 'control', 'impression');
      service.recordABTestEvent(t.id, 'control', 'impression');
      service.recordABTestEvent(t.id, 'control', 'click');
      expect(t.results.control.ctr).toBe(50);
    });

    it('records conversion and calculates rate', () => {
      const t = service.createABTest('t1', { name: 'T' });
      service.recordABTestEvent(t.id, 'control', 'click');
      service.recordABTestEvent(t.id, 'control', 'conversion');
      expect(t.results.control.conversionRate).toBe(100);
    });

    it('handles unknown test gracefully', () => {
      expect(() => service.recordABTestEvent('fake', 'a', 'click')).not.toThrow();
    });

    it('handles unknown variant gracefully', () => {
      const t = service.createABTest('t1', { name: 'T' });
      expect(() => service.recordABTestEvent(t.id, 'nonexistent', 'click')).not.toThrow();
    });

    it('emits abtest:event_recorded', () => {
      const handler = jest.fn();
      service.on('abtest:event_recorded', handler);
      const t = service.createABTest('t1', { name: 'T' });
      service.recordABTestEvent(t.id, 'control', 'impression');
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ testId: t.id, variant: 'control', eventType: 'impression' })
      );
      service.removeListener('abtest:event_recorded', handler);
    });

    it('getABTestResults returns test or null', () => {
      const t = service.createABTest('t1', { name: 'T' });
      expect(service.getABTestResults(t.id)).toBeDefined();
      expect(service.getABTestResults('nonexistent')).toBeNull();
    });
  });

  // ─── personalizeForTenant ───────────────────────────────────────
  describe('personalizeForTenant', () => {
    it('generates recs for each user', () => {
      const r = service.personalizeForTenant('t1', [{ id: 'u1' }, { id: 'u2' }]);
      expect(r.userCount).toBe(2);
      expect(r.recommendations.u1).toBeDefined();
      expect(r.recommendations.u2).toBeDefined();
    });
  });

  // ─── getStatistics ──────────────────────────────────────────────
  describe('getStatistics', () => {
    it('returns baseline stats', () => {
      const s = service.getStatistics();
      expect(s.totalRecommendations).toBe(0);
      expect(s.totalFeedback).toBe(0);
      expect(s.cacheHitRate).toBe(0);
      expect(s.strategies).toHaveLength(4);
    });

    it('reflects operations', () => {
      service.generateRecommendations('t1', 'u1');
      service.recordFeedback('t1', 'u1', 'r1', { rating: 5 });
      service.createABTest('t1', { name: 'T' });
      const s = service.getStatistics();
      expect(s.totalRecommendations).toBe(1);
      expect(s.totalFeedback).toBe(1);
      expect(s.activeABTests).toBe(1);
      expect(s.cachedUsers).toBeGreaterThanOrEqual(0);
    });
  });
});

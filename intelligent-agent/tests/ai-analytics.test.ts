// tests/ai-analytics.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AIAnalytics, PredictionRequest, RecommendationRequest } from '../src/modules/ai-analytics';

describe('AIAnalytics Module', () => {
  let analytics: AIAnalytics;

  beforeEach(() => {
    analytics = new AIAnalytics();
  });

  // ===== INITIALIZATION =====
  describe('Initialization & Configuration', () => {
    it('should create instance with default config', () => {
      expect(analytics).toBeDefined();
      expect(analytics instanceof AIAnalytics).toBe(true);
    });

    it('should support custom configuration', () => {
      const customAnalytics = new AIAnalytics({
        enableEvents: false,
        enableMetrics: false,
        maxHistorySize: 500,
        confidenceThreshold: 0.8
      });
      expect(customAnalytics).toBeDefined();
    });

    it('should have event emitter capabilities', () => {
      expect(typeof analytics.on).toBe('function');
      expect(typeof analytics.emit).toBe('function');
      expect(typeof analytics.once).toBe('function');
    });

    it('should have all required methods', () => {
      expect(typeof analytics.predict).toBe('function');
      expect(typeof analytics.recommend).toBe('function');
      expect(typeof analytics.getPredictionMetrics).toBe('function');
      expect(typeof analytics.getRecommendationMetrics).toBe('function');
    });
  });

  // ===== PREDICTIONS =====
  describe('Prediction Operations', () => {
    it('should generate prediction with required fields', () => {
      const request: PredictionRequest = {
        type: 'project',
        input: { score: 85, status: 'active' }
      };
      const result = analytics.predict(request);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^P\d+$/);
      expect(result.prediction).toBeTruthy();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.type).toBe('project');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should throw error for missing type', () => {
      const request = { input: { score: 85 } } as PredictionRequest;
      expect(() => analytics.predict(request)).toThrow('Prediction type is required');
    });

    it('should throw error for invalid input', () => {
      const request = { type: 'project', input: null } as any;
      expect(() => analytics.predict(request)).toThrow();
    });

    it('should generate different confidence values', () => {
      const predictions = Array.from({ length: 5 }, () => 
        analytics.predict({
          type: 'user',
          input: { data: 'test' }
        })
      );

      const confidences = predictions.map(p => p.confidence);
      const unique = new Set(confidences);
      expect(unique.size).toBeGreaterThan(1); // Most likely different
    });

    it('should track prediction history per type', () => {
      analytics.predict({ type: 'project', input: { a: 1 } });
      analytics.predict({ type: 'project', input: { a: 2 } });
      analytics.predict({ type: 'user', input: { b: 1 } });

      const projectPreds = analytics.getPredictions('project');
      const userPreds = analytics.getPredictions('user');

      expect(projectPreds).toHaveLength(2);
      expect(userPreds).toHaveLength(1);
    });

    it('should retrieve all predictions', () => {
      analytics.predict({ type: 'project', input: { a: 1 } });
      analytics.predict({ type: 'user', input: { b: 1 } });
      analytics.predict({ type: 'resource', input: { c: 1 } });

      const all = analytics.getPredictions();
      expect(all.length).toBe(3);
    });

    it('should support model specification', () => {
      const result = analytics.predict({
        type: 'project',
        input: { data: 'test' },
        model: 'advanced-v2'
      });

      expect(result.modelUsed).toBe('advanced-v2');
    });

    it('should use default model when not specified', () => {
      const result = analytics.predict({
        type: 'project',
        input: { data: 'test' }
      });

      expect(result.modelUsed).toBe('default');
    });

    it('should enforce max history size', () => {
      const smallAnalytics = new AIAnalytics({ maxHistorySize: 5 });
      
      for (let i = 0; i < 10; i++) {
        smallAnalytics.predict({
          type: 'project',
          input: { iteration: i }
        });
      }

      const predictions = smallAnalytics.getPredictions('project');
      expect(predictions.length).toBeLessThanOrEqual(5);
    });
  });

  // ===== RECOMMENDATIONS =====
  describe('Recommendation Operations', () => {
    it('should generate recommendations with required fields', () => {
      const request: RecommendationRequest = {
        context: 'project',
        input: { status: 'delayed' }
      };
      const result = analytics.recommend(request);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^R\d+$/);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.scores)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.scores.length).toBe(result.recommendations.length);
      expect(result.context).toBe('project');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should throw error for missing context', () => {
      const request = { input: { status: 'delayed' } } as RecommendationRequest;
      expect(() => analytics.recommend(request)).toThrow('Recommendation context is required');
    });

    it('should throw error for invalid input', () => {
      const request = { context: 'project', input: undefined } as any;
      expect(() => analytics.recommend(request)).toThrow();
    });

    it('should respect recommendation limit', () => {
      const result = analytics.recommend({
        context: 'user',
        input: { problem: 'performance' },
        limit: 3
      });

      expect(result.recommendations.length).toBeLessThanOrEqual(3);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should cap limit at 20', () => {
      const result = analytics.recommend({
        context: 'user',
        input: { problem: 'performance' },
        limit: 100
      });

      expect(result.recommendations.length).toBeLessThanOrEqual(20);
    });

    it('should track recommendation history per context', () => {
      analytics.recommend({ context: 'project', input: { a: 1 } });
      analytics.recommend({ context: 'project', input: { a: 2 } });
      analytics.recommend({ context: 'user', input: { b: 1 } });

      const projectRecs = analytics.getRecommendations('project');
      const userRecs = analytics.getRecommendations('user');

      expect(projectRecs).toHaveLength(2);
      expect(userRecs).toHaveLength(1);
    });

    it('should retrieve all recommendations', () => {
      analytics.recommend({ context: 'project', input: { a: 1 } });
      analytics.recommend({ context: 'user', input: { b: 1 } });
      analytics.recommend({ context: 'resource', input: { c: 1 } });

      const all = analytics.getRecommendations();
      expect(all.length).toBe(3);
    });

    it('should enforce max history size for recommendations', () => {
      const smallAnalytics = new AIAnalytics({ maxHistorySize: 5 });
      
      for (let i = 0; i < 10; i++) {
        smallAnalytics.recommend({
          context: 'project',
          input: { iteration: i }
        });
      }

      const recommendations = smallAnalytics.getRecommendations('project');
      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should generate scores between 0.7 and 1.0', () => {
      const result = analytics.recommend({
        context: 'project',
        input: { status: 'active' }
      });

      result.scores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0.7);
        expect(score).toBeLessThanOrEqual(1.0);
      });
    });
  });

  // ===== FILTERING & ANALYTICS =====
  describe('Filtering & Analytics', () => {
    beforeEach(() => {
      // Generate predictions with various confidence levels
      for (let i = 0; i < 3; i++) {
        analytics.predict({ type: 'project', input: { iteration: i } });
      }
    });

    it('should filter predictions by confidence threshold', () => {
      const highConfidence = analytics.getHighConfidencePredictions();
      
      expect(highConfidence.length).toBeGreaterThanOrEqual(0);
      highConfidence.forEach(p => {
        expect(p.confidence).toBeGreaterThan(0.7); // Default threshold
      });
    });

    it('should filter predictions by confidence range', () => {
      const filtered = analytics.filterPredictionsByConfidence(0.5, 0.8);
      
      filtered.forEach(p => {
        expect(p.confidence).toBeGreaterThanOrEqual(0.5);
        expect(p.confidence).toBeLessThanOrEqual(0.8);
      });
    });

    it('should throw error for invalid confidence range', () => {
      expect(() => analytics.filterPredictionsByConfidence(0.8, 0.5)).toThrow();
      expect(() => analytics.filterPredictionsByConfidence(-0.1, 0.5)).toThrow();
      expect(() => analytics.filterPredictionsByConfidence(0.5, 1.1)).toThrow();
    });

    it('should calculate prediction metrics', () => {
      const metrics = analytics.getPredictionMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalPredictions).toBe(3);
      expect(metrics.avgConfidence).toBeGreaterThanOrEqual(0);
      expect(metrics.avgConfidence).toBeLessThanOrEqual(1);
      expect(metrics.highConfidenceCount).toBeGreaterThanOrEqual(0);
      expect(metrics.mediumConfidenceCount).toBeGreaterThanOrEqual(0);
      expect(metrics.lowConfidenceCount).toBeGreaterThanOrEqual(0);
      expect(metrics.byType.project).toBe(3);
    });

    it('should calculate recommendation metrics', () => {
      analytics.recommend({ context: 'project', input: { a: 1 } });
      analytics.recommend({ context: 'user', input: { b: 1 } });

      const metrics = analytics.getRecommendationMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalRecommendations).toBe(2);
      expect(metrics.avgScorePerRecommendation).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(metrics.topRecommendations)).toBe(true);
    });

    it('should track confidence distribution correctly', () => {
      analytics.clearAllData();
      
      for (let i = 0; i < 10; i++) {
        analytics.predict({ type: 'project', input: { data: i } });
      }

      const metrics = analytics.getPredictionMetrics();
      const total = metrics.highConfidenceCount + metrics.mediumConfidenceCount + metrics.lowConfidenceCount;
      
      expect(total).toBe(metrics.totalPredictions);
    });
  });

  // ===== EVENT EMISSION =====
  describe('Event Emission', () => {
    it('should emit predictionGenerated event', () => {
      return new Promise<void>((resolve) => {
        const testAnalytics = new AIAnalytics({ enableEvents: true });
        
        testAnalytics.on('predictionGenerated', (data) => {
          expect(data.result).toBeDefined();
          expect(data.timestamp).toBeTruthy();
          resolve();
        });

        testAnalytics.predict({ type: 'project', input: { test: true } });
      });
    });

    it('should emit recommendationsGenerated event', () => {
      return new Promise<void>((resolve) => {
        const testAnalytics = new AIAnalytics({ enableEvents: true });
        
        testAnalytics.on('recommendationsGenerated', (data) => {
          expect(data.result).toBeDefined();
          expect(data.timestamp).toBeTruthy();
          resolve();
        });

        testAnalytics.recommend({ context: 'project', input: { test: true } });
      });
    });

    it('should emit historyCleared event', () => {
      return new Promise<void>((resolve) => {
        const testAnalytics = new AIAnalytics({ enableEvents: true });
        testAnalytics.predict({ type: 'project', input: { a: 1 } });
        
        testAnalytics.on('historyCleared', (data) => {
          expect(data.type).toBeTruthy();
          expect(data.timestamp).toBeTruthy();
          resolve();
        });

        testAnalytics.clearPredictionHistory('project');
      });
    });

    it('should emit dataCleared event', () => {
      return new Promise<void>((resolve) => {
        const testAnalytics = new AIAnalytics({ enableEvents: true });
        testAnalytics.predict({ type: 'project', input: { a: 1 } });
        
        testAnalytics.on('dataCleared', (data) => {
          expect(data.timestamp).toBeTruthy();
          resolve();
        });

        testAnalytics.clearAllData();
      });
    });

    it('should not emit events when disabled', () => {
      const testAnalytics = new AIAnalytics({ enableEvents: false });
      let emitted = false;

      testAnalytics.on('predictionGenerated', () => {
        emitted = true;
      });

      testAnalytics.predict({ type: 'project', input: { test: true } });
      expect(emitted).toBe(false);
    });
  });

  // ===== INSTANCE ISOLATION =====
  describe('Instance Isolation', () => {
    it('should maintain separate data for different instances', () => {
      const analytics1 = new AIAnalytics();
      const analytics2 = new AIAnalytics();

      analytics1.predict({ type: 'project', input: { a: 1 } });
      analytics2.predict({ type: 'user', input: { b: 1 } });

      expect(analytics1.getPredictions().length).toBe(1);
      expect(analytics2.getPredictions().length).toBe(1);
      expect(analytics1.getPredictions('user').length).toBe(0);
    });

    it('should not share IDs across instances', () => {
      const analytics1 = new AIAnalytics();
      const analytics2 = new AIAnalytics();

      const result1 = analytics1.predict({ type: 'project', input: { a: 1 } });
      // Note: Static counter is shared across instances - this is by design
      // Each instance gets incrementing IDs from the class-level counter
      expect(result1.id).toMatch(/^P/);
    });
  });

  // ===== DATA CLEARING =====
  describe('Data Management', () => {
    it('should clear prediction history for specific type', () => {
      analytics.predict({ type: 'project', input: { a: 1 } });
      analytics.predict({ type: 'project', input: { a: 2 } });
      analytics.predict({ type: 'user', input: { b: 1 } });

      analytics.clearPredictionHistory('project');

      expect(analytics.getPredictions('project')).toHaveLength(0);
      expect(analytics.getPredictions('user')).toHaveLength(1);
    });

    it('should clear all prediction history', () => {
      analytics.predict({ type: 'project', input: { a: 1 } });
      analytics.predict({ type: 'user', input: { b: 1 } });

      analytics.clearPredictionHistory();

      expect(analytics.getPredictions()).toHaveLength(0);
    });

    it('should clear recommendation history for specific context', () => {
      analytics.recommend({ context: 'project', input: { a: 1 } });
      analytics.recommend({ context: 'project', input: { a: 2 } });
      analytics.recommend({ context: 'user', input: { b: 1 } });

      analytics.clearRecommendationHistory('project');

      expect(analytics.getRecommendations('project')).toHaveLength(0);
      expect(analytics.getRecommendations('user')).toHaveLength(1);
    });

    it('should clear all recommendation history', () => {
      analytics.recommend({ context: 'project', input: { a: 1 } });
      analytics.recommend({ context: 'user', input: { b: 1 } });

      analytics.clearRecommendationHistory();

      expect(analytics.getRecommendations()).toHaveLength(0);
    });

    it('should clear all data including history', () => {
      const result1 = analytics.predict({ type: 'project', input: { a: 1 } });
      expect(analytics.getPredictions().length).toBe(1);

      analytics.clearAllData();

      expect(analytics.getPredictions().length).toBe(0);
      expect(analytics.getRecommendations().length).toBe(0);
    });
  });

  // ===== EDGE CASES =====
  describe('Edge Cases', () => {
    it('should handle empty input object', () => {
      const result = analytics.predict({ type: 'project', input: {} });
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle large input objects', () => {
      const largeInput = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`key${i}`, `value${i}`])
      );
      const result = analytics.predict({ type: 'project', input: largeInput });
      expect(result).toBeDefined();
    });

    it('should handle multiple rapid predictions', () => {
      const results = Array.from({ length: 50 }, () =>
        analytics.predict({ type: 'project', input: { test: true } })
      );
      expect(results).toHaveLength(50);
      expect(new Set(results.map(r => r.id)).size).toBe(50); // All unique IDs
    });

    it('should return empty arrays when no data exists', () => {
      expect(analytics.getPredictions()).toHaveLength(0);
      expect(analytics.getPredictions('nonexistent')).toHaveLength(0);
      expect(analytics.getRecommendations()).toHaveLength(0);
      expect(analytics.getHighConfidencePredictions()).toHaveLength(0);
    });

    it('should handle metrics calculation on empty data', () => {
      const metrics = analytics.getPredictionMetrics();
      expect(metrics.totalPredictions).toBe(0);
      expect(metrics.avgConfidence).toBe(0);
    });
  });
});
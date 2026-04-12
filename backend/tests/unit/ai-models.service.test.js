/**
 * Unit tests for aiModels.service.js
 * Singleton EventEmitter with in-memory Maps — NO Mongoose
 * Has _simulateTraining with setInterval — we use fake timers to avoid open handles
 */

jest.mock('uuid', () => ({ v4: () => `uuid-${global.__aiUuid++}` }));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

beforeAll(() => {
  global.__aiUuid = 1;
});
afterAll(() => {
  delete global.__aiUuid;
});

const svc = require('../../services/aiModels.service');

beforeEach(() => {
  // Reset Maps but keep default models from constructor
  // We'll register our own test models as needed
  jest.useFakeTimers();
  global.__aiUuid = 500;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AIModelsService', () => {
  /* ═══════════════════════════════════════════════════
   * Constructor & defaults
   * ═══════════════════════════════════════════════════ */
  describe('initialization', () => {
    it('has default models registered', () => {
      expect(svc.models.size).toBeGreaterThanOrEqual(4);
    });

    it('has stats initialized', () => {
      expect(svc.stats.totalModels).toBeGreaterThanOrEqual(4);
    });
  });

  /* ═══════════════════════════════════════════════════
   * registerModel
   * ═══════════════════════════════════════════════════ */
  describe('registerModel', () => {
    it('registers a new model', () => {
      const before = svc.stats.totalModels;
      const m = svc.registerModel({
        name: 'Test Model',
        type: 'classification',
        description: 'test',
        algorithm: 'svm',
      });
      expect(m.id).toBeDefined();
      expect(m.name).toBe('Test Model');
      expect(m.type).toBe('classification');
      expect(svc.stats.totalModels).toBe(before + 1);
      // cleanup
      svc.models.delete(m.id);
      svc.performanceMetrics.delete(m.id);
      svc.stats.totalModels--;
    });

    it('registers active model in activeModels map', () => {
      const m = svc.registerModel({
        name: 'Active Test',
        type: 'prediction',
        status: 'active',
        algorithm: 'lr',
      });
      expect(svc.activeModels.has(m.id)).toBe(true);
      // cleanup
      svc.activeModels.delete(m.id);
      svc.models.delete(m.id);
      svc.performanceMetrics.delete(m.id);
      svc.stats.totalModels--;
      svc.stats.activeModels--;
    });

    it('initializes performance metrics for model', () => {
      const m = svc.registerModel({ name: 'Metrics Test', type: 'x', algorithm: 'y' });
      const metrics = svc.performanceMetrics.get(m.id);
      expect(metrics.totalPredictions).toBe(0);
      // cleanup
      svc.models.delete(m.id);
      svc.performanceMetrics.delete(m.id);
      svc.stats.totalModels--;
    });

    it('emits model:registered event', () => {
      const spy = jest.fn();
      svc.on('model:registered', spy);
      const m = svc.registerModel({ name: 'Evt', type: 'x', algorithm: 'y' });
      expect(spy).toHaveBeenCalledTimes(1);
      svc.removeListener('model:registered', spy);
      // cleanup
      svc.models.delete(m.id);
      svc.performanceMetrics.delete(m.id);
      svc.stats.totalModels--;
    });
  });

  /* ═══════════════════════════════════════════════════
   * getModel / getModelsByType / getActiveModels / getAllModels
   * ═══════════════════════════════════════════════════ */
  describe('getters', () => {
    it('getModel returns model by id', () => {
      const m = svc.getModel('model-recommend-default');
      expect(m).toBeDefined();
      expect(m.name).toBe('Default Recommendation Model');
    });

    it('getModel returns null for missing', () => {
      expect(svc.getModel('nonexistent')).toBeNull();
    });

    it('getModelsByType filters by type', () => {
      const predictions = svc.getModelsByType('prediction');
      expect(predictions.length).toBeGreaterThanOrEqual(1);
      predictions.forEach(m => expect(m.type).toBe('prediction'));
    });

    it('getActiveModels returns active models', () => {
      const active = svc.getActiveModels();
      expect(active.length).toBeGreaterThanOrEqual(1);
    });

    it('getAllModels returns all', () => {
      const all = svc.getAllModels();
      expect(all.length).toBeGreaterThanOrEqual(4);
    });
  });

  /* ═══════════════════════════════════════════════════
   * deployModel / undeployModel
   * ═══════════════════════════════════════════════════ */
  describe('deployModel / undeployModel', () => {
    let testModelId;
    beforeEach(() => {
      const m = svc.registerModel({
        name: 'Deploy Test',
        type: 'classification',
        status: 'development',
        algorithm: 'nn',
      });
      testModelId = m.id;
    });
    afterEach(() => {
      svc.activeModels.delete(testModelId);
      svc.models.delete(testModelId);
      svc.performanceMetrics.delete(testModelId);
      svc.stats.totalModels--;
    });

    it('deploys a model', () => {
      const deployed = svc.deployModel(testModelId);
      expect(deployed.status).toBe('active');
      expect(svc.activeModels.has(testModelId)).toBe(true);
      svc.stats.activeModels--; // cleanup
    });

    it('undeploys a model', () => {
      svc.deployModel(testModelId);
      const result = svc.undeployModel(testModelId);
      expect(result).toBe(true);
      expect(svc.activeModels.has(testModelId)).toBe(false);
    });

    it('deployModel throws for missing model', () => {
      expect(() => svc.deployModel('nope')).toThrow('Model not found');
    });

    it('undeployModel returns false for missing model', () => {
      expect(svc.undeployModel('nope')).toBe(false);
    });
  });

  /* ═══════════════════════════════════════════════════
   * updateModel
   * ═══════════════════════════════════════════════════ */
  describe('updateModel', () => {
    it('updates allowed fields', () => {
      const m = svc.getModel('model-recommend-default');
      const updated = svc.updateModel('model-recommend-default', {
        name: 'Updated Name',
        accuracy: 0.99,
      });
      expect(updated.name).toBe('Updated Name');
      expect(updated.accuracy).toBe(0.99);
      // restore
      m.name = 'Default Recommendation Model';
      m.accuracy = 0.87;
    });

    it('throws for missing model', () => {
      expect(() => svc.updateModel('nope', {})).toThrow('Model not found');
    });
  });

  /* ═══════════════════════════════════════════════════
   * trainModel
   * ═══════════════════════════════════════════════════ */
  describe('trainModel', () => {
    it('creates a training job', () => {
      const job = svc.trainModel('model-recommend-default', { size: 1000, epochs: 5 });
      expect(job.id).toBeDefined();
      expect(job.status).toBe('started');
      expect(job.modelId).toBe('model-recommend-default');
      expect(job.epochs).toBe(5);
    });

    it('throws for missing model', () => {
      expect(() => svc.trainModel('nope', {})).toThrow('Model not found');
    });

    it('completes training via simulated intervals', () => {
      const job = svc.trainModel('model-recommend-default', { size: 100 });
      // Fast-forward timers to complete training
      for (let i = 0; i < 20; i++) {
        jest.advanceTimersByTime(1000);
      }
      expect(job.status).toBe('completed');
      expect(job.metrics.accuracy).toBeDefined();
    });
  });

  /* ═══════════════════════════════════════════════════
   * predict
   * ═══════════════════════════════════════════════════ */
  describe('predict', () => {
    it('makes prediction for active model', () => {
      const result = svc.predict('model-recommend-default', { user_profile: {} });
      expect(result.modelId).toBe('model-recommend-default');
      expect(result.prediction).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('throws for missing model', () => {
      expect(() => svc.predict('nope', {})).toThrow('Model not found');
    });

    it('throws for inactive model', () => {
      const m = svc.registerModel({
        name: 'Inactive',
        type: 'x',
        status: 'development',
        algorithm: 'y',
      });
      expect(() => svc.predict(m.id, {})).toThrow('Model is not active');
      svc.models.delete(m.id);
      svc.performanceMetrics.delete(m.id);
      svc.stats.totalModels--;
    });

    it('caches prediction', () => {
      const input = { test: true };
      svc.predict('model-recommend-default', input);
      const cacheKey = `model-recommend-default:${JSON.stringify(input)}`;
      expect(svc.predictionsCache.has(cacheKey)).toBe(true);
    });

    it('prediction for anomaly_detection type', () => {
      const result = svc.predict('model-anomaly-default', { behavior_data: {} });
      expect(result.prediction.type).toBe('anomaly_score');
      expect(result.prediction).toHaveProperty('isAnomaly');
    });
  });

  /* ═══════════════════════════════════════════════════
   * getModelMetrics
   * ═══════════════════════════════════════════════════ */
  describe('getModelMetrics', () => {
    it('returns metrics for model', () => {
      const metrics = svc.getModelMetrics('model-recommend-default');
      expect(metrics.modelId).toBe('model-recommend-default');
      expect(metrics).toHaveProperty('accuracy');
      expect(metrics).toHaveProperty('precision');
      expect(metrics).toHaveProperty('totalPredictions');
    });

    it('returns null for missing model', () => {
      expect(svc.getModelMetrics('nope')).toBeNull();
    });
  });

  /* ═══════════════════════════════════════════════════
   * getTrainingHistory
   * ═══════════════════════════════════════════════════ */
  describe('getTrainingHistory', () => {
    it('returns empty array for no history', () => {
      expect(svc.getTrainingHistory('no-training-model-xyz')).toEqual([]);
    });

    it('returns history after training completes', () => {
      svc.trainModel('model-recommend-default', { size: 100 });
      for (let i = 0; i < 20; i++) jest.advanceTimersByTime(1000);
      const history = svc.getTrainingHistory('model-recommend-default');
      expect(history.length).toBeGreaterThanOrEqual(1);
    });
  });

  /* ═══════════════════════════════════════════════════
   * deleteModel
   * ═══════════════════════════════════════════════════ */
  describe('deleteModel', () => {
    it('deletes inactive model', () => {
      const m = svc.registerModel({
        name: 'To Delete',
        type: 'x',
        status: 'development',
        algorithm: 'y',
      });
      const result = svc.deleteModel(m.id);
      expect(result).toBe(true);
      expect(svc.models.has(m.id)).toBe(false);
    });

    it('returns false for active model (cannot delete)', () => {
      const result = svc.deleteModel('model-recommend-default');
      expect(result).toBe(false);
    });
  });

  /* ═══════════════════════════════════════════════════
   * getStatistics
   * ═══════════════════════════════════════════════════ */
  describe('getStatistics', () => {
    it('returns aggregate statistics', () => {
      const stats = svc.getStatistics();
      expect(stats).toHaveProperty('totalModels');
      expect(stats).toHaveProperty('activeModels');
      expect(stats).toHaveProperty('totalPredictions');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('averageAccuracy');
    });
  });
});

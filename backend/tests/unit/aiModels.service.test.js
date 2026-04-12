/**
 * Unit tests — aiModels.service.js
 * EventEmitter singleton (in-memory Maps). No DB mocks needed.
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'UUID-STUB') }));

let service;

beforeEach(() => {
  jest.isolateModules(() => {
    service = require('../../services/aiModels.service');
  });
});

/* ================================================================ */
describe('AIModelsService', () => {
  /* ────────────────────────────────────────────────────────────── */
  describe('constructor / _initializeDefaultModels', () => {
    it('initializes 4 default models', () => {
      expect(service.models.size).toBe(4);
      expect(service.stats.totalModels).toBe(4);
      expect(service.stats.activeModels).toBe(4);
    });

    it('all default models are active', () => {
      const all = Array.from(service.models.values());
      expect(all.every(m => m.status === 'active')).toBe(true);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('registerModel', () => {
    it('adds model to registry', () => {
      const m = service.registerModel({ name: 'Custom', type: 'prediction' });
      expect(m.name).toBe('Custom');
      expect(m.type).toBe('prediction');
      expect(service.models.has(m.id)).toBe(true);
    });

    it('sets default values', () => {
      const m = service.registerModel({ name: 'X', type: 'classification' });
      expect(m.version).toBe('1.0.0');
      expect(m.accuracy).toBe(0.75);
      expect(m.status).toBe('development');
      expect(m.inputs).toEqual([]);
    });

    it('increments totalModels stat', () => {
      const before = service.stats.totalModels;
      service.registerModel({ name: 'Y', type: 'anomaly_detection' });
      expect(service.stats.totalModels).toBe(before + 1);
    });

    it('tracks active model when status is active', () => {
      const before = service.stats.activeModels;
      service.registerModel({ name: 'Z', type: 'prediction', status: 'active' });
      expect(service.stats.activeModels).toBe(before + 1);
    });

    it('initializes performance metrics for new model', () => {
      const m = service.registerModel({ name: 'P', type: 'prediction' });
      const pm = service.performanceMetrics.get(m.id);
      expect(pm.totalPredictions).toBe(0);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getModel', () => {
    it('returns model by ID', () => {
      const m = service.getModel('model-recommend-default');
      expect(m).toBeDefined();
      expect(m.name).toBe('Default Recommendation Model');
    });

    it('returns null for unknown ID', () => {
      expect(service.getModel('bad')).toBeNull();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getModelsByType', () => {
    it('filters by type', () => {
      const preds = service.getModelsByType('prediction');
      expect(preds.length).toBeGreaterThanOrEqual(2);
      expect(preds.every(m => m.type === 'prediction')).toBe(true);
    });

    it('returns empty for unknown type', () => {
      expect(service.getModelsByType('nonexistent')).toEqual([]);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getActiveModels', () => {
    it('returns all active models', () => {
      const active = service.getActiveModels();
      expect(active.length).toBe(4);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('deployModel', () => {
    it('deploys a development model', () => {
      const m = service.registerModel({ name: 'DevM', type: 'prediction' });
      const deployed = service.deployModel(m.id);
      expect(deployed.status).toBe('active');
      expect(deployed.deployedAt).toBeDefined();
      expect(service.activeModels.has(m.id)).toBe(true);
    });

    it('throws for unknown model', () => {
      expect(() => service.deployModel('bad')).toThrow('Model not found');
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('undeployModel', () => {
    it('sets status to inactive and removes from active', () => {
      const before = service.stats.activeModels;
      const result = service.undeployModel('model-recommend-default');
      expect(result).toBe(true);
      expect(service.activeModels.has('model-recommend-default')).toBe(false);
      expect(service.stats.activeModels).toBe(before - 1);
    });

    it('throws for unknown model', () => {
      expect(service.undeployModel('bad')).toBe(false);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('updateModel', () => {
    it('updates allowed fields', () => {
      const m = service.updateModel('model-recommend-default', {
        name: 'Updated',
        description: 'New desc',
        accuracy: 0.95,
      });
      expect(m.name).toBe('Updated');
      expect(m.description).toBe('New desc');
      expect(m.accuracy).toBe(0.95);
    });

    it('ignores disallowed fields like type', () => {
      const original = service.getModel('model-anomaly-default');
      const origType = original.type;
      service.updateModel('model-anomaly-default', { type: 'changed' });
      expect(service.getModel('model-anomaly-default').type).toBe(origType);
    });

    it('throws for unknown model', () => {
      expect(() => service.updateModel('bad', {})).toThrow('Model not found');
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('trainModel', () => {
    it('creates training job', () => {
      const job = service.trainModel('model-recommend-default', { size: 1000, epochs: 5 });
      expect(job.status).toBe('started');
      expect(job.dataSize).toBe(1000);
      expect(job.epochs).toBe(5);
      expect(service.stats.totalTrainings).toBe(1);
    });

    it('throws for unknown model', () => {
      expect(() => service.trainModel('bad', {})).toThrow('Model not found');
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('predict', () => {
    it('returns prediction for active model', () => {
      const res = service.predict('model-recommend-default', { user_profile: 'test' });
      expect(res.modelId).toBe('model-recommend-default');
      expect(res.prediction).toBeDefined();
      expect(res.confidence).toBeDefined();
      expect(res.timestamp).toBeDefined();
    });

    it('increments prediction counters', () => {
      service.predict('model-recommend-default', {});
      const pm = service.performanceMetrics.get('model-recommend-default');
      expect(pm.totalPredictions).toBe(1);
      expect(pm.successfulPredictions).toBe(1);
      expect(service.stats.totalPredictions).toBe(1);
    });

    it('generates recommendation type for recommendation model', () => {
      const res = service.predict('model-recommend-default', {});
      expect(res.prediction.type).toBe('recommendations');
      expect(res.prediction.recommendations).toHaveLength(2);
    });

    it('generates prediction type for prediction model', () => {
      const res = service.predict('model-supervision-default', {});
      expect(res.prediction.type).toBe('prediction');
      expect(res.prediction).toHaveProperty('trend');
    });

    it('generates anomaly_score for anomaly_detection model', () => {
      const res = service.predict('model-anomaly-default', {});
      expect(res.prediction.type).toBe('anomaly_score');
      expect(res.prediction).toHaveProperty('isAnomaly');
    });

    it('throws for inactive model', () => {
      service.undeployModel('model-recommend-default');
      expect(() => service.predict('model-recommend-default', {})).toThrow('Model is not active');
    });

    it('throws for unknown model', () => {
      expect(() => service.predict('bad', {})).toThrow('Model not found');
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getModelMetrics', () => {
    it('returns metrics for known model', () => {
      const m = service.getModelMetrics('model-recommend-default');
      expect(m.modelId).toBe('model-recommend-default');
      expect(m).toHaveProperty('accuracy');
      expect(m).toHaveProperty('totalPredictions');
    });

    it('throws for unknown model', () => {
      expect(service.getModelMetrics('bad')).toBeNull();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getAllModels', () => {
    it('returns array of all models', () => {
      const all = service.getAllModels();
      expect(all.length).toBeGreaterThanOrEqual(4);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getTrainingHistory', () => {
    it('returns empty for model with no history', () => {
      expect(service.getTrainingHistory('model-recommend-default')).toEqual([]);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('deleteModel', () => {
    it('deletes inactive model', () => {
      service.undeployModel('model-recommend-default');
      const before = service.stats.totalModels;
      const r = service.deleteModel('model-recommend-default');
      expect(r).toBe(true);
      expect(service.models.has('model-recommend-default')).toBe(false);
      expect(service.stats.totalModels).toBe(before - 1);
    });

    it('cannot delete active model', () => {
      const r = service.deleteModel('model-supervision-default');
      expect(r).toBe(false);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getStatistics', () => {
    it('returns aggregate statistics', () => {
      service.predict('model-recommend-default', {});
      const stats = service.getStatistics();
      expect(stats.totalModels).toBeGreaterThanOrEqual(4);
      expect(stats.activeModels).toBeGreaterThanOrEqual(1);
      expect(stats.totalPredictions).toBeGreaterThanOrEqual(1);
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('averageAccuracy');
    });
  });
});

'use strict';

jest.mock('../../models/DddPredictiveEngine', () => ({
  DDDPredictionModel: {},
  DDDPredictionResult: {},
  DDDAnomaly: {},
  BUILTIN_MODELS: ['item1'],
  ANOMALY_THRESHOLDS: ['item1'],

}));

const svc = require('../../services/dddPredictiveEngine');

describe('dddPredictiveEngine service', () => {
  test('BUILTIN_MODELS is an array', () => { expect(Array.isArray(svc.BUILTIN_MODELS)).toBe(true); });
  test('ANOMALY_THRESHOLDS is an array', () => { expect(Array.isArray(svc.ANOMALY_THRESHOLDS)).toBe(true); });
  test('runPrediction resolves', async () => { await expect(svc.runPrediction()).resolves.not.toThrow(); });
  test('detectAnomalies resolves', async () => { await expect(svc.detectAnomalies()).resolves.not.toThrow(); });
  test('generateForecast resolves', async () => { await expect(svc.generateForecast()).resolves.not.toThrow(); });
  test('getPredictionHistory resolves', async () => { await expect(svc.getPredictionHistory()).resolves.not.toThrow(); });
  test('provideFeedback resolves', async () => { await expect(svc.provideFeedback()).resolves.not.toThrow(); });
  test('seedModels resolves', async () => { await expect(svc.seedModels()).resolves.not.toThrow(); });
  test('getPredictiveEngineDashboard returns health object', async () => {
    const d = await svc.getPredictiveEngineDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});

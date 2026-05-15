'use strict';

const registry = require('../config/predictive-risk.registry');
const { createPredictiveRiskService } = require('../services/quality/predictiveRisk.service');

describe('predictive-risk registry', () => {
  test('zero signals → score 0', () => {
    expect(registry.scoreFromSignals({})).toBe(0);
  });

  test('score is bounded between 0 and 100', () => {
    const huge = registry.scoreFromSignals({
      recent_incidents_30d: 1000,
      recent_critical_incidents_30d: 1000,
      overdue_capa: 1000,
      open_critical_scar: 1000,
    });
    expect(huge).toBeGreaterThan(99);
    expect(huge).toBeLessThanOrEqual(100);
  });

  test('one critical incident dominates one complaint', () => {
    const a = registry.scoreFromSignals({ recent_critical_incidents_30d: 1 });
    const b = registry.scoreFromSignals({ recent_complaints_30d: 1 });
    expect(a).toBeGreaterThan(b);
  });

  test('band mapping', () => {
    expect(registry.band(10)).toBe('low');
    expect(registry.band(40)).toBe('moderate');
    expect(registry.band(60)).toBe('high');
    expect(registry.band(90)).toBe('critical');
  });
});

describe('PredictiveRiskService.computeScore', () => {
  test('passes signals through + returns band', () => {
    const svc = createPredictiveRiskService({});
    const r = svc.computeScore({ recent_critical_incidents_30d: 2, overdue_capa: 3 });
    expect(r.score).toBeGreaterThan(0);
    expect(['low', 'moderate', 'high', 'critical']).toContain(r.band);
    expect(r.weights).toEqual(registry.SIGNAL_WEIGHTS);
  });
});

describe('PredictiveRiskService.assembleSignals', () => {
  test('returns zeros when no models are wired', async () => {
    const svc = createPredictiveRiskService({});
    const signals = await svc.assembleSignals({});
    expect(signals.recent_incidents_30d).toBe(0);
    expect(signals.overdue_capa).toBe(0);
  });

  test('returns counts from wired stub models', async () => {
    const fakeModel = count => ({ countDocuments: async () => count });
    const svc = createPredictiveRiskService({
      incidentModel: fakeModel(5),
      complaintModel: fakeModel(2),
      capaModel: fakeModel(7),
      supplierScarModel: fakeModel(1),
      auditOccurrenceModel: fakeModel(3),
      calibrationAssetModel: fakeModel(0),
      riskModel: fakeModel(4),
      standardsTraceModel: fakeModel(1),
    });
    const signals = await svc.assembleSignals({});
    expect(signals.recent_incidents_30d).toBe(5);
    expect(signals.recent_complaints_30d).toBe(2);
    expect(signals.lapsed_clauses).toBe(1);
  });

  test('tolerates model errors gracefully', async () => {
    const broken = {
      countDocuments: async () => {
        throw new Error('boom');
      },
    };
    const svc = createPredictiveRiskService({ incidentModel: broken });
    const signals = await svc.assembleSignals({});
    expect(signals.recent_incidents_30d).toBe(0);
  });
});

describe('PredictiveRiskService.getRiskReport', () => {
  test('emits the computed event when dispatcher is wired', async () => {
    const events = [];
    const dispatcher = {
      async emit(name, payload) {
        events.push({ name, payload });
      },
    };
    const svc = createPredictiveRiskService({ dispatcher });
    const r = await svc.getRiskReport({});
    expect(r.score).toBeDefined();
    expect(r.band).toBeDefined();
    expect(events.find(e => e.name === 'quality.predictive_risk.computed')).toBeTruthy();
  });
});

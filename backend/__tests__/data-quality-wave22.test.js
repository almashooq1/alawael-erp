/**
 * data-quality-wave22.test.js — Wave 22.
 *
 *   1. Registry shape + thresholds + weights + source catalog
 *   2. Service per-dimension scoring functions (8 dimensions)
 *   3. Service composite + level mapping + breach detection
 *   4. Drift guard: every drilldown KPI has a DQ entry
 *   5. Generator emits insights on breaches, none when clean
 *   6. Generator payloads survive the Insight schema G-validators
 *   7. Routes: GET / | GET /sources | GET /:id | POST /compute | POST /batch
 */

'use strict';

const express = require('express');
const request = require('supertest');
// Opt out of global mongoose mock (jest.setup.js:19) — required so
// new Model(...) returns a real constructor. See insight-foundation-wave18.test.js.
jest.unmock('mongoose');

const mongoose = require('mongoose');

const dqRegistry = require('../intelligence/data-quality.registry');
const { createDataQualityService } = require('../intelligence/data-quality.service');
const dqGenerator = require('../intelligence/generators/data-quality.generator');
const { createDataQualityRouter } = require('../routes/data-quality.routes');
const drillRegistry = require('../intelligence/drilldown.registry');

const insightModelExports = require('../intelligence/insight.model');
const Insight =
  mongoose.models.Insight || mongoose.model('Insight', insightModelExports.InsightSchema);

// ─── 1. Registry shape ─────────────────────────────────────────

describe('data-quality.registry — shape', () => {
  const allIds = dqRegistry.listRegisteredDatasets();

  test('exports ≥ 12 priority datasets', () => {
    expect(allIds.length).toBeGreaterThanOrEqual(12);
  });

  test.each(allIds)('%s — has required fields', id => {
    const cfg = dqRegistry.getDatasetConfig(id);
    expect(cfg).toBeTruthy();
    expect(typeof cfg.category).toBe('string');
    expect(typeof cfg.expectedCadenceMin).toBe('number');
    expect(typeof cfg.slaMs).toBe('number');
    expect(typeof cfg.duplicateThreshold).toBe('number');
    expect(typeof cfg.completenessThreshold).toBe('number');
    expect(typeof cfg.crossSourceTolerance).toBe('number');
    expect(Array.isArray(cfg.sources)).toBe(true);
    expect(cfg.sources.length).toBeGreaterThan(0);
    expect(typeof cfg.maskOnCritical).toBe('boolean');
    expect(typeof cfg.isAIDerived).toBe('boolean');
  });

  test.each(allIds)('%s — thresholds + weights resolve', id => {
    const thresholds = dqRegistry.getThresholdsFor(id);
    const weights = dqRegistry.getWeightsFor(id);
    expect(thresholds).toBeTruthy();
    expect(weights).toBeTruthy();
    for (const dim of dqRegistry.DIMENSIONS) {
      expect(thresholds[dim]).toBeTruthy();
      expect(typeof thresholds[dim].warn).toBe('number');
      expect(typeof thresholds[dim].critical).toBe('number');
      expect(typeof weights[dim]).toBe('number');
    }
  });

  test('every source category in the dataset registry exists in the catalog', () => {
    for (const id of allIds) {
      const cfg = dqRegistry.getDatasetConfig(id);
      for (const s of cfg.sources) {
        expect(dqRegistry.SOURCE_CATEGORIES[s.category]).toBeTruthy();
      }
    }
  });
});

// ─── 2. Service — individual dimensions ────────────────────────

describe('data-quality.service — dimension scoring', () => {
  const svc = createDataQualityService();
  const i = svc._internal;

  test('freshness: 1.0 inside cadence', () => {
    const score = i.freshnessScore(
      { lastRefreshAt: new Date('2026-05-17T03:30:00Z'), expectedCadenceMin: 15 },
      new Date('2026-05-17T03:35:00Z')
    );
    expect(score).toBe(1);
  });

  test('freshness: decays after cadence, 0 at 4× cadence', () => {
    const partial = i.freshnessScore(
      { lastRefreshAt: new Date('2026-05-17T03:00:00Z'), expectedCadenceMin: 15 },
      new Date('2026-05-17T03:30:00Z') // 30 min = 2× cadence
    );
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(1);
    const expired = i.freshnessScore(
      { lastRefreshAt: new Date('2026-05-17T02:00:00Z'), expectedCadenceMin: 15 },
      new Date('2026-05-17T03:30:00Z') // 90 min = 6× cadence
    );
    expect(expired).toBe(0);
  });

  test('freshness: null lastRefreshAt → 0', () => {
    expect(i.freshnessScore({ lastRefreshAt: null, expectedCadenceMin: 15 })).toBe(0);
  });

  test('timeliness: 1.0 within SLA', () => {
    expect(i.timelinessScore({ arrivalLatencyMs: 5000, slaMs: 30_000 })).toBe(1);
  });

  test('timeliness: 0 at 5× SLA', () => {
    expect(i.timelinessScore({ arrivalLatencyMs: 150_000, slaMs: 30_000 })).toBe(0);
  });

  test('completeness: present/sample ratio', () => {
    expect(i.completenessScore({ presentCount: 95, sampleSize: 100 })).toBe(0.95);
    expect(i.completenessScore({ presentCount: 0, sampleSize: 100 })).toBe(0);
    expect(i.completenessScore({ presentCount: 100, sampleSize: 0 })).toBe(1);
  });

  test('validity: 1 − violations/sample', () => {
    expect(i.validityScore({ ruleViolations: 5, sampleSize: 100 })).toBe(0.95);
    expect(i.validityScore({ ruleViolations: 100, sampleSize: 100 })).toBe(0);
  });

  test('consistency: tolerance band', () => {
    expect(i.consistencyScore({ crossSourceDelta: 0.01, tolerance: 0.05 })).toBe(1);
    const partial = i.consistencyScore({ crossSourceDelta: 0.15, tolerance: 0.05 });
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(1);
  });

  test('consistency: zero tolerance = any drift critical', () => {
    expect(i.consistencyScore({ crossSourceDelta: 0, tolerance: 0 })).toBe(1);
    expect(i.consistencyScore({ crossSourceDelta: 0.001, tolerance: 0 })).toBe(0);
  });

  test('uniqueness: within threshold = 1, beyond = decay', () => {
    expect(i.uniquenessScore({ duplicates: 1, sampleSize: 100, duplicateThreshold: 0.01 })).toBe(1);
    expect(i.uniquenessScore({ duplicates: 10, sampleSize: 100, duplicateThreshold: 0.01 })).toBe(
      0
    );
  });

  test('source: min over declared sources', () => {
    const score = i.sourceScore({
      sources: [{ category: 'prod_api' }, { category: 'manual_import' }],
      getSourceTrustScore: dqRegistry.getSourceTrustScore,
    });
    expect(score).toBe(0.7); // manual_import wins as min
  });

  test('source: 0.5 when no sources declared', () => {
    const score = i.sourceScore({
      sources: [],
      getSourceTrustScore: dqRegistry.getSourceTrustScore,
    });
    expect(score).toBe(0.5);
  });

  test('aiConfidence: null when not AI-derived', () => {
    expect(i.aiConfidenceScore({ aiConfidenceScore: 0.9, isAIDerived: false })).toBe(null);
  });

  test('aiConfidence: pass-through when AI-derived', () => {
    expect(i.aiConfidenceScore({ aiConfidenceScore: 0.75, isAIDerived: true })).toBe(0.75);
    expect(i.aiConfidenceScore({ aiConfidenceScore: undefined, isAIDerived: true })).toBe(0);
  });
});

// ─── 3. Service — composite + level + breaches ─────────────────

describe('data-quality.service — composite + level + breaches', () => {
  const svc = createDataQualityService();
  const i = svc._internal;

  test('scoreToLevel boundaries', () => {
    expect(i.scoreToLevel(0.95)).toBe('excellent');
    expect(i.scoreToLevel(0.8)).toBe('good');
    expect(i.scoreToLevel(0.65)).toBe('fair');
    expect(i.scoreToLevel(0.5)).toBe('poor');
    expect(i.scoreToLevel(0.2)).toBe('critical');
  });

  test('compositeOf — weighted average skips null dimensions', () => {
    const c = i.compositeOf({
      dimensions: { freshness: 1, completeness: 0.5, aiConfidence: null },
      weights: { freshness: 2, completeness: 1, aiConfidence: 1 },
    });
    // (1×2 + 0.5×1) / (2+1) = 2.5 / 3 ≈ 0.833
    expect(c).toBeCloseTo(0.833, 2);
  });

  test('detectBreaches: flags below warn and critical', () => {
    const breaches = i.detectBreaches({
      dimensions: { freshness: 0.6, completeness: 0.3, validity: 0.95 },
      thresholds: {
        freshness: { warn: 0.7, critical: 0.4 },
        completeness: { warn: 0.85, critical: 0.6 },
        validity: { warn: 0.9, critical: 0.7 },
      },
    });
    expect(breaches).toHaveLength(2);
    expect(breaches.find(b => b.dimension === 'completeness').severity).toBe('critical');
    expect(breaches.find(b => b.dimension === 'freshness').severity).toBe('medium');
  });
});

// ─── 4. Service — computeQuality full bundle ───────────────────

describe('data-quality.service — computeQuality', () => {
  const svc = createDataQualityService({ now: () => new Date('2026-05-17T04:00:00Z') });

  test('happy path: clean snapshot scores high + no breaches', () => {
    const r = svc.computeQuality({
      datasetId: 'kpi.beneficiary.active_count',
      lastRefreshAt: new Date('2026-05-17T03:55:00Z'),
      arrivalLatencyMs: 8000,
      sampleSize: 1000,
      presentCount: 970,
      ruleViolations: 5,
      crossSourceDelta: 0.01,
      duplicates: 0,
    });
    expect(r.ok).toBe(true);
    expect(r.composite).toBeGreaterThan(0.85);
    expect(['excellent', 'good']).toContain(r.level);
    expect(r.breaches).toHaveLength(0);
    expect(r.maskValue).toBe(false);
  });

  test('critical-clinical KPI masks value when composite is critical', () => {
    const r = svc.computeQuality({
      datasetId: 'kpi.beneficiary.active_count',
      lastRefreshAt: new Date('2026-05-17T00:00:00Z'), // 4h old — way past cadence
      arrivalLatencyMs: 200_000,
      sampleSize: 1000,
      presentCount: 200, // 80% missing
      ruleViolations: 400,
      crossSourceDelta: 0.5,
      duplicates: 100,
    });
    expect(r.ok).toBe(true);
    expect(r.level).toBe('critical');
    expect(r.maskValue).toBe(true);
    expect(r.breaches.length).toBeGreaterThanOrEqual(4);
  });

  test('operational KPI does NOT mask even at critical', () => {
    const r = svc.computeQuality({
      datasetId: 'kpi.attendance.daily_rate',
      lastRefreshAt: new Date('2026-05-16T00:00:00Z'), // 28h old
      arrivalLatencyMs: 600_000,
      sampleSize: 1000,
      presentCount: 50,
      ruleViolations: 800,
      crossSourceDelta: 0.5,
      duplicates: 400,
    });
    expect(r.ok).toBe(true);
    expect(r.level).toBe('critical');
    expect(r.maskValue).toBe(false); // operators see raw value
  });

  test('returns DATASET_NOT_REGISTERED for unknown id', () => {
    const r = svc.computeQuality({ datasetId: 'kpi.does.not.exist' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('DATASET_NOT_REGISTERED');
  });

  test('returns INVALID_SNAPSHOT on missing datasetId', () => {
    const r = svc.computeQuality({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_SNAPSHOT');
  });

  test('computeQualityBatch — returns array, isolates failures', () => {
    const results = svc.computeQualityBatch([
      { datasetId: 'kpi.beneficiary.active_count', sampleSize: 100, presentCount: 100 },
      { datasetId: 'kpi.does.not.exist' },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
  });

  test('getSourceCatalog returns all categories', () => {
    const cat = svc.getSourceCatalog();
    expect(cat.length).toBeGreaterThanOrEqual(7);
    expect(cat.find(c => c.category === 'prod_api').trustScore).toBe(1.0);
    expect(cat.find(c => c.category === 'simulated').trustScore).toBe(0.3);
  });
});

// ─── 5. Drift guard: drilldown ↔ DQ coverage ───────────────────

describe('data-quality.registry — coverage drift guard', () => {
  test('every drilldown KPI has a DQ entry', () => {
    const drillKpis = drillRegistry.listRegisteredKpis();
    const dqKpis = new Set(dqRegistry.listRegisteredDatasets());
    const missing = drillKpis.filter(k => !dqKpis.has(k));
    expect(missing).toEqual([]);
  });
});

// ─── 6. Generator: emit insights on breaches ──────────────────

describe('data-quality.generator', () => {
  test('returns [] when all snapshots are clean', async () => {
    const out = await dqGenerator.evaluate({
      now: new Date('2026-05-17T04:00:00Z'),
      snapshots: [
        {
          datasetId: 'kpi.beneficiary.active_count',
          lastRefreshAt: new Date('2026-05-17T03:55:00Z'),
          arrivalLatencyMs: 8000,
          sampleSize: 1000,
          presentCount: 1000,
          ruleViolations: 0,
          crossSourceDelta: 0.005,
          duplicates: 0,
        },
      ],
    });
    expect(out).toEqual([]);
  });

  test('emits one insight per breached snapshot', async () => {
    const out = await dqGenerator.evaluate({
      now: new Date('2026-05-17T04:00:00Z'),
      snapshots: [
        // Critical: lots of missing + late
        {
          datasetId: 'kpi.beneficiary.active_count',
          lastRefreshAt: new Date('2026-05-17T00:00:00Z'),
          arrivalLatencyMs: 200_000,
          sampleSize: 1000,
          presentCount: 200,
          ruleViolations: 400,
          crossSourceDelta: 0.5,
          duplicates: 100,
        },
        // Clean: no insight
        {
          datasetId: 'kpi.therapy_sessions.completion',
          lastRefreshAt: new Date('2026-05-17T03:55:00Z'),
          arrivalLatencyMs: 5000,
          sampleSize: 500,
          presentCount: 500,
          ruleViolations: 0,
          crossSourceDelta: 0.01,
          duplicates: 0,
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('workflow-delay');
    expect(out[0].severity).toBe('critical'); // worst dim is critical
    expect(out[0].relatedEntities[0].id).toBe('kpi.beneficiary.active_count');
  });

  test('elevates medium → high for clinical/financial/compliance', async () => {
    // Single "medium" breach (freshness slightly stale, everything
    // else clean) on a CLINICAL dataset → should elevate to high.
    const out = await dqGenerator.evaluate({
      now: new Date('2026-05-17T04:00:00Z'),
      snapshots: [
        {
          datasetId: 'kpi.beneficiary.active_count',
          // 30 min stale on 15-min cadence — drops freshness into warn band
          lastRefreshAt: new Date('2026-05-17T03:00:00Z'),
          arrivalLatencyMs: 5000,
          sampleSize: 1000,
          presentCount: 1000,
          ruleViolations: 0,
          crossSourceDelta: 0.005,
          duplicates: 0,
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(['high', 'critical']).toContain(out[0].severity);
  });

  test('payload survives the Insight schema G-validators', async () => {
    const out = await dqGenerator.evaluate({
      now: new Date('2026-05-17T04:00:00Z'),
      snapshots: [
        {
          datasetId: 'kpi.invoices.overdue_count',
          lastRefreshAt: new Date('2026-05-17T00:00:00Z'),
          arrivalLatencyMs: 400_000,
          sampleSize: 500,
          presentCount: 100,
          ruleViolations: 200,
          crossSourceDelta: 0.4,
          duplicates: 50,
        },
      ],
    });
    expect(out).toHaveLength(1);
    const doc = new Insight(out[0]);
    expect(doc.validateSync()).toBeFalsy();
  });

  test('handles bad snapshots without throwing', async () => {
    const out = await dqGenerator.evaluate({
      snapshots: [null, { datasetId: null }, { datasetId: 'kpi.does.not.exist', sampleSize: 100 }],
    });
    expect(Array.isArray(out)).toBe(true);
  });
});

// ─── 7. Routes ─────────────────────────────────────────────────

function buildApp() {
  const svc = createDataQualityService();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 'u-1', role: 'manager' };
    next();
  });
  app.use('/api/v1/data-quality', createDataQualityRouter({ dataQuality: svc }));
  return app;
}

describe('data-quality.routes', () => {
  test('GET / returns dataset list', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/data-quality');
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBeGreaterThanOrEqual(12);
  });

  test('GET /sources returns source catalog', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/data-quality/sources');
    expect(res.status).toBe(200);
    expect(res.body.data.sources.length).toBeGreaterThanOrEqual(7);
  });

  test('GET /:datasetId returns config + thresholds', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/data-quality/kpi.beneficiary.active_count');
    expect(res.status).toBe(200);
    expect(res.body.data.config.category).toBe('clinical');
    expect(res.body.data.thresholds.freshness.warn).toBeGreaterThan(0);
  });

  test('GET /:datasetId 404 on unknown dataset', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/data-quality/does.not.exist');
    expect(res.status).toBe(404);
  });

  test('GET /:datasetId/dimensions lists dimensions + applicability', async () => {
    const app = buildApp();
    const res = await request(app).get(
      '/api/v1/data-quality/kpi.beneficiary.active_count/dimensions'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.dimensions).toHaveLength(8);
    expect(res.body.data.dimensions.find(d => d.dimension === 'aiConfidence').applicable).toBe(
      false
    );
  });

  test('POST /:datasetId/compute returns quality bundle', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/v1/data-quality/kpi.beneficiary.active_count/compute')
      .send({
        lastRefreshAt: new Date().toISOString(),
        arrivalLatencyMs: 5000,
        sampleSize: 1000,
        presentCount: 990,
        ruleViolations: 2,
        crossSourceDelta: 0.005,
        duplicates: 0,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.composite).toBeGreaterThan(0.85);
    expect(res.body.data.level).toBeTruthy();
  });

  test('POST /:datasetId/compute 404 on unknown dataset', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/v1/data-quality/does.not.exist/compute').send({});
    expect(res.status).toBe(404);
  });

  test('POST /batch-compute returns array + counts breaches', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/v1/data-quality/batch-compute')
      .send({
        snapshots: [
          {
            datasetId: 'kpi.beneficiary.active_count',
            lastRefreshAt: new Date().toISOString(),
            sampleSize: 100,
            presentCount: 100,
          },
          {
            datasetId: 'kpi.invoices.overdue_count',
            lastRefreshAt: new Date('2026-05-16T00:00:00Z').toISOString(),
            arrivalLatencyMs: 500_000,
            sampleSize: 100,
            presentCount: 20,
            ruleViolations: 60,
            crossSourceDelta: 0.5,
            duplicates: 20,
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(2);
    expect(res.body.data.breachesCount).toBeGreaterThanOrEqual(1);
  });

  test('factory throws when service is missing', () => {
    expect(() => createDataQualityRouter({})).toThrow(/dataQuality service is required/);
  });
});

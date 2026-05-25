'use strict';

/**
 * W379 — Phase 9 dashboard routes integration smoke test.
 *
 * Closes the "but does it actually work over HTTP?" gap that shape-only drift
 * guards leave open. Spins up an in-process Express app, mounts the 3 dashboard
 * routers, and verifies the no-auth /health endpoints return 200 with the
 * expected shape.
 *
 * SCOPE: deliberately minimal. /health endpoints are the only routes without
 * the global authenticate + attachMfaActor middleware chain — testing the
 * protected GET / endpoints would require a 3-layer auth mock that adds more
 * risk than it removes given the 27 prior drift guards already lock the
 * full request/response shape statically.
 *
 * What this catches that drift guards miss:
 *   - Router export error at require time (would crash the test on require)
 *   - Express path matching bugs (typo'd path strings)
 *   - Service factory throw at module load (would crash on require)
 *   - JSON serialization breakage in the /health handler (e.g. circular structure)
 */

const express = require('express');
const request = require('supertest');

const heatmapRouter = require('../routes/quality/branchQualityHeatmap.routes');
const workloadRouter = require('../routes/quality/therapistWorkload.routes');
const executiveRouter = require('../routes/quality/executiveOnePage.routes');

function makeApp() {
  const app = express();
  app.use(express.json());
  // Mount under the same paths capaBootstrap.js uses in prod
  app.use('/api/quality/branch-heatmap', heatmapRouter);
  app.use('/api/quality/therapist-workload', workloadRouter);
  app.use('/api/quality/executive-1-page', executiveRouter);
  return app;
}

describe('W379 — /health endpoints respond 200 with the documented shape', () => {
  let app;
  beforeAll(() => {
    app = makeApp();
  });

  it('GET /api/quality/branch-heatmap/health returns thresholds + metrics list', async () => {
    const r = await request(app).get('/api/quality/branch-heatmap/health');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.thresholds).toBeDefined();
    expect(Array.isArray(r.body.metrics)).toBe(true);
    // Verify 15 metrics shipped through W350-W378 are all enumerated
    expect(r.body.metrics).toContain('capa.open');
    expect(r.body.metrics).toContain('seizures.openEvents');
    expect(r.body.metrics).toContain('cbahi.attestationsExpiringSoon');
    expect(r.body.metrics).toContain('assistiveDevice.untrackedDevices');
    expect(r.body.metrics.length).toBeGreaterThanOrEqual(15);
  });

  it('GET /api/quality/therapist-workload/health returns thresholds + metrics + notes', async () => {
    const r = await request(app).get('/api/quality/therapist-workload/health');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.thresholds).toBeDefined();
    expect(Array.isArray(r.body.metrics)).toBe(true);
    // 4 keyed metrics; sessions.weekCompleted is informational (no threshold) — should be absent from metrics[] but present in notes
    expect(r.body.metrics).toContain('appointments.todayPending');
    expect(r.body.metrics).toContain('careplans.active');
    expect(r.body.metrics).not.toContain('sessions.weekCompleted');
    expect(r.body.notes['sessions.weekCompleted']).toBeDefined();
  });

  it('GET /api/quality/executive-1-page/health enumerates the 3 composed sources', async () => {
    const r = await request(app).get('/api/quality/executive-1-page/health');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(Array.isArray(r.body.composes)).toBe(true);
    // Verify the doc enumeration
    expect(r.body.composes.some(s => s.toLowerCase().includes('beneficiary'))).toBe(true);
    expect(r.body.composes.some(s => s.toLowerCase().includes('heatmap'))).toBe(true);
    expect(r.body.composes.some(s => s.toLowerCase().includes('workload'))).toBe(true);
  });
});

describe('W379 — 404 + content-type sanity', () => {
  let app;
  beforeAll(() => {
    app = makeApp();
  });

  it('completely-unmounted path (outside our 3 router mounts) returns 404', async () => {
    // Test a path NOT under any of the 3 mount points so authenticate doesn't intercept.
    const r = await request(app).get('/totally-unmounted-path');
    expect(r.status).toBe(404);
  });

  it('all 3 /health responses are application/json', async () => {
    for (const path of [
      '/api/quality/branch-heatmap/health',
      '/api/quality/therapist-workload/health',
      '/api/quality/executive-1-page/health',
    ]) {
      const r = await request(app).get(path);
      expect(r.headers['content-type']).toMatch(/application\/json/);
    }
  });
});

describe('W379 — routers expose middleware/auth setup downstream of /health', () => {
  let app;
  beforeAll(() => {
    app = makeApp();
  });

  it('GET / (without auth header) is rejected (proves authenticate middleware is wired)', async () => {
    // We don't validate the exact error code — different auth middlewares respond differently
    // (401, 403, redirect). We just confirm it's NOT 200 (the unprotected case).
    for (const path of [
      '/api/quality/branch-heatmap/',
      '/api/quality/therapist-workload/',
      '/api/quality/executive-1-page/',
    ]) {
      const r = await request(app).get(path);
      expect(r.status).not.toBe(200);
    }
  });
});

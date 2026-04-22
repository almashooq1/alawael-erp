/**
 * rehab-disciplines-routes.test.js — Phase 9 Commit 5.
 *
 * End-to-end HTTP tests for routes/rehab-disciplines.routes.js via
 * supertest. No DB, no auth — the router wraps pure-data registries,
 * so the stack composes without any real services.
 */

'use strict';

const express = require('express');
const request = require('supertest');

const { createRehabDisciplinesRouter } = require('../routes/rehab-disciplines.routes');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/rehab/disciplines', createRehabDisciplinesRouter());
  return app;
}

// ─── /taxonomy ────────────────────────────────────────────────────

describe('GET /taxonomy', () => {
  it('returns all enum sets', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines/taxonomy');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data.domains)).toBe(true);
    expect(r.body.data.domains).toContain('clinical');
    expect(r.body.data.deliveryModes).toContain('home_based');
    expect(r.body.data.ageBands).toContain('early_0_3');
  });
});

// ─── /health ──────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns a healthy state with zero orphans', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines/health');
    expect(r.status).toBe(200);
    expect(r.body.data.healthy).toBe(true);
    expect(r.body.data.kpiOrphans).toBe(0);
    expect(r.body.data.flagOrphans).toBe(0);
    expect(r.body.data.totalDisciplines).toBeGreaterThanOrEqual(11);
  });
});

// ─── / list ───────────────────────────────────────────────────────

describe('GET / (list)', () => {
  it('returns every discipline as a summary', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
    expect(r.body.data.length).toBeGreaterThanOrEqual(11);
    const pt = r.body.data.find(x => x.code === 'PT');
    expect(pt).toBeDefined();
    expect(pt).not.toHaveProperty('programTemplates');
    expect(typeof pt.programCount).toBe('number');
  });

  it('filters by domain', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines?domain=clinical');
    expect(r.status).toBe(200);
    expect(r.body.data.every(d => d.domain === 'clinical')).toBe(true);
  });

  it('filters by age_band + delivery_mode', async () => {
    const app = buildApp();
    const r = await request(app).get(
      '/api/v1/rehab/disciplines?age_band=early_0_3&delivery_mode=home_based'
    );
    expect(r.status).toBe(200);
    expect(r.body.data.every(d => d.supportedAgeBands.includes('early_0_3'))).toBe(true);
    expect(r.body.data.every(d => d.deliveryModes.includes('home_based'))).toBe(true);
  });
});

// ─── /suggest ─────────────────────────────────────────────────────

describe('GET /suggest', () => {
  it('returns 400 when age_months is missing', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines/suggest');
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('BAD_INPUT');
  });

  it('returns 400 when age_months is negative', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines/suggest?age_months=-3');
    expect(r.status).toBe(400);
  });

  it('returns 400 when age_months is not numeric', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines/suggest?age_months=abc');
    expect(r.status).toBe(400);
  });

  it('returns suggestions + age band for a toddler', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines/suggest?age_months=24');
    expect(r.status).toBe(200);
    expect(r.body.ageBand).toBe('early_0_3');
    const codes = r.body.data.map(d => d.code);
    expect(codes).toContain('EI');
  });
});

// ─── /:id bundle ─────────────────────────────────────────────────

describe('GET /:id (full bundle)', () => {
  it('returns 404 for an unknown discipline', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines/rehab.never.exists');
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NOT_FOUND');
  });

  it('returns a complete bundle for PT', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines/rehab.physical_therapy');
    expect(r.status).toBe(200);
    expect(r.body.data.discipline.code).toBe('PT');
    expect(r.body.data.kpis.length).toBeGreaterThan(0);
    expect(r.body.data.flags.length).toBeGreaterThan(0);
    expect(r.body.data.programTemplates.length).toBeGreaterThan(0);
    expect(r.body.data.interventions.length).toBeGreaterThan(0);
    expect(r.body.data.measures.length).toBeGreaterThan(0);
    expect(r.body.data.goalTemplates.length).toBeGreaterThan(0);
  });
});

// ─── /:id/programs /:id/interventions /:id/measures /:id/goal-templates ──

describe('GET /:id/programs', () => {
  it('returns 404 for an unknown discipline', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines/rehab.bogus/programs');
    expect(r.status).toBe(404);
  });

  it('returns program templates for SLP', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines/rehab.speech_language/programs');
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBeGreaterThan(0);
    expect(r.body.data.every(p => typeof p.code === 'string')).toBe(true);
  });
});

describe('GET /:id/interventions', () => {
  it('returns first-line interventions for ABA', async () => {
    const app = buildApp();
    const r = await request(app).get(
      '/api/v1/rehab/disciplines/rehab.behavioral_therapy/interventions'
    );
    expect(r.status).toBe(200);
    const codes = r.body.data.map(i => i.code);
    expect(codes).toContain('ABA-DTT');
  });

  it('returns 404 for unknown discipline', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines/rehab.bogus/interventions');
    expect(r.status).toBe(404);
  });
});

describe('GET /:id/measures', () => {
  it('returns recommended measures for EI', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/disciplines/rehab.early_intervention/measures');
    expect(r.status).toBe(200);
    const codes = r.body.data.map(m => m.code);
    expect(codes).toContain('M-CHAT-R');
  });
});

describe('GET /:id/goal-templates', () => {
  it('returns SMART goal templates for OT', async () => {
    const app = buildApp();
    const r = await request(app).get(
      '/api/v1/rehab/disciplines/rehab.occupational_therapy/goal-templates'
    );
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBeGreaterThan(0);
    for (const g of r.body.data) {
      expect(typeof g.code).toBe('string');
      expect(typeof g.metric).toBe('string');
      expect(typeof g.masteryCriteria).toBe('string');
    }
  });
});

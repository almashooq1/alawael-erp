/**
 * rehab-goal-suggestions-routes.test.js — Phase 9 Commit 8.
 *
 * End-to-end HTTP tests for the goal-suggestions router via supertest.
 * No DB, no auth. Proves input-shape validation + success paths.
 */

'use strict';

const express = require('express');
const request = require('supertest');

const { createRehabGoalSuggestionsRouter } = require('../routes/rehab-goal-suggestions.routes');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/rehab/goal-suggestions', createRehabGoalSuggestionsRouter());
  return app;
}

// ─── GET /goals ───────────────────────────────────────────────────

describe('GET /goals', () => {
  it('returns ranked suggestions with no filters', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/goal-suggestions/goals?limit=5');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data.suggestions)).toBe(true);
    expect(r.body.data.suggestions.length).toBe(5);
    expect(typeof r.body.data.evaluated).toBe('number');
  });

  it('parses discipline_ids CSV + age_months + excludes', async () => {
    const app = buildApp();
    const r = await request(app).get(
      '/api/v1/rehab/goal-suggestions/goals?discipline_ids=rehab.early_intervention&age_months=18&limit=3'
    );
    expect(r.status).toBe(200);
    expect(r.body.data.ageBand).toBe('early_0_3');
    // Top suggestion should be an EI template
    expect(r.body.data.suggestions[0].discipline.code).toBe('EI');
  });

  it('returns 400 for bad age_months', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/goal-suggestions/goals?age_months=-5');
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('BAD_INPUT');
  });

  it('returns 400 for out-of-range limit', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/goal-suggestions/goals?limit=9999');
    expect(r.status).toBe(400);
  });
});

// ─── POST /goals ──────────────────────────────────────────────────

describe('POST /goals', () => {
  it('accepts a JSON body with disciplineIds + ageMonths', async () => {
    const app = buildApp();
    const r = await request(app)
      .post('/api/v1/rehab/goal-suggestions/goals')
      .send({
        disciplineIds: ['rehab.speech_language'],
        ageMonths: 60,
        limit: 5,
      });
    expect(r.status).toBe(200);
    expect(r.body.data.suggestions.length).toBeGreaterThan(0);
    expect(r.body.data.suggestions[0].discipline.code).toBe('SLP');
  });

  it('rejects non-array disciplineIds', async () => {
    const app = buildApp();
    const r = await request(app)
      .post('/api/v1/rehab/goal-suggestions/goals')
      .send({ disciplineIds: 'not an array' });
    expect(r.status).toBe(400);
  });

  it('rejects negative ageMonths', async () => {
    const app = buildApp();
    const r = await request(app)
      .post('/api/v1/rehab/goal-suggestions/goals')
      .send({ ageMonths: -1 });
    expect(r.status).toBe(400);
  });

  it('excludes templates listed in existingGoalCodes', async () => {
    const app = buildApp();
    // First, discover a real code
    const first = await request(app).get('/api/v1/rehab/goal-suggestions/goals?limit=1');
    const excludeCode = first.body.data.suggestions[0].code;

    const r = await request(app)
      .post('/api/v1/rehab/goal-suggestions/goals')
      .send({ existingGoalCodes: [excludeCode], limit: 100 });
    expect(r.status).toBe(200);
    expect(r.body.data.suggestions.map(s => s.code)).not.toContain(excludeCode);
  });
});

// ─── GET /interventions ───────────────────────────────────────────

describe('GET /interventions', () => {
  it('returns interventions for a known discipline', async () => {
    const app = buildApp();
    const r = await request(app).get(
      '/api/v1/rehab/goal-suggestions/interventions?discipline_id=rehab.behavioral_therapy'
    );
    expect(r.status).toBe(200);
    const codes = r.body.data.interventions.map(i => i.code);
    expect(codes).toContain('ABA-DTT');
  });

  it('returns 400 without discipline_id', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/goal-suggestions/interventions');
    expect(r.status).toBe(400);
  });

  it('returns 404 for an unknown discipline_id', async () => {
    const app = buildApp();
    const r = await request(app).get(
      '/api/v1/rehab/goal-suggestions/interventions?discipline_id=rehab.never_exists'
    );
    expect(r.status).toBe(404);
  });
});

// ─── GET /draft ───────────────────────────────────────────────────

describe('GET /draft', () => {
  it('returns 400 without template_code', async () => {
    const app = buildApp();
    const r = await request(app).get('/api/v1/rehab/goal-suggestions/draft');
    expect(r.status).toBe(400);
  });

  it('returns 404 for unknown template_code', async () => {
    const app = buildApp();
    const r = await request(app).get(
      '/api/v1/rehab/goal-suggestions/draft?template_code=NEVER-EXISTS'
    );
    expect(r.status).toBe(404);
  });

  it('returns a bundle for a known template', async () => {
    const app = buildApp();
    // Discover a real code first
    const first = await request(app).get('/api/v1/rehab/goal-suggestions/goals?limit=1');
    const code = first.body.data.suggestions[0].code;

    const r = await request(app).get(
      `/api/v1/rehab/goal-suggestions/draft?template_code=${encodeURIComponent(code)}&age_months=24`
    );
    expect(r.status).toBe(200);
    expect(r.body.data.template.code).toBe(code);
    expect(r.body.data.topInterventions.length).toBeGreaterThan(0);
    expect(r.body.data.ageBand).toBe('early_0_3');
  });
});

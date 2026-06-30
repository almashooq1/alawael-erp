'use strict';

/**
 * rehabilitation-routers-auth-wave1556.test.js — W1556
 *
 * P0 class: routers under the four rehabilitation-* directories are mounted by the
 * clinical registries via safeMount / dualMount (which inject NO auth middleware),
 * and this app has NO global app.use(authenticate). Eight of them shipped with no
 * router-level auth either, so they were reachable ANONYMOUSLY — including
 * /api/disability-rehab (330 endpoints of beneficiary treatment plans, therapy/ABA
 * session records, assessments). W1555 fixed smart-iep; W1556 closes the rest.
 *
 * Static guard: EVERY express.Router() file in the four rehabilitation-* dirs that
 * declares routes MUST self-apply authenticate (router.use or per-route) — so a
 * future anonymous router in these dirs fails CI. Behavioral: a representative
 * router rejects an unauthenticated request with 401 via the REAL authenticate.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');

const DIRS = [
  'rehabilitation-services',
  'rehabilitation-assessment',
  'rehabilitation-family',
  'rehabilitation-ai',
];
const BACKEND = path.join(__dirname, '..');

function routerFiles() {
  const out = [];
  for (const d of DIRS) {
    const abs = path.join(BACKEND, d);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (!name.endsWith('.js')) continue;
      const src = fs.readFileSync(path.join(abs, name), 'utf8');
      const isRouter = /=\s*express\.Router\(\)/.test(src);
      const hasRoutes = /\brouter\.(get|post|put|patch|delete)\s*\(/.test(src);
      if (isRouter && hasRoutes) out.push({ rel: `${d}/${name}`, src });
    }
  }
  return out;
}

describe('W1556 — rehabilitation-* routers must require authentication', () => {
  const files = routerFiles();

  it('discovers the clinical router files', () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  it.each(routerFiles().map(f => f.rel))('%s self-applies authenticate', rel => {
    const src = fs.readFileSync(path.join(BACKEND, rel), 'utf8');
    const routerLevel = /router\.use\(\s*(authenticate|authenticateToken)\b/.test(src);
    // per-route auth (authenticate/authenticateToken/requireManager passed as middleware)
    const perRoute =
      /\.(get|post|put|patch|delete)\([^)]*\b(authenticate|authenticateToken|requireManager|requireRole)\b/.test(
        src
      );
    expect(routerLevel || perRoute).toBe(true);
  });

  it('behavioral: a representative router 401s an unauthenticated request', async () => {
    const app = express();
    app.use(express.json());
    // recommendation-engine is a lightweight stub (no DB); real authenticate (NOT mocked)
    app.use('/api/rehab-recommendations', require('../rehabilitation-ai/recommendation-engine'));
    app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
    const r = await request(app).get('/api/rehab-recommendations/anything');
    expect([401, 403]).toContain(r.status);
  });
});

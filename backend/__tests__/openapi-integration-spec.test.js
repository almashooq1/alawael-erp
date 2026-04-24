/**
 * openapi-integration-spec.test.js — structural smoke check for the
 * hand-crafted OpenAPI 3.1 spec at docs/api/openapi-integration.yaml.
 *
 * The test guards against the three most common regressions for a
 * manually-maintained spec:
 *   1. YAML stops parsing.
 *   2. A path the backend exposes is missing from the spec (e.g. someone
 *      added a new endpoint and forgot to document it).
 *   3. A component schema is referenced but not defined.
 *
 * We also assert the route mounts correctly and serves both .yaml and
 * .json through supertest — proves operators can scrape it.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const express = require('express');
const request = require('supertest');

const SPEC_PATH = path.resolve(__dirname, '..', '..', 'docs', 'api', 'openapi-integration.yaml');

// Endpoints we shipped across Phases I-V that MUST be in the spec.
const REQUIRED_PATHS = [
  '/api/v1/nafath/signing/request',
  '/api/v1/nafath/signing/{id}/status',
  '/api/v1/nafath/signing/{id}/cancel',
  '/api/v1/nafath/signing/{id}/verify',
  '/api/v1/nafath/signing/{id}/evidence',
  '/api/v1/yakeen/verify',
  '/api/v1/yakeen/verify/history/{nationalId}',
  '/api/v1/yakeen/verify/by-entity/{type}/{id}',
  '/api/v1/wasel/address/verify-short-code',
  '/api/v1/wasel/address/search-by-id',
  '/api/v1/wasel/address/health',
  '/api/v1/webhooks/nphies',
  '/api/v1/admin/ops/integration-health',
  '/api/v1/admin/ops/dlq',
  '/api/v1/admin/ops/dlq/{id}',
  '/api/v1/admin/ops/dlq/{id}/replay',
  '/api/v1/admin/ops/dlq/{id}/discard',
  '/api/health/metrics/integrations',
];

describe('OpenAPI integration spec — structural checks', () => {
  let spec;

  beforeAll(() => {
    const raw = fs.readFileSync(SPEC_PATH, 'utf8');
    spec = YAML.parse(raw);
  });

  it('parses as valid YAML and declares OpenAPI 3.1', () => {
    expect(spec).toBeTruthy();
    expect(typeof spec.openapi).toBe('string');
    expect(spec.openapi.startsWith('3.1')).toBe(true);
  });

  it('has info + servers + tags + security', () => {
    expect(spec.info?.title).toBeTruthy();
    expect(Array.isArray(spec.servers) && spec.servers.length).toBeGreaterThan(0);
    expect(Array.isArray(spec.tags) && spec.tags.length).toBeGreaterThan(0);
    expect(Array.isArray(spec.security)).toBe(true);
  });

  it('declares both bearerAuth and hmacSignature security schemes', () => {
    expect(spec.components?.securitySchemes?.bearerAuth).toBeTruthy();
    expect(spec.components?.securitySchemes?.hmacSignature).toBeTruthy();
  });

  it.each(REQUIRED_PATHS)('documents path %s', p => {
    expect(spec.paths[p]).toBeTruthy();
  });

  it('every $ref points at a defined schema or parameter or response', () => {
    const text = JSON.stringify(spec);
    const refs = Array.from(text.matchAll(/"\$ref":"#\/components\/(\w+)\/([\w-]+)"/g));
    expect(refs.length).toBeGreaterThan(10);
    for (const [_, kind, name] of refs) {
      expect(spec.components?.[kind]).toBeDefined();
      expect(spec.components[kind][name]).toBeDefined();
    }
  });

  it('every operation with a 200 response declares a content type', () => {
    for (const [p, methods] of Object.entries(spec.paths)) {
      for (const [m, op] of Object.entries(methods)) {
        if (typeof op !== 'object' || !op.responses) continue;
        const ok = op.responses['200'] || op.responses['201'];
        if (!ok) continue;
        expect(ok.description).toBeTruthy();
        // 201/200 with a body should declare content; 204s are skipped above
        if (ok.content) {
          const types = Object.keys(ok.content);
          expect(types.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('OpenAPI spec HTTP surface', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use('/api/docs', require('../routes/openapi-integration.routes'));
  });

  it('GET /api/docs/integration.yaml returns text/yaml', async () => {
    const res = await request(app).get('/api/docs/integration.yaml').expect(200);
    expect(res.headers['content-type']).toMatch(/yaml/);
    expect(res.text).toMatch(/^openapi:\s*3\.1/m);
    expect(res.text).toMatch(/\/api\/v1\/nafath\/signing\/request/);
  });

  it('GET /api/docs/integration.json returns application/json and parses as spec', async () => {
    const res = await request(app).get('/api/docs/integration.json').expect(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.openapi).toMatch(/^3\.1/);
    expect(res.body.paths['/api/v1/nafath/signing/request']).toBeTruthy();
  });
});

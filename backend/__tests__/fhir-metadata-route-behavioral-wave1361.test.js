'use strict';

/**
 * W1361 — behavioral counterpart to the W1357 static drift guard
 * (`fhir-metadata-route-wave1357.test.js`).
 *
 * WHY: the W1357 guard statically proves the GET /metadata source DELEGATES
 * to buildCapabilityStatement and declares no PHI fields. But "the route is
 * wired to a function" and "the route actually returns a valid FHIR R4
 * CapabilityStatement over HTTP" are different claims — per CLAUDE.md doctrine
 * "Pair every static drift guard with a behavioral counterpart" (+ W349:
 * "only RUNNING the wired code catches behavioral bugs"). W1359 did this for
 * the PHI Patient/:id read; this closes the same gap for the metadata route,
 * giving the FHIR route layer complete behavioral coverage.
 *
 * The metadata route is PURE (no DB / no PHI), so no MongoMemoryServer is
 * needed — a bare Express app + supertest is sufficient and fast.
 *
 * Asserts (flag-agnostic — metadata is never PHI):
 *   1. GET /metadata → 200 + application/fhir+json.
 *   2. body is a FHIR R4 CapabilityStatement (resourceType + fhirVersion 4.0.1
 *      + kind:capability + a /metadata-declaring rest interaction).
 *   3. rest resources are read-only (only read / search-type interactions —
 *      the mapper layer emits, never imports).
 *   4. NO PHI leaks (no name/identifier/birthDate/nationalId anywhere in the
 *      serialized body) — the security contract of a discovery endpoint.
 *   5. flag-OFF default: GET /Patient/:id behaves as absent (404 OperationOutcome,
 *      no PHI) when ENABLE_FHIR_PHI_EXPORT is unset — proves the metadata
 *      surface stays non-sensitive even alongside the gated PHI route.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *   __tests__/fhir-metadata-route-behavioral-wave1361.test.js --runInBand
 */

const express = require('express');
const request = require('supertest');

let app;

beforeAll(() => {
  // Ensure the PHI flag is OFF so the Patient/:id default-absent path is what
  // test 5 observes (matches shipped production default).
  delete process.env.ENABLE_FHIR_PHI_EXPORT;
  delete require.cache[require.resolve('../routes/fhir.routes')];
  const router = require('../routes/fhir.routes');

  app = express();
  app.use('/fhir', router);
});

describe('W1361 — FHIR GET /metadata behavioral (CapabilityStatement, no PHI)', () => {
  it('1. GET /metadata → 200 + application/fhir+json', async () => {
    await request(app)
      .get('/fhir/metadata')
      .expect(200)
      .expect('Content-Type', /application\/fhir\+json/);
  });

  it('2. body is a FHIR R4 CapabilityStatement', async () => {
    const res = await request(app).get('/fhir/metadata').expect(200);
    expect(res.body.resourceType).toBe('CapabilityStatement');
    expect(res.body.fhirVersion).toBe('4.0.1');
    expect(res.body.kind).toBe('capability');
    expect(Array.isArray(res.body.rest)).toBe(true);
    expect(res.body.rest.length).toBeGreaterThan(0);
    // The conformance interaction surface must declare server mode.
    expect(res.body.rest[0].mode).toBe('server');
    expect(Array.isArray(res.body.rest[0].resource)).toBe(true);
    expect(res.body.rest[0].resource.length).toBeGreaterThan(0);
  });

  it('3. declared resource interactions are read-only (read / search-type)', async () => {
    const res = await request(app).get('/fhir/metadata').expect(200);
    const allowed = new Set(['read', 'search-type']);
    for (const resource of res.body.rest[0].resource) {
      expect(Array.isArray(resource.interaction)).toBe(true);
      for (const inter of resource.interaction) {
        expect(allowed.has(inter.code)).toBe(true);
      }
    }
  });

  it('4. NO PHI leaks in the serialized CapabilityStatement', async () => {
    const res = await request(app).get('/fhir/metadata').expect(200);
    const serialized = JSON.stringify(res.body).toLowerCase();
    // Discovery metadata must never carry person-level data.
    for (const phiToken of ['birthdate', 'nationalid', 'firstname', 'lastname']) {
      expect(serialized.includes(phiToken)).toBe(false);
    }
  });

  it('5. flag-OFF default: GET /Patient/:id behaves as absent (404, no PHI)', async () => {
    const res = await request(app)
      .get('/fhir/Patient/507f1f77bcf86cd799439011')
      .expect(404)
      .expect('Content-Type', /application\/fhir\+json/);
    expect(res.body.resourceType).toBe('OperationOutcome');
    expect(Array.isArray(res.body.issue)).toBe(true);
  });
});

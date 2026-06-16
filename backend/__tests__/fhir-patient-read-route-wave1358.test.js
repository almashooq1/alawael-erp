'use strict';

/**
 * W1358 — FHIR GET /Patient/:id PHI-export route drift guard.
 *
 * The route maps a canonical Beneficiary to a FHIR R4 Patient. Because it is
 * PHI-exposing it must stay triple-gated and ship OFF. This guard locks:
 *   1. routes/fhir.routes.js declares GET /Patient/:id.
 *   2. Gate 1 (feature flag) — references ENABLE_FHIR_PHI_EXPORT and the gate
 *      is opt-IN (=== 'true'), so the default is OFF.
 *   3. Gate 2 (branch isolation) — calls enforceBeneficiaryBranch (W269).
 *   4. Gate 3 (PDPL consent) — queries Consent for type 'data_sharing',
 *      revokedAt: null (active consent) before emitting PHI.
 *   5. Output is validated (toValidatedFhir + validation.valid) before send.
 *   6. The file stays GET-only (no write verbs) — read-only export surface.
 *   7. BEHAVIORAL: with the flag OFF (default), GET /Patient/<valid-id> returns
 *      404 + a FHIR OperationOutcome and NEVER touches the DB (proves the
 *      default-off contract: current no-PHI behavior is unchanged).
 *
 * Pure-static + one behavioral flag-off mount (no DB, no app boot).
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');

const ROUTE_FILE = path.join(__dirname, '..', 'routes', 'fhir.routes.js');
const routeSrc = fs.readFileSync(ROUTE_FILE, 'utf8');

describe('W1358 — FHIR GET /Patient/:id (flag+consent+branch gated PHI export)', () => {
  test('declares GET /Patient/:id', () => {
    expect(routeSrc).toMatch(/router\.get\(\s*['"]\/Patient\/:id['"]/);
  });

  test('gate 1: feature flag is opt-in (ENABLE_FHIR_PHI_EXPORT === "true", default OFF)', () => {
    expect(routeSrc).toMatch(/ENABLE_FHIR_PHI_EXPORT/);
    expect(routeSrc).toMatch(/===\s*['"]true['"]/);
  });

  test('gate 2: branch isolation via enforceBeneficiaryBranch (W269)', () => {
    expect(routeSrc).toMatch(/enforceBeneficiaryBranch\(\s*req\s*,\s*id\s*\)/);
  });

  test('gate 3: active data_sharing consent required before emitting PHI', () => {
    expect(routeSrc).toMatch(/type:\s*['"]data_sharing['"]/);
    expect(routeSrc).toMatch(/revokedAt:\s*null/);
  });

  test('validates the FHIR resource before returning it', () => {
    expect(routeSrc).toMatch(/toValidatedFhir\(\s*\n?\s*['"]Beneficiary['"]/);
    expect(routeSrc).toMatch(/validation\.valid/);
  });

  test('file stays GET-only (no write verbs)', () => {
    expect(routeSrc).not.toMatch(/router\.(post|put|patch|delete)\(/);
  });

  test('behavioral: flag OFF → GET /Patient/<valid-id> is 404 OperationOutcome, no DB', () => {
    // ENABLE_FHIR_PHI_EXPORT is unset in the test env → gate 1 short-circuits.
    delete require.cache[require.resolve('../routes/fhir.routes')];
    const router = require('../routes/fhir.routes');
    const app = express();
    app.use('/fhir', router);
    // A syntactically valid ObjectId — proves the 404 is the flag gate, not
    // an id-validation 400.
    return request(app)
      .get('/fhir/Patient/507f1f77bcf86cd799439011')
      .expect(404)
      .expect('Content-Type', /application\/fhir\+json/)
      .then(res => {
        expect(res.body.resourceType).toBe('OperationOutcome');
        expect(Array.isArray(res.body.issue)).toBe(true);
        expect(res.body.issue.length).toBeGreaterThan(0);
      });
  });
});

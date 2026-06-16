'use strict';

/**
 * W1364 — FHIR GET /Patient/:id/$everything PHI-export route drift guard.
 *
 * The $everything operation returns a searchset Bundle of the Patient plus its
 * EpisodeOfCare compartment (the platform's canonical unifying core). It is
 * PHI-exposing and multi-resource, so it ships behind the SAME three gates as
 * GET /Patient/:id and OFF by default. This guard locks:
 *   1. routes/fhir.routes.js declares GET /Patient/:id/$everything.
 *   2. Gate 1 (feature flag) — the file references ENABLE_FHIR_PHI_EXPORT and
 *      the gate is opt-IN (=== 'true'), so the default is OFF.
 *   3. Gate 2 (branch isolation) — calls enforceBeneficiaryBranch (W269).
 *   4. Gate 3 (PDPL consent) — queries Consent for type 'data_sharing',
 *      revokedAt: null (active consent) before emitting PHI.
 *   5. Output is the validated Bundle (toValidatedFhirBundle + validation.valid)
 *      before send — a malformed compartment yields 422, not a partial leak.
 *   6. The file stays GET-only (no write verbs) — read-only export surface.
 *   7. BEHAVIORAL: with the flag OFF (default), GET /Patient/<valid-id>/$everything
 *      returns 404 + a FHIR OperationOutcome and NEVER touches the DB (proves
 *      the default-off contract: production behavior is unchanged).
 *
 * Pure-static + one behavioral flag-off mount (no DB, no app boot).
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *   __tests__/fhir-everything-route-wave1364.test.js --runInBand
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');

const ROUTE_FILE = path.join(__dirname, '..', 'routes', 'fhir.routes.js');
const routeSrc = fs.readFileSync(ROUTE_FILE, 'utf8');

describe('W1364 — FHIR GET /Patient/:id/$everything (flag+consent+branch gated Bundle export)', () => {
  test('declares GET /Patient/:id/$everything', () => {
    // path-to-regexp 0.1.x treats $ as special, so the source escapes it (\\$).
    expect(routeSrc).toMatch(/router\.get\(\s*['"]\/Patient\/:id\/\\\\\$everything['"]/);
  });

  test('gate 1: feature flag is opt-in (ENABLE_FHIR_PHI_EXPORT === "true", default OFF)', () => {
    expect(routeSrc).toMatch(/ENABLE_FHIR_PHI_EXPORT/);
    expect(routeSrc).toMatch(/===\s*['"]true['"]/);
  });

  test('gate 2: branch isolation via enforceBeneficiaryBranch (W269)', () => {
    // Both the Patient/:id and the $everything handler call it with (req, id).
    const calls = routeSrc.match(/enforceBeneficiaryBranch\(\s*req\s*,\s*id\s*\)/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  test('gate 3: active data_sharing consent required before emitting PHI', () => {
    expect(routeSrc).toMatch(/type:\s*['"]data_sharing['"]/);
    expect(routeSrc).toMatch(/revokedAt:\s*null/);
  });

  test('assembles + validates a FHIR Bundle before returning it', () => {
    expect(routeSrc).toMatch(/toValidatedFhirBundle\(/);
    expect(routeSrc).toMatch(/type:\s*['"]searchset['"]/);
  });

  test('compartment includes the EpisodeOfCare canonical core', () => {
    expect(routeSrc).toMatch(/entityName:\s*['"]EpisodeOfCare['"]/);
    expect(routeSrc).toMatch(/entityName:\s*['"]Beneficiary['"]/);
  });

  test('compartment registry (W1365/W1366) lists the audited beneficiary-keyed resources', () => {
    // The frozen PATIENT_COMPARTMENT registry drives the multi-resource export.
    expect(routeSrc).toMatch(/const\s+PATIENT_COMPARTMENT\s*=\s*Object\.freeze\(\[/);
    for (const entity of [
      // W1365 baseline
      'EpisodeOfCare',
      'SeizureEvent',
      'BehaviorIncident',
      'AdaptiveSportsProgram',
      'CaregiverSupportProgram',
      'RespiteBooking',
      // W1366 expansion
      'BeneficiaryDietPrescription',
      'SensoryDietProgram',
      'CommunicationAidProfile',
      'ProstheticOrthoticOrder',
      'InstrumentalSwallowStudy',
      'SpasticityInjection',
      'ARVRSession',
      'DttSession',
      'CreativeArtsTherapySession',
      'AdjunctTherapySession',
      'SeatAllocation',
    ]) {
      expect(routeSrc).toMatch(
        new RegExp(`entityName:\\s*['"]${entity}['"],\\s*beneficiaryField:`)
      );
    }
  });

  test('compartment EXCLUDES confidentiality-sensitive + nested-key + dual-registered records', () => {
    // SafeguardingConcern (confidential, subjectBeneficiaryId), AssistiveDevice
    // (beneficiaryId nested in loans[]), GroupTherapySession (subject is a Group,
    // not a single beneficiary) and TransitionPlan (W340 dual-registration) are
    // deliberately not admitted — adding them is a product/privacy/cleanup
    // decision, not a mechanical wire-up.
    expect(routeSrc).not.toMatch(/entityName:\s*['"]SafeguardingConcern['"]/);
    expect(routeSrc).not.toMatch(/entityName:\s*['"]AssistiveDevice['"]/);
    expect(routeSrc).not.toMatch(/entityName:\s*['"]GroupTherapySession['"]/);
    expect(routeSrc).not.toMatch(/entityName:\s*['"]TransitionPlan['"]/);
  });

  test('W1369: compartment EXCLUDES name-bridged clinical models (semantic-distortion guard)', () => {
    // The MAPPERS keys are Assessment / Session / PlanOfCare. The live clinical
    // models registered under DIFFERENT names — ClinicalAssessment,
    // ClinicalSession, UnifiedCarePlan — must NOT be admitted to the compartment
    // by their own names: there is no MAPPERS entry for them, so a naive add
    // would either contribute nothing (best case) or, if force-bridged to a
    // same-shape mapper, ship a structurally-valid but clinically-WRONG FHIR
    // resource to NPHIES that the bundle validator cannot catch (it only screens
    // structure, not semantics). Admitting them requires a deliberate name-bridge
    // + shape-by-shape human verification, NOT a mechanical wire-up. This guard
    // fails CI if any of them is silently added to PATIENT_COMPARTMENT.
    expect(routeSrc).not.toMatch(/entityName:\s*['"]ClinicalAssessment['"]/);
    expect(routeSrc).not.toMatch(/entityName:\s*['"]ClinicalSession['"]/);
    expect(routeSrc).not.toMatch(/entityName:\s*['"]UnifiedCarePlan['"]/);
  });

  test('models are resolved defensively (unregistered → contributes nothing)', () => {
    expect(routeSrc).toMatch(/function\s+tryModel\(/);
    expect(routeSrc).toMatch(/PATIENT_COMPARTMENT/);
  });

  test('per-record mapper resilience (W1366): un-projectable record is omitted, not fatal', () => {
    // Each record is screened through its mapper in a try/catch; a single
    // record a mapper cannot project is skipped (continue), never failing the
    // whole compartment export.
    expect(routeSrc).toMatch(/const\s+mapper\s*=\s*MAPPERS\[entityName\]/);
    expect(routeSrc).toMatch(/catch\s*\(_mapErr\)\s*\{\s*continue;/);
  });

  test('file stays GET-only (no write verbs)', () => {
    expect(routeSrc).not.toMatch(/router\.(post|put|patch|delete)\(/);
  });

  test('behavioral: flag OFF → GET /Patient/<valid-id>/$everything is 404 OperationOutcome, no DB', () => {
    // ENABLE_FHIR_PHI_EXPORT is unset in the test env → gate 1 short-circuits.
    delete require.cache[require.resolve('../routes/fhir.routes')];
    const router = require('../routes/fhir.routes');
    const app = express();
    app.use('/fhir', router);
    // A syntactically valid ObjectId — proves the 404 is the flag gate, not
    // an id-validation 400.
    return request(app)
      .get('/fhir/Patient/507f1f77bcf86cd799439011/$everything')
      .expect(404)
      .expect('Content-Type', /application\/fhir\+json/)
      .then(res => {
        expect(res.body.resourceType).toBe('OperationOutcome');
        expect(Array.isArray(res.body.issue)).toBe(true);
        expect(res.body.issue.length).toBeGreaterThan(0);
      });
  });
});

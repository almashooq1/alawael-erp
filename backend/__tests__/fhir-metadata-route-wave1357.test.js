'use strict';

/**
 * W1357 — FHIR /metadata route drift guard.
 *
 * Asserts the first real consumer of the dormant intelligence/fhir layer is
 * wired correctly and stays read-only + non-PHI:
 *   1. routes/fhir.routes.js exists, declares GET /metadata, GET-only.
 *   2. The handler returns a FHIR R4 CapabilityStatement via buildCapabilityStatement.
 *   3. It is mounted via dualMountAuth(app, 'fhir', ...) (auth-gated, not bare).
 *   4. The CapabilityStatement carries NO PHI fields (resource-type metadata only).
 *
 * Pure-static + one behavioral build of the CapabilityStatement (no DB, no boot).
 */

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.join(__dirname, '..', 'routes', 'fhir.routes.js');
const REGISTRY_FILE = path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js');

const routeSrc = fs.readFileSync(ROUTE_FILE, 'utf8');
const registrySrc = fs.readFileSync(REGISTRY_FILE, 'utf8');

describe('W1357 — FHIR /metadata route (first consumer of intelligence/fhir)', () => {
  test('route file declares GET /metadata', () => {
    expect(routeSrc).toMatch(/router\.get\(\s*['"]\/metadata['"]/);
  });

  test('route is GET-only (no write verbs in the file)', () => {
    expect(routeSrc).not.toMatch(/router\.(post|put|patch|delete)\(/);
  });

  test('handler delegates to buildCapabilityStatement from intelligence/fhir', () => {
    expect(routeSrc).toMatch(/buildCapabilityStatement/);
    expect(routeSrc).toMatch(/require\(\s*['"]\.\.\/intelligence\/fhir['"]\s*\)/);
  });

  test('mounted auth-gated via dualMountAuth(app, "fhir", ...) — not bare dualMount', () => {
    expect(registrySrc).toMatch(/\bdualMountAuth\(app,\s*['"]fhir['"]/);
    const code = registrySrc
      .split('\n')
      .map(line => line.replace(/\/\/.*$/, ''))
      .join('\n');
    expect(code).not.toMatch(/\bdualMount\(app,\s*['"]fhir['"]/);
  });

  test('built CapabilityStatement is FHIR R4 and contains NO PHI fields', () => {
    const { buildCapabilityStatement } = require('../intelligence/fhir');
    const stmt = buildCapabilityStatement({ date: new Date().toISOString() });
    expect(stmt.resourceType).toBe('CapabilityStatement');
    expect(stmt.fhirVersion).toBe('4.0.1');
    expect(stmt.kind).toBe('capability');
    // No PHI: the statement is pure server-capability metadata.
    const serialized = JSON.stringify(stmt);
    for (const phi of ['nationalId', 'beneficiaryId', 'mrn', 'birthDate', 'phone', 'email']) {
      expect(serialized).not.toContain(phi);
    }
  });
});

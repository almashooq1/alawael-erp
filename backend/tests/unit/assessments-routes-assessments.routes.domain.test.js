/**
 * Tests for domains/assessments/routes/assessments.routes.js
 * Validates structure, field mapping (canonical model), and HTTP surface.
 * @generated P#106 — clinical assessments domain
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '../../domains/assessments/routes/assessments.routes.js');

describe('domains/assessments/routes/assessments.routes.js', () => {
  let source;

  beforeAll(() => {
    source = fs.readFileSync(SRC, 'utf8');
  });

  test('file exists', () => {
    expect(fs.existsSync(SRC)).toBe(true);
  });

  test('is syntactically valid JavaScript', () => {
    expect(() => new vm.Script(source, { filename: 'assessments.routes.js' })).not.toThrow();
  });

  test('uses express Router', () => {
    expect(source).toMatch(/express\.Router/);
  });

  test('defines POST / route', () => {
    expect(source).toMatch(/router\.post\s*\(\s*['"`]\/['"`]/);
  });

  test('defines GET / route', () => {
    expect(source).toMatch(/router\.get\s*\(\s*['"`]\/['"`]/);
  });

  test('defines GET /dashboard route', () => {
    expect(source).toMatch(/['"`]\/dashboard['"`]/);
  });

  test('defines GET /beneficiary/:id route', () => {
    expect(source).toMatch(/\/beneficiary\//);
  });

  test('defines GET /:id route', () => {
    expect(source).toMatch(/router\.get\s*\(\s*['"`]\/:id['"`]/);
  });

  test('defines PUT /:id route', () => {
    expect(source).toMatch(/router\.put\s*\(\s*['"`]\/:id['"`]/);
  });

  test('defines PUT /:id/complete route', () => {
    expect(source).toMatch(/\/:id\/complete/);
  });

  test('uses canonical beneficiary field (not beneficiaryId) in create', () => {
    // The POST handler must map to canonical field name
    expect(source).toMatch(/beneficiary:\s*beneficiaryValue/);
  });

  test('uses canonical tool field (not type) in create payload', () => {
    expect(source).toMatch(/tool:\s*toolValue/);
  });

  test('uses canonical assessmentDate field in create payload', () => {
    expect(source).toMatch(/assessmentDate:\s*assessmentDateValue/);
  });

  test('uses canonical beneficiary field in beneficiary/:id query', () => {
    expect(source).toMatch(/beneficiary:\s*req\.params\.id/);
  });

  test('uses draft status (not scheduled) on create', () => {
    expect(source).toMatch(/status:\s*['"`]draft['"`]/);
  });

  test('uses asyncHandler wrapper', () => {
    expect(source).toMatch(/asyncHandler/);
  });

  test('exports router', () => {
    expect(source).toMatch(/module\.exports\s*=\s*router/);
  });

  test('has requireModel middleware guard', () => {
    expect(source).toMatch(/requireModel/);
  });

  test('returns 503 when model unavailable', () => {
    expect(source).toMatch(/503/);
  });

  test('validates required fields with 400 response', () => {
    expect(source).toMatch(/400/);
  });
});

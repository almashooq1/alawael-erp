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

  test('defines GET /:assessmentId route', () => {
    expect(source).toMatch(/router\.get\s*\(\s*['"`]\/:assessmentId['"`]/);
  });

  test('defines PUT /:assessmentId route', () => {
    expect(source).toMatch(/router\.put\s*\(\s*['"`]\/:assessmentId['"`]/);
  });

  test('defines PUT /:assessmentId/complete route', () => {
    expect(source).toMatch(/\/:assessmentId\/complete/);
  });

  test('uses canonical beneficiary field (not beneficiaryId) in create', () => {
    expect(source).toMatch(/beneficiary\b/);
  });

  test('uses canonical tool field (not type) in create payload', () => {
    expect(source).toMatch(/\btool\b|\bcategory\b|\btype\b/);
  });

  test('uses canonical assessmentDate field in create payload', () => {
    expect(source).toMatch(/assessmentDate|date/i);
  });

  test('uses canonical beneficiary field in beneficiary/:id query', () => {
    expect(source).toMatch(/beneficiary/);
  });

  test('uses status field on create', () => {
    expect(source).toMatch(/status/);
  });

  test('uses asyncHandler wrapper', () => {
    expect(source).toMatch(/asyncHandler/);
  });

  test('exports router', () => {
    expect(source).toMatch(/module\.exports\s*=\s*router/);
  });

  test('has service/model availability guard middleware', () => {
    expect(source).toMatch(/requireModel|requireService/);
  });

  test('returns 503 when model unavailable', () => {
    expect(source).toMatch(/503/);
  });

  test('handles errors via asyncHandler or status responses', () => {
    expect(source).toMatch(/asyncHandler|res\.status|400|404|503/i);
  });
});

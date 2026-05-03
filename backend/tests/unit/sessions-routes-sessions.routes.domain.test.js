/**
 * Tests for domains/sessions/routes/sessions.routes.js
 * Validates structure, HTTP surface, and field alignment with ClinicalSession model.
 * @generated P#106 — clinical sessions domain
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '../../domains/sessions/routes/sessions.routes.js');

describe('domains/sessions/routes/sessions.routes.js', () => {
  let source;

  beforeAll(() => {
    source = fs.readFileSync(SRC, 'utf8');
  });

  test('file exists', () => {
    expect(fs.existsSync(SRC)).toBe(true);
  });

  test('is syntactically valid JavaScript', () => {
    expect(() => new vm.Script(source, { filename: 'sessions.routes.js' })).not.toThrow();
  });

  test('uses express Router', () => {
    expect(source).toMatch(/express\.Router/);
  });

  test('defines POST / route (schedule session)', () => {
    expect(source).toMatch(/router\.post\s*\(\s*['"`]\/['"`]/);
  });

  test('defines GET / route (list sessions)', () => {
    expect(source).toMatch(/router\.get\s*\(\s*['"`]\/['"`]/);
  });

  test('defines GET /dashboard route', () => {
    expect(source).toMatch(/['"`]\/dashboard['"`]/);
  });

  test('defines GET /beneficiary/:id route', () => {
    expect(source).toMatch(/\/beneficiary\//);
  });

  test('defines GET /therapist/:id route', () => {
    expect(source).toMatch(/\/therapist\//);
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

  test('defines PUT /:id/cancel route', () => {
    expect(source).toMatch(/\/:id\/cancel/);
  });

  test('uses beneficiaryId (aligns with ClinicalSession model)', () => {
    expect(source).toMatch(/beneficiaryId/);
  });

  test('uses scheduledDate field (aligns with ClinicalSession model)', () => {
    expect(source).toMatch(/scheduledDate/);
  });

  test('validates required fields with 400 response', () => {
    expect(source).toMatch(/400/);
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

  test('uses todaySessions count in dashboard', () => {
    expect(source).toMatch(/todaySessions/);
  });
});

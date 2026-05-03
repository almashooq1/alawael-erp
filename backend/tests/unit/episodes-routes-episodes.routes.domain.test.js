/**
 * Tests for routes/episodes.routes.js — Episodes of Care CRUD
 * Validates structure, HTTP surface, and RBAC patterns.
 * @generated P#106 — episodes of care
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.resolve(__dirname, '../../routes/episodes.routes.js');

describe('routes/episodes.routes.js', () => {
  let source;

  beforeAll(() => {
    source = fs.readFileSync(SRC, 'utf8');
  });

  test('file exists', () => {
    expect(fs.existsSync(SRC)).toBe(true);
  });

  test('is syntactically valid JavaScript', () => {
    expect(() => new vm.Script(source, { filename: 'episodes.routes.js' })).not.toThrow();
  });

  test('uses express Router', () => {
    expect(source).toMatch(/express\.Router/);
  });

  test('uses authenticateToken middleware', () => {
    expect(source).toMatch(/authenticateToken/);
  });

  test('uses requireRole RBAC middleware', () => {
    expect(source).toMatch(/requireRole/);
  });

  test('defines GET /stats route', () => {
    expect(source).toMatch(/['"`]\/stats['"`]/);
  });

  test('defines GET /beneficiary/:beneficiaryId route', () => {
    expect(source).toMatch(/\/beneficiary\/:beneficiaryId/);
  });

  test('defines GET / route (list with pagination)', () => {
    expect(source).toMatch(/router\.get\s*\(\s*['"`]\/['"`]/);
  });

  test('defines GET /:id route (single episode)', () => {
    expect(source).toMatch(/router\.get\s*\(\s*['"`]\/:id['"`]/);
  });

  test('defines POST / route (create episode)', () => {
    expect(source).toMatch(/router\.post\s*\(\s*['"`]\/['"`]/);
  });

  test('defines PATCH /:id route (update episode)', () => {
    expect(source).toMatch(/router\.patch\s*\(\s*['"`]\/:id['"`]/);
  });

  test('defines PATCH /:id/phase route (advance phase)', () => {
    expect(source).toMatch(/\/:id\/phase/);
  });

  test('defines DELETE /:id route (soft-delete)', () => {
    expect(source).toMatch(/router\.delete\s*\(\s*['"`]\/:id['"`]/);
  });

  test('uses isArchived soft-delete pattern', () => {
    expect(source).toMatch(/isArchived/);
  });

  test('aggregates byPhase for stats', () => {
    expect(source).toMatch(/byPhase/);
  });

  test('validates ObjectId with mongoose', () => {
    expect(source).toMatch(/ObjectId\.isValid/);
  });

  test('uses safeError for error responses', () => {
    expect(source).toMatch(/safeError/);
  });

  test('exports router', () => {
    expect(source).toMatch(/module\.exports\s*=\s*router/);
  });

  test('WRITE_ROLES defined for access control', () => {
    expect(source).toMatch(/WRITE_ROLES/);
  });

  test('READ_ROLES defined for access control', () => {
    expect(source).toMatch(/READ_ROLES/);
  });
});

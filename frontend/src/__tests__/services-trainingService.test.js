/**
 * Auto-generated tests for services/trainingService.js
 * Type: service | 325L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/trainingService.js');

describe('services/trainingService.js', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(SRC, 'utf8');
  });

  test('file exists', () => {
    expect(fs.existsSync(SRC)).toBe(true);
  });

  test('is not empty', () => {
    expect(source.trim().length).toBeGreaterThan(0);
  });

  test('exports programsService', () => {
    expect(source).toMatch(/programsService/);
  });

  test('exports coursesService', () => {
    expect(source).toMatch(/coursesService/);
  });

  test('exports certificationsService', () => {
    expect(source).toMatch(/certificationsService/);
  });

  test('exports sessionsService', () => {
    expect(source).toMatch(/sessionsService/);
  });

  test('exports plansService', () => {
    expect(source).toMatch(/plansService/);
  });

  test('exports trainingReportsService', () => {
    expect(source).toMatch(/trainingReportsService/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (29)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBe(29);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: service | Lines: 325 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(325);
  });
});

/**
 * Auto-generated tests for services/icfAssessmentService.js
 * Type: service | 73L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/icfAssessmentService.js');

describe('services/icfAssessmentService.js', () => {
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

  test('exports assessmentsService', () => {
    expect(source).toMatch(/assessmentsService/);
  });

  test('exports codesService', () => {
    expect(source).toMatch(/codesService/);
  });

  test('exports benchmarksService', () => {
    expect(source).toMatch(/benchmarksService/);
  });

  test('exports reportsService', () => {
    expect(source).toMatch(/reportsService/);
  });

  test('exports beneficiaryService', () => {
    expect(source).toMatch(/beneficiaryService/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 73 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(73);
  });
});

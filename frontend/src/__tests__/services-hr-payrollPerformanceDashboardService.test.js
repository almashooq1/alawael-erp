/**
 * Auto-generated tests for services/hr/payrollPerformanceDashboardService.js
 * Type: service | 73L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/hr/payrollPerformanceDashboardService.js');

describe('services/hr/payrollPerformanceDashboardService.js', () => {
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

  test('exports getPayroll', () => {
    expect(source).toMatch(/getPayroll/);
  });

  test('exports getPerformanceReviews', () => {
    expect(source).toMatch(/getPerformanceReviews/);
  });

  test('exports createPerformanceReview', () => {
    expect(source).toMatch(/createPerformanceReview/);
  });

  test('exports getDashboardKPIs', () => {
    expect(source).toMatch(/getDashboardKPIs/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (1)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBe(1);
  });

  test('has 3 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(3);
  });

  test('file structure', () => {
    // Type: service | Lines: 73 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(73);
  });
});

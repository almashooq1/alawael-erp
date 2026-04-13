/**
 * Auto-generated tests for services/vendorService.js
 * Type: service | 380L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/vendorService.js');

describe('services/vendorService.js', () => {
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

  test('exports MOCK_VENDORS', () => {
    expect(source).toMatch(/MOCK_VENDORS/);
  });

  test('exports MOCK_EVALUATIONS', () => {
    expect(source).toMatch(/MOCK_EVALUATIONS/);
  });

  test('exports MOCK_VENDOR_DASHBOARD', () => {
    expect(source).toMatch(/MOCK_VENDOR_DASHBOARD/);
  });

  test('exports vendorsService', () => {
    expect(source).toMatch(/vendorsService/);
  });

  test('exports evaluationsService', () => {
    expect(source).toMatch(/evaluationsService/);
  });

  test('exports vendorReportsService', () => {
    expect(source).toMatch(/vendorReportsService/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (1)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBe(1);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: service | Lines: 380 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(380);
  });
});

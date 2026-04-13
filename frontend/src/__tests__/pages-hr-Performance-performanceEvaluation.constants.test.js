/**
 * Auto-generated tests for pages/hr/Performance/performanceEvaluation.constants.js
 * Type: page | 313L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/hr/Performance/performanceEvaluation.constants.js');

describe('pages/hr/Performance/performanceEvaluation.constants.js', () => {
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

  test('exports STATUS_CONFIG', () => {
    expect(source).toMatch(/STATUS_CONFIG/);
  });

  test('exports RATING_CONFIG', () => {
    expect(source).toMatch(/RATING_CONFIG/);
  });

  test('exports COL_MAP', () => {
    expect(source).toMatch(/COL_MAP/);
  });

  test('exports FIELD_SETS', () => {
    expect(source).toMatch(/FIELD_SETS/);
  });

  test('exports DEMO_DATA', () => {
    expect(source).toMatch(/DEMO_DATA/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: page | Lines: 313 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(313);
  });
});

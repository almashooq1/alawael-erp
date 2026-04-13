/**
 * Auto-generated tests for pages/SystemAdmin/systemAdmin.constants.js
 * Type: page | 159L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/SystemAdmin/systemAdmin.constants.js');

describe('pages/SystemAdmin/systemAdmin.constants.js', () => {
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

  test('exports STATUS_COLORS', () => {
    expect(source).toMatch(/STATUS_COLORS/);
  });

  test('exports COL_MAP', () => {
    expect(source).toMatch(/COL_MAP/);
  });

  test('exports FIELD_SETS', () => {
    expect(source).toMatch(/FIELD_SETS/);
  });

  test('exports getStats', () => {
    expect(source).toMatch(/getStats/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: page | Lines: 159 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(159);
  });
});

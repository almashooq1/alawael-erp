/**
 * Auto-generated tests for pages/HRAdvancedDashboard/constants.js
 * Type: page | 35L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/HRAdvancedDashboard/constants.js');

describe('pages/HRAdvancedDashboard/constants.js', () => {
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

  test('exports HR_CHART_COLORS', () => {
    expect(source).toMatch(/HR_CHART_COLORS/);
  });

  test('exports STATUS_MAP', () => {
    expect(source).toMatch(/STATUS_MAP/);
  });

  test('exports isPresent', () => {
    expect(source).toMatch(/isPresent/);
  });

  test('exports isLate', () => {
    expect(source).toMatch(/isLate/);
  });

  test('exports isAbsent', () => {
    expect(source).toMatch(/isAbsent/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: page | Lines: 35 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(35);
  });
});

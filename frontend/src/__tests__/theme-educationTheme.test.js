/**
 * Auto-generated tests for theme/educationTheme.js
 * Type: theme | 313L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../theme/educationTheme.js');

describe('theme/educationTheme.js', () => {
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

  test('has default export (educationTheme)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/educationTheme/);
  });

  test('exports getGradeColor', () => {
    expect(source).toMatch(/getGradeColor/);
  });

  test('exports getAttendanceColor', () => {
    expect(source).toMatch(/getAttendanceColor/);
  });

  test('exports getRiskLevelColor', () => {
    expect(source).toMatch(/getRiskLevelColor/);
  });

  test('exports educationColors', () => {
    expect(source).toMatch(/educationColors/);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: theme | Lines: 313 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(313);
  });
});

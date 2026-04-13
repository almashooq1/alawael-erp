/**
 * Auto-generated tests for theme/professionalTheme.js
 * Type: theme | 869L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../theme/professionalTheme.js');

describe('theme/professionalTheme.js', () => {
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

  test('has default export (lightTheme)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/lightTheme/);
  });

  test('exports createAppTheme', () => {
    expect(source).toMatch(/createAppTheme/);
  });

  test('exports lightTheme', () => {
    expect(source).toMatch(/lightTheme/);
  });

  test('exports darkTheme', () => {
    expect(source).toMatch(/darkTheme/);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: theme | Lines: 869 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(869);
  });
});

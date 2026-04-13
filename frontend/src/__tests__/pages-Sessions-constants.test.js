/**
 * Auto-generated tests for pages/Sessions/constants.js
 * Type: page | 184L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/Sessions/constants.js');

describe('pages/Sessions/constants.js', () => {
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

  test('exports SESSION_TYPES', () => {
    expect(source).toMatch(/SESSION_TYPES/);
  });

  test('exports STATUS_MAP', () => {
    expect(source).toMatch(/STATUS_MAP/);
  });

  test('exports STATUS_FILTER_OPTIONS', () => {
    expect(source).toMatch(/STATUS_FILTER_OPTIONS/);
  });

  test('exports RECURRENCE_OPTIONS', () => {
    expect(source).toMatch(/RECURRENCE_OPTIONS/);
  });

  test('exports INITIAL_FORM', () => {
    expect(source).toMatch(/INITIAL_FORM/);
  });

  test('exports generateDemoSessions', () => {
    expect(source).toMatch(/generateDemoSessions/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: page | Lines: 184 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(184);
  });
});

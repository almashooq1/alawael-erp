/**
 * Auto-generated tests for pages/Register/CustomStepIcon.js
 * Type: page | 16L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/Register/CustomStepIcon.js');

describe('pages/Register/CustomStepIcon.js', () => {
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

  test('has default export (CustomStepIcon)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/CustomStepIcon/);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: page | Lines: 16 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(16);
  });
});

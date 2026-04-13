/**
 * Auto-generated tests for components/Sparkline.js
 * Type: component | 28L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../components/Sparkline.js');

describe('components/Sparkline.js', () => {
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

  test('has default export (Sparkline)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/Sparkline/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: component | Lines: 28 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(28);
  });
});

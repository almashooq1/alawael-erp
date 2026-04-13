/**
 * Auto-generated tests for components/BarChart.js
 * Type: component | 67L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../components/BarChart.js');

describe('components/BarChart.js', () => {
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

  test('has default export (BarChart)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/BarChart/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: component | Lines: 67 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(67);
  });
});

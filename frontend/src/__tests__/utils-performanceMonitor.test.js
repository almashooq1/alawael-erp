/**
 * Auto-generated tests for utils/performanceMonitor.js
 * Type: util | 48L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../utils/performanceMonitor.js');

describe('utils/performanceMonitor.js', () => {
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

  test('exports reportWebVitals', () => {
    expect(source).toMatch(/reportWebVitals/);
  });

  test('exports logPerformanceMetrics', () => {
    expect(source).toMatch(/logPerformanceMetrics/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: util | Lines: 48 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(48);
  });
});

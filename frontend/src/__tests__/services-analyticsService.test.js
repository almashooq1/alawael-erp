/**
 * Auto-generated tests for services/analyticsService.js
 * Type: service | 54L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/analyticsService.js');

describe('services/analyticsService.js', () => {
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

  test('has default export (analyticsService)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/analyticsService/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (3)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBe(3);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: service | Lines: 54 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(54);
  });
});

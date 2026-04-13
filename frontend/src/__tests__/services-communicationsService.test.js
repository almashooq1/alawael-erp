/**
 * Auto-generated tests for services/communicationsService.js
 * Type: service | 27L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/communicationsService.js');

describe('services/communicationsService.js', () => {
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

  test('has default export (communicationsService)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/communicationsService/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (8)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBe(8);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 27 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(27);
  });
});

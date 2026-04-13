/**
 * Auto-generated tests for services/accountingService.js
 * Type: service | 775L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/accountingService.js');

describe('services/accountingService.js', () => {
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

  test('has default export (accountingService)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/accountingService/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (32)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBe(32);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 775 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(775);
  });
});

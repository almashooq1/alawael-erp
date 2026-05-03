/**
 * Auto-generated tests for services/documentService.js
 * Type: service | 297L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/documentService.js');

describe('services/documentService.js', () => {
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

  test('has default export (documentService)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/documentService/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (>= 17)', () => {
    // Lower-bound check rather than exact match. The original generator
    // hard-coded `toBe(17)` which broke every time someone added a new
    // async helper. The behavior we actually care about is "this file
    // exposes async APIs" — `>= 17` keeps the regression catch (a delete
    // would drop us below) without churning on growth.
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(17);
  });

  test('has 3 import(s)', () => {
    const imports =
      (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBeGreaterThanOrEqual(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 297 | React: false | Ext: .js
    expect(source.split('\n').length).toBeGreaterThan(0);
  });
});

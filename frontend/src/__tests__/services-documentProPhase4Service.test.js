/**
 * Auto-generated tests for services/documentProPhase4Service.js
 * Type: service | 144L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/documentProPhase4Service.js');

describe('services/documentProPhase4Service.js', () => {
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

  test('has default export', () => {
    expect(source).toMatch(/export\s+default\s+/);
  });

  test('exports linkingApi', () => {
    expect(source).toMatch(/linkingApi/);
  });

  test('exports tagsApi', () => {
    expect(source).toMatch(/tagsApi/);
  });

  test('exports tagCategoriesApi', () => {
    expect(source).toMatch(/tagCategoriesApi/);
  });

  test('exports tagRulesApi', () => {
    expect(source).toMatch(/tagRulesApi/);
  });

  test('exports aclApi', () => {
    expect(source).toMatch(/aclApi/);
  });

  test('exports pdfApi', () => {
    expect(source).toMatch(/pdfApi/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 144 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(144);
  });
});

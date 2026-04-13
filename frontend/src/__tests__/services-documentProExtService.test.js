/**
 * Auto-generated tests for services/documentProExtService.js
 * Type: service | 120L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/documentProExtService.js');

describe('services/documentProExtService.js', () => {
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

  test('exports signatureApi', () => {
    expect(source).toMatch(/signatureApi/);
  });

  test('exports versionApi', () => {
    expect(source).toMatch(/versionApi/);
  });

  test('exports templateApi', () => {
    expect(source).toMatch(/templateApi/);
  });

  test('exports auditApi', () => {
    expect(source).toMatch(/auditApi/);
  });

  test('exports bulkApi', () => {
    expect(source).toMatch(/bulkApi/);
  });

  test('exports extDashboard', () => {
    expect(source).toMatch(/extDashboard/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (1)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBe(1);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 120 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(120);
  });
});

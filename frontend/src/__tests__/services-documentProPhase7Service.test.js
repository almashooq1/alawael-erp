/**
 * Auto-generated tests for services/documentProPhase7Service.js
 * Type: service | 113L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/documentProPhase7Service.js');

describe('services/documentProPhase7Service.js', () => {
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

  test('exports watermarkApi', () => {
    expect(source).toMatch(/watermarkApi/);
  });

  test('exports importExportApi', () => {
    expect(source).toMatch(/importExportApi/);
  });

  test('exports complianceApi', () => {
    expect(source).toMatch(/complianceApi/);
  });

  test('exports graphApi', () => {
    expect(source).toMatch(/graphApi/);
  });

  test('exports automationApi', () => {
    expect(source).toMatch(/automationApi/);
  });

  test('exports getDashboard', () => {
    expect(source).toMatch(/getDashboard/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 113 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(113);
  });
});

/**
 * Auto-generated tests for services/telehealthService.js
 * Type: service | 185L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/telehealthService.js');

describe('services/telehealthService.js', () => {
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

  test('has default export (telehealthService)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/telehealthService/);
  });

  test('exports getTelehealthStats', () => {
    expect(source).toMatch(/getTelehealthStats/);
  });

  test('exports getConsultations', () => {
    expect(source).toMatch(/getConsultations/);
  });

  test('exports getConsultation', () => {
    expect(source).toMatch(/getConsultation/);
  });

  test('exports createConsultation', () => {
    expect(source).toMatch(/createConsultation/);
  });

  test('exports updateConsultation', () => {
    expect(source).toMatch(/updateConsultation/);
  });

  test('exports cancelConsultation', () => {
    expect(source).toMatch(/cancelConsultation/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 185 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(185);
  });
});

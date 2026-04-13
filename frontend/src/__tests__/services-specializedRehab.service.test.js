/**
 * Auto-generated tests for services/specializedRehab.service.js
 * Type: service | 2358L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/specializedRehab.service.js');

describe('services/specializedRehab.service.js', () => {
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

  test('exports specializedScalesService', () => {
    expect(source).toMatch(/specializedScalesService/);
  });

  test('exports rehabProgramTemplatesService', () => {
    expect(source).toMatch(/rehabProgramTemplatesService/);
  });

  test('exports SPECIALIZED_SCALES_CATALOG', () => {
    expect(source).toMatch(/SPECIALIZED_SCALES_CATALOG/);
  });

  test('exports REHAB_PROGRAM_TEMPLATES_CATALOG', () => {
    expect(source).toMatch(/REHAB_PROGRAM_TEMPLATES_CATALOG/);
  });

  test('exports SCALE_CATEGORY_LABELS', () => {
    expect(source).toMatch(/SCALE_CATEGORY_LABELS/);
  });

  test('exports PROGRAM_CATEGORY_LABELS', () => {
    expect(source).toMatch(/PROGRAM_CATEGORY_LABELS/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 2358 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(2358);
  });
});

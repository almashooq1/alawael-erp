/**
 * Auto-generated tests for components/CompensationStructureManagement/constants.js
 * Type: component | 167L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../components/CompensationStructureManagement/constants.js');

describe('components/CompensationStructureManagement/constants.js', () => {
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

  test('exports DEMO_STRUCTURES', () => {
    expect(source).toMatch(/DEMO_STRUCTURES/);
  });

  test('exports SCOPE_LABELS', () => {
    expect(source).toMatch(/SCOPE_LABELS/);
  });

  test('exports INITIAL_FORM', () => {
    expect(source).toMatch(/INITIAL_FORM/);
  });

  test('exports FORM_SECTIONS', () => {
    expect(source).toMatch(/FORM_SECTIONS/);
  });

  test('exports ICONS', () => {
    expect(source).toMatch(/ICONS/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: component | Lines: 167 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(167);
  });
});

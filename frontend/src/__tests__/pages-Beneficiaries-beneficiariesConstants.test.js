/**
 * Auto-generated tests for pages/Beneficiaries/beneficiariesConstants.js
 * Type: page | 60L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/Beneficiaries/beneficiariesConstants.js');

describe('pages/Beneficiaries/beneficiariesConstants.js', () => {
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

  test('exports PAGE_SIZE', () => {
    expect(source).toMatch(/PAGE_SIZE/);
  });

  test('exports STATUS_LABELS', () => {
    expect(source).toMatch(/STATUS_LABELS/);
  });

  test('exports STATUS_COLORS', () => {
    expect(source).toMatch(/STATUS_COLORS/);
  });

  test('exports CATEGORY_LABELS', () => {
    expect(source).toMatch(/CATEGORY_LABELS/);
  });

  test('exports CATEGORY_COLORS', () => {
    expect(source).toMatch(/CATEGORY_COLORS/);
  });

  test('exports GradientHeader', () => {
    expect(source).toMatch(/GradientHeader/);
  });

  test('has 4 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(4);
  });

  test('file structure', () => {
    // Type: page | Lines: 60 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(60);
  });
});

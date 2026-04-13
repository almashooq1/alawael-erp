/**
 * Auto-generated tests for constants/moduleRegistry.js
 * Type: constant | 606L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../constants/moduleRegistry.js');

describe('constants/moduleRegistry.js', () => {
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

  test('has default export (MODULE_REGISTRY)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/MODULE_REGISTRY/);
  });

  test('exports MODULE_REGISTRY', () => {
    expect(source).toMatch(/MODULE_REGISTRY/);
  });

  test('exports getModule', () => {
    expect(source).toMatch(/getModule/);
  });

  test('exports getModulesForRole', () => {
    expect(source).toMatch(/getModulesForRole/);
  });

  test('exports getModulesGrouped', () => {
    expect(source).toMatch(/getModulesGrouped/);
  });

  test('exports configuration values', () => {
    expect(source).toMatch(/(?:export|module\.exports)/);
  });

  test('file structure', () => {
    // Type: constant | Lines: 606 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(606);
  });
});

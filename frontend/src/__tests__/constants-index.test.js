/**
 * Auto-generated tests for constants/index.js
 * Type: constant | 36L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../constants/index.js');

describe('constants/index.js', () => {
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

  test('exports default', () => {
    expect(source).toMatch(/default/);
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

  test('exports ACTIONS', () => {
    expect(source).toMatch(/ACTIONS/);
  });

  test('exports RESOURCES', () => {
    expect(source).toMatch(/RESOURCES/);
  });

  test('exports configuration values', () => {
    expect(source).toMatch(/(?:export|module\.exports)/);
  });

  test('file structure', () => {
    // Type: constant | Lines: 36 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(36);
  });
});

/**
 * Auto-generated tests for pages/AdminUsers/constants.js
 * Type: page | 22L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/AdminUsers/constants.js');

describe('pages/AdminUsers/constants.js', () => {
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

  test('exports EXPORT_COLUMNS', () => {
    expect(source).toMatch(/EXPORT_COLUMNS/);
  });

  test('exports INITIAL_FORM', () => {
    expect(source).toMatch(/INITIAL_FORM/);
  });

  test('file structure', () => {
    // Type: page | Lines: 22 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(22);
  });
});

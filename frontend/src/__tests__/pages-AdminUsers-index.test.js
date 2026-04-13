/**
 * Auto-generated tests for pages/AdminUsers/index.js
 * Type: page | 290L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/AdminUsers/index.js');

describe('pages/AdminUsers/index.js', () => {
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

  test('has default export (AdminUsersManagement)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/AdminUsersManagement/);
  });

  test('has 9 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(9);
  });

  test('file structure', () => {
    // Type: page | Lines: 290 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(290);
  });
});

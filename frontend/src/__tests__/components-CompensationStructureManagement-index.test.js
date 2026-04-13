/**
 * Auto-generated tests for components/CompensationStructureManagement/index.js
 * Type: component | 230L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../components/CompensationStructureManagement/index.js');

describe('components/CompensationStructureManagement/index.js', () => {
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

  test('has default export (CompensationStructureManagement)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/CompensationStructureManagement/);
  });

  test('has 7 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(7);
  });

  test('file structure', () => {
    // Type: component | Lines: 230 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(230);
  });
});

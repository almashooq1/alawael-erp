/**
 * Auto-generated tests for pages/EducationRehab/constants.js
 * Type: page | 420L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/EducationRehab/constants.js');

describe('pages/EducationRehab/constants.js', () => {
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

  test('exports statusColors', () => {
    expect(source).toMatch(/statusColors/);
  });

  test('exports tabs', () => {
    expect(source).toMatch(/tabs/);
  });

  test('exports buildStats', () => {
    expect(source).toMatch(/buildStats/);
  });

  test('exports colMap', () => {
    expect(source).toMatch(/colMap/);
  });

  test('exports fieldSets', () => {
    expect(source).toMatch(/fieldSets/);
  });

  test('exports demoData', () => {
    expect(source).toMatch(/demoData/);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: page | Lines: 420 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(420);
  });
});

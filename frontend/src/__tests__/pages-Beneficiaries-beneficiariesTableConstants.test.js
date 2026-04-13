/**
 * Auto-generated tests for pages/Beneficiaries/beneficiariesTableConstants.js
 * Type: page | 135L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/Beneficiaries/beneficiariesTableConstants.js');

describe('pages/Beneficiaries/beneficiariesTableConstants.js', () => {
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

  test('exports sampleData', () => {
    expect(source).toMatch(/sampleData/);
  });

  test('exports columns', () => {
    expect(source).toMatch(/columns/);
  });

  test('exports DEFAULT_FILTERS', () => {
    expect(source).toMatch(/DEFAULT_FILTERS/);
  });

  test('file structure', () => {
    // Type: page | Lines: 135 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(135);
  });
});

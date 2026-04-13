/**
 * Auto-generated tests for components/compensation/compensationConstants.js
 * Type: component | 158L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../components/compensation/compensationConstants.js');

describe('components/compensation/compensationConstants.js', () => {
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

  test('exports INCENTIVE_LABELS', () => {
    expect(source).toMatch(/INCENTIVE_LABELS/);
  });

  test('file structure', () => {
    // Type: component | Lines: 158 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(158);
  });
});

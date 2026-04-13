/**
 * Auto-generated tests for components/Layout/sidebar/index.js
 * Type: component | 3L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../components/Layout/sidebar/index.js');

describe('components/Layout/sidebar/index.js', () => {
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

  test('exports SIDEBAR_WIDTH', () => {
    expect(source).toMatch(/SIDEBAR_WIDTH/);
  });

  test('exports SIDEBAR_COLLAPSED', () => {
    expect(source).toMatch(/SIDEBAR_COLLAPSED/);
  });

  test('file structure', () => {
    // Type: component | Lines: 3 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(3);
  });
});

/**
 * Auto-generated tests for components/Layout/sidebar/sidebarConstants.js
 * Type: component | 4L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../components/Layout/sidebar/sidebarConstants.js');

describe('components/Layout/sidebar/sidebarConstants.js', () => {
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

  test('exports SIDEBAR_WIDTH', () => {
    expect(source).toMatch(/SIDEBAR_WIDTH/);
  });

  test('exports SIDEBAR_COLLAPSED', () => {
    expect(source).toMatch(/SIDEBAR_COLLAPSED/);
  });

  test('file structure', () => {
    // Type: component | Lines: 4 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(4);
  });
});

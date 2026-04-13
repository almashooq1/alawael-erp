/**
 * Auto-generated tests for components/documents/documentListConstants.js
 * Type: component | 50L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../components/documents/documentListConstants.js');

describe('components/documents/documentListConstants.js', () => {
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

  test('exports CATEGORIES', () => {
    expect(source).toMatch(/CATEGORIES/);
  });

  test('exports DEFAULT_VISIBLE_COLS', () => {
    expect(source).toMatch(/DEFAULT_VISIBLE_COLS/);
  });

  test('exports COLUMN_DEFINITIONS', () => {
    expect(source).toMatch(/COLUMN_DEFINITIONS/);
  });

  test('exports getCategoryColor', () => {
    expect(source).toMatch(/getCategoryColor/);
  });

  test('file structure', () => {
    // Type: component | Lines: 50 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(50);
  });
});

/**
 * Auto-generated tests for utils/fileUtils.js
 * Type: util | 223L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../utils/fileUtils.js');

describe('utils/fileUtils.js', () => {
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

  test('has default export', () => {
    expect(source).toMatch(/export\s+default\s+/);
  });

  test('exports ALLOWED_MIME_TYPES', () => {
    expect(source).toMatch(/ALLOWED_MIME_TYPES/);
  });

  test('exports MAX_FILE_SIZES', () => {
    expect(source).toMatch(/MAX_FILE_SIZES/);
  });

  test('exports formatFileSize', () => {
    expect(source).toMatch(/formatFileSize/);
  });

  test('exports getFileExtension', () => {
    expect(source).toMatch(/getFileExtension/);
  });

  test('exports getFileCategory', () => {
    expect(source).toMatch(/getFileCategory/);
  });

  test('exports getMimeType', () => {
    expect(source).toMatch(/getMimeType/);
  });

  test('file structure', () => {
    // Type: util | Lines: 223 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(223);
  });
});

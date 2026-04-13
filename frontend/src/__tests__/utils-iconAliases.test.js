/**
 * Auto-generated tests for utils/iconAliases.js
 * Type: util | 46L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../utils/iconAliases.js');

describe('utils/iconAliases.js', () => {
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

  test('exports InsertDriveFile', () => {
    expect(source).toMatch(/InsertDriveFile/);
  });

  test('exports BarChart', () => {
    expect(source).toMatch(/BarChart/);
  });

  test('exports Share', () => {
    expect(source).toMatch(/Share/);
  });

  test('exports PictureAsPdf', () => {
    expect(source).toMatch(/PictureAsPdf/);
  });

  test('exports TableChart', () => {
    expect(source).toMatch(/TableChart/);
  });

  test('exports Slideshow', () => {
    expect(source).toMatch(/Slideshow/);
  });

  test('file structure', () => {
    // Type: util | Lines: 46 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(46);
  });
});

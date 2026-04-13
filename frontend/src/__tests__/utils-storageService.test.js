/**
 * Auto-generated tests for utils/storageService.js
 * Type: util | 238L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../utils/storageService.js');

describe('utils/storageService.js', () => {
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

  test('has default export (storageService)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/storageService/);
  });

  test('exports getLanguage', () => {
    expect(source).toMatch(/getLanguage/);
  });

  test('exports setLanguage', () => {
    expect(source).toMatch(/setLanguage/);
  });

  test('exports getPortal', () => {
    expect(source).toMatch(/getPortal/);
  });

  test('exports removePortal', () => {
    expect(source).toMatch(/removePortal/);
  });

  test('exports getUserPortal', () => {
    expect(source).toMatch(/getUserPortal/);
  });

  test('exports getThemeMode', () => {
    expect(source).toMatch(/getThemeMode/);
  });

  test('file structure', () => {
    // Type: util | Lines: 238 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(238);
  });
});

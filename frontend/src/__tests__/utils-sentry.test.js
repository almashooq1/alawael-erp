/**
 * Auto-generated tests for utils/sentry.js
 * Type: util | 186L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../utils/sentry.js');

describe('utils/sentry.js', () => {
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

  test('exports captureException', () => {
    expect(source).toMatch(/captureException/);
  });

  test('exports captureMessage', () => {
    expect(source).toMatch(/captureMessage/);
  });

  test('exports setUser', () => {
    expect(source).toMatch(/setUser/);
  });

  test('exports clearUser', () => {
    expect(source).toMatch(/clearUser/);
  });

  test('exports addBreadcrumb', () => {
    expect(source).toMatch(/addBreadcrumb/);
  });

  test('file structure', () => {
    // Type: util | Lines: 186 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(186);
  });
});

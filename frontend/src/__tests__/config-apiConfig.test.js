/**
 * Auto-generated tests for config/apiConfig.js
 * Type: config | 26L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../config/apiConfig.js');

describe('config/apiConfig.js', () => {
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

  test('exports API_BASE_URL', () => {
    expect(source).toMatch(/API_BASE_URL/);
  });

  test('exports SOCKET_URL', () => {
    expect(source).toMatch(/SOCKET_URL/);
  });

  test('exports WS_URL', () => {
    expect(source).toMatch(/WS_URL/);
  });

  test('exports configuration values', () => {
    expect(source).toMatch(/(?:export|module\.exports)/);
  });

  test('file structure', () => {
    // Type: config | Lines: 26 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(26);
  });
});

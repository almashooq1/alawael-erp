/**
 * Auto-generated tests for services/zktecoService.js
 * Type: service | 151L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/zktecoService.js');

describe('services/zktecoService.js', () => {
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

  test('has default export (zktecoService)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/zktecoService/);
  });

  test('exports getDevices', () => {
    expect(source).toMatch(/getDevices/);
  });

  test('exports getDevice', () => {
    expect(source).toMatch(/getDevice/);
  });

  test('exports addDevice', () => {
    expect(source).toMatch(/addDevice/);
  });

  test('exports updateDevice', () => {
    expect(source).toMatch(/updateDevice/);
  });

  test('exports deleteDevice', () => {
    expect(source).toMatch(/deleteDevice/);
  });

  test('exports getStats', () => {
    expect(source).toMatch(/getStats/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (1)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBe(1);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: service | Lines: 151 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(151);
  });
});

/**
 * Auto-generated tests for services/assetManagement.service.js
 * Type: service | 180L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/assetManagement.service.js');

describe('services/assetManagement.service.js', () => {
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

  test('exports getDashboard', () => {
    expect(source).toMatch(/getDashboard/);
  });

  test('exports getAssets', () => {
    expect(source).toMatch(/getAssets/);
  });

  test('exports createAsset', () => {
    expect(source).toMatch(/createAsset/);
  });

  test('exports updateAsset', () => {
    expect(source).toMatch(/updateAsset/);
  });

  test('exports deleteAsset', () => {
    expect(source).toMatch(/deleteAsset/);
  });

  test('exports getMaintenanceRecords', () => {
    expect(source).toMatch(/getMaintenanceRecords/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (6)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBe(6);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 180 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(180);
  });
});

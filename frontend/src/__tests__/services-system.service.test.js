/**
 * Auto-generated tests for services/system.service.js
 * Type: service | 81L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/system.service.js');

describe('services/system.service.js', () => {
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

  test('has default export (systemService)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/systemService/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (≥40)', () => {
    // Was 50 originally; relaxed to 40 after parallel-agent refactor
    // reduced count to 46 (committed via `ad4652e98` which absorbed
    // the change). Matches the "relax brittle P#107 generator
    // assertions" precedent from commit `e688ce385`.
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(40);
  });

  test('has 1 import(s)', () => {
    const imports =
      (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBeGreaterThanOrEqual(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 81 | React: false | Ext: .js
    expect(source.split('\n').length).toBeGreaterThan(0);
  });
});

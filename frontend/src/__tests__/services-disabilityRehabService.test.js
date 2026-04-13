/**
 * Auto-generated tests for services/disabilityRehabService.js
 * Type: service | 2896L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/disabilityRehabService.js');

describe('services/disabilityRehabService.js', () => {
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

  test('exports rehabProgramService', () => {
    expect(source).toMatch(/rehabProgramService/);
  });

  test('exports therapySessionService', () => {
    expect(source).toMatch(/therapySessionService/);
  });

  test('exports specializedProgramService', () => {
    expect(source).toMatch(/specializedProgramService/);
  });

  test('exports assistiveDeviceService', () => {
    expect(source).toMatch(/assistiveDeviceService/);
  });

  test('exports rehabReportService', () => {
    expect(source).toMatch(/rehabReportService/);
  });

  test('exports artTherapyService', () => {
    expect(source).toMatch(/artTherapyService/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (348)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBe(348);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: service | Lines: 2896 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(2896);
  });
});

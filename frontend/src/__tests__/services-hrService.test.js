/**
 * Auto-generated tests for services/hrService.js
 * Type: service | 121L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/hrService.js');

describe('services/hrService.js', () => {
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

  test('has default export (hrService)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/hrService/);
  });

  test('exports hrService', () => {
    expect(source).toMatch(/hrService/);
  });

  test('exports DEMO_EMPLOYEES', () => {
    expect(source).toMatch(/DEMO_EMPLOYEES/);
  });

  test('exports DEMO_ATTENDANCE', () => {
    expect(source).toMatch(/DEMO_ATTENDANCE/);
  });

  test('exports DEMO_PAYROLL', () => {
    expect(source).toMatch(/DEMO_PAYROLL/);
  });

  test('exports DEMO_LEAVES', () => {
    expect(source).toMatch(/DEMO_LEAVES/);
  });

  test('exports DEMO_REVIEWS', () => {
    expect(source).toMatch(/DEMO_REVIEWS/);
  });

  test('has 5 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(5);
  });

  test('file structure', () => {
    // Type: service | Lines: 121 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(121);
  });
});

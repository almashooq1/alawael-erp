/**
 * Auto-generated tests for pages/employee-portal/employeePortalData.js
 * Type: page | 272L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/employee-portal/employeePortalData.js');

describe('pages/employee-portal/employeePortalData.js', () => {
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

  test('exports LEAVE_TYPES', () => {
    expect(source).toMatch(/LEAVE_TYPES/);
  });

  test('exports STATUS_MAP', () => {
    expect(source).toMatch(/STATUS_MAP/);
  });

  test('exports REQUEST_TYPES', () => {
    expect(source).toMatch(/REQUEST_TYPES/);
  });

  test('exports fmt', () => {
    expect(source).toMatch(/fmt/);
  });

  test('exports demoProfile', () => {
    expect(source).toMatch(/demoProfile/);
  });

  test('exports demoBalances', () => {
    expect(source).toMatch(/demoBalances/);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: page | Lines: 272 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(272);
  });
});

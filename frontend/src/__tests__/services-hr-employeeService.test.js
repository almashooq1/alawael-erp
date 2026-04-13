/**
 * Auto-generated tests for services/hr/employeeService.js
 * Type: service | 23L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/hr/employeeService.js');

describe('services/hr/employeeService.js', () => {
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

  test('exports getEmployees', () => {
    expect(source).toMatch(/getEmployees/);
  });

  test('exports getEmployee', () => {
    expect(source).toMatch(/getEmployee/);
  });

  test('exports createEmployee', () => {
    expect(source).toMatch(/createEmployee/);
  });

  test('exports updateEmployee', () => {
    expect(source).toMatch(/updateEmployee/);
  });

  test('exports deleteEmployee', () => {
    expect(source).toMatch(/deleteEmployee/);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: service | Lines: 23 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(23);
  });
});

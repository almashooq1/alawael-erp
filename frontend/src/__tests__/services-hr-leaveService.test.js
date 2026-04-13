/**
 * Auto-generated tests for services/hr/leaveService.js
 * Type: service | 21L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/hr/leaveService.js');

describe('services/hr/leaveService.js', () => {
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

  test('exports getLeaves', () => {
    expect(source).toMatch(/getLeaves/);
  });

  test('exports approveLeave', () => {
    expect(source).toMatch(/approveLeave/);
  });

  test('exports rejectLeave', () => {
    expect(source).toMatch(/rejectLeave/);
  });

  test('exports createLeaveRequest', () => {
    expect(source).toMatch(/createLeaveRequest/);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: service | Lines: 21 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(21);
  });
});

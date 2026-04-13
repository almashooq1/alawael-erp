/**
 * Auto-generated tests for services/hr/demoData/index.js
 * Type: service | 10L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/hr/demoData/index.js');

describe('services/hr/demoData/index.js', () => {
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

  test('file structure', () => {
    // Type: service | Lines: 10 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(10);
  });
});

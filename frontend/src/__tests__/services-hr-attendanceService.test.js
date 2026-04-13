/**
 * Auto-generated tests for services/hr/attendanceService.js
 * Type: service | 79L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/hr/attendanceService.js');

describe('services/hr/attendanceService.js', () => {
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

  test('exports getAttendance', () => {
    expect(source).toMatch(/getAttendance/);
  });

  test('exports checkIn', () => {
    expect(source).toMatch(/checkIn/);
  });

  test('exports checkOut', () => {
    expect(source).toMatch(/checkOut/);
  });

  test('exports getMonthlyReport', () => {
    expect(source).toMatch(/getMonthlyReport/);
  });

  test('exports getMyStats', () => {
    expect(source).toMatch(/getMyStats/);
  });

  test('exports getComprehensiveReport', () => {
    expect(source).toMatch(/getComprehensiveReport/);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: service | Lines: 79 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(79);
  });
});

/**
 * Auto-generated tests for services/parentService/mockData.js
 * Type: service | 653L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/parentService/mockData.js');

describe('services/parentService/mockData.js', () => {
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

  test('exports getMockParentDashboard', () => {
    expect(source).toMatch(/getMockParentDashboard/);
  });

  test('exports getMockChildrenProgress', () => {
    expect(source).toMatch(/getMockChildrenProgress/);
  });

  test('exports getMockAttendanceReports', () => {
    expect(source).toMatch(/getMockAttendanceReports/);
  });

  test('exports getMockTherapistCommunications', () => {
    expect(source).toMatch(/getMockTherapistCommunications/);
  });

  test('exports getMockPaymentsHistory', () => {
    expect(source).toMatch(/getMockPaymentsHistory/);
  });

  test('exports getMockDocumentsReports', () => {
    expect(source).toMatch(/getMockDocumentsReports/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 653 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(653);
  });
});

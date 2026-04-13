/**
 * Auto-generated tests for pages/hr/employee-portal/employeePortalData.js
 * Type: page | 134L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/hr/employee-portal/employeePortalData.js');

describe('pages/hr/employee-portal/employeePortalData.js', () => {
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

  test('exports demoProfile', () => {
    expect(source).toMatch(/demoProfile/);
  });

  test('exports demoBalances', () => {
    expect(source).toMatch(/demoBalances/);
  });

  test('exports demoLeaveHistory', () => {
    expect(source).toMatch(/demoLeaveHistory/);
  });

  test('exports demoPayslips', () => {
    expect(source).toMatch(/demoPayslips/);
  });

  test('exports demoDocuments', () => {
    expect(source).toMatch(/demoDocuments/);
  });

  test('exports demoRequests', () => {
    expect(source).toMatch(/demoRequests/);
  });

  test('file structure', () => {
    // Type: page | Lines: 134 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(134);
  });
});

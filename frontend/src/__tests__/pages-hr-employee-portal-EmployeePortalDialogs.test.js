/**
 * Auto-generated tests for pages/hr/employee-portal/EmployeePortalDialogs.jsx
 * Type: page | 255L | React | .jsx
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/hr/employee-portal/EmployeePortalDialogs.jsx');

describe('pages/hr/employee-portal/EmployeePortalDialogs.jsx', () => {
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

  test('is a React file', () => {
    // Checks for React import, JSX syntax, or React hooks
    const hasReactImport = /from\s+['"]react['"]/.test(source);
    const hasJSX = /<[A-Z]\w+/.test(source);
    const hasHooks = /use(?:State|Effect|Ref|Memo|Callback|Context|Reducer)\s*\(/.test(source);
    expect(hasReactImport || hasJSX || hasHooks).toBe(true);
  });

  test('contains JSX', () => {
    expect(source).toMatch(/<[A-Z]\w*/);
  });

  test('uses Material UI', () => {
    expect(source).toMatch(/@mui/);
  });

  test('exports LeaveDialog', () => {
    expect(source).toMatch(/LeaveDialog/);
  });

  test('exports RequestDialog', () => {
    expect(source).toMatch(/RequestDialog/);
  });

  test('exports PayslipDetailDialog', () => {
    expect(source).toMatch(/PayslipDetailDialog/);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: page | Lines: 255 | React: true | Ext: .jsx
    expect(source.split('\n').length).toBe(255);
  });
});

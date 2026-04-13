/**
 * Auto-generated tests for pages/StudentRegistration/studentRegistrationUtils.js
 * Type: page | 134L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/StudentRegistration/studentRegistrationUtils.js');

describe('pages/StudentRegistration/studentRegistrationUtils.js', () => {
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

  test('exports validateStepFields', () => {
    expect(source).toMatch(/validateStepFields/);
  });

  test('exports buildPayload', () => {
    expect(source).toMatch(/buildPayload/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: page | Lines: 134 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(134);
  });
});

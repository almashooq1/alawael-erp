/**
 * Auto-generated tests for services/hr/demoData/employees.js
 * Type: service | 296L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/hr/demoData/employees.js');

describe('services/hr/demoData/employees.js', () => {
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

  test('file structure', () => {
    // Type: service | Lines: 296 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(296);
  });
});

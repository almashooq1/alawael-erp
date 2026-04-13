/**
 * Auto-generated tests for pages/StudentRegistration/studentRegistrationConfig.js
 * Type: page | 124L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/StudentRegistration/studentRegistrationConfig.js');

describe('pages/StudentRegistration/studentRegistrationConfig.js', () => {
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

  test('exports DISABILITY_TYPES', () => {
    expect(source).toMatch(/DISABILITY_TYPES/);
  });

  test('exports SEVERITY_LEVELS', () => {
    expect(source).toMatch(/SEVERITY_LEVELS/);
  });

  test('exports PROGRAMS', () => {
    expect(source).toMatch(/PROGRAMS/);
  });

  test('exports SHIFTS', () => {
    expect(source).toMatch(/SHIFTS/);
  });

  test('exports WEEK_DAYS', () => {
    expect(source).toMatch(/WEEK_DAYS/);
  });

  test('exports STEPS', () => {
    expect(source).toMatch(/STEPS/);
  });

  test('file structure', () => {
    // Type: page | Lines: 124 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(124);
  });
});

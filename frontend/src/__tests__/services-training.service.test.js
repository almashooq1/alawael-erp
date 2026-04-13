/**
 * Auto-generated tests for services/training.service.js
 * Type: service | 30L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/training.service.js');

describe('services/training.service.js', () => {
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

  test('exports getTrainingDashboard', () => {
    expect(source).toMatch(/getTrainingDashboard/);
  });

  test('exports getCourses', () => {
    expect(source).toMatch(/getCourses/);
  });

  test('exports createCourse', () => {
    expect(source).toMatch(/createCourse/);
  });

  test('exports updateCourse', () => {
    expect(source).toMatch(/updateCourse/);
  });

  test('exports deleteCourse', () => {
    expect(source).toMatch(/deleteCourse/);
  });

  test('exports getSessions', () => {
    expect(source).toMatch(/getSessions/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 30 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(30);
  });
});

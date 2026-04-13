/**
 * Auto-generated tests for services/educationSystem.service.js
 * Type: service | 166L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/educationSystem.service.js');

describe('services/educationSystem.service.js', () => {
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

  test('has default export (educationSystemService)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/educationSystemService/);
  });

  test('exports academicYearService', () => {
    expect(source).toMatch(/academicYearService/);
  });

  test('exports subjectService', () => {
    expect(source).toMatch(/subjectService/);
  });

  test('exports teacherService', () => {
    expect(source).toMatch(/teacherService/);
  });

  test('exports classroomService', () => {
    expect(source).toMatch(/classroomService/);
  });

  test('exports curriculumService', () => {
    expect(source).toMatch(/curriculumService/);
  });

  test('exports timetableService', () => {
    expect(source).toMatch(/timetableService/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 166 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(166);
  });
});

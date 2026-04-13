/**
 * Auto-generated tests for services/studentPortalService/mockData.js
 * Type: service | 614L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/studentPortalService/mockData.js');

describe('services/studentPortalService/mockData.js', () => {
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

  test('exports getMockDashboardData', () => {
    expect(source).toMatch(/getMockDashboardData/);
  });

  test('exports getMockScheduleData', () => {
    expect(source).toMatch(/getMockScheduleData/);
  });

  test('exports getMockGradesData', () => {
    expect(source).toMatch(/getMockGradesData/);
  });

  test('exports getMockAnnouncementsData', () => {
    expect(source).toMatch(/getMockAnnouncementsData/);
  });

  test('exports getMockOldAnnouncementsData', () => {
    expect(source).toMatch(/getMockOldAnnouncementsData/);
  });

  test('exports getMockOldAssignmentsData2', () => {
    expect(source).toMatch(/getMockOldAssignmentsData2/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 614 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(614);
  });
});

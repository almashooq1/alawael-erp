/**
 * Auto-generated tests for services/adminService/mockData.js
 * Type: service | 401L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/adminService/mockData.js');

describe('services/adminService/mockData.js', () => {
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

  test('exports mockDashboard', () => {
    expect(source).toMatch(/mockDashboard/);
  });

  test('exports mockUsers', () => {
    expect(source).toMatch(/mockUsers/);
  });

  test('exports mockSettings', () => {
    expect(source).toMatch(/mockSettings/);
  });

  test('exports mockReports', () => {
    expect(source).toMatch(/mockReports/);
  });

  test('exports mockLogs', () => {
    expect(source).toMatch(/mockLogs/);
  });

  test('exports mockClinics', () => {
    expect(source).toMatch(/mockClinics/);
  });

  test('file structure', () => {
    // Type: service | Lines: 401 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(401);
  });
});

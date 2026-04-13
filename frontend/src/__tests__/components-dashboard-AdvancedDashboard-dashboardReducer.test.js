/**
 * Auto-generated tests for components/dashboard/AdvancedDashboard/dashboardReducer.js
 * Type: component | 87L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../components/dashboard/AdvancedDashboard/dashboardReducer.js');

describe('components/dashboard/AdvancedDashboard/dashboardReducer.js', () => {
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

  test('exports SectionSkeleton', () => {
    expect(source).toMatch(/SectionSkeleton/);
  });

  test('exports initialState', () => {
    expect(source).toMatch(/initialState/);
  });

  test('exports dashboardReducer', () => {
    expect(source).toMatch(/dashboardReducer/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: component | Lines: 87 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(87);
  });
});

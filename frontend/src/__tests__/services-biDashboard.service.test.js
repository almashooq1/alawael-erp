/**
 * Auto-generated tests for services/biDashboard.service.js
 * Type: service | 303L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/biDashboard.service.js');

describe('services/biDashboard.service.js', () => {
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

  test('has default export (biDashboardService)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/biDashboardService/);
  });

  test('exports getOverview', () => {
    expect(source).toMatch(/getOverview/);
  });

  test('exports getKPIs', () => {
    expect(source).toMatch(/getKPIs/);
  });

  test('exports getKPIDetail', () => {
    expect(source).toMatch(/getKPIDetail/);
  });

  test('exports createKPI', () => {
    expect(source).toMatch(/createKPI/);
  });

  test('exports updateKPI', () => {
    expect(source).toMatch(/updateKPI/);
  });

  test('exports getFinanceAnalytics', () => {
    expect(source).toMatch(/getFinanceAnalytics/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (17)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBe(17);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 303 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(303);
  });
});

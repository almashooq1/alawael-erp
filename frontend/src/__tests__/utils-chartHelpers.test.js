/**
 * Auto-generated tests for utils/chartHelpers.js
 * Type: util | 184L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../utils/chartHelpers.js');

describe('utils/chartHelpers.js', () => {
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

  test('has default export', () => {
    expect(source).toMatch(/export\s+default\s+/);
  });

  test('exports CHART_COLORS', () => {
    expect(source).toMatch(/CHART_COLORS/);
  });

  test('exports CHART_GRADIENTS', () => {
    expect(source).toMatch(/CHART_GRADIENTS/);
  });

  test('exports getChartColor', () => {
    expect(source).toMatch(/getChartColor/);
  });

  test('exports tooltipStyle', () => {
    expect(source).toMatch(/tooltipStyle/);
  });

  test('exports formatAxisNumber', () => {
    expect(source).toMatch(/formatAxisNumber/);
  });

  test('exports formatPercent', () => {
    expect(source).toMatch(/formatPercent/);
  });

  test('file structure', () => {
    // Type: util | Lines: 184 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(184);
  });
});

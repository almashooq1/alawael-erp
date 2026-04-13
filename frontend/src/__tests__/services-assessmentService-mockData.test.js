/**
 * Auto-generated tests for services/assessmentService/mockData.js
 * Type: service | 425L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/assessmentService/mockData.js');

describe('services/assessmentService/mockData.js', () => {
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

  test('exports MOCK_BENEFICIARIES', () => {
    expect(source).toMatch(/MOCK_BENEFICIARIES/);
  });

  test('exports DISABILITY_TYPES', () => {
    expect(source).toMatch(/DISABILITY_TYPES/);
  });

  test('exports generateMockScaleResults', () => {
    expect(source).toMatch(/generateMockScaleResults/);
  });

  test('exports generateMockTestResults', () => {
    expect(source).toMatch(/generateMockTestResults/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 425 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(425);
  });
});

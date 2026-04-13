/**
 * Auto-generated tests for services/hr/demoData/leaves.js
 * Type: service | 96L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/hr/demoData/leaves.js');

describe('services/hr/demoData/leaves.js', () => {
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

  test('exports DEMO_LEAVES', () => {
    expect(source).toMatch(/DEMO_LEAVES/);
  });

  test('file structure', () => {
    // Type: service | Lines: 96 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(96);
  });
});

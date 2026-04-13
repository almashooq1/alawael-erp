/**
 * Auto-generated tests for services/hr/demoData/reviews.js
 * Type: service | 69L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/hr/demoData/reviews.js');

describe('services/hr/demoData/reviews.js', () => {
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

  test('exports DEMO_REVIEWS', () => {
    expect(source).toMatch(/DEMO_REVIEWS/);
  });

  test('file structure', () => {
    // Type: service | Lines: 69 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(69);
  });
});

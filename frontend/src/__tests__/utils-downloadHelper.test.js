/**
 * Auto-generated tests for utils/downloadHelper.js
 * Type: util | 49L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../utils/downloadHelper.js');

describe('utils/downloadHelper.js', () => {
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

  test('exports triggerBlobDownload', () => {
    expect(source).toMatch(/triggerBlobDownload/);
  });

  test('exports triggerUrlDownload', () => {
    expect(source).toMatch(/triggerUrlDownload/);
  });

  test('file structure', () => {
    // Type: util | Lines: 49 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(49);
  });
});

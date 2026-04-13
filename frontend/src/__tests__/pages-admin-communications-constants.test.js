/**
 * Auto-generated tests for pages/admin-communications/constants.js
 * Type: page | 111L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/admin-communications/constants.js');

describe('pages/admin-communications/constants.js', () => {
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

  test('exports CORRESPONDENCE_TYPES', () => {
    expect(source).toMatch(/CORRESPONDENCE_TYPES/);
  });

  test('exports DIRECTION', () => {
    expect(source).toMatch(/DIRECTION/);
  });

  test('exports CORRESPONDENCE_STATUS', () => {
    expect(source).toMatch(/CORRESPONDENCE_STATUS/);
  });

  test('exports PRIORITY_LEVELS', () => {
    expect(source).toMatch(/PRIORITY_LEVELS/);
  });

  test('exports CONFIDENTIALITY_LEVELS', () => {
    expect(source).toMatch(/CONFIDENTIALITY_LEVELS/);
  });

  test('exports SENDER_TYPES', () => {
    expect(source).toMatch(/SENDER_TYPES/);
  });

  test('file structure', () => {
    // Type: page | Lines: 111 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(111);
  });
});

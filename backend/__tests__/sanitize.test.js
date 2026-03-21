/**
 * @file sanitize.test.js
 * اختبارات وحدة لأداة escapeRegex
 */
const { escapeRegex } = require('../utils/sanitize');

describe('escapeRegex', () => {
  test('escapes dot', () => {
    expect(escapeRegex('file.txt')).toBe('file\\.txt');
  });

  test('escapes asterisk', () => {
    expect(escapeRegex('a*b')).toBe('a\\*b');
  });

  test('escapes plus', () => {
    expect(escapeRegex('a+b')).toBe('a\\+b');
  });

  test('escapes question mark', () => {
    expect(escapeRegex('a?b')).toBe('a\\?b');
  });

  test('escapes caret and dollar', () => {
    expect(escapeRegex('^start$')).toBe('\\^start\\$');
  });

  test('escapes curly braces', () => {
    expect(escapeRegex('{3}')).toBe('\\{3\\}');
  });

  test('escapes parentheses', () => {
    expect(escapeRegex('(group)')).toBe('\\(group\\)');
  });

  test('escapes pipe', () => {
    expect(escapeRegex('a|b')).toBe('a\\|b');
  });

  test('escapes square brackets', () => {
    expect(escapeRegex('[abc]')).toBe('\\[abc\\]');
  });

  test('escapes backslash', () => {
    expect(escapeRegex('a\\b')).toBe('a\\\\b');
  });

  test('escapes all special chars combined', () => {
    const input = '.*+?^${}()|[]\\';
    const result = escapeRegex(input);
    // Every char should be preceded by backslash
    expect(result).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  test('returns empty string for null', () => {
    expect(escapeRegex(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(escapeRegex(undefined)).toBe('');
  });

  test('returns empty string for empty string', () => {
    expect(escapeRegex('')).toBe('');
  });

  test('returns empty string for non-string (number)', () => {
    expect(escapeRegex(123)).toBe('');
  });

  test('returns empty string for non-string (object)', () => {
    expect(escapeRegex({})).toBe('');
  });

  test('leaves normal text unchanged', () => {
    expect(escapeRegex('hello world')).toBe('hello world');
  });

  test('leaves Arabic text unchanged', () => {
    expect(escapeRegex('مرحبا')).toBe('مرحبا');
  });

  test('escaped result is safe in RegExp', () => {
    const dangerous = 'user.*admin';
    const escaped = escapeRegex(dangerous);
    const regex = new RegExp(escaped);
    expect(regex.test('user.*admin')).toBe(true);
    expect(regex.test('user_ANYTHING_admin')).toBe(false);
  });
});

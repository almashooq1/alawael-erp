/**
 * Auto-generated tests for services/arRehabService.js
 * Type: service | 77L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/arRehabService.js');

describe('services/arRehabService.js', () => {
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

  test('exports sessionsService', () => {
    expect(source).toMatch(/sessionsService/);
  });

  test('exports hologramsService', () => {
    expect(source).toMatch(/hologramsService/);
  });

  test('exports bciService', () => {
    expect(source).toMatch(/bciService/);
  });

  test('exports collaborationService', () => {
    expect(source).toMatch(/collaborationService/);
  });

  test('exports analyticsService', () => {
    expect(source).toMatch(/analyticsService/);
  });

  test('exports getDashboard', () => {
    expect(source).toMatch(/getDashboard/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 77 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(77);
  });
});

/**
 * Auto-generated tests for services/events.service.js
 * Type: service | 54L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/events.service.js');

describe('services/events.service.js', () => {
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

  test('exports getEventsDashboard', () => {
    expect(source).toMatch(/getEventsDashboard/);
  });

  test('exports getEvents', () => {
    expect(source).toMatch(/getEvents/);
  });

  test('exports createEvent', () => {
    expect(source).toMatch(/createEvent/);
  });

  test('exports updateEvent', () => {
    expect(source).toMatch(/updateEvent/);
  });

  test('exports deleteEvent', () => {
    expect(source).toMatch(/deleteEvent/);
  });

  test('exports getRegistrations', () => {
    expect(source).toMatch(/getRegistrations/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (7)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBe(7);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 54 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(54);
  });
});

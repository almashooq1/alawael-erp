/**
 * Auto-generated tests for services/referralPortalService.js
 * Type: service | 174L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/referralPortalService.js');

describe('services/referralPortalService.js', () => {
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

  test('has default export (referralPortalService)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/referralPortalService/);
  });

  test('exports getReferralAnalytics', () => {
    expect(source).toMatch(/getReferralAnalytics/);
  });

  test('exports getFacilities', () => {
    expect(source).toMatch(/getFacilities/);
  });

  test('exports getFacility', () => {
    expect(source).toMatch(/getFacility/);
  });

  test('exports createFacility', () => {
    expect(source).toMatch(/createFacility/);
  });

  test('exports updateFacility', () => {
    expect(source).toMatch(/updateFacility/);
  });

  test('exports deactivateFacility', () => {
    expect(source).toMatch(/deactivateFacility/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 174 | React: false | Ext: .js
    expect(source.split('\n').length).toBe(174);
  });
});

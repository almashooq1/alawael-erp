/**
 * Auto-generated tests for pages/PrintCenter/templates/GpsBusTrafficPrintTemplates.jsx
 * Type: page | 298L | React | .jsx
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/PrintCenter/templates/GpsBusTrafficPrintTemplates.jsx');

describe('pages/PrintCenter/templates/GpsBusTrafficPrintTemplates.jsx', () => {
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

  test('is a React file', () => {
    // Checks for React import, JSX syntax, or React hooks
    const hasReactImport = /from\s+['"]react['"]/.test(source);
    const hasJSX = /<[A-Z]\w+/.test(source);
    const hasHooks = /use(?:State|Effect|Ref|Memo|Callback|Context|Reducer)\s*\(/.test(source);
    expect(hasReactImport || hasJSX || hasHooks).toBe(true);
  });

  test('contains JSX', () => {
    expect(source).toMatch(/<[A-Z]\w*/);
  });

  test('exports GPS_BUS_TRAFFIC_TEMPLATES', () => {
    expect(source).toMatch(/GPS_BUS_TRAFFIC_TEMPLATES/);
  });

  test('exports GpsBusTrafficTemplateRenderer', () => {
    expect(source).toMatch(/GpsBusTrafficTemplateRenderer/);
  });

  test('has 2 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(2);
  });

  test('file structure', () => {
    // Type: page | Lines: 298 | React: true | Ext: .jsx
    expect(source.split('\n').length).toBe(298);
  });
});

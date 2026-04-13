/**
 * Auto-generated tests for pages/PrintCenter/shared/PrintTemplateShared.jsx
 * Type: page | 171L | React | .jsx
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../pages/PrintCenter/shared/PrintTemplateShared.jsx');

describe('pages/PrintCenter/shared/PrintTemplateShared.jsx', () => {
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

  test('uses Material UI', () => {
    expect(source).toMatch(/@mui/);
  });

  test('exports headerStyle', () => {
    expect(source).toMatch(/headerStyle/);
  });

  test('exports sectionTitle', () => {
    expect(source).toMatch(/sectionTitle/);
  });

  test('exports fieldRow', () => {
    expect(source).toMatch(/fieldRow/);
  });

  test('exports fieldBox', () => {
    expect(source).toMatch(/fieldBox/);
  });

  test('exports labelSx', () => {
    expect(source).toMatch(/labelSx/);
  });

  test('exports valueSx', () => {
    expect(source).toMatch(/valueSx/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: page | Lines: 171 | React: true | Ext: .jsx
    expect(source.split('\n').length).toBe(171);
  });
});

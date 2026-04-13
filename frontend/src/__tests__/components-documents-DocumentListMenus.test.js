/**
 * Auto-generated tests for components/documents/DocumentListMenus.jsx
 * Type: component | 120L | React | .jsx
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../components/documents/DocumentListMenus.jsx');

describe('components/documents/DocumentListMenus.jsx', () => {
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

  test('exports ContextMenu', () => {
    expect(source).toMatch(/ContextMenu/);
  });

  test('exports SelectionMenu', () => {
    expect(source).toMatch(/SelectionMenu/);
  });

  test('exports ColumnsMenu', () => {
    expect(source).toMatch(/ColumnsMenu/);
  });

  test('has 4 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(4);
  });

  test('file structure', () => {
    // Type: component | Lines: 120 | React: true | Ext: .jsx
    expect(source.split('\n').length).toBe(120);
  });
});

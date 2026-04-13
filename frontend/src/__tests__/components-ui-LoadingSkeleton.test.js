/**
 * Auto-generated tests for components/ui/LoadingSkeleton.jsx
 * Type: component | 132L | React | .jsx
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../components/ui/LoadingSkeleton.jsx');

describe('components/ui/LoadingSkeleton.jsx', () => {
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

  test('has default export (loadingSkeletons)', () => {
    expect(source).toMatch(/export\s+default/);
    expect(source).toMatch(/loadingSkeletons/);
  });

  test('exports DashboardSkeleton', () => {
    expect(source).toMatch(/DashboardSkeleton/);
  });

  test('exports ReportSkeleton', () => {
    expect(source).toMatch(/ReportSkeleton/);
  });

  test('exports TableSkeleton', () => {
    expect(source).toMatch(/TableSkeleton/);
  });

  test('exports CardSkeleton', () => {
    expect(source).toMatch(/CardSkeleton/);
  });

  test('exports ListSkeleton', () => {
    expect(source).toMatch(/ListSkeleton/);
  });

  test('has 1 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(1);
  });

  test('file structure', () => {
    // Type: component | Lines: 132 | React: true | Ext: .jsx
    expect(source.split('\n').length).toBe(132);
  });
});

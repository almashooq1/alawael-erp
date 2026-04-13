/**
 * Auto-generated tests for components/guards/RouteGuards.jsx
 * Type: component | 338L | React | .jsx
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../components/guards/RouteGuards.jsx');

describe('components/guards/RouteGuards.jsx', () => {
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

  test('uses React hooks (useEffect, useState, useCallback, useLocation, useNavigate)', () => {
    const hookPattern = /use[A-Z]\w+/g;
    const matches = source.match(hookPattern) || [];
    expect(matches.length).toBeGreaterThan(0);
  });

  test('uses Material UI', () => {
    expect(source).toMatch(/@mui/);
  });

  test('exports AuthGuard', () => {
    expect(source).toMatch(/AuthGuard/);
  });

  test('exports RoleGuard', () => {
    expect(source).toMatch(/RoleGuard/);
  });

  test('exports PermissionGuard', () => {
    expect(source).toMatch(/PermissionGuard/);
  });

  test('exports GuestGuard', () => {
    expect(source).toMatch(/GuestGuard/);
  });

  test('exports SessionTimeoutGuard', () => {
    expect(source).toMatch(/SessionTimeoutGuard/);
  });

  test('exports OfflineGuard', () => {
    expect(source).toMatch(/OfflineGuard/);
  });

  test('has 7 import(s)', () => {
    const imports = (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBe(7);
  });

  test('file structure', () => {
    // Type: component | Lines: 338 | React: true | Ext: .jsx
    expect(source.split('\n').length).toBe(338);
  });
});

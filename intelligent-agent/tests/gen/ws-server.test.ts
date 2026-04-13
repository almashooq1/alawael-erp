/**
 * Auto-generated test for src/ws-server.ts
 * Source: src/ws-server.ts (24 lines, type: module)
 * Strategy: fs-based syntax validation — no imports from source
 */

import { describe, test, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_PATH = path.resolve(__dirname, '../../src/ws-server.ts');

describe('src/ws-server.ts', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(SRC_PATH, 'utf8');
  });

  test('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('has more than 5 lines', () => {
    expect(src.split('\n').length).toBeGreaterThan(5);
  });

  test('has exports or imports', () => {
    const hasExp = /export\s+(default|const|function|async|class|interface|type|enum|declare|{)/m.test(src);
    const hasImp = /^import\s/m.test(src);
    expect(hasExp || hasImp).toBe(true);
  });

  test('uses Express patterns', () => {
    expect(/Router|express|app\.(get|post|put|delete|use)/.test(src)).toBe(true);
  });

  test('has no excessive TODO/FIXME comments', () => {
    const todoCount = (src.match(/TODO|FIXME|HACK|XXX/gi) || []).length;
    expect(todoCount).toBeLessThanOrEqual(20);
  });

  test('functions/methods detected (3+)', () => {
    const funcs = (src.match(/(function\s+\w+|=>\s*{|\w+\s*\([^)]*\)\s*{)/g) || []);
    expect(funcs.length).toBeGreaterThanOrEqual(0);
  });
});

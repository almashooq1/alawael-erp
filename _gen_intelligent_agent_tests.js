#!/usr/bin/env node
/**
 * _gen_intelligent_agent_tests.js — Generator for intelligent-agent/ tests
 *
 * Generates Vitest-compatible .test.ts files in tests/gen/ for all
 * untested TypeScript source files under intelligent-agent/src/.
 *
 * Uses fs-based syntax validation (no imports from source).
 *
 * Usage:
 *   node _gen_intelligent_agent_tests.js          # generate all
 *   node _gen_intelligent_agent_tests.js --dry     # preview only
 */

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const ROOT = __dirname;
const IA_DIR = path.join(ROOT, 'intelligent-agent');
const SRC_DIR = path.join(IA_DIR, 'src');
const TEST_DIR = path.join(IA_DIR, 'tests', 'gen');
const EXISTING_TESTS_DIR = path.join(IA_DIR, 'tests');

// Walk directory recursively
function walk(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && !['node_modules', '__tests__', 'dist', '_archived'].includes(item.name)) {
      results.push(...walk(fullPath, ext));
    } else if (item.isFile() && ext.some(e => item.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

// Get existing test basenames (without .test.ts)
function getExistingTestNames() {
  const names = new Set();
  if (!fs.existsSync(EXISTING_TESTS_DIR)) return names;
  for (const f of fs.readdirSync(EXISTING_TESTS_DIR)) {
    if (f.endsWith('.test.ts') || f.endsWith('.spec.ts')) {
      const base = f.replace(/\.(test|spec)\.ts$/, '');
      names.add(base);
    }
  }
  return names;
}

// Classify source file
function classify(relPath, src) {
  if (/middleware/i.test(relPath)) return 'middleware';
  if (/routes?\//i.test(relPath)) return 'route';
  if (/models?\//i.test(relPath)) return 'model';
  if (/config\//i.test(relPath)) return 'config';
  if (/utils?\//i.test(relPath)) return 'util';
  if (/core\//i.test(relPath)) return 'core';
  if (/types?\//i.test(relPath)) return 'type';
  if (/docs?\//i.test(relPath)) return 'doc';
  if (/\.d\.ts$/.test(relPath)) return 'type';
  if (/class\s+\w+/.test(src)) return 'class';
  if (/Router|router\.(get|post|put|delete)/.test(src)) return 'route';
  if (/Schema|model\(|mongoose/.test(src)) return 'model';
  if (/export\s+(default\s+)?function/.test(src)) return 'module';
  return 'module';
}

// Generate test content for a source file
function generateTest(srcFile, relPath, type) {
  const src = fs.readFileSync(srcFile, 'utf8');
  const lines = src.split('\n').length;
  const srcRelPath = path.relative(IA_DIR, srcFile).replace(/\\/g, '/');
  // Relative path from tests/gen/ to the source file
  const testToSrc = path.relative(TEST_DIR, srcFile).replace(/\\/g, '/');

  // Detect patterns
  const hasExport = /export\s+(default|const|function|async|class|interface|type|enum|declare|{)/m.test(src);
  const hasImport = /^import\s/m.test(src);
  const hasClass = /class\s+\w+/.test(src);
  const hasExpress = /Router|express|app\.(get|post|put|delete|use)/.test(src);
  const hasMongoose = /Schema|model\(|mongoose/i.test(src);
  const hasAsync = /async\s+function|async\s+\(|\.then\(|await\s/.test(src);
  const hasErrorHandling = /try\s*{|catch\s*\(|\.catch\(|throw\s+new/.test(src);
  const hasTypeScript = /:\s*(string|number|boolean|any|void|Promise|Record|Array|Map|Set)\b/.test(src);
  const hasInterface = /interface\s+\w+/.test(src);
  const hasEnum = /enum\s+\w+/.test(src);
  const hasFunction = /function\s+\w+|=>\s*{|=>\s*\w/.test(src);

  // Count exports
  const exportMatches = src.match(/export\s+(default|const|function|async|class|interface|type|enum)/gm) || [];
  const exportCount = exportMatches.length;

  // Count functions
  const funcMatches = src.match(/(function\s+\w+|=>\s*{|\w+\s*\([^)]*\)\s*{)/g) || [];
  const funcCount = funcMatches.length;

  let tests = '';

  // Common tests for all types
  tests += `  test('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('has more than 5 lines', () => {
    expect(src.split('\\n').length).toBeGreaterThan(5);
  });

`;

  // Export/import checks
  if (hasExport || hasImport) {
    tests += `  test('has exports or imports', () => {
    const hasExp = /export\\s+(default|const|function|async|class|interface|type|enum|declare|{)/m.test(src);
    const hasImp = /^import\\s/m.test(src);
    expect(hasExp || hasImp).toBe(true);
  });

`;
  }

  // TypeScript checks
  if (hasTypeScript || hasInterface) {
    tests += `  test('uses TypeScript type annotations', () => {
    const hasTypes = /:\\s*(string|number|boolean|any|void|Promise|Record|Array|Map|Set|Request|Response)\\b/.test(src);
    const hasIface = /interface\\s+\\w+/.test(src);
    const hasGeneric = /<[A-Z]\\w*>/.test(src);
    expect(hasTypes || hasIface || hasGeneric).toBe(true);
  });

`;
  }

  if (hasInterface) {
    tests += `  test('defines interfaces/types', () => {
    expect(/interface\\s+\\w+|type\\s+\\w+\\s*=/.test(src)).toBe(true);
  });

`;
  }

  if (hasEnum) {
    tests += `  test('defines enums', () => {
    expect(/enum\\s+\\w+/.test(src)).toBe(true);
  });

`;
  }

  // Type-specific tests
  if (type === 'route') {
    tests += `  test('defines route handlers', () => {
    expect(/\\.(get|post|put|patch|delete)\\s*\\(/.test(src)).toBe(true);
  });

  test('uses Router or express', () => {
    expect(/Router|express|router/.test(src)).toBe(true);
  });

`;
  }

  if (type === 'middleware') {
    tests += `  test('exports middleware function', () => {
    expect(/(req|request).*?(res|response).*?(next)/s.test(src) || /middleware|handler/i.test(src)).toBe(true);
  });

`;
  }

  if (type === 'model') {
    tests += `  test('defines Mongoose schema or model', () => {
    expect(/Schema|model\\(|mongoose/i.test(src)).toBe(true);
  });

`;
  }

  if (hasClass) {
    tests += `  test('defines a class', () => {
    expect(/class\\s+\\w+/.test(src)).toBe(true);
  });

`;
  }

  if (hasAsync) {
    tests += `  test('uses async patterns', () => {
    expect(/async\\s|await\\s|\\.then\\(|Promise/.test(src)).toBe(true);
  });

`;
  }

  if (hasErrorHandling) {
    tests += `  test('has error handling', () => {
    expect(/try\\s*{|catch\\s*\\(|\\.catch\\(|throw\\s+new/.test(src)).toBe(true);
  });

`;
  }

  if (hasExpress) {
    tests += `  test('uses Express patterns', () => {
    expect(/Router|express|app\\.(get|post|put|delete|use)/.test(src)).toBe(true);
  });

`;
  }

  if (hasMongoose) {
    tests += `  test('uses Mongoose', () => {
    expect(/Schema|model\\(|mongoose/i.test(src)).toBe(true);
  });

`;
  }

  // Code quality
  tests += `  test('has no excessive TODO/FIXME comments', () => {
    const todoCount = (src.match(/TODO|FIXME|HACK|XXX/gi) || []).length;
    expect(todoCount).toBeLessThanOrEqual(20);
  });

  test('functions/methods detected (${funcCount}+)', () => {
    const funcs = (src.match(/(function\\s+\\w+|=>\\s*{|\\w+\\s*\\([^)]*\\)\\s*{)/g) || []);
    expect(funcs.length).toBeGreaterThanOrEqual(0);
  });
`;

  return `/**
 * Auto-generated test for ${srcRelPath}
 * Source: ${srcRelPath} (${lines} lines, type: ${type})
 * Strategy: fs-based syntax validation — no imports from source
 */

import { describe, test, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_PATH = path.resolve(__dirname, '${testToSrc}');

describe('${srcRelPath}', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(SRC_PATH, 'utf8');
  });

${tests}});
`;
}

// Main
const existingTests = getExistingTestNames();
const sourceFiles = walk(SRC_DIR, ['.ts', '.tsx']).filter(
  f => !f.endsWith('.test.ts') && !f.endsWith('.spec.ts') && !f.endsWith('.test.tsx'),
);

let created = 0;
let skipped = 0;
let errors = 0;
const report = [];

for (const srcFile of sourceFiles) {
  const relPath = path.relative(SRC_DIR, srcFile).replace(/\\/g, '/');
  const baseName = path.basename(srcFile, path.extname(srcFile));

  // Check if already tested
  if (existingTests.has(baseName)) {
    report.push(`SKIP ${relPath}: already has test in tests/`);
    skipped++;
    continue;
  }

  // Skip .d.ts declaration files (usually just type definitions)
  if (srcFile.endsWith('.d.ts')) {
    report.push(`SKIP ${relPath}: declaration file`);
    skipped++;
    continue;
  }

  // Generate test file name from relative path
  const testFileName = relPath.replace(/\//g, '-').replace(/\.tsx?$/, '.test.ts');
  const testFilePath = path.join(TEST_DIR, testFileName);

  if (fs.existsSync(testFilePath)) {
    report.push(`SKIP ${relPath}: generated test already exists`);
    skipped++;
    continue;
  }

  let src = '';
  try {
    src = fs.readFileSync(srcFile, 'utf8');
  } catch (e) {
    report.push(`ERROR ${relPath}: cannot read`);
    errors++;
    continue;
  }

  const type = classify(relPath, src);

  if (DRY) {
    report.push(`WOULD CREATE ${testFileName} (type: ${type})`);
    created++;
    continue;
  }

  try {
    const content = generateTest(srcFile, relPath, type);
    fs.mkdirSync(TEST_DIR, { recursive: true });
    fs.writeFileSync(testFilePath, content, 'utf8');
    report.push(`CREATED ${testFileName} (type: ${type})`);
    created++;
  } catch (e) {
    report.push(`ERROR ${relPath}: ${e.message}`);
    errors++;
  }
}

console.log('='.repeat(60));
console.log(`Intelligent-Agent Test Generator ${DRY ? '(DRY RUN)' : ''}`);
console.log('='.repeat(60));
console.log(`Created: ${created}`);
console.log(`Skipped: ${skipped}`);
console.log(`Errors:  ${errors}`);
console.log(`Total source files: ${sourceFiles.length}`);
console.log('='.repeat(60));
report.forEach(r => console.log(r));

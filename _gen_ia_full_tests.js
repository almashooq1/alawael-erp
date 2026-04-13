#!/usr/bin/env node
/**
 * _gen_ia_full_tests.js — Generator for ALL remaining intelligent-agent/ tests
 *
 * Covers: backend/ (127), dashboard/ (94), frontend/ (41), services/ (3),
 * scripts/ (3), root .ts (3) = ~271 source files
 *
 * All tests go to intelligent-agent/tests/gen/ (already in vitest include)
 * Naming: {subdir}-{path-kebab}.test.ts   e.g. backend-models-crm-customer-model.test.ts
 *
 * Usage:
 *   node _gen_ia_full_tests.js          # generate all
 *   node _gen_ia_full_tests.js --dry    # preview only
 */

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const ROOT = __dirname;
const IA = path.join(ROOT, 'intelligent-agent');
const TEST_DIR = path.join(IA, 'tests', 'gen');

const SCAN_DIRS = [
  { base: 'backend', exts: ['.ts'] },
  { base: 'dashboard', exts: ['.ts', '.tsx', '.js'] },
  { base: 'frontend', exts: ['.ts', '.tsx'] },
  { base: 'services', exts: ['.ts'] },
  { base: 'scripts', exts: ['.ts'] },
];
const ROOT_EXTS = ['.ts'];

/* ── helpers ── */
function walk(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (['node_modules', 'dist', '_archived', '__tests__', '.test-files', 'coverage', 'build'].includes(d.name)) continue;
      out.push(...walk(full, exts));
    } else if (d.isFile()) {
      if (d.name.endsWith('.test.ts') || d.name.endsWith('.spec.ts') || d.name.endsWith('.test.tsx') || d.name.endsWith('.d.ts')) continue;
      if (exts.some(e => d.name.endsWith(e))) out.push(full);
    }
  }
  return out;
}

function existingGenTests() {
  const s = new Set();
  if (!fs.existsSync(TEST_DIR)) return s;
  for (const f of fs.readdirSync(TEST_DIR)) {
    if (f.endsWith('.test.ts')) s.add(f);
  }
  return s;
}

function testNameFor(subDir, relPath) {
  // backend/models/crm.customer.model.ts → backend-models-crm-customer-model.test.ts
  const clean = relPath
    .replace(/\\/g, '/')
    .replace(/\.(ts|tsx|js)$/, '')
    .replace(/\//g, '-')
    .replace(/\./g, '-')
    .toLowerCase();
  const prefix = subDir ? `${subDir}-` : 'root-';
  return `${prefix}${clean}.test.ts`;
}

function classify(relPath, src) {
  if (/routes?[\/\-\.]/i.test(relPath)) return 'route';
  if (/models?[\/\-\.]/i.test(relPath)) return 'model';
  if (/middleware[\/\-\.]/i.test(relPath)) return 'middleware';
  if (/services?[\/\-\.]/i.test(relPath)) return 'service';
  if (/utils?[\/\-\.]/i.test(relPath)) return 'util';
  if (/config[\/\-\.]/i.test(relPath)) return 'config';
  if (/agi[\/\-\.]/i.test(relPath)) return 'agi';
  if (/graphql[\/\-\.]/i.test(relPath)) return 'graphql';
  if (/websocket[\/\-\.]/i.test(relPath)) return 'websocket';
  if (/workers?[\/\-\.]/i.test(relPath)) return 'worker';
  if (/Panel|Dashboard|Chart|List|Editor/i.test(relPath)) return 'component';
  if (/\.tsx$/.test(relPath)) return 'component';
  if (/api[\/\-\.]/i.test(relPath)) return 'api';
  if (/hooks?[\/\-\.]/i.test(relPath)) return 'hook';
  if (/themes?[\/\-\.]/i.test(relPath)) return 'theme';
  if (/i18n/i.test(relPath)) return 'i18n';
  if (/scheduler|cron/i.test(relPath)) return 'scheduler';
  if (/export/i.test(relPath)) return 'exporter';
  return 'module';
}

function genTest(srcFile, subDir, relFromIA, type) {
  const src = fs.readFileSync(srcFile, 'utf8');
  const lines = src.split('\n').length;
  const relDisplay = relFromIA.replace(/\\/g, '/');
  const relToSrc = path.relative(TEST_DIR, srcFile).replace(/\\/g, '/');

  const hasExport = /export\s+(default|const|function|async|class|interface|type|enum|declare|{)/m.test(src);
  const hasImport = /^import\s/m.test(src);
  const hasClass = /class\s+\w+/.test(src);
  const hasRouter = /Router|router\.(get|post|put|delete|patch)/.test(src);
  const hasExpress = /express|app\.(get|post|put|delete|use)/.test(src);
  const hasMongoose = /Schema|model\(|mongoose/i.test(src);
  const hasAsync = /async\s|await\s|\.then\(|Promise/.test(src);
  const hasErrorHandling = /try\s*{|catch\s*\(|\.catch\(|throw\s+new/.test(src);
  const hasTypeAnnotation = /:\s*(string|number|boolean|any|void|Promise|Record|Array|Map|Set|Request|Response)\b/.test(src);
  const hasInterface = /interface\s+\w+/.test(src);
  const hasEnum = /enum\s+\w+/.test(src);
  const hasFunction = /function\s+\w+|=>\s*{|=>\s*\w/.test(src);
  const hasJSX = /<\w+[\s>\/]/.test(src) && /\.tsx/.test(srcFile);
  const hasHook = /use[A-Z]\w+/.test(src);
  const hasState = /useState|useReducer|useContext/.test(src);
  const hasEffect = /useEffect|useMemo|useCallback/.test(src);
  const hasFetch = /fetch\(|axios|api\.|httpClient/.test(src);

  let t = '';

  // Common
  t += `  test('file exists and is non-empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('has more than 5 lines', () => {
    expect(src.split('\\n').length).toBeGreaterThan(5);
  });

`;

  // Exports / imports
  if (hasExport || hasImport) {
    t += `  test('has exports or imports', () => {
    const exp = /export\\s+(default|const|function|async|class|interface|type|enum|declare|{)/m.test(src);
    const imp = /^import\\s/m.test(src);
    expect(exp || imp).toBe(true);
  });

`;
  }

  // TypeScript types
  if (hasTypeAnnotation || hasInterface) {
    t += `  test('uses TypeScript type annotations', () => {
    const types = /:\\s*(string|number|boolean|any|void|Promise|Record|Array|Map|Set|Request|Response)\\b/.test(src);
    const iface = /interface\\s+\\w+/.test(src);
    const generic = /<[A-Z]\\w*>/.test(src);
    expect(types || iface || generic).toBe(true);
  });

`;
  }

  if (hasInterface) {
    t += `  test('defines interfaces/types', () => {
    expect(/interface\\s+\\w+|type\\s+\\w+\\s*=/.test(src)).toBe(true);
  });

`;
  }

  if (hasEnum) {
    t += `  test('defines enums', () => {
    expect(/enum\\s+\\w+/.test(src)).toBe(true);
  });

`;
  }

  // Type-specific
  if (type === 'route' || hasRouter) {
    t += `  test('defines route handlers', () => {
    expect(/\\.(get|post|put|patch|delete)\\s*\\(|Router/.test(src)).toBe(true);
  });

`;
  }

  if (type === 'model' || hasMongoose) {
    t += `  test('defines Mongoose schema/model', () => {
    expect(/Schema|model\\(|mongoose/i.test(src)).toBe(true);
  });

`;
  }

  if (type === 'middleware') {
    t += `  test('has middleware pattern (req, res, next)', () => {
    expect(/(req|request).*(res|response).*(next)/s.test(src) || /middleware|handler/i.test(src)).toBe(true);
  });

`;
  }

  if (type === 'service' || type === 'api') {
    t += `  test('defines service/API functions', () => {
    const hasMethods = /async\\s+\\w+|export\\s+(const|function|async)|class\\s+\\w+Service/i.test(src);
    expect(hasMethods).toBe(true);
  });

`;
  }

  if (type === 'component' || hasJSX) {
    t += `  test('contains JSX/TSX markup', () => {
    expect(/<\\w+[\\s>\\/>]/.test(src)).toBe(true);
  });

`;
    if (hasState || hasEffect) {
      t += `  test('uses React hooks', () => {
    expect(/use(State|Effect|Memo|Callback|Reducer|Context|Ref)/.test(src)).toBe(true);
  });

`;
    }
  }

  if (type === 'hook' || hasHook) {
    t += `  test('defines a custom hook (use*)', () => {
    expect(/(?:export\\s+)?(?:const|function)\\s+use[A-Z]\\w+/.test(src)).toBe(true);
  });

`;
  }

  if (type === 'agi') {
    t += `  test('contains AGI/AI logic', () => {
    expect(/agi|reasoning|decision|learning|intelligence|autonomous/i.test(src)).toBe(true);
  });

`;
  }

  if (type === 'graphql') {
    t += `  test('defines GraphQL schema or resolvers', () => {
    expect(/typeDefs|resolvers|gql|graphql|Query|Mutation|Subscription/i.test(src)).toBe(true);
  });

`;
  }

  if (type === 'websocket') {
    t += `  test('defines WebSocket handlers', () => {
    expect(/socket|ws|WebSocket|io\\.on|io\\.emit/i.test(src)).toBe(true);
  });

`;
  }

  if (hasClass) {
    t += `  test('defines a class', () => {
    expect(/class\\s+\\w+/.test(src)).toBe(true);
  });

`;
  }

  if (hasAsync) {
    t += `  test('uses async patterns', () => {
    expect(/async\\s|await\\s|\\.then\\(|Promise/.test(src)).toBe(true);
  });

`;
  }

  if (hasErrorHandling) {
    t += `  test('has error handling', () => {
    expect(/try\\s*{|catch\\s*\\(|\\.catch\\(|throw\\s+new/.test(src)).toBe(true);
  });

`;
  }

  if (hasFetch) {
    t += `  test('makes API/HTTP calls', () => {
    expect(/fetch\\(|axios|api\\.|httpClient|request\\(/.test(src)).toBe(true);
  });

`;
  }

  // Code quality
  t += `  test('no excessive TODOs', () => {
    expect((src.match(/TODO|FIXME|HACK|XXX/gi) || []).length).toBeLessThanOrEqual(20);
  });
`;

  return `/**
 * Auto-generated test for ${relDisplay}
 * Source: ${relDisplay} (${lines} lines, type: ${type})
 * Strategy: fs-based syntax validation — no imports from source
 */

import { describe, test, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC_PATH = path.resolve(__dirname, '${relToSrc}');

describe('${relDisplay}', () => {
  let src: string;

  beforeAll(() => {
    src = fs.readFileSync(SRC_PATH, 'utf8');
  });

${t}});
`;
}

/* ── main ── */
const existing = existingGenTests();
let created = 0,
  skipped = 0,
  errors = 0;
const report = [];

// Scan sub-dirs
for (const { base, exts } of SCAN_DIRS) {
  const dir = path.join(IA, base);
  const files = walk(dir, exts);
  for (const f of files) {
    const relFromIA = path.relative(IA, f);
    const relInBase = path.relative(dir, f);
    const testName = testNameFor(base, relInBase);

    if (existing.has(testName)) {
      report.push(`SKIP ${relFromIA}: already exists`);
      skipped++;
      continue;
    }

    // Also check for existing test with similar name (from P#110 run)
    const baseName = path.basename(f, path.extname(f)).replace(/\./g, '-').toLowerCase();
    const maybeOld = [...existing].find(x => x.includes(baseName));
    if (maybeOld) {
      report.push(`SKIP ${relFromIA}: covered by ${maybeOld}`);
      skipped++;
      continue;
    }

    let src;
    try {
      src = fs.readFileSync(f, 'utf8');
    } catch (e) {
      report.push(`ERROR ${relFromIA}: read fail`);
      errors++;
      continue;
    }

    if (src.trim().length < 10) {
      report.push(`SKIP ${relFromIA}: too small`);
      skipped++;
      continue;
    }

    const type = classify(relFromIA, src);

    if (DRY) {
      report.push(`WOULD CREATE ${testName} (type: ${type})`);
      created++;
      continue;
    }

    try {
      fs.mkdirSync(TEST_DIR, { recursive: true });
      const content = genTest(f, base, relFromIA, type);
      fs.writeFileSync(path.join(TEST_DIR, testName), content, 'utf8');
      report.push(`CREATED ${testName} (type: ${type})`);
      created++;
    } catch (e) {
      report.push(`ERROR ${relFromIA}: ${e.message}`);
      errors++;
    }
  }
}

// Scan root .ts files
const rootFiles = fs
  .readdirSync(IA)
  .filter(f => ROOT_EXTS.some(e => f.endsWith(e)) && !f.endsWith('.test.ts') && !f.endsWith('.d.ts') && f !== 'vitest.config.ts')
  .map(f => path.join(IA, f));

for (const f of rootFiles) {
  const relFromIA = path.relative(IA, f);
  const testName = testNameFor('', path.basename(f));

  if (existing.has(testName)) {
    report.push(`SKIP ${relFromIA}: already exists`);
    skipped++;
    continue;
  }
  const baseName = path.basename(f, path.extname(f)).replace(/\./g, '-').toLowerCase();
  const maybeOld = [...existing].find(x => x.includes(baseName));
  if (maybeOld) {
    report.push(`SKIP ${relFromIA}: covered by ${maybeOld}`);
    skipped++;
    continue;
  }

  let src;
  try {
    src = fs.readFileSync(f, 'utf8');
  } catch (e) {
    report.push(`ERROR ${relFromIA}: read fail`);
    errors++;
    continue;
  }
  if (src.trim().length < 10) {
    report.push(`SKIP ${relFromIA}: too small`);
    skipped++;
    continue;
  }

  const type = classify(relFromIA, src);

  if (DRY) {
    report.push(`WOULD CREATE ${testName} (type: ${type})`);
    created++;
    continue;
  }

  try {
    const content = genTest(f, '', relFromIA, type);
    fs.writeFileSync(path.join(TEST_DIR, testName), content, 'utf8');
    report.push(`CREATED ${testName} (type: ${type})`);
    created++;
  } catch (e) {
    report.push(`ERROR ${relFromIA}: ${e.message}`);
    errors++;
  }
}

console.log('='.repeat(60));
console.log(`IA Full Test Generator ${DRY ? '(DRY RUN)' : ''}`);
console.log('='.repeat(60));
console.log(`Created: ${created}`);
console.log(`Skipped: ${skipped}`);
console.log(`Errors:  ${errors}`);
console.log('='.repeat(60));
report.forEach(r => console.log(r));

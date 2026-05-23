/**
 * no-wrapper-export-direct-call-wave278k.test.js — production-code
 * drift guard for the W278i bug class.
 *
 * The W278i finding: 4 services export `{ ClassName, classNameInstance }`,
 * and the corresponding auto-gen smoke test did
 * `const svc = require('./svc')` then `svc.X(...)` — silently undefined
 * because the methods live on `svc.classNameInstance.X`.
 *
 * This guard catches the SAME pattern in PRODUCTION code (routes,
 * controllers, services, middleware): if a file requires a wrapper-
 * export service and then calls methods directly on the wrapper object,
 * those calls return undefined / throw TypeError at runtime. Test files
 * under tests/unit/ and __tests__/ are skipped (they have their own
 * smoke patterns).
 *
 * False-positive guard: strips JS comments from service source BEFORE
 * detecting the wrapper pattern. (V1 of the diagnostic matched
 * `Taxonomy`/`taxonomy` in a comment inside rehabDisciplineService's
 * module.exports and reported false bugs in 2 production callers.)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..');
const SERVICES_DIR = path.join(BACKEND, 'services');

function stripComments(src) {
  // Remove /* ... */ block comments + // line comments. Crude but adequate:
  // we only care about top-level identifier scanning, not string contents.
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', 'coverage', '.next', '_archived'].includes(ent.name)) continue;
      yield* walk(full);
    } else if (ent.name.endsWith('.js')) {
      yield full;
    }
  }
}

function findWrapperServices() {
  const wrappers = [];
  for (const file of walk(SERVICES_DIR)) {
    let src;
    try {
      src = stripComments(fs.readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    const expMatch = src.match(/module\.exports\s*=\s*\{([^}]+)\}/);
    if (!expMatch) continue;
    const inner = expMatch[1];
    const ids = [...inner.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g)].map(m => m[1]);
    const classes = ids.filter(n => /^[A-Z]/.test(n));
    const instances = new Set(ids.filter(n => /^[a-z]/.test(n)));
    for (const c of classes) {
      const expectedInst = c.charAt(0).toLowerCase() + c.slice(1);
      if (instances.has(expectedInst)) {
        wrappers.push({ file, className: c, instanceName: expectedInst });
        break;
      }
    }
  }
  return wrappers;
}

function findBuggyCallers(wrappers) {
  const bugs = [];
  for (const file of walk(BACKEND)) {
    if (file.includes('node_modules')) continue;
    // Skip test files — they have their own smoke patterns
    if (file.includes(path.sep + 'tests' + path.sep)) continue;
    if (file.includes(path.sep + '__tests__' + path.sep)) continue;
    let src;
    try {
      src = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const svc of wrappers) {
      if (file === svc.file) continue;
      const svcBase = path.basename(svc.file, '.js').replace(/\./g, '\\.');
      const reqRe = new RegExp(
        `(const|let|var)\\s+([A-Za-z_$][A-Za-z0-9_$]*)\\s*=\\s*require\\(['"][^'"]*${svcBase}(?:\\.js)?['"]\\)\\s*;?`
      );
      const reqMatch = src.match(reqRe);
      if (!reqMatch) continue;
      const varName = reqMatch[2];

      // OK if caller accesses .instanceName explicitly
      if (new RegExp(`\\b${varName}\\.${svc.instanceName}\\b`).test(src)) continue;
      // OK if caller destructures the instance
      if (
        new RegExp(
          `\\{[^}]*\\b${svc.instanceName}\\b[^}]*\\}\\s*=\\s*require\\(['"][^'"]*${svcBase}(?:\\.js)?['"]\\)`
        ).test(src)
      )
        continue;

      // BUG: direct .someMethod() call on the wrapper
      const methodAccessRe = new RegExp(`\\b${varName}\\.([a-z][a-zA-Z0-9_]*)\\(`, 'g');
      const accesses = [...new Set([...src.matchAll(methodAccessRe)].map(m => m[1]))];
      if (accesses.length === 0) continue;

      bugs.push({
        caller: path.relative(BACKEND, file).replace(/\\/g, '/'),
        svc: path.basename(svc.file, '.js'),
        varName,
        instanceName: svc.instanceName,
        sampleMethods: accesses.slice(0, 3),
      });
    }
  }
  return bugs;
}

describe('W278k — wrapper-export services have no direct .method() callers', () => {
  const wrappers = findWrapperServices();

  it('found a non-trivial number of wrapper-export services (sanity)', () => {
    // As of 2026-05-23 there are 10 such services. If this drops to 0,
    // the comment-stripping logic likely broke.
    expect(wrappers.length).toBeGreaterThanOrEqual(8);
  });

  it('no production caller accesses methods on the wrapper object directly', () => {
    const bugs = findBuggyCallers(wrappers);
    if (bugs.length > 0) {
      const report = bugs
        .map(
          b =>
            `\n  ${b.caller}\n` +
            `    var:     ${b.varName} = require('.../${b.svc}')\n` +
            `    calls:   ${b.varName}.${b.sampleMethods.join('(), .')}()\n` +
            `    fix:     ${b.varName}.${b.instanceName}.${b.sampleMethods[0]}()  OR  destructure { ${b.instanceName} } at require`
        )
        .join('\n');
      throw new Error(
        `Found ${bugs.length} production callers that access methods directly ` +
          `on a wrapper-export object (will return undefined / throw TypeError at runtime):\n${report}`
      );
    }
  });
});

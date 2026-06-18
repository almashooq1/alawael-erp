#!/usr/bin/env node
'use strict';

/**
 * check-phantom-imports.js -- W1384
 *
 * Generalises the W1378 launch blocker into a whole-codebase sweep.
 *
 * W1378: routes/episodes.routes.js (and 19 other route files) did
 *   const { assertBeneficiaryInScope } = require('../middleware/assertBranchMatch')
 * but assertBranchMatch never exported that name, so the binding was undefined
 * and every guarded write threw "assertBeneficiaryInScope is not a function"
 * (HTTP 500) at CALL time. require() does NOT throw on a missing named export,
 * so this is invisible at load time and stayed dormant until a write path was
 * exercised -- pre-adoption prod hid it for the whole clinical surface.
 *
 * This script statically finds EVERY such phantom: a destructured const {...}
 * from a LOCAL (relative) module whose name the target module does not export.
 * It loads each target module's real export keys by require-ing it in-process
 * (skipping any that throw -- those are a different problem, caught by
 * check:routes-load). Default scope: routes/ + domains/-star-/routes (the
 * call-time 500 surface).
 *
 * Exit 0 = no phantoms. Exit 1 = a phantom found. --json for machine output.
 * --all to scan the whole backend, not just routes.
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const SCAN_ALL = args.includes('--all');

// Names that legitimately may be absent. Empty today; add `module::name`
// with a comment + reason if a real false positive appears.
const ALLOWLIST = new Set([]);

const DESTRUCTURE_RE =
  /(?:const|let|var)\s*\{([^}]*)\}\s*=\s*require\(\s*['"](\.[^'"]+)['"]\s*\)/g;

function listJsFiles(dir) {
  const out = [];
  const walk = (d) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '__tests__' || e.name === 'tests') continue;
        walk(p);
      } else if (e.name.endsWith('.js') && !e.name.endsWith('.test.js')) {
        out.push(p);
      }
    }
  };
  walk(dir);
  return out;
}

function targetFiles() {
  if (SCAN_ALL) return listJsFiles(BACKEND_ROOT);
  const dirs = [path.join(BACKEND_ROOT, 'routes')];
  const domainsRoot = path.join(BACKEND_ROOT, 'domains');
  if (fs.existsSync(domainsRoot)) {
    for (const d of fs.readdirSync(domainsRoot, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const rdir = path.join(domainsRoot, d.name, 'routes');
      if (fs.existsSync(rdir)) dirs.push(rdir);
    }
  }
  return dirs.flatMap(listJsFiles);
}

const exportCache = new Map();

function resolveFrom(fromFile, relPath) {
  try {
    return Module.createRequire(fromFile).resolve(relPath);
  } catch {
    return null;
  }
}

function exportedNames(resolved) {
  if (resolved === null) return null;
  if (exportCache.has(resolved)) return exportCache.get(resolved);
  let names = null;
  try {
    const mod = require(resolved);
    if (mod && (typeof mod === 'object' || typeof mod === 'function')) {
      names = new Set(Object.keys(mod));
    } else {
      names = new Set();
    }
  } catch {
    names = null;
  }
  exportCache.set(resolved, names);
  return names;
}

function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const findings = [];
  let m;
  DESTRUCTURE_RE.lastIndex = 0;
  while ((m = DESTRUCTURE_RE.exec(src))) {
    const rawNames = m[1];
    const relPath = m[2];
    const resolved = resolveFrom(file, relPath);
    const exp = exportedNames(resolved);
    if (exp === null) continue;
    const names = rawNames
      .split(',')
      .map((s) => s.trim().split(':')[0].trim())
      .filter((s) => s && /^[A-Za-z_$][\w$]*$/.test(s));
    for (const name of names) {
      if (exp.has(name)) continue;
      // `_`-prefixed names are the codebase's "intentionally unused import"
      // marker — never called, so never a call-time 500. Skip them.
      if (name.startsWith('_')) continue;
      // Only a phantom that is actually REFERENCED can 500 at call time. The
      // import itself is one occurrence; require at least one more.
      const refs = (src.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length;
      if (refs < 2) continue;
      const targetRel = path.relative(BACKEND_ROOT, resolved).replace(/\\/g, '/');
      const key = targetRel + '::' + name;
      if (ALLOWLIST.has(key)) continue;
      findings.push({
        file: path.relative(BACKEND_ROOT, file).replace(/\\/g, '/'),
        importPath: relPath,
        name,
        key,
      });
    }
  }
  return findings;
}

function main() {
  const files = targetFiles();
  const all = [];
  for (const f of files) {
    try {
      all.push(...scanFile(f));
    } catch (e) {
      if (!JSON_OUT) process.stderr.write('[warn] scan failed for ' + f + ': ' + e.message + '\n');
    }
  }

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ scanned: files.length, phantoms: all }, null, 2) + '\n');
  } else if (all.length === 0) {
    process.stdout.write(
      '[OK] check:phantom-imports -- scanned ' + files.length + ' files, no phantom imports.\n'
    );
  } else {
    process.stdout.write(
      '[FAIL] check:phantom-imports -- ' + all.length + ' phantom import(s) (name not exported by target):\n'
    );
    for (const p of all) {
      process.stdout.write(
        '  ' + p.file + '\n    { ' + p.name + " } from '" + p.importPath + "' -- NOT exported (500 at call time)\n"
      );
    }
    process.stdout.write('\nFix: export the name from the target module, or correct the import.\n');
  }
  process.exit(all.length > 0 ? 1 : 0);
}

main();

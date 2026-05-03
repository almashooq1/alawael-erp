/**
 * react-app-env-vars-documented.test.js — drift guard.
 *
 * Two directions:
 *   • Forward: every `process.env.REACT_APP_X` referenced in src/ must
 *     be documented in frontend/.env.example. Strict — no ratchet.
 *   • Reverse: every entry in frontend/.env.example must be referenced
 *     somewhere (src/, .github/workflows, frontend/scripts). Ratchet at
 *     DEAD_CEILING; cleanup means deleting an entry AND lowering the
 *     ceiling in the same PR.
 *
 * Why scan workflows + scripts: build-time vars (REACT_APP_VERSION,
 * REACT_APP_ENVIRONMENT) are passed via webpack/CRA `env` blocks in
 * the deploy workflow rather than `process.env.X` in source code. A
 * src-only scan would falsely flag them as dead.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FRONTEND_ROOT = path.resolve(__dirname, '../../..');
const REPO_ROOT = path.resolve(FRONTEND_ROOT, '..');
const ENV_EXAMPLE = path.join(FRONTEND_ROOT, '.env.example');
const SRC_ROOT = path.join(FRONTEND_ROOT, 'src');

const BUILD_TIME_SCAN = [
  { dir: path.join(REPO_ROOT, '.github', 'workflows'), exts: ['.yml', '.yaml'] },
  { dir: path.join(FRONTEND_ROOT, 'scripts'), exts: ['.js', '.cjs', '.json'] },
];

function walk(dir, exts, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    if (entry.name === '__tests__') continue;
    if (entry.name === 'build') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, acc);
    else if (entry.isFile() && exts.some(e => entry.name.endsWith(e))) {
      acc.push(full);
    }
  }
  return acc;
}

function extractRefsRuntime(src) {
  const refs = new Set();
  const re = /process\.env\.(REACT_APP_[A-Z0-9_]+)/g;
  let m;
  while ((m = re.exec(src))) refs.add(m[1]);
  return refs;
}

function extractRefsBuildTime(src) {
  // YAML / shell / config files mention REACT_APP_X without process.env.
  const refs = new Set();
  const re = /\b(REACT_APP_[A-Z0-9_]+)\b/g;
  let m;
  while ((m = re.exec(src))) refs.add(m[1]);
  return refs;
}

function extractDocumented(text) {
  const docs = new Set();
  // Use [ \t] to keep leading-whitespace on a single line — \s would
  // consume \n and silently skip variables.
  const re = /^[ \t]*#?[ \t]*(REACT_APP_[A-Z0-9_]+)[ \t]*=/gm;
  let m;
  while ((m = re.exec(text))) docs.add(m[1]);
  return docs;
}

function collectAllReferences() {
  const refs = new Set();
  // Runtime (process.env.X under src/)
  for (const file of walk(SRC_ROOT, ['.js', '.jsx'])) {
    for (const r of extractRefsRuntime(fs.readFileSync(file, 'utf8'))) refs.add(r);
  }
  // Build-time (workflows + scripts)
  for (const { dir, exts } of BUILD_TIME_SCAN) {
    for (const file of walk(dir, exts)) {
      for (const r of extractRefsBuildTime(fs.readFileSync(file, 'utf8'))) refs.add(r);
    }
  }
  return refs;
}

describe('drift / react-app-env-vars-documented', () => {
  test('every process.env.REACT_APP_* under src/ is in frontend/.env.example', () => {
    const documented = extractDocumented(fs.readFileSync(ENV_EXAMPLE, 'utf8'));
    const referenced = new Set();
    for (const file of walk(SRC_ROOT, ['.js', '.jsx'])) {
      for (const r of extractRefsRuntime(fs.readFileSync(file, 'utf8'))) referenced.add(r);
    }

    const missing = Array.from(referenced).filter(n => !documented.has(n));
    if (missing.length > 0) {
      const detail = missing
        .sort()
        .map(n => `  • ${n}`)
        .join('\n');
      throw new Error(
        `REACT_APP_* env vars referenced in code but missing from frontend/.env.example:\n${detail}\n\n` +
          `Add an entry to frontend/.env.example with a comment explaining what it does.`
      );
    }
    expect(missing).toHaveLength(0);
  });

  test('parser sanity: example contains the canonical REACT_APP_API_URL', () => {
    const documented = extractDocumented(fs.readFileSync(ENV_EXAMPLE, 'utf8'));
    expect(documented.has('REACT_APP_API_URL')).toBe(true);
  });

  // Reverse direction with ratchet. Reduced from 14 to 0 on 2026-05-02
  // after a 13-row cleanup of frontend/.env.example (Firebase,
  // ENABLE_*, theme, ANALYTICS_ID, APP_NAME, DEBUG, LOG_LEVEL).
  const DEAD_CEILING = 0;

  test(`dead env-var count stays at-or-below baseline (${DEAD_CEILING})`, () => {
    const documented = extractDocumented(fs.readFileSync(ENV_EXAMPLE, 'utf8'));
    const referenced = collectAllReferences();
    const dead = Array.from(documented).filter(n => !referenced.has(n));
    if (dead.length > DEAD_CEILING) {
      const detail = dead
        .sort()
        .map(n => `  • ${n}`)
        .join('\n');
      throw new Error(
        `Dead env-var count rose to ${dead.length} (ceiling ${DEAD_CEILING}).\n\n` +
          `Vars in frontend/.env.example with no reference in src/, workflows, or scripts:\n${detail}\n\n` +
          `Either remove the unused entry OR add code/config that reads it.\n` +
          `NEVER raise DEAD_CEILING — drive it down.`
      );
    }
    expect(dead.length).toBeLessThanOrEqual(DEAD_CEILING);
  });
});

/**
 * no-silent-pass-smoke-tests-wave278l.test.js — drift guard for the
 * auto-generated `tests/unit/*.test.js` smoke pattern.
 *
 * The pattern: 46+ auto-generated unit-test files do
 *
 *   const svc = require('../../services/X');
 *   test('Y is callable', async () => {
 *     if (typeof svc.Y !== 'function') return;  // ← silent pass
 *     ...
 *   });
 *
 * If `svc.Y` doesn't exist, the test passes silently. That hid 41
 * silent-pass tests across 4 services (W278i: wrapper-export
 * `{ ClassName, classNameInstance }` where methods live on the
 * instance, not the wrapper) and 11 dead auto-gen overreach checks
 * (W278j: methods that were never on the service or were extracted
 * away in W278g).
 *
 * This guard walks `tests/unit/*.test.js`, extracts the (require path,
 * unwrap, method names) tuples, loads the service, and asserts every
 * defensive-check method is in fact `typeof === 'function'`. Any new
 * extract that strands a smoke test, or any new auto-gen overreach,
 * fails the suite with a focused diff.
 *
 * Note: this test loads many services in-process, which can have
 * side effects (DB lazy-connect, scheduler startup). Failures here
 * may indicate test setup gaps, not actual drift — eyeball the per-
 * service summary before concluding it's a real bug.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const UNIT_DIR = path.resolve(__dirname, '..', 'tests', 'unit');

function* listSmokeFiles() {
  if (!fs.existsSync(UNIT_DIR)) return;
  for (const f of fs.readdirSync(UNIT_DIR)) {
    if (f.endsWith('.test.js')) yield path.join(UNIT_DIR, f);
  }
}

function parseSmokeFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  // Find the svc declaration. Accept both:
  //   const svc = require('...')
  //   const svc = require('...').propertyName
  const svcLineRe =
    /const\s+svc\s*=\s*require\(['"]([^'"]+)['"]\)(\.([A-Za-z_$][A-Za-z0-9_$]*))?\s*;/;
  const svcMatch = src.match(svcLineRe);
  if (!svcMatch) return null;
  const [, requirePath, , unwrap] = svcMatch;
  if (!requirePath.startsWith('.')) return null;

  // Extract defensive-check method names
  const methodNames = [
    ...src.matchAll(
      /if\s*\(typeof\s+svc\.([A-Za-z_$][A-Za-z0-9_$]*)\s*!==\s*['"]function['"]\)\s*return/g
    ),
  ].map(m => m[1]);
  if (methodNames.length === 0) return null;

  return {
    file: path.basename(filePath),
    requirePath,
    unwrap: unwrap || null,
    methodNames,
  };
}

function loadServiceFor(spec) {
  const resolved = path.resolve(UNIT_DIR, spec.requirePath);
  let mod;
  try {
    mod = require(resolved);
  } catch (err) {
    return { loaded: false, error: err.message.slice(0, 120) };
  }
  if (spec.unwrap) {
    const inst = mod && mod[spec.unwrap];
    if (!inst)
      return { loaded: false, error: `unwrap '${spec.unwrap}' is ${typeof inst} on module` };
    return { loaded: true, svc: inst };
  }
  return { loaded: true, svc: mod };
}

describe('W278l — auto-gen smoke tests have no silent-pass methods', () => {
  const specs = [];
  for (const f of listSmokeFiles()) {
    const spec = parseSmokeFile(f);
    if (spec) specs.push(spec);
  }

  it('found a non-trivial number of smoke files (sanity)', () => {
    // As of 2026-05-23 there are ~30 smoke files with the defensive-check
    // pattern. If this drops near 0, the parsing logic likely broke.
    expect(specs.length).toBeGreaterThanOrEqual(20);
  });

  it('every defensive-check method exists on the loaded service', () => {
    const allMissing = [];
    const loadErrors = [];
    for (const spec of specs) {
      const loadResult = loadServiceFor(spec);
      if (!loadResult.loaded) {
        loadErrors.push(`${spec.file} → ${loadResult.error}`);
        continue;
      }
      const svc = loadResult.svc;
      const missing = spec.methodNames.filter(n => typeof svc[n] !== 'function');
      if (missing.length > 0) {
        allMissing.push({
          file: spec.file,
          unwrap: spec.unwrap,
          missingCount: missing.length,
          totalCount: spec.methodNames.length,
          missing: missing.slice(0, 8),
        });
      }
    }

    if (allMissing.length > 0) {
      const report = allMissing
        .map(
          m =>
            `\n  ${m.file}${m.unwrap ? ` (unwrap .${m.unwrap})` : ''}: ` +
            `${m.missingCount}/${m.totalCount} defensive checks reference methods not on the service\n` +
            `    missing: ${m.missing.join(', ')}${m.missingCount > 8 ? ', ...' : ''}\n` +
            `    fix:     either delete the dead smoke (W278j-style) or wire the method on the service`
        )
        .join('\n');
      throw new Error(
        `Found ${allMissing.length} smoke files with silent-pass defensive checks ` +
          `(methods that don't exist → test passes without testing):\n${report}`
      );
    }

    if (loadErrors.length > 5) {
      // Soft warning — load errors are usually test-setup gaps, not real drift.
      // Only fail if a LOT of files fail to load, which suggests the guard itself is broken.
      throw new Error(
        `${loadErrors.length} smoke files failed to load their service — ` +
          `this guard may be misconfigured:\n  ${loadErrors.slice(0, 3).join('\n  ')}`
      );
    }
  });
});

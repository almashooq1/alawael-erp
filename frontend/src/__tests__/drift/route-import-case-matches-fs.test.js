/**
 * route-import-case-matches-fs.test.js — drift guard.
 *
 * Vite + rollup are case-sensitive resolvers on Linux. Local Windows /
 * macOS dev (which often runs `core.ignorecase=true` or APFS) silently
 * accepts a wrong-case import path that the Linux CI runner then
 * rejects with `Could not resolve "..."`.
 *
 * Reference incident (2026-05-20): `frontend/src/routes/SessionsRoutes.jsx`
 * imported `'../pages/sessions/SessionCenterPage'` (lowercase) for a
 * file tracked at `frontend/src/pages/Sessions/SessionCenterPage.jsx`
 * (capital S). Local build green; Deploy-to-Production failed in the
 * `📦 Build Frontend` step every time it was pushed. The fix landed
 * in commit `355d117df` — this guard locks the invariant after.
 *
 * Rule: every `import('...')` (static or dynamic) in
 * `frontend/src/routes/**.{jsx,js,tsx,ts}` whose target is a relative
 * project path must resolve to a real file with **exact-case-matching
 * directory + filename** as the OS reports them.
 *
 * Why scan only `src/routes/`: the routes layer is where the original
 * incident occurred and where lazy `import()` paths are most likely to
 * drift. Widening to all of `src/` is a future expansion if a different
 * file class ever bites us.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.resolve(__dirname, '..', '..', 'routes');
const SRC_DIR = path.resolve(__dirname, '..', '..');

const CANDIDATE_EXTENSIONS = ['.jsx', '.js', '.tsx', '.ts'];
const INDEX_FALLBACKS = ['index.jsx', 'index.js', 'index.tsx', 'index.ts'];

/**
 * Read a directory and return its entries with their on-disk casing.
 * Returns null if the directory itself doesn't exist OR its parent
 * chain reports a case mismatch (caller surfaces that as the failure).
 */
function readDirCaseSensitive(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return null;
  }
}

/**
 * Resolve a relative `import('...')` target against a routes file dir.
 * Returns:
 *   - { ok: true, actualPath: '...' } when the file exists with exact case
 *   - { ok: false, expected, actualPath } on case mismatch
 *   - { ok: false, expected, actualPath: null } when the file is missing
 *   - null when the target is a package import (not relative) — skip
 */
function resolveImport(routesFile, importPath) {
  if (!importPath.startsWith('.')) return null; // package import — out of scope

  const fromDir = path.dirname(routesFile);
  const absRequested = path.resolve(fromDir, importPath);

  // Walk each path segment from SRC_DIR down, verifying case at each step.
  const relFromSrc = path.relative(SRC_DIR, absRequested);
  if (relFromSrc.startsWith('..')) return null; // outside src/

  const segments = relFromSrc.split(path.sep).filter(Boolean);

  let cursor = SRC_DIR;
  const actualSegments = [];

  for (let i = 0; i < segments.length; i += 1) {
    const wantedSegment = segments[i];
    const isLast = i === segments.length - 1;

    const entries = readDirCaseSensitive(cursor);
    if (!entries) {
      return { ok: false, expected: relFromSrc, actualPath: null };
    }

    if (isLast) {
      // Final segment may need an extension. Try exact first, then with each ext.
      const exact = entries.find(e => e === wantedSegment);
      if (exact) {
        // It's a directory — fall back to index.* lookup.
        const childDir = path.join(cursor, exact);
        const childEntries = readDirCaseSensitive(childDir);
        if (childEntries) {
          for (const idx of INDEX_FALLBACKS) {
            if (childEntries.includes(idx)) {
              actualSegments.push(exact, idx);
              return finalizeOK(relFromSrc, actualSegments);
            }
          }
        }
      }

      for (const ext of CANDIDATE_EXTENSIONS) {
        const wantedFile = wantedSegment + ext;
        const actualFile = entries.find(e => e.toLowerCase() === wantedFile.toLowerCase());
        if (actualFile) {
          actualSegments.push(actualFile);
          if (actualFile === wantedFile) {
            return finalizeOK(relFromSrc, actualSegments);
          }
          // Case mismatch on the filename.
          const expectedDisplay = [...segments.slice(0, -1), wantedFile].join('/');
          const actualDisplay = [...actualSegments.slice(0, -1), actualFile].join('/');
          return {
            ok: false,
            expected: expectedDisplay,
            actualPath: actualDisplay,
          };
        }
      }

      // Final segment present as directory but no index.* / extension match.
      if (exact) {
        const childExpected = path.join(...segments, 'index.{jsx,js}');
        return { ok: false, expected: childExpected, actualPath: null };
      }

      return { ok: false, expected: relFromSrc, actualPath: null };
    }

    // Non-final segment: must be a directory; check case.
    const match = entries.find(e => e.toLowerCase() === wantedSegment.toLowerCase());
    if (!match) {
      return { ok: false, expected: relFromSrc, actualPath: null };
    }
    actualSegments.push(match);
    if (match !== wantedSegment) {
      // Case mismatch on a directory segment — that's exactly the bug.
      const expectedDisplay = segments.join('/');
      const actualDisplay = actualSegments.join('/');
      return {
        ok: false,
        expected: expectedDisplay,
        actualPath: actualDisplay,
      };
    }
    cursor = path.join(cursor, match);
  }

  return { ok: false, expected: relFromSrc, actualPath: null };
}

function finalizeOK(relFromSrc, actualSegments) {
  return { ok: true, actualPath: actualSegments.join('/') };
}

function listRouteFiles() {
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(full);
    }
  }
  walk(ROUTES_DIR);
  return out;
}

const IMPORT_PATTERN = /import\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s+[^'"]*['"]([^'"]+)['"]/gm;

describe('frontend/src/routes/** import paths match on-disk case', () => {
  const files = listRouteFiles();

  it('at least 5 route files scanned (sanity)', () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  files.forEach(file => {
    it(`${path.relative(SRC_DIR, file)} — all relative imports resolve with exact case`, () => {
      const src = fs.readFileSync(file, 'utf8');

      const importPaths = [];
      let match;
      const re = new RegExp(IMPORT_PATTERN.source, 'gm');
      while ((match = re.exec(src)) !== null) {
        const importPath = match[1] || match[2];
        if (importPath) importPaths.push(importPath);
      }

      const failures = [];
      for (const ip of importPaths) {
        const result = resolveImport(file, ip);
        if (result && !result.ok && result.actualPath) {
          // Only flag clear case mismatches (where the file exists with a
          // different case). Pure missing files are caught by build/typecheck.
          failures.push({
            import: ip,
            expected: result.expected,
            actual: result.actualPath,
          });
        }
      }

      if (failures.length > 0) {
        const msg = failures
          .map(
            f =>
              `  import '${f.import}'\n    expected on disk: ${f.expected}\n    actual on disk:   ${f.actual}`
          )
          .join('\n');
        throw new Error(
          `${failures.length} case-mismatch import(s) — Linux CI build will fail:\n${msg}`
        );
      }
    });
  });
});

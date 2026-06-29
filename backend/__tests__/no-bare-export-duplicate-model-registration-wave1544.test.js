/**
 * W1544 — class-level OverwriteModelError crash guard.
 *
 * A model name registered in 2+ source files crashes with
 * `Cannot overwrite 'X' model once compiled` the moment the SECOND registrant
 * executes — UNLESS every registrant is guarded. Two valid guard styles exist:
 *   (a) `module.exports = mongoose.models.X || mongoose.model('X', schema)`  (|| guard)
 *   (b) `try { X = mongoose.model('X') } catch { X = mongoose.model('X', schema) }`
 *       or a require-based try/catch — register only runs in the catch fallback.
 *
 * The dangerous form is a BARE module-level export-register in a `models/` file:
 *   `module.exports = mongoose.model('X', schema)`  (no `models.X ||`)
 * because it ALWAYS executes on require. If the name is a duplicate, the 2nd such
 * file silently unmounts its consumer (caught by safeMount) — exactly the
 * ICFAssessment (W1542) and ReportTemplate (W1543) incidents.
 *
 * This guard fails if any `models/**` file does a BARE `module.exports = …model(
 * 'X', schema)` for a name that is registered in 2+ files. Static source scan
 * (no mongoose). Baseline is EMPTY — keep it that way (guard new duplicates with
 * the `models.X ||` form in the same PR).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const SCAN_DIRS = ['models', 'domains', 'services', 'routes', 'database', 'communication'];
const SKIP = new Set(['node_modules', '__tests__', 'tests', '_archived', '.git', 'scripts']);

// Registration of NAME (2nd arg present): (mongoose|connection|conn|db).model('NAME', …
const REGISTER_RE = /(?:mongoose|connection|conn|db)\.model\(\s*['"]([^'"]+)['"]\s*,/g;
// A *bare* module-level export-register: `module.exports = …model('NAME', …` with
// NO `models.NAME ||` guard on the same statement.
const BARE_EXPORT_RE =
  /module\.exports\s*=\s*(?:mongoose|connection|conn|db)\.model\(\s*['"]([^'"]+)['"]\s*,/;

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP.has(e.name)) walk(p, out);
    } else if (e.name.endsWith('.js')) {
      out.push(p);
    }
  }
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('W1544 — no bare export-register of a duplicate model name (OverwriteModelError class)', () => {
  const files = [];
  for (const d of SCAN_DIRS) walk(path.join(BACKEND, d), files);

  // Count how many distinct files register each model name (any style).
  const filesByName = {};
  for (const f of files) {
    const src = stripComments(fs.readFileSync(f, 'utf8'));
    const names = new Set();
    let m;
    REGISTER_RE.lastIndex = 0;
    while ((m = REGISTER_RE.exec(src)) !== null) names.add(m[1]);
    for (const n of names) (filesByName[n] = filesByName[n] || new Set()).add(f);
  }

  test('every duplicate model name is guarded in models/ (no bare module.exports register)', () => {
    const violations = [];
    for (const f of files) {
      const rel = path.relative(BACKEND, f).replace(/\\/g, '/');
      if (!rel.startsWith('models/')) continue; // the export-register pattern lives in models/
      const src = stripComments(fs.readFileSync(f, 'utf8'));
      const bare = src.match(BARE_EXPORT_RE);
      if (!bare) continue;
      const name = bare[1];
      const fileCount = filesByName[name] ? filesByName[name].size : 1;
      if (fileCount >= 2) {
        violations.push(
          `${rel} → bare 'module.exports = mongoose.model("${name}", …)' but "${name}" is registered in ${fileCount} files (use 'mongoose.models.${name} || mongoose.model(...)').`
        );
      }
    }
    expect(violations).toEqual([]);
  });
});

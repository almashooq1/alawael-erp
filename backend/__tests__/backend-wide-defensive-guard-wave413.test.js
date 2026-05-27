// W413: defensive-guard drift protection across the wider backend service surface.
//
// Companions: W411 (backend/models/), W412 (backend/rehabilitation-services/).
// This guard locks the REST of backend/ at ZERO inline naked Mongoose
// registrations of the form `mongoose.model('X', schema)` that are NOT:
//   * defensive `mongoose.models.X || mongoose.model('X', schema)`
//   * wrapped in `try { mongoose.model('X') } catch { mongoose.model('X', schema) }`
//   * helper-wrapped (reg / getOrCreate / registerModel / connection.model — covered by W340)
//
// Scope: recursively scans backend/ excluding node_modules, dotdirs,
// _archived, supply-chain-management, scripts, __tests__, tests, models
// (W411), rehabilitation-services (W412). JSDoc/comment-only matches are
// skipped via single-line "//" or "*" leading-prefix detection.
//
// Why this matters: prevents OverwriteModelError under test hot-reload
// and cross-file double-load. See W411 header for the full rationale.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SKIP_DIRS = new Set([
  'node_modules',
  '_archived',
  'supply-chain-management',
  'scripts',
  '__tests__',
  'tests',
  'models', // covered by W411
  'rehabilitation-services', // covered by W412
  'coverage',
  'dist',
  'build',
]);

const KNOWN_NAKED_REGISTRATIONS = new Set([
  // ─── Defensive require-fallback pattern (NOT a regression risk) ──────────
  // These three registrations live INSIDE a `} catch {` block that fires
  // only when `require('../models/X')` throws (i.e. when the canonical model
  // file is missing). In that path the route file builds an inline minimal
  // schema and registers it as a graceful-degradation stub. The naked
  // mongoose.model() call is acceptable because:
  //   (a) The catch fires only on require-failure, which is itself rare;
  //   (b) If the require succeeds, this code path never executes;
  //   (c) Per W340 doctrine these are equivalent to the try/catch defensive
  //       lookup pattern, just gated on require() instead of mongoose.model().
  // Wrapping in `mongoose.models.X ||` is harmless but adds noise; leaving
  // them in baseline = visible inventory of the pattern's instances.
  'routes/audit-trail-enhanced.routes.js:AuditLog',
  'routes/central-settings.routes.js:GlobalSetting',
  'routes/central-settings.routes.js:BranchSetting',
]);

function collectJsFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectJsFiles(p, acc);
    else if (e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}

function findNakedRegistrations(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/mongoose\.model\s*\(\s*['"]([A-Za-z_]\w*)['"]\s*,/);
    if (!m) continue;
    // Skip comment-only lines (line comments, JSDoc body lines)
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    const prev = i > 0 ? lines[i - 1] : '';
    const combined = prev + ' ' + line;
    // Defensive: `mongoose.models.X || mongoose.model('X', schema)`
    if (/mongoose\.models\.[A-Za-z_]\w*\s*\|\|/.test(combined)) continue;
    // Helper-wrapped (W340 territory)
    if (/getOrCreate|registerModel|connection\.model|conn\.model|db\.model|function\s+reg\b/.test(combined)) continue;
    // try { ... } catch { ... } defensive wrapper: look back up to 4 lines for `try {`
    let inTry = false;
    for (let j = Math.max(0, i - 4); j < i; j++) {
      if (/^\s*try\s*\{/.test(lines[j])) {
        inTry = true;
        break;
      }
    }
    if (inTry) continue;
    hits.push({ name: m[1], line: i + 1 });
  }
  return hits;
}

describe('W413: wider backend uses defensive model registration', () => {
  const files = collectJsFiles(ROOT);

  it('sanity: scan covers a non-trivial number of files', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no NEW naked mongoose.model registrations outside the baseline', () => {
    const offenders = [];
    for (const f of files) {
      const hits = findNakedRegistrations(f);
      for (const h of hits) {
        const key = path.relative(ROOT, f).replace(/\\/g, '/') + ':' + h.name;
        if (!KNOWN_NAKED_REGISTRATIONS.has(key)) {
          offenders.push(key + ' (line ' + h.line + ')');
        }
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'W413 drift: ' + offenders.length + ' new naked mongoose.model registration(s).\n' +
        'Convert each to the defensive form:\n' +
        "  const X = mongoose.models.X || mongoose.model('X', schema);\n" +
        'Or wrap in a try/catch defensive lookup block.\n\n' +
        'Offenders:\n  - ' + offenders.join('\n  - ')
      );
    }
    expect(offenders).toEqual([]);
  });

  it('KNOWN_NAKED_REGISTRATIONS baseline is not stale', () => {
    const present = new Set();
    for (const f of files) {
      for (const h of findNakedRegistrations(f)) {
        present.add(path.relative(ROOT, f).replace(/\\/g, '/') + ':' + h.name);
      }
    }
    const stale = [];
    for (const k of KNOWN_NAKED_REGISTRATIONS) {
      if (!present.has(k)) stale.push(k);
    }
    if (stale.length > 0) {
      throw new Error(
        'W413 baseline stale: ' + stale.length + ' entry(ies) no longer in source.\n' +
        'Remove them from KNOWN_NAKED_REGISTRATIONS (ratchet-down):\n  - ' + stale.join('\n  - ')
      );
    }
    expect(stale).toEqual([]);
  });
});

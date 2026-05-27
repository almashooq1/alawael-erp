// W412: defensive-guard drift protection for service-layer Mongoose registrations.
//
// Companion to W411 (which covers backend/models/). This guard locks
// backend/rehabilitation-services/ at ZERO inline naked Mongoose model
// registrations. A "naked" registration is one of the form:
//
//   const X = mongoose.model('X', schema);
//
// without the defensive prefix `mongoose.models.X ||` and without being
// wrapped in a `try { mongoose.model('X') } catch { mongoose.model('X', schema) }`
// defensive lookup block.
//
// Why this matters: this directory previously had several files (e.g.
// aac-therapy-protocols.js, advanced-therapy-protocols.js) that registered
// the SAME model name (TherapyProtocol) at module scope. Whichever loaded
// second would throw OverwriteModelError — the code worked only because of
// fragile load ordering. The cleanup in W411-followup converted them all to
// the defensive form `mongoose.models.X || mongoose.model('X', schema)`,
// which is load-order independent.
//
// Baseline: ZERO. Any new naked registration must use the defensive form.
// Pattern: copy of W411, scoped to backend/rehabilitation-services/.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'rehabilitation-services');

const KNOWN_NAKED_REGISTRATIONS = new Set([
  // baseline intentionally empty — keep at ZERO. If you have an exceptional
  // need to add an entry, document the reason inline.
]);

function collectJsFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
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
    const m = lines[i].match(/mongoose\.model\s*\(\s*['"]([A-Za-z_]\w*)['"]\s*,/);
    if (!m) continue;
    const prev = i > 0 ? lines[i - 1] : '';
    const combined = prev + ' ' + lines[i];
    // Defensive: `mongoose.models.X || mongoose.model('X', schema)`
    if (/mongoose\.models\.[A-Za-z_]\w*\s*\|\|/.test(combined)) continue;
    // Helper-wrapped registrations (different concern, covered by W340)
    if (/getOrCreate|registerModel|connection\.model|conn\.model|db\.model|function\s+reg\b/.test(combined)) continue;
    hits.push({ name: m[1], line: i + 1 });
  }
  return hits;
}

describe('W412: rehabilitation-services use defensive model registration', () => {
  const files = collectJsFiles(ROOT);

  it('sanity: scan covers a non-trivial number of files', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('no NEW naked mongoose.model registrations (must use defensive prefix)', () => {
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
        'W412 drift: ' + offenders.length + ' new naked mongoose.model registration(s).\n' +
        'Convert each to the defensive form:\n' +
        "  const X = mongoose.models.X || mongoose.model('X', schema);\n" +
        'This prevents OverwriteModelError under test hot-reload and cross-file double-load.\n\n' +
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
        'W412 baseline stale: ' + stale.length + ' entry(ies) no longer present in source.\n' +
        'Remove them from KNOWN_NAKED_REGISTRATIONS (ratchet-down):\n  - ' + stale.join('\n  - ')
      );
    }
    expect(stale).toEqual([]);
  });
});

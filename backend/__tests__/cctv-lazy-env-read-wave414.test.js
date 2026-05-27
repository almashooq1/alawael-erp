// W414: Phase 27 lazy-env-read drift guard for CCTV/Hikvision/ZKTeco/Biometric modules.
//
// Background: under Dynatrace agent injection, top-level `process.env.X` reads
// at module load time produce inconsistent / stale values vs. the same read
// performed lazily inside a function. The doctrine for these device-integration
// modules (Phase 27) is: ALWAYS read process.env inside a function body, never
// at module top level. See CLAUDE.md "Lazy-read process.env in CCTV/Hikvision".
//
// Companion to W411/W412/W413 (defensive Mongoose registration drift guards).
// Scans every .js file under backend/ whose path contains one of the target
// substrings (case-insensitive), excluding _archived/tests/scripts, and counts
// `process.env.X` reads that occur OUTSIDE any function body. Baseline = 0.
//
// Detection: line-by-line scan with a brace-depth tracker that records
// whether we're currently inside a function body. Comment lines (// or *)
// are skipped. `function`, `=>`, and `async (`-style openers push onto a
// function stack; matching `}` pops.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = ['hikvision', 'cctv', 'zkteco', 'biometric'];

const KNOWN_TOP_LEVEL_ENV_READS = new Set([
  // baseline intentionally empty — keep at ZERO. If you must add an entry,
  // document the Dynatrace-safe justification inline.
]);

function walk(d, acc = []) {
  if (!fs.existsSync(d)) return acc;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    if (
      [
        'node_modules',
        '_archived',
        '__tests__',
        'tests',
        'scripts',
        'coverage',
        'dist',
        'build',
        'supply-chain-management',
      ].includes(e.name)
    )
      continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}

function findTopLevelEnvReads(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const hits = [];
  let depth = 0;
  const fnStack = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    const opensFn = /\bfunction\b|=>\s*\{|async\s+function|async\s*\(/.test(line);
    if (/process\.env\.[A-Z_]/.test(line) && fnStack.length === 0) {
      hits.push({ line: i + 1, text: trimmed.slice(0, 90) });
    }
    for (const ch of line) {
      if (ch === '{') {
        depth++;
        if (opensFn && fnStack[fnStack.length - 1] !== depth) fnStack.push(depth);
      } else if (ch === '}') {
        if (fnStack[fnStack.length - 1] === depth) fnStack.pop();
        depth--;
      }
    }
  }
  return hits;
}

describe('W414: CCTV/Hikvision/ZKTeco/Biometric modules lazy-read process.env (Phase 27)', () => {
  const all = walk(ROOT);
  const files = all.filter(f => {
    const l = f.toLowerCase();
    return TARGETS.some(t => l.includes(t));
  });

  it('sanity: scan covers a non-trivial number of device-integration files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('no NEW top-level process.env reads outside the baseline', () => {
    const offenders = [];
    for (const f of files) {
      const hits = findTopLevelEnvReads(f);
      for (const h of hits) {
        const key = path.relative(ROOT, f).replace(/\\/g, '/') + ':' + h.line;
        if (!KNOWN_TOP_LEVEL_ENV_READS.has(key)) {
          offenders.push(key + '  ' + h.text);
        }
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'W414 drift: ' +
          offenders.length +
          ' top-level process.env read(s) in CCTV/Hikvision/ZKTeco/Biometric module(s).\n' +
          'Move each read INSIDE the function that uses it (Phase 27 Dynatrace gotcha).\n\n' +
          'Offenders:\n  - ' +
          offenders.join('\n  - ')
      );
    }
    expect(offenders).toEqual([]);
  });

  it('KNOWN_TOP_LEVEL_ENV_READS baseline is not stale', () => {
    const present = new Set();
    for (const f of files) {
      for (const h of findTopLevelEnvReads(f)) {
        present.add(path.relative(ROOT, f).replace(/\\/g, '/') + ':' + h.line);
      }
    }
    const stale = [];
    for (const k of KNOWN_TOP_LEVEL_ENV_READS) {
      if (!present.has(k)) stale.push(k);
    }
    if (stale.length > 0) {
      throw new Error(
        'W414 baseline stale: ' +
          stale.length +
          ' entry(ies) no longer in source. Ratchet down by removing:\n  - ' +
          stale.join('\n  - ')
      );
    }
    expect(stale).toEqual([]);
  });
});

'use strict';

/**
 * no-x-branch-id-header-trust-wave1621.test.js — Wave 1621.
 *
 * Drift guard for the `x-branch-id` HEADER-TRUST IDOR class (fixed across
 * cdss #840, volunteer/recruitment #859, elearning-enhanced #937/W1607,
 * complaints #970 — 2026-07-01/02).
 *
 * The bug shape: a handler derives its branch scope from the CLIENT-controlled
 * `x-branch-id` request header —
 *
 *     const branchId = req.headers['x-branch-id'];        // ← IDOR
 *     const items = await Model.find({ branchId, ... });
 *
 * `requireBranchAccess` validates branchId in query/body/params, NOT headers,
 * so a branch-restricted caller reads (or stamps) ANY branch's data by sending
 * `x-branch-id: <foreign>`. `req.user.branchId` is never on the JWT, so the
 * header was the de-facto scope.
 *
 * Canonical safe form: `effectiveBranchScope(req)` LEADS — a restricted caller
 * is pinned to their server-derived branch and never reaches the header; only a
 * cross-branch/HQ role may use it as a back-compat fallback:
 *
 *     const branchId = effectiveBranchScope(req) || req.headers['x-branch-id'];   // one-liner (HQ fallback)
 *   or
 *     const scoped = effectiveBranchScope(req);
 *     if (scoped) return scoped;                                   // restricted → own branch, header unreachable
 *     if (req.branchScope && !req.branchScope.restricted) return req.headers['x-branch-id'] || undefined;
 *     return undefined;                                            // fail closed
 *
 * This guard FAILS if any `backend/routes` / `backend/services` / DDD-domain
 * file reads the `x-branch-id` header (`req.headers['x-branch-id']` /
 * `req.header('x-branch-id')` / `req.get('x-branch-id')`) WITHOUT
 * `effectiveBranchScope` appearing within the 12 lines preceding it. Validated
 * clean on the 2026-07-02 tree: 3 header reads, all effectiveBranchScope-led,
 * 0 unguarded → baseline empty.
 *
 * Future agents: never derive branch scope straight from the header. Lead with
 * `effectiveBranchScope(req)` and only fall back to the header for an
 * unrestricted (cross-branch) role.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCAN_GLOBS = [
  'routes/**/*.js',
  'services/**/*.js',
  'domains/**/routes/**/*.js',
  'domains/**/services/**/*.js',
];

// A read of the client x-branch-id header used as a value.
const HEADER_RE =
  /req\.(?:headers\s*\[\s*['"]x-branch-id['"]\s*\]|header\s*\(\s*['"]x-branch-id['"]|get\s*\(\s*['"]x-branch-id['"])/i;
// Safe iff effectiveBranchScope leads within the window (restricted callers
// never reach the header; only unrestricted/HQ roles use it as a fallback).
const GUARD_RE = /effectiveBranchScope/;
const WINDOW = 12;

// Files/sites explicitly allowed (empty — the 2026-07-02 sweep left zero).
const KNOWN_UNGUARDED_BASELINE = new Set([]);

function stripBlock(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
}
function stripLine(l) {
  return l.replace(/\/\/.*$/, '');
}

function findAllScanFiles() {
  const seen = new Set();
  for (const pattern of SCAN_GLOBS) {
    for (const m of glob.sync(pattern, { cwd: REPO_ROOT, nodir: true })) {
      seen.add(m.replace(/\\/g, '/'));
    }
  }
  return Array.from(seen).sort();
}

function scanFile(rel) {
  const abs = path.join(REPO_ROOT, rel);
  const lines = stripBlock(fs.readFileSync(abs, 'utf8')).split('\n').map(stripLine);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (HEADER_RE.test(lines[i])) {
      const guarded = GUARD_RE.test(lines.slice(Math.max(0, i - WINDOW), i + 1).join('\n'));
      hits.push({ line: i + 1, guarded, text: lines[i].trim() });
    }
  }
  return hits;
}

describe('W1621 — x-branch-id header-trust IDOR drift guard', () => {
  test('no route/service derives branch scope from the x-branch-id header without effectiveBranchScope', () => {
    const offenders = [];
    for (const rel of findAllScanFiles()) {
      if (rel.includes('no-x-branch-id-header-trust-wave1621')) continue;
      for (const h of scanFile(rel)) {
        if (!h.guarded && !KNOWN_UNGUARDED_BASELINE.has(`${rel}:${h.line}`)) {
          offenders.push(`  - ${rel}:${h.line}  ${h.text}`);
        }
      }
    }
    if (offenders.length) {
      throw new Error(
        `W1621: ${offenders.length} unguarded \`x-branch-id\` header read(s) found.\n` +
          'The client header bypasses requireBranchAccess — a restricted caller spoofs any branch.\n' +
          'Lead with `effectiveBranchScope(req)`; fall back to the header only for a cross-branch role.\n' +
          offenders.join('\n')
      );
    }
    expect(offenders).toEqual([]);
  });

  test('ratchet: every KNOWN_UNGUARDED_BASELINE entry still resolves to a real unguarded site', () => {
    for (const entry of KNOWN_UNGUARDED_BASELINE) {
      const [rel, lineStr] = entry.split(':');
      const abs = path.join(REPO_ROOT, rel);
      expect(fs.existsSync(abs)).toBe(true);
      const stillUnguarded = scanFile(rel).some(h => h.line === Number(lineStr) && !h.guarded);
      expect(stillUnguarded).toBe(true); // fails → prune the fixed entry from the baseline
    }
  });

  test('detector sanity: bare header read is caught, effectiveBranchScope-led forms are not', () => {
    const tmp = '__tests__/.w1621-detector-fixture.js';
    const write = content => {
      fs.writeFileSync(path.join(REPO_ROOT, tmp), content);
    };
    try {
      // Bare header read → unguarded
      write('const branchId = req.headers["x-branch-id"];\nModel.find({ branchId });\n');
      const bare = scanFile(tmp);
      expect(bare.length).toBe(1);
      expect(bare[0].guarded).toBe(false);

      // One-liner HQ fallback → guarded
      write("const branchId = effectiveBranchScope(req) || req.headers['x-branch-id'];\n");
      expect(scanFile(tmp)[0].guarded).toBe(true);

      // Multi-line guarded helper (effectiveBranchScope ~5 lines up) → guarded
      write([
        'const scoped = effectiveBranchScope(req);',
        'if (scoped) return scoped;',
        'if (req.branchScope && !req.branchScope.restricted) {',
        "  return req.headers['x-branch-id'] || undefined;",
        '}',
        'return undefined;',
      ].join('\n'));
      expect(scanFile(tmp)[0].guarded).toBe(true);

      // req.get(...) variant, bare → caught
      write("const b = req.get('x-branch-id');\n");
      expect(scanFile(tmp)[0].guarded).toBe(false);

      // Commented-out header read → not detected
      write("// const b = req.headers['x-branch-id'];\n");
      expect(scanFile(tmp).length).toBe(0);
    } finally {
      fs.unlinkSync(path.join(REPO_ROOT, tmp));
    }
  });
});

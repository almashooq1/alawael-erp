#!/usr/bin/env node
/**
 * check-dormant-modules.js — surface backend route + service files
 * that exist on disk but are never referenced from any OTHER source
 * file. These are the "dormant modules" the W340 cleanup arc keeps
 * re-discovering (vehicles/<x>, communication/<x>, permission-service,
 * and several W340-tagged sub-services).
 *
 * WHY (the incident class):
 *   The codebase has FOUR distinct mount/wire-up patterns documented
 *   in CLAUDE.md (`safeRequire+dualMount` / `safeMount+relative-path` /
 *   `app.use(require(...))` / `bootstrap-file factory`). The W217 +
 *   W225b dormant-routes audit got two of them wrong because the agent
 *   only grepped for ONE pattern and prematurely declared 5 live
 *   route files "dead", then added duplicate mounts Express silently
 *   ignored. The W340 cleanup arc found a SECOND blind spot —
 *   `connection.model('X', …)` registration patterns the original
 *   regex didn't cover.
 *
 *   The lesson: a single heuristic is never enough. This gate uses
 *   the inverse: "build an index of every basename-shaped token in
 *   every .js file in backend/, then flag any route/service whose
 *   filename-without-extension doesn't appear in ANY file other than
 *   itself." That single check covers all four wire-up patterns
 *   because they ALL reference the target by some form of its filename.
 *
 *   SCOPE: only `routes/` + `services/` for v1. Models are referenced
 *   by their REGISTERED NAME (e.g., `mongoose.model('AacProfile')`)
 *   which often differs from the filename, so the filename-token
 *   heuristic produces too many false positives for `models/`. A
 *   separate `check-orphan-models.js` would need to parse each model
 *   file for `mongoose.model('X', …)` + cross-reference against
 *   `ref: 'X'` strings — out of scope for this v1.
 *
 * HOW THIS GATE WORKS:
 *   1. Collect candidate files:
 *        - backend/routes/<any>/<name>.routes.js  (excluding _archived)
 *        - backend/services/<any>/<name>.service.js
 *        - backend/services/<any>/<name>.js  (legacy non-suffixed)
 *   2. Walk every .js file under backend/ (excluding tests, archived,
 *      node_modules, scripts) and tokenize: extract every identifier-
 *      shaped substring (`[A-Za-z_][A-Za-z0-9_-]<2,}`). Record each
 *      token → set of absolute file paths it appears in.
 *   3. For each candidate, look up its `baseNoExt` token in the index.
 *      If the lookup returns a set whose ONLY member is the candidate
 *      itself (or is empty), the candidate is DORMANT.
 *   4. Diff against KNOWN_DORMANT_BASELINE per the W325c ratchet-DOWN
 *      pattern; exit 1 on either NEW dormant or STALE baseline entry.
 *
 * USAGE:
 *   node scripts/check-dormant-modules.js              # human-readable
 *   node scripts/check-dormant-modules.js --json       # machine-readable
 *   node scripts/check-dormant-modules.js --verbose    # full list
 *   node scripts/check-dormant-modules.js --bare       # raw list, no baseline filter
 *
 * EXIT:
 *   0 = no NEW dormant + no stale baseline entries.
 *   1 = NEW dormant detected OR baseline contains an entry that's now
 *       wired-up (ratchet-DOWN: remove from baseline in same commit).
 *
 * INTENTIONALLY ON-DEMAND (not wired into pre-push): scan reads
 * ~1000 files + builds a token map; ~5-15s on a warm cache. Run
 * during sprint cleanup waves or when extending the W340 ratchet.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');
const VERBOSE = ARGS.includes('--verbose');
const BARE = ARGS.includes('--bare');

const BACKEND_ROOT = path.resolve(__dirname, '..');

// Directories that contain CANDIDATE files to check for dormancy.
// SCOPE: routes + services only (see WHY block). Models live with a
// separate heuristic (registered name vs filename mismatch).
const CANDIDATE_DIRS = [
  { dir: 'routes', filter: name => /\.routes(\.[a-z]+)?\.js$/.test(name) },
  { dir: 'services', filter: name => name.endsWith('.js') && !name.endsWith('.test.js') },
];

// Skip these directory names anywhere in the walk — they don't host
// production wires + can't host dormant modules in a meaningful sense.
const SKIP_DIR_NAMES = new Set([
  '_archived',
  '_backups',
  '__tests__',
  'tests',
  'scripts',
  'node_modules',
  'coverage',
  '.git',
]);

// Filenames TOO GENERIC to use as a dormancy signal. An `index.js`
// always shows up as a string somewhere unrelated; the false-positive
// rate is too high to gate on.
const GENERIC_NAMES = new Set([
  'index.js',
  'main.js',
  'app.js',
  'server.js',
  'config.js',
  'utils.js',
  'helpers.js',
  'constants.js',
  'types.js',
  'errors.js',
  'register.js',
  'bootstrap.js',
]);

// Identifier-shaped tokens: starts with letter/underscore, ≥3 chars,
// allows letters / digits / underscore / hyphen / dot (for compound
// names like `vehicleMaintenance.service`). Mongoose model names,
// dotted require paths, kebab-case service names all match.
const TOKEN_RE = /[A-Za-z_][A-Za-z0-9_.-]{2,}/g;

// W340 known-dormant baseline (as of 2026-05-27). Each entry is a
// MODULE the W340 cleanup arc has surfaced but not yet decided to
// wire-up or delete. ADR-030 captures the decision framework. Add
// new entries here ONLY with a comment naming the module + the ADR
// or wave tracking the decision.
//
// Ratchet-DOWN per W325c pattern:
//   - NEW dormant (not in baseline) → fail (forces immediate triage)
//   - STALE baseline entry (file deleted or now wired) → fail
//     (forces removal from baseline in same commit as the fix)
const KNOWN_DORMANT_BASELINE = new Set([
  // ── Baselined 2026-05-28 (W522 follow-up). Full triage in
  //    docs/audits/dormant-modules-triage-2026-05-28.md. Each entry is
  //    tracked for a wire-up-vs-delete decision; ratchet-DOWN as each
  //    is resolved. Path format: relative to backend/, POSIX, no
  //    leading slash.

  // CLI_TOOL (6) — referenced ONLY from an admin-invoked seed/migration
  // script (+ its own test). NOT auto-loaded at runtime by design. These
  // are legitimately "not wired" — keep baselined unless a decision is
  // made to run them on a schedule via a *Bootstrap.js cron.
  'services/finance/insuranceTariffsBootstrap.js', // ← scripts/seed-insurance-tariffs.js
  'services/hr/hrAdaptiveRetentionService.js', // ← scripts/hr-audit-retention.js
  'services/hr/hrAuditRetentionService.js', // ← scripts/hr-audit-retention.js
  'services/hr/hrCredentialStatusSync.js', // ← scripts/hr-credential-sync.js
  'services/rehabSeedPlanner.js', // ← scripts/rehab-seed-planner.js
  'services/financeAnomaly.service.js', // ← scripts/expense-anomaly-scan.js (read-only audit CLI, W1218)

  // TEST_ONLY — built + unit-tested but referenced by NO production code
  // path. The real dormancy class. Disposition history (see triage doc):
  //   W524: crisisOrchestrator.service.js WIRED at /api/clinical-crisis
  //         (ADR-033) — removed from baseline.
  //   W526: 6 flat services/documentXService.js DELETED — dead duplicates
  //         of the wired services/documents/* suite.
  //   W527: 10 bulk-import orphans (no live sibling, 0 referrers, dead
  //         2+ months) DELETED — policyEngine, ruleBuilder,
  //         smartFleetDashboard, smartGPSWebSocket, servicePricing,
  //         saudiLaborCalculations, clinicalProgress,
  //         rehabilitationCalculations, rehabProgressCalculations,
  //         waitlistPriority. See triage doc "W527 disposition".
  //
  // The 7 below are HELD (NOT auto-disposed) — each has a reason it
  // needs individual / stakeholder review before wire-or-delete:
  'services/base/BaseCrudService.js', // base class — adopt across CRUD services OR delete
  'services/beneficiaryEquityEngine.service.js', // W0-LifecycleAlign: disparity engine built+tested, awaiting route/cron wire-up decision
  'services/finance/zatcaCalculation.service.js', // ⚠ ZATCA compliance — verify vs live zatca path first
  'services/gpsSecurityService.js', // entangled w/ W440 security drift-guard (verifyAPIKey timing-safe)
  'services/rehabilitation/RehabService.js', // deliberate module add; rehab system is fragmented (future ADR)
  // services/isolationForest.service.js — RATCHETED-DOWN 2026-06-20 (W340 repair):
  //   now wired via services/financeAnomaly.service.js + services/operationsAnomaly.service.js.
  //   No longer dormant.
  // services/reporting/webhookHandler.js — RATCHETED-DOWN 2026-06-05 (W933/W941):
  //   wired via routes/reports-webhooks.routes.js self-init when ENABLE_REPORT_WEBHOOKS=true
  //   (real WebhookHandler bound to ReportDelivery). No longer dormant.
]);

function walk(rootAbs, accept) {
  const out = [];
  function inner(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIR_NAMES.has(e.name)) continue;
        if (e.name.startsWith('.')) continue;
        inner(full);
      } else if (e.isFile() && accept(e.name)) {
        out.push(full);
      }
    }
  }
  inner(rootAbs);
  return out;
}

// Strip conventional `.service` / `.routes` / `.model` suffix from a
// baseNoExt token. Callers often `require('./rehabilitation.service')`
// AND `const rehab = require('./rehabilitation')` interchangeably; the
// LATTER form yields a `rehabilitation` token in the corpus that
// wouldn't match `rehabilitation.service` lookup. Returns the
// suffix-stripped form (or null when no conventional suffix present —
// avoids degenerate matches against generic English words for files
// whose baseNoExt has no `.suffix`).
function stripConventionalSuffix(baseNoExt) {
  const m = baseNoExt.match(/^(.+)\.(service|routes|model)$/);
  return m ? m[1] : null;
}

// Collect candidate files honoring per-dir filter + global skips.
function listCandidates() {
  const out = [];
  for (const c of CANDIDATE_DIRS) {
    const dirAbs = path.join(BACKEND_ROOT, c.dir);
    if (!fs.existsSync(dirAbs)) continue;
    for (const f of walk(dirAbs, c.filter)) {
      const base = path.basename(f);
      if (GENERIC_NAMES.has(base)) continue;
      const baseNoExt = base.replace(/\.js$/, '');
      out.push({
        abs: f,
        rel: path.relative(BACKEND_ROOT, f).split(path.sep).join('/'),
        base,
        baseNoExt,
        baseStripped: stripConventionalSuffix(baseNoExt),
      });
    }
  }
  return out;
}

// Collect every .js under backend/ that the token index should scan.
// We INCLUDE candidate files in this list — they need to be in the
// index so that route ↔ service cross-references count as "wired".
// Self-references are excluded at query time, not at ingest time.
function listAllJsFiles() {
  return walk(BACKEND_ROOT, name => name.endsWith('.js') && !name.endsWith('.test.js'));
}

// Build a token → set-of-files index in a single pass. Returns a Map
// keyed by token; the value is a Set of absolute file paths. Pure
// (apart from fs.readFileSync) — exposed for tests.
function buildTokenIndex(files) {
  const index = new Map();
  for (const f of files) {
    let content;
    try {
      content = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    const seenInThisFile = new Set();
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(content)) !== null) {
      const t = m[0];
      if (seenInThisFile.has(t)) continue;
      seenInThisFile.add(t);
      let s = index.get(t);
      if (!s) {
        s = new Set();
        index.set(t, s);
      }
      s.add(f);
    }
  }
  return index;
}

// Decide whether a candidate is referenced by ANY file OTHER than
// itself in the token index. Pure — exposed for tests.
//
// Three-layer lookup, in order of decreasing confidence:
//   1. Full baseNoExt (e.g., `rehabilitation.service`) — strict.
//      Matches `require('./rehabilitation.service')` style callers.
//   2. With-extension base (e.g., `chainAuditor.js`) — for callers
//      that reference the explicit filename, typically JSDoc/comment
//      cross-refs like `// see chainAuditor.js`. Captured as a single
//      token by the regex because `.` is in the char class.
//   3. Suffix-stripped fallback (e.g., `rehabilitation`) — only when
//      candidate has a conventional `.service`/`.routes`/`.model`
//      suffix. Matches `const rehab = require('./rehabilitation')`
//      style callers. Accepts higher false-WIRED risk (generic word
//      collision) to eliminate the false-DORMANT class this script's
//      whole purpose is to surface.
//
// A 2026-05-28 triage of the v1 baseline found false-dormants in two
// shapes: callers using the bare `require('./x')` form (layer 3 catches
// these) and JSDoc cross-refs naming the with-extension filename
// (layer 2 catches these).
function isReferenced(candidate, tokenIndex) {
  const checks = [candidate.baseNoExt, candidate.base, candidate.baseStripped].filter(Boolean);
  for (const key of checks) {
    const files = tokenIndex.get(key);
    if (!files) continue;
    for (const f of files) {
      if (f !== candidate.abs) return true;
    }
  }
  return false;
}

function diffBaseline(currentDormant, baseline) {
  const current = new Set(currentDormant.map(c => c.rel));
  const added = currentDormant
    .filter(c => !baseline.has(c.rel))
    .sort((a, b) => a.rel.localeCompare(b.rel));
  const removed = [...baseline].filter(p => !current.has(p)).sort();
  return { added, removed };
}

function main() {
  const t0 = Date.now();
  const candidates = listCandidates();
  const allFiles = listAllJsFiles();
  const tokenIndex = buildTokenIndex(allFiles);

  const dormant = candidates
    .filter(c => !isReferenced(c, tokenIndex))
    .sort((a, b) => a.rel.localeCompare(b.rel));

  const elapsedMs = Date.now() - t0;

  if (BARE) {
    if (JSON_MODE) {
      process.stdout.write(
        JSON.stringify({ dormant: dormant.map(d => d.rel), elapsedMs }, null, 2) + '\n'
      );
    } else {
      for (const d of dormant) console.log(d.rel);
    }
    process.exit(0);
  }

  const { added, removed } = diffBaseline(dormant, KNOWN_DORMANT_BASELINE);

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          scannedCandidates: candidates.length,
          scannedReferrers: allFiles.length,
          tokenIndexSize: tokenIndex.size,
          dormantCount: dormant.length,
          newDormant: added.map(d => d.rel),
          staleBaseline: removed,
          baselineSize: KNOWN_DORMANT_BASELINE.size,
          elapsedMs,
        },
        null,
        2
      ) + '\n'
    );
  } else {
    console.log(
      `Scanned ${candidates.length} candidate(s) against ${allFiles.length} file(s) in ${elapsedMs}ms ` +
        `(token index: ${tokenIndex.size}).`
    );
    console.log(`Dormant: ${dormant.length} (baseline: ${KNOWN_DORMANT_BASELINE.size}).`);

    if (added.length === 0 && removed.length === 0) {
      console.log('✓ No NEW dormant modules + no stale baseline entries.');
    }
    if (added.length > 0) {
      console.log(`✗ ${added.length} NEW dormant module(s) — never referenced anywhere:`);
      for (const c of added) console.log(`  + ${c.rel}`);
      console.log('');
      console.log('Each entry above is a route/service file no other .js in backend/');
      console.log('references by its baseNoExt token. Triage:');
      console.log('  (a) wire it up via app.js, startup/<x>, or a registry — then re-run');
      console.log('  (b) delete if confirmed obsolete (one commit titled');
      console.log('      `chore(W340): retire <module> per ADR-030`)');
      console.log('  (c) baseline it in scripts/check-dormant-modules.js with a comment');
      console.log('      naming the wave or ADR tracking the wire-up-vs-delete decision');
    }
    if (removed.length > 0) {
      console.log(`✗ ${removed.length} STALE baseline entr(y/ies) — file deleted or now wired:`);
      for (const f of removed) console.log(`  - ${f}`);
      console.log('');
      console.log('Remove these from KNOWN_DORMANT_BASELINE in');
      console.log('scripts/check-dormant-modules.js (ratchet-DOWN per W325c).');
    }
    if (VERBOSE && dormant.length > 0) {
      console.log('');
      console.log('Full dormant list (including baselined entries):');
      for (const d of dormant) {
        const tag = KNOWN_DORMANT_BASELINE.has(d.rel) ? '[baselined]' : '[new]';
        console.log(`  ${tag.padEnd(13)} ${d.rel}`);
      }
    }
  }

  process.exit(added.length + removed.length === 0 ? 0 : 1);
}

// Pure helpers exported for unit tests.
module.exports = {
  listCandidates,
  listAllJsFiles,
  buildTokenIndex,
  isReferenced,
  diffBaseline,
  stripConventionalSuffix,
  KNOWN_DORMANT_BASELINE,
  GENERIC_NAMES,
  SKIP_DIR_NAMES,
  CANDIDATE_DIRS,
  TOKEN_RE,
};

if (require.main === module) {
  main();
}

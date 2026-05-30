#!/usr/bin/env node
'use strict';

/**
 * audit-untenanted-aggregations.js — ADR-034/W597 follow-up (R4).
 * ════════════════════════════════════════════════════════════════════
 * The `tenantScope` Mongoose plugin auto-filters `find()`-family queries
 * by branchId — but it CANNOT see `.aggregate()` pipelines or raw
 * `connection.db.collection()` driver calls. Those are the Mongo analogue
 * of a Postgres `SECURITY DEFINER` leak: a branch-scoped user's request
 * can read across all 13 branches if the pipeline has no branch `$match`.
 *
 * This is a READ-ONLY, PURE-SOURCE triage tool (no DB, no boot). It is
 * deliberately NOT a pre-push gate — the surface is ~476 sites, so a
 * CI-breaking guard would need the W340 ratchet-down treatment first.
 * This surfaces the blast radius so that work can be scoped.
 *
 * HEURISTIC (acknowledged false-positive/negative rate, like
 * check-dormant-modules v1): for every `.aggregate(` call site in
 * routes/ + services/, it scans a window of source AFTER the call for any
 * branch-scoping token (branchId / branchFilter / effectiveBranchScope /
 * branchScope / branch_id / bypassTenantScope). A site with NONE is a
 * CANDIDATE — it may legitimately be admin/cross-branch, may scope via a
 * variable built earlier, or may genuinely leak. Triage, not verdict.
 *
 * Raw `.db.collection(` driver calls are reported separately (higher
 * severity — they bypass ALL Mongoose plugins unconditionally).
 *
 * Usage:
 *   node scripts/audit-untenanted-aggregations.js          # human report
 *   node scripts/audit-untenanted-aggregations.js --json   # machine
 *   node scripts/audit-untenanted-aggregations.js --files  # candidate files only
 *
 * Exit 0 always (informational). Pipe to a baseline later if promoted.
 */

const fs = require('fs');
const path = require('path');

const JSON_OUT = process.argv.includes('--json');
const FILES_OUT = process.argv.includes('--files');
const PII_ROUTES = process.argv.includes('--pii-routes');
const BACKEND = path.join(__dirname, '..');
const SCAN_DIRS = ['routes', 'services'];
const WINDOW = 600; // chars after .aggregate( to scan for a branch token

const BRANCH_TOKENS =
  /\b(branchId|branch_id|branchFilter|effectiveBranchScope|branchScope\w*|bypassTenantScope|resolveRegionalBranchFilter|assertBranchIdsAllowed)\b/;

// ── --pii-routes narrowing: high-confidence active-leak shortlist ─────
// PII / branch-sensitive model or collection names. An aggregate on one of
// these, inside a WIRED route handler, with no branch token AND no admin /
// cross-branch gate in the enclosing window, is a high-confidence leak.
const PII_RE =
  /\b\w*(beneficiar|patient|student|episode|assessment|careplan|care_plan|session|attendance|goal|measure|clinical|therapy|diagnos|prescription|vital|incident|complaint|invoice|payroll|salary|medical|consent|safeguard|behavior|behaviour|seizure)\w*/i;
const ADMIN_GATE_RE =
  /requireRole\s*\([^)]*(admin|super_admin|head_office|ceo|group_|compliance|auditor|dpo)|CROSS_BRANCH|allBranches|requireMfaTier/i;
const WIDE = 1500; // chars each side — approximates the enclosing handler

function receiverOf(src, idx) {
  // token immediately before `.aggregate(`
  const before = src.slice(Math.max(0, idx - 60), idx);
  const m = before.match(/([A-Za-z_$][\w$]*)\s*$/);
  return m ? m[1] : '(unknown)';
}

// ── model-has-branchId index (false-positive reducer) ────────────────
// An aggregate is only branch-scopable if its MODEL actually declares a
// branchId/branch_id field. RiskAssessment (organizationId-scoped),
// Strategic*/Fleet* (no tenant field) etc. are flagged by the heuristic but
// CANNOT be fixed with a one-line branchFilter — they need denormalization
// first (a W613-style model change) or are legitimately non-branch data.
// Build a one-time index: registered-model-name → declares a branch field?
// Keyed by the lowercased model name so the receiver (`Payment`, `Expense`,
// the `M`/`S` minified aliases won't resolve — reported as unknown).
const BRANCH_FIELD_RE = /\b(branchId|branch_id)\b/;
let _modelBranchIndex = null;
function modelBranchIndex() {
  if (_modelBranchIndex) return _modelBranchIndex;
  const idx = new Map(); // lowercased model name → boolean (declares branch field)
  const modelsRoot = path.join(BACKEND, 'models');
  for (const file of walkJs(modelsRoot)) {
    let src;
    try {
      src = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const declaresBranch = BRANCH_FIELD_RE.test(src);
    // Every mongoose.model('Name', …) registration in this file gets the verdict.
    const re = /mongoose\.model\(\s*['"]([^'"]+)['"]/g;
    let mm;
    let found = false;
    while ((mm = re.exec(src))) {
      idx.set(mm[1].toLowerCase(), declaresBranch);
      found = true;
    }
    // Fallback: file with no explicit registration → key by basename.
    if (!found) idx.set(path.basename(file, '.js').toLowerCase(), declaresBranch);
  }
  _modelBranchIndex = idx;
  return idx;
}

// Verdict for a receiver token: 'has' | 'missing' | 'unknown' (alias/unresolved).
function branchVerdict(receiver) {
  if (!receiver || receiver === '(unknown)') return 'unknown';
  // single-letter / minified aliases (M, S, …) can't be resolved to a model.
  if (receiver.length <= 2) return 'unknown';
  const idx = modelBranchIndex();
  const v = idx.get(receiver.toLowerCase());
  return v === undefined ? 'unknown' : v ? 'has' : 'missing';
}

// Signals that the aggregate is ALREADY isolated by a NON-branchFilter
// mechanism the BRANCH_TOKENS regex can't see — caseload scoping (a
// $in over a branch-scoped beneficiary-id list) or entity scoping (a
// $match pinned to a single resolved id). These are LIKELY false positives;
// flagged for verification, not auto-trusted (a $in could be unscoped).
const CASELOAD_SCOPE_RE = /getScoped\w*|beneficiary:\s*\{\s*\$in|beneficiaryIds|cases\.beneficiary/;
const ENTITY_SCOPE_RE =
  /\$match[^]*?(therapist|beneficiary|employee|user|assignedTo|createdBy)\s*:\s*[\w.[\]'"]+\._id|\$match[^]*?:\s*new\s*\(?\s*(require\(['"]mongoose['"]\)\.)?Types\.ObjectId/;
// A $match pinned to a named filter VARIABLE (commonly built by a scoped
// helper like baseQuery(req)/branchFilter — verify, don't auto-trust).
const VAR_MATCH_RE = /\$match:\s*(q|filter|base|scope|dateFilter|matchStage|sessionFilter)\s*[\},]/;

function piiRouteScan() {
  const hits = [];
  for (const file of walkJs(path.join(BACKEND, 'routes'))) {
    if (file.includes(`${path.sep}_archived${path.sep}`)) continue; // skip archived
    const src = fs.readFileSync(file, 'utf8');
    let m;
    const aggRe = /\.aggregate\s*\(/g;
    while ((m = aggRe.exec(src))) {
      const wide = src.slice(Math.max(0, m.index - WIDE), m.index + WIDE);
      if (BRANCH_TOKENS.test(wide)) continue; // scoped via branchFilter family
      if (ADMIN_GATE_RE.test(wide)) continue; // legitimately cross-branch/admin
      const receiver = receiverOf(src, m.index);
      const nearAgg = src.slice(m.index, m.index + WINDOW);
      const isPii = PII_RE.test(receiver) || PII_RE.test(nearAgg);
      if (!isPii) continue;
      // Secondary classification: probable real leak vs likely-already-scoped
      const likelyScoped =
        CASELOAD_SCOPE_RE.test(wide) || ENTITY_SCOPE_RE.test(nearAgg) || VAR_MATCH_RE.test(nearAgg);
      hits.push({
        file: rel(file),
        line: lineOf(src, m.index),
        receiver,
        likelyScoped,
        branch: branchVerdict(receiver),
      });
    }
  }
  return hits;
}

function walkJs(dir) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '__tests__') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkJs(full));
    else if (e.isFile() && e.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const rel = p => path.relative(BACKEND, p).split(path.sep).join('/');
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

const aggCandidates = []; // { file, line }
const rawCollection = []; // { file, line }
let totalAgg = 0;

for (const d of SCAN_DIRS) {
  for (const file of walkJs(path.join(BACKEND, d))) {
    const src = fs.readFileSync(file, 'utf8');

    // .aggregate( call sites
    let m;
    const aggRe = /\.aggregate\s*\(/g;
    while ((m = aggRe.exec(src))) {
      totalAgg++;
      const window = src.slice(m.index, m.index + WINDOW);
      if (!BRANCH_TOKENS.test(window)) {
        aggCandidates.push({ file: rel(file), line: lineOf(src, m.index) });
      }
    }

    // raw driver collection() call sites (bypass ALL Mongoose plugins). Two
    // forms, both real C3a-class leaks:
    //   (a) `…connection.db.collection(`  — the chained form (always a db handle)
    //   (b) `db.collection(` / `conn.collection(` / `database.collection(` — the
    //       local-var form (`const db = mongoose.connection.db; db.collection(…)`).
    //       The C3a leak used (b); the old `/\.db\.collection\(/` regex matched
    //       ONLY (a), so every reports-analytics raw aggregate was invisible to
    //       this high-severity list. Lowercase db-handle var names avoid matching
    //       Mongoose's `Model.collection` property (model receivers are PascalCase).
    const colRe =
      /\.db\.collection\s*\(|\b(?:db|conn|database|mongoConn|nativeDb)\.collection\s*\(/g;
    while ((m = colRe.exec(src))) {
      rawCollection.push({ file: rel(file), line: lineOf(src, m.index) });
    }
  }
}

const byFile = {};
for (const c of aggCandidates) byFile[c.file] = (byFile[c.file] || 0) + 1;
const candidateFiles = Object.keys(byFile).sort((a, b) => byFile[b] - byFile[a]);

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        totalAggregateSites: totalAgg,
        untenantedCandidateSites: aggCandidates.length,
        candidateFileCount: candidateFiles.length,
        rawCollectionSites: rawCollection.length,
        candidates: aggCandidates,
        rawCollection,
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (FILES_OUT) {
  candidateFiles.forEach(f => console.log(`${byFile[f]}\t${f}`));
  process.exit(0);
}

if (PII_ROUTES) {
  const hits = piiRouteScan();
  const notScoped = hits.filter(h => !h.likelyScoped);
  const scoped = hits.filter(h => h.likelyScoped);
  // Split the not-already-scoped hits by whether the MODEL can even be
  // branch-filtered (declares branchId). 'has' → fix now; 'missing' → needs
  // denormalization first; 'unknown' → receiver is an alias, resolve by hand.
  const real = notScoped.filter(h => h.branch === 'has');
  const needsDenorm = notScoped.filter(h => h.branch === 'missing');
  const unknown = notScoped.filter(h => h.branch === 'unknown');
  console.log('');
  console.log('PII aggregate in a wired route, no branchFilter + no admin gate:');
  console.log('═══════════════════════════════════════════════════════════════════');
  if (hits.length === 0) {
    console.log('✅ none.');
  } else {
    console.log(`REAL LEAKS — model HAS branchId, scope these now (${real.length}):`);
    real.forEach(h => console.log(`  ${h.file}:${h.line}  (on \`${h.receiver}\`)`));
    if (needsDenorm.length) {
      console.log('');
      console.log(`NEEDS DENORMALIZATION — model has NO branch field; a branchFilter`);
      console.log(`would scope on a missing field (return nothing). Denormalize branchId`);
      console.log(
        `first (W613-style) OR confirm it's legitimately org/HQ-level (${needsDenorm.length}):`
      );
      needsDenorm.forEach(h => console.log(`  ${h.file}:${h.line}  (on \`${h.receiver}\`)`));
    }
    if (unknown.length) {
      console.log('');
      console.log(`UNRESOLVED RECEIVER — alias/minified (e.g. M, S) or unregistered;`);
      console.log(`resolve the model by hand before deciding (${unknown.length}):`);
      unknown.forEach(h => console.log(`  ${h.file}:${h.line}  (on \`${h.receiver}\`)`));
    }
    if (scoped.length) {
      console.log('');
      console.log(`LIKELY ALREADY-SCOPED (${scoped.length}) — via caseload ($in over a`);
      console.log(`branch-scoped id-list) or entity ($match on a resolved id). VERIFY,`);
      console.log(`do not auto-fix (a $in could itself be unscoped):`);
      scoped.forEach(h => console.log(`  ${h.file}:${h.line}  (on \`${h.receiver}\`)`));
    }
    console.log('');
    console.log(
      `Total ${hits.length}: ${real.length} real (fix now), ${needsDenorm.length} needs-denorm, ` +
        `${unknown.length} unresolved, ${scoped.length} likely-scoped. Still heuristic.`
    );
  }
  console.log('');
  process.exit(0);
}

console.log('');
console.log('Untenanted-aggregation triage (R4 — tenantScope plugin blind spots)');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`Scanned dirs: ${SCAN_DIRS.join(', ')}`);
console.log(`Total .aggregate( sites:        ${totalAgg}`);
console.log(
  `No branch token within ${WINDOW}ch:   ${aggCandidates.length}  (across ${candidateFiles.length} files)`
);
console.log(
  `Raw .db.collection( sites:      ${rawCollection.length}  (HIGHER severity — bypass ALL plugins)`
);
console.log('');
console.log('HEURISTIC — a candidate may be a legitimate admin/cross-branch read,');
console.log('may scope via an earlier variable, or may genuinely leak. Review each.');
console.log('');
console.log('Top candidate files (count\tfile):');
candidateFiles.slice(0, 20).forEach(f => console.log(`  ${byFile[f]}\t${f}`));
if (candidateFiles.length > 20) {
  console.log(`  … +${candidateFiles.length - 20} more (use --files for the full list)`);
}
if (rawCollection.length) {
  console.log('');
  console.log('Raw .db.collection( sites (review first):');
  rawCollection.forEach(c => console.log(`  ${c.file}:${c.line}`));
}
console.log('');
console.log('Next step (when scoped): promote to a W340-style ratchet drift guard —');
console.log('baseline current candidates, fail CI on NEW untenanted aggregates only.');
console.log('');
process.exit(0);

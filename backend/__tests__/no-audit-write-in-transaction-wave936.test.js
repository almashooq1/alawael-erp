/**
 * no-audit-write-in-transaction-wave936.test.js — F5/F7 drift guard
 *
 * WHY (AUTHZ_REMEDIATION_BACKLOG F5/F7): a must-survive security audit
 * (access-denial, blocked attempt, SoD violation, break-glass, access-review
 * tamper) written WITH a Mongo `session` inside a `withTransaction` callback is
 * lost when that txn throws/rolls back — the security signal vanishes exactly
 * when it matters most. A 2026-06-05 investigation (4-agent sweep) confirmed the
 * live Mongo backend does NOT have this bug today: every audit sink writes
 * AUTONOMOUSLY (default connection, no session, fire-and-forget), and the C4
 * branch-denial path's own comment already states it writes outside any txn "so
 * the row survives". BUT that safe state was correct-by-accident, not enforced —
 * nothing stopped a future dev from "making the audit consistent" by threading
 * `{ session }` into an `AuditLog.create(...)` inside a transaction. This guard
 * locks it: any must-survive audit/security-model write that receives a Mongo
 * session option fails CI. Baseline = ZERO (verified).
 *
 * The correct survive-rollback pattern, if a txn-scoped audit is ever truly
 * needed, is the transaction-manager's `onRollback(fn)` hook (fires AFTER abort,
 * write autonomously there) — NOT joining the rolled-back session.
 *
 * Pure source scan (no DB/boot). Detects the dominant vector
 * (`Model.create/insertMany/update*(... { session } ...)`); the
 * `new Audit(..).save({session})` vector is not a current pattern (documented).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set([
  '__tests__',
  'tests',
  'node_modules',
  '_archived',
  '_archive',
  '_backups',
  'coverage',
  '.git',
]);

// Must-survive audit / security-log model identifiers (the canonical sinks).
const AUDIT_MODELS = [
  'AuditLog',
  'SecurityLog',
  'SecurityAudit',
  'SecurityEvent',
  'AccessLog',
  'ComplianceAudit',
  'AuditEvent',
  'AuditTrail',
];
const WRITE_METHODS = [
  'create',
  'insertMany',
  'bulkWrite',
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findByIdAndUpdate',
  'replaceOne',
  'save',
];

const CALL_RE = new RegExp(
  `\\b(${AUDIT_MODELS.join('|')})\\s*\\.\\s*(${WRITE_METHODS.join('|')})\\s*\\(`,
  'g'
);

/** Extract the balanced-paren argument string starting at the '(' index. */
function extractArgs(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return src.slice(openIdx + 1);
}

/**
 * Does an argument span pass a Mongo `session` option? Matches the shorthand
 * idiom `{ session }` / `, session }` / `{ session,` and explicit pass-through
 * `session: <sessionVar>`. Deliberately does NOT match `sessionId` /
 * `sessionTimeout` (no word boundary) nor a payload field `session: req.session`
 * (a stored HTTP session, not the Mongo option).
 */
function passesMongoSession(args) {
  if (/[{,]\s*session\s*[,}]/.test(args)) return true; // { session } shorthand
  if (
    /\bsession\s*:\s*(session|dbSession|txnSession|mongoSession|sess|opts\.session|options\.session|this\.session)\b/.test(
      args
    )
  )
    return true;
  return false;
}

/** Find audit-model writes that join a Mongo session in a source string. */
function findAuditSessionWrites(src) {
  const hits = [];
  CALL_RE.lastIndex = 0;
  let m;
  while ((m = CALL_RE.exec(src))) {
    const openIdx = m.index + m[0].length - 1;
    const args = extractArgs(src, openIdx);
    if (passesMongoSession(args)) {
      hits.push({ model: m[1], method: m[2] });
    }
  }
  return hits;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out);
    } else if (e.isFile() && e.name.endsWith('.js') && !e.name.endsWith('.test.js')) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

describe('F5/F7 — no must-survive audit write joins a Mongo transaction session', () => {
  it('self-test: DETECTS an audit write that passes a session (would re-introduce F5/F7)', () => {
    expect(findAuditSessionWrites('await AuditLog.create([{ a: 1 }], { session });').length).toBe(
      1
    );
    expect(
      findAuditSessionWrites('SecurityLog.insertMany(rows, { ordered: false, session });').length
    ).toBe(1);
    expect(
      findAuditSessionWrites('await AuditLog.findOneAndUpdate(q, u, { session: dbSession });')
        .length
    ).toBe(1);
  });

  it('self-test: IGNORES autonomous audit writes, the sessionId field, and business txn writes', () => {
    // autonomous audit write (the correct pattern)
    expect(
      findAuditSessionWrites('await AuditLog.create({ action, sessionId: req.sessionID });').length
    ).toBe(0);
    expect(
      findAuditSessionWrites('await AuditLog.insertMany(docs, { ordered: false });').length
    ).toBe(0);
    // a payload field literally named session (stored HTTP session) — not the Mongo option
    expect(
      findAuditSessionWrites('AuditLog.create({ action, session: req.session });').length
    ).toBe(0);
    // business model joining a txn (correct ACID — not an audit model)
    expect(
      findAuditSessionWrites('await WalletTransaction.create([tx], { session });').length
    ).toBe(0);
    expect(findAuditSessionWrites('await stock.save({ session });').length).toBe(0);
  });

  it('the live backend has ZERO must-survive audit writes joining a transaction session (baseline)', () => {
    const violations = [];
    for (const file of walk(BACKEND_ROOT)) {
      let src;
      try {
        src = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      for (const hit of findAuditSessionWrites(src)) {
        violations.push(
          `${path.relative(BACKEND_ROOT, file).split(path.sep).join('/')}: ${hit.model}.${hit.method}(... session ...)`
        );
      }
    }
    expect(violations).toEqual([]);
  });
});

module.exports = { findAuditSessionWrites, passesMongoSession };

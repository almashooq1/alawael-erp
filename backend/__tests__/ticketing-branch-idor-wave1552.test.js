/**
 * W1552 — ticketing-system branch isolation + integrity (2026-06-30 hunt).
 *
 * TicketEnhanced has a camelCase `branchId`. The router applies requireBranchAccess
 * (which only rejects an EXPLICIT foreign branchId — it does NOT auto-filter), but:
 *   - GET / and GET /dashboard sourced the branch from the OPTIONAL client query
 *     (dashboard even via a LOCAL var that SHADOWED the imported helper) → a
 *     restricted user omitting ?branchId saw every branch's tickets/metrics;
 *   - every :id handler did a bare findById(req.params.id) → cross-branch read+write.
 * Plus: the status PUT had no reopen precondition and overwrote SLA timestamps on
 * re-calls; and the SLA sweeper created a system comment with userId:null against a
 * `required:true` ref → ValidationError aborted the whole escalation batch.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/ticketing-system.routes.js'), 'utf8');
const MODEL = fs.readFileSync(path.join(__dirname, '../models/TicketEnhanced.js'), 'utf8');

describe('W1552 — list/stats/dashboard scope to the enforced branch', () => {
  test('branchFilter is imported and the list filter spreads it', () => {
    expect(SRC).toMatch(/const \{ requireBranchAccess, branchFilter \} = require/);
    expect(SRC).toMatch(/const filter = \{ deletedAt: null, \.\.\.branchFilter\(req\) \}/);
  });
  test('no handler sources the branch from the optional client query', () => {
    expect(SRC).not.toMatch(/if \(branchId\) filter\.branchId = branchId/);
    expect(SRC).not.toMatch(/const branchFilter = branchId \?/); // the shadowing local
  });
  test('dashboard uses the real helper (scope), not a shadowing local', () => {
    expect(SRC).toMatch(/const scope = branchFilter\(req\)/);
    expect(SRC).toMatch(/\$match: \{ \.\.\.scope,/);
  });
});

describe('W1552 — every :id handler is branch-scoped (no bare findById)', () => {
  test('all ticket-by-id loads go through findOne + branchFilter', () => {
    expect(SRC).not.toMatch(/TicketEnhanced\.findById\(/);
    expect(
      (SRC.match(/TicketEnhanced\.findOne\(\{ _id: req\.params\.id, \.\.\.branchFilter\(req\) \}\)/g) || [])
        .length
    ).toBe(6);
  });
});

describe('W1552 — status state machine + SLA timestamps', () => {
  test('reopen requires a resolved/closed prior state', () => {
    expect(SRC).toMatch(/status === 'reopened' && !\['resolved', 'closed'\]\.includes\(oldStatus\)/);
  });
  test('SLA resolved/closed timestamps are not overwritten on re-call', () => {
    expect(SRC).toMatch(/status === 'resolved' && !ticket\.resolvedAt/);
    expect(SRC).toMatch(/status === 'closed' && !ticket\.closedAt/);
  });
});

describe('W1552 — SLA sweeper system comment + config validation', () => {
  test('TicketComment.userId is required only for human-authored comments', () => {
    expect(MODEL).toMatch(/required: function \(\) \{\s*return !this\.isSystem;\s*\}/);
  });
  test('config PUTs run validators', () => {
    expect((SRC.match(/runValidators: true/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

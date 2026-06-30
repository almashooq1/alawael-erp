/**
 * W1561 — therapy-sessions-admin: conflict-query branch leak + PATCH mass-assign +
 * missing :id guards (2026-06-30 hunt).
 *
 * The :id/list handlers DO scope (assertBeneficiaryInScope + getScopedBeneficiaryIds),
 * but TherapySession.branchId (W647) is the real tenant field and the route ignored it:
 *   P1 — findConflicts() ran an UNSCOPED query and projects `beneficiary` + `title`,
 *        so POST /conflicts (and create/PATCH conflict re-checks) leaked cross-branch
 *        beneficiary IDs + clinical labels to anyone naming a shared room/therapist.
 *   P2 — PATCH /:id stripped only _id/createdBy/statusHistory/beneficiary → a caller
 *        could forge status/branchId/noteStatus/signedBy/isBilled (re-tenant + forge a
 *        finalized signature, skipping statusHistory + the /finalize flow).
 *   P2 — POST /:id/{status,finalize,amend} lacked isValidObjectId → CastError 500.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '../routes/therapy-sessions-admin.routes.js'),
  'utf8'
);

describe('W1561 — conflict detection is branch-scoped', () => {
  test('findConflicts takes a scope and spreads it into the query', () => {
    expect(SRC).toMatch(/async function findConflicts\(\{[^}]*scope = \{\}[^}]*\}\)/s);
    expect(SRC).toMatch(/\.\.\.scope,/); // spread into the conflict query
    expect(SRC).toMatch(/status: \{ \$nin/); // confirms it's the conflict query shape
  });
  test('all three callers pass scope: branchFilter(req)', () => {
    expect((SRC.match(/scope: branchFilter\(req\)/g) || []).length).toBe(3);
  });
});

describe('W1561 — PATCH /:id strips privileged fields', () => {
  test('status/branchId/signing/billing are removed from the update body', () => {
    for (const f of ['status', 'branchId', 'noteStatus', 'signedBy', 'isBilled', 'sourceClinicalSessionId']) {
      expect(SRC).toMatch(new RegExp(`'${f}',`));
    }
  });
});

describe('W1561 — status/finalize/amend validate the :id', () => {
  test('the three action handlers guard isValidObjectId', () => {
    // 5 pre-existing + 3 added = 8
    expect((SRC.match(/mongoose\.isValidObjectId\(req\.params\.id\)/g) || []).length).toBeGreaterThanOrEqual(8);
  });
});

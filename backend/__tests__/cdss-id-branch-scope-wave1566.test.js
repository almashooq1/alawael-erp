/**
 * W1566 — CDSS :id reads/updates/transitions must be branch-scoped (follow-up to #840).
 *
 * #840 fixed the router-wide client-x-branch-id header trust (list/create). But the
 * :id-keyed handlers (GET/PUT/DELETE /rules/:id, /drugs/:id, /risk-assessments/:id,
 * alert acknowledge/override/resolve, rehab-suggestions accept/reject,
 * differential-diagnoses confirm) queried `{ _id, deletedAt:null }` with NO branch
 * filter → a user who knows/guesses an ObjectId could read or mutate another branch's
 * CDSS clinical record. Every such query now spreads branchFilter(req) (server scope:
 * the caller's branch for restricted users, {} for cross-branch roles).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/cdss.routes.js'), 'utf8');

describe('W1566 — every CDSS :id query is branch-scoped', () => {
  test('branchFilter is imported', () => {
    expect(SRC).toMatch(/requireBranchAccess, branchFilter/);
  });
  test('no :id query remains unscoped', () => {
    expect(SRC).not.toMatch(/\{ _id: req\.params\.id, deletedAt: null \}/);
  });
  test('the :id handlers spread branchFilter(req) into the query', () => {
    expect(
      (SRC.match(/\{ _id: req\.params\.id, deletedAt: null, \.\.\.branchFilter\(req\) \}/g) || []).length
    ).toBeGreaterThanOrEqual(12);
    // the multi-line risk-assessments GET too
    expect(SRC).toMatch(/_id: req\.params\.id,\s*deletedAt: null,\s*\.\.\.branchFilter\(req\)/s);
  });
});

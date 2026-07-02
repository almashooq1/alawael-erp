'use strict';
/**
 * W1623 — WRONG-MODEL query drift. parentPortal's "beneficiary sessions" tab queried
 * `models/Session.js` — which is the auth/JWT session model (userId/token/refreshToken) — with
 * `beneficiaryId`/`sessionDate`, fields it doesn't have. So the tab always returned an empty list
 * and a zero count.
 *
 * The codebase canonically queries a beneficiary's clinical sessions via
 * `TherapySession.find({ beneficiary: X, date: … })` (grep of other routes). Switched the portal to
 * TherapySession with the correct `beneficiary` / `date` fields.
 *
 * (beneficiaryPortal.js has the same wrong-model query but ALSO an unresolved
 * `Beneficiary.findOne({ userId })` lookup — Beneficiary has no userId link — and is not in the mount
 * registry; left for a separate decision.)
 */
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'parentPortal.routes.js'), 'utf8');

describe('W1623 parentPortal beneficiary sessions use TherapySession', () => {
  test('queries TherapySession by beneficiary/date, not auth Session by beneficiaryId/sessionDate', () => {
    expect(SRC).toMatch(/TherapySession\.countDocuments\(\{ beneficiary: req\.params\.id \}\)/);
    expect(SRC).toMatch(/TherapySession\.find\(\{ beneficiary: req\.params\.id \}\)/);
    expect(SRC).not.toMatch(/Session\.(find|countDocuments)\(\{ beneficiaryId:/);
    expect(SRC).not.toMatch(/sort\(\{ sessionDate:/);
  });
});

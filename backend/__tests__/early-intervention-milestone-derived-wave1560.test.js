/**
 * W1560 — early-intervention: milestone delay fields are server-derived, not client input.
 *
 * createMilestone/updateMilestone compute delayMonths/isDelayed/delaySeverity from
 * the actual/expected ages. But updateMilestone only recomputed when an age was in
 * the body — so a `PUT /milestones/:id { delaySeverity: 'NONE' }` (no ages) wrote the
 * forged value straight through findByIdAndUpdate, desyncing it from the ages and
 * corrupting getMilestoneReport + the dashboard delayed-milestones count. Both create
 * and update now strip the client-supplied derived fields so they can only be computed.
 *
 * NOTE (DEFERRED, flagged for owner): the early-intervention models
 * (EarlyInterventionChild/DevelopmentalScreening/DevelopmentalMilestone/IFSP/
 * EarlyReferral) are scoped by `organization` (NOT branchId) and req.user carries
 * neither — so there is NO branch isolation on 0-3yr children's PHI, unlike the rest
 * of the clinical platform (which isolates by branch). Closing that needs a schema
 * migration (add branchId to the 5 models + backfill + enforce) — a clinical-data
 * migration that is the owner's call, NOT shipped here.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SVC = fs.readFileSync(
  path.join(__dirname, '../services/earlyIntervention.service.js'),
  'utf8'
);

function fnBody(name) {
  const i = SVC.indexOf(`async ${name}(`);
  return i === -1 ? '' : SVC.slice(i, i + 1300);
}

describe('W1560 — milestone derived delay fields are stripped from client input', () => {
  test('createMilestone strips delayMonths/isDelayed/delaySeverity before computing', () => {
    const b = fnBody('createMilestone');
    expect(b).toMatch(/delete data\.delayMonths/);
    expect(b).toMatch(/delete data\.isDelayed/);
    expect(b).toMatch(/delete data\.delaySeverity/);
  });
  test('updateMilestone strips the derived fields (so a no-age PUT cannot forge them)', () => {
    const b = fnBody('updateMilestone');
    expect(b).toMatch(/delete data\.delayMonths/);
    expect(b).toMatch(/delete data\.isDelayed/);
    expect(b).toMatch(/delete data\.delaySeverity/);
  });
});

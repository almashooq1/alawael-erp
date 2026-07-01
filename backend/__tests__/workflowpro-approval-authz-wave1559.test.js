/**
 * W1559 — workflowPro approval state-machine: approver authorization + dedup +
 * escalation counter + atomic start (2026-06-30 hunt).
 *
 * WorkflowPro models have NO tenant field (global config) — so no cross-branch IDOR.
 * The live bugs were in the approval state machine:
 *   P0 — POST /approval-chains/instances/:id/decide recorded `approver: uid(req)`
 *        with NO check that the caller is the designated approver → ANY authenticated
 *        user could approve/reject any financial/HR/legal chain (full bypass).
 *   P0 — no dedup → one user could decide the same step repeatedly (self-advance).
 *   P1 — /escalations/process $inc'd the CUMULATIVE escalation count onto each rule
 *        (every rule after the first over-credited).
 *   P1 — /approval-chains/:id/start used read-modify-write on stats.timesUsed (race).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/workflowPro.routes.js'), 'utf8');

function decideHandler() {
  const i = SRC.indexOf("/approval-chains/instances/:id/decide'");
  // slice generously to cover the whole handler
  return SRC.slice(i, i + 2600);
}

describe('W1559 — approval decide authorizes the designated approver', () => {
  const h = decideHandler();
  test('resolves the current step and matches caller by approverType', () => {
    expect(h).toMatch(/chain\.steps\[instance\.currentStep\]/);
    expect(h).toMatch(/step\.approverType === 'specific_user'/);
    expect(h).toMatch(/step\.approverType === 'group'/);
    expect(h).toMatch(/step\.approverType === 'role'/);
  });
  test('rejects a non-approver with 403', () => {
    expect(h).toMatch(/return\s+res[\s\S]{0,40}\.status\(403\)/);
  });
  test('manager-type approvers fail CLOSED (not allow-anyone)', () => {
    expect(h).toMatch(/يتطلب هيكلاً تنظيمياً/);
  });
  test('prevents the same approver deciding the same step twice', () => {
    expect(h).toMatch(/alreadyDecided/);
    expect(h).toMatch(/r\.stepOrder === instance\.currentStep && String\(r\.approver\) === callerId/);
  });
});

describe('W1559 — escalation + start counters', () => {
  test('escalation $inc uses a per-rule counter (not the cumulative total)', () => {
    expect(SRC).toMatch(/let ruleEscalated = 0/);
    expect(SRC).toMatch(/\$inc: \{ 'stats\.totalTriggered': ruleEscalated \}/);
    expect(SRC).not.toMatch(/\$inc: \{ 'stats\.totalTriggered': escalated \}/);
  });
  test('start increments stats.timesUsed atomically via $inc', () => {
    expect(SRC).toMatch(/\$inc: \{ 'stats\.timesUsed': 1 \}/);
    expect(SRC).not.toMatch(/chain\.stats\.timesUsed = \(chain\.stats\.timesUsed/);
  });
});

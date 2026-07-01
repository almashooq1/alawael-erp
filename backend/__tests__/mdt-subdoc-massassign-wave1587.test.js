/**
 * W1587 — MDT nested-subdoc mass-assignment on generic case/goal edits.
 *
 * Bug (deferred in #742): the plan/meeting-level PUTs were hardened with
 * safeUpdateBody (strips MDT_PRIVILEGED), but the nested-subdoc handlers still
 * used `Object.assign(subdoc, stripUpdateMeta(req.body))`. stripUpdateMeta is a
 * prototype-pollution blacklist, NOT a field whitelist — so:
 *   • PUT /plans/:id/goals/:goalId let a caller forge goal.progress /
 *     status / achievedDate / progressNotes, bypassing the dedicated
 *     PATCH …/progress endpoint (0–100 validation + auto-ACHIEVED + audit note).
 *   • PATCH /meetings/:id/cases/:caseId let a caller forge case.decisions,
 *     bypassing POST …/cases/:caseId/decisions.
 *
 * Fix: strip those dedicated-endpoint-owned fields from the generic subdoc
 * edits via stripSubdocUpdate(body, PRIVILEGED).
 *
 * Static guard.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'mdt-coordination.routes.js'),
  'utf8'
);

describe('W1587 MDT subdoc mass-assign hardening', () => {
  test('privileged field lists cover the dedicated-endpoint-owned fields', () => {
    const goalM = SRC.match(/const GOAL_PRIVILEGED\s*=\s*\[([\s\S]*?)\]/);
    expect(goalM).toBeTruthy();
    for (const f of ['progress', 'status', 'achievedDate', 'progressNotes']) {
      expect(goalM[1]).toContain(`'${f}'`);
    }
    const caseM = SRC.match(/const CASE_PRIVILEGED\s*=\s*\[([\s\S]*?)\]/);
    expect(caseM).toBeTruthy();
    expect(caseM[1]).toContain("'decisions'");
  });

  test('a strip helper deletes the privileged keys after stripUpdateMeta', () => {
    expect(SRC).toMatch(/const stripSubdocUpdate = \(body, privileged\) =>/);
    expect(SRC).toMatch(/for \(const k of privileged\) delete out\[k\]/);
  });

  test('the case PATCH and goal PUT no longer pass raw stripUpdateMeta to Object.assign', () => {
    // both nested Object.assign calls route through the privileged-aware helper
    expect(SRC).toMatch(
      /Object\.assign\(caseItem, stripSubdocUpdate\(req\.body, CASE_PRIVILEGED\)\)/
    );
    expect(SRC).toMatch(/Object\.assign\(goal, stripSubdocUpdate\(req\.body, GOAL_PRIVILEGED\)\)/);
    // no nested Object.assign is left with the weaker blacklist-only stripUpdateMeta
    expect(SRC).not.toMatch(/Object\.assign\((?:caseItem|goal), stripUpdateMeta\(req\.body\)\)/);
  });

  test('the dedicated progress + decisions endpoints still exist (the safe path)', () => {
    expect(SRC).toContain("'/plans/:id/goals/:goalId/progress'");
    expect(SRC).toContain("'/meetings/:id/cases/:caseId/decisions'");
  });
});

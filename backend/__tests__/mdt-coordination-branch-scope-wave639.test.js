'use strict';

/**
 * mdt-coordination-branch-scope-wave639.test.js
 * ════════════════════════════════════════════════════════════════════
 * R4 full route-sweep guard. After the 3 mdt-coordination models gained
 * branchId (UnifiedRehabPlan W629 + ReferralTicket W633 + MDTMeeting W635),
 * W639 swept EVERY remaining stats/list/dashboard handler in
 * mdt-coordination.routes.js to branch-scope its model queries (meetings +
 * referrals lists, team-workload, department, overdue, overview, decisions,
 * action-items, comprehensive + per-beneficiary timeline).
 *
 * This guard locks the sweep: every aggregate() on the 3 branch-bearing
 * models must carry a branch-scoped $match, so a future edit can't silently
 * reintroduce a cross-branch leak. (ID-generation countDocuments() with no
 * filter are excluded — they count totals for sequential numbering, not stats.)
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'mdt-coordination.routes.js'),
  'utf8'
);

const MODELS = ['MDTMeeting', 'ReferralTicket', 'UnifiedRehabPlan'];
const SCOPED = /(scope|branchFilter\s*\(\s*req\s*\))/;

function aggregateBodies(src, model) {
  const re = new RegExp(`${model}\\.aggregate\\s*\\(\\s*\\[`, 'g');
  const bodies = [];
  let m;
  while ((m = re.exec(src))) {
    const end = src.indexOf('])', m.index);
    bodies.push(src.slice(m.index, end === -1 ? m.index + 700 : end));
  }
  return bodies;
}

describe('W639 — every mdt-coordination aggregate on a branch-bearing model is scoped', () => {
  it('imports branchFilter', () => {
    expect(SRC).toMatch(/branchFilter/);
  });

  for (const model of MODELS) {
    it(`every ${model}.aggregate pipeline has a branch-scoped $match`, () => {
      const bodies = aggregateBodies(SRC, model);
      // Accept direct (scope/branchFilter) or via the scoped `dateFilter` var
      // (meetings-stats builds `dateFilter = { ...branchFilter(req), ...date }`).
      const unscoped = bodies
        .map((b, i) => ({ i, ok: /\$match[^]*?(scope|branchFilter|dateFilter)/.test(b) }))
        .filter(x => !x.ok)
        .map(x => x.i);
      expect(unscoped).toEqual([]);
    });
  }

  it('both list handlers compose branchFilter into their filter', () => {
    // meetings list + referrals list each build `const filter = { ...branchFilter(req) }`
    const filters = SRC.match(/const filter = \{\s*\.\.\.branchFilter\(req\)/g) || [];
    expect(filters.length).toBeGreaterThanOrEqual(2);
  });

  it('no bare unscoped countDocuments({ status: ... }) on a branch-bearing model remains', () => {
    // a status-only countDocuments with no scope/branchFilter on the same line is a leak
    const re = /(MDTMeeting|ReferralTicket|UnifiedRehabPlan)\.countDocuments\(\{\s*status:/g;
    const leaks = [];
    let m;
    while ((m = re.exec(SRC))) {
      const line = SRC.slice(m.index, SRC.indexOf('\n', m.index));
      if (!SCOPED.test(line)) leaks.push(line.trim());
    }
    expect(leaks).toEqual([]);
  });
});

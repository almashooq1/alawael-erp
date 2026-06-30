/**
 * Self-test for scripts/check-mass-assignment-spread.js (the req.body
 * mass-assignment drift guard) + the live ratchet assertion.
 */

'use strict';

const path = require('path');
const guard = require('../scripts/check-mass-assignment-spread');

describe('check-mass-assignment-spread — pure helpers', () => {
  it('counts ...req.body spreads', () => {
    expect(guard.countFile('const x = { ...req.body, a: 1 };')).toBe(1);
    expect(guard.countFile('new Model({ ...req.body }); Model.create({ ...req.body });')).toBe(2);
  });

  it('counts Object.assign(x, req.body)', () => {
    expect(guard.countFile('Object.assign(doc, req.body); Object.assign( apt , req.body )')).toBe(2);
  });

  it('does NOT count benign req.body reads or destructuring', () => {
    expect(guard.countFile('const { name } = req.body; const v = req.body.name;')).toBe(0);
    expect(guard.countFile('res.json(req.body); validate(req.body);')).toBe(0);
  });
});

describe('check-mass-assignment-spread — live ratchet', () => {
  it('no NEW mass-assignment spread vs the committed baseline (ratchet stays in sync)', () => {
    const baseline = guard.loadBaseline();
    const current = guard.scan();
    const added = [];
    for (const [file, n] of Object.entries(current)) {
      if (n > (baseline[file] || 0)) added.push(`${file}: ${baseline[file] || 0} → ${n}`);
    }
    // A NEW or increased spread must be whitelisted, not added; if this fails,
    // replace the `...req.body` with an explicit creatable/updatable field list.
    expect(added).toEqual([]);
  });

  it('no STALE baseline entry (a fixed file must be ratcheted down)', () => {
    const baseline = guard.loadBaseline();
    const current = guard.scan();
    const stale = [];
    for (const [file, b] of Object.entries(baseline)) {
      const n = current[file] || 0;
      if (n < b) stale.push(`${file}: ${b} → ${n}`);
    }
    // run: node scripts/check-mass-assignment-spread.js --fix-baseline
    expect(stale).toEqual([]);
  });

  it('baseline file exists and is non-trivial', () => {
    const baseline = guard.loadBaseline();
    expect(Object.keys(baseline).length).toBeGreaterThan(50);
    expect(path.basename(guard.BASELINE_FILE)).toBe('check-mass-assignment-spread.baseline.json');
  });
});

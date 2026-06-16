'use strict';

/**
 * W1286 — guard for the launch-readiness checker.
 *
 * The checker runs LIVE read-only against a DB (verified on prod by hand);
 * this guard is STATIC, locking its safety + semantics so a future edit can't
 * turn it destructive or make INFO items block launch.
 *
 *  1. READ-ONLY — only countDocuments; never any write/mutate op.
 *  2. CHECKLIST COVERAGE — maps the runbook's "Definition of launched" items
 *     (forms/measures/branches/users/beneficiary/session-split/mail/demo).
 *  3. SEMANTICS — INFO never blocks; verdict GO iff zero NOT-YET; owner-gated
 *     items (SMTP, demo-data) are INFO not NOT-YET (refuse to fail someone
 *     else's decision); every NOT-YET carries a fix command.
 *  4. WIRED — npm run launch:readiness exists; points to the active smokes.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(BACKEND, 'scripts', 'launch-readiness.js'), 'utf8');
const PKG = JSON.parse(fs.readFileSync(path.join(BACKEND, 'package.json'), 'utf8'));

describe('W1286 launch-readiness — read-only safety', () => {
  test('NEVER mutates: no write/destructive mongo ops', () => {
    expect(SRC).not.toMatch(/\.(insertOne|insertMany|create|updateOne|updateMany|deleteOne|deleteMany|drop|save)\(/);
  });

  test('reads via countDocuments only', () => {
    expect(SRC).toMatch(/countDocuments\(/);
    expect(SRC).toMatch(/function countSafe/);
  });

  // W1287 — collection names must match the REAL mongoose collection of each
  // model, or a check silently false-negatives (prod had 105 ICF codes the
  // checker reported as 0; ClinicalSession is collection:'clinical_sessions').
  test('queries the correct (model-true) collection names', () => {
    expect(SRC).toContain("countSafe('icfcodereferences')"); // ICFCodeReference → default plural
    expect(SRC).toContain("countSafe('clinical_sessions')"); // explicit collection in the schema
    expect(SRC).not.toMatch(/countSafe\('icfcodes'\)/); // the W1286 false-negative name
    expect(SRC).not.toMatch(/countSafe\('clinicalsessions'\)/); // wrong default plural
  });
});

describe('W1286 launch-readiness — checklist coverage', () => {
  const required = [
    'forms catalog seeded',
    'measures library seeded',
    'goal bank seeded',
    'branch exists',
    'user exists',
    'beneficiary registered',
    'session write/read split',
    'mail transport configured',
    'demo-data fate',
  ];
  test.each(required)('covers checklist item: %s', (item) => {
    expect(SRC).toContain(item);
  });
});

describe('W1286 launch-readiness — verdict semantics', () => {
  test('GO iff zero NOT-YET; exit 0 on GO else 1', () => {
    expect(SRC).toMatch(/const go = blocking\.length === 0/);
    expect(SRC).toMatch(/blocking = checks\.filter\(\(c\) => c\.status === 'NOT-YET'\)/);
    expect(SRC).toMatch(/process\.exit\(go \? 0 : 1\)/);
  });

  test('owner-gated items use INFO with their fix hint (mail + demo-data)', () => {
    // mail: the no-creds detail must sit inside an INFO( call
    expect(SRC).toMatch(/INFO\(\s*\n?\s*'mail transport configured'/);
    // demo-data: the present-demo branch must be INFO (not NOTYET)
    expect(SRC).toMatch(/if \(demo > 0\) \{[\s\S]{0,200}INFO\(/);
    // and demo INFO must NOT be a NOTYET anywhere
    expect(SRC).not.toMatch(/NOTYET\(\s*\n?\s*'demo-data/);
    expect(SRC).not.toMatch(/NOTYET\(\s*\n?\s*'mail transport/);
  });

  test('NOT-YET items carry npm/provision fix commands', () => {
    // every NOTYET fix string in the file references a runnable action
    const fixHints = SRC.match(/'(npm run [^']+|provision[^']+|register[^']+|verify the[^']+)'/g) || [];
    expect(fixHints.length).toBeGreaterThanOrEqual(5);
  });
});

describe('W1286 launch-readiness — wiring', () => {
  test('npm run launch:readiness + :json exist', () => {
    expect(PKG.scripts['launch:readiness']).toBe('node scripts/launch-readiness.js');
    expect(PKG.scripts['launch:readiness:json']).toBe('node scripts/launch-readiness.js --json');
  });

  test('points operators to the active smokes', () => {
    expect(SRC).toMatch(/smoke:launch-spine/);
    expect(SRC).toMatch(/smoke:clinical-spine/);
  });
});

'use strict';

/**
 * W1464 — access-review attestation requires server-side MFA tier.
 *
 * The MFA step-up for privileged-access attestations was enforced CLIENT-SIDE ONLY
 * (web-admin opens MfaChallengeDialog before createAttestation). The backend
 * POST /attestations route had only requirePerm — a direct API caller could record an
 * attestation into the hash-chained access-review ledger with NO MFA. access-review.service
 * does not enforce MFA either. Every reviewType maps to tier 2 or 3 in the web-admin
 * (REVIEW_TYPE_TO_MFA_TIER), so a server-side tier-2 floor is satisfied by every
 * legitimate request and closes the bypass. No legacy/mobile caller exists.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'access-review.routes.js'),
  'utf8'
);

describe('W1464 access-review attestation MFA gate', () => {
  test('imports attachMfaActor + requireMfaTier', () => {
    expect(src).toMatch(
      /\{\s*attachMfaActor,\s*requireMfaTier\s*\}\s*=\s*require\(['"]\.\.\/middleware\/requireMfaTier['"]\)/
    );
  });

  test('POST /attestations carries attachMfaActor + requireMfaTier(2)', () => {
    expect(src).toMatch(
      /router\.post\(\s*'\/attestations',[\s\S]{0,200}attachMfaActor[\s\S]{0,200}requireMfaTier\(2\)/
    );
  });

  test('attachMfaActor precedes requireMfaTier (actor populated before the tier check)', () => {
    const m = src.match(/router\.post\(\s*'\/attestations',([\s\S]{0,300})/);
    expect(m).toBeTruthy();
    const block = m[1];
    expect(block.indexOf('attachMfaActor')).toBeLessThan(block.indexOf('requireMfaTier(2)'));
  });
});

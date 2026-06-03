'use strict';

/**
 * W819 — supply chain staging verify script + closure index drift guard.
 */

const fs = require('fs');
const path = require('path');

const CLOSURE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'docs', 'architecture', 'SUPPLY_CHAIN_OPS_CLOSURE_2026-06.md'),
  'utf8'
);
const SCRIPT = fs.readFileSync(
  path.join(__dirname, '..', 'scripts', 'verify-supply-chain-staging.js'),
  'utf8'
);
const PKG = fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8');

describe('W819 — supply chain staging verification', () => {
  it('verify script hits platform-stats and maintenance-hub snapshot', () => {
    expect(SCRIPT).toMatch(/\/api\/v1\/purchasing\/platform-stats/);
    expect(SCRIPT).toMatch(/\/api\/v1\/ops\/maintenance-hub\/snapshot/);
    expect(SCRIPT).toMatch(/legacyPurchasing/);
    expect(SCRIPT).toMatch(/facilityAssets/);
    expect(SCRIPT).toMatch(/SUPPLY_CHAIN_API_URL/);
  });

  it('package.json exposes verify:supply-chain-staging npm script', () => {
    expect(PKG).toMatch(/verify:supply-chain-staging/);
    expect(PKG).toMatch(/verify-supply-chain-staging\.js/);
  });

  it('closure index documents W818 engineering complete and W819 staging script', () => {
    expect(CLOSURE).toMatch(/verify:supply-chain-staging/);
    expect(CLOSURE).toMatch(/verify:supply-chain-staging/);
    expect(CLOSURE).toMatch(/purchasing-adr-signoff-email-wave818/);
    expect(CLOSURE).toMatch(/supply-chain-staging-verify-wave819/);
  });
});

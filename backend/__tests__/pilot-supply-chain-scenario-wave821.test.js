'use strict';

/**
 * W821 — Pilot Scenario 7 + Arabic sign-off email reference W819 staging verify.
 */

const fs = require('fs');
const path = require('path');

const SCENARIO = fs.readFileSync(
  path.join(__dirname, '..', '..', 'docs', 'pilot', 'SCENARIO_7_SUPPLY_CHAIN_MAINTENANCE_OPS.md'),
  'utf8'
);
const EMAIL = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'architecture',
    'decisions',
    '039-SIGNOFF-EMAIL-AR.md'
  ),
  'utf8'
);
const CLOSURE = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'architecture',
    'SUPPLY_CHAIN_OPS_CLOSURE_2026-06.md'
  ),
  'utf8'
);

describe('W821 — pilot + sign-off email staging verify', () => {
  it('Scenario 7 pre-test includes W819 npm verify command', () => {
    expect(SCENARIO).toMatch(/verify:supply-chain-staging/);
    expect(SCENARIO).toMatch(/SUPPLY_CHAIN_API_URL/);
    expect(SCENARIO).toMatch(/SUPPLY_CHAIN_OPS_CLOSURE_2026-06/);
  });

  it('Arabic sign-off email documents W819 verify and W820 wave range', () => {
    expect(EMAIL).toMatch(/verify:supply-chain-staging/);
    expect(EMAIL).toMatch(/W780–W820/);
  });

  it('closure index lists W821 pilot drift guard', () => {
    expect(CLOSURE).toMatch(/pilot-supply-chain-scenario-wave821/);
  });
});

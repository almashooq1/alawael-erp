'use strict';

/**
 * W820 — ADR-039 sign-off packet + cutover docs wire W819 staging verify script.
 */

const fs = require('fs');
const path = require('path');

const PACKET = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'architecture',
    'decisions',
    '039-SIGNOFF-PACKET.md'
  ),
  'utf8'
);
const PURCH_CUTOVER = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'architecture',
    'PRODUCTION_CUTOVER_W780_W792_PURCHASING.md'
  ),
  'utf8'
);
const GAPS = fs.readFileSync(
  path.join(__dirname, '..', '..', 'docs', 'PRODUCTION_GAPS_BEFORE_LIVE.md'),
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

describe('W820 — sign-off staging wire (W819 script)', () => {
  it('sign-off packet documents one-command staging verify', () => {
    expect(PACKET).toMatch(/verify:supply-chain-staging/);
    expect(PACKET).toMatch(/SUPPLY_CHAIN_API_URL/);
    expect(PACKET).toMatch(/W819/);
    expect(PACKET).toMatch(/SUPPLY_CHAIN_OPS_CLOSURE_2026-06/);
  });

  it('purchasing cutover §4 links W819 smoke command', () => {
    expect(PURCH_CUTOVER).toMatch(/verify:supply-chain-staging/);
    expect(PURCH_CUTOVER).toMatch(/SUPPLY_CHAIN_OPS_CLOSURE_2026-06/);
  });

  it('PRODUCTION_GAPS and closure index reference staging verify', () => {
    expect(GAPS).toMatch(/verify:supply-chain-staging/);
    expect(GAPS).toMatch(/039-SIGNOFF-EMAIL-AR/);
    expect(CLOSURE).toMatch(/through \*\*W820\*\*/);
  });
});

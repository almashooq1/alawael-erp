'use strict';

/**
 * W822 — supply chain engineering freeze drift guard (post W821 doc sync).
 */

const fs = require('fs');
const path = require('path');

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
const ADR = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'architecture',
    'decisions',
    '039-purchase-order-triple-backend.md'
  ),
  'utf8'
);
const PILOT = fs.readFileSync(
  path.join(__dirname, '..', '..', 'docs', 'PILOT_CYCLE_1.md'),
  'utf8'
);

describe('W822 — supply chain engineering freeze', () => {
  it('closure index declares freeze through W821 and blocks tier URL-only unification', () => {
    expect(CLOSURE).toMatch(/through \*\*W821\*\*/);
    expect(CLOSURE).toMatch(/Engineering freeze \(W822\)/);
    expect(CLOSURE).toMatch(/migration charter/);
    expect(CLOSURE).toMatch(/supply-chain-engineering-freeze-wave822/);
  });

  it('ADR-039 and sign-off packet link closure index with W822 freeze', () => {
    expect(ADR).toMatch(/SUPPLY_CHAIN_OPS_CLOSURE_2026-06/);
    expect(ADR).toMatch(/verify:supply-chain-staging/);
    expect(PACKET).toMatch(/W817–W822/);
    expect(PACKET).toMatch(/engineering freeze/i);
  });

  it('PILOT_CYCLE_1 optional scenario references W819 staging verify', () => {
    expect(PILOT).toMatch(/verify:supply-chain-staging/);
    expect(PILOT).toMatch(/SUPPLY_CHAIN_OPS_CLOSURE_2026-06/);
  });
});

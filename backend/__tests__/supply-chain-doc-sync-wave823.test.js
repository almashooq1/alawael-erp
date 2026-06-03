'use strict';

/**
 * W823 — MODULES + cutover footers sync to W822 engineering freeze (doc-only).
 */

const fs = require('fs');
const path = require('path');

const MODULES = fs.readFileSync(
  path.join(__dirname, '..', '..', 'docs', 'MODULES.md'),
  'utf8'
);
const PURCH = fs.readFileSync(
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
const MAINT = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'architecture',
    'PRODUCTION_CUTOVER_W801_W810_MAINTENANCE.md'
  ),
  'utf8'
);
const GAPS = fs.readFileSync(
  path.join(__dirname, '..', '..', 'docs', 'PRODUCTION_GAPS_BEFORE_LIVE.md'),
  'utf8'
);

describe('W823 — supply chain doc sync (W822 freeze)', () => {
  it('MODULES.md closure blurb references W822 freeze and staging verify', () => {
    expect(MODULES).toMatch(/SUPPLY_CHAIN_OPS_CLOSURE_2026-06/);
    expect(MODULES).toMatch(/W822/);
    expect(MODULES).toMatch(/engineering freeze/i);
    expect(MODULES).toMatch(/verify:supply-chain-staging/);
    expect(MODULES).not.toMatch(/W780–W816/);
  });

  it('cutover docs footer links closure W780–W822', () => {
    expect(PURCH).toMatch(/W780–W822/);
    expect(MAINT).toMatch(/W780–W822/);
    expect(PURCH).not.toMatch(/closure index \(W780–W816\)/);
  });

  it('PRODUCTION_GAPS references W822 freeze', () => {
    expect(GAPS).toMatch(/W822 freeze/);
    expect(GAPS).toMatch(/SUPPLY_CHAIN_OPS_CLOSURE_2026-06/);
  });
});

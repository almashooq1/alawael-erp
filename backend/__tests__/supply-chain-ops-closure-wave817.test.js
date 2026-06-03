'use strict';

/**
 * W817 — supply chain + facility ops closure index drift guard.
 */

const fs = require('fs');
const path = require('path');

const CLOSURE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'docs', 'architecture', 'SUPPLY_CHAIN_OPS_CLOSURE_2026-06.md'),
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
const MAINT_CUTOVER = fs.readFileSync(
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

describe('W817 — supply chain ops closure index', () => {
  it('closure index links cutover docs, ADR sign-off, and pilot scenario 7', () => {
    expect(CLOSURE).toMatch(/Closure Index \(2026-06\)/);
    expect(CLOSURE).toMatch(/PRODUCTION_CUTOVER_W780_W792_PURCHASING/);
    expect(CLOSURE).toMatch(/PRODUCTION_CUTOVER_W801_W810_MAINTENANCE/);
    expect(CLOSURE).toMatch(/039-SIGNOFF-PACKET/);
    expect(CLOSURE).toMatch(/SCENARIO_7_SUPPLY_CHAIN_MAINTENANCE_OPS/);
    expect(CLOSURE).toMatch(/purchasing-tier-consumer-wave814/);
    expect(CLOSURE).toMatch(/stub-audit-ratchet-wave813/);
  });

  it('cutover docs link back to closure index', () => {
    expect(PURCH_CUTOVER).toMatch(/SUPPLY_CHAIN_OPS_CLOSURE_2026-06/);
    expect(MAINT_CUTOVER).toMatch(/SUPPLY_CHAIN_OPS_CLOSURE_2026-06/);
  });
});

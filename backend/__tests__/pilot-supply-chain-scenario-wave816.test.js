'use strict';

/**
 * W816 — pilot Scenario 7 links supply-chain + maintenance cutover docs.
 */

const fs = require('fs');
const path = require('path');

const SCENARIO = fs.readFileSync(
  path.join(__dirname, '..', '..', 'docs', 'pilot', 'SCENARIO_7_SUPPLY_CHAIN_MAINTENANCE_OPS.md'),
  'utf8'
);
const PILOT = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'PILOT_CYCLE_1.md'), 'utf8');
const README = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'pilot', 'README.md'), 'utf8');

describe('W816 — pilot supply-chain + maintenance scenario', () => {
  it('scenario 7 doc references cutover docs and ADR-039 sign-off', () => {
    expect(SCENARIO).toMatch(/Scenario 7 \(Optional\)/);
    expect(SCENARIO).toMatch(/PRODUCTION_CUTOVER_W780_W792_PURCHASING/);
    expect(SCENARIO).toMatch(/PRODUCTION_CUTOVER_W801_W810_MAINTENANCE/);
    expect(SCENARIO).toMatch(/039-SIGNOFF-PACKET/);
    expect(SCENARIO).toMatch(/platform-stats/);
    expect(SCENARIO).toMatch(/maintenance-hub\/snapshot/);
  });

  it('PILOT_CYCLE_1 and pilot README enumerate optional scenario 7', () => {
    expect(PILOT).toMatch(/SCENARIO_7_SUPPLY_CHAIN_MAINTENANCE_OPS/);
    expect(README).toMatch(/SCENARIO_7_SUPPLY_CHAIN_MAINTENANCE_OPS/);
    expect(README).toMatch(/optional/i);
  });
});

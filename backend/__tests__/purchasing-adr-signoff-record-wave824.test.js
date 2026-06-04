'use strict';

/**
 * W824 — ADR-039 post-meeting sign-off record template (doc-only, under W822 freeze).
 */

const fs = require('fs');
const path = require('path');

const RECORD = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'architecture',
    'decisions',
    '039-SIGNOFF-RECORD.md'
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

describe('W824 — ADR-039 sign-off record template', () => {
  it('record template captures three roles and Accepted status line', () => {
    expect(RECORD).toMatch(/Approach B/);
    expect(RECORD).toMatch(/Supply chain/i);
    expect(RECORD).toMatch(/Web-admin/i);
    expect(RECORD).toMatch(/Platform/i);
    expect(RECORD).toMatch(/Accepted \(Approach B\)/);
    expect(RECORD).toMatch(/verify:supply-chain-staging/);
  });

  it('sign-off packet and closure index link record template', () => {
    expect(PACKET).toMatch(/039-SIGNOFF-RECORD/);
    expect(CLOSURE).toMatch(/039-SIGNOFF-RECORD/);
  });
});

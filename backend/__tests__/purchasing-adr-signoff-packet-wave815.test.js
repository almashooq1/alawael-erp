'use strict';

/**
 * W815 — ADR-039 sign-off packet drift guard (stakeholder artifact).
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
const GAPS = fs.readFileSync(
  path.join(__dirname, '..', '..', 'docs', 'PRODUCTION_GAPS_BEFORE_LIVE.md'),
  'utf8'
);

describe('W815 — ADR-039 sign-off packet', () => {
  it('packet recommends Approach B and lists three sign-off roles', () => {
    expect(PACKET).toMatch(/Approach B/);
    expect(PACKET).toMatch(/Supply chain/i);
    expect(PACKET).toMatch(/Web-admin/i);
    expect(PACKET).toMatch(/Platform/i);
    expect(PACKET).toMatch(/039-purchase-order-triple-backend/);
  });

  it('packet includes staging verification for platform-stats and maintenance hub', () => {
    expect(PACKET).toMatch(/platform-stats/);
    expect(PACKET).toMatch(/maintenance-hub\/snapshot/);
    expect(PACKET).toMatch(/W814/);
  });

  it('ADR guardrails reference drift guards W797 and W814', () => {
    expect(ADR).toMatch(/purchasing-po-adr-wave797/);
    expect(ADR).toMatch(/purchasing-tier-consumer-wave814/);
  });

  it('PRODUCTION_GAPS links ADR-039 for stakeholder follow-up', () => {
    expect(GAPS).toMatch(/039-purchase-order-triple-backend/);
    expect(GAPS).toMatch(/039-SIGNOFF-PACKET/);
  });
});

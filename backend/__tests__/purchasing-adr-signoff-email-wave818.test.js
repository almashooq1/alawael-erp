'use strict';

/**
 * W818 — ADR-039 Arabic sign-off email template drift guard.
 */

const fs = require('fs');
const path = require('path');

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

describe('W818 — ADR-039 sign-off email (AR)', () => {
  it('email template references Approach B and three tiers', () => {
    expect(EMAIL).toMatch(/النهج B/);
    expect(EMAIL).toMatch(/inventory\/purchase-orders/);
    expect(EMAIL).toMatch(/\/api\/v1\/purchasing/);
    expect(EMAIL).toMatch(/12 شهر/);
  });

  it('sign-off packet links Arabic email template', () => {
    expect(PACKET).toMatch(/039-SIGNOFF-EMAIL-AR/);
  });

  it('closure index links sign-off email', () => {
    expect(CLOSURE).toMatch(/039-SIGNOFF-EMAIL-AR/);
  });
});

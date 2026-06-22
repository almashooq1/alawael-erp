'use strict';

/**
 * W1450 — Beneficiary PII field projection guard.
 *
 * `passwordResetToken` / `passwordResetExpires` lacked `select: false` (the sibling
 * BeneficiaryPortal model marks them `select: false`), so they would be returned by
 * default query/response projections. No flow currently writes them on Beneficiary,
 * so this was latent — but it closes the inconsistency before any future reset flow
 * starts populating them (defense-in-depth, PDPL).
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'models', 'Beneficiary.js'), 'utf8');

describe('W1450 Beneficiary sensitive fields are select:false', () => {
  test.each([
    'passwordResetToken',
    'passwordResetExpires',
    'twoFactorSecret',
    'accountVerificationCode',
  ])('%s declares select:false', field => {
    const re = new RegExp(field + '\\s*:\\s*\\{[^}]*select:\\s*false');
    expect(src).toMatch(re);
  });
});

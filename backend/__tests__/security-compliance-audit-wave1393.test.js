/**
 * security-compliance-audit-wave1393.test.js
 *
 * Read-only contract guard for the security-compliance audit notes.
 * Keeps the remaining security-gap narrative anchored to the actual
 * controls already present in code and CI: DAST, vault, gitleaks,
 * and the evidence-vault implementation.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const AUDIT_DOC = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'wiki',
  'SECURITY_COMPLIANCE_AUDIT_AND_VALIDATION.md'
);
const GITLEAKS_TOML = path.join(__dirname, '..', '..', '.gitleaks.toml');
const QUALITY_BOOTSTRAP = path.join(
  __dirname,
  '..',
  '..',
  'backend',
  'startup',
  'qualityComplianceBootstrap.js'
);

describe('Security compliance audit contract (W1393)', () => {
  it('keeps DAST and vault controls documented in the audit note', () => {
    expect(fs.existsSync(AUDIT_DOC)).toBe(true);
    const md = fs.readFileSync(AUDIT_DOC, 'utf8');

    for (const anchor of [
      'DAST (Dynamic Application Security Testing)',
      'OWASP ZAP',
      'Secret management (vault)',
      'Security monitoring (24/7)',
      'Vulnerability scanning (automated daily)',
    ]) {
      expect(md).toContain(anchor);
    }
  });

  it('keeps the gitleaks allowlist focused on templates and fixtures', () => {
    expect(fs.existsSync(GITLEAKS_TOML)).toBe(true);
    const toml = fs.readFileSync(GITLEAKS_TOML, 'utf8');

    for (const anchor of [
      '.*\\.env\\.example$',
      '.*/__tests__/.*',
      '.*/tests/.*',
      '_archived/.*',
    ]) {
      expect(toml).toContain(anchor);
    }
  });

  it('keeps the quality compliance bootstrap wired to the evidence vault service', () => {
    expect(fs.existsSync(QUALITY_BOOTSTRAP)).toBe(true);
    const js = fs.readFileSync(QUALITY_BOOTSTRAP, 'utf8');

    expect(js).toContain('createEvidenceVaultService');
    expect(js).toContain('evidenceVault');
    expect(js).toContain("require('../services/quality/evidenceVault.service')");
  });
});

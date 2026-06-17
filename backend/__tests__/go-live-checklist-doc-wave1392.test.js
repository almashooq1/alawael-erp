/**
 * go-live-checklist-doc-wave1392.test.js
 *
 * Low-risk docs contract guard for the operator-facing go-live checklist
 * and the DR verification runbook.
 *
 * Why this exists:
 *   The production handoff doc is the place operators actually read, so we
 *   lock the cross-links to the real artifacts (backup keygen, DR drill,
 *   a11y manual audit) to prevent documentation drift from hiding the
 *   supported workflow.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CHECKLIST = path.join(__dirname, '..', '..', 'docs', 'blueprint', '23-go-live-checklist.md');
const DR_RUNBOOK = path.join(__dirname, '..', '..', 'docs', 'blueprint', '19-dr-verification.md');

describe('Go-live checklist and DR docs contract (W1392)', () => {
  it('go-live checklist keeps the backup/DR operational references intact', () => {
    expect(fs.existsSync(CHECKLIST)).toBe(true);
    const md = fs.readFileSync(CHECKLIST, 'utf8');

    for (const anchor of [
      'node backend/scripts/dr-verify.js',
      'BACKUP_ENCRYPTION_KEY=<64 hex chars>',
      'backup-keygen.js',
      'OPS_ALERT_EMAIL',
      'OPS_ALERT_PHONE',
      'dr-verify.yml',
    ]) {
      expect(md).toContain(anchor);
    }
  });

  it('go-live checklist keeps the accessibility manual-audit reminder intact', () => {
    const md = fs.readFileSync(CHECKLIST, 'utf8');

    expect(md).toContain('Cypress a11y audit can be run manually against staging');
    expect(md).toContain('cy.checkA11y');
    expect(md).toContain('20-accessibility.md');
  });

  it('DR runbook stays wired to the real restore-drill artifacts', () => {
    expect(fs.existsSync(DR_RUNBOOK)).toBe(true);
    const md = fs.readFileSync(DR_RUNBOOK, 'utf8');

    for (const anchor of [
      '--dry-run',
      '--json',
      'dr-report-<run-id>',
      'backup-crypto.js',
      'backup-keygen.js',
      'AES-256-GCM',
    ]) {
      expect(md).toContain(anchor);
    }
  });
});

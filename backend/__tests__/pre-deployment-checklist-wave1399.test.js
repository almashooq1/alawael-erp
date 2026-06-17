'use strict';

/**
 * W1399 — Pre-Deployment Checklist runbook documentation guard.
 *
 * Enforces that the pre-deployment checklist runbook stays synchronized with
 * the actual deployment scripts, environment validation, and quality gates.
 * Prevents the checklist from going stale or documenting non-existent checks.
 */

const fs = require('fs');
const path = require('path');

const PRE_DEPLOYMENT_CHECKLIST = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'runbooks',
  'pre-deployment-checklist.md'
);
const ENV_CHECK_SCRIPT = path.join(__dirname, '..', '..', 'backend', 'scripts', 'check-env.js');
const ROUTES_LOAD_SCRIPT = path.join(
  __dirname,
  '..',
  '..',
  'backend',
  'scripts',
  'check-routes-load.js'
);
const SPRINT_PATHS_SCRIPT = path.join(
  __dirname,
  '..',
  '..',
  'backend',
  'scripts',
  'sync-sprint-tests-paths.js'
);
const PACKAGE_JSON = path.join(__dirname, '..', '..', 'backend', 'package.json');
const SECURITY_MD = path.join(__dirname, '..', '..', 'SECURITY.md');
const THREAT_MODEL_MD = path.join(__dirname, '..', '..', 'docs', 'security', 'THREAT_MODEL.md');

describe('W1399 — Pre-Deployment Checklist runbook documentation', () => {
  it('documents pre-deployment phases and key sections', () => {
    expect(fs.existsSync(PRE_DEPLOYMENT_CHECKLIST)).toBe(true);
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Must have all four phases
    expect(checklist).toContain('Phase 1: Environment & Configuration');
    expect(checklist).toContain('Phase 2: Code & Tests Quality');
    expect(checklist).toContain('Phase 3: DAST & Security Scanning');
    expect(checklist).toContain('Phase 4: Deployment-Specific Checks');

    // Must have quick checklist at the top
    expect(checklist).toContain('Quick Checklist');
    expect(checklist).toContain('Quick Checklist');
  });

  it('documents the 5 required environment variables (strict mode)', () => {
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Each strict key must be documented
    expect(checklist).toContain('MONGODB_URI');
    expect(checklist).toContain('JWT_SECRET');
    expect(checklist).toContain('JWT_REFRESH_SECRET');
    expect(checklist).toContain('ENCRYPTION_KEY');
    expect(checklist).toContain('SESSION_SECRET');

    // Must reference env:check command
    expect(checklist).toMatch(/npm run env:check/);

    // Must reference env-preflight-check.md runbook
    expect(checklist).toContain('env-preflight-check.md');
  });

  it('documents all npm run commands in Phase 2 (quality gates)', () => {
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Phase 2 must document each check command
    expect(checklist).toMatch(/npm run env:check/);
    expect(checklist).toMatch(/npm run check:routes-load/);
    expect(checklist).toMatch(/npm run check:sprint-paths/);
    expect(checklist).toMatch(/npm run quality:push/);
  });

  it('verifies that npm run commands actually exist in package.json', () => {
    expect(fs.existsSync(PACKAGE_JSON)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));

    // All documented commands must exist
    expect(pkg.scripts).toHaveProperty('env:check');
    expect(pkg.scripts).toHaveProperty('check:routes-load');
    expect(pkg.scripts).toHaveProperty('check:sprint-paths');
    expect(pkg.scripts).toHaveProperty('quality:push');
  });

  it('documents Phase 2.3 test suite breakdown (guards, domains, auth)', () => {
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Must document test guard suites
    expect(checklist).toMatch(/maintenance-mocks/i);
    expect(checklist).toMatch(/model-collisions/i);
    expect(checklist).toMatch(/sprint-paths/i);

    // Must document domain tests (66 suites, 798 tests)
    expect(checklist).toMatch(/66 suites/i);
    expect(checklist).toMatch(/798 tests?/i);

    // Must document auth tests (phase 2, 7 tests)
    expect(checklist).toMatch(/auth.*7/i);
  });

  it('documents Phase 3 (DAST & Security Scanning)', () => {
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Must explain DAST_TARGET_URL
    expect(checklist).toContain('DAST_TARGET_URL');

    // Must reference SECURITY.md
    expect(checklist).toContain('SECURITY.md');

    // Must mention gitleaks
    expect(checklist).toContain('gitleaks');
  });

  it('documents Phase 4 (Deployment-Specific Checks)', () => {
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Must have production-specific checks
    expect(checklist).toMatch(/production.*deployment/i);
    expect(checklist).toMatch(/database backup/i);
    expect(checklist).toMatch(/rollback plan/i);

    // Must have staging-specific checks
    expect(checklist).toMatch(/staging.*deployment/i);

    // Must have general deployment checks
    expect(checklist).toMatch(/feature flags|gradual rollout/i);
  });

  it('documents failure scenarios and recovery', () => {
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Must have a troubleshooting / recovery section
    expect(checklist).toMatch(/Failure Scenarios|failure|recovery|troubleshoot/i);

    // Must document recovery for each major check
    expect(checklist).toMatch(/env:check.*fail/i);
    expect(checklist).toMatch(/quality:push.*fail/i);
    expect(checklist).toMatch(/route.*fail/i);
  });

  it('links to related runbooks and documentation', () => {
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Must reference sister runbooks
    expect(checklist).toContain('[env-preflight-check.md](env-preflight-check.md)');
    expect(checklist).toContain('[SECURITY.md](../../SECURITY.md');
    expect(checklist).toContain('[THREAT_MODEL.md](../../security/THREAT_MODEL.md)');

    // Must reference go-live and DR runbooks
    expect(checklist).toMatch(/go-live|23-go-live-checklist/i);
    expect(checklist).toMatch(/dr|disaster.recovery|19-dr-verification/i);
  });

  it('explains what happens if strict env keys are missing', () => {
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Must explain consequences of missing keys
    expect(checklist).toMatch(/exit code|exit 1|crash|boot/i);
    expect(checklist).toMatch(/do not deploy/i);
  });

  it('verifies DAST_TARGET_URL handling (default-deny production)', () => {
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Must mention default-deny for production
    expect(checklist).toMatch(/default.deny|production.*override|allow_production/i);

    // Must warn against blind baseline scan on production
    expect(checklist).toMatch(/exfiltration|risk|never run.*production/i);
  });

  it('references the guard test itself', () => {
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Must mention that the checklist is guarded (drift prevention)
    expect(checklist).toContain('wave1399');
    expect(checklist).toContain('guard');
  });

  it('maintains the quick checklist at the top', () => {
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Quick checklist must be early in the document
    const quickIdx = checklist.indexOf('Quick Checklist');
    const phase1Idx = checklist.indexOf('Phase 1:');
    expect(quickIdx).toBeGreaterThan(0);
    expect(quickIdx).toBeLessThan(phase1Idx);

    // Quick checklist must include all 6 key steps
    const quickSection = checklist.substring(quickIdx, phase1Idx);
    expect(quickSection).toContain('npm run env:check');
    expect(quickSection).toContain('npm run check:routes-load');
    expect(quickSection).toContain('npm run check:sprint-paths');
    expect(quickSection).toContain('npm run quality:push');
    expect(quickSection).toContain('DAST');
    expect(quickSection).toMatch(/production|notify|backup/i);
  });

  it('uses consistent formatting (bash code blocks, tables, checkboxes)', () => {
    const checklist = fs.readFileSync(PRE_DEPLOYMENT_CHECKLIST, 'utf8');

    // Must use bash code blocks for commands
    expect(checklist).toMatch(/```bash[\s\S]+npm run/);

    // Must use tables for environment variables
    expect(checklist).toMatch(/\| Key \|/);

    // Must use checkboxes for production/staging steps (with or without dash)
    expect(checklist).toMatch(/\-?\s*\[\s?\]\s.*\-?\s*\[\s?x?\]/s);
  });
});

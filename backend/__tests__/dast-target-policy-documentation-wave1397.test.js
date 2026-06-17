'use strict';

/**
 * W1397 — DAST target policy documentation drift guard.
 *
 * Enforces that SECURITY.md documents the DAST target URL policy and
 * keeps it synchronized with the actual .github/workflows/dast.yml behavior.
 * Prevents security-critical runbook documentation from drifting out of sync
 * with CI/CD implementation.
 */

const fs = require('fs');
const path = require('path');

const SECURITY_MD = path.join(__dirname, '..', '..', 'SECURITY.md');
const DAST_WORKFLOW = path.join(__dirname, '..', '..', '.github', 'workflows', 'dast.yml');

describe('W1397 — DAST target policy documentation (operational runbook)', () => {
  it('documents DAST scan schedule and target-URL policy in SECURITY.md', () => {
    expect(fs.existsSync(SECURITY_MD)).toBe(true);
    const securityDoc = fs.readFileSync(SECURITY_MD, 'utf8');

    // Must have a dedicated DAST section
    expect(securityDoc).toContain('## Dynamic security scanning (DAST)');

    // Must document schedule
    expect(securityDoc).toContain('.github/workflows/dast.yml');
    expect(securityDoc).toContain('Weekly');
    expect(securityDoc).toMatch(/03:17 UTC/);

    // Must document target policy
    expect(securityDoc).toContain('Target URL policy');
    expect(securityDoc).toContain('allow_production');
    expect(securityDoc).toContain('staging only');
  });

  it('documents the override mechanism for production scans', () => {
    const securityDoc = fs.readFileSync(SECURITY_MD, 'utf8');

    // Must explain the production-target block
    expect(securityDoc).toContain('production-like targets');
    expect(securityDoc).toContain('REJECTED');
    expect(securityDoc).toContain('allow_production=true');

    // Must clarify this requires explicit human approval
    expect(securityDoc).toMatch(/human|explicit|opt.?in/i);
  });

  it('provides setup instructions for storing DAST target URL', () => {
    const securityDoc = fs.readFileSync(SECURITY_MD, 'utf8');

    // Must guide users to store the URL
    expect(securityDoc).toContain('DAST_TARGET_URL');
    expect(securityDoc).toContain('repository variable');
    expect(securityDoc).toMatch(/Settings.*Secrets/);

    // Must explain the staging URL requirement
    expect(securityDoc).toContain('publicly reachable');
  });

  it('keeps the runbook in sync with workflow implementation', () => {
    const yml = fs.readFileSync(DAST_WORKFLOW, 'utf8');
    const securityDoc = fs.readFileSync(SECURITY_MD, 'utf8');

    // Workflow has allow_production input → doc must mention it
    if (yml.includes('allow_production:')) {
      expect(securityDoc).toContain('allow_production');
    }

    // Workflow has a production-target guard → doc must explain the rejection
    if (yml.includes('Refusing production-like DAST target')) {
      expect(securityDoc).toContain('REJECTED');
    }

    // Workflow runs on schedule → doc must mention the cron
    if (yml.includes('schedule:')) {
      expect(securityDoc).toMatch(/schedule|cron|weekly/i);
    }
  });

  it('documents artifact retention and reporting', () => {
    const securityDoc = fs.readFileSync(SECURITY_MD, 'utf8');

    // Must mention where reports go
    expect(securityDoc).toContain('artifact');
    expect(securityDoc).toContain('30');
  });
});

/**
 * dast-workflow-wave1394.test.js
 *
 * Read-only workflow contract guard for `.github/workflows/dast.yml`.
 * Locks the minimal dynamic-security posture so future edits do not
 * silently remove DAST from CI.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const WORKFLOW = path.join(__dirname, '..', '..', '.github', 'workflows', 'dast.yml');

describe('DAST workflow contract (W1394)', () => {
  it('exists and keeps both manual and weekly triggers', () => {
    expect(fs.existsSync(WORKFLOW)).toBe(true);
    const yml = fs.readFileSync(WORKFLOW, 'utf8');

    expect(yml).toMatch(/workflow_dispatch:/);
    expect(yml).toMatch(/target_url:/);
    expect(yml).toMatch(/scan_name:/);
    expect(yml).toMatch(/schedule:/);
    expect(yml).toMatch(/cron:\s*'17 3 \* \* 1'/);
  });

  it('resolves target URL from input or repo configuration and fails fast if missing', () => {
    const yml = fs.readFileSync(WORKFLOW, 'utf8');

    expect(yml).toContain(
      'github.event.inputs.target_url || vars.DAST_TARGET_URL || secrets.DAST_TARGET_URL'
    );
    expect(yml).toMatch(/DAST target URL is not configured/);
    expect(yml).toMatch(/exit 1/);
  });

  it('runs OWASP ZAP baseline via official container and uploads report artifact', () => {
    const yml = fs.readFileSync(WORKFLOW, 'utf8');

    expect(yml).toContain('ghcr.io/zaproxy/zaproxy:stable');
    expect(yml).toContain('zap-baseline.py');
    expect(yml).toContain('-t "$TARGET_URL"');
    expect(yml).toContain('actions/upload-artifact@v4');
    expect(yml).toMatch(/name:\s*dast-report-\$\{\{ github\.run_id \}\}/);
    expect(yml).toMatch(/retention-days:\s*30/);
    expect(yml).toMatch(/if-no-files-found:\s*warn/);
  });
});

/**
 * dr-verify-workflow-wave1391.test.js
 *
 * Low-risk regression guard for `.github/workflows/dr-verify.yml`.
 *
 * Why this exists:
 *   The DR drill is a production-safety workflow, so accidental edits to the
 *   cron cadence, dry-run input, or JSON invocation would weaken the alarm
 *   path without touching any app code. This test locks the workflow contract
 *   itself while staying fully read-only.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const WORKFLOW = path.join(__dirname, '..', '..', '.github', 'workflows', 'dr-verify.yml');

describe('DR drill workflow contract (W1391)', () => {
  it('exists and keeps the daily 04:00 UTC schedule plus manual dry_run input', () => {
    expect(fs.existsSync(WORKFLOW)).toBe(true);
    const yml = fs.readFileSync(WORKFLOW, 'utf8');

    expect(yml).toMatch(/cron:\s*"0 4 \* \* \*"/);
    expect(yml).toMatch(/workflow_dispatch:/);
    expect(yml).toMatch(/dry_run:/);
    expect(yml).toMatch(/تخطّي الاستعادة الفعلية/);
  });

  it('runs dr-verify in JSON mode and forwards the dry-run flag when requested', () => {
    const yml = fs.readFileSync(WORKFLOW, 'utf8');

    expect(yml).toMatch(/node scripts\/dr-verify\.js --json \$DRY_RUN_FLAG/);
    expect(yml).toMatch(/DRY_RUN_FLAG="--dry-run"/);
    expect(yml).toMatch(/if \[ "\$\{\{ github\.event\.inputs\.dry_run \}\}" = "true" \]; then/);
  });

  it('preserves the human-readable step summary and upload artifact safety net', () => {
    const yml = fs.readFileSync(WORKFLOW, 'utf8');

    expect(yml).toMatch(/GITHUB_STEP_SUMMARY/);
    expect(yml).toMatch(/actions\/upload-artifact@v7/);
    expect(yml).toMatch(/name:\s*dr-report-\$\{\{ github\.run_id \}\}/);
    expect(yml).toMatch(/retention-days:\s*30/);
    expect(yml).toMatch(/if-no-files-found:\s*ignore/);
  });

  it('checks required VPS secrets before attempting SSH', () => {
    const yml = fs.readFileSync(WORKFLOW, 'utf8');

    for (const secret of ['VPS_HOST', 'VPS_USER', 'VPS_SSH_KEY']) {
      expect(yml).toContain(secret);
    }
    expect(yml).toMatch(/ssh-keyscan -H "\$\{\{ secrets\.VPS_HOST \}\}"/);
    expect(yml).toMatch(/ssh -i ~\/\.ssh\/deploy_key/);
  });
});

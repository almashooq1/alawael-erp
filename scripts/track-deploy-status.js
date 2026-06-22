#!/usr/bin/env node
'use strict';

/**
 * W1437 Deployment Status Tracker
 *
 * Generates docs/W1437_DEPLOY_STATUS.md with current repository state.
 * Run this after any significant change to keep the status page current.
 *
 * Usage:
 *   node scripts/track-deploy-status.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'docs', 'W1437_DEPLOY_STATUS.md');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    return `ERROR: ${err.message}`;
  }
}

function fileExists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function check(command) {
  try {
    execSync(command, { cwd: ROOT, stdio: 'ignore' });
    return '✅';
  } catch (err) {
    return '❌';
  }
}

const commit = run('git rev-parse --short HEAD');
const branch = run('git rev-parse --abbrev-ref HEAD');
const date = new Date().toISOString();
const dirty = run('git status --porcelain') ? '❌ dirty' : '✅ clean';

const artifacts = [
  ['Migration script', 'backend/scripts/migrate-nphies-claim-updatedAt.js'],
  ['Local migration test', 'backend/scripts/test-migration-local.js'],
  ['VPS deploy executor', 'scripts/deploy-w1437.sh'],
  ['VPS deploy integration', 'scripts/deploy-vps.sh'],
  ['Canary deploy', 'scripts/deploy-canary-w1437.sh'],
  ['Docker deploy', 'scripts/deploy-w1437-docker.sh'],
  ['Docker monitor', 'scripts/monitor-w1437-docker.sh'],
  ['Rollback script', 'scripts/rollback-w1437.sh'],
  ['Smoke tests', 'scripts/smoke-test-w1437.sh'],
  ['VPS monitor', 'scripts/monitor-w1437.sh'],
  ['Final review', 'scripts/final-review-w1437.sh'],
  ['Loki alerts', 'ops/loki-rules-w1437.yml'],
  ['GitHub migration workflow', '.github/workflows/w1437-migrate.yml'],
  ['GitHub monitor workflow', '.github/workflows/w1437-monitor.yml'],
  ['GitHub final-review workflow', '.github/workflows/w1437-final-review.yml'],
  ['Runbook PDF', 'docs/RUNBOOK_W1437.pdf'],
  ['Runbook Markdown', 'docs/RUNBOOK_W1437.md'],
  ['Wiki page', 'docs/WIKI_W1437.md'],
  ['Cheat sheet', 'docs/W1437_DEPLOY_CHEAT_SHEET.md'],
  ['Deployment notes', 'docs/DEPLOYMENT_NOTES_W1437.md'],
];

const checks = [
  ['Shell syntax', 'bash -n scripts/deploy-w1437.sh scripts/monitor-w1437.sh scripts/rollback-w1437.sh scripts/smoke-test-w1437.sh scripts/deploy-vps.sh scripts/final-review-w1437.sh scripts/deploy-canary-w1437.sh'],
  ['Migration script syntax', 'node -c backend/scripts/migrate-nphies-claim-updatedAt.js'],
  ['Local migration test syntax', 'node -c backend/scripts/test-migration-local.js'],
];

let table = '| Artifact | Path | Status |\n|----------|------|--------|\n';
for (const [name, file] of artifacts) {
  const status = fileExists(file) ? '✅ present' : '❌ missing';
  table += `| ${name} | \`${file}\` | ${status} |\n`;
}

let checkTable = '| Check | Command | Status |\n|-------|---------|--------|\n';
for (const [name, command] of checks) {
  checkTable += `| ${name} | \`${command}\` | ${check(command)} |\n`;
}

const content = `# W1437 Deployment Status

> Auto-generated status page. Run \`node scripts/track-deploy-status.js\` to update.

## Current State

| Metric | Value |
|--------|-------|
| Branch | \`${branch}\` |
| Commit | \`${commit}\` |
| Generated at | ${date} |
| Working tree | ${dirty} |
| Release | W1437 (feat/w1406-preflight-followup) |
| Hotfix | W1444 |

## Artifacts

${table}

## Validation Checks

${checkTable}

## Deployment Readiness

Run locally:

\`\`\`bash
./scripts/final-review-w1437.sh
\`\`\`

If all checks pass, the repository is ready for production deployment.

## Next Steps

1. Run final review locally: \`./scripts/final-review-w1437.sh\`
2. Execute deployment method from \`docs/W1437_DEPLOY_CHEAT_SHEET.md\`
3. Run smoke tests and monitor
4. Sign off in \`docs/RUNBOOK_W1437.md\`

## History

| Date | Commit | Event |
|------|--------|-------|
| ${date} | ${commit} | Status page generated |
`;

fs.writeFileSync(OUTPUT, content, 'utf8');
console.log(`Generated: ${OUTPUT}`);

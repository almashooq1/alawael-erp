/**
 * project-stats-doc-drift-wave1351.test.js
 *
 * CI-wiring half of GAPS Item 5 (W1351). W1349 built the stats-block engine
 * (render/extract/apply/check + stats:write/stats:check). This wave embeds a
 * PROJECT-STATS block in docs/PROJECT_STATS.md and gates it via the
 * `.github/workflows/stats-drift.yml` workflow.
 *
 * This guard checks the STRUCTURE of the wiring (markers present, workflow
 * runs the check, block carries the expected metric rows). It deliberately
 * does NOT assert exact live counts: this is a dual-session repo where the
 * parallel session adds test/source files continuously, so an exact-count
 * jest assertion would flap. The exact-count enforcement lives in the
 * `stats-drift.yml` CI gate, which only runs on push/PR to main/develop
 * (not feature branches) — a low-frequency point where one `stats:write`
 * refresh is reasonable.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const {
  extractStatsBlock,
  STATS_MARKER_START,
  STATS_MARKER_END,
} = require('../scripts/project-stats');

const DOC = path.join(__dirname, '..', '..', 'docs', 'PROJECT_STATS.md');
const WORKFLOW = path.join(__dirname, '..', '..', '.github', 'workflows', 'stats-drift.yml');

describe('PROJECT_STATS doc — markers + workflow wiring (W1351)', () => {
  it('docs/PROJECT_STATS.md exists and carries both PROJECT-STATS markers', () => {
    expect(fs.existsSync(DOC)).toBe(true);
    const md = fs.readFileSync(DOC, 'utf8');
    expect(md).toContain(STATS_MARKER_START);
    expect(md).toContain(STATS_MARKER_END);
    // a non-empty block sits between the markers
    const block = extractStatsBlock(md);
    expect(block).not.toBeNull();
    // padding-tolerant: markdown formatters re-align table columns
    expect(block).toMatch(/\|\s*Metric\s*\|\s*Count\s*\|/);
  });

  it('the embedded block carries the expected drift-meaningful metric rows', () => {
    const md = fs.readFileSync(DOC, 'utf8');
    const block = extractStatsBlock(md) || '';
    for (const label of [
      'JavaScript files',
      'Models',
      'Routes',
      'Services',
      'Tests (unit/integration)',
      'Dependencies (prod)',
    ]) {
      expect(block).toContain(label);
    }
    // never embeds the volatile line-count or a timestamp (would flap)
    expect(block).not.toMatch(/jsLines|generatedAt|Total Lines/);
  });

  it('the stats-drift CI workflow exists and runs the check against the doc', () => {
    expect(fs.existsSync(WORKFLOW)).toBe(true);
    const yml = fs.readFileSync(WORKFLOW, 'utf8');
    expect(yml).toMatch(/project-stats\.js --check .*PROJECT_STATS\.md/);
    // dependency-free run (no npm install step needed)
    expect(yml).toMatch(/working-directory:\s*backend/);
    // gate runs on push/PR to main/develop, not on feature branches
    expect(yml).toMatch(/branches:\s*\[main, develop\]/);
  });
});

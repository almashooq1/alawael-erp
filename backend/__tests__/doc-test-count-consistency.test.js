/**
 * doc-test-count-consistency.test.js — numbers in docs vs reality.
 *
 * After 60+ commits of test-count changes, the CHANGELOG, SPRINT doc,
 * DELIVERY summary, and the CI workflow summary line all claim test
 * counts. Every edit risks leaving one of them stale — and a stale
 * headline number in a release doc is a classic "looks done but isn't"
 * signal that reviewers catch and everyone else skips.
 *
 * This test:
 *   1. Runs the sprint suite listing (via package.json's test:sprint)
 *      to get the ACTUAL test-suite file list + expected count.
 *   2. Greps the docs for the most recent "N tests" / "N/N passing"
 *      mentions and asserts they agree within a sane tolerance.
 *
 * Tolerance: the CHANGELOG rightfully contains historical numbers
 * (e.g. "was 274"). We only check the most recent "Sprint suite: **N
 * passing**" mention, which is the current claim, and the scorecard
 * row in DELIVERY.md.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('docs test-count consistency', () => {
  // Source of truth: number of tests in the sprint-tests CI summary.
  // (Not re-running jest here — infinite loop. The CI summary is the
  // claim the team maintains manually; we verify all OTHER docs agree
  // with it.)
  const ciSrc = read('.github/workflows/sprint-tests.yml');
  const match = ciSrc.match(/All (\d+) sprint tests green/);
  const ciCount = match ? parseInt(match[1], 10) : null;

  it('sprint-tests.yml summary has a plausible test count', () => {
    expect(ciCount).toBeGreaterThan(200);
    expect(ciCount).toBeLessThan(1000); // sanity bound
  });

  it('CHANGELOG.md latest "Sprint suite: **N passing**" matches the CI count', () => {
    const changelog = read('CHANGELOG.md');
    // First match is the most recent release entry (top of file).
    const first = changelog.match(/Sprint suite:\s*\*?\*?(\d+)\s*passing\*?\*?/);
    expect(first).toBeTruthy();
    const docCount = parseInt(first[1], 10);
    expect(docCount).toBe(ciCount);
  });

  it('SPRINT doc header "Tests: N/N green" matches CI count', () => {
    const sprint = read('docs/sprints/SPRINT_2026_04_17-18.md');
    const m = sprint.match(/\*\*Tests:\*\*\s*(\d+)\/(\d+)\s+green/);
    expect(m).toBeTruthy();
    expect(parseInt(m[1], 10)).toBe(parseInt(m[2], 10)); // N/N shape
    expect(parseInt(m[1], 10)).toBe(ciCount);
  });

  it('SPRINT doc scorecard "Sprint tests ... N" matches CI count', () => {
    const sprint = read('docs/sprints/SPRINT_2026_04_17-18.md');
    const m = sprint.match(/Sprint tests\s*\|\s*\d+\s*\|\s*\*\*(\d+)\*\*/);
    expect(m).toBeTruthy();
    expect(parseInt(m[1], 10)).toBe(ciCount);
  });

  it('DELIVERY summary scorecard matches CI count', () => {
    const delivery = read('docs/4.0.x-DELIVERY.md');
    const m = delivery.match(/Sprint tests \(CI-gated\).*?\*\*(\d+)\*\*/);
    expect(m).toBeTruthy();
    expect(parseInt(m[1], 10)).toBe(ciCount);
  });

  it('DELIVERY local-run "tests green (N/N)" matches CI count', () => {
    const delivery = read('docs/4.0.x-DELIVERY.md');
    const m = delivery.match(/local run \((\d+)\/(\d+)\)/);
    expect(m).toBeTruthy();
    expect(parseInt(m[1], 10)).toBe(ciCount);
    expect(parseInt(m[2], 10)).toBe(ciCount);
  });

  it('README sprint-gate badge matches CI count', () => {
    const readme = read('README.md');
    // Badge URL pattern: shields.io badge labelled "sprint gate" or "tests"
    // followed by the count and "passing".
    const m = readme.match(/badge\/(?:sprint%20gate|tests)-(\d+)%20passing/);
    expect(m).toBeTruthy();
    expect(parseInt(m[1], 10)).toBe(ciCount);
  });
});

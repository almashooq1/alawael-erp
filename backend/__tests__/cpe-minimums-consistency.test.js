/**
 * cpe-minimums-consistency.test.js — lock the SCFHS CPE minimums across
 * every file that references them.
 *
 * The numbers live in five places:
 *   1. backend/services/cpeService.js    — source of truth (envInt defaults)
 *   2. backend/__tests__/cpe-service.test.js — math assertions
 *   3. frontend/src/pages/Admin/AdminCpeCredits.jsx — subtitle + header
 *   4. docs/HR_COMPLIANCE_GUIDE.md       — opening-table summary
 *   5. docs/runbooks/cpe-attention.md    — plain-Arabic explanation
 *
 * If SCFHS publishes a policy change (e.g., new total), exactly one of
 * these files gets updated and the others silently drift — this is
 * exactly the "looks done but isn't" class of stale-number bug that
 * doc-test-count-consistency was built to catch. Same idea, smaller
 * surface: assert every file *mentions* the current numbers so an
 * updater who forgets a touchpoint fails CI with a clear error.
 *
 * Reads the canonical values from cpeService's MIN_PER_CYCLE so a
 * legitimate rules change only needs to touch one side — the test
 * then verifies the other four moved with it.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Capture canonical defaults without env interference.
const oldEnv = {
  CAT1: process.env.SCFHS_CPE_MIN_CAT1,
  CAT2: process.env.SCFHS_CPE_MIN_CAT2,
  CAT3: process.env.SCFHS_CPE_MIN_CAT3,
  TOTAL: process.env.SCFHS_CPE_MIN_TOTAL,
};
delete process.env.SCFHS_CPE_MIN_CAT1;
delete process.env.SCFHS_CPE_MIN_CAT2;
delete process.env.SCFHS_CPE_MIN_CAT3;
delete process.env.SCFHS_CPE_MIN_TOTAL;

const cpe = require('../services/cpeService');
const MIN = cpe.MIN_PER_CYCLE;
const CAT1 = MIN['1'];
const CAT2 = MIN['2'];
const CAT3 = MIN['3'];
const TOTAL = MIN.total;

// Restore env so other tests aren't affected.
afterAll(() => {
  if (oldEnv.CAT1 != null) process.env.SCFHS_CPE_MIN_CAT1 = oldEnv.CAT1;
  if (oldEnv.CAT2 != null) process.env.SCFHS_CPE_MIN_CAT2 = oldEnv.CAT2;
  if (oldEnv.CAT3 != null) process.env.SCFHS_CPE_MIN_CAT3 = oldEnv.CAT3;
  if (oldEnv.TOTAL != null) process.env.SCFHS_CPE_MIN_TOTAL = oldEnv.TOTAL;
});

const repoRoot = path.join(__dirname, '..', '..');
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

describe('SCFHS CPE minimums are consistent across all touchpoints', () => {
  it('sanity: canonical values are the expected SCFHS policy (50/30/20 + 100)', () => {
    expect(CAT1).toBe(50);
    expect(CAT2).toBe(30);
    expect(CAT3).toBe(20);
    expect(TOTAL).toBe(100);
    // Per-category mins should always sum to the total — SCFHS rule.
    expect(CAT1 + CAT2 + CAT3).toBe(TOTAL);
  });

  it('cpe-service unit tests reference the canonical minimums', () => {
    const src = read('backend/__tests__/cpe-service.test.js');
    expect(src).toMatch(new RegExp(`\\b${CAT1}\\b`));
    expect(src).toMatch(new RegExp(`\\b${CAT2}\\b`));
    expect(src).toMatch(new RegExp(`\\b${CAT3}\\b`));
    expect(src).toMatch(new RegExp(`\\b${TOTAL}\\b`));
  });

  it('admin UI subtitle spells out the current category split', () => {
    const src = read('frontend/src/pages/Admin/AdminCpeCredits.jsx');
    // Arabic subtitle contains "100 ساعة كل 5 سنوات (50 فئة 1 + 30 فئة 2 + 20 فئة 3)"
    expect(src).toContain(`${TOTAL} ساعة`);
    expect(src).toContain(`${CAT1} فئة 1`);
    expect(src).toContain(`${CAT2} فئة 2`);
    expect(src).toContain(`${CAT3} فئة 3`);
  });

  it('HR_COMPLIANCE_GUIDE opening table shows the current cycle total', () => {
    const src = read('docs/HR_COMPLIANCE_GUIDE.md');
    expect(src).toContain(`${TOTAL} hrs / 5-year cycle`);
  });

  it('cpe-attention runbook explains the current category split in Arabic', () => {
    const src = read('docs/runbooks/cpe-attention.md');
    expect(src).toContain(`${TOTAL} ساعة`);
    expect(src).toContain(`${CAT1}/${CAT2}/${CAT3}`);
  });
});

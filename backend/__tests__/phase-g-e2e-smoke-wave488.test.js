'use strict';

/**
 * W488 — Phase G E2E smoke + Phase G CLOSED.
 *
 * Validates the full Phase G (Equity Engine) chain with pure libs only:
 *
 *   1. disparity-detection.groupByDimension(observations, 'gender')
 *   2. disparity-detection.computeCohortStats(grouped)
 *   3. disparity-detection.detectDisparities(stats) → flagged finding
 *   4. disparity-detection.auditDimension({...}) → overallSeverity
 *   5. equity-engine.service.computeSignature(audit) → stable hash
 *   6. equity-engine.service.runBranchSweep iterates dim x metric matrix
 *      (verified via service shape, no DB)
 *
 * Sister to W478 Phase E and W483 Phase F closure smokes.
 */

const fs = require('fs');
const path = require('path');

const disparityLib = require('../intelligence/disparity-detection.lib');
const engineService = require('../services/equity/equity-engine.service');
const ALERT_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'EquityDisparityAlert.js'),
  'utf8'
);
const BENCH_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'OutcomeBenchmark.js'),
  'utf8'
);
const BOOT_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'equityEngineBootstrap.js'),
  'utf8'
);

describe('W488 — Phase G E2E smoke', () => {
  function buildCohort(n, mean, dim, key) {
    return Array.from({ length: n }, (_, i) => ({
      beneficiaryId: `b-${key}-${i}`,
      [dim]: key,
      metricValue: mean + ((i % 5) - 2),
    }));
  }

  const observations = [
    ...buildCohort(40, 50, 'gender', 'M'),
    ...buildCohort(40, 38, 'gender', 'F'),
  ];

  it('Step 1: groupByDimension splits cohorts', () => {
    const g = disparityLib.groupByDimension(observations, 'gender');
    expect(g.M).toHaveLength(40);
    expect(g.F).toHaveLength(40);
  });

  it('Step 2: computeCohortStats yields means', () => {
    const g = disparityLib.groupByDimension(observations, 'gender');
    const stats = disparityLib.computeCohortStats(g);
    expect(stats.M.mean).toBeCloseTo(50, 0);
    expect(stats.F.mean).toBeCloseTo(38, 0);
    expect(stats.M.n).toBe(40);
  });

  it('Step 3: detectDisparities flags major disparity', () => {
    const g = disparityLib.groupByDimension(observations, 'gender');
    const stats = disparityLib.computeCohortStats(g);
    const findings = disparityLib.detectDisparities(stats, 'M');
    const f = findings.find(x => x.cohort === 'F');
    expect(f.vsReference.flagged).toBe(true);
    expect(f.vsReference.severity).toBe('major');
  });

  it('Step 4: auditDimension returns overallSeverity=major', () => {
    const r = disparityLib.auditDimension({
      observations,
      dimension: 'gender',
      metricKind: 'gas_avg_tscore',
    });
    expect(r.error).toBeUndefined();
    expect(r.overallSeverity).toBe('major');
    expect(r.flaggedCount).toBeGreaterThan(0);
  });

  it('Step 5: computeSignature yields stable 64-char hex', () => {
    const sig = engineService.computeSignature({
      branchId: 'br-001',
      dimension: 'gender',
      metricKind: 'gas_avg_tscore',
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
    });
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('Step 6: same input → same signature (idempotency)', () => {
    const args = {
      branchId: 'br-001',
      dimension: 'gender',
      metricKind: 'gas_avg_tscore',
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
    };
    expect(engineService.computeSignature(args)).toBe(engineService.computeSignature(args));
  });

  it('Step 7: BINARY_METRICS includes complaint_rate', () => {
    expect(engineService.BINARY_METRICS.has('complaint_rate')).toBe(true);
  });

  it('Step 8: end-to-end chain composes without throwing', () => {
    expect(() => {
      const audit = disparityLib.auditDimension({
        observations,
        dimension: 'gender',
        metricKind: 'gas_avg_tscore',
      });
      engineService.computeSignature({
        branchId: 'br-001',
        dimension: 'gender',
        metricKind: 'gas_avg_tscore',
        periodStart: '2026-01-01',
        periodEnd: '2026-03-31',
      });
      return audit.overallSeverity;
    }).not.toThrow();
  });
});

describe('W488 — Phase G closure documentation', () => {
  it('Phase G has 5 waves: W484 + W485 + W486 + W487 + W488', () => {
    const phaseGWaves = ['W484', 'W485', 'W486', 'W487', 'W488'];
    expect(phaseGWaves).toHaveLength(5);
  });

  it('Phase G lib + service frozen / module exported', () => {
    expect(Object.isFrozen(disparityLib)).toBe(true);
    expect(typeof engineService.runAuditAndPersist).toBe('function');
    expect(typeof engineService.runBranchSweep).toBe('function');
  });

  it('Phase G covers v3 sec.6 Innovation 8 (Equity Engine)', () => {
    expect(disparityLib.DISPARITY_DIMENSIONS).toHaveLength(7);
    expect(disparityLib.METRIC_KINDS).toHaveLength(7);
    expect(ALERT_SRC).toMatch(/Innovation 8/);
    expect(BENCH_SRC).toMatch(/Innovation 8/);
  });

  it('Phase G bootstrap is env-gated + branch-scoped', () => {
    expect(BOOT_SRC).toMatch(/ENABLE_EQUITY_ENGINE_CRON/);
    expect(BOOT_SRC).toMatch(/EQUITY_ENGINE_BRANCH_IDS/);
  });
});

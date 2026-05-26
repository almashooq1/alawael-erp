'use strict';

/**
 * W455 drift guard — GAS T-score periodic snapshots.
 *
 * Locks:
 *   • GasScoreSnapshot model declares the documented shape (tScore,
 *     snapshotType enum, goals[], rhoUsed default 0.3, indexes).
 *   • Model registers as 'GasScoreSnapshot' (mongoose.models guard).
 *   • startup/gasSnapshotBootstrap.js exports wireGasSnapshots +
 *     runGasSnapshotSweep.
 *   • Bootstrap is env-gated by ENABLE_GAS_SNAPSHOT_CRON=true.
 *   • Bootstrap is wired into app.js after wireClinicalSweepers.
 *   • Cron schedule is weekly Fri 03:00 in Asia/Riyadh timezone.
 *
 * Static analysis + sandbox behavioral test for wireGasSnapshots.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'GasScoreSnapshot.js'),
  'utf8'
);
const BOOTSTRAP_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'gasSnapshotBootstrap.js'),
  'utf8'
);
const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

describe('W455 — GasScoreSnapshot model', () => {
  it('model file declares schema fields per spec', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:/);
    expect(MODEL_SRC).toMatch(/branchId\s*:/);
    expect(MODEL_SRC).toMatch(/snapshotDate\s*:/);
    expect(MODEL_SRC).toMatch(/snapshotType\s*:/);
    expect(MODEL_SRC).toMatch(/tScore\s*:/);
    expect(MODEL_SRC).toMatch(/ci95Lower\s*:/);
    expect(MODEL_SRC).toMatch(/ci95Upper\s*:/);
    expect(MODEL_SRC).toMatch(/goals\s*:/);
    expect(MODEL_SRC).toMatch(/goalCount\s*:/);
    expect(MODEL_SRC).toMatch(/totalWeight\s*:/);
    expect(MODEL_SRC).toMatch(/rhoUsed\s*:/);
    expect(MODEL_SRC).toMatch(/triggeredBy\s*:/);
  });

  it('snapshotType enum includes the 6 cadence values', () => {
    expect(MODEL_SRC).toMatch(/'session'/);
    expect(MODEL_SRC).toMatch(/'weekly'/);
    expect(MODEL_SRC).toMatch(/'monthly'/);
    expect(MODEL_SRC).toMatch(/'quarterly'/);
    expect(MODEL_SRC).toMatch(/'annual'/);
    expect(MODEL_SRC).toMatch(/'ad-hoc'/);
  });

  it('rhoUsed defaults to 0.3 (Kiresuk W264 convention)', () => {
    expect(MODEL_SRC).toMatch(/rhoUsed\s*:\s*\{[^}]*default:\s*0\.3/);
  });

  it('triggeredBy enum includes cron + manual + session + event', () => {
    const block = MODEL_SRC.match(/triggeredBy\s*:\s*\{[^}]+\}/)[0];
    expect(block).toMatch(/'cron'/);
    expect(block).toMatch(/'manual'/);
    expect(block).toMatch(/'session'/);
    expect(block).toMatch(/'event'/);
  });

  it('goal subdoc carries scaleId + achievedLevel + icfCode', () => {
    const block = MODEL_SRC.match(/goals:\s*\[[\s\S]+?\],/)[0];
    expect(block).toMatch(/scaleId\s*:/);
    expect(block).toMatch(/achievedLevel\s*:/);
    expect(block).toMatch(/icfCode\s*:/);
    expect(block).toMatch(/match:\s*\/\^\[bsde\]\\d\+\$\//);
  });

  it('declares the 3 expected indexes', () => {
    expect(MODEL_SRC).toMatch(/index\(\s*\{\s*beneficiaryId:\s*1,\s*snapshotDate:\s*-1/);
    expect(MODEL_SRC).toMatch(
      /index\(\s*\{\s*branchId:\s*1,\s*snapshotDate:\s*-1,\s*snapshotType:\s*1/
    );
    expect(MODEL_SRC).toMatch(/index\(\s*\{\s*episodeOfCareId:\s*1,\s*snapshotDate:\s*-1/);
  });

  it('uses canonical collection name gas_score_snapshots', () => {
    expect(MODEL_SRC).toMatch(/collection:\s*['"]gas_score_snapshots['"]/);
  });

  it('registers as model "GasScoreSnapshot" with the mongoose.models guard', () => {
    expect(MODEL_SRC).toMatch(
      /mongoose\.models\.GasScoreSnapshot\s*\|\|\s*mongoose\.model\(\s*['"]GasScoreSnapshot['"]/
    );
  });
});

describe('W455 — gasSnapshotBootstrap', () => {
  it('exports wireGasSnapshots + runGasSnapshotSweep', () => {
    const mod = require('../startup/gasSnapshotBootstrap');
    expect(typeof mod.wireGasSnapshots).toBe('function');
    expect(typeof mod.runGasSnapshotSweep).toBe('function');
  });

  it('is env-gated by ENABLE_GAS_SNAPSHOT_CRON', () => {
    expect(BOOTSTRAP_SRC).toMatch(/ENABLE_GAS_SNAPSHOT_CRON/);
  });

  it('reads branch IDs from GAS_SNAPSHOT_BRANCH_IDS', () => {
    expect(BOOTSTRAP_SRC).toMatch(/GAS_SNAPSHOT_BRANCH_IDS/);
  });

  it('schedules cron with weekly Fri 03:00 + Asia/Riyadh timezone', () => {
    expect(BOOTSTRAP_SRC).toMatch(/['"]0\s+3\s+\*\s+\*\s+5['"]/);
    expect(BOOTSTRAP_SRC).toMatch(/timezone:\s*['"]Asia\/Riyadh['"]/);
  });

  it('uses loadOptional for node-cron (graceful absence)', () => {
    expect(BOOTSTRAP_SRC).toMatch(/loadOptional\(['"]node-cron['"]\)/);
  });

  it('uses lazy-loaded mongoose.model() for both Beneficiary + GasScoreSnapshot', () => {
    expect(BOOTSTRAP_SRC).toMatch(/safeModel\(['"]Beneficiary['"]\)/);
    expect(BOOTSTRAP_SRC).toMatch(/safeModel\(['"]GasScoreSnapshot['"]\)/);
  });

  it('lazy-loads gas.service inside the sweep (avoids early mongoose chain pull)', () => {
    expect(BOOTSTRAP_SRC).toMatch(/require\(['"]\.\.\/services\/gas\.service['"]\)/);
  });
});

describe('W455 — wireGasSnapshots opt-in semantics', () => {
  const { wireGasSnapshots } = require('../startup/gasSnapshotBootstrap');
  const noopLogger = { warn: () => {}, info: () => {}, error: () => {} };

  it('returns silently when env flag is not set', () => {
    delete process.env.ENABLE_GAS_SNAPSHOT_CRON;
    expect(() => wireGasSnapshots({}, { logger: noopLogger })).not.toThrow();
  });

  it('throws when logger is missing', () => {
    expect(() => wireGasSnapshots({}, {})).toThrow(/logger required/);
  });
});

describe('W455 — app.js wiring', () => {
  it('app.js calls wireGasSnapshots after wireClinicalSweepers', () => {
    const idxSweepers = APP_SRC.indexOf('wireClinicalSweepers');
    const idxGas = APP_SRC.indexOf('wireGasSnapshots');
    expect(idxSweepers).toBeGreaterThan(0);
    expect(idxGas).toBeGreaterThan(0);
    expect(idxGas).toBeGreaterThan(idxSweepers);
  });

  it('app.js requires gasSnapshotBootstrap', () => {
    expect(APP_SRC).toMatch(/require\(['"]\.\/startup\/gasSnapshotBootstrap['"]\)/);
  });
});

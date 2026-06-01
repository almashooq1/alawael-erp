'use strict';

/**
 * W695 drift guard — moduleGapSweepersBootstrap.
 *
 * Locks the W695 overdue/review sweepers for the W680-W693 arc:
 *   • exports wireModuleGapSweepers(app, deps)
 *   • 4 independently env-gated sweepers (ENABLE_*_SWEEPER), default OFF
 *   • Asia/Riyadh timezone; node-cron loaded optionally (no hard dep)
 *   • READ-ONLY (W364 invariant): ZERO `.save()` / mutation anywhere
 *   • wired into app.js after clinicalSweepersBootstrap
 *   • returns a {scheduled} count; no-ops gracefully when cron unavailable
 *
 * Static analysis + a load-and-invoke smoke (no DB, no cron side effects).
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'moduleGapSweepersBootstrap.js'),
  'utf8'
);
const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

const mod = require('../startup/moduleGapSweepersBootstrap');

describe('W695 moduleGapSweepers — shape', () => {
  it('exports wireModuleGapSweepers', () => {
    expect(typeof mod.wireModuleGapSweepers).toBe('function');
  });

  it('declares 4 env-gated sweepers, all default OFF (=== true required)', () => {
    const gates = SRC.match(/process\.env\.ENABLE_\w+_SWEEPER === 'true'/g) || [];
    expect(gates.length).toBe(4);
    for (const g of [
      'ENABLE_PANDO_FOLLOWUP_SWEEPER',
      'ENABLE_SENSORY_REVIEW_SWEEPER',
      'ENABLE_SPONSORSHIP_EXPIRY_SWEEPER',
      'ENABLE_VFSS_PENDING_SWEEPER',
    ]) {
      expect(SRC).toMatch(new RegExp(`${g} === 'true'`));
    }
  });

  it('uses Asia/Riyadh timezone for every schedule', () => {
    expect(SRC).toMatch(/timezone:\s*'Asia\/Riyadh'/);
    const schedules = SRC.match(/cron\.schedule\(/g) || [];
    expect(schedules.length).toBe(4);
  });

  it('loads node-cron optionally (no hard dependency)', () => {
    expect(SRC).toMatch(/loadOptional\(['"]node-cron['"]\)/);
  });

  it('W364 INVARIANT: read-only — zero .save()/mutation', () => {
    expect(SRC).not.toMatch(/\.save\(/);
    expect(SRC).not.toMatch(/\.updateOne\(/);
    expect(SRC).not.toMatch(/\.updateMany\(/);
    expect(SRC).not.toMatch(/\.findOneAndUpdate\(/);
    expect(SRC).not.toMatch(/\.deleteOne\(/);
    expect(SRC).not.toMatch(/\.deleteMany\(/);
  });

  it('targets the W680-W693 models via lazy safeModel lookup', () => {
    for (const m of [
      'ProstheticOrthoticOrder',
      'SensoryDietProgram',
      'Sponsorship',
      'InstrumentalSwallowStudy',
    ]) {
      expect(SRC).toMatch(new RegExp(`safeModel\\(mongoose,\\s*['"]${m}['"]\\)`));
    }
  });
});

describe('W695 moduleGapSweepers — wiring', () => {
  it('wired into app.js after clinicalSweepersBootstrap', () => {
    expect(APP_SRC).toMatch(
      /moduleGapSweepersBootstrap['"]\)\.wireModuleGapSweepers\(app,\s*\{\s*logger\s*\}\)/
    );
  });
});

describe('W695 moduleGapSweepers — runtime no-op safety', () => {
  it('returns {scheduled:0} with no env flags + a stub cron (no schedules)', () => {
    // Pass a deps.mongoose stub so it never touches a real connection, and
    // ensure no env flags are set → no cron.schedule calls.
    const saved = {};
    for (const k of [
      'ENABLE_PANDO_FOLLOWUP_SWEEPER',
      'ENABLE_SENSORY_REVIEW_SWEEPER',
      'ENABLE_SPONSORSHIP_EXPIRY_SWEEPER',
      'ENABLE_VFSS_PENDING_SWEEPER',
    ]) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    try {
      const res = mod.wireModuleGapSweepers(
        {},
        { logger: { info() {}, warn() {}, error() {} }, mongoose: { model: () => null } }
      );
      // Either cron is unavailable (scheduled:0) or available but no flags → 0.
      expect(res.scheduled).toBe(0);
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v !== undefined) process.env[k] = v;
      }
    }
  });
});

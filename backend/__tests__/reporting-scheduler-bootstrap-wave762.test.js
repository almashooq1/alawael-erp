'use strict';

/**
 * W762 drift guard — reportingSchedulerBootstrap.
 *
 * Locks the wire that activates the dormant Phase-10 reporting platform
 * (buildReportingPlatform + ReportsScheduler were fully built but never
 * .start()'d → scheduled reports never ran; W225 dormant-capability pattern):
 *   • env-gated on ENABLE_REPORT_SCHEDULER (inert default → {started:false})
 *   • requires logger; throws without it
 *   • builds the platform via services/reporting + node-cron (loadOptional) and
 *     calls .start()
 *   • fully guarded — wiring errors swallowed, never break boot
 *   • wired into app.js
 *
 * Static source reads + an inert behavioral call (never starts a real cron).
 */

const fs = require('fs');
const path = require('path');

const BOOT_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'reportingSchedulerBootstrap.js'),
  'utf8'
);
const APP_SRC = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

describe('W762 reportingSchedulerBootstrap — source shape', () => {
  it('is env-gated on ENABLE_REPORT_SCHEDULER', () => {
    expect(BOOT_SRC).toMatch(/process\.env\.ENABLE_REPORT_SCHEDULER\s*!==\s*'true'/);
  });
  it('builds the reporting platform + starts it', () => {
    expect(BOOT_SRC).toMatch(/loadOptional\(\s*'\.\.\/services\/reporting'\s*\)/);
    expect(BOOT_SRC).toMatch(/\.buildReportingPlatform\(/);
    expect(BOOT_SRC).toMatch(/platform\.start\(\)/);
  });
  it('uses node-cron via loadOptional (setInterval fallback when absent)', () => {
    expect(BOOT_SRC).toMatch(/loadOptional\(\s*'node-cron'\s*\)/);
  });
  it('feeds the W735-hardened email channel into communication', () => {
    expect(BOOT_SRC).toMatch(/loadOptional\(\s*'\.\.\/services\/emailService'\s*\)/);
    expect(BOOT_SRC).toMatch(/communication:\s*\{\s*emailService\s*\}/);
  });
  it('swallows wiring errors (never breaks boot)', () => {
    expect(BOOT_SRC).toMatch(/wiring failed \(swallowed\)/);
  });
  it('exports wireReportingScheduler', () => {
    expect(BOOT_SRC).toMatch(/module\.exports\s*=\s*\{\s*wireReportingScheduler\s*\}/);
  });
});

describe('W762 reportingSchedulerBootstrap — inert default behavior', () => {
  const { wireReportingScheduler } = require('../startup/reportingSchedulerBootstrap');
  const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

  it('throws without a logger', () => {
    expect(() => wireReportingScheduler({}, {})).toThrow(/logger required/);
  });

  it('does NOT start when ENABLE_REPORT_SCHEDULER is unset (inert default)', () => {
    const prev = process.env.ENABLE_REPORT_SCHEDULER;
    delete process.env.ENABLE_REPORT_SCHEDULER;
    try {
      const res = wireReportingScheduler({ set: () => {} }, { logger: silentLogger });
      expect(res).toEqual({ started: false });
    } finally {
      if (prev !== undefined) process.env.ENABLE_REPORT_SCHEDULER = prev;
    }
  });
});

describe('W762 — wired into app.js', () => {
  it('app.js calls wireReportingScheduler', () => {
    expect(APP_SRC).toMatch(
      /reportingSchedulerBootstrap'\)\.wireReportingScheduler\(app,\s*\{\s*logger\s*\}\)/
    );
  });
});

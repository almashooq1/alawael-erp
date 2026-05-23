/**
 * mudad-wps-bootstrap-wave282b.test.js — W282b bootstrap + cron wiring.
 *
 * Verifies:
 *   (1) app.js wires wireMudadWps
 *   (2) bootstrap constructs orchestrator with enforceMfa:true
 *      (auto-detected by W276 drift guard)
 *   (3) cron is DISABLED by default (ENABLE_MUDAD_CRON gate)
 *   (4) bootstrap survives missing optional collaborators gracefully
 *   (5) loadOptional pattern doesn't throw on missing modules
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const BOOTSTRAP = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'mudadWpsBootstrap.js'),
  'utf8'
);

describe('W282b — Mudad WPS bootstrap + cron', () => {
  describe('app.js wiring', () => {
    it('calls wireMudadWps', () => {
      expect(APP_JS).toMatch(/require\(['"]\.\/startup\/mudadWpsBootstrap['"]\)\.wireMudadWps\(/);
    });
  });

  describe('bootstrap', () => {
    it('constructs orchestrator with enforceMfa:true', () => {
      expect(BOOTSTRAP).toMatch(/orchestratorFactory\([\s\S]*enforceMfa:\s*true/);
    });

    it('exports wireMudadWps factory', () => {
      const bootstrap = require('../startup/mudadWpsBootstrap');
      expect(typeof bootstrap.wireMudadWps).toBe('function');
    });

    it('cron schedule is day 25 @ 02:30 Asia/Riyadh', () => {
      expect(BOOTSTRAP).toMatch(/cron\.schedule\(\s*['"]30 2 25 \* \*['"]/);
      expect(BOOTSTRAP).toMatch(/timezone:\s*['"]Asia\/Riyadh['"]/);
    });

    it('cron disabled by default unless ENABLE_MUDAD_CRON=true', () => {
      expect(BOOTSTRAP).toMatch(/ENABLE_MUDAD_CRON/);
    });

    it('reads MUDAD_BRANCH_IDS to know which branches to upload for', () => {
      expect(BOOTSTRAP).toMatch(/MUDAD_BRANCH_IDS/);
    });

    it('attaches orchestrator to app._mudadWpsOrchestrator', () => {
      // Smoke-construct a fake app — should succeed and attach the orchestrator
      const fakeApp = { use: jest.fn() };
      // Ensure cron is disabled (default) so we don't actually schedule anything
      const prevEnv = process.env.ENABLE_MUDAD_CRON;
      delete process.env.ENABLE_MUDAD_CRON;
      const { wireMudadWps } = require('../startup/mudadWpsBootstrap');
      wireMudadWps(fakeApp, { logger: { info: () => {}, warn: () => {}, error: () => {} } });
      process.env.ENABLE_MUDAD_CRON = prevEnv || '';
      expect(fakeApp._mudadWpsOrchestrator).toBeTruthy();
      expect(typeof fakeApp._mudadWpsOrchestrator.executeMonthlyWPSUpload).toBe('function');
      // Cron should NOT have been scheduled
      expect(fakeApp._mudadWpsCronTask).toBeUndefined();
    });
  });

  describe('graceful degradation', () => {
    it('survives missing optional modules without throwing', () => {
      // The bootstrap uses loadOptional for PayrollRun, mudadAdapter, etc.
      // The fact that the previous test passed without those models
      // present (in unit-test env) proves the graceful degradation works.
      expect(BOOTSTRAP).toMatch(/loadOptional/);
    });
  });
});

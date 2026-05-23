/**
 * da-periodic-cron-wave286.test.js — DA monthly periodic-report cron (W286).
 *
 * Tests the cron extension to disabilityAuthorityBootstrap. Pattern
 * mirrors W282b mudadWpsBootstrap.
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const BOOTSTRAP = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'disabilityAuthorityBootstrap.js'),
  'utf8'
);

describe('W286 — DA periodic-report cron', () => {
  describe('bootstrap source-level assertions', () => {
    it('reads ENABLE_DA_PERIODIC_CRON env', () => {
      expect(BOOTSTRAP).toMatch(/ENABLE_DA_PERIODIC_CRON/);
    });

    it('reads DA_REPORTING_BRANCH_IDS env', () => {
      expect(BOOTSTRAP).toMatch(/DA_REPORTING_BRANCH_IDS/);
    });

    it('cron schedule is day 5 @ 04:00 Asia/Riyadh', () => {
      expect(BOOTSTRAP).toMatch(/cron\.schedule\(\s*['"]0 4 5 \* \*['"]/);
      expect(BOOTSTRAP).toMatch(/timezone:\s*['"]Asia\/Riyadh['"]/);
    });

    it('uses loadOptional for node-cron', () => {
      expect(BOOTSTRAP).toMatch(/loadOptional\(['"]node-cron['"]\)/);
    });

    it('reports cover PREVIOUS month (not current)', () => {
      // The cron computes `prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)`
      expect(BOOTSTRAP).toMatch(/now\.getMonth\(\)\s*-\s*1/);
    });

    it('iterates over branchIds + per-branch error caught in try/catch', () => {
      expect(BOOTSTRAP).toMatch(/for\s+\(\s*const\s+branchId\s+of\s+branchIds/);
      // Per-branch failure should not kill the rest — verify try/catch around submitPeriodicReport
      expect(BOOTSTRAP).toMatch(/try\s*\{[\s\S]*?submitPeriodicReport/);
    });
  });

  describe('runtime behavior (no real cron)', () => {
    afterEach(() => {
      delete process.env.ENABLE_DA_PERIODIC_CRON;
      delete process.env.DA_REPORTING_BRANCH_IDS;
    });

    it('does NOT schedule cron when env disabled', () => {
      delete process.env.ENABLE_DA_PERIODIC_CRON;
      const fakeApp = { use: jest.fn() };
      const { wireDisabilityAuthority } = require('../startup/disabilityAuthorityBootstrap');
      wireDisabilityAuthority(fakeApp, {
        logger: { info: () => {}, warn: () => {}, error: () => {} },
      });
      expect(fakeApp._daPeriodicCronTask).toBeUndefined();
    });

    it('does NOT schedule cron when ENABLE but no branch IDs', () => {
      process.env.ENABLE_DA_PERIODIC_CRON = 'true';
      delete process.env.DA_REPORTING_BRANCH_IDS;
      const fakeApp = { use: jest.fn() };
      const { wireDisabilityAuthority } = require('../startup/disabilityAuthorityBootstrap');
      wireDisabilityAuthority(fakeApp, {
        logger: { info: () => {}, warn: () => {}, error: () => {} },
      });
      expect(fakeApp._daPeriodicCronTask).toBeUndefined();
    });
  });
});

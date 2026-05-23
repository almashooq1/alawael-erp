/**
 * disability-authority-bootstrap-wave281b.test.js — W281 routes + bootstrap (W281b).
 *
 * Verifies adapter is exposed via app, dual-mounted at the adapter
 * subpath, MFA tier choices per endpoint (1 for verify+pull, 2 for
 * report submit).
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const BOOTSTRAP = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'disabilityAuthorityBootstrap.js'),
  'utf8'
);
const ROUTES = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'disabilityAuthorityAdapter.routes.js'),
  'utf8'
);

describe('W281b — Disability Authority routes + bootstrap', () => {
  describe('app.js wiring', () => {
    it('calls wireDisabilityAuthority', () => {
      expect(APP_JS).toMatch(
        /require\(['"]\.\/startup\/disabilityAuthorityBootstrap['"]\)\.wireDisabilityAuthority\(/
      );
    });
  });

  describe('bootstrap', () => {
    it('mounts at /api/disability-authority/adapter and /api/v1/...', () => {
      expect(BOOTSTRAP).toMatch(/['"]\/api\/disability-authority\/adapter['"]/);
      expect(BOOTSTRAP).toMatch(/['"]\/api\/v1\/disability-authority\/adapter['"]/);
    });

    it('attaches adapter to app at construction', () => {
      const fakeApp = { use: jest.fn() };
      const { wireDisabilityAuthority } = require('../startup/disabilityAuthorityBootstrap');
      wireDisabilityAuthority(fakeApp, { logger: { info: () => {}, warn: () => {} } });
      expect(fakeApp._disabilityAuthorityAdapter).toBeTruthy();
      expect(typeof fakeApp._disabilityAuthorityAdapter.verifyDisabilityCard).toBe('function');
      expect(typeof fakeApp._disabilityAuthorityAdapter.pullReferralInbox).toBe('function');
      expect(typeof fakeApp._disabilityAuthorityAdapter.submitPeriodicReport).toBe('function');
      expect(fakeApp.use).toHaveBeenCalledWith(
        '/api/disability-authority/adapter',
        expect.any(Function)
      );
      expect(fakeApp.use).toHaveBeenCalledWith(
        '/api/v1/disability-authority/adapter',
        expect.any(Function)
      );
    });
  });

  describe('routes file MFA tiers', () => {
    it('uses authenticate + attachMfaActor', () => {
      expect(ROUTES).toMatch(/router\.use\(authenticate\)/);
      expect(ROUTES).toMatch(/router\.use\(attachMfaActor\)/);
    });

    it('verify-card requires tier 1', () => {
      expect(ROUTES).toMatch(/router\.post\(['"]\/verify-card['"]\s*,\s*requireMfaTier\(1\)/);
    });

    it('referrals/pull requires tier 1', () => {
      expect(ROUTES).toMatch(/router\.post\(['"]\/referrals\/pull['"]\s*,\s*requireMfaTier\(1\)/);
    });

    it('reports/submit requires tier 2 (legal artefact)', () => {
      expect(ROUTES).toMatch(/router\.post\(['"]\/reports\/submit['"]\s*,\s*requireMfaTier\(2\)/);
    });

    it('health endpoint is not MFA-gated', () => {
      const healthDef = ROUTES.match(/router\.get\(['"]\/health['"][^)]*\)/);
      expect(healthDef).toBeTruthy();
      expect(healthDef[0]).not.toMatch(/requireMfaTier/);
    });

    it('maps DA_LIVE_NOT_CONFIGURED to 503', () => {
      expect(ROUTES).toMatch(/DA_LIVE_NOT_CONFIGURED[^?]*\?\s*503/s);
    });
  });
});

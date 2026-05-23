/**
 * sehhaty-bootstrap-wave280b.test.js — Sehhaty routes + bootstrap wiring (W280b).
 *
 * W280 tested the adapter + service in isolation. This guard verifies
 * the bootstrap wires both into the app correctly, and that the routes
 * use the right MFA tier + return codes.
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const BOOTSTRAP = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'sehhatyBootstrap.js'),
  'utf8'
);
const ROUTES = fs.readFileSync(path.join(__dirname, '..', 'routes', 'sehhaty.routes.js'), 'utf8');

describe('W280b — Sehhaty bootstrap + routes', () => {
  describe('app.js wiring', () => {
    it('calls wireSehhaty', () => {
      expect(APP_JS).toMatch(/require\(['"]\.\/startup\/sehhatyBootstrap['"]\)\.wireSehhaty\(/);
    });
  });

  describe('bootstrap', () => {
    it('constructs service with enforceMfa:true', () => {
      expect(BOOTSTRAP).toMatch(/sehhatyServiceFactory\([\s\S]*enforceMfa:\s*true/);
    });

    it('mounts at both /api/sehhaty and /api/v1/sehhaty', () => {
      expect(BOOTSTRAP).toMatch(/['"]\/api\/sehhaty['"]/);
      expect(BOOTSTRAP).toMatch(/['"]\/api\/v1\/sehhaty['"]/);
    });

    it('exports wireSehhaty factory', () => {
      const bootstrap = require('../startup/sehhatyBootstrap');
      expect(typeof bootstrap.wireSehhaty).toBe('function');
    });

    it('attaches adapter + service to app', () => {
      // Smoke-construct a fake app
      const fakeApp = {
        use: jest.fn(),
      };
      const { wireSehhaty } = require('../startup/sehhatyBootstrap');
      wireSehhaty(fakeApp, { logger: { info: () => {}, warn: () => {} } });
      expect(fakeApp._sehhatyAdapter).toBeTruthy();
      expect(fakeApp._sehhatyService).toBeTruthy();
      expect(typeof fakeApp._sehhatyAdapter.importHealthSummary).toBe('function');
      expect(typeof fakeApp._sehhatyService.importHealthSummary).toBe('function');
      // Routes mounted twice (legacy + versioned)
      expect(fakeApp.use).toHaveBeenCalledWith('/api/sehhaty', expect.any(Function));
      expect(fakeApp.use).toHaveBeenCalledWith('/api/v1/sehhaty', expect.any(Function));
    });
  });

  describe('routes file', () => {
    it('uses authenticate + attachMfaActor middleware globally', () => {
      expect(ROUTES).toMatch(/router\.use\(authenticate\)/);
      expect(ROUTES).toMatch(/router\.use\(attachMfaActor\)/);
    });

    it('import endpoint requires MFA tier 1', () => {
      expect(ROUTES).toMatch(/router\.post\(['"]\/import['"]\s*,\s*requireMfaTier\(1\)/);
    });

    it('vaccinations endpoint requires MFA tier 1', () => {
      expect(ROUTES).toMatch(/router\.post\(['"]\/vaccinations['"]\s*,\s*requireMfaTier\(1\)/);
    });

    it('tawakkalna-link endpoint requires MFA tier 1', () => {
      expect(ROUTES).toMatch(/router\.post\(['"]\/tawakkalna-link['"]\s*,\s*requireMfaTier\(1\)/);
    });

    it('health endpoint is public-ish (no requireMfaTier on it)', () => {
      // Health probe reports config + mode; doesn't expose PHI
      const healthDef = ROUTES.match(/router\.get\(['"]\/health['"][^)]*\)/);
      expect(healthDef).toBeTruthy();
      // No requireMfaTier on the health endpoint
      expect(healthDef[0]).not.toMatch(/requireMfaTier/);
    });

    it('maps consent reject codes to appropriate HTTP status', () => {
      // 403 for consent failures (not 500)
      expect(ROUTES).toMatch(/SEHHATY_CONSENT_NOT_FOUND.*\?\s*404/s);
      expect(ROUTES).toMatch(/SEHHATY_CONSENT_REVOKED.*\?\s*403/s);
      expect(ROUTES).toMatch(/SEHHATY_LIVE_NOT_CONFIGURED.*\?\s*503/s);
    });
  });
});

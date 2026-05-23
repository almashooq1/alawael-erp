/**
 * speech-bootstrap-wave284b.test.js — W284 routes + bootstrap wiring (W284b).
 *
 * Verifies:
 *   (1) app.js wires wireSpeech
 *   (2) bootstrap constructs service with enforceMfa:true
 *   (3) routes use correct MFA tier per endpoint
 *   (4) branch isolation present in read endpoints (W269 pattern)
 *   (5) audio upload route is NOT in this commit (intentionally deferred)
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const BOOTSTRAP = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'speechBootstrap.js'),
  'utf8'
);
const ROUTES = fs.readFileSync(path.join(__dirname, '..', 'routes', 'speech.routes.js'), 'utf8');

describe('W284b — Speech routes + bootstrap', () => {
  describe('app.js wiring', () => {
    it('calls wireSpeech', () => {
      expect(APP_JS).toMatch(/require\(['"]\.\/startup\/speechBootstrap['"]\)\.wireSpeech\(/);
    });
  });

  describe('bootstrap', () => {
    it('constructs service with enforceMfa:true', () => {
      expect(BOOTSTRAP).toMatch(/factory\([\s\S]*enforceMfa:\s*true/);
    });

    it('mounts at both /api/speech and /api/v1/speech', () => {
      expect(BOOTSTRAP).toMatch(/['"]\/api\/speech['"]/);
      expect(BOOTSTRAP).toMatch(/['"]\/api\/v1\/speech['"]/);
    });

    it('exports wireSpeech factory', () => {
      const bootstrap = require('../startup/speechBootstrap');
      expect(typeof bootstrap.wireSpeech).toBe('function');
    });

    it('attaches service to app at construction', () => {
      const fakeApp = { use: jest.fn() };
      const { wireSpeech } = require('../startup/speechBootstrap');
      wireSpeech(fakeApp, { logger: { info: () => {}, warn: () => {} } });
      expect(fakeApp._speechAnalysisService).toBeTruthy();
      expect(typeof fakeApp._speechAnalysisService.registerUpload).toBe('function');
      expect(typeof fakeApp._speechAnalysisService.runAnalysis).toBe('function');
      expect(fakeApp.use).toHaveBeenCalledWith('/api/speech', expect.any(Function));
      expect(fakeApp.use).toHaveBeenCalledWith('/api/v1/speech', expect.any(Function));
    });
  });

  describe('routes MFA tiers', () => {
    it('register requires tier 2 (PHI write)', () => {
      expect(ROUTES).toMatch(
        /router\.post\(['"]\/recordings\/register['"]\s*,\s*requireMfaTier\(2\)/
      );
    });

    it('analyze trigger requires tier 1', () => {
      expect(ROUTES).toMatch(
        /router\.post\(['"]\/recordings\/:id\/analyze['"]\s*,\s*requireMfaTier\(1\)/
      );
    });

    it('read endpoints (GET) require tier 1', () => {
      expect(ROUTES).toMatch(/router\.get\(['"]\/recordings\/:id['"]\s*,\s*requireMfaTier\(1\)/);
      expect(ROUTES).toMatch(/router\.get\(['"]\/recordings['"]\s*,\s*requireMfaTier\(1\)/);
    });

    it('health endpoint is NOT MFA-gated', () => {
      const healthDef = ROUTES.match(/router\.get\(['"]\/health['"][^)]*\)/);
      expect(healthDef).toBeTruthy();
      expect(healthDef[0]).not.toMatch(/requireMfaTier/);
    });
  });

  describe('branch isolation (W269 pattern)', () => {
    it('GET /recordings/:id enforces cross-branch isolation', () => {
      expect(ROUTES).toMatch(/SPEECH_CROSS_BRANCH_DENIED/);
    });

    it('GET /recordings filters by branchId when present on user', () => {
      // The route file should reference req.user?.branchId in the list query
      expect(ROUTES).toMatch(/req\.user\?.branchId/);
    });
  });

  describe('intentional non-features', () => {
    it('audio file upload route (multer) is intentionally NOT wired here', () => {
      // Confirms scope: this commit handles metadata-after-upload, not S3 multipart.
      // Check for actual usage (require/import) — not just the word in a header comment.
      expect(ROUTES).not.toMatch(/require\(['"]multer/);
      expect(ROUTES).not.toMatch(/from\s+['"]multer/);
    });
  });
});

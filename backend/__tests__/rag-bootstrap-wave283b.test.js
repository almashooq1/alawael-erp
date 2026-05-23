/**
 * rag-bootstrap-wave283b.test.js — RAG routes + bootstrap (W283b).
 *
 * Verifies:
 *   (1) app.js wires wireRag
 *   (2) bootstrap exposes app._ragService + app._embeddingProvider
 *   (3) routes use correct MFA tier per endpoint:
 *       - tier 2: ingest, deactivate (admin mutations)
 *       - tier 1: retrieve preview, list chunks (reads)
 *       - no MFA: health (config probe)
 *   (4) GET /chunks excludes embedding field from response (privacy + perf)
 *   (5) GET /chunks branch-scoped (W269 pattern: branch OR isOrgWide)
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const APP_JS = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const BOOTSTRAP = fs.readFileSync(path.join(__dirname, '..', 'startup', 'ragBootstrap.js'), 'utf8');
const ROUTES = fs.readFileSync(path.join(__dirname, '..', 'routes', 'rag.routes.js'), 'utf8');

describe('W283b — RAG routes + bootstrap', () => {
  describe('app.js wiring', () => {
    it('calls wireRag', () => {
      expect(APP_JS).toMatch(/require\(['"]\.\/startup\/ragBootstrap['"]\)\.wireRag\(/);
    });
  });

  describe('bootstrap', () => {
    it('mounts at /api/rag and /api/v1/rag', () => {
      expect(BOOTSTRAP).toMatch(/['"]\/api\/rag['"]/);
      expect(BOOTSTRAP).toMatch(/['"]\/api\/v1\/rag['"]/);
    });

    it('attaches service + embeddingProvider to app', () => {
      const fakeApp = { use: jest.fn() };
      const { wireRag } = require('../startup/ragBootstrap');
      wireRag(fakeApp, { logger: { info: () => {}, warn: () => {} } });
      expect(fakeApp._ragService).toBeTruthy();
      expect(typeof fakeApp._ragService.ingestDocument).toBe('function');
      expect(typeof fakeApp._ragService.retrieve).toBe('function');
      expect(typeof fakeApp._ragService.cite).toBe('function');
      expect(fakeApp._embeddingProvider).toBeTruthy();
      expect(typeof fakeApp._embeddingProvider.embed).toBe('function');
      // Both URL aliases mounted
      expect(fakeApp.use).toHaveBeenCalledWith('/api/rag', expect.any(Function));
      expect(fakeApp.use).toHaveBeenCalledWith('/api/v1/rag', expect.any(Function));
    });

    it('exports wireRag factory', () => {
      const bootstrap = require('../startup/ragBootstrap');
      expect(typeof bootstrap.wireRag).toBe('function');
    });
  });

  describe('routes MFA tiers', () => {
    it('ingest requires tier 2 (admin mutation)', () => {
      expect(ROUTES).toMatch(/router\.post\(['"]\/ingest['"]\s*,\s*requireMfaTier\(2\)/);
    });

    it('deactivate requires tier 2 (admin mutation)', () => {
      expect(ROUTES).toMatch(/router\.post\(['"]\/deactivate\/:id['"]\s*,\s*requireMfaTier\(2\)/);
    });

    it('retrieve requires tier 1 (read preview)', () => {
      expect(ROUTES).toMatch(/router\.post\(['"]\/retrieve['"]\s*,\s*requireMfaTier\(1\)/);
    });

    it('chunks list requires tier 1 (read)', () => {
      expect(ROUTES).toMatch(/router\.get\(['"]\/chunks['"]\s*,\s*requireMfaTier\(1\)/);
    });

    it('health endpoint NOT MFA-gated', () => {
      const healthDef = ROUTES.match(/router\.get\(['"]\/health['"][^)]*\)/);
      expect(healthDef).toBeTruthy();
      expect(healthDef[0]).not.toMatch(/requireMfaTier/);
    });
  });

  describe('list endpoint privacy', () => {
    it('GET /chunks excludes embedding field from response', () => {
      expect(ROUTES).toMatch(/\.select\(['"]-embedding['"]\)/);
    });

    it('GET /chunks scopes by branchId OR isOrgWide (W269 pattern)', () => {
      expect(ROUTES).toMatch(/branchId.*isOrgWide/s);
    });
  });
});

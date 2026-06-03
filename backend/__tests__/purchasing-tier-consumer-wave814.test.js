'use strict';

/**
 * W814 — ADR-039 consumer-tier drift guard (decision brief § no-regrets #2).
 *
 * Tier A (web-admin): /api/v1/inventory/purchase-orders
 * Tier B (legacy React): /api/v1/purchasing/*
 * Tier C (picker): /api/v1/inventory-module/purchase-orders
 *
 * Prevents accidental cross-tier redirects in registry mounts or UI clients.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const FEATURES = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'features.registry.js'),
  'utf8'
);
const LEGACY_OPS = fs.readFileSync(
  path.join(BACKEND, '..', 'frontend', 'src', 'services', 'operationsService.js'),
  'utf8'
);

const DEFAULT_WEB_ADMIN_API = path.resolve(
  BACKEND,
  '..',
  '..',
  'alawael-rehab-platform',
  'apps',
  'web-admin',
  'src',
  'lib',
  'api.ts'
);

function resolveWebAdminApi() {
  const fromEnv = process.env.CHECK_WEB_ADMIN_API_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  if (fs.existsSync(DEFAULT_WEB_ADMIN_API)) return DEFAULT_WEB_ADMIN_API;
  return null;
}

describe('W814 — ADR-039 tier consumer isolation', () => {
  it('features.registry keeps purchasing mount on purchasing.routes only', () => {
    expect(FEATURES).toMatch(/dualMountAuth\(app,\s*['"]purchasing['"]/);
    expect(FEATURES).toMatch(/purchasing\.routes/);
    expect(FEATURES).not.toMatch(
      /dualMountAuth\(app,\s*['"]purchasing['"][\s\S]{0,200}inventory-enhanced/
    );
    expect(FEATURES).not.toMatch(
      /dualMountAuth\(app,\s*['"]purchasing['"][\s\S]{0,200}inventory\/purchase-orders/
    );
  });

  it('legacy purchasingService uses Tier B paths (not web-admin Tier A)', () => {
    expect(LEGACY_OPS).toMatch(/\/api\/v1\/purchasing\/orders/);
    expect(LEGACY_OPS).not.toMatch(/\/api\/v1\/inventory\/purchase-orders/);
  });

  it('legacy purchasingService exposes platform-stats on Tier B', () => {
    expect(LEGACY_OPS).toMatch(/\/api\/v1\/purchasing\/platform-stats/);
  });

  const webAdminApi = resolveWebAdminApi();
  (webAdminApi ? it : it.skip)(
    'web-admin api.ts stays on Tier A inventory PO (no Tier B purchasing orders)',
    () => {
      const src = fs.readFileSync(webAdminApi, 'utf8');
      expect(src).toMatch(/\/api\/v1\/inventory\/purchase-orders/);
      expect(src).not.toMatch(/\/api\/v1\/purchasing\/orders/);
      expect(src).not.toMatch(/\/api\/v1\/purchasing\/requests/);
    }
  );
});

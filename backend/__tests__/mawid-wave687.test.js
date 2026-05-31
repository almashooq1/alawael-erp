'use strict';

/**
 * W687 drift guard — Mawid adapter + mawid routes.
 *
 * Mawid is an external-integration adapter (no Mongoose model), so this
 * guard combines static route/mount checks with BEHAVIORAL assertions on
 * the mock adapter (deterministic by national-ID suffix + live-gated).
 */

const fs = require('fs');
const path = require('path');

const ADAPTER_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'mawidAdapter.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'mawid.routes.js'), 'utf8');
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const adapter = require('../services/mawidAdapter');

describe('W687 mawidAdapter — mock determinism', () => {
  const ORIGINAL = process.env.MAWID_MODE;
  beforeAll(() => {
    delete process.env.MAWID_MODE; // default = mock
  });
  afterAll(() => {
    if (ORIGINAL === undefined) delete process.env.MAWID_MODE;
    else process.env.MAWID_MODE = ORIGINAL;
  });

  it('returns 2 deterministic appointments for a normal national ID', async () => {
    const r = await adapter.getAppointments('1010101010');
    expect(r.source).toBe('mock');
    expect(r.appointments).toHaveLength(2);
    expect(r.appointments[0].mawidReferenceId).toMatch(/^MWD-10-001$/);
  });

  it('returns empty list for suffix 99', async () => {
    const r = await adapter.getAppointments('1234567899');
    expect(r.appointments).toEqual([]);
  });

  it('throws MAWID_PATIENT_NOT_FOUND for suffix 88', async () => {
    await expect(adapter.getAppointments('1234567888')).rejects.toMatchObject({
      code: 'MAWID_PATIENT_NOT_FOUND',
    });
  });

  it('throws MAWID_INVALID_NATIONAL_ID for a non-10-digit id', async () => {
    await expect(adapter.getAppointments('123')).rejects.toMatchObject({
      code: 'MAWID_INVALID_NATIONAL_ID',
    });
  });

  it('getStatus reports mock mode ready', async () => {
    const s = await adapter.getStatus();
    expect(s.integration).toBe('mawid');
    expect(s.mode).toBe('mock');
    expect(s.ready).toBe(true);
  });
});

describe('W687 mawidAdapter — live mode gating', () => {
  it('throws MAWID_LIVE_NOT_CONFIGURED in live mode without creds', async () => {
    const prevMode = process.env.MAWID_MODE;
    const prevBase = process.env.MAWID_BASE_URL;
    process.env.MAWID_MODE = 'live';
    delete process.env.MAWID_BASE_URL;
    try {
      await expect(adapter.getAppointments('1010101010')).rejects.toMatchObject({
        code: 'MAWID_LIVE_NOT_CONFIGURED',
      });
    } finally {
      if (prevMode === undefined) delete process.env.MAWID_MODE;
      else process.env.MAWID_MODE = prevMode;
      if (prevBase !== undefined) process.env.MAWID_BASE_URL = prevBase;
    }
  });

  it('adapter reads env lazily (no top-level process.env capture)', () => {
    // MODE() + assertLiveConfigured read process.env at call time.
    expect(ADAPTER_SRC).toMatch(/process\.env\.MAWID_MODE/);
    expect(ADAPTER_SRC).toMatch(/const MODE = \(\)/);
  });
});

describe('W687 mawid routes — surface + wiring', () => {
  it('GET /status', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/status['"]/);
  });
  it('GET /appointments/:beneficiaryId', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/appointments\/:beneficiaryId['"]/);
  });
  it('POST /pull', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/pull['"]/);
  });
  it('branch-scopes the beneficiary lookup + never reads req.branchId', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).toMatch(/branchFilter\(req\)/);
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });
  it('maps adapter error codes to HTTP status (404/400/503)', () => {
    expect(ROUTES_SRC).toMatch(/MAWID_PATIENT_NOT_FOUND/);
    expect(ROUTES_SRC).toMatch(/MAWID_LIVE_NOT_CONFIGURED/);
    expect(ROUTES_SRC).toMatch(/return 503/);
  });
  it('mounts at /mawid via dualMountAuth + cites W687', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]mawid['"]\s*,\s*mawidRoutes\s*,\s*authenticate\s*\)/
    );
    expect(REGISTRY_SRC).toMatch(/Wave 687/);
  });
});

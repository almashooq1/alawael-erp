'use strict';

/**
 * cctv-camera-nvr-branch-isolation-wave1580.test.js — W1580 (static drift guard)
 *
 * Follow-up to W1578 (#873). CCTV camera/NVR READS leaked device inventory +
 * CREDENTIALS (auth.username / passwordRef / webhook secret) + config across
 * branches: GET /by-branch/:code + GET /:id had no branch check, GET /:id
 * returned the raw doc incl. `auth`. Fix (reusing the W1578 branchCode resolver):
 * requireBranchAccess + callerCctvBranchCode branch scope/asserts + redact
 * credentials from every read response.
 *
 * Static (source-regex) only — no jest.unmock/DB — not sprint-enumerated.
 */

const fs = require('fs');
const path = require('path');

const read = f => fs.readFileSync(path.join(__dirname, '..', 'routes', 'cctv', f), 'utf8');
const CAM = read('cameras.routes.js');
const NVR = read('nvr.routes.js');

describe('W1580 — cameras/nvr routers are branch-scoped', () => {
  test.each([
    ['cameras', CAM],
    ['nvr', NVR],
  ])('%s applies requireBranchAccess + uses the branchCode resolver', (_n, src) => {
    expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(src).toMatch(/callerCctvBranchCode/);
    expect(src).toMatch(/require\('\.\.\/\.\.\/middleware\/cctvBranchScope'\)/);
  });

  test.each([
    ['cameras', CAM],
    ['nvr', NVR],
  ])('%s by-branch/:code denies a foreign branch for restricted callers', (_n, src) => {
    expect(src).toMatch(/String\(req\.params\.code\)\.toUpperCase\(\) !== callerCode/);
    expect(src).toMatch(/CROSS_BRANCH_DENIED/);
  });

  test.each([
    ['cameras', CAM],
    ['nvr', NVR],
  ])('%s GET /:id asserts branch (no bare read passthrough)', (_n, src) => {
    expect(src).toMatch(/branchCodeVisible\(callerCode, [a-z]+\.branchCode\)/);
  });
});

describe('W1580 — device credentials are redacted from read responses', () => {
  test('cameras redacts auth', () => {
    expect(CAM).toMatch(/function redactCamera/);
    expect(CAM).toMatch(/delete o\.auth/);
    // reads return the redacted shape, not the raw doc
    expect(CAM).toMatch(/data: redactCamera\(cam\)/);
    expect(CAM).not.toMatch(/res\.json\(\{ success: true, data: cam \}\)/);
  });
  test('nvr redacts auth + webhook secret', () => {
    expect(NVR).toMatch(/function redactNvr/);
    expect(NVR).toMatch(/delete o\.auth/);
    expect(NVR).toMatch(/webhookSecret/);
    expect(NVR).not.toMatch(/res\.json\(\{ success: true, data: n \}\)/);
  });
});

/**
 * k6-gov-integrations-load-profile-wave1350.test.js
 *
 * Static drift guard for the government-integration k6 capacity profile
 * (W1350, GAPS Item 4). k6 scripts import from `k6/http` and cannot be
 * `require()`d under Node, so this guard reads the file as TEXT and asserts
 * its structural + SAFETY invariants.
 *
 * The load-bearing assertion is the READ-ONLY invariant: a government load
 * profile must NEVER issue a mutating/dispatching call (claim-submit,
 * prior-auth, GOSI register/calculate, WhatsApp send) — doing so would spam
 * the NPHIES/GOSI sandboxes (or production) with phantom records. This guard
 * fails CI the moment any http.post/put/del/patch is added to the file.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const LOAD_DIR = path.join(__dirname, '..', 'tests', 'load');
const GOV_FILE = path.join(LOAD_DIR, 'k6-gov-integrations.js');
const PKG_FILE = path.join(__dirname, '..', 'package.json');

describe('k6 gov-integrations load profile — structure (W1350)', () => {
  /** @type {string} */
  let src;

  beforeAll(() => {
    src = fs.readFileSync(GOV_FILE, 'utf8');
  });

  it('the gov-integration k6 profile file exists and is non-trivial', () => {
    expect(fs.existsSync(GOV_FILE)).toBe(true);
    expect(src.length).toBeGreaterThan(500);
  });

  it('declares a staged ramp with warm-up → peak → ramp-down', () => {
    expect(src).toMatch(/export const options\s*=/);
    expect(src).toMatch(/stages\s*:/);
    // ramp-down to zero present
    expect(src).toMatch(/target:\s*0/);
    // peak driven by an env-overridable PEAK_VUS
    expect(src).toMatch(/PEAK_VUS/);
    expect(src).toMatch(/PEAK_DURATION/);
  });

  it('binds per-integration SLO thresholds (NPHIES + GOSI + global fail)', () => {
    expect(src).toMatch(/thresholds\s*:/);
    expect(src).toMatch(/http_req_failed\s*:\s*\[/);
    expect(src).toMatch(/nphies_read_latency\s*:\s*\[/);
    expect(src).toMatch(/gosi_read_latency\s*:\s*\[/);
    expect(src).toMatch(/gov_read_failed\s*:\s*\[/);
    // every threshold uses a percentile budget (p95/p99 or a rate ceiling)
    expect(src).toMatch(/p\(95\)</);
    expect(src).toMatch(/rate</);
  });

  it('exposes env-overridable endpoint paths for portability', () => {
    expect(src).toMatch(/NPHIES_STATUS_PATH/);
    expect(src).toMatch(/NPHIES_CPT_PATH/);
    expect(src).toMatch(/GOSI_RATES_PATH/);
    expect(src).toMatch(/GOSI_DASHBOARD_PATH/);
    // defaults target the verified dual-mounted /api/v1 prefix
    expect(src).toMatch(/\/api\/v1\/nphies\/status/);
    expect(src).toMatch(/\/api\/v1\/gosi-full\/rates/);
  });

  it('requires a TOKEN before exercising authed gov surfaces', () => {
    expect(src).toMatch(/__ENV\.TOKEN/);
    expect(src).toMatch(/if\s*\(\s*!TOKEN\s*\)/);
    // liveness still runs without a token so misconfig fails loudly
    expect(src).toMatch(/\/health/);
  });
});

describe('k6 gov-integrations load profile — READ-ONLY safety invariant (W1350)', () => {
  /** @type {string} */
  let src;

  beforeAll(() => {
    src = fs.readFileSync(GOV_FILE, 'utf8');
  });

  it('issues ONLY http.get probes — no mutating/dispatching call', () => {
    expect(src).toMatch(/http\.get\(/);
    // The whole point: a gov LOAD test must never fire a mutation that could
    // spam NPHIES/GOSI sandboxes. Any of these appearing = fail the gate.
    expect(src).not.toMatch(/http\.post\(/);
    expect(src).not.toMatch(/http\.put\(/);
    expect(src).not.toMatch(/http\.del\(/);
    expect(src).not.toMatch(/http\.patch\(/);
    expect(src).not.toMatch(/http\.request\(/);
  });

  it('does not reference any known mutating gov endpoint segment', () => {
    // Defence-in-depth: check the CODE only (strip comments) — the leading
    // safety doc legitimately names these segments while forbidding them.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
      .replace(/(^|[^:])\/\/.*$/gm, '$1'); // line comments (keep :// in URLs)
    expect(code).not.toMatch(/claim-submit/);
    expect(code).not.toMatch(/prior-auth/);
    expect(code).not.toMatch(/cancel-claim/);
    expect(code).not.toMatch(/gosi-full\/(calculate|register)/);
    expect(code).not.toMatch(/whatsapp\/(send|messages)/);
  });

  it('documents the read-only intent in a leading comment', () => {
    expect(src).toMatch(/READ-ONLY BY DESIGN/i);
  });
});

describe('k6 gov-integrations load profile — npm wiring (W1350)', () => {
  it('package.json exposes a test:load:gov script pointing at the file', () => {
    const pkg = JSON.parse(fs.readFileSync(PKG_FILE, 'utf8'));
    expect(pkg.scripts).toHaveProperty('test:load:gov');
    expect(pkg.scripts['test:load:gov']).toMatch(/k6 run .*k6-gov-integrations\.js/);
  });
});

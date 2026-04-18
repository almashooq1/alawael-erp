/**
 * provider-registry-consistency.test.js — drift detection across the
 * 10-provider surface.
 *
 * Eight places name the providers:
 *   1. backend/services/adapterRateLimiter.js DEFAULTS map
 *   2. backend/services/{NAME}Adapter.js (file exists + exports MODE)
 *   3. backend/routes/gov-integrations.routes.js ADAPTERS map
 *   4. backend/routes/integrations-metrics.routes.js ADAPTERS array
 *   5. backend/scripts/gov-status.js PROVIDERS array
 *   6. backend/scripts/preflight.js PROVIDERS array
 *   7. backend/models/AdapterAudit.js provider enum
 *   8. backend/.env.example {NAME}_MODE block
 *
 * If someone adds an 11th provider and forgets any of these wirings,
 * production silently skips that provider in metrics / admin UI /
 * rate limiting / health / audit / ops docs — worst failure mode.
 *
 * This file asserts all eight lists agree on the same 10 names.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const EXPECTED = [
  'gosi',
  'scfhs',
  'absher',
  'qiwa',
  'nafath',
  'fatoora',
  'muqeem',
  'nphies',
  'wasel',
  'balady',
];

describe('10-provider registry consistency', () => {
  it('adapterRateLimiter.DEFAULTS covers every expected provider', () => {
    const { DEFAULTS } = require('../services/adapterRateLimiter');
    for (const name of EXPECTED) {
      expect(DEFAULTS[name]).toBeDefined();
      expect(DEFAULTS[name].capacity).toEqual(expect.any(Number));
      expect(DEFAULTS[name].refillPerMinute).toEqual(expect.any(Number));
      expect(DEFAULTS[name].actorCap).toEqual(expect.any(Number));
    }
  });

  it('every expected provider has a {name}Adapter.js file exporting MODE', () => {
    for (const name of EXPECTED) {
      const modulePath = `../services/${name}Adapter`;
      let mod;
      expect(() => {
        mod = require(modulePath);
      }).not.toThrow();
      expect(mod).toBeDefined();
      expect(typeof mod.MODE).toBe('string');
      expect(['mock', 'live']).toContain(mod.MODE);
    }
  });

  it('gov-integrations route ADAPTERS map lists every expected provider', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'gov-integrations.routes.js'),
      'utf8'
    );
    // The ADAPTERS map uses a mix of shorthand (`gosi,`), explicit-key
    // wrappers (`scfhs: scfhsWrapped`), and quoted keys. Simplest
    // correctness check: each name must appear as a standalone word.
    for (const name of EXPECTED) {
      const re = new RegExp(`\\b${name}\\b`);
      expect(re.test(src)).toBe(true);
    }
  });

  it('integrations-metrics.routes ADAPTERS array lists every provider', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'integrations-metrics.routes.js'),
      'utf8'
    );
    for (const name of EXPECTED) {
      expect(src).toMatch(new RegExp(`'${name}'`));
    }
  });

  it('Prometheus endpoint carries rate-limit metrics for every provider', async () => {
    // Direct check on the rateLimiter.status() — what the metrics route
    // actually reads. No HTTP round-trip needed.
    const rl = require('../services/adapterRateLimiter');
    for (const name of EXPECTED) {
      const snap = rl.status(name);
      expect(snap.provider).toBe(name);
      expect(snap.configured).toBe(true);
      expect(snap.capacity).toEqual(expect.any(Number));
    }
  });

  it('gov-status CLI PROVIDERS list matches EXPECTED', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'gov-status.js'), 'utf8');
    // Grab the PROVIDERS array literal and compare contents
    const match = src.match(/const PROVIDERS = \[([^\]]+)\]/);
    expect(match).toBeTruthy();
    const declared = (match[1].match(/'[a-z]+'/g) || []).map(s => s.slice(1, -1));
    expect(declared.sort()).toEqual([...EXPECTED].sort());
  });

  it('preflight CLI PROVIDERS list matches EXPECTED', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'preflight.js'), 'utf8');
    const match = src.match(/const PROVIDERS = \[([^\]]+)\]/);
    expect(match).toBeTruthy();
    const declared = (match[1].match(/'[a-z]+'/g) || []).map(s => s.slice(1, -1));
    expect(declared.sort()).toEqual([...EXPECTED].sort());
  });

  it('.env.example documents {NAME}_MODE for every expected provider', () => {
    // Operators read .env.example to find what knobs exist. If we ship
    // an 11th adapter and the env file doesn't document it, deployers
    // flipping live will hunt through source code for the var name.
    const src = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
    for (const name of EXPECTED) {
      // Accept commented-out examples too: "# GOSI_MODE=mock" or "GOSI_MODE=mock"
      const re = new RegExp(`^\\s*#?\\s*${name.toUpperCase()}_MODE=`, 'm');
      expect(re.test(src)).toBe(true);
    }
  });

  it('AdapterAudit.provider enum covers every expected provider + zatca-signer', () => {
    // Mongoose enum validation rejects any insert whose provider isn't
    // in this list. If someone renames an adapter without updating the
    // model, audit writes silently fail (warn-logged inside the catch
    // block of adapterAuditLogger.record()) and PDPL coverage breaks.
    //
    // Read the source file rather than instantiating the model — the
    // latter needs a mongoose connection in some test setups.
    const src = fs.readFileSync(path.join(__dirname, '..', 'models', 'AdapterAudit.js'), 'utf8');
    const enumMatch = src.match(/provider:\s*\{[\s\S]+?enum:\s*\[([\s\S]+?)\]/);
    expect(enumMatch).toBeTruthy();
    const enumVals = (enumMatch[1].match(/'([a-z-]+)'/g) || []).map(s => s.slice(1, -1));
    for (const name of EXPECTED) {
      expect(enumVals).toContain(name);
    }
    // zatca-signer is an internal audit-only kind (no adapter file), so
    // we expect it on top of the 10 — the count should be exactly 11.
    expect(enumVals).toContain('zatca-signer');
    expect(enumVals.length).toBe(EXPECTED.length + 1);
  });
});

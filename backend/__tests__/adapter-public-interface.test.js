/**
 * adapter-public-interface.test.js — every gov adapter exports the
 * public interface the rest of the system depends on.
 *
 * Every consumer in the codebase assumes:
 *   • MODE (string 'mock' | 'live')
 *   • verify() or checkEligibility() / submitClaim() / submit() / initiate()  (at least one)
 *   • testConnection() (optional but strongly expected for non-fatoora)
 *
 * `getConfig()` used to be mandatory but SCFHS + Nafath historically
 * lacked it — the integrations-health route synthesizes it for them.
 * That fallback is asserted as the contract here.
 *
 * If someone refactors an adapter and drops MODE or all callable
 * methods, this fires at PR time.
 */

'use strict';

const PROVIDERS = [
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

// Each adapter must export MODE + at least one of these callable
// entry points. Multiple are OK (nphies has both).
const CALLABLE = [
  'verify',
  'checkEligibility',
  'submitClaim',
  'submit',
  'initiate',
  'verifyShortCode',
];

describe('gov adapter public interface', () => {
  it.each(PROVIDERS)('%s adapter exports MODE + at least one callable entry', name => {
    const mod = require(`../services/${name}Adapter`);
    // MODE present and valid
    expect(['mock', 'live']).toContain(mod.MODE);
    // At least one callable entry point
    const present = CALLABLE.filter(f => typeof mod[f] === 'function');
    expect(present.length).toBeGreaterThan(0);
  });

  it.each(PROVIDERS)('%s adapter has EITHER getConfig() OR the known fallback shape', name => {
    const mod = require(`../services/${name}Adapter`);
    if (typeof mod.getConfig === 'function') {
      const cfg = mod.getConfig();
      expect(cfg).toMatchObject({ provider: name, mode: expect.any(String) });
    } else {
      // The known fallback: MODE exists so integrations-health.routes
      // can synthesize a config. SCFHS + Nafath take this path.
      expect(typeof mod.MODE).toBe('string');
    }
  });
});

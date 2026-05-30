'use strict';
/**
 * W666 — drift guard for the LIVE permission registry
 * (backend/authorization/permissions.registry.js, generated from
 * docs/architecture/role-permissions.seed.json by scripts/gen-permissions-registry.js).
 *
 * Pairs a STATIC half (registry shape + stays in sync with the seed) with a
 * BEHAVIORAL half (can() returns the seed's grant/deny verdicts) per the repo's
 * "pair every static drift guard with a behavioral counterpart" doctrine.
 *
 * Pure: no DB, no boot. The registry + seed are plain data.
 */

const fs = require('fs');
const path = require('path');

const reg = require('../authorization/permissions.registry');
const SEED = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'docs', 'architecture', 'role-permissions.seed.json'),
    'utf8'
  )
);

const SEED_CODES = SEED.roles.map(r => r.code).sort();
const KEY_RE = /^[a-z_]+(:[a-z_]+){1,2}$/; // module:resource:action (2–3 segments)

describe('W666 permission registry — shape (static)', () => {
  it('exports the expected surface', () => {
    expect(Object.keys(reg).sort()).toEqual(
      ['ALL', 'ARCHETYPES', 'META', 'P', 'ROLE_DENY', 'ROLE_GRANTS', 'can'].sort()
    );
    expect(typeof reg.can).toBe('function');
  });

  it('ARCHETYPES are exactly the 9 seed archetype codes', () => {
    expect(Object.keys(reg.ARCHETYPES).sort()).toEqual(SEED_CODES);
    // sanity: the canonical 9 (ADR-035 / ADR-036)
    expect(SEED_CODES).toEqual(
      ['AUD', 'BRM', 'EXD', 'FIN', 'HQA', 'HRO', 'REC', 'THR', 'UNS'].sort()
    );
  });

  it('P + META stay in sync with the seed permission set', () => {
    const seedKeys = SEED.permissions.map(p => p.key).sort();
    expect(Object.values(reg.P).sort()).toEqual(seedKeys);
    expect(Object.keys(reg.META).sort()).toEqual(seedKeys);
    expect(reg.ALL.slice().sort()).toEqual(seedKeys);
  });

  it('every permission key is well-formed module:resource:action', () => {
    for (const key of reg.ALL) expect(key).toMatch(KEY_RE);
  });

  it('every META.tier is 1|2|3 (or null) and flags are boolean', () => {
    for (const key of reg.ALL) {
      const m = reg.META[key];
      expect([1, 2, 3, null]).toContain(m.tier);
      expect(typeof m.phi).toBe('boolean');
      expect(typeof m.hqOnly).toBe('boolean');
    }
  });

  it('grant/deny tables are keyed only by archetype codes', () => {
    for (const code of Object.keys(reg.ROLE_GRANTS)) expect(SEED_CODES).toContain(code);
    for (const code of Object.keys(reg.ROLE_DENY)) expect(SEED_CODES).toContain(code);
  });

  // ratchet-up: additions allowed, an accidental shrink fails CI.
  it('permission count is within a sane band (catches accidental drops)', () => {
    expect(reg.ALL.length).toBeGreaterThanOrEqual(60);
    expect(reg.ALL.length).toBeLessThanOrEqual(400);
  });
});

describe('W666 permission registry — decisions (behavioral)', () => {
  it('grants a clinical read to THERAPIST, denies it to RECEPTIONIST', () => {
    expect(reg.can('THR', 'beneficiary:clinical:read').allow).toBe(true);
    const rec = reg.can('REC', 'beneficiary:clinical:read');
    expect(rec.allow).toBe(false);
    expect(rec.reason).toBe('explicit-deny');
  });

  it('returns ungranted (not crash) for a role without the grant', () => {
    expect(reg.can('HRO', 'beneficiary:clinical:read').allow).toBe(false);
  });

  it('returns unknown-permission for a bogus key', () => {
    const v = reg.can('THR', 'totally:not:areal:key');
    expect(v.allow).toBe(false);
    expect(v.reason).toBe('unknown-permission');
  });

  it('every seed deny entry resolves to explicit-deny', () => {
    for (const p of SEED.permissions) {
      for (const code of p.deny || []) {
        const v = reg.can(code, p.key);
        expect(v.allow).toBe(false);
        expect(v.reason).toBe('explicit-deny');
      }
    }
  });

  it('every seed grant resolves to allow with a scope', () => {
    for (const p of SEED.permissions) {
      for (const g of p.grants || []) {
        for (const code of g.roles) {
          if ((p.deny || []).includes(code)) continue; // deny wins (shouldn't co-occur, but be safe)
          const v = reg.can(code, p.key);
          expect(v.allow).toBe(true);
          expect(typeof v.scope).toBe('string');
        }
      }
    }
  });
});

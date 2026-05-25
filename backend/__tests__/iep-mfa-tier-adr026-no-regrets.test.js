'use strict';

/**
 * iep-mfa-tier-adr026-no-regrets.test.js
 *
 * ADR-026 no-regrets item #1 (per docs/architecture/decisions/
 * 026-DECISION-BRIEF.md §3): MFA tier 2 retrofit on the 3 sensitive
 * iep.routes.js endpoints. These were previously RBAC-only — closing
 * the ADR-019 layer-2 gap on the IEP surface BEFORE the ADR-026
 * stakeholder meeting picks A/B/C.
 *
 * Static-source guard: asserts each of the 3 mutating endpoints
 * (sign / transition / delete) carries `requireMfaTier(2)` in its
 * middleware chain, plus `attachMfaActor` on the router itself so
 * `req.actor` is populated for the tier check.
 *
 * Pattern matches biometric-mfa-tier-wave273.test.js + quality-incident
 * -mfa-tier-wave277b.test.js + capa-mfa-tier-wave277e.test.js — every
 * MFA-gated route surface has a corresponding drift guard.
 *
 * If any of the 3 gates regress (someone removes requireMfaTier(2) or
 * loosens it to (1)), this test fails. That's the point.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'iep.routes.js'), 'utf8');

describe('ADR-026 no-regrets #1 — iep.routes MFA tier 2 retrofit', () => {
  describe('router-level middleware', () => {
    it('imports requireMfaTier + attachMfaActor from middleware/requireMfaTier', () => {
      expect(SRC).toMatch(/require\(['"]\.\.\/middleware\/requireMfaTier['"]\)/);
      expect(SRC).toMatch(/attachMfaActor/);
      expect(SRC).toMatch(/requireMfaTier/);
    });

    it('mounts attachMfaActor at router level (populates req.actor)', () => {
      // Order matters: authenticateToken first, then attachMfaActor.
      // Match `router.use(authenticateToken)` followed within 200 chars
      // by `router.use(attachMfaActor)`.
      expect(SRC).toMatch(
        /router\.use\(authenticateToken\)[\s\S]{0,400}router\.use\(attachMfaActor\)/
      );
    });
  });

  describe('sensitive endpoint gates (must require tier 2)', () => {
    const SENSITIVE = [
      {
        endpoint: 'POST /:id/sign',
        re: /router\.post\(\s*['"]\/:id\/sign['"]\s*,\s*requireRole\(WRITE_ROLES\)\s*,\s*requireMfaTier\(2\)/,
        why: 'IEP signature is legally binding (Nafath-attested)',
      },
      {
        endpoint: 'POST /:id/transition',
        re: /router\.post\(\s*['"]\/:id\/transition['"]\s*,\s*requireRole\(TRANSITION_ROLES\)\s*,\s*requireMfaTier\(2\)/,
        why: 'IEP status transitions (esp. → active) gate the legal effect',
      },
      {
        endpoint: 'DELETE /:id',
        re: /router\.delete\(\s*['"]\/:id['"]\s*,\s*requireRole\(DELETE_ROLES\)\s*,\s*requireMfaTier\(2\)/,
        why: 'destructive on legal artifact',
      },
    ];

    for (const { endpoint, re, why } of SENSITIVE) {
      it(`${endpoint} requires tier 2 (${why})`, () => {
        expect(SRC).toMatch(re);
      });
    }

    it('count of requireMfaTier(2) usages matches the 3 sensitive endpoints', () => {
      const matches = SRC.match(/requireMfaTier\(2\)/g) || [];
      expect(matches.length).toBe(3);
    });

    it('no requireMfaTier(1) — that would weaken the gate to mere MFA presence', () => {
      expect(SRC).not.toMatch(/requireMfaTier\(1\)/);
    });
  });

  describe('non-sensitive endpoints are intentionally NOT gated', () => {
    // Goals/services CRUD + edit/review are mutations but lower-stakes
    // (the row is not yet signed/active when these typically fire).
    // If a future product decision raises their stakes, add tier 2 here.
    const NON_GATED = [
      'POST /', // create draft
      'PATCH /:id', // edit draft
      'POST /:id/goals',
      'PATCH /:id/goals/:goalId',
      'DELETE /:id/goals/:goalId',
      'POST /:id/services',
      'DELETE /:id/services/:serviceId',
      'POST /:id/review',
    ];
    it('total non-tier-2 mutation endpoints stay at 8 (baseline)', () => {
      // Count router.(post|patch|delete) calls minus the 3 tier-2 gated.
      const mutations = SRC.match(/^router\.(post|patch|delete)\(/gm) || [];
      const tier2 = SRC.match(/requireMfaTier\(2\)/g) || [];
      expect(mutations.length - tier2.length).toBe(NON_GATED.length);
    });
  });
});

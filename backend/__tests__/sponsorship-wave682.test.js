'use strict';

/**
 * W682 drift guard — Sponsorship (kafala) + sponsorship routes shape.
 *
 * Locks the W682 donor↔beneficiary kafala build:
 *   • model registers as 'Sponsorship' with canonical Donor + Beneficiary
 *     + Branch refs + Donation payment cross-link
 *   • TYPES/STATUSES/TRANSITIONS exported + frozen + BFS-reachable
 *   • Wave-18 invariants (recurring⇒monthlyAmount>0 / paused⇒pauseReason /
 *     cancelled⇒cancelReason / endDate≥startDate)
 *   • totalPaid + isActive + isExpired virtuals
 *   • routes: 10 endpoints incl. /stats + /:id/transition (409) +
 *     /:id/payment; branch-scoped, no req.branchId
 *   • mounts at /sponsorship via dualMountAuth + canonical registered
 *
 * Static analysis only (jest.setup.js mocks mongoose). Pair with
 * sponsorship-behavioral-wave682.test.js.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'Sponsorship.js'), 'utf8');
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'sponsorship.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);
const CANONICAL_INDEX_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'intelligence', 'canonical', 'index.js'),
  'utf8'
);

const model = require('../models/Sponsorship');

describe('W682 Sponsorship — exports & enums', () => {
  it('exports TYPES (full/partial/one_time/in_kind)', () => {
    expect(model.TYPES).toEqual(['full', 'partial', 'one_time', 'in_kind']);
  });
  it('exports RECURRING_TYPES (full/partial)', () => {
    expect(model.RECURRING_TYPES).toEqual(['full', 'partial']);
  });
  it('exports STATUSES (5-state lifecycle)', () => {
    expect(model.STATUSES).toEqual(['pending', 'active', 'paused', 'completed', 'cancelled']);
  });
  it('exports COVERAGE_ITEMS including center_fees + transport + therapy', () => {
    expect(model.COVERAGE_ITEMS).toEqual(
      expect.arrayContaining(['center_fees', 'transport', 'therapy', 'assistive_devices'])
    );
  });
});

describe('W682 Sponsorship — TRANSITIONS', () => {
  it('is frozen + keyed by every status', () => {
    expect(Object.isFrozen(model.TRANSITIONS)).toBe(true);
    for (const s of model.STATUSES) expect(Array.isArray(model.TRANSITIONS[s])).toBe(true);
  });
  it('terminal statuses (completed/cancelled) have no transitions', () => {
    expect(model.TRANSITIONS.completed).toEqual([]);
    expect(model.TRANSITIONS.cancelled).toEqual([]);
  });
  it('every non-terminal status can reach cancelled', () => {
    for (const s of model.STATUSES) {
      if (s === 'completed' || s === 'cancelled') continue;
      expect(model.TRANSITIONS[s]).toContain('cancelled');
    }
  });
  it('all transition targets are valid statuses', () => {
    for (const targets of Object.values(model.TRANSITIONS)) {
      for (const t of targets) expect(model.STATUSES).toContain(t);
    }
  });
  it('every status is BFS-reachable from pending', () => {
    const seen = new Set(['pending']);
    const q = ['pending'];
    while (q.length) {
      for (const n of model.TRANSITIONS[q.shift()] || []) {
        if (!seen.has(n)) {
          seen.add(n);
          q.push(n);
        }
      }
    }
    for (const s of model.STATUSES) expect(seen.has(s)).toBe(true);
  });
});

describe('W682 Sponsorship — canonical refs', () => {
  it('donorId refs Donor', () => {
    expect(MODEL_SRC).toMatch(/donorId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Donor['"]/);
  });
  it('beneficiaryId refs Beneficiary', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });
  it('branchId refs Branch', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });
  it('payments[].donationId cross-links Donation', () => {
    expect(MODEL_SRC).toMatch(/donationId\s*:\s*\{[\s\S]{0,150}ref\s*:\s*['"]Donation['"]/);
  });
});

describe('W682 Sponsorship — Wave-18 invariants', () => {
  it('declares __invariants validate', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });
  it('blocks recurring type without monthlyAmount > 0', () => {
    expect(MODEL_SRC).toMatch(
      /RECURRING_TYPES\.includes[\s\S]{0,120}invalidate\(['"]monthlyAmount['"]/
    );
  });
  it('blocks status=paused without pauseReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]paused['"][\s\S]{0,200}invalidate\(['"]pauseReason['"]/
    );
  });
  it('blocks status=cancelled without cancelReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]cancelled['"][\s\S]{0,200}invalidate\(['"]cancelReason['"]/
    );
  });
  it('blocks endDate < startDate', () => {
    expect(MODEL_SRC).toMatch(/this\.endDate\s*<\s*this\.startDate/);
  });
});

describe('W682 Sponsorship — virtuals', () => {
  it('declares totalPaid virtual (ledger sum)', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]totalPaid['"]\)/);
  });
  it('declares isActive + isExpired virtuals', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isActive['"]\)/);
    expect(MODEL_SRC).toMatch(/virtual\(['"]isExpired['"]\)/);
  });
});

describe('W682 sponsorship routes — endpoint surface', () => {
  it('GET / (list)', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/['"]/);
  });
  it('GET /by-beneficiary/:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/by-beneficiary\/:id['"]/);
  });
  it('GET /by-donor/:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/by-donor\/:id['"]/);
  });
  it('GET /stats', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/stats['"]/);
  });
  it('GET /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/:id['"]/);
  });
  it('POST / (create)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/['"]/);
  });
  it('POST /:id/transition (state machine)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/transition['"]/);
  });
  it('POST /:id/payment (ledger append)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/payment['"]/);
  });
  it('PATCH /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.patch\(\s*['"]\/:id['"]/);
  });
  it('DELETE /:id (admin-only)', () => {
    expect(ROUTES_SRC).toMatch(/router\.delete\(\s*['"]\/:id['"]/);
  });

  it('transition validates against TRANSITIONS (409 on illegal move)', () => {
    expect(ROUTES_SRC).toMatch(/TRANSITIONS\[/);
    expect(ROUTES_SRC).toMatch(/res\.status\(409\)/);
  });
  it('derives branchId from beneficiary when absent (branch isolation)', () => {
    expect(ROUTES_SRC).toMatch(/Beneficiary\.findById[\s\S]{0,120}branchId/);
  });
  it('authenticates + branch-scopes, never reads req.branchId', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });
});

describe('W682 wiring — registry + canonical', () => {
  it("loads via safeRequire('../routes/sponsorship.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /sponsorshipRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/sponsorship\.routes['"]\)/
    );
  });
  it('mounts at /sponsorship via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]sponsorship['"]\s*,\s*sponsorshipRoutes\s*,\s*authenticate\s*\)/
    );
  });
  it('wave comment cites W682 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 682/);
    expect(REGISTRY_SRC).toMatch(/الكفالة/);
  });
  it('canonical index registers sponsorship schema', () => {
    expect(CANONICAL_INDEX_SRC).toMatch(/require\(['"]\.\/schemas\/sponsorship\.canonical['"]\)/);
  });
});

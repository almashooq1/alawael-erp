'use strict';

/**
 * W681 drift guard — SeatAllocation + seat-allocation routes shape.
 *
 * Locks the W681 daily-occupancy / seat-allocation build:
 *   • model registers as 'SeatAllocation' with canonical Beneficiary +
 *     Branch + BeneficiarySection + WaitlistEntry refs
 *   • STATUSES / PERIODS exported and stable
 *   • Wave-18 invariants (released⇒releasedAt+releaseReason /
 *     on_hold⇒holdReason / effectiveTo≥effectiveFrom / daysOfWeek 0..6)
 *   • isActive virtual present
 *   • routes: 11 endpoints incl. /occupancy + capacity-gated POST (409)
 *     + release suggests waitlist; branch-scoped, no req.branchId
 *   • mounts at /seat-allocation via dualMountAuth + canonical registered
 *
 * Static analysis only (jest.setup.js mocks mongoose). Pair with
 * seat-allocation-behavioral-wave681.test.js.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'SeatAllocation.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'seat-allocation.routes.js'),
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

const model = require('../models/SeatAllocation');

describe('W681 SeatAllocation — exports & enums', () => {
  it('exports STATUSES (active/on_hold/released)', () => {
    expect(model.STATUSES).toEqual(['active', 'on_hold', 'released']);
  });
  it('exports PERIODS (morning/afternoon/full_day)', () => {
    expect(model.PERIODS).toEqual(['morning', 'afternoon', 'full_day']);
  });
});

describe('W681 SeatAllocation — canonical refs', () => {
  it('beneficiaryId refs Beneficiary', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });
  it('branchId refs Branch (required — capacity is per branch)', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });
  it('sectionId refs BeneficiarySection', () => {
    expect(MODEL_SRC).toMatch(
      /sectionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]BeneficiarySection['"]/
    );
  });
  it('waitlistEntryId refs WaitlistEntry (provenance)', () => {
    expect(MODEL_SRC).toMatch(
      /waitlistEntryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]WaitlistEntry['"]/
    );
  });
});

describe('W681 SeatAllocation — Wave-18 invariants', () => {
  it('declares __invariants validate', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });
  it('blocks status=released without releasedAt', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]released['"][\s\S]{0,200}invalidate\(['"]releasedAt['"]/
    );
  });
  it('blocks status=released without releaseReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]released['"][\s\S]{0,400}invalidate\(['"]releaseReason['"]/
    );
  });
  it('blocks status=on_hold without holdReason', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]on_hold['"][\s\S]{0,200}invalidate\(['"]holdReason['"]/
    );
  });
  it('blocks effectiveTo < effectiveFrom', () => {
    expect(MODEL_SRC).toMatch(/this\.effectiveTo\s*<\s*this\.effectiveFrom/);
  });
  it('validates daysOfWeek range 0..6', () => {
    expect(MODEL_SRC).toMatch(/invalidate\(['"]daysOfWeek['"]/);
  });
});

describe('W681 SeatAllocation — virtuals', () => {
  it('declares isActive virtual', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isActive['"]\)/);
  });
});

describe('W681 seat-allocation routes — endpoint surface', () => {
  it('GET /occupancy', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/occupancy['"]/);
  });
  it('GET / (list)', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/['"]/);
  });
  it('GET /by-beneficiary/:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/by-beneficiary\/:id['"]/);
  });
  it('GET /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/:id['"]/);
  });
  it('POST / (allocate)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/['"]/);
  });
  it('POST /:id/hold', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/hold['"]/);
  });
  it('POST /:id/release', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/release['"]/);
  });
  it('POST /:id/reactivate', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/reactivate['"]/);
  });
  it('PATCH /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.patch\(\s*['"]\/:id['"]/);
  });
  it('DELETE /:id (admin-only)', () => {
    expect(ROUTES_SRC).toMatch(/router\.delete\(\s*['"]\/:id['"]/);
  });

  it('capacity gate returns 409 when branch is full', () => {
    expect(ROUTES_SRC).toMatch(/allocated\s*>=\s*capacity/);
    expect(ROUTES_SRC).toMatch(/res\.status\(409\)/);
  });

  it('occupancy reads Branch.capacity.max_patients', () => {
    expect(ROUTES_SRC).toMatch(/capacity\?\.max_patients/);
  });

  it('release suggests next from waitlist (WaitlistEntry)', () => {
    expect(ROUTES_SRC).toMatch(/suggestedFromWaitlist/);
    expect(ROUTES_SRC).toMatch(/lazyModel\(['"]WaitlistEntry['"]\)/);
  });

  it('authenticates + branch-scopes, never reads req.branchId', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });
});

describe('W681 wiring — registry + canonical', () => {
  it("loads via safeRequire('../routes/seat-allocation.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /seatAllocationRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/seat-allocation\.routes['"]\)/
    );
  });
  it('mounts at /seat-allocation via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]seat-allocation['"]\s*,\s*seatAllocationRoutes\s*,\s*authenticate\s*\)/
    );
  });
  it('wave comment cites W681 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 681/);
    expect(REGISTRY_SRC).toMatch(/تخصيص المقاعد/);
  });
  it('canonical index registers seat-allocation schema', () => {
    expect(CANONICAL_INDEX_SRC).toMatch(
      /require\(['"]\.\/schemas\/seat-allocation\.canonical['"]\)/
    );
  });
});

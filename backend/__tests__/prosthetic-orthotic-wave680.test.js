'use strict';

/**
 * W680 drift guard — ProstheticOrthoticOrder + prosthetic-orthotic routes
 * shape integrity.
 *
 * Locks the shape of the W680 P&O fabrication/fitting clinic build:
 *   • model registers as 'ProstheticOrthoticOrder' with canonical
 *     Beneficiary + Branch + CarePlanVersion refs + AssistiveDevice
 *     cross-link (W324/W329/W325c compliant)
 *   • enum constants exported and don't shrink without a wave commit
 *   • TRANSITIONS state machine is frozen + BFS-reachable from 'prescribed'
 *   • Wave-18 invariants block (outsourced⇒vendor / casting⇒castingDate /
 *     delivered⇒deliveredDate / refabricate⇒fittingNotes /
 *     cancelled⇒cancelReason / seating⇒posturalAssessment)
 *   • isOverdueFollowUp virtual present
 *   • route file declares 11 endpoints + mounts at /prosthetic-orthotic
 *     via dualMountAuth (NOT plain dualMount — must require auth)
 *
 * Static analysis only — backend/jest.setup.js mocks mongoose, so this
 * guard reads source as text rather than instantiating documents. Pair
 * with prosthetic-orthotic-behavioral-wave680.test.js (runtime).
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'ProstheticOrthoticOrder.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'prosthetic-orthotic.routes.js'),
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

const model = require('../models/ProstheticOrthoticOrder');

// ═══════════════════════════════════════════════════════════════════════
// Model — exports + enums
// ═══════════════════════════════════════════════════════════════════════

describe('W680 ProstheticOrthoticOrder — exports & enums', () => {
  it('exports CATEGORIES with the 11 P&O/seating device families', () => {
    expect(Array.isArray(model.CATEGORIES)).toBe(true);
    const expected = [
      'afo',
      'kafo',
      'spinal_orthosis',
      'upper_limb_orthosis',
      'cranial_orthosis',
      'foot_orthosis',
      'lower_limb_prosthesis',
      'upper_limb_prosthesis',
      'wheelchair_seating',
      'standing_frame',
      'other',
    ];
    expect(model.CATEGORIES).toEqual(expect.arrayContaining(expected));
    expect(model.CATEGORIES.length).toBe(expected.length);
  });

  it('exports STAGES with the 8-state fabrication lifecycle', () => {
    expect(model.STAGES).toEqual([
      'prescribed',
      'measured',
      'fabrication',
      'fitting',
      'delivered',
      'follow_up',
      'completed',
      'cancelled',
    ]);
  });

  it('exports LATERALITY / FABRICATION_TYPES / FIT_OUTCOMES / FUNDING_SOURCES', () => {
    expect(model.LATERALITY).toEqual(['left', 'right', 'bilateral', 'not_applicable']);
    expect(model.FABRICATION_TYPES).toEqual(['in_house', 'outsourced']);
    expect(model.FIT_OUTCOMES).toEqual(['good_fit', 'adjustment_needed', 'refabricate']);
    expect(model.FUNDING_SOURCES).toEqual(
      expect.arrayContaining(['insurance', 'sponsorship', 'self_pay', 'ministry', 'charity'])
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Model — TRANSITIONS state machine
// ═══════════════════════════════════════════════════════════════════════

describe('W680 ProstheticOrthoticOrder — TRANSITIONS', () => {
  it('is a frozen object keyed by every stage', () => {
    expect(Object.isFrozen(model.TRANSITIONS)).toBe(true);
    for (const s of model.STAGES) {
      expect(Array.isArray(model.TRANSITIONS[s])).toBe(true);
    }
  });

  it('terminal stages (completed/cancelled) have no outgoing transitions', () => {
    expect(model.TRANSITIONS.completed).toEqual([]);
    expect(model.TRANSITIONS.cancelled).toEqual([]);
  });

  it('every non-terminal stage can reach cancelled', () => {
    for (const s of model.STAGES) {
      if (s === 'completed' || s === 'cancelled') continue;
      expect(model.TRANSITIONS[s]).toContain('cancelled');
    }
  });

  it('fitting can loop back to fabrication (re-fabricate)', () => {
    expect(model.TRANSITIONS.fitting).toContain('fabrication');
  });

  it('all transition targets are valid stages (no typos)', () => {
    for (const targets of Object.values(model.TRANSITIONS)) {
      for (const t of targets) expect(model.STAGES).toContain(t);
    }
  });

  it('every stage is BFS-reachable from prescribed', () => {
    const seen = new Set(['prescribed']);
    const queue = ['prescribed'];
    while (queue.length) {
      const cur = queue.shift();
      for (const next of model.TRANSITIONS[cur] || []) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    for (const s of model.STAGES) expect(seen.has(s)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Model — canonical refs
// ═══════════════════════════════════════════════════════════════════════

describe('W680 ProstheticOrthoticOrder — canonical refs', () => {
  it('beneficiaryId refs Beneficiary (NOT User / Patient / Student)', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });

  it('branchId refs Branch (NOT Center / Organization)', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });

  it('carePlanVersionId refs CarePlanVersion (canonical W41 plan model)', () => {
    expect(MODEL_SRC).toMatch(
      /carePlanVersionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]CarePlanVersion['"]/
    );
  });

  it('deliveredDeviceId cross-links AssistiveDevice (W359)', () => {
    expect(MODEL_SRC).toMatch(
      /deliveredDeviceId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]AssistiveDevice['"]/
    );
  });

  it('prescribedBy / measuredBy / fittedBy ref User', () => {
    expect(MODEL_SRC).toMatch(/prescribedBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/fittedBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Model — Wave-18 invariants block (static analysis)
// ═══════════════════════════════════════════════════════════════════════

describe('W680 ProstheticOrthoticOrder — Wave-18 invariants', () => {
  it('declares __invariants virtual path', () => {
    expect(MODEL_SRC).toMatch(/__invariants/);
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('blocks fabricationType=outsourced without vendorName', () => {
    expect(MODEL_SRC).toMatch(
      /fabricationType\s*===\s*['"]outsourced['"][\s\S]{0,200}invalidate\(['"]vendorName['"]/
    );
  });

  it('blocks castingRequired=true without castingDate', () => {
    expect(MODEL_SRC).toMatch(/this\.castingRequired[\s\S]{0,200}invalidate\(['"]castingDate['"]/);
  });

  it('blocks delivered-or-later stage without deliveredDate', () => {
    expect(MODEL_SRC).toMatch(/DELIVERED_OR_LATER[\s\S]{0,200}invalidate\(['"]deliveredDate['"]/);
  });

  it('blocks fitOutcome=refabricate without fittingNotes', () => {
    expect(MODEL_SRC).toMatch(
      /fitOutcome\s*===\s*['"]refabricate['"][\s\S]{0,200}invalidate\(['"]fittingNotes['"]/
    );
  });

  it('blocks stage=cancelled without cancelReason', () => {
    expect(MODEL_SRC).toMatch(
      /stage\s*===\s*['"]cancelled['"][\s\S]{0,200}invalidate\(['"]cancelReason['"]/
    );
  });

  it('blocks wheelchair_seating past fabrication without posturalAssessment', () => {
    expect(MODEL_SRC).toMatch(
      /wheelchair_seating['"][\s\S]{0,300}invalidate\(\s*['"]posturalAssessment['"]/
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Model — virtuals
// ═══════════════════════════════════════════════════════════════════════

describe('W680 ProstheticOrthoticOrder — virtuals', () => {
  it('declares isOverdueFollowUp virtual', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isOverdueFollowUp['"]\)/);
  });

  it('declares isActive virtual', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isActive['"]\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Routes — 11 endpoints + canonical mount
// ═══════════════════════════════════════════════════════════════════════

describe('W680 prosthetic-orthotic routes — endpoint surface', () => {
  it('GET /overdue-followups', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/overdue-followups['"]/);
  });
  it('GET / (list w/ filters)', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/['"]/);
  });
  it('GET /by-beneficiary/:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/by-beneficiary\/:id['"]/);
  });
  it('GET /stats', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/stats['"]/);
  });
  it('GET /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/:id['"]/);
  });
  it('POST / (prescribe)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/['"]/);
  });
  it('POST /:id/transition (state machine)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/transition['"]/);
  });
  it('POST /:id/follow-up', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/follow-up['"]/);
  });
  it('POST /:id/notify-parent', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/notify-parent['"]/);
  });
  it('PATCH /:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.patch\(\s*['"]\/:id['"]/);
  });
  it('DELETE /:id (admin-only)', () => {
    expect(ROUTES_SRC).toMatch(/router\.delete\(\s*['"]\/:id['"]/);
  });

  it('authenticates via router.use(authenticateToken)', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
  });

  it('enforces branch scope (requireBranchAccess + branchFilter)', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    const branchFilterUses = ROUTES_SRC.match(/branchFilter\(req\)/g) || [];
    expect(branchFilterUses.length).toBeGreaterThanOrEqual(7);
  });

  it('never reads req.branchId (W269h class)', () => {
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });

  it('transition endpoint validates against TRANSITIONS (409 on illegal move)', () => {
    expect(ROUTES_SRC).toMatch(/TRANSITIONS\[/);
    expect(ROUTES_SRC).toMatch(/res\.status\(409\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// features.registry.js mount + canonical index registration
// ═══════════════════════════════════════════════════════════════════════

describe('W680 wiring — registry + canonical', () => {
  it("loads via safeRequire('../routes/prosthetic-orthotic.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /prostheticOrthoticRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/prosthetic-orthotic\.routes['"]\)/
    );
  });

  it('mounts at /prosthetic-orthotic via dualMountAuth (NOT plain dualMount)', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]prosthetic-orthotic['"]\s*,\s*prostheticOrthoticRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W680 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 680/);
    expect(REGISTRY_SRC).toMatch(/عيادة الأطراف/);
  });

  it('canonical index registers prosthetic-orthotic-order schema', () => {
    expect(CANONICAL_INDEX_SRC).toMatch(
      /require\(['"]\.\/schemas\/prosthetic-orthotic-order\.canonical['"]\)/
    );
  });
});

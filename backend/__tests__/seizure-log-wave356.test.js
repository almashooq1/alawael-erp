'use strict';

/**
 * W356 drift guard — SeizureEvent + seizure-log routes shape integrity.
 *
 * Locks the shape of the W356 build so future drift can't silently
 * degrade the design:
 *   • model registers as 'SeizureEvent' with canonical Beneficiary +
 *     Branch refs (W324+W329 compliant) + MAR cross-link
 *   • enum constants exported from the model and don't shrink without
 *     a wave commit updating this guard's baselines
 *   • Wave-18 invariants block: type required, consciousness=lost ⇒
 *     witness, injury ⇒ injuryNotes+parentNotified, ambulance ⇒
 *     parentNotified, status=reviewed ⇒ reviewer+reviewedAt
 *   • isStatusEpilepticusCandidate virtual present (≥ 300 sec threshold)
 *   • route file declares 11 endpoints + mounts at /seizure-log via
 *     dualMountAuth (NOT plain dualMount — must require auth)
 *
 * Static analysis only — backend/jest.setup.js mocks mongoose, so this
 * guard reads the source as text rather than instantiating documents.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'SeizureEvent.js'), 'utf8');
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'seizure-log.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/SeizureEvent');

// ═══════════════════════════════════════════════════════════════════════
// Model — exports + enums
// ═══════════════════════════════════════════════════════════════════════

describe('W356 SeizureEvent — exports & enums', () => {
  it('exports TYPES with the 8 ILAE simplified classifications', () => {
    expect(Array.isArray(model.TYPES)).toBe(true);
    const expected = [
      'tonic_clonic',
      'absence',
      'focal_aware',
      'focal_impaired',
      'myoclonic',
      'atonic',
      'tonic',
      'unknown',
    ];
    expect(model.TYPES).toEqual(expect.arrayContaining(expected));
    expect(model.TYPES.length).toBe(expected.length);
  });

  it('exports CONSCIOUSNESS_LEVELS with 3 graded levels', () => {
    expect(model.CONSCIOUSNESS_LEVELS).toEqual(['aware', 'impaired', 'lost']);
  });

  it('exports SEVERITY with mild/moderate/severe', () => {
    expect(model.SEVERITY).toEqual(['mild', 'moderate', 'severe']);
  });

  it('exports STATUSES with recorded/reviewed (2-state lifecycle)', () => {
    expect(model.STATUSES).toEqual(['recorded', 'reviewed']);
  });

  it('exports NOTIFICATION_METHODS including 5 canonical channels', () => {
    expect(model.NOTIFICATION_METHODS).toEqual(
      expect.arrayContaining(['phone', 'sms', 'in_person', 'whatsapp', 'email'])
    );
    expect(model.NOTIFICATION_METHODS.length).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Model — canonical refs (W324+W329 / W325c compliant)
// ═══════════════════════════════════════════════════════════════════════

describe('W356 SeizureEvent — canonical refs', () => {
  it('beneficiaryId refs Beneficiary (NOT User / Patient / Student)', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });

  it('branchId refs Branch (NOT Center / Organization)', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });

  it('sectionId refs BeneficiarySection', () => {
    expect(MODEL_SRC).toMatch(
      /sectionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]BeneficiarySection['"]/
    );
  });

  it('carePlanVersionId refs CarePlanVersion (canonical W41 plan model)', () => {
    expect(MODEL_SRC).toMatch(
      /carePlanVersionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]CarePlanVersion['"]/
    );
  });

  it('rescueMedicationMarId refs MedicationAdministrationRecord (W191b cross-link)', () => {
    expect(MODEL_SRC).toMatch(
      /rescueMedicationMarId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]MedicationAdministrationRecord['"]/
    );
  });

  it('witnessedBy + reviewedBy ref User', () => {
    expect(MODEL_SRC).toMatch(/witnessedBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/reviewedBy\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Model — Wave-18 invariants block (static analysis)
// ═══════════════════════════════════════════════════════════════════════

describe('W356 SeizureEvent — Wave-18 invariants', () => {
  it('declares __invariants virtual path', () => {
    expect(MODEL_SRC).toMatch(/__invariants/);
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('blocks consciousness=lost without witness', () => {
    expect(MODEL_SRC).toMatch(
      /consciousness\s*===\s*['"]lost['"][\s\S]{0,200}invalidate\(['"]witnessedBy['"]/
    );
  });

  it('blocks injury=true without injuryNotes', () => {
    expect(MODEL_SRC).toMatch(/this\.injury[\s\S]{0,400}invalidate\(['"]injuryNotes['"]/);
  });

  it('blocks injury=true without parentNotifiedAt', () => {
    expect(MODEL_SRC).toMatch(/this\.injury[\s\S]{0,600}invalidate\(['"]parentNotifiedAt['"]/);
  });

  it('blocks ambulanceCalled=true without parentNotifiedAt', () => {
    expect(MODEL_SRC).toMatch(/ambulanceCalled[\s\S]{0,400}invalidate\(['"]parentNotifiedAt['"]/);
  });

  it('blocks rescue med named without rescueMedicationAt', () => {
    expect(MODEL_SRC).toMatch(
      /rescueMedicationGivenName[\s\S]{0,400}invalidate\(['"]rescueMedicationAt['"]/
    );
  });

  it('blocks status=reviewed without reviewer + reviewedAt', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]reviewed['"][\s\S]{0,400}invalidate\(['"]reviewedBy['"]/
    );
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]reviewed['"][\s\S]{0,600}invalidate\(['"]reviewedAt['"]/
    );
  });

  it('blocks endTime < startTime', () => {
    expect(MODEL_SRC).toMatch(/this\.endTime\s*<\s*this\.startTime/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Model — status epilepticus virtual (ILAE 2015: ≥ 5 min = emergency)
// ═══════════════════════════════════════════════════════════════════════

describe('W356 SeizureEvent — status epilepticus virtual', () => {
  it('declares isStatusEpilepticusCandidate virtual', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isStatusEpilepticusCandidate['"]\)/);
  });

  it('threshold is exactly 300 seconds (ILAE 2015 = 5 min)', () => {
    // Search the virtual's getter for the 300 threshold
    expect(MODEL_SRC).toMatch(
      /isStatusEpilepticusCandidate[\s\S]{0,300}durationSeconds\s*>=\s*300/
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Routes — 11 endpoints + canonical mount
// ═══════════════════════════════════════════════════════════════════════

describe('W356 seizure-log routes — endpoint surface', () => {
  it('GET /today', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/today['"]/);
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

  it('POST / (create)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/['"]/);
  });

  it('POST /:id/notify-parent', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/notify-parent['"]/);
  });

  it('POST /:id/notify-supervisor', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/notify-supervisor['"]/);
  });

  it('POST /:id/review', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/:id\/review['"]/);
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

  it('blocks edits after review (409 in PATCH + notify routes)', () => {
    // Both notify routes + PATCH must check status==='reviewed' and return 409
    const reviewedBlocks = ROUTES_SRC.match(/status\s*===\s*['"]reviewed['"]/g) || [];
    expect(reviewedBlocks.length).toBeGreaterThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// features.registry.js mount
// ═══════════════════════════════════════════════════════════════════════

describe('W356 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/seizure-log.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /seizureLogRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/seizure-log\.routes['"]\)/
    );
  });

  it('mounts at /seizure-log via dualMountAuth (NOT plain dualMount)', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]seizure-log['"]\s*,\s*seizureLogRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W356 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 356/);
    expect(REGISTRY_SRC).toMatch(/سجل النوبات الصرعية/);
  });
});

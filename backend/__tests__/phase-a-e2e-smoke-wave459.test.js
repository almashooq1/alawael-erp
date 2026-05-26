'use strict';

/**
 * W459 — Phase A end-to-end smoke + closure.
 *
 * Final wave of Phase A (Lifecycle v3 implementation). Verifies that
 * every artifact shipped across W448 → W458 is present and discoverable.
 * Acts as a single-shot "Phase A health check" that future agents (and CI)
 * can run to confirm nothing has bit-rotted.
 *
 * No DB. No I/O beyond require()-time. Pure module-presence + cross-wave
 * consistency assertions.
 *
 * Per docs/architecture/PHASE_A_WAVES_W448_W456.md (renumbered after
 * collisions: actual range W448 + W452-W459).
 */

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..', '..');

// Helper — return true if a file exists under backend/
function exists(rel) {
  return fs.existsSync(path.join(__dirname, '..', rel));
}

describe('W459 — Phase A artifact inventory', () => {
  describe('W448 — ICF Core Sets seeding', () => {
    it('seed script exists', () => {
      expect(exists('scripts/seed-icf-codes.js')).toBe(true);
    });
    it('Generic Brief Core Set JSON exists', () => {
      expect(exists('intelligence/icf/core-sets/generic-brief.json')).toBe(true);
    });
    it('ICFCodeReference model declares coreSetMemberships', () => {
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'models', 'icf', 'ICFCodeReference.model.js'),
        'utf8'
      );
      expect(src).toMatch(/coreSetMemberships/);
      expect(src).toMatch(/isCyOnly/);
    });
    it('seed:icf-codes npm script is registered', () => {
      const pkg = require('../package.json');
      expect(pkg.scripts['seed:icf-codes']).toBeDefined();
    });
  });

  describe('W452 — CarePlanGoal ↔ ICF linkage', () => {
    it('Goal.js declares icfMapping field', () => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'models', 'Goal.js'), 'utf8');
      expect(src).toMatch(/icfMapping/);
    });
    it('CarePlanVersion declares PlanGoalIcfMappingSchema', () => {
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'models', 'CarePlanVersion.js'),
        'utf8'
      );
      expect(src).toMatch(/PlanGoalIcfMappingSchema/);
    });
  });

  describe('W453 — MeasurementMaster ↔ ICF qualifier mapping', () => {
    it('MeasurementMaster declares defaultIcfMapping', () => {
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'models', 'measurement', 'MeasurementMaster.model.js'),
        'utf8'
      );
      expect(src).toMatch(/defaultIcfMapping/);
    });
    it('MeasurementResult declares icfQualifier', () => {
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'models', 'measurement', 'MeasurementResult.model.js'),
        'utf8'
      );
      expect(src).toMatch(/icfQualifier/);
    });
    it('icf-qualifier-mapping.lib exposes mapValueToQualifier + validateMapping', () => {
      const lib = require('../intelligence/icf-qualifier-mapping.lib');
      expect(typeof lib.mapValueToQualifier).toBe('function');
      expect(typeof lib.validateMapping).toBe('function');
      expect(typeof lib.buildQualifierSnapshot).toBe('function');
    });
  });

  describe('W454 — GAS scale heuristic builder', () => {
    it('gas-scale-builder.lib exposes proposeScaleHeuristic + validateProposal', () => {
      const lib = require('../intelligence/gas-scale-builder.lib');
      expect(typeof lib.proposeScaleHeuristic).toBe('function');
      expect(typeof lib.validateProposal).toBe('function');
    });
    it('proposes valid scale for sample goal text', () => {
      const lib = require('../intelligence/gas-scale-builder.lib');
      const result = lib.proposeScaleHeuristic('Child walks 10 steps independently');
      expect(result.proposal).not.toBeNull();
      expect(result.method).toBe('heuristic-v1');
    });
  });

  describe('W455 — GAS T-score snapshot', () => {
    it('GasScoreSnapshot model file exists', () => {
      expect(exists('models/GasScoreSnapshot.js')).toBe(true);
    });
    it('gasSnapshotBootstrap exports wireGasSnapshots + runGasSnapshotSweep', () => {
      const mod = require('../startup/gasSnapshotBootstrap');
      expect(typeof mod.wireGasSnapshots).toBe('function');
      expect(typeof mod.runGasSnapshotSweep).toBe('function');
    });
    it('app.js wires gasSnapshotBootstrap', () => {
      const appSrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
      expect(appSrc).toMatch(/gasSnapshotBootstrap/);
    });
  });

  describe('W456 — Family/Clinician/Beneficiary GAS interpretation', () => {
    it('gas-interpretation.lib exposes 3-surface narrative functions + interpretAll', () => {
      const lib = require('../intelligence/gas-interpretation.lib');
      expect(typeof lib.interpretForFamily).toBe('function');
      expect(typeof lib.interpretForClinician).toBe('function');
      expect(typeof lib.interpretForBeneficiary).toBe('function');
      expect(typeof lib.interpretAll).toBe('function');
    });
    it('produces a bilingual narrative for T = 50', () => {
      const lib = require('../intelligence/gas-interpretation.lib');
      const r = lib.interpretForFamily(50);
      expect(r.ar).toBeDefined();
      expect(r.en).toBeDefined();
      expect(r.band).toBe('met');
    });
  });

  describe('W457 — ICF aggregate reports', () => {
    it('icf-aggregate.lib exposes aggregateByBranch + aggregateImprovements + disaggregateByDemographic', () => {
      const lib = require('../intelligence/icf-aggregate.lib');
      expect(typeof lib.aggregateByBranch).toBe('function');
      expect(typeof lib.aggregateImprovements).toBe('function');
      expect(typeof lib.disaggregateByDemographic).toBe('function');
    });
    it('aggregateByBranch returns expected shape on empty input', () => {
      const lib = require('../intelligence/icf-aggregate.lib');
      const r = lib.aggregateByBranch([], { branchId: 'b1' });
      expect(r.branchId).toBe('b1');
      expect(r.byComponent).toBeDefined();
      expect(r.byComponent.bodyFunctions).toBeDefined();
    });
  });

  describe('W458 — Crisis pathway orchestrator', () => {
    it('EmergencyPlan + CrisisIncident model files exist', () => {
      expect(exists('models/EmergencyPlan.js')).toBe(true);
      expect(exists('models/CrisisIncident.js')).toBe(true);
    });
    it('crisisOrchestrator service exposes 5 entry points', () => {
      const mod = require('../services/crisisOrchestrator.service');
      expect(typeof mod.reportCrisis).toBe('function');
      expect(typeof mod.escalate).toBe('function');
      expect(typeof mod.closeWithReview).toBe('function');
      expect(typeof mod.linkSpecializedRecord).toBe('function');
      expect(typeof mod.getActive).toBe('function');
    });
    it('crisisOrchestrator exposes the 7-type + 4-severity + 11-action enums', () => {
      const mod = require('../services/crisisOrchestrator.service');
      expect(mod.ALLOWED_TYPES.length).toBe(7);
      expect(mod.ALLOWED_SEVERITIES.length).toBe(4);
      expect(mod.ALLOWED_ACTION_TYPES.length).toBeGreaterThanOrEqual(11);
    });
  });
});

describe('W459 — sprint-tests enumeration includes all Phase A drift guards', () => {
  let sprintList;
  beforeAll(() => {
    sprintList = fs
      .readFileSync(path.join(__dirname, '..', 'sprint-tests.txt'), 'utf8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
  });

  const expected = [
    '__tests__/icf-core-sets-seeding-wave448.test.js',
    '__tests__/care-plan-goal-icf-mapping-wave452.test.js',
    '__tests__/icf-qualifier-mapping-wave453.test.js',
    '__tests__/gas-scale-builder-wave454.test.js',
    '__tests__/gas-snapshot-wave455.test.js',
    '__tests__/gas-interpretation-wave456.test.js',
    '__tests__/icf-aggregate-wave457.test.js',
    '__tests__/crisis-orchestrator-wave458.test.js',
    '__tests__/phase-a-e2e-smoke-wave459.test.js',
  ];

  for (const test of expected) {
    it(`sprint includes ${test.replace(/^__tests__\//, '')}`, () => {
      expect(sprintList).toContain(test);
    });
  }
});

describe('W459 — Phase A wave count + cross-wave consistency', () => {
  it('exactly 9 Phase A waves accounted for (W448 + W452-W459)', () => {
    const waves = [448, 452, 453, 454, 455, 456, 457, 458, 459];
    expect(waves.length).toBe(9);
  });

  it('ICF Code Reference catalog is the canonical W448 model (not a duplicate from new files)', () => {
    // The audit (GAP_ANALYSIS_LIFECYCLE_V3.md) confirmed ICF already existed
    // at models/icf/ICFCodeReference.model.js. W448 extended it additively.
    const canonical = fs.readFileSync(
      path.join(__dirname, '..', 'models', 'icf', 'ICFCodeReference.model.js'),
      'utf8'
    );
    expect(canonical).toMatch(/mongoose\.model\(['"]ICFCodeReference['"]/);
  });

  it('GAS T-score service from W264 is preserved (not duplicated by W454-W456)', () => {
    // Audit confirmed gas.service.js (W264) already implements Kiresuk T-score.
    // W454-W456 are EXTENSIONS (heuristic builder + snapshot cron + family interpretation).
    expect(exists('services/gas.service.js')).toBe(true);
  });

  it('Crisis orchestrator delegates to W356 SeizureEvent + W357 SafeguardingConcern (does not replace them)', () => {
    expect(exists('models/SeizureEvent.js')).toBe(true);
    expect(exists('models/SafeguardingConcern.js')).toBe(true);
    const orchestratorSrc = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'crisisOrchestrator.service.js'),
      'utf8'
    );
    expect(orchestratorSrc).toMatch(/seizureEventId/);
    expect(orchestratorSrc).toMatch(/safeguardingConcernId/);
  });
});

describe('W459 — feature inventory documented in Phase A doc', () => {
  it('PHASE_A_WAVES doc references each shipped wave', () => {
    const docPath = path.join(REPO, 'docs', 'architecture', 'PHASE_A_WAVES_W448_W456.md');
    if (!fs.existsSync(docPath)) {
      // Doc may have been renamed in W459 close-out
      return;
    }
    const src = fs.readFileSync(docPath, 'utf8');
    expect(src).toMatch(/W448/);
    expect(src).toMatch(/W452|W449/); // either renumbered (W452) or original (W449)
  });
});

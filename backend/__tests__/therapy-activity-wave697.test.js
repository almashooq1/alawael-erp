'use strict';

/**
 * W697 drift guard — therapy-activity rollup routes + summarizeActivity.
 *
 * Locks the W697 unified cross-module therapy-activity rollup:
 *   • 2 endpoints (/by-beneficiary/:id, /summary); branch-scoped, no req.branchId
 *   • lazy mongoose.model lookups for the 6 W680-W693 models (graceful when absent)
 *   • exports a pure summarizeActivity(raw, now) helper
 *   • mounts at /therapy-activity via dualMountAuth
 *   • READ-ONLY (no persistence writes)
 * Plus behavioral assertions on the PURE summariser (no DB needed).
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'therapy-activity.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const routes = require('../routes/therapy-activity.routes');

describe('W697 therapy-activity — route shape', () => {
  it('GET /by-beneficiary/:id', () => {
    expect(SRC).toMatch(/router\.get\(\s*['"]\/by-beneficiary\/:id['"]/);
  });
  it('GET /summary', () => {
    expect(SRC).toMatch(/router\.get\(\s*['"]\/summary['"]/);
  });
  it('lazy-looks-up the 6 W680-W693 models', () => {
    for (const m of [
      'DttSession',
      'CreativeArtsTherapySession',
      'AdjunctTherapySession',
      'SensoryDietProgram',
      'InstrumentalSwallowStudy',
      'ProstheticOrthoticOrder',
    ]) {
      expect(SRC).toMatch(new RegExp(`['"]${m}['"]`));
    }
  });
  it('READ-ONLY — no persistence writes', () => {
    expect(SRC).not.toMatch(/\.save\(/);
    expect(SRC).not.toMatch(
      /\.updateOne\(|\.updateMany\(|\.findOneAndUpdate\(|\.deleteOne\(|\.deleteMany\(/
    );
  });
  it('authenticates + branch-scopes, never reads req.branchId', () => {
    expect(SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    expect(SRC).toMatch(/branchFilter\(req\)/);
    expect(SRC).not.toMatch(/req\.branchId/);
  });
  it('exports the pure summarizeActivity helper', () => {
    expect(typeof routes.summarizeActivity).toBe('function');
  });
});

describe('W697 wiring — registry', () => {
  it("loads via safeRequire('../routes/therapy-activity.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /therapyActivityRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/therapy-activity\.routes['"]\)/
    );
  });
  it('mounts at /therapy-activity via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]therapy-activity['"]\s*,\s*therapyActivityRoutes\s*,\s*authenticate\s*\)/
    );
  });
  it('wave comment cites W697 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 697/);
    expect(REGISTRY_SRC).toMatch(/المخرجات العلاجية/);
  });
});

describe('W697 summarizeActivity — pure logic (behavioral, no DB)', () => {
  const NOW = new Date('2026-06-01T00:00:00Z').getTime();
  const past = new Date('2026-05-01T00:00:00Z');
  const future = new Date('2026-07-01T00:00:00Z');

  it('empty input → zeros + zero breaches', () => {
    const s = routes.summarizeActivity({}, NOW);
    expect(s.breaches).toBe(0);
    expect(s.dtt.total).toBe(0);
    expect(s.vfss.aspiration).toBe(0);
  });

  it('picks latest DTT independent-correct rate from completed sessions', () => {
    const s = routes.summarizeActivity(
      {
        dtt: [
          { status: 'completed', independentCorrectRate: 72 }, // latest (sorted desc)
          { status: 'completed', independentCorrectRate: 40 },
          { status: 'scheduled' },
        ],
      },
      NOW
    );
    expect(s.dtt.total).toBe(3);
    expect(s.dtt.completed).toBe(2);
    expect(s.dtt.latestIndependentCorrectRate).toBe(72);
  });

  it('counts arts mood-improved + adjunct incidents', () => {
    const s = routes.summarizeActivity(
      {
        arts: [
          { status: 'completed', moodImproved: true },
          { status: 'completed', moodImproved: false },
          { status: 'scheduled', moodImproved: true },
        ],
        adjunct: [{ incidentDuringSession: true }, { incidentDuringSession: false }],
      },
      NOW
    );
    expect(s.arts.moodImproved).toBe(1);
    expect(s.adjunct.incidents).toBe(1);
    expect(s.breaches).toBe(1); // 1 adjunct incident
  });

  it('flags VFSS aspiration via flag OR PAS>=6', () => {
    const s = routes.summarizeActivity(
      {
        vfss: [
          { aspirationDetected: true, silentAspiration: true },
          { penetrationAspirationScale: 7 },
          { penetrationAspirationScale: 3 },
        ],
      },
      NOW
    );
    expect(s.vfss.aspiration).toBe(2);
    expect(s.vfss.silentAspiration).toBe(1);
    expect(s.breaches).toBe(2);
  });

  it('counts sensory review-overdue + P&O overdue follow-ups (date-based)', () => {
    const s = routes.summarizeActivity(
      {
        sensory: [
          { status: 'active', reviewDate: past }, // overdue
          { status: 'active', reviewDate: future }, // not
          { status: 'discontinued', reviewDate: past }, // not active
        ],
        pando: [
          { stage: 'follow_up', followUpDueDate: past }, // overdue
          { stage: 'fitting', followUpDueDate: future }, // not
          { stage: 'completed', followUpDueDate: past }, // terminal → not
        ],
      },
      NOW
    );
    expect(s.sensory.active).toBe(2);
    expect(s.sensory.reviewOverdue).toBe(1);
    expect(s.pando.active).toBe(2);
    expect(s.pando.overdueFollowUps).toBe(1);
    expect(s.breaches).toBe(2); // 1 sensory + 1 pando
  });

  it('breaches aggregate across modalities', () => {
    const s = routes.summarizeActivity(
      {
        adjunct: [{ incidentDuringSession: true }],
        vfss: [{ aspirationDetected: true }],
        sensory: [{ status: 'active', reviewDate: past }],
        pando: [{ stage: 'delivered', followUpDueDate: past }],
      },
      NOW
    );
    expect(s.breaches).toBe(4);
  });
});

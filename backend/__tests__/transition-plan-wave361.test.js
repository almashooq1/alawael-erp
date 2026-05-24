'use strict';

/**
 * W361 drift guard — TransitionPlan + transition-plan routes.
 *
 * Locks W361 build (graduation of in-memory scaffold):
 *   • TRANSITION_TYPES = 5 life-stage transitions
 *   • STATUSES (6) + DOMAINS (6) + MILESTONE_STATUSES (5) frozen
 *   • Wave-18 invariants: completed⇒actualDate; in_progress⇒plannedDate;
 *     non-draft⇒transitionLead; readiness_assessed⇒domainScores+composite;
 *     milestone⇒title+dueDate
 *   • virtuals: milestonesAchievedCount + milestonesProgressPct + isOverdue
 *   • 15 endpoints at /transition-plan
 *
 * Static analysis only.
 */

const fs = require('fs');
const path = require('path');

const MODEL_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'TransitionPlan.js'),
  'utf8'
);
const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'transition-plan.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const model = require('../models/TransitionPlan');

describe('W361 TransitionPlan — exports & enums', () => {
  it('exposes 5 TRANSITION_TYPES matching the scaffold', () => {
    expect(model.TRANSITION_TYPES).toEqual([
      'early_to_school',
      'school_to_secondary',
      'school_to_work',
      'rehab_to_community',
      'dependent_to_independent',
    ]);
  });

  it('exposes 6-state STATUSES lifecycle', () => {
    expect(model.STATUSES).toEqual([
      'draft',
      'readiness_assessed',
      'in_progress',
      'completed',
      'paused',
      'cancelled',
    ]);
  });

  it('exposes 6 DOMAINS for readiness scoring', () => {
    expect(model.DOMAINS).toEqual([
      'self_care',
      'communication',
      'social',
      'cognitive',
      'vocational',
      'life_skills',
    ]);
  });

  it('exposes 5 MILESTONE_STATUSES', () => {
    expect(model.MILESTONE_STATUSES).toEqual([
      'pending',
      'in_progress',
      'achieved',
      'missed',
      'cancelled',
    ]);
  });
});

describe('W361 TransitionPlan — canonical refs', () => {
  it('beneficiaryId refs Beneficiary (W324+W329)', () => {
    expect(MODEL_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Beneficiary['"]/);
  });

  it('branchId refs Branch (W326)', () => {
    expect(MODEL_SRC).toMatch(/branchId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]Branch['"]/);
  });

  it('linkedCarePlanVersionId refs CarePlanVersion (W41)', () => {
    expect(MODEL_SRC).toMatch(
      /linkedCarePlanVersionId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]CarePlanVersion['"]/
    );
  });

  it('linkedIepId refs IndividualEducationPlan (W200b)', () => {
    expect(MODEL_SRC).toMatch(
      /linkedIepId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]IndividualEducationPlan['"]/
    );
  });

  it('transitionLeadId + readinessAssessorId + reviewerId ref User', () => {
    expect(MODEL_SRC).toMatch(/transitionLeadId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/readinessAssessorId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
    expect(MODEL_SRC).toMatch(/reviewerId\s*:\s*\{[\s\S]{0,200}ref\s*:\s*['"]User['"]/);
  });
});

describe('W361 TransitionPlan — Wave-18 invariants', () => {
  it('declares __invariants virtual path', () => {
    expect(MODEL_SRC).toMatch(/path\(['"]__invariants['"]\)\.validate/);
  });

  it('status=completed requires actualTransitionDate', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]completed['"][\s\S]{0,400}invalidate\(\s*\n?\s*['"]actualTransitionDate['"]/
    );
  });

  it('status=in_progress requires plannedTransitionDate', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*===\s*['"]in_progress['"][\s\S]{0,300}invalidate\(\s*\n?\s*['"]plannedTransitionDate['"]/
    );
  });

  it('non-draft requires transitionLead', () => {
    expect(MODEL_SRC).toMatch(
      /status\s*!==\s*['"]draft['"][\s\S]{0,400}invalidate\(\s*['"]transitionLeadId['"]/
    );
  });

  it('milestone integrity (title + dueDate)', () => {
    expect(MODEL_SRC).toMatch(/milestones\.\$\{i\}\.title/);
    expect(MODEL_SRC).toMatch(/milestones\.\$\{i\}\.dueDate/);
  });
});

describe('W361 TransitionPlan — virtuals', () => {
  it('milestonesAchievedCount virtual present', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]milestonesAchievedCount['"]\)/);
    expect(MODEL_SRC).toMatch(/status\s*===\s*['"]achieved['"]/);
  });

  it('milestonesProgressPct virtual present (0-100)', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]milestonesProgressPct['"]\)/);
  });

  it('isOverdue virtual present', () => {
    expect(MODEL_SRC).toMatch(/virtual\(['"]isOverdue['"]\)/);
  });
});

describe('W361 transition-plan routes — endpoint surface', () => {
  const endpoints = [
    ['get', '/'],
    ['get', '/by-beneficiary/:id'],
    ['get', '/overdue'],
    ['get', '/stats'],
    ['get', '/:id'],
    ['post', '/'],
    ['post', '/:id/assess-readiness'],
    ['post', '/:id/start'],
    ['post', '/:id/complete'],
    ['post', '/:id/milestones'],
    ['patch', '/:id/milestones/:msId'],
    ['delete', '/:id/milestones/:msId'],
    ['post', '/:id/review'],
    ['patch', '/:id'],
    ['delete', '/:id'],
  ];

  for (const [verb, p] of endpoints) {
    it(`${verb.toUpperCase()} ${p}`, () => {
      const escaped = p.replace(/\//g, '\\/');
      const re = new RegExp(`router\\.${verb}\\(\\s*['"]${escaped}['"]`);
      expect(ROUTES_SRC).toMatch(re);
    });
  }

  it('authenticates via router.use(authenticateToken)', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
  });

  it('assess-readiness route computes composite score from domain scores', () => {
    expect(ROUTES_SRC).toMatch(/computeComposite/);
  });

  it('start route requires plannedTransitionDate', () => {
    expect(ROUTES_SRC).toMatch(/plannedTransitionDate\s*مطلوب/);
  });

  it('complete route blocks if not in_progress', () => {
    expect(ROUTES_SRC).toMatch(/row\.status\s*!==\s*['"]in_progress['"][\s\S]{0,300}status\(409\)/);
  });
});

describe('W361 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/transition-plan.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /transitionPlanRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/transition-plan\.routes['"]\)/
    );
  });

  it('mounts at /transition-plan via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]transition-plan['"]\s*,\s*transitionPlanRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W361 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 361/);
    expect(REGISTRY_SRC).toMatch(/خطة الانتقال/);
  });
});

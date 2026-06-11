'use strict';

/**
 * W1206 drift guard — Blueprint 43 R6: unified Next-Best-Action engine.
 *
 * Layers:
 *  1. REGISTRY — catalogue completeness, priority ordering invariants
 *     (safety always wins), cross-checks against the owning sources
 *     (goldenThread W1158 codes / MeasureAlert ALERT_TYPES / RiskSnapshot
 *     tiers / EpisodeOfCare phases) read statically from source.
 *  2. PURE RULES — each derive* helper's decision table (§4.2 rows).
 *  3. STATIC WIRING — READ-ONLY contract, W269 gates, registry mount.
 *
 * No DB — pure functions + source-as-string assertions.
 */

const fs = require('fs');
const path = require('path');

const registry = require('../intelligence/next-best-action.registry');
const svc = require('../services/nextBestAction.service');

const BACKEND = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(BACKEND, rel), 'utf8');

describe('W1206 registry — catalogue shape + cross-source sync', () => {
  test('every NBA code has a catalogue entry and vice-versa', () => {
    const codes = Object.keys(registry.NBA_CODES).sort();
    const actions = Object.keys(registry.NBA_ACTIONS).sort();
    expect(actions).toEqual(codes);
    for (const code of codes) {
      const a = registry.NBA_ACTIONS[code];
      expect(a.code).toBe(code);
      expect(typeof a.priority).toBe('number');
      expect(typeof a.titleAr).toBe('string');
      expect(typeof a.titleEn).toBe('string');
      expect(typeof a.actionAr).toBe('string');
      expect(typeof a.source).toBe('string');
    }
  });

  test('safety escalation has the single most-urgent priority', () => {
    const safety = registry.NBA_ACTIONS.ESCALATE_SAFETY.priority;
    for (const a of Object.values(registry.NBA_ACTIONS)) {
      if (a.code === 'ESCALATE_SAFETY') continue;
      expect(a.priority).toBeGreaterThan(safety);
    }
  });

  test('GOLDEN_THREAD_CODES stay in sync with goldenThread.service (W1158)', () => {
    const src = read('services/goldenThread.service.js');
    for (const code of registry.GOLDEN_THREAD_CODES) {
      expect(src).toContain(`'${code}'`);
      expect(registry.NBA_ACTIONS[code]).toBeDefined();
      expect(registry.NBA_ACTIONS[code].source).toBe('golden-thread');
    }
  });

  test('PLAN_REVIEW_ALERT_TYPES ⊂ MeasureAlert.ALERT_TYPES (source-checked)', () => {
    const src = read('domains/goals/models/MeasureAlert.js');
    for (const t of registry.PLAN_REVIEW_ALERT_TYPES) {
      expect(src).toContain(`'${t}'`);
    }
  });

  test('SAFETY_TIERS ⊂ RiskSnapshot tiers + ASSESSMENT_PHASES ⊂ episode phases', () => {
    const riskSrc = read('models/RiskSnapshot.js');
    for (const t of registry.SAFETY_TIERS) expect(riskSrc).toContain(`'${t}'`);
    const episodeSrc = read('domains/episodes/models/EpisodeOfCare.js');
    for (const p of registry.ASSESSMENT_PHASES) expect(episodeSrc).toContain(`'${p}'`);
  });

  test('catalogue is frozen; decorate() never mutates it', () => {
    expect(Object.isFrozen(registry.NBA_ACTIONS)).toBe(true);
    expect(Object.isFrozen(registry.NBA_ACTIONS.ESCALATE_SAFETY)).toBe(true);
    const d = registry.decorate('ESCALATE_SAFETY', { evidence: { x: 1 } });
    expect(d.evidence).toEqual({ x: 1 });
    expect(registry.NBA_ACTIONS.ESCALATE_SAFETY.evidence).toBeUndefined();
    expect(registry.decorate('NOT_A_CODE')).toBeNull();
  });
});

describe('W1206 pure rules (§4.2 decision table)', () => {
  const now = new Date('2026-06-11T08:00:00Z');
  const daysAgo = n => new Date(now.getTime() - n * 24 * 3600 * 1000);

  describe('deriveStaleAssessment', () => {
    const staleEpisode = {
      _id: 'e1',
      status: 'active',
      currentPhase: 'initial_assessment',
      phases: [{ name: 'initial_assessment', status: 'in_progress', startedAt: daysAgo(20) }],
    };
    test('fires after >14d in an assessment phase with an incomplete thread', () => {
      const trace = { threads: [{ threadStage: 'linked_no_baseline' }] };
      const a = svc.deriveStaleAssessment(staleEpisode, trace, now);
      expect(a).not.toBeNull();
      expect(a.code).toBe('STALE_ASSESSMENT');
      expect(a.evidence.daysInPhase).toBe(20);
    });
    test('fires when the beneficiary has no goals at all', () => {
      const a = svc.deriveStaleAssessment(staleEpisode, { threads: [] }, now);
      expect(a).not.toBeNull();
    });
    test('silent when baselines are complete', () => {
      const trace = { threads: [{ threadStage: 'complete' }] };
      expect(svc.deriveStaleAssessment(staleEpisode, trace, now)).toBeNull();
    });
    test('silent under the 14-day window / non-assessment phase / inactive episode', () => {
      const fresh = {
        ...staleEpisode,
        phases: [{ name: 'initial_assessment', status: 'in_progress', startedAt: daysAgo(5) }],
      };
      expect(svc.deriveStaleAssessment(fresh, { threads: [] }, now)).toBeNull();
      expect(
        svc.deriveStaleAssessment(
          { ...staleEpisode, currentPhase: 'active_treatment' },
          { threads: [] },
          now
        )
      ).toBeNull();
      expect(
        svc.deriveStaleAssessment({ ...staleEpisode, status: 'completed' }, { threads: [] }, now)
      ).toBeNull();
      expect(svc.deriveStaleAssessment(null, { threads: [] }, now)).toBeNull();
    });
  });

  describe('deriveReviewPlan', () => {
    test('one NBA per alert TYPE (not per alert), with ids as evidence', () => {
      const actions = svc.deriveReviewPlan([
        { _id: 'a1', alertType: 'PLATEAU_DETECTED' },
        { _id: 'a2', alertType: 'PLATEAU_DETECTED' },
        { _id: 'a3', alertType: 'REGRESSION_DETECTED' },
        { _id: 'a4', alertType: 'MCID_NOT_MET' }, // not a plan-review type
      ]);
      expect(actions).toHaveLength(2);
      const plateau = actions.find(a => a.evidence.alertType === 'PLATEAU_DETECTED');
      expect(plateau.evidence.count).toBe(2);
      expect(plateau.code).toBe('REVIEW_PLAN');
    });
    test('empty input → no actions', () => {
      expect(svc.deriveReviewPlan([])).toEqual([]);
    });
  });

  describe('deriveGoalClosure', () => {
    test('fires only for ACTIVE goals at/above the threshold', () => {
      const actions = svc.deriveGoalClosure([
        { _id: 'g1', status: 'active', currentProgress: 95, title: 'A' },
        { _id: 'g2', status: 'active', currentProgress: 50 },
        { _id: 'g3', status: 'achieved', currentProgress: 100 },
        { _id: 'g4', status: 'active' }, // no progress value
      ]);
      expect(actions).toHaveLength(1);
      expect(actions[0].code).toBe('SUGGEST_GOAL_CLOSURE');
      expect(actions[0].evidence.goalId).toBe('g1');
    });
  });

  describe('deriveSafetyEscalation', () => {
    test('fires on high/critical tier, silent otherwise', () => {
      expect(
        svc.deriveSafetyEscalation({ _id: 'r1', overallTier: 'critical', overallScore: 88 }).code
      ).toBe('ESCALATE_SAFETY');
      expect(svc.deriveSafetyEscalation({ _id: 'r2', overallTier: 'moderate' })).toBeNull();
      expect(svc.deriveSafetyEscalation(null)).toBeNull();
    });
  });

  describe('decorateThreadActions + rankActions', () => {
    test('thread actions get unified priorities; ranking puts safety first', () => {
      const thread = svc.decorateThreadActions([
        { code: 'NO_SESSIONS', goalId: 'g1', title: 'هدف', action: 'نص' },
        { code: 'LINK_MEASURE', goalId: 'g2', title: 'هدف2', action: 'نص2' },
        { code: 'UNKNOWN_CODE', goalId: 'g3' }, // dropped, never invented
      ]);
      expect(thread).toHaveLength(2);
      const ranked = svc.rankActions([
        ...thread,
        svc.deriveSafetyEscalation({ _id: 'r', overallTier: 'high' }),
      ]);
      expect(ranked[0].code).toBe('ESCALATE_SAFETY');
      expect(ranked[1].code).toBe('LINK_MEASURE');
      expect(ranked[2].code).toBe('NO_SESSIONS');
    });
  });
});

describe('W1206 static wiring', () => {
  test('service is READ-ONLY (no create/save/update calls)', () => {
    const src = read('services/nextBestAction.service.js');
    expect(src).not.toMatch(/\.create\(/);
    expect(src).not.toMatch(/\.save\(/);
    expect(src).not.toMatch(/\.updateOne\(|\.updateMany\(|\.findOneAndUpdate\(/);
    expect(src).not.toMatch(/\.deleteOne\(|\.deleteMany\(/);
  });

  test('routes: READ-ONLY surface + W269 gates + bounded caseload', () => {
    const src = read('routes/next-best-action.routes.js');
    expect(src).not.toMatch(/router\.(post|put|patch|delete)\(/);
    expect(src).toMatch(/enforceBeneficiaryBranch\(req, req\.params\.beneficiaryId\)/);
    expect(src).toMatch(/effectiveBranchScope\(req\)/);
    expect(src).toMatch(/Math\.min\(parseInt\(req\.query\.limit, 10\) \|\| 100, 300\)/);
    expect(src).not.toMatch(/req\.branchId/);
  });

  test('mounted via dualMountAuth in features.registry', () => {
    const src = read('routes/registries/features.registry.js');
    expect(src).toMatch(/safeRequire\('\.\.\/routes\/next-best-action\.routes'\)/);
    expect(src).toMatch(
      /dualMountAuth\(app, 'next-best-action', nextBestActionRoutes, authenticate\)/
    );
  });
});

'use strict';
/**
 * risk-sweeper.test.js — Wave 288
 *
 * Verifies the RiskSweeperService:
 *   1) Pure tier-transition + alert-decision math.
 *   2) End-to-end sweep using in-memory stubs for Beneficiary cursor,
 *      RiskSnapshot persistence, AiAlert creation, and the orchestrator.
 *   3) Tier escalation raises an alert; unchanged/deescalated do not.
 *   4) First-time critical without prior snapshot raises an alert.
 *   5) Per-beneficiary failure is isolated (sweep continues).
 *   6) sweepRunId is stable within a calendar day.
 */

const {
  RiskSweeperService,
  classifyTierDelta,
  shouldRaiseAlert,
  todayRunId,
} = require('../services/risk-sweeper.service');

describe('Wave 288 — Risk Sweeper', () => {
  describe('pure helpers', () => {
    test('classifyTierDelta covers all transitions', () => {
      expect(classifyTierDelta(null, 'high')).toBe('first');
      expect(classifyTierDelta('low', 'high')).toBe('escalated');
      expect(classifyTierDelta('moderate', 'critical')).toBe('escalated');
      expect(classifyTierDelta('high', 'moderate')).toBe('deescalated');
      expect(classifyTierDelta('high', 'high')).toBe('unchanged');
      expect(classifyTierDelta('high', null)).toBeNull();
    });

    test('shouldRaiseAlert fires on escalations and first-critical only', () => {
      expect(shouldRaiseAlert('escalated', 'high')).toBe(true);
      expect(shouldRaiseAlert('escalated', 'critical')).toBe(true);
      expect(shouldRaiseAlert('first', 'critical')).toBe(true);
      expect(shouldRaiseAlert('first', 'high')).toBe(false);
      expect(shouldRaiseAlert('unchanged', 'high')).toBe(false);
      expect(shouldRaiseAlert('deescalated', 'low')).toBe(false);
    });

    test('todayRunId is stable within a UTC day', () => {
      const morning = new Date('2026-05-23T01:00:00Z');
      const evening = new Date('2026-05-23T23:00:00Z');
      expect(todayRunId(morning)).toBe(todayRunId(evening));
      expect(todayRunId(morning)).toMatch(/^sweep-2026-05-23$/);
    });
  });

  describe('runSweepForBranch', () => {
    function makeDeps({ beneficiaries, getProfile, previousSnapshots = {} }) {
      const snapshotWrites = [];
      const alertWrites = [];

      // Mock async iterator cursor.
      const cursor = (async function* () {
        for (const b of beneficiaries) yield b;
      })();

      const BeneficiaryModel = {
        find: () => ({
          select: () => ({
            limit: () => ({ cursor: () => cursor }),
          }),
        }),
      };

      const RiskSnapshotModel = {
        findOne: ({ beneficiaryId }) => ({
          sort: () => ({
            select: () => ({
              lean: async () => previousSnapshots[String(beneficiaryId)] || null,
            }),
          }),
        }),
        updateOne: async (filter, update) => {
          snapshotWrites.push({ filter, update });
          return { acknowledged: true };
        },
      };

      const AiAlertModel = {
        create: async doc => {
          alertWrites.push(doc);
          return { _id: 'alert-' + alertWrites.length, ...doc };
        },
      };

      const service = new RiskSweeperService({
        getProfile,
        BeneficiaryModel,
        RiskSnapshotModel,
        AiAlertModel,
        logger: { info() {}, warn() {}, error() {} },
      });

      return { service, snapshotWrites, alertWrites };
    }

    test('escalation creates snapshot + raises alert', async () => {
      const ben = { _id: 'b1', branchId: 'br1' };
      const profile = {
        beneficiaryId: 'b1',
        episodeId: null,
        overallScore: 70,
        overallTier: 'high',
        overallTierAr: 'مرتفع',
        sources: { clinical: { source: 'clinical', available: true, score: 70, factors: [] } },
        topFactors: [{ code: 'WEEKLY_INCIDENTS', source: 'clinical', contribution: 0.4 }],
        composite: { weightUsed: 0.4, sourceCount: 1, sourcesContributing: ['clinical'] },
        computedAt: new Date().toISOString(),
        reason: 'RISK_SCORE_COMPUTED',
        explanation: 'تجريبي',
      };
      const { service, snapshotWrites, alertWrites } = makeDeps({
        beneficiaries: [ben],
        getProfile: async () => profile,
        previousSnapshots: { b1: { overallTier: 'moderate' } },
      });

      const res = await service.runSweepForBranch({ branchId: 'br1' });
      expect(res.processed).toBe(1);
      expect(res.snapshotsCreated).toBe(1);
      expect(res.alertsRaised).toBe(1);
      expect(snapshotWrites[0].update.$set.tierDelta).toBe('escalated');
      expect(snapshotWrites[0].update.$set.previousTier).toBe('moderate');
      expect(alertWrites[0].alert_type).toBe('dropout_risk');
      expect(alertWrites[0].severity).toBe('critical');
      expect(alertWrites[0].data.code).toBe('RISK_TIER_ESCALATED');
      expect(alertWrites[0].data.tierDelta).toBe('escalated');
    });

    test('unchanged tier creates snapshot but no alert', async () => {
      const ben = { _id: 'b2', branchId: 'br1' };
      const profile = {
        beneficiaryId: 'b2',
        episodeId: null,
        overallScore: 30,
        overallTier: 'moderate',
        overallTierAr: 'متوسط',
        sources: {},
        topFactors: [],
        composite: { weightUsed: 0.4, sourceCount: 1, sourcesContributing: ['clinical'] },
        computedAt: new Date().toISOString(),
        reason: 'RISK_SCORE_COMPUTED',
        explanation: 'x',
      };
      const { service, alertWrites, snapshotWrites } = makeDeps({
        beneficiaries: [ben],
        getProfile: async () => profile,
        previousSnapshots: { b2: { overallTier: 'moderate' } },
      });
      const res = await service.runSweepForBranch({ branchId: 'br1' });
      expect(res.alertsRaised).toBe(0);
      expect(snapshotWrites[0].update.$set.tierDelta).toBe('unchanged');
      expect(alertWrites).toHaveLength(0);
    });

    test('first-time critical (no prior snapshot) raises alert', async () => {
      const ben = { _id: 'b3', branchId: 'br1' };
      const profile = {
        beneficiaryId: 'b3',
        episodeId: null,
        overallScore: 92,
        overallTier: 'critical',
        overallTierAr: 'حرج',
        sources: {},
        topFactors: [],
        composite: { weightUsed: 0.4, sourceCount: 1, sourcesContributing: ['cdss'] },
        computedAt: new Date().toISOString(),
        reason: 'RISK_SCORE_COMPUTED',
        explanation: 'x',
      };
      const { service, alertWrites } = makeDeps({
        beneficiaries: [ben],
        getProfile: async () => profile,
        previousSnapshots: {}, // no history
      });
      const res = await service.runSweepForBranch({ branchId: 'br1' });
      expect(res.alertsRaised).toBe(1);
      expect(alertWrites[0].data.code).toBe('RISK_TIER_FIRST_CRITICAL');
      expect(alertWrites[0].severity).toBe('urgent');
    });

    test('per-beneficiary failure is isolated', async () => {
      const beneficiaries = [
        { _id: 'b4', branchId: 'br1' },
        { _id: 'b5', branchId: 'br1' },
      ];
      const profile = {
        beneficiaryId: 'b5',
        episodeId: null,
        overallScore: 20,
        overallTier: 'low',
        overallTierAr: 'منخفض',
        sources: {},
        topFactors: [],
        composite: { weightUsed: 0.4, sourceCount: 1, sourcesContributing: ['clinical'] },
        computedAt: new Date().toISOString(),
        reason: 'RISK_SCORE_COMPUTED',
        explanation: 'x',
      };
      let call = 0;
      const { service } = makeDeps({
        beneficiaries,
        getProfile: async () => {
          call += 1;
          if (call === 1) throw new Error('orchestrator boom');
          return profile;
        },
      });
      const res = await service.runSweepForBranch({ branchId: 'br1' });
      expect(res.processed).toBe(2);
      expect(res.snapshotsCreated).toBe(1);
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0].beneficiaryId).toBe('b4');
    });

    test('rejects missing branchId', async () => {
      const { service } = makeDeps({ beneficiaries: [], getProfile: async () => ({}) });
      await expect(service.runSweepForBranch({})).rejects.toMatchObject({
        reason: 'SUBJECT_REQUIRED',
      });
    });
  });
});

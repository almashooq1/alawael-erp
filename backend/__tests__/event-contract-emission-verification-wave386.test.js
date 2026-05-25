'use strict';

/**
 * W386 — completes the behavioral verification matrix (14/14 wired events).
 *
 * Combines W384 + W385's pattern (capture emit + strict envelopeKeysFor) with
 * deeper mongoose mocking for wires that go through:
 *   - document instance methods (.advancePhase() / .discharge() on episode)
 *   - findByIdAndUpdate.lean() chain (assessments)
 *   - findByIdAndUpdate non-chain returning a doc (quality audit)
 *   - lazy-loaded qualityEventBus (capa-producers)
 *
 * Wires covered (5 final):
 *   - episodes.PHASE_TRANSITIONED → EpisodeService.advancePhase
 *   - episodes.CLOSED              → EpisodeService.dischargeEpisode
 *   - assessments.COMPLETED        → AssessmentsService.completeAssessment
 *   - quality.AUDIT_COMPLETED      → QualityEnhancedService.submitAuditChecklist
 *                                     (emits via qualityEventBus.getDefault())
 *   - quality.CORRECTIVE_ACTION_REQUIRED → capa-producers.createCapaFromAuditFinding
 *                                          (emits via qualityEventBus.getDefault())
 *
 * For qualityEventBus emits, we subscribe to the actual bus singleton BEFORE
 * calling the service — both call sites resolve to the same instance via
 * getDefault(), so subscribing in the test catches the emit naturally.
 */

const mongoose = require('mongoose');
const contracts = require('../events/contracts/dddEventContracts');

function envelopeKeysFor(group, key) {
  return Object.keys(contracts.DDD_CONTRACTS[group][key].payload).sort();
}

// ─── 1) episodes.PHASE_TRANSITIONED ────────────────────────────────────────

describe('W386 — EpisodeService.advancePhase emits episode.phase_transitioned', () => {
  it('emits with canonical envelope including fromPhase captured BEFORE transition', async () => {
    const fakeEpisode = {
      _id: 'ep-test-2',
      beneficiaryId: 'bene-test-2',
      currentPhase: 'referral',
      advancePhase: jest.fn(async function (_userId) {
        this.currentPhase = 'assessment'; // mutate to new phase
        return { currentPhase: this.currentPhase };
      }),
    };

    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'EpisodeOfCare') {
        return {
          findById: jest.fn(async () => fakeEpisode),
        };
      }
      return {};
    });

    const episodesDomain = require('../domains/episodes');
    if (typeof episodesDomain.initialize === 'function' && !episodesDomain._initialized) {
      await episodesDomain.initialize();
    }
    const svc = episodesDomain.service;
    // Force repository.model to use the mocked mongoose lookup
    svc.repository = { model: mongoose.model('EpisodeOfCare') };

    const captured = [];
    const handler = p => captured.push(p);
    svc.on('episode.phase_transitioned', handler);

    try {
      await svc.advancePhase('ep-test-2', 'user-test-1');

      expect(captured).toHaveLength(1);
      const payload = captured[0];
      const expectedKeys = envelopeKeysFor('episodes', 'PHASE_TRANSITIONED');
      expect(Object.keys(payload).sort()).toEqual(expectedKeys);
      expect(payload.episodeId).toBe('ep-test-2');
      expect(payload.beneficiaryId).toBe('bene-test-2');
      expect(payload.fromPhase).toBe('referral'); // captured BEFORE mutation
      expect(payload.toPhase).toBe('assessment'); // post-transition
      expect(payload.performedBy).toBe('user-test-1');
    } finally {
      svc.off('episode.phase_transitioned', handler);
      jest.restoreAllMocks();
    }
  });
});

// ─── 2) episodes.CLOSED ────────────────────────────────────────────────────

describe('W386 — EpisodeService.dischargeEpisode emits episode.closed', () => {
  it('emits with computed durationDays + outcome fallback chain', async () => {
    const startDate = new Date(Date.now() - 30 * 86400000); // 30 days ago
    const fakeEpisode = {
      _id: 'ep-test-3',
      beneficiaryId: 'bene-test-3',
      startDate,
      discharge: jest.fn(async () => ({ status: 'finished' })),
    };

    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'EpisodeOfCare') {
        return { findById: jest.fn(async () => fakeEpisode) };
      }
      return {};
    });

    const episodesDomain = require('../domains/episodes');
    if (typeof episodesDomain.initialize === 'function' && !episodesDomain._initialized) {
      await episodesDomain.initialize();
    }
    const svc = episodesDomain.service;
    svc.repository = { model: mongoose.model('EpisodeOfCare') };

    const captured = [];
    const handler = p => captured.push(p);
    svc.on('episode.closed', handler);

    try {
      await svc.dischargeEpisode('ep-test-3', { outcome: 'recovered', reason: 'goals met' });

      expect(captured).toHaveLength(1);
      const payload = captured[0];
      const expectedKeys = envelopeKeysFor('episodes', 'CLOSED');
      expect(Object.keys(payload).sort()).toEqual(expectedKeys);
      expect(payload.episodeId).toBe('ep-test-3');
      expect(payload.beneficiaryId).toBe('bene-test-3');
      expect(payload.outcome).toBe('recovered'); // explicit outcome wins fallback
      expect(payload.durationDays).toBe(30); // computed from startDate
    } finally {
      svc.off('episode.closed', handler);
      jest.restoreAllMocks();
    }
  });

  it('outcome falls back to data.reason when outcome is absent', async () => {
    const fakeEpisode = {
      _id: 'ep-test-4',
      beneficiaryId: 'bene-test-4',
      startDate: new Date(),
      discharge: jest.fn(async () => ({})),
    };

    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'EpisodeOfCare') return { findById: jest.fn(async () => fakeEpisode) };
      return {};
    });

    const episodesDomain = require('../domains/episodes');
    if (typeof episodesDomain.initialize === 'function' && !episodesDomain._initialized) {
      await episodesDomain.initialize();
    }
    const svc = episodesDomain.service;
    svc.repository = { model: mongoose.model('EpisodeOfCare') };

    const captured = [];
    const handler = p => captured.push(p);
    svc.on('episode.closed', handler);

    try {
      await svc.dischargeEpisode('ep-test-4', { reason: 'family request' });
      expect(captured).toHaveLength(1);
      expect(captured[0].outcome).toBe('family request');
    } finally {
      svc.off('episode.closed', handler);
      jest.restoreAllMocks();
    }
  });
});

// ─── 3) assessments.COMPLETED ──────────────────────────────────────────────

describe('W386 — AssessmentsService.completeAssessment emits assessment.completed', () => {
  it('emits with canonical envelope sourced from updated doc', async () => {
    const fakeAssessment = {
      _id: 'assess-test-1',
      beneficiary: 'bene-test-5',
      episodeId: 'episode-test-5',
      tool: 'PHQ-9',
      score: 14,
    };

    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'ClinicalAssessment') {
        return {
          findByIdAndUpdate: jest.fn(() => ({
            lean: () => Promise.resolve({ ...fakeAssessment }),
          })),
        };
      }
      return {};
    });

    const { AssessmentsService } = (() => {
      // The service file exports the class as { AssessmentsService } or singleton
      // Let's grab whatever it exposes
      const mod = require('../domains/assessments/services/AssessmentsService');
      if (mod.AssessmentsService) return mod;
      // Fallback: re-construct via class extraction
      throw new Error('AssessmentsService class not exported — adjust test');
    })();

    const svc = new AssessmentsService();
    const captured = [];
    const handler = p => captured.push(p);
    svc.on('assessment.completed', handler);

    try {
      await svc.completeAssessment('assess-test-1', {
        results: {},
        summary: 'patient improved',
        score: 14,
        recommendations: [],
        interpretation: 'mild depression',
        duration: 25,
      });

      expect(captured).toHaveLength(1);
      const payload = captured[0];
      const expectedKeys = envelopeKeysFor('assessments', 'COMPLETED');
      expect(Object.keys(payload).sort()).toEqual(expectedKeys);
      expect(payload.assessmentId).toBe('assess-test-1');
      expect(payload.beneficiaryId).toBe('bene-test-5');
      expect(payload.episodeId).toBe('episode-test-5');
      expect(payload.type).toBe('PHQ-9');
      expect(payload.overallScore).toBe(14);
    } finally {
      svc.off('assessment.completed', handler);
      jest.restoreAllMocks();
    }
  });
});

// ─── 4) quality.AUDIT_COMPLETED via qualityEventBus ────────────────────────

describe('W386 — quality.audit_completed emits via qualityEventBus', () => {
  it('emits canonical envelope from submitAuditChecklist', async () => {
    const fakeAudit = {
      _id: 'audit-test-1',
      status: 'completed',
      overallComplianceRate: 92,
    };

    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'Audit') {
        return { findByIdAndUpdate: jest.fn(async () => fakeAudit) };
      }
      return {};
    });

    // Subscribe to the SAME bus instance the service will emit on.
    const busModule = require('../services/quality/qualityEventBus.service');
    const bus = busModule.getDefault();
    const captured = [];
    const handler = p => captured.push(p);
    bus.on('quality.audit_completed', handler);

    try {
      // The service file exports a singleton via `module.exports = new QualityEnhancedService()`.
      // Method name in the W381 wire is `updateAuditFindings`, not `submitAuditChecklist`.
      const svc = require('../services/quality/quality-enhanced.service');

      const findings = [
        { type: 'conformity' },
        { type: 'major_nc' },
        { type: 'major_nc' },
        { type: 'minor_nc' },
        { type: 'observation' },
      ];
      await svc.updateAuditFindings('audit-test-1', findings);

      expect(captured).toHaveLength(1);
      const payload = captured[0];
      const expectedKeys = envelopeKeysFor('quality', 'AUDIT_COMPLETED');
      expect(Object.keys(payload).sort()).toEqual(expectedKeys);
      expect(payload.auditId).toBe('audit-test-1');
      // findingsCount = total findings = 5
      expect(payload.findingsCount).toBe(5);
      // criticalFindings = major_nc count = 2
      expect(payload.criticalFindings).toBe(2);
      expect(typeof payload.score).toBe('number');
    } finally {
      bus.off('quality.audit_completed', handler);
      jest.restoreAllMocks();
    }
  });
});

// ─── 5) quality.CORRECTIVE_ACTION_REQUIRED via qualityEventBus ─────────────

describe('W386 — quality.corrective_action_required emits from audit producer', () => {
  it('emits canonical envelope when createCapaFromAuditFinding succeeds', async () => {
    const { createCapaProducers } = require('../services/quality/capa-producers.service');

    const stubCapa = {
      createCapaItem: jest.fn(async input => ({
        _id: 'capa-test-1',
        capaNumber: 'CAPA-2026-TEST',
        ...input,
      })),
    };
    const producers = createCapaProducers({ capaService: stubCapa });

    const occurrenceDoc = {
      _id: 'occ-test-1',
      auditNumber: 'AUD-TEST',
      branchId: 'branch-test',
      tenantId: 'tenant-test',
      findings: [
        {
          _id: 'find-test-1',
          type: 'major_nc',
          description: 'process X non-compliant with policy Y',
          ownerUserId: 'owner-test-1',
          clauseRef: 'ISO-1.2.3',
          evidence: 'log-ref-42',
        },
      ],
    };

    const busModule = require('../services/quality/qualityEventBus.service');
    const bus = busModule.getDefault();
    const captured = [];
    const handler = p => captured.push(p);
    bus.on('quality.corrective_action_required', handler);

    try {
      await producers.createCapaFromAuditFinding({
        occurrenceDoc,
        findingId: 'find-test-1',
        createdBy: 'creator-test',
      });

      expect(captured).toHaveLength(1);
      const payload = captured[0];
      const expectedKeys = envelopeKeysFor('quality', 'CORRECTIVE_ACTION_REQUIRED');
      expect(Object.keys(payload).sort()).toEqual(expectedKeys);
      expect(payload.auditId).toBe('occ-test-1');
      expect(payload.finding).toBe('process X non-compliant with policy Y');
      expect(payload.severity).toBe('major_nc');
      expect(payload.assigneeId).toBe('owner-test-1');
    } finally {
      bus.off('quality.corrective_action_required', handler);
    }
  });
});

// ─── Sanity ─────────────────────────────────────────────────────────────────

describe('W386 — sanity: all 5 final contracts registered', () => {
  it('contracts still exist', () => {
    expect(contracts.DDD_CONTRACTS.episodes.PHASE_TRANSITIONED).toBeDefined();
    expect(contracts.DDD_CONTRACTS.episodes.CLOSED).toBeDefined();
    expect(contracts.DDD_CONTRACTS.assessments.COMPLETED).toBeDefined();
    expect(contracts.DDD_CONTRACTS.quality.AUDIT_COMPLETED).toBeDefined();
    expect(contracts.DDD_CONTRACTS.quality.CORRECTIVE_ACTION_REQUIRED).toBeDefined();
  });
});

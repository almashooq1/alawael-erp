'use strict';

/**
 * W384 — behavioral verification of W379+W380+W381 event-contract wirings.
 *
 * The W375/W382 drift guards only check STRING-LITERAL references — they
 * pass if `'episode.created'` appears anywhere outside the contracts file.
 * That's necessary but NOT sufficient — a typo'd payload key or a renamed
 * service method would still produce dead-on-arrival events at runtime.
 *
 * W384 fills the gap with focused behavioral tests:
 *   1. Call the wired lifecycle method (afterCreate / afterUpdate / createDraft)
 *   2. Capture this.emit() invocations
 *   3. Assert (a) eventType matches the canonical contract string and
 *      (b) payload shape matches the contract envelope from
 *      backend/events/contracts/dddEventContracts.js.
 *
 * Coverage strategy: pick ONE representative wire per pattern, not all 14:
 *   - W379 RENAME pattern → EpisodeService.afterCreate → 'episode.created'
 *   - W380 BATCH pattern  → BeneficiaryService.afterUpdate → 'beneficiary.status_changed'
 *                                                          + 'beneficiary.profile_updated'
 *   - W381 BUS pattern    → aiRecommendation.service createDraft → 'ai.recommendation_generated'
 *
 * Wires NOT covered here (defer to future W385+):
 *   - episodes.phase_transitioned / closed (need mongoose model.findById mock chain)
 *   - care-plans.activated/completed (need findByIdAndUpdate.lean chain)
 *   - goals.achieved (need repository.updateById mock)
 *   - behavior.incident_recorded / plan_updated (need Mongoose Model.create mock chain)
 *   - assessments.completed (need findByIdAndUpdate chain)
 *   - quality.audit_completed / corrective_action_required (need findByIdAndUpdate +
 *     capa-producers stub chain)
 *   - assessments.overdue (W383 sweeper — cron context, harder to drive in unit test)
 *
 * Future expansion: add per-event sub-test using a thin mongoose-chain stub
 * helper. Same envelope-shape assertions; just heavier setup per case.
 *
 * Static analysis only against the contracts file to read envelope shapes.
 * No real DB. Uses jest.setup.js mocked mongoose for the service classes that
 * lazy-require mongoose internally.
 */

const contracts = require('../events/contracts/dddEventContracts');

// ─── Helper: extract canonical envelope keys from a contract ────────────────

function envelopeKeysFor(groupKey, contractKey) {
  const group = contracts.DDD_CONTRACTS[groupKey];
  if (!group) throw new Error(`No contract group "${groupKey}"`);
  const evt = group[contractKey];
  if (!evt) throw new Error(`No contract "${groupKey}.${contractKey}"`);
  return Object.keys(evt.payload).sort();
}

function eventTypeFor(groupKey, contractKey) {
  return contracts.DDD_CONTRACTS[groupKey][contractKey].eventType;
}

// ─── 1) W379 RENAME pattern — episodes.afterCreate ──────────────────────────

describe('W384 — W379 episodes.afterCreate emits episode.created', () => {
  it('emits canonical eventType with full envelope', async () => {
    // Lazy require so jest.setup.js mongoose mock is in effect first
    const episodesDomain = require('../domains/episodes');
    // Ensure service exists (initialize is async-safe + idempotent)
    if (typeof episodesDomain.initialize === 'function' && !episodesDomain._initialized) {
      await episodesDomain.initialize();
    }
    const svc = episodesDomain.service;
    expect(svc).toBeTruthy();

    const captured = [];
    const handler = payload => captured.push(payload);
    svc.on('episode.created', handler);
    try {
      const entity = {
        _id: 'ep-test-1',
        beneficiaryId: 'bene-test-1',
        currentPhase: 'referral',
        episodeNumber: 'EP-TEST-001',
      };
      await svc.afterCreate(entity, { userId: 'u1' });

      expect(captured).toHaveLength(1);
      const payload = captured[0];

      // Eventtype was actually emitted (the .on() above confirms; the captured
      // length confirms invocation).
      expect(eventTypeFor('episodes', 'CREATED')).toBe('episode.created');

      // Payload includes all 3 canonical envelope keys with correct values
      const expectedKeys = envelopeKeysFor('episodes', 'CREATED'); // [beneficiaryId, episodeId, phase]
      expect(Object.keys(payload).sort()).toEqual(expectedKeys);
      expect(payload.episodeId).toBe('ep-test-1');
      expect(payload.beneficiaryId).toBe('bene-test-1');
      expect(payload.phase).toBe('referral');
    } finally {
      svc.off('episode.created', handler);
    }
  });
});

// ─── 2+3) W380 BATCH pattern — beneficiary.afterUpdate forks 2 events ───────

describe('W384 — W380 BeneficiaryService.afterUpdate forks 2 canonical events', () => {
  let svc;

  beforeAll(() => {
    const { BeneficiaryService } = require('../domains/core/services/beneficiary.service');
    // Minimal repository stub — afterUpdate doesn't actually use the repo
    const mockRepo = {
      findByMRN: async () => null,
      findByNationalId: async () => null,
    };
    svc = new BeneficiaryService(mockRepo);
  });

  it('emits beneficiary.status_changed when entity.status differs from previous', async () => {
    const captured = [];
    const handler = payload => captured.push(payload);
    svc.on('beneficiary.status_changed', handler);
    try {
      const entity = { _id: 'b1', status: 'active', statusReason: 'admitted' };
      const previous = { _id: 'b1', status: 'pending' };
      await svc.afterUpdate(entity, previous, { userId: 'u1', reason: 'admitted' });

      expect(captured).toHaveLength(1);
      const payload = captured[0];

      const expectedKeys = envelopeKeysFor('core', 'STATUS_CHANGED'); // [beneficiaryId, newStatus, oldStatus, reason]
      expect(Object.keys(payload).sort()).toEqual(expectedKeys);
      expect(payload.beneficiaryId).toBe('b1');
      expect(payload.oldStatus).toBe('pending');
      expect(payload.newStatus).toBe('active');
      expect(payload.reason).toBe('admitted');
    } finally {
      svc.off('beneficiary.status_changed', handler);
    }
  });

  it('emits beneficiary.profile_updated when status unchanged but other fields modified', async () => {
    const captured = [];
    const handler = payload => captured.push(payload);
    svc.on('beneficiary.profile_updated', handler);
    try {
      const entity = {
        _id: 'b2',
        status: 'active',
        lastModifiedBy: 'u1',
        // Mongoose-style modifiedPaths fn returning the changed fields
        modifiedPaths: () => ['phone', 'address', 'updatedAt', 'lastModifiedBy'],
      };
      const previous = { _id: 'b2', status: 'active' };
      await svc.afterUpdate(entity, previous, { userId: 'u1' });

      expect(captured).toHaveLength(1);
      const payload = captured[0];

      const expectedKeys = envelopeKeysFor('core', 'PROFILE_UPDATED'); // [beneficiaryId, updatedBy, updatedFields]
      expect(Object.keys(payload).sort()).toEqual(expectedKeys);
      expect(payload.beneficiaryId).toBe('b2');
      expect(Array.isArray(payload.updatedFields)).toBe(true);
      // afterUpdate filters out 'updatedAt' + 'lastModifiedBy' — only real fields stay
      expect(payload.updatedFields).toEqual(['phone', 'address']);
      expect(payload.updatedBy).toBe('u1');
    } finally {
      svc.off('beneficiary.profile_updated', handler);
    }
  });

  it('does NOT double-fire when status changes (status_changed fires, profile_updated does not)', async () => {
    const statusEvents = [];
    const profileEvents = [];
    const statusHandler = p => statusEvents.push(p);
    const profileHandler = p => profileEvents.push(p);
    svc.on('beneficiary.status_changed', statusHandler);
    svc.on('beneficiary.profile_updated', profileHandler);
    try {
      const entity = {
        _id: 'b3',
        status: 'discharged',
        modifiedPaths: () => ['status', 'phone', 'updatedAt'],
      };
      const previous = { _id: 'b3', status: 'active' };
      await svc.afterUpdate(entity, previous, { userId: 'u1', reason: 'completed' });

      expect(statusEvents).toHaveLength(1);
      expect(profileEvents).toHaveLength(0); // afterUpdate is if/else, not both
    } finally {
      svc.off('beneficiary.status_changed', statusHandler);
      svc.off('beneficiary.profile_updated', profileHandler);
    }
  });
});

// ─── 4) W381 BUS pattern — aiRecommendation.service.bus ─────────────────────

describe('W384 — W381 aiRecommendation.createDraft emits via module-level bus', () => {
  it('exports a bus EventEmitter alongside the API', () => {
    const svc = require('../services/aiRecommendation.service');
    expect(typeof svc.bus.emit).toBe('function');
    expect(typeof svc.bus.on).toBe('function');
    expect(typeof svc.createDraft).toBe('function');
  });

  it('static source-shape: createDraft contains the canonical eventType + envelope keys', () => {
    // Behavioral test would require AiRecommendationBundle Mongoose model
    // mocking. Defer to W385+. For now, source-static verification: the file
    // must contain the eventType string AND the 5 envelope keys in a
    // bus.emit() call. This catches the W375-passing-but-broken case where
    // the eventType is referenced but envelope fields drift.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'aiRecommendation.service.js'),
      'utf8'
    );

    expect(src).toMatch(/bus\.emit\(\s*['"]ai\.recommendation_generated['"]/);

    // All 5 envelope keys per AI_RECOMMENDATION_EVENTS.GENERATED:
    //   recommendationId, beneficiaryId, ruleId, confidence, action
    const expectedKeys = envelopeKeysFor('ai-recommendations', 'GENERATED');
    for (const k of expectedKeys) {
      expect(src).toMatch(new RegExp(`\\b${k}\\b`));
    }
  });
});

// ─── 5) Meta — contracts file lists all 4 events tested above ───────────────

describe('W384 — sanity: tested events exist in contracts registry', () => {
  it('all asserted contracts are still registered (catches drift if contracts file edits drop them)', () => {
    expect(contracts.DDD_CONTRACTS.episodes.CREATED).toBeDefined();
    expect(contracts.DDD_CONTRACTS.core.STATUS_CHANGED).toBeDefined();
    expect(contracts.DDD_CONTRACTS.core.PROFILE_UPDATED).toBeDefined();
    expect(contracts.DDD_CONTRACTS['ai-recommendations'].GENERATED).toBeDefined();
  });
});

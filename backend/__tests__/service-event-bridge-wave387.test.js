'use strict';

/**
 * W387 — integration test for the service-event bridge.
 *
 * Verifies that firing a producer emit on a service-local EventEmitter (the
 * W379-W386 wires) actually propagates through the bridge to integrationBus
 * subscribers. This is the missing piece that W384/W385/W386 behavioral
 * tests did NOT cover — those subscribed to the SAME service-local emitter
 * the producer fires on, so they never exercised the bus mismatch.
 *
 * PRE-W387 STATE (the bug):
 *   1. EpisodeService.afterCreate emits 'episode.created' (local only)
 *   2. dddCrossModuleSubscribers subscribes to 'episodes.episode.created'
 *      via integrationBus.subscribe(pattern, handler)
 *   3. No bridge between (1) and (2) → subscribers silently never fire
 *
 * POST-W387:
 *   - serviceEventBridge.wireServiceEventBridge(integrationBus) installs
 *     listeners on each service that forward local emits to bus.publish
 *   - Now (1) fires → bridge catches → integrationBus.publish('episodes',
 *     'episode.created', payload) → subscribers receive with full envelope
 *
 * Test strategy: spin up a real integrationBus (no MQ/EventStore deps —
 * fail-safe defaults handle missing infra), wire the bridge, register a
 * test subscriber, trigger the producer, assert the subscriber received.
 *
 * Covers 3 representative wires (sample, not exhaustive — same bridge
 * mechanics apply to all 14):
 *   episodes.created      → service-local → bus → subscriber
 *   beneficiary.profile_updated → service-local → bus → subscriber
 *   ai.recommendation_generated → module-level bus → bus → subscriber
 *     (W381 module-level pattern, different from BaseService class pattern)
 */

const mongoose = require('mongoose');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { wireServiceEventBridge } = require('../integration/serviceEventBridge');

describe('W387 service-event bridge — producer → integrationBus → subscriber loop', () => {
  beforeAll(() => {
    // Initialize integrationBus with no-op infra (no eventStore, no MQ).
    // Bus's publish() routes local + skips persist/broadcast/realtime when
    // those backends are absent. Good enough for in-process subscriber test.
    if (typeof integrationBus.initialize === 'function') {
      try {
        integrationBus.initialize({ eventStore: null, messageQueue: null, socketEmitter: null });
      } catch {
        /* may throw if already initialized; safe to ignore */
      }
    }

    // Wire the bridge after init. Bridge requires the domain singletons +
    // attaches listeners. Idempotent via BRIDGE_FLAG Symbol so re-wires
    // don't double-bind.
    wireServiceEventBridge(integrationBus);
  });

  // ── 1) Episodes flow ─────────────────────────────────────────────────────

  it('EpisodeService.afterCreate → integrationBus → subscriber on episodes.episode.created', async () => {
    const captured = [];

    // Subscribe BEFORE triggering the producer. Pattern matches what
    // dddCrossModuleSubscribers uses.
    const unsubscribe = integrationBus.subscribe('episodes.episode.created', envelope => {
      captured.push(envelope);
    });

    try {
      const episodesDomain = require('../domains/episodes');
      if (typeof episodesDomain.initialize === 'function' && !episodesDomain._initialized) {
        await episodesDomain.initialize();
      }
      const svc = episodesDomain.service;
      // Re-wire bridge in case the singleton was created AFTER initial bridge call
      wireServiceEventBridge(integrationBus);

      const entity = {
        _id: 'ep-bridge-1',
        beneficiaryId: 'bene-bridge-1',
        currentPhase: 'referral',
        episodeNumber: 'EP-BRIDGE-001',
      };
      await svc.afterCreate(entity, { userId: 'u-bridge-1' });

      // Bridge forwards async via Promise.resolve().then() — flush the
      // microtask queue so the integrationBus.publish completes.
      await new Promise(resolve => setImmediate(resolve));

      expect(captured.length).toBeGreaterThanOrEqual(1);
      const envelope = captured[captured.length - 1];

      // Envelope shape from integrationBus.publish: {domain, eventType,
      // payload, metadata, delivery, ...}
      expect(envelope.payload).toEqual({
        episodeId: 'ep-bridge-1',
        beneficiaryId: 'bene-bridge-1',
        phase: 'referral',
      });
    } finally {
      if (typeof unsubscribe === 'function') unsubscribe();
    }
  });

  // ── 2) BeneficiaryService.afterUpdate (PROFILE_UPDATED path) ─────────────

  it('BeneficiaryService.afterUpdate → subscriber on core.beneficiary.profile_updated', async () => {
    const captured = [];
    const unsubscribe = integrationBus.subscribe('core.beneficiary.profile_updated', env => {
      captured.push(env);
    });

    try {
      const coreDomain = require('../domains/core');
      if (typeof coreDomain.initialize === 'function' && !coreDomain._initialized) {
        await coreDomain.initialize();
      }
      // Make sure bridge attaches to the now-initialized service
      wireServiceEventBridge(integrationBus);

      const svc = coreDomain.beneficiaryService;
      expect(svc).toBeTruthy();

      const entity = {
        _id: 'b-bridge-1',
        status: 'active',
        lastModifiedBy: 'u-bridge',
        modifiedPaths: () => ['phone', 'updatedAt', 'lastModifiedBy'],
      };
      const previous = { _id: 'b-bridge-1', status: 'active' };
      await svc.afterUpdate(entity, previous, { userId: 'u-bridge' });

      await new Promise(resolve => setImmediate(resolve));

      expect(captured.length).toBeGreaterThanOrEqual(1);
      const envelope = captured[captured.length - 1];
      expect(envelope.payload.beneficiaryId).toBe('b-bridge-1');
      expect(envelope.payload.updatedFields).toEqual(['phone']);
      expect(envelope.payload.updatedBy).toBe('u-bridge');
    } finally {
      if (typeof unsubscribe === 'function') unsubscribe();
    }
  });

  // ── 3) aiRecommendation.service module-level bus → integrationBus ───────

  it('aiRecommendation.createDraft → subscriber on ai-recommendations.ai.recommendation_generated', async () => {
    const captured = [];
    const unsubscribe = integrationBus.subscribe(
      'ai-recommendations.ai.recommendation_generated',
      env => captured.push(env)
    );

    try {
      // Mock AiRecommendationBundle so createDraft's save() chain doesn't
      // touch a real DB. The mongoose mock in jest.setup.js will provide a
      // generic stub for any model, but we need .save() on doc instances.
      jest.spyOn(mongoose, 'model').mockImplementation(name => {
        if (name === 'AiRecommendationBundle') {
          // Return a constructor function that produces docs with save() noop.
          // Match the existing _Bundle() factory pattern.
          function FakeBundle(data) {
            Object.assign(this, data);
            this._id = 'rec-bridge-1';
            this.save = jest.fn(async () => this);
          }
          return FakeBundle;
        }
        return {};
      });

      const ai = require('../services/aiRecommendation.service');
      // Re-wire bridge against the module-level bus
      wireServiceEventBridge(integrationBus);

      await ai.createDraft({
        beneficiaryId: 'bene-bridge-2',
        type: 'INCREASE_DOSAGE',
        confidence: 0.85, // ≥0.7 → PENDING_REVIEW path (emits)
        signals: ['sig1'],
        draftAction: 'review',
      });

      await new Promise(resolve => setImmediate(resolve));

      expect(captured.length).toBeGreaterThanOrEqual(1);
      const envelope = captured[captured.length - 1];
      expect(envelope.payload.recommendationId).toBe('rec-bridge-1');
      expect(envelope.payload.beneficiaryId).toBe('bene-bridge-2');
      expect(envelope.payload.ruleId).toBe('INCREASE_DOSAGE'); // from type
      expect(envelope.payload.confidence).toBe(0.85);
      expect(envelope.payload.action).toBe('review');
    } finally {
      if (typeof unsubscribe === 'function') unsubscribe();
      jest.restoreAllMocks();
    }
  });

  // ── 4) Idempotency — re-wiring doesn't double-bind ──────────────────────

  it('wireServiceEventBridge is idempotent — calling twice does not double-emit', async () => {
    const captured = [];
    const unsubscribe = integrationBus.subscribe('episodes.episode.created', env =>
      captured.push(env)
    );

    try {
      // Call the bridge wiring 3 more times
      wireServiceEventBridge(integrationBus);
      wireServiceEventBridge(integrationBus);
      wireServiceEventBridge(integrationBus);

      const episodesDomain = require('../domains/episodes');
      const svc = episodesDomain.service;

      await svc.afterCreate(
        {
          _id: 'ep-idempotent-1',
          beneficiaryId: 'bene-idempotent-1',
          currentPhase: 'referral',
        },
        {}
      );
      await new Promise(resolve => setImmediate(resolve));

      // Exactly one envelope captured — bridge didn't double-bind.
      expect(captured.length).toBe(1);
    } finally {
      if (typeof unsubscribe === 'function') unsubscribe();
    }
  });
});

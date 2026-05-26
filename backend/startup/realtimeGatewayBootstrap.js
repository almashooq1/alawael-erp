'use strict';

/**
 * realtimeGatewayBootstrap.js — Wave 427 (Phase A1 — Real-Time Backbone).
 *
 * Wires the W135 in-process realtime broker (which sat orphaned with 0
 * callers in production — same anti-pattern as W225 wallet) to:
 *
 *   1. systemIntegrationBus → broker      (LIVE registry events)
 *   2. qualityEventBus      → broker      (quality.* / compliance.*)
 *   3. Mount /api/realtime/{stream,stats,topics}
 *
 * Single-broker singleton attached to app._realtimeBroker so future
 * producers (Phase B forecasting, Phase C SOAP, Phase D behavior) can
 * publish directly via `app._realtimeBroker.publish(...)` without
 * needing to know about which upstream bus emitted the event.
 *
 * Topic naming convention:
 *   integrationBus envelope → broker topic = `${domain}.${eventType}`
 *   qualityEventBus name    → broker topic = name (already dotted)
 *
 * Idempotency:
 *   broker.publish dedupes by eventId in a recent-ring buffer (256
 *   entries). We derive eventId as `${source}:${name}:${envelopeId|hash}`
 *   so the same upstream event delivered via both buses is collapsed
 *   to one fan-out.
 */

const crypto = require('crypto');

const { createRealtimeEventBroker } = require('../intelligence/realtime-event-broker.service');
const { createRealtimeRouter } = require('../routes/realtime.routes');

function _hashOf(obj) {
  try {
    return crypto.createHash('sha1').update(JSON.stringify(obj)).digest('hex').slice(0, 16);
  } catch {
    return Math.random().toString(36).slice(2, 18);
  }
}

function wireRealtimeGateway(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) {
    throw new Error('realtimeGatewayBootstrap.wireRealtimeGateway: app + logger required');
  }

  try {
    // ── 1. Broker singleton ───────────────────────────────────────
    const broker = createRealtimeEventBroker({
      bufferSize: parseInt(process.env.REALTIME_BUFFER_SIZE, 10) || 200,
      logger,
    });
    app._realtimeBroker = broker;

    // ── 2. Bridge: integrationBus → broker ────────────────────────
    let integrationBridgeOk = false;
    try {
      const { integrationBus } = require('../integration/systemIntegrationBus');
      // subscribeAll wires '*' pattern — every envelope flows through
      integrationBus.subscribeAll(envelope => {
        try {
          if (!envelope || !envelope.domain || !envelope.eventType) return;
          const topic = `${envelope.domain}.${envelope.eventType}`;
          const envelopeId =
            envelope.metadata?.eventId || envelope.metadata?.id || envelope.eventId || null;
          const eventId = `integration:${topic}:${envelopeId || _hashOf(envelope)}`;
          broker.publish({
            eventId,
            topic,
            payload: envelope.payload || {},
            meta: {
              source: 'integrationBus',
              branchId: envelope.payload?.branchId || envelope.metadata?.branchId || null,
              correlationId: envelope.metadata?.correlationId || null,
              priority: envelope.priority || null,
              at: envelope.metadata?.timestamp || null,
            },
          });
        } catch (innerErr) {
          logger.warn(`[realtime] integrationBus bridge delivery failed: ${innerErr.message}`);
        }
      });
      integrationBridgeOk = true;
    } catch (err) {
      logger.warn(`[realtime] integrationBus bridge skipped: ${err.message}`);
    }

    // ── 3. Bridge: qualityEventBus → broker ──────────────────────
    let qualityBridgeOk = false;
    try {
      const qualityBusModule = require('../services/quality/qualityEventBus.service');
      // W349 lesson: the EXPORT is { createQualityEventBus, getDefault, ... } —
      // NOT a singleton bus. Must call getDefault() to attach to the same
      // instance services emit on. Pre-W349 capaBootstrap did this wrong
      // (bus.emit / bus.default.emit were undefined silent no-ops).
      const qualityBus = qualityBusModule.getDefault();
      qualityBus.on('*', (payload, name) => {
        try {
          if (!name) return;
          const eventId = `quality:${name}:${_hashOf(payload)}`;
          broker.publish({
            eventId,
            topic: name,
            payload: payload || {},
            meta: {
              source: 'qualityEventBus',
              branchId: payload?.branchId || null,
            },
          });
        } catch (innerErr) {
          logger.warn(`[realtime] qualityEventBus bridge delivery failed: ${innerErr.message}`);
        }
      });
      qualityBridgeOk = true;
    } catch (err) {
      logger.warn(`[realtime] qualityEventBus bridge skipped: ${err.message}`);
    }

    // ── 4. Mount HTTP routes ─────────────────────────────────────
    const router = createRealtimeRouter({ broker, logger });
    app.use('/api/realtime', router);
    app.use('/api/v1/realtime', router);

    logger.info(
      `[realtime] ✓ gateway wired (W427) — bridges: integration=${integrationBridgeOk} quality=${qualityBridgeOk}, mount=/api/realtime + /api/v1/realtime`
    );

    return { broker, integrationBridgeOk, qualityBridgeOk };
  } catch (err) {
    logger.warn(`[realtime] gateway wiring failed (W427): ${err.message}`);
    return { broker: null, integrationBridgeOk: false, qualityBridgeOk: false };
  }
}

module.exports = { wireRealtimeGateway };

'use strict';

/**
 * parentChatbotBootstrap.js — Wave 277 Pass 2 of app.js refactor.
 *
 * Extracted verbatim from app.js (lines 2270-2555 pre-W277-Pass-2,
 * ~286 LOC) into a single bootstrap function so the entry point
 * shrinks. NO behaviour change — every require, every order, every
 * `app.use`, every `app._xxx` reference, every cron timer is
 * preserved.
 *
 * Original section comments + Wave attributions preserved inline
 * for git-blame continuity.
 *
 * ── Scope (3 wired surfaces) ─────────────────────────────────────
 *
 *   1. Parent Chatbot (W120 / P3.6 Phase 1) — `/api/v1/parent/chatbot`
 *      Rule-based intent classifier + canned templates + session
 *      persistence. W122 adds optional context resolver, W123 adds
 *      optional LLM classifier (gated on ANTHROPIC_API_KEY).
 *
 *   2. LLM Telemetry routes (W131) — `/api/v1/ai/llm-telemetry`
 *      Cross-service aggregator over the default llm-registry.
 *
 *   3. LLM Anomalies (W142+144+146+147) — `/api/v1/ai/llm-anomalies`
 *      Detector + history + diff dispatcher (log + optional webhook
 *      channels) + ack/silence layer + 10-min periodic background scan.
 *
 * All 3 wired inside ONE outer try/catch (matches the pre-extract
 * shape) — any wiring error in any sub-surface is caught and warned;
 * the rest of app startup is unaffected.
 *
 * ── Contract ─────────────────────────────────────────────────────
 *
 *   - `app` + `logger` passed via deps
 *   - `process.env` read directly (Node global)
 *   - All `./xxx` relative requires rewritten to `../xxx` (file lives
 *     one directory deeper than app.js)
 *
 * Idempotency: never call twice. The wiring sets multiple
 * `app._xxx` references + a periodic timer; a second call would
 * register duplicate routes + spawn an extra timer.
 *
 * @param {import('express').Express} app
 * @param {{ logger: any }} deps
 */
function wireParentChatbot(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) {
    throw new Error('parentChatbotBootstrap.wireParentChatbot: app + logger required');
  }

  try {
    let ParentChatbotSession = null;
    try {
      ParentChatbotSession = require('../models/ParentChatbotSession');
    } catch {
      /* model missing — feature self-disables */
    }
    let pcGovernance = null;
    try {
      const { createGovernanceService } = require('../intelligence/governance.service');
      pcGovernance = createGovernanceService({ logger });
    } catch {
      /* governance optional */
    }
    if (pcGovernance && ParentChatbotSession) {
      const { createParentChatbotService } = require('../intelligence/parent-chatbot.service');
      const { createParentChatbotRouter } = require('../routes/parent-chatbot.routes');
      // Wave 122: optionally wire the context resolver. Each model
      // is loaded defensively — missing models degrade specific
      // intents to "unfilled template" rather than crashing setup.
      let pcContextService = null;
      try {
        const {
          createParentChatbotContextService,
        } = require('../intelligence/parent-chatbot-context.service');
        let appointmentM = null;
        let invoiceM = null;
        let benefM = null;
        let carePlanM = null;
        let branchM = null;
        let employeeM = null;
        try {
          appointmentM = require('../models/Appointment');
        } catch {
          /* skip */
        }
        try {
          invoiceM = require('../models/AccountingInvoice');
        } catch {
          /* skip */
        }
        try {
          benefM = require('../models/Beneficiary');
        } catch {
          /* skip */
        }
        try {
          carePlanM = require('../models/CarePlanVersion');
        } catch {
          /* skip */
        }
        try {
          branchM = require('../models/Branch');
        } catch {
          /* skip */
        }
        try {
          employeeM = require('../models/HR/Employee');
        } catch {
          /* skip */
        }
        pcContextService = createParentChatbotContextService({
          appointmentModel: appointmentM,
          invoiceModel: invoiceM,
          beneficiaryModel: benefM,
          carePlanModel: carePlanM,
          branchModel: branchM,
          employeeModel: employeeM,
          logger,
        });
      } catch (ctxErr) {
        logger.warn('[ParentChatbot] context resolver failed to wire:', ctxErr.message);
      }

      // Wave 123: optionally wire the LLM-backed classifier. Gated on
      // ANTHROPIC_API_KEY — when unset, the service falls back to the
      // rule-based classifier from Wave 120.
      let pcLlmClassifier = null;
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const Anthropic = require('@anthropic-ai/sdk');
          const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const {
            createParentChatbotLlmService,
          } = require('../intelligence/parent-chatbot-llm.service');
          // Wave 134: optionally persist telemetry (Mongo TTL 30d).
          let llmTelemetryModel = null;
          try {
            llmTelemetryModel = require('../models/LlmTelemetryCall');
          } catch {
            /* model missing — telemetry stays in-memory only */
          }
          pcLlmClassifier = createParentChatbotLlmService({
            client: anthropicClient,
            telemetryPersistModel: llmTelemetryModel,
            logger,
          });
          logger.info('[ParentChatbot] ✓ LLM classifier enabled (Wave 123)');
          // Wave 131: register the chatbot LLM in the cross-service
          // telemetry registry so the /llm-telemetry admin endpoint
          // can aggregate it alongside care-plan + future services.
          try {
            const { getDefaultRegistry } = require('../intelligence/llm-registry.lib');
            getDefaultRegistry({ logger }).register('parent-chatbot', pcLlmClassifier);
          } catch (regErr) {
            logger.warn('[ParentChatbot] llm-registry registration failed:', regErr.message);
          }
        } catch (llmErr) {
          logger.warn('[ParentChatbot] LLM classifier failed to wire:', llmErr.message);
        }
      } else {
        logger.info('[ParentChatbot] LLM classifier disabled (ANTHROPIC_API_KEY not set)');
      }

      // W283c — wire ragService as ragRetriever for POLICY_QUERY intent.
      // Late binding: ragBootstrap (W283b) runs earlier in startup and attaches
      // app._ragService. If it's missing here (graceful degradation), the
      // chatbot downgrades POLICY_QUERY → UNKNOWN at request time.
      const ragRetriever = app._ragService || null;

      const chatbotService = createParentChatbotService({
        sessionModel: ParentChatbotSession,
        contextService: pcContextService,
        llmClassifier: pcLlmClassifier,
        ragRetriever,
        logger,
      });
      const { authenticate: pcAuthMw } = require('../middleware/auth');
      app.use(
        '/api/v1/parent/chatbot',
        pcAuthMw,
        createParentChatbotRouter({
          chatbotService,
          governance: pcGovernance,
          logger,
        })
      );
      app._parentChatbotService = chatbotService;
      logger.info(
        '[ParentChatbot] ✓ Wave 120 (P3.6 Phase 1) routes mounted at /api/v1/parent/chatbot'
      );

      // Wave 131: cross-service LLM telemetry routes. Mounts at
      // /api/v1/ai — aggregates every service registered in the
      // default llm-registry (chatbot + care-plan + future).
      try {
        const { getDefaultRegistry } = require('../intelligence/llm-registry.lib');
        const { createLlmTelemetryRouter } = require('../routes/llm-telemetry.routes');
        app.use(
          '/api/v1/ai',
          pcAuthMw,
          createLlmTelemetryRouter({
            llmRegistry: getDefaultRegistry({ logger }),
            governance: pcGovernance,
            logger,
          })
        );
        logger.info(
          '[LLM-Telemetry] ✓ Wave 131 cross-service routes mounted at /api/v1/ai/llm-telemetry'
        );
      } catch (telErr) {
        logger.warn('[LLM-Telemetry] routes skipped:', telErr.message);
      }

      // Wave 142+144+146: LLM anomaly detector + history + dispatcher.
      // Mounts at /api/v1/ai/llm-anomalies and reuses ai.telemetry.read.
      // Wave 144 adds history list/trend/manual-scan endpoints. Wave 146
      // adds a diff-based dispatcher that delivers anomaly-fired/
      // anomaly-resolved events to channels (log + optional webhook).
      try {
        const { getDefaultRegistry } = require('../intelligence/llm-registry.lib');
        const {
          createLlmAnomalyDetector,
        } = require('../intelligence/llm-anomaly-detector.service');
        const {
          createLlmAnomalyHistoryService,
        } = require('../intelligence/llm-anomaly-history.service');
        const {
          createLlmAnomalyDispatcher,
        } = require('../intelligence/llm-anomaly-dispatcher.service');
        const {
          createLlmAnomalyLogChannel,
        } = require('../intelligence/channels/llm-anomaly-log-channel');
        const {
          createLlmAnomalyWebhookChannel,
        } = require('../intelligence/channels/llm-anomaly-webhook-channel');
        const { createLlmAnomalyAckService } = require('../intelligence/llm-anomaly-ack.service');
        const { createLlmAnomaliesRouter } = require('../routes/llm-anomalies.routes');

        const llmAnomalyDetector = createLlmAnomalyDetector({
          llmRegistry: getDefaultRegistry({ logger }),
          logger,
        });

        // Wave 144 — persistence layer. Defensive load so missing model
        // file doesn't break the live detector route.
        let llmAnomalyHistory = null;
        try {
          const LlmAnomalySnapshot = require('../models/LlmAnomalySnapshot');
          llmAnomalyHistory = createLlmAnomalyHistoryService({
            snapshotModel: LlmAnomalySnapshot,
            logger,
          });
        } catch (histErr) {
          logger.warn('[LLM-Anomalies] history layer skipped (model missing):', histErr.message);
        }

        // Wave 147 — ack/silencing layer. Defensive load. When the
        // model is missing the dispatcher just doesn't get an ackService
        // and the ack endpoints return 503.
        let llmAnomalyAck = null;
        try {
          const LlmAnomalyAck = require('../models/LlmAnomalyAck');
          llmAnomalyAck = createLlmAnomalyAckService({ ackModel: LlmAnomalyAck, logger });
        } catch (ackErr) {
          logger.warn('[LLM-Anomalies] ack layer skipped (model missing):', ackErr.message);
        }

        // Wave 146 — diff dispatcher + channels. Log channel always on.
        // Webhook channel auto-disabled when LLM_ANOMALY_WEBHOOK_URL unset.
        const dispatchChannels = [createLlmAnomalyLogChannel({ logger, name: 'log' })];
        const webhookCh = createLlmAnomalyWebhookChannel({ logger });
        if (webhookCh) dispatchChannels.push(webhookCh);
        const llmAnomalyDispatcher = createLlmAnomalyDispatcher({
          channels: dispatchChannels,
          ackService: llmAnomalyAck, // Wave 147 — fired events for acked ids are skipped
          logger,
        });

        app.use(
          '/api/v1/ai',
          pcAuthMw,
          createLlmAnomaliesRouter({
            detector: llmAnomalyDetector,
            history: llmAnomalyHistory,
            ack: llmAnomalyAck,
            governance: pcGovernance,
            logger,
          })
        );
        app._llmAnomalyDetector = llmAnomalyDetector;
        app._llmAnomalyHistory = llmAnomalyHistory;
        app._llmAnomalyAck = llmAnomalyAck;
        app._llmAnomalyDispatcher = llmAnomalyDispatcher;
        logger.info(
          `[LLM-Anomalies] ✓ Wave 142+144+146+147 routes + dispatcher (${dispatchChannels.length} channels${llmAnomalyAck ? ' + ack' : ''}) mounted at /api/v1/ai/llm-anomalies`
        );

        // Wave 144+146 — periodic background scan + dispatch. 10-min
        // cadence mirrors the Hikvision Wave 114 ANOMALY_SCAN cron.
        // Skipped entirely when the history layer is unavailable.
        if (llmAnomalyHistory && process.env.LLM_ANOMALY_SCAN_DISABLED !== '1') {
          const SCAN_INTERVAL_MS = 10 * 60 * 1000;
          const scanTimer = setInterval(async () => {
            try {
              const start = Date.now();
              const detection = llmAnomalyDetector.detect({ skipCache: true });
              const durationMs = Date.now() - start;
              if (detection.ok) {
                await llmAnomalyHistory.recordSnapshot({
                  detectionResult: detection,
                  source: 'scheduler',
                  durationMs,
                });
                // Wave 146 — diff against previous detection and emit
                // fired/resolved events. Independent of persistence
                // success because dispatcher has its own state.
                await llmAnomalyDispatcher.dispatch({
                  detectionResult: detection,
                  source: 'scheduler',
                });
              }
            } catch (scanErr) {
              logger.warn('[LLM-Anomalies] periodic scan failed:', scanErr.message);
            }
          }, SCAN_INTERVAL_MS);
          if (typeof scanTimer.unref === 'function') scanTimer.unref();
          app._llmAnomalyScanTimer = scanTimer;
          logger.info('[LLM-Anomalies] ✓ periodic 10-min scan + dispatch armed');
        }
      } catch (anomErr) {
        logger.warn('[LLM-Anomalies] routes skipped:', anomErr.message);
      }
    } else {
      logger.info(
        '[ParentChatbot] routes skipped: governance or ParentChatbotSession model unavailable'
      );
    }
  } catch (pcErr) {
    logger.warn('[ParentChatbot] routes skipped:', pcErr.message);
  }
}

module.exports = { wireParentChatbot };

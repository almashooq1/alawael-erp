/**
 * startup/integrationBus.js — Cross-module event-driven integration
 * ═══════════════════════════════════════════════════════════════════
 * Extracted from app.js for maintainability.
 *
 * Initializes: Integration bus, module connector, domain event contracts,
 *   DDD subscribers, notification triggers, workflow automations,
 *   scheduled jobs, webhook dispatcher, and integration API routes.
 */

const logger = require('../utils/logger');
const {
  integrationBus,
  mountIntegrationBusRoutes,
} = require('../integration/systemIntegrationBus');
const { moduleConnector, mountModuleConnectorRoutes } = require('../integration/moduleConnector');
const { mountIntegrationContextRoutes } = require('../middleware/integrationContext.middleware');
const { initializeCrossModuleSubscribers } = require('../integration/crossModuleSubscribers');
const { ALL_CONTRACTS } = require('../events/contracts/domainEventContracts');

/**
 * Initialize the full integration bus and mount its API routes.
 *
 * @param {import('express').Application} app
 */
function setupIntegrationBus(app) {
  try {
    // Initialize the integration bus with existing infrastructure singletons
    const { eventStore } = require('../infrastructure/eventStore');
    const { getMessageQueue } = require('../infrastructure/messageQueue');
    const socketEmitter = (() => {
      try {
        return require('../utils/socketEmitter');
      } catch {
        return null;
      }
    })();

    integrationBus.initialize({
      eventStore,
      messageQueue: getMessageQueue(),
      socketEmitter,
    });

    // Register all domain event contracts
    for (const [domain, contracts] of Object.entries(ALL_CONTRACTS)) {
      const events = Object.values(contracts).map(c => c.eventType);
      integrationBus.registerDomain(domain, { version: '1.0.0', events });
    }

    // Register DDD rehabilitation domain event contracts (20 domains, 37 events)
    try {
      const { DDD_CONTRACTS } = require('../events/contracts/dddEventContracts');
      for (const [domain, contracts] of Object.entries(DDD_CONTRACTS)) {
        const events = Object.values(contracts).map(c => c.eventType);
        integrationBus.registerDomain(`ddd:${domain}`, { version: '1.0.0', events });
      }
      logger.info('[Integration] ✓ DDD rehabilitation event contracts registered');
    } catch (dddErr) {
      logger.warn('[Integration] DDD event contracts skipped:', dddErr.message);
    }

    // Initialize the module connector
    moduleConnector.initialize({ integrationBus });

    // Wire cross-module subscribers
    initializeCrossModuleSubscribers(integrationBus, moduleConnector);

    // Wire DDD rehabilitation cross-domain subscribers (15 event subscribers — count: `grep -c "subscribers.push" ../integration/dddCrossModuleSubscribers.js`)
    try {
      const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
      initializeDDDSubscribers(integrationBus, moduleConnector);
      logger.info('[Integration] ✓ DDD cross-domain subscribers wired');
    } catch (dddSubErr) {
      logger.warn('[Integration] DDD subscribers skipped:', dddSubErr.message);
    }

    // W1511: WhatsApp post-session summary subscriber — on session.completed,
    // message the guardian. Env-gated (ENABLE_WHATSAPP_POST_SESSION_SUMMARY);
    // off by default + consent-gated.
    try {
      const {
        wireWhatsappPostSessionSummary,
      } = require('../services/whatsapp/whatsappPostSessionSubscriber');
      wireWhatsappPostSessionSummary(integrationBus, { logger });
    } catch (waSubErr) {
      logger.warn('[Integration] WhatsApp post-session subscriber skipped:', waSubErr.message);
    }

    // W1513: WhatsApp complaint-resolved subscriber — on complaint.resolved
    // (with a linked beneficiary), notify the guardian. Env-gated
    // (ENABLE_WHATSAPP_COMPLAINT_RESOLVED); off by default + consent-gated.
    try {
      const {
        wireWhatsappComplaintResolved,
      } = require('../services/whatsapp/whatsappComplaintResolvedSubscriber');
      wireWhatsappComplaintResolved(integrationBus, { logger });
    } catch (waCmpErr) {
      logger.warn(
        '[Integration] WhatsApp complaint-resolved subscriber skipped:',
        waCmpErr.message
      );
    }

    // W1517: configurable WhatsApp event→message bindings (admin-managed). One
    // generic dispatcher over the bindable producer events. Env-gated
    // (ENABLE_WHATSAPP_EVENT_BINDINGS); off by default + consent-gated.
    try {
      const {
        wireEventBindingDispatcher,
      } = require('../services/whatsapp/whatsappEventBindingDispatcher');
      wireEventBindingDispatcher(integrationBus, { logger });
    } catch (waBindErr) {
      logger.warn('[Integration] WhatsApp event-binding dispatcher skipped:', waBindErr.message);
    }

    // W1527: auto-enqueue WhatsApp appointment reminders on appointment.booked
    // (makes the W1525 reminder queue self-driving). Env-gated
    // (ENABLE_WHATSAPP_REMINDER_AUTO_ENQUEUE); off by default + idempotent.
    try {
      const {
        wireWhatsappReminderAutoEnqueue,
      } = require('../services/whatsapp/whatsappReminderEnqueueSubscriber');
      wireWhatsappReminderAutoEnqueue(integrationBus, { logger });
    } catch (waEnqErr) {
      logger.warn('[Integration] WhatsApp reminder auto-enqueue skipped:', waEnqErr.message);
    }

    // W387: bridge service-local EventEmitter emits (W379-W386 wires) to
    // integrationBus.publish so subscribers actually receive them. Pre-W387
    // the W379-W386 producers fired on local BaseService EventEmitter while
    // dddCrossModuleSubscribers listened via integrationBus.subscribe —
    // two separate buses, no link. See backend/integration/serviceEventBridge.js
    // for the discovery + fix rationale.
    try {
      const { wireServiceEventBridge } = require('../integration/serviceEventBridge');
      const result = wireServiceEventBridge(integrationBus);
      logger.info(
        `[Integration] ✓ W387 service-event bridge: ${result.wiredCount} forwarders attached`
      );
    } catch (bridgeErr) {
      logger.warn('[Integration] W387 service-event bridge skipped:', bridgeErr.message);
    }

    // W394: model post-save bridge for the LIVE registry (HR/finance/medical/
    // beneficiary/attendance events). Closes the W392 baseline of 17 orphan
    // subscribers by hooking Mongoose model post-save → integrationBus.publish.
    // Lowest-common-denominator producer wiring: every Employee.create,
    // Invoice.create, etc. fires the canonical contract event automatically.
    try {
      const { wireModelEventBridge } = require('../integration/modelEventBridge');
      const result = wireModelEventBridge(integrationBus);
      logger.info(
        `[Integration] ✓ W394 model-event bridge: ${result.wiredCount} post-save hooks attached`
      );
    } catch (bridgeErr) {
      logger.warn('[Integration] W394 model-event bridge skipped:', bridgeErr.message);
    }

    // W509 Phase D — auto-assign new MeasureAlerts to the best-match therapist
    // via the W432 caseload-matcher, triggered by the W506 medical.measure_alert.raised
    // event. Only assigns when assigneeId is still null (no manual override).
    // Wired AFTER modelEventBridge so the producer side is live before this
    // subscriber attaches.
    try {
      const {
        wireMeasureAlertAutoAssignment,
      } = require('../services/measure-alert-auto-assignment.service');
      wireMeasureAlertAutoAssignment({ integrationBus, logger });
      logger.info('[Integration] ✓ W509 measure-alert auto-assignment subscriber wired');
    } catch (autoErr) {
      logger.warn('[Integration] W509 auto-assignment subscriber skipped:', autoErr.message);
    }

    // W516 — measure-alert reassign notification fan-out. Subscribes to
    // medical.measure_alert.reassigned (W514) and emits the downstream
    // notification.measure_alert.reassigned.alert event for channel
    // dispatchers (Slack/email/in-app/SMS). Mirrors the W349 capa-alerts
    // pattern: this subscriber owns the cross-domain translation; actual
    // channel implementations are independent.
    try {
      const {
        wireMeasureAlertReassignNotify,
      } = require('../services/measure-alert-reassign-notify.service');
      wireMeasureAlertReassignNotify({ integrationBus, logger });
      logger.info('[Integration] ✓ W516 measure-alert reassign notify subscriber wired');
    } catch (notifyErr) {
      logger.warn('[Integration] W516 reassign-notify subscriber skipped:', notifyErr.message);
    }

    // W517 — first concrete channel for the W516 notification surface:
    // in-app Notification docs (bell-icon counter). Subscribes to
    // notification.measure_alert.reassigned.alert and writes one
    // Notification doc per recipient. Idempotent via the
    // notificationId='reassign:{alertId}:{recipientId}' dedupe key.
    // Future channels (email/SMS/push/Slack) plug into the same upstream
    // event with their own subscribers — no changes here.
    try {
      const { wireInAppNotificationChannel } = require('../services/notify-channel-in-app.service');
      wireInAppNotificationChannel({ integrationBus, logger });
      logger.info('[Integration] ✓ W517 in-app notification channel wired');
    } catch (inAppErr) {
      logger.warn('[Integration] W517 in-app notification channel skipped:', inAppErr.message);
    }

    // W519 — second concrete channel: email. Same upstream event as W517
    // (notification.measure_alert.reassigned.alert) but sends via the
    // existing services/email manager. Channel auto-degrades to no-op
    // when SMTP is not configured (CI/dev), surfacing the event in
    // logs without erroring.
    try {
      const { wireEmailNotificationChannel } = require('../services/notify-channel-email.service');
      wireEmailNotificationChannel({ integrationBus, logger });
      logger.info('[Integration] ✓ W519 email notification channel wired');
    } catch (emailErr) {
      logger.warn('[Integration] W519 email notification channel skipped:', emailErr.message);
    }

    // W520 — third concrete channel: SMS. Subscribes to the same W516
    // upstream event as W517/W519. Wraps services/smsService (currently
    // a stub returning {skipped:true} — channel handles this gracefully
    // and counts it under stats.providerNotConfigured, not errored).
    // When Unifonic/Twilio integrate, zero changes needed here.
    try {
      const { wireSmsNotificationChannel } = require('../services/notify-channel-sms.service');
      wireSmsNotificationChannel({ integrationBus, logger });
      logger.info('[Integration] ✓ W520 SMS notification channel wired');
    } catch (smsErr) {
      logger.warn('[Integration] W520 SMS notification channel skipped:', smsErr.message);
    }

    // Phase C — beneficiary lifecycle auto-transition notifications.
    // Subscribes to `beneficiary.lifecycle.auto_requested` and fans out
    // in-app + email notifications to branch supervisors/therapists.
    try {
      const {
        wireBeneficiaryLifecycleAutoTransitionNotify,
      } = require('../services/beneficiary-lifecycle-auto-transition-notify.service');
      wireBeneficiaryLifecycleAutoTransitionNotify({ integrationBus, logger });
      logger.info('[Integration] ✓ Beneficiary lifecycle auto-transition notify wired');
    } catch (lifecycleNotifyErr) {
      logger.warn(
        '[Integration] Beneficiary lifecycle auto-transition notify skipped:',
        lifecycleNotifyErr.message
      );
    }

    // Document Hub cross-module subscribers
    try {
      require('../integration/subscribers/documentHR.subscriber').register(integrationBus);
      require('../integration/subscribers/documentMedical.subscriber').register(integrationBus);
      require('../integration/subscribers/documentFinance.subscriber').register(integrationBus);
      logger.info('[Integration] ✓ Document Hub subscribers wired');
    } catch (docSubErr) {
      logger.warn('[Integration] Document Hub subscribers skipped:', docSubErr.message);
    }

    // Wire DDD notification triggers (10 notification rules)
    try {
      const { initializeDDDNotifications } = require('../integration/dddNotificationTriggers');
      initializeDDDNotifications(integrationBus);
      logger.info('[Integration] ✓ DDD notification triggers wired');
    } catch (dddNotifErr) {
      logger.warn('[Integration] DDD notifications skipped:', dddNotifErr.message);
    }

    // Wire DDD workflow automations (Phase 4 — 12 automation rules)
    try {
      const { initializeDDDAutomations } = require('../integration/dddWorkflowAutomations');
      initializeDDDAutomations(integrationBus);
      logger.info('[Integration] ✓ DDD workflow automations wired');
    } catch (dddAutoErr) {
      logger.warn('[Integration] DDD automations skipped:', dddAutoErr.message);
    }

    // DDD scheduled jobs (Phase 4 — 6 cron jobs) — REMOVED.
    // The `services/dddScheduler` module was retired; the canonical
    // schedulers now live under `scheduler/` (KPI, attendance, payment,
    // wallet, …) and are wired in server.js. The try/catch here was a
    // silent no-op on every boot; this comment replaces it.

    // Wire DDD webhook dispatcher (Phase 5 — external webhook bridge)
    try {
      const { initializeDDDWebhooks } = require('../integration/dddWebhookDispatcher');
      initializeDDDWebhooks(integrationBus);
      logger.info('[Integration] ✓ DDD webhook dispatcher wired');
    } catch (dddWhErr) {
      logger.warn('[Integration] DDD webhook dispatcher skipped:', dddWhErr.message);
    }

    // Mount integration API routes
    mountIntegrationBusRoutes(app);
    mountModuleConnectorRoutes(app);
    mountIntegrationContextRoutes(app);

    logger.info('[Integration] ✓ System integration bus initialized successfully');
  } catch (err) {
    logger.warn('[Integration] Integration bus initialization skipped:', err.message);
  }
}

module.exports = { setupIntegrationBus };

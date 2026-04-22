/**
 * services/reporting/index.js — service locator for the reporting
 * platform.
 *
 * Phase 10 Commit 2.
 *
 * Wires together the six collaborators into a ready-to-use engine +
 * scheduler pair:
 *
 *     catalog ──▶ ReportingEngine ──▶ channel adapters
 *                  │                     │
 *                  ├── builder registry  ├── email/sms/whatsapp (prod)
 *                  ├── recipient         ├── in-app (Notification)
 *                  ├── ApprovalModel     ├── portal inbox
 *                  ├── DeliveryModel     └── pdf download
 *                  └── event bus
 *
 * This module is the single entry point `server.js` should use to
 * bootstrap reporting. Tests keep constructing the engine directly
 * with fakes — they don't need the locator.
 */

'use strict';

const catalog = require('../../config/report.catalog');
const { ReportingEngine } = require('./reportingEngine');
const { ReportsScheduler } = require('../../scheduler/reports.scheduler');
const { builders: builderRegistry } = require('./builderRegistry');
const { buildChannels } = require('./channels');
const { createRecipientResolver } = require('./recipientResolver');
const { createRenderer } = require('./renderer');

const ReportDelivery = require('../../models/ReportDelivery');
const ReportApprovalRequest = require('../../models/ReportApprovalRequest');

/**
 * Build a wired reporting platform.
 *
 * @param {Object} deps
 * @param {Object} [deps.models]                — Mongoose model proxies
 *   @param {Object} deps.models.Beneficiary
 *   @param {Object} deps.models.Guardian
 *   @param {Object} deps.models.User
 *   @param {Object} deps.models.Employee
 *   @param {Object} deps.models.Session
 *   @param {Object} deps.models.Notification
 * @param {Object} [deps.communication]         — from backend/communication
 *   @param {Object} deps.communication.emailService
 *   @param {Object} deps.communication.smsService
 *   @param {Object} deps.communication.whatsappService
 * @param {Object} [deps.artifactStore]         — `{ store(payload) → {uri,id} }`
 * @param {Object} [deps.urlSigner]             — `{ sign({uri,ttl,...}) → {url,id,expiresAt} }`
 * @param {Object} [deps.renderer]              — `{ render(report, doc, recipient) → payload }`
 * @param {Object} [deps.scopeProvider]         — `{ scopesFor(report, periodKey), periodKey(periodicity, now) }`
 * @param {Object} [deps.eventBus]              — `{ emit(name, payload) }`
 * @param {Object} [deps.cron]                  — node-cron module (prod) or undefined (tests)
 * @param {Object} [deps.logger]
 * @returns {{ engine, scheduler, channels, recipientResolver, start(), stop() }}
 */
function buildReportingPlatform(deps = {}) {
  const {
    models = {},
    communication = {},
    artifactStore,
    urlSigner,
    renderer: providedRenderer,
    rendererOpts = {},
    scopeProvider,
    eventBus,
    cron,
    logger = console,
  } = deps;

  // Use the injected renderer if one was provided (tests); otherwise
  // build the default locale-aware HTML+PDF renderer so the engine has
  // a real render stage out of the box.
  const renderer = providedRenderer || createRenderer({ logger, ...rendererOpts });

  const channels = buildChannels({
    emailService: communication.emailService,
    smsService: communication.smsService,
    whatsappService: communication.whatsappService,
    NotificationModel: models.Notification,
    artifactStore,
    urlSigner,
    logger,
  });

  const recipientResolver = createRecipientResolver({
    BeneficiaryModel: models.Beneficiary,
    GuardianModel: models.Guardian,
    UserModel: models.User,
    EmployeeModel: models.Employee,
    SessionModel: models.Session,
    logger,
  });

  const engine = new ReportingEngine({
    catalog,
    DeliveryModel: ReportDelivery,
    ApprovalModel: ReportApprovalRequest,
    builders: builderRegistry,
    channels,
    recipientResolver,
    renderer,
    eventBus,
    logger,
  });

  const scheduler = new ReportsScheduler({
    catalog,
    engine,
    scopeProvider,
    cron,
    logger,
    useInterval: !cron,
  });

  return {
    engine,
    scheduler,
    channels,
    recipientResolver,
    start() {
      scheduler.start();
      return this;
    },
    stop() {
      scheduler.stop();
      return this;
    },
  };
}

module.exports = {
  buildReportingPlatform,
  catalog,
};
